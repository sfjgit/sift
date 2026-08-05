'use client';

// File: DataTable.tsx
// Path: src/components/reports/DataTable.tsx

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { AlertCircle } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// COLUMN MODEL
// Every column is data — nothing about the layout is hardcoded per table.
// `frozen` columns must be declared first and contiguously; their horizontal
// offsets are derived from their widths, never written by hand.
// ─────────────────────────────────────────────────────────────────────────────

export interface ColumnDef<T> {
  /** Stable id. Used as the localStorage key for visibility, so keep it stable. */
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
  /** Cannot be hidden and does not appear in the column picker. */
  locked?: boolean;
  /** Groups columns in the picker, e.g. 'Pipeline stages'. */
  group?: string;
  cell: (row: T, index: number) => ReactNode;
  /**
   * Plain value for local (client-side) exports. Columns without this — checkboxes,
   * chevrons, action buttons — are simply skipped when exporting.
   */
  exportValue?: (row: T, index: number) => string | number | boolean | null | undefined;
  /**
   * For cells that render several facts at once (name + email, code + title + client).
   * Takes precedence over `exportValue` and expands into one spreadsheet column each,
   * so the export can be granular without duplicating columns in the UI.
   */
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

/** A column is only hidable if it is neither locked nor frozen. */
export function hidableColumns<T>(columns: ColumnDef<T>[]) {
  return columns.filter(c => !c.locked && !c.frozen);
}

/**
 * Single source of truth for what is on screen. The exporter uses this too, so
 * "download this view" can never disagree with what the user is looking at.
 */
export function visibleColumns<T>(columns: ColumnDef<T>[], hidden: string[]) {
  return columns.filter(c => c.locked || c.frozen || !hidden.includes(c.id));
}

// ─────────────────────────────────────────────────────────────────────────────
// TABLE
// ─────────────────────────────────────────────────────────────────────────────

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Column ids to hide. Anything not listed here is visible — new columns default to on. */
  hiddenColumns?: string[];
  /**
   * Fill the parent flex column (the default). The scroll region takes whatever
   * height is left after the toolbar, so capping height belongs on the parent
   * card — no measuring, no scroll listeners.
   */
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
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  hiddenColumns = [],
  fill = true,
  maxHeight = 'calc(100vh - 340px)',
  minHeight = '200px',
  rowClassName,
  frozenBgClass,
  isExpanded,
  renderExpanded,
  emptyMessage = 'Nothing to show for these filters.',
}: DataTableProps<T>) {
  const visible = useMemo(() => visibleColumns(columns, hiddenColumns), [columns, hiddenColumns]);

  const { offsets, lastFrozenId } = useMemo(() => computeFrozenLayout(visible), [visible]);

  // Expanded rows span the whole (very wide) table, so their content is pinned to
  // the left edge of the viewport and sized to it — otherwise the details scroll away.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? 0;
      setViewportWidth(w);
    });
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
      'bg-slate-50 border-b border-slate-200 px-3 py-3 whitespace-nowrap',
      'text-[11px] font-bold uppercase tracking-widest text-slate-500',
      ALIGN[col.align ?? 'left'],
      col.frozen ? 'sticky z-40' : 'z-30',
      col.id === lastFrozenId ? `border-r border-slate-200 ${edgeShadow}` : '',
    ]
      .filter(Boolean)
      .join(' ');

  const bodyClass = (col: ColumnDef<T>, row: T, index: number) =>
    [
      'border-b border-slate-100 px-3 py-3',
      ALIGN[col.align ?? 'left'],
      col.frozen
        ? `sticky z-10 ${frozenBgClass?.(row, index) ?? 'bg-white group-hover:bg-slate-50'}`
        : '',
      col.id === lastFrozenId ? `border-r border-slate-200 ${edgeShadow}` : '',
    ]
      .filter(Boolean)
      .join(' ');

  return (
    <div className={`dt-wrap ${fill ? 'flex min-h-0 flex-1 flex-col' : ''}`}>
      <div
        ref={scrollRef}
        className={`dt-scroll overflow-auto overscroll-x-contain ${fill ? 'min-h-0 flex-1' : ''}`}
        style={fill ? undefined : { maxHeight, minHeight }}
      >
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-30">
            <tr>
              {visible.map(col => (
                <th
                  key={col.id}
                  scope="col"
                  className={headClass(col)}
                  style={styleFor(col)}
                  title={col.headerTitle ?? col.label}
                >
                  {col.header ?? (
                    <div
                      className={`flex flex-col gap-0.5 ${
                        (col.align ?? 'left') === 'center' ? 'items-center' : 'items-start'
                      }`}
                    >
                      {col.dotColor && (
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: col.dotColor }}
                        />
                      )}
                      <span className="block max-w-27.5 truncate">{col.label}</span>
                    </div>
                  )}
                </th>
              ))}
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
                    className={`group transition-colors ${
                      rowClassName?.(row, index) ?? 'hover:bg-slate-50'
                    }`}
                  >
                    {visible.map(col => (
                      <td key={col.id} className={bodyClass(col, row, index)} style={styleFor(col)}>
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
        </table>
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
