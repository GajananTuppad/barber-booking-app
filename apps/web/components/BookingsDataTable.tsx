'use client';

import { StatusBadge } from './StatusBadge';
import { DataTable, type DataTableColumn } from './DataTable';

export interface BookingRow {
  id: string;
  customerName: string;
  barberName: string;
  serviceName: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface BookingsDataTableProps {
  rows: BookingRow[];
  searchPlaceholder?: string;
  emptyMessage?: string;
}

export function BookingsDataTable({ rows, searchPlaceholder, emptyMessage = 'No bookings yet.' }: BookingsDataTableProps) {
  const columns: DataTableColumn<BookingRow>[] = [
    { key: 'customerName', header: 'Customer' },
    { key: 'barberName', header: 'Barber' },
    { key: 'serviceName', header: 'Service' },
    {
      key: 'total_amount',
      header: 'Amount',
      render: (row) => `₹${row.total_amount}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'created_at',
      header: 'Date',
      render: (row) => new Date(row.created_at).toLocaleDateString(),
    },
  ];

  return (
    <DataTable
      rows={rows}
      rowKey="id"
      columns={columns}
      searchPlaceholder={searchPlaceholder ?? 'Filter by customer, service or status…'}
      searchValue={(r) => `${r.customerName} ${r.serviceName} ${r.status}`}
      emptyMessage={emptyMessage}
    />
  );
}
