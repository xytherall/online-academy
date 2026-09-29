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

Shown per course that the student is enrolled in.

**For each assessment**
- title and type
- due date
- status
- marks / total
- whether the marks count

**Per course summary**
- **Percentage** = sum of counted marks ÷ sum of totals of counted assessments.
- **Missing count** = assignments past due with no submission.
- Admin **remarks** for that course.

**Where it appears**
- The student sees it at `/student/report`.
- The admin sees the same report at `/admin/students/[id]/report`. That page has a clean print layout so it can be saved as PDF and shared with guardians.

If there is no marked work yet, the report shows a clear empty state, not a 0%.

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
- [ ] Student dashboard (real data + empty states)
- [ ] My Courses and course page with resources
- [ ] Account page + change password

### Stage 6 — Assessments & marking
- [ ] `assessments` CRUD (assignment/test, optional batch target, attachment)
- [ ] Student submission upload / replace-until-marked, server-side late flag
- [ ] Admin marking: per assessment, marking queue, test marks table
- [ ] Counts-toward-report override

### Stage 7 — Progress report
- [ ] Student report page
- [ ] Admin printable report

### Stage 8 — Announcements
- [ ] CRUD with target everyone / course / batch
- [ ] Shown on student dashboard and announcements page

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
| 2026-09-29 | Students may replace a submission until it is marked *(default chosen during spec writing — owner to confirm)* |
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

## 16. Known issues / open items

- Resubmission-until-marked rule to be confirmed by owner.
- `complete_password_change()` is granted to `authenticated`, so a student could in principle call it directly to clear their own `must_change_password` flag without actually changing their password. This is self-inflicted only — it grants no access to anyone else's data and no privilege escalation — and an admin can set the flag again. Closing it completely would mean using the secret key for a non-admin operation, which SPEC §11 and CLAUDE.md currently forbid.
- Course delete is now blocked by checking both `resources` and `enrollments` (Stage 4). When Stage 6 (assessments) lands, its FK to `courses` should use the same `on delete restrict` pattern, and `deleteCourse`'s pre-check and error message should be extended to also count assessments.
- `test-admin@example.com`'s password was changed during Stage 4 verification (to confirm login/deactivate/reactivate/reset-password flows end to end) and is no longer the password noted in earlier Stage 3 testing. The owner should treat it, along with `test-student@example.com`, per the existing note above about rotating or deleting test accounts before launch.
- Test accounts `test-admin@example.com` and `test-student@example.com` (password shared with the owner separately) were created during Stage 3 verification and should be deleted, or have their passwords rotated, before launch. (The `testadmin@gmail.com` / `teststudent@gmail.com` / `teststudent2@gmail.com` accounts previously noted here do not actually exist in the Supabase project — this note is corrected to match what's really there.)
- `next dev` appends a `nextjs-agent-rules` block to `CLAUDE.md` automatically (see `node_modules/next/dist/server/lib/generate-agent-files.js`). It is re-created if removed.
- Video hosting approach for future recordings to be decided when recording starts. Unlisted YouTube links can be shared outside the portal.
