-- Stage 18 — "Ask the teacher" (student questions, one answer each)
--
-- Owner decisions (2026-10-04): a student asks a question about one of their
-- enrolled courses (or "General"), optionally with one file. The admin gives
-- one answer (no back-and-forth chat), optionally with one file, which
-- notifies the student. The admin can edit an answer later (no new
-- notification) or close a question without answering. The student can
-- delete their own question only while it is still waiting.
--
-- Questions are private to the asking student and admins.
--
-- File paths in the `questions` bucket:
--   student attachment: {student_id}/{uuid}-{name}
--   answer attachment:  {student_id}/answers/{uuid}-{name}
-- so a student can read everything under their own folder but only ever
-- upload or delete directly in it (never in answers/).

create type public.question_status as enum ('waiting', 'answered', 'closed');

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  -- null = "General". A deleted course turns its questions into General ones.
  course_id uuid references public.courses (id) on delete set null,
  body text not null,
  attachment_path text,
  status public.question_status not null default 'waiting',
  answer text,
  answer_attachment_path text,
  answered_by uuid references public.profiles (id) on delete set null,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_body_length check (char_length(btrim(body)) between 1 and 5000),
  constraint questions_answer_length check (answer is null or char_length(btrim(answer)) between 1 and 5000),
  constraint questions_answered_has_answer check (
    status <> 'answered' or (answer is not null and answered_at is not null)
  ),
  constraint questions_attachment_path check (
    attachment_path is null
    or (attachment_path like student_id::text || '/%'
      and attachment_path not like student_id::text || '/answers/%')
  ),
  constraint questions_answer_attachment_path check (
    answer_attachment_path is null or answer_attachment_path like student_id::text || '/answers/%'
  )
);

create index questions_student_created_idx on public.questions (student_id, created_at desc);
create index questions_waiting_idx on public.questions (created_at) where status = 'waiting';
create index questions_course_id_idx on public.questions (course_id);
create index questions_answered_by_idx on public.questions (answered_by);

create trigger questions_set_updated_at
before update on public.questions
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.questions enable row level security;

revoke all on public.questions from anon, authenticated;
grant select, delete on public.questions to authenticated;
-- Column-level grants: a student can only ever write these four columns, so
-- status/answer fields always start at their defaults. Only admins have an
-- update policy, so the update grant is effectively admin-only.
grant insert (student_id, course_id, body, attachment_path) on public.questions to authenticated;
grant update (status, answer, answer_attachment_path, answered_by, answered_at) on public.questions to authenticated;

create policy "Admins can read every question"
on public.questions
for select
to authenticated
using (public.is_admin());

create policy "Admins can update questions"
on public.questions
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete questions"
on public.questions
for delete
to authenticated
using (public.is_admin());

create policy "Students can read their own questions"
on public.questions
for select
to authenticated
using (student_id = (select auth.uid()));

-- Own row, active student, and the course (if any) must be one they're
-- enrolled in.
create policy "Students can ask questions"
on public.questions
for insert
to authenticated
with check (
  student_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'student' and p.is_active
  )
  and (
    course_id is null
    or exists (
      select 1 from public.enrollments e
      where e.student_id = (select auth.uid()) and e.course_id = questions.course_id
    )
  )
);

create policy "Students can delete their own waiting questions"
on public.questions
for delete
to authenticated
using (student_id = (select auth.uid()) and status = 'waiting');

-- ---------------------------------------------------------------------------
-- Storage: private `questions` bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'questions',
  'questions',
  false,
  10485760, -- 10 MB; must match MAX_RESOURCE_FILE_BYTES in src/lib/validation/assessments.ts
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "Admins can read questions objects"
on storage.objects
for select
to authenticated
using (bucket_id = 'questions' and public.is_admin());

create policy "Admins can upload questions objects"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'questions' and public.is_admin());

create policy "Admins can delete questions objects"
on storage.objects
for delete
to authenticated
using (bucket_id = 'questions' and public.is_admin());

-- Their own attachments and the answers to their own questions.
create policy "Students can read their own questions objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'questions'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Directly in their own folder only (not answers/), while an active student.
create policy "Students can upload their own questions objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'questions'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and array_length(storage.foldername(name), 1) = 1
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'student' and p.is_active
  )
);

-- Lets a student remove an upload whose question failed to save, and the
-- file of a waiting question they delete. Never a file still attached to a
-- question that has been answered or closed.
create policy "Students can delete their own unanswered questions objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'questions'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and array_length(storage.foldername(name), 1) = 1
  and not exists (
    select 1 from public.questions q
    where q.attachment_path = storage.objects.name and q.status <> 'waiting'
  )
);

-- ---------------------------------------------------------------------------
-- Notifications: "Your question was answered"
-- ---------------------------------------------------------------------------

alter type public.notification_kind add value 'answer';

alter table public.notifications
  add column question_id uuid references public.questions (id) on delete cascade;

create index notifications_question_id_idx on public.notifications (question_id);

-- kind is compared as text: an enum value added in this same transaction
-- can't be used as an enum literal until it commits.
alter table public.notifications drop constraint notifications_single_subject;
alter table public.notifications add constraint notifications_single_subject check (
  (assessment_id is not null and announcement_id is null and question_id is null
    and kind::text not in ('announcement', 'answer'))
  or (announcement_id is not null and assessment_id is null and question_id is null
    and kind::text = 'announcement')
  or (question_id is not null and assessment_id is null and announcement_id is null
    and kind::text = 'answer')
);

-- Answer sent for one question. Only the asking student, only while active
-- with notifications on. An older unread answer notification for the same
-- question is replaced, so it never stacks.
create function public.notify_answer(p_question_id uuid)
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
  where question_id = p_question_id
    and read_at is null;

  return query
  with created as (
  insert into public.notifications (user_id, kind, title, body, question_id)
  select
    p.id,
    'answer'::text::public.notification_kind,
    'Your question was answered',
    coalesce(c.title, 'General'),
    q.id
  from public.questions q
  join public.profiles p on p.id = q.student_id
  left join public.courses c on c.id = q.course_id
  left join public.notification_preferences np on np.user_id = p.id
  where q.id = p_question_id
    and q.status = 'answered'
    and p.role = 'student'
    and p.is_active
    and coalesce(np.enabled, true)
  returning id
  )
  select id from created;
end;
$$;

revoke execute on function public.notify_answer(uuid) from public, anon;
grant execute on function public.notify_answer(uuid) to authenticated;
