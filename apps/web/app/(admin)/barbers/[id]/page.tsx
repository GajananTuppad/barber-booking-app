import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DataTable } from '../../../../components/DataTable';
import { StatusBadge } from '../../../../components/StatusBadge';
import { getBarberDetail } from '../../../../lib/admin-data';

export default async function BarberDetailPage({ params }: { params: { id: string } }) {
  const detail = await getBarberDetail(params.id);
  if (!detail) notFound();

  const { barber, profile, salon, services, reviews, ratingBreakdown, bookings } = detail;
  const totalReviews = reviews.length;

  return (
    <div>
      <Link href="/barbers" className="mb-4 inline-block text-sm text-gold">
        ← Back to Barbers
      </Link>

      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-input text-2xl text-gold">
          {(profile?.full_name ?? 'B').charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{profile?.full_name ?? 'Barber'}</h1>
          <p className="text-muted">{salon?.name}</p>
          <div className="mt-1">
            <StatusBadge status={barber.is_available ? 'active' : 'suspended'} />
          </div>
        </div>
      </div>

      <p className="mb-6 max-w-2xl text-sm text-muted">{barber.bio ?? 'No bio provided.'}</p>

      <h2 className="mb-3 text-lg font-semibold text-white">Services</h2>
      <div className="mb-6 rounded-card border border-border bg-card">
        {services.length === 0 ? (
          <p className="p-4 text-muted">No services listed.</p>
        ) : (
          services.map((service, i) => (
            <div
              key={service.id}
              className={`flex items-center justify-between p-3 ${i > 0 ? 'border-t border-border' : ''}`}
            >
              <div>
                <p className="text-white">{service.name}</p>
                <p className="text-xs text-muted">{service.duration_minutes} min</p>
              </div>
              <span className="font-semibold text-gold">₹{service.price}</span>
            </div>
          ))
        )}
      </div>

      <h2 className="mb-3 text-lg font-semibold text-white">Review breakdown</h2>
      <div className="mb-6 rounded-card border border-border bg-card p-4">
        {ratingBreakdown.map(({ star, count }) => (
          <div key={star} className="mb-1 flex items-center text-sm">
            <span className="w-8 text-muted">{star}★</span>
            <div className="mx-2 h-2 flex-1 overflow-hidden rounded-full bg-border">
              <div
                className="h-2 bg-gold"
                style={{ width: `${totalReviews ? (count / totalReviews) * 100 : 0}%` }}
              />
            </div>
            <span className="w-6 text-muted">{count}</span>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-lg font-semibold text-white">Booking History</h2>
      <DataTable
        rows={bookings}
        rowKey={(r) => r.id}
        searchPlaceholder="Filter by customer, service or status…"
        searchValue={(r) => `${r.customerName} ${r.serviceName} ${r.status}`}
        columns={[
          { key: 'customerName', header: 'Customer' },
          { key: 'serviceName', header: 'Service' },
          { key: 'total_amount', header: 'Amount', render: (r) => `₹${r.total_amount}` },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'created_at', header: 'Date', render: (r) => new Date(r.created_at).toLocaleDateString() },
        ]}
        emptyMessage="No bookings yet."
      />
    </div>
  );
}
