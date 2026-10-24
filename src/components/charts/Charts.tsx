// File: Charts.tsx
// Path: src/components/charts/Charts.tsx
//
// Chart kit on recharts. One visual language everywhere:
//   • categorical colours = --chart-1..8 in fixed order (validated for CVD);
//     a 9th+ series folds into "Other" (neutral) — never a generated hue
//   • bars ≤ 24px, 4px rounded data-end, 2px surface gaps; lines 2px; area wash ~10%
//   • hairline solid grid, recessive axes; text uses text tokens, never series colours
//   • every chart has a hover tooltip; ≥ 2 series always get a legend
//   • onSelect(key) lets callers drill into the records behind a mark

'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { fmtNumber } from '@/lib/format';

export const MAX_SERIES = 8;
export const OTHER_KEY = '__other';
export const NONE_KEY = '__none';

export const seriesColor = (i: number, key?: string) =>
  key === OTHER_KEY || key === NONE_KEY || i >= MAX_SERIES ? 'var(--muted-foreground)' : `var(--chart-${i + 1})`;

const compact = (n: number) =>
  Math.abs(n) >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : Math.abs(n) >= 1e3 ? `${+(n / 1e3).toFixed(1)}K` : String(n);

const AXIS = { fontSize: 11, fill: 'var(--muted-foreground)' };
const GRID = 'var(--border)';

export interface Series {
  key: string;
  label: string;
  /** override colour (status palettes) — otherwise slot order */
  color?: string;
}

const colorOf = (s: Series, i: number) => s.color ?? seriesColor(i, s.key);

// ── shared pieces ────────────────────────────────────────────────────────────

export function Legend({ series, className }: { series: Series[]; className?: string }) {
  if (series.length < 2) return null;
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground', className)}>
      {series.map((s, i) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: colorOf(s, i) }} />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

interface TooltipRow {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  series,
  showTotal,
}: {
  active?: boolean;
  payload?: TooltipRow[];
  label?: string | number;
  labelFormatter?: (l: string) => string;
  series?: Series[];
  showTotal?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const title = labelFormatter ? labelFormatter(String(label ?? '')) : String(label ?? payload[0]?.payload?.label ?? '');
  const rows = payload.filter(p => Number(p.value) > 0 || payload.length === 1);
  const total = payload.reduce((s, p) => s + Number(p.value || 0), 0);
  return (
    <div className="min-w-40 rounded-lg border bg-popover px-3 py-2 text-xs shadow-float">
      {title && <p className="mb-1.5 font-medium text-popover-foreground">{title}</p>}
      <ul className="space-y-1">
        {rows.map(p => {
          const s = series?.find(x => x.key === p.dataKey);
          return (
            <li key={String(p.dataKey)} className="flex items-center gap-2">
              <span className="size-2 rounded-[2px]" style={{ background: p.color }} />
              <span className="flex-1 text-muted-foreground">{s?.label ?? p.name}</span>
              <span className="font-medium text-popover-foreground tabular">{fmtNumber(Number(p.value))}</span>
            </li>
          );
        })}
      </ul>
      {showTotal && rows.length > 1 && (
        <p className="mt-1.5 flex justify-between border-t pt-1.5 text-muted-foreground">
          Total <span className="font-medium text-popover-foreground tabular">{fmtNumber(total)}</span>
        </p>
      )}
    </div>
  );
}

// ── horizontal bars (ranked categories) ──────────────────────────────────────

export interface CategoryDatum {
  key: string;
  label: string;
  [series: string]: string | number;
}

/**
 * Ranked categories. One series → plain bars with value labels at the tip;
 * several series → stacked segments with 2px surface gaps.
 */
export function HBarChart({
  data,
  series,
  onSelect,
  height,
  labelWidth = 140,
}: {
  data: CategoryDatum[];
  series: Series[];
  onSelect?: (rowKey: string, seriesKey?: string) => void;
  height?: number;
  labelWidth?: number;
}) {
  const stacked = series.length > 1;
  const h = height ?? Math.max(160, data.length * 34 + 24);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: stacked ? 12 : 44, bottom: 4, left: 4 }} barCategoryGap={8}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={compact} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={labelWidth}
          tick={{ ...AXIS, fill: 'var(--foreground)' }}
          axisLine={false}
          tickLine={false}
          interval={0}
          tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)}
        />
        <Tooltip
          cursor={{ fill: 'var(--accent)', opacity: 0.5 }}
          content={<ChartTooltip series={series} showTotal={stacked} />}
        />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId={stacked ? 'a' : undefined}
            fill={colorOf(s, i)}
            maxBarSize={24}
            stroke="var(--card)"
            strokeWidth={stacked ? 2 : 0}
            radius={!stacked || i === series.length - 1 ? [0, 4, 4, 0] : 0}
            cursor={onSelect ? 'pointer' : undefined}
            onClick={(d: { payload?: CategoryDatum }) => d.payload && onSelect?.(d.payload.key, stacked ? s.key : undefined)}
            isAnimationActive={false}
          >
            {!stacked && (
              <LabelList
                dataKey={s.key}
                position="right"
                className="tabular"
                style={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                formatter={(v: unknown) => fmtNumber(Number(v))}
              />
            )}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── columns over time / categories ───────────────────────────────────────────

export function ColumnChart({
  data,
  series,
  xKey = 'label',
  xFormatter,
  onSelect,
  height = 260,
}: {
  data: Record<string, string | number>[];
  series: Series[];
  xKey?: string;
  xFormatter?: (v: string) => string;
  onSelect?: (xValue: string, seriesKey?: string) => void;
  height?: number;
}) {
  const stacked = series.length > 1;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barCategoryGap="22%">
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey={xKey} tick={AXIS} axisLine={false} tickLine={false} tickFormatter={xFormatter} minTickGap={12} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={compact} allowDecimals={false} width={44} />
        <Tooltip
          cursor={{ fill: 'var(--accent)', opacity: 0.5 }}
          content={<ChartTooltip series={series} showTotal={stacked} labelFormatter={xFormatter} />}
        />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId={stacked ? 'a' : undefined}
            fill={colorOf(s, i)}
            maxBarSize={24}
            stroke="var(--card)"
            strokeWidth={stacked ? 2 : 0}
            radius={!stacked || i === series.length - 1 ? [4, 4, 0, 0] : 0}
            cursor={onSelect ? 'pointer' : undefined}
            onClick={(d: { payload?: Record<string, string | number> }) =>
              d.payload && onSelect?.(String(d.payload[xKey]), stacked ? s.key : undefined)
            }
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── trend (line / area) ──────────────────────────────────────────────────────

export const bucketLabel = (interval: 'day' | 'week' | 'month') => (iso: string) => {
  try {
    const d = parseISO(iso);
    return interval === 'month' ? format(d, 'MMM yy') : format(d, 'd MMM');
  } catch {
    return iso;
  }
};

export function TrendChart({
  data,
  series,
  xFormatter,
  variant = 'area',
  height = 260,
}: {
  data: Record<string, string | number>[];
  series: Series[];
  xFormatter?: (v: string) => string;
  variant?: 'area' | 'line';
  height?: number;
}) {
  const Chart = variant === 'area' ? AreaChart : LineChart;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <Chart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="bucket" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={xFormatter} minTickGap={24} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={compact} allowDecimals={false} width={44} />
        <Tooltip
          cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1, strokeOpacity: 0.5 }}
          content={<ChartTooltip series={series} labelFormatter={xFormatter} showTotal={series.length > 1} />}
        />
        {series.map((s, i) =>
          variant === 'area' ? (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={colorOf(s, i)}
              strokeWidth={2}
              fill={colorOf(s, i)}
              fillOpacity={0.1}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
              isAnimationActive={false}
            />
          ) : (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={colorOf(s, i)}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
              isAnimationActive={false}
            />
          )
        )}
      </Chart>
    </ResponsiveContainer>
  );
}

