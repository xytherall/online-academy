// Fills the database with clearly-labelled demo data for presenting the app:
// demo students (emails ending @demo.test), two batches, assessments with a
// mix of marked / submitted / late / missing work, two quizzes, live classes,
// "Ask the teacher" questions, a few notifications, announcements, a few link
// resources and two pending applications. Due dates and class times are set
// relative to today, so re-run it (cleanup first) shortly before a demo. Existing courses are reused and
// nothing that already exists is modified.
//
// Run:    node --env-file=.env.local scripts/seed-demo.mjs
// Undo:   node --env-file=.env.local scripts/cleanup-demo.mjs

import { randomUUID } from "node:crypto";
import {
  DEMO_ACADEMY_ANNOUNCEMENT_TITLE,
  DEMO_BATCH_NAMES,
  DEMO_PASSWORD,
  DEMO_RESOURCES,
  adminClient,
  check,
  listDemoUsers,
} from "./demo-data.mjs";

const sb = adminClient();
const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const daysFromNow = (d) => new Date(now + d * DAY).toISOString();

if ((await listDemoUsers(sb)).length) {
  console.error("Demo data already exists. Run scripts/cleanup-demo.mjs first.");
  process.exit(1);
}

// --- Existing courses and admin -------------------------------------------

const courses = check(await sb.from("courses").select("id, slug, title"), "load courses");
const courseTitle = (id) => courses.find((c) => c.id === id).title;
const courseId = (slug) => {
  const c = courses.find((x) => x.slug === slug);
  if (!c) throw new Error(`Course "${slug}" not found`);
  return c.id;
};
const oMaths = courseId("o-levels-maths");
const aPhysics = courseId("a-levels-physics");
const aMaths = courseId("a-levels-maths");

const admin = check(
  await sb.from("profiles").select("id").eq("role", "admin").eq("is_active", true).limit(1).maybeSingle(),
  "find admin",
);
const markedBy = admin?.id ?? null;

// --- Batches ---------------------------------------------------------------

const batchRows = check(
  await sb
    .from("batches")
    .insert([
      { name: DEMO_BATCH_NAMES.oMaths, notes: "Mon / Wed / Fri, 6–7 pm" },
      { name: DEMO_BATCH_NAMES.aLevel, notes: "Saturday and Sunday mornings" },
    ])
    .select("id, name"),
  "create batches",
);
const batchId = (name) => batchRows.find((b) => b.name === name).id;
const batchO = batchId(DEMO_BATCH_NAMES.oMaths);
const batchA = batchId(DEMO_BATCH_NAMES.aLevel);

// --- Students --------------------------------------------------------------

const STUDENTS = [
  { key: "ayesha", name: "Ayesha Khan", batch: batchO, courses: [oMaths], school: "Beaconhouse School", guardian: "Imran Khan" },
  { key: "hamza", name: "Hamza Ali", batch: batchO, courses: [oMaths], school: "City School", guardian: "Sajid Ali" },
  { key: "zainab", name: "Zainab Raza", batch: batchO, courses: [oMaths], school: "Lahore Grammar School", guardian: "Nadia Raza" },
  { key: "bilal", name: "Bilal Ahmed", batch: batchA, courses: [aPhysics, aMaths], school: "Roots International", guardian: "Tariq Ahmed" },
  { key: "fatima", name: "Fatima Noor", batch: batchA, courses: [aPhysics, aMaths], school: "Karachi Grammar School", guardian: "Rehana Noor" },
  { key: "omar", name: "Omar Siddiqui", batch: batchO, courses: [oMaths], school: "Pakistan International School Jeddah", guardian: "Kamran Siddiqui", country: "Saudi Arabia", code: "+966 50" },
  { key: "daniyal", name: "Daniyal Shah", batch: batchO, courses: [oMaths], school: "Manchester Grammar School", guardian: "Asma Shah", country: "United Kingdom", code: "+44 7700" },
  { key: "maryam", name: "Maryam Iqbal", batch: batchA, courses: [aPhysics, aMaths], school: "Delhi Private School Dubai", guardian: "Javed Iqbal", country: "United Arab Emirates", code: "+971 50" },
];

