# CLAUDE.md

Instructions for Claude Code working on this repository. Read this file, then `docs/SPEC.md`, at the start of every session.

## Project

A website and portal for an online O Level / A Level academy:

- **Public site**: presents the academy and takes applications.
- **Student portal**: courses, resources, assignments, marks, progress report, announcements.
- **Admin area**: applications, students, batches, courses, marking, reports, announcements, settings.

**`docs/SPEC.md` is the source of truth.** It holds the agreed requirements, data model, permissions and roadmap.

- Do not add, remove or change features, roles, tables or routes that contradict the spec. If a request conflicts with it, say so and ask first.
- Anything listed in SPEC §13 ("Not in v1") must not be built unless the owner explicitly asks.
- The project is a simple, practical academy system, not a commercial LMS.

## Stack

- Next.js (App Router) + TypeScript (strict)
- Tailwind CSS + shadcn/ui
- Zod for validation
- Supabase: Postgres, Auth, Storage, Row Level Security; using `@supabase/ssr`
- Hosting: Netlify

Do not add other dependencies without explaining why and getting approval.

## How to work

1. **Understand** the task and check it against `docs/SPEC.md`.
2. **Inspect** the relevant existing code before changing anything. Never assume a file exists; check.
3. **Plan** which files are affected and describe the plan briefly before large changes.
4. **Implement** in small, logical steps. Never build a whole stage in one giant change.
5. **Verify**: run lint, type-check and build, and test the actual behaviour.
6. **Report** honestly what works, what doesn't, and anything left unfinished.
7. **Update** the checklist in `docs/SPEC.md` §14. Add new decisions to §15 and issues to §16 (only after owner approval for decisions).

Rules:

- Work only on the current roadmap stage unless told otherwise.
- Never declare something complete unless it actually works end to end.
- When something fails, find the root cause. Do not hide errors with `any`, `@ts-ignore`, disabled lint rules, empty catch blocks or silenced warnings.
- Never overwrite or delete existing work without being sure it's intended.
- If something is unclear or would affect architecture, ask instead of guessing.
- When there are several reasonable approaches, briefly give the tradeoffs and let the owner choose.

## Security (non-negotiable)

- **Authorization is enforced server-side and by RLS.** Hiding UI is never security.
- Every table has RLS enabled with explicit policies matching SPEC §3.
- Every Server Action and route handler:
  - verifies the session;
  - checks the role and active status;
  - validates input with Zod.
- Values that must not be trusted from the client are computed on the server: `is_late`, `role`, `student_id` on submissions, marks, and `counts_toward_report` for students.
- The Supabase **secret key** is used only in server-only modules (`import "server-only"`), only after confirming the caller is an admin, and is never sent to the browser.
- Secrets live only in `.env.local`, which is never committed. Keep `.env.example` updated with variable names only.
- Private files are served only through short-lived signed URLs.
- Never put personal data in URLs or query strings.
- Schema changes go through SQL migration files in the repo, never ad-hoc changes only in the dashboard.

## Code conventions

- Keep things organized by area: public, student, admin, plus shared `components/`, `lib/`.
- Server Components for reading data; Server Actions for mutations.
- Reuse existing components and utilities before creating new ones. No duplicated logic.
- Clear, descriptive names. Small focused components and functions.
- Generate and use Supabase TypeScript types for database access.
- Every data view handles **loading, empty, error and success** states.
- Forms: client and server validation, clear error messages, disabled submit while pending.
- Dates are stored in UTC and displayed in the viewer's local time.

## UI rules

- Clean, minimal, professional, responsive (mobile first; most students use phones).
- Neutral design; brand colour and academy name come from theme tokens and `site_settings`, never hardcoded.
- **No fake data anywhere.** No invented academy name, courses, teachers, statistics, testimonials or lorem ipsum presented as real. Empty content means a hidden section or a proper empty state.
- No excessive animation, clutter or decorative charts.

## Commands

```bash
npm run dev         # start dev server
npm run lint        # lint
npm run typecheck   # TypeScript check
npm run build       # production build

npm run db:push     # apply supabase/migrations to the linked project
npm run db:types    # regenerate src/lib/supabase/database.types.ts
```

`db:push` and `db:types` need the Supabase CLI to be logged in and linked
(`npx supabase login`, `npx supabase link --project-ref <ref>`). Both need a real
terminal, not a non-interactive shell. Run `db:types` after every migration.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
