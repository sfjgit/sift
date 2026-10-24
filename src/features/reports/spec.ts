// File: spec.ts
// Path: src/features/reports/spec.ts
//
// A report is plain JSON (saved through /views, module "reports"):
// "count <entity> grouped by <groupBy>, split by <splitBy>, filtered, drawn as <viz>".
// Dimensions mirror crm-core-service report.validators.ts.

import {
  BarChart3,
  Building2,
  Gauge,
  LineChart,
  MailCheck,
  Map,
  PieChart,
  Grid3x3,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { STATUS_COLORS } from '@/components/charts/Charts';
import type { FilterDef } from '@/components/data-table';
import { clientFilters } from '@/features/clients/columns';
import { spocFilters } from '@/features/spocs/columns';
import type { ReportEntity, TrendInterval } from '@/types/reports';

export type Viz = 'bar' | 'stacked' | 'donut' | 'table' | 'trend';

export interface ReportSpec {
  entity: ReportEntity;
  groupBy: string;
  splitBy?: string | null;
  filters: Record<string, string>;
  filterLabels?: Record<string, string>;
  from?: string | null;
  to?: string | null;
  limit: number;
  viz: Viz;
  interval?: TrendInterval;
  percent?: boolean;
}

export interface Dim {
  key: string;
  label: string;
  /** list-endpoint filter key used for drill-down; absent = can't drill */
  drill?: string;
}

export const DIMS: Record<ReportEntity, Dim[]> = {
  spocs: [
    { key: 'handler', label: 'Handler', drill: 'handlerId' },
    { key: 'salesStatus', label: 'Sales status', drill: 'salesStatusId' },
    { key: 'validationBand', label: 'Quality band', drill: 'validationBand' },
    { key: 'emailStatus', label: 'Email status', drill: 'emailStatus' },
    { key: 'businessUnit', label: 'Business unit', drill: 'businessUnitId' },
    { key: 'serviceLine', label: 'Service line', drill: 'serviceLineId' },
    { key: 'client', label: 'Client', drill: 'clientId' },
    { key: 'source', label: 'Source' },
    { key: 'emailSource', label: 'Email source' },
    { key: 'seniority', label: 'Seniority' },
    { key: 'department', label: 'Department' },
    { key: 'state', label: 'State (work location)' },
    { key: 'isPrimary', label: 'Primary SPOC' },
  ],
  clients: [
    { key: 'status', label: 'Status', drill: 'status' },
    { key: 'industry', label: 'Industry', drill: 'industryId' },
    { key: 'category', label: 'Category', drill: 'categoryId' },
    { key: 'state', label: 'State', drill: 'state' },
    { key: 'city', label: 'City', drill: 'city' },
    { key: 'createdBy', label: 'Added by' },
  ],
};

export const dimLabel = (entity: ReportEntity, key?: string | null) =>
  DIMS[entity].find(d => d.key === key)?.label ?? key ?? '';

export const FILTERS: Record<ReportEntity, FilterDef[]> = {
  spocs: spocFilters,
  clients: [{ key: 'status', label: 'Status', type: 'select', options: [
    { value: 'PENDING', label: 'Pending approval' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
  ] }, ...clientFilters],
};

/** Split dimensions that carry state get the status palette, not categorical slots. */
export const STATUS_SPLIT_COLORS: Record<string, Record<string, string>> = {
  validationBand: {
    READY: STATUS_COLORS.good,
    REVIEW: STATUS_COLORS.warning,
    NOT_USABLE: STATUS_COLORS.critical,
    __none: STATUS_COLORS.neutral,
  },
  emailStatus: {
    GOOD: STATUS_COLORS.good,
    RISKY: STATUS_COLORS.warning,
    BAD: STATUS_COLORS.critical,
    UNVERIFIED: STATUS_COLORS.neutral,
  },
  status: {
    ACTIVE: STATUS_COLORS.good,
    PENDING: STATUS_COLORS.warning,
    INACTIVE: STATUS_COLORS.neutral,
  },
};

export const DEFAULT_SPEC: ReportSpec = {
  entity: 'spocs',
  groupBy: 'handler',
  splitBy: null,
  filters: {},
  limit: 15,
  viz: 'bar',
  interval: 'week',
};

export interface Template {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  spec: ReportSpec;
}

const t = (s: Partial<ReportSpec>): ReportSpec => ({ ...DEFAULT_SPEC, ...s, filters: s.filters ?? {} });

export const TEMPLATES: Template[] = [
  {
    id: 'leaderboard',
    title: 'Handler leaderboard',
    description: 'SPOCs per handler, split by quality band',
    icon: Trophy,
    spec: t({ entity: 'spocs', groupBy: 'handler', splitBy: 'validationBand', viz: 'stacked' }),
  },
  {
    id: 'pipeline',
    title: 'Pipeline by sales status',
    description: 'Where your active SPOCs stand',
    icon: BarChart3,
    spec: t({ entity: 'spocs', groupBy: 'salesStatus', viz: 'bar' }),
  },
  {
    id: 'quality',
    title: 'Data quality by BU',
    description: 'Ready / Review / Not usable per business unit',
    icon: Gauge,
    spec: t({ entity: 'spocs', groupBy: 'businessUnit', splitBy: 'validationBand', viz: 'stacked', percent: true }),
  },
  {
    id: 'email-health',
    title: 'Email health by handler',
    description: 'Verified vs risky vs bouncing addresses',
    icon: MailCheck,
    spec: t({ entity: 'spocs', groupBy: 'handler', splitBy: 'emailStatus', viz: 'stacked' }),
  },
  {
    id: 'coverage',
    title: 'Client coverage by state',
    description: 'Where your clients are headquartered',
    icon: Map,
    spec: t({ entity: 'clients', groupBy: 'state', viz: 'bar', limit: 20 }),
  },
  {
    id: 'industry',
    title: 'Industry mix',
    description: 'Share of clients per industry',
    icon: PieChart,
    spec: t({ entity: 'clients', groupBy: 'industry', viz: 'donut', limit: 8 }),
  },
  {
    id: 'status-category',
    title: 'Client status by category',
    description: 'Pending, active and inactive per category',
    icon: Building2,
    spec: t({ entity: 'clients', groupBy: 'category', splitBy: 'status', viz: 'stacked' }),
  },
  {
    id: 'bu-sl',
    title: 'BU × service line matrix',
    description: 'Every combination, as a pivot table',
    icon: Grid3x3,
    spec: t({ entity: 'spocs', groupBy: 'serviceLine', splitBy: 'businessUnit', viz: 'table', limit: 50 }),
  },
  {
    id: 'growth',
    title: 'SPOC growth',
    description: 'New SPOCs per week by handler',
    icon: LineChart,
    spec: t({ entity: 'spocs', groupBy: 'handler', viz: 'trend', interval: 'week' }),
  },
];

/** Query params for /reports/breakdown */
export const breakdownParams = (s: ReportSpec) => ({
  entity: s.entity,
  groupBy: s.groupBy,
  splitBy: s.splitBy || undefined,
  limit: s.limit,
  from: s.from || undefined,
  to: s.to || undefined,
  ...s.filters,
});

/** List-page URL for the records behind a cell (null when the dimension can't be filtered). */
export function drillHref(s: ReportSpec, rowKey: string, splitKey?: string): string | null {
  const g = DIMS[s.entity].find(d => d.key === s.groupBy);
  if (!g?.drill || rowKey === '__none' || rowKey === '__other') return null;
  const sp = new URLSearchParams(s.filters);
  sp.set(g.drill, rowKey);
  if (splitKey) {
    const sd = DIMS[s.entity].find(d => d.key === s.splitBy);
    if (!sd?.drill || splitKey === '__none' || splitKey === '__other') return null;
    sp.set(sd.drill, splitKey);
  }
  return `/${s.entity}?${sp.toString()}`;
}