const studentId = {};
for (const [i, s] of STUDENTS.entries()) {
  const email = `${s.key}@demo.test`;
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: s.name },
  });
  if (error) throw new Error(`create user ${email}: ${error.message}`);
  const id = data.user.id;
  studentId[s.key] = id;

  check(
    await sb
      .from("profiles")
      .update({
        full_name: s.name,
        batch_id: s.batch,
        phone: `${s.code ?? "+92 300"} 000000${i}`,
        whatsapp: `${s.code ?? "+92 300"} 000000${i}`,
        country: s.country ?? "Pakistan",
        school: s.school,
        guardian_name: s.guardian,
        guardian_phone: `${s.code ?? "+92 321"} 100000${i}`,
      })
      .eq("id", id),
    `update profile ${email}`,
  );
  check(
    await sb.from("enrollments").insert(s.courses.map((course_id) => ({ student_id: id, course_id }))),
    `enroll ${email}`,
  );
}

// Teacher assessment shown on the progress report.
const TEACHER_NOTES = [
  { key: "ayesha", course: oMaths, effort_rating: "excellent", participation_rating: "good", strengths: "Clear, well-organised working in algebra.", areas_to_improve: "Show every step in geometry proofs.", remarks: "A pleasure to teach." },
  { key: "hamza", course: oMaths, effort_rating: "satisfactory", participation_rating: "good", strengths: "Asks good questions in class.", areas_to_improve: "Hand homework in on time." },
  { key: "fatima", course: aPhysics, effort_rating: "excellent", participation_rating: "excellent", strengths: "Strong grasp of mechanics.", areas_to_improve: "Check units in final answers." },
  { key: "bilal", course: aMaths, effort_rating: "good", participation_rating: "satisfactory", strengths: "Quick with differentiation rules.", areas_to_improve: "Submit work before the deadline." },
  { key: "bilal", course: aPhysics, effort_rating: "good", participation_rating: "good", strengths: "Good at setting up force diagrams.", areas_to_improve: "Revise projectile motion." },
  { key: "fatima", course: aMaths, effort_rating: "excellent", participation_rating: "good", strengths: "Neat, accurate working.", areas_to_improve: "Attempt the harder extension questions.", remarks: "On track for a top grade." },
  { key: "zainab", course: oMaths, effort_rating: "good", participation_rating: "satisfactory", strengths: "Strong in number work.", areas_to_improve: "Submit homework by the deadline so it counts.", remarks: "Capable of more. Late work is holding her score back." },
  { key: "omar", course: oMaths, effort_rating: "good", participation_rating: "excellent", strengths: "Confident with algebra and explains his answers well.", areas_to_improve: "Accuracy with angle facts." },
  { key: "daniyal", course: oMaths, effort_rating: "needs_improvement", participation_rating: "satisfactory", strengths: "Understands new topics quickly in class.", areas_to_improve: "Complete every homework; two pieces are missing.", remarks: "We will catch up on the missing work together." },
  { key: "maryam", course: aPhysics, effort_rating: "excellent", participation_rating: "good", strengths: "Careful, well-explained solutions.", areas_to_improve: "Speed in timed tests." },
  { key: "maryam", course: aMaths, effort_rating: "good", participation_rating: "good", strengths: "Solid differentiation.", areas_to_improve: "Practise integration techniques." },
];
for (const { key, course, ...fields } of TEACHER_NOTES) {
  check(
    await sb.from("enrollments").update(fields).eq("student_id", studentId[key]).eq("course_id", course),
    "teacher assessment",
  );
}

// --- Assessments and submissions ------------------------------------------
// work: per student, [kind, marks?, feedback?]. kind "on" = uploaded on time,
// "late" = uploaded late, "test" = test mark with no upload. A student left
// out has nothing submitted (Missing once the due date has passed).

