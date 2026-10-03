-- Stage 13 — Unread announcements indicator (SPEC §7, §10, §14)
--
-- Owner decision (2026-10-03): announcements have no publish/schedule state,
-- so "unread" is simply created_at > the student's last_seen_at (or their
-- profile's created_at if they have never opened the page). Visibility
-- itself is still entirely governed by the existing RLS policy on
-- announcements — this table only tracks a per-student watermark.

create table public.announcement_seen (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  last_seen_at timestamptz not null
);

alter table public.announcement_seen enable row level security;

revoke all on public.announcement_seen from anon, authenticated;
grant select, insert, update on public.announcement_seen to authenticated;

create policy "Users can read their own seen row"
on public.announcement_seen
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Users can insert their own seen row"
on public.announcement_seen
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Users can update their own seen row"
on public.announcement_seen
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
