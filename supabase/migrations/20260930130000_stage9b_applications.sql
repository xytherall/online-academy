-- Stage 9B — Applications (SPEC §3, §6, §8, §10, §14)
--
-- The public application form writes here as `anon`. This is the first
-- publicly writable table in the project: every other table starts
-- `revoke all ... from anon, authenticated` and gives anon SELECT at most
-- (site_settings, published courses). The insert policy is therefore written
-- as narrowly as possible — a submitter may only ever create a `pending` row
-- with all three review fields null — and anon is granted INSERT *without*
-- SELECT, so a submitted application can never be read back by the public.
--
-- Owner decisions (2026-09-30):
--   * course_ids is a uuid[] (SPEC §10), so it cannot carry a foreign key.
--     `validate_application_courses()` is the database-level backstop that
--     every chosen course exists, is published, and matches the chosen level;
--     submitApplication() pre-checks the same thing for a friendly error.
--   * One pending application per email address, enforced by a unique partial
--     index on lower(email). Accepted/rejected rows do not block a re-apply.
--   * A global flood limit (20 inserts per 10 minutes) rejects bulk submission
--     at the database, behind the form's honeypot and minimum-time check.
--   * reviewed_by / student_id use `on delete set null`, matching
--     announcements.created_by — an application is an audit record, so
--     deleting a profile must never delete the application row.
--   * Admins may hard-delete an application, unlike students (SPEC §8's
--     "deleting" rules). The app only offers this for rejected applications,
--     for privacy; the table itself does not encode that.

create type public.application_status as enum ('pending', 'accepted', 'rejected');

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  whatsapp text,
  country text not null,
  school text,
  level public.course_level not null,
  course_ids uuid[] not null,
  guardian_name text,
  guardian_phone text,
  guardian_email text,
  heard_about text,
  status public.application_status not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  student_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Lengths mirror `profileFields` in src/lib/validation/applications.ts so a
  -- value the form accepts is never rejected by the database.
  constraint applications_full_name_not_blank check (btrim(full_name) <> ''),
  constraint applications_full_name_length check (char_length(full_name) <= 200),
  constraint applications_email_not_blank check (btrim(email) <> ''),
  constraint applications_email_length check (char_length(email) <= 255),
  constraint applications_phone_not_blank check (btrim(phone) <> ''),
  constraint applications_phone_length check (char_length(phone) <= 40),
  constraint applications_whatsapp_length check (whatsapp is null or char_length(whatsapp) <= 40),
  constraint applications_country_not_blank check (btrim(country) <> ''),
  constraint applications_country_length check (char_length(country) <= 100),
  constraint applications_school_length check (school is null or char_length(school) <= 200),
  constraint applications_guardian_name_length check (guardian_name is null or char_length(guardian_name) <= 200),
  constraint applications_guardian_phone_length check (guardian_phone is null or char_length(guardian_phone) <= 40),
  constraint applications_guardian_email_length check (guardian_email is null or char_length(guardian_email) <= 255),
  constraint applications_heard_about_length check (heard_about is null or char_length(heard_about) <= 500),

  -- At least one course (SPEC §6). Contents are checked by the trigger below.
  constraint applications_course_ids_not_empty check (cardinality(course_ids) > 0),

  -- A pending application has never been reviewed; only an accepted one has a
  -- student account. The insert policy independently forbids anon from setting
  -- any of these, but this holds for admin updates too.
  constraint applications_pending_not_reviewed check (
    status <> 'pending' or (reviewed_by is null and reviewed_at is null)
  ),
  constraint applications_student_only_when_accepted check (
    status = 'accepted' or student_id is null
  )
);

create index applications_status_idx on public.applications (status);
create index applications_created_at_idx on public.applications (created_at desc);
create index applications_student_id_idx on public.applications (student_id);

-- One pending application per email address. Accepted/rejected rows are
-- excluded, so a rejected applicant may apply again. submitApplication()
-- turns the resulting 23505 into a friendly message.
create unique index applications_pending_email_unique
on public.applications (lower(email))
where status = 'pending';

create trigger applications_set_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Course validation (course_ids is an array, so it cannot have a foreign key)
-- ---------------------------------------------------------------------------

-- security definer: the submitter is `anon`, whose RLS on `courses` only shows
-- published rows. Reading `courses` directly here means "unpublished" and
-- "does not exist" stay distinguishable in the database's own view, rather
-- than depending on the caller's visibility.
create function public.validate_application_courses()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_valid_count int;
  v_distinct_count int;
begin
  select count(distinct c) into v_distinct_count
  from unnest(new.course_ids) as c;

  if v_distinct_count <> cardinality(new.course_ids) then
    raise exception 'An application cannot list the same course twice'
      using errcode = '23514';
  end if;

  select count(*) into v_valid_count
  from public.courses c
  where c.id = any (new.course_ids)
    and c.is_published
    and c.level = new.level;

  if v_valid_count <> v_distinct_count then
    raise exception 'Every chosen course must be published and match the chosen level'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger applications_validate_courses
before insert or update of course_ids, level on public.applications
for each row execute function public.validate_application_courses();

-- ---------------------------------------------------------------------------
-- Flood limit
-- ---------------------------------------------------------------------------

-- Bulk-submission backstop behind the form's honeypot and minimum-time check,
-- both of which live in the app and so are bypassed by a direct REST insert.
--
-- Both constants are declared here and nowhere else — this is the one place to
-- tune the limit. Deliberately a *global* count, per the owner's decision: it
-- also means 20 deliberate inserts lock out genuine applicants for the rest of
-- the window (recorded in SPEC §16).
--
-- security definer is required, not cosmetic: anon has no SELECT on this
-- table, so the count would otherwise always see zero rows.
create function public.check_application_flood_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_window constant interval := '10 minutes';
  c_max_rows constant int := 20;
  v_recent int;
begin
  select count(*) into v_recent
  from public.applications
  where created_at > now() - c_window;

  if v_recent >= c_max_rows then
    -- 54000 (program_limit_exceeded): distinct from the course trigger's 23514
    -- and the pending-email index's 23505, so submitApplication() can tell the
    -- three apart and word each error properly.
    raise exception 'Too many applications received in the last %', c_window
      using errcode = '54000';
  end if;

  return new;
end;
$$;

create trigger applications_check_flood_limit
before insert on public.applications
for each row execute function public.check_application_flood_limit();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.applications enable row level security;

revoke all on public.applications from anon, authenticated;
-- INSERT without SELECT: the public may submit but never read back. Any
-- `.insert(...).select()` from the app would fail because of this, by design.
grant insert on public.applications to anon, authenticated;
grant select, update, delete on public.applications to authenticated;

-- SPEC §3: "Public (not logged in) ... Can submit an application. Cannot read
-- any application." A submitter may only create a pending, unreviewed row —
-- status and every review field are the server's/admin's to set, never the
-- client's.
create policy "Anyone can submit an application"
on public.applications
for insert
to anon, authenticated
with check (
  status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
  and student_id is null
);

create policy "Admins can read every application"
on public.applications
for select
to authenticated
using (public.is_admin());

create policy "Admins can update applications"
on public.applications
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete applications"
on public.applications
for delete
to authenticated
using (public.is_admin());

-- No select, update or delete policy for students or anon: an application
-- holds someone's contact and guardian details and is admin-only to read
-- (SPEC §3). A student cannot read even their own accepted application.
