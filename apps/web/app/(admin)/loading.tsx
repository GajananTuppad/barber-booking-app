import { Skeleton } from '../../components/Skeleton';

export default function OverviewLoading() {
  return (
    <div>
      <Skeleton className="mb-6 h-8 w-40" />
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
