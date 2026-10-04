-- Stage 16 — In-portal notifications bell (students only)
--
-- Owner decisions (2026-10-04): a student gets a notification when the admin
-- creates an assignment or test for them, posts an announcement addressed to
-- them, or enters/updates their marks. "Due work" reminders are NOT stored —
-- they are computed live from assessments/submissions when the bell loads.
--
-- Rows are only ever created by the SECURITY DEFINER notify_* functions
-- below, which re-check that the caller is an admin and work out the
-- recipients from the database itself (enrollment + batch + active student),
-- so the app can never notify the wrong students. Students can read their own
-- rows and set read_at on them, nothing else.
--
-- A student can turn notifications off (notification_preferences.enabled =
-- false). While off, no rows are created for them at all.

create type public.notification_kind as enum ('assignment', 'test', 'announcement', 'marks');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.notification_kind not null,
  title text not null,
  body text,
  -- Exactly one of these points at the thing the notification is about, so
  -- deleting the assessment/announcement removes its notifications too.
  assessment_id uuid references public.assessments (id) on delete cascade,
  announcement_id uuid references public.announcements (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_single_subject check (
    (assessment_id is not null and announcement_id is null and kind <> 'announcement')
    or (announcement_id is not null and assessment_id is null and kind = 'announcement')
  )
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx on public.notifications (user_id) where read_at is null;
create index notifications_assessment_id_idx on public.notifications (assessment_id);
create index notifications_announcement_id_idx on public.notifications (announcement_id);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.notifications enable row level security;

revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
-- Column-level grant: a student can only ever change read_at.
grant update (read_at) on public.notifications to authenticated;

create policy "Users can read their own notifications"
on public.notifications
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Users can mark their own notifications read"
on public.notifications
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- No insert/delete policies: rows are created only by the notify_* functions.

alter table public.notification_preferences enable row level security;

revoke all on public.notification_preferences from anon, authenticated;
grant select, insert, update on public.notification_preferences to authenticated;

create policy "Users can read their own notification preferences"
on public.notification_preferences
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Users can insert their own notification preferences"
on public.notification_preferences
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Users can update their own notification preferences"
on public.notification_preferences
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- notify_* functions (admin only)
-- ---------------------------------------------------------------------------

-- New assignment/test: every active student enrolled in the course, limited
-- to the targeted batch if there is one. Same visibility rule as the
-- "Students can read visible assessments" policy.
create function public.notify_new_assessment(p_assessment_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can send notifications.';
  end if;

  insert into public.notifications (user_id, kind, title, body, assessment_id)
  select
    p.id,
    a.type::text::public.notification_kind,
    case when a.type = 'test' then 'New test: ' else 'New assignment: ' end || a.title,
    c.title,
    a.id
  from public.assessments a
  join public.courses c on c.id = a.course_id
  join public.enrollments e on e.course_id = a.course_id
  join public.profiles p on p.id = e.student_id
  left join public.notification_preferences np on np.user_id = p.id
  where a.id = p_assessment_id
    and p.role = 'student'
    and p.is_active
    and (a.batch_id is null or a.batch_id = p.batch_id)
    and coalesce(np.enabled, true);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- New announcement: everyone / enrolled in the course / in the batch. Same
-- visibility rule as the "Students can read their announcements" policy.
create function public.notify_new_announcement(p_announcement_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can send notifications.';
  end if;

  insert into public.notifications (user_id, kind, title, body, announcement_id)
  select p.id, 'announcement', 'New announcement: ' || an.title, null, an.id
  from public.announcements an
  join public.profiles p on p.role = 'student' and p.is_active
  left join public.notification_preferences np on np.user_id = p.id
  where an.id = p_announcement_id
    and coalesce(np.enabled, true)
    and (
      (an.course_id is null and an.batch_id is null)
      or (
        an.course_id is not null
        and exists (
          select 1 from public.enrollments e
          where e.student_id = p.id and e.course_id = an.course_id
        )
      )
      or (an.batch_id is not null and an.batch_id = p.batch_id)
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Marks entered/updated for one student. An older unread marks notification
-- for the same assessment is replaced, so re-saving never stacks duplicates.
create function public.notify_marks(p_assessment_id uuid, p_student_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can send notifications.';
  end if;

  delete from public.notifications
  where user_id = p_student_id
    and assessment_id = p_assessment_id
    and kind = 'marks'
    and read_at is null;

  insert into public.notifications (user_id, kind, title, body, assessment_id)
  select p.id, 'marks', 'Marked: ' || a.title, c.title, a.id
  from public.assessments a
  join public.courses c on c.id = a.course_id
  join public.submissions s on s.assessment_id = a.id and s.student_id = p_student_id
  join public.profiles p on p.id = p_student_id
  left join public.notification_preferences np on np.user_id = p.id
  where a.id = p_assessment_id
    and s.marks is not null
    and p.role = 'student'
    and p.is_active
    and coalesce(np.enabled, true);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.notify_new_assessment(uuid) from public, anon;
revoke execute on function public.notify_new_announcement(uuid) from public, anon;
revoke execute on function public.notify_marks(uuid, uuid) from public, anon;
grant execute on function public.notify_new_assessment(uuid) to authenticated;
grant execute on function public.notify_new_announcement(uuid) to authenticated;
grant execute on function public.notify_marks(uuid, uuid) to authenticated;
