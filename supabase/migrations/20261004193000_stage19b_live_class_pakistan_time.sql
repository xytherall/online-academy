-- Stage 19b — Live class notification shows Pakistan time
--
-- Owner request (2026-10-04): class times are not Saudi time. The admin now
-- enters the time in their own device's time zone (like assessment due
-- dates), and the "New live class" notification states the start time in
-- Pakistan time, where the academy is run. Logic is otherwise unchanged from
-- Stage 19; the signature is the same, so `create or replace` keeps grants.

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
    to_char(lc.starts_at at time zone 'Asia/Karachi', 'Dy DD Mon, HH12:MI AM') || ' (Pakistan time)',
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
