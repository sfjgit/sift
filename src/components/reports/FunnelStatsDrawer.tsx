/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// File: FunnelStatsDrawer.tsx
// Path: src/components/reports/FunnelStatsDrawer.tsx

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  TrendingUp,
  CheckCircle2,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { useAxios } from '@/hooks/useAxios';
import { RequirementCandidateDrillDialog } from './RequirementCandidateDrillDialog';
import type { DrillBucket, RequirementDrillTarget } from './RequirementCandidateDrillDialog';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

// export type FunnelDrawerType = 'nearTerminal' | 'terminal';
export type FunnelDrawerType = DrillBucket;
export interface FunnelStatsDrawerTarget {
  type: FunnelDrawerType;
}

interface FunnelReqRow {
  id: string;
  reqCode: string;
  title: string;
  status: string;
  totalOpenings: number;
  client: { id: string; name: string } | null;
  serviceLine: { id: string; name: string } | null;
  businessUnit: { id: string; name: string } | null;
  createdBy: { firstName: string; lastName: string };
  computedSaleValue: number | null;
  saleValueBasis: string;
  // nearTerminal rows
  nearTerminalCount?: number;
  nearTerminalValue?: number | null;
  // terminal rows
  terminalCount?: number;
  achievedValue?: number | null;
}

interface FunnelStatsResponse {
  success: boolean;
  summary: {
    nearTerminalCandidates: number;
    terminalCandidates: number;
  };
  nearTerminal: { requirements: FunnelReqRow[] };
  terminal: { requirements: FunnelReqRow[] };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
}

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  DRAFT: 'bg-slate-100 text-slate-600',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700',
  ON_HOLD: 'bg-orange-50 text-orange-700',
  CLOSED: 'bg-red-50 text-red-600',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

// ── CSV export helpers ───────────────────────────────────────────────────────

