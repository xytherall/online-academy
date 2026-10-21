# Launch checklist

Everything to do or check before and right after LIS goes live on Netlify.
Written 2026-10-21. Tick items off as they're done.

Who does it: **K** = khizar, **A** = needs an answer from the academy, **C** = Claude can do it once asked.

## 1. Already done in code (this branch)

- [x] Error pages for the student portal, admin area and a site-wide fallback (`global-error.tsx`), so a database hiccup shows "Something went wrong / Try again" instead of a blank Next.js error. The public site already had one. "Try again" now re-fetches the page.
- [x] If `NEXT_PUBLIC_SITE_URL` is forgotten on Netlify, link previews and canonical links use Netlify's own address instead of `localhost`.
- [x] Lint, type-check, 170 unit tests and the production build all pass.

## 2. Content in Admin → Settings (K, in the live site's admin area)

These are database values, not code. Nothing in the code says "THEOREMLY"; it all comes from Settings.

- [ ] Academy name: change "THEOREMLY" to **LIS** (or "Linear International School"; decide which shows in the header). This also renames the phone app, browser tab, link preview and footer.
- [ ] Tagline, home page intro and About page text: check they read right for LIS.
- [ ] Contact email, phone, WhatsApp number, address: replace placeholders with the real ones (A).
- [ ] Social links: real ones, or empty (empty hides them).
- [ ] FAQ (Admin → FAQs): confirm every claim with the academy, especially the free trial and which countries you teach (A). Delete any answer you can't confirm.
- [ ] Courses: each published course's title, description and level are real. Unpublish anything that isn't offered.
- [ ] Privacy page (`/privacy`): read it once and confirm it matches how the academy actually uses student data (A).

## 3. Logo (being decided in "LIS logo ideas and plan")

Where it has to go once chosen:

- [ ] **Header and footer logo**: uploaded in Admin → Settings → Logo (PNG/JPEG/WEBP, not SVG). Shown by `src/components/academy-brand.tsx`.
- [ ] **Favicon / browser tab icon**: `src/app/icon.tsx`.
- [ ] **iPhone home-screen icon**: `src/app/apple-icon.tsx`.
- [ ] **PWA / Android app icons** (192, 512, maskable 512): `src/app/app-icon/[variant]` via `src/lib/app-icon.tsx`, listed in `src/app/manifest.ts`.
- [ ] **Link preview image** (WhatsApp/Facebook card): `src/app/opengraph-image.tsx`.
- [ ] Theme colour of the installed app's status bar (`APP_NAVY` in `src/lib/app-icon.tsx`) if the logo brings new colours.

## 4. Netlify setup (K)

- [ ] Create the site from the GitHub repo, branch **main**. Netlify detects Next.js by itself; no `netlify.toml` is needed. Build command `npm run build`.
- [ ] Environment variables (Site configuration → Environment variables). Copy from `.env.local` **except** where noted:

  | Variable | Value |
  |---|---|
  | `NEXT_PUBLIC_SUPABASE_URL` | from `.env.local` |
  | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | from `.env.local` |
  | `SUPABASE_SECRET_KEY` | from `.env.local` (secret) |
  | `NEXT_PUBLIC_SITE_URL` | **the live address**, e.g. `https://lis.netlify.app` or the custom domain. Not the `localhost` value in `.env.local` |
  | `APPLY_FORM_SECRET` | from `.env.local` (secret) |
  | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | from `.env.local`. Keep the same pair forever |
  | `VAPID_PRIVATE_KEY` | from `.env.local` (secret) |
  | `VAPID_SUBJECT` | **`mailto:` + the real academy email**. `.env.local` still has `admin@example.com` |
  | `CRON_SECRET` | from `.env.local` (secret) |

- [ ] After changing any `NEXT_PUBLIC_` variable, trigger a new deploy (they are baked in at build time).
- [ ] Custom domain (optional): add it in Netlify → Domain management, then update `NEXT_PUBLIC_SITE_URL` and redeploy. HTTPS is automatic.
- [ ] Functions tab shows **due-reminders** (daily 14:00 UTC = 5 pm Saudi) and **keep-alive** (Mon/Wed/Fri 06:00 UTC). Use "Run now" on keep-alive once and check its log says OK; a 401 means `CRON_SECRET` is missing or different.

## 5. Supabase (K, dashboard of "xytherall's Project")

- [ ] Authentication → URL Configuration: set **Site URL** to the live address and add it to Redirect URLs. The app sends no emails in v1, so this is housekeeping, but it stops Supabase links pointing at localhost.
- [ ] Authentication → Providers → Email: public sign-ups **off** (students are created by the admin only). Check it.
- [ ] Database → Advisors (Security and Performance): run and look for red items. (C can review the results.)
- [ ] Backups: the free plan has none. Decide a routine, e.g. a weekly `npx supabase db dump` saved somewhere safe, before real student data goes in.
- [ ] Free tier pauses after about a week without activity. The keep-alive function prevents this once Netlify is live; until then, open the site at least weekly.

## 6. Vimeo (K)

- [ ] For each lecture video: Privacy → "Where can this be embedded?" → Specific domains → add the live domain (and the custom domain if used). Without this the player shows "this video can't be played here" on the live site. Remove `localhost` if it was added for testing.

## 7. Demo data (K decides when)

- [ ] When you're done demoing, run `node --env-file=.env.local scripts/cleanup-demo.mjs` (removes the `@demo.test` users and their data). Not before you say so.
- [ ] Afterwards check Admin → Students, Applications, Questions and Notifications show no demo rows.

## 8. Real accounts (K)

- [ ] Your own admin account uses a strong password and the real email.
- [ ] Add the ~10 existing students (Admin → Students → Add), put them in batches and enrol them. Send each their login message from the app.

## 9. Checks after the first deploy (K on a phone, C on a computer)

- [ ] Home, About, Courses, Contact, Apply, Privacy load with LIS branding, no placeholders.
- [ ] Submit one real application from a phone and see it arrive in Admin → Applications (and the admin bell/phone alert), then delete or reject it.
- [ ] Log in as a student on a phone: dashboard, a course, a resource PDF, a lecture video plays, submit something, see it marked.
- [ ] Link preview: paste the address into WhatsApp and check name, description and image.
- [ ] **Install as app** on Android (Chrome → Install) and iPhone (Safari → Share → Add to Home Screen): correct name and icon, opens into the portal.
- [ ] **Phone notifications** (only work on HTTPS, so never tested yet): turn them on as a student and as admin, then post an announcement and submit late work; both phones should buzz. iPhone needs the app installed to the home screen first.
- [ ] Next day after 14:00 UTC: Netlify → Functions → due-reminders log shows it ran.
- [ ] Try `/admin` while logged in as a student: it must refuse.

## 10. Still open from the spec (§14)

- [ ] Mobile/responsive pass on every page (Stage 11)
- [ ] RLS/permissions review as a student (Stage 11)
- [ ] Admin pages checked in the browser for Stages 21, 22 and 23 (needs an admin sign-in)
