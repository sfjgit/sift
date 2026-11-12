// File: ColumnsMenu.tsx
// Path: src/components/data-table/ColumnsMenu.tsx
//
// The column bar, two halves:
//   • On screen — the shown columns in their order, numbered; drag one to move
//     it, × to hide it;
//   • Add columns — the hidden ones, grouped like the bands over the table
//     (Client, Demographics, Attachments…); click one and it is added at the END
//     of the shown ones, or "Add all" for a whole group.
// One search box filters both. Closed by default; opened from the toolbar's
// "Columns" button or the "+ Columns" button in the ⋯ column header.

'use client';

import { useState } from 'react';
import type { Table } from '@tanstack/react-table';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowLeft,
  Bookmark,
  Columns3,
  GripVertical,
  Info,
  Plus,
  Rows2,
  Rows4,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Segmented } from '@/components/ui/segmented';
import { tourTarget } from '@/features/tour/tour.constants';
import { usePermissions } from '@/features/auth/usePermissions';
import { ColumnAccessEditor, type AccessColumn } from '@/features/columnAccess/ColumnAccessEditor';
import { cn } from '@/lib/utils';
import type { TableController } from './useTableState';
import type { DataColumn, Density, GroupTone } from './types';
import { GROUP_DOT, GROUP_TEXT } from './groupTones';
import { SAVE_TEMPLATE_EVENT } from './ViewsMenu';

const BAR_KEY = (id: string) => `crm:column-bar:${id}`;
const SKIP = new Set(['__select', '__actions']);
// chips differ in width and wrap: the chip under the pointer wins, else the nearest
const underPointer: CollisionDetection = args => {
  const hits = pointerWithin(args);
  return hits.length ? hits : closestCenter(args);
};

/** the bar's open / closed state, remembered per table (closed at first) */
export function useColumnBar(id: string, defaultOpen = false) {
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return defaultOpen;
    try {
      const v = localStorage.getItem(BAR_KEY(id));
      return v === null ? defaultOpen : v === '1';
    } catch {
      return defaultOpen;
    }
  });
  const set = (next: boolean) => {
    setOpen(next);
    try {
      localStorage.setItem(BAR_KEY(id), next ? '1' : '0');
    } catch {
      /* private mode — just not remembered */
    }
  };
  return { open, set, toggle: () => set(!open) };
}

/** toolbar button: shows / hides the column bar */
export function ColumnsButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <Button
      variant={open ? 'secondary' : 'outline'}
      size="sm"
      onClick={onToggle}
      aria-pressed={open}
      title={open ? 'Hide the column chips' : 'Choose, hide and move columns'}
      {...tourTarget('table-columns')}
    >
      <Columns3 />
      <span className="hidden sm:inline">Columns</span>
    </Button>
  );
}

/** (i) — hover on a computer, tap on a phone */
function HowTo() {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="rounded-full p-0.5 text-muted-foreground hover:text-primary"
          aria-label="How the column chips work"
        >
          <Info className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-1.5 text-[13px] leading-snug">
        <p className="font-semibold">Choosing columns</p>
        <p>
          <b>On screen</b> lists the columns you see, in their order. <b>Drag</b> one to move that
          column; <b>×</b> hides it.
        </p>
        <p>
          <b>Add columns</b> lists the rest, grouped like the coloured bands over the table.
          <b> Click</b> one to add it at the end, or <b>Add all</b> for a whole group.
        </p>
        <p className="text-muted-foreground">
          Your layout is saved for you on this page and comes back next time — also what Export
          downloads. <b>Save as template</b> keeps it under a name.
        </p>
      </PopoverContent>
    </Popover>
  );
}

type Col = { id: string; label: string; full: string; group: string; tone: GroupTone };

// "Attachment: BRS Attachment" → "BRS Attachment" — the group dot already says it
const short = (label: string) => label.replace(/^(Attachment|Step|Technology|Document):\s*/, '');

// every cell the same size, in straight rows and columns
const GRID = 'grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-1.5';

