-- Stage 19 — Live classes (upcoming class entries with a join link)
--
-- Owner decision (2026-10-04, "option 1"): the admin adds a class entry with
-- a title, start time (entered in Saudi time, stored as timestamptz), a
-- Zoom/Meet join link, an optional note, and who it is for: every student or
-- one batch (same targeting idea as announcements). The admin can edit and
-- delete entries. Students see upcoming classes for them on their dashboard;
-- a class drops off one hour after it starts (filtered in the app, rows are
-- kept). No weekly schedule or timetable.
--
-- Adding a class notifies its students (bell + phone push) through
-- notify_new_live_class(); editing does not.

create table public.live_classes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  join_url text not null,
  note text,
  -- null = every student. A deleted batch takes its classes with it (never
  -- set null, which would silently turn the class into an all-students one).
  batch_id uuid references public.batches (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint live_classes_title_length check (char_length(btrim(title)) between 1 and 200),
  constraint live_classes_join_url_http check (join_url ~* '^https?://[^[:space:]]+$'),
  constraint live_classes_join_url_length check (char_length(join_url) <= 2000),
  constraint live_classes_note_length check (note is null or char_length(btrim(note)) between 1 and 1000)
);

create index live_classes_starts_at_idx on public.live_classes (starts_at);
create index live_classes_batch_id_idx on public.live_classes (batch_id);

create trigger live_classes_set_updated_at
before update on public.live_classes
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.live_classes enable row level security;

revoke all on public.live_classes from anon, authenticated;
grant select, insert, update, delete on public.live_classes to authenticated;

create policy "Admins can read every live class"
on public.live_classes
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert live classes"
on public.live_classes
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update live classes"
on public.live_classes
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete live classes"
on public.live_classes
for delete
to authenticated
using (public.is_admin());

-- For everyone, or for the student's current batch. Active users only, since
-- the join link lets anyone holding it into the class. No student writes.
create policy "Students can read their live classes"
on public.live_classes
for select
to authenticated
using (
  public.is_active_user()
  and (
    batch_id is null
    or batch_id = (select batch_id from public.profiles where id = (select auth.uid()))
  )
);

-- ---------------------------------------------------------------------------
-- Notifications: "New live class"
-- ---------------------------------------------------------------------------

alter type public.notification_kind add value 'live_class';

alter table public.notifications
  add column live_class_id uuid references public.live_classes (id) on delete cascade;

create index notifications_live_class_id_idx on public.notifications (live_class_id);

-- kind is compared as text: an enum value added in this same transaction
-- can't be used as an enum literal until it commits.
alter table public.notifications drop constraint notifications_single_subject;
alter table public.notifications add constraint notifications_single_subject check (
  (assessment_id is not null and announcement_id is null and question_id is null and live_class_id is null
    and kind::text not in ('announcement', 'answer', 'live_class'))
  or (announcement_id is not null and assessment_id is null and question_id is null and live_class_id is null
    and kind::text = 'announcement')
  or (question_id is not null and assessment_id is null and announcement_id is null and live_class_id is null
    and kind::text = 'answer')
  or (live_class_id is not null and assessment_id is null and announcement_id is null and question_id is null
    and kind::text = 'live_class')
);

-- New class: every active student it is for (everyone, or the batch), with
-- notifications on. Same visibility rule as the student read policy. The body
-- is the start time in Saudi time, so the phone pop-up says when.
create function public.notify_new_live_class(p_live_class_id uuid)
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
  with created as (
  insert into public.notifications (user_id, kind, title, body, live_class_id)
  select
    p.id,
    'live_class'::text::public.notification_kind,
    'New live class: ' || lc.title,
    to_char(lc.starts_at at time zone 'Asia/Riyadh', 'Dy DD Mon, HH12:MI AM') || ' (Saudi time)',
    lc.id
  from public.live_classes lc
  join public.profiles p on p.role = 'student' and p.is_active
  left join public.notification_preferences np on np.user_id = p.id
  where lc.id = p_live_class_id
    and (lc.batch_id is null or lc.batch_id = p.batch_id)
    and coalesce(np.enabled, true)
  returning id
  )
  select id from created;
end;
$$;

revoke execute on function public.notify_new_live_class(uuid) from public, anon;
grant execute on function public.notify_new_live_class(uuid) to authenticated;
