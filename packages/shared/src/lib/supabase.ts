import { createClient as createSupabaseJsClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export { FunctionsHttpError } from '@supabase/supabase-js';

export type TypedSupabaseClient = SupabaseClient<Database>;

interface AsyncStorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export function createClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  options?: Parameters<typeof createSupabaseJsClient>[2],
): TypedSupabaseClient {
  return createSupabaseJsClient<Database>(supabaseUrl, supabaseAnonKey, options);
}

/** For use in Next.js (web) — reads NEXT_PUBLIC_ env vars. */
export function createWebClient(): TypedSupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * For use in Expo (mobile) — reads EXPO_PUBLIC_ env vars. Pass an AsyncStorage
 * instance (e.g. from `@react-native-async-storage/async-storage`) so auth
 * sessions persist across app restarts.
 */
export function createMobileClient(storage: AsyncStorageLike): TypedSupabaseClient {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}