const ASSESSMENTS = [
  {
    course: oMaths, batch: batchO, type: "assignment", title: "Algebra: Linear Equations", due: -21, total: 20,
    instructions: "Solve questions 1–15 from the worksheet. Show all working.",
    work: { ayesha: ["on", 18, "Excellent work."], hamza: ["on", 14, "Good, check your signs in Q9."], zainab: ["late", 12, "Mostly correct but submitted late."], omar: ["on", 17, "Very good."], daniyal: ["on", 11, "Revise how to rearrange equations."] },
  },
  {
    course: oMaths, batch: batchO, type: "test", title: "Test 1: Algebra and Number", due: -14, total: 50,
    instructions: "Timed test in class (45 minutes).",
    work: { ayesha: ["test", 44], hamza: ["test", 31], zainab: ["test", 38], omar: ["test", 40], daniyal: ["test", 27] },
  },
  {
    course: oMaths, batch: batchO, type: "assignment", title: "Geometry: Angles and Polygons", due: -7, total: 20,
    instructions: "Complete exercise 7B. Label every diagram.",
    work: { ayesha: ["on", 16, "Well done, one slip in Q4."], hamza: ["on"], omar: ["on", 13, "Check your angle facts for polygons."] },
  },
  {
    course: oMaths, batch: batchO, type: "assignment", title: "Trigonometry Practice Set", due: -2, total: 25,
    instructions: "Questions 1–10 on SOH CAH TOA. Give answers to 3 significant figures.",
    work: { ayesha: ["on"], zainab: ["late"], omar: ["on"] },
  },
  {
    course: oMaths, batch: batchO, type: "assignment", title: "Statistics: Mean, Median and Mode", due: 6, total: 20,
    instructions: "Collect 20 data points of your choice and find the mean, median and mode.",
    work: {},
  },
  {
    course: oMaths, batch: batchO, type: "test", title: "Test 2: Geometry", due: 12, total: 50,
    instructions: "Covers angles, polygons and trigonometry. Bring a calculator.",
    work: {},
  },
  {
    course: aPhysics, batch: batchA, type: "assignment", title: "Kinematics Problem Sheet", due: -18, total: 30,
    instructions: "Answer all questions on the SUVAT problem sheet.",
    work: { bilal: ["on", 24, "Good. Revise projectile motion."], fatima: ["on", 27, "Very thorough."], maryam: ["on", 25, "Clear working throughout."] },
  },
  {
    course: aPhysics, batch: batchA, type: "test", title: "Test 1: Mechanics", due: -10, total: 60,
    instructions: "Paper-style test on forces and motion (1 hour).",
    work: { bilal: ["test", 41], fatima: ["test", 52], maryam: ["test", 47] },
  },
  {
    course: aPhysics, batch: batchA, type: "assignment", title: "Electric Circuits Worksheet", due: -4, total: 30,
    instructions: "Series and parallel circuits, questions 1–12.",
    work: { fatima: ["on"], maryam: ["late"] },
  },
  {
    course: aPhysics, batch: batchA, type: "assignment", title: "Waves and Superposition", due: 7, total: 30,
    instructions: "Read chapter 14 and answer the end-of-chapter questions.",
    work: {},
  },
  {
    course: aMaths, batch: batchA, type: "assignment", title: "Differentiation Basics", due: -12, total: 25,
    instructions: "Exercise 3A, all parts.",
    work: { bilal: ["late", 19, "Correct, but late."], fatima: ["on", 22, "Neat and accurate."], maryam: ["on", 21, "Good. Watch the chain rule in 3A(f)."] },
  },
  {
    course: aMaths, batch: batchA, type: "test", title: "Test 1: Functions and Differentiation", due: -5, total: 40,
    instructions: "30-minute test in class on functions and differentiation.",
    work: { bilal: ["test", 30], fatima: ["test", 35], maryam: ["test", 33] },
  },
  {
    course: aMaths, batch: batchA, type: "assignment", title: "Integration Practice", due: 9, total: 25,
    instructions: "Exercise 5C, questions 1–20.",
    work: {},
  },
];

const pdf = demoPdf("Demo submission");
let submissionCount = 0;

for (const a of ASSESSMENTS) {
  const assessment = check(
    await sb
      .from("assessments")
      .insert({
        course_id: a.course,
        batch_id: a.batch,
        type: a.type,
        title: a.title,
        instructions: a.instructions,
        due_at: daysFromNow(a.due),
        total_marks: a.total,
      })
      .select("id")
      .single(),
    `create assessment ${a.title}`,
  );

  for (const [key, [kind, marks, feedback]] of Object.entries(a.work)) {
    const sid = studentId[key];
    const isLate = kind === "late";
    const row = {
      assessment_id: assessment.id,
      student_id: sid,
      is_late: isLate,
      counts_toward_report: !isLate,
    };

    if (kind !== "test") {
      const path = `${assessment.id}/${sid}/${randomUUID()}-answers.pdf`;
      check(
        await sb.storage.from("submissions").upload(path, pdf, { contentType: "application/pdf" }),
        "upload submission file",
      );
      row.file_paths = [path];
      row.submitted_at = daysFromNow(a.due + (isLate ? 1 : -1));
    }
    if (marks !== undefined) {
      Object.assign(row, {
        marks,
        feedback: feedback ?? null,
        marked_by: markedBy,
        marked_at: daysFromNow(Math.min(0, a.due + 2)),
      });
    }
    check(await sb.from("submissions").insert(row), `submission ${a.title}`);
    submissionCount++;
  }
}

