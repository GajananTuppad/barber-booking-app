-- Barber Booking: enable realtime on slots and bookings
alter publication supabase_realtime add table slots;
alter publication supabase_realtime add table bookings;
