-- Stage 19b — Live class notification time in each student's own time zone
--
-- Owner request (2026-10-04): every student should see class times in their
-- phone's time zone, not Saudi time. Text stored in a notification can't
-- follow each reader's zone, so the body is no longer a formatted time: the
-- bell list reads the class's starts_at (via live_class_id) and the phone
-- push carries starts_at, and both format it on the student's device.
-- Logic is otherwise unchanged from Stage 19; the signature is the same, so
-- `create or replace` keeps the grants.

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
    and coalesce(np.enabled, true)
  returning id
  )
  select id from created;
end;
$$;
