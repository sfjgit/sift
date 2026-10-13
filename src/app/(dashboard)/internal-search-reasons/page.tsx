// File: page.tsx
// Path: src/app/(dashboard)/internal-search-reasons/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, MessageSquareText, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAxios } from '@/hooks/useAxios';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PortalRecruitLogRow {
  id: string;
  appName: string;
  reason: string;
  createdAt: string;
  requirementId: string;
  assignmentId: string;
  reqCode: string | null;
  requirementTitle: string | null;
  clientName: string | null;
  recruiter: {
    id: string;
    name: string;
    employeeId: string | null;
    role: string | null;
    reportingTo: string | null;
  };
}

interface LogsResponse {
  success: boolean;
  data: PortalRecruitLogRow[];
  meta: { total: number; page: number; limit: number; pages: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avatarColor(seed: string) {
  const c = [
    'bg-blue-100 text-blue-700',
    'bg-violet-100 text-violet-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-cyan-100 text-cyan-700',
  ];
  return c[(seed.charCodeAt(0) || 0) % c.length];
}

function initials(n: string) {
  return (
    n
      .split(' ')
      .filter(Boolean)
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  );
}

function fmtDateTime(d: string) {
  const dt = new Date(d);
  return {
    date: dt.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    }),
    time: dt.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    }),
  };
}

