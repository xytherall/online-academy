-- Stage 17 — Phone notifications (Web Push) for the installed app
--
-- Owner request (2026-10-04): every bell notification is also sent as a
-- phone pop-up to students who turned phone notifications on, plus a daily
-- reminder for work due within a day. The bell's on/off switch
-- (notification_preferences) still applies: no notification row, no push.
--
-- push_subscriptions holds one row per browser/phone that allowed
-- notifications. A student can see and delete only their own rows; rows are
-- saved through save_push_subscription() so that a phone shared by two
-- students always belongs to whoever turned it on last. Sending happens on
-- the server with the secret key (it needs other students' subscriptions),
-- never from the browser.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_https check (endpoint like 'https://%'),
  constraint push_subscriptions_endpoint_length check (char_length(endpoint) <= 1000),
  constraint push_subscriptions_keys_length check (char_length(p256dh) <= 200 and char_length(auth) <= 100)
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

revoke all on public.push_subscriptions from anon, authenticated;
grant select, delete on public.push_subscriptions to authenticated;

create policy "Users can read their own push subscriptions"
on public.push_subscriptions
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Users can delete their own push subscriptions"
on public.push_subscriptions
for delete
to authenticated
using (user_id = (select auth.uid()));

-- No insert/update policies: rows are written only by save_push_subscription.
create function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not exists (
    select 1 from public.profiles where id = v_uid and role = 'student' and is_active
  ) then
    raise exception 'Only an active student can turn on phone notifications.';
  end if;

  -- The same browser may have been used by another student before.
  delete from public.push_subscriptions where endpoint = p_endpoint;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (v_uid, p_endpoint, p_p256dh, p_auth);
end;
$$;

revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- notify_* now return the ids of the notifications they created, so the
-- server can send the matching pushes. Logic is otherwise unchanged from
-- Stage 16. The return type changes, so they are dropped and recreated.
-- ---------------------------------------------------------------------------

drop function public.notify_new_assessment(uuid);
drop function public.notify_new_announcement(uuid);
drop function public.notify_marks(uuid, uuid);

create function public.notify_new_assessment(p_assessment_id uuid)
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
    and coalesce(np.enabled, true)
  returning id
  )
  select id from created;
end;
$$;

create function public.notify_new_announcement(p_announcement_id uuid)
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
    )
  returning id
  )
  select id from created;
end;
$$;

create function public.notify_marks(p_assessment_id uuid, p_student_id uuid)
returns setof uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can send notifications.';
  end if;

  delete from public.notifications
  where user_id = p_student_id
    and assessment_id = p_assessment_id
    and kind = 'marks'
    and read_at is null;

  return query
  with created as (
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
    and coalesce(np.enabled, true)
  returning id
  )
  select id from created;
end;
$$;

revoke execute on function public.notify_new_assessment(uuid) from public, anon;
revoke execute on function public.notify_new_announcement(uuid) from public, anon;
revoke execute on function public.notify_marks(uuid, uuid) from public, anon;
grant execute on function public.notify_new_assessment(uuid) to authenticated;
grant execute on function public.notify_new_announcement(uuid) to authenticated;
grant execute on function public.notify_marks(uuid, uuid) to authenticated;
