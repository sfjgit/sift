// File: SaleSummaryBar.tsx
// Path: src/components/reports/SaleSummaryBar.tsx

'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { tourTarget } from '@/features/tour/tour.constants';
import type { SaleBucket, SaleValueSummary } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CELL
// ─────────────────────────────────────────────────────────────────────────────

function StatCell({
  label,
  value,
  sub,
  dot,
  onClick,
  active = false,
}: {
  label: string;
  value: ReactNode;
  sub: ReactNode;
  dot: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const body = (
    <>
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span className={cn('size-2 shrink-0 rounded-full', dot)} />
        {label}
      </span>
      <span className="text-lg font-bold leading-tight tabular-nums text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{sub}</span>
    </>
  );
  const cls =
    'flex min-w-40 flex-col justify-center gap-0.5 border-r border-border px-4 py-2.5 text-left';

  if (!onClick) return <div className={cls}>{body}</div>;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        cls,
        'group outline-none transition-colors focus-visible:bg-muted/50',
        active ? 'bg-primary/10 ring-2 ring-inset ring-primary/40' : 'hover:bg-muted/50'
      )}
    >
      {body}
    </button>
  );
}

function FilterHint({ active }: { active: boolean }) {
  return active ? (
    <span className="font-semibold text-primary">Filtered · click to clear</span>
  ) : (
    <span className="font-medium text-primary group-hover:underline">Filter table</span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

export interface SaleSummaryBarProps {
  summary: SaleValueSummary;
  nearTerminalCandidates: number | null;
  terminalCandidates: number | null;
  /** Right-most count cell, e.g. 336 "requirements". */
  totalCount: number;
  totalLabel: string;
  /** Which bucket is filtering the table below, if any. */
  bucket: SaleBucket;
  onBucketChange: (bucket: SaleBucket) => void;
  tourKey?: string;
}

export function SaleSummaryBar({
  summary,
  nearTerminalCandidates,
  terminalCandidates,
  totalCount,
  totalLabel,
  bucket,
  onBucketChange,
  tourKey,
}: SaleSummaryBarProps) {
  const {
    totalSaleValue,
    totalAchievedValue,
    totalNearTerminalValue,
    includedCount,
    omittedCount,
    byBasis,
  } = summary;

  const achievedPct =
    totalSaleValue > 0 ? Math.round((totalAchievedValue / totalSaleValue) * 100) : 0;
  const pipelinePct =
    totalSaleValue > 0 ? Math.round(((totalNearTerminalValue ?? 0) / totalSaleValue) * 100) : 0;

  const toggle = (next: Exclude<SaleBucket, null>) => onBucketChange(bucket === next ? null : next);

  const nearActive = bucket === 'nearTerminal';
  const terminalActive = bucket === 'terminal';

  const basisChip = 'rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-foreground';

  return (
    <div
      {...(tourKey ? tourTarget(tourKey) : {})}
      className="flex flex-wrap items-stretch border-b border-border bg-card"
    >
      {/* 1. Total sale value — clears the filter */}
      <StatCell
        label="Total sale value"
        dot="bg-chart-2"
        value={fmtCurrency(totalSaleValue)}
        onClick={bucket ? () => onBucketChange(null) : undefined}
        sub={
          bucket ? (
            <span className="font-medium text-primary group-hover:underline">Show all</span>
          ) : (
            <>
              {includedCount} computed
              {omittedCount > 0 && (
                <span className="ml-1 font-semibold text-destructive">
                  , {omittedCount} no data
                </span>
              )}
            </>
          )
        }
      />

      {/* 2. Pipeline value — near-terminal */}
      <StatCell
        label="Pipeline value"
        dot="bg-chart-3"
        value={fmtCurrency(totalNearTerminalValue ?? 0)}
        active={nearActive}
        onClick={() => toggle('nearTerminal')}
        sub={
          <>
            {pipelinePct}% of target · <FilterHint active={nearActive} />
          </>
        }
      />

      {/* 3. NDA released / offered — near-terminal count */}
      <StatCell
        label="NDA released / offered"
        dot="bg-chart-5"
        value={nearTerminalCandidates ?? '—'}
        active={nearActive}
        onClick={() => toggle('nearTerminal')}
        sub={
          <>
            candidates · <FilterHint active={nearActive} />
          </>
        }
      />

      {/* 4. Achieved value — terminal */}
      <StatCell
        label="Achieved value"
        dot="bg-chart-4"
        value={fmtCurrency(totalAchievedValue)}
        active={terminalActive}
        onClick={() => toggle('terminal')}
        sub={
          <>
            {achievedPct}% of target · <FilterHint active={terminalActive} />
          </>
        }
      />

      {/* 5. Deal closed / training started — terminal count */}
      <StatCell
        label="Deal closed / training started"
        dot="bg-chart-1"
        value={terminalCandidates ?? '—'}
        active={terminalActive}
        onClick={() => toggle('terminal')}
        sub={
          <>
            candidates · <FilterHint active={terminalActive} />
          </>
        }
      />

      {/* Basis breakdown */}
      <div className="flex flex-col justify-center gap-1 border-r border-border px-4 py-2.5">
        <span className="text-xs font-medium text-muted-foreground">Basis</span>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {byBasis['SALE_VALUE']?.count > 0 && (
            <span className={basisChip}>
              Direct{' '}
              <span className="font-semibold tabular-nums">{byBasis['SALE_VALUE'].count}</span>
              <span className="ml-1 tabular-nums text-muted-foreground">
                {fmtCurrency(byBasis['SALE_VALUE'].total)}
              </span>
            </span>
          )}
          {byBasis['BAND']?.count > 0 && (
            <span className={basisChip}>
              Band <span className="font-semibold tabular-nums">{byBasis['BAND'].count}</span>
              <span className="ml-1 tabular-nums text-muted-foreground">
                {fmtCurrency(byBasis['BAND'].total)}
              </span>
            </span>
          )}
          {byBasis['FIXED_PCT']?.count > 0 && (
            <span className={basisChip}>
              Fixed %{' '}
              <span className="font-semibold tabular-nums">{byBasis['FIXED_PCT'].count}</span>
              <span className="ml-1 tabular-nums text-muted-foreground">
                {fmtCurrency(byBasis['FIXED_PCT'].total)}
              </span>
            </span>
          )}
          {omittedCount > 0 && (
            <span className="rounded-md border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 font-medium text-destructive">
              No data {omittedCount}
            </span>
          )}
        </div>
      </div>

      {/* Total count */}
      <div className="ml-auto flex flex-col items-end justify-center border-l border-border px-4 py-2.5">
        <span className="text-lg font-bold leading-tight tabular-nums text-foreground">
          {totalCount}
        </span>
        <span className="text-xs text-muted-foreground">{totalLabel}</span>
      </div>
    </div>
  );
}
