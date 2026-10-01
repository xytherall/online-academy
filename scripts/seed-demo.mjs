// Fills the database with clearly-labelled demo data for presenting the app:
// demo students (emails ending @demo.test), two batches, assessments with a
// mix of marked / submitted / late / missing work, announcements, a few link
// resources and two pending applications. Existing courses are reused and
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

const courses = check(await sb.from("courses").select("id, slug"), "load courses");
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
        phone: `+92 300 000000${i}`,
        whatsapp: `+92 300 000000${i}`,
        country: "Pakistan",
        school: s.school,
        guardian_name: s.guardian,
        guardian_phone: `+92 321 000000${i}`,
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
    work: { ayesha: ["on", 18, "Excellent work."], hamza: ["on", 14, "Good, check your signs in Q9."], zainab: ["late", 12, "Mostly correct but submitted late."] },
  },
  {
    course: oMaths, batch: batchO, type: "test", title: "Test 1: Algebra and Number", due: -14, total: 50,
    instructions: "Timed test in class (45 minutes).",
    work: { ayesha: ["test", 44], hamza: ["test", 31], zainab: ["test", 38] },
  },
  {
    course: oMaths, batch: batchO, type: "assignment", title: "Geometry: Angles and Polygons", due: -7, total: 20,
    instructions: "Complete exercise 7B. Label every diagram.",
    work: { ayesha: ["on", 16, "Well done, one slip in Q4."], hamza: ["on"] },
  },
  {
    course: oMaths, batch: batchO, type: "assignment", title: "Trigonometry Practice Set", due: -2, total: 25,
    instructions: "Questions 1–10 on SOH CAH TOA. Give answers to 3 significant figures.",
    work: { ayesha: ["on"], zainab: ["late"] },
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
    work: { bilal: ["on", 24, "Good. Revise projectile motion."], fatima: ["on", 27, "Very thorough."] },
  },
  {
    course: aPhysics, batch: batchA, type: "test", title: "Test 1: Mechanics", due: -10, total: 60,
    instructions: "Paper-style test on forces and motion (1 hour).",
    work: { bilal: ["test", 41], fatima: ["test", 52] },
  },
  {
    course: aPhysics, batch: batchA, type: "assignment", title: "Electric Circuits Worksheet", due: -4, total: 30,
    instructions: "Series and parallel circuits, questions 1–12.",
    work: { fatima: ["on"] },
  },
  {
    course: aPhysics, batch: batchA, type: "assignment", title: "Waves and Superposition", due: 7, total: 30,
    instructions: "Read chapter 14 and answer the end-of-chapter questions.",
    work: {},
  },
  {
    course: aMaths, batch: batchA, type: "assignment", title: "Differentiation Basics", due: -12, total: 25,
    instructions: "Exercise 3A, all parts.",
    work: { bilal: ["late", 19, "Correct, but late."], fatima: ["on", 22, "Neat and accurate."] },
  },
  {
    course: aMaths, batch: batchA, type: "test", title: "Pure Maths Quiz 1", due: -5, total: 40,
    instructions: "30-minute quiz on functions and differentiation.",
    work: { bilal: ["test", 30], fatima: ["test", 35] },
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
  ]),
  "create announcements",
);

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
    `${submissionCount} submissions/marks, 3 announcements, ${DEMO_RESOURCES.length} resources, 2 applications.`,
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
