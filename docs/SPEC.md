# Academy Platform — Specification v1

> Source of truth for what we are building. Agreed through planning discussions.
> Do not change a decision in this file without the project owner's explicit approval.
> If a new request conflicts with something here, point out the conflict before doing anything.

---

## 1. Purpose

A simple, clean, well-organized website for an existing online O Level / A Level academy.

It does three things:

1. **Presents the academy** to the public and accepts applications.
2. **Gives students one place** for their courses, study materials, assignments, marks, progress and announcements.
3. **Gives admins one place** to manage applications, students, batches, courses, marking, reports and announcements — without editing code.

Everything else stays outside the website for now. Live classes happen on Zoom / Google Meet. Class schedules, meeting links, attendance and fees are handled by the academy directly, e.g. over WhatsApp.

**Guiding rule:** keep it simple. This is a practical academy system, not a commercial LMS. Build only what is listed here.

---

## 2. Confirmed facts & decisions

| Area | Decision |
|---|---|
| Levels | O Level and A Level. Initially mostly Maths and Physics. |
| Language | English only |
| Teaching | Live online classes (Zoom/Meet). Recordings may be added later as link resources. |
| Admissions | Public application form → admin accepts/rejects → accepted students get an account |
| Existing students | About 10 already enrolled. Admin adds them directly (no application). |
| Payments | **Not built.** Handled offline (JazzCash etc.). |
| Class schedule / meeting links | **Not built.** Handled via WhatsApp. |
| Attendance | **Not built.** Handled by the academy. |
| Batches | Admin-defined groups of students, e.g. by country. Not tied to a course. **One batch per student.** |
| Roles in v1 | Admin and Student. Teacher role exists in the database but has **no dashboard in v1**. |
| Admins | Project owner and current teacher (both have full admin rights) |
| Assignments | Due dates set by the teacher. Late submissions are **accepted and flagged**. |
| Late marks | Do **not** count toward the report by default. Admin can override per submission. |
| Tests | Marks entered manually by admin (no upload) |
| Remarks | Admin can write remarks per student per course |
| Guardians | Guardian contact collected on the application. Progress shared via a printable report. No guardian accounts. |
| Announcements | Target: everyone, one course, or one batch |
| Branding | No name or logo yet. All academy info is editable from admin Settings. Nothing hardcoded. |
| Content | **No fake or placeholder data** (no invented names, courses, teachers, stats or testimonials) |
| Domain | None yet |
| Budget | Free tiers wherever possible |
| Hosting | Netlify (free tier) |
| Email | Not used in v1 (no domain yet). Admin shares login details manually. |

---

## 3. Roles & permissions

Permissions are enforced **on the server and in the database (Supabase Row Level Security)**. Hiding UI elements is for convenience only, never for security.

### Admin
- Full access to all admin pages and all data.
- Can create, edit and deactivate student accounts, and reset student passwords.

### Student
- Can read **only** their own profile, enrollments, batch name and marks/feedback/remarks.
- Can see courses they are enrolled in, and resources/assessments for those courses. Assessments targeted at a batch are visible only to that batch.
- Can create and replace **their own** submissions (rules in §8).
- Can see announcements addressed to everyone, to their courses, or to their batch.
- Can change their own password.
- **Cannot** change their own role, batch, enrollments, marks, late flag or active status.

### Teacher (future)
- The `teacher` value exists in the role field so it can be added later without migration pain.
- No teacher pages, policies or dashboard in v1.

### Public (not logged in)
- Can view public pages and published courses.
- Can submit an application. Cannot read any application.

### Deactivated users
- Cannot access the portal. They are checked server-side on every portal request.
- Their data is kept.

---

## 4. Key concepts

**Course**
- One subject at one level, e.g. "O Level Mathematics".
- Created by the admin; none are pre-filled.
- Has a published/unpublished state. Only published courses appear on the public site.

**Batch**
- A named group of students chosen by the admin, e.g. by country.
- Not tied to a course. A student belongs to zero or one batch.

**Enrollment**
- A student is enrolled in one or more courses.
- Holds the admin's remarks for that student in that course.

**Resource**
- A PDF or a link attached to a course.
- Class recordings added later are simply link resources.

**Assessment**
- Anything that receives marks. Always belongs to a course.
- Can optionally target one batch; otherwise it is visible to everyone enrolled in the course.
- Two types:
  - **Assignment**: students upload work (PDF or images) and admin marks it.
  - **Test**: no upload. Admin enters marks directly.
- Fields: title, instructions, optional attachment, due date, total marks.

**Submission / Result**
- One record per student per assessment.
- For assignments it holds the uploaded files. For tests it holds only marks.
- Stores marks, feedback, late flag and whether it counts toward the report.

---

## 5. Public website

| Route | Content |
|---|---|
| `/` | Home: academy intro, offered courses, how to apply, link to login |
| `/courses` | Published courses from the database, grouped by O/A Level |
| `/courses/[slug]` | Course description, who it is for, "Apply" button |
| `/about` | About text from Settings |
| `/contact` | Contact details from Settings |
| `/apply` | Application form |
| `/apply/success` | Confirmation after applying |
| `/login` | Portal login |

Rules:
- Academy name, logo, tagline, about text and contact details come from `site_settings`.
- Any section whose content is empty is hidden. No filler text.
- If no courses are published, the courses page shows a proper empty state.
- Logged-in users visiting `/login` are redirected to their dashboard.

---

## 6. Application flow

### Form fields

