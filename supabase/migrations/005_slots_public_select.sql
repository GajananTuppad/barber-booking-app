-- Barber Booking: allow public read of all slot statuses.
--
-- The booking calendar needs to render locked/booked slots as unavailable
-- (not just omit them), which requires customers to be able to read slots
-- regardless of status. Slots carry no customer-identifying data (just
-- barber_id/start_time/end_time/status), so this mirrors the public-read
-- policy already used for salons/barbers/services.
drop policy if exists "slots_select_available_or_own" on slots;

create policy "slots_select_public"
  on slots for select
  using (true);
