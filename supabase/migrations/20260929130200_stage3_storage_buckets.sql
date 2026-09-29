-- Stage 3 — Settings & courses: storage buckets (SPEC §10, §11)
--
-- public-assets: public bucket for the logo only.
-- course-files: private bucket for resource files (PDF/JPG/PNG/WEBP, admin
-- uploads only for now, read via short-lived signed URLs). The `submissions`
-- bucket from SPEC §10 is Stage 6 work and is not created here.
--
-- Limits are enforced both here (bucket-level backstop) and in the upload UI.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'public-assets',
    'public-assets',
    true,
    2097152, -- 2 MB; must match MAX_LOGO_FILE_BYTES in src/lib/validation/settings.ts
    array['image/png', 'image/jpeg', 'image/webp'] -- svg deliberately excluded (XSS risk)
  ),
  (
    'course-files',
    'course-files',
    false,
    10485760, -- 10 MB; must match MAX_RESOURCE_FILE_BYTES in src/lib/validation/resources.ts
    array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do nothing;

-- storage.objects already has RLS enabled by Supabase; only policies are added.

create policy "Anyone can view public-assets objects"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'public-assets');

create policy "Admins can upload public-assets objects"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'public-assets' and public.is_admin());

create policy "Admins can update public-assets objects"
on storage.objects
for update
to authenticated
using (bucket_id = 'public-assets' and public.is_admin())
with check (bucket_id = 'public-assets' and public.is_admin());

create policy "Admins can delete public-assets objects"
on storage.objects
for delete
to authenticated
using (bucket_id = 'public-assets' and public.is_admin());

-- course-files: admin-only in every direction for now. Enrolled-student read
-- access is Stage 5 work.
create policy "Admins can read course-files objects"
on storage.objects
for select
to authenticated
using (bucket_id = 'course-files' and public.is_admin());

create policy "Admins can upload course-files objects"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'course-files' and public.is_admin());

create policy "Admins can update course-files objects"
on storage.objects
for update
to authenticated
using (bucket_id = 'course-files' and public.is_admin())
with check (bucket_id = 'course-files' and public.is_admin());

create policy "Admins can delete course-files objects"
on storage.objects
for delete
to authenticated
using (bucket_id = 'course-files' and public.is_admin());
