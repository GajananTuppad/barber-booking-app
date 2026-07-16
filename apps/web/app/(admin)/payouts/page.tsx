import { StatCard } from '../../../components/StatCard';
import { getPayoutsList } from '../../../lib/admin-data';
import { PayoutsTable } from './PayoutsTable';

export default async function PayoutsPage() {
  const { rows, platformTotals } = await getPayoutsList();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Payouts</h1>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="Gross earnings" value={`₹${platformTotals.gross.toLocaleString('en-IN')}`} />
        <StatCard label="Commission collected (5%)" value={`₹${platformTotals.commission.toLocaleString('en-IN')}`} />
        <StatCard label="Net payouts" value={`₹${platformTotals.net.toLocaleString('en-IN')}`} />
      </div>

      <PayoutsTable payouts={rows} />
    </div>
  );
}
