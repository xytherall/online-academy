// Shared definitions for the demo seed (seed-demo.mjs) and its cleanup
// (cleanup-demo.mjs). Everything the seed creates is identifiable from here:
// users by DEMO_EMAIL_DOMAIN, batches by name, and the rest by those batches
// or by the exact titles below, so cleanup never touches real data.

import { createClient } from "@supabase/supabase-js";

export const DEMO_EMAIL_DOMAIN = "@demo.test";
export const DEMO_PASSWORD = "Demo2026!";

export const DEMO_BATCH_NAMES = {
  oMaths: "O Level Maths – Evening Batch",
  aLevel: "A Level – Weekend Batch",
};

export const DEMO_ACADEMY_ANNOUNCEMENT_TITLE = "Welcome to the student portal";

// Link resources added to the existing courses, matched on cleanup by
// course slug + title + url.
export const DEMO_RESOURCES = [
  { slug: "o-levels-maths", title: "Khan Academy: Geometry practice", url: "https://www.khanacademy.org/math/geometry" },
  { slug: "o-levels-maths", title: "Desmos graphing calculator", url: "https://www.desmos.com/calculator" },
  { slug: "a-levels-physics", title: "Khan Academy: Physics library", url: "https://www.khanacademy.org/science/physics" },
  { slug: "a-levels-maths", title: "Khan Academy: Calculus 1", url: "https://www.khanacademy.org/math/calculus-1" },
];

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set (run with --env-file=.env.local).");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function check(result, what) {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data;
}

export async function listDemoUsers(sb) {
  const users = [];
  for (let page = 1; ; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`list users: ${error.message}`);
    users.push(...data.users.filter((u) => u.email?.endsWith(DEMO_EMAIL_DOMAIN)));
    if (data.users.length < 200) break;
  }
  return users;
}
