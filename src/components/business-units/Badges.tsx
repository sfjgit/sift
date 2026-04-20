import { cn } from '@/lib/utils';

type BadgeVariant =
  | 'active'
  | 'inactive'
  | 'contract'
  | 'permanent'
  | 'hybrid'
  | 'remote'
  | 'onsite'
  | 'high'
  | 'medium'
  | 'low'
  | 'shared'
  | 'private'
  | 'default';

const variantClasses: Record<BadgeVariant, string> = {
  active: 'bg-green-50 text-green-700 border-green-200',
  inactive: 'bg-gray-100 text-gray-500 border-gray-200',
  contract: 'bg-blue-50 text-blue-700 border-blue-200',
  permanent: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  hybrid: 'bg-purple-50 text-purple-700 border-purple-200',
  remote: 'bg-teal-50 text-teal-700 border-teal-200',
  onsite: 'bg-orange-50 text-orange-700 border-orange-200',
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-gray-50 text-gray-600 border-gray-200',
  shared: 'bg-slate-100 text-slate-600 border-slate-200',
  private: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  default: 'bg-gray-100 text-gray-600 border-gray-200',
};

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ label, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border',
        variantClasses[variant],
        className
      )}
    >
      {label}
    </span>
  );
}

export function statusBadge(status: string) {
  const s = status?.toLowerCase();
  if (s === 'active') return <Badge label="Active" variant="active" />;
  if (s === 'inactive') return <Badge label="Inactive" variant="inactive" />;
  return <Badge label={status} />;
}

export function priorityBadge(priority: string) {
  const p = priority?.toLowerCase();
  if (p === 'high') return <Badge label="High" variant="high" />;
  if (p === 'medium') return <Badge label="Medium" variant="medium" />;
  return <Badge label={priority} variant="low" />;
}

export function jobTypeBadge(type: string) {
  const t = type?.toLowerCase();
  if (t === 'contract') return <Badge label="Contract" variant="contract" />;
  if (t === 'permanent') return <Badge label="Permanent" variant="permanent" />;
  return <Badge label={type} />;
}

export function remoteTypeBadge(type: string) {
  const t = type?.toLowerCase();
  if (t === 'hybrid') return <Badge label="Hybrid" variant="hybrid" />;
  if (t === 'remote') return <Badge label="Remote" variant="remote" />;
  if (t === 'onsite') return <Badge label="Onsite" variant="onsite" />;
  return <Badge label={type} />;
}

export function dataPolicyBadge(policy: string) {
  const p = policy?.toLowerCase();
  if (p === 'shared') return <Badge label="Shared" variant="shared" />;
  if (p === 'private') return <Badge label="Private" variant="private" />;
  return <Badge label={policy} />;
}
