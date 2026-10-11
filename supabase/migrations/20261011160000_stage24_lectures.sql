-- Stage 24 — Recorded lectures (Vimeo links)
--
-- Owner decision (2026-10-11): the admin adds recorded lectures to a course
-- as Vimeo links (the video itself stays on Vimeo; no video hosting here).
-- Each lecture has a title, the Vimeo video id (plus the private hash of an
-- unlisted link), an optional note, and a "Show to students" switch. Length
-- and thumbnail are filled from Vimeo's oEmbed when it answers, and left
-- empty when it doesn't (e.g. a domain-restricted video). Students enrolled
-- in the course watch shown lectures in an embedded player.
--
-- The first time a lecture is shown to students it notifies them (bell +
-- phone push) through notify_new_lecture(), which stamps published_at so it
-- can only happen once: editing, hiding and showing again never re-notify.
-- No "watched" tracking (owner: not now).

create table public.lectures (
  id uuid primary key default gen_random_uuid(),
  -- restrict, like resources: a course is only deleted once it's empty
  -- (SPEC §8); deleteCourse checks first, this is the backstop.
  course_id uuid not null references public.courses (id) on delete restrict,
  title text not null,
  description text,
  -- "123456789", or "123456789:abcdef1234" for an unlisted video's hash.
  vimeo_id text not null,
  duration_seconds integer,
  thumbnail_url text,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  -- First time shown to students; set once by notify_new_lecture().
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lectures_title_length check (char_length(btrim(title)) between 1 and 200),
  constraint lectures_description_length check (
    description is null or char_length(btrim(description)) between 1 and 1000
  ),
  constraint lectures_vimeo_id_format check (vimeo_id ~ '^[0-9]{1,20}(:[A-Za-z0-9]{1,64})?$'),
  constraint lectures_duration_positive check (duration_seconds is null or duration_seconds > 0),
  constraint lectures_thumbnail_https check (
    thumbnail_url is null or (thumbnail_url ~* '^https://[^[:space:]]+$' and char_length(thumbnail_url) <= 2000)
  )
);

create index lectures_course_id_sort_order_idx on public.lectures (course_id, sort_order);

create trigger lectures_set_updated_at
before update on public.lectures
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.lectures enable row level security;

revoke all on public.lectures from anon, authenticated;
grant select, insert, update, delete on public.lectures to authenticated;

create policy "Admins can read every lecture"
on public.lectures
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert lectures"
on public.lectures
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update lectures"
on public.lectures
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete lectures"
on public.lectures
for delete
to authenticated
using (public.is_admin());

-- Shown lectures of the student's own courses (same enrollment rule as
-- resources), active users only. Hidden lectures stay admin-only. No
-- student writes.
create policy "Students can read shown lectures of their enrolled courses"
on public.lectures
for select
to authenticated
using (
  is_published
  and public.is_active_user()
  and course_id in (
    select course_id from public.enrollments where student_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- Notifications: "New lecture"
-- ---------------------------------------------------------------------------

alter type public.notification_kind add value 'lecture';

alter table public.notifications
  add column lecture_id uuid references public.lectures (id) on delete cascade;

create index notifications_lecture_id_idx on public.notifications (lecture_id);

-- Same rule as before (stage 21) plus the lecture case. kind is compared as
-- text: an enum value added in this same transaction can't be used as an
-- enum literal until it commits.
alter table public.notifications drop constraint notifications_single_subject;
alter table public.notifications add constraint notifications_single_subject check (
  (assessment_id is not null and announcement_id is null and question_id is null and live_class_id is null
    and application_id is null and submission_id is null and lecture_id is null
    and kind::text not in ('announcement', 'answer', 'live_class', 'new_application', 'new_question',
      'late_submission', 'lecture'))
  or (announcement_id is not null and assessment_id is null and question_id is null and live_class_id is null
    and application_id is null and submission_id is null and lecture_id is null
    and kind::text = 'announcement')
  or (question_id is not null and assessment_id is null and announcement_id is null and live_class_id is null
    and application_id is null and submission_id is null and lecture_id is null
    and kind::text in ('answer', 'new_question'))
  or (live_class_id is not null and assessment_id is null and announcement_id is null and question_id is null
    and application_id is null and submission_id is null and lecture_id is null
    and kind::text = 'live_class')
  or (application_id is not null and assessment_id is null and announcement_id is null and question_id is null
    and live_class_id is null and submission_id is null and lecture_id is null
    and kind::text = 'new_application')
  or (submission_id is not null and assessment_id is not null and announcement_id is null and question_id is null
    and live_class_id is null and application_id is null and lecture_id is null
    and kind::text = 'late_submission')
  or (lecture_id is not null and assessment_id is null and announcement_id is null and question_id is null
    and live_class_id is null and application_id is null and submission_id is null
    and kind::text = 'lecture')
);

-- Called after a lecture is saved as shown. Only the first call for a shown
-- lecture does anything: it stamps published_at (the single update makes
-- this safe against two saves at once) and notifies every active student
-- enrolled in the course with notifications on. Later calls, and calls for
-- a hidden lecture, return no rows.
create function public.notify_new_lecture(p_lecture_id uuid)
returns setof uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can send notifications.';
  end if;

  return query
  with first_shown as (
    update public.lectures
    set published_at = now()
    where id = p_lecture_id
      and is_published
      and published_at is null
    returning id, course_id, title
  ),
  created as (
    insert into public.notifications (user_id, kind, title, body, lecture_id)
    select
      p.id,
      'lecture'::public.notification_kind,
      'New lecture: ' || l.title,
      c.title,
      l.id
    from first_shown l
    join public.courses c on c.id = l.course_id
    join public.enrollments e on e.course_id = l.course_id
    join public.profiles p on p.id = e.student_id
    left join public.notification_preferences np on np.user_id = p.id
    where p.role = 'student'
      and p.is_active
      and coalesce(np.enabled, true)
    returning id
  )
  select id from created;
end;
$$;

revoke execute on function public.notify_new_lecture(uuid) from public, anon;
grant execute on function public.notify_new_lecture(uuid) to authenticated;
