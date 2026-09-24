// File: RecruiterStatsBar.tsx
// Path: src/components/reports/RecruiterStatsBar.tsx
//
// Every stat card is clickable — opens RecruiterCandidateDrillDialog.
// Every service line row is clickable — filters drill to that SL.
// Clicking "Placed" opens placed candidates. "Near Close" opens near-terminal.
// "Off Pipeline" opens dropped/rejected. "In Pipeline" opens active.
// "Sourced" opens all candidates for the current scope.

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAxios } from '@/hooks/useAxios';
import { Skeleton } from '@/components/ui/skeleton';
import {
  RecruiterCandidateDrillDialog,
  type RecruiterDrillTarget,
} from './RecruiterCandidateDrillDialog';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface StatsTotals {
  recruiters: number;
  sourced: number;
  inPipeline: number;
  nearClose: number;
  placed: number;
  offPipeline: number;
  sourcedOnly: number;
}

interface SlBreakdown {
  id: string | null;
  name: string;
  sourced: number;
  inPipeline: number;
  nearClose: number;
  placed: number;
  offPipeline: number;
  sourcedOnly: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function pct(num: number, den: number): string {
  if (!den) return '0%';
  return `${((num / den) * 100).toFixed(1)}%`;
}

// Map each stat card to what the drill endpoint needs.
// We don't have a specific recruiterId here — the drill will scope by the
// baseQs filters (RBAC + team picker + window) automatically.
// We pass a synthetic "recruiter" target with empty recruiterId so the
// drill uses only the baseQs scope (all recruiters in current filter).
const SCOPE_ALL = '__all__';

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD — clickable
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color,
  bg,
  border,
  onClick,
  disabled,
}: {
  label: string;
  value: number;
  sub?: string;
  color: string;
  bg: string;
  border: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const clickable = !!onClick && !disabled && value > 0;
  return (
    <button
      type="button"
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      className={`flex min-w-[110px] flex-1 flex-col justify-between rounded-xl border px-4 py-3 text-left transition-all
        ${bg} ${border}
        ${clickable ? 'cursor-pointer hover:shadow-md hover:ring-2 hover:ring-indigo-300 hover:ring-offset-1 active:scale-[0.98]' : 'cursor-default'}`}
    >
      <p className={`text-[10px] font-black uppercase tracking-wider ${color} opacity-80`}>
        {label}
      </p>
      <p className={`mt-1 text-[26px] font-black leading-none ${color}`}>
        {value.toLocaleString('en-IN')}
      </p>
      {sub && <p className={`mt-1 text-[11px] font-semibold ${color} opacity-70`}>{sub}</p>}
      {clickable && (
        <p className="mt-0.5 text-[9px] font-bold text-indigo-400 opacity-0 transition-opacity group-hover:opacity-100">
          click to drill →
        </p>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE LINE ROW — clickable
// ─────────────────────────────────────────────────────────────────────────────

function SlRow({
  sl,
  onDrill,
}: {
  sl: SlBreakdown;
  onDrill: (extra: Partial<RecruiterDrillTarget> & { label: string }) => void;
}) {
  const den = sl.sourced;
  return (
    <button
      type="button"
      onClick={() =>
        onDrill({
          label: sl.name,
          // No recruiterId — drill scopes to all recruiters in this SL via baseQs + serviceLineId
          recruiterId: SCOPE_ALL,
          recruiterName: sl.name,
          // Pass serviceLineId via stageLabel hack — the drill dialog appends this to baseQs
          // Actually we pass it as a custom field the dialog can handle
          serviceLineId: sl.id ?? undefined,
        } as any)
      }
      className="flex w-full items-center gap-3 rounded-lg py-1.5 px-2 text-[12px] transition-colors hover:bg-indigo-50 hover:ring-1 hover:ring-indigo-200"
    >
      <span className="w-36 shrink-0 truncate text-left font-semibold text-slate-700">
        {sl.name}
      </span>
      <span className="w-12 text-right font-black text-slate-900">{sl.sourced}</span>
      {/* Mini bar */}
      <div className="flex h-5 flex-1 overflow-hidden rounded-md bg-slate-100">
        {sl.inPipeline > 0 && (
          <div
            style={{ width: `${(sl.inPipeline / den) * 100}%`, backgroundColor: '#6366F1' }}
            title={`In pipeline: ${sl.inPipeline}`}
          />
        )}
        {sl.sourcedOnly > 0 && (
          <div
            style={{ width: `${(sl.sourcedOnly / den) * 100}%`, backgroundColor: '#94A3B8' }}
            title={`Sourced only: ${sl.sourcedOnly}`}
          />
        )}
        {sl.nearClose > 0 && (
          <div
            style={{ width: `${(sl.nearClose / den) * 100}%`, backgroundColor: '#D97706' }}
            title={`Near close: ${sl.nearClose}`}
          />
        )}
        {sl.placed > 0 && (
          <div
            style={{ width: `${(sl.placed / den) * 100}%`, backgroundColor: '#059669' }}
            title={`Placed: ${sl.placed}`}
          />
        )}
        {sl.offPipeline > 0 && (
          <div
            style={{ width: `${(sl.offPipeline / den) * 100}%`, backgroundColor: '#E5E7EB' }}
            title={`Off pipeline: ${sl.offPipeline}`}
          />
        )}
      </div>
      <span className="w-10 text-right text-[11px] font-bold text-emerald-700">{sl.placed}</span>
      <span className="w-14 text-right text-[11px] font-semibold text-slate-400">
        {pct(sl.placed, den)}
      </span>
      <span className="text-[10px] text-indigo-400 opacity-0 group-hover:opacity-100">→</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function RecruiterStatsBar({ baseQs }: { baseQs: string }) {
  const axios = useAxios();
  const [drillTarget, setDrillTarget] = useState<RecruiterDrillTarget | null>(null);

  const statsQuery = useQuery({
    queryKey: ['recruiter-stats', baseQs],
    queryFn: async () => (await axios.get(`/reports/recruiters/stats?${baseQs}`)).data,
    staleTime: 60_000,
  });

  if (statsQuery.isLoading) {
    return (
      <div className="flex gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] flex-1 rounded-xl" />
        ))}
      </div>
    );
  }

  if (statsQuery.isError || !statsQuery.data?.success) {
    return null;
  }

  const totals: StatsTotals = statsQuery.data.data.totals;
  const byServiceLine: SlBreakdown[] = statsQuery.data.data.byServiceLine ?? [];
  const multiLine = byServiceLine.length > 1;

  // Helper — open drill with a filter type baked into the baseQs
  // The drill dialog calls /reports/overview/drill?type=X which filters on the backend.
  // For stats bar, recruiterName = label shown in dialog header, recruiterId = SCOPE_ALL
  // means the dialog will NOT add recruiterId param — so it shows all recruiters in scope.
  const openDrill = (label: string, extraParams?: Record<string, string>) => {
    // Build a modified baseQs with extra params merged in
    const p = new URLSearchParams(baseQs);
    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) => p.set(k, v));
    }
    setDrillTarget({
      recruiterId: SCOPE_ALL, // signals drill dialog to skip recruiterId filter
      recruiterName: label,
      // Stash the extra params in stageLabel field as JSON — the dialog will parse it
      // Actually simpler: we pass overrideQs directly
      overrideQs: p.toString(),
    } as any);
  };

  return (
    <>
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {/* ── KPI cards ────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3">
          <StatCard
            label="Recruiters"
            value={totals.recruiters}
            color="text-indigo-800"
            bg="bg-indigo-50"
            border="border-indigo-100"
            disabled // count only — no useful drill for "all recruiters"
          />
          <StatCard
            label="Sourced"
            value={totals.sourced}
            sub="all candidates"
            color="text-slate-800"
            bg="bg-slate-50"
            border="border-slate-200"
            onClick={() => openDrill('All candidates — sourced')}
          />
          <StatCard
            label="In Pipeline"
            value={totals.inPipeline}
            sub={pct(totals.inPipeline, totals.sourced)}
            color="text-violet-800"
            bg="bg-violet-50"
            border="border-violet-100"
            onClick={() => openDrill('In pipeline', { type: 'active_pipeline' })}
          />
          {totals.sourcedOnly > 0 && (
            <StatCard
              label="Sourced Only"
              value={totals.sourcedOnly}
              sub={pct(totals.sourcedOnly, totals.sourced)}
              color="text-slate-600"
              bg="bg-slate-50"
              border="border-slate-200"
              onClick={() => openDrill('Sourced only — not yet processed')}
            />
          )}
          <StatCard
            label="Near Close"
            value={totals.nearClose}
            sub={pct(totals.nearClose, totals.sourced)}
            color="text-amber-800"
            bg="bg-amber-50"
            border="border-amber-100"
            onClick={() => openDrill('Near close candidates', { type: 'near_terminal' })}
          />
          <StatCard
            label="Placed/Deal Closed"
            value={totals.placed}
            sub={pct(totals.placed, totals.sourced)}
            color="text-emerald-800"
            bg="bg-emerald-50"
            border="border-emerald-100"
            onClick={() => openDrill('Placed candidates', { type: 'placed' })}
          />
          <StatCard
            label="Off Pipeline"
            value={totals.offPipeline}
            sub={pct(totals.offPipeline, totals.sourced)}
            color="text-red-700"
            bg="bg-red-50"
            border="border-red-100"
            onClick={() =>
              openDrill('Off pipeline — rejected / withdrawn / dropped', { type: 'dropped' })
            }
          />
        </div>

        {/* ── Funnel bar ───────────────────────────────────────────────────── */}
        {totals.sourced > 0 && (
          <div className="space-y-1.5">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
              {totals.inPipeline > 0 && (
                <div
                  style={{
                    width: pct(totals.inPipeline, totals.sourced),
                    backgroundColor: '#6366F1',
                  }}
                  title={`In pipeline: ${totals.inPipeline}`}
                />
              )}
              {totals.sourcedOnly > 0 && (
                <div
                  style={{
                    width: pct(totals.sourcedOnly, totals.sourced),
                    backgroundColor: '#94A3B8',
                  }}
                  title={`Sourced only: ${totals.sourcedOnly}`}
                />
              )}
              {totals.nearClose > 0 && (
                <div
                  style={{
                    width: pct(totals.nearClose, totals.sourced),
                    backgroundColor: '#D97706',
                  }}
                  title={`Near close: ${totals.nearClose}`}
                />
              )}
              {totals.placed > 0 && (
                <div
                  style={{ width: pct(totals.placed, totals.sourced), backgroundColor: '#059669' }}
                  title={`Placed: ${totals.placed}`}
                />
              )}
              {totals.offPipeline > 0 && (
                <div
                  style={{
                    width: pct(totals.offPipeline, totals.sourced),
                    backgroundColor: '#E5E7EB',
                  }}
                  title={`Off pipeline: ${totals.offPipeline}`}
                />
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-semibold text-slate-500">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-violet-500" /> In pipeline
              </span>
              {totals.sourcedOnly > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-slate-400" /> Sourced only
                </span>
              )}
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-amber-500" /> Near close
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-emerald-600" /> Placed
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-slate-300" /> Off pipeline
              </span>
              <span className="ml-auto text-[10px] font-bold text-indigo-400">
                Click any card to drill into candidates →
              </span>
            </div>
          </div>
        )}

        {/* ── Per service line breakdown ────────────────────────────────────── */}
        {multiLine && (
          <div className="border-t border-slate-100 pt-3">
            <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              By service line — click to drill
            </p>
            <div className="flex items-center gap-3 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <span className="w-36 shrink-0">Line</span>
              <span className="w-12 text-right">Total</span>
              <span className="flex-1">Breakdown</span>
              <span className="w-10 text-right text-emerald-600">Placed</span>
              <span className="w-14 text-right">Rate</span>
              <span className="w-4" />
            </div>
            <div className="divide-y divide-slate-50">
              {byServiceLine.map(sl => (
                <SlRow
                  key={sl.id ?? '__none__'}
                  sl={sl}
                  onDrill={(extra: any) => {
                    // Build baseQs with serviceLineId injected
                    const p = new URLSearchParams(baseQs);
                    if (extra.serviceLineId) p.set('serviceLineId', extra.serviceLineId);
                    setDrillTarget({
                      recruiterId: SCOPE_ALL,
                      recruiterName: extra.label,
                      overrideQs: p.toString(),
                    } as any);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Drill dialog — renders when a card/row is clicked */}
      <RecruiterCandidateDrillDialog
        target={drillTarget}
        baseQs={baseQs}
        onClose={() => setDrillTarget(null)}
      />
    </>
  );
}
