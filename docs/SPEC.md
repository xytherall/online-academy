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

Everything else stays outside the website for now. Live classes happen on Zoom / Google Meet; the admin posts each upcoming class with its join link in the portal (Stage 19). Timetables, attendance and fees are handled by the academy directly, e.g. over WhatsApp.

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
| Class schedule / meeting links | Upcoming class entries with a join link (Stage 19, owner decision 2026-10-04). **No weekly schedule or timetable.** |
| Attendance | **Not built.** Handled by the academy. |
| Batches | Admin-defined groups of students, e.g. by country. Not tied to a course. **One batch per student.** |
| Roles in v1 | Admin and Student. Teacher role exists in the database but has **no dashboard in v1**. |
| Admins | Project owner and current teacher (both have full admin rights) |
| Assignments | Due dates set by the teacher. Late submissions are **accepted and flagged**. |
| Late marks | Do **not** count toward the report by default. Admin can override per submission. |
| Tests | Same as assignments: admin can attach the paper (PDF/image), students download it and upload their answers by the due date (late accepted and flagged). Admin can also enter marks directly with no upload (e.g. a test sat on paper in class). |
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
- Can ask questions ("Ask the teacher") and read only their own questions and answers; can delete their own question only while it is waiting.
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
  - **Test**: students upload their answers exactly like an assignment, or the admin enters marks directly with no upload (e.g. sat on paper in class).
- Fields: title, instructions, optional attachment, due date, total marks.

**Submission / Result**
- One record per student per assessment.
- Holds the uploaded files when the student uploads (assignment or test). A test marked without an upload holds only marks.
- Stores marks, feedback, late flag and whether it counts toward the report.

---

## 5. Public website

| Route | Content |
|---|---|
| `/` | Home: academy intro, offered courses, how to apply, link to login |
| `/courses` | Published courses from the database, grouped by O/A Level |
| `/courses/[slug]` | Course description, who it is for, "Apply" button |
| `/about` | About page text from Settings (`about_page_text`) |
| `/contact` | Contact details from Settings |
| `/apply` | Application form |
| `/apply/success` | Confirmation after applying |
| `/login` | Portal login |

Rules:
- Academy name, logo, tagline, home page intro, About page text and contact details come from `site_settings`.
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
| `/student` | Dashboard: upcoming live classes for the student (card at the top with a Join button, hidden when there are none; a class drops off an hour after it starts), latest announcements, upcoming work (every unsubmitted assignment, overdue included, and every test not yet past, with no date limit), recently marked work |
| `/student/courses` | Enrolled courses |
| `/student/courses/[id]` | Course: resources, assessments with status and marks |
| `/student/assessments/[id]` | Instructions, attachment, due date, upload/replace submission, marks and feedback once marked |
| `/student/report` | Progress report (see §9) |
| `/student/announcements` | All announcements addressed to the student |
| `/student/questions` | "Ask the teacher": ask a question (an enrolled course or General, optional one file) and see their own questions (Waiting / Answered / Closed); `/student/questions/[id]` shows the question and answer |
| `/student/account` | View own details, change password |
| `/student/notifications` | Notifications (opened from the header bell): work due within a day or overdue, and recent notifications; tap one to open it, "Mark all read". Turned on/off from `/student/account` |
| `/change-password` | Forced password change on first login / after reset |

### Assessment statuses shown to students
- **Not submitted**
- **Submitted**
- **Submitted late**
- **Marked**
- **Missing** (past due, nothing submitted)

