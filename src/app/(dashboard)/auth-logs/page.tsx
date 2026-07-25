// File: page.tsx
// Path: src/app/(dashboard)/auth-logs/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Search, RefreshCw, AlertCircle, ShieldOff, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useAxios } from '@/hooks/useAxios';
import { useAuth } from '@/context/AuthContext';

interface AuthLogRow {
  id: string;
  userId: string;
  type: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string };
}

interface AuthLogsResponse {
  success: boolean;
  data: AuthLogRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface Department {
  id: string;
  name: string;
}

const EVENT_TYPES = [
  { value: 'ALL', label: 'All events' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'FAILED_LOGIN', label: 'Failed login' },
];

const TYPE_BADGE: Record<string, string> = {
  LOGIN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  LOGOUT: 'bg-blue-50 text-blue-700 border-blue-200',
  FAILED_LOGIN: 'bg-rose-50 text-rose-700 border-rose-200',
};

function parseDevice(ua: string | null): string {
  if (!ua) return '—';
  if (ua.includes('Postman')) return 'Postman';
  if (ua.includes('Thunder Client')) return 'Thunder Client';
  const browser = /Chrome/.test(ua)
    ? 'Chrome'
    : /Firefox/.test(ua)
      ? 'Firefox'
      : /Safari/.test(ua)
        ? 'Safari'
        : /Edge/.test(ua)
          ? 'Edge'
          : 'Unknown';
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Mac/.test(ua)
      ? 'macOS'
      : /Linux/.test(ua)
        ? 'Linux'
        : /Android/.test(ua)
          ? 'Android'
          : /iPhone|iPad/.test(ua)
            ? 'iOS'
            : '';
  return os ? `${browser}, ${os}` : browser;
}

function initials(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}

function PageSkeleton() {
  return (
    <div className="p-6 space-y-3">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export default function AuthLogsPage() {
  const axios = useAxios();
  const { user, can } = useAuth();

  const isSuperAdmin = user?.isSuperAdmin === true;
  const hasAccess = isSuperAdmin || can('auth-logs', 'canView');

  const [search, setSearch] = useState('');
  const [type, setType] = useState('ALL');
  const [departmentId, setDepartmentId] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  // Fetch departments list
  const { data: departmentsData } = useQuery({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const res = await axios.get('/departments');
      return res.data as { success: boolean; data: Department[] };
    },
    enabled: hasAccess,
  });

  const departments = departmentsData?.data ?? [];

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('limit', '20');
    if (type !== 'ALL') p.set('type', type);
    if (departmentId !== 'ALL') p.set('departmentId', departmentId);
    if (startDate) p.set('startDate', startDate);
    if (endDate) p.set('endDate', endDate);
    return p.toString();
  }, [page, type, departmentId, startDate, endDate]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['auth-logs', queryParams],
    queryFn: async () => {
      const res = await axios.get(`/auth-logs?${queryParams}`);
      return res.data as AuthLogsResponse;
    },
    enabled: hasAccess,
    placeholderData: prev => prev,
  });

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <ShieldOff className="w-10 h-10 text-slate-300" />
        <p className="text-sm font-semibold text-slate-600">You cannot view this page.</p>
      </div>
    );
  }

  if (isLoading) return <PageSkeleton />;

  const rows = data?.data ?? [];
  const filteredRows = search.trim()
    ? rows.filter(r =>
        `${r.user.firstName} ${r.user.lastName} ${r.user.email}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())
      )
    : rows;
  const pagination = data?.pagination;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      <div className="border-b border-slate-200 px-6 py-4 shrink-0">
        <h1 className="text-base font-bold text-slate-900">Login activity</h1>
        <p className="text-xs text-slate-500 mt-1">
          Login, logout, and failed login events across the platform.
        </p>
      </div>

      <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-200 bg-slate-50 shrink-0 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            placeholder="Search by name or email"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm w-56 border-slate-200"
          />
        </div>

        <Select
          value={type}
          onValueChange={v => {
            setType(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-8 text-sm w-40 border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EVENT_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value} className="text-sm">
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={departmentId}
          onValueChange={v => {
            setDepartmentId(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-8 text-sm w-44 border-slate-200">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-sm">
              All departments
            </SelectItem>
            {departments.map(d => (
              <SelectItem key={d.id} value={d.id} className="text-sm">
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={startDate}
          onChange={e => {
            setStartDate(e.target.value);
            setPage(1);
          }}
          className="h-8 text-sm w-36 border-slate-200"
        />
        <Input
          type="date"
          value={endDate}
          onChange={e => {
            setEndDate(e.target.value);
            setPage(1);
          }}
          className="h-8 text-sm w-36 border-slate-200"
        />

        <button
          onClick={() => refetch()}
          className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors ml-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-72 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-700">No matching events</p>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-bold text-[10px] uppercase tracking-wide text-slate-700">
                  User
                </th>
                <th className="text-left px-4 py-2.5 font-bold text-[10px] uppercase tracking-wide text-slate-700">
                  Event
                </th>
                <th className="text-left px-4 py-2.5 font-bold text-[10px] uppercase tracking-wide text-slate-700">
                  IP address
                </th>
                <th className="text-left px-4 py-2.5 font-bold text-[10px] uppercase tracking-wide text-slate-700">
                  Device
                </th>
                <th className="text-left px-4 py-2.5 font-bold text-[10px] uppercase tracking-wide text-slate-700">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map(row => (
                <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                        {initials(row.user.firstName, row.user.lastName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {row.user.firstName} {row.user.lastName}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{row.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span
                      className={`inline-flex text-xs font-bold px-2.5 py-1 rounded-full border ${TYPE_BADGE[row.type] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}
                    >
                      {row.type.replace(/_/g, ' ').toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-slate-600">{row.ip ?? '—'}</td>
                  <td className="px-4 py-3 align-top text-xs text-slate-600">
                    {parseDevice(row.userAgent)}
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(row.createdAt), 'dd MMM yyyy, HH:mm')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 shrink-0">
          <span className="text-xs text-slate-500">
            {pagination.total} total · page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              Prev
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
