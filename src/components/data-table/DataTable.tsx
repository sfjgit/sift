// File: DataTable.tsx
// Path: src/components/data-table/DataTable.tsx
//
// The one table used everywhere. Server-side paging / sort / filters, saved
// views, column chooser (show / hide / reorder), density, row selection with
// a bulk-action bar, CSV/Excel export (page or every matching row), sticky
// header + first column, URL-synced state, "/" focuses search.
//
// Usage:
//   const table = useTableState('clients', FILTERS.map(f => f.key), { sort: { id: 'createdAt', desc: true } });
//   const q = clientHooks.useList(table.params);
//   <DataTable id="clients" table={table} query={q} columns={columns} filters={FILTERS} rowHref={r => `/clients/${r.id}`} />

'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnOrderState,
  type RowSelectionState,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/common/states';
import { tourTarget } from '@/features/tour/tour.constants';
import { cn } from '@/lib/utils';
import type { ListParams, Paginated } from '@/types/api';
import { ColumnsMenu } from './ColumnsMenu';
import { downloadRecords, rowsToRecords, type ExportFormat } from './exporter';
import { FilterButton, FilterChips } from './FilterBar';
import { Pagination } from './Pagination';
import { ViewsMenu } from './ViewsMenu';
import type { DataColumn, FilterDef } from './types';
import type { TableController } from './useTableState';

interface QueryLike<T> {
  data?: Paginated<T>;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => unknown;
}

export interface DataTableProps<T> {
  /** module key: saved views + column prefs ("clients", "spocs"…) */
  id: string;
  table: TableController;
  query: QueryLike<T>;
  columns: DataColumn<T>[];
  filters?: FilterDef[];
  getRowId?: (row: T) => string;
  rowHref?: (row: T) => string;
  onRowClick?: (row: T) => void;
  searchPlaceholder?: string;
  /** false when the endpoint has no free-text search */
  searchable?: boolean;
  /** Rendered in the floating bar when rows are selected */
  bulkActions?: (rows: T[], clear: () => void) => ReactNode;
  toolbar?: ReactNode;
  /** Enables "export all matching rows" */
  fetchAll?: (params: ListParams) => Promise<T[]>;
  exportName?: string;
  empty?: { title: string; description?: ReactNode; action?: ReactNode };
  savedViews?: boolean;
  /** Minimal chrome for embedded tables (detail tabs) */
  embedded?: boolean;
  className?: string;
}

const selectColumn = <T,>(): DataColumn<T> => ({
  id: '__select',
  size: 36,
  enableHiding: false,
  meta: { locked: true, sticky: true, label: 'Select' },
  header: ({ table }) => (
    <Checkbox
      aria-label="Select all on page"
      checked={
        table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')
      }
      onCheckedChange={v => table.toggleAllPageRowsSelected(!!v)}
    />
  ),
  cell: ({ row }) => (
    <Checkbox
      aria-label="Select row"
      checked={row.getIsSelected()}
      onClick={e => e.stopPropagation()}
      onCheckedChange={v => row.toggleSelected(!!v)}
    />
  ),
});

