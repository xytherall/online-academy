-- Stage 22 — Clear uploaded files of marked work (free-tier storage)
--
-- Owner request (2026-10-06): the admin can free up storage by removing the
-- uploaded files of work that has already been marked. Only ever started by
-- an admin (never automatic), only for submissions with marks, and never
-- touches marks, feedback, the late flag or the submission row itself, so
-- every report and status stays exactly the same.
--
-- files_cleared_at records that a submission's files were removed on
-- purpose, so the pages can say so instead of looking like nothing was
-- uploaded.

alter table public.submissions add column files_cleared_at timestamptz;

-- What clearing would remove right now: how many files and how many bytes.
-- Sizes come from Storage's own records. Runs as the caller, so the
-- "Admins can read submissions objects" policy applies as well.
create function public.marked_submission_files_summary()
returns table (file_count bigint, total_bytes bigint)
language plpgsql
stable
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can see this.';
  end if;

  return query
  select
    count(*)::bigint,
    coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint
  from public.submissions s
  cross join lateral unnest(s.file_paths) as f(path)
  join storage.objects o on o.bucket_id = 'submissions' and o.name = f.path
  where s.marks is not null;
end;
$$;

-- Empties file_paths on every marked submission that still has files, in one
-- statement, and returns the paths it emptied so the server can delete those
-- files from Storage (files can only be deleted through the Storage API).
-- The marks condition is checked on the rows being updated, so a submission
-- that isn't marked can never be included.
create function public.clear_marked_submission_files()
returns setof text
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can clear files.';
  end if;

  return query
  with target as (
    select id, file_paths
    from public.submissions
    where marks is not null and cardinality(file_paths) > 0
    for update
  ), cleared as (
    update public.submissions s
    set file_paths = '{}', files_cleared_at = now()
    from target t
    where s.id = t.id and s.marks is not null
    returning t.file_paths
  )
  select unnest(file_paths) from cleared;
end;
$$;

revoke execute on function public.marked_submission_files_summary() from public, anon;
revoke execute on function public.clear_marked_submission_files() from public, anon;
grant execute on function public.marked_submission_files_summary() to authenticated;
grant execute on function public.clear_marked_submission_files() to authenticated;