// --- Quizzes ---------------------------------------------------------------
// answers: per student, the picked option index for each question (0-based).
// Scored here exactly like submit_quiz(): 1 mark per correct answer.

const QUIZZES = [
  {
    course: oMaths, batch: batchO, title: "Quick Quiz: Percentages", due: -3,
    instructions: "Five quick questions. You get one attempt, so check each answer before you submit.",
    questions: [
      ["What is 25% of 80?", ["15", "20", "25", "32"], 1],
      ["Write 0.35 as a percentage.", ["3.5%", "35%", "0.35%", "350%"], 1],
      ["A price of 200 rises by 10%. What is the new price?", ["210", "220", "202", "240"], 1],
      ["Which fraction is equal to 40%?", ["2/5", "4/5", "1/4", "3/5"], 0],
      ["A shirt costing 500 is reduced by 20%. What is the sale price?", ["480", "400", "300", "450"], 1],
    ],
    answers: { ayesha: [1, 1, 1, 0, 0], hamza: [1, 0, 1, 0, 1], omar: [1, 1, 1, 0, 1], daniyal: [0, 1, 1, 2, 1] },
  },
  {
    course: aMaths, batch: batchA, title: "Quick Quiz: Differentiation Rules", due: 5,
    instructions: "Five questions on the rules covered in Exercise 3A. One attempt only.",
    questions: [
      ["What is the derivative of x³?", ["x²", "3x²", "3x", "x³/3"], 1],
      ["What is the derivative of 5x?", ["5", "x", "5x", "0"], 0],
      ["What is the derivative of a constant, e.g. 7?", ["7", "1", "0", "7x"], 2],
      ["If y = 4x² + 3x, what is dy/dx?", ["8x + 3", "4x + 3", "8x", "2x + 3"], 0],
      ["What is the gradient of y = x² at x = 3?", ["3", "9", "6", "2"], 2],
    ],
    answers: {},
  },
  {
    course: oMaths, batch: batchO, title: "Quick Quiz: Angles and Polygons", due: 4,
    instructions: "Six questions on exercise 7B. One attempt only.",
    questions: [
      ["What do the angles in a triangle add up to?", ["90°", "180°", "270°", "360°"], 1],
      ["What do the exterior angles of any polygon add up to?", ["180°", "270°", "360°", "540°"], 2],
      ["What is the sum of the interior angles of a pentagon?", ["360°", "480°", "540°", "720°"], 2],
      ["Each interior angle of a regular hexagon is:", ["108°", "120°", "135°", "144°"], 1],
      ["Two angles on a straight line are 65° and x. What is x?", ["25°", "105°", "115°", "295°"], 2],
      ["A regular polygon has exterior angles of 40°. How many sides does it have?", ["6", "8", "9", "10"], 2],
    ],
    answers: {},
  },
];

let quizCount = 0;
for (const q of QUIZZES) {
  const quiz = check(
    await sb
      .from("assessments")
      .insert({
        course_id: q.course,
        batch_id: q.batch,
        type: "quiz",
        title: q.title,
        instructions: q.instructions,
        due_at: daysFromNow(q.due),
        total_marks: q.questions.length,
      })
      .select("id")
      .single(),
    `create quiz ${q.title}`,
  );
  check(
    await sb.from("quiz_questions").insert(
      q.questions.map(([question, options, correct_index], i) => ({
        assessment_id: quiz.id,
        position: i + 1,
        question,
        options,
        correct_index,
      })),
    ),
    `quiz questions ${q.title}`,
  );
  for (const [key, picks] of Object.entries(q.answers)) {
    const score = picks.filter((p, i) => p === q.questions[i][2]).length;
    const at = daysFromNow(q.due - 1);
    check(
      await sb.from("submissions").insert({
        assessment_id: quiz.id,
        student_id: studentId[key],
        file_paths: [],
        submitted_at: at,
        is_late: false,
        counts_toward_report: true,
        marks: score,
        marked_at: at,
        quiz_answers: picks,
      }),
      `quiz answers ${q.title}`,
    );
    submissionCount++;
  }
  quizCount++;
}

// --- Live classes ----------------------------------------------------------
// Zoom's public test-meeting page stands in for a real class link.

