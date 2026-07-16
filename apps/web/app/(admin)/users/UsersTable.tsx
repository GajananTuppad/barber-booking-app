'use client';

import { useState, useTransition } from 'react';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { DataTable, type DataTableColumn } from '../../../components/DataTable';
import { StatusBadge } from '../../../components/StatusBadge';
import { setUserBanned } from '../../../lib/admin-actions';

interface UserRowData {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  is_banned: boolean;
  bookingCount: number;
  created_at: string;
  lastActive: string | null;
}

export function UsersTable({ users }: { users: UserRowData[] }) {
  const [pending, startTransition] = useTransition();
  const [viewTarget, setViewTarget] = useState<UserRowData | null>(null);
  const [banTarget, setBanTarget] = useState<{ id: string; name: string; nextBanned: boolean } | null>(null);

  function handleBanToggle() {
    if (!banTarget) return;
    const { id, nextBanned } = banTarget;
    startTransition(() => {
      setUserBanned(id, nextBanned).then(() => setBanTarget(null));
    });
  }

  const columns: DataTableColumn<UserRowData>[] = [
    { key: 'full_name', header: 'Name', sortValue: (r) => r.full_name ?? '', render: (r) => r.full_name ?? '—' },
    { key: 'email', header: 'Email', sortValue: (r) => r.email ?? '', render: (r) => r.email ?? '—' },
    { key: 'phone', header: 'Phone', sortValue: (r) => r.phone ?? '', render: (r) => r.phone ?? '—' },
    {
      key: 'role',
      header: 'Role',
      sortValue: (r) => r.role,
      render: (r) => <span className="capitalize">{r.role}</span>,
    },
    { key: 'bookingCount', header: 'Bookings', sortValue: (r) => r.bookingCount },
    {
      key: 'created_at',
      header: 'Joined',
      sortValue: (r) => r.created_at,
      render: (r) => new Date(r.created_at).toLocaleDateString(),
    },
    {
      key: 'lastActive',
      header: 'Last Active',
      sortValue: (r) => r.lastActive ?? '',
      render: (r) => (r.lastActive ? new Date(r.lastActive).toLocaleDateString() : 'Never'),
    },
    {
      key: 'is_banned',
      header: 'Status',
      sortValue: (r) => (r.is_banned ? 1 : 0),
      render: (r) => <StatusBadge status={r.is_banned ? 'banned' : 'active'} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex gap-3">
          <button onClick={() => setViewTarget(r)} className="text-gold">
            View
          </button>
          <button
            onClick={() => setBanTarget({ id: r.id, name: r.full_name ?? 'This user', nextBanned: !r.is_banned })}
            className={r.is_banned ? 'text-success' : 'text-danger'}
          >
            {r.is_banned ? 'Unban' : 'Ban'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        rows={users}
        rowKey={(r) => r.id}
        columns={columns}
        searchPlaceholder="Search by name, email or phone…"
        searchValue={(r) => `${r.full_name ?? ''} ${r.email ?? ''} ${r.phone ?? ''}`}
        emptyMessage="No users yet."
      />

      <ConfirmDialog
        open={Boolean(viewTarget)}
        title={viewTarget?.full_name ?? 'User details'}
        description={`Email: ${viewTarget?.email ?? '—'}\nPhone: ${viewTarget?.phone ?? '—'}\nRole: ${viewTarget?.role ?? '—'}\nBookings: ${viewTarget?.bookingCount ?? 0}`}
        confirmLabel="Close"
        onConfirm={() => setViewTarget(null)}
        onCancel={() => setViewTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(banTarget)}
        title={banTarget?.nextBanned ? `Ban ${banTarget.name}?` : `Unban ${banTarget?.name}?`}
        description={
          banTarget?.nextBanned
            ? 'This flags the account as banned. It does not yet block sign-in.'
            : 'This removes the ban flag from the account.'
        }
        destructive={banTarget?.nextBanned}
        loading={pending}
        onConfirm={handleBanToggle}
        onCancel={() => setBanTarget(null)}
      />
    </>
  );
}
