-- Barber Booking: initial schema
create extension if not exists pgcrypto;

-- profiles ------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  role text not null default 'customer' check (role in ('customer', 'barber', 'admin')),
  created_at timestamptz not null default now()
);

-- salons ----------------------------------------------------------------
create table salons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  name text not null,
  address text,
  city text,
  lat double precision,
  lng double precision,
  cover_image_url text,
  rating numeric(2, 1) not null default 0 check (rating >= 0 and rating <= 5),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index salons_owner_id_idx on salons (owner_id);

-- barbers -----------------------------------------------------------------
create table barbers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  salon_id uuid not null references salons (id) on delete cascade,
  bio text,
  experience_years int not null default 0 check (experience_years >= 0),
  avatar_url text,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  unique (profile_id, salon_id)
);

create index barbers_profile_id_idx on barbers (profile_id);
create index barbers_salon_id_idx on barbers (salon_id);

-- services ----------------------------------------------------------------
create table services (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references barbers (id) on delete cascade,
  name text not null,
  description text,
  duration_minutes int not null default 30 check (duration_minutes > 0),
  price numeric(10, 2) not null check (price >= 0),
  created_at timestamptz not null default now()
);

create index services_barber_id_idx on services (barber_id);

-- slots ---------------------------------------------------------------------
create table slots (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references barbers (id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'available'
    check (status in ('available', 'locked', 'booked', 'cancelled')),
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index slots_barber_id_idx on slots (barber_id);
create index slots_start_time_idx on slots (start_time);
create index slots_status_idx on slots (status);

-- bookings ------------------------------------------------------------------
create table bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null unique references slots (id) on delete cascade,
  service_id uuid not null references services (id) on delete restrict,
  customer_id uuid not null references profiles (id) on delete cascade,
  barber_id uuid not null references barbers (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  payment_id text,
  payment_status text not null default 'unpaid',
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create index bookings_customer_id_idx on bookings (customer_id);
create index bookings_barber_id_idx on bookings (barber_id);

-- reviews -------------------------------------------------------------------
create table reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings (id) on delete cascade,
  customer_id uuid not null references profiles (id) on delete cascade,
  barber_id uuid not null references barbers (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index reviews_barber_id_idx on reviews (barber_id);
