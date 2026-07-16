import { getBarbersList } from '../../../lib/admin-data';
import { BarbersTable } from './BarbersTable';

export default async function BarbersPage() {
  const barbers = await getBarbersList();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Barbers</h1>
      <BarbersTable barbers={barbers} />
    </div>
  );
}
