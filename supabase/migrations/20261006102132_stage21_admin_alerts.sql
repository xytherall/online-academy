-- Stage 21 — Admin alerts (bell + phone push for admins)
--
-- Owner request (2026-10-06): admins get a notification when
--   * a new application is submitted (public form, as anon),
--   * a student asks a new question,
--   * a student submits work after the due date (late).
-- One notification per event: they are created by AFTER INSERT triggers, so
-- editing the row later (reviewing an application, answering a question,
-- marking a submission, a due date change re-computing is_late) never
-- notifies again.
--
-- Recipients are worked out here, never by the app: every active admin whose
-- notification switch (notification_preferences.enabled) is on. The triggers
-- run as SECURITY DEFINER because the inserting user (anon or a student)
-- has no insert rights on notifications.
--
-- Admins now also read their own notifications and save phone
-- subscriptions; the existing "own rows" RLS policies already cover them, so
-- only save_push_subscription() needs to accept admins.

alter type public.notification_kind add value 'new_application';
alter type public.notification_kind add value 'new_question';
alter type public.notification_kind add value 'late_submission';

alter table public.notifications
  add column application_id uuid references public.applications (id) on delete cascade,
  add column submission_id uuid references public.submissions (id) on delete cascade;

create index notifications_application_id_idx on public.notifications (application_id);
create index notifications_submission_id_idx on public.notifications (submission_id);

-- kind is compared as text: enum values added in this same transaction can't
-- be used as enum literals until it commits. A late submission keeps its
-- assessment_id too, so tapping it opens that assessment's marking page.
alter table public.notifications drop constraint notifications_single_subject;
alter table public.notifications add constraint notifications_single_subject check (
  (assessment_id is not null and announcement_id is null and question_id is null and live_class_id is null
    and application_id is null and submission_id is null
    and kind::text not in ('announcement', 'answer', 'live_class', 'new_application', 'new_question', 'late_submission'))
  or (announcement_id is not null and assessment_id is null and question_id is null and live_class_id is null
    and application_id is null and submission_id is null
    and kind::text = 'announcement')
  or (question_id is not null and assessment_id is null and announcement_id is null and live_class_id is null
    and application_id is null and submission_id is null
    and kind::text in ('answer', 'new_question'))
  or (live_class_id is not null and assessment_id is null and announcement_id is null and question_id is null
    and application_id is null and submission_id is null
    and kind::text = 'live_class')
  or (application_id is not null and assessment_id is null and announcement_id is null and question_id is null
    and live_class_id is null and submission_id is null
    and kind::text = 'new_application')
  or (submission_id is not null and assessment_id is not null and announcement_id is null and question_id is null
    and live_class_id is null and application_id is null
    and kind::text = 'late_submission')
);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create function public.notify_admins_new_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, kind, title, body, application_id)
  select
    p.id,
    'new_application'::text::public.notification_kind,
    'New application: ' || new.full_name,
    case new.level when 'O' then 'O Level' when 'A' then 'A Level' end,
    new.id
  from public.profiles p
  left join public.notification_preferences np on np.user_id = p.id
  where p.role = 'admin'
    and p.is_active
    and coalesce(np.enabled, true);
  return null;
end;
$$;

create trigger applications_notify_admins
after insert on public.applications
for each row execute function public.notify_admins_new_application();

create function public.notify_admins_new_question()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, kind, title, body, question_id)
  select
    p.id,
    'new_question'::text::public.notification_kind,
    'New question from ' || coalesce(nullif(btrim(s.full_name), ''), 'a student'),
    coalesce(c.title, 'General'),
    new.id
  from public.profiles p
  left join public.notification_preferences np on np.user_id = p.id
  left join public.profiles s on s.id = new.student_id
  left join public.courses c on c.id = new.course_id
  where p.role = 'admin'
    and p.is_active
    and coalesce(np.enabled, true);
  return null;
end;
$$;

create trigger questions_notify_admins
after insert on public.questions
for each row execute function public.notify_admins_new_question();

-- Only a student's own late hand-in: rows the admin creates while entering
-- marks without an upload have no submitted_at.
create function public.notify_admins_late_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not new.is_late or new.submitted_at is null then
    return null;
  end if;

  insert into public.notifications (user_id, kind, title, body, assessment_id, submission_id)
  select
    p.id,
    'late_submission'::text::public.notification_kind,
    'Late submission: ' || a.title,
    coalesce(nullif(btrim(s.full_name), ''), 'A student') || ' · ' || c.title,
    new.assessment_id,
    new.id
  from public.profiles p
  left join public.notification_preferences np on np.user_id = p.id
  join public.assessments a on a.id = new.assessment_id
  join public.courses c on c.id = a.course_id
  left join public.profiles s on s.id = new.student_id
  where p.role = 'admin'
    and p.is_active
    and coalesce(np.enabled, true);
  return null;
end;
$$;

create trigger submissions_notify_admins_late
after insert on public.submissions
for each row execute function public.notify_admins_late_submission();

-- Trigger functions are never called directly.
revoke execute on function public.notify_admins_new_application() from public, anon, authenticated;
revoke execute on function public.notify_admins_new_question() from public, anon, authenticated;
revoke execute on function public.notify_admins_late_submission() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Phone notifications for admins too
-- ---------------------------------------------------------------------------

-- Same as Stage 17, but an active admin may also save a subscription. The
-- signature is unchanged, so `create or replace` keeps the grants.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not exists (
    select 1 from public.profiles where id = v_uid and role in ('student', 'admin') and is_active
  ) then
    raise exception 'Only an active student or admin can turn on phone notifications.';
  end if;

  -- The same browser may have been used by someone else before.
  delete from public.push_subscriptions where endpoint = p_endpoint;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (v_uid, p_endpoint, p_p256dh, p_auth);
end;
$$;
