// File: ActivityExportMenu.tsx
// Path: src/components/reports/ActivityExportMenu.tsx
//
// Column picker + export button for the Stage Activity table.
// Fetches the column registry from GET /reports/recruiters/activity/export/columns
// so the list is never hardcoded — add a column on the backend and it appears here.
//
// Everything is opt-out: all columns start checked, the user unchecks what they
// don't want, and the unchecked keys go out as ?hiddenActivityCols=key1,key2

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, ChevronDown, Check, Square, CheckSquare, Loader2 } from 'lucide-react';
import { useAxios } from '@/hooks/useAxios';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface ColumnDef {
  key: string;
  header: string;
  group: string;
}

// Friendly group names + display order
const GROUP_META: Record<string, { label: string; order: number }> = {
  transition: { label: 'Transition', order: 1 },
  recruiter: { label: 'Recruiter', order: 2 },
  candidate: { label: 'Candidate', order: 3 },
  requirement: { label: 'Requirement', order: 4 },
  ctc: { label: 'CTC', order: 5 },
  joining: { label: 'Joining', order: 6 },
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

export function ActivityExportMenu({
  baseQs,
  serviceLineId,
  rowCount,
  transitionCount,
}: {
  baseQs: string;
  serviceLineId?: string;
  rowCount: number;
  transitionCount: number;
}) {
  const axios = useAxios();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Column registry from the backend
  const colsQuery = useQuery({
    queryKey: ['activity-export-columns'],
    queryFn: async () => (await axios.get('/reports/recruiters/activity/export/columns')).data,
    staleTime: Infinity, // registry only changes on deploy
  });

  const columns: ColumnDef[] = colsQuery.data?.data?.columns ?? [];

  const grouped = useMemo(() => {
    const g: Record<string, ColumnDef[]> = {};
    for (const c of columns) {
      if (!g[c.group]) g[c.group] = [];
      g[c.group].push(c);
    }
    return Object.entries(g).sort(
      ([a], [b]) => (GROUP_META[a]?.order ?? 99) - (GROUP_META[b]?.order ?? 99)
    );
  }, [columns]);

  const visibleCount = columns.length - hidden.size;

  const toggle = (key: string) =>
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const toggleGroup = (keys: string[]) =>
    setHidden(prev => {
      const next = new Set(prev);
      const allHidden = keys.every(k => next.has(k));
      if (allHidden) keys.forEach(k => next.delete(k));
      else keys.forEach(k => next.add(k));
      return next;
    });

  const showAll = () => setHidden(new Set());
  const hideAll = () => setHidden(new Set(columns.map(c => c.key)));

  const download = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const p = new URLSearchParams(baseQs);
      if (serviceLineId) p.set('serviceLineId', serviceLineId);
      if (hidden.size > 0) p.set('hiddenActivityCols', [...hidden].join(','));

      const res = await axios.get(`/reports/recruiters/activity/export?${p}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recruiter-activity-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (e) {
      console.error('Activity export failed:', e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="relative flex items-center gap-2" ref={menuRef}>
      {/* Column picker toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
        title="Choose which columns appear in the exported file"
      >
        Columns
        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-500">
          {colsQuery.isLoading ? '…' : `${visibleCount}/${columns.length}`}
        </span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Export */}
      <button
        onClick={download}
        disabled={downloading || visibleCount === 0}
        className="flex h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-[11px] font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        title={
          visibleCount === 0
            ? 'Select at least one column'
            : `Export ${transitionCount.toLocaleString('en-IN')} transitions across ${rowCount} recruiters with ${visibleCount} columns`
        }
      >
        {downloading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparing…
          </>
        ) : (
          <>
            <Download className="h-3.5 w-3.5" /> Export
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-10 z-50 w-[420px] rounded-xl border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-[12px] font-black text-slate-800">Export columns</p>
              <p className="text-[10px] text-slate-400">
                {visibleCount} of {columns.length} will be included
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={showAll}
                className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
              >
                All
              </button>
              <button
                onClick={hideAll}
                className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
              >
                None
              </button>
            </div>
          </div>

          {/* Groups */}
          <div className="max-h-[420px] overflow-y-auto p-2">
            {colsQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-[12px] text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading columns…
              </div>
            ) : (
              grouped.map(([groupKey, cols]) => {
                const keys = cols.map(c => c.key);
                const allHidden = keys.every(k => hidden.has(k));
                const someHidden = keys.some(k => hidden.has(k));
                return (
                  <div key={groupKey} className="mb-2">
                    {/* Group header — toggles the whole group */}
                    <button
                      onClick={() => toggleGroup(keys)}
                      className="mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50"
                    >
                      {allHidden ? (
                        <Square className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                      ) : someHidden ? (
                        <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border-2 border-indigo-600">
                          <div className="h-1.5 w-1.5 bg-indigo-600" />
                        </div>
                      ) : (
                        <CheckSquare className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                      )}
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        {GROUP_META[groupKey]?.label ?? groupKey}
                      </span>
                      <span className="text-[9px] font-bold text-slate-300">
                        {keys.filter(k => !hidden.has(k)).length}/{keys.length}
                      </span>
                    </button>

                    {/* Columns in this group */}
                    <div className="grid grid-cols-2 gap-0.5 pl-5">
                      {cols.map(c => {
                        const isHidden = hidden.has(c.key);
                        return (
                          <button
                            key={c.key}
                            onClick={() => toggle(c.key)}
                            className={`flex items-center gap-1.5 rounded px-1.5 py-1 text-left text-[11px] transition-colors ${
                              isHidden
                                ? 'text-slate-300 hover:bg-slate-50'
                                : 'font-semibold text-slate-700 hover:bg-indigo-50'
                            }`}
                            title={c.header}
                          >
                            {isHidden ? (
                              <Square className="h-3 w-3 shrink-0" />
                            ) : (
                              <Check className="h-3 w-3 shrink-0 text-indigo-600" />
                            )}
                            <span className="truncate">{c.header}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5">
            <p className="text-[10px] text-slate-400">
              Joining dates are derived when not explicitly set
            </p>
            <button
              onClick={download}
              disabled={downloading || visibleCount === 0}
              className="flex h-7 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-[11px] font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Preparing…
                </>
              ) : (
                <>
                  <Download className="h-3 w-3" /> Export {visibleCount} cols
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