Tests with an upload use the same statuses as assignments. A test with no upload shows **Marked** or **Not yet marked** (never **Missing**, since it may have been sat on paper in class).

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
| `/admin/assessments/[id]` | Submissions for one assessment. Enter marks/feedback and open uploaded files (assignments and tests). Marks can be entered for any targeted student, with or without an upload. |
| `/admin/marking` | All submissions waiting to be marked, across all courses |
| `/admin/live-classes` | Add, edit, delete live classes: title, date and time (in the admin's own time zone), join link, optional note, all students or one batch. Upcoming and past (latest 20) lists. Adding notifies the students; editing does not. |
| `/admin/announcements` | Create, edit, delete. Target: everyone / one course / one batch. |
| `/admin/settings` | Academy name, logo, tagline, home page intro, About page text, contact details |

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

Covers all of a student's work so far (no date filter), calculated live on every page load — no stored/generated report. Shown per course the student is enrolled in, plus an at-a-glance summary at the top. Subjects are never averaged together.

**Owner-approved exception to §12's "no charts" rule, for this report only** (2026-10-01, see §15): the report uses hand-built inline SVG charts (a line chart for marks over time, a donut for homework handed in) — no charting library, theme tokens only, accessible (`role="img"` + `aria-label` + a `<title>` per data point).

**Letterhead**: navy band (same gradient tokens as the dashboard band) with academy name/logo from `site_settings` (no invented fallback — hidden if unset), "Student Progress Report", date generated (viewer's local time, client-side). Strip below: student name, level(s) of enrolled courses, batch (hidden if none), subjects.

**At a glance**: one card per enrolled course — a progress ring (overall %, or "No work set yet" / "Not marked yet" per the empty-state rules below) with "X of Y marked" and the missing count — plus a "Homework handed in" donut: all enrolled courses' assignments past their due date, split On time / Late / Missing. On time/Late is decided by whether a submission row exists and its `is_late` flag — marks entered without an upload (work sent via WhatsApp) still count as handed in. Missing = past-due assignment with no submission row at all. If nothing is due yet, the donut is replaced by "No homework due yet".

**Per course**
- Title + level. If the course has no assessments visible to the student yet, the section shows one line ("No work has been set for this course yet.") and nothing else except the teacher assessment block.
- **Overall %, Assignments %, Tests %** — each is sum of counted marks ÷ sum of total marks of counted assessments (marks not null AND `counts_toward_report` true), rounded to 1 decimal. When nothing is counted at all, shows "Not marked yet" (not 0%); when only one category (assignments/tests) has nothing counted but the course has other counted work, that box shows "—" / "none marked yet".
- "X of Y marked", and **missing count** = assignments past due with no submission (as computed for every other page's "Missing" status — this is a different, stricter rule than the homework donut's "handed in" rule above, so the two counts can legitimately differ for a mark entered without an upload).
- **Marks over time** line chart: appears once 3+ assessments are marked (counted or not), ordered by due date; late-and-not-counted points are drawn hollow and excluded from the dashed average line (the average is the course's Overall %). Y axis: top fixed at 100, bottom = lowest plotted score rounded down to the nearest 20, clamped to [0, 60]. X labels: first/middle/last date only, in the viewer's local time. Below 3 marked assessments, a note explains the trend will appear once there are enough.
- **Strongest / Needs work**: the counted assessment with the highest / lowest percentage (ties → most recently due). Only shown with at least 2 counted assessments; "Needs work" is hidden if it ties "Strongest".
- **Assessment table**: title, type, due date (local time), marks/total, a score bar + %, and a status pill. Late-and-not-counted rows carry a footnote and a "Late" pill (overriding the normal "Marked" pill). A row that is not yet due, with nothing submitted and nothing marked, shows an "Upcoming" pill instead of its normal status — a submitted-but-unmarked row still shows its normal status (e.g. "Submitted").
- **Teacher assessment** (only filled-in fields shown; the whole block is hidden if all are empty): Effort and Class participation as a 4-step meter (Excellent=4/Good=3/Satisfactory=2/Needs improvement=1), Strengths, Areas to improve, Other comments (the `enrollments.remarks` field, relabelled, shown as a quote). No per-assessment feedback is shown here — students see that on the assessment page.

A closing note explains in plain English how scores are worked out.

Explicitly excluded from v1: letter grades, cross-subject average, rank/comparison, attendance, guardian name, signature line.

**Where it appears**
- The student sees it at `/student/report`.
- The admin sees the same report at `/admin/students/[id]/report`, with a "Print / Save as PDF" button (browser print — always light, A4, `print-color-adjust: exact` so the navy band/chart colours survive, a page break before each course section). Both pages render the same shared component from the same calculation module, so the numbers can never differ.

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

### `notifications`
Student notifications. Created only by the admin-only `notify_new_assessment` / `notify_new_announcement` / `notify_marks` SQL functions, which work out the recipients themselves.

| Field | Notes |
|---|---|
| `user_id` | FK → `profiles` (cascade) |
| `kind` | enum `notification_kind`: `assignment` / `test` / `announcement` / `marks` / `answer` / `live_class` |
| `title` | |
| `body` | nullable (course title) |
| `assessment_id` | nullable, FK → `assessments` (cascade) |
| `announcement_id` | nullable, FK → `announcements` (cascade) |
| `read_at` | nullable |

Exactly one of `assessment_id` / `announcement_id` is set. RLS: a student can read their own rows and update only `read_at` on them; no insert/delete.

### `notification_preferences`

| Field | Notes |
|---|---|
| `user_id` | PK, FK → `profiles` (cascade) |
| `enabled` | boolean, default true (no row = on) |

RLS: a user can select/insert/update only their own row.

### `push_subscriptions`
One row per phone/browser that turned on phone notifications.

| Field | Notes |
|---|---|
| `user_id` | FK → `profiles` (cascade) |
| `endpoint` | unique, https |
| `p256dh`, `auth` | the browser's push keys |

RLS: a user can read and delete only their own rows. Rows are saved only through `save_push_subscription()` (active students only; takes the row over if another student used the same browser). Sending uses the secret key on the server.

### `questions`
"Ask the teacher". One answer per question, no back-and-forth.

| Field | Notes |
|---|---|
| `student_id` | FK → `profiles` (cascade) |
| `course_id` | nullable (General), FK → `courses` (set null) |
| `body` | 1–5,000 characters |
| `attachment_path` | nullable, `questions` bucket, `{student_id}/...` |
| `status` | enum `question_status`: `waiting` / `answered` / `closed` |
| `answer` | nullable, 1–5,000 characters |
| `answer_attachment_path` | nullable, `{student_id}/answers/...` |
| `answered_by`, `answered_at` | nullable |

RLS: a student can insert their own (only `student_id`, `course_id`, `body`, `attachment_path` — column grant; course must be one they're enrolled in or null; active students only), read their own, and delete their own only while `waiting`. Admins can read, update and delete all. `notifications.question_id` (cascade) + kind `answer` link the "Your question was answered" notification, created by the admin-only `notify_answer()`.

### `live_classes`
One upcoming (or past) live class. No recurring schedule.

| Field | Notes |
|---|---|
| `title` | 1–200 characters |
| `starts_at` | timestamptz; entered in the admin's device time zone, shown to students in theirs |
| `join_url` | http(s) link, up to 2,000 characters |
| `note` | nullable, up to 1,000 characters |
| `batch_id` | nullable (all students), FK → `batches` (cascade) |
| `created_by` | FK → `profiles` (set null) |

RLS: admins can read, insert, update and delete all. An active user can read classes for all students or for their own batch; no student writes. `notifications.live_class_id` (cascade) + kind `live_class` link the "New live class" notification, created by the admin-only `notify_new_live_class()`.

### `site_settings`
Single row.

| Field | Notes |
|---|---|
| `academy_name` | |
| `tagline` | |
| `logo_path` | |
| `about_text` | Home page intro (hero subtext) |
| `about_page_text` | About page (`/about`) body text |
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
| `questions` | private | "Ask the teacher" files (max 10 MB, PDF/JPG/PNG/WEBP). Path: `{student_id}/...` (student) and `{student_id}/answers/...` (admin). The student can read their whole folder, upload/delete only directly in it (not after the question is answered/closed); admins full. Served through 60-second signed URLs after an owner-or-admin check |

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

## 12. Design system

**Style: "Quiet Ink"** — minimal, elegant, calm, modern. Built for teens and their parents: not childish, not corporate-generic. No orange, no photos, no mascots, no heavy animation, no decorative charts, no fake stats or testimonials, no stock "AI-looking" layouts. The one exception is the progress report (§9), where hand-built inline-SVG charts (no library) are owner-approved — never decorative, always theme-tokened and accessible.

Fully responsive, mobile first (most students use phones). Every data view handles **loading, empty, error and success** states. All colours, fonts, radius and spacing below are theme tokens — nothing in this section is ever hardcoded per-component, and nothing outside this section is ever hardcoded either (brand colour and academy name still come from theme tokens and `site_settings`, per CLAUDE.md).

### Fonts

Loaded via `next/font/google`.

| Role | Font | Notes |
|---|---|---|
| Display / headings | **Fraunces** | weight 400, `letter-spacing: -0.02em`, `text-wrap: balance` |
| Body / UI | **Figtree** | weights 400 / 500 / 600 |

Do **not** use Inter anywhere in this project.

### Colour tokens

**Light theme**

| Token | Value |
|---|---|
| `background` | `#ffffff` |
| `background-portal` (page background behind portal cards) | `hsl(216 25% 97%)` |
| `background-alt` (alternating public-site section, warm grey) | `#f6f5f3` |
| `card` / surface | `#ffffff` |
| `foreground` (ink) | `hsl(216 52% 14%)` |
| `muted-foreground` | `hsl(216 14% 42%)` |
| `border` | `hsl(216 22% 89%)` |
| `primary` | `hsl(216 52% 48%)` |
| `primary-foreground` | `#ffffff` |
| `primary-soft` | `hsl(216 90% 95%)` |
| dashboard band gradient | `hsl(216 55% 16%)` → `hsl(216 60% 30%)` |
| hero glow | `hsl(216 95% 80% / 0.55)` and `hsl(246 80% 85% / 0.45)` |
| graph-paper grid lines | `hsl(216 40% 50% / 0.07)`, 40px squares |

**Dark theme**

| Token | Value |
|---|---|
| `background` | `hsl(216 45% 7%)` |
| `background-portal` | `hsl(216 40% 8%)` |
| `background-alt` | `hsl(216 35% 10%)` |
| `card` / surface | `hsl(216 38% 11%)` |
| `foreground` | `hsl(216 30% 93%)` |
| `muted-foreground` | `hsl(216 15% 68%)` |
| `border` | `hsl(216 25% 20%)` |
| `primary` | `hsl(216 90% 70%)` |
| `primary-foreground` | `hsl(216 55% 10%)` |
| `primary-soft` | `hsl(216 45% 18%)` |
| dashboard band gradient | `hsl(216 55% 12%)` → `hsl(216 55% 24%)` |
| hero glow | `hsl(216 90% 45% / 0.30)` and `hsl(246 70% 40% / 0.22)` |
| graph-paper grid lines | `hsl(216 60% 70% / 0.06)` |

**Semantic status colours** (foreground on background, light / dark) — used only for small status pills, never as a brand/accent colour:

| Status | Light | Dark |
|---|---|---|
| success | `hsl(152 55% 34%)` on `hsl(152 50% 94%)` | `hsl(152 50% 62%)` on `hsl(152 35% 15%)` |
| warning | `hsl(28 80% 40%)` on `hsl(35 90% 94%)` | `hsl(35 85% 65%)` on `hsl(30 40% 15%)` |
| late / error | `hsl(0 60% 45%)` on `hsl(0 80% 96%)` | `hsl(0 75% 70%)` on `hsl(0 35% 16%)` |

No orange is used as a brand or accent colour anywhere; `warning` above is the only orange-family hue in the system, reserved strictly for status pills.

### Shape

- Cards: **24px** radius.
- Small elements (inputs, list rows, small cards): **16px** radius.
- Buttons, chips, badges: fully rounded pill (**9999px**).
- Borders: 1px using the `border` token. Shadows only where something must visibly stand out (e.g. an open dialog), not as decoration.

### Dark mode

- Full light/dark theming using the token tables above, plus a toggle available to every user (public site and portal).
- **Print is always light**, regardless of the active theme — the printable progress report (§9) never prints dark-mode colours.

### Public site

- Normal top bar (not a sidebar), sticky with a translucent/blurred background; "Apply now" renders as a filled dark pill (the `foreground`/`background` tokens reversed — reads correctly in both themes since those tokens flip together) rather than the brand colour, to stand out from the rest of the nav.
- Sections alternate `background` (white) and `background-alt` (warm grey) down the page.
- Section headers: uppercase eyebrow label (small, tracked-out) above a serif (Fraunces) title.
- Course list rows (`/courses`): plain list rows (no boxed card), course title in the display font with a small muted level caption underneath, a thin border line between rows, and a round pill-shaped arrow button on the right to open/link through — not a plain text link or chevron-in-box. On wide screens the O Level and A Level lists sit side by side in two columns.

### Home page (`/`)

1. **Hero** — centred layout (Mindly-style): headline, subtext and CTAs stacked in the middle, no side illustration. Background: soft glow (the two glow colours above) + a fading graph-paper grid, plus a faint decorative SVG maths motif (a parabola with a dot at its vertex, a dashed sine wave, two faint axis lines), all `aria-hidden`.
   - Eyebrow: the levels with at least one published course (e.g. "O Level · A Level"), hidden if none.
   - Headline: `site_settings.tagline`, falling back to the academy name, hidden if both are empty. Supports `*word*` for italic-primary emphasis (parsed into React elements, never raw HTML — see `src/lib/parse-emphasis.ts`).
   - Subtext: the first sentence of `about_text` if it ends within ~180 characters, otherwise a word-boundary cut with "…" (`src/lib/excerpt.ts`); hidden if `about_text` is empty.
   - Buttons: "Apply now" (primary) and "View courses" (outline).
   - A static illustration of the student portal (window card with a navy "Welcome back / Your dashboard / Your batch" band, two course cards with progress rings, and two floating cards — "Due this week" status pills and a "Marked" score card). Sample content, not real student data — carries a screen-reader-only caption "Illustration of the student portal" (not shown visually, at the owner's request, 2026-10-04).
2. **"What you get" bento** (`background-alt`): five tiles (notes & past papers, live classes, assignments with feedback, parent-readable report, batch announcements) with owner-approved descriptive copy and small mini-UI fragments (see `src/components/public/bento-grid.tsx`).
3. **Subjects** (`background`, "What we teach") — one large card per published course, two columns on wide screens, one on mobile. Each card: title, level chip/link, a short excerpt of the course description, and a decorative symbol chosen from the title (contains "math" → faint italic ∫; contains "physic" → a faint double sine-wave SVG; otherwise a faint grid pattern). Proper empty state when no courses are published.
4. **How to join** (navy — the same gradient tokens as the student dashboard band) — a three-step timeline with a thin connecting line and outlined serif step numbers; stacks vertically with no line on mobile.
5. **Closing CTA** (`background-alt`): "Ready to start?" + "Apply now" / "Contact us".
6. **Footer** (shared site chrome, `background-alt`): brand + tagline, and three link columns — Explore (the main nav links), Students (Apply, Student login), Contact (real email/WhatsApp from settings, hidden if empty) — with a bottom bar showing © year + academy name.

### Portal (student + admin)

- White/`card` cards sitting on the `background-portal` (light grey) page background.
- Sidebar on desktop with a **lucide icon per nav item** (lucide-react is already available via shadcn/ui — no new dependency); compact mobile drawer, as already built.

### Student dashboard

- A navy header band at the top: gradient between the two dashboard-band blues above, with a faint graph-paper grid texture, showing "Welcome back" + the student's name + a batch chip.
- Course cards sit slightly overlapping the bottom of the band.

### Progress indicators

- Course cards and the progress report show a **progress ring** with the overall % — but **only when there is counted marked work** for that course.
- When there is no counted marked work, show the text **"No marked work yet"** instead of a ring. Never show a 0% ring — 0% and "nothing marked yet" are different states and must never look the same.

### Status pills

- Assessment/submission status (Due soon / Overdue / Not submitted / Marked — with marks shown) renders as a small coloured pill, using the semantic status tokens above, never raw/inline colours.

### Admin area

- Same tokens and components as the rest of the portal, but calmer and denser: clean tables (not cards-as-tables), number/stat cards built from a value + label + a small icon tile (lucide icon in a soft-background square), never a chart.

---

## 13. Not in v1

Future options, only if the academy asks:

- Weekly class schedule / timetable (single upcoming class entries with a join link were added in Stage 19)
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
- Analytics dashboards and charts (the progress report's own charts, §9, are a separate owner-approved exception — this item covers everything else, e.g. an admin analytics dashboard)
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
- [x] Home, Courses, Course detail, About, Contact (all from DB/settings)
- [x] Apply form with validation and honeypot
- [x] Admin applications list + accept/reject flow

### Stage 10 — Design & polish

Applies SPEC §12 ("Design system") across the app. Visual/styling only — no behaviour changes.

#### 10A — Public site & auth-adjacent pages
- [x] Fonts + tokens: Fraunces/Figtree loaded, full light + dark colour tokens, radius scale, pill buttons wired up (theme-level, not per-component)
- [x] Dark mode: toggle available, no flash of wrong theme on load
- [x] Print is always light, regardless of active theme
- [x] Restyle: public header + footer
- [x] Restyle: all public pages (`/`, `/courses`, `/courses/[slug]`, `/about`, `/contact`, `/apply`, `/apply/success`)
- [x] Restyle: `/login`
- [x] Restyle: `/change-password`
- [x] Restyle: 404 / error pages

#### 10B — Portal & admin
- [x] Sidebar/mobile drawer restyle with lucide icon per nav item
- [x] Student dashboard navy header band (gradient + grid texture, batch chip, overlapping course cards)
- [x] Progress ring on course cards/report; "No marked work yet" state (never a 0% ring)
- [x] Status pills (Due soon / Overdue / Not submitted / Marked) using semantic tokens
- [x] Admin: table restyle, number cards with icon tiles, no charts
- [x] Dark mode pass across portal + admin (fix anything that doesn't use tokens)

Verified in-browser this session (1440px/375px, light/dark) using `TEST_ADMIN_EMAIL`/`PASSWORD` and `TEST_STUDENT_EMAIL`/`PASSWORD` from `.env.local` — see the decision-log entry below.

#### 10C — Consistency pass (home page redesign → rest of the app)
- [x] Hero-style `PageHeader` (eyebrow + Fraunces title + soft glow/grid, smaller than the home hero) added to every public page, 404, login and change-password
- [x] `/login` and `/change-password` moved under `(public)` to share the site header/footer; `AuthShell` simplified
- [x] Fixed: `PortalShell` main content lacked `min-w-0`, so wide tables (progress report, marking) overflowed the whole page horizontally on mobile instead of scrolling within their own container
- [x] Confirmed print-light behaviour on the admin progress report already works correctly

### Stage 11 — Launch
- [ ] Mobile/responsive pass on every page
- [ ] RLS and permissions review (try to access other students' data and admin routes as a student)
- [ ] Error pages (404, error boundary)
- [ ] Database backup procedure
- [ ] Keep-alive check (free Supabase projects pause after ~1 week with no activity)
- [ ] Production Supabase project set up
- [ ] Deploy to Netlify with environment variables (including `APPLY_FORM_SECRET`)
- [ ] Add the ~10 existing students

### Stage 12 — Pre-launch batch 1

Owner-requested polish ahead of launch (privacy page, link previews/favicon, WhatsApp button, admin-editable FAQ, UI polish). Not part of the original roadmap stages above.

- [x] Privacy policy page (`/privacy`), linked from the footer and the apply form
- [x] Link previews + favicon (OG image, icon, canonical URL, portal noindex titles)
- [x] ~~Floating WhatsApp button on public pages~~ (built, then removed at owner request 2026-10-02)
- [x] FAQ: `faqs` table + RLS, admin CRUD with reorder, public accordion + JSON-LD
- [x] Polish: hover details, toast notifications (sonner), reusable empty states, `SubjectIcon` component
- [x] Unread announcements indicator (nav dot/count, "New" pills, `announcement_seen` table) — student-only, see §15

### Stage 14 — Test uploads

Owner request (2026-10-04): tests work like assignments — no timed/online test, no start time.

- [x] Migration `stage14_test_uploads`: storage upload policy and `submit_assignment()` no longer reject tests
- [x] Student assessment page shows the upload form and "Your submission" for tests too
- [x] Status rules: a test with an upload is Submitted / Submitted late; a test with no upload stays "Not yet marked" (never Missing)
- [x] Admin marking unchanged (same table for both types; marks can still be entered without an upload)


### Stage 15 — Installable app

Owner request (2026-10-04): students can put the portal on their phone's home screen. An installable web app, not store apps (see §15).

- [x] Web manifest (`src/app/manifest.ts`): academy name from `site_settings`, standalone display, navy theme colour, opens at `/student`
- [x] App icons in the existing favicon style: 192px, 512px and a maskable 512px (`/app-icon/[variant]`); the Apple touch icon is now a full square since iOS rounds it itself
- [x] "Get the app on your phone" card on the student dashboard: the browser's install dialog on Android/Chrome, Share → Add to Home Screen steps on iPhone; hidden once installed or dismissed
- [x] Minimal service worker (`public/sw.js`) that shows `/offline` when a page can't load; nothing else is cached

### Stage 16 — Notifications bell

Owner request (2026-10-04): an in-portal bell for students. Phone push notifications are not part of this stage.

- [x] Migration `stage16_notifications`: `notifications` + `notification_preferences` tables with RLS, and admin-only `notify_*` functions that pick recipients (enrolled + batch-targeted + active + notifications on)
- [x] Notifications created when the admin creates an assignment or test, posts an announcement, or enters/changes a student's marks or feedback (hooked into the existing Server Actions)
- [x] Header bell with a count (unread + due within a day/overdue), `/student/notifications` page, tap to open and mark read, "Mark all read"
- [x] Due-work reminders computed live from the dashboard's upcoming-work query (never stored, no scheduled job)
- [x] On/off switch on `/student/account`

### Stage 17 — Phone notifications

Owner request (2026-10-04), after the installable app (Stage 15) was merged.

- [x] Bell count fix: the count is re-fetched on every page change, on tab focus and after marking read (it was frozen in the layout)
- [x] Migration `stage17_push_subscriptions`: `push_subscriptions` table + RLS, `save_push_subscription()`, `notify_*` now return the new notification ids
- [x] Every bell notification is also sent as a Web Push (`web-push`, VAPID keys in env), after the admin's response; dead subscriptions (404/410) are removed
- [x] Service worker shows the push and opens the right portal page when tapped
- [x] "Turn on phone notifications" on `/student/account`, with hints for iPhone (home-screen app, iOS 16.4+), blocked permission and unsupported browsers
- [x] "Get notifications on your phone" card on the student dashboard (owner request), next to the install card, sharing the same turn-on logic (`src/lib/use-phone-notifications.ts`); hidden once on, dismissed, blocked, unsupported or while notifications are off; on iPhone Safari it shows the add-to-home-screen hint
- [x] Daily due-work reminder push: `POST /api/cron/due-reminders` (needs `CRON_SECRET`), called by the Netlify scheduled function `netlify/functions/due-reminders.mjs` at 14:00 UTC (5 pm Saudi time)
- [ ] On Netlify at deploy: set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`; check the scheduled function appears under Functions
- [ ] Test on a real Android phone and an iPhone (home-screen app) once the site is live on HTTPS

---

### Stage 18 — Ask the teacher

Owner request (2026-10-04).

- [x] Migration `stage18_questions`: `questions` table + RLS, private `questions` bucket + storage policies, `answer` notification kind, `notifications.question_id`, `notify_answer()`
- [x] Migration applied to the Supabase project (version `20261004181234`)
- [x] Student: "Ask the teacher" nav item, ask form (course or General, optional one file, images compressed), own questions list with Waiting / Answered / Closed, detail page, delete while waiting (file deleted too)
- [x] Admin: "Questions" nav item with a waiting-count badge, list (waiting first, longest-waiting on top), detail with answer + optional file, edit answer (no re-notify), close without answering
- [x] Answer notifies the student (bell + phone push), tapping opens `/student/questions/[id]`
- [x] Checked against the live database: RLS (19 cases, rolled back), student asks with/without a file (image compressed), file opens via signed URL, answer → notification → opens the question, delete while waiting removes row + file
- [x] Admin pages checked in the browser: waiting badge (2 → 1 → none), waiting listed before answered, first line only, send answer with a file (notification created, student can open the file, other students can't), edit answer + remove file (no second notification, old file deleted, answer time kept), close (student sees Closed, no notification)
- [ ] Confirm on the phone that the answer push arrives (sent without errors to the one device Ayesha turned on)

### Stage 19 — Live classes

Owner decision (2026-10-04, "option 1").

- [x] Migration `stage19_live_classes`: `live_classes` table + RLS, `live_class` notification kind, `notifications.live_class_id`, `notify_new_live_class()`
- [x] Migration applied to the Supabase project (version `20261004191728`)
- [x] Admin: "Live classes" nav item; add / edit / delete with title, date and time, join link (http/https only), optional note, all students or one batch; upcoming and past lists
- [x] Student: "Upcoming live classes" card at the top of the dashboard with a Join button, only their classes, hidden when there are none, a class drops off an hour after it starts
- [x] Adding a class notifies its students (bell + phone push, respects the notifications switch); editing does not; tapping opens the dashboard
- [x] Demo cleanup removes live classes of demo batches
- [x] Checked against the live database (rolled back): RLS (18 cases: admin full access; students see all-student + own-batch classes only; no-batch, other-batch, deactivated and anon cases; no student writes or notify calls; `javascript:` links rejected), notify reaches only the class's active students with notifications on, Saudi-time body, delete removes its notifications
- [x] Student dashboard checked in the browser as Ayesha (phone + desktop dark): own-batch and in-progress classes shown soonest first, finished and other-batch classes hidden, Join opens in a new tab; the notification shows the time and opens the dashboard
- [x] Admin pages checked in the browser (owner)
- [x] Owner request: no Saudi time. The admin enters the time in their own time zone (like due dates) and the admin list shows local time; the notification shows no time at all, just "New live class: <title>" (owner decision); migration `stage19b_live_class_local_time` stores no body, and the time is shown only on the dashboard card, in the student's own time zone
- [x] Migration `stage19b` applied to the Supabase project (version `20261004213214`)

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
| 2026-09-30 | Stage 7 owner decisions, report contents: a summary box at the top (one line per course: overall %, assignments %, tests %, missing count); per course, Overall/Assignments/Tests % each computed from counted marks only; strongest/weakest result shown (only with ≥2 counted assessments); a teacher-assessment block (effort, participation, strengths, areas to improve, other comments) shown only for fields that are filled in — see §9 for the full, authoritative spec of these rules |
| 2026-09-30 | Stage 7: added a Vitest devDependency (pinned to the `^2` major, since the latest major's `@types/node` peer range doesn't overlap this project's `@types/node@^20`) to unit-test the pure calculation module (`src/lib/progress-report.ts`) — the project had no test runner before this. `vitest.config.ts` aliases both the `@/*` path (to match `tsconfig.json`) and the bare specifier `server-only` to a local no-op stub (`src/lib/test/server-only-stub.ts`), since `server-only` is a virtual module Next.js injects at build time with no real npm package, so it doesn't resolve under Vitest's plain Node/Vite resolution otherwise |
| 2026-09-30 | Stage 7: `computeCourseReport()` in `src/lib/progress-report.ts` is the single source of truth for every number on the report, called by both `/student/report` and `/admin/students/[id]/report` via the shared `getStudentCourseReports()` fetch helper and `<ProgressReport>` component (`src/components/report/progress-report.tsx`), so the two pages can never disagree. For the admin page — whose Supabase client sees every assessment regardless of batch (RLS grants admins full `assessments` SELECT) — `getStudentCourseReports()` re-applies the same batch-visibility rule a student's own RLS-scoped client already gets for free, using the same "or already has a submission" override as `getVisibleAssessmentForStudent()` in `src/lib/assessments.ts`, but as a bulk in-memory filter rather than a per-row query |
| 2026-09-30 | Stage 7: strongest/weakest tie-breaks use the assessment's `due_at` (most recent wins), not `submitted_at`, since a test has no submission date but still needs a deterministic tie-break; verified live with two assessments tied at 80% where the tie-break correctly picked the one due later |
| 2026-09-30 | Stage 7: the enrollments manager's old single "remarks" edit-in-place control (`updateEnrollmentRemarks`) was replaced outright with `updateTeacherAssessment`, covering all five teacher-assessment fields (including the renamed-on-screen `remarks` → "Other comments") in one form/action, since nothing else called the old action and CLAUDE.md's "no duplicated logic" / "no backwards-compatibility shims" rules rule out keeping both |
| 2026-09-30 | Stage 8 owner decisions: announcement target is everyone / one course / one batch, at most one of `course_id`/`batch_id` (DB check constraint, both null means everyone); if the targeted course or batch is deleted, its announcements are deleted too (`on delete cascade` on both FKs, never `set null` — a null would silently turn a targeted announcement into an "everyone" one, which nobody chose); body is plain text with line breaks preserved and http/https URLs auto-linked safely (no HTML rendering, `target="_blank" rel="noopener noreferrer"`), trimming trailing sentence punctuation and an unbalanced trailing closing bracket/paren off the link itself; no pinning, scheduling, expiry, ~~read/unread tracking~~ or notifications *(read/unread tracking added 2026-10-03, see below)* |
| 2026-09-30 | Stage 8: this is the first table whose FKs to `courses`/`batches` cascade instead of restrict — the opposite of `assessments.batch_id`'s Stage 6A `restrict`, because assessments has no "everyone" state to fall into by accident and announcements does. The course-delete and batch-delete confirmation dialogs (`src/app/admin/courses/course-row-actions.tsx`, `src/app/admin/batches/batch-row-actions.tsx`) were updated to say so; the announcement's own delete dialog just says "This cannot be undone" since the cascade note only matters on the course/batch side |
| 2026-09-30 | Stage 8: safe auto-linking is a pure function, `src/lib/linkify.ts` (unit-tested, `src/lib/linkify.test.ts`), used by `src/components/announcement-body.tsx` — it builds a text/link part array and renders links as real `<a>` elements rather than ever using `dangerouslySetInnerHTML`, so a body containing literal HTML/script text renders as inert text (verified live: `<script>alert(1)</script>` typed into a body rendered as visible text, not executed) |
| 2026-09-30 | Stage 8: the admin announcements manager follows the Stage 6A `assessment-manager.tsx` pattern (one page, in-page create/edit dialogs, no `/new` sub-route) rather than the `/admin/batches`+`/admin/batches/new` split, since there's no natural parent resource to nest under. The three-way Everyone/Course/Batch selector has no existing precedent in this codebase (assessments only ever have a two-way "whole course vs one batch" choice) — implemented as a `target_type` select driving which of a course-picker or batch-picker renders, validated server-side by `announcementSchema`'s `superRefine` in `src/lib/validation/announcements.ts` |
| 2026-09-30 | Stage 9A (public site) owner decisions: split into 9A (public pages) and 9B (Apply form + admin applications); `/apply` did not exist yet, so 9A ships a minimal real placeholder page (no form, no invented copy) that 9B replaces |
| 2026-09-30 | Stage 9A: no separate caching layer (`unstable_cache`/`revalidateTag`) was added for public data. The root layout's `generateMetadata` already calls `getSiteSettings()`, which reads cookies — this forces every route in the app, public included, to render dynamically per request (confirmed: `next build` marks `/`, `/courses`, `/courses/[slug]`, `/about`, `/contact`, `/apply` all as `ƒ` dynamic, same as every existing admin/student route). Since nothing is cached, admin edits are visible on next request with zero extra plumbing; `getPublishedCourses()`/`getPublishedCourseBySlug()` in `src/lib/courses.ts` reuse the existing per-request `cache()`-dedup pattern from `getSiteSettings`, and `revalidatePath` calls were added to `createCourse`/`updateCourse`/`deleteCourse` (`src/app/admin/courses/actions.ts`) only to keep the Next router/client cache from showing stale course data after a mutation, matching what `updateSettings` already did for settings |
| 2026-09-30 | Stage 9A: `/about` shows a friendly empty state rather than a 404 when `about_text` is unset — About is a real nav item that should always resolve, unlike an unknown/unpublished course slug which is a broken/stale link and correctly 404s |
| 2026-09-30 | Stage 9A: course-detail and other public `notFound()` calls return a soft 404 (HTTP 200 with `<meta name="robots" content="noindex">`, verified live against `/courses/<unknown-slug>` on both `next dev` and a production `next start` build) rather than a true 404 status — this is a documented Next.js 16 streaming trade-off (see `notFound()` docs, "the response has already begun streaming as a 200"), not something specific to this route; the same limitation already applied to every pre-existing `notFound()` call elsewhere in the app (admin/student), and fixing it would require a `proxy`-level existence check, which is out of scope for this stage |
| 2026-09-30 | Stage 9A: lucide-react (already a dependency) has no brand icons for Facebook/Instagram/YouTube/TikTok/LinkedIn/X in the installed version, so social links render as plain text labels (`src/lib/social-links.ts` + `ContactStrip`/footer/`/contact`) rather than adding an icon library |
| 2026-09-30 | Stage 9A verification, part 1: tested live via `next build` + `next start` and `next dev` with the database in its then-empty state (no `site_settings`, no published courses) — confirmed the empty-state/hidden-section behavior on `/`, `/courses`, `/about`, `/contact`, `/apply`, nav active-state highlighting, the fallback academy name, and the soft-404 behavior on an unknown course slug |
| 2026-09-30 | Stage 9A verification, part 2 (filled-content state): the owner created two fresh Supabase Auth users (`testadmin@ex.com` / `teststudent@ex.com`) via the dashboard rather than sharing the existing rotated `test-admin` password; `testadmin@ex.com` needed one manual `update profiles set role = 'admin' where email = ...` run by the owner in the Supabase SQL editor, since the `handle_new_user` trigger always creates a `student` row and there is no in-app promotion path. Logged in and, with real browser interaction (not fabricated), filled in every Settings field and published a scratch course ("QA Stage9A Course", O Level) — confirmed live: `/`, `/courses`, `/courses/[slug]`, `/contact` all rendered every filled field correctly (hero, About excerpt with working "Read more" link, course grouped under "O Level" and linking through, contact strip, footer, WhatsApp link, Facebook social link); unpublishing the course made `/courses` revert to its empty state and `/courses/[slug]` soft-404, both instantly on next request with no manual cache-busting, confirming the `revalidatePath` calls added to `src/app/admin/courses/actions.ts` work. All scratch data (the course, all Settings fields) was deleted/cleared back to empty afterward, confirmed by a final screenshot matching the original empty state |
| 2026-09-30 | Stage 9B owner decisions: the country field becomes a shared list (`src/lib/countries.ts`) used by `/apply` **and** both admin student forms, replacing the free-text input — so `applications.country` and `profiles.country` hold the same canonical strings and the students-list country filter stops fragmenting ("UK" vs "United Kingdom"). A student row written before the list existed may hold something not in it, so `CountrySelect` keeps that value as an extra selectable option and `studentProfileUpdateSchema` still accepts any ≤100-character country (only the *update* path is lax; create/apply require a listed country), so opening and saving an old student's form can never silently blank or rewrite their country |
| 2026-09-30 | Stage 9B owner decision: the apply form's minimum-time check uses an HMAC-signed render timestamp keyed by a **new `APPLY_FORM_SECRET` env var** (added to `.env.example`), not a reused Supabase key — one secret per job, and rotating the Supabase key must not silently invalidate every open apply form. `src/lib/apply-token.ts` throws if the variable is missing rather than skipping the check, so a misconfigured deploy fails loudly instead of quietly running with no spam protection. Must be set in Netlify at Stage 10 |
| 2026-09-30 | Stage 9B: a bot-looking submission (honeypot filled, or a bad/forged token, or submitted in under 4 seconds) is redirected to `/apply/success` **without** inserting — indistinguishable from success, so a bot learns nothing. The one exception is a token older than 12 hours, which gets a real "please reload and send it again" error: that is a slow human, not a bot, and silently discarding their application would be the worst possible outcome |
| 2026-09-30 | Stage 9B owner decision: a global flood limit of 20 inserts per 10 minutes, enforced by the `check_application_flood_limit()` trigger (both constants declared in that one function — the single place to tune them), surfacing as SQLSTATE `54000` and a friendly "receiving a lot of applications right now" message. Deliberately *global* rather than per-email/per-IP, with the trade-off accepted and recorded in §16 |
| 2026-09-30 | Stage 9B: `applications` is the project's first publicly writable table. `anon` gets `grant insert` **without** `select`, plus a narrow `with check (status = 'pending' and reviewed_by is null and reviewed_at is null and student_id is null)` policy, so a submitter can never self-accept, forge review fields, or read any application back (SPEC §3). Consequence for the app: `submitApplication` must never chain `.select()` onto the insert. Chosen over Stage 6B's `security definer` RPC pattern because an RPC granted to `anon` would be no more restrictive — the narrow policy states the rule declaratively, where RLS can enforce it |
| 2026-09-30 | Stage 9B: `course_ids` is a `uuid[]` (SPEC §10) so it cannot carry a foreign key; `validate_application_courses()` (`security definer`, needed because `anon`'s RLS on `courses` only shows published rows) is the database backstop that every chosen course is distinct, exists, is published and matches the chosen level, with `submitApplication` pre-checking the same thing for a friendly error — the established "constraint/trigger is the backstop, app pre-check is the friendly error" pattern. One pending application per email is a unique partial index on `lower(email) where status = 'pending'`, so a rejected applicant can re-apply |
| 2026-09-30 | Stage 9B: `createStudent`'s account-creation body was extracted to `createStudentAccount()` (`src/lib/create-student-account.ts`, `import "server-only"`), now called by both "Add student" and "Accept application" so the duplicate-email check, the `must_change_password` flag and the delete-the-auth-user-on-failure rollback can never drift between the two. `generatePassword()` (previously duplicated byte-for-byte in `student-form.tsx` and `student-status-actions.tsx`) moved to `src/lib/generate-password.ts` and now has three callers |
| 2026-09-30 | Stage 9B: Accept creates the account first, then claims the application with `update ... where id = ? and status = 'pending'` and `{ count: "exact" }`. If that matches 0 rows another admin won the race, so the just-created auth user is deleted again (cascading its profile and enrollments) and the admin is told to reload — no orphan account in any branch. Verified live, including that an accept whose email already has an account fails before anything is written and leaves the application `pending` |
| 2026-09-30 | Stage 9B owner decision: the "Copy login message" login URL is built from the current request's origin via `getRequestOrigin()` (`src/lib/request-origin.ts`, `x-forwarded-proto`/`x-forwarded-host` falling back to `host`), never hardcoded, so it is correct on Netlify with no code change — there is no domain yet (§2) and no `NEXT_PUBLIC_SITE_URL` in this project. The temporary password is returned by the action for a single on-screen display, never stored, never logged, and never placed in a URL or a `wa.me`/`mailto` link (copy-to-clipboard only, with the message also shown in a read-only textarea to select by hand if the clipboard API is blocked) |
| 2026-09-30 | Stage 9B: the whole review area is one always-mounted client component (`ApplicationReview`) that switches on status, rather than a component per status. Found by live testing: accepting calls `router.refresh()`, which re-renders the route with status `accepted`; with the accept form as its own component React unmounted it and took the one-and-only showing of the temporary password with it, so the admin never saw the password at all. Keeping one component mounted across the status change makes the "just accepted" state survive the refresh |
| 2026-09-30 | Stage 9B: the country picker (`src/components/country-select.tsx`) is a **native `<select>`**, deliberately unlike the base-ui `Select` used everywhere else — that one has no search box, and scrolling ~195 options in a custom popup is worst on a phone, which is how most applicants will apply (§12). A native select opens the OS picker on mobile and gives type-to-jump on desktop for free; it is styled to match `Input`. The Pending/Accepted/Rejected tabs are likewise a plain segmented `<button>` group with `role="tablist"`, since this project has no `Tabs` primitive (base-ui, not Radix) and adding one for three buttons is not worth it. Tab state is client-side only, so no applicant name or id reaches the URL, matching the students list |
| 2026-09-30 | Stage 9B verification (live, `next dev` + a real browser): submitted the form end to end and confirmed every field stored correctly with `status = 'pending'` and all review fields null; `?course=<slug>` pre-selects both the course *and* its level; choosing a different level swaps the course list and clears the previous selection; "same as phone" mirrors the number; client-side validation blocks an empty submit with all six required-field messages and inserts nothing; a second application for the same email (typed in a different case) shows "You already have an application being reviewed"; a filled honeypot and a back-dated (signature-breaking) token each land on `/apply/success` with **zero** rows written, confirmed in the database; the flood limit blocks the 21st insert in the window and shows the friendly message. Admin side: nav badge and overview card counts, the three tabs with per-tab empty states, the detail page, accept (account + profile copied from the application + enrollments + batch + `must_change_password`), the one-time password panel and working "Copy login message", reject with reviewer attribution, and delete (rejected only). Then signed in as the new student with the temporary password, was forced through `/change-password`, and landed on `/student` enrolled in the applied-for course. A separate script exercised 24 RLS/trigger assertions directly against the REST API as `anon` and as a real student session — all passed. Every scratch row (24 applications, 3 courses, 1 batch, 2 students and a scratch admin) was deleted afterwards and the database confirmed back to its prior state |
| 2026-09-30 | Stage 9A verification: browser-automation form interaction was unreliable for base-ui `Select`/`Switch` controls and for buttons immediately after one (plain coordinate clicks on "Create course" and "Save changes" silently no-opped at least once each, and a `Switch` toggle click wasn't reflected in the submitted `FormData` on the first attempt) — same category of quirk already noted in Stage 6A's batch-assign issue, not a new app bug; confirmed by re-reading the hidden form input's value via JS before resubmitting, which matched the intended state each time. Mobile-width (~390px) layout was **not** verified live: `resize_window` reports success but `window.innerWidth` stays unchanged in this session's environment, confirmed by checking `window.innerWidth` immediately after a resize call. The responsive markup reuses the exact `Sheet`-based mobile-nav pattern already proven for the student/admin nav, but a manual phone-width check is still worth doing before relying on it |

| 2026-10-01 | Stage 10A owner decisions, confirmed before implementation: with no stored theme choice the app follows the OS setting and reacts live if it changes; the toggle stores an explicit choice that then wins; `suppressHydrationWarning` on `<html>` (the pre-paint script legitimately mutates its `class` before hydration); the toggle has an accessible label and a visible focus state; print forces light tokens globally (`@media print`), not only on the report routes; Fraunces loads with its `opsz` axis enabled and both fonts are exposed as CSS variables; the radius scale (24px cards / 16px inputs and small elements / pill buttons, chips, badges) applies to form inputs and selects too |
| 2026-10-01 | Stage 10A: Fraunces must be loaded with `weight: "variable"` — `next/font/google` rejects `axes: ["opsz"]` together with a fixed weight ("Axes can only be defined for variable fonts when the weight property is nonexistent or set to `variable`"), caught by `next build`. Headings are pinned to weight 400 in `globals.css` instead, so the rendered result still matches the "weight 400" spec value |
| 2026-10-01 | Stage 10A: dark mode has no flash — a `next/script` `strategy="beforeInteractive"` inline script (`src/lib/theme-script.ts`) sets the `.dark` class before first paint (stored choice, else the OS preference). At runtime, `src/lib/theme-store.ts` is a `useSyncExternalStore`-backed module store (not an effect + `setState`, matching the existing `useIsClient()` convention from Stage 6A) that live-reacts to OS changes only while no explicit choice is stored, and `ThemeToggle` (`src/components/theme-toggle.tsx`) sets an explicit, persisted choice that then wins |
| 2026-10-01 | Stage 10A: the semantic status pair naming in `globals.css` is `--success`/`--success-bg` (and the `warning`/`late` equivalents), not `-foreground` — unlike `primary`/`primary-foreground`, SPEC §12's pairs are "text colour on its own soft background", the reverse of "text colour to put on top of this background", so reusing `-foreground` would have inverted the existing convention |
| 2026-10-01 | Stage 10A: the placeholder `--brand`/`--brand-foreground` tokens from Stage 1 (SPEC §2's "no branding yet" placeholder) were retired in favour of `--primary`/`--primary-foreground` from §12's token set — the only two usages were in the home page and `CourseGrid`, both rewritten in this stage anyway, so there are no longer two names for "the brand colour" |
| 2026-10-01 | Stage 10A polish: `FALLBACK_ACADEMY_NAME = "Academy Portal"` read as an invented academy name rather than a neutral placeholder, contradicting SPEC §2/§12. Renamed to `FALLBACK_SITE_LABEL = "Student Portal"`, used only in `<title>`/metadata and site chrome (header/footer/login brand mark) — never as the home hero's headline. The hero headline now shows the real academy name or, when unset, the neutral greeting "Welcome" instead of any stand-in name. A second, undocumented copy of the same literal fallback in `PublicFooter`'s copyright line was found and pointed at the same constant |
| 2026-10-01 | Stage 10A polish: the home hero gained a small eyebrow listing the levels with at least one published course (e.g. "O Level · A Level"), derived live from the same published-courses query as the courses section — not invented, and hidden when no courses are published. Headline stays the academy name and subtext stays the tagline, both already settings-driven |
| 2026-10-01 | Former Stage 10 ("Polish & launch") split in two: Stage 10 "Design & polish" (10A public site/auth-adjacent pages, 10B portal/admin) applies SPEC §12's design system, visual changes only; a new Stage 11 "Launch" keeps the original launch checklist (responsive pass, RLS/security review, error pages, backup procedure, Netlify deploy with env vars) plus two items added at the owner's request: a keep-alive check for the free Supabase project's inactivity pause, and setting up the production Supabase project |
| 2026-10-01 | Stage 10B owner decision: `Badge` gained an `info` variant built from the existing `primary`/`primary-soft` tokens rather than a new colour — §12 defines only success/warning/late, so "in progress" statuses (e.g. a submitted-but-unmarked assessment) reuse the brand colour instead of inventing a fourth status hue |
| 2026-10-01 | Stage 10B: one status→pill mapping (`src/lib/status-badge.ts`), used by both the student and admin sides so a given status always renders the same pill everywhere: Marked → success; Missing / Submitted late / Overdue → late; Submitted → info; Not submitted / Not yet marked → secondary (neutral). "Due soon"/"Overdue" are computed for display only from the existing `due_at` (never stored, never fed back into `computeAssessmentStatus`). The same module also gives Active/Deactivated, Published/Unpublished and Pending/Accepted/Rejected a consistent success/secondary/late/warning mapping for visual consistency, even though §12's "Status pills" section only names assessment/submission statuses explicitly |
| 2026-10-01 | Stage 10B: added `--dashboard-band-foreground` (`#ffffff` in both themes) alongside the existing `--dashboard-band-from/to` pair — the band is dark navy in both light and dark mode, so its text needs one colour that never flips with the theme toggle; kept as a proper token (mapped into `@theme inline`) rather than a hardcoded `text-white`, per CLAUDE.md's "nothing hardcoded outside tokens" |
| 2026-10-01 | Stage 10B: student dashboard/`/student/courses` now fetch course cards via `getStudentCourseReports()` (the same calculation the progress report already uses) instead of a separate `getEnrolledCourses()` query, so the progress ring and "X of Y marked / N missing" line on a course card can never disagree with the report page. `getEnrolledCourses()` was deleted as dead code |
| 2026-10-01 | Stage 10B: the per-assessment marking table and the all-courses marking queue were converted from `<li>` row-cards to real `<table>`s per §12 ("clean tables, not cards-as-tables"); the resource/assessment/announcement/enrollment dialog-driven CRUD lists were left as bordered row-cards, since each row holds a full inline edit form or dialog trigger rather than tabular columns, and forcing those into `<table>` markup would risk the existing dialog/form behaviour for a "record list" widget those SPEC lines aren't clearly describing |
| 2026-10-01 | Home page redesign approved against `docs/design/home-mockup.html`: the `background-cream` token is removed and replaced by `background-alt`, a warm grey (`#f6f5f3` light, `hsl(216 35% 10%)` dark — the dark value is unchanged) used for the same alternating public-site sections |
| 2026-10-01 | Home page redesign: the hero headline (`site_settings.tagline`, falling back to the academy name) supports `*word*` for italic-primary emphasis, parsed by the pure function `parseEmphasis()` (`src/lib/parse-emphasis.ts`, unit-tested) into text/emphasis parts rendered as React elements — never `dangerouslySetInnerHTML`. An unmatched single asterisk, or an empty `**` pair, is left as literal text rather than breaking the headline |
| 2026-10-01 | Home page redesign: the hero's student-portal illustration (window card + two floating cards) is static sample content, not real student data, and is captioned "Illustration of the student portal" so it's never mistaken for a live dashboard. The floating cards are positioned against the window's own box (not a wider outer wrapper) so the overlap onto the course-card row stays predictable at this component's actual rendered size, rather than reusing the mockup's absolute pixel offsets verbatim (tuned for its larger fixed-width illustration) |
| 2026-10-01 | Home page redesign: the "What you get" bento tile headings/copy and the subject-card decorative symbol rule (title contains "math" → faint italic ∫, contains "physic" → a faint double sine-wave SVG, otherwise a faint grid pattern) are owner-approved descriptive copy/behaviour, allowed to live in code per CLAUDE.md rather than coming from the database |
| 2026-10-01 | Home page redesign: added a `dark` `Button` variant (`bg-foreground text-background`) for the header's and bento's filled "Apply now" buttons, matching the mockup's reversed-ink pill — built from the existing `foreground`/`background` tokens (which already flip per theme) rather than a new colour, so it reads correctly in both light and dark mode without any new token |
| 2026-10-01 | Home page redesign: the footer was restructured to brand+tagline plus three link columns (Explore/Students/Contact) with a bottom bar, matching the mockup; the previous address and social-links rows were dropped from the footer specifically (both remain on `/contact`, which already lists them) since the approved mockup's footer doesn't carry them |
| 2026-10-01 | Home page redesign, pixel-matching pass: hero/section/button sizes now use the mockup's exact CSS values (`clamp()` font sizes, literal px padding/margins/offsets) via Tailwind arbitrary values, rather than the nearest stepped utility classes used in the first pass — added a `marketing` `Button` size (`px-[22px] py-3 text-[15px]`, matching the mockup's `.btn`) used by the hero, closing-CTA and header buttons only; other buttons across the app are unaffected |
| 2026-10-01 | Home page redesign: `PublicFooter` changed from `background-alt` to plain `background` (white/near-black) so it's visibly distinct from the closing CTA section above it, matching the mockup — the two warm-grey-on-warm-grey sections were indistinguishable in the first pass |
| 2026-10-01 | Home page redesign: `PortalPreview` was rebuilt to the mockup's literal `.preview`/`.window`/`.float` box model — a 940px outer box, a 720px window centred inside it (leaving real margin on both sides), and the floating cards positioned with the mockup's exact offsets, moved outside the hero's `max-w-3xl` text column so it isn't squeezed into a narrower box than the design assumes. The breakpoint for collapsing to stacked, un-rotated cards is `min-[961px]:` (not Tailwind's default `sm`/`lg` steps) to match the mockup's own `max-width: 960px` breakpoint exactly — verified side by side at 960/1280/1440px. At ≥961px the floating cards still partially cover the course-card row (most visibly the "Mathematics" card behind the "Due this week" card) — this is not a bug: the identical overlap exists in `docs/design/home-mockup.html` itself at the same widths, using the same literal offsets, confirmed by screenshotting the mockup side by side |
| 2026-10-01 | Home page redesign: the subject card's math symbol (∫) is drawn with `next/font/google`'s Fraunces (`subsets: ["latin"]`), which does include a proper glyph for U+222B — `document.fonts.check()` confirmed this — so the font was never the problem. The bug was pure positioning: that glyph's own advance-width box is much narrower than its visible ink, so the `right: -10px` value copied literally from the mockup anchored the box almost entirely outside the card, leaving only a thin sliver visible through `overflow-hidden`. Found by temporarily rendering the glyph at full opacity inside its real card (not guessable from the DOM/CSS alone) and adjusted to `right: 60px` so the full curve reads clearly in the corner, matching the mockup's look — a deliberate deviation from the mockup's literal value, kept because the spec for this fix explicitly prioritized "whole glyph visible, not a sliver" over the literal number |
| 2026-10-01 | Home page redesign verification: screenshotted the real app and `docs/design/home-mockup.html` side by side at 1440px and 375px, in light and dark, using a one-off Playwright script (`playwright` installed with `npm install --no-save` for the session only, then removed — `package.json`/lockfile never touched) since the browser extension tool's `resize_window` doesn't change the actual viewport in this environment (same limitation noted in earlier Stage 9A/9B entries). All four combinations matched closely after the fixes above. The timeline's connecting line (`.timeline::before`) becomes a vertical line down the left edge on mobile in the mockup's own CSS; this build still simply hides it below `sm` (unchanged from the first pass) — left as is since it wasn't one of the differences this pass was scoped to fix, noted here for a future pass |
| 2026-10-01 | Progress report redesign, approved against `docs/design/progress-report-mockup.html`: lifts §9/§12's "no charts" rule for the report only — hand-built inline SVG line/donut charts, theme tokens, `role="img"`/`aria-label`/`<title>` per point, no charting library. The homework donut counts an assignment as "handed in" (on time/late by `is_late`) whenever a submission row exists at all, including marks entered without an upload (WhatsApp work) — a stricter, separate rule from the existing per-course `missingCount` (still "no submission row at all", unchanged from Stage 7), so the two counts can legitimately disagree for that one case. The assessment table's "Upcoming" pill requires both not-yet-due **and** nothing submitted/marked — a submitted-but-unmarked row keeps its normal status pill (e.g. "Submitted"), not "Upcoming". Trend chart X-axis labels are formatted client-side in the viewer's local time, same `useIsClient()` pattern as `LocalDateTime` (`src/components/local-short-date.tsx`), so there is no hydration mismatch |

- **`APPLY_FORM_SECRET` must be set in Netlify at Stage 10.** `/apply` throws if it is missing, rather than silently running with the timing check disabled — so forgetting it breaks the apply page loudly instead of quietly. A local value is in `.env.local`; `.env.example` lists the name.
- **The application flood limit is global, by decision, and is therefore a self-DoS lever.** `check_application_flood_limit()` rejects an insert once 20 applications exist in the previous 10 minutes, counted across all applicants. Anyone willing to POST 20 rows at the REST API can lock out every genuine applicant for the rest of that window; they cannot read, alter or accept anything, so the damage is availability only, and it clears itself 10 minutes later. Accepted deliberately over a per-email or per-IP variant. Both constants live in that one trigger function if the ceiling needs raising.
- Related: `applications` is the only table `anon` may write to. The insert policy pins `status = 'pending'` with all review fields null, the check constraints bound every text length, and `validate_application_courses()` bounds `course_ids` — but nothing rate-limits a direct REST insert beyond the flood trigger above, because RLS cannot. This is inherent to a public form with no captcha (SPEC §6) and would be no different behind a `security definer` RPC. If spam ever becomes real, the options are a captcha (currently excluded from v1) or moving the insert behind a rate-limited route handler.
- Stage 9B: the login URL in "Copy login message" was verified live only on `http://localhost:3000` (it correctly rendered that origin rather than anything hardcoded). The proxied branch — `x-forwarded-proto`/`x-forwarded-host`, i.e. what Netlify will actually send — could not be exercised: the browser extension in this environment is permitted on `localhost` only, so a second origin such as `127.0.0.1:3000` could not be loaded. Worth one glance at the copied message on the first real deployment.
- Stage 9B: mobile-width (~390px) layout was again **not** verified live, for the same reason as Stage 9A — the automation tool's window resize does not change the actual viewport here. `/apply`, `/admin/applications` and the application detail page all use the responsive patterns already proven elsewhere (stacked `sm:grid-cols-2` field lists, `hidden sm:table-cell` column hiding, a native select that opens the OS picker), but a manual phone-width pass over the apply form is still worth doing before launch.
- Stage 9B: the two-tab double-accept race could not be driven as two genuine simultaneous browser tabs — this session's extension kept dropping the second tab from its group. The losing side was instead exercised faithfully by priming one tab's form, marking the application accepted out-of-band (as a second admin would), then submitting from the now-stale page: the account was created, the guarded `where status = 'pending'` update matched 0 rows, and the rollback deleted the auth user again, leaving 0 auth users and 0 profile rows for that email. The guard itself is therefore verified; only the literal two-humans-at-once timing was simulated rather than raced.
- Stage 9B: browser automation was noticeably flaky against this app — screenshots intermittently timed out with "the renderer may be frozen", `read_page` sometimes returned only the page's links while a screenshot showed the form rendering fine, and injecting JS that set React-controlled inputs via the native value setter did not fire `onChange` (React's `_valueTracker` swallows it). Driving the form with real clicks and keyboard `Tab`/typing worked reliably and is what the verification above used. Same category of tooling quirk already recorded for Stages 6A and 9A, not evidence of an app bug.
- Post-Stage-9B, the owner reported three things while testing manually: (1) `/apply`'s Level dropdown showed only O Level; (2) creating an announcement appeared to sign them out of admin and into a student account, and that student couldn't see any announcement; (3) a new assignment created by admin wasn't visible to the student afterward. Investigated live against the real database and a real browser, nothing in the app code changed as a result:
  - (1) is correct behaviour, not a bug — the Level select only offers a level with at least one **published** course (same rule the public `/courses` page already uses to hide empty level headings, and CLAUDE.md's "empty content means a hidden section"). The project only had O Level courses at the time; publishing an A Level course made "A Level" appear immediately, confirmed live.
  - (3) is also not a bug — an assignment created by admin showed up instantly for an enrolled student, both on the course page and the dashboard's "Due soon" list, confirmed live end to end. The one real gotcha: "Due soon" only ever lists **assignments**, never **tests** (`getDueSoonAssessments` filters `type = 'assignment'`, matching SPEC §7's "assignments due soon or overdue" wording) — a test the owner had already created (`hdiiifbj`) correctly does not appear there, only on its course page under Assessments. Worth knowing, not worth "fixing".
  - (2) could not be reproduced after repeated live attempts — announcement create (Everyone target, course target), and edit all completed normally with the admin session intact throughout (confirmed via the page's own header each time), and a student session correctly saw the resulting "Everyone" announcement on both the dashboard and `/student/announcements`. `src/app/admin/announcements/` and `src/lib/auth.ts` have not been touched since Stages 8 and 2 respectively — nothing in this project's Stage 9B work could have caused it. Best guess is a stray browser tab left signed in as a student from earlier testing (this session's browser had exactly that: a live `teststudent@ex.com` session was already active before any debugging began). Flagged as unresolved rather than closed — if the owner hits it again, the useful details are the exact URL bar contents right after it happens and any error in the browser console.
  - While investigating, three test accounts had their passwords reset to known values for live testing and were **not** rotated back afterward: `testadmin@ex.com`, `teststudent@ex.com`, and `test@gmail.com` (the owner's own scratch student account, created during their manual testing, found already enrolled in "olvls" — separate from `teststudent@ex.com`). New passwords shared with the owner directly, not recorded here; rotate before launch per the existing notes above. Two of the owner's own real records were found and deliberately left untouched throughout: a pending application from "muhammad khizar" and an accepted one for "khozr" (now the `test@gmail.com` student account) — confirming the owner's own apply → accept flow worked correctly on their first real attempt.

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
- Stage 9A: mobile-width (~390px) layout was not verified live in the browser — the automation tool's window resize doesn't change the actual viewport in this session's environment (see the Stage 9A verification decision-log entry above). Do a manual phone-width check (including the mobile menu) before relying on this being fully checked. The filled-content state (published course + filled Settings) **was** verified live and is no longer an open item.
- Stage 9A: `testadmin@ex.com` / `teststudent@ex.com` (passwords set by the owner directly, not recorded here) were created for this verification pass instead of resetting the existing rotated `test-admin@example.com` / `test-student@example.com` accounts. Both sets of test accounts now exist — the owner should decide whether to keep, merge, or delete the older pair before launch, per the existing test-account cleanup notes above.
- Stage 8 verification: both `test-admin@example.com` and `test-student@example.com` rejected the password on file at the start of this pass, so both were reset via the Auth Admin API to a fresh temporary value shared with the owner directly (not recorded here) — rotate again before launch per the existing notes above. A scratch course ("QA Stage8 Course") and scratch batch ("QA Stage8 Batch") were created, one announcement of each target type (everyone/course/batch) was created live, and the pre-existing test student (enrolled only in "O Level Maths", no batch at the time) was confirmed to see only the "Everyone" announcement on both `/student` and `/student/announcements`, with safe auto-linking (trailing punctuation excluded from the link) and an inert `<script>` tag rendering as plain text. Deleting the scratch course and batch was confirmed live to cascade-delete their announcements rather than widen them to "everyone" — this doubled as cleanup, and the remaining "everyone" scratch announcement was deleted directly afterward; nothing else was left behind. Not completed live this pass, and so not claimed as verified beyond code review: the "enrolled/batched student now also sees the course/batch announcement" half of the visibility check (the RLS policy mirrors the already-proven Stage 6A `assessments` visibility pattern), and a direct student-session Supabase-client check that reads/writes on out-of-scope or all announcements are correctly scoped/rejected. Both accounts' passwords were rotated again immediately afterward to a fresh value not recorded anywhere, per the existing notes above.
- Home page redesign verification: `npm run lint`, `npm run typecheck`, `npm run build` and `npx vitest run` (67 tests, including 7 new `parseEmphasis` tests) all passed. Compared side by side with `docs/design/home-mockup.html` live in a real browser, in both light and dark mode, against the actual database (one published course, "olvls"/O Level, no `site_settings` filled in yet — correctly produced an empty headline/subtext and no footer Contact column, exercising the real empty-state paths). All sections matched the mockup closely; the portal-illustration's floating-card offsets needed hand-tuning after the first live render (see the decision-log entry above) and were re-verified afterward. One environment-level problem was found and fixed along the way: a stale `next dev` process from an earlier session was serving pre-edit code/CSS on port 3000 with a broken Turbopack HMR state — killed and restarted clean (`.next` cleared) before any of the above screenshots are to be trusted. **Not verified live**: the 375px mobile layout — `resize_window` reports success but `window.innerWidth` stays at the desktop size in this session's environment, the same pre-existing tooling limitation already recorded for Stages 9A/9B above. The responsive classes were reviewed by hand (bento tile spans, subject-grid/timeline/footer column stacking, the portal illustration's un-tilted mobile stack) and follow the same patterns already proven elsewhere, but a manual phone-width pass is still worth doing before launch, same as the outstanding Stage 9A/9B note.
- Stage 10C (consistency pass): new `TEST_ADMIN_EMAIL`/`TEST_ADMIN_PASSWORD` and `TEST_STUDENT_EMAIL`/`TEST_STUDENT_PASSWORD` entries were added to `.env.local` for this session (owner-provided admin credentials; the owner reset `teststudent@ex.com`'s password and completed its forced change themselves after a Bash permission guard blocked the agent from doing a password reset directly). A one-off Playwright script (installed into the OS temp scratchpad directory, never under the repo, and not committed) logged in as both and screenshotted every public/student/admin page at 1440px and 375px, light and dark — 138 screenshots reviewed by hand, then deleted. Found and fixed one real bug: `PortalShell`'s `<main>` was a flex item without `min-w-0`, so on any page with a wide table (the progress report summary table, the marking table) the whole page scrolled horizontally on mobile at ~375px instead of just the table; added `min-w-0` and confirmed via `document.documentElement.scrollWidth` that the report page now matches the 375px viewport exactly, with the table's own `overflow-x-auto` taking over correctly. Also investigated an apparent print-dark-mode bug (a status pill rendering unreadable-dark in `page.emulateMedia({media:"print"})` screenshots taken on an already-rendered dark-mode page) and root-caused it to a Playwright/Chromium repaint-caching artifact of switching media type on a live page, not a real bug — emulating print media *before* navigation (matching what a real browser does on Ctrl+P) rendered the same page and pill correctly light in both themes. `/login` and `/change-password` were moved from `src/app/login` and `src/app/change-password` into `src/app/(public)/login` and `src/app/(public)/change-password` (same URLs, route group only) so they inherit the shared `PublicHeader`/`PublicFooter`, per owner approval; `AuthShell` was simplified to drop its now-redundant logo link and background grid. A new `src/components/public/page-header.tsx` (eyebrow + Fraunces title + the existing `HeroBackground`, at a smaller scale than the home hero — no `HeroCurves`, which SPEC describes as home-only) is now used by every public page, 404, login and change-password instead of a plain `<h1>`. Segment-local `src/app/admin/not-found.tsx` and `src/app/student/not-found.tsx` were added so that `notFound()` calls inside those portals (there are several) keep rendering inside the portal shell instead of picking up the root `not-found.tsx`'s new public header/footer.
- Stage 10D (dashboard alignment): driven by an owner screenshot showing the course card barely overlapping the navy band (the `-mt-10`/`-mt-12` negative margin was being fought by the outer `space-y-8` container's own margin-top on that child), flush with the band's outer edge rather than its text inset, and a 3-column desktop grid. Fixed by grouping the band and its overlapping card wrapper into one `space-y-8` child (so the negative margin no longer competes with a sibling spacing rule), adding `px-6 sm:px-8` to the overlap wrapper to match the band's own internal padding, `relative z-10` on it, and dropping `lg:grid-cols-3` so desktop is always 2 columns. Verified live (admin + student logins from `.env.local`, 1440/375px, light/dark) that the card now visibly sits on top of the band with a ~16px navy reveal above it, aligned left with "Welcome back". Added `src/lib/display-name.ts` (`full_name.trim() || email`) and applied it everywhere a person is greeted or identified, replacing several slightly-different inline versions of the same fallback (`?? email`, `.trim() ? x : email`, `.trim() || email`) that had accumulated across stages — behavior is unchanged where `full_name` was already non-empty and trimmed; the only behavioral difference is a whitespace-only `full_name` (e.g. `"   "`) now correctly falls back to the email everywhere instead of only in the spots that already called `.trim()`.
- Progress report redesign verification: `npm run lint`, `npm run typecheck`, `npm run build` and `npx vitest run` (99 tests, including 40 new for the report calculations and chart layout math) all passed. Verified live with `admin123@ex.com` and `teststudent@ex.com`: the owner's own real account (`m.khizar.ibaad@gmail.com`, enrolled in "olvls" with one unmarked test) exercised the "no assessments" glance state and the "assessments exist, nothing marked" course-section state organically, with no scratch data needed for those two. Three scratch courses ("QA Report Course" × 3) were created and `teststudent@ex.com` enrolled in them to exercise the rest: 3+ marked (trend chart appears, hollow late-and-uncounted point, dashed average line), exactly 2 marked (Strongest/Needs work shown, no trend), a missing item, an upcoming item, and the homework-donut "marks without upload counts as handed in" rule — confirmed live that the same WhatsApp-style row shows "Missing" in the assessment table (pre-existing `computeAssessmentStatus`/`missingCount` behavior, unchanged) while correctly counting as "On time" in the new homework donut, per the owner's correction. All three scratch courses and their assessments/submissions/enrollments were deleted afterward (owner-confirmed before the delete, since direct SQL writes against the live database require explicit approval); `teststudent@ex.com`'s original "olvls" enrollment was confirmed unchanged. Checked in both light and dark mode. **Not verified live**: 375px mobile width — `resize_window`/`window.innerWidth` and a CSS-forced viewport both confirmed to not change the actual rendered width in this environment (same pre-existing tooling limitation as every prior stage's notes above), and the OS print-preview dialog itself isn't screenshot-able by the browser extension. The responsive classes (mobile-first grid/flex-wrap, `overflow-x-auto` tables) and the print CSS (`print:hidden` nav/sidebar/button, `print:break-before-page` per course, `print-color-adjust: exact` added to the existing `@media print` block in `globals.css` so the navy band and chart colours survive printing) were reviewed by hand and follow patterns already proven elsewhere, but a manual phone-width pass and one real Ctrl+P check are still worth doing before relying on this being fully checked, same as the outstanding notes above.
| 2026-10-02 | Stage 12 (pre-launch batch 1) approved: privacy page, link previews/favicon, floating WhatsApp button, admin-editable FAQ, UI polish (hover details, toast via sonner, reusable empty states, `SubjectIcon`). Implemented and committed one item at a time |
| 2026-10-02 | Link previews + favicon: added `NEXT_PUBLIC_SITE_URL` (`.env.example`/`.env.local`, falls back to `http://localhost:3000` if unset) as `metadataBase` in the root layout; every public page's `generateMetadata` now goes through a shared `buildPageMetadata()` helper (`src/lib/page-metadata.ts`) adding `alternates.canonical`, `openGraph` and `twitter` fields consistently. `src/app/opengraph-image.tsx`, `icon.tsx` and `apple-icon.tsx` use `next/og`'s `ImageResponse` to generate the OG image (navy gradient, academy name, tagline, faint parabola) and the favicon/apple-touch icon (rounded navy square, first letter of the academy name) from `site_settings` live, falling back to `FALLBACK_SITE_LABEL` if the settings read fails or the name is empty — nothing hardcodes the academy name. The static placeholder `src/app/favicon.ico` (the unmodified Next.js default icon) was deleted since `icon.tsx` now covers it, per Next's file-convention rules. Portal layouts (`src/app/admin/layout.tsx`, `src/app/student/layout.tsx`) switched from a static `metadata` export to `generateMetadata`, adding a `title: { template, default }` so every admin/student page gets a plain "`<Page>` · `<Academy>`" title; each of the 20 portal page files got a one-line `export const metadata = { title: "..." }` |
| 2026-10-02 | Found live: a Next.js title-template quirk — when a `layout.tsx` defines `title.template` and its **own same-segment** `page.tsx` (e.g. `/admin/layout.tsx` + `/admin/page.tsx`) sets a plain string title, the template is *not* applied (only pages in a *nested* segment, e.g. `/admin/courses`, get the `%s · Academy` treatment); confirmed by reading the rendered `<title>` tag directly (`Dashboard` instead of `Dashboard · THEOREMLY`) for `/student` while `/student/courses` correctly rendered `My Courses · THEOREMLY`. Fixed by removing the two index pages' own `title` export and instead setting the layout's template `default` to the fully-suffixed value (`` `Dashboard · ${academyName}` ``/`` `Overview · ${academyName}` ``), which Next does apply to the layout's own route |
| 2026-10-02 | **`NEXT_PUBLIC_SITE_URL` must be set in Netlify** to the real production URL (e.g. `https://<site>.netlify.app` or the custom domain once there is one) — without it, canonical links/OG URLs fall back to `http://localhost:3000`, which is wrong in production. Set it alongside `APPLY_FORM_SECRET` when deploying (Stage 11) |
| 2026-10-02 | Floating WhatsApp button (`src/components/public/whatsapp-button.tsx`): rendered only from `(public)/layout.tsx`, not portal/admin; renders nothing if `site_settings.contact_whatsapp` is unset. `buildWhatsAppUrl()` (`src/lib/settings.ts`) gained an optional `message` param (backward compatible — existing callers on `/contact`, `/privacy`, the footer and `ContactStrip` are unaffected) to build the prefilled `wa.me` link. To satisfy "must not cover the footer" without hardcoding a scroll offset, the button is hidden via an `IntersectionObserver` on the page's one `<footer>` rather than a fixed CSS gap, so it disappears exactly when the footer enters view regardless of a given page's footer height; verified live (desktop) that it shows on scroll and hides once the footer appears. Verified the `wa.me` URL is digits-only with the correct encoded prefilled message. **Not verified live**: the 375px mobile-overlap check — same pre-existing `resize_window`/`window.innerWidth` tooling limitation recorded throughout this file's decision log; the button's own size (56px) and position are standard and there are no other fixed/sticky elements on any public page to conflict with, but a manual phone-width glance is worth it before launch, same as the other outstanding mobile-width notes above |
| 2026-10-02 | FAQ: `faqs` table (`supabase/migrations/20261002000000_stage12_faqs.sql`) follows the `announcements` RLS pattern — `revoke all` then explicit re-`grant`, admins get full CRUD (including reading unpublished rows), `anon`+`authenticated` can only `select` where `is_published`. No seed content, per owner instruction. Admin CRUD (`src/app/admin/faqs/`) follows the existing `announcement-manager.tsx`/`announcement-form.tsx` dialog-driven pattern verbatim. Public side: `src/components/public/faq-section.tsx` renders `null` entirely when there are no published rows (no empty state — SPEC: empty content means a hidden section), uses `@base-ui/react/accordion` (already a dependency, no new package) with its default `multiple: false` behaviour for "one open at a time", and emits `FAQPage` JSON-LD from the same published rows, with `<` escaped in the embedded JSON so an admin-entered answer containing a literal `</script>` can never break out of the tag |
| 2026-10-02 | FAQ reorder: implemented as one atomic `move_faq(faq_id, direction)` Postgres function (`supabase/migrations/20261002000100_stage12_faqs_move_fn.sql`, `security definer`, admin-checked inside via `is_admin()`) rather than two separate client-side updates, so a swap can never be left half-done; a no-op (not an error) at the top/bottom edge. `createFaq` assigns each new row an explicit `sort_order = max(sort_order) + 1` rather than relying on the column's `default 0`, so `sort_order` values stay distinct and the function's "row immediately above/below" query is always well-defined. The admin UI disables the up/down buttons on the first/last row from the already-known list order (`src/app/admin/faqs/faq-manager.tsx`) |
| 2026-10-02 | FAQ verification: confirmed read-only against the real database — `pg_policies` shows exactly the five expected policies on `faqs`; a direct REST call with the anon key returns `[]` (table currently empty, so nothing published yet) and a REST insert attempt as anon is rejected with `42501 permission denied for table faqs`, confirming logged-out writes are rejected. **Not verified live**: the admin CRUD/reorder UI and a logged-in *student's* read/write RLS, both of which need a real admin/student session — this session's `.env.local` `TEST_ADMIN_EMAIL`/`TEST_STUDENT_EMAIL` passwords turned out to be stale (both `invalid_credentials` against the real Auth server), and resetting them was correctly blocked by this environment's own write-permission guard (secret-key/shared-resource writes need the owner's own approval, not a drive-by reset). The admin CRUD code itself directly mirrors the already-live-verified `announcements` CRUD, so risk is low, but the owner should give the admin UI (add/edit/delete/reorder/publish toggle) a quick click-through with current credentials before relying on it, and confirm a student session can't write to `faqs` either |
| 2026-10-02 | Polish: added `sonner` (owner-approved new dependency) as the single toast system, via `<AppToaster />` (`src/components/app-toaster.tsx`) mounted once in the root layout. It syncs to the app's own light/dark `theme-store` (not `next-themes`, which this project doesn't use) and switches bottom-right/bottom-center by viewport width via `matchMedia`, both through `useSyncExternalStore` (the same pattern as `theme-store`/`useIsClient`). Every portal/admin action that previously saved silently or showed inline-only success text (announcements, batches, courses, FAQs, resources, assessments, settings, logo upload, student profile/status/enrollments, applications accept/reject/delete, marking, the student's own password change and assignment submission) now also fires a toast; inline field-level errors are unchanged, and a toast additionally fires on unexpected failures |
| 2026-10-02 | Polish: `EmptyState` moved from `src/components/admin/empty-state.tsx` to `src/components/empty-state.tsx` since it's used on public pages too, not just admin — a plain rename, no behaviour change beyond also rendering `description` in `compact` mode (previously dropped silently), used to add a helpful one-line description to the four dashboard widgets that lacked one (courses/due-soon/marked/announcements) |
| 2026-10-02 | Polish: hover effects (`.hover-lift`, `.hover-arrow`/`.hover-arrow-group` in `globals.css`) are scoped to `@media (hover: hover) and (pointer: fine)` so a tap on a touch device never leaves a card visually "stuck" lifted; `prefers-reduced-motion` disables both. Applied to the home page's subject cards and "what you get" bento tiles, the student dashboard/My Courses course cards, and the `/courses` list rows' arrow pill — not retrofitted onto every existing button/link hover state already in the codebase (out of scope for this pass; those already darken correctly via shadcn's default `hover:bg-*` classes) |
| 2026-10-02 | Polish: new `SubjectIcon` component (`src/components/subject-icon.tsx`) is a small badge (lucide `Sigma`/`Atom`/`BookOpen`, same title-matching rule as the home page's existing large decorative `SubjectSymbol`, which is unchanged per owner instruction) — used on the home page subject cards, the student dashboard/My Courses course cards, the student course page header, and both progress-report course-section headings |
| 2026-10-02 | FAQ admin UI and student-session RLS could not be exercised live this session: this session's `TEST_ADMIN_EMAIL`/`TEST_STUDENT_EMAIL` passwords in `.env.local` were stale (`invalid_credentials` against the real Auth server when checked directly via the token endpoint), and resetting them via the Auth Admin API was correctly blocked by this environment's own write-permission guard rather than being pushed through. Logged-out (anon) RLS was verified directly via REST instead (see the FAQ entry above). The owner should do one pass logging in as admin (FAQ CRUD/reorder, and every toast above) and as student (confirm no write access to `faqs`) with current credentials before launch |
| 2026-10-02 | Privacy policy content is derived directly from the actual apply-form fields (`src/lib/validation/applications.ts`/`students.ts`), the real storage model (Supabase, private `course-files`/`submissions` buckets, signed URLs) and hosting (Netlify) — no invented claims, no certification/law-compliance claims. Linked from the footer's "Students" column and from the apply form above the submit button only, not the main nav, per owner instruction |
| 2026-10-02 | **Owner decision: dashboard "Upcoming work" replaces the 7-day "Due soon" list.** It now shows tests as well as assignments, with no upper date limit. `getDueSoonAssessments()` (`src/lib/student.ts`) returns every visible, unsubmitted assignment (overdue ones included) plus every visible test whose `due_at` has not passed (a student cannot submit a test, so a past test is over, not overdue); any submission row, including admin-entered marks, removes an item. Each row shows an Assignment/Test chip and a display-only pill from `dueDateBadge()`: Overdue (past), Due soon (within 7 days), Upcoming (later). Supersedes the earlier "Due soon lists assignments only" note. Verified live as a demo O Level student: an assignment 8 days out and a test 11 days out both appear |
| 2026-10-02 | **Owner decision: floating WhatsApp button removed** (owner didn't like how it looked). Deleted `src/components/public/whatsapp-button.tsx` and its use in `(public)/layout.tsx`, and reverted the now-unused `message` parameter on `buildWhatsAppUrl()`. The WhatsApp links on `/contact`, `/privacy`, the footer and `ContactStrip` are unchanged. Supersedes the floating-button entry above |
| 2026-10-03 | **Owner-requested: unread announcements indicator (student-only), superseding Stage 8's "no read/unread tracking" line above.** Announcements have no publish/schedule state (confirmed: no such field exists in `announcements` or anywhere in the spec), so "unread" is simply `created_at >` the student's watermark — RLS alone still decides visibility, this only adds a per-student time cutoff on top of it. New table `announcement_seen` (`user_id` PK → `profiles` cascade, `last_seen_at`), RLS: a user can select/insert/update only their own row, no delete policy. A new student's cutoff defaults to their `profiles.created_at` (no row yet), so nothing posted before their account existed counts as unread. Pure comparison/formatting logic lives in `src/lib/announcements-unread.ts` (unit-tested) so it doesn't need a database to test; `src/lib/announcements.ts` wraps it with the actual RLS-scoped queries |
| 2026-10-03 | Unread indicator: the portal nav badge is computed once in `StudentLayout` (server) and passed down to `StudentSidebar`/`StudentMobileNav`/`StudentNavLinks` as a prop — admins never get this prop at all, so there's no "no dot for admins" branch to get wrong. Opening `/student/announcements` renders "New" pills from the *old* cutoff (read before it's updated), then a client-only `MarkSeenOnMount` upserts `last_seen_at = now()` and calls `router.refresh()` — without the refresh, the nav badge would keep showing the stale count until a full reload, since the App Router caches layout output across client-side navigations. The dashboard's announcement card also shows "New" pills (read-only cutoff) but never marks anything seen — only opening the Announcements page does |
| 2026-10-01 | **Decided: marks take precedence over submission state.** `computeAssessmentStatus()` previously marked an assignment "Missing" whenever `submission.submitted_at` was null and the due date had passed, even when an admin had entered marks for that student without an upload (e.g. work sent via WhatsApp). Fixed: `marks != null` now returns "Marked" unconditionally, checked before anything else — "Missing" is reached only for an assignment past due with neither a submission nor marks. One function, used everywhere a status, a "Missing" count, or the homework summary is shown (student course page, assessment page, dashboard Due soon/Overdue, progress report table/`missingCount`, homework donut), so they can never disagree again. `is_late` is untouched — it still reflects only what the admin/actual submission set, never recomputed by this precedence change |
| 2026-10-04 | **Owner decision: tests accept student uploads, exactly like assignments** (superseding "Test: no upload" in §2/§4). The admin attaches the paper as the existing optional attachment; students download it and upload answers by the due date, with the same late flag and `counts_toward_report` default. No start time, timer or online quiz — "Quizzes / auto-graded tests" stays in §13. The admin can still enter marks for a test with no upload (owner confirmed), so a test with no upload is "Not yet marked" rather than "Missing", and the dashboard still drops a test from upcoming work once its due date passes. The homework donut stays assignments-only. `submit_assignment()` keeps its name to avoid an app-wide rename |
| 2026-10-04 | **Owner decision: the portal is an installable web app (PWA), not Play Store / App Store apps.** Free, updates the moment the site deploys, same login, no store review or separate builds. It only installs from the live HTTPS site. Offline support is limited to a "You're offline" page: the service worker caches only `/offline` and its CSS/fonts, and every other request goes to the network so students never see stale data. The service worker is registered only in production builds. The install card is on the student dashboard only. `#12243F` (navy) lives in `src/lib/app-icon.tsx` as `APP_NAVY` because the manifest, `theme-color` and next/og images can't read CSS variables |
| 2026-10-04 | **Owner decision: in-portal notifications bell for students** (no phone push yet). Notifications are created when the admin creates an assignment/test (there is no separate publish step, so creating it is publishing it), posts an announcement, or saves marks for a student (only that student; only when marks or feedback actually changed, and an older unread marks notification for the same assessment is replaced rather than stacked). Editing an assessment or announcement does not notify. Recipients are chosen in SQL by SECURITY DEFINER `notify_*` functions that re-check `is_admin()` and mirror the existing visibility rules (course enrollment, batch target, active student) — the app never passes a list of students. A failed notification is logged and never fails the admin's actual save. "Due work" (unsubmitted assignments due within 24 hours or overdue, and tests due within 24 hours) is computed live from `getDueSoonAssessments` and never stored. The bell opens a page (`/student/notifications`) rather than a dropdown, to avoid a new popover dependency and work well on phones. Turning notifications off (`notification_preferences.enabled = false`) stops new rows being created for that student and hides the badge and due list; older notifications stay readable |
| 2026-10-04 | Bell count bug (owner report): the count was rendered once in `StudentLayout`, and the App Router does not re-render a layout on client-side navigation, so the badge kept its first value. The bell is now a client component that re-fetches `/student/notifications/count` on every pathname change, on tab focus, and on a `notifications:changed` window event fired after marking read or changing the setting; a fresh server render still wins over its local value |
| 2026-10-04 | **Owner request: phone notifications (Web Push)** for the installed app, using the `web-push` library (new dependency, owner-requested) with VAPID keys from env. Every bell notification also goes out as a push to the student's turned-on devices; the bell's off switch still applies (no row, no push). Sending needs other students' subscriptions, so `src/lib/push.ts` uses the secret-key client — only from admin Server Actions after `requireAdmin()`, and from the cron route after it checks `CRON_SECRET` (the one secret-key use not tied to an admin session). Pushes are sent with `after()` so the admin's save isn't delayed. Daily due-work reminder: one push per student for unsubmitted work due within the next 24 hours (overdue work is not re-pushed daily), at 14:00 UTC (5 pm Saudi time, owner hadn't picked a time; change the cron string in `netlify/functions/due-reminders.mjs`). In development the service worker is registered only when a student turns phone notifications on (production registers it on load, Stage 15) |
| 2026-10-04 | **Owner decision: "Ask the teacher"** — a narrow exception to "Chat, forums, comments" in §13: one question, one answer, no thread. A student asks about one enrolled course or "General" with at most one optional file; the admin answers once (optionally with one file), can edit the answer later without re-notifying, or close the question unanswered. The student may delete a question only while it is waiting. Questions are private to the student and admins. Admins see a waiting-count badge on "Questions" (no push to staff). The first answer creates a bell notification + phone push via `notify_answer()` |
| 2026-10-04 | **Owner decision: live classes ("option 1")**, superseding the "no class schedule / meeting links" line of 2026-09-29 and narrowing the §13 item to weekly timetables. The admin adds one entry per class (title, start time in Saudi time, Zoom/Meet join link, optional note, all students or one batch, following the announcements targeting idea without the course option) and can edit or delete it. Students see their upcoming classes in a card at the top of the dashboard with a Join button; a class stays listed until an hour after it starts so a class in progress can still be joined, then drops off (rows are kept; the admin page lists the latest 20 past classes). Adding a class creates a bell notification + phone push via `notify_new_live_class()`; editing never re-notifies. Students read classes only while active, because the join link lets anyone holding it into the class. Saudi time is a fixed UTC+3 offset (no daylight saving), so the admin's entry is converted on the server regardless of their device's time zone; students see times in their own local time like every other date |
| 2026-10-04 | **Owner request: live class times are not Saudi time** (superseding the Saudi-time part of the entry above). The admin enters the start time in their own device's time zone, exactly like assessment due dates (converted to UTC in the browser), with no time-zone label; the admin list and the student card show it in the viewer's local time. The "New live class" notification shows no time at all, only "New live class: <title>" (owner decision; the phone pop-up uses the usual "Tap to open." line). The time is shown only on the dashboard card, in the student's own time zone |
| 2026-10-05 | **Owner request: a little subtle animation on the public site** (within §12's "no heavy animation"). CSS only plus one tiny client component, no new dependency: the home hero (eyebrow, headline, subtext, buttons, portal preview) and the other public pages' header fade in and rise 12px on load with an 80ms stagger (~0.5s total); each home section below the hero (What you get, Subjects, How to join, FAQ, closing CTA) fades in and rises 16px once, the first time it scrolls into view (`src/components/public/reveal.tsx`, IntersectionObserver). Existing card hover lifts are unchanged; no number count-ups (there are no stats). Nothing moves with `prefers-reduced-motion: reduce`, and content is only hidden while JavaScript is enabled (`@media (scripting: enabled)`), so it can never get stuck invisible. Portal and admin pages are not animated |
| 2026-10-06 | **Separated the home page intro from the About page text**, which previously shared one `about_text` field (the home hero subtext and `/about`'s body were always identical). Added `about_page_text` (`supabase/migrations/20261006093000_stage20_about_page_text.sql`), backfilled from the existing `about_text` so nothing visible changed at migration time. `about_text` now controls only the home page intro; `/admin/settings` has two separate fields ("Home page intro" and "About page"); `/about` reads `about_page_text`|
