// File: ReportResult.tsx
// Path: src/features/reports/ReportResult.tsx
//
// Draws a breakdown (or trend) as the chosen visual, always followed by the
// pivot table — the table is the accessible / exact view of the same numbers.

'use client';

import { useMemo } from 'react';
import { Info } from 'lucide-react';
import {
  ColumnChart,
  DonutChart,
  HBarChart,
  Legend,
  MAX_SERIES,
  OTHER_KEY,
  TrendChart,
  bucketLabel,
  seriesColor,
  type Series,
} from '@/components/charts/Charts';
import { fmtNumber, fmtPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Breakdown, Trend } from '@/types/reports';
import { dimLabel, drillHref, STATUS_SPLIT_COLORS, type ReportSpec } from './spec';

interface Shaped {
  series: Series[];
  rows: { key: string; label: string; total: number; cells: Record<string, number> }[];
  total: number;
}

/** Fold split keys past the palette into "Other" so colours never cycle. */
function shape(b: Breakdown, spec: ReportSpec): Shaped {
  const statusColors = spec.splitBy ? STATUS_SPLIT_COLORS[spec.splitBy] : undefined;
  const keys = b.splitKeys ?? [];
  const keep = statusColors ? keys : keys.slice(0, MAX_SERIES - 1);
  const folded = statusColors ? [] : keys.slice(MAX_SERIES - 1);
  const series: Series[] = spec.splitBy
    ? [
        ...keep.map((k, i) => ({ key: k.key, label: k.label, color: statusColors?.[k.key] ?? seriesColor(i, k.key) })),
        ...(folded.length ? [{ key: OTHER_KEY, label: `Other (${folded.length})`, color: 'var(--muted-foreground)' }] : []),
      ]
    : [{ key: 'total', label: spec.entity === 'spocs' ? 'SPOCs' : 'Clients' }];

  const rows = b.rows.map(r => {
    const cells: Record<string, number> = {};
    if (spec.splitBy) {
      keep.forEach(k => (cells[k.key] = r.split?.[k.key] ?? 0));
      if (folded.length) cells[OTHER_KEY] = folded.reduce((s, k) => s + (r.split?.[k.key] ?? 0), 0);
    } else cells.total = r.total;
    return { key: r.key, label: r.label, total: r.total, cells };
  });
  return { series, rows, total: b.total };
}

