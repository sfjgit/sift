// File: CandidatesSection.tsx
// Path: src/components/reports/CandidatesSection.tsx
//
// The Candidates tab. Owns its own filter state, pagination and search —
// deliberately NOT driven by the page-level FiltersBar, because the candidate
// surface needs filters (MOJ, joining date, duplicates, snapshot type, stage
// bucket) that make no sense on the other tabs.
//
// Reads the page-level window/entity filters via baseQs and layers its own on top.

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
  Filter,
  ChevronDown,
  AlertCircle,
  Columns3,
  Check,
  Square,
  CheckSquare,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAxios } from '@/hooks/useAxios';
import { CandidateExportMenu } from './CandidateExportMenu';
import { CandidateDrillDialog, type CandidateDrillTarget } from './CandidateDrillDialog';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// ─────────────────────────────────────────────────────────────────────────────
// TABLE COLUMN REGISTRY
//
// Showing the data beats filtering it. ~30 columns available; `on` marks the
// default-visible set, the rest are one click away in the column menu.
// The whole joining chain is visible — LWD, Expected, Actual, Derived, Source —
// so nobody has to guess which filter would surface a date.
//
// `w` is a min-width, so horizontal scrolling behaves predictably.
// ─────────────────────────────────────────────────────────────────────────────

interface TableCol {
  key: string;
  label: string;
  group: string;
  on: boolean;
  w: number;
  align?: 'left' | 'center' | 'right';
  cell: (r: any) => React.ReactNode;
}

