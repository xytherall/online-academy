-- Stage 5 — Student portal basics: enrolled-student reads (SPEC §3, §10, §14)
--
-- Closes the "enrolled-student read is Stage 5 work" TODOs left in the Stage 3
-- migrations. Students can now read courses and resources for courses they
-- are enrolled in, and read the course-files storage objects that belong to
-- those resources — all via short-lived signed URLs generated server-side
-- after an explicit enrollment check. No new tables or columns. Upload,
-- update and delete on courses/resources/course-files stay admin-only.
--
-- An enrolled student can see a course even if it is unpublished: publishing
-- only controls visibility on the public site (owner decision, Stage 5).

-- ---------------------------------------------------------------------------
-- courses: enrolled students can read their own courses, published or not
-- ---------------------------------------------------------------------------

create policy "Students can read their enrolled courses"
on public.courses
for select
to authenticated
using (
  id in (
    select course_id from public.enrollments where student_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- resources: enrolled students can read resources of their own courses
-- ---------------------------------------------------------------------------

create policy "Students can read resources of their enrolled courses"
on public.resources
for select
to authenticated
using (
  course_id in (
    select course_id from public.enrollments where student_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- storage.objects (course-files): enrolled students can read files that
-- belong to a resource of a course they are enrolled in.
-- ---------------------------------------------------------------------------

create policy "Students can read course-files of their enrolled courses"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'course-files'
  and exists (
    select 1
    from public.resources r
    join public.enrollments e on e.course_id = r.course_id
    where r.file_path = storage.objects.name
      and e.student_id = (select auth.uid())
  )
);