export function ReportResult({
  spec,
  breakdown,
  trend,
  onDrill,
}: {
  spec: ReportSpec;
  breakdown?: Breakdown;
  trend?: Trend;
  onDrill: (rowKey: string, rowLabel: string, splitKey?: string, splitLabel?: string) => void;
}) {
  const shaped = useMemo(() => (breakdown ? shape(breakdown, spec) : null), [breakdown, spec]);

  if (spec.viz === 'trend' && trend) {
    const keys = trend.splitKeys ?? [];
    const series: Series[] = keys.length
      ? keys.map((k, i) => ({ key: k.key, label: k.label, color: seriesColor(i, k.key) }))
      : [{ key: 'total', label: spec.entity === 'spocs' ? 'New SPOCs' : `New ${spec.entity}` }];
    const data = trend.points.map(p => ({ bucket: p.bucket, total: p.total, ...(p.split ?? {}) }));
    const sum = trend.points.reduce((s, p) => s + p.total, 0);
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            <span className="text-2xl font-semibold text-foreground tabular">{fmtNumber(sum)}</span> created in this period
          </p>
          <Legend series={series} />
        </div>
        <TrendChart data={data} series={series} xFormatter={bucketLabel(trend.interval)} variant={keys.length ? 'line' : 'area'} height={320} />
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="size-3.5" /> Trends show the top {Math.max(keys.length, 1)} {dimLabel(spec.entity, spec.groupBy).toLowerCase()} values;
          filters other than the date range don’t apply to trends.
        </p>
      </div>
    );
  }

  if (!shaped) return null;
  const { series, rows, total } = shaped;
  const pct = !!spec.percent && !!spec.splitBy;
  const chartRows = rows.map(r => ({
    key: r.key,
    label: r.label,
    ...Object.fromEntries(
      Object.entries(r.cells).map(([k, v]) => [k, pct ? (r.total ? Math.round((v / r.total) * 1000) / 10 : 0) : v])
    ),
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="text-2xl font-semibold text-foreground tabular">{fmtNumber(total)}</span>{' '}
          {spec.entity === 'spocs' ? 'SPOCs' : 'clients'} · {rows.length} {dimLabel(spec.entity, spec.groupBy).toLowerCase()}{' '}
          {rows.length === 1 ? 'value' : 'values'}
        </p>
        {spec.viz !== 'donut' && <Legend series={series} />}
      </div>

      {spec.viz === 'bar' || spec.viz === 'stacked' ? (
        rows.length > 12 || !spec.splitBy ? (
          <HBarChart
            data={chartRows}
            series={series}
            labelWidth={170}
            onSelect={(k, s) => {
              const r = rows.find(x => x.key === k);
              onDrill(k, r?.label ?? k, s, series.find(x => x.key === s)?.label);
            }}
          />
        ) : (
          <ColumnChart
            data={chartRows}
            series={series}
            xKey="label"
            height={320}
            onSelect={(label, s) => {
              const r = rows.find(x => x.label === label);
              if (r) onDrill(r.key, r.label, s, series.find(x => x.key === s)?.label);
            }}
          />
        )
      ) : spec.viz === 'donut' ? (
        <div className="grid items-center gap-6 md:grid-cols-[260px_1fr]">
          <DonutChart
            height={240}
            centerLabel={spec.entity === 'spocs' ? 'SPOCs' : 'clients'}
            data={rows.slice(0, MAX_SERIES).map((r, i) => ({ key: r.key, label: r.label, value: r.total, color: seriesColor(i, r.key) }))}
            onSelect={k => onDrill(k, rows.find(r => r.key === k)?.label ?? k)}
          />
          <ul className="space-y-2">
            {rows.slice(0, MAX_SERIES).map((r, i) => (
              <li key={r.key} className="flex items-center gap-2 text-[13px]">
                <span className="size-2.5 rounded-[3px]" style={{ background: seriesColor(i, r.key) }} />
                <span className="flex-1 truncate">{r.label}</span>
                <span className="text-muted-foreground tabular">{fmtPercent(r.total, total)}</span>
                <span className="w-12 text-right font-medium tabular">{fmtNumber(r.total)}</span>
              </li>
            ))}
            {rows.length > MAX_SERIES && (
              <li className="text-xs text-muted-foreground">+ {rows.length - MAX_SERIES} more in the table below</li>
            )}
          </ul>
        </div>
      ) : null}

      <PivotTable spec={spec} rows={rows} series={series} total={total} onDrill={onDrill} />
    </div>
  );
}

function PivotTable({
  spec,
  rows,
  series,
  total,
  onDrill,
}: {
  spec: ReportSpec;
  rows: Shaped['rows'];
  series: Series[];
  total: number;
  onDrill: (rowKey: string, rowLabel: string, splitKey?: string, splitLabel?: string) => void;
}) {
  const split = !!spec.splitBy;
  const max = Math.max(1, ...rows.flatMap(r => Object.values(r.cells)));
  const colTotals = series.map(s => rows.reduce((sum, r) => sum + (r.cells[s.key] ?? 0), 0));
  const shownTotal = rows.reduce((s, r) => s + r.total, 0);

  const cell = (r: Shaped['rows'][number], s?: Series) => {
    const v = s ? (r.cells[s.key] ?? 0) : r.total;
    const canDrill = !!drillHref(spec, r.key, s?.key);
    const display = spec.percent && split && s ? fmtPercent(v, r.total) : fmtNumber(v);
    return (
      <td key={s?.key ?? 'total'} className="border-b p-0 text-right tabular">
        <button
          type="button"
          disabled={!canDrill || v === 0}
          onClick={() => onDrill(r.key, r.label, s?.key, s?.label)}
          title={canDrill ? 'See these records' : 'Drill-down isn’t available for this dimension'}
          className={cn(
            'relative block w-full px-3 py-2 text-right enabled:hover:text-primary enabled:hover:underline disabled:cursor-default',
            v === 0 && 'text-muted-foreground/50'
          )}
        >
          {/* single-hue magnitude wash behind split cells */}
          {s && split && v > 0 && (
            <span className="absolute inset-0.5 rounded bg-primary" style={{ opacity: 0.04 + (v / max) * 0.18 }} aria-hidden />
          )}
          <span className="relative">{display}</span>
        </button>
      </td>
    );
  };

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-separate border-spacing-0 text-[13px]">
        <thead className="bg-surface text-xs text-muted-foreground">
          <tr>
            <th className="sticky left-0 border-b bg-surface px-3 py-2 text-left font-medium">{dimLabel(spec.entity, spec.groupBy)}</th>
            {split &&
              series.map(s => (
                <th key={s.key} className="border-b px-3 py-2 text-right font-medium whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-[2px]" style={{ background: s.color }} />
                    {s.label}
                  </span>
                </th>
              ))}
            <th className="border-b px-3 py-2 text-right font-medium">Total</th>
            <th className="border-b px-3 py-2 text-right font-medium">Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.key} className="hover:bg-accent/30">
              <td className="sticky left-0 max-w-64 truncate border-b bg-card px-3 py-2 font-medium">{r.label}</td>
              {split && series.map(s => cell(r, s))}
              {cell(r)}
              <td className="border-b px-3 py-2 text-right text-muted-foreground tabular">{fmtPercent(r.total, total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-surface font-medium">
          <tr>
            <td className="sticky left-0 bg-surface px-3 py-2">
              Total{rows.length && shownTotal < total ? <span className="ml-1 text-xs font-normal text-muted-foreground">(top {rows.length})</span> : null}
            </td>
            {split &&
              colTotals.map((v, i) => (
                <td key={series[i].key} className="px-3 py-2 text-right tabular">
                  {fmtNumber(v)}
                </td>
              ))}
            <td className="px-3 py-2 text-right tabular">{fmtNumber(shownTotal)}</td>
            <td className="px-3 py-2 text-right text-muted-foreground tabular">{fmtPercent(shownTotal, total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function toExportRows(spec: ReportSpec, b: Breakdown) {
  const s = shape(b, spec);
  return s.rows.map(r => ({
    [dimLabel(spec.entity, spec.groupBy)]: r.label,
    ...(spec.splitBy ? Object.fromEntries(s.series.map(x => [x.label, r.cells[x.key] ?? 0])) : {}),
    Total: r.total,
  }));
}
