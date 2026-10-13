// File: TablePagination.tsx
// Path: src/components/applicants/TablePagination.tsx

'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type PageItem = number | 'ellipsis';

const SIBLINGS = 1;

function getPageItems(page: number, totalPages: number): PageItem[] {
  const pages = new Set<number>([1, totalPages]);
  for (let p = page - SIBLINGS; p <= page + SIBLINGS; p++) {
    if (p >= 1 && p <= totalPages) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const items: PageItem[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) items.push('ellipsis');
    items.push(p);
  });
  return items;
}

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function TablePagination({ page, totalPages, onPageChange, className }: Props) {
  if (totalPages <= 1) return null;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        variant="ghost"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="text-muted-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> Previous
      </Button>

      {getPageItems(page, totalPages).map((item, i) =>
        item === 'ellipsis' ? (
          <span key={`ellipsis-${i}`} className="px-1 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <Button
            key={item}
            variant={item === page ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8 text-xs"
            aria-current={item === page ? 'page' : undefined}
            onClick={() => onPageChange(item)}
          >
            {String(item).padStart(2, '0')}
          </Button>
        )
      )}

      <Button
        variant="ghost"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}
