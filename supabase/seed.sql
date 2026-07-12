-- Barber Booking: sample seed data
-- 2 salons (Mysore, Bengaluru), 3 barbers with services and slots for the
-- next 7 days, 2 customers with bookings.

-- auth.users (minimal rows so profiles' FK to auth.users is satisfiable) ----
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
   created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111101', 'authenticated', 'authenticated', 'owner.mysore@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111102', 'authenticated', 'authenticated', 'owner.bengaluru@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111201', 'authenticated', 'authenticated', 'ravi.kumar@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111202', 'authenticated', 'authenticated', 'suresh.patil@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111203', 'authenticated', 'authenticated', 'arjun.rao@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111301', 'authenticated', 'authenticated', 'priya.sharma@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111302', 'authenticated', 'authenticated', 'karthik.iyer@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

-- profiles -------------------------------------------------------------------
insert into profiles (id, full_name, phone, role) values
  ('11111111-1111-1111-1111-111111111101', 'Deepak Nair', '+919845000101', 'admin'),
  ('11111111-1111-1111-1111-111111111102', 'Anita Rao', '+919845000102', 'admin'),
  ('11111111-1111-1111-1111-111111111201', 'Ravi Kumar', '+919845000201', 'barber'),
  ('11111111-1111-1111-1111-111111111202', 'Suresh Patil', '+919845000202', 'barber'),
  ('11111111-1111-1111-1111-111111111203', 'Arjun Rao', '+919845000203', 'barber'),
  ('11111111-1111-1111-1111-111111111301', 'Priya Sharma', '+919845000301', 'customer'),
  ('11111111-1111-1111-1111-111111111302', 'Karthik Iyer', '+919845000302', 'customer');

-- salons -----------------------------------------------------------------
insert into salons (id, owner_id, name, address, city, lat, lng, rating, is_active) values
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101',
   'The Grooming Lounge', 'Sayyaji Rao Road, Devaraja Mohalla', 'Mysore', 12.3052, 76.6552, 4.5, true),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111102',
   'Urban Fade Studio', '100 Feet Road, Indiranagar', 'Bengaluru', 12.9716, 77.6412, 4.7, true);

-- barbers -----------------------------------------------------------------
insert into barbers (id, profile_id, salon_id, bio, experience_years, is_available) values
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111201', '22222222-2222-2222-2222-222222222201',
   'Specialist in classic cuts and traditional shaves.', 8, true),
  ('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111202', '22222222-2222-2222-2222-222222222201',
   'Beard styling expert with a passion for detail.', 5, true),
  ('33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111203', '22222222-2222-2222-2222-222222222202',
   'Modern fades and creative color specialist.', 6, true);

-- services -----------------------------------------------------------------
insert into services (id, barber_id, name, description, duration_minutes, price) values
  ('44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333301', 'Classic Haircut', 'Scissor cut with styling.', 30, 300.00),
  ('44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333301', 'Beard Trim', 'Shape and trim with hot towel.', 20, 150.00),
  ('44444444-4444-4444-4444-444444444403', '33333333-3333-3333-3333-333333333301', 'Haircut + Beard Combo', 'Full grooming package.', 45, 400.00),
  ('44444444-4444-4444-4444-444444444411', '33333333-3333-3333-3333-333333333302', 'Beard Styling', 'Precision beard shaping.', 25, 200.00),
  ('44444444-4444-4444-4444-444444444412', '33333333-3333-3333-3333-333333333302', 'Hot Towel Shave', 'Traditional straight razor shave.', 30, 250.00),
  ('44444444-4444-4444-4444-444444444421', '33333333-3333-3333-3333-333333333303', 'Skin Fade', 'Modern fade with sharp lineup.', 40, 450.00),
  ('44444444-4444-4444-4444-444444444422', '33333333-3333-3333-3333-333333333303', 'Hair Color', 'Full or partial color treatment.', 60, 800.00),
  ('44444444-4444-4444-4444-444444444423', '33333333-3333-3333-3333-333333333303', 'Kids Haircut', 'Haircut for children under 12.', 20, 200.00);

-- slots: recurring availability for the next 7 days -------------------------
insert into slots (barber_id, start_time, end_time, status)
select
  b.id,
  (current_date + d.day_offset + t.slot_time) as start_time,
  (current_date + d.day_offset + t.slot_time + interval '30 minutes') as end_time,
  'available'
from barbers b
cross join generate_series(0, 6) as d(day_offset)
cross join (
  values
    (time '09:00'), (time '09:30'), (time '11:00'), (time '11:30'),
    (time '13:00'), (time '13:30'), (time '16:00'), (time '16:30')
) as t(slot_time);

-- slots reserved for the bookings below --------------------------------------
insert into slots (id, barber_id, start_time, end_time, status) values
  ('55555555-5555-5555-5555-555555555501', '33333333-3333-3333-3333-333333333301',
   current_date + 1 + time '10:00', current_date + 1 + time '10:30', 'booked'),
  ('55555555-5555-5555-5555-555555555502', '33333333-3333-3333-3333-333333333303',
   current_date + 2 + time '15:00', current_date + 2 + time '15:40', 'booked');

-- bookings -------------------------------------------------------------------
insert into bookings (id, slot_id, service_id, customer_id, barber_id, status, payment_id, payment_status, total_amount, notes) values
  ('66666666-6666-6666-6666-666666666601', '55555555-5555-5555-5555-555555555501',
   '44444444-4444-4444-4444-444444444401', '11111111-1111-1111-1111-111111111301',
   '33333333-3333-3333-3333-333333333301', 'confirmed', 'pay_test_00001', 'paid', 300.00,
   'Please keep it short on the sides.'),
  ('66666666-6666-6666-6666-666666666602', '55555555-5555-5555-5555-555555555502',
   '44444444-4444-4444-4444-444444444421', '11111111-1111-1111-1111-111111111302',
   '33333333-3333-3333-3333-333333333303', 'pending', null, 'unpaid', 450.00,
   null);