function useDebounced<T>(value: T, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="rounded-2xl border-2 border-slate-100 bg-white overflow-hidden">
      <div className="bg-slate-50 border-b-2 border-slate-100 px-4 py-3 flex gap-10">
        {[120, 160, 70, 220, 90].map((w, i) => (
          <Skeleton key={i} className="h-4 rounded" style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-4 py-4 border-b border-slate-100 flex items-center gap-10">
          <div className="flex items-center gap-2.5 w-30">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="space-y-1.5 w-40">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-6 w-16 rounded-lg" />
          <Skeleton className="h-4 w-55" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InternalSearchReasonsPage() {
  const axios = useAxios();

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const debouncedSearch = useDebounced(search.trim());

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (debouncedSearch) p.set('search', debouncedSearch);
    if (dateFrom) p.set('dateFrom', dateFrom);
    if (dateTo) p.set('dateTo', dateTo);
    p.set('sortDir', 'desc');
    p.set('page', String(page));
    p.set('limit', String(limit));
    return p.toString();
  }, [debouncedSearch, dateFrom, dateTo, page]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['portal-recruit-logs', qs],
    queryFn: async () => (await axios.get(`/portal-recruit/logs?${qs}`)).data as LogsResponse,
    placeholderData: prev => prev,
  });

  const rows = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.pages ?? 0;

  const hasFilters = !!search || !!dateFrom || !!dateTo;

  const errStatus = (error as any)?.response?.status as number | undefined;
  const errMessage =
    errStatus === 403
      ? "You don't have permission to view this page."
      : ((error as any)?.response?.data?.message ?? 'Failed to load reasons. Please try again.');

  // Exports ALL matching rows (not just the current page) using the filters
  // currently applied. No filters = everything the user is allowed to see.
  async function handleExport() {
    setExporting(true);
    setExportError('');
    try {
      const p = new URLSearchParams();
      if (search.trim()) p.set('search', search.trim());
      if (dateFrom) p.set('dateFrom', dateFrom);
      if (dateTo) p.set('dateTo', dateTo);

      const res = await axios.get(`/portal-recruit/logs/export?${p.toString()}`, {
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const stamp = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });
      const a = document.createElement('a');
      a.href = url;
      a.download = `internal-search-reasons-${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setExportError(
        err?.response?.status === 403
          ? "You don't have permission to export."
          : 'Export failed. Please try again.'
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-[#EEF2F7]">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-b-2 border-slate-100">
        <div className="px-8 pt-6 pb-5">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                <MessageSquareText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Internal search reasons</h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Why recruiters went to an external portal after searching the internal pool
                </p>
              </div>
            </div>

            {!isLoading && !isError && (
              <div className="text-center">
                <p className="text-3xl font-black text-slate-900">{total}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                  {total === 1 ? 'Entry' : 'Entries'}
                </p>
              </div>
            )}
          </div>

          {/* ── Filters ────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by recruiter name…"
                className="pl-10 h-10 text-sm border-slate-200 bg-slate-50 focus:bg-white"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Date range: From only = that exact day, From + To = range */}
            <div className="flex items-center gap-2 h-10 border-2 border-slate-200 rounded-xl bg-white px-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">From</span>
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={e => {
                  const v = e.target.value;
                  setDateFrom(v);
                  if (v && !dateTo) setDateTo(v); // exact day by default
                  setPage(1);
                }}
                className="text-sm text-slate-700 outline-none bg-transparent"
              />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">To</span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={e => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="text-sm text-slate-700 outline-none bg-transparent"
              />
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  title="Clear dates"
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                    setPage(1);
                  }}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {hasFilters && (
              <button
                onClick={() => {
                  setSearch('');
                  setDateFrom('');
                  setDateTo('');
                  setPage(1);
                }}
                className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 border-2 border-slate-200 rounded-xl px-3 h-10 bg-white hover:bg-slate-50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}

            {/* Export (respects the filters currently applied) */}
            <Button
              onClick={handleExport}
              disabled={exporting || isLoading || isError || total === 0}
              title={
                hasFilters
                  ? 'Export the entries matching your current filters'
                  : 'Export all entries'
              }
              className="ml-auto h-10 px-4 text-sm font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-white"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {exporting ? 'Exporting…' : 'Export CSV'}
            </Button>
          </div>

          {exportError && <p className="mt-2 text-sm font-medium text-red-600">{exportError}</p>}
        </div>
      </div>

      {/* ── Content (scrollable) ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 px-8 py-5">
        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <p className="text-base font-bold text-slate-700">Couldn&apos;t load reasons</p>
            <p className="text-sm text-slate-500">{errMessage}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center">
              <MessageSquareText className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-base font-bold text-slate-700">No reasons found</p>
            <p className="text-sm text-slate-500">
              {hasFilters ? 'No matches for your filters' : 'Nothing has been logged yet'}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-slate-100 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-100">
                    {['Recruiter', 'Requirement', 'Portal', 'Reason', 'Date'].map(h => (
                      <th key={h} className="px-4 py-3 text-left">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          {h}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map(r => {
                    const when = fmtDateTime(r.createdAt);
                    return (
                      <tr key={r.id} className="align-top hover:bg-blue-50/40 transition-colors">
                        {/* Recruiter */}
                        <td className="px-4 py-3.5 min-w-52">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                                avatarColor(r.recruiter.name)
                              )}
                            >
                              {initials(r.recruiter.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">
                                {r.recruiter.name}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {[r.recruiter.employeeId, r.recruiter.role]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </p>
                              {r.recruiter.reportingTo && (
                                <p className="text-[11px] text-slate-400 truncate">
                                  Manager: {r.recruiter.reportingTo}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Requirement */}
                        <td className="px-4 py-3.5 min-w-56">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-mono font-semibold text-slate-500">
                              {r.reqCode ?? '—'}
                            </span>
                            <span className="text-sm font-semibold text-slate-900 truncate max-w-64">
                              {r.requirementTitle ?? '—'}
                            </span>
                            {r.clientName && (
                              <span className="text-[11px] text-slate-400 truncate max-w-64">
                                {r.clientName}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Portal */}
                        <td className="px-4 py-3.5">
                          <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg border text-blue-700 bg-blue-50 border-blue-100">
                            {r.appName}
                          </span>
                        </td>

                        {/* Reason */}
                        <td className="px-4 py-3.5 min-w-72 max-w-lg">
                          <p className="text-sm text-slate-700 whitespace-pre-wrap wrap-break-word">
                            {r.reason}
                          </p>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <p className="text-sm font-semibold text-slate-700">{when.date}</p>
                          <p className="text-[11px] text-slate-400">{when.time}</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="shrink-0 bg-white border-t-2 border-slate-100 px-8 py-3 flex items-center justify-between">
          <span className="text-sm text-slate-500">
            {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 text-sm rounded-xl"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              ← Prev
            </Button>
            <span className="text-sm text-slate-500">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 text-sm rounded-xl"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
