'use client';

// File: reportUi.tsx
// Path: src/components/reports/reportUi.tsx

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import {
  AlertCircle,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Download,
  Layers,
  Square,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { ColumnDef } from './DataTable';

// ─────────────────────────────────────────────────────────────────────────────
// TOKENS
// ─────────────────────────────────────────────────────────────────────────────

export const FUNNEL_COLORS = [
  '#4F46E5',
  '#7C3AED',
  '#2563EB',
  '#0891B2',
  '#059669',
  '#D97706',
  '#DC2626',
  '#DB2777',
  '#0284C7',
  '#16A34A',
  '#CA8A04',
  '#9333EA',
];

export const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  DRAFT: 'bg-slate-100 text-slate-500',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700',
  ON_HOLD: 'bg-orange-50 text-orange-700',
  CLOSED: 'bg-slate-100 text-slate-500',
  CANCELLED: 'bg-red-50 text-red-600',
  FILLED: 'bg-blue-50 text-blue-700',
  REMOVED: 'bg-slate-100 text-slate-500',
};

export function humanKey(k: string) {
  return k
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  try {
    return format(new Date(d), 'dd MMM yyyy');
  } catch {
    return '—';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

export function KPI({
  label,
  value,
  sub,
  color,
  trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  trend?: 'up' | 'down';
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          {label}
        </span>
        {color && <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
      </div>
      <span className="mt-1 text-3xl font-black leading-none text-slate-900">{value}</span>
      {sub && (
        <span
          className={`mt-0.5 flex items-center gap-1 text-xs font-semibold ${
            trend === 'up'
              ? 'text-emerald-600'
              : trend === 'down'
                ? 'text-red-500'
                : 'text-slate-400'
          }`}
        >
          {trend === 'up' && <TrendingUp className="h-3 w-3" />}
          {trend === 'down' && <TrendingDown className="h-3 w-3" />}
          {sub}
        </span>
      )}
    </div>
  );
}

export function Skel({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <Skeleton key={i} className="h-8 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function Empty({ msg }: { msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
      <AlertCircle className="h-10 w-10 opacity-30" />
      <p className="text-sm font-medium">{msg}</p>
    </div>
  );
}

export function Card({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-700">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export function MiniStat({ l, v, c = 'text-slate-800' }: { l: string; v: number; c?: string }) {
  return (
    <div className="flex flex-col">
      <span className={`text-lg font-black ${c}`}>{v}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{l}</span>
    </div>
  );
}

export function LinePill({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[12px] font-bold text-cyan-800">
      <Layers className="h-3.5 w-3.5" /> {name}
    </span>
  );
}

export function StageCell({ count, base, color }: { count: number; base: number; color: string }) {
  const pct = base > 0 ? Math.round((count / base) * 100) : 0;
  if (count <= 0) return <span className="text-xs text-slate-200">—</span>;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[14px] font-black" style={{ color }}>
        {count}
      </span>
      <span className="text-[10px] font-semibold text-slate-400">{pct}%</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANCHORED PANEL
// Dropdowns live inside StickyTableCard, which must clip (rounded corners +
// sticky), so an absolutely-positioned panel gets cut off. This portals to
// <body> and positions itself against the trigger with `fixed`, so no ancestor's
// overflow or z-index can touch it. It also flips upward when space is short.
// ─────────────────────────────────────────────────────────────────────────────

export function AnchoredPanel({
  anchorRef,
  open,
  onClose,
  width = 320,
  align = 'right',
  children,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  width?: number;
  align?: 'left' | 'right';
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    maxHeight: number;
    up: boolean;
  } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;

    const compute = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (!r) return;

      const gap = 8;
      const edge = 12;
      const below = window.innerHeight - r.bottom - gap - edge;
      const above = r.top - gap - edge;
      const up = below < 260 && above > below;

      setPos({
        top: up ? r.top - gap : r.bottom + gap,
        left:
          align === 'right'
            ? Math.min(Math.max(edge, r.right - width), window.innerWidth - width - edge)
            : Math.min(Math.max(edge, r.left), window.innerWidth - width - edge),
        maxHeight: Math.max(220, up ? above : below),
        up,
      });
    };

    compute();
    // `true` captures scroll from the table's own scroll container too.
    window.addEventListener('scroll', compute, true);
    window.addEventListener('resize', compute);
    return () => {
      window.removeEventListener('scroll', compute, true);
      window.removeEventListener('resize', compute);
    };
  }, [open, align, width, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open || !pos || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={panelRef}
      className="fixed z-[100] flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
      style={{
        top: pos.top,
        left: pos.left,
        width,
        maxHeight: pos.maxHeight,
        transform: pos.up ? 'translateY(-100%)' : undefined,
      }}
    >
      {children}
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOWNLOAD MENU
// Local = built in the browser from rows already loaded, visible columns only.
// Server = the existing endpoint, every column.
// ─────────────────────────────────────────────────────────────────────────────

function DownloadItem({
  label,
  hint,
  onClick,
  disabled,
}: {
  label: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <span className="text-[12px] font-semibold text-slate-700">{label}</span>
      <span className="text-[10px] text-slate-400">{hint}</span>
    </button>
  );
}

export function DownloadMenu({
  scopeLabel,
  rowCount,
  selectedCount,
  columnCount,
  onLocalAll,
  onLocalSelected,
  onServerAll,
  onServerSelected,
}: {
  scopeLabel: string;
  rowCount: number;
  selectedCount: number;
  columnCount: number;
  onLocalAll: () => void;
  onLocalSelected: () => void;
  onServerAll: () => void;
  onServerSelected: () => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const run = (fn: () => void) => () => {
    fn();
    setOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
          open
            ? 'border-indigo-600 bg-indigo-600 text-white'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        }`}
      >
        <Download className="h-3.5 w-3.5" /> Download
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      <AnchoredPanel anchorRef={triggerRef} open={open} onClose={() => setOpen(false)} width={290}>
        <div className="overflow-y-auto p-1.5">
          <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            This view · {columnCount} columns
          </p>
          <DownloadItem
            label={`All rows (${rowCount})`}
            hint="Built here, instantly — only the columns you can see"
            onClick={run(onLocalAll)}
            disabled={rowCount === 0}
          />
          <DownloadItem
            label={`Selected rows (${selectedCount})`}
            hint={selectedCount ? 'Your ticked rows, visible columns' : 'Tick some rows first'}
            onClick={run(onLocalSelected)}
            disabled={selectedCount === 0}
          />

          <div className="my-1 border-t border-slate-100" />

          <p className="px-2.5 pb-1 pt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Full export · every column
          </p>
          <DownloadItem
            label={`${scopeLabel} — all rows`}
            hint="Generated by the server, ignores column choices"
            onClick={run(onServerAll)}
          />
          <DownloadItem
            label={`Selected rows (${selectedCount})`}
            hint={selectedCount ? 'Server export, every column' : 'Tick some rows first'}
            onClick={run(onServerSelected)}
            disabled={selectedCount === 0}
          />
        </div>
      </AnchoredPanel>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STICKY TABLE CARD
// The card pins to the top of the scroll area, so KPIs and filters above it
// scroll away and the table takes the whole viewport. Height is capped here and
// the inner scroll region fills what is left (flex + min-h-0) — no JS measuring.
// ─────────────────────────────────────────────────────────────────────────────

export function StickyTableCard({
  children,
  /** Raise this if your dashboard shell has its own fixed top bar. */
  topOffset = 0,
  bottomGap = 16,
}: {
  children: ReactNode;
  topOffset?: number;
  bottomGap?: number;
}) {
  return (
    <div
      className="sticky z-20 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      style={{ top: topOffset, maxHeight: `calc(100vh - ${topOffset + bottomGap}px)` }}
    >
      {children}
    </div>
  );
}

export function GroupHeader({
  title,
  count,
  countLabel,
  leftSlot,
  rightSlot,
}: {
  title: string | null;
  count: number;
  countLabel: string;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
      {title ? (
        <LinePill name={title} />
      ) : (
        <span className="text-sm font-bold text-slate-700">All</span>
      )}
      <span className="text-[12px] font-semibold text-slate-500">
        {count} {countLabel}
      </span>
      {leftSlot}
      <div className="ml-auto flex items-center gap-2">{rightSlot}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SELECTION
// ─────────────────────────────────────────────────────────────────────────────

export function useSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setSelected(p => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleAll = (ids: string[]) =>
    setSelected(p => (p.size === ids.length ? new Set() : new Set(ids)));
  const clear = () => setSelected(new Set());
  return { selected, toggle, toggleAll, clear };
}

export function useExpanded() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExp = (id: string) =>
    setExpanded(p => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  return { expanded, toggleExp };
}

// ─────────────────────────────────────────────────────────────────────────────
// COLUMN FACTORIES — the frozen block every report table shares
// ─────────────────────────────────────────────────────────────────────────────

export function makeSelectColumn<T>(
  getId: (row: T) => string,
  allIds: string[],
  selected: Set<string>,
  toggle: (id: string) => void,
  toggleAll: (ids: string[]) => void
): ColumnDef<T> {
  const allChecked = allIds.length > 0 && selected.size === allIds.length;
  return {
    id: '__select',
    label: 'Select',
    frozen: true,
    locked: true,
    width: 44,
    align: 'center',
    header: (
      <button
        onClick={() => toggleAll(allIds)}
        aria-label={allChecked ? 'Clear selection' : 'Select all rows'}
        className="text-slate-400 transition-colors hover:text-indigo-500"
      >
        {allChecked ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
      </button>
    ),
    cell: row => {
      const id = getId(row);
      const on = selected.has(id);
      return (
        <button
          onClick={() => toggle(id)}
          aria-label={on ? 'Deselect row' : 'Select row'}
          className="text-slate-300 transition-colors hover:text-indigo-500"
        >
          {on ? (
            <CheckSquare className="h-4 w-4 text-indigo-500" />
          ) : (
            <Square className="h-4 w-4" />
          )}
        </button>
      );
    },
  };
}

export function makeExpandColumn<T>(
  getId: (row: T) => string,
  expanded: Set<string>,
  toggleExp: (id: string) => void
): ColumnDef<T> {
  return {
    id: '__expand',
    label: 'Expand',
    frozen: true,
    locked: true,
    width: 36,
    align: 'center',
    header: <span className="sr-only">Expand</span>,
    cell: row => {
      const id = getId(row);
      const open = expanded.has(id);
      return (
        <button
          onClick={() => toggleExp(id)}
          aria-label={open ? 'Hide details' : 'Show details'}
          aria-expanded={open}
          className="text-slate-300 transition-colors hover:text-indigo-500"
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      );
    },
  };
}

/** Sr number. Row order comes from the API, so this is a display index only. */
export function makeSrColumn<T>(): ColumnDef<T> {
  return {
    id: '__sr',
    label: 'Sr',
    frozen: true,
    locked: true,
    width: 52,
    align: 'center',
    exportValue: (_row, index) => index + 1,
    cell: (_row, index) => (
      <span className="text-[12px] font-bold text-slate-400">{index + 1}</span>
    ),
  };
}
