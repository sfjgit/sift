// File: DataTable.tsx
// Path: src/components/data-table/DataTable.tsx
//
// The one table used everywhere. Server-side paging / sort / filters, saved
// views, column chooser (show / hide / reorder), density, row selection with
// a bulk-action bar, CSV/Excel export (page or every matching row), sticky
// header + first column, URL-synced state, "/" focuses search.
// Full-page tables fit the screen: rows scroll inside the grid (header stays),
// and a second horizontal scrollbar sits on top of the grid. "Full screen"
// lifts toolbar + grid + paging over the whole window (Esc or Exit to leave).
//
// Usage:
//   const table = useTableState('clients', FILTERS.map(f => f.key), { sort: { id: 'createdAt', desc: true } });
//   const q = clientHooks.useList(table.params);
//   <DataTable id="clients" table={table} query={q} columns={columns} filters={FILTERS} rowHref={r => `/clients/${r.id}`} />

'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
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
  EyeOff,
  Download,
  FileSpreadsheet,
  FileText,
  Maximize2,
  Minimize2,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
  type LucideIcon,
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
import { ColumnBar, ColumnsButton, useColumnBar } from './ColumnsMenu';
import { downloadRecords, rowsToRecords, type ExportFormat, type ExportSheet } from './exporter';
import { FilterButton, FilterChips } from './FilterBar';
import { FilterPanel } from './FilterPanel';
import { FilterSheet } from './FilterSheet';
import { DragTh, HeaderDnd } from './HeaderDnd';
import { PageTitle } from '@/components/common/PageHeader';
import { Pagination, PagingControl, type PagingMode } from './Pagination';
import { ViewsMenu } from './ViewsMenu';
import type { DataColumn, FilterDef, GroupTone } from './types';
import { GROUP_BAND } from './groupTones';
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
  /** the page's name, shown first in the toolbar (no separate header row) */
  title?: ReactNode;
  /** what the page is for — shown when hovering the title */
  titleHint?: string;
  /** right after the title (the clients' CSR / B2G view switch) */
  titleAddon?: ReactNode;
  /** the page's main buttons (New client…), at the end of the toolbar */
  actions?: ReactNode;
  /** the column order everyone starts with (ids); others follow in definition order */
  defaultColumnOrder?: string[];
  /** a one-click button beside the select-all box: shows / hides these columns
   *  right after the first column (clients: Run all + Reports) */
  quickToggle?: { ids: string[]; label: string; icon: LucideIcon };
  /** admins arrange which roles may see which columns (every column, before
   *  the user's own role was applied) */
  columnAccess?: { table: string; columns: DataColumn<T>[] };
  /** extra sheets for Export, from the nested data behind the shown columns */
  exportSheets?: (rows: T[], shownColumnIds: string[]) => Promise<ExportSheet[]>;
  /** Enables "export all matching rows" */
  fetchAll?: (params: ListParams) => Promise<T[]>;
  exportName?: string;
  empty?: { title: string; description?: ReactNode; action?: ReactNode };
  savedViews?: boolean;
  /** Minimal chrome for embedded tables (detail tabs) */
  embedded?: boolean;
  /** Fit the grid to the screen and scroll rows inside it (default: not embedded) */
  fit?: boolean;
  /** "sheet" (default): spreadsheet look — single-line rows, grid lines, small caps
   * header, and blank grid rows down to the bottom of the screen */
  variant?: 'default' | 'sheet';
  /** every filter in a panel left of the grid (Zoho style); title like "Filter clients by" */
  filterPanel?: {
    title: string;
    /** first visit, before the user toggles it */ defaultOpen?: boolean;
  };
  className?: string;
}

const PANEL_KEY = (id: string) => `crm:filter-panel:${id}`;
const PAGING_KEY = (id: string) => `crm:paging:${id}`;

