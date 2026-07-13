import { appRouter, createClient, createTRPCContext } from '@barber/shared';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: async () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
      }

      const authHeader = req.headers.get('authorization');
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
      });

      return createTRPCContext({ supabase });
    },
  });
}

export { handler as GET, handler as POST };
