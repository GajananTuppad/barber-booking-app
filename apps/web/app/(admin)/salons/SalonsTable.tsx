'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { DataTable, type DataTableColumn } from '../../../components/DataTable';
import { StatusBadge } from '../../../components/StatusBadge';
import { setSalonActive } from '../../../lib/admin-actions';

interface SalonRow {
  id: string;
  name: string;
  city: string | null;
  ownerName: string;
  barberCount: number;
  is_active: boolean;
  created_at: string;
}

export function SalonsTable({ salons }: { salons: SalonRow[] }) {
  const [pending, startTransition] = useTransition();
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; name: string; nextActive: boolean } | null>(null);

  function handleToggle() {
    if (!confirmTarget) return;
    const { id, nextActive } = confirmTarget;
    startTransition(() => {
      setSalonActive(id, nextActive).then(() => setConfirmTarget(null));
    });
  }

  const columns: DataTableColumn<SalonRow>[] = [
    { key: 'name', header: 'Salon', sortValue: (r) => r.name },
    { key: 'city', header: 'City', sortValue: (r) => r.city ?? '', render: (r) => r.city ?? '—' },
    { key: 'ownerName', header: 'Owner', sortValue: (r) => r.ownerName },
    { key: 'barberCount', header: 'Barbers', sortValue: (r) => r.barberCount },
    {
      key: 'is_active',
      header: 'Status',
      sortValue: (r) => (r.is_active ? 1 : 0),
      render: (r) => <StatusBadge status={r.is_active ? 'active' : 'suspended'} />,
    },
    {
      key: 'created_at',
      header: 'Created',
      sortValue: (r) => r.created_at,
      render: (r) => new Date(r.created_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex gap-3">
          <Link href={`/salons/${r.id}`} className="text-gold">
            View
          </Link>
          <button
            onClick={() => setConfirmTarget({ id: r.id, name: r.name, nextActive: !r.is_active })}
            className={r.is_active ? 'text-danger' : 'text-success'}
          >
            {r.is_active ? 'Suspend' : 'Approve'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        rows={salons}
        rowKey={(r) => r.id}
        columns={columns}
        searchPlaceholder="Search by name or city…"
        searchValue={(r) => `${r.name} ${r.city ?? ''}`}
        emptyMessage="No salons yet."
      />

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title={confirmTarget?.nextActive ? `Approve ${confirmTarget.name}?` : `Suspend ${confirmTarget?.name}?`}
        description={
          confirmTarget?.nextActive
            ? 'This salon will become visible to customers again.'
            : 'This salon and its barbers will be hidden from customers.'
        }
        destructive={!confirmTarget?.nextActive}
        loading={pending}
        onConfirm={handleToggle}
        onCancel={() => setConfirmTarget(null)}
      />
    </>
  );
}