// spreadsheet colours: tinted header, banded rows, a clear hover (theme-aware)
const HEAD_BG = 'bg-[color-mix(in_oklch,var(--card),var(--primary)_10%)]';
const BAND_BG = 'bg-[color-mix(in_oklch,var(--card),var(--primary)_3.5%)]';
const HOVER_BG = 'hover:bg-[color-mix(in_oklch,var(--card),var(--primary)_9%)]';
const STICKY_HOVER =
  'group-hover/row:bg-[color-mix(in_oklch,var(--card),var(--primary)_9%)] group-data-[state=selected]/row:bg-[color-mix(in_oklch,var(--card),var(--accent)_60%)]';

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
  title,
  titleHint,
  titleAddon,
  quickToggle,
  columnAccess,
  actions: pageActions,
  defaultColumnOrder,
  exportSheets,
  fetchAll,
  exportName,
  empty,
  savedViews = true,
  embedded = false,
  fit = !embedded,
  variant = 'sheet',
  filterPanel,
  className,
}: DataTableProps<T>) {
  const router = useRouter();
  const { state, actions } = controller;
  // side panel closed unless the page opens it; the user's choice is remembered
  const [panelOpen, setPanelOpen] = useState(() => {
    if (!filterPanel || typeof window === 'undefined') return false;
    try {
      const v = localStorage.getItem(PANEL_KEY(id));
      return v === null ? !!filterPanel.defaultOpen : v === '1';
    } catch {
      return !!filterPanel.defaultOpen;
    }
  });
  const togglePanel = () =>
    setPanelOpen(o => {
      try {
        localStorage.setItem(PANEL_KEY(id), o ? '0' : '1');
      } catch {
        /* private mode — just not remembered */
      }
      return !o;
    });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [selectedCache, setSelectedCache] = useState<Record<string, T>>({});
  const [searchDraft, setSearchDraft] = useState(state.search);
  const searchRef = useRef<HTMLInputElement>(null);
  const [filterSheet, setFilterSheet] = useState<{ open: boolean; focus?: string | null }>({
    open: false,
  });
  const [full, setFull] = useState(false);
  // column chips under the toolbar: open by default on full-page tables
  const columnBar = useColumnBar(id);

  const barRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const topBarRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  // fitted tables: height of the whole box (grid + paging) and of the scrolling grid
  const [boxHeight, setBoxHeight] = useState<number>();
  const [gridHeight, setGridHeight] = useState(0);

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

  // "scroll" (default): pages load one after another as you scroll down and stay
  // on screen; "pages": the classic one page at a time. Remembered per table.
  const [paging, setPagingState] = useState<PagingMode>(() => {
    try {
      return localStorage.getItem(PAGING_KEY(id)) === 'pages' ? 'pages' : 'scroll';
    } catch {
      return 'scroll';
    }
  });
  const setPaging = (m: PagingMode) => {
    setPagingState(m);
    try {
      localStorage.setItem(PAGING_KEY(id), m);
    } catch {
      /* not remembered */
    }
    if (m === 'scroll') actions.setPage(1);
  };
  const scrollMode = paging === 'scroll';
  // a scroll list always starts at the top (an old ?page=3 link would leave a gap)
  const startedAtTop = useRef(false);
  useEffect(() => {
    if (startedAtTop.current) return;
    startedAtTop.current = true;
    if (scrollMode && state.page > 1) actions.setPage(1);
  }, [scrollMode, state.page, actions]);
  // everything but the page: when it changes, the loaded rows start over
  const baseKey = JSON.stringify({ ...controller.params, page: undefined });
  const [loaded, setLoaded] = useState<{ key: string; pages: Record<number, T[]> }>({
    key: '',
    pages: {},
  });
  useEffect(() => {
    const d = query.data;
    if (!d || query.isFetching || d.meta.page !== state.page) return;
    // one-time merge of the page that just arrived
    setLoaded(prev =>
      prev.key === baseKey
        ? { key: baseKey, pages: { ...prev.pages, [state.page]: d.data } }
        : { key: baseKey, pages: { [state.page]: d.data } }
    );
  }, [query.data, query.isFetching, state.page, baseKey]);
  const rows = useMemo(() => {
    const current = query.data?.data ?? [];
    if (!scrollMode || loaded.key !== baseKey) return current;
    const out: T[] = [];
    for (let p = 1; p <= state.page; p++) {
      const chunk = loaded.pages[p] ?? (p === state.page ? current : undefined);
      if (chunk) out.push(...chunk);
    }
    return out;
  }, [scrollMode, loaded, baseKey, state.page, query.data]);
  const totalPages = query.data?.meta.pages ?? 1;
  const moreToLoad = scrollMode && state.page < totalPages;
  // a row under the last one: when it scrolls into view, load the next page
  const sentinelRef = useRef<HTMLTableRowElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !moreToLoad) return;
    const io = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && !query.isFetching && loaded.pages[state.page])
          actions.setPage(state.page + 1);
      },
      { rootMargin: '300px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [moreToLoad, query.isFetching, loaded, state.page, actions]);

  const fits = fit || full;

  // fitted tables with a mouse: counts and paging sit in the toolbar
  // (PagingControl) instead of a footer, so the rows get the whole height
  const [finePointer, setFinePointer] = useState(false);
  useEffect(() => {
    // after mount: the server render has no window to ask

    setFinePointer(window.matchMedia('(pointer: fine)').matches);
  }, []);
  const autoFooter = fits && finePointer;
  // top scrollbar width + a box that ends exactly at the bottom of the screen
  // (only the page's / overlay's bottom padding stays below it)
  useEffect(() => {
    const el = gridRef.current;
    const card = el?.parentElement;
    if (!el || !card) return;
    const measure = () => {
      setScrollWidth(el.scrollWidth > el.clientWidth + 1 ? el.scrollWidth : 0);
      if (!fits) return;
      setGridHeight(el.clientHeight);
      const holder = full ? card.closest('[data-table-full]') : el.closest('main');
      const pad = holder ? parseFloat(getComputedStyle(holder).paddingBottom) || 0 : 0;
      const top = card.getBoundingClientRect().top + (full ? 0 : window.scrollY);
      setBoxHeight(Math.max(full ? 200 : 360, Math.floor(window.innerHeight - top - pad)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(card);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    ro.observe(document.body);
    if (barRef.current) ro.observe(barRef.current); // chips wrapping to a 2nd line move the grid
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [fits, full, columnBar.open]);

  // full screen: page behind stops scrolling; Esc leaves unless a menu/dialog is open
  useEffect(() => {
    if (!full) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('[role=dialog][data-state=open],[role=menu]')) return;
      setFull(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [full]);

  const syncScroll = (from: 'top' | 'grid') => {
    const a = from === 'top' ? topBarRef.current : gridRef.current;
    const b = from === 'top' ? gridRef.current : topBarRef.current;
    if (a && b && b.scrollLeft !== a.scrollLeft) b.scrollLeft = a.scrollLeft;
  };
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
        : defaultColumnOrder
          ? ['__select', ...defaultColumnOrder]
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
      // exactly the shown columns, in their order; nested data as extra sheets
      const shownIds = table.getVisibleLeafColumns().map(c => c.id);
      const extras = async (data: T[]) => (exportSheets ? exportSheets(data, shownIds) : []);
      if (!all) {
        await downloadRecords(rowsToRecords(table, rows), name, fmt, await extras(rows));
        return;
      }
      if (!fetchAll) return;
      const t = toast.loading('Preparing export…');
      const data = await fetchAll(controller.params);
      await downloadRecords(rowsToRecords(table, data), name, fmt, await extras(data));
      toast.success(`Exported ${data.length.toLocaleString('en-IN')} rows`, { id: t });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed');
    }
  };

  const open = (row: T, e: React.MouseEvent) => {
    // menus / dialogs / sheets opened from a cell render in a portal, but their
    // clicks still bubble here through React — only clicks inside the row count
    if (!(e.currentTarget as HTMLElement).contains(e.target as Node)) return;
    if (
      (e.target as HTMLElement).closest(
        'a,button,input,label,[role=checkbox],[role=menuitem],[data-no-row-click]'
      )
    )
      return;
    if (onRowClick) return onRowClick(row);
    if (!rowHref) return;
    const href = rowHref(row);
    if (e.metaKey || e.ctrlKey) window.open(href, '_blank');
    else router.push(href);
  };

  const compact = state.density === 'compact';
  const sheet = variant === 'sheet';
  // sheet rows are h-10; how many blank rows reach the bottom of the grid
  const rowPx =
    typeof window === 'undefined'
      ? 36
      : 2.5 * parseFloat(getComputedStyle(document.documentElement).fontSize || '16');
  const fillerRows =
    sheet && fits && gridHeight && !query.isLoading && rows.length > 0
      ? Math.max(0, Math.floor((gridHeight - rowPx * (rows.length + 1)) / rowPx))
      : 0;
  const hasRows = rows.length > 0 || query.isLoading;
  const visibleCols = table.getVisibleLeafColumns();
  const hasFilters = Object.keys(state.filters).length > 0 || !!state.search;
  const firstDataCol = visibleCols.find(c => c.id !== '__select')?.id;
  // group bands over the headers: runs of neighbouring columns of one group
  const groupBands = visibleCols.some(c => c.columnDef.meta?.group)
    ? visibleCols.reduce<{ label: string; tone: GroupTone; span: number }[]>((out, c) => {
        const label = c.columnDef.meta?.group ?? '';
        const last = out[out.length - 1];
        if (last && last.label === label) last.span += 1;
        else out.push({ label, tone: c.columnDef.meta?.groupTone ?? 'slate', span: 1 });
        return out;
      }, [])
    : null;
  // the quick button beside select-all: those columns on / off, next to the first column
  const quickIds = (quickToggle?.ids ?? []).filter(i => table.getColumn(i));
  const quickOn = quickIds.length > 0 && quickIds.every(i => table.getColumn(i)?.getIsVisible());
  const toggleQuick = () => {
    if (quickOn) {
      table.setColumnVisibility(v => ({ ...v, ...Object.fromEntries(quickIds.map(i => [i, false])) }));
      return;
    }
    const order = table
      .getAllLeafColumns()
      .map(c => c.id)
      .filter(i => i !== '__select' && !quickIds.includes(i));
    order.splice(order.indexOf(firstDataCol ?? '') + 1, 0, ...quickIds);
    actions.setColumnOrder(order);
    table.setColumnVisibility(v => ({ ...v, ...Object.fromEntries(quickIds.map(i => [i, true])) }));
  };
  // the select column is wider when it carries the quick button
  const selW = quickToggle ? 'w-16' : 'w-9';
  const afterSel = quickToggle ? 'left-16' : 'left-9';

  // headers that stay put: select box, ⋯, locked columns (the first one)
  const fixedCols = new Set(
    table
      .getAllLeafColumns()
      .filter(c => c.id === '__select' || c.id === '__actions' || c.columnDef.meta?.locked)
      .map(c => c.id)
  );
  const moveColumn = (from: string, to: string) => {
    const ids = table.getAllLeafColumns().map(c => c.id);
    const next = [...ids];
    next.splice(ids.indexOf(from), 1);
    next.splice(ids.indexOf(to), 0, from);
    actions.setColumnOrder(next.filter(c => c !== '__select'));
  };

  const body = (
    <div
      data-table-full={full || undefined}
      className={cn(
        'flex min-w-0 flex-col',
        full ? 'fixed inset-0 z-50 gap-2 bg-background p-3' : cn('gap-3', className)
      )}
    >
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {title && <PageTitle hint={titleHint}>{title}</PageTitle>}
        {titleAddon}
        {filterPanel && filters.length > 0 && (
          <Button
            variant={panelOpen ? 'secondary' : 'outline'}
            size="sm"
            onClick={togglePanel}
            aria-pressed={panelOpen}
            title={panelOpen ? 'Hide the filter panel' : 'Show the filter panel'}
          >
            {panelOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
            <span className="hidden sm:inline">Filter panel</span>
          </Button>
        )}
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
        {filters.length > 0 && (
          <FilterButton
            filters={filters}
            table={controller}
            onOpen={() => setFilterSheet({ open: true })}
          />
        )}
        {savedViews && !embedded && <ViewsMenu module={id} controller={controller} />}
        <div className="ml-auto flex items-center gap-2">
          {toolbar}
          {autoFooter && (
            <PagingControl
              meta={query.data?.meta}
              page={state.page}
              limit={state.limit}
              onPage={actions.setPage}
              onLimit={actions.setLimit}
              mode={paging}
              onMode={setPaging}
              shown={rows.length}
            />
          )}
          <ColumnsButton open={columnBar.open} onToggle={columnBar.toggle} />
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
          {full ? (
            <Button size="sm" onClick={() => setFull(false)} title="Back to the page (Esc)">
              <Minimize2 /> Exit full screen
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFull(true)}
              title="Use the whole screen for this table"
            >
              <Maximize2 />
              <span className="hidden sm:inline">Full screen</span>
            </Button>
          )}
          {pageActions}
        </div>
      </div>

      {columnBar.open && (
        <div ref={barRef}>
          <ColumnBar
            table={table}
            controller={controller}
            tableId={id}
            canSaveTemplate={savedViews && !embedded}
            onClose={() => columnBar.set(false)}
            access={columnAccess}
          />
        </div>
      )}

      <div className="flex min-w-0 items-start gap-4">
        {filterPanel && panelOpen && filters.length > 0 && (
          // fitted: same height as the table box beside it
          <div
            className="hidden shrink-0 lg:flex"
            style={fits && boxHeight ? { height: boxHeight } : undefined}
          >
            <FilterPanel
              module={id}
              title={filterPanel.title}
              filters={filters}
              table={controller}
              className={cn('min-h-[26rem]', !fits && 'max-h-[calc(100vh-16rem)]')}
            />
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <FilterChips
            filters={filters}
            table={controller}
            onOpen={key => setFilterSheet({ open: true, focus: key })}
          />
          {filters.length > 0 && (
            <FilterSheet
              filters={filters}
              table={controller}
              open={filterSheet.open}
              focusKey={filterSheet.focus}
              onOpenChange={open => setFilterSheet(s => ({ ...s, open }))}
            />
          )}

          {/* grid */}
          <div
            className={cn(
              'relative flex flex-col overflow-hidden border bg-card',
              sheet ? 'rounded-md' : 'rounded-xl shadow-card'
            )}
            style={fits && boxHeight ? { height: boxHeight } : undefined}
          >
            {/* always on the right edge: open the column bar / hide it — no scrolling to find it */}
            <div className="absolute top-1/2 right-0 z-30 flex -translate-y-1/2 flex-col overflow-hidden rounded-l-md text-[12px] font-medium text-primary-foreground shadow-md">
              <button
                type="button"
                onClick={() => columnBar.set(true)}
                className="flex flex-col items-center gap-1 bg-primary px-1 py-2.5 opacity-85 hover:opacity-100"
                title="Show more columns, hide or move them"
              >
                <Plus className="size-3.5" />
                <span className="[writing-mode:vertical-rl]">Columns</span>
              </button>
              {columnBar.open && (
                <button
                  type="button"
                  onClick={() => columnBar.set(false)}
                  className="flex flex-col items-center gap-1 border-t border-white/25 bg-foreground/80 px-1 py-2.5 hover:bg-foreground"
                  title="Hide the column bar"
                >
                  <EyeOff className="size-3.5" />
                  <span className="[writing-mode:vertical-rl]">Hide</span>
                </button>
              )}
            </div>
            {query.isFetching && !query.isLoading && (
              <div className="absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden bg-primary/10">
                <div className="h-full w-1/3 animate-[progress_1s_ease-in-out_infinite] bg-primary" />
              </div>
            )}
            {scrollWidth > 0 && (
              <div
                ref={topBarRef}
                onScroll={() => syncScroll('top')}
                className="overflow-x-auto overflow-y-hidden border-b bg-surface"
                aria-hidden
              >
                <div style={{ width: scrollWidth, height: 1 }} />
              </div>
            )}
            <div
              ref={gridRef}
              onScroll={() => syncScroll('grid')}
              // fitted tables: the grid takes whatever height the box has left
              className={cn(
                'overflow-auto overscroll-x-contain',
                fits && (hasRows ? 'min-h-0 flex-1' : 'shrink-0')
              )}
            >
              <HeaderDnd
                ids={table.getHeaderGroups()[0]?.headers.map(h => h.column.id) ?? []}
                fixed={fixedCols}
                onMove={moveColumn}
              >
                <table
                  className={cn(
                    'w-full caption-bottom border-separate border-spacing-0',
                    sheet ? 'text-[14.5px]' : 'text-[14px]'
                  )}
                >
                  <thead className="sticky top-0 z-10">
                    {groupBands && (
                      <tr>
                        {groupBands.map((b, i) => (
                          <th
                            key={i}
                            colSpan={b.span}
                            className={cn(
                              'h-7 border-r border-b-2 px-3 text-left text-[11px] font-bold tracking-wider whitespace-nowrap uppercase last:border-r-0',
                              b.label ? GROUP_BAND[b.tone] : 'bg-card'
                            )}
                          >
                            {b.label}
                          </th>
                        ))}
                      </tr>
                    )}
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
                            <DragTh
                              key={h.id}
                              id={h.column.id}
                              draggable={!fixedCols.has(h.column.id)}
                              style={{
                                width: meta?.width ?? (h.column.id === '__select' ? (quickToggle ? 64 : 36) : undefined),
                              }}
                              className={cn(
                                'border-b text-left whitespace-nowrap',
                                sheet
                                  ? cn(
                                      'h-11 border-r border-b-2 border-b-primary/30 px-3 text-[13.5px] font-semibold text-[color-mix(in_oklch,var(--foreground),var(--primary)_40%)] last:border-r-0',
                                      HEAD_BG
                                    )
                                  : 'h-9 bg-surface px-3 text-xs font-medium text-muted-foreground',
                                meta?.align === 'right' && 'text-right',
                                meta?.align === 'center' && 'text-center',
                                h.column.id === '__select' && cn(selW, 'px-0 pl-3'),
                                sticky && 'sticky z-10',
                                h.column.id === '__select'
                                  ? 'left-0'
                                  : sticky && (bulkActions ? afterSel : 'left-0')
                              )}
                            >
                              {h.column.id === '__actions' ? (
                                <button
                                  type="button"
                                  onClick={columnBar.toggle}
                                  className="inline-flex items-center gap-0.5 rounded-md bg-primary px-1.5 py-0.5 text-[12px] font-medium text-primary-foreground hover:brightness-110"
                                  title={
                                    columnBar.open
                                      ? 'Hide the column bar'
                                      : 'Show more columns, hide or move them'
                                  }
                                >
                                  {columnBar.open ? (
                                    <EyeOff className="size-3" />
                                  ) : (
                                    <Plus className="size-3" />
                                  )}
                                  Columns
                                </button>
                              ) : h.column.id === '__select' && quickToggle ? (
                                <span className="flex items-center gap-1.5">
                                  {flexRender(h.column.columnDef.header, h.getContext())}
                                  <button
                                    type="button"
                                    onClick={toggleQuick}
                                    aria-pressed={quickOn}
                                    title={`${quickOn ? 'Hide' : 'Show'} ${quickToggle.label}`}
                                    aria-label={quickToggle.label}
                                    className={cn(
                                      'flex size-6 items-center justify-center rounded-md transition-colors',
                                      quickOn
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-primary hover:bg-primary/10'
                                    )}
                                  >
                                    <quickToggle.icon className="size-3.5" />
                                  </button>
                                </span>
                              ) : h.isPlaceholder ? null : sortKey ? (
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
                            </DragTh>
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
                            <td
                              key={c.id}
                              className={cn('border-b px-3', sheet || compact ? 'h-10' : 'h-12')}
                            >
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
                            sheet && i % 2 === 1 && BAND_BG,
                            sheet ? HOVER_BG : 'hover:bg-accent/40',
                            'data-[state=selected]:bg-accent/60'
                          )}
                        >
                          {row.getVisibleCells().map(cell => {
                            const meta = cell.column.columnDef.meta;
                            const sticky = meta?.sticky || cell.column.id === firstDataCol;
                            return (
                              <td
                                key={cell.id}
                                className={cn(
                                  'border-b align-middle group-last/row:border-b-0',
                                  sheet
                                    ? 'h-10 max-w-80 truncate border-r px-3 py-0 last:border-r-0'
                                    : cn('px-3', compact ? 'h-9 py-1' : 'h-12 py-2'),
                                  meta?.align === 'right' && 'text-right tabular',
                                  meta?.align === 'center' && 'text-center',
                                  cell.column.id === '__select' && cn(selW, 'px-0 pl-3'),
                                  sticky &&
                                    cn(
                                      'sticky z-[1] font-medium',
                                      sheet && i % 2 === 1 ? BAND_BG : 'bg-card',
                                      sheet
                                        ? STICKY_HOVER
                                        : 'group-hover/row:bg-[color-mix(in_oklch,var(--card),var(--accent)_40%)] group-data-[state=selected]/row:bg-[color-mix(in_oklch,var(--card),var(--accent)_60%)]'
                                    ),
                                  cell.column.id === '__select'
                                    ? 'left-0'
                                    : sticky && (bulkActions ? afterSel : 'left-0')
                                )}
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    {/* scroll mode: reaching this row loads the next page */}
                    {moreToLoad && !query.isLoading && (
                      <tr ref={sentinelRef} aria-hidden>
                        <td
                          colSpan={visibleCols.length}
                          className="h-10 border-b px-3 text-[13px] text-muted-foreground"
                        >
                          <span className="sticky left-3">
                            {query.isFetching ? 'Loading more…' : 'Scroll for more'}
                          </span>
                        </td>
                      </tr>
                    )}
                    {/* spreadsheet: empty grid rows fill the space under the data */}
                    {Array.from({ length: moreToLoad ? 0 : fillerRows }).map((_, i) => (
                      <tr key={`fill-${i}`} aria-hidden>
                        {visibleCols.map(c => (
                          <td key={c.id} className="h-10 border-r border-b last:border-r-0" />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </HeaderDnd>
            </div>

            {!query.isLoading && query.error ? (
              <div className={cn(fits && 'min-h-0 flex-1 overflow-auto')}>
                <ErrorState error={query.error} onRetry={() => query.refetch()} />
              </div>
            ) : null}
            {!query.isLoading && !query.error && rows.length === 0 && (
              <div className={cn(fits && 'min-h-0 flex-1 overflow-auto')}>
                <EmptyState
                  icon={hasFilters ? Search : undefined}
                  title={
                    hasFilters
                      ? 'Nothing matches these filters'
                      : (empty?.title ?? 'Nothing here yet')
                  }
                  description={
                    hasFilters
                      ? 'Try a different search or clear some filters.'
                      : empty?.description
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
              </div>
            )}

            {/* full-screen list tables carry this in the toolbar (PagingControl) */}
            {!autoFooter && (
              <Pagination
                meta={query.data?.meta}
                page={state.page}
                limit={state.limit}
                onPage={actions.setPage}
                onLimit={actions.setLimit}
                selected={selectedRows.length}
                mode={paging}
                onMode={setPaging}
                shown={rows.length}
              />
            )}
          </div>
        </div>
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

  return full ? createPortal(body, document.body) : body;
}
