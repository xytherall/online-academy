# Demo guide

A step-by-step script for showing the academy website to the academy owner, plus answers to likely questions and some pricing guidance. Written 2026-10-11.

The site is **not deployed yet**. The demo runs on your own computer (`localhost`) against the live Supabase database. The academy name on screen (THEOREMLY) is a working name. It is still undecided and can be changed at any time from **Admin → Settings**.

---

## 1. Before the demo (about 15 minutes)

### 1.1 Reset the demo data

The demo students, batches, work, quizzes, live classes and questions are created by a script. Due dates and class times are set relative to the day you run it, so **run it on the day of the demo** (or the day before). Otherwise "upcoming" work slides into the past.

From the project folder:

```bash
node --env-file=.env.local scripts/cleanup-demo.mjs
```

```bash
node --env-file=.env.local scripts/seed-demo.mjs
```

The cleanup only removes demo data: users whose email ends in `@demo.test`, the two demo batches and everything attached to them, the demo announcements, resources and applications. Real students and your own work are not touched.

What the seed creates:

| Thing | Details |
|---|---|
| 8 demo students | O Level Maths, evening batch: Ayesha, Hamza, Zainab (Pakistan), Omar (Saudi Arabia), Daniyal (UK). A Level Physics + Maths, weekend batch: Bilal, Fatima (Pakistan), Maryam (UAE) |
| Assignments and tests | Marked, submitted, late and missing work, so the statuses and report have something real to show. Every student has a teacher assessment on their report |
| 3 quizzes | "Quick Quiz: Percentages" (already answered, so you can show a result); "Quick Quiz: Angles and Polygons" (O Level, open, take it live as Ayesha); "Quick Quiz: Differentiation Rules" (A Level, open, take it live as Fatima) |
| 4 live classes | One starting about 2 hours after you run the seed, two in the next couple of days, one in the past |
| Ask the teacher | Two answered questions and one waiting (from Hamza) for you to answer live |
| Notifications | Every student's bell has new work, new quiz, marks, announcements, live classes (older ones already read). The admin bell has new applications, a new question and late hand-ins |
| 4 announcements, 4 link resources, 2 pending applications | |

Good students to show: **Ayesha** (strong O Level student), **Daniyal** (struggling, with missing work, to show how the report flags it), **Fatima** (A Level, two subjects).

Demo logins: every demo student signs in with their first name `@demo.test` (for example `fatima@demo.test`). The shared demo password is `DEMO_PASSWORD` in `scripts/demo-data.mjs`. Your own admin login is used for the admin part.

### 1.2 Start the site

```bash
npm run dev
```

Open `http://localhost:3000`. Click through the home page and log in once as admin before the meeting, so the first page loads are already warm (the dev server is slow on the very first visit to each page).

### 1.3 Use two browser windows

- **Window A (normal):** you as admin.
- **Window B (private/incognito):** the demo student.

This lets you switch between "teacher" and "student" without logging out. If you show it on a phone, use the student side there: most students will use phones.

### 1.4 Optional: things the owner might ask about

The random-named test items ("iii", "djvnd", "ejfnejhd cjjcdjc") were deleted on 2026-10-11. Everything else is left as it is. A few things they may notice, and an easy answer for each:

- **Contact details** (`contact@example.com`, `+92 300 1234567`) and the home page intro are placeholders. *"These are filled in from Settings once we have your real details."*
- **Course names** ("O levels Maths" and so on) can be renamed from Admin → Courses at any time.
- **FAQ answers** mention a free trial class and students from six countries. *"These are examples; you tell me what's true and I'll change them."*

---

## 2. The demo script

Suggested length: 20 to 25 minutes, then questions. Lines in *italics* are things you can say.

### Part 1: Public website (3 minutes), not logged in

1. **Home page** `/`. Scroll slowly: headline, courses, how to apply, FAQ.
   *"This is what parents and students see first. Everything here, the name, tagline, intro, contact details and FAQs, is edited from the admin settings. Nothing is hard-coded, so when you pick a final name it changes everywhere at once."*
