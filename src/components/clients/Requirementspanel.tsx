'use client';

import { Requirement } from '@/types/core.types';
import Link from 'next/link';

interface Props {
  requirements: Requirement[];
  clientId: string;
  canAdd: boolean;
}

const REQ_STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  ACTIVE: { label: 'Active', cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  DRAFT: { label: 'Draft', cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  PENDING_APPROVAL: {
    label: 'Pending Approval',
    cls: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-400',
  },
  ON_HOLD: { label: 'On Hold', cls: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
  CLOSED: { label: 'Closed', cls: 'bg-slate-100 text-slate-500', dot: 'bg-slate-300' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-100 text-red-600', dot: 'bg-red-400' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function RequirementsPanel({ requirements, clientId, canAdd }: Props) {
  if (requirements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-14">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#94A3B8"
          strokeWidth="1.5"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        <p className="mt-2 text-sm font-medium text-slate-400">No requirements yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Table header */}
      <div className="grid grid-cols-[1fr_140px_120px] border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        <span>Title</span>
        <span className="text-center">Status</span>
        <span className="text-right">Created</span>
      </div>

      <div className="divide-y divide-slate-100">
        {requirements.map((req, idx) => {
          const sc = REQ_STATUS[req.status] ?? REQ_STATUS.DRAFT;
          return (
            <Link
              key={req.id}
              href={`/requirements/${req.id}`}
              className="grid grid-cols-[1fr_140px_120px] items-center px-4 py-3 transition-colors hover:bg-slate-50/80 group"
            >
              {/* Title */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-500 group-hover:bg-[#0066CC]/10 group-hover:text-[#0066CC] transition-colors">
                  {idx + 1}
                </span>
                <span className="truncate text-sm font-medium text-slate-800 group-hover:text-[#0066CC] transition-colors">
                  {req.title}
                </span>
              </div>

              {/* Status */}
              <div className="flex justify-center">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${sc.cls}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                  {sc.label}
                </span>
              </div>

              {/* Date */}
              <div className="text-right">
                <span className="text-xs text-slate-400">{formatDate(req.createdAt)}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer summary */}
      <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
        <div className="flex flex-wrap gap-3">
          {Object.entries(
            requirements.reduce<Record<string, number>>((acc, r) => {
              acc[r.status] = (acc[r.status] ?? 0) + 1;
              return acc;
            }, {})
          ).map(([status, count]) => {
            const sc = REQ_STATUS[status] ?? REQ_STATUS.DRAFT;
            return (
              <span
                key={status}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${sc.cls}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                {count} {sc.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
