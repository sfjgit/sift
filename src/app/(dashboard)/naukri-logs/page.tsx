// File: page.tsx
// Path: src/app/(dashboard)/naukri-logs/page.tsx

'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays, startOfMonth } from 'date-fns';
import {
  BarChart3,
  CalendarIcon,
  TrendingDown,
  Upload,
  RefreshCw,
  AlertTriangle,
  Users,
  FileWarning,
  ArrowRight,
  ShieldAlert,
  Info,
  Search,
  X,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAxios } from '@/hooks/useAxios';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES  (mirror the candidate-service Naukri tables)
// ─────────────────────────────────────────────────────────────────────────────

interface DailyRow {
  id: string;
  reportDate: string;
  recruiterId: string | null;
  recruiterEmail: string;
  recruiterName: string | null;
  empId: string | null;
  bu: string | null;
  rm: string | null; // ← reporting manager (from sheet)
  serviceLine: string | null; // ← from Core (may be null until populated)
  department: string | null; // ← from Core (may be null until populated)
  naukriCvConsumed: number | null;
  atsCaptured: number;
  atsBySource: Record<string, number>;
  difference: number | null;
  fillStatus: 'FILLED' | 'NAUKRI_NOT_FILLED' | 'SYSTEM_CAPTURED_ONLY';
  flags: string[];
  isFrozen: boolean;
  // NEW — 3-step activity breakdown from ExtensionCaptureLogs
  naukriProfilesViewed: number;
  naukriPhonesRevealed: number;
  naukriCvsDownloaded: number;
  completeProfilesCaptured: number;
}

interface SummaryRow {
  recruiterEmail: string;
  recruiterName: string | null;
  bu: string | null;
  naukri_consumed: number;
  ats_captured: number;
  gap: number;
  days_not_filled: number;
  days_leaking: number;
}