function csvCell(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const csv = [headers, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
  // \uFEFF BOM so Excel reads UTF-8 properly
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUIREMENT ROW
// ─────────────────────────────────────────────────────────────────────────────

function ReqRow({
  row,
  type,
  onDrill,
}: {
  row: FunnelReqRow;
  type: FunnelDrawerType;
  onDrill: (row: FunnelReqRow) => void;
}) {
  const count = type === 'nearTerminal' ? row.nearTerminalCount : row.terminalCount;
  const value = type === 'nearTerminal' ? row.nearTerminalValue : row.achievedValue;
  const countColor = type === 'nearTerminal' ? 'text-amber-700' : 'text-emerald-700';
  const valueColor = type === 'nearTerminal' ? 'text-amber-600' : 'text-purple-700';

  return (
    <button
      onClick={() => onDrill(row)}
      className="group flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-left shadow-sm transition-all hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-md"
    >
      {/* Req info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-500">
            {row.reqCode}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[row.status] ?? 'bg-slate-100 text-slate-600'}`}
          >
            {row.status.replace(/_/g, ' ')}
          </span>
          {row.serviceLine && (
            <span className="text-[10px] font-semibold text-slate-400">{row.serviceLine.name}</span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[13px] font-bold text-slate-900 group-hover:text-indigo-900">
          {row.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
          {row.client && <span>{row.client.name}</span>}
          <span>
            {row.totalOpenings} opening{row.totalOpenings !== 1 ? 's' : ''}
          </span>
          {row.computedSaleValue != null && (
            <span className="font-semibold text-slate-500">
              {fmtCurrency(row.computedSaleValue)} total
            </span>
          )}
        </div>
      </div>

      {/* Count + value */}
      <div className="shrink-0 text-right">
        <p className={`text-[20px] font-black tabular-nums ${countColor}`}>{count}</p>
        {value != null && (
          <p className={`text-[11px] font-bold ${valueColor}`}>{fmtCurrency(value)}</p>
        )}
        <p className="text-[10px] text-slate-400">candidates</p>
      </div>

      {/* Arrow */}
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-indigo-400" />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DRAWER
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  target: FunnelStatsDrawerTarget | null;
  baseQs: string;
  onClose: () => void;
}

export function FunnelStatsDrawer({ target, baseQs, onClose }: Props) {
  const axios = useAxios();
  const [drillTarget, setDrillTarget] = useState<RequirementDrillTarget | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['funnel-stats', baseQs],
    queryFn: async () =>
      (await axios.get(`/reports/requirements/funnel-stats?${baseQs}`)).data as FunnelStatsResponse,
    enabled: !!target,
    staleTime: 60_000,
  });

  const rows = useMemo(() => {
    if (!data || !target) return [];
    return target.type === 'nearTerminal'
      ? data.nearTerminal.requirements
      : data.terminal.requirements;
  }, [data, target]);

  const totalCount = useMemo(() => {
    if (!data || !target) return 0;
    return target.type === 'nearTerminal'
      ? data.summary.nearTerminalCandidates
      : data.summary.terminalCandidates;
  }, [data, target]);

  const totalValue = useMemo(() => {
    if (!rows.length || !target) return null;
    const key = target.type === 'nearTerminal' ? 'nearTerminalValue' : 'achievedValue';
    return rows.reduce((sum, r) => sum + ((r as any)[key] ?? 0), 0);
  }, [rows, target]);

  if (!target) return null;

  const isNearTerminal = target.type === 'nearTerminal';
  const heading = isNearTerminal ? 'NDA Released / Offered' : 'Deal Closed / Training Started';
  const accentColor = isNearTerminal ? 'text-amber-700' : 'text-emerald-700';
  const accentBg = isNearTerminal ? 'bg-amber-50' : 'bg-emerald-50';
  const Icon = isNearTerminal ? TrendingUp : CheckCircle2;

  const openDrill = (row: FunnelReqRow) => {
    setDrillTarget({
      requirementId: row.id,
      reqCode: row.reqCode,
      reqTitle: row.title,
      bucket: target.type,
      stageId: undefined,
      stageLabel: isNearTerminal ? 'NDA Released / Offered' : 'Deal Closed / Training Started',
      dialogTitle: isNearTerminal ? `Pipeline — ${row.reqCode}` : `Achieved — ${row.reqCode}`,
    });
  };

  const handleExport = () => {
    const headers = [
      'Req Code',
      'Title',
      'Status',
      'Client',
      'Service Line',
      'Business Unit',
      'Created By',
      'Openings',
      'Total Sale Value (INR)',
      'Candidates',
      isNearTerminal ? 'Pipeline Value (INR)' : 'Achieved Value (INR)',
    ];

    const body = rows.map(r => [
      r.reqCode,
      r.title,
      r.status.replace(/_/g, ' '),
      r.client?.name ?? '',
      r.serviceLine?.name ?? '',
      r.businessUnit?.name ?? '',
      `${r.createdBy?.firstName ?? ''} ${r.createdBy?.lastName ?? ''}`.trim(),
      r.totalOpenings,
      r.computedSaleValue ?? '',
      (isNearTerminal ? r.nearTerminalCount : r.terminalCount) ?? 0,
      (isNearTerminal ? r.nearTerminalValue : r.achievedValue) ?? '',
    ]);

    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(
      `${isNearTerminal ? 'nda-released-offered' : 'deal-closed-training-started'}_${date}.csv`,
      headers,
      body
    );
  };

  return (
    <>
      {/* ── Drawer overlay ──────────────────────────────────────────────────── */}
      <div className="fixed inset-0 z-40 flex">
        {/* Backdrop */}
        <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

        {/* Panel */}
        <div className="flex h-full w-full max-w-2xl flex-col bg-slate-50 shadow-2xl">
          {/* Header */}
          <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accentBg}`}>
                  <Icon className={`h-5 w-5 ${accentColor}`} />
                </div>
                <div>
                  <h2 className="text-[15px] font-black text-slate-900">{heading}</h2>
                  <p className="text-[12px] text-slate-400">
                    {isLoading
                      ? 'Loading…'
                      : `${rows.length} requirement${rows.length !== 1 ? 's' : ''} · ${totalCount} candidates`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExport}
                  disabled={isLoading || rows.length === 0}
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[12px] font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
                <button
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Summary strip */}
          {!isLoading && rows.length > 0 && (
            <div className={`shrink-0 border-b border-slate-200 ${accentBg} px-6 py-3`}>
              <div className="flex items-center gap-6 text-[12px]">
                <div>
                  <span className={`text-[22px] font-black ${accentColor}`}>{totalCount}</span>
                  <span className="ml-2 font-semibold text-slate-500">total candidates</span>
                </div>
                {totalValue != null && totalValue > 0 && (
                  <div>
                    <span className={`text-[16px] font-black ${accentColor}`}>
                      {fmtCurrency(totalValue)}
                    </span>
                    <span className="ml-2 font-semibold text-slate-500">
                      {isNearTerminal ? 'pipeline value' : 'achieved value'}
                    </span>
                  </div>
                )}
                <span className="ml-auto text-[11px] font-semibold text-slate-400">
                  Click a requirement to see candidates →
                </span>
              </div>
            </div>
          )}

          {/* Body */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex h-full items-center justify-center gap-3 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-[14px] font-semibold">Loading requirements…</span>
              </div>
            ) : isError ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
                <AlertTriangle className="h-8 w-8 text-red-400" />
                <p className="text-[14px] font-semibold">Failed to load data.</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[14px] text-slate-400">
                No requirements found for this filter.
              </div>
            ) : (
              <div className="space-y-2">
                {rows.map(row => (
                  <ReqRow key={row.id} row={row} type={target.type} onDrill={openDrill} />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {rows.length > 0 && (
            <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-3">
              <p className="text-[11px] text-slate-400">
                Click any requirement to view its candidates in detail
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Level 2 — Candidate drill dialog ───────────────────────────────── */}
      <RequirementCandidateDrillDialog target={drillTarget} onClose={() => setDrillTarget(null)} />
    </>
  );
}
