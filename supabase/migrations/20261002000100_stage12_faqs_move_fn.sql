-- Stage 12 — FAQ reorder (SPEC pre-launch batch 1)
--
-- Atomic up/down swap for the admin FAQ reorder control: one SECURITY DEFINER
-- function (admin-checked inside) rather than two separate client updates,
-- so a swap can never be left half-done by a failure between the two writes.
-- A no-op (not an error) when already at the top/bottom edge.

create or replace function public.move_faq(p_faq_id uuid, p_direction text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_order int;
  swap_id uuid;
  swap_order int;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  if p_direction not in ('up', 'down') then
    raise exception 'Invalid direction';
  end if;

  select sort_order into current_order from public.faqs where id = p_faq_id;
  if current_order is null then
    raise exception 'FAQ not found';
  end if;

  if p_direction = 'up' then
    select id, sort_order into swap_id, swap_order
    from public.faqs
    where sort_order < current_order
    order by sort_order desc
    limit 1;
  else
    select id, sort_order into swap_id, swap_order
    from public.faqs
    where sort_order > current_order
    order by sort_order asc
    limit 1;
  end if;

  if swap_id is null then
    return;
  end if;

  update public.faqs set sort_order = swap_order where id = p_faq_id;
  update public.faqs set sort_order = current_order where id = swap_id;
end;
$$;

revoke all on function public.move_faq(uuid, text) from public;
grant execute on function public.move_faq(uuid, text) to authenticated;