// ── donut (part-to-whole, few slices) ────────────────────────────────────────

export function DonutChart({
  data,
  centerLabel,
  onSelect,
  height = 220,
}: {
  data: { key: string; label: string; value: number; color?: string }[];
  centerLabel?: string;
  onSelect?: (key: string) => void;
  height?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const shown = data.filter(d => d.value > 0);
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<ChartTooltip />} />
          <Pie
            data={shown}
            dataKey="value"
            nameKey="label"
            innerRadius="64%"
            outerRadius="92%"
            paddingAngle={shown.length > 1 ? 1.5 : 0}
            stroke="var(--card)"
            strokeWidth={2}
            cornerRadius={4}
            isAnimationActive={false}
            onClick={(_: unknown, index: number) => shown[index] && onSelect?.(shown[index].key)}
            cursor={onSelect ? 'pointer' : undefined}
          >
            {shown.map(d => (
              <Cell key={d.key} fill={d.color ?? seriesColor(data.indexOf(d), d.key)} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tracking-tight tabular">{fmtNumber(total)}</span>
        {centerLabel && <span className="text-xs text-muted-foreground">{centerLabel}</span>}
      </div>
    </div>
  );
}

/** Stacked 100% meter — status breakdowns (Ready / Review / Not usable). */
export function SegmentBar({
  segments,
  onSelect,
}: {
  segments: { key: string; label: string; value: number; color: string }[];
  onSelect?: (key: string) => void;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-muted">
        {total > 0 &&
          segments
            .filter(s => s.value > 0)
            .map(s => (
              <button
                key={s.key}
                type="button"
                title={`${s.label}: ${fmtNumber(s.value)}`}
                aria-label={`${s.label}: ${fmtNumber(s.value)}`}
                onClick={() => onSelect?.(s.key)}
                className="h-full transition-opacity first:rounded-l-full last:rounded-r-full hover:opacity-80"
                style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
              />
            ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {segments.map(s => (
          <li key={s.key}>
            <button
              type="button"
              onClick={() => onSelect?.(s.key)}
              className="group flex w-full flex-col items-start rounded-md text-left"
            >
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground group-hover:text-foreground">
                <span className="size-2 rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="mt-0.5 text-lg font-semibold tabular">
                {fmtNumber(s.value)}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  {total ? Math.round((s.value / total) * 100) : 0}%
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const STATUS_COLORS = {
  good: 'var(--success)',
  warning: 'var(--warning)',
  critical: 'var(--destructive)',
  neutral: 'var(--muted-foreground)',
  info: 'var(--info)',
};
