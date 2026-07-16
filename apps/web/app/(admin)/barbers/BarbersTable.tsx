'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { DataTable, type DataTableColumn } from '../../../components/DataTable';
import { StatusBadge } from '../../../components/StatusBadge';
import { setBarberAvailability } from '../../../lib/admin-actions';

interface BarberRowData {
  id: string;
  avatar_url: string | null;
  profile: { full_name: string | null } | null;
  salon: { name: string } | null;
  totalBookings: number;
  totalEarnings: number;
  avgRating: number | null;
  is_available: boolean;
}

export function BarbersTable({ barbers }: { barbers: BarberRowData[] }) {
  const [pending, startTransition] = useTransition();
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; name: string; nextAvailable: boolean } | null>(
    null,
  );

  function handleToggle() {
    if (!confirmTarget) return;
    const { id, nextAvailable } = confirmTarget;
    startTransition(() => {
      setBarberAvailability(id, nextAvailable).then(() => setConfirmTarget(null));
    });
  }

  const columns: DataTableColumn<BarberRowData>[] = [
    {
      key: 'name',
      header: 'Barber',
      sortValue: (r) => r.profile?.full_name ?? '',
      render: (r) => (
        <div className="flex items-center gap-2">
          {r.avatar_url ? (
            <Image
              src={r.avatar_url}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-input text-xs text-gold">
              {(r.profile?.full_name ?? 'B').charAt(0).toUpperCase()}
            </div>
          )}
          <span>{r.profile?.full_name ?? 'Barber'}</span>
        </div>
      ),
    },
    { key: 'salon', header: 'Salon', sortValue: (r) => r.salon?.name ?? '', render: (r) => r.salon?.name ?? '—' },
    { key: 'totalBookings', header: 'Bookings', sortValue: (r) => r.totalBookings },
    {
      key: 'totalEarnings',
      header: 'Earnings',
      sortValue: (r) => r.totalEarnings,
      render: (r) => `₹${r.totalEarnings.toLocaleString('en-IN')}`,
    },
    {
      key: 'avgRating',
      header: 'Rating',
      sortValue: (r) => r.avgRating ?? 0,
      render: (r) => (r.avgRating ? `★ ${r.avgRating.toFixed(1)}` : '—'),
    },
    {
      key: 'is_available',
      header: 'Status',
      sortValue: (r) => (r.is_available ? 1 : 0),
      render: (r) => <StatusBadge status={r.is_available ? 'active' : 'suspended'} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex gap-3">
          <Link href={`/barbers/${r.id}`} className="text-gold">
            View
          </Link>
          <button
            onClick={() =>
              setConfirmTarget({ id: r.id, name: r.profile?.full_name ?? 'Barber', nextAvailable: !r.is_available })
            }
            className={r.is_available ? 'text-danger' : 'text-success'}
          >
            {r.is_available ? 'Suspend' : 'Reinstate'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        rows={barbers}
        rowKey={(r) => r.id}
        columns={columns}
        searchPlaceholder="Search by barber or salon…"
        searchValue={(r) => `${r.profile?.full_name ?? ''} ${r.salon?.name ?? ''}`}
        emptyMessage="No barbers yet."
      />
      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title={confirmTarget?.nextAvailable ? `Reinstate ${confirmTarget.name}?` : `Suspend ${confirmTarget?.name}?`}
        description={
          confirmTarget?.nextAvailable
            ? 'This barber will be bookable by customers again.'
            : 'This barber will be hidden from customers and unable to take new bookings.'
        }
        destructive={!confirmTarget?.nextAvailable}
        loading={pending}
        onConfirm={handleToggle}
        onCancel={() => setConfirmTarget(null)}
      />
    </>
  );
}
