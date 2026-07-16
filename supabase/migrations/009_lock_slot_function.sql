-- Barber Booking: atomic slot locking
--
-- book-slot previously did a SELECT to check slot.status followed by a
-- separate UPDATE — two round trips with a race window between them where
-- two concurrent requests could both pass the check. This function performs
-- the check-and-set as a single atomic statement (Postgres guarantees a
-- single UPDATE...WHERE is atomic under the hood), so only one caller can
-- ever flip a given slot from 'available' to 'locked'.
--
-- Razorpay order creation is an external HTTP call and can't be part of a
-- database transaction, so it still happens afterward in the edge function;
-- this function only needs to make the DB side race-free.
create or replace function try_lock_slot(p_slot_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated_count int;
begin
  update slots
  set status = 'locked'
  where id = p_slot_id
    and status = 'available';

  get diagnostics v_updated_count = row_count;
  return v_updated_count = 1;
end;
$$;

revoke all on function try_lock_slot(uuid) from public;
grant execute on function try_lock_slot(uuid) to service_role;
