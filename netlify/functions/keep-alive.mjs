// Netlify scheduled function: a few times a week, asks the app to make one
// tiny database query (src/app/api/cron/keep-alive) so the free Supabase
// project never pauses from inactivity (it pauses after about a week).
//
// The schedule is a cron expression in UTC: 06:00 on Monday, Wednesday and
// Friday, so there is never more than three days without activity.
//
// Needs CRON_SECRET set in the Netlify environment variables (same value as
// the app's). Netlify provides URL (the site's main address) automatically.

export const config = { schedule: "0 6 * * 1,3,5" };

export default async function keepAlive() {
  const response = await fetch(`${process.env.URL}/api/cron/keep-alive`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Keep-alive failed (${response.status}): ${text}`);
  console.log(`Keep-alive: ${text}`);
}
