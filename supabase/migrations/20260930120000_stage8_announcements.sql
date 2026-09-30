-- Stage 8 — Announcements (SPEC §4, §8, §10, §14)
--
-- Owner decisions (2026-09-30): target is everyone / one course / one batch,
-- at most one of course_id/batch_id (enforced by a check constraint); if the
-- targeted course or batch is deleted, its announcements are deleted too
-- (on delete cascade, never set null — set null would silently turn a
-- targeted announcement into an "everyone" announcement, which nobody
-- chose). This is the opposite of assessments.batch_id's `restrict` from
-- Stage 6A, because assessments has no "everyone" state to fall into by
-- accident and announcements does.

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  course_id uuid references public.courses (id) on delete cascade,
  batch_id uuid references public.batches (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint announcements_title_not_blank check (btrim(title) <> ''),
  constraint announcements_title_length check (char_length(title) <= 200),
  constraint announcements_body_not_blank check (btrim(body) <> ''),
  constraint announcements_body_length check (char_length(body) <= 5000),
  -- At most one of course_id/batch_id; both null means everyone.
  constraint announcements_single_target check (course_id is null or batch_id is null)
);

create index announcements_course_id_idx on public.announcements (course_id);
create index announcements_batch_id_idx on public.announcements (batch_id);
create index announcements_created_at_idx on public.announcements (created_at desc);

create trigger announcements_set_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.announcements enable row level security;

revoke all on public.announcements from anon, authenticated;
grant select, insert, update, delete on public.announcements to authenticated;

create policy "Admins can read every announcement"
on public.announcements
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert announcements"
on public.announcements
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update announcements"
on public.announcements
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete announcements"
on public.announcements
for delete
to authenticated
using (public.is_admin());

-- Visible if it's for everyone, or for a course the student is enrolled in,
-- or for the student's current batch. No student write policy (SPEC §3).
create policy "Students can read their announcements"
on public.announcements
for select
to authenticated
using (
  (course_id is null and batch_id is null)
  or (
    course_id is not null
    and exists (
      select 1 from public.enrollments e
      where e.student_id = (select auth.uid()) and e.course_id = announcements.course_id
    )
  )
  or (
    batch_id is not null
    and batch_id = (select batch_id from public.profiles where id = (select auth.uid()))
  )
);
