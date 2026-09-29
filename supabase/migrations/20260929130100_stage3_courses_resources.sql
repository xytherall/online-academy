-- Stage 3 — Settings & courses: courses & resources (SPEC §4, §8, §10, §14)
--
-- Admin-managed courses (published/unpublished) and the file/link resources
-- attached to them. Enrollment- and assessment-based access is Stage 4/5/6
-- work and is deliberately not added here.

create type public.course_level as enum ('O', 'A');
create type public.resource_kind as enum ('file', 'link');

-- ---------------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------------

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  level public.course_level not null,
  description text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_title_not_blank check (btrim(title) <> ''),
  constraint courses_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create trigger courses_set_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- resources
-- ---------------------------------------------------------------------------

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  -- restrict, not cascade: SPEC §8 "deleting a course is only allowed when it
  -- is empty" — this FK is the backstop behind the app-level pre-check in the
  -- deleteCourse server action.
  course_id uuid not null references public.courses (id) on delete restrict,
  title text not null,
  kind public.resource_kind not null,
  file_path text,
  url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resources_title_not_blank check (btrim(title) <> ''),
  -- Exactly one of file_path / url is set, matching kind (SPEC §10).
  constraint resources_kind_payload_check check (
    (kind = 'file' and file_path is not null and url is null)
    or (kind = 'link' and url is not null and file_path is null and url ~* '^https://')
  )
);

create index resources_course_id_sort_order_idx on public.resources (course_id, sort_order);

create trigger resources_set_updated_at
before update on public.resources
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- courses RLS
-- ---------------------------------------------------------------------------

alter table public.courses enable row level security;

revoke all on public.courses from anon, authenticated;
grant select on public.courses to anon, authenticated;
grant insert, update, delete on public.courses to authenticated;

create policy "Anyone can read published courses"
on public.courses
for select
to anon, authenticated
using (is_published);

create policy "Admins can read every course"
on public.courses
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert courses"
on public.courses
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update courses"
on public.courses
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete courses"
on public.courses
for delete
to authenticated
using (public.is_admin());

-- ---------------------------------------------------------------------------
-- resources RLS — admin-only for now; enrolled-student read is Stage 5.
-- ---------------------------------------------------------------------------

alter table public.resources enable row level security;

revoke all on public.resources from anon, authenticated;
grant select, insert, update, delete on public.resources to authenticated;

create policy "Admins can read every resource"
on public.resources
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert resources"
on public.resources
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update resources"
on public.resources
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete resources"
on public.resources
for delete
to authenticated
using (public.is_admin());
