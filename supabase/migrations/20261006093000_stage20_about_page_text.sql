-- Stage 20 — Settings: separate the home page intro from the About page
-- (SPEC §5, §8, §10, §14)
--
-- `about_text` fed both the home page hero subtext and the /about page.
-- Split it: `about_text` stays the home page's intro, and the new
-- `about_page_text` controls only /about. Existing content is copied into
-- the new column so nothing visible changes until the admin edits either
-- one separately.

alter table public.site_settings
  add column about_page_text text;

update public.site_settings
set about_page_text = about_text
where about_page_text is null;
