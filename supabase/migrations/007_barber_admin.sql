-- Barber Booking: schema additions for barber dashboard + admin panel

-- barbers: cover photo (avatar_url already exists for the profile photo) -----
alter table barbers add column cover_image_url text;

-- profiles: ban flag the admin panel can toggle -----------------------------
-- Note: this only marks the account; enforcing it (blocking sign-in) would
-- need an auth hook, which is out of scope here.
alter table profiles add column is_banned boolean not null default false;

-- payouts: barber payout periods, computed from bookings and settled by admin
create table payouts (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references barbers (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  gross_amount numeric(10, 2) not null check (gross_amount >= 0),
  commission_amount numeric(10, 2) not null check (commission_amount >= 0),
  net_amount numeric(10, 2) not null check (net_amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (barber_id, period_start, period_end)
);

create index payouts_barber_id_idx on payouts (barber_id);

alter table payouts enable row level security;

create policy "payouts_select_own_or_admin"
  on payouts for select
  using (
    exists (select 1 from barbers b where b.id = payouts.barber_id and b.profile_id = auth.uid())
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );
