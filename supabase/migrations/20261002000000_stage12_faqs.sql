-- Stage 12 — FAQ (SPEC pre-launch batch 1)
--
-- Admin-editable FAQ list shown on the home page. Owner enters every
-- question/answer themselves — nothing is seeded (SPEC "no fake content").

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint faqs_question_not_blank check (btrim(question) <> ''),
  constraint faqs_question_length check (char_length(question) <= 200),
  constraint faqs_answer_not_blank check (btrim(answer) <> ''),
  constraint faqs_answer_length check (char_length(answer) <= 2000)
);

create index faqs_sort_order_idx on public.faqs (sort_order);

create trigger faqs_set_updated_at
before update on public.faqs
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.faqs enable row level security;

revoke all on public.faqs from anon, authenticated;
grant select on public.faqs to anon, authenticated;
grant insert, update, delete on public.faqs to authenticated;

-- Anyone, including logged-out visitors, can read published FAQs.
create policy "Anyone can read published faqs"
on public.faqs
for select
to anon, authenticated
using (is_published);

-- Admins can read every row, including unpublished ones.
create policy "Admins can read every faq"
on public.faqs
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert faqs"
on public.faqs
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update faqs"
on public.faqs
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete faqs"
on public.faqs
for delete
to authenticated
using (public.is_admin());
