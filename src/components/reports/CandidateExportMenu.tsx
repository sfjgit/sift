// File: CandidateExportMenu.tsx
// Path: src/components/reports/CandidateExportMenu.tsx
//
// Column picker + export for the Candidates tab.
// Registry comes from GET /reports/candidates/export/columns so adding a
// column on the backend surfaces here with no frontend change.
// Unchecked keys go out as ?hiddenCandidateCols=key1,key2 (opt-out contract).

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, ChevronDown, Check, Square, CheckSquare, Loader2 } from 'lucide-react';
import { useAxios } from '@/hooks/useAxios';

interface ColumnDef {
  key: string;
  header: string;
  group: string;
}

const GROUP_ORDER = [
  'candidate',
  'stage',
  'flags',
  'duplicate',
  'ctc',
  'joining',
  'recruiter',
  'requirement',
];

export function CandidateExportMenu({
  queryString,
  totalRows,
}: {
  queryString: string;
  totalRows: number;
}) {
  const axios = useAxios();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const colsQuery = useQuery({
    queryKey: ['candidate-export-columns'],
    queryFn: async () => (await axios.get('/reports/candidates/export/columns')).data,
    staleTime: Infinity,
  });

  const columns: ColumnDef[] = colsQuery.data?.data?.columns ?? [];
  const groupLabels: Record<string, string> = colsQuery.data?.data?.groupLabels ?? {};

  const grouped = useMemo(() => {
    const g: Record<string, ColumnDef[]> = {};
    for (const c of columns) {
      if (!g[c.group]) g[c.group] = [];
      g[c.group].push(c);
    }
    return Object.entries(g).sort(([a], [b]) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b));
  }, [columns]);

  const visibleCount = columns.length - hidden.size;

  const toggle = (key: string) =>
    setHidden(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const toggleGroup = (keys: string[]) =>
    setHidden(prev => {
      const next = new Set(prev);
      const allHidden = keys.every(k => next.has(k));
      keys.forEach(k => (allHidden ? next.delete(k) : next.add(k)));
      return next;
    });

  const download = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const p = new URLSearchParams(queryString);
      p.delete('page');
      p.delete('limit'); // export the whole filtered set, not one page
      if (hidden.size > 0) p.set('hiddenCandidateCols', [...hidden].join(','));

      const res = await axios.get(`/reports/candidates/export?${p}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `candidates-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (e) {
      console.error('Candidate export failed:', e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="relative flex items-center gap-2" ref={menuRef}>
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

      <button
        onClick={download}
        disabled={downloading || visibleCount === 0}
        className="flex h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-[11px] font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        title={
          visibleCount === 0
            ? 'Select at least one column'
            : `Export all ${totalRows.toLocaleString('en-IN')} matching rows with ${visibleCount} columns`
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

      {open && (
        <div className="absolute right-0 top-10 z-50 w-[440px] rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-[12px] font-black text-slate-800">Export columns</p>
              <p className="text-[10px] text-slate-400">
                {visibleCount} of {columns.length} included · all{' '}
                {totalRows.toLocaleString('en-IN')} rows
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setHidden(new Set())}
                className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
              >
                All
              </button>
              <button
                onClick={() => setHidden(new Set(columns.map(c => c.key)))}
                className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
              >
                None
              </button>
            </div>
          </div>

          <div className="max-h-[440px] overflow-y-auto p-2">
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
                        {groupLabels[groupKey] ?? groupKey}
                      </span>
                      <span className="text-[9px] font-bold text-slate-300">
                        {keys.filter(k => !hidden.has(k)).length}/{keys.length}
                      </span>
                    </button>

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

          <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5">
            <p className="text-[10px] text-slate-400">
              Includes Summary, Duplicates and By&nbsp;Recruiter sheets
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
