// File: page.tsx
// Path: src/app/(dashboard)/internal-pool/results/page.tsx

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  UserPlus,
  CheckCircle2,
  Loader2,
  Database,
  Zap,
  Bookmark,
  BookmarkPlus,
  History,
  Phone,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAxios } from '@/hooks/useAxios';
import {
  useInternalPoolStore,
  useInternalPoolStoreReady,
  type InternalPoolFilters,
} from '@/stores/internalPoolStore';

// =============================================================================
// TYPES
// =============================================================================

interface PoolCandidate {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  cachedCurrentTitle: string | null;
  cachedCurrentCompany: string | null;
  cachedTotalExpYears: number | null;
  cachedTopSkills: string[];
  cachedLocationCity: string | null;
  cachedLocationState: string | null;
  noticePeriodDays: number | null;
  isImmediateJoiner: boolean;
  source: string;
  currentSalary: number | null;
  lastActivityAt: string;
  createdAt: string;
  skills: {
    normalizedSkill: string;
    rawSkill: string;
    yearsExp: number | null;
    proficiency: string | null;
    category: string | null;
  }[];
  experiences: {
    company: string;
    role: string;
    startDate: string | null;
    endDate: string | null;
    isCurrent: boolean;
    durationMonths: number | null;
    city: string | null;
  }[];
  educations: {
    institution: string;
    degree: string | null;
    fieldOfStudy: string | null;
    endYear: number | null;
  }[];
  resumeUrl: string | null;
}

interface SearchResult {
  success: boolean;
  candidates: PoolCandidate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// =============================================================================
// HELPERS
// =============================================================================

const SOURCE_LABELS: Record<string, string> = {
  NAUKRI: 'Naukri',
  MANUAL: 'Manual',
  CHROME_EXTENSION: 'Extension',
  BULK_INGEST: 'Bulk',
  LINKEDIN: 'LinkedIn',
  PORTAL: 'Portal',
  REFERRAL: 'Referral',
  AGENCY: 'Agency',
  WALK_IN: 'Walk-in',
  NAUKRI_TALENT_POOL: 'Naukri TP',
};
const SOURCE_COLORS: Record<string, string> = {
  NAUKRI: 'bg-orange-50 text-orange-700 border-orange-200',
  MANUAL: 'bg-slate-100 text-slate-600 border-slate-200',
  CHROME_EXTENSION: 'bg-blue-50 text-blue-700 border-blue-200',
  BULK_INGEST: 'bg-violet-50 text-violet-700 border-violet-200',
  LINKEDIN: 'bg-sky-50 text-sky-700 border-sky-200',
};
const NOTICE_OPTIONS = [
  { label: 'Any', value: '' },
  { label: '0–15 days', value: '15' },
  { label: '1 month', value: '30' },
  { label: '2 months', value: '60' },
  { label: '3 months', value: '90' },
];

function avatarColor(seed: string) {
  const c = [
    'bg-blue-500',
    'bg-violet-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-pink-500',
  ];
  return c[seed.charCodeAt(0) % c.length];
}
function initials(name: string) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
function fmtExp(years: number | null) {
  if (years == null) return null;
  const y = Math.floor(years);
  const m = Math.round((years % 1) * 12);
  return `${y}y ${m}m`;
}
function fmtSalary(val: number | null) {
  if (!val) return null;
  return `₹ ${(val / 100000).toFixed(0)} Lacs`;
}
function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}
function filtersToParams(f: InternalPoolFilters, page: number) {
  const p = new URLSearchParams();
  if (f.keyword) p.set('keyword', f.keyword);
  if (f.skills.length) p.set('skills', f.skills.join(','));
  if (f.city) p.set('city', f.city);
  if (f.state) p.set('state', f.state);
  if (f.minExp) p.set('minExp', f.minExp);
  if (f.maxExp) p.set('maxExp', f.maxExp);
  if (f.maxNoticeDays) p.set('maxNoticeDays', f.maxNoticeDays);
  if (f.isImmediateJoiner) p.set('isImmediateJoiner', 'true');
  if (f.source) p.set('source', f.source);
  if (f.company) p.set('company', f.company);
  if (f.designation) p.set('designation', f.designation);
  if (f.degree) p.set('degree', f.degree);
  if (f.fieldOfStudy) p.set('fieldOfStudy', f.fieldOfStudy);
  if (f.minSalary) p.set('minSalary', f.minSalary);
  if (f.maxSalary) p.set('maxSalary', f.maxSalary);
  p.set('page', String(page));
  p.set('limit', '20');
  return p.toString();
}

