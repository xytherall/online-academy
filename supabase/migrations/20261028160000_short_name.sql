-- Settings: short name for the installed phone app (SPEC §5, §15)
--
-- The home-screen app was named with the full academy name, which phones
-- cut off under the icon. `short_name` is shown there instead; when it is
-- empty the app falls back to `academy_name` as before.

alter table public.site_settings
  add column if not exists short_name text;
