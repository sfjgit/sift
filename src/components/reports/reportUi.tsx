'use client';

// File: reportUi.tsx
// Path: src/components/reports/reportUi.tsx

import { useState, type ReactNode } from 'react';
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
// GROUP HEADER (table toolbar)
// ─────────────────────────────────────────────────────────────────────────────

export function GroupHeader({
  title,
  count,
  countLabel,
  selectedCount,
  onSelected,
  onAll,
  leftSlot,
  rightSlot,
}: {
  title: string | null;
  count: number;
  countLabel: string;
  selectedCount: number;
  onSelected: () => void;
  onAll: () => void;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
      {title ? (
        <LinePill name={title} />
      ) : (
        <span className="text-sm font-bold text-slate-700">All</span>
      )}
      <span className="text-[12px] font-semibold text-slate-500">
        {count} {countLabel}
      </span>
      {leftSlot}
      <div className="ml-auto flex items-center gap-2">
        {rightSlot}
        {selectedCount > 0 && (
          <button
            onClick={onSelected}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            <Download className="h-3.5 w-3.5" /> Download selected ({selectedCount})
          </button>
        )}
        <button
          onClick={onAll}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <Download className="h-3.5 w-3.5" /> Download {title ? 'line' : 'all'}
        </button>
      </div>
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
    cell: (_row, index) => (
      <span className="text-[12px] font-bold text-slate-400">{index + 1}</span>
    ),
  };
}
