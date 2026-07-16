const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  active: { bg: 'bg-success/20', text: 'text-success' },
  available: { bg: 'bg-success/20', text: 'text-success' },
  suspended: { bg: 'bg-danger/20', text: 'text-danger' },
  banned: { bg: 'bg-danger/20', text: 'text-danger' },
  pending: { bg: 'bg-warning/20', text: 'text-warning' },
  confirmed: { bg: 'bg-success/20', text: 'text-success' },
  completed: { bg: 'bg-gold/20', text: 'text-gold' },
  cancelled: { bg: 'bg-border', text: 'text-muted' },
  paid: { bg: 'bg-success/20', text: 'text-success' },
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status.toLowerCase()] ?? { bg: 'bg-border', text: 'text-muted' };

  return (
    <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium capitalize ${style.bg} ${style.text}`}>
      {status}
    </span>
  );
}
