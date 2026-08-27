import '../globals.css';
import type { ReactNode } from 'react';
import { createSupabaseServerClient } from '../../lib/supabase-server';
import { AdminSidebar } from '../../components/AdminSidebar';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
    : { data: null };

  return (
    <div className="flex min-h-screen bg-bg">
      <AdminSidebar profileName={profile?.full_name ?? undefined} />

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <input
            placeholder="Search…"
            className="w-72 rounded-card border border-border bg-input px-3 py-2 text-sm text-white outline-none focus:border-gold"
          />
          <div className="flex items-center gap-4">
            <span className="text-lg text-muted" aria-label="Notifications">
              🔔
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-input text-gold">
              {(profile?.full_name ?? 'A').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