const COLS: TableCol[] = [
  // ── Requirement ──
  {
    key: 'requirement',
    label: 'Requirement',
    group: 'Requirement',
    on: true,
    w: 200,
    cell: r => (
      <>
        <p className="font-mono text-[11px] font-bold text-slate-700">{r.reqCode}</p>
        <p className="max-w-[190px] truncate text-[10px] text-slate-400">{r.reqTitle}</p>
        <p className="max-w-[190px] truncate text-[10px] text-slate-400">{r.clientName}</p>
      </>
    ),
  },
  {
    key: 'reqStatus',
    label: 'Req Status',
    group: 'Requirement',
    on: true,
    w: 110,
    align: 'center',
    cell: r => (
      <span
        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
          r.reqStatus === 'ACTIVE'
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-slate-100 text-slate-500'
        }`}
      >
        {(r.reqStatus ?? '').replace(/_/g, ' ') || '—'}
      </span>
    ),
  },
  {
    key: 'reqPriority',
    label: 'Priority',
    group: 'Requirement',
    on: false,
    w: 90,
    align: 'center',
    cell: r => (
      <span className="text-[11px] font-semibold text-slate-600">{r.reqPriority || '—'}</span>
    ),
  },
  {
    key: 'totalOpenings',
    label: 'Openings',
    group: 'Requirement',
    on: false,
    w: 90,
    align: 'center',
    cell: r => (
      <span className="text-[12px] font-bold text-slate-700">{r.totalOpenings ?? '—'}</span>
    ),
  },
  {
    key: 'clientSpocName',
    label: 'Client SPOC',
    group: 'Requirement',
    on: false,
    w: 150,
    cell: r => <span className="text-[11px] text-slate-600">{r.clientSpocName || '—'}</span>,
  },
  {
    key: 'serviceLineName',
    label: 'Service Line',
    group: 'Requirement',
    on: false,
    w: 140,
    cell: r => <span className="text-[11px] text-slate-600">{r.serviceLineName || '—'}</span>,
  },
  {
    key: 'businessUnitName',
    label: 'Business Unit',
    group: 'Requirement',
    on: false,
    w: 140,
    cell: r => <span className="text-[11px] text-slate-600">{r.businessUnitName || '—'}</span>,
  },
  {
    key: 'reqCreatedBy',
    label: 'Req Created By',
    group: 'Requirement',
    on: false,
    w: 150,
    cell: r => <span className="text-[11px] text-slate-600">{r.reqCreatedBy || '—'}</span>,
  },

  // ── Stage ──
  {
    key: 'stage',
    label: 'Stage',
    group: 'Stage',
    on: true,
    w: 150,
    cell: r => (
      <>
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${BUCKET_STYLE[r.bucket] ?? 'bg-slate-100 text-slate-600 ring-slate-200'}`}
          title={`${r.stageLabel} · ${r.bucket}`}
        >
          {r.stageLabel}
        </span>
        <p className="mt-0.5 text-[10px] text-slate-400">{r.stageAging} in stage</p>
      </>
    ),
  },
  {
    key: 'bucket',
    label: 'Bucket',
    group: 'Stage',
    on: false,
    w: 110,
    align: 'center',
    cell: r => (
      <span
        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${BUCKET_STYLE[r.bucket] ?? 'bg-slate-100'}`}
      >
        {r.bucket}
      </span>
    ),
  },
  {
    key: 'disposition',
    label: 'Disposition',
    group: 'Stage',
    on: true,
    w: 110,
    align: 'center',
    cell: r => <span className="text-[11px] font-semibold text-slate-600">{r.disposition}</span>,
  },
  {
    key: 'recruiter',
    label: 'Recruiter',
    group: 'Stage',
    on: true,
    w: 150,
    cell: r => (
      <>
        <p className="max-w-[140px] truncate text-[12px] font-semibold text-slate-700">
          {r.recruiterName}
        </p>
        <p className="max-w-[140px] truncate text-[10px] text-slate-400">{r.recruiterEmail}</p>
      </>
    ),
  },

  // ── Candidate profile ──
  {
    key: 'candidatePhone',
    label: 'Phone',
    group: 'Candidate',
    on: true,
    w: 130,
    cell: r => <span className="text-[11px] text-slate-600">{r.candidatePhone || '—'}</span>,
  },
  {
    key: 'currentTitle',
    label: 'Current Title',
    group: 'Candidate',
    on: false,
    w: 170,
    cell: r => (
      <span className="block max-w-[160px] truncate text-[11px] text-slate-600">
        {r.currentTitle || '—'}
      </span>
    ),
  },
  {
    key: 'currentCompany',
    label: 'Current Company',
    group: 'Candidate',
    on: true,
    w: 170,
    cell: r => (
      <span className="block max-w-[160px] truncate text-[11px] text-slate-600">
        {r.currentCompany || '—'}
      </span>
    ),
  },
  {
    key: 'expYears',
    label: 'Exp (yrs)',
    group: 'Candidate',
    on: true,
    w: 85,
    align: 'center',
    cell: r => <span className="text-[12px] font-bold text-slate-700">{r.expYears ?? '—'}</span>,
  },
  {
    key: 'topSkills',
    label: 'Top Skills',
    group: 'Candidate',
    on: false,
    w: 240,
    cell: r => (
      <span className="block max-w-[230px] truncate text-[11px] text-slate-500" title={r.topSkills}>
        {r.topSkills || '—'}
      </span>
    ),
  },
  {
    key: 'snapshotType',
    label: 'Source',
    group: 'Candidate',
    on: false,
    w: 110,
    align: 'center',
    cell: r => (
      <span
        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
          r.snapshotType === 'APPLICANT'
            ? 'bg-violet-50 text-violet-700'
            : 'bg-slate-100 text-slate-600'
        }`}
      >
        {r.snapshotType === 'APPLICANT' ? 'Self applied' : 'Sourced'}
      </span>
    ),
  },
  {
    key: 'candidateCode',
    label: 'Candidate Code',
    group: 'Candidate',
    on: false,
    w: 130,
    cell: r => (
      <span className="font-mono text-[10px] text-slate-500">{r.candidateCode || '—'}</span>
    ),
  },

  // ── CTC ──
  {
    key: 'currentCtc',
    label: 'Current CTC',
    group: 'CTC',
    on: true,
    w: 110,
    align: 'right',
    cell: r => <span className="text-[11px] text-slate-600">{fmtCtc(r.currentCtc)}</span>,
  },
  {
    key: 'expectedCtc',
    label: 'Expected CTC',
    group: 'CTC',
    on: true,
    w: 110,
    align: 'right',
    cell: r => <span className="text-[11px] text-slate-600">{fmtCtc(r.expectedCtc)}</span>,
  },
  {
    key: 'negotiatedCtc',
    label: 'Negotiated CTC',
    group: 'CTC',
    on: false,
    w: 120,
    align: 'right',
    cell: r => <span className="text-[11px] text-slate-600">{fmtCtc(r.negotiatedCtc)}</span>,
  },
  {
    key: 'offeredCtc',
    label: 'Offered CTC',
    group: 'CTC',
    on: true,
    w: 110,
    align: 'right',
    cell: r => (
      <span
        className={`text-[11px] ${r.offeredCtc != null ? 'font-bold text-emerald-700' : 'text-slate-300'}`}
      >
        {fmtCtc(r.offeredCtc)}
      </span>
    ),
  },
  {
    key: 'offerStatus',
    label: 'Offer Status',
    group: 'CTC',
    on: false,
    w: 110,
    align: 'center',
    cell: r => (
      <span className="text-[11px] font-semibold text-slate-600">{r.offerStatus || '—'}</span>
    ),
  },

  // ── Joining — the whole chain, visible ──
  {
    key: 'noticePeriod',
    label: 'Notice Period',
    group: 'Joining',
    on: true,
    w: 110,
    align: 'center',
    cell: r => <span className="text-[11px] text-slate-600">{r.noticePeriod || '—'}</span>,
  },
  {
    key: 'lastWorkingDate',
    label: 'Last Working Day',
    group: 'Joining',
    on: true,
    w: 125,
    align: 'center',
    cell: r => (
      <span className="text-[11px] font-semibold text-slate-700">{fmtDate(r.lastWorkingDate)}</span>
    ),
  },
  {
    key: 'expectedJoiningDate',
    label: 'Expected Joining',
    group: 'Joining',
    on: true,
    w: 125,
    align: 'center',
    cell: r => <span className="text-[11px] text-slate-600">{fmtDate(r.expectedJoiningDate)}</span>,
  },
  {
    key: 'actualJoiningDate',
    label: 'Actual Joining',
    group: 'Joining',
    on: true,
    w: 120,
    align: 'center',
    cell: r => (
      <span
        className={`text-[11px] ${r.actualJoiningDate ? 'font-bold text-emerald-700' : 'text-slate-300'}`}
      >
        {fmtDate(r.actualJoiningDate)}
      </span>
    ),
  },
  {
    key: 'derivedJoiningDate',
    label: 'Derived Joining',
    group: 'Joining',
    on: true,
    w: 125,
    align: 'center',
    cell: r => (
      <span
        className={`text-[11px] ${r.joiningSource === 'Actual' ? 'font-semibold text-slate-700' : 'italic text-slate-500'}`}
        title={r.joiningSource ? `Source: ${r.joiningSource}` : undefined}
      >
        {fmtDate(r.derivedJoiningDate)}
      </span>
    ),
  },
  {
    key: 'monthOfJoining',
    label: 'Month of Joining',
    group: 'Joining',
    on: true,
    w: 135,
    align: 'center',
    cell: r =>
      r.monthOfJoining ? (
        <div title={r.joiningSource ? `Derived from: ${r.joiningSource}` : undefined}>
          <p className="text-[12px] font-bold text-indigo-700">{r.monthOfJoining}</p>
          <p
            className={`text-[9px] ${r.joiningSource === 'Actual' ? 'text-emerald-600' : 'italic text-slate-400'}`}
          >
            {r.joiningSource || '—'}
          </p>
        </div>
      ) : (
        <span className="text-[11px] text-slate-300">—</span>
      ),
  },
  {
    key: 'joiningSource',
    label: 'Joining Source',
    group: 'Joining',
    on: false,
    w: 130,
    align: 'center',
    cell: r => (
      <span
        className={`text-[10px] font-bold ${r.joiningSource === 'Actual' ? 'text-emerald-700' : 'italic text-slate-400'}`}
      >
        {r.joiningSource || '—'}
      </span>
    ),
  },
  {
    key: 'daysToJoin',
    label: 'Days to Join',
    group: 'Joining',
    on: false,
    w: 100,
    align: 'center',
    cell: r =>
      r.daysToJoin != null ? (
        <span
          className={`text-[12px] font-bold ${r.daysToJoin < 0 ? 'text-red-600' : 'text-slate-700'}`}
        >
          {r.daysToJoin}
        </span>
      ) : (
        <span className="text-[11px] text-slate-300">—</span>
      ),
  },

  // ── Flags & duplicates ──
  {
    key: 'duplicates',
    label: 'Also In',
    group: 'Flags',
    on: true,
    w: 115,
    align: 'center',
    cell: r =>
      r.isCrossRequirement ? (
        <span
          className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-800"
          title={`Same person also in: ${r.duplicateIn.map((d: any) => `${d.reqCode} (${d.stageLabel})`).join(', ')}`}
        >
          <Copy className="h-3 w-3" />
          {r.duplicateCount} req{r.duplicateCount !== 1 ? 's' : ''}
        </span>
      ) : (
        <span className="text-[11px] text-slate-300">—</span>
      ),
  },
  {
    key: 'flags',
    label: 'Flags',
    group: 'Flags',
    on: false,
    w: 130,
    align: 'center',
    cell: r => (
      <div className="flex flex-wrap justify-center gap-1">
        {r.isRejected && (
          <span className="rounded bg-red-100 px-1 text-[9px] font-bold text-red-700">REJ</span>
        )}
        {r.isWithdrawn && (
          <span className="rounded bg-slate-200 px-1 text-[9px] font-bold text-slate-600">WD</span>
        )}
        {r.isOnHold && (
          <span className="rounded bg-orange-100 px-1 text-[9px] font-bold text-orange-700">
            HOLD
          </span>
        )}
        {r.isDuplicateFlag && (
          <span className="rounded bg-red-100 px-1 text-[9px] font-bold text-red-700">DUP</span>
        )}
        {!r.isRejected && !r.isWithdrawn && !r.isOnHold && !r.isDuplicateFlag && (
          <span className="text-[11px] text-slate-300">—</span>
        )}
      </div>
    ),
  },
  {
    key: 'dropReason',
    label: 'Drop / Reject Reason',
    group: 'Flags',
    on: false,
    w: 200,
    cell: r => {
      const v = r.dropReason || r.rejectionReason || r.withdrawnReason;
      return (
        <span className="block max-w-[190px] truncate text-[11px] text-slate-500" title={v || ''}>
          {v || '—'}
        </span>
      );
    },
  },

  // ── Timeline ──
  {
    key: 'submittedAt',
    label: 'Submitted At',
    group: 'Timeline',
    on: false,
    w: 120,
    align: 'center',
    cell: r => <span className="text-[11px] text-slate-600">{fmtDate(r.submittedAt)}</span>,
  },
  {
    key: 'addedOn',
    label: 'Added On',
    group: 'Timeline',
    on: true,
    w: 110,
    align: 'right',
    cell: r => (
      <>
        <p className="text-[11px] font-semibold text-slate-700">{fmtDate(r.addedOn)}</p>
        <p className="text-[10px] text-slate-400">{r.pipelineDays}d</p>
      </>
    ),
  },
  {
    key: 'pipelineDays',
    label: 'Days in Pipeline',
    group: 'Timeline',
    on: false,
    w: 120,
    align: 'center',
    cell: r => <span className="text-[12px] font-bold text-slate-700">{r.pipelineDays}</span>,
  },
];

