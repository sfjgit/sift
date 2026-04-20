/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import useSWR from 'swr';
import { usePermission } from '@/hooks/usePermission';
import { CreateBusinessUnitDialog } from '@/components/business-units/CreateBusinessUnitDialog';
import { useBusinessUnitsApi } from '@/lib/business-units.api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Link from 'next/link';
import {
  Building2,
  Users,
  Briefcase,
  ClipboardList,
  ChevronRight,
  TrendingUp,
  Layers,
  CheckCircle2,
  Clock,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BU {
  id: string;
  name: string;
  isActive: boolean;
  users: any[];
  teams: any[];
  clients: any[];
  requirements: any[];
  createdAt: string;
}

// ─── Palette for chart bars ───────────────────────────────────────────────────

const BAR_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8'];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.fill }} className="capitalize">
          {p.dataKey}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: any;
  label: string;
  value: number | string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-5 flex items-start gap-4 hover:shadow-sm transition-shadow">
      <div
        className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
        style={{ backgroundColor: accent + '18' }}
      >
        <Icon size={18} style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5 leading-none">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── BU Row Card ─────────────────────────────────────────────────────────────

function BUCard({ bu }: { bu: BU }) {
  const activeReqs = bu.requirements.filter(r => r.status === 'ACTIVE').length;
  const activeClients = bu.clients.filter(c => c.status === 'ACTIVE').length;

  return (
    <Link href={`/dashboard/business-units/${bu.id}`}>
      <div className="group rounded-xl border border-border bg-white p-5 hover:border-indigo-300 hover:shadow-md transition-all duration-150 cursor-pointer mt-3">
        <div className="flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
              <Building2 size={16} className="text-indigo-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-800 truncate">{bu.name}</h3>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    bu.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                  }`}
                >
                  {bu.isActive ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                  {bu.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Created{' '}
                {new Date(bu.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Right — metrics */}
          <div className="flex items-center gap-6 shrink-0">
            <Metric icon={Users} label="Users" value={bu.users.length} />
            <Metric icon={Layers} label="Teams" value={bu.teams.length} />
            <Metric
              icon={Briefcase}
              label="Clients"
              value={bu.clients.length}
              sub={activeClients > 0 ? `${activeClients} active` : undefined}
            />
            <Metric
              icon={ClipboardList}
              label="Reqs"
              value={bu.requirements.length}
              sub={activeReqs > 0 ? `${activeReqs} active` : undefined}
            />
            <ChevronRight
              size={16}
              className="text-gray-300 group-hover:text-indigo-400 transition-colors"
            />
          </div>
        </div>

        {/* Teams strip */}
        {bu.teams.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-1.5">
            {bu.teams.map((t: any) => (
              <span
                key={t.id}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"
              >
                {t.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: any;
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="text-center hidden sm:block">
      <div className="flex items-center gap-1 text-muted-foreground justify-center">
        <Icon size={11} />
        <span className="text-[10px] uppercase tracking-wide font-medium">{label}</span>
      </div>
      <p className="text-sm font-bold text-gray-800">{value}</p>
      {sub && <p className="text-[10px] text-emerald-600">{sub}</p>}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function BusinessUnitDashboard() {
  const api = useBusinessUnitsApi();
  const { data, isLoading } = useSWR('business-units', async () => {
    const res = await api.getAll();
    return res.data?.data as BU[];
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-56 rounded-xl bg-gray-100" />
          <div className="h-56 rounded-xl bg-gray-100" />
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  const list = data ?? [];

  // Aggregations
  const totalUsers = list.reduce((s, bu) => s + bu.users.length, 0);
  const totalClients = list.reduce((s, bu) => s + bu.clients.length, 0);
  const totalRequirements = list.reduce((s, bu) => s + bu.requirements.length, 0);
  const activeBUs = list.filter(bu => bu.isActive).length;

  // Chart data
  const chartData = list.map(bu => ({
    name: bu.name,
    Users: bu.users.length,
    Clients: bu.clients.length,
    Teams: bu.teams.length,
    Reqs: bu.requirements.length,
  }));

  return (
    <div className="space-y-6">
      {/* ── Stat Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Building2}
          label="Business Units"
          value={list.length}
          sub={`${activeBUs} active`}
          accent="#6366f1"
        />
        <StatCard icon={Users} label="Total Users" value={totalUsers} accent="#8b5cf6" />
        <StatCard icon={Briefcase} label="Total Clients" value={totalClients} accent="#0ea5e9" />
        <StatCard
          icon={ClipboardList}
          label="Requirements"
          value={totalRequirements}
          accent="#10b981"
        />
      </div>

      {/* ── Charts ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Users & Teams per BU */}
        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} className="text-indigo-500" />
            <p className="text-sm font-semibold text-gray-700">Users per Business Unit</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barSize={32}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="Users" radius={[6, 6, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Clients per BU */}
        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase size={15} className="text-sky-500" />
            <p className="text-sm font-semibold text-gray-700">Clients per Business Unit</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barSize={32}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f0f9ff' }} />
              <Bar dataKey="Clients" radius={[6, 6, 0, 0]} fill="#0ea5e9">
                {chartData.map((_, i) => (
                  <Cell key={i} fill={['#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd'][i % 4]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── BU List ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">All Business Units</h2>
          <span className="text-xs text-muted-foreground">{list.length} total</span>
        </div>
        <div className="space-y-3">
          {list.map(bu => (
            <BUCard key={bu.id} bu={bu} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BusinessUnitsPage() {
  const canView = usePermission('business_units', 'canView');
  const canAdd = usePermission('business_units', 'canAdd');

  return (
    <div className="max-w-8xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-semibold text-foreground tracking-tight"
            style={{ letterSpacing: '-0.02em' }}
          >
            Business Units
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your organisation&apos;s business units, teams, and headcount
          </p>
        </div>
        {canAdd && <CreateBusinessUnitDialog />}
      </div>

      <div className="border-t border-border" />

      {canView ? (
        <BusinessUnitDashboard />
      ) : (
        <div className="flex items-center justify-center h-40 border border-dashed border-border rounded-lg">
          <p className="text-sm text-muted-foreground">
            You don&apos;t have permission to view business units.
          </p>
        </div>
      )}
    </div>
  );
}