| Group | Field | Required |
|---|---|---|
| Student | Full name | Yes |
| | Email | Yes |
| | Phone number | Yes |
| | WhatsApp number (with a "same as phone" checkbox) | No (some international students may not have WhatsApp) |
| | Country | Yes |
| | Current school | No |
| Study | Level (O Level / A Level) | Yes |
| | Course(s) — chosen from published courses of that level | Yes, at least one |
| Guardian | Guardian name | No |
| | Guardian phone | No |
| | Guardian email | No |
| Other | How did you hear about us | No |

- Validation happens on the client **and** on the server (Zod).
- Basic spam protection: a hidden honeypot field plus server-side validation.
- No captcha in v1.

### Review
1. The submitted application is stored with status `pending` and appears in Admin → Applications.
2. Admin opens it and chooses **Accept** or **Reject**.
3. **Accept** does the following in one server-side operation:
   - creates the student auth account (email + temporary password set by the admin);
   - creates the profile, copying details from the application;
   - enrolls the student in the chosen courses;
   - optionally assigns a batch;
   - marks the application `accepted`.
4. **Reject** marks the application `rejected`. The admin contacts the applicant themselves if needed.
5. Admin shares login details with the student (WhatsApp/email).
6. On first login the student **must** set a new password before seeing the portal.

If an account with the applicant's email already exists, Accept fails with a clear message. It never creates duplicates.

### Existing students
Admin → Students → **Add student** creates an account directly, with the same fields, courses, batch and temporary password.

### Password reset (v1)
Admin sets a new temporary password from the student's page. The student must change it on next login.

Email-based "forgot password" and invites will be added once a domain and email provider exist.

---

## 7. Student portal

| Route | Shows |
|---|---|
| `/student` | Dashboard: latest announcements, assignments due soon or overdue, recently marked work |
| `/student/courses` | Enrolled courses |
| `/student/courses/[id]` | Course: resources, assessments with status and marks |
| `/student/assessments/[id]` | Instructions, attachment, due date, upload/replace submission, marks and feedback once marked |
| `/student/report` | Progress report (see §9) |
| `/student/announcements` | All announcements addressed to the student |
| `/student/account` | View own details, change password |
| `/change-password` | Forced password change on first login / after reset |

### Assessment statuses shown to students
- **Not submitted**
- **Submitted**
- **Submitted late**
- **Marked**
- **Missing** (past due, nothing submitted)

Tests show **Marked** or **Not yet marked**.

All dates and times are shown in the **viewer's local time**.

---

## 8. Admin area

| Route | Does |
|---|---|
| `/admin` | Overview. Real counts only: pending applications, submissions waiting to be marked, active students. |
| `/admin/applications` | List, filterable by status |
| `/admin/applications/[id]` | Review, accept (choose batch and temp password) or reject |
| `/admin/students` | List with search and filters: batch, course, country, active |
| `/admin/students/new` | Add student directly |
| `/admin/students/[id]` | Details, guardian info, courses, batch, remarks per course, reset password, deactivate/reactivate |
| `/admin/students/[id]/report` | Printable progress report (browser print / save as PDF) |
| `/admin/batches` | Create, rename, delete batches; assign and remove students |
| `/admin/courses` | List of courses |
| `/admin/courses/new` | Create course |
| `/admin/courses/[id]` | Edit course, publish/unpublish, manage resources and assessments |
| `/admin/assessments/[id]` | Submissions for one assessment. Enter marks/feedback. For tests, enter marks for all targeted students in one table. |
| `/admin/marking` | All submissions waiting to be marked, across all courses |
| `/admin/announcements` | Create, edit, delete. Target: everyone / one course / one batch. |
| `/admin/settings` | Academy name, logo, tagline, about text, contact details |

### Business rules

**Late flag**
- Set **by the server** when `submitted_at > due_at`. Never trusted from the client.

**Counts toward report**
- Defaults to `true` for on-time submissions and `false` for late ones.
- Admin can toggle it per submission.

**Resubmission**
- A student may replace their submission **until it is marked**. After marking it is locked.
- Replacing a submission re-evaluates the late flag.

**Marks**
- Number from 0 to the assessment's total marks. One decimal place allowed.

**Deleting**
- *Courses*: unpublish instead of deleting once they have enrollments or assessments. Deleting is only allowed when a course is empty.
- *Batches*: deleting a batch leaves its students without a batch. Nothing else is deleted.
- *Students*: deactivated, never hard-deleted, from the UI.

**Due dates**
- Admin enters them in their local time.
- Stored in UTC; displayed in each viewer's local time.

---

## 9. Progress report

Covers all of a student's work so far (no date filter). Shown per course the student is enrolled in, plus a summary box at the top. Subjects are never averaged together.