const DEFAULT_ON = new Set(COLS.filter(c => c.on).map(c => c.key));
const COL_GROUPS = ['Requirement', 'Stage', 'Candidate', 'CTC', 'Joining', 'Flags', 'Timeline'];

// ─────────────────────────────────────────────────────────────────────────────
// TABLE COLUMN PICKER
// ─────────────────────────────────────────────────────────────────────────────

function TableColumnMenu({
  visible,
  setVisible,
}: {
  visible: Set<string>;
  setVisible: (s: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const toggle = (k: string) => {
    const n = new Set(visible);
    n.has(k) ? n.delete(k) : n.add(k);
    setVisible(n);
  };

  const toggleGroup = (g: string) => {
    const keys = COLS.filter(c => c.group === g).map(c => c.key);
    const n = new Set(visible);
    const allOn = keys.every(k => n.has(k));
    keys.forEach(k => (allOn ? n.delete(k) : n.add(k)));
    setVisible(n);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex h-7 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
        title="Show or hide table columns"
      >
        <Columns3 className="h-3.5 w-3.5" />
        {visible.size}/{COLS.length}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 w-[380px] rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <p className="text-[12px] font-black text-slate-800">Table columns</p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setVisible(new Set(COLS.map(c => c.key)))}
                className="rounded-lg border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
              >
                All
              </button>
              <button
                onClick={() => setVisible(new Set(DEFAULT_ON))}
                className="rounded-lg border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
              >
                Default
              </button>
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto p-2">
            {COL_GROUPS.map(g => {
              const cols = COLS.filter(c => c.group === g);
              if (!cols.length) return null;
              const keys = cols.map(c => c.key);
              const allOn = keys.every(k => visible.has(k));
              const someOn = keys.some(k => visible.has(k));
              return (
                <div key={g} className="mb-2">
                  <button
                    onClick={() => toggleGroup(g)}
                    className="mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-50"
                  >
                    {allOn ? (
                      <CheckSquare className="h-3.5 w-3.5 text-indigo-600" />
                    ) : someOn ? (
                      <div className="flex h-3.5 w-3.5 items-center justify-center rounded border-2 border-indigo-600">
                        <div className="h-1.5 w-1.5 bg-indigo-600" />
                      </div>
                    ) : (
                      <Square className="h-3.5 w-3.5 text-slate-300" />
                    )}
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {g}
                    </span>
                    <span className="text-[9px] font-bold text-slate-300">
                      {keys.filter(k => visible.has(k)).length}/{keys.length}
                    </span>
                  </button>
                  <div className="grid grid-cols-2 gap-0.5 pl-5">
                    {cols.map(c => {
                      const on = visible.has(c.key);
                      return (
                        <button
                          key={c.key}
                          onClick={() => toggle(c.key)}
                          className={`flex items-center gap-1.5 rounded px-1.5 py-1 text-left text-[11px] ${
                            on
                              ? 'font-semibold text-slate-700 hover:bg-indigo-50'
                              : 'text-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {on ? (
                            <Check className="h-3 w-3 shrink-0 text-indigo-600" />
                          ) : (
                            <Square className="h-3 w-3 shrink-0" />
                          )}
                          <span className="truncate">{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-slate-100 px-4 py-2">
            <p className="text-[10px] text-slate-400">
              Candidate stays frozen on the left. Scroll sideways for the rest.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL FILTER STATE — candidate-specific, on top of the page-level baseQs
// ─────────────────────────────────────────────────────────────────────────────

interface CandFilters {
  search: string;
  recruiterId: string;
  requirementId: string;
  stageId: string;
  bucket: string;
  disposition: string;
  reqStatus: string;
  snapshotType: string;
  mojMonthNum: string;
  mojYear: string;
  joinFrom: string;
  joinTo: string;
  duplicatesOnly: boolean;
  hasJoined: boolean;
  hasOffer: boolean;
  isSubmitted: boolean;
  dateField: string; // '' (any activity) | 'sourced' | 'stageMoved'
}

const EMPTY_FILTERS: CandFilters = {
  search: '',
  recruiterId: '',
  requirementId: '',
  stageId: '',
  bucket: '',
  disposition: '',
  reqStatus: '',
  snapshotType: '',
  mojMonthNum: '',
  mojYear: '',
  joinFrom: '',
  joinTo: '',
  duplicatesOnly: false,
  hasJoined: false,
  hasOffer: false,
  isSubmitted: false,
  dateField: '',
};

const PAGE_SIZES = [25, 50, 100, 200];

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────

function fmtDate(d: any): string {
  if (!d) return '—';
  try {
    return format(new Date(d), 'dd MMM yy');
  } catch {
    return '—';
  }
}

function fmtCtc(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
}

const BUCKET_STYLE: Record<string, string> = {
  Placed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'Near close': 'bg-amber-50 text-amber-700 ring-amber-200',
  'In pipeline': 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  Sourced: 'bg-slate-100 text-slate-600 ring-slate-200',
  'Off pipeline': 'bg-red-50 text-red-600 ring-red-200',
};

// ─────────────────────────────────────────────────────────────────────────────
// CLICKABLE STAT CARD
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color,
  bg,
  border,
  onClick,
}: {
  label: string;
  value: number;
  sub?: string;
  color: string;
  bg: string;
  border: string;
  onClick?: () => void;
}) {
  const clickable = !!onClick && value > 0;
  return (
    <button
      type="button"
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      title={
        clickable
          ? `Open the ${value.toLocaleString('en-IN')} candidates behind this number`
          : undefined
      }
      className={`flex min-w-[105px] flex-1 flex-col justify-between rounded-xl border px-3.5 py-3 text-left transition-all ${bg} ${border}
        ${
          clickable
            ? 'cursor-pointer hover:shadow-md hover:ring-2 hover:ring-indigo-300 hover:ring-offset-1 active:scale-[0.98]'
            : 'cursor-default'
        }`}
    >
      <p className={`text-[10px] font-black uppercase tracking-wider ${color} opacity-80`}>
        {label}
      </p>
      <p className={`mt-1 text-[24px] font-black leading-none ${color}`}>
        {value.toLocaleString('en-IN')}
      </p>
      {sub && <p className={`mt-0.5 text-[10px] font-semibold ${color} opacity-70`}>{sub}</p>}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

export function CandidatesSection({ baseQs }: { baseQs: string }) {
  const axios = useAxios();

  const [f, setF] = useState<CandFilters>(EMPTY_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [sortBy, setSortBy] = useState('addedOn');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [drillTarget, setDrillTarget] = useState<CandidateDrillTarget | null>(null);
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(DEFAULT_ON));

  const set = <K extends keyof CandFilters>(k: K, v: CandFilters[K]) => {
    setF(prev => ({ ...prev, [k]: v }));
    setPage(1); // any filter change resets to the first page
  };

  // ── Filter options ────────────────────────────────────────────────────────
  const filtersQuery = useQuery({
    queryKey: ['candidate-filters'],
    queryFn: async () => (await axios.get('/reports/candidates/filters')).data,
    staleTime: 300_000,
  });
  const opts = filtersQuery.data?.data ?? {};

  // ── Query string: page-level baseQs + this tab's filters ──────────────────
  const filterQs = useMemo(() => {
    const p = new URLSearchParams(baseQs);
    if (f.search.trim()) p.set('search', f.search.trim());
    if (f.recruiterId) p.set('recruiterId', f.recruiterId);
    if (f.requirementId) p.set('requirementId', f.requirementId);
    if (f.stageId) p.set('stageId', f.stageId);
    if (f.bucket) p.set('bucket', f.bucket);
    if (f.disposition) p.set('disposition', f.disposition);
    if (f.reqStatus) p.set('reqStatus', f.reqStatus);
    if (f.snapshotType) p.set('snapshotType', f.snapshotType);
    if (f.mojMonthNum) p.set('mojMonthNum', f.mojMonthNum);
    if (f.mojYear) p.set('mojYear', f.mojYear);
    if (f.joinFrom) p.set('joinFrom', f.joinFrom);
    if (f.joinTo) p.set('joinTo', f.joinTo);
    if (f.dateField) p.set('dateField', f.dateField);
    if (f.duplicatesOnly) p.set('duplicatesOnly', 'true');
    if (f.hasJoined) p.set('hasJoined', 'true');
    if (f.hasOffer) p.set('hasOffer', 'true');
    if (f.isSubmitted) p.set('isSubmitted', 'true');
    return p.toString();
  }, [baseQs, f]);

  const listQs = useMemo(() => {
    const p = new URLSearchParams(filterQs);
    p.set('page', String(page));
    p.set('limit', String(limit));
    p.set('sortBy', sortBy);
    p.set('sortDir', sortDir);
    return p.toString();
  }, [filterQs, page, limit, sortBy, sortDir]);

  // ── Data ──────────────────────────────────────────────────────────────────
  const listQuery = useQuery({
    queryKey: ['candidates-list', listQs],
    queryFn: async () => (await axios.get(`/reports/candidates/list?${listQs}`)).data,
    placeholderData: keepPreviousData, // no flash on page change
    staleTime: 30_000,
  });

  const statsQuery = useQuery({
    queryKey: ['candidates-stats', filterQs],
    queryFn: async () => (await axios.get(`/reports/candidates/stats?${filterQs}`)).data,
    staleTime: 30_000,
  });

  const rows: any[] = listQuery.data?.data ?? [];
  const meta = listQuery.data?.meta ?? {};
  const totals = statsQuery.data?.data?.totals;
  const byStage: any[] = statsQuery.data?.data?.byStage ?? [];
  const rates = statsQuery.data?.data?.rates;

  const total: number = meta.total ?? 0;
  const totalPages: number = meta.totalPages ?? 1;

  // ── Debounced search ──────────────────────────────────────────────────────
  const applySearch = useCallback(() => set('search', searchInput), [searchInput]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (f.recruiterId) n++;
    if (f.requirementId) n++;
    if (f.stageId) n++;
    if (f.bucket) n++;
    if (f.disposition) n++;
    if (f.reqStatus) n++;
    if (f.snapshotType) n++;
    if (f.mojMonthNum) n++;
    if (f.mojYear) n++;
    if (f.joinFrom || f.joinTo) n++;
    if (f.dateField) n++;
    if (f.duplicatesOnly) n++;
    if (f.hasJoined) n++;
    if (f.hasOffer) n++;
    if (f.isSubmitted) n++;
    return n;
  }, [f]);

  const clearAll = () => {
    setF(EMPTY_FILTERS);
    setSearchInput('');
    setPage(1);
  };

  const drill = (t: CandidateDrillTarget) => setDrillTarget(t);

  const activeCols = useMemo(() => COLS.filter(c => visibleCols.has(c.key)), [visibleCols]);

  // Current year ± 3 — no query needed, covers every realistic joining window
  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => String(y - 3 + i));
  }, []);

  return (
    <div className="space-y-4">
      {/* ══ STATS ═════════════════════════════════════════════════════════ */}
      {statsQuery.isLoading ? (
        <div className="flex gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-[80px] flex-1 rounded-xl" />
          ))}
        </div>
      ) : totals ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-2.5">
            <StatCard
              label="Candidates"
              value={totals.total}
              sub={`${totals.distinctCandidates.toLocaleString('en-IN')} unique people`}
              color="text-slate-800"
              bg="bg-slate-50"
              border="border-slate-200"
              onClick={() => drill({ label: 'All candidates' })}
            />
            <StatCard
              label="Sourced"
              value={totals.sourced}
              color="text-slate-600"
              bg="bg-slate-50"
              border="border-slate-200"
              onClick={() => drill({ label: 'Sourced — not yet processed', bucket: 'sourced' })}
            />
            <StatCard
              label="In Pipeline"
              value={totals.inPipeline}
              color="text-violet-800"
              bg="bg-violet-50"
              border="border-violet-100"
              onClick={() => drill({ label: 'In pipeline', bucket: 'in_pipeline' })}
            />
            <StatCard
              label="Near Close"
              value={totals.nearClose}
              color="text-amber-800"
              bg="bg-amber-50"
              border="border-amber-100"
              onClick={() => drill({ label: 'Near close', bucket: 'near_terminal' })}
            />
            <StatCard
              label="Placed"
              value={totals.placed}
              sub={rates ? `${rates.placementRate}% of total` : undefined}
              color="text-emerald-800"
              bg="bg-emerald-50"
              border="border-emerald-100"
              onClick={() => drill({ label: 'Placed', bucket: 'placed' })}
            />
            <StatCard
              label="Off Pipeline"
              value={totals.offPipeline}
              color="text-red-700"
              bg="bg-red-50"
              border="border-red-100"
              onClick={() =>
                drill({
                  label: 'Off pipeline — rejected / withdrawn / duplicate',
                  bucket: 'off_pipeline',
                })
              }
            />
            <StatCard
              label="Joined"
              value={totals.joined}
              sub={rates ? `${rates.joinRate}% of offers` : undefined}
              color="text-teal-800"
              bg="bg-teal-50"
              border="border-teal-100"
              onClick={() => drill({ label: 'Joined — confirmed joining date', hasJoined: true })}
            />
            {totals.duplicateRows > 0 && (
              <StatCard
                label="Duplicate rows"
                value={totals.duplicateRows}
                sub="same person, other reqs"
                color="text-amber-900"
                bg="bg-amber-100"
                border="border-amber-200"
                onClick={() =>
                  drill({
                    label: 'Candidates present in more than one requirement',
                    duplicatesOnly: true,
                  })
                }
              />
            )}
          </div>

          {/* Funnel bar */}
          {totals.total > 0 && (
            <div className="space-y-1.5">
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                {totals.sourced > 0 && (
                  <div
                    style={{
                      width: `${(totals.sourced / totals.total) * 100}%`,
                      backgroundColor: '#94A3B8',
                    }}
                    title={`Sourced: ${totals.sourced}`}
                  />
                )}
                {totals.inPipeline > 0 && (
                  <div
                    style={{
                      width: `${(totals.inPipeline / totals.total) * 100}%`,
                      backgroundColor: '#6366F1',
                    }}
                    title={`In pipeline: ${totals.inPipeline}`}
                  />
                )}
                {totals.nearClose > 0 && (
                  <div
                    style={{
                      width: `${(totals.nearClose / totals.total) * 100}%`,
                      backgroundColor: '#D97706',
                    }}
                    title={`Near close: ${totals.nearClose}`}
                  />
                )}
                {totals.placed > 0 && (
                  <div
                    style={{
                      width: `${(totals.placed / totals.total) * 100}%`,
                      backgroundColor: '#059669',
                    }}
                    title={`Placed: ${totals.placed}`}
                  />
                )}
                {totals.offPipeline > 0 && (
                  <div
                    style={{
                      width: `${(totals.offPipeline / totals.total) * 100}%`,
                      backgroundColor: '#E5E7EB',
                    }}
                    title={`Off pipeline: ${totals.offPipeline}`}
                  />
                )}
              </div>
              {rates && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-semibold text-slate-500">
                  <span>Submission {rates.submissionRate}%</span>
                  <span>Offer {rates.offerRate}%</span>
                  <span>Join {rates.joinRate}%</span>
                  <span>Placement {rates.placementRate}%</span>
                  <span className="ml-auto font-bold text-indigo-400">
                    Click any card to drill into the candidates →
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Stage chips — clickable */}
          {byStage.length > 0 && (
            <div className="border-t border-slate-100 pt-2.5">
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                By stage — click to filter
              </p>
              <div className="flex flex-wrap gap-1.5">
                {byStage.map(s => (
                  <button
                    key={s.stageId}
                    onClick={() => set('stageId', f.stageId === s.stageId ? '' : s.stageId)}
                    title={`${s.label} · ${s.bucket} · ${s.pct}% of the filtered set`}
                    className={`rounded-lg px-2 py-1 text-[11px] font-bold ring-1 transition-all ${
                      f.stageId === s.stageId
                        ? 'bg-indigo-600 text-white ring-indigo-600'
                        : (BUCKET_STYLE[s.bucket] ?? 'bg-slate-100 text-slate-600 ring-slate-200')
                    }`}
                  >
                    {s.label}
                    <span className="ml-1 opacity-70">{s.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* ══ FILTERS ═══════════════════════════════════════════════════════ */}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {/* Search + primary filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applySearch()}
              placeholder="Search name, email, phone, company, title, req code — press Enter"
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-20 text-[13px] outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white"
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              {searchInput && (
                <button
                  onClick={() => {
                    setSearchInput('');
                    set('search', '');
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={applySearch}
                className="rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-indigo-700"
              >
                Go
              </button>
            </div>
          </div>

          <Select
            value={f.recruiterId || 'ALL'}
            onValueChange={v => set('recruiterId', v === 'ALL' ? '' : v)}
          >
            <SelectTrigger className="h-9 w-[180px] border-slate-200 text-xs font-medium">
              <SelectValue placeholder="All recruiters" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All recruiters</SelectItem>
              {(opts.recruiters ?? []).map((r: any) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={f.bucket || 'ALL'}
            onValueChange={v => set('bucket', v === 'ALL' ? '' : v)}
          >
            <SelectTrigger className="h-9 w-[150px] border-slate-200 text-xs font-medium">
              <SelectValue placeholder="All buckets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All buckets</SelectItem>
              {(opts.buckets ?? []).map((b: any) => (
                <SelectItem key={b.value} value={b.value}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Static Jan–Dec. The old version fetched distinct monthOfJoining
              values from the DB — a column null on almost every row — so it
              only ever offered two months. Months are months. */}
          <Select
            value={f.mojMonthNum || 'ALL'}
            onValueChange={v => set('mojMonthNum', v === 'ALL' ? '' : v)}
          >
            <SelectTrigger className="h-9 w-[150px] border-slate-200 text-xs font-medium">
              <SelectValue placeholder="Any joining month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Any joining month</SelectItem>
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={f.mojYear || 'ALL'}
            onValueChange={v => set('mojYear', v === 'ALL' ? '' : v)}
          >
            <SelectTrigger className="h-9 w-[105px] border-slate-200 text-xs font-medium">
              <SelectValue placeholder="Any year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Any year</SelectItem>
              {yearOptions.map(y => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            onClick={() => setAdvancedOpen(o => !o)}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            <Filter className="h-3.5 w-3.5" />
            More
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-black text-white">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              className={`h-3 w-3 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
            />
          </button>

          <div className="ml-auto flex items-center gap-2">
            <CandidateExportMenu queryString={filterQs} totalRows={total} />
          </div>
        </div>

        {/* Advanced filters */}
        {advancedOpen && (
          <div className="space-y-3 border-t border-slate-100 pt-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <Select
                value={f.requirementId || 'ALL'}
                onValueChange={v => set('requirementId', v === 'ALL' ? '' : v)}
              >
                <SelectTrigger className="h-8 border-slate-200 text-xs">
                  <SelectValue placeholder="All requirements" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All requirements</SelectItem>
                  {(opts.requirements ?? []).map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.reqCode} · {r.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={f.stageId || 'ALL'}
                onValueChange={v => set('stageId', v === 'ALL' ? '' : v)}
              >
                <SelectTrigger className="h-8 border-slate-200 text-xs">
                  <SelectValue placeholder="All stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All stages</SelectItem>
                  {(opts.stages ?? []).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={f.disposition || 'ALL'}
                onValueChange={v => set('disposition', v === 'ALL' ? '' : v)}
              >
                <SelectTrigger className="h-8 border-slate-200 text-xs">
                  <SelectValue placeholder="Any disposition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Any disposition</SelectItem>
                  {(opts.dispositions ?? []).map((d: string) => (
                    <SelectItem key={d} value={d}>
                      {d.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={f.reqStatus || 'ALL'}
                onValueChange={v => set('reqStatus', v === 'ALL' ? '' : v)}
              >
                <SelectTrigger className="h-8 border-slate-200 text-xs">
                  <SelectValue placeholder="Any req status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Any req status</SelectItem>
                  {(opts.reqStatuses ?? []).map((s: string) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={f.snapshotType || 'ALL'}
                onValueChange={v => set('snapshotType', v === 'ALL' ? '' : v)}
              >
                <SelectTrigger className="h-8 border-slate-200 text-xs">
                  <SelectValue placeholder="Any source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Any source</SelectItem>
                  <SelectItem value="CANDIDATE">Recruiter sourced</SelectItem>
                  <SelectItem value="APPLICANT">Self applied</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Joining date range + date field meaning */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Joining between
              </span>
              <input
                type="date"
                value={f.joinFrom}
                onChange={e => set('joinFrom', e.target.value)}
                className="h-8 rounded-lg border border-slate-200 px-2 text-xs text-slate-700 outline-none"
              />
              <span className="text-xs text-slate-400">and</span>
              <input
                type="date"
                value={f.joinTo}
                onChange={e => set('joinTo', e.target.value)}
                className="h-8 rounded-lg border border-slate-200 px-2 text-xs text-slate-700 outline-none"
              />
              <span className="text-[10px] text-slate-400">
                matches actual, expected or last working day
              </span>

              <span className="ml-4 text-[10px] font-black uppercase tracking-wider text-slate-400">
                Window means
              </span>
              <Select
                value={f.dateField || 'any'}
                onValueChange={v => set('dateField', v === 'any' ? '' : v)}
              >
                <SelectTrigger className="h-8 w-[150px] border-slate-200 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any activity</SelectItem>
                  <SelectItem value="sourced">Sourced in window</SelectItem>
                  <SelectItem value="stageMoved">Stage moved in window</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ['duplicatesOnly', 'In multiple requirements'],
                  ['hasJoined', 'Has joined'],
                  ['hasOffer', 'Has an offer'],
                  ['isSubmitted', 'Submitted to client'],
                ] as [keyof CandFilters, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => set(key, !f[key] as any)}
                  className={`h-8 rounded-lg border px-3 text-xs font-bold transition-colors ${
                    f[key]
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}

              {(activeFilterCount > 0 || f.search) && (
                <button
                  onClick={clearAll}
                  className="ml-auto flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-bold text-red-500 hover:bg-red-50"
                >
                  <X className="h-3 w-3" /> Clear all
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══ TABLE ═════════════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-black text-slate-800">
              {total.toLocaleString('en-IN')} candidate{total !== 1 ? 's' : ''}
            </span>
            {f.duplicatesOnly && (
              <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
                duplicates only — page counts are approximate
              </span>
            )}
            {listQuery.isFetching && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
            )}
          </div>

          <div className="flex items-center gap-3">
            <TableColumnMenu visible={visibleCols} setVisible={setVisibleCols} />

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400">SORT</span>
              <Select
                value={sortBy}
                onValueChange={v => {
                  setSortBy(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-7 w-[140px] border-slate-200 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="addedOn">Added on</SelectItem>
                  <SelectItem value="candidateName">Candidate name</SelectItem>
                  <SelectItem value="stage">Stage</SelectItem>
                  <SelectItem value="recruiter">Recruiter</SelectItem>
                  <SelectItem value="reqCode">Req code</SelectItem>
                  <SelectItem value="offeredCtc">Offered CTC</SelectItem>
                  <SelectItem value="joining">Joining date</SelectItem>
                  <SelectItem value="stageUpdated">Stage updated</SelectItem>
                </SelectContent>
              </Select>
              <button
                onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
                className="h-7 rounded-lg border border-slate-200 px-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
              >
                {sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400">ROWS</span>
              <Select
                value={String(limit)}
                onValueChange={v => {
                  setLimit(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-7 w-[70px] border-slate-200 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map(s => (
                    <SelectItem key={s} value={String(s)}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pagination */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-1 text-[11px] font-bold text-slate-600">
                {page} / {totalPages || 1}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Rows */}
        <div className="max-h-[70vh] overflow-auto">
          {listQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : listQuery.isError ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-400">
              <AlertCircle className="h-7 w-7 text-red-400" />
              <p className="text-[13px] font-semibold">Failed to load candidates.</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-400">
              <p className="text-[13px] font-semibold">No candidates match these filters.</p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAll}
                  className="text-[12px] font-bold text-indigo-600 hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <table className="border-separate border-spacing-0 text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {/* Frozen candidate header */}
                  <th
                    className="sticky left-0 top-0 z-30 border-b border-r border-slate-200 bg-slate-50 px-4 py-2.5"
                    style={{ minWidth: 250 }}
                  >
                    Candidate
                  </th>
                  {activeCols.map(c => (
                    <th
                      key={c.key}
                      className={`sticky top-0 z-20 whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2.5 ${
                        c.align === 'right'
                          ? 'text-right'
                          : c.align === 'center'
                            ? 'text-center'
                            : ''
                      }`}
                      style={{ minWidth: c.w }}
                      title={`${c.label} · ${c.group}`}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const dimmed = r.isRejected || r.isWithdrawn;
                  const stripe = i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60';
                  return (
                    <tr key={r.pipelineId} className={`group ${dimmed ? 'opacity-55' : ''}`}>
                      {/* Frozen candidate cell — content scrolls behind this */}
                      <td
                        className={`sticky left-0 z-10 border-b border-r border-slate-100 px-4 py-3 ${stripe} group-hover:bg-indigo-50`}
                        style={{ minWidth: 250 }}
                      >
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 max-w-[210px] flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-[13px] font-bold text-slate-900">
                                {r.candidateName}
                              </p>
                              {r.isCrossRequirement && (
                                <span
                                  className="inline-flex shrink-0 items-center gap-0.5 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-black text-amber-700"
                                  title={`Same person is in ${r.duplicateCount} other requirement${r.duplicateCount !== 1 ? 's' : ''}: ${r.duplicateIn.map((d: any) => d.reqCode).join(', ')}`}
                                >
                                  <Copy className="h-2.5 w-2.5" />
                                  {r.duplicateCount}
                                </span>
                              )}
                              {r.isDuplicateFlag && (
                                <span
                                  className="shrink-0 rounded bg-red-100 px-1 py-0.5 text-[9px] font-black text-red-700"
                                  title="Marked as a duplicate by a recruiter"
                                >
                                  DUP
                                </span>
                              )}
                            </div>
                            <p className="truncate text-[11px] text-slate-400">
                              {r.candidateEmail}
                            </p>
                          </div>
                          {r.resumeUrl && (
                            <a
                              href={r.resumeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="shrink-0 text-slate-300 hover:text-indigo-500"
                              title="Open resume"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </td>

                      {activeCols.map(c => (
                        <td
                          key={c.key}
                          className={`border-b border-slate-100 px-3 py-3 ${stripe} group-hover:bg-indigo-50/40 ${
                            c.align === 'right'
                              ? 'text-right'
                              : c.align === 'center'
                                ? 'text-center'
                                : ''
                          }`}
                          style={{ minWidth: c.w }}
                        >
                          {c.cell(r)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer pagination */}
        {rows.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5">
            <p className="text-[11px] text-slate-400">
              Showing {((page - 1) * limit + 1).toLocaleString('en-IN')}–
              {Math.min(page * limit, total).toLocaleString('en-IN')} of{' '}
              {total.toLocaleString('en-IN')} ·{' '}
              <span className="font-semibold text-amber-700">⧉</span> same person in another req ·{' '}
              <span className="italic">italic</span> joining dates are inferred, not confirmed
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page <= 1}
                className="h-7 rounded-lg border border-slate-200 px-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30"
              >
                First
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-1 text-[11px] font-bold text-slate-600">
                {page} / {totalPages || 1}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                className="h-7 rounded-lg border border-slate-200 px-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      <CandidateDrillDialog
        target={drillTarget}
        baseQs={filterQs}
        onClose={() => setDrillTarget(null)}
      />
    </div>
  );
}
