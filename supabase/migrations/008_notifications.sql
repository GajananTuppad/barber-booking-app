-- Barber Booking: push tokens + in-app notifications

alter table profiles add column push_token text;

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  data jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_id_created_at_idx on notifications (user_id, created_at desc);

alter table notifications enable row level security;

create policy "notifications_select_own"
  on notifications for select
  using (auth.uid() = user_id);

create policy "notifications_update_own"
  on notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Rows are only ever inserted by edge functions/cron using the service role,
-- which bypasses RLS, so no insert policy is granted to authenticated users.

alter publication supabase_realtime add table notifications;
