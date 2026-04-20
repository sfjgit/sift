'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { statusBadge } from './Badges';

interface BUHeaderProps {
  id: string;
  name: string;
  isActive: boolean;
  parentBU: { id: string; name: string } | null;
  createdAt: string;
}

export function BUHeader({ name, isActive, parentBU, createdAt }: BUHeaderProps) {
  const formattedDate = new Date(createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <Link href="/business-units" className="hover:text-foreground transition-colors">
            Business Units
          </Link>
          {parentBU && (
            <>
              <ChevronRight className="w-3 h-3" />
              <Link
                href={`/business-units/${parentBU.id}`}
                className="hover:text-foreground transition-colors"
              >
                {parentBU.name}
              </Link>
            </>
          )}
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">{name}</span>
        </nav>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-foreground">{name}</h1>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
          {statusBadge(isActive ? 'active' : 'inactive')}
          <span className="text-border">·</span>
          <span>{parentBU ? `Under ${parentBU.name}` : 'Top-level unit'}</span>
          <span className="text-border">·</span>
          <span>Created {formattedDate}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Link
          href="edit"
          className="text-sm px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors"
        >
          Edit
        </Link>
        <Link
          href="teams/new"
          className="text-sm px-3 py-1.5 rounded-md bg-foreground text-background hover:opacity-90 transition-opacity"
        >
          + Add team
        </Link>
      </div>
    </div>
  );
}
