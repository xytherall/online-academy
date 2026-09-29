-- Stage 4 — Students, batches, enrollments (SPEC §6, §8, §10, §14)
--
-- Creates batches and enrollments, and wires up the profiles.batch_id FK that
-- Stage 2 deliberately deferred until this table existed.

-- ---------------------------------------------------------------------------
-- batches
-- ---------------------------------------------------------------------------

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint batches_name_not_blank check (btrim(name) <> '')
);

create trigger batches_set_updated_at
before update on public.batches
for each row execute function public.set_updated_at();

-- The FK Stage 2 deferred: "FK to public.batches is added in Stage 4, when
-- that table exists." Students become unassigned when their batch is
-- deleted (SPEC §8 "Deleting" rules) — never cascaded.
alter table public.profiles
  add constraint profiles_batch_id_fkey
  foreign key (batch_id) references public.batches (id) on delete set null;

create index profiles_batch_id_idx on public.profiles (batch_id);

-- ---------------------------------------------------------------------------
-- enrollments
-- ---------------------------------------------------------------------------

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  -- Students are deactivated, never hard-deleted, from the UI (SPEC §8), so
  -- this cascade path is not exercised in practice; it is the safe default
  -- for referential integrity if a profile is ever removed directly.
  student_id uuid not null references public.profiles (id) on delete cascade,
  -- restrict: extends the existing "a course can only be deleted once it is
  -- empty" rule (SPEC §8) to cover enrolled students, not just resources.
  -- deleteCourse() must be extended to pre-check this (see SPEC §16).
  course_id uuid not null references public.courses (id) on delete restrict,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, course_id)
);

create index enrollments_student_id_idx on public.enrollments (student_id);
create index enrollments_course_id_idx on public.enrollments (course_id);

create trigger enrollments_set_updated_at
before update on public.enrollments
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- batches RLS
-- ---------------------------------------------------------------------------

alter table public.batches enable row level security;

revoke all on public.batches from anon, authenticated;
grant select on public.batches to authenticated;
grant insert, update, delete on public.batches to authenticated;

create policy "Admins can read every batch"
on public.batches
for select
to authenticated
using (public.is_admin());

-- A student needs their own batch's name/notes readable (used from Stage 5
-- onward); no student write policy exists on this table at all.
create policy "Students can read their own batch"
on public.batches
for select
to authenticated
using (
  id in (
    select batch_id from public.profiles where id = (select auth.uid())
  )
);

create policy "Admins can insert batches"
on public.batches
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update batches"
on public.batches
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete batches"
on public.batches
for delete
to authenticated
using (public.is_admin());

-- ---------------------------------------------------------------------------
-- enrollments RLS
-- ---------------------------------------------------------------------------

alter table public.enrollments enable row level security;

revoke all on public.enrollments from anon, authenticated;
grant select on public.enrollments to authenticated;
grant insert, update, delete on public.enrollments to authenticated;

create policy "Admins can read every enrollment"
on public.enrollments
for select
to authenticated
using (public.is_admin());

-- Students may read only their own enrollment rows; no student write policy
-- exists on this table at all (SPEC §3: students cannot change their own
-- enrollments or marks).
create policy "Students can read their own enrollments"
on public.enrollments
for select
to authenticated
using (student_id = (select auth.uid()));

create policy "Admins can insert enrollments"
on public.enrollments
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update enrollments"
on public.enrollments
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete enrollments"
on public.enrollments
for delete
to authenticated
using (public.is_admin());
