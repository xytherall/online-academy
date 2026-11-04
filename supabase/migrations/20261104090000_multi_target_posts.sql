-- Announcements and live classes: several courses and several batches
--
-- Owner request (2026-11-04): an announcement or a live class can target any
-- number of courses and any number of batches. The single course_id /
-- batch_id columns are replaced by four join tables.
--
-- Rule (both tables): no course rows = all courses, no batch rows = all
-- batches. A student sees (and is notified of) a post when
--   (no course rows or they are enrolled in ANY listed course)
--   and (no batch rows or their profiles.batch_id is one of the listed batches).
-- Note this is AND for announcements too; before, an announcement had at most
-- one target, so nothing existing changes meaning.
--
-- The rule lives in one place per post type (announcement_is_for /
-- live_class_is_for), used by the student SELECT policies, the join-table
-- policies and the notify functions.
--
-- Deleting a course or batch: the join rows cascade, but a post that was ONLY
-- for deleted courses (or only for deleted batches) is deleted with them
-- rather than silently widening to "all" (same reason as Stage 8's cascade).
--
-- Saving goes through save_announcement() / save_live_class() so the post and
-- its targets are written in one transaction; the app calls the notify
-- function afterwards (create only, editing never re-notifies).

-- ---------------------------------------------------------------------------
-- Join tables
-- ---------------------------------------------------------------------------

create table public.announcement_courses (
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  primary key (announcement_id, course_id)
);

create table public.announcement_batches (
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  batch_id uuid not null references public.batches (id) on delete cascade,
  primary key (announcement_id, batch_id)
);

create table public.live_class_courses (
  live_class_id uuid not null references public.live_classes (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  primary key (live_class_id, course_id)
);

create table public.live_class_batches (
  live_class_id uuid not null references public.live_classes (id) on delete cascade,
  batch_id uuid not null references public.batches (id) on delete cascade,
  primary key (live_class_id, batch_id)
);

create index announcement_courses_course_id_idx on public.announcement_courses (course_id);
create index announcement_batches_batch_id_idx on public.announcement_batches (batch_id);
create index live_class_courses_course_id_idx on public.live_class_courses (course_id);
create index live_class_batches_batch_id_idx on public.live_class_batches (batch_id);

-- ---------------------------------------------------------------------------
-- Copy existing targets, then drop the old columns (their indexes, the
-- single-target check and the FKs go with them). The student policies read
-- the columns, so they are dropped first and recreated below.
-- ---------------------------------------------------------------------------

insert into public.announcement_courses (announcement_id, course_id)
select id, course_id from public.announcements where course_id is not null;

insert into public.announcement_batches (announcement_id, batch_id)
select id, batch_id from public.announcements where batch_id is not null;

insert into public.live_class_courses (live_class_id, course_id)
select id, course_id from public.live_classes where course_id is not null;

insert into public.live_class_batches (live_class_id, batch_id)
select id, batch_id from public.live_classes where batch_id is not null;

drop policy "Students can read their announcements" on public.announcements;
drop policy "Students can read their live classes" on public.live_classes;

alter table public.announcements drop column course_id, drop column batch_id;
alter table public.live_classes drop column course_id, drop column batch_id;

-- ---------------------------------------------------------------------------
-- Visibility rule
--
-- SECURITY DEFINER so the policies on the parent and join tables can use it
-- without recursing into each other's RLS. A caller can only ask about
-- themselves unless they are an admin (the notify functions run as the admin
-- and ask about each student).
-- ---------------------------------------------------------------------------

create function public.announcement_is_for(p_announcement_id uuid, p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (p_student_id = (select auth.uid()) or public.is_admin())
    and (
      not exists (select 1 from public.announcement_courses ac where ac.announcement_id = p_announcement_id)
      or exists (
        select 1
        from public.announcement_courses ac
        join public.enrollments e on e.course_id = ac.course_id
        where ac.announcement_id = p_announcement_id and e.student_id = p_student_id
      )
    )
    and (
      not exists (select 1 from public.announcement_batches ab where ab.announcement_id = p_announcement_id)
      or exists (
        select 1
        from public.announcement_batches ab
        join public.profiles p on p.batch_id = ab.batch_id
        where ab.announcement_id = p_announcement_id and p.id = p_student_id
      )
    );
$$;

create function public.live_class_is_for(p_live_class_id uuid, p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (p_student_id = (select auth.uid()) or public.is_admin())
    and (
      not exists (select 1 from public.live_class_courses lcc where lcc.live_class_id = p_live_class_id)
      or exists (
        select 1
        from public.live_class_courses lcc
        join public.enrollments e on e.course_id = lcc.course_id
        where lcc.live_class_id = p_live_class_id and e.student_id = p_student_id
      )
    )
    and (
      not exists (select 1 from public.live_class_batches lcb where lcb.live_class_id = p_live_class_id)
      or exists (
        select 1
        from public.live_class_batches lcb
        join public.profiles p on p.batch_id = lcb.batch_id
        where lcb.live_class_id = p_live_class_id and p.id = p_student_id
      )
    );
$$;

revoke execute on function public.announcement_is_for(uuid, uuid) from public, anon;
revoke execute on function public.live_class_is_for(uuid, uuid) from public, anon;
grant execute on function public.announcement_is_for(uuid, uuid) to authenticated;
grant execute on function public.live_class_is_for(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Student policies on the parents (same as before apart from the rule)
-- ---------------------------------------------------------------------------

create policy "Students can read their announcements"
on public.announcements
for select
to authenticated
using (public.announcement_is_for(id, (select auth.uid())));

-- Active users only, since the join link lets anyone holding it into the class.
create policy "Students can read their live classes"
on public.live_classes
for select
to authenticated
using (public.is_active_user() and public.live_class_is_for(id, (select auth.uid())));

-- ---------------------------------------------------------------------------
-- RLS on the join tables: admins read/insert/delete (rows are replaced, never
-- updated); a student reads the targets of posts they can see. No student
-- writes.
-- ---------------------------------------------------------------------------

alter table public.announcement_courses enable row level security;
alter table public.announcement_batches enable row level security;
alter table public.live_class_courses enable row level security;
alter table public.live_class_batches enable row level security;

revoke all on public.announcement_courses from anon, authenticated;
revoke all on public.announcement_batches from anon, authenticated;
revoke all on public.live_class_courses from anon, authenticated;
revoke all on public.live_class_batches from anon, authenticated;
grant select, insert, delete on public.announcement_courses to authenticated;
grant select, insert, delete on public.announcement_batches to authenticated;
grant select, insert, delete on public.live_class_courses to authenticated;
grant select, insert, delete on public.live_class_batches to authenticated;

create policy "Admins can read announcement courses"
on public.announcement_courses for select to authenticated using (public.is_admin());
create policy "Admins can insert announcement courses"
on public.announcement_courses for insert to authenticated with check (public.is_admin());
create policy "Admins can delete announcement courses"
on public.announcement_courses for delete to authenticated using (public.is_admin());
create policy "Students can read their announcement courses"
on public.announcement_courses for select to authenticated
using (public.announcement_is_for(announcement_id, (select auth.uid())));

create policy "Admins can read announcement batches"
on public.announcement_batches for select to authenticated using (public.is_admin());
create policy "Admins can insert announcement batches"
on public.announcement_batches for insert to authenticated with check (public.is_admin());
create policy "Admins can delete announcement batches"
on public.announcement_batches for delete to authenticated using (public.is_admin());
create policy "Students can read their announcement batches"
on public.announcement_batches for select to authenticated
using (public.announcement_is_for(announcement_id, (select auth.uid())));

create policy "Admins can read live class courses"
on public.live_class_courses for select to authenticated using (public.is_admin());
create policy "Admins can insert live class courses"
on public.live_class_courses for insert to authenticated with check (public.is_admin());
create policy "Admins can delete live class courses"
on public.live_class_courses for delete to authenticated using (public.is_admin());
create policy "Students can read their live class courses"
on public.live_class_courses for select to authenticated
using (public.is_active_user() and public.live_class_is_for(live_class_id, (select auth.uid())));

create policy "Admins can read live class batches"
on public.live_class_batches for select to authenticated using (public.is_admin());
create policy "Admins can insert live class batches"
on public.live_class_batches for insert to authenticated with check (public.is_admin());
create policy "Admins can delete live class batches"
on public.live_class_batches for delete to authenticated using (public.is_admin());
create policy "Students can read their live class batches"
on public.live_class_batches for select to authenticated
using (public.is_active_user() and public.live_class_is_for(live_class_id, (select auth.uid())));

-- ---------------------------------------------------------------------------
-- Notify functions: same rule. Signatures unchanged, so `create or replace`
-- keeps the grants. One row per student, so each is notified once per post.
-- ---------------------------------------------------------------------------

create or replace function public.notify_new_announcement(p_announcement_id uuid)
returns setof uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can send notifications.';
  end if;

  return query
  with created as (
  insert into public.notifications (user_id, kind, title, body, announcement_id)
  select p.id, 'announcement', 'New announcement: ' || an.title, null, an.id
  from public.announcements an
  join public.profiles p on p.role = 'student' and p.is_active
  left join public.notification_preferences np on np.user_id = p.id
  where an.id = p_announcement_id
    and coalesce(np.enabled, true)
    and public.announcement_is_for(an.id, p.id)
  returning id
  )
  select id from created;
end;
$$;

create or replace function public.notify_new_live_class(p_live_class_id uuid)
returns setof uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can send notifications.';
  end if;

  return query
  with created as (
  insert into public.notifications (user_id, kind, title, body, live_class_id)
  select
    p.id,
    'live_class'::public.notification_kind,
    'New live class: ' || lc.title,
    null,
    lc.id
  from public.live_classes lc
  join public.profiles p on p.role = 'student' and p.is_active
  left join public.notification_preferences np on np.user_id = p.id
  where lc.id = p_live_class_id
    and coalesce(np.enabled, true)
    and public.live_class_is_for(lc.id, p.id)
  returning id
  )
  select id from created;
end;
$$;

-- ---------------------------------------------------------------------------
-- Save functions: the post and its targets in one transaction. Security
-- invoker, so the admin RLS policies still apply. p_*_id null creates a new
-- post; otherwise that post is updated and its targets replaced. Empty
-- arrays mean all courses / all batches. Returns the post id.
-- ---------------------------------------------------------------------------

create function public.save_announcement(
  p_title text,
  p_body text,
  p_course_ids uuid[],
  p_batch_ids uuid[],
  p_announcement_id uuid default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can save announcements.';
  end if;

  if p_announcement_id is null then
    insert into public.announcements (title, body, created_by)
    values (p_title, p_body, (select auth.uid()))
    returning id into v_id;
  else
    update public.announcements
    set title = p_title, body = p_body
    where id = p_announcement_id
    returning id into v_id;

    if v_id is null then
      raise exception 'Announcement not found.';
    end if;

    delete from public.announcement_courses where announcement_id = v_id;
    delete from public.announcement_batches where announcement_id = v_id;
  end if;

  insert into public.announcement_courses (announcement_id, course_id)
  select distinct v_id, t.id from unnest(coalesce(p_course_ids, '{}'::uuid[])) as t (id);

  insert into public.announcement_batches (announcement_id, batch_id)
  select distinct v_id, t.id from unnest(coalesce(p_batch_ids, '{}'::uuid[])) as t (id);

  return v_id;
end;
$$;

create function public.save_live_class(
  p_title text,
  p_starts_at timestamptz,
  p_join_url text,
  p_course_ids uuid[],
  p_batch_ids uuid[],
  p_note text default null,
  p_live_class_id uuid default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can save live classes.';
  end if;

  if p_live_class_id is null then
    insert into public.live_classes (title, starts_at, join_url, note, created_by)
    values (p_title, p_starts_at, p_join_url, p_note, (select auth.uid()))
    returning id into v_id;
  else
    update public.live_classes
    set title = p_title, starts_at = p_starts_at, join_url = p_join_url, note = p_note
    where id = p_live_class_id
    returning id into v_id;

    if v_id is null then
      raise exception 'Live class not found.';
    end if;

    delete from public.live_class_courses where live_class_id = v_id;
    delete from public.live_class_batches where live_class_id = v_id;
  end if;

  insert into public.live_class_courses (live_class_id, course_id)
  select distinct v_id, t.id from unnest(coalesce(p_course_ids, '{}'::uuid[])) as t (id);

  insert into public.live_class_batches (live_class_id, batch_id)
  select distinct v_id, t.id from unnest(coalesce(p_batch_ids, '{}'::uuid[])) as t (id);

  return v_id;
end;
$$;

revoke execute on function public.save_announcement(text, text, uuid[], uuid[], uuid) from public, anon;
revoke execute on function public.save_live_class(text, timestamptz, text, uuid[], uuid[], text, uuid) from public, anon;
grant execute on function public.save_announcement(text, text, uuid[], uuid[], uuid) to authenticated;
grant execute on function public.save_live_class(text, timestamptz, text, uuid[], uuid[], text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Deleting a course or batch deletes the posts that were only for it (a post
-- with other courses/batches left just loses this one through the cascade).
-- Runs before the delete, while the join rows still exist.
-- ---------------------------------------------------------------------------

create function public.delete_posts_only_for_course()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  delete from public.announcements an
  where exists (
    select 1 from public.announcement_courses ac
    where ac.announcement_id = an.id and ac.course_id = old.id
  )
  and not exists (
    select 1 from public.announcement_courses ac
    where ac.announcement_id = an.id and ac.course_id <> old.id
  );

  delete from public.live_classes lc
  where exists (
    select 1 from public.live_class_courses lcc
    where lcc.live_class_id = lc.id and lcc.course_id = old.id
  )
  and not exists (
    select 1 from public.live_class_courses lcc
    where lcc.live_class_id = lc.id and lcc.course_id <> old.id
  );

  return old;
end;
$$;

create function public.delete_posts_only_for_batch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  delete from public.announcements an
  where exists (
    select 1 from public.announcement_batches ab
    where ab.announcement_id = an.id and ab.batch_id = old.id
  )
  and not exists (
    select 1 from public.announcement_batches ab
    where ab.announcement_id = an.id and ab.batch_id <> old.id
  );

  delete from public.live_classes lc
  where exists (
    select 1 from public.live_class_batches lcb
    where lcb.live_class_id = lc.id and lcb.batch_id = old.id
  )
  and not exists (
    select 1 from public.live_class_batches lcb
    where lcb.live_class_id = lc.id and lcb.batch_id <> old.id
  );

  return old;
end;
$$;

create trigger courses_delete_posts_only_for_course
before delete on public.courses
for each row execute function public.delete_posts_only_for_course();

create trigger batches_delete_posts_only_for_batch
before delete on public.batches
for each row execute function public.delete_posts_only_for_batch();
