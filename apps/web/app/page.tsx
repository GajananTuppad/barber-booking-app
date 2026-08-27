import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../lib/supabase-server';

export default async function HomePage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') {
    redirect('/login?error=not_admin');
  }

  redirect('/overview');
}
