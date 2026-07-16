import 'server-only';

import { createClient, type TypedSupabaseClient } from '@barber/shared';

/**
 * Service-role client — bypasses RLS entirely. Only use in Server Components
 * / Server Actions reachable through the (admin) group, which middleware
 * already gates on profile.role === 'admin'.
 */
export function createSupabaseAdminClient(): TypedSupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
