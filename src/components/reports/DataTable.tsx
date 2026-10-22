'use client';

// File: DataTable.tsx
// Path: src/components/reports/DataTable.tsx
//
// Generic report table. Layout is data:
//   frozen columns  declared first, offsets derived from widths
//   hiddenColumns   ids to hide (new columns default to visible)
//   columnOrder     order of movable columns (frozen / locked never move)
//   onReorder       when given, headers become drag handles (dnd-kit)

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { AlertCircle, GripVertical } from 'lucide-react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─────────────────────────────────────────────────────────────────────────────
// COLUMN MODEL
// ─────────────────────────────────────────────────────────────────────────────

export interface ColumnDef<T> {
  /** Stable id. Used as the storage key for visibility + order, so keep it stable. */
  id: string;
  /** Plain-text label — shown in the header and in the column picker. */
  label: string;
  /** Optional custom header node (falls back to label + dot). */
  header?: ReactNode;
  /** Tooltip on the header cell. */
  headerTitle?: string;
  /** Small colour dot rendered above the label. */
  dotColor?: string;
  /** Pin this column to the left while scrolling horizontally. */
  frozen?: boolean;
  /** Fixed pixel width. Required for frozen columns (offsets are summed from it). */
  width?: number;
  align?: 'left' | 'center' | 'right';
  /** Cannot be hidden or moved and does not appear in the column picker. */
  locked?: boolean;
  /** Groups columns in the picker, e.g. 'Pipeline stages'. */
  group?: string;
  cell: (row: T, index: number) => ReactNode;
  /** Plain value for client-side exports. Columns without it are skipped. */
  exportValue?: (row: T, index: number) => string | number | boolean | null | undefined;
  /** Several facts in one cell → one spreadsheet column each. Wins over exportValue. */
  exportFields?: {
    label: string;
    value: (row: T, index: number) => string | number | boolean | null | undefined;
  }[];
}

const FALLBACK_FROZEN_WIDTH = 120;

const ALIGN: Record<NonNullable<ColumnDef<unknown>['align']>, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

/** Derives cumulative `left` offsets for the leading run of frozen columns. */
export function computeFrozenLayout<T>(columns: ColumnDef<T>[]) {
  const offsets = new Map<string, number>();
  let acc = 0;
  let lastFrozenId: string | null = null;
  for (const col of columns) {
    if (!col.frozen) break;
    offsets.set(col.id, acc);
    acc += col.width ?? FALLBACK_FROZEN_WIDTH;
    lastFrozenId = col.id;
  }
  return { offsets, lastFrozenId, frozenWidth: acc };
}

/** A column can be hidden / moved only if it is neither locked nor frozen. */
export function hidableColumns<T>(columns: ColumnDef<T>[]) {
  return columns.filter(c => !c.locked && !c.frozen);
}

/** Ids of the columns that can move, in their current order */
export function movableIds<T>(columns: ColumnDef<T>[]) {
  return hidableColumns(columns).map(c => c.id);
}

/**
 * Applies a saved order. Frozen / locked columns stay where they are (first);
 * movable ones follow the saved order; columns not in the order (new stages,
 * new fields) keep their natural position at the end — so nothing ever vanishes.
 */
export function orderColumns<T>(columns: ColumnDef<T>[], order: string[] = []) {
  if (!order.length) return columns;
  const fixed = columns.filter(c => c.frozen || c.locked);
  const free = hidableColumns(columns);
  const pos = new Map(order.map((id, i) => [id, i]));
  const known = free.filter(c => pos.has(c.id)).sort((a, b) => pos.get(a.id)! - pos.get(b.id)!);
  const fresh = free.filter(c => !pos.has(c.id));
  return [...fixed, ...known, ...fresh];
}

/** Single source of truth for what is on screen (exports use it too). */
export function visibleColumns<T>(columns: ColumnDef<T>[], hidden: string[]) {
  return columns.filter(c => c.locked || c.frozen || !hidden.includes(c.id));
}

// ─────────────────────────────────────────────────────────────────────────────
// SORTABLE HEADER CELL
// ─────────────────────────────────────────────────────────────────────────────

