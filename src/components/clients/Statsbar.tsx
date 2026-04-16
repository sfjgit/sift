import { Client } from '@/types/clients.types';

interface Props {
  client: Client;
}

const REQ_STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'bg-emerald-500',
  DRAFT: 'bg-slate-400',
  PENDING_APPROVAL: 'bg-amber-400',
  ON_HOLD: 'bg-orange-400',
  CLOSED: 'bg-slate-300',
  CANCELLED: 'bg-red-400',
};

export default function StatsBar({ client }: Props) {
  // Count requirement statuses
  const reqCounts = client.requirements.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const activeReqs = reqCounts['ACTIVE'] ?? 0;
  const closedReqs = reqCounts['CLOSED'] ?? 0;

  const stats = [
    {
      label: 'Contacts',
      value: client.contacts.length,
      sub:
        client.contacts.filter(c => c.isPrimary).length > 0
          ? `${client.contacts.filter(c => c.isPrimary).length} primary`
          : 'none primary',
      color: 'text-[#0066CC]',
      bg: 'bg-blue-50',
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: 'Requirements',
      value: client.requirements.length,
      sub: `${activeReqs} active · ${closedReqs} closed`,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
    {
      label: 'Teams',
      value: client.teamAssignments.length,
      sub: client.teamAssignments.map(t => t.team.name).join(', ') || 'unassigned',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
    {
      label: 'Handlers',
      value: client.handlers.length,
      sub: client.handlers.find(h => h.role === 'PRIMARY') ? '1 primary' : 'no primary',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map(s => (
        <div
          key={s.label}
          className={`flex items-center gap-3 rounded-xl border border-slate-100 ${s.bg} px-4 py-3.5 shadow-sm`}
        >
          <div className={`${s.color} flex-shrink-0`}>{s.icon}</div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {s.label}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black leading-none ${s.color}`}>{s.value}</span>
              <span className="truncate text-[11px] text-slate-400">{s.sub}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
