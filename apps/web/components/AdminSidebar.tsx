'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/overview', label: 'Overview' },
  { href: '/salons', label: 'Salons' },
  { href: '/barbers', label: 'Barbers' },
  { href: '/users', label: 'Users' },
  { href: '/payouts', label: 'Payouts' },
];

interface AdminSidebarProps {
  profileName?: string;
}

export function AdminSidebar({ profileName }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card px-4 py-6">
      <div className="mb-8 text-lg font-bold text-gold">Shravkash Admin</div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-card px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-gold/10 text-gold'
                  : 'text-muted hover:bg-input hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-input text-gold">
          {(profileName ?? 'A').charAt(0).toUpperCase()}
        </div>
      </div>
    </aside>
  );
}
