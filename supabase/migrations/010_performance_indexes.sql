-- Barber Booking: composite indexes for the query patterns that matter most
-- (booking calendar lookups and per-customer/per-barber booking history),
-- on top of the single-column indexes already created in 001_init.sql.

create index if not exists slots_barber_start_status_idx on slots (barber_id, start_time, status);
create index if not exists bookings_customer_created_idx on bookings (customer_id, created_at);
create index if not exists bookings_barber_status_idx on bookings (barber_id, status);