2. **Toggle dark mode** (sun/moon icon, top right). *"It follows the phone's light or dark setting too."*
3. **Courses** → open one course. *"Only courses you publish appear here."*
4. **About** and **Contact**. *"Both come straight from Settings."*

### Part 2: Applying (2 minutes)

5. Click **Apply now**. Show the form: student details, level, then the courses for that level, guardian details.
   *"Validation runs in the browser and again on the server, and there's basic spam protection."*
6. **Do not submit with a real-looking email.** If you want to submit live, use an address ending `@demo.test` (for example `new.student@demo.test`) so the reset removes it. You'll see the "Application sent" page.

### Part 3: Admin handles the application (3 minutes), window A as admin

7. **Admin overview** `/admin`. *"Real counts only: pending applications, work waiting to be marked, active students."* Point out the bell: new applications, questions and late work create an alert.
8. **Applications** → open **Usman Tariq** (a demo applicant). Show **Accept**: choose a batch and a temporary password. *"Accepting creates the account, copies the details, enrols them in the courses they chose, and they must set their own password on first login. You share the login on WhatsApp."* You can accept it: the email ends `@demo.test`, so the reset removes the account afterwards. Click **Generate** for the password, then **Accept and create account**. The page shows a ready-made login message with a **Copy** button for WhatsApp. (Until the site is live, the link in that message says `localhost`; it will show the real address once deployed.)

### Part 4: The student's portal (6 minutes), window B as `fatima@demo.test`

