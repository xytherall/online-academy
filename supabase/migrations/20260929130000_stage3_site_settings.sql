-- Stage 3 — Settings & courses: site_settings (SPEC §5, §8, §10, §14)
--
-- Single-row table holding academy branding and contact details. Nothing is
-- seeded except the row itself: SPEC §2/§12 forbid any invented academy name,
-- logo or content, so every column starts null and is filled in by the admin
-- from /admin/settings.

create table public.site_settings (
  id smallint primary key default 1,
  academy_name text,
  tagline text,
  about_text text,
  contact_email text,
  contact_phone text,
  contact_whatsapp text,
  address text,
  social_links jsonb not null default '{}'::jsonb,
  logo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1),
  constraint site_settings_social_links_is_object check (jsonb_typeof(social_links) = 'object')
);

create trigger site_settings_set_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.site_settings enable row level security;

revoke all on public.site_settings from anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;

-- Public site (SPEC §5) reads academy name, logo, tagline, about text and
-- contact details from here while logged out, so anon needs select too.
create policy "Anyone can read site settings"
on public.site_settings
for select
to anon, authenticated
using (true);

create policy "Admins can update site settings"
on public.site_settings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- No insert or delete policy: the single row is seeded once below (as the
-- migration role, which bypasses RLS) and is never created or destroyed from
-- the app.

insert into public.site_settings (id) values (1);
