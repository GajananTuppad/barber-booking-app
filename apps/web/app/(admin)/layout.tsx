import '../globals.css';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { createSupabaseServerClient } from '../../lib/supabase-server';

const NAV_ITEMS = [
  { href: '/', label: 'Overview' },
  { href: '/salons', label: 'Salons' },
  { href: '/barbers', label: 'Barbers' },
  { href: '/users', label: 'Users' },
  { href: '/payouts', label: 'Payouts' },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user ? (await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()).data : null;

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="w-56 shrink-0 border-r border-border bg-card px-4 py-6">
        <div className="mb-8 text-lg font-bold text-gold">Shravkash Admin</div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-card px-3 py-2 text-sm text-muted hover:bg-input hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

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
