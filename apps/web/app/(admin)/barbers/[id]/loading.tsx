import { Skeleton } from '../../../../components/Skeleton';

export default function BarberDetailLoading() {
  return (
    <div>
      <Skeleton className="mb-4 h-5 w-32" />
      <div className="mb-6 flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1">
          <Skeleton className="mb-2 h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="mb-6 h-40" />
      <Skeleton className="h-64" />
    </div>
  );
}