interface UploadRow {
  id: string;
  reportDate: string;
  version: number;
  fileName: string;
  status: string;
  totalSubusers: number | null;
  reportedTotalCvConsumed: number | null;
  computedTotalCvConsumed: number | null;
  totalMismatch: boolean;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLE MAPS
// ─────────────────────────────────────────────────────────────────────────────

const FILL_STATUS: Record<string, { label: string; cls: string }> = {
  FILLED: { label: 'Filled', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  NAUKRI_NOT_FILLED: { label: 'Not filled', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  SYSTEM_CAPTURED_ONLY: { label: 'System only', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
};

const FLAG_STYLE: Record<string, { label: string; cls: string }> = {
  ATS_LEAKAGE: { label: 'Leakage', cls: 'bg-rose-100 text-rose-700 border-rose-200' },
  NAUKRI_NOT_FILLED: { label: 'Not filed', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  OVER_CAPTURED: { label: 'Over-captured', cls: 'bg-violet-100 text-violet-700 border-violet-200' },
  UNMATCHED_SUBUSER: { label: 'Unmatched', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  ZERO_ACTIVITY: { label: 'No activity', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  TOTAL_MISMATCH: {
    label: 'Total mismatch',
    cls: 'bg-orange-100 text-orange-700 border-orange-200',
  },
};

// short labels for the ATS source breakdown chips
const SOURCE_SHORT: Record<string, string> = {
  MANUAL_UPLOAD: 'Manual',
  CHROME_EXTENSION: 'Ext',
  NAUKRI: 'Naukri',
  PORTAL: 'Portal',
  BATCH: 'Batch',
};

// flag filter options (only the ones worth filtering by)
const FLAG_FILTERS = ['ATS_LEAKAGE', 'UNMATCHED_SUBUSER', 'OVER_CAPTURED', 'ZERO_ACTIVITY'];

const fmtApi = (d: Date) => format(d, 'yyyy-MM-dd');
const fmtNice = (d: Date) => format(d, 'dd MMM yyyy');
const ALL = '__all__';

// ─────────────────────────────────────────────────────────────────────────────
// SMALL PIECES
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'slate',
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'slate' | 'rose' | 'emerald' | 'amber' | 'blue';
}) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-50 text-slate-700',
    rose: 'bg-rose-50 text-rose-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
  };
  return (
    <div className="flex-1 min-w-[150px] rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>
      </div>
      <div className="mt-2 text-2xl font-black text-slate-900 tabular-nums">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function DatePicker({
  value,
  onChange,
  label,
}: {
  value: Date;
  onChange: (d: Date) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 text-sm font-semibold justify-start w-40"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
            {fmtNice(value)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={d => {
              if (d) onChange(d);
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  width = 'w-36',
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  width?: string;
}) {
  return (
    <Select value={value || ALL} onValueChange={v => onChange(v === ALL ? '' : v)}>
      <SelectTrigger className={`h-8 ${width} text-xs font-semibold`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL} className="text-xs">
          {placeholder}
        </SelectItem>
        {options.map(o => (
          <SelectItem key={o.value} value={o.value} className="text-xs">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SkeletonTable() {
  return (
    <div className="p-4 space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full rounded-lg" />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

type Mode = 'single' | 'range';
type Preset = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'custom';

export default function NaukriLogsPage() {
  const axios = useAxios();
  const qc = useQueryClient();

  const today = useMemo(() => new Date(), []);
  const [mode, setMode] = useState<Mode>('single');
  const [preset, setPreset] = useState<Preset>('yesterday');

  const [singleDate, setSingleDate] = useState<Date>(subDays(today, 1)); // default: yesterday
  const [fromDate, setFromDate] = useState<Date>(subDays(today, 6));
  const [toDate, setToDate] = useState<Date>(today);

  // ── filters ──
  const [search, setSearch] = useState('');
  const [fBu, setFBu] = useState('');
  const [fRm, setFRm] = useState('');
  const [fServiceLine, setFServiceLine] = useState('');
  const [fFlag, setFFlag] = useState('');
  const [fStatus, setFStatus] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);

  const clearFilters = () => {
    setSearch('');
    setFBu('');
    setFRm('');
    setFServiceLine('');
    setFFlag('');
    setFStatus('');
  };
  const hasFilters = !!(search || fBu || fRm || fServiceLine || fFlag || fStatus);

  // ── quick selections ──────────────────────────────────────────────────────
  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p === 'today') {
      setMode('single');
      setSingleDate(today);
    } else if (p === 'yesterday') {
      setMode('single');
      setSingleDate(subDays(today, 1));
    } else if (p === 'last7') {
      setMode('range');
      setFromDate(subDays(today, 6));
      setToDate(today);
    } else if (p === 'last30') {
      setMode('range');
      setFromDate(subDays(today, 29));
      setToDate(today);
    } else if (p === 'thisMonth') {
      setMode('range');
      setFromDate(startOfMonth(today));
      setToDate(today);
    }
  };

  // ── queries ─────────────────────────────────────────────────────────────────
  const dateStr = fmtApi(singleDate);

  const uploadsQ = useQuery<UploadRow[]>({
    queryKey: ['naukri-uploads', dateStr],
    enabled: mode === 'single',
    queryFn: async () =>
      (
        await axios.get(`/candidate/api/naurki-logs/uploads?date=${dateStr}`, {
          baseURL: '/api/proxy',
        })
      ).data,
  });

  const dailyQ = useQuery<DailyRow[]>({
    queryKey: ['naukri-daily', dateStr],
    enabled: mode === 'single',
    queryFn: async () =>
      (
        await axios.get(`/candidate/api/naurki-logs/daily?date=${dateStr}`, {
          baseURL: '/api/proxy',
        })
      ).data,
  });

  const summaryQ = useQuery<SummaryRow[]>({
    queryKey: ['naukri-summary', fmtApi(fromDate), fmtApi(toDate)],
    enabled: mode === 'range',
    queryFn: async () =>
      (
        await axios.get(
          `/candidate/api/naurki-logs/summary?from=${fmtApi(fromDate)}&to=${fmtApi(toDate)}`,
          { baseURL: '/api/proxy' }
        )
      ).data,
  });

  // ── mutations: upload + reconcile ─────────────────────────────────────────────
  const uploadM = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      form.append('reportDate', dateStr);
      await axios.post('/candidate/api/naurki-logs/upload', form, {
        baseURL: '/api/proxy',
        headers: { 'Content-Type': undefined },
      });
      await axios.post(
        '/candidate/api/naurki-logs/reconcile',
        { reportDate: dateStr },
        { baseURL: '/api/proxy' }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['naukri-uploads', dateStr] });
      qc.invalidateQueries({ queryKey: ['naukri-daily', dateStr] });
    },
  });

  const reconcileM = useMutation({
    mutationFn: async () => {
      await axios.post(
        '/candidate/api/naurki-logs/reconcile',
        { reportDate: dateStr },
        { baseURL: '/api/proxy' }
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['naukri-daily', dateStr] }),
  });

  // ── raw data ──
  const daily = dailyQ.data ?? [];
  const summary = summaryQ.data ?? [];

  // ── filter option lists (derived from loaded rows) ──
  const uniq = (arr: (string | null)[]) =>
    [...new Set(arr.filter(Boolean) as string[])].sort().map(v => ({ value: v, label: v }));
  const buOptions = useMemo(
    () => uniq(mode === 'single' ? daily.map(r => r.bu) : summary.map(r => r.bu)),
    [daily, summary, mode]
  );
  const rmOptions = useMemo(() => uniq(daily.map(r => r.rm)), [daily]);
  const slOptions = useMemo(() => uniq(daily.map(r => r.serviceLine)), [daily]);

  // ── apply filters ──
  const filteredDaily = useMemo(() => {
    const q = search.trim().toLowerCase();
    return daily.filter(r => {
      if (
        q &&
        !`${r.recruiterName ?? ''} ${r.recruiterEmail} ${r.empId ?? ''}`.toLowerCase().includes(q)
      )
        return false;
      if (fBu && r.bu !== fBu) return false;
      if (fRm && r.rm !== fRm) return false;
      if (fServiceLine && r.serviceLine !== fServiceLine) return false;
      if (fStatus && r.fillStatus !== fStatus) return false;
      if (fFlag && !r.flags.includes(fFlag)) return false;
      return true;
    });
  }, [daily, search, fBu, fRm, fServiceLine, fStatus, fFlag]);

  const filteredSummary = useMemo(() => {
    const q = search.trim().toLowerCase();
    return summary.filter(r => {
      if (q && !`${r.recruiterName ?? ''} ${r.recruiterEmail}`.toLowerCase().includes(q))
        return false;
      if (fBu && r.bu !== fBu) return false;
      return true;
    });
  }, [summary, search, fBu]);

  // ── analytics reflect the FILTERED view (so filtering by BU shows that BU's stats) ──
  const analytics = useMemo(() => {
    const naukri = filteredDaily.reduce((s, r) => s + (r.naukriCvConsumed ?? 0), 0);
    const ats = filteredDaily.reduce((s, r) => s + r.atsCaptured, 0);
    // NEW — total complete profiles across the filtered view
    const complete = filteredDaily.reduce((s, r) => s + (r.completeProfilesCaptured ?? 0), 0);
    return {
      naukri,
      ats,
      gap: naukri - ats,
      notFilled: filteredDaily.filter(r => r.fillStatus === 'NAUKRI_NOT_FILLED').length,
      leaking: filteredDaily.filter(r => r.flags.includes('ATS_LEAKAGE')).length,
      complete,
    };
  }, [filteredDaily]);

  const rangeAnalytics = useMemo(() => {
    const naukri = filteredSummary.reduce((s, r) => s + Number(r.naukri_consumed), 0);
    const ats = filteredSummary.reduce((s, r) => s + Number(r.ats_captured), 0);
    return {
      naukri,
      ats,
      gap: naukri - ats,
      notFilled: filteredSummary.reduce((s, r) => s + Number(r.days_not_filled), 0),
      leaking: filteredSummary.reduce((s, r) => s + Number(r.days_leaking), 0),
    };
  }, [filteredSummary]);

  const hasUpload = (uploadsQ.data?.length ?? 0) > 0;
  const hasReconciled = daily.length > 0;

  const PRESETS: { key: Preset; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'last7', label: 'Last 7 days' },
    { key: 'last30', label: 'Last 30 days' },
    { key: 'thisMonth', label: 'This month' },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {/* ═══ HEADER ═══ */}
      <div className="border-b border-slate-200 bg-white shrink-0 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">Naukri vs ATS Monitoring</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                CV consumption reconciled against what the ATS actually captured
              </p>
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".xls,.xlsx"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) uploadM.mutate(f);
              e.target.value = '';
            }}
          />
          {mode === 'single' && (
            <Button
              size="sm"
              className="gap-2 h-8 text-sm font-semibold"
              disabled={uploadM.isPending}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-3.5 h-3.5" />
              {uploadM.isPending ? 'Uploading…' : `Upload ${fmtNice(singleDate)}`}
            </Button>
          )}
        </div>

        {/* ── quick selects + mode toggle ── */}
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          {PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                preset === p.key
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {p.label}
            </button>
          ))}
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <div className="flex items-center rounded-full border border-slate-200 p-0.5">
            <button
              onClick={() => {
                setMode('single');
                setPreset('custom');
              }}
              className={`text-xs font-semibold px-3 py-1 rounded-full ${
                mode === 'single' ? 'bg-slate-900 text-white' : 'text-slate-500'
              }`}
            >
              Single day
            </button>
            <button
              onClick={() => {
                setMode('range');
                setPreset('custom');
              }}
              className={`text-xs font-semibold px-3 py-1 rounded-full ${
                mode === 'range' ? 'bg-slate-900 text-white' : 'text-slate-500'
              }`}
            >
              Range
            </button>
          </div>
        </div>

        {/* ── date pickers: separate calendars ── */}
        <div className="mt-3 flex items-end gap-4 flex-wrap">
          {mode === 'single' ? (
            <DatePicker
              label="Report date"
              value={singleDate}
              onChange={d => {
                setSingleDate(d);
                setPreset('custom');
              }}
            />
          ) : (
            <>
              <DatePicker
                label="From"
                value={fromDate}
                onChange={d => {
                  setFromDate(d);
                  setPreset('custom');
                }}
              />
              <ArrowRight className="w-4 h-4 text-slate-300 mb-2.5" />
              <DatePicker
                label="To"
                value={toDate}
                onChange={d => {
                  setToDate(d);
                  setPreset('custom');
                }}
              />
            </>
          )}
        </div>

        {/* ── FILTER BAR ── */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name / email / emp id"
              className="pl-8 h-8 w-64 text-xs bg-slate-50 border-slate-200"
            />
          </div>

          <FilterSelect
            value={fBu}
            onChange={setFBu}
            options={buOptions}
            placeholder="All BU"
            width="w-28"
          />

          {mode === 'single' && (
            <>
              <FilterSelect
                value={fRm}
                onChange={setFRm}
                options={rmOptions}
                placeholder="All RM"
                width="w-32"
              />
              {slOptions.length > 0 && (
                <FilterSelect
                  value={fServiceLine}
                  onChange={setFServiceLine}
                  options={slOptions}
                  placeholder="All service lines"
                  width="w-40"
                />
              )}
              <FilterSelect
                value={fFlag}
                onChange={setFFlag}
                options={FLAG_FILTERS.map(f => ({ value: f, label: FLAG_STYLE[f]?.label ?? f }))}
                placeholder="All flags"
                width="w-36"
              />
              <FilterSelect
                value={fStatus}
                onChange={setFStatus}
                options={Object.keys(FILL_STATUS).map(k => ({
                  value: k,
                  label: FILL_STATUS[k].label,
                }))}
                placeholder="All status"
                width="w-32"
              />
            </>
          )}

          {hasFilters && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-slate-500 gap-1.5"
              onClick={clearFilters}
            >
              <X className="w-3 h-3" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* ═══ BODY ═══ */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* ── ANALYTICS OVERVIEW (reflects filters) ── */}
        <div className="flex gap-3 flex-wrap">
          {mode === 'single' ? (
            <>
              <StatCard
                icon={FileWarning}
                label="Naukri consumed"
                value={analytics.naukri}
                tone="blue"
                sub="CV Access (A+B+C)"
              />
              <StatCard
                icon={Users}
                label="ATS captured"
                value={analytics.ats}
                tone="emerald"
                sub="landed in the system"
              />
              {/* NEW — total complete profiles (all 3 steps, same day) */}
              <StatCard
                icon={CheckCircle2}
                label="Complete profiles"
                value={analytics.complete}
                tone="emerald"
                sub="viewed + phone + resume"
              />
              <StatCard
                icon={TrendingDown}
                label="Difference"
                value={analytics.gap}
                tone={analytics.gap > 0 ? 'rose' : 'slate'}
                sub="consumed − captured"
              />
              <StatCard
                icon={AlertTriangle}
                label="Not filled"
                value={analytics.notFilled}
                tone="amber"
                sub="recruiters"
              />
              <StatCard
                icon={ShieldAlert}
                label="Leaking"
                value={analytics.leaking}
                tone="rose"
                sub="flagged recruiters"
              />
            </>
          ) : (
            <>
              <StatCard
                icon={FileWarning}
                label="Naukri consumed"
                value={rangeAnalytics.naukri}
                tone="blue"
              />
              <StatCard
                icon={Users}
                label="ATS captured"
                value={rangeAnalytics.ats}
                tone="emerald"
              />
              <StatCard
                icon={TrendingDown}
                label="Total gap"
                value={rangeAnalytics.gap}
                tone={rangeAnalytics.gap > 0 ? 'rose' : 'slate'}
              />
              <StatCard
                icon={AlertTriangle}
                label="Not-filled days"
                value={rangeAnalytics.notFilled}
                tone="amber"
              />
              <StatCard
                icon={ShieldAlert}
                label="Leaking days"
                value={rangeAnalytics.leaking}
                tone="rose"
              />
            </>
          )}
        </div>

        {/* ── SINGLE-DAY banners ── */}
        {mode === 'single' && !uploadsQ.isLoading && !hasUpload && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900">
                No Naukri report uploaded for {fmtNice(singleDate)}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                The difference for this day can’t be computed until the report is uploaded. Ask the
                admin to upload the sheet, or upload it now.
              </p>
            </div>
            <Button
              size="sm"
              className="gap-2 h-8 text-sm font-semibold shrink-0"
              disabled={uploadM.isPending}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload
            </Button>
          </div>
        )}

        {mode === 'single' && hasUpload && !hasReconciled && !dailyQ.isLoading && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-900">Uploaded, but not reconciled yet</p>
              <p className="text-xs text-blue-700 mt-0.5">
                The file for {fmtNice(singleDate)} is stored. Run reconcile to compute the
                per-recruiter difference.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-2 h-8 text-sm font-semibold shrink-0"
              disabled={reconcileM.isPending}
              onClick={() => reconcileM.mutate()}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${reconcileM.isPending ? 'animate-spin' : ''}`} />
              Reconcile
            </Button>
          </div>
        )}

        {mode === 'single' && hasUpload && uploadsQ.data?.[0]?.totalMismatch && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-semibold text-orange-800">
              Sheet total ({uploadsQ.data[0].reportedTotalCvConsumed}) ≠ sum of rows (
              {uploadsQ.data[0].computedTotalCvConsumed}). Numbers may be unreliable.
            </span>
          </div>
        )}

        {/* ── TABLE ── */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-800">
              {mode === 'single'
                ? `Recruiter breakdown · ${fmtNice(singleDate)}`
                : `Cumulative · ${fmtNice(fromDate)} → ${fmtNice(toDate)}`}
            </span>
            <span className="text-xs text-slate-400">
              {mode === 'single'
                ? `${filteredDaily.length}${hasFilters ? ` / ${daily.length}` : ''} recruiters`
                : `${filteredSummary.length}${hasFilters ? ` / ${summary.length}` : ''} recruiters`}
            </span>
          </div>

          {/* SINGLE-DAY TABLE */}
          {mode === 'single' &&
            (dailyQ.isLoading ? (
              <SkeletonTable />
            ) : filteredDaily.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-400">
                {daily.length === 0
                  ? 'No reconciliation rows for this day.'
                  : 'No rows match these filters.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                      <th className="text-left font-semibold px-5 py-2.5">Recruiter</th>
                      <th className="text-left font-semibold px-3 py-2.5">Emp ID</th>
                      <th className="text-left font-semibold px-3 py-2.5">BU</th>
                      <th className="text-left font-semibold px-3 py-2.5">RM</th>
                      <th className="text-right font-semibold px-3 py-2.5">Naukri</th>
                      <th className="text-right font-semibold px-3 py-2.5">ATS</th>
                      {/* NEW — 3-step breakdown, placed right after ATS since it explains that number */}
                      <th className="text-right font-semibold px-3 py-2.5">Profiles</th>
                      <th className="text-right font-semibold px-3 py-2.5">Phones</th>
                      <th className="text-right font-semibold px-3 py-2.5">Resumes</th>
                      <th className="text-right font-semibold px-3 py-2.5">Complete</th>
                      <th className="text-right font-semibold px-3 py-2.5">Diff</th>
                      <th className="text-left font-semibold px-3 py-2.5">Status</th>
                      <th className="text-left font-semibold px-5 py-2.5">Flags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDaily.map(r => {
                      const sources = Object.entries(r.atsBySource ?? {}).filter(([, v]) => v > 0);
                      return (
                        <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/70">
                          <td className="px-5 py-3">
                            <div className="font-semibold text-slate-900">
                              {r.recruiterName ?? r.recruiterEmail}
                            </div>
                            <div className="text-xs text-slate-400">{r.recruiterEmail}</div>
                          </td>
                          <td className="px-3 py-3 text-xs text-slate-500 tabular-nums">
                            {r.empId ?? '—'}
                          </td>
                          <td className="px-3 py-3 text-xs text-slate-500">{r.bu ?? '—'}</td>
                          <td className="px-3 py-3 text-xs text-slate-500">{r.rm ?? '—'}</td>
                          <td className="px-3 py-3 text-right tabular-nums font-semibold text-slate-700">
                            {r.naukriCvConsumed ?? <span className="text-amber-500">—</span>}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div className="tabular-nums text-slate-700">{r.atsCaptured}</div>
                            {sources.length > 0 && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {sources
                                  .map(([k, v]) => `${SOURCE_SHORT[k] ?? k} ${v}`)
                                  .join(' · ')}
                              </div>
                            )}
                          </td>
                          {/* NEW — 3-step breakdown cells */}
                          <td className="px-3 py-3 text-right tabular-nums text-slate-600">
                            {r.naukriProfilesViewed}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-slate-600">
                            {r.naukriPhonesRevealed}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-slate-600">
                            {r.naukriCvsDownloaded}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums font-bold text-emerald-600">
                            {r.completeProfilesCaptured}
                          </td>
                          <td
                            className={`px-3 py-3 text-right tabular-nums font-bold ${
                              r.difference == null
                                ? 'text-slate-300'
                                : r.difference > 0
                                  ? 'text-rose-600'
                                  : 'text-emerald-600'
                            }`}
                          >
                            {r.difference == null
                              ? '—'
                              : r.difference > 0
                                ? `+${r.difference}`
                                : r.difference}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${FILL_STATUS[r.fillStatus]?.cls ?? ''}`}
                            >
                              {FILL_STATUS[r.fillStatus]?.label ?? r.fillStatus}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap gap-1">
                              {r.flags.length === 0 ? (
                                <span className="text-xs text-slate-300">—</span>
                              ) : (
                                r.flags.map(f => (
                                  <span
                                    key={f}
                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${FLAG_STYLE[f]?.cls ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}
                                  >
                                    {FLAG_STYLE[f]?.label ?? f}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}

          {/* RANGE / SUMMARY TABLE */}
          {mode === 'range' &&
            (summaryQ.isLoading ? (
              <SkeletonTable />
            ) : filteredSummary.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-400">
                {summary.length === 0
                  ? 'No frozen data in this range.'
                  : 'No rows match these filters.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                      <th className="text-left font-semibold px-5 py-2.5">Recruiter</th>
                      <th className="text-left font-semibold px-3 py-2.5">BU</th>
                      <th className="text-right font-semibold px-3 py-2.5">Naukri</th>
                      <th className="text-right font-semibold px-3 py-2.5">ATS</th>
                      <th className="text-right font-semibold px-3 py-2.5">Gap</th>
                      <th className="text-right font-semibold px-3 py-2.5">Not filled</th>
                      <th className="text-right font-semibold px-5 py-2.5">Leaking</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSummary.map(r => (
                      <tr
                        key={r.recruiterEmail}
                        className="border-b border-slate-50 hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-3">
                          <div className="font-semibold text-slate-900">
                            {r.recruiterName ?? r.recruiterEmail}
                          </div>
                          <div className="text-xs text-slate-400">{r.recruiterEmail}</div>
                        </td>
                        <td className="px-3 py-3 text-slate-500 text-xs">{r.bu ?? '—'}</td>
                        <td className="px-3 py-3 text-right tabular-nums font-semibold text-slate-700">
                          {r.naukri_consumed}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-700">
                          {r.ats_captured}
                        </td>
                        <td
                          className={`px-3 py-3 text-right tabular-nums font-bold ${Number(r.gap) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}
                        >
                          {Number(r.gap) > 0 ? `+${r.gap}` : r.gap}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-amber-600 font-semibold">
                          {r.days_not_filled}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-rose-600 font-semibold">
                          {r.days_leaking}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
