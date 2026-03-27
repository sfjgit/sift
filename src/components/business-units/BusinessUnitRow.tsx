'use client';

import Link from 'next/link';
import { fmtDate } from '@/components/requirements/ui';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function BusinessUnitRow({ bu }: { bu: any }) {
  return (
    <Link
      href={`/dashboard/business-units/${bu.id}`}
      className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-all duration-150"
    >
      {/* Left */}
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{bu.name}</p>

        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
          <span>{fmtDate(bu.createdAt)}</span>

          {/* Parent indicator */}
          {bu.parentBUId && <span className="text-muted-foreground/50">• Child BU</span>}
        </p>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 shrink-0 ml-4">
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            bu.isActive
              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {bu.isActive ? 'active' : 'inactive'}
        </span>
      </div>
    </Link>
  );
}