9. **Dashboard**. Walk top to bottom:
   - *Upcoming live classes* with a Join button (the demo link opens Zoom's public test page).
   - The welcome band with each course's overall score.
   - *Upcoming work* with Due soon / Overdue labels.
   - *Recently marked* work and *Announcements*.
   *"Everything a student needs is on one screen, and it works on a phone. It can also be installed on the home screen like an app."*
10. **My Courses → A Level Maths**. Resources (PDFs or links) and every assessment with its status.
11. **Take the quiz live**: open **Quick Quiz: Differentiation Rules**, pick answers, **Submit quiz**, confirm.
    *"It's marked instantly. The student sees the score, which answers were wrong and the right ones. One attempt only, and the answers are never sent to the browser before they submit."*
12. **Upload work**: open **Waves and Superposition** (A Level Physics) and show the upload box. *"PDF or phone photos, compressed automatically. Late work is accepted but flagged."* You can submit any small PDF or photo; the reset clears it.
13. **Progress report**. *"Calculated live from the marks. Each subject separately, with a marks-over-time chart, homework handed in on time, strongest and weakest work, and the teacher's comments. Late work doesn't count unless the teacher allows it."*
14. **Ask the teacher**: show Fatima's answered question. *"Students can ask about any course and attach a photo of their working. Only they and the academy see it."*
15. **Notifications** (bell): the new quiz alert.

### Part 5: Teacher's side (6 minutes), back to window A

16. **Marking** `/admin/marking`. Open **Trigonometry Practice Set** (or the Waves sheet you just uploaded). Open the uploaded file, enter marks and a short comment, save.
    *"One list of everything waiting to be marked, across all courses. You can also enter marks for work sent on WhatsApp or a test sat on paper, with no upload."*
17. Open the quiz you just took as Fatima to show her answers, with correct answers in green.
18. **Ask the teacher** (admin) → answer **Hamza's** waiting question. *"The student gets a notification."*
19. **Live classes** → **Add**: title, date and time, join link, everyone or one batch. *"Students see it on their dashboard with a Join button and get a notification."* You can add one for a demo batch; the reset removes it.
20. **Announcements** → show targeting: everyone, one course, or one batch.
21. **Students** → open **Ayesha Khan**. Details, guardian info, batch, courses, teacher assessment (effort, participation, strengths, areas to improve), then **Progress report → Print / Save as PDF**.
    *"This is the report you'd send a parent. It prints cleanly on A4."*
    Then open **Daniyal Shah**'s report for contrast: lower scores, missing homework and a teacher comment. *"It makes it obvious who needs attention."*
22. **Batches** and **Courses**: briefly. *"Batches are groups like country or timing. Courses hold resources and assessments; you add quizzes by pasting questions."*
23. **Settings**: show that the name, tagline, About text and contact details are editable. **Don't save changes unless you mean them.**

### Part 6: Close (1 minute)

*"Payments, attendance and the timetable stay on WhatsApp for now, as agreed. Recorded lectures are planned as the next step. When you're happy with the name and content, it goes live on a proper web address."*

---

## 3. What NOT to click during the demo

| Don't | Why |
|---|---|
| **Settings → "Clear uploaded files"** | Removes uploaded files of all marked work, real students included. Marks stay, but the files are gone for good. |
| **Save in Settings** with half-typed text | It changes the live public site immediately. |
| **Deactivate** or **Reset password** on any non-demo student | Affects real accounts (Taha, and the test accounts). |
| **Accept an application whose email doesn't end `@demo.test`** | It creates a real account that the reset won't remove. |
| **Delete a course, or a batch that isn't a demo batch** | Real data. |
| Log in as a real student | Use only `@demo.test` logins. |
| Turn on phone notifications on the academy owner's phone using a demo account | It registers their phone to a demo student. |
| Submit the Differentiation quiz before you mean to | One attempt per student. If it's already used, show it as Bilal instead, or re-run the reset. |

## 4. After the demo: reset

```bash
node --env-file=.env.local scripts/cleanup-demo.mjs
```

```bash
node --env-file=.env.local scripts/seed-demo.mjs
```

The cleanup alone leaves the database with no demo data at all (do this before going live). Anything you created during the demo inside the demo batches, or with a `@demo.test` email, is removed. Anything you created for **everyone** (an announcement to all students, a live class for all students, an assessment with no batch) is **not** removed by the script; delete it by hand from the admin page.

---

## 5. Likely questions and honest answers

**Can students watch recorded lectures?**
Not yet. Classes are live on Zoom or Google Meet; recordings can be added today as a link resource (for example an unlisted YouTube link). Proper recorded lectures are planned: the recommended option is Bunny Stream, roughly **$5 to $10 a month for about 10 students at 720p**, growing with the number of students and hours watched. It isn't built yet.

**Is it live? What's the web address?**
Not yet. It will be hosted on **Netlify**, with the database on **Supabase**. It needs a domain name first (about once a year to renew). Once the name and content are final, going live is a short job.

**What will it cost?** See section 6. Pricing isn't decided yet.

**Can parents log in?**
No separate parent accounts. Parents get the printable progress report (PDF) from the teacher. Guardian contact details are stored on each student.

**Can it take fee payments, track attendance, or show a weekly timetable?**
Not in this version, by agreement: fees, attendance and timetables stay on WhatsApp. Each upcoming class is posted with its join link. Any of these can be added later if the academy needs it.

**Is it secure? Can a student see another student's marks?**
No. Permissions are enforced by the server and the database itself, not just hidden buttons. A student can only read their own work, marks and questions. Uploaded files are private and opened through links that expire after a short time.

**What if a student forgets their password?**
The admin sets a new temporary password from the student's page; the student must change it when they next log in. Email-based "forgot password" needs a domain and email service, planned after launch.

**Does it work on phones? Is there an app?**
Yes, it's designed phone-first. Students can install it on their home screen like an app (Android and iPhone) and get phone notifications. There is no App Store / Play Store app.

**Can there be more teachers?**
Today there are two admins with full access. A separate teacher role with limited access is designed for but not built.

**Can we change the name and logo later?**
Yes, any time, from Settings. Nothing is tied to "THEOREMLY".

**Who owns the data? What about backups?**
The database is in the academy's own Supabase account. The free plan has no automatic backups, so a regular export is part of the launch checklist (or the paid plan, which includes daily backups).

**What happens if nobody uses it for a while?**
Free Supabase projects pause after a week with no activity. The site already includes a small scheduled check (three times a week) that keeps it awake once deployed.

---

## 6. Pricing guidance

Pricing isn't decided. This section is to help you think it through; it isn't a quote. Prices below were checked on 2026-10-11 from third-party summaries of each provider's pricing, so confirm on the providers' own pricing pages before you commit.

### 6.1 Running costs (what the academy pays the providers)

| Item | Cost | Notes |
|---|---|---|
| Supabase (database, logins, file storage) | **Free** | Free plan: 500 MB database, 50,000 monthly users, roughly 1 GB file storage, 2 projects. Pauses after 7 days idle (the keep-alive handles this). No automatic backups. |
| Supabase Pro (optional) | **$25 / month** | Only if they outgrow storage, want daily backups, or want no pausing at all. |
| Netlify (hosting) | **Free** | Free plan is credit-based (300 credits a month). Each deploy and page load uses some credits; for about 10 to 30 students it should fit, but watch usage in the first month. Personal plan is $9 / month, Pro $20 / month, if needed. |
| Domain name | **About $10 to $15 a year** for a `.com` | A `.pk` domain is also possible; price varies by registrar. |
| Video hosting (optional, when recorded lectures are added) | **About $5 to $10 a month** for 10 students at 720p (Bunny Stream) | Grows with students and hours watched. |
| Email service (optional, later) | Free tier usually enough | Only needed for "forgot password" and email notifications. |

**Typical total:** about **$1 a month** (domain only) on free tiers, about **$6 to $11 a month** once recorded lectures are added, and about **$35 to $50 a month** if they move to paid plans.

Have the academy own these accounts (or at least the billing), so the costs are theirs and they keep their data if you stop working on it.

### 6.2 What you could charge

Three common ways, with rough ranges for a small Pakistani academy. These ranges are my estimate from freelance and agency rates (local freelancers around $10 an hour; small LMS builds on freelance sites roughly $400 to $2,200; maintenance packages from about $80 to $100 a month internationally), converted at roughly PKR 280 per US dollar. Adjust them to your relationship with the academy.

**Option A: One-time build fee + small monthly support** (most common)
- Build: **PKR 80,000 to 200,000** (about $300 to $700). The lower end if it's a friend or first client and you want a portfolio piece; the upper end reflects what's actually built (public site, portal, admin, quizzes, reports, notifications).
- Support: **PKR 5,000 to 15,000 a month** for hosting care, backups, small fixes and help, with new features quoted separately.

**Option B: Monthly subscription only** (no upfront fee)
- **PKR 10,000 to 25,000 a month**, or a per-student fee such as **PKR 500 to 1,000 per active student per month** with a minimum. Easier for the academy to say yes to; you earn more over time if they stay. Agree a minimum term (for example 12 months).

**Option C: Build fee only, they run it themselves**
- **PKR 150,000 to 300,000**, with handover notes, and any later work billed by the hour (around **PKR 2,000 to 4,000 an hour**).

Whatever you pick, put these in writing:
- Who pays the running costs (section 6.1), and whose name the accounts are in.
- What "support" includes (bug fixes, small text changes, backups) and what counts as new work (recorded lectures, payments, attendance, teacher role).
- Response time for problems.
- What happens if the arrangement ends (they keep the accounts and data; you hand over the code).

Sources used for the price checks: [Supabase pricing summary (Makerkit)](https://makerkit.dev/blog/saas/supabase-pricing), [Supabase plans (Focus Reactive)](https://focusreactive.com/blog/supabase-price/), [Netlify pricing and limits 2026](https://netli.fyi/blog/netlify-pricing-and-limits), [Netlify plans (Costbench)](https://costbench.com/software/cloud-infrastructure/netlify/), and freelance listings on [Upwork](https://www.upwork.com/services/product/development-it-professional-lms-app-onlie-courses-trainings-academy-lms-developer-1754868760264278016) and [Hubstaff Talent](https://hubstafftalent.net/profiles/hamza-tahir-5).
