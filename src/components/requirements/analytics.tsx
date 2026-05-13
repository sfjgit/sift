// File: page.tsx
// Path: src/app/(dashboard)/requirements/analytics/page.tsx

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BarChart3, TrendingUp, Users, Building2, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAxios } from '@/hooks/useAxios';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StageCount {
  code: string;
  label: string;
  count: number;
}

interface AggRow {
  name: string;
  total: number;
  byStage: StageCount[];
}

interface AnalyticsData {
  byClient: (AggRow & { clientId: string })[];
  byBU: (AggRow & { buId: string })[];
  bySpoc: (AggRow & { spocId: string })[];
  overall: { total: number; rejected: number; withdrawn: number; onHold: number };
  stages: { id: string; code: string; label: string; order: number }[];
}

interface AnalyticsResponse {
  success: boolean;
  data: AnalyticsData;
}

// ─── Stage Colors ─────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  '01': '#94a3b8',
  '02': '#3b82f6',
  '03': '#6366f1',
  '04': '#8b5cf6',
  '05': '#a855f7',
  '06': '#f59e0b',
  '07': '#f97316',
  '07A': '#fb923c',
  '07B': '#ea580c',
  '08': '#10b981',
  '09': '#16a34a',
  '10': '#15803d',
};

// ─── Funnel Bar ───────────────────────────────────────────────────────────────

function FunnelBar({ stages, total }: { stages: StageCount[]; total: number }) {
  const nonZero = stages.filter(s => s.count > 0);
  if (!nonZero.length) return <div className="h-4 bg-slate-100 rounded-full" />;

  return (
    <div className="flex h-4 rounded-full overflow-hidden gap-px">
      {nonZero.map(s => {
        const pct = total > 0 ? (s.count / total) * 100 : 0;
        return (
          <div
            key={s.code}
            title={`${s.label}: ${s.count}`}
            className="h-full transition-all"
            style={{
              width: `${pct}%`,
              backgroundColor: STAGE_COLORS[s.code] ?? '#94a3b8',
              minWidth: pct > 0 ? '4px' : '0',
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Agg Table ────────────────────────────────────────────────────────────────

function AggTable({ rows, stages }: { rows: AggRow[]; stages: AnalyticsData['stages'] }) {
  if (!rows.length) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-slate-400">No data</div>
    );
  }

  const maxTotal = Math.max(...rows.map(r => r.total), 1);

  return (
    <div className="space-y-3">
      {/* Stage legend */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-100">
        {stages
          .filter(s => rows.some(r => r.byStage.find(b => b.code === s.code && b.count > 0)))
          .map(s => (
            <span key={s.code} className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: STAGE_COLORS[s.code] ?? '#94a3b8' }}
              />
              {s.label}
            </span>
          ))}
      </div>

      {/* Rows */}
      {rows
        .sort((a, b) => b.total - a.total)
        .map((row, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-800 truncate max-w-[60%]">
                {row.name}
              </span>
              <span className="text-xs font-bold text-slate-600">{row.total} candidates</span>
            </div>
            <FunnelBar stages={row.byStage} total={row.total} />
            {/* Stage breakdown chips */}
            <div className="flex flex-wrap gap-1">
              {row.byStage
                .filter(s => s.count > 0)
                .map(s => (
                  <span
                    key={s.code}
                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${STAGE_COLORS[s.code] ?? '#94a3b8'}18`,
                      color: STAGE_COLORS[s.code] ?? '#64748b',
                    }}
                  >
                    {s.label}: {s.count}
                  </span>
                ))}
            </div>
          </div>
        ))}
    </div>
  );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center px-5 py-3 rounded-xl border border-slate-100 bg-white">
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-[11px] text-slate-400 mt-0.5">{label}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RequirementsAnalyticsPage() {
  const router = useRouter();
  const axios = useAxios();
  const [buId, setBuId] = useState('');
  const [clientId, setClientId] = useState('');

  const { data: analyticsRes, isLoading } = useQuery<AnalyticsResponse>({
    queryKey: ['requirement-analytics', buId, clientId],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (buId) p.set('buId', buId);
      if (clientId) p.set('clientId', clientId);
      return (await axios.get(`/requirements/analytics?${p}`)).data;
    },
    staleTime: 30_000,
  });

  const { data: clientsRes } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['clients-dropdown'],
    queryFn: async () => (await axios.get('/clients?limit=200&status=ACTIVE')).data,
    staleTime: 60_000,
  });

  const { data: busRes } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['bus-dropdown'],
    queryFn: async () => (await axios.get('/business-units?limit=100')).data,
    staleTime: 60_000,
  });

  const data = analyticsRes?.data;
  const clients = clientsRes?.data ?? [];
  const businessUnits = busRes?.data ?? [];

  return (
    <div className="flex flex-col h-[calc(100vh-var(--sidebar-header-height,56px))] overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="flex-none bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Pipeline Analytics
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Candidate flow by client, business unit, and SPOC
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Select
              value={clientId || '_all'}
              onValueChange={v => setClientId(v === '_all' ? '' : v)}
            >
              <SelectTrigger className="h-8 text-xs w-40">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Clients</SelectItem>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={buId || '_all'} onValueChange={v => setBuId(v === '_all' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue placeholder="All BUs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All BUs</SelectItem>
                {businessUnits.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Overall stats */}
        {isLoading ? (
          <div className="flex gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[68px] w-28 rounded-xl" />
            ))}
          </div>
        ) : data ? (
          <div className="flex gap-3">
            <StatPill label="Total Candidates" value={data.overall.total} color="text-slate-800" />
            <StatPill label="Rejected" value={data.overall.rejected} color="text-red-600" />
            <StatPill label="Withdrawn" value={data.overall.withdrawn} color="text-slate-500" />
            <StatPill label="On Hold" value={data.overall.onHold} color="text-amber-600" />
            <StatPill
              label="Active"
              value={data.overall.total - data.overall.rejected - data.overall.withdrawn}
              color="text-emerald-600"
            />
          </div>
        ) : null}
      </div>

      {/* Tabs */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Tabs defaultValue="client" className="flex flex-col h-full">
          <div className="shrink-0 bg-white border-b border-slate-100 px-6">
            <TabsList className="h-auto gap-0 bg-transparent p-0">
              {[
                { value: 'client', label: 'By Client', icon: TrendingUp },
                { value: 'bu', label: 'By Business Unit', icon: Building2 },
                { value: 'spoc', label: 'By SPOC', icon: UserCheck },
              ].map(t => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="rounded-none border-b-2 border-transparent px-5 pb-2.5 pt-1 text-xs font-medium text-slate-500 data-[state=active]:border-primary data-[state=active]:text-slate-900 data-[state=active]:shadow-none bg-transparent whitespace-nowrap flex items-center gap-1.5"
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-4 w-full rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <TabsContent value="client" className="mt-0 p-6">
                  {data && <AggTable rows={data.byClient} stages={data.stages} />}
                </TabsContent>
                <TabsContent value="bu" className="mt-0 p-6">
                  {data && <AggTable rows={data.byBU} stages={data.stages} />}
                </TabsContent>
                <TabsContent value="spoc" className="mt-0 p-6">
                  {data && <AggTable rows={data.bySpoc} stages={data.stages} />}
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
