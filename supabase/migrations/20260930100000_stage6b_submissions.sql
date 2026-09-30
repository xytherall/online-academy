-- Stage 6B — Submissions & marking (SPEC §4, §8, §10, §14)
--
-- Creates the `submissions` storage bucket anticipated (but not created) by
-- Stage 3 and Stage 6A, the student-facing storage RLS on it, and the
-- `submit_assignment` RPC that is the *only* student write path onto the
-- `submissions` table — no direct student INSERT/UPDATE policy is added to
-- `submissions` itself; RLS on that table still only grants students SELECT
-- of their own rows (Stage 6A), with all writes going through admin policies
-- or this SECURITY DEFINER function.
--
-- Path convention: {assessment_id}/{student_id}/{uuid}-{sanitized name}.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submissions',
  'submissions',
  false,
  10485760, -- 10 MB; must match MAX_RESOURCE_FILE_BYTES in src/lib/validation/assessments.ts
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- storage.objects (submissions bucket)
-- ---------------------------------------------------------------------------

create policy "Admins can read submissions objects"
on storage.objects
for select
to authenticated
using (bucket_id = 'submissions' and public.is_admin());

create policy "Admins can upload submissions objects"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'submissions' and public.is_admin());

create policy "Admins can update submissions objects"
on storage.objects
for update
to authenticated
using (bucket_id = 'submissions' and public.is_admin())
with check (bucket_id = 'submissions' and public.is_admin());

create policy "Admins can delete submissions objects"
on storage.objects
for delete
to authenticated
using (bucket_id = 'submissions' and public.is_admin());

-- Students can only ever read their own files.
create policy "Students can read their own submissions objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'submissions'
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

-- Upload is only allowed into the student's own folder, for an assignment
-- (not a test) visible to them (course enrollment + batch match — the "or
-- already has a submission" branch of the Stage 6A visibility rule cannot
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
      and a.type = 'assignment'
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

-- Lets the client clean up an already-uploaded file if a later upload in the
-- same batch, or the submit_assignment RPC, fails — but only before a
-- submission row exists. Once submitted, files are locked (no resubmission,
-- SPEC §15 2026-09-30), so this can never delete a real submission's files.
create policy "Students can delete their own not-yet-submitted objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'submissions'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and not exists (
    select 1 from public.submissions s
    where s.assessment_id = ((storage.foldername(name))[1])::uuid
      and s.student_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- submit_assignment(): the only student write path onto `submissions`.
-- ---------------------------------------------------------------------------

create function public.submit_assignment(p_assessment_id uuid, p_file_paths text[])
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
  v_type public.assessment_type;
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
    raise exception 'Only an active student can submit an assignment.';
  end if;

  select course_id, batch_id, type, due_at
  into v_course_id, v_batch_id, v_type, v_due_at
  from public.assessments
  where id = p_assessment_id;

  if v_course_id is null then
    raise exception 'Assessment not found.';
  end if;

  if v_type is distinct from 'assignment' then
    raise exception 'Only assignments accept an upload.';
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
