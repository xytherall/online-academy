-- Stage 22 — Multiple-choice quizzes
--
-- Owner decision (2026-10-06): a quiz is a third assessment type. The admin
-- pastes the questions (2-6 options each, one correct); total_marks is the
-- number of questions, 1 mark each. A student answers every question once,
-- on the page, and is scored by the database on submit. The result (score,
-- right/wrong per question and the correct option) is shown straight away.
--
-- Correct answers are never readable by a student before they submit:
--   * quiz_questions has no student policy at all;
--   * students get the questions through get_quiz_questions(), which leaves
--     out correct_index;
--   * submit_quiz() is the only student write path, works out the score
--     itself (a student can't send their own score) and allows one attempt;
--   * get_quiz_result() only answers once the student has submitted.
--
-- The quiz submission is an ordinary `submissions` row (marks = score), so
-- the marking page, the progress report and the late flag work unchanged:
-- late is allowed and flagged, and late work doesn't count by default.
--
-- New enum values can't be used as enum literals in the same transaction,
-- so 'quiz' is compared as text below.

alter type public.assessment_type add value 'quiz';
alter type public.notification_kind add value 'quiz';

-- The options the student picked, by 0-based index, one per question in
-- position order. Null for assignments, tests and admin-entered marks.
alter table public.submissions add column quiz_answers smallint[];

-- ---------------------------------------------------------------------------
-- quiz_questions
-- ---------------------------------------------------------------------------

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  -- cascade: questions belong to the quiz. A quiz with submissions can't be
  -- deleted anyway (submissions.assessment_id is restrict).
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  -- 1-based, contiguous; set by save_quiz_questions().
  position integer not null,
  question text not null,
  options text[] not null,
  correct_index smallint not null,
  created_at timestamptz not null default now(),
  unique (assessment_id, position),
  constraint quiz_questions_position_check check (position >= 1),
  constraint quiz_questions_question_check check (btrim(question) <> '' and length(question) <= 2000),
  constraint quiz_questions_options_check check (array_ndims(options) = 1 and cardinality(options) between 2 and 6),
  constraint quiz_questions_correct_index_check check (correct_index >= 0 and correct_index < cardinality(options))
);

alter table public.quiz_questions enable row level security;

revoke all on public.quiz_questions from anon, authenticated;
grant select, insert, update, delete on public.quiz_questions to authenticated;

create policy "Admins can read quiz questions"
on public.quiz_questions
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert quiz questions"
on public.quiz_questions
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update quiz questions"
on public.quiz_questions
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete quiz questions"
on public.quiz_questions
for delete
to authenticated
using (public.is_admin());

-- No student policy: students read questions only via get_quiz_questions().

-- Questions are locked once anyone has a submission for the quiz, so every
-- student is scored against the same questions. Title, instructions and due
-- date stay editable.
create function public.check_quiz_questions_editable()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_assessment_id uuid := case when tg_op = 'DELETE' then old.assessment_id else new.assessment_id end;
begin
  if tg_op <> 'DELETE' and not exists (
    select 1 from public.assessments where id = new.assessment_id and type::text = 'quiz'
  ) then
    raise exception 'Questions can only be added to a quiz.';
  end if;

  if exists (select 1 from public.submissions where assessment_id = v_assessment_id) then
    raise exception 'Questions can''t be changed once a student has submitted this quiz.';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger quiz_questions_check_editable
before insert or update or delete on public.quiz_questions
for each row execute function public.check_quiz_questions_editable();

-- A quiz stays a quiz: its questions and its students' answers make no sense
-- for an assignment or test, and the other way round.
create function public.check_assessment_quiz_type()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (old.type::text = 'quiz') <> (new.type::text = 'quiz') then
    raise exception 'A quiz can''t be changed to another type, or another type to a quiz.';
  end if;
  return new;
end;
$$;

create trigger assessments_check_quiz_type
before update of type on public.assessments
for each row execute function public.check_assessment_quiz_type();

revoke execute on function public.check_quiz_questions_editable() from public, anon, authenticated;
revoke execute on function public.check_assessment_quiz_type() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- save_quiz_questions(): admin replaces all of a quiz's questions at once and
-- total_marks follows the question count. Runs as the caller, so admin RLS
-- and the lock trigger above both apply.
--
-- p_questions: [{"question": text, "options": [text, ...], "correct_index": int}, ...]
-- ---------------------------------------------------------------------------

