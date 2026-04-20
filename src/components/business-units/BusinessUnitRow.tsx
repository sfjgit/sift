'use client';

import Link from 'next/link';
import { fmtDate } from '@/components/requirements/ui';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function BusinessUnitRow({ bu }: { bu: any }) {
  return (
    <Link
      href={`/dashboard/business-units/${bu.id}`}
      className="grid grid-cols-[1fr_160px_80px] items-center px-4 py-3.5 bg-card hover:bg-muted/30 transition-colors duration-100"
    >
      {/* Name */}
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{bu.name}</p>
        {bu.parentBUId && <p className="text-xs text-muted-foreground mt-0.5">Child unit</p>}
      </div>

      {/* Created date */}
      <p className="text-sm text-muted-foreground">{fmtDate(bu.createdAt)}</p>

      {/* Status badge */}
      <div className="flex justify-end">
        <span
          className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${
            bu.isActive
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {bu.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
    </Link>
  );
}
