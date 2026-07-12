-- Barber Booking: booking reminders via pg_cron + edge function

-- Tracks whether the 1-hour-before reminder has already fired, so the
-- every-15-minutes cron tick doesn't re-notify the same booking.
alter table bookings add column reminder_sent boolean not null default false;

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- Requires these two DB settings (run once per environment, not committed here
-- since they contain the project URL / service role key):
--   alter database postgres set app.settings.supabase_url = 'https://<project-ref>.supabase.co';
--   alter database postgres set app.settings.service_role_key = '<service-role-key>';
--
-- The cron tick can't run a per-row net.http_post directly against a bookings
-- WHERE clause (net.http_post takes a single url/body, not a correlated one
-- per matched row), so it invokes a single Edge Function (send-reminders)
-- that performs the "confirmed bookings starting in the next 75 minutes"
-- query itself, sends the reminder, and flips reminder_sent.
select cron.schedule(
  'booking-reminders',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
