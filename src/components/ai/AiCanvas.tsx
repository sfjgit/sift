// File: AiCanvas.tsx
// Path: src/components/ai/AiCanvas.tsx
//
// Renders an AI canvas (or the AI usage dashboard): a 6-column grid of blocks —
// KPI, bar, line, pie, table — each fed by a registry query the backend ran.
// The AI only picks blocks; every number here comes straight from the CRM.
//   • widths: full = 6 cols, half = 3, third = 2; one column on small screens
//   • colours = the app chart kit (--chart-1..8, fixed order, "Other" neutral)
//   • money = full rupees, Indian grouping (₹1,00,000) — never K / L / Cr
//   • a block with `error` renders a small error card; the page never breaks
//   • `printable` = fixed 6-col layout, tables without scroll, no hover chrome

'use client';

import { AlertTriangle, Inbox } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Legend, seriesColor, MAX_SERIES, OTHER_KEY } from '@/components/charts/Charts';
import { EMPTY, fmtDate, fmtInr, fmtNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AiColumn, AiQueryResult, AiRenderedBlock, AiValueFormat, AiWidth } from '@/types/ai';

// ── formatting ───────────────────────────────────────────────────────────────

export const fmtAiValue = (v: unknown, format: AiValueFormat | AiColumn['type'] = 'number') => {
  if (v === null || v === undefined || v === '') return EMPTY;
  if (format === 'text') return String(v);
  if (format === 'date') return fmtDate(String(v));
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (format === 'money') return fmtInr(n);
  if (format === 'percent') return `${n.toFixed(1)}%`;
  return fmtNumber(n);
};

const AXIS = { fontSize: 11, fill: 'var(--muted-foreground)' };
const GRID = 'var(--border)';

/** y-axis wide enough for full (never abbreviated) values */
const axisWidth = (values: number[], format: AiValueFormat) => {
  const longest = values.reduce((m, v) => Math.max(m, fmtAiValue(v, format).length), 1);
  return Math.min(120, Math.max(36, longest * 6.5 + 10));
};

const SPAN: Record<AiWidth, string> = {
  full: 'md:col-span-6',
  half: 'md:col-span-3',
  third: 'md:col-span-2',
};
const PRINT_SPAN: Record<AiWidth, string> = {
  full: 'col-span-6',
  half: 'col-span-3',
  third: 'col-span-2',
};

type SeriesResult = Extract<AiQueryResult, { kind: 'series' }>;
type RowsResult = Extract<AiQueryResult, { kind: 'rows' }>;

// ── tooltip (same look as the chart kit's) ───────────────────────────────────

interface TipRow {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown> & { fill?: string };
}

function AiTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: TipRow[];
  label?: string | number;
  format: AiValueFormat;
}) {
  if (!active || !payload?.length) return null;
  const title = String(label ?? payload[0]?.payload?.label ?? '');
  return (
    <div className="min-w-40 rounded-lg border bg-popover px-3 py-2 text-xs shadow-float">
      {title && <p className="mb-1.5 font-medium text-popover-foreground">{title}</p>}
      <ul className="space-y-1">
        {payload.map(p => (
          <li key={String(p.dataKey ?? p.name)} className="flex items-center gap-2">
            <span
              className="size-2 rounded-[2px]"
              style={{ background: p.color ?? p.payload?.fill }}
            />
            <span className="flex-1 text-muted-foreground">{p.name}</span>
            <span className="font-medium text-popover-foreground tabular">
              {fmtAiValue(p.value, format)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── blocks ───────────────────────────────────────────────────────────────────

function KpiBlock({ result }: { result: Extract<AiQueryResult, { kind: 'single' }> }) {
  return (
    <div className="flex flex-col justify-center gap-1.5 py-1">
      <span className="tabular text-[30px] leading-none font-semibold tracking-tight break-all">
        {fmtAiValue(result.value, result.format)}
      </span>
      {result.hint && <span className="text-xs text-muted-foreground">{result.hint}</span>}
    </div>
  );
}

const cap = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function BarBlock({ result, printable }: { result: SeriesResult; printable?: boolean }) {
  const series = result.series.slice(0, MAX_SERIES);
  const longLabels = result.points.some(p => String(p.label).length > 12);
  // ranked categories with long names read better as horizontal bars
  const horizontal = series.length === 1 && (result.points.length > 6 || longLabels);
  const values = result.points.flatMap(p => series.map(s => Number(p[s.key]) || 0));
  const tickFmt = (v: number) => fmtAiValue(v, result.format);

  return (
    <div className="space-y-2">
      <Legend series={series} />
      {horizontal ? (
        <ResponsiveContainer width="100%" height={Math.max(160, result.points.length * 30 + 32)}>
          <BarChart
            data={result.points}
            layout="vertical"
            margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
            barCategoryGap={6}
          >
            <CartesianGrid horizontal={false} stroke={GRID} />
            <XAxis
              type="number"
              tick={AXIS}
              axisLine={false}
              tickLine={false}
              tickFormatter={tickFmt}
              minTickGap={24}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={140}
              tick={{ ...AXIS, fill: 'var(--foreground)' }}
              axisLine={false}
              tickLine={false}
              interval={0}
              tickFormatter={(v: string) => cap(String(v), 22)}
            />
            {!printable && (
              <Tooltip
                cursor={{ fill: 'var(--accent)', opacity: 0.5 }}
                content={<AiTooltip format={result.format} />}
              />
            )}
            {series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={seriesColor(i, s.key)}
                maxBarSize={22}
                radius={[0, 4, 4, 0]}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={result.points}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            barCategoryGap="20%"
            barGap={2}
          >
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis
              dataKey="label"
              tick={AXIS}
              axisLine={false}
              tickLine={false}
              minTickGap={8}
              tickFormatter={(v: string) => cap(String(v), 14)}
            />
            <YAxis
              tick={AXIS}
              axisLine={false}
              tickLine={false}
              tickFormatter={tickFmt}
              width={axisWidth(values, result.format)}
            />
            {!printable && (
              <Tooltip
                cursor={{ fill: 'var(--accent)', opacity: 0.5 }}
                content={<AiTooltip format={result.format} />}
              />
            )}
            {series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={seriesColor(i, s.key)}
                maxBarSize={24}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function LineBlock({ result, printable }: { result: SeriesResult; printable?: boolean }) {
  const series = result.series.slice(0, MAX_SERIES);
  const values = result.points.flatMap(p => series.map(s => Number(p[s.key]) || 0));
  return (
    <div className="space-y-2">
      <Legend series={series} />
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={result.points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} minTickGap={20} />
          <YAxis
            tick={AXIS}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => fmtAiValue(v, result.format)}
            width={axisWidth(values, result.format)}
          />
          {!printable && (
            <Tooltip
              cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1, strokeOpacity: 0.5 }}
              content={<AiTooltip format={result.format} />}
            />
          )}
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={seriesColor(i, s.key)}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={result.points.length <= 1 ? { r: 4 } : false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** pie uses the first series; > 8 slices fold the tail into a neutral "Other" */
function PieBlock({ result, printable }: { result: SeriesResult; printable?: boolean }) {
  const s = result.series[0];
  if (!s) return <NoData />;
  const all = result.points
    .map(p => ({ key: String(p.label), label: String(p.label), value: Number(p[s.key]) || 0 }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);
  const data =
    all.length > MAX_SERIES
      ? [
          ...all.slice(0, MAX_SERIES - 1),
          {
            key: OTHER_KEY,
            label: `Other (${all.length - (MAX_SERIES - 1)})`,
            value: all.slice(MAX_SERIES - 1).reduce((t, d) => t + d.value, 0),
          },
        ]
      : all;
  if (!data.length) return <NoData />;
  const total = data.reduce((t, d) => t + d.value, 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="h-[200px] w-full max-w-[220px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {!printable && <Tooltip content={<AiTooltip format={result.format} />} />}
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="58%"
              outerRadius="92%"
              paddingAngle={data.length > 1 ? 1.5 : 0}
              stroke="var(--card)"
              strokeWidth={2}
              cornerRadius={4}
              isAnimationActive={false}
            >
              {data.map((d, i) => (
                <Cell key={d.key} fill={seriesColor(i, d.key)} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full min-w-0 space-y-1.5 text-xs">
        {data.map((d, i) => (
          <li key={d.key} className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ background: seriesColor(i, d.key) }}
            />
            <span className="min-w-0 flex-1 truncate text-muted-foreground" title={d.label}>
              {d.label}
            </span>
            <span className="font-medium tabular">{fmtAiValue(d.value, result.format)}</span>
            <span className="w-11 text-right text-muted-foreground tabular">
              {total ? `${((d.value / total) * 100).toFixed(1)}%` : '0%'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const NUMERIC = new Set<AiColumn['type']>(['number', 'money', 'percent']);

function TableBlock({ result, printable }: { result: AiQueryResult; printable?: boolean }) {
  let columns: AiColumn[];
  let rows: Record<string, unknown>[];
  let total: number;
  if (result.kind === 'rows') {
    ({ columns, rows, total } = result as RowsResult);
  } else if (result.kind === 'series') {
    columns = [
      { key: 'label', label: '', type: 'text' },
      ...result.series.map(s => ({ key: s.key, label: s.label, type: result.format })),
    ];
    rows = result.points;
    total = rows.length;
  } else {
    columns = [{ key: 'value', label: 'Value', type: result.format }];
    rows = [{ value: result.value }];
    total = 1;
  }
  if (!rows.length) return <NoData />;

  return (
    <div className="space-y-1.5">
      <div className={cn('overflow-auto rounded-lg border', !printable && 'max-h-80')}>
        <table className="w-full text-[13px]">
          <thead className="sticky top-0 z-[1] bg-muted">
            <tr>
              {columns.map(c => (
                <th
                  key={c.key}
                  className={cn(
                    'px-2.5 py-1.5 font-medium whitespace-nowrap text-muted-foreground',
                    NUMERIC.has(c.type) ? 'text-right' : 'text-left'
                  )}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                {columns.map(c => (
                  <td
                    key={c.key}
                    className={cn(
                      'px-2.5 py-1.5',
                      NUMERIC.has(c.type)
                        ? 'text-right whitespace-nowrap tabular'
                        : 'max-w-72 truncate'
                    )}
                    title={c.type === 'text' ? String(r[c.key] ?? '') : undefined}
                  >
                    {fmtAiValue(r[c.key], c.type)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > rows.length && (
        <p className="text-xs text-muted-foreground">
          Showing {fmtNumber(rows.length)} of {fmtNumber(total)}
        </p>
      )}
    </div>
  );
}

function NoData() {
  return (
    <div className="flex min-h-24 flex-col items-center justify-center gap-1.5 text-xs text-muted-foreground">
      <Inbox className="size-4" />
      No data for this yet
    </div>
  );
}

function BlockBody({ block, printable }: { block: AiRenderedBlock; printable?: boolean }) {
  const r = block.result;
  if (block.error) {
    return (
      <div className="flex items-start gap-2 rounded-lg bg-destructive/8 px-3 py-2.5 text-xs text-destructive">
        <AlertTriangle className="mt-px size-3.5 shrink-0" />
        <span>{block.error}</span>
      </div>
    );
  }
  if (!r) return <NoData />;
  if (block.component === 'table') return <TableBlock result={r} printable={printable} />;
  if (r.kind === 'single') return <KpiBlock result={r} />;
  if (r.kind === 'rows') return <TableBlock result={r} printable={printable} />;
  if (!r.points.length || !r.series.length) return <NoData />;
  if (block.component === 'line') return <LineBlock result={r} printable={printable} />;
  if (block.component === 'pie') return <PieBlock result={r} printable={printable} />;
  if (block.component === 'kpi') {
    // a KPI over a series: show the sum of the first series
    const k = r.series[0].key;
    const sum = r.points.reduce((t, p) => t + (Number(p[k]) || 0), 0);
    return <KpiBlock result={{ kind: 'single', value: sum, format: r.format }} />;
  }
  return <BarBlock result={r} printable={printable} />;
}

// ── canvas ───────────────────────────────────────────────────────────────────

export function AiCanvas({
  blocks,
  printable = false,
  className,
}: {
  blocks: AiRenderedBlock[];
  /** fixed 6-column layout, no scroll areas or hover chrome — for window.print() */
  printable?: boolean;
  className?: string;
}) {
  if (!blocks.length) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
        Nothing to show.
      </div>
    );
  }
  return (
    <div
      className={cn(
        'grid gap-3',
        printable ? 'grid-cols-6' : 'grid-cols-1 md:grid-cols-6',
        className
      )}
    >
      {blocks.map(b => (
        <section
          key={b.id}
          className={cn(
            'flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4 shadow-card break-inside-avoid',
            printable ? PRINT_SPAN[b.width] : SPAN[b.width]
          )}
        >
          <h3 className="text-sm leading-snug font-semibold">{b.title}</h3>
          <div className="min-w-0 flex-1">
            <BlockBody block={b} printable={printable} />
          </div>
        </section>
      ))}
    </div>
  );
}
