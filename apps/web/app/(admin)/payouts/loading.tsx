import { Skeleton } from '../../../components/Skeleton';

export default function PayoutsLoading() {
  return (
    <div>
      <Skeleton className="mb-6 h-8 w-40" />
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="mb-4 h-10 w-40 self-end" />
      <Skeleton className="h-96" />
    </div>
  );
}
