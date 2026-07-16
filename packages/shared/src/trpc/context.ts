import type { TypedSupabaseClient } from '../lib/supabase';

export interface TRPCContext {
  supabase: TypedSupabaseClient;
  userId: string | null;
}

/**
 * Framework-agnostic context builder. Callers (e.g. a Next.js route handler)
 * construct a Supabase client scoped to the incoming request's auth token
 * (so RLS applies) and pass it in here.
 */
export async function createTRPCContext(opts: {
  supabase: TypedSupabaseClient;
}): Promise<TRPCContext> {
  const {
    data: { user },
  } = await opts.supabase.auth.getUser();

  return {
    supabase: opts.supabase,
    userId: user?.id ?? null,
  };
}
