-- Barber Booking: row level security policies

-- profiles: users read/update own row only -----------------------------
alter table profiles enable row level security;

create policy "profiles_select_own"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- salons: public select, owner manages own ------------------------------
alter table salons enable row level security;

create policy "salons_select_public"
  on salons for select
  using (true);

create policy "salons_insert_owner"
  on salons for insert
  with check (auth.uid() = owner_id);

create policy "salons_update_owner"
  on salons for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "salons_delete_owner"
  on salons for delete
  using (auth.uid() = owner_id);

-- barbers: public select, barber manages own row ------------------------
alter table barbers enable row level security;

create policy "barbers_select_public"
  on barbers for select
  using (true);

create policy "barbers_insert_own"
  on barbers for insert
  with check (auth.uid() = profile_id);

create policy "barbers_update_own"
  on barbers for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "barbers_delete_own"
  on barbers for delete
  using (auth.uid() = profile_id);

-- services: public select, barber manages own ----------------------------
alter table services enable row level security;

create policy "services_select_public"
  on services for select
  using (true);

create policy "services_insert_own"
  on services for insert
  with check (
    exists (
      select 1 from barbers b
      where b.id = services.barber_id and b.profile_id = auth.uid()
    )
  );

create policy "services_update_own"
  on services for update
  using (
    exists (
      select 1 from barbers b
      where b.id = services.barber_id and b.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from barbers b
      where b.id = services.barber_id and b.profile_id = auth.uid()
    )
  );

create policy "services_delete_own"
  on services for delete
  using (
    exists (
      select 1 from barbers b
      where b.id = services.barber_id and b.profile_id = auth.uid()
    )
  );

-- slots: public select of available slots, barber manages own -----------
alter table slots enable row level security;

create policy "slots_select_available_or_own"
  on slots for select
  using (
    status = 'available'
    or exists (
      select 1 from barbers b
      where b.id = slots.barber_id and b.profile_id = auth.uid()
    )
  );

create policy "slots_insert_own"
  on slots for insert
  with check (
    exists (
      select 1 from barbers b
      where b.id = slots.barber_id and b.profile_id = auth.uid()
    )
  );

create policy "slots_update_own"
  on slots for update
  using (
    exists (
      select 1 from barbers b
      where b.id = slots.barber_id and b.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from barbers b
      where b.id = slots.barber_id and b.profile_id = auth.uid()
    )
  );

create policy "slots_delete_own"
  on slots for delete
  using (
    exists (
      select 1 from barbers b
      where b.id = slots.barber_id and b.profile_id = auth.uid()
    )
  );

-- bookings: customer sees own, barber sees bookings on their slots ------
alter table bookings enable row level security;

create policy "bookings_select_customer_or_barber"
  on bookings for select
  using (
    auth.uid() = customer_id
    or exists (
      select 1 from barbers b
      where b.id = bookings.barber_id and b.profile_id = auth.uid()
    )
  );

create policy "bookings_insert_customer"
  on bookings for insert
  with check (auth.uid() = customer_id);

create policy "bookings_update_customer_or_barber"
  on bookings for update
  using (
    auth.uid() = customer_id
    or exists (
      select 1 from barbers b
      where b.id = bookings.barber_id and b.profile_id = auth.uid()
    )
  )
  with check (
    auth.uid() = customer_id
    or exists (
      select 1 from barbers b
      where b.id = bookings.barber_id and b.profile_id = auth.uid()
    )
  );

-- reviews: public select, customer inserts own ---------------------------
alter table reviews enable row level security;

create policy "reviews_select_public"
  on reviews for select
  using (true);

create policy "reviews_insert_customer"
  on reviews for insert
  with check (
    auth.uid() = customer_id
    and exists (
      select 1 from bookings bo
      where bo.id = reviews.booking_id and bo.customer_id = auth.uid()
    )
  );
