/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import useSWR from 'swr';
import { useBusinessUnitsApi } from '@/lib/business-units.api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

export function BusinessUnitDashboard() {
  const api = useBusinessUnitsApi();

  const { data, isLoading } = useSWR('business-units', async () => {
    const res = await api.getAll();
    return res.data?.data;
  });

  if (isLoading) return <div>Loading...</div>;

  const list = data ?? [];

  // ── Aggregations ─────────────────────────────
  const totalUsers = list.reduce((acc: any, bu: any) => {
    return acc + bu.users.length;
  }, 0);
  const totalClients = list.reduce((acc: any, bu: any) => acc + bu.clients.length, 0);

  const totalRequirements = list.reduce((acc: any, bu: any) => acc + bu.requirements.length, 0);

  const chartData = list.map((bu: any) => ({
    name: bu.name,
    users: bu.users.length,
    clients: bu.clients.length,
  }));

  return (
    <div className="space-y-6">
      {/* ── Summary Cards ───────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        <Card title="Business Units" value={list.length} />
        <Card title="Users" value={totalUsers} />
        <Card title="Clients" value={totalClients} />
        <Card title="Requirements" value={totalRequirements} />
      </div>

      {/* ── Charts ─────────────────────────── */}
      <div className="grid grid-cols-2 gap-6">
        <ChartCard title="Users per BU">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="users" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Clients per BU">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="clients" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Modern List ─────────────────────── */}
      <div className="grid gap-4">
        {list.map((bu: any) => (
          <Link key={bu.id} href={`/dashboard/business-units/${bu.id}`}>
            <div
              key={bu.id}
              className="rounded-lg border bg-white p-4 flex justify-between items-center hover:shadow-sm transition"
            >
              <div>
                <h3 className="text-sm font-semibold text-gray-800">{bu.name}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {bu.users.length} Users • {bu.teams.length} Teams • {bu.clients.length} Clients
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-600">
                <span>{bu.requirements.length} Reqs</span>
                <span
                  className={`px-2 py-0.5 rounded-full ${
                    bu.isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}
                >
                  {bu.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="text-xl font-semibold text-gray-800 mt-1">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: any) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-sm font-medium text-gray-700 mb-3">{title}</p>
      {children}
    </div>
  );
}
