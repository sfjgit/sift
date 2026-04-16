interface Props {
  status: string;
}

const CONFIG: Record<string, { bg: string; dot: string; text: string; label: string }> = {
  ACTIVE: {
    bg: 'bg-emerald-50 border border-emerald-200',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
    label: 'Active',
  },
  INACTIVE: {
    bg: 'bg-gray-100 border border-gray-200',
    dot: 'bg-gray-400',
    text: 'text-gray-600',
    label: 'Inactive',
  },
  PENDING: {
    bg: 'bg-amber-50 border border-amber-200',
    dot: 'bg-amber-400',
    text: 'text-amber-700',
    label: 'Pending',
  },
};

export default function ClientStatusBadge({ status }: Props) {
  const cfg = CONFIG[status] ?? CONFIG['INACTIVE'];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
