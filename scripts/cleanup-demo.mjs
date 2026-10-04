// Removes everything created by seed-demo.mjs and nothing else.
// Run: node --env-file=.env.local scripts/cleanup-demo.mjs

import {
  DEMO_ACADEMY_ANNOUNCEMENT_TITLE,
  DEMO_BATCH_NAMES,
  DEMO_EMAIL_DOMAIN,
  DEMO_RESOURCES,
  adminClient,
  check,
  listDemoUsers,
} from "./demo-data.mjs";

const sb = adminClient();

const batches = check(
  await sb.from("batches").select("id").in("name", Object.values(DEMO_BATCH_NAMES)),
  "find demo batches",
);
const batchIds = batches.map((b) => b.id);

const assessments = batchIds.length
  ? check(await sb.from("assessments").select("id").in("batch_id", batchIds), "find demo assessments")
  : [];
const assessmentIds = assessments.map((a) => a.id);

// Uploaded submission files live under {assessment_id}/{student_id}/.
for (const aid of assessmentIds) {
  const studentDirs = check(await sb.storage.from("submissions").list(aid), "list submission files");
  for (const dir of studentDirs) {
    const files = check(await sb.storage.from("submissions").list(`${aid}/${dir.name}`), "list submission files");
    if (files.length) {
      check(
        await sb.storage.from("submissions").remove(files.map((f) => `${aid}/${dir.name}/${f.name}`)),
        "remove submission files",
      );
    }
  }
}

if (assessmentIds.length) {
  check(await sb.from("submissions").delete().in("assessment_id", assessmentIds), "delete submissions");
  check(await sb.from("assessments").delete().in("id", assessmentIds), "delete assessments");
}

check(
  await sb.from("announcements").delete().eq("title", DEMO_ACADEMY_ANNOUNCEMENT_TITLE).is("created_by", null),
  "delete academy announcement",
);
if (batchIds.length) {
  check(await sb.from("announcements").delete().in("batch_id", batchIds), "delete batch announcements");
  check(await sb.from("live_classes").delete().in("batch_id", batchIds), "delete batch live classes");
}

const courses = check(await sb.from("courses").select("id, slug"), "load courses");
for (const r of DEMO_RESOURCES) {
  const course = courses.find((c) => c.slug === r.slug);
  if (!course) continue;
  check(
    await sb.from("resources").delete().eq("course_id", course.id).eq("title", r.title).eq("url", r.url),
    "delete demo resource",
  );
}

check(await sb.from("applications").delete().like("email", `%${DEMO_EMAIL_DOMAIN}`), "delete demo applications");

// Deleting the auth user cascades to the profile, its enrollments, submissions
// and questions. Question files live under {student_id}/ and {student_id}/answers/.
const users = await listDemoUsers(sb);
for (const u of users) {
  for (const folder of [u.id, `${u.id}/answers`]) {
    const files = check(await sb.storage.from("questions").list(folder), "list question files");
    const paths = files.filter((f) => f.id).map((f) => `${folder}/${f.name}`);
    if (paths.length) check(await sb.storage.from("questions").remove(paths), "remove question files");
  }
}
for (const u of users) {
  const { error } = await sb.auth.admin.deleteUser(u.id);
  if (error) throw new Error(`delete user ${u.email}: ${error.message}`);
}

if (batchIds.length) {
  check(await sb.from("batches").delete().in("id", batchIds), "delete demo batches");
}

console.log(
  `Removed ${users.length} demo users, ${batchIds.length} batches, ${assessmentIds.length} assessments, ` +
    `demo announcements, resources and applications.`,
);
