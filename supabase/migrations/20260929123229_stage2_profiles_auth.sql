-- Stage 2 — Auth & roles (SPEC §3, §10, §14)
--
-- Creates the role enum, the profiles table, the auth-user trigger, the RLS
-- helper functions and the RLS policies for profiles.
--
-- Note on RLS recursion: the helper functions below are SECURITY DEFINER and
-- owned by the migration role (postgres), which also owns public.profiles.
-- Table owners bypass RLS, so a policy on profiles can call a helper that
-- reads profiles without recursing. Do NOT enable FORCE ROW LEVEL SECURITY on
-- public.profiles — that would make the owner subject to RLS and reintroduce
-- the recursion.

-- ---------------------------------------------------------------------------
-- Role enum
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('admin', 'teacher', 'student');

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role public.user_role not null default 'student',
  email text not null,
  phone text,
  whatsapp text,
  country text,
  school text,
  guardian_name text,
  guardian_phone text,
  guardian_email text,
  -- FK to public.batches is added in Stage 4, when that table exists.
  batch_id uuid,
  is_active boolean not null default true,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.batch_id is
  'Foreign key to public.batches is added in the Stage 4 migration.';

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Profile creation on signup
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER so it can insert past RLS (there is no insert policy).
-- role is hardcoded to 'student' and is NEVER read from user metadata or any
-- other client-supplied input. Admins are promoted afterwards by an admin.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS helper functions
-- ---------------------------------------------------------------------------

create function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and p.is_active
  );
$$;

create function public.is_active_user()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active
  );
$$;

revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_active_user() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_active_user() to authenticated;

-- ---------------------------------------------------------------------------
-- Forced password change
-- ---------------------------------------------------------------------------

-- Students have no update policy on profiles, so the flag cannot be cleared by
-- the client directly. This clears it for the caller only, and is called by the
-- change-password server action after auth.updateUser() has succeeded.
create function public.complete_password_change()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set must_change_password = false
  where id = (select auth.uid());
$$;

revoke execute on function public.complete_password_change() from public, anon;
grant execute on function public.complete_password_change() to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select, update on public.profiles to authenticated;

-- Read own profile. Deliberately not filtered by is_active: the server must be
-- able to read the row in order to detect a deactivated account and sign it out.
create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Admins can read every profile"
on public.profiles
for select
to authenticated
using (public.is_admin());

-- Only admins may update profiles. There is deliberately no student update
-- policy, so role, batch_id, is_active and must_change_password can only be
-- changed by an admin or by a SECURITY DEFINER function on the server.
create policy "Admins can update every profile"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- No insert or delete policies: profiles are created by the auth trigger and
-- are never hard-deleted from the UI (students are deactivated instead).
