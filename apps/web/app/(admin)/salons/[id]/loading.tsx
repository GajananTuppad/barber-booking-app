import { Skeleton } from '../../../../components/Skeleton';

export default function SalonDetailLoading() {
  return (
    <div>
      <Skeleton className="mb-4 h-5 w-32" />
      <Skeleton className="mb-6 h-40" />
      <Skeleton className="mb-6 h-64" />
      <Skeleton className="h-64" />
    </div>
  );
}
