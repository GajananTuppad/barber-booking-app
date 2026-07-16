import { Skeleton } from '../../../components/Skeleton';

export default function BarbersLoading() {
  return (
    <div>
      <Skeleton className="mb-6 h-8 w-40" />
      <Skeleton className="mb-4 h-10 w-72" />
      <Skeleton className="h-96" />
    </div>
  );
}
