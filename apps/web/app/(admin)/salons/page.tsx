import { getSalonsList } from '../../../lib/admin-data';
import { SalonsTable } from './SalonsTable';

export default async function SalonsPage() {
  const salons = await getSalonsList();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Salons</h1>
      <SalonsTable salons={salons} />
    </div>
  );
}
