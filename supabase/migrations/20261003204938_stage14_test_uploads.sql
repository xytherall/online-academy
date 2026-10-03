-- Stage 14: tests accept student uploads, exactly like assignments (owner
-- decision 2026-10-04, SPEC §15). The admin can still enter marks for a test
-- directly with no upload (e.g. a test done on paper in class).
--
-- Only the two "assignments only" checks from Stage 6B change: the storage
-- insert policy and submit_assignment(). Everything else is recreated
-- verbatim.

drop policy "Students can upload their own submissions objects" on storage.objects;

-- Upload is only allowed into the student's own folder, for an assessment
-- (assignment or test) visible to them (course enrollment + batch match —
-- the "or already has a submission" branch of the Stage 6A visibility rule cannot
-- apply here, since this same check also requires no submission row yet),
-- and only while they have not already submitted.
create policy "Students can upload their own submissions objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'submissions'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1
    from public.assessments a
    join public.enrollments e
      on e.student_id = (select auth.uid()) and e.course_id = a.course_id
    where a.id = ((storage.foldername(name))[1])::uuid
      and (
        a.batch_id is null
        or a.batch_id = (select batch_id from public.profiles where id = (select auth.uid()))
      )
  )
  and not exists (
    select 1 from public.submissions s
    where s.assessment_id = ((storage.foldername(name))[1])::uuid
      and s.student_id = (select auth.uid())
  )
);

-- submit_assignment() keeps its name (the app already calls it) but no longer
-- rejects tests.
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

  select course_id, batch_id, due_at
  into v_course_id, v_batch_id, v_due_at
  from public.assessments
  where id = p_assessment_id;

  if v_course_id is null then
    raise exception 'Assessment not found.';
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

revoke execute on function public.submit_assignment(uuid, text[]) from public, anon;
grant execute on function public.submit_assignment(uuid, text[]) to authenticated;