// =============================================================================
// SKILL TAG INPUT
// =============================================================================

function SkillTagInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('');
  function add(raw: string) {
    const t = raw.trim().toLowerCase();
    if (!t || value.includes(t)) return;
    onChange([...value, t]);
    setInput('');
  }
  return (
    <div className="flex flex-wrap gap-1 p-1.5 border border-slate-200 rounded-lg bg-white min-h-8 items-center focus-within:border-blue-400 transition-colors">
      {value.map(skill => (
        <span
          key={skill}
          className="inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200"
        >
          {skill}
          <button onClick={() => onChange(value.filter(s => s !== skill))}>
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add(input);
          }
          if (e.key === 'Backspace' && !input && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => add(input)}
        placeholder={value.length ? '' : 'Add skill, Enter'}
        className="flex-1 min-w-16 text-[11px] outline-none bg-transparent placeholder:text-slate-400"
      />
    </div>
  );
}

// =============================================================================
// FILTER SECTION
// =============================================================================

function FilterSection({
  title,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">{title}</span>
          {badge && badge > 0 ? (
            <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center">
              {badge}
            </span>
          ) : null}
        </div>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>
      {open && <div className="pb-4 space-y-3">{children}</div>}
    </div>
  );
}

// =============================================================================
// CANDIDATE CARD — Naukri style, with spacing between cards
// =============================================================================

function CandidateCard({
  candidate,
  onSource,
  isSourced,
  isSourcing,
  hasContext,
  onViewProfile,
}: {
  candidate: PoolCandidate;
  onSource: (c: PoolCandidate) => void;
  isSourced: boolean;
  isSourcing: boolean;
  hasContext: boolean;
  onViewProfile: (id: string) => void;
}) {
  const [phoneRevealed, setPhoneRevealed] = useState(false);

  const currentExp = candidate.experiences?.find(e => e.isCurrent) ?? null;
  const previousExp = candidate.experiences?.find(e => !e.isCurrent) ?? null;
  const edu = candidate.educations?.[0] ?? null;
  const expLabel = fmtExp(candidate.cachedTotalExpYears);
  const salaryLabel = fmtSalary(candidate.currentSalary);
  const location = [candidate.cachedLocationCity, candidate.cachedLocationState]
    .filter(Boolean)
    .join(', ');
  const allSkills = candidate.skills.map(s => s.rawSkill);
  const topSkills = allSkills.slice(0, 8);
  const extraSkills = allSkills.length > 8 ? allSkills.slice(8, 13) : [];

  return (
    // Gap between cards via rounded card with shadow instead of border-b divider
    <div className="bg-white rounded-xl border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all">
      <div className="px-6 py-5 flex gap-4">
        {/* LEFT content */}
        <div className="flex-1 min-w-0">
          {/* Name + meta */}
          <div className="mb-3">
            <button
              onClick={() => onViewProfile(candidate.id)}
              className="text-[17px] font-bold text-blue-700 hover:text-blue-900 hover:underline leading-tight text-left"
            >
              {candidate.fullName}
            </button>
            <div className="flex items-center gap-4 mt-1 text-sm text-slate-600 flex-wrap">
              {expLabel && (
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-base">⏱</span>
                  {expLabel}
                </span>
              )}
              {salaryLabel && (
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-semibold">₹</span>
                  {salaryLabel}
                </span>
              )}
              {location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {location}
                </span>
              )}
            </div>
          </div>

          {/* Label-value rows */}
          <div className="space-y-2 mb-3">
            {currentExp && (
              <div className="flex gap-3 text-sm">
                <span className="text-slate-400 w-[88px] shrink-0 text-right leading-5">
                  Current
                </span>
                <span className="text-slate-800 font-medium leading-5">
                  {currentExp.role} at {currentExp.company}
                </span>
              </div>
            )}
            {previousExp && (
              <div className="flex gap-3 text-sm">
                <span className="text-slate-400 w-[88px] shrink-0 text-right leading-5">
                  Previous
                </span>
                <span className="text-slate-700 leading-5">
                  {previousExp.role} at {previousExp.company}
                </span>
              </div>
            )}
            {edu && (
              <div className="flex gap-3 text-sm">
                <span className="text-slate-400 w-[88px] shrink-0 text-right leading-5">
                  Education
                </span>
                <span className="text-slate-700 leading-5">
                  {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(' / ')}
                  {edu.institution ? ` ${edu.institution}` : ''}
                  {edu.endYear ? ` ${edu.endYear}` : ''}
                </span>
              </div>
            )}
            {location && (
              <div className="flex gap-3 text-sm">
                <span className="text-slate-400 w-[88px] shrink-0 text-right leading-5">
                  Pref. location
                </span>
                <span className="text-slate-700 leading-5">{location}</span>
              </div>
            )}
            {topSkills.length > 0 && (
              <div className="flex gap-3 text-sm">
                <span className="text-slate-400 w-[88px] shrink-0 text-right pt-0.5">
                  Key skills
                </span>
                <div className="flex flex-wrap gap-x-1 gap-y-0.5">
                  {topSkills.map((skill, i) => (
                    <span key={i} className="text-blue-700">
                      {skill}
                      {i < topSkills.length - 1 ? ' |' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {extraSkills.length > 0 && (
              <div className="flex gap-3 text-sm">
                <span className="text-slate-400 w-[88px] shrink-0 text-right pt-0.5">
                  May also know
                </span>
                <div className="flex flex-wrap gap-x-1 gap-y-0.5 items-center">
                  {extraSkills.map((skill, i) => (
                    <span key={i} className="text-slate-500">
                      {skill}
                      {i < extraSkills.length - 1 ? ' |' : ''}
                    </span>
                  ))}
                  {allSkills.length > 13 && (
                    <button className="text-blue-600 hover:underline ml-1">... more</button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom strip */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-100 flex-wrap text-xs text-slate-400">
            <span
              className={cn(
                'font-semibold px-2 py-0.5 rounded-full border text-[11px]',
                SOURCE_COLORS[candidate.source] ?? 'bg-slate-100 text-slate-600 border-slate-200'
              )}
            >
              {SOURCE_LABELS[candidate.source] ?? candidate.source}
            </span>
            {candidate.isImmediateJoiner && (
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <Zap className="w-3 h-3" />
                Immediate
              </span>
            )}
            {candidate.noticePeriodDays != null && !candidate.isImmediateJoiner && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {candidate.noticePeriodDays <= 30
                  ? `${candidate.noticePeriodDays}d notice`
                  : `${Math.round(candidate.noticePeriodDays / 30)}m notice`}
              </span>
            )}
            <span className="ml-auto">Modified {timeAgo(candidate.lastActivityAt)}</span>
            <span>Active {timeAgo(candidate.lastActivityAt)}</span>
          </div>
        </div>

        {/* RIGHT: avatar + actions */}
        <div className="w-36 shrink-0 flex flex-col items-center gap-2.5 pt-1">
          <div
            className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0',
              avatarColor(candidate.id)
            )}
          >
            {initials(candidate.fullName)}
          </div>

          {/* Phone reveal */}
          {candidate.phone && (
            <button
              onClick={() => setPhoneRevealed(v => !v)}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              {phoneRevealed ? candidate.phone : 'View phone'}
            </button>
          )}

          {/* Source button */}
          {hasContext ? (
            <button
              disabled={isSourced || isSourcing}
              onClick={e => {
                e.stopPropagation();
                onSource(candidate);
              }}
              className={cn(
                'w-full flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border transition-colors',
                isSourced
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 cursor-default'
                  : isSourcing
                    ? 'bg-blue-50 text-blue-500 border-blue-200'
                    : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
              )}
            >
              {isSourcing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isSourced ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <UserPlus className="w-3.5 h-3.5" />
              )}
              {isSourced ? 'Sourced' : isSourcing ? 'Adding…' : 'Source'}
            </button>
          ) : (
            <button
              onClick={() => onViewProfile(candidate.id)}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-50 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-6 py-5">
      <div className="flex gap-4">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-48" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-4 w-20 shrink-0" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
        <div className="w-36 flex flex-col items-center gap-2.5">
          <Skeleton className="w-16 h-16 rounded-full" />
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SOURCE CONFIRM DIALOG
// =============================================================================

function SourceDialog({
  candidate,
  context,
  open,
  onClose,
  onConfirm,
  isLoading,
}: {
  candidate: PoolCandidate | null;
  context: any;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  if (!candidate || !context) return null;
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-base font-bold">
            <span className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <UserPlus className="w-4 h-4 text-blue-600" />
            </span>
            Add to Requirement
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0',
                avatarColor(candidate.id)
              )}
            >
              {initials(candidate.fullName)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{candidate.fullName}</p>
              <p className="text-xs text-slate-500 truncate">
                {candidate.cachedCurrentTitle}
                {candidate.cachedCurrentTitle && candidate.cachedCurrentCompany ? ' · ' : ''}
                {candidate.cachedCurrentCompany}
              </p>
            </div>
          </div>
          <div className="flex justify-center">
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <span className="text-xs font-mono font-bold text-blue-600 bg-white border border-blue-200 px-2 py-0.5 rounded mr-2">
              {context.reqCode}
            </span>
            <p className="text-sm font-semibold text-slate-900 mt-1.5 truncate">
              {context.requirementTitle}
            </p>
          </div>
          <p className="text-xs text-slate-500 text-center">
            Added at sourced stage. Move forward from the pipeline.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading} className="gap-2 min-w-28">
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <UserPlus className="w-3.5 h-3.5" />
            )}
            {isLoading ? 'Adding…' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// RESULTS PAGE
// =============================================================================

export default function InternalPoolResultsPage() {
  const axios = useAxios();
  const router = useRouter();
  const qc = useQueryClient();
  const hydrated = useInternalPoolStoreReady();

  const {
    filters,
    page,
    activeContext,
    savedSearches,
    recentSearches,
    setFilters,
    resetFilters,
    setPage,
    setSavedSearches,
    addSavedSearch,
    removeSavedSearch,
    applySavedSearch,
    applyRecentSearch,
    pushRecentSearch,
    previewCandidateId,
    setPreviewCandidateId,
  } = useInternalPoolStore();

  const [committedQs, setCommittedQs] = useState<string | null>(null);
  const [sourcedIds, setSourcedIds] = useState<Set<string>>(new Set());
  const [sourcingId, setSourcingId] = useState<string | null>(null);
  const [sourceDialogCandidate, setSourceDialogCandidate] = useState<PoolCandidate | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [savePin, setSavePin] = useState(false);

  useEffect(() => {
    if (hydrated) setCommittedQs(filtersToParams(filters, page));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // ── Saved searches — core service, no baseURL needed ──────────────────────
  useQuery({
    queryKey: ['saved-searches', activeContext?.requirementId],
    queryFn: async () => {
      const qs = activeContext?.requirementId
        ? `?requirementId=${activeContext.requirementId}`
        : '';
      const res = await axios.get(`/internal-pool/saved-searches${qs}`);
      setSavedSearches(res.data.data ?? []);
      return res.data;
    },
    enabled: hydrated,
    staleTime: 30_000,
  });

  function handleSearch() {
    const qs = filtersToParams(filters, 1);
    setPage(1);
    setCommittedQs(qs);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    setCommittedQs(filtersToParams(filters, newPage));
    window.scrollTo({ top: 0 });
  }

  // ── Search — candidate service via proxy ──────────────────────────────────
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['internal-pool-search', committedQs],
    queryFn: async () => {
      const res = await axios.get(`/candidate/api/internal-pool/search?${committedQs}`, {
        baseURL: '/api/proxy',
        withCredentials: true,
      });
      return res.data as SearchResult;
    },
    enabled: !!committedQs,
    placeholderData: prev => prev,
  });

  useEffect(() => {
    if (data?.pagination?.total != null) {
      pushRecentSearch(filters, data.pagination.total);
      // core service — no baseURL
      axios
        .post('/internal-pool/log/search', {
          requirementId: activeContext?.requirementId,
          assignmentId: activeContext?.assignmentId,
          filters,
          resultCount: data.pagination.total,
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.pagination?.total]);

  // ── Source — core service ─────────────────────────────────────────────────
  const sourceMut = useMutation({
    mutationFn: async (candidate: PoolCandidate) => {
      if (!activeContext) throw new Error('No active requirement');
      return axios.post('/internal-pool/source', {
        candidateServiceId: candidate.id,
        requirementId: activeContext.requirementId,
        assignmentId: activeContext.assignmentId,
        fullName: candidate.fullName,
        email: candidate.email,
        phone: candidate.phone,
        currentTitle: candidate.cachedCurrentTitle,
        currentCompany: candidate.cachedCurrentCompany,
        totalExpYears: candidate.cachedTotalExpYears,
        topSkills: candidate.cachedTopSkills,
        resumeUrl: candidate.resumeUrl,
        rawSnapshot: {
          candidateId: candidate.id,
          fullName: candidate.fullName,
          email: candidate.email,
          phone: candidate.phone,
          currentTitle: candidate.cachedCurrentTitle,
          currentCompany: candidate.cachedCurrentCompany,
          totalExpYears: candidate.cachedTotalExpYears,
          topSkills: candidate.cachedTopSkills,
          skills: candidate.skills.map(s => ({ name: s.rawSkill, yearsExp: s.yearsExp })),
        },
      });
    },
    onSuccess: (res, candidate) => {
      setSourcedIds(prev => new Set([...prev, candidate.id]));
      setSourcingId(null);
      setSourceDialogCandidate(null);
      if (res.data.alreadyExists) toast.info(`${candidate.fullName} already in pipeline`);
      else toast.success(`${candidate.fullName} added to ${activeContext?.reqCode}`);
      qc.invalidateQueries({ queryKey: ['assignment-pipeline'] });
    },
    onError: (err: any, candidate) => {
      setSourcingId(null);
      toast.error(err?.response?.data?.message ?? `Failed to add ${candidate.fullName}`);
    },
  });

  // ── Save search — core service ────────────────────────────────────────────
  const saveSearchMut = useMutation({
    mutationFn: async () =>
      axios.post('/internal-pool/saved-searches', {
        name: saveName,
        filters,
        requirementId: savePin ? activeContext?.requirementId : undefined,
        assignmentId: savePin ? activeContext?.assignmentId : undefined,
      }),
    onSuccess: res => {
      addSavedSearch(res.data.data);
      setSaveDialogOpen(false);
      setSaveName('');
      toast.success('Search saved');
    },
    onError: () => toast.error('Failed to save search'),
  });

  const deleteSavedSearchMut = useMutation({
    mutationFn: async (id: string) => axios.delete(`/internal-pool/saved-searches/${id}`),
    onSuccess: (_, id) => removeSavedSearch(id),
  });

  const f = filters;
  const set = setFilters;
  const candidates = data?.candidates ?? [];
  const pagination = data?.pagination;
  const employmentBadge = [
    f.maxNoticeDays,
    f.isImmediateJoiner,
    f.company,
    f.designation,
    f.source,
    f.minSalary,
    f.maxSalary,
  ].filter(Boolean).length;
  const educationBadge = [f.degree, f.fieldOfStudy].filter(Boolean).length;
  const totalFilters = [
    f.keyword,
    f.skills.length,
    f.city,
    f.state,
    f.minExp,
    f.maxExp,
    f.maxNoticeDays,
    f.isImmediateJoiner,
    f.company,
    f.designation,
    f.source,
    f.degree,
    f.fieldOfStudy,
    f.minSalary,
    f.maxSalary,
  ].filter(Boolean).length;

  return (
    // ── Centered layout: sidebar + results centered together ─────────────────
    <div className="h-[calc(100vh-64px)] bg-[#F1F4F8] overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 py-5 flex gap-5 items-start">
        {/* ═══ LEFT FILTER SIDEBAR ════════════════════════════════════════ */}
        <div className="w-56 shrink-0 bg-white border border-slate-200 rounded-xl overflow-hidden sticky top-5 max-h-[calc(100vh-100px)] flex flex-col">
          <div className="px-4 pt-4 pb-3 border-b border-slate-200 space-y-2">
            <button
              onClick={() => router.push('/internal-pool')}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Modify Search
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                {isLoading ? 'Searching…' : `${(pagination?.total ?? 0).toLocaleString()} found`}
              </span>
              {isFetching && !isLoading && (
                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            {activeContext && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-2">
                <p className="text-[11px] font-bold text-blue-700 truncate">
                  {activeContext.requirementTitle}
                </p>
                <p className="text-[10px] text-blue-500 font-mono">{activeContext.reqCode}</p>
              </div>
            )}
            <Button
              onClick={handleSearch}
              className="w-full h-8 text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700"
            >
              <Search className="w-3.5 h-3.5" />
              Apply Filters
            </Button>
            {totalFilters > 0 && (
              <button
                onClick={resetFilters}
                className="w-full text-[11px] font-semibold text-slate-400 hover:text-rose-500 flex items-center justify-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear all
              </button>
            )}
          </div>

          {/* Recent + Saved */}
          <div className="overflow-y-auto flex-1">
            {(recentSearches.length > 0 || savedSearches.length > 0) && (
              <div className="px-4 py-3 border-b border-slate-100 space-y-2">
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <History className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        Recent
                      </span>
                    </div>
                    {recentSearches.slice(0, 3).map(r => (
                      <button
                        key={r.id}
                        onClick={() => {
                          applyRecentSearch(r);
                          handleSearch();
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 group"
                      >
                        <p className="text-[11px] font-semibold text-slate-600 group-hover:text-blue-600 truncate">
                          {r.label}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {r.resultCount.toLocaleString()} results
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                {savedSearches.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Bookmark className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        Saved
                      </span>
                    </div>
                    {savedSearches.map(s => (
                      <div
                        key={s.id}
                        className="group flex items-center px-2 py-1.5 rounded-lg hover:bg-slate-50"
                      >
                        <button
                          onClick={() => {
                            applySavedSearch(s);
                            handleSearch();
                          }}
                          className="flex-1 text-left min-w-0"
                        >
                          <p className="text-[11px] font-semibold text-slate-600 group-hover:text-blue-600 truncate">
                            {s.name}
                          </p>
                        </button>
                        <button
                          onClick={() => deleteSavedSearchMut.mutate(s.id)}
                          className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setSaveDialogOpen(true)}
                  className="w-full flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-blue-600 px-2 py-1"
                >
                  <BookmarkPlus className="w-3 h-3" />
                  Save this search
                </button>
              </div>
            )}

            {/* Filter controls */}
            <div className="px-4">
              <div className="border-b border-slate-100 py-3">
                <Label className="text-xs font-bold text-slate-700 mb-1.5 block">Keywords</Label>
                <div className="relative">
                  <Input
                    value={f.keyword}
                    onChange={e => set({ keyword: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="React, Java, PM…"
                    className="h-7 text-xs pr-6 border-slate-200"
                  />
                  {f.keyword && (
                    <button
                      onClick={() => set({ keyword: '' })}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="border-b border-slate-100 py-3">
                <Label className="text-xs font-bold text-slate-700 mb-1.5 block">Skills</Label>
                <SkillTagInput value={f.skills} onChange={skills => set({ skills })} />
              </div>
              <div className="border-b border-slate-100 py-3">
                <Label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Experience (Years)
                </Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    value={f.minExp}
                    onChange={e => set({ minExp: e.target.value })}
                    placeholder="Min"
                    className="h-7 text-xs border-slate-200"
                  />
                  <span className="text-slate-400 text-xs">–</span>
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    value={f.maxExp}
                    onChange={e => set({ maxExp: e.target.value })}
                    placeholder="Max"
                    className="h-7 text-xs border-slate-200"
                  />
                </div>
              </div>
              <div className="border-b border-slate-100 py-3">
                <Label className="text-xs font-bold text-slate-700 mb-1.5 block">Location</Label>
                <div className="space-y-1.5">
                  <Input
                    value={f.city}
                    onChange={e => set({ city: e.target.value })}
                    placeholder="City"
                    className="h-7 text-xs border-slate-200"
                  />
                  <Input
                    value={f.state}
                    onChange={e => set({ state: e.target.value })}
                    placeholder="State"
                    className="h-7 text-xs border-slate-200"
                  />
                </div>
              </div>
              <FilterSection title="Employment Details" defaultOpen badge={employmentBadge}>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 mb-1.5">Notice Period</p>
                  <div className="flex flex-wrap gap-1">
                    {NOTICE_OPTIONS.map(o => (
                      <button
                        key={o.value}
                        onClick={() =>
                          set({ maxNoticeDays: o.value === f.maxNoticeDays ? '' : o.value })
                        }
                        className={cn(
                          'text-[11px] font-semibold px-2 py-1 rounded-full border transition-colors',
                          f.maxNoticeDays === o.value
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                        )}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() =>
                    set({
                      isImmediateJoiner: !f.isImmediateJoiner,
                      maxNoticeDays: !f.isImmediateJoiner ? '0' : '',
                    })
                  }
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-semibold transition-colors w-full',
                    f.isImmediateJoiner
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'bg-white border-slate-200 text-slate-600'
                  )}
                >
                  <Zap
                    className={cn(
                      'w-3 h-3',
                      f.isImmediateJoiner ? 'text-emerald-500' : 'text-slate-400'
                    )}
                  />
                  Immediate joiners
                  {f.isImmediateJoiner && (
                    <CheckCircle2 className="w-3 h-3 ml-auto text-emerald-500" />
                  )}
                </button>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 mb-1">Company</p>
                  <Input
                    value={f.company}
                    onChange={e => set({ company: e.target.value })}
                    placeholder="e.g. Infosys"
                    className="h-7 text-xs border-slate-200"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 mb-1">Designation</p>
                  <Input
                    value={f.designation}
                    onChange={e => set({ designation: e.target.value })}
                    placeholder="e.g. Sr. Engineer"
                    className="h-7 text-xs border-slate-200"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 mb-1">Source</p>
                  <Select
                    value={f.source || 'any'}
                    onValueChange={v => set({ source: v === 'any' ? '' : v })}
                  >
                    <SelectTrigger className="h-7 text-xs border-slate-200">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      {[['any', 'Any source'], ...Object.entries(SOURCE_LABELS)].map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-xs">
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 mb-1">Salary (₹ Lacs)</p>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      value={f.minSalary}
                      onChange={e => set({ minSalary: e.target.value })}
                      placeholder="Min"
                      className="h-7 text-xs border-slate-200"
                    />
                    <span className="text-slate-400 text-xs">–</span>
                    <Input
                      type="number"
                      value={f.maxSalary}
                      onChange={e => set({ maxSalary: e.target.value })}
                      placeholder="Max"
                      className="h-7 text-xs border-slate-200"
                    />
                  </div>
                </div>
              </FilterSection>
              <FilterSection title="Education Details" badge={educationBadge}>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 mb-1">Degree</p>
                  <Input
                    value={f.degree}
                    onChange={e => set({ degree: e.target.value })}
                    placeholder="e.g. B.Tech, MBA"
                    className="h-7 text-xs border-slate-200"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 mb-1">Field of Study</p>
                  <Input
                    value={f.fieldOfStudy}
                    onChange={e => set({ fieldOfStudy: e.target.value })}
                    placeholder="e.g. Computer Science"
                    className="h-7 text-xs border-slate-200"
                  />
                </div>
              </FilterSection>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT — candidate cards with gap ═══════════════════════════ */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4 bg-white rounded-xl border border-slate-200">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Database className="w-7 h-7 text-slate-300" />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-slate-700">No candidates found</p>
                <p className="text-sm text-slate-500 mt-1">Try broadening your filters</p>
              </div>
              <Button variant="outline" onClick={() => router.push('/internal-pool')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Modify Search
              </Button>
            </div>
          ) : (
            <>
              {/* Cards with gap-3 between them */}
              <div className="space-y-3">
                {candidates.map(c => (
                  <CandidateCard
                    key={c.id}
                    candidate={c}
                    onSource={candidate => setSourceDialogCandidate(candidate)}
                    isSourced={sourcedIds.has(c.id)}
                    isSourcing={sourcingId === c.id}
                    hasContext={!!activeContext}
                    onViewProfile={id => router.push(`/internal-pool/candidates/${id}`)}
                  />
                ))}
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 py-4 bg-white rounded-xl border border-slate-200 px-6">
                  <span className="text-sm text-slate-500">
                    {(pagination.page - 1) * pagination.limit + 1}–
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-4 rounded-xl"
                      disabled={!pagination.hasPrevPage}
                      onClick={() => handlePageChange(page - 1)}
                    >
                      ← Prev
                    </Button>
                    <span className="text-sm text-slate-500">
                      {pagination.page} / {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-4 rounded-xl"
                      disabled={!pagination.hasNextPage}
                      onClick={() => handlePageChange(page + 1)}
                    >
                      Next →
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ═══ DIALOGS ════════════════════════════════════════════════════════ */}
      <SourceDialog
        candidate={sourceDialogCandidate}
        context={activeContext}
        open={!!sourceDialogCandidate}
        onClose={() => setSourceDialogCandidate(null)}
        onConfirm={() => {
          if (!sourceDialogCandidate) return;
          setSourcingId(sourceDialogCandidate.id);
          sourceMut.mutate(sourceDialogCandidate);
        }}
        isLoading={sourceMut.isPending}
      />

      <Dialog
        open={saveDialogOpen}
        onOpenChange={v => {
          if (!v) {
            setSaveDialogOpen(false);
            setSaveName('');
            setSavePin(false);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <BookmarkPlus className="w-4 h-4 text-blue-600" />
              Save this search
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Name</Label>
              <Input
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveName.trim() && saveSearchMut.mutate()}
                placeholder="e.g. React 5yr Bengaluru"
                className="h-9 text-sm"
                autoFocus
              />
            </div>
            {activeContext && (
              <button
                onClick={() => setSavePin(v => !v)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors text-left',
                  savePin
                    ? 'bg-blue-50 border-blue-400 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-600'
                )}
              >
                <div
                  className={cn(
                    'w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center',
                    savePin ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                  )}
                >
                  {savePin && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
                <div className="min-w-0">
                  <p>Pin to {activeContext.reqCode}</p>
                  <p className="text-[11px] font-normal text-slate-500 truncate">
                    {activeContext.requirementTitle}
                  </p>
                </div>
              </button>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSaveDialogOpen(false);
                setSaveName('');
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!saveName.trim() || saveSearchMut.isPending}
              onClick={() => saveSearchMut.mutate()}
              className="gap-2"
            >
              {saveSearchMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
