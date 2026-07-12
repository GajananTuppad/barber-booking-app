function resolveSupabaseUrl(): string {
  const url =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error('Missing SUPABASE_URL (or NEXT_PUBLIC_/EXPO_PUBLIC_ variant)');
  }
  return url;
}

/** Calls a deployed Supabase Edge Function, forwarding the caller's access token so it runs as them. */
export async function callEdgeFunction<T>(
  functionName: string,
  body: unknown,
  accessToken?: string,
): Promise<T> {
  const url = `${resolveSupabaseUrl()}/functions/v1/${functionName}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      json && typeof json === 'object' && 'error' in json && (json as { error?: unknown }).error
        ? String((json as { error?: unknown }).error)
        : `Edge function ${functionName} failed with status ${response.status}`;
    throw new Error(message);
  }
  return json as T;
}
