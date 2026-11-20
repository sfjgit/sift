// File: MobileCards.tsx
// Path: src/components/data-table/MobileCards.tsx
//
// Phones: the table's rows as cards — no sideways scrolling. The first shown
// column is the card's title, the next ones are label / value pairs (empty
// values skipped), "More fields" opens the rest. Same columns, same order,
// same "⋯" row actions and selection as the grid, so the column bar
// ("Fields on the cards") and saved templates work unchanged.

'use client';

import { useState, type MouseEvent, type ReactNode } from 'react';
import { flexRender, type Cell, type Table } from '@tanstack/react-table';
import { ChevronDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { RowActionsButton, menuItems, type RowMenu } from './RowMenu';

/** fields shown before "More fields" */
const FIRST_FIELDS = 6;

const isEmpty = (v: unknown) =>
  v == null || v === '' || (Array.isArray(v) && v.length === 0);

function label<T>(cell: Cell<T, unknown>) {
  const def = cell.column.columnDef;
  return def.meta?.label ?? (typeof def.header === 'string' ? def.header : cell.column.id);
}

export function MobileCards<T>({
  table,
  loading,
  rowMenu,
  rowLabel,
  onOpen,
  clickable,
  footer,
}: {
  table: Table<T>;
  loading: boolean;
  rowMenu?: RowMenu<T>;
  rowLabel?: (row: T) => string;
  onOpen: (row: T, e: MouseEvent) => void;
  clickable: boolean;
  /** "Loading more…" sentinel for scroll paging */
  footer?: ReactNode;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded(s => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  if (loading)
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-lg border bg-card p-3">
            <Skeleton className="h-4 w-2/3" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-14" />
            </div>
          </div>
        ))}
      </div>
    );

  return (
    <ul className="space-y-2 p-2">
      {table.getRowModel().rows.map(row => {
        const cells = row.getVisibleCells();
        const select = cells.find(c => c.column.id === '__select');
        const data = cells.filter(c => !c.column.id.startsWith('__'));
        const [head, ...rest] = data;
        const fields = rest.filter(c => !(c.column.accessorFn && isEmpty(c.getValue())));
        const open = expanded.has(row.id);
        const shown = open ? fields : fields.slice(0, FIRST_FIELDS);
        const items = menuItems(rowMenu, row.original);
        return (
          <li
            key={row.id}
            onClick={e => onOpen(row.original, e)}
            data-state={row.getIsSelected() ? 'selected' : undefined}
            className={cn(
              'rounded-lg border bg-card p-3 shadow-xs transition-colors',
              clickable && 'cursor-pointer active:bg-accent/50',
              'data-[state=selected]:border-primary/50 data-[state=selected]:bg-accent/40'
            )}
          >
            <div className="flex items-start gap-2">
              {select && (
                <div className="pt-0.5" data-no-row-click>
                  {flexRender(select.column.columnDef.cell, select.getContext())}
                </div>
              )}
              <div className="min-w-0 flex-1 text-[15px] leading-snug font-semibold [&_*]:whitespace-normal">
                {head && flexRender(head.column.columnDef.cell, head.getContext())}
              </div>
              <div className="-mt-1 -mr-1 shrink-0">
                <RowActionsButton
                  items={items}
                  label={rowLabel?.(row.original) ?? 'this row'}
                />
              </div>
            </div>
            {shown.length > 0 && (
              <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2.5">
                {shown.map(c => (
                  <div key={c.id} className="min-w-0">
                    <dt className="truncate text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      {label(c)}
                    </dt>
                    <dd className="mt-0.5 min-w-0 truncate text-[13.5px]">
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {fields.length > FIRST_FIELDS && (
              <button
                type="button"
                onClick={() => toggle(row.id)}
                className="mt-2 -mb-1 flex items-center gap-1 rounded py-1 text-[12.5px] font-medium text-primary"
              >
                {open ? 'Fewer fields' : `${fields.length - FIRST_FIELDS} more fields`}
                <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
              </button>
            )}
          </li>
        );
      })}
      {footer}
    </ul>
  );
}