const HOUR = 60 * 60 * 1000;
const nextAt = (days, hourUtc) => {
  const d = new Date(now + days * DAY);
  d.setUTCHours(hourUtc, 0, 0, 0);
  return d.toISOString();
};
const DEMO_JOIN_URL = "https://zoom.us/test";
check(
  await sb.from("live_classes").insert([
    {
      title: "O Level Maths: Trigonometry revision",
      starts_at: new Date(now + 2 * HOUR).toISOString(),
      join_url: DEMO_JOIN_URL,
      note: "Bring your trigonometry practice set and a calculator.",
      batch_id: batchO,
      created_by: markedBy,
    },
    {
      title: "O Level Maths: Test 2 preparation",
      starts_at: nextAt(2, 13),
      join_url: DEMO_JOIN_URL,
      batch_id: batchO,
      created_by: markedBy,
    },
    {
      title: "A Level Physics: Waves and superposition",
      starts_at: nextAt(1, 5),
      join_url: DEMO_JOIN_URL,
      note: "Read chapter 14 before class.",
      batch_id: batchA,
      created_by: markedBy,
    },
    {
      title: "A Level Maths: Integration",
      starts_at: nextAt(-3, 5),
      join_url: DEMO_JOIN_URL,
      batch_id: batchA,
      created_by: markedBy,
    },
  ]),
  "create live classes",
);

// --- Ask the teacher -------------------------------------------------------

const questionRows = check(
  await sb
    .from("questions")
    .insert([
      {
        student_id: studentId.ayesha,
        course_id: oMaths,
        body: "In Q7 of the trigonometry set, how do I know whether to use sin or cos?",
        status: "answered",
        answer:
          "Label the sides first: opposite, adjacent and hypotenuse, from the angle you are given. If the question uses the opposite side and the hypotenuse, use sin. If it uses the adjacent side and the hypotenuse, use cos.",
        answered_by: markedBy,
        answered_at: daysFromNow(-1),
        created_at: daysFromNow(-2),
      },
      {
        student_id: studentId.hamza,
        course_id: oMaths,
        body: "Will Test 2 include the polygon angle formula, or only triangles?",
        status: "waiting",
        created_at: daysFromNow(-0.2),
      },
      {
        student_id: studentId.fatima,
        course_id: aPhysics,
        body: "For the kinematics sheet, should we take g as 9.8 or 9.81?",
        status: "answered",
        answer: "Use 9.81 m/s² unless the question gives a different value.",
        answered_by: markedBy,
        answered_at: daysFromNow(-15),
        created_at: daysFromNow(-16),
      },
    ])
    .select("id, student_id, course_id, status"),
  "create questions",
);

// --- Announcements, resources, applications --------------------------------

check(
  await sb.from("announcements").insert([
    {
      title: DEMO_ACADEMY_ANNOUNCEMENT_TITLE,
      body: "Your courses, resources, assignments and progress report are all in one place now. Check here regularly for updates from the academy.",
      created_at: daysFromNow(-20),
    },
    {
      title: "Test 2 on Geometry",
      body: "Test 2 covers angles, polygons and trigonometry. Please revise exercise 7B and the trigonometry practice set, and bring a calculator.",
      batch_id: batchO,
      created_at: daysFromNow(-1),
    },
    {
      title: "Sunday class moved to 11 am",
      body: "This weekend's Sunday class starts at 11 am instead of 10 am. The class link stays the same.",
      batch_id: batchA,
      created_at: daysFromNow(-3),
    },
    {
      title: "Mock exams next month",
      body: "Mock exams for Physics and Maths start next month. A revision plan and past papers will be shared in class. Keep up with the weekly assignments, they are the best preparation.",
      batch_id: batchA,
      created_at: daysFromNow(-0.3),
    },
  ]),
  "create announcements",
);

// --- Student notifications -------------------------------------------------
// The app creates these as the admin sets and marks work, posts announcements
// and live classes, and answers questions. The seed adds the same kinds so
// every demo student's bell has a realistic mix (older ones already read).

