// Netlify scheduled function: once a day, asks the app to send the
// due-work reminder phone notifications (src/app/api/cron/due-reminders).
//
// To change the time, edit the schedule below. It is a cron expression in
// UTC: "0 14 * * *" is 14:00 UTC = 5 pm in Saudi Arabia (UTC+3).
//
// Needs CRON_SECRET set in the Netlify environment variables (same value as
// the app's). Netlify provides URL (the site's main address) automatically.

export const config = { schedule: "0 14 * * *" };

export default async function dueReminders() {
  const response = await fetch(`${process.env.URL}/api/cron/due-reminders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Due-work reminders failed (${response.status}): ${text}`);
  console.log(`Due-work reminders: ${text}`);
}
