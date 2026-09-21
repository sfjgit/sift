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
    <div className="flex flex-col gap-1 rounded-xl border-2 border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-black uppercase tracking-widest text-slate-600">
          {label}
        </span>
        {color && <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />}
      </div>
      <span className="mt-1 text-4xl font-black leading-none text-slate-900">{value}</span>
      {sub && (
        <span
          className={`mt-1 flex items-center gap-1 text-[12px] font-bold ${trend === 'up' ? 'text-emerald-700' : trend === 'down' ? 'text-red-600' : 'text-slate-500'}`}
        >
          {trend === 'up' && <TrendingUp className="h-3.5 w-3.5" />}
          {trend === 'down' && <TrendingDown className="h-3.5 w-3.5" />}
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
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500">
      <AlertCircle className="h-10 w-10 opacity-40" />
      <p className="text-[14px] font-semibold">{msg}</p>
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
    <div className="rounded-xl border-2 border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[14px] font-black uppercase tracking-wider text-slate-800">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export function MiniStat({ l, v, c = 'text-slate-900' }: { l: string; v: number; c?: string }) {
  return (
    <div className="flex flex-col">
      <span className={`text-2xl font-black ${c}`}>{v}</span>
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{l}</span>
    </div>
  );
}

export function LinePill({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border-2 border-cyan-300 bg-cyan-50 px-3 py-1.5 text-[13px] font-black text-cyan-900">
      <Layers className="h-4 w-4" /> {name}
    </span>
  );
}

export function StageCell({ count, base, color }: { count: number; base: number; color: string }) {
  const pct = base > 0 ? Math.round((count / base) * 100) : 0;
  if (count <= 0) return <span className="text-sm font-bold text-slate-300">—</span>;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[16px] font-black" style={{ color }}>
        {count}
      </span>
      <span className="text-[11px] font-bold text-slate-500">{pct}%</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANCHORED PANEL — portals to body so table clip/sticky never cuts it off
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
      const gap = 8,
        edge = 12;
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
//
// Server-only. All downloads go through the controller — no local SheetJS.
// The "selected stage columns" concept is handled by the parent passing
// `selectedStageIds` which gets appended to the server URL as ?stageIds=...
//
// Layout:
//   ┌─ All rows          → server all  (full workbook, all candidates sheet)
//   ├─ Selected rows (N) → server selected ids
//   └─ [shown when stageIds] Filtered by N stages → server all + stageIds
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// CANDIDATE COLUMN REGISTRY (mirrors controller's ALL_CANDIDATE_COLS)
// Used by the column picker inside DownloadMenu.
// ─────────────────────────────────────────────────────────────────────────────

export const CANDIDATE_COL_DEFS = [
  // Requirement context
  { key: 'reqCode', label: 'Req Code', group: 'Requirement' },
  { key: 'reqTitle', label: 'Requirement', group: 'Requirement' },
  { key: 'totalPipeline', label: 'Total Pipeline', group: 'Requirement' },
  { key: 'client', label: 'Client', group: 'Requirement' },
  { key: 'spoc', label: 'Client SPOC', group: 'Requirement' },
  { key: 'spocEmail', label: 'SPOC Email', group: 'Requirement' },
  { key: 'spocDesig', label: 'SPOC Designation', group: 'Requirement' },
  { key: 'serviceLine', label: 'Service Line', group: 'Requirement' },
  { key: 'bu', label: 'Business Unit', group: 'Requirement' },
  // Candidate identity
  { key: 'name', label: 'Candidate Name', group: 'Candidate' },
  { key: 'email', label: 'Email', group: 'Candidate' },
  { key: 'phone', label: 'Phone', group: 'Candidate' },
  { key: 'title', label: 'Current Title', group: 'Candidate' },
  { key: 'company', label: 'Current Company', group: 'Candidate' },
  { key: 'exp', label: 'Exp (yrs)', group: 'Candidate' },
  { key: 'skills', label: 'Top Skills', group: 'Candidate' },
  // Pipeline state
  { key: 'recruiter', label: 'Recruiter', group: 'Pipeline' },
  { key: 'stage', label: 'Current Stage', group: 'Pipeline' },
  { key: 'disposition', label: 'Status', group: 'Pipeline' },
  { key: 'addedOn', label: 'Added On', group: 'Pipeline' },
  { key: 'pipelineDays', label: 'Days in Pipeline', group: 'Pipeline' },
  { key: 'aging', label: 'Stage Aging', group: 'Pipeline' },
  { key: 'submittedAt', label: 'Submitted At', group: 'Pipeline' },
  { key: 'offerStatus', label: 'Offer Status', group: 'Pipeline' },
  // CTC
  { key: 'currentCtc', label: 'Current CTC', group: 'CTC' },
  { key: 'expectedCtc', label: 'Expected CTC', group: 'CTC' },
  { key: 'negotiatedCtc', label: 'Negotiated CTC', group: 'CTC' },
  { key: 'offeredCtc', label: 'Offered CTC', group: 'CTC' },
  { key: 'currency', label: 'Currency', group: 'CTC' },
  { key: 'salaryType', label: 'Salary Type', group: 'CTC' },
  // Joining
  { key: 'noticePeriod', label: 'Notice Period', group: 'Joining' },
  { key: 'lwd', label: 'Last Working Day', group: 'Joining' },
  { key: 'expectedJoining', label: 'Expected Joining', group: 'Joining' },
  { key: 'actualJoining', label: 'Actual Joining', group: 'Joining' },
  { key: 'monthOfJoining', label: 'Month of Joining', group: 'Joining' },
  { key: 'daysToJoin', label: 'Days to Join', group: 'Joining' },
  // Flags
  { key: 'rejected', label: 'Rejected?', group: 'Flags' },
  { key: 'withdrawn', label: 'Withdrawn?', group: 'Flags' },
  { key: 'onHold', label: 'On Hold?', group: 'Flags' },
  // Audit
  { key: 'reqCreated', label: 'Req Created', group: 'Audit' },
  { key: 'reqDeleted', label: 'Req Deleted', group: 'Audit' },
] as const;

export type CandidateColKey = (typeof CANDIDATE_COL_DEFS)[number]['key'];

// Default hidden columns — the heavy/rarely-needed ones hidden by default
const DEFAULT_HIDDEN_CANDIDATE_COLS = new Set<CandidateColKey>([
  'spocEmail',
  'spocDesig',
  'currency',
  'salaryType',
  'rejected',
  'withdrawn',
  'onHold',
  'reqCreated',
  'reqDeleted',
]);

// ─────────────────────────────────────────────────────────────────────────────
// DOWNLOAD MENU
//
// Server-only export. Includes an inline Candidate Columns picker so the user
// controls exactly which columns appear in the Candidates sheet.
// Hidden candidate cols are sent as ?hiddenCandidateCols=key1,key2 to the server.
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
  selectedStageIds = [],
  onServerAll,
  onServerSelected,
  onServerStageFiltered,
}: {
  scopeLabel: string;
  rowCount: number;
  selectedCount: number;
  selectedStageIds?: string[];
  onServerAll: (hiddenCandidateCols: string[]) => void;
  onServerSelected: (hiddenCandidateCols: string[]) => void;
  onServerStageFiltered?: (hiddenCandidateCols: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [hiddenCols, setHiddenCols] = useState<Set<CandidateColKey>>(
    new Set(DEFAULT_HIDDEN_CANDIDATE_COLS)
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hasStages = selectedStageIds.length > 0;

  const toggleCol = (key: CandidateColKey) =>
    setHiddenCols(prev => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  const hiddenArr = [...hiddenCols];
  const visibleCount = CANDIDATE_COL_DEFS.length - hiddenCols.size;

  const run = (fn: () => void) => () => {
    fn();
    setOpen(false);
  };

  // Group cols for display
  const groups = Array.from(new Set(CANDIDATE_COL_DEFS.map(c => c.group)));

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${open ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
      >
        <Download className="h-3.5 w-3.5" /> Download
        <ChevronDown className="h-3 w-3 opacity-60" />
        {hasStages && (
          <span className="ml-1 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
            {selectedStageIds.length} stage{selectedStageIds.length > 1 ? 's' : ''}
          </span>
        )}
      </button>

      <AnchoredPanel
        anchorRef={triggerRef}
        open={open}
        onClose={() => {
          setOpen(false);
          setColPickerOpen(false);
        }}
        width={320}
      >
        <div className="flex min-h-0 flex-col overflow-hidden">
          {/* ── Export actions ── */}
          <div className="p-1.5">
            <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {scopeLabel} export
            </p>

            <DownloadItem
              label={`All rows (${rowCount})`}
              hint="Summary sheet + Candidates sheet with selected columns"
              onClick={run(() => onServerAll(hiddenArr))}
              disabled={rowCount === 0}
            />
            <DownloadItem
              label={`Selected rows (${selectedCount})`}
              hint={selectedCount ? 'Only ticked rows' : 'Tick some rows first'}
              onClick={run(() => onServerSelected(hiddenArr))}
              disabled={selectedCount === 0}
            />

            {hasStages && onServerStageFiltered && (
              <>
                <div className="my-1 border-t border-slate-100" />
                <DownloadItem
                  label={`${selectedStageIds.length} selected stage${selectedStageIds.length > 1 ? 's' : ''} only`}
                  hint="Candidates sheet shows only candidates in highlighted stages"
                  onClick={run(() => onServerStageFiltered(hiddenArr))}
                />
              </>
            )}
          </div>

          {/* ── Candidate columns picker ── */}
          <div className="border-t border-slate-200">
            <button
              onClick={() => setColPickerOpen(o => !o)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
            >
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-600">
                Candidate sheet columns
              </span>
              <span className="flex items-center gap-1.5">
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-black text-indigo-700">
                  {visibleCount}/{CANDIDATE_COL_DEFS.length}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-slate-400 transition-transform ${colPickerOpen ? 'rotate-180' : ''}`}
                />
              </span>
            </button>

            {colPickerOpen && (
              <div className="max-h-64 overflow-y-auto border-t border-slate-100 pb-2">
                {/* All / None quick actions */}
                <div className="flex items-center gap-1 px-3 py-1.5">
                  <button
                    onClick={() => setHiddenCols(new Set())}
                    className="rounded px-2 py-0.5 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    All
                  </button>
                  <button
                    onClick={() => setHiddenCols(new Set(CANDIDATE_COL_DEFS.map(c => c.key)))}
                    className="rounded px-2 py-0.5 text-[11px] font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    None
                  </button>
                  <button
                    onClick={() => setHiddenCols(new Set(DEFAULT_HIDDEN_CANDIDATE_COLS))}
                    className="rounded px-2 py-0.5 text-[11px] font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    Reset
                  </button>
                </div>

                {groups.map(group => (
                  <div key={group}>
                    <p className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {group}
                    </p>
                    {CANDIDATE_COL_DEFS.filter(c => c.group === group).map(col => {
                      const isVisible = !hiddenCols.has(col.key);
                      return (
                        <button
                          key={col.key}
                          onClick={() => toggleCol(col.key)}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50 transition-colors"
                        >
                          {isVisible ? (
                            <CheckSquare className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                          ) : (
                            <Square className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                          )}
                          <span
                            className={`text-[12px] font-semibold ${isVisible ? 'text-slate-800' : 'text-slate-400'}`}
                          >
                            {col.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </AnchoredPanel>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STICKY TABLE CARD
// ─────────────────────────────────────────────────────────────────────────────

export function StickyTableCard({
  children,
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
      style={{ top: topOffset, height: `calc(100vh - ${topOffset + bottomGap}px)` }}
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
    <div className="flex shrink-0 flex-wrap items-center gap-3 border-b-2 border-slate-200 bg-slate-50 px-4 py-3">
      {title ? (
        <LinePill name={title} />
      ) : (
        <span className="text-[14px] font-black text-slate-800">All</span>
      )}
      <span className="text-[13px] font-bold text-slate-600">
        {count} {countLabel}
      </span>
      {leftSlot}
      <div className="ml-auto flex items-center gap-2">{rightSlot}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SELECTION + EXPAND HOOKS
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
// STAGE SELECTION HOOK
// Tracks which stage columns the user has highlighted for export filtering.
// Lives here so both RecruiterTable and RequirementTable share the same logic.
// ─────────────────────────────────────────────────────────────────────────────

export function useStageSelection() {
  const [selectedStageIds, setSelectedStageIds] = useState<Set<string>>(new Set());
  const toggleStage = (stageId: string) =>
    setSelectedStageIds(p => {
      const n = new Set(p);
      if (n.has(stageId)) n.delete(stageId);
      else n.add(stageId);
      return n;
    });
  const clearStages = () => setSelectedStageIds(new Set());
  return { selectedStageIds, toggleStage, clearStages };
}

// ─────────────────────────────────────────────────────────────────────────────
// COLUMN FACTORIES
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
          className="text-slate-500 transition-colors hover:text-indigo-700"
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
          className="text-slate-700 transition-colors hover:text-indigo-500"
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      );
    },
  };
}

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
      <span className="text-[12px] font-bold text-slate-700">{index + 1}</span>
    ),
  };
}
