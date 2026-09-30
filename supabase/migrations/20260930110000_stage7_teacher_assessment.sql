-- Stage 7 — Progress report: teacher assessment fields (SPEC §8, §9, §10, §14)
--
-- Adds the per-course "teacher assessment" fields shown on the progress
-- report alongside the existing free-text `remarks`. These are plain columns
-- on `enrollments`, so the existing Stage 4 RLS policies already cover them
-- (policies are row-level, not column-level): admins can update every
-- enrollment row, students can only ever read their own. No RLS changes are
-- needed here.

create type public.enrollment_rating as enum ('excellent', 'good', 'satisfactory', 'needs_improvement');

alter table public.enrollments
  add column effort_rating public.enrollment_rating,
  add column participation_rating public.enrollment_rating,
  -- Same length limit as the existing `remarks` field (see
  -- src/lib/validation/students.ts), since these are the same kind of short
  -- free-text admin note.
  add column strengths text,
  add column areas_to_improve text;