export function DataTable<T>({
  id,
  table: controller,
  query,
  columns,
  filters = [],
  getRowId = (r: T) => (r as { id: string }).id,
  rowHref,
  onRowClick,
  searchPlaceholder = 'Search…',
  searchable = true,
  bulkActions,
  toolbar,
  fetchAll,
  exportName,
  empty,
  savedViews = true,
  embedded = false,
  className,
}: DataTableProps<T>) {
  const router = useRouter();
  const { state, actions } = controller;
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [selectedCache, setSelectedCache] = useState<Record<string, T>>({});
  const [searchDraft, setSearchDraft] = useState(state.search);
  const searchRef = useRef<HTMLInputElement>(null);

  // debounce search → state (and keep draft in sync when a view is applied)
  useEffect(() => setSearchDraft(state.search), [state.search]);
  useEffect(() => {
    if (searchDraft === state.search) return;
    const t = setTimeout(() => actions.setSearch(searchDraft.trim()), 300);
    return () => clearTimeout(t);
  }, [searchDraft, state.search, actions]);

  // "/" focuses search unless typing somewhere already
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (
        e.key !== '/' ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) ||
        el.isContentEditable
      )
        return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const rows = useMemo(() => query.data?.data ?? [], [query.data]);
  const allColumns = useMemo(
    () => (bulkActions ? [selectColumn<T>(), ...columns] : columns),
    [bulkActions, columns]
  );

  const defaultVisibility = useMemo(() => {
    const v: VisibilityState = {};
    for (const c of columns) {
      const cid = c.id ?? ('accessorKey' in c ? String(c.accessorKey) : '');
      if (c.meta?.defaultHidden) v[cid] = false;
    }
    return v;
  }, [columns]);

  const table = useReactTable({
    data: rows,
    columns: allColumns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    enableRowSelection: !!bulkActions,
    state: {
      rowSelection,
      columnVisibility: { ...defaultVisibility, ...state.columnVisibility },
      columnOrder: state.columnOrder.length
        ? ['__select', ...state.columnOrder.filter(c => c !== '__select')]
        : [],
    },
    onRowSelectionChange: updater => {
      const next = typeof updater === 'function' ? updater(rowSelection) : updater;
      setRowSelection(next);
      // remember selected rows across pages for bulk actions
      setSelectedCache(prev => {
        const out: Record<string, T> = {};
        for (const key of Object.keys(next)) {
          const row = rows.find(r => getRowId(r) === key) ?? prev[key];
          if (row) out[key] = row;
        }
        return out;
      });
    },
    onColumnVisibilityChange: updater => {
      const current = { ...defaultVisibility, ...state.columnVisibility };
      actions.setColumnVisibility(typeof updater === 'function' ? updater(current) : updater);
    },
    onColumnOrderChange: updater => {
      const current: ColumnOrderState = state.columnOrder;
      actions.setColumnOrder(typeof updater === 'function' ? updater(current) : updater);
    },
  });

  const selectedRows = Object.values(selectedCache);
  const clearSelection = () => {
    setRowSelection({});
    setSelectedCache({});
  };

  const toggleSort = (sortKey: string) => {
    const s = state.sort;
    if (!s || s.id !== sortKey) actions.setSort({ id: sortKey, desc: false });
    else if (!s.desc) actions.setSort({ id: sortKey, desc: true });
    else actions.setSort(null);
  };

  const runExport = async (fmt: ExportFormat, all: boolean) => {
    const name = exportName ?? id;
    try {
      if (!all) {
        await downloadRecords(rowsToRecords(table, rows), name, fmt);
        return;
      }
      if (!fetchAll) return;
      const t = toast.loading('Preparing export…');
      const data = await fetchAll(controller.params);
      await downloadRecords(rowsToRecords(table, data), name, fmt);
      toast.success(`Exported ${data.length.toLocaleString('en-IN')} rows`, { id: t });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed');
    }
  };

  const open = (row: T, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a,button,[role=checkbox],[data-no-row-click]')) return;
    if (onRowClick) return onRowClick(row);
    if (!rowHref) return;
    const href = rowHref(row);
    if (e.metaKey || e.ctrlKey) window.open(href, '_blank');
    else router.push(href);
  };

  const compact = state.density === 'compact';
  const visibleCols = table.getVisibleLeafColumns();
  const hasFilters = Object.keys(state.filters).length > 0 || !!state.search;
  const firstDataCol = visibleCols.find(c => c.id !== '__select')?.id;

  return (
    <div className={cn('flex min-w-0 flex-col gap-3', className)}>
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {searchable && (
          <div className="relative w-full sm:w-72" {...tourTarget('table-search')}>
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={searchDraft}
              onChange={e => setSearchDraft(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 pr-14 pl-8"
            />
            <span className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
              {searchDraft ? (
                <button
                  type="button"
                  onClick={() => setSearchDraft('')}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              ) : (
                <Kbd>/</Kbd>
              )}
            </span>
          </div>
        )}
        {filters.length > 0 && <FilterButton filters={filters} table={controller} />}
        {savedViews && !embedded && <ViewsMenu module={id} controller={controller} />}
        <div className="ml-auto flex items-center gap-2">
          {toolbar}
          <ColumnsMenu table={table} controller={controller} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" {...tourTarget('table-export')}>
                <Download />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>This page ({rows.length})</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => void runExport('csv', false)}>
                <FileText /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void runExport('xlsx', false)}>
                <FileSpreadsheet /> Excel
              </DropdownMenuItem>
              {fetchAll && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>
                    All matching ({(query.data?.meta.total ?? 0).toLocaleString('en-IN')})
                  </DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => void runExport('csv', true)}>
                    <FileText /> CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => void runExport('xlsx', true)}>
                    <FileSpreadsheet /> Excel
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <FilterChips filters={filters} table={controller} />

      {/* grid */}
      <div className="relative overflow-hidden rounded-xl border bg-card shadow-card">
        {query.isFetching && !query.isLoading && (
          <div className="absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden bg-primary/10">
            <div className="h-full w-1/3 animate-[progress_1s_ease-in-out_infinite] bg-primary" />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full caption-bottom border-separate border-spacing-0 text-[13px]">
            <thead className="sticky top-0 z-10">
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(h => {
                    const meta = h.column.columnDef.meta;
                    const sortKey = meta?.sortKey;
                    const sorted =
                      sortKey && state.sort?.id === sortKey
                        ? state.sort.desc
                          ? 'desc'
                          : 'asc'
                        : null;
                    const sticky = meta?.sticky || h.column.id === firstDataCol;
                    return (
                      <th
                        key={h.id}
                        style={{
                          width: meta?.width ?? (h.column.id === '__select' ? 36 : undefined),
                        }}
                        className={cn(
                          'h-9 border-b bg-surface px-3 text-left text-xs font-medium whitespace-nowrap text-muted-foreground',
                          meta?.align === 'right' && 'text-right',
                          meta?.align === 'center' && 'text-center',
                          h.column.id === '__select' && 'w-9 px-0 pl-3',
                          sticky && 'sticky z-10',
                          h.column.id === '__select'
                            ? 'left-0'
                            : sticky && (bulkActions ? 'left-9' : 'left-0')
                        )}
                      >
                        {h.isPlaceholder ? null : sortKey ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(sortKey)}
                            className={cn(
                              '-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted hover:text-foreground',
                              sorted && 'text-foreground'
                            )}
                          >
                            {flexRender(h.column.columnDef.header, h.getContext())}
                            {sorted === 'asc' ? (
                              <ArrowUp className="size-3" />
                            ) : sorted === 'desc' ? (
                              <ArrowDown className="size-3" />
                            ) : (
                              <ArrowUpDown className="size-3 opacity-40" />
                            )}
                          </button>
                        ) : (
                          flexRender(h.column.columnDef.header, h.getContext())
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {query.isLoading &&
                Array.from({ length: Math.min(state.limit, 8) }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    {visibleCols.map(c => (
                      <td key={c.id} className={cn('border-b px-3', compact ? 'h-9' : 'h-12')}>
                        <Skeleton
                          className={cn(
                            'h-3.5',
                            c.id === '__select' ? 'w-4' : i % 2 ? 'w-24' : 'w-32'
                          )}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              {!query.isLoading &&
                table.getRowModel().rows.map((row, i) => (
                  <tr
                    key={row.id}
                    onClick={e => open(row.original, e)}
                    data-state={row.getIsSelected() ? 'selected' : undefined}
                    {...(i === 0 ? tourTarget('table-row') : {})}
                    className={cn(
                      'group/row transition-colors',
                      (rowHref || onRowClick) && 'cursor-pointer',
                      'hover:bg-accent/40 data-[state=selected]:bg-accent/60'
                    )}
                  >
                    {row.getVisibleCells().map(cell => {
                      const meta = cell.column.columnDef.meta;
                      const sticky = meta?.sticky || cell.column.id === firstDataCol;
                      return (
                        <td
                          key={cell.id}
                          className={cn(
                            'border-b px-3 align-middle group-last/row:border-b-0',
                            compact ? 'h-9 py-1' : 'h-12 py-2',
                            meta?.align === 'right' && 'text-right tabular',
                            meta?.align === 'center' && 'text-center',
                            cell.column.id === '__select' && 'w-9 px-0 pl-3',
                            sticky &&
                              'sticky z-[1] bg-card group-hover/row:bg-[color-mix(in_oklch,var(--card),var(--accent)_40%)] group-data-[state=selected]/row:bg-[color-mix(in_oklch,var(--card),var(--accent)_60%)]',
                            cell.column.id === '__select'
                              ? 'left-0'
                              : sticky && (bulkActions ? 'left-9' : 'left-0')
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {!query.isLoading && query.error ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : null}
        {!query.isLoading && !query.error && rows.length === 0 && (
          <EmptyState
            icon={hasFilters ? Search : undefined}
            title={
              hasFilters ? 'Nothing matches these filters' : (empty?.title ?? 'Nothing here yet')
            }
            description={
              hasFilters ? 'Try a different search or clear some filters.' : empty?.description
            }
            action={
              hasFilters ? (
                <Button variant="outline" size="sm" onClick={actions.clearFilters}>
                  Clear filters
                </Button>
              ) : (
                empty?.action
              )
            }
          />
        )}

        <Pagination
          meta={query.data?.meta}
          page={state.page}
          limit={state.limit}
          onPage={actions.setPage}
          onLimit={actions.setLimit}
          selected={selectedRows.length}
        />
      </div>

      {/* bulk bar */}
      {bulkActions && selectedRows.length > 0 && (
        <div
          {...tourTarget('table-bulk')}
          className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 animate-fade-up items-center gap-3 rounded-xl border bg-popover py-2 pr-2 pl-4 shadow-float"
        >
          <span className="text-sm font-medium whitespace-nowrap">
            {selectedRows.length} selected
          </span>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-1.5">
            {bulkActions(selectedRows, clearSelection)}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={clearSelection}
            aria-label="Clear selection"
          >
            <X />
          </Button>
        </div>
      )}
    </div>
  );
}
