-- 011_enforce_ban.sql
-- Enforcement strategy:
--   1. Next.js middleware checks is_banned on every request — blocks active sessions immediately.
--   2. tRPC middleware rejects banned users at the API layer.
--   3. This migration adds a helper function for the tRPC layer.
--   4. The ban takes effect on the user's NEXT sign-in (existing tokens remain
--      valid until they expire). Keep token expiry short as a backstop.

-- Helper: returns true if the user is banned (or doesn't exist).
-- Used by tRPC isBanned middleware. Runs with SECURITY DEFINER so it bypasses RLS.
create or replace function auth.is_user_banned(p_user_id uuid)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  banned boolean;
begin
  select is_banned into banned
  from profiles
  where id = p_user_id;
  return coalesce(banned, false);
end;
$$;
