'use client';

import { useState, useTransition } from 'react';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { DataTable, type DataTableColumn } from '../../../components/DataTable';
import { StatusBadge } from '../../../components/StatusBadge';
import { generateWeeklyPayouts, markPayoutPaid } from '../../../lib/admin-actions';

interface PayoutRowData {
  id: string;
  barberName: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  status: string;
}

export function PayoutsTable({ payouts }: { payouts: PayoutRowData[] }) {
  const [pending, startTransition] = useTransition();
  const [generating, startGenerating] = useTransition();
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; barberName: string } | null>(null);

  function handleMarkPaid() {
    if (!confirmTarget) return;
    const { id } = confirmTarget;
    startTransition(() => {
      markPayoutPaid(id).then(() => setConfirmTarget(null));
    });
  }

  function handleGenerate() {
    startGenerating(() => {
      void generateWeeklyPayouts();
    });
  }

  const columns: DataTableColumn<PayoutRowData>[] = [
    { key: 'barberName', header: 'Barber', sortValue: (r) => r.barberName },
    {
      key: 'period',
      header: 'Period',
      sortValue: (r) => r.period_start,
      render: (r) => `${r.period_start} – ${r.period_end}`,
    },
    { key: 'gross_amount', header: 'Gross', sortValue: (r) => r.gross_amount, render: (r) => `₹${r.gross_amount}` },
    {
      key: 'commission_amount',
      header: 'Commission (5%)',
      sortValue: (r) => r.commission_amount,
      render: (r) => `₹${r.commission_amount}`,
    },
    { key: 'net_amount', header: 'Net Payout', sortValue: (r) => r.net_amount, render: (r) => `₹${r.net_amount}` },
    { key: 'status', header: 'Status', sortValue: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) =>
        r.status === 'pending' ? (
          <button onClick={() => setConfirmTarget({ id: r.id, barberName: r.barberName })} className="text-gold">
            Mark as Paid
          </button>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-card border border-gold px-4 py-2 text-sm font-medium text-gold disabled:opacity-50"
        >
          {generating ? 'Generating…' : "Generate this week's payouts"}
        </button>
      </div>

      <DataTable
        rows={payouts}
        rowKey={(r) => r.id}
        columns={columns}
        searchPlaceholder="Search by barber…"
        searchValue={(r) => r.barberName}
        emptyMessage="No payouts yet — generate this week's payouts to get started."
      />

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title={`Mark ${confirmTarget?.barberName}'s payout as paid?`}
        description="This records the payout as settled. Make sure the transfer has actually been made."
        loading={pending}
        onConfirm={handleMarkPaid}
        onCancel={() => setConfirmTarget(null)}
      />
    </>
  );
}