function ShownChip({ col, index, onHide }: { col: Col; index: number; onHide: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: col.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'group/chip flex h-9 min-w-0 items-center rounded-lg border bg-card text-[13px] select-none',
        isDragging
          ? 'z-10 border-primary shadow-lg ring-2 ring-primary/25'
          : 'hover:border-primary/50 hover:bg-accent/40'
      )}
    >
      <span
        className="flex h-full min-w-0 flex-1 cursor-grab items-center gap-2 pl-1.5 active:cursor-grabbing"
        title={`${col.full} — drag to move`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5 shrink-0 text-muted-foreground/40 group-hover/chip:text-muted-foreground" />
        <span className="w-5 shrink-0 text-right text-[11px] text-muted-foreground tabular">
          {index}
        </span>
        <span className={cn('size-2 shrink-0 rounded-full', GROUP_DOT[col.tone])} aria-hidden />
        <span className="min-w-0 truncate font-medium">{col.label}</span>
      </span>
      <button
        type="button"
        onClick={onHide}
        className="mr-1 shrink-0 rounded p-1 text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive"
        aria-label={`Hide ${col.full}`}
        title="Hide this column"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

const toAccessColumn = <T,>(c: DataColumn<T>): AccessColumn | null => {
  const id = c.id ?? '';
  if (!id || SKIP.has(id) || c.meta?.locked) return null;
  return {
    id,
    label: c.meta?.label ?? id,
    group: c.meta?.group ?? 'Other',
    tone: c.meta?.groupTone ?? 'slate',
  };
};

export function ColumnBar<T>({
  table,
  controller,
  tableId,
  canSaveTemplate,
  onClose,
  access,
}: {
  table: Table<T>;
  controller: TableController;
  tableId: string;
  canSaveTemplate?: boolean;
  onClose: () => void;
  /** admins: who may see which column (every column of the table) */
  access?: { table: string; columns: DataColumn<T>[] };
}) {
  const { can } = usePermissions();
  const canManageAccess = !!access && can('roles.assign_permissions');
  const [mode, setMode] = useState<'mine' | 'access'>('mine');
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const [find, setFind] = useState('');

  const all = table.getAllLeafColumns().filter(c => !SKIP.has(c.id));
  const allIds = all.map(c => c.id);
  const toCol = (c: (typeof all)[number]): Col => {
    const full = c.columnDef.meta?.label ?? c.id;
    return {
      id: c.id,
      full,
      label: short(full),
      group: c.columnDef.meta?.group ?? 'Other',
      tone: c.columnDef.meta?.groupTone ?? 'slate',
    };
  };
  const locked = all.length - all.filter(c => !c.columnDef.meta?.locked).length;
  const free = all.filter(c => !c.columnDef.meta?.locked);
  const shownCols = free.filter(c => c.getIsVisible()).map(toCol);
  const q = find.trim().toLowerCase();
  const match = (c: Col) => !q || c.full.toLowerCase().includes(q);
  const hiddenIds = new Set(free.filter(c => !c.getIsVisible()).map(c => c.id));

  // hidden columns by group, in the order the groups first appear
  const groups: { name: string; tone: GroupTone; total: number; cols: Col[] }[] = [];
  for (const c of free.map(toCol)) {
    let g = groups.find(x => x.name === c.group);
    if (!g) groups.push((g = { name: c.group, tone: c.tone, total: 0, cols: [] }));
    g.total += 1;
    if (hiddenIds.has(c.id) && match(c)) g.cols.push(c);
  }
  const shownMatching = shownCols.filter(match);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    controller.actions.setColumnOrder(
      arrayMove(allIds, allIds.indexOf(String(active.id)), allIds.indexOf(String(over.id)))
    );
  };

  // added columns go right after the shown ones, in the order given
  const add = (ids: string[]) => {
    const visible = allIds.filter(id => table.getColumn(id)?.getIsVisible() && !ids.includes(id));
    const rest = allIds.filter(id => !visible.includes(id) && !ids.includes(id));
    controller.actions.setColumnOrder([...visible, ...ids, ...rest]);
    table.setColumnVisibility(v => ({ ...v, ...Object.fromEntries(ids.map(id => [id, true])) }));
  };

  const sectionTitle = 'text-[11.5px] font-semibold tracking-wider text-muted-foreground uppercase';

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-card">
      {/* header: title · search · layout actions */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-[color-mix(in_oklch,var(--card),var(--primary)_5%)] px-3 py-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          {mode === 'access' ? <ShieldCheck className="size-4" /> : <Columns3 className="size-4" />}
        </span>
        <span className="text-[14px] font-semibold">
          {mode === 'access' ? 'Column access by role' : 'Columns'}
        </span>
        {mode === 'mine' ? (
          <>
            <HowTo />
            <span className="rounded-full bg-card px-2 py-0.5 text-[12px] text-muted-foreground ring-1 ring-border tabular">
              {shownCols.length + locked} of {all.length} shown
            </span>
            <span className="relative ml-1">
              <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={find}
                onChange={e => setFind(e.target.value)}
                placeholder="Find a column…"
                className="h-8 w-48 rounded-md border bg-card pr-2 pl-7 text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                aria-label="Find a column"
              />
            </span>
          </>
        ) : (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11.5px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Admin
          </span>
        )}
        <span className="ml-auto flex flex-wrap items-center gap-1.5">
          {mode === 'mine' && (
            <>
              <Segmented<Density>
                size="xs"
                value={controller.state.density}
                onChange={controller.actions.setDensity}
                options={[
                  { value: 'compact', icon: Rows4, title: 'Compact rows' },
                  { value: 'comfortable', icon: Rows2, title: 'Comfortable rows' },
                ]}
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-[13px]"
                onClick={controller.actions.resetColumns}
                title="Back to the standard columns and order"
              >
                Reset
              </Button>
              {canSaveTemplate && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 bg-card text-[13px]"
                  onClick={() =>
                    window.dispatchEvent(new CustomEvent(SAVE_TEMPLATE_EVENT, { detail: tableId }))
                  }
                  title="Keep this layout (columns, order, filters, sort) under a name"
                >
                  <Bookmark /> Save as template
                </Button>
              )}
            </>
          )}
          {canManageAccess && (
            <Button
              variant={mode === 'access' ? 'secondary' : 'outline'}
              size="sm"
              className="h-8 bg-card text-[13px]"
              onClick={() => setMode(m => (m === 'access' ? 'mine' : 'access'))}
              title="Choose which roles may see which columns"
            >
              {mode === 'access' ? (
                <>
                  <ArrowLeft /> My columns
                </>
              ) : (
                <>
                  <ShieldCheck /> Column access
                </>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close the column bar"
            title="Close — the Columns button brings it back"
          >
            <X />
          </Button>
        </span>
      </div>

      {mode === 'access' && access ? (
        <ColumnAccessEditor
          table={access.table}
          columns={access.columns.map(toAccessColumn).filter((c): c is AccessColumn => !!c)}
        />
      ) : (
        <>
          {/* on screen: numbered, draggable */}
          <section className="border-b p-3">
            <h3 className={cn(sectionTitle, 'mb-2')}>
              On screen{' '}
              <span className="font-normal tracking-normal normal-case">
                · drag a cell to change the order, × to hide
              </span>
            </h3>
            <div className="max-h-56 overflow-y-auto pr-1">
              <DndContext sensors={sensors} collisionDetection={underPointer} onDragEnd={onDragEnd}>
                <SortableContext
                  items={shownMatching.map(c => c.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className={GRID}>
                    {shownMatching.map(c => (
                      <ShownChip
                        key={c.id}
                        col={c}
                        index={shownCols.indexOf(c) + 1 + locked}
                        onHide={() => table.getColumn(c.id)?.toggleVisibility(false)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              {!shownCols.length && (
                <p className="text-[13px] text-muted-foreground">
                  Only the first column is shown — add columns below.
                </p>
              )}
              {shownCols.length > 0 && !shownMatching.length && (
                <p className="text-[13px] text-muted-foreground">No shown column matches.</p>
              )}
            </div>
          </section>

          {/* add: grouped like the bands over the table */}
          <section className="bg-surface/60 p-3">
            <h3 className={cn(sectionTitle, 'mb-2')}>Add columns</h3>
            <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
              {groups
                .filter(g => g.cols.length)
                .map(g => (
                  <div key={g.name}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className={cn('size-2 rounded-full', GROUP_DOT[g.tone])} aria-hidden />
                      <span className={cn('text-[12.5px] font-semibold', GROUP_TEXT[g.tone])}>
                        {g.name}
                      </span>
                      <span className="text-[11.5px] text-muted-foreground tabular">
                        {g.total - g.cols.length} of {g.total} shown
                      </span>
                      {g.cols.length > 1 && (
                        <button
                          type="button"
                          onClick={() => add(g.cols.map(c => c.id))}
                          className="ml-auto text-[12px] font-medium text-primary hover:underline"
                        >
                          Add all
                        </button>
                      )}
                    </div>
                    <div className={GRID}>
                      {g.cols.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => add([c.id])}
                          title={`Add ${c.full} at the end`}
                          className="flex h-9 min-w-0 items-center gap-2 rounded-lg border border-dashed bg-card px-2.5 text-left text-[13px] text-foreground/80 transition-colors hover:border-solid hover:border-primary hover:bg-accent hover:text-accent-foreground"
                        >
                          <Plus className="size-3.5 shrink-0 opacity-60" />
                          <span className="min-w-0 truncate">{c.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              {!groups.some(g => g.cols.length) && (
                <p className="text-[13px] text-muted-foreground">
                  {q ? 'No hidden column matches.' : 'Every column is on screen.'}
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