const demoAssessments = check(
  await sb.from("assessments").select("id, title, type, course_id, batch_id, due_at").in("batch_id", [batchO, batchA]),
  "load demo assessments",
);
const demoAnnouncements = check(
  await sb.from("announcements").select("id, title, batch_id, created_at").in("batch_id", [batchO, batchA]),
  "load demo announcements",
);
const demoClasses = check(
  await sb.from("live_classes").select("id, title, starts_at, batch_id").in("batch_id", [batchO, batchA]),
  "load demo live classes",
);
const demoMarks = check(
  await sb
    .from("submissions")
    .select("student_id, assessment_id, marked_at")
    .in("assessment_id", demoAssessments.map((a) => a.id))
    .not("marks", "is", null),
  "load demo marks",
);
// Same wording as the app's live class notification.
const saudiTime = (iso) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Riyadh", weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
    }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]),
  );
  return `${parts.weekday} ${parts.day} ${parts.month}, ${parts.hour}:${parts.minute} ${parts.dayPeriod.toUpperCase()} (Saudi time)`;
};
const KIND_PREFIX = { assignment: "New assignment: ", test: "New test: ", quiz: "New quiz: " };

const notifications = [];
for (const st of STUDENTS) {
  const uid = studentId[st.key];
  const mine = demoAssessments.filter((a) => a.batch_id === st.batch && st.courses.includes(a.course_id));
  for (const a of mine.filter((x) => new Date(x.due_at).getTime() > now)) {
    notifications.push({
      user_id: uid, kind: a.type, title: KIND_PREFIX[a.type] + a.title, body: courseTitle(a.course_id),
      assessment_id: a.id, created_at: daysFromNow(-1.5),
    });
  }
  // Quizzes mark themselves, so they get no "Marked" notification.
  for (const m of demoMarks.filter((x) => x.student_id === uid)) {
    const a = mine.find((x) => x.id === m.assessment_id);
    if (!a || a.type === "quiz") continue;
    notifications.push({
      user_id: uid, kind: "marks", title: "Marked: " + a.title, body: courseTitle(a.course_id),
      assessment_id: a.id, created_at: m.marked_at, read_at: m.marked_at,
    });
  }
  for (const an of demoAnnouncements.filter((x) => x.batch_id === st.batch)) {
    const old = new Date(an.created_at).getTime() < now - 2 * DAY;
    notifications.push({
      user_id: uid, kind: "announcement", title: "New announcement: " + an.title, announcement_id: an.id,
      created_at: an.created_at, read_at: old ? an.created_at : null,
    });
  }
  for (const lc of demoClasses.filter((x) => x.batch_id === st.batch && new Date(x.starts_at).getTime() > now)) {
    notifications.push({
      user_id: uid, kind: "live_class", title: "New live class: " + lc.title, body: saudiTime(lc.starts_at),
      live_class_id: lc.id, created_at: daysFromNow(-0.4),
    });
  }
}
for (const q of questionRows.filter((x) => x.status === "answered")) {
  notifications.push({
    user_id: q.student_id, kind: "answer", title: "Your question was answered", body: courseTitle(q.course_id),
    question_id: q.id, created_at: daysFromNow(-1),
  });
}
check(await sb.from("notifications").insert(notifications), "create notifications");

for (const [i, r] of DEMO_RESOURCES.entries()) {
  check(
    await sb.from("resources").insert({ course_id: courseId(r.slug), title: r.title, kind: "link", url: r.url, sort_order: 100 + i }),
    "create resource",
  );
}

check(
  await sb.from("applications").insert([
    {
      full_name: "Sara Malik", email: "sara.applicant@demo.test", phone: "+92 333 0000001", country: "Pakistan",
      school: "Froebel's International", level: "O", course_ids: [oMaths],
      guardian_name: "Asif Malik", guardian_phone: "+92 333 0000002", heard_about: "Instagram",
    },
    {
      full_name: "Usman Tariq", email: "usman.applicant@demo.test", phone: "+971 50 000 0003", country: "United Arab Emirates",
      level: "A", course_ids: [aPhysics, aMaths], heard_about: "A friend",
    },
  ]),
  "create applications",
);

console.log(
  `Seeded ${STUDENTS.length} students, 2 batches, ${ASSESSMENTS.length} assessments, ` +
    `${quizCount} quizzes, ${submissionCount} submissions/marks, 4 live classes, ${questionRows.length} questions, ${notifications.length} notifications, 4 announcements, ${DEMO_RESOURCES.length} resources, 2 applications.`,
);

// A minimal one-page PDF so uploaded submission files open in the viewer.
function demoPdf(text) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    null,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const stream = `BT /F1 24 Tf 72 760 Td (${text}) Tj ET`;
  objects[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  let out = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}
