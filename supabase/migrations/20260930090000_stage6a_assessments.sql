-- Stage 6A — Assessments (SPEC §4, §8, §10, §14)
--
-- Creates both `assessments` and `submissions` now (designed together so
-- Stage 6B needs no further schema changes), but only wires up the admin-CRUD
-- and read-only student-visibility RLS for this part. Student upload/replace
-- and the admin marking UI are Stage 6B work:
--   - no student write policy exists on `submissions` yet;
--   - the `submissions` storage bucket is not created here (see the Stage 3
--     storage migration's own comment anticipating this);
--   - `is_late` / `counts_toward_report` recompute-on-due_at-change and the
--     total_marks floor are enforced below (owner decisions, Stage 6), even
--     though nothing writes a submission yet.
--
-- Owner decisions logged in SPEC §15 (2026-09-30): no resubmission (a
-- submission is final once made); admin may enter marks without an upload;
-- an assessment is visible to a student if they are enrolled in its course
-- and (it is course-wide or targets their batch), OR they already have a
-- submission for it regardless of current enrollment/batch; an assessment
-- can only be deleted with no submissions/marks; total_marks cannot be
-- lowered below any mark already given.

create type public.assessment_type as enum ('assignment', 'test');

-- ---------------------------------------------------------------------------
-- assessments
-- ---------------------------------------------------------------------------

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  -- restrict: extends the existing "a course can only be deleted once it is
  -- empty" rule (SPEC §8) to cover assessments too. deleteCourse() is
  -- extended to pre-check this in the same change as this migration.
  course_id uuid not null references public.courses (id) on delete restrict,
  -- restrict, not set null: a null batch_id means "visible to the whole
  -- course", so silently nulling it on batch delete would widen a
  -- batch-only assessment's visibility. deleteBatch() is extended to
  -- pre-check this in the same change as this migration.
  batch_id uuid references public.batches (id) on delete restrict,
  type public.assessment_type not null,
  title text not null,
  instructions text not null,
  attachment_path text,
  due_at timestamptz not null,
  total_marks numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessments_title_not_blank check (btrim(title) <> ''),
  constraint assessments_total_marks_check check (total_marks > 0 and total_marks = round(total_marks, 1))
);

create index assessments_course_id_idx on public.assessments (course_id);
create index assessments_batch_id_idx on public.assessments (batch_id);

create trigger assessments_set_updated_at
before update on public.assessments
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- submissions
-- ---------------------------------------------------------------------------

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  -- restrict: an assessment can only be deleted once it has no
  -- submissions/marks (owner decision, Stage 6). deleteAssessment() is the
  -- app-level pre-check; this FK is the backstop.
  assessment_id uuid not null references public.assessments (id) on delete restrict,
  -- Students are deactivated, never hard-deleted, from the UI (SPEC §8), so
  -- this cascade path mirrors enrollments.student_id.
  student_id uuid not null references public.profiles (id) on delete cascade,
  -- Empty for tests; admin may also enter marks with no upload at all
  -- (owner decision, Stage 6 — work sent via WhatsApp etc.).
  file_paths text[] not null default '{}',
  submitted_at timestamptz,
  is_late boolean not null default false,
  marks numeric,
  feedback text,
  counts_toward_report boolean not null default true,
  marked_by uuid references public.profiles (id) on delete set null,
  marked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint submissions_marks_decimal_check check (marks is null or marks = round(marks, 1)),
  unique (assessment_id, student_id)
);

create index submissions_assessment_id_idx on public.submissions (assessment_id);
create index submissions_student_id_idx on public.submissions (student_id);

create trigger submissions_set_updated_at
before update on public.submissions
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Cross-table checks a plain CHECK constraint can't express
-- ---------------------------------------------------------------------------

-- Marks must stay within [0, assessment.total_marks] (SPEC §8 "Marks").
create function public.check_submission_marks()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_total_marks numeric;
begin
  if new.marks is null then
    return new;
  end if;

  select total_marks into v_total_marks
  from public.assessments
  where id = new.assessment_id;

  if v_total_marks is null then
    raise exception 'Assessment % does not exist', new.assessment_id;
  end if;

  if new.marks < 0 or new.marks > v_total_marks then
    raise exception 'Marks must be between 0 and % for this assessment', v_total_marks;
  end if;

  return new;
end;
$$;

create trigger submissions_check_marks
before insert or update of marks, assessment_id on public.submissions
for each row execute function public.check_submission_marks();

-- total_marks cannot be lowered below any mark already given (owner
-- decision, Stage 6). updateAssessment() also pre-checks this for a
-- friendly error; this trigger is the backstop.
create function public.check_total_marks_floor()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_max_marks numeric;
begin
  select max(marks) into v_max_marks
  from public.submissions
  where assessment_id = new.id;

  if v_max_marks is not null and new.total_marks < v_max_marks then
    raise exception 'total_marks cannot be lower than the highest mark already given (%)', v_max_marks;
  end if;

  return new;
end;
$$;

create trigger assessments_check_total_marks_floor
before update of total_marks on public.assessments
for each row execute function public.check_total_marks_floor();

-- ---------------------------------------------------------------------------
-- assessments RLS
-- ---------------------------------------------------------------------------

alter table public.assessments enable row level security;

revoke all on public.assessments from anon, authenticated;
grant select, insert, update, delete on public.assessments to authenticated;

create policy "Admins can read every assessment"
on public.assessments
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert assessments"
on public.assessments
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update assessments"
on public.assessments
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete assessments"
on public.assessments
for delete
to authenticated
using (public.is_admin());

-- Visible if enrolled in the course and (course-wide or matching batch), OR
-- the student already has a submission for it regardless of their current
-- enrollment/batch (owner decision, Stage 6).
create policy "Students can read visible assessments"
on public.assessments
for select
to authenticated
using (
  (
    exists (
      select 1 from public.enrollments e
      where e.student_id = (select auth.uid()) and e.course_id = assessments.course_id
    )
    and (
      batch_id is null
      or batch_id = (select batch_id from public.profiles where id = (select auth.uid()))
    )
  )
  or exists (
    select 1 from public.submissions s
    where s.assessment_id = assessments.id and s.student_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- submissions RLS — admin-only writes for now; student upload/replace is
-- Stage 6B work, so no student write policy exists on this table yet.
-- ---------------------------------------------------------------------------

alter table public.submissions enable row level security;

revoke all on public.submissions from anon, authenticated;
grant select on public.submissions to authenticated;
grant insert, update, delete on public.submissions to authenticated;

create policy "Admins can read every submission"
on public.submissions
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert submissions"
on public.submissions
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update submissions"
on public.submissions
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete submissions"
on public.submissions
for delete
to authenticated
using (public.is_admin());

create policy "Students can read their own submissions"
on public.submissions
for select
to authenticated
using (student_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- storage.objects (course-files): students can also read assessment
-- attachments they can see, using the same visibility rule as above.
-- Assessment attachments reuse the course-files bucket created in Stage 3;
-- the submissions bucket for student uploads is Stage 6B work.
-- ---------------------------------------------------------------------------

create policy "Students can read course-files of visible assessments"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'course-files'
  and exists (
    select 1
    from public.assessments a
    where a.attachment_path = storage.objects.name
      and (
        (
          exists (
            select 1 from public.enrollments e
            where e.student_id = (select auth.uid()) and e.course_id = a.course_id
          )
          and (a.batch_id is null or a.batch_id = (select batch_id from public.profiles where id = (select auth.uid())))
        )
        or exists (
          select 1 from public.submissions s
          where s.assessment_id = a.id and s.student_id = (select auth.uid())
        )
      )
  )
);
