import { getUsersList } from '../../../lib/admin-data';
import { UsersTable } from './UsersTable';

export default async function UsersPage() {
  const users = await getUsersList();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Users</h1>
      <UsersTable users={users} />
    </div>
  );
}
