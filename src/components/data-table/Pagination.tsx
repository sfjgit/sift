// File: Pagination.tsx
// Path: src/components/data-table/Pagination.tsx

'use client';

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { Segmented } from '@/components/ui/segmented';
import { PAGE_SIZES } from './useTableState';

export type PagingMode = 'scroll' | 'pages';

export function Pagination({
  meta,
  page,
  limit,
  onPage,
  onLimit,
  selected,
  mode = 'pages',
  onMode,
  shown,
}: {
  meta?: PageMeta;
  page: number;
  limit: number;
  onPage: (p: number) => void;
  onLimit: (l: number) => void;
  selected?: number;
  /** scroll: rows keep loading as you scroll; pages: one page at a time */
  mode?: PagingMode;
  onMode?: (m: PagingMode) => void;
  /** scroll mode: rows on screen so far */
  shown?: number;
}) {
  const total = meta?.total ?? 0;
  const pages = Math.max(1, meta?.pages ?? 1);
  const from = total ? (page - 1) * limit + 1 : 0;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        <span className="tabular">
          {total && mode === 'scroll' ? (
            <>
              Showing <span className="font-medium text-foreground">{fmtNumber(shown ?? 0)}</span>{' '}
              of <span className="font-medium text-foreground">{fmtNumber(total)}</span>
              {(shown ?? 0) < total && ' · scroll down for more'}
            </>
          ) : total ? (
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
        {onMode && (
          <Segmented<PagingMode>
            size="xs"
            value={mode}
            onChange={onMode}
            options={[
              { value: 'scroll', label: 'Scroll', title: 'Keep loading rows as you scroll' },
              { value: 'pages', label: 'Pages', title: 'One page at a time' },
            ]}
          />
        )}
        <div className="hidden items-center gap-2 sm:flex">
          <span>{mode === 'scroll' ? 'Load' : 'Rows'}</span>
          <Select value={String(limit)} onValueChange={v => onLimit(Number(v))}>
            <SelectTrigger size="sm" className="h-7 w-[78px]">
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
        {mode === 'pages' && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

/** the same controls, folded into one small toolbar button (full-screen list tables):
 *  "1–25 of 363" with ‹ › in page mode; the menu holds Scroll / Pages and rows */
export function PagingControl({
  meta,
  page,
  limit,
  onPage,
  onLimit,
  mode = 'scroll',
  onMode,
  shown,
}: {
  meta?: PageMeta;
  page: number;
  limit: number;
  onPage: (p: number) => void;
  onLimit: (l: number) => void;
  mode?: PagingMode;
  onMode?: (m: PagingMode) => void;
  shown?: number;
}) {
  const total = meta?.total ?? 0;
  const pages = Math.max(1, meta?.pages ?? 1);
  const from = total ? (page - 1) * limit + 1 : 0;
  const to = Math.min(page * limit, total);
  const label = !total
    ? 'No results'
    : mode === 'scroll'
      ? `${fmtNumber(shown ?? 0)} of ${fmtNumber(total)}`
      : `${fmtNumber(from)}–${fmtNumber(to)} of ${fmtNumber(total)}`;

  return (
    <div className="flex h-8 items-center rounded-md border bg-card text-[13px]">
      {mode === 'pages' && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-full rounded-r-none"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft />
        </Button>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-full items-center gap-1 px-2.5 font-medium whitespace-nowrap tabular hover:bg-muted"
            title="Rows shown — click for rows per page and scroll / pages"
          >
            {label}
            <ChevronDown className="size-3.5 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 space-y-3 p-3 text-[13px]">
          {onMode && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Loading</span>
              <Segmented<PagingMode>
                size="xs"
                value={mode}
                onChange={onMode}
                options={[
                  { value: 'scroll', label: 'Scroll', title: 'Keep loading rows as you scroll' },
                  { value: 'pages', label: 'Pages', title: 'One page at a time' },
                ]}
              />
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">
              {mode === 'scroll' ? 'Rows per load' : 'Rows per page'}
            </span>
            <Select value={String(limit)} onValueChange={v => onLimit(Number(v))}>
              <SelectTrigger size="sm" className="h-7 w-[78px]">
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
          {mode === 'pages' && pages > 1 && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground tabular">
                Page {page} of {pages}
              </span>
              <span className="flex gap-1">
                <Button variant="outline" size="xs" disabled={page <= 1} onClick={() => onPage(1)}>
                  First
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  disabled={page >= pages}
                  onClick={() => onPage(pages)}
                >
                  Last
                </Button>
              </span>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {mode === 'pages' && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-full rounded-l-none"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight />
        </Button>
      )}
    </div>
  );
}
