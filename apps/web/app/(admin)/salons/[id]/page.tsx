import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusBadge } from '../../../../components/StatusBadge';
import { getSalonDetail } from '../../../../lib/admin-data';
import { SalonStatusToggle } from './SalonStatusToggle';

export default async function SalonDetailPage({ params }: { params: { id: string } }) {
  const detail = await getSalonDetail(params.id);
  if (!detail) notFound();

  const { salon, owner, barbers } = detail;

  return (
    <div>
      <Link href="/salons" className="mb-4 inline-block text-sm text-gold">
        ← Back to Salons
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{salon.name}</h1>
          <p className="text-muted">{salon.address ?? 'No address on file'}</p>
          <p className="text-muted">{salon.city}</p>
          <p className="mt-2 text-sm text-muted">Owner: {owner?.full_name ?? 'Unknown'}</p>
          <div className="mt-2">
            <StatusBadge status={salon.is_active ? 'active' : 'suspended'} />
          </div>
        </div>
        <SalonStatusToggle salonId={salon.id} salonName={salon.name} isActive={salon.is_active} />
      </div>

      {salon.lat != null && salon.lng != null ? (
        <div className="mb-6 h-64 overflow-hidden rounded-card border border-border">
          <iframe
            title="Salon location"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            src={`https://maps.google.com/maps?q=${salon.lat},${salon.lng}&z=15&output=embed`}
          />
        </div>
      ) : null}

      <h2 className="mb-3 text-lg font-semibold text-white">Barbers</h2>
      <div className="rounded-card border border-border bg-card">
        {barbers.length === 0 ? (
          <p className="p-4 text-muted">No barbers at this salon.</p>
        ) : (
          barbers.map((barber, i) => (
            <Link
              key={barber.id}
              href={`/barbers/${barber.id}`}
              className={`flex items-center justify-between p-3 hover:bg-input ${i > 0 ? 'border-t border-border' : ''}`}
            >
              <span className="text-white">{barber.profile?.full_name ?? 'Barber'}</span>
              <StatusBadge status={barber.is_available ? 'available' : 'suspended'} />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