create function public.save_quiz_questions(p_assessment_id uuid, p_questions jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
  v_item jsonb;
  v_position integer := 0;
  v_options text[];
  v_option text;
  v_question text;
  v_correct integer;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can change quiz questions.';
  end if;

  if not exists (select 1 from public.assessments where id = p_assessment_id and type::text = 'quiz') then
    raise exception 'Quiz not found.';
  end if;

  if jsonb_typeof(p_questions) is distinct from 'array' then
    raise exception 'Invalid questions.';
  end if;

  v_count := jsonb_array_length(p_questions);
  if v_count < 1 or v_count > 100 then
    raise exception 'A quiz needs between 1 and 100 questions.';
  end if;

  delete from public.quiz_questions where assessment_id = p_assessment_id;

  for v_item in select value from jsonb_array_elements(p_questions) loop
    v_position := v_position + 1;
    v_question := btrim(coalesce(v_item ->> 'question', ''));

    if jsonb_typeof(v_item -> 'options') is distinct from 'array' then
      raise exception 'Question % has no options.', v_position;
    end if;
    select coalesce(array_agg(btrim(o) order by ord), '{}')
    into v_options
    from jsonb_array_elements_text(v_item -> 'options') with ordinality as t(o, ord);

    foreach v_option in array v_options loop
      if v_option = '' or length(v_option) > 500 then
        raise exception 'Question % has an empty or too long option.', v_position;
      end if;
    end loop;

    v_correct := (v_item ->> 'correct_index')::integer;
    if v_correct is null or v_correct < 0 or v_correct >= cardinality(v_options) then
      raise exception 'Question % has an invalid answer.', v_position;
    end if;

    insert into public.quiz_questions (assessment_id, position, question, options, correct_index)
    values (p_assessment_id, v_position, v_question, v_options, v_correct);
  end loop;

  update public.assessments set total_marks = v_count where id = p_assessment_id;

  return v_count;
end;
$$;

revoke execute on function public.save_quiz_questions(uuid, jsonb) from public, anon;
grant execute on function public.save_quiz_questions(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- get_quiz_questions(): questions and options, never the correct answer.
-- Admins, or a student who can see the quiz (same rule as the "Students can
-- read visible assessments" policy).
-- ---------------------------------------------------------------------------

create function public.get_quiz_questions(p_assessment_id uuid)
returns table (question_position integer, question text, options text[])
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if not public.is_admin() and not exists (
    select 1
    from public.assessments a
    join public.profiles p on p.id = v_uid and p.role = 'student' and p.is_active
    where a.id = p_assessment_id
      and (
        (
          exists (
            select 1 from public.enrollments e
            where e.student_id = v_uid and e.course_id = a.course_id
          )
          and (a.batch_id is null or a.batch_id = p.batch_id)
        )
        or exists (
          select 1 from public.submissions s
          where s.assessment_id = a.id and s.student_id = v_uid
        )
      )
  ) then
    raise exception 'This quiz is not available to you.';
  end if;

  return query
  select q.position, q.question, q.options
  from public.quiz_questions q
  join public.assessments a on a.id = q.assessment_id and a.type::text = 'quiz'
  where q.assessment_id = p_assessment_id
  order by q.position;
end;
$$;

revoke execute on function public.get_quiz_questions(uuid) from public, anon;
grant execute on function public.get_quiz_questions(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- get_quiz_result(): the calling student's own result, only after they have
-- submitted the quiz (null otherwise). marks is the saved mark, so an admin
-- override on the marking page shows here too.
-- ---------------------------------------------------------------------------

create function public.get_quiz_result(p_assessment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_submission public.submissions;
  v_total numeric;
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
  end if;

  select * into v_submission
  from public.submissions
  where assessment_id = p_assessment_id and student_id = v_uid and quiz_answers is not null;

  if v_submission.id is null then
    return null;
  end if;

  select total_marks into v_total from public.assessments where id = p_assessment_id;

  return jsonb_build_object(
    'marks', v_submission.marks,
    'total', v_total,
    'submitted_at', v_submission.submitted_at,
    'is_late', v_submission.is_late,
    'questions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'position', q.position,
          'question', q.question,
          'options', to_jsonb(q.options),
          'chosen', v_submission.quiz_answers[q.position],
          'correct_index', q.correct_index
        )
        order by q.position
      )
      from public.quiz_questions q
      where q.assessment_id = p_assessment_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.get_quiz_result(uuid) from public, anon;
grant execute on function public.get_quiz_result(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- submit_quiz(): the only student write path for a quiz. One attempt, final.
-- p_answers: one 0-based option index per question, in position order.
-- ---------------------------------------------------------------------------

create function public.submit_quiz(p_assessment_id uuid, p_answers smallint[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_role public.user_role;
  v_is_active boolean;
  v_student_batch_id uuid;
  v_course_id uuid;
  v_batch_id uuid;
  v_type text;
  v_due_at timestamptz;
  v_count integer;
  v_score integer;
  v_is_late boolean;
begin
  if v_uid is null then
    raise exception 'You must be signed in to submit.';
  end if;

  select role, is_active, batch_id into v_role, v_is_active, v_student_batch_id
  from public.profiles
  where id = v_uid;

  if v_role is distinct from 'student' or v_is_active is not true then
    raise exception 'Only an active student can submit a quiz.';
  end if;

  select course_id, batch_id, type::text, due_at
  into v_course_id, v_batch_id, v_type, v_due_at
  from public.assessments
  where id = p_assessment_id;

  if v_course_id is null or v_type is distinct from 'quiz' then
    raise exception 'Quiz not found.';
  end if;

  if not exists (
    select 1 from public.enrollments
    where student_id = v_uid and course_id = v_course_id
  ) or (v_batch_id is not null and v_student_batch_id is distinct from v_batch_id) then
    raise exception 'This quiz is not available to you.';
  end if;

  if exists (
    select 1 from public.submissions
    where assessment_id = p_assessment_id and student_id = v_uid
  ) then
    raise exception 'You have already submitted this quiz.';
  end if;

  select count(*) into v_count from public.quiz_questions where assessment_id = p_assessment_id;
  if v_count = 0 then
    raise exception 'This quiz has no questions yet.';
  end if;

  if p_answers is null or array_ndims(p_answers) is distinct from 1 or cardinality(p_answers) <> v_count then
    raise exception 'Answer every question before submitting.';
  end if;

  if exists (
    select 1 from public.quiz_questions q
    where q.assessment_id = p_assessment_id
      and (
        p_answers[q.position] is null
        or p_answers[q.position] < 0
        or p_answers[q.position] >= cardinality(q.options)
      )
  ) then
    raise exception 'Answer every question before submitting.';
  end if;

  select count(*) into v_score
  from public.quiz_questions q
  where q.assessment_id = p_assessment_id
    and p_answers[q.position] = q.correct_index;

  v_is_late := now() > v_due_at;

  -- Scored straight away, so marked_at is set; marked_by stays null, which
  -- is how an automatic score is told apart from an admin's mark.
  insert into public.submissions (
    assessment_id, student_id, file_paths, submitted_at, is_late, counts_toward_report,
    marks, marked_at, quiz_answers
  )
  values (
    p_assessment_id, v_uid, '{}', now(), v_is_late, not v_is_late,
    v_score, now(), p_answers
  );

  return public.get_quiz_result(p_assessment_id);
end;
$$;

revoke execute on function public.submit_quiz(uuid, smallint[]) from public, anon;
grant execute on function public.submit_quiz(uuid, smallint[]) to authenticated;

-- ---------------------------------------------------------------------------
-- submit_assignment(): a quiz is answered on the page, never uploaded.
-- Otherwise unchanged from Stage 14; same signature, so `create or replace`
-- keeps the grants.
-- ---------------------------------------------------------------------------

create or replace function public.submit_assignment(p_assessment_id uuid, p_file_paths text[])
returns public.submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_role public.user_role;
  v_is_active boolean;
  v_course_id uuid;
  v_batch_id uuid;
  v_type text;
  v_due_at timestamptz;
  v_student_batch_id uuid;
  v_path text;
  v_prefix text;
  v_is_late boolean;
  v_result public.submissions;
begin
  if v_uid is null then
    raise exception 'You must be signed in to submit.';
  end if;

  select role, is_active into v_role, v_is_active
  from public.profiles
  where id = v_uid;

  if v_role is distinct from 'student' or v_is_active is not true then
    raise exception 'Only an active student can submit work.';
  end if;

  select course_id, batch_id, type::text, due_at
  into v_course_id, v_batch_id, v_type, v_due_at
  from public.assessments
  where id = p_assessment_id;

  if v_course_id is null then
    raise exception 'Assessment not found.';
  end if;

  if v_type = 'quiz' then
    raise exception 'A quiz is answered on its page, not uploaded.';
  end if;

  if not exists (
    select 1 from public.enrollments
    where student_id = v_uid and course_id = v_course_id
  ) then
    raise exception 'This assessment is not available to you.';
  end if;

  if v_batch_id is not null then
    select batch_id into v_student_batch_id from public.profiles where id = v_uid;
    if v_student_batch_id is distinct from v_batch_id then
      raise exception 'This assessment is not available to you.';
    end if;
  end if;

  if exists (
    select 1 from public.submissions
    where assessment_id = p_assessment_id and student_id = v_uid
  ) then
    raise exception 'You have already submitted this assessment.';
  end if;

  if p_file_paths is null or array_length(p_file_paths, 1) is null
     or array_length(p_file_paths, 1) < 1 or array_length(p_file_paths, 1) > 10 then
    raise exception 'Submit between 1 and 10 files.';
  end if;

  v_prefix := p_assessment_id::text || '/' || v_uid::text || '/';
  foreach v_path in array p_file_paths loop
    if left(v_path, length(v_prefix)) <> v_prefix then
      raise exception 'Invalid file path.';
    end if;
    if not exists (
      select 1 from storage.objects
      where bucket_id = 'submissions' and name = v_path
    ) then
      raise exception 'One of the uploaded files could not be found. Please try again.';
    end if;
  end loop;

  v_is_late := now() > v_due_at;

  insert into public.submissions (
    assessment_id, student_id, file_paths, submitted_at, is_late, counts_toward_report
  )
  values (p_assessment_id, v_uid, p_file_paths, now(), v_is_late, not v_is_late)
  returning * into v_result;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- notify_new_assessment(): "New quiz: <title>" for quizzes. Otherwise
-- unchanged from Stage 17; same signature, so `create or replace` keeps the
-- grants. Editing a quiz never calls this, so edits don't re-notify.
-- ---------------------------------------------------------------------------

create or replace function public.notify_new_assessment(p_assessment_id uuid)
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
    case a.type::text
      when 'test' then 'New test: '
      when 'quiz' then 'New quiz: '
      else 'New assignment: '
    end || a.title,
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
