import type { TypedSupabaseClient } from '@barber/shared';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptions;
}

/** Server Component / Server Action client — reads the session from request cookies, respects RLS. */
export function createSupabaseServerClient(): TypedSupabaseClient {
  const cookieStore = cookies();

  // @supabase/ssr@0.5.2's generic signature references a supabase-js internal
  // type path that no longer exists in supabase-js 2.110, which silently
  // collapses every query result to `never`. Build the client untyped and
  // cast to our real client type instead of relying on that broken generic.
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render, which can't set cookies —
          // middleware already refreshes the session on every request.
        }
      },
    },
  }) as unknown as TypedSupabaseClient;
}
