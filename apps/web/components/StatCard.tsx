import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: { value: number; label?: string };
}

export function StatCard({ label, value, icon, trend }: StatCardProps) {
  const isPositive = (trend?.value ?? 0) >= 0;

  return (
    <div className="rounded-card border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{label}</span>
        {icon ? <span className="text-lg">{icon}</span> : null}
      </div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
      {trend ? (
        <div className={`mt-1 text-xs ${isPositive ? 'text-success' : 'text-danger'}`}>
          {isPositive ? '▲' : '▼'} {Math.abs(trend.value)}% {trend.label ?? ''}
        </div>
      ) : null}
    </div>
  );
}