**Header**: academy name + logo from `site_settings` (no invented fallback — hidden if unset), "Student Progress Report", student name, batch, country, date generated (viewer's local time, client-side).

**Summary box**: one line per enrolled course, side by side — overall %, assignments %, tests %, missing count.

**Per course**
- Title + level.
- **Overall %, Assignments %, Tests %** — each is sum of counted marks ÷ sum of total marks of counted assessments (marks not null AND `counts_toward_report` true), rounded to 1 decimal. Shows "No marked work yet" instead of 0% when nothing is counted in that category.
- "X of Y marked", and **missing count** = assignments past due with no submission.
- **Strongest / weakest result**: the counted assessment with the highest / lowest percentage (ties → most recently due). Only shown with at least 2 counted assessments; weakest is hidden if it ties the strongest.
- **Assessment table**: title, type, due date (local time), marks/total, status. Late-and-not-counted rows carry a footnote. Upcoming (not yet due) work is listed but affects nothing.
- **Teacher assessment** (only filled-in fields shown; the whole block is hidden if all are empty): Effort (Excellent/Good/Satisfactory/Needs improvement), Class participation (same scale), Strengths, Areas to improve, Other comments (the `enrollments.remarks` field, relabelled). No per-assessment feedback is shown here — students see that on the assessment page.

Explicitly excluded from v1: letter grades, cross-subject average, rank/comparison, charts, attendance, guardian name, signature line.

**Where it appears**
- The student sees it at `/student/report`.
- The admin sees the same report at `/admin/students/[id]/report`, with a "Print / Save as PDF" button (browser print). Both pages render the same shared component from the same calculation module, so the numbers can never differ.

---

## 10. Data model

All tables have `id` (uuid) and `created_at`. Tables that get edited also have `updated_at`.

### `profiles`
One row per auth user; `id` equals the auth user id.

| Field | Notes |
|---|---|
| `full_name` | |
| `role` | enum: `admin` / `teacher` / `student` |
| `email` | |
| `phone` | |
| `whatsapp` | nullable |
| `country` | |
| `school` | nullable |
| `guardian_name` | nullable |
| `guardian_phone` | nullable |
| `guardian_email` | nullable |
| `batch_id` | nullable, FK → `batches` |
| `is_active` | boolean, default true |
| `must_change_password` | boolean |

### `applications`

| Field | Notes |
|---|---|
| form fields | as in §6 |
| `level` | |
| `course_ids` | the courses chosen |
| `status` | enum: `pending` / `accepted` / `rejected` |
| `reviewed_by` | nullable |
| `reviewed_at` | nullable |
| `student_id` | nullable; set on accept |

### `batches`

| Field | Notes |
|---|---|
| `name` | unique |
| `notes` | nullable |

### `courses`

| Field | Notes |
|---|---|
| `title` | |
| `slug` | unique |
| `level` | enum: `O` / `A` |
| `description` | |
| `is_published` | |

### `enrollments`

| Field | Notes |
|---|---|
| `student_id` | FK → `profiles` |
| `course_id` | FK → `courses` |
| `remarks` | nullable |
| `effort_rating` | nullable; enum `enrollment_rating`: `excellent` / `good` / `satisfactory` / `needs_improvement` |
| `participation_rating` | nullable; same enum as `effort_rating` |
| `strengths` | nullable |
| `areas_to_improve` | nullable |

Unique on (`student_id`, `course_id`).

### `resources`

| Field | Notes |
|---|---|
| `course_id` | FK → `courses` |
| `title` | |
| `kind` | enum: `file` / `link` |
| `file_path` | nullable |
| `url` | nullable |
| `sort_order` | |

Exactly one of `file_path` / `url` is set, matching `kind`.

### `assessments`

| Field | Notes |
|---|---|
| `course_id` | FK → `courses` |
| `batch_id` | nullable; null means the whole course |
| `type` | enum: `assignment` / `test` |
| `title` | |
| `instructions` | |
| `attachment_path` | nullable |
| `due_at` | timestamptz |
| `total_marks` | numeric > 0 |

### `submissions`

| Field | Notes |
|---|---|
| `assessment_id` | FK → `assessments` |
| `student_id` | FK → `profiles` |
| `file_paths` | text[]; empty for tests |
| `submitted_at` | nullable |
| `is_late` | boolean |
| `marks` | nullable numeric |
| `feedback` | nullable |
| `counts_toward_report` | boolean |
| `marked_by` | nullable |
| `marked_at` | nullable |

Unique on (`assessment_id`, `student_id`).

### `announcements`

| Field | Notes |
|---|---|
| `title` | |
| `body` | |
| `course_id` | nullable |
| `batch_id` | nullable |
| `created_by` | |

At most one of `course_id` / `batch_id` is set; both null means everyone.

### `site_settings`
Single row.

| Field | Notes |
|---|---|
| `academy_name` | |
| `tagline` | |
| `logo_path` | |
| `about_text` | |
| `contact_email` | |
| `contact_phone` | |
| `contact_whatsapp` | |
| `address` | |
| `social_links` | json |

All fields are nullable.

### Storage buckets (Supabase Storage)

| Bucket | Access | Used for |
|---|---|---|
| `public-assets` | public | Logo |
| `course-files` | private | Resource PDFs and assessment attachments. Readable by admins and by students enrolled in that course, via short-lived signed URLs. |
| `submissions` | private | Student uploads. Readable by the owning student and admins. Path: `{assessment_id}/{student_id}/...` |

### File limits
- Allowed types: PDF, JPG, PNG, WEBP.
- Maximum 10 MB per file; up to 10 files per submission.
- Images are compressed in the browser before upload.

---

## 11. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Validation | Zod (client and server) |
| Database / Auth / Storage | Supabase (Postgres, Supabase Auth with email + password, Storage, RLS) using `@supabase/ssr` |
| Hosting | Netlify (free tier) |

### Architecture
- One Next.js app with three areas: public, `/student`, `/admin`.
- Reads happen in Server Components. Mutations happen in Server Actions, each re-checking the user's role on the server.
- The proxy (`src/proxy.ts` — Next.js 16 renamed the `middleware.ts` convention to `proxy.ts`) refreshes the session and redirects by login state. Role-based redirects need the profile row, so they happen in server code (layouts and helpers). This is all for convenience; real enforcement is the server checks plus RLS.
- The Supabase **secret key** is used only in server-only code, for admin operations such as creating auth users, and only after verifying the caller is an admin. It is never exposed to the browser.
- All secrets live in `.env.local`, which is never committed. `.env.example` lists the variable names with no values.
- Database schema changes are made through SQL migration files kept in the repo.

### Accounts needed
- **Supabase**: needed from Stage 1/2, since the app cannot log anyone in without it.
- **Netlify**: needed at deployment (Stage 10).

### Free-tier notes
- The Supabase free plan has no automatic backups. Set up a regular database export before launch.
- Free projects pause after about a week with no database activity. They can be restored from the dashboard.
- Storage is limited to about 1 GB, which is why images are compressed and files size-limited.

---

## 12. Design direction

- Clean, modern, minimal, professional. Fully responsive; most students will use phones.
- Neutral design so the future name, logo and brand colour can be applied easily. Brand colour is defined in one place (theme tokens).
- Simple navigation: a sidebar on desktop and a compact menu on mobile for the portal.
- Every data view handles **loading, empty, error and success** states.
- No excessive animation, no decorative charts, no fake stats or testimonials, no stock "AI-looking" layouts.

---

## 13. Not in v1

Future options, only if the academy asks:

- Class schedule / meeting links in the portal
- Attendance tracking
- Payments / fee tracking
- Teacher dashboard and teacher-scoped permissions
- Guardian accounts or automatic guardian emails
- Email notifications, invites and "forgot password" (after domain + email provider)
- Video hosting (recordings are links for now)
- Quizzes / auto-graded tests
- Certificates
- Chat, forums, comments
- Gamification
- Analytics dashboards and charts
- Multi-language

---

## 14. Roadmap & progress

Each stage ends with the feature working and tested, and lint, type-check and build all passing. Tick items here as they are completed.

### Stage 1 — Project setup
- [x] Next.js + TypeScript + Tailwind + shadcn/ui initialized
- [x] ESLint and type-check scripts working
- [x] Theme tokens (neutral palette, one brand colour variable)
- [x] Base layouts: public, student, admin (shells only, no fake content)
- [x] Supabase project created and connected; `.env.example` added
- [x] Git repository initialized; `.gitignore` covers env files

### Stage 2 — Auth & roles
- [x] Database: `profiles` table, role enum, RLS helper functions (e.g. `is_admin()`)
- [x] Login / logout
- [x] Proxy (`src/proxy.ts`): session refresh + role-based redirects
- [x] Forced password change (`must_change_password`)
- [x] Deactivated users blocked
- [x] First admin account created (documented one-time procedure — `docs/ADMIN-SETUP.md`)

### Stage 3 — Settings & courses
- [x] `site_settings` + admin Settings page (including logo upload)
- [x] `courses` CRUD, publish/unpublish
- [x] `resources` (file + link) with private storage and signed URLs

### Stage 4 — Students, batches, enrollments
- [x] `batches` CRUD
- [x] Add student (creates auth user + profile + enrollments + batch)
- [x] Students list with search and filters; student detail page
- [x] Admin password reset, deactivate/reactivate
- [x] Remarks per enrollment

### Stage 5 — Student portal basics
- [x] Student dashboard (real data + empty states)
- [x] My Courses and course page with resources
- [x] Account page + change password

### Stage 6 — Assessments & marking
- [x] `assessments` CRUD (assignment/test, optional batch target, attachment)
- [x] Student submission upload (final, no resubmission), server-side late flag
- [x] Admin marking: per assessment, marking queue, test marks table
- [x] Counts-toward-report override

### Stage 7 — Progress report
- [x] Student report page
- [x] Admin printable report

### Stage 8 — Announcements
- [x] CRUD with target everyone / course / batch
- [x] Shown on student dashboard and announcements page

### Stage 9 — Public site & applications
- [ ] Home, Courses, Course detail, About, Contact (all from DB/settings)
- [ ] Apply form with validation and honeypot
- [ ] Admin applications list + accept/reject flow

### Stage 10 — Polish & launch
- [ ] Mobile/responsive pass on every page
- [ ] RLS and permissions review (try to access other students' data and admin routes as a student)
- [ ] Error pages (404, error boundary)
- [ ] Database backup procedure
- [ ] Deploy to Netlify with environment variables
- [ ] Add the ~10 existing students

---

## 15. Decision log

| Date | Decision |
|---|---|
| 2026-09-29 | Spec v1 agreed: Admin + Student roles; teacher role reserved for later |
| 2026-09-29 | No class schedule, attendance or payments on the website |
| 2026-09-29 | Batches: admin-defined, one per student, not tied to course |
| 2026-09-29 | Late submissions accepted and flagged; late marks excluded unless admin overrides |
| 2026-09-29 | Announcements target everyone / course / batch |
| 2026-09-29 | Guardians get a printable report; no guardian accounts |
| 2026-09-29 | Hosting on Netlify free tier (Vercel free tier disallows commercial use) |
| 2026-09-29 | No email in v1; admin sets temp passwords, forced change on first login |
| 2026-09-29 | ~~Students may replace a submission until it is marked~~ *(default chosen during spec writing — superseded 2026-09-30: no resubmission, see below)* |
| 2026-09-29 | Next.js 16 deprecates `middleware.ts` in favour of `proxy.ts`; session refresh lives in `src/proxy.ts`, role checks in server code |
| 2026-09-29 | Students have no UPDATE policy on `profiles` at all; `must_change_password` is cleared by the `complete_password_change()` SECURITY DEFINER function, not by the secret key |
| 2026-09-29 | `profiles.full_name`, `phone` and `country` are nullable in the database (a dashboard-created user has no name yet); required-ness is enforced in the forms that collect them |
| 2026-09-29 | Supabase CLI pinned as a devDependency; migrations live in `supabase/migrations`, applied with `npm run db:push`, types generated with `npm run db:types` |
| 2026-09-29 | `site_settings` is a singleton row (`id smallint primary key`, `check (id = 1)`), seeded empty by its migration; RLS lets anyone read it, only admins update it |
| 2026-09-29 | Storage buckets (`public-assets`, `course-files`) and their RLS policies are created by migration (`insert into storage.buckets`, policies on `storage.objects`), not left to dashboard/config.toml, so they follow the same "schema changes go through migrations" rule as tables |
| 2026-09-29 | Course/resource slugs: the browser suggests a slug from the title (`slugify()`) only until the admin edits it by hand; the server normalizes case/whitespace but never rewrites content, and rejects a non-conforming slug instead of silently fixing it. Uniqueness is pre-checked for a friendly error, backed by the DB's `unique` constraint |
| 2026-09-29 | Course delete is blocked when it has resources via both an app-level pre-check (friendly message) and `resources.course_id references courses on delete restrict` (the actual backstop) — see §16 for extending this to enrollments/assessments |
| 2026-09-29 | Deleting a file resource removes the storage object before the database row (storage delete is safe to retry; the row is only removed once the file is confirmed gone) |
| 2026-09-29 | Signed URLs for `course-files` are issued with a 60-second expiry, generated with the regular authenticated server client (no service-role key needed, since RLS already allows the admin to read that bucket) |
| 2026-09-29 | Logo uploads to `public-assets` are restricted to PNG/JPEG/WEBP; SVG is deliberately excluded even though the bucket is public, since SVG can carry executable script |
| 2026-09-29 | Admin area gained a real sidebar (desktop) and drawer (mobile) in Stage 3, the first stage with more than one admin route — matches SPEC §12's requirement and avoids a bigger nav retrofit once Stages 4/6/8 add more routes |
| 2026-09-29 | Batch student-assignment lives at a new `/admin/batches/[id]` detail route (not spelled out verbatim in §8's route table, but required by the same line — "assign and remove students" — and mirrors the existing `/admin/courses/[id]` sub-resource pattern) |
| 2026-09-29 | A student's email is fixed once their account is created; the Stage 4 edit form does not allow changing it (changing it would also require an Auth Admin API call, out of scope for this stage) |
| 2026-09-29 | "Add student" (SPEC §6/§8's "one server-side operation") is a plain sequential Server Action — create the auth user, then update the profile, then insert enrollments, deleting the auth user if a later step fails — not a Postgres RPC. True Auth+Postgres atomicity isn't achievable either way, and this matches the existing resource-upload cleanup-on-failure pattern from Stage 3 |
| 2026-09-29 | The students list loads once server-side and all search/filtering (name, email, phone, batch, course, country, active) happens client-side over the already-fetched rows, so the URL never carries personal data as query parameters |
| 2026-09-29 | Every Server Action that mutates a profile by id (batch reassignment, deactivate/reactivate, password reset, enrollments, remarks) re-verifies server-side that the target row exists and has `role = 'student'` via a shared `getStudentProfile` helper (`src/lib/students.ts`), so none of them can be pointed at an admin account |
| 2026-09-29 | `batches` and `enrollments` follow the same RLS/grant pattern as Stage 3's `courses`/`resources` (`revoke all` then explicit re-`grant` to `authenticated` before policies): admins get full CRUD, students get read-only access to their own batch and their own enrollment rows, with no write policies at all for students. Verified directly against the REST API using a real student session: reads are correctly scoped, and insert/update/delete on `batches`, `enrollments` and `profiles` all affect zero rows |
| 2026-09-29 | `enrollments.course_id` uses `on delete restrict`, matching and extending the existing "course can only be deleted once empty" rule; `deleteCourse` in `src/app/admin/courses/actions.ts` now also pre-checks enrollments, not just resources (closes the gap noted in the former §16 item) |
| 2026-09-29 | Stage 5: an enrolled student can see a course even if it is unpublished — `is_published` only controls visibility on the public site. This required an explicit enrollment check (query `enrollments`, not just `courses`) on the course detail page and the resource signed-URL route, because the existing "anyone can read a published course" policy would otherwise let a signed-in student read a *published* course's row (though not its resources or files) without being enrolled in it |
| 2026-09-29 | Stage 5: enrolled-course/resource lists (`/student`, `/student/courses`) are fetched by querying the student's own `enrollments` joined to `courses`, not by querying `courses` directly — a direct `courses` query would also return every published course to a signed-in student via the public-site read policy, not just their enrolled ones |
| 2026-09-29 | Stage 5: file resources are served through a route handler (`/student/resources/[id]`, `requireStudent()` + explicit enrollment check + 60s signed URL + 302 redirect) rather than a server action returning a URL for `window.open()` — mobile browsers block a popup opened after an `await`, so a plain `<a target="_blank">` to the route is used instead |
| 2026-09-29 | Stage 5: the voluntary password change on `/student/account` verifies the current password by calling `signInWithPassword` on a separate, non-persisting `@supabase/supabase-js` client, immediately signed out afterward with `signOut({ scope: "local" })`. Discovered via live browser testing: the default `signOut()` scope is `"global"`, which revokes the refresh token for *every* session the user has — including the student's real cookie-based session — not just this throwaway client's; `scope: "local"` clears only this client's own state. This is distinct from the forced `/change-password` flow from Stage 2, and does not touch `must_change_password` or call `complete_password_change()` |
| 2026-09-30 | Stage 6A owner decisions: **no resubmission** — a submission is final once made, replacing the earlier "replace until marked" default; admin can enter marks for a student even without an upload (work sent via WhatsApp etc.); an assessment is visible to a student if they are enrolled in its course and it is either course-wide or targets their batch, **or** they already have a submission for it regardless of their current enrollment/batch; an assessment can only be deleted once it has no submissions/marks; `total_marks` cannot be lowered below any mark already given; changing `due_at` recomputes `is_late`/the default `counts_toward_report` for **unmarked** submissions only, marked ones keep the admin's existing choice; `due_at` is entered in the admin's local time via the browser and converted to UTC client-side, and always displayed in the viewer's local time |
| 2026-09-30 | Stage 6A: `assessments.batch_id` uses `on delete restrict`, not `set null` — a null `batch_id` means "visible to the whole course", so silently nulling it when its batch is deleted would widen a batch-only assessment's visibility without anyone choosing that. `deleteBatch()` in `src/app/admin/batches/actions.ts` gained the same count-precheck-plus-`23503`-backstop pattern as `deleteCourse()` to enforce this |
| 2026-09-30 | Stage 6A: `assessments`/`submissions` are both created now (designed together so Stage 6B needs no further migrations), but only admin CRUD and read-only student visibility ship in 6A — no student write policy exists on `submissions` yet, and the `submissions` storage bucket (anticipated by the Stage 3 storage migration's own comment) is not created until 6B. The total_marks floor and marks-in-range rules are enforced by database triggers (`check_total_marks_floor`, `check_submission_marks`) as the backstop behind the app-level pre-checks, matching the project's existing "constraint/trigger is the backstop, app pre-check is the friendly error" pattern |
| 2026-09-30 | Stage 6A: assessment attachments reuse the `course-files` bucket and the Stage 5 signed-URL redirect-route pattern (`/student/assessment-attachments/[id]`), gated by the same visibility predicate as the assessments RLS policy rather than a plain enrollment check, mirrored server-side by `getVisibleAssessmentForStudent()` in `src/lib/assessments.ts` so the page and the route 404 consistently instead of relying on RLS alone |
| 2026-09-30 | Stage 6B owner decisions: student upload cleanup-on-failure needs a student DELETE storage policy (not the secret key) — added, scoped to the student's own `{assessment_id}/{student_id}/` folder and only while no submission row exists yet, so it can never delete an already-submitted file; `saveMarks` never creates a submission row unless marks is provided (a feedback/counts-only save on a student who hasn't submitted is a no-op error, not a new row) — this stops a feedback-only save from permanently blocking that student's real submission; `marked_by`/`marked_at` are set only when marks is not null, and saving empty marks clears marks/marked_by/marked_at on an existing row; "Marked" status is decided by `marks` being non-null everywhere (student pages, marking queue, overview count, dashboard), not by `marked_at` |
| 2026-09-30 | Stage 6B: the `submissions` storage bucket, its RLS, and the `submit_assignment()` RPC were added by `supabase/migrations/20260930100000_stage6b_submissions.sql`. The RPC follows the `complete_password_change()` template (`security definer`, `set search_path = ''`, `revoke`/`grant` to `authenticated` only) and is the *only* student write path onto `submissions` — no direct student INSERT/UPDATE policy was added to the table itself, matching the Stage 6A note that this was deliberately left open for 6B |
| 2026-09-30 | Stage 6B: images are compressed with a canvas-based helper (`src/lib/compress-image.ts`, no new dependency) rather than a library — decodes via `createImageBitmap(file, { imageOrientation: "from-image" })` specifically so a portrait phone photo's EXIF rotation is baked into the pixels before the canvas resize, instead of being lost (verified live with a crafted EXIF-orientation-6 JPEG: an 800×400 stored buffer correctly rendered/uploaded as 400×800 portrait). A decode failure (corrupt/unsupported image) falls back to the original file rather than throwing, and the whole upload flow in `submission-upload-form.tsx` is wrapped in try/catch/finally so a crash never leaves the dialog stuck on "Uploading…" |
| 2026-09-30 | Stage 6A: Server Components render in UTC, so `due_at` is never formatted server-side. A client component `<LocalDateTime iso={...} />` (`src/components/local-date-time.tsx`) formats it in the viewer's time zone after hydration, using a `useSyncExternalStore`-based `useIsClient()` hook (`src/lib/use-is-client.ts`) rather than an effect + `setState`, since the project's lint rules flag the latter for one-time client-only initialization. The same hook backs the assessment edit form's due-date field, which is blank until the client mounts and then fills in from the stored UTC value via a new `toDatetimeLocalValue()` helper |
| 2026-09-30 | Stage 7 owner decisions: report covers all work so far (no date filter, no per-stage window); no letter grades, cross-subject average, rank/comparison, charts, attendance, guardian name or signature line; per-assessment feedback is not shown on the report (students see it on the assessment page itself) |
| 2026-09-30 | Stage 7: added a Vitest devDependency (pinned to the `^2` major, since the latest major's `@types/node` peer range doesn't overlap this project's `@types/node@^20`) to unit-test the pure calculation module (`src/lib/progress-report.ts`) — the project had no test runner before this. `vitest.config.ts` aliases both the `@/*` path (to match `tsconfig.json`) and the bare specifier `server-only` to a local no-op stub (`src/lib/test/server-only-stub.ts`), since `server-only` is a virtual module Next.js injects at build time with no real npm package, so it doesn't resolve under Vitest's plain Node/Vite resolution otherwise |
| 2026-09-30 | Stage 7: `computeCourseReport()` in `src/lib/progress-report.ts` is the single source of truth for every number on the report, called by both `/student/report` and `/admin/students/[id]/report` via the shared `getStudentCourseReports()` fetch helper and `<ProgressReport>` component (`src/components/report/progress-report.tsx`), so the two pages can never disagree. For the admin page — whose Supabase client sees every assessment regardless of batch (RLS grants admins full `assessments` SELECT) — `getStudentCourseReports()` re-applies the same batch-visibility rule a student's own RLS-scoped client already gets for free, using the same "or already has a submission" override as `getVisibleAssessmentForStudent()` in `src/lib/assessments.ts`, but as a bulk in-memory filter rather than a per-row query |
| 2026-09-30 | Stage 7: strongest/weakest tie-breaks use the assessment's `due_at` (most recent wins), not `submitted_at`, since a test has no submission date but still needs a deterministic tie-break; verified live with two assessments tied at 80% where the tie-break correctly picked the one due later |
| 2026-09-30 | Stage 7: the enrollments manager's old single "remarks" edit-in-place control (`updateEnrollmentRemarks`) was replaced outright with `updateTeacherAssessment`, covering all five teacher-assessment fields (including the renamed-on-screen `remarks` → "Other comments") in one form/action, since nothing else called the old action and CLAUDE.md's "no duplicated logic" / "no backwards-compatibility shims" rules rule out keeping both |
| 2026-09-30 | Stage 8 owner decisions: announcement target is everyone / one course / one batch, at most one of `course_id`/`batch_id` (DB check constraint, both null means everyone); if the targeted course or batch is deleted, its announcements are deleted too (`on delete cascade` on both FKs, never `set null` — a null would silently turn a targeted announcement into an "everyone" one, which nobody chose); body is plain text with line breaks preserved and http/https URLs auto-linked safely (no HTML rendering, `target="_blank" rel="noopener noreferrer"`), trimming trailing sentence punctuation and an unbalanced trailing closing bracket/paren off the link itself; no pinning, scheduling, expiry, read/unread tracking or notifications |
| 2026-09-30 | Stage 8: this is the first table whose FKs to `courses`/`batches` cascade instead of restrict — the opposite of `assessments.batch_id`'s Stage 6A `restrict`, because assessments has no "everyone" state to fall into by accident and announcements does. The course-delete and batch-delete confirmation dialogs (`src/app/admin/courses/course-row-actions.tsx`, `src/app/admin/batches/batch-row-actions.tsx`) were updated to say so; the announcement's own delete dialog just says "This cannot be undone" since the cascade note only matters on the course/batch side |
| 2026-09-30 | Stage 8: safe auto-linking is a pure function, `src/lib/linkify.ts` (unit-tested, `src/lib/linkify.test.ts`), used by `src/components/announcement-body.tsx` — it builds a text/link part array and renders links as real `<a>` elements rather than ever using `dangerouslySetInnerHTML`, so a body containing literal HTML/script text renders as inert text (verified live: `<script>alert(1)</script>` typed into a body rendered as visible text, not executed) |
| 2026-09-30 | Stage 8: the admin announcements manager follows the Stage 6A `assessment-manager.tsx` pattern (one page, in-page create/edit dialogs, no `/new` sub-route) rather than the `/admin/batches`+`/admin/batches/new` split, since there's no natural parent resource to nest under. The three-way Everyone/Course/Batch selector has no existing precedent in this codebase (assessments only ever have a two-way "whole course vs one batch" choice) — implemented as a `target_type` select driving which of a course-picker or batch-picker renders, validated server-side by `announcementSchema`'s `superRefine` in `src/lib/validation/announcements.ts` |

## 16. Known issues / open items

- `complete_password_change()` is granted to `authenticated`, so a student could in principle call it directly to clear their own `must_change_password` flag without actually changing their password. This is self-inflicted only — it grants no access to anyone else's data and no privilege escalation — and an admin can set the flag again. Closing it completely would mean using the secret key for a non-admin operation, which SPEC §11 and CLAUDE.md currently forbid.
- `test-admin@example.com`'s password was changed during Stage 4 verification (to confirm login/deactivate/reactivate/reset-password flows end to end), then rotated again afterward to a value shared with the owner directly (not recorded here). It is no longer the password noted in earlier Stage 3 testing. The owner should treat it, along with `test-student@example.com`, per the existing note above about rotating or deleting test accounts before launch.
- Test accounts `test-admin@example.com` and `test-student@example.com` (password shared with the owner separately) were created during Stage 3 verification and should be deleted, or have their passwords rotated, before launch. (The `testadmin@gmail.com` / `teststudent@gmail.com` / `teststudent2@gmail.com` accounts previously noted here do not actually exist in the Supabase project — this note is corrected to match what's really there.)
- `next dev` appends a `nextjs-agent-rules` block to `CLAUDE.md` automatically (see `node_modules/next/dist/server/lib/generate-agent-files.js`). It is re-created if removed.
- Video hosting approach for future recordings to be decided when recording starts. Unlisted YouTube links can be shared outside the portal.
- `test-student@example.com`'s password was reset during Stage 5 verification (needed to test the enrolled-course/resource/storage RLS paths), then changed again through the account page itself while testing the change-password flow end to end (including a live bug found and fixed there — see the Stage 5 decision-log entry on `signOut({ scope: "local" })`). Current password shared with the owner directly (not recorded here); it is no longer any password from earlier notes. The student was also enrolled in the existing "o lvl maths" course as part of this testing, so the owner has a real enrolled student to browse the portal with; remove that enrollment if it isn't wanted. This account still needs deleting or a final password rotation before launch, per the existing note above.
- Both `test-admin@example.com` and `test-student@example.com` had their passwords reset again during Stage 6A verification (creating/editing/deleting assessments as admin, checking batch-visibility and 404s as the student, and confirming RLS directly against a student session), then rotated again afterward to a fresh random value not recorded anywhere. All Stage 6A test data created for that pass (two scratch batches, three scratch assessments, one scratch submission) was deleted again afterward; the pre-existing "o lvl maths" course/resource and the student's enrollment in it (left over from Stage 5) are unaffected.
- The admin batch-detail page's "Assign a student" control (`src/app/admin/batches/[id]/batch-students-manager.tsx`, Stage 4) did not reliably commit a selection to `selectedStudentId` when driven via simulated clicks during Stage 6A browser testing — the "Assign" button stayed a no-op until the underlying base-ui `Select` was driven through `form_input` instead of coordinate clicks. This may be purely a browser-automation quirk rather than a real user-facing bug (manual verification in Stage 4 presumably used real clicks), but it has not been re-confirmed with a human clicking through the UI; worth a quick manual check before relying on it.
- Course delete is blocked by checking `resources`, `enrollments` and, as of Stage 6A, `assessments` (`deleteCourse` in `src/app/admin/courses/actions.ts`). Only the `resources`/`enrollments` branch was exercised live during Stage 6A verification (the test course already had a resource); the `assessments` branch is covered by code review and the identical pattern already proven live in the `deleteBatch` equivalent, but has not itself been exercised against a real "course with only assessments" case.
- Stage 6B verification: the pre-existing "o lvl maths" course noted in earlier Stage 5/6A entries was gone by the start of this pass (Active students showed 1 but Courses was empty) — the owner deleted it themselves, unrelated to this stage. A scratch course ("QA Stage6B Course", with the student enrolled, no batch), four scratch assessments (two assignments — one on-time, one pre-dated to be late — one test, one mobile-upload test) and their submissions/marks were created to exercise the full submit → mark → dashboard flow live. Since the admin UI has no way to delete a submission or an assessment that has one (by design, SPEC §8), cleanup needed a direct, owner-authorized database operation (storage objects, submissions, assessments, the enrollment, then the course — run and removed after use, not committed) rather than the normal delete flow; nothing else was touched. `test-admin@example.com` and `test-student@example.com` also had their passwords reset for this verification pass (owner-authorized), to a value shared with the owner directly and not recorded here; rotate before launch per the existing notes above.
- Stage 7 verification: a scratch course ("QA Stage7 Course", O Level) with the test student enrolled (no batch) and six scratch assessments (a past-due unsubmitted assignment, a marked test, an unmarked test, a late-and-admin-counted assignment, a late-and-uncounted assignment, and an on-time assignment) were created to exercise every branch of `computeCourseReport()` live — every number shown on both `/student/report` and `/admin/students/[id]/report` was checked by hand against the scratch data and matched. A teacher assessment (all five fields) was filled in, confirmed to render identically on both pages, and confirmed to vanish per-field when unset. Confirmed live: a student session redirects away from `/admin/students/[id]/report` to `/student`, and a direct Supabase client update from a student session against their own `enrollments` row (setting `effort_rating`/`strengths`) affects 0 rows (RLS: no student write policy exists on `enrollments`, unchanged from Stage 4). The scratch course, its assessments/submissions/storage objects and enrollment were deleted afterward, and the student's `phone`/`country` (temporarily set to exercise the report header) were reverted to empty. `test-admin@example.com`/`test-student@example.com` passwords were reset for this pass and rotated again afterward to a fresh value not recorded anywhere, per the existing notes above.
- During Stage 7 browser verification, editing the teacher-assessment fields triggered a one-time Next.js dev-overlay console warning ("A component is changing the default value state of an uncontrolled FieldControl after being initialized") from a base-ui internal frame, with no attached component name. It did not reproduce as a rendering/functional bug (the saved values, report display, and a page reload all behaved correctly), and the same warning did not appear on a plain page load. Not confirmed as a real bug — possibly a benign artifact of hot-reload/dev-mode state during automated interaction — but not root-caused either; worth a quick manual click-through with the browser console open before relying on this being clean, similar to the unconfirmed Stage 6A batch-assign automation quirk noted above.
- Print CSS (`print:hidden` on nav/sidebar/print button, `print:break-before-page` per course section) was implemented and the relevant classes verified present, but the actual OS print-preview dialog can't be captured by browser automation — the owner should do one manual Ctrl+P check on `/admin/students/[id]/report` before relying on it for guardians.
- Stage 8 verification: both `test-admin@example.com` and `test-student@example.com` rejected the password on file at the start of this pass, so both were reset via the Auth Admin API to a fresh temporary value shared with the owner directly (not recorded here) — rotate again before launch per the existing notes above. A scratch course ("QA Stage8 Course") and scratch batch ("QA Stage8 Batch") were created, one announcement of each target type (everyone/course/batch) was created live, and the pre-existing test student (enrolled only in "O Level Maths", no batch at the time) was confirmed to see only the "Everyone" announcement on both `/student` and `/student/announcements`, with safe auto-linking (trailing punctuation excluded from the link) and an inert `<script>` tag rendering as plain text. Deleting the scratch course and batch was confirmed live to cascade-delete their announcements rather than widen them to "everyone" — this doubled as cleanup, and the remaining "everyone" scratch announcement was deleted directly afterward; nothing else was left behind. Not completed live this pass, and so not claimed as verified beyond code review: the "enrolled/batched student now also sees the course/batch announcement" half of the visibility check (the RLS policy mirrors the already-proven Stage 6A `assessments` visibility pattern), and a direct student-session Supabase-client check that reads/writes on out-of-scope or all announcements are correctly scoped/rejected.
