// ─────────────────────────────────────────
// HANDLERS
// ─────────────────────────────────────────

import { ClientHandler, ClientTeamAssignment } from '@/types/core.types';

interface HandlersProps {
  handlers: ClientHandler[];
}

const HANDLER_ROLE = {
  PRIMARY: { cls: 'bg-[#0066CC]/10 text-[#0066CC]', label: 'Primary' },
  SECONDARY: { cls: 'bg-violet-100 text-violet-700', label: 'Secondary' },
  BACKUP: { cls: 'bg-amber-100 text-amber-700', label: 'Backup' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function HandlersPanel({ handlers }: HandlersProps) {
  if (handlers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-12">
        <p className="text-sm text-slate-400">No handlers assigned</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {handlers.map(h => {
        const rc = HANDLER_ROLE[h.role] ?? HANDLER_ROLE.BACKUP;
        return (
          <div
            key={h.id}
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm"
          >
            {/* Role badge */}
            <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${rc.cls}`}>{rc.label}</span>

            {/* User ID */}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                User ID
              </p>
              <p className="mt-0.5 font-mono text-sm text-slate-700 truncate">{h.userId}</p>
            </div>

            {/* Assigned date */}
            <div className="flex-shrink-0 text-right">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Assigned
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{formatDate(h.assignedAt)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────
// TEAM ASSIGNMENTS
// ─────────────────────────────────────────

interface TeamsProps {
  teamAssignments: ClientTeamAssignment[];
}

export function TeamsPanel({ teamAssignments }: TeamsProps) {
  if (teamAssignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-12">
        <p className="text-sm text-slate-400">No teams assigned</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {teamAssignments.map(ta => (
        <div
          key={ta.id}
          className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm"
        >
          {/* Team icon */}
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet-100">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#7C3AED"
              strokeWidth="2"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>

          {/* Team name */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800">{ta.team.name}</p>
            <p className="mt-0.5 font-mono text-xs text-slate-400 truncate">{ta.teamId}</p>
          </div>

          {/* Assigned date */}
          <div className="flex-shrink-0 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Assigned</p>
            <p className="mt-0.5 text-xs text-slate-500">{formatDate(ta.assignedAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
