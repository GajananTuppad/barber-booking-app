'use client';

import type { TypedSupabaseClient } from '@barber/shared';
import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient(): TypedSupabaseClient {
  // See the comment in lib/supabase-server.ts — @supabase/ssr's own generic
  // resolves to `never` against supabase-js 2.110, so we cast instead.
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  ) as unknown as TypedSupabaseClient;
}
