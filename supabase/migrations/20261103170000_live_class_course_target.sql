-- Live classes: target a course as well as a batch
--
-- Owner request (2026-11-03): a live class can be for one course, one batch,
-- both, or neither. course_id null = all courses, batch_id null = all
-- batches; both null = every student. A student sees (and is notified of) a
-- class only when both match: the batch is theirs, and they are enrolled in
-- the course (same enrollment rule as resources and lectures).
--
-- on delete cascade, like announcements.course_id: set null would silently
-- turn a course's class into an all-courses one, which nobody chose.

alter table public.live_classes
  add column course_id uuid references public.courses (id) on delete cascade;

create index live_classes_course_id_idx on public.live_classes (course_id);

drop policy "Students can read their live classes" on public.live_classes;

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
  and (
    course_id is null
    or course_id in (
      select course_id from public.enrollments where student_id = (select auth.uid())
    )
  )
);

-- Same rule as the policy above. Signature unchanged, so `create or replace`
-- keeps the grants.
create or replace function public.notify_new_live_class(p_live_class_id uuid)
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
    'live_class'::public.notification_kind,
    'New live class: ' || lc.title,
    null,
    lc.id
  from public.live_classes lc
  join public.profiles p on p.role = 'student' and p.is_active
  left join public.notification_preferences np on np.user_id = p.id
  where lc.id = p_live_class_id
    and (lc.batch_id is null or lc.batch_id = p.batch_id)
    and (
      lc.course_id is null
      or exists (
        select 1 from public.enrollments e
        where e.student_id = p.id and e.course_id = lc.course_id
      )
    )
    and coalesce(np.enabled, true)
  returning id
  )
  select id from created;
end;
$$;
