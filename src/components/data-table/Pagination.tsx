// File: Pagination.tsx
// Path: src/components/data-table/Pagination.tsx

'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fmtNumber } from '@/lib/format';
import type { PageMeta } from '@/types/api';
import { PAGE_SIZES } from './useTableState';

export function Pagination({
  meta,
  page,
  limit,
  onPage,
  onLimit,
  selected,
}: {
  meta?: PageMeta;
  page: number;
  limit: number;
  onPage: (p: number) => void;
  onLimit: (l: number) => void;
  selected?: number;
}) {
  const total = meta?.total ?? 0;
  const pages = Math.max(1, meta?.pages ?? 1);
  const from = total ? (page - 1) * limit + 1 : 0;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        <span className="tabular">
          {total ? (
            <>
              <span className="font-medium text-foreground">
                {fmtNumber(from)}–{fmtNumber(to)}
              </span>{' '}
              of <span className="font-medium text-foreground">{fmtNumber(total)}</span>
            </>
          ) : (
            'No results'
          )}
        </span>
        {!!selected && <span className="font-medium text-primary">{selected} selected</span>}
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 sm:flex">
          <span>Rows</span>
          <Select value={String(limit)} onValueChange={v => onLimit(Number(v))}>
            <SelectTrigger size="sm" className="h-7 w-[68px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map(s => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="tabular">
          Page {page} of {pages}
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={page <= 1}
            onClick={() => onPage(1)}
            aria-label="First page"
          >
            <ChevronsLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={page >= pages}
            onClick={() => onPage(page + 1)}
            aria-label="Next page"
          >
            <ChevronRight />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={page >= pages}
            onClick={() => onPage(pages)}
            aria-label="Last page"
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