function SortableTh({
  id,
  className,
  style,
  title,
  children,
}: {
  id: string;
  className: string;
  style?: CSSProperties;
  title: string;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  return (
    <th
      ref={setNodeRef}
      scope="col"
      title={`${title}\nDrag to move this column`}
      className={`${className} group/th cursor-grab select-none active:cursor-grabbing ${isDragging ? 'z-50 bg-indigo-50 shadow-lg ring-2 ring-indigo-300' : ''}`}
      style={{
        ...style,
        transform: CSS.Translate.toString(transform),
        transition,
        position: style?.position ?? 'relative',
      }}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="absolute left-0.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-300 opacity-0 transition-opacity group-hover/th:opacity-100" />
      {children}
    </th>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TABLE
// ─────────────────────────────────────────────────────────────────────────────

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Column ids to hide. Anything not listed is visible — new columns default to on. */
  hiddenColumns?: string[];
  /** Order of movable columns (ids). Empty = natural order. */
  columnOrder?: string[];
  /** Enables drag-to-reorder on headers; receives the full new order of movable ids. */
  onReorder?: (ids: string[]) => void;
  /** Fill the parent flex column (the default). */
  fill?: boolean;
  /** Only used when `fill` is false. */
  maxHeight?: string;
  minHeight?: string;
  rowClassName?: (row: T, index: number) => string;
  /** Background applied to frozen cells so they stay opaque over scrolling content. */
  frozenBgClass?: (row: T, index: number) => string;
  isExpanded?: (row: T) => boolean;
  renderExpanded?: (row: T, index: number) => ReactNode;
  emptyMessage?: string;
  footerRow?: Record<string, number>;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  hiddenColumns = [],
  columnOrder = [],
  onReorder,
  fill = true,
  maxHeight = 'calc(100vh - 340px)',
  minHeight = '200px',
  rowClassName,
  frozenBgClass,
  isExpanded,
  renderExpanded,
  emptyMessage = 'Nothing to show for these filters.',
  footerRow,
}: DataTableProps<T>) {
  const ordered = useMemo(() => orderColumns(columns, columnOrder), [columns, columnOrder]);
  const visible = useMemo(() => visibleColumns(ordered, hiddenColumns), [ordered, hiddenColumns]);
  const { offsets, lastFrozenId } = useMemo(() => computeFrozenLayout(visible), [visible]);

  const sortableIds = useMemo(
    () => visible.filter(c => !c.frozen && !c.locked).map(c => c.id),
    [visible]
  );

  // A small move threshold keeps clicks on header buttons working
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (e: DragEndEvent) => {
    if (!onReorder || !e.over || e.active.id === e.over.id) return;
    // Reorder the FULL movable list (hidden columns keep their relative place)
    const ids = movableIds(ordered);
    const from = ids.indexOf(String(e.active.id));
    const to = ids.indexOf(String(e.over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(ids, from, to));
  };

  // Expanded rows are pinned to the viewport width so their content doesn't scroll away
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(entries => setViewportWidth(entries[0]?.contentRect.width ?? 0));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const styleFor = (col: ColumnDef<T>): CSSProperties | undefined => {
    const left = offsets.get(col.id);
    const style: CSSProperties = {};
    if (left !== undefined) style.left = left;
    if (col.width) {
      style.width = col.width;
      style.minWidth = col.width;
      style.maxWidth = col.width;
    }
    return Object.keys(style).length ? style : undefined;
  };

  const edgeShadow = 'shadow-[8px_0_10px_-8px_rgba(15,23,42,0.18)]';

  const headClass = (col: ColumnDef<T>) =>
    [
      'bg-slate-50 border-b border-r border-slate-400 px-3 py-3 whitespace-nowrap',
      'text-[11px] font-bold uppercase tracking-widest text-slate-900',
      ALIGN[col.align ?? 'left'],
      col.frozen ? 'sticky z-40' : 'z-30',
      col.id === lastFrozenId ? `border-r border-slate-200 ${edgeShadow}` : '',
    ]
      .filter(Boolean)
      .join(' ');

  const bodyClass = (col: ColumnDef<T>, row: T, index: number) =>
    [
      'border-b border-r border-slate-400 px-3 py-3',
      ALIGN[col.align ?? 'left'],
      col.frozen
        ? `sticky z-10 ${frozenBgClass?.(row, index) ?? 'bg-white group-hover:bg-slate-50'}`
        : '',
      col.id === lastFrozenId ? `border-r border-slate-200 ${edgeShadow}` : '',
    ]
      .filter(Boolean)
      .join(' ');

  // Utility columns with no numeric meaning in the footer
  const FOOTER_SKIP_IDS = new Set([
    '__select',
    '__expand',
    '__sr',
    '__select__',
    '__expand__',
    '__sr__',
  ]);

  const footClass = (col: ColumnDef<T>) =>
    [
      'border-t-2 border-slate-300 bg-slate-100 px-3 py-2.5',
      ALIGN[col.align ?? 'left'],
      col.frozen ? `sticky z-10 bg-slate-100` : '',
      col.id === lastFrozenId ? `border-r border-slate-200 ${edgeShadow}` : '',
    ]
      .filter(Boolean)
      .join(' ');

  const headerContent = (col: ColumnDef<T>) =>
    col.header ?? (
      <div
        className={`flex flex-col gap-0.5 ${(col.align ?? 'left') === 'center' ? 'items-center' : 'items-start'}`}
      >
        {col.dotColor && (
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: col.dotColor }} />
        )}
        <span className="block max-w-27.5 truncate">{col.label}</span>
      </div>
    );

  return (
    <div className={`dt-wrap ${fill ? 'flex min-h-0 flex-1 flex-col' : ''}`}>
      <div
        ref={scrollRef}
        className={`dt-scroll overflow-auto overscroll-x-contain ${fill ? 'min-h-0 flex-1' : ''}`}
        style={fill ? undefined : { maxHeight, minHeight }}
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-30">
              <tr>
                <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
                  {visible.map(col =>
                    onReorder && !col.frozen && !col.locked ? (
                      <SortableTh
                        key={col.id}
                        id={col.id}
                        className={headClass(col)}
                        style={styleFor(col)}
                        title={col.headerTitle ?? col.label}
                      >
                        {headerContent(col)}
                      </SortableTh>
                    ) : (
                      <th
                        key={col.id}
                        scope="col"
                        className={headClass(col)}
                        style={styleFor(col)}
                        title={col.headerTitle ?? col.label}
                      >
                        {headerContent(col)}
                      </th>
                    )
                  )}
                </SortableContext>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={visible.length} className="px-4 py-16">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <AlertCircle className="h-9 w-9 opacity-30" />
                      <p className="text-sm font-medium">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              )}

              {rows.map((row, index) => {
                const key = rowKey(row);
                const expanded = isExpanded?.(row) ?? false;
                return (
                  <Fragment key={key}>
                    <tr
                      className={`group transition-colors ${rowClassName?.(row, index) ?? 'hover:bg-slate-50'}`}
                    >
                      {visible.map(col => (
                        <td
                          key={col.id}
                          className={bodyClass(col, row, index)}
                          style={styleFor(col)}
                        >
                          {col.cell(row, index)}
                        </td>
                      ))}
                    </tr>

                    {expanded && renderExpanded && (
                      <tr className="bg-slate-50/60">
                        <td colSpan={visible.length} className="border-b border-slate-100 p-0">
                          <div
                            className="sticky left-0"
                            style={viewportWidth ? { width: viewportWidth } : undefined}
                          >
                            <div className="px-5 py-4">{renderExpanded(row, index)}</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>

            {footerRow && rows.length > 0 && (
              <tfoot>
                <tr>
                  {visible.map(col => {
                    if (FOOTER_SKIP_IDS.has(col.id))
                      return <td key={col.id} className={footClass(col)} style={styleFor(col)} />;

                    if (col.id === 'recruiter')
                      return (
                        <td key={col.id} className={footClass(col)} style={styleFor(col)}>
                          <span className="text-[12px] font-black uppercase tracking-widest text-slate-600">
                            Total
                          </span>
                        </td>
                      );

                    const val = footerRow[col.id];
                    return (
                      <td key={col.id} className={footClass(col)} style={styleFor(col)}>
                        {val != null && val > 0 ? (
                          <span className="text-[13px] font-black tabular-nums text-slate-800">
                            {val}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </DndContext>
      </div>

      <style jsx>{`
        .dt-scroll {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f1f5f9;
          scrollbar-gutter: stable;
        }
        .dt-scroll::-webkit-scrollbar {
          height: 12px;
          width: 12px;
        }
        .dt-scroll::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .dt-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border: 3px solid #f1f5f9;
          border-radius: 999px;
        }
        .dt-scroll::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .dt-scroll::-webkit-scrollbar-corner {
          background: #f1f5f9;
        }
      `}</style>
    </div>
  );
}
