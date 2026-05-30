// File: page.tsx
// Path: src/app/(dashboard)/candidates/page.tsx

'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import {
  Search,
  Users,
  Briefcase,
  MapPin,
  Clock,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  UserPlus,
  ExternalLink,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAxios } from '@/hooks/useAxios';
import { useDebounce } from '@/hooks/useDebounce'; // adjust if your debounce hook path differs

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Candidate {
  id: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  cachedCurrentTitle: string | null;
  cachedCurrentCompany: string | null;
  cachedTotalExpYears: number | null;
  cachedTopSkills: string[];
  cachedLocationCity: string | null;
  cachedLocationState: string | null;
  source: string;
  reqCode: string | null;
  isActive: boolean;
  isBlocked: boolean;
  createdAt: string;
  lastActivityAt: string;
  skills: {
    normalizedSkill: string;
    rawSkill: string;
    yearsExp: number | null;
    proficiency: string | null;
    category: string | null;
  }[];
}

interface CandidatesResponse {
  success: boolean;
  data: Candidate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const initials = (name: string) =>
  name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const avatarColor = (seed: string) => {
  const p = [
    'bg-violet-200 text-violet-800',
    'bg-blue-200 text-blue-800',
    'bg-emerald-200 text-emerald-800',
    'bg-amber-200 text-amber-800',
    'bg-rose-200 text-rose-800',
    'bg-cyan-200 text-cyan-800',
    'bg-indigo-200 text-indigo-800',
    'bg-orange-200 text-orange-800',
  ];
  return p[seed.charCodeAt(0) % p.length];
};

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: 'Manual',
  PORTAL: 'Portal',
  REFERRAL: 'Referral',
  LINKEDIN: 'LinkedIn',
  AGENCY: 'Agency',
  WALK_IN: 'Walk-in',
  CHROME_EXTENSION: 'Extension',
  OTHER: 'Other',
};

const SOURCE_COLORS: Record<string, string> = {
  MANUAL: 'bg-slate-100 text-slate-700 border-slate-200',
  PORTAL: 'bg-blue-50 text-blue-700 border-blue-200',
  REFERRAL: 'bg-violet-50 text-violet-700 border-violet-200',
  LINKEDIN: 'bg-sky-50 text-sky-700 border-sky-200',
  AGENCY: 'bg-amber-50 text-amber-700 border-amber-200',
  WALK_IN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CHROME_EXTENSION: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  OTHER: 'bg-slate-100 text-slate-600 border-slate-200',
};

// ─────────────────────────────────────────────────────────────────────────────
// CANDIDATE CARD
// ─────────────────────────────────────────────────────────────────────────────

function CandidateRow({ c, onClick }: { c: Candidate; onClick: () => void }) {
  const exp =
    c.cachedTotalExpYears != null
      ? `${Math.floor(c.cachedTotalExpYears)}y ${Math.round((c.cachedTotalExpYears % 1) * 12)}m`
      : null;

  const topSkills = (
    c.cachedTopSkills?.length ? c.cachedTopSkills : c.skills.map(s => s.rawSkill)
  ).slice(0, 4);

  return (
    <div
      onClick={onClick}
      className="group flex items-start gap-4 px-5 py-4 border-b border-slate-100 hover:bg-slate-50/70 cursor-pointer transition-colors"
    >
      <Avatar className="h-10 w-10 shrink-0 mt-0.5">
        <AvatarFallback className={`text-sm font-bold ${avatarColor(c.id)}`}>
          {initials(c.fullName)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">
            {c.fullName}
          </span>
          {c.isBlocked && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
              Blocked
            </span>
          )}
          {!c.isActive && !c.isBlocked && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
              Inactive
            </span>
          )}
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${SOURCE_COLORS[c.source] ?? SOURCE_COLORS.OTHER}`}
          >
            {SOURCE_LABELS[c.source] ?? c.source}
          </span>
        </div>

        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {(c.cachedCurrentTitle || c.cachedCurrentCompany) && (
            <span className="text-xs text-slate-500">
              {c.cachedCurrentTitle}
              {c.cachedCurrentTitle && c.cachedCurrentCompany ? ' · ' : ''}
              {c.cachedCurrentCompany}
            </span>
          )}
          {exp && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Briefcase className="w-3 h-3" />
              {exp}
            </span>
          )}
          {(c.cachedLocationCity || c.cachedLocationState) && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <MapPin className="w-3 h-3" />
              {[c.cachedLocationCity, c.cachedLocationState].filter(Boolean).join(', ')}
            </span>
          )}
        </div>

        {topSkills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {topSkills.map(s => (
              <span
                key={s}
                className="text-[10px] font-semibold bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 text-right flex flex-col items-end gap-1">
        <span className="text-xs text-slate-400">
          {format(new Date(c.createdAt), 'dd MMM yyyy')}
        </span>
        <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary transition-colors" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON ROWS
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-start gap-4 px-5 py-4 border-b border-slate-100">
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-64" />
        <div className="flex gap-1.5 mt-1">
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-4 w-20 rounded-full" />
          <Skeleton className="h-4 w-14 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function CandidatesPage() {
  const router = useRouter();
  const axios = useAxios();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [source, setSource] = useState('');
  const [isActive, setIsActive] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [minExp, setMinExp] = useState('');
  const [maxExp, setMaxExp] = useState('');

  const debouncedSearch = useDebounce(search, 350);

  const hasFilters = !!source || !!isActive || !!minExp || !!maxExp;

  const clearFilters = () => {
    setSource('');
    setIsActive('');
    setMinExp('');
    setMaxExp('');
    setPage(1);
  };

  const buildParams = useCallback(() => {
    const p: Record<string, string> = { page: String(page), limit: '20' };
    if (debouncedSearch) p.search = debouncedSearch;
    if (source) p.source = source;
    if (isActive) p.isActive = isActive;
    if (minExp) p.minExp = minExp;
    if (maxExp) p.maxExp = maxExp;
    return new URLSearchParams(p).toString();
  }, [page, debouncedSearch, source, isActive, minExp, maxExp]);

  const { data, isLoading, isError } = useQuery<CandidatesResponse>({
    queryKey: ['candidates', page, debouncedSearch, source, isActive, minExp, maxExp],
    queryFn: async () =>
      (
        await axios.get(`/candidate/api/candidates?${buildParams()}`, {
          baseURL: '/api/proxy',
        })
      ).data,
  });

  const candidates = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {/* ═══ HEADER ═══ */}
      <div className="border-b border-slate-200 bg-white shrink-0 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">Candidates</h1>
              {pagination && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {pagination.total.toLocaleString()} total
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className={`gap-2 h-8 text-sm font-semibold ${showFilters ? 'bg-slate-100' : ''}`}
              onClick={() => setShowFilters(v => !v)}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
              {hasFilters && (
                <span className="ml-0.5 w-4 h-4 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center">
                  !
                </span>
              )}
            </Button>
            <Button
              size="sm"
              className="gap-2 h-8 text-sm font-semibold"
              onClick={() => router.push('/candidates/create')}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Candidate
            </Button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, email, company, title..."
            className="pl-9 h-9 text-sm bg-slate-50 border-slate-200 focus:bg-white"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <Select
              value={source || '__all__'}
              onValueChange={v => {
                setSource(v === '__all__' ? '' : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-36 text-xs font-semibold">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-xs">
                  All sources
                </SelectItem>
                {Object.entries(SOURCE_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val} className="text-xs">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={isActive || '__all__'}
              onValueChange={v => {
                setIsActive(v === '__all__' ? '' : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-32 text-xs font-semibold">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-xs">
                  All status
                </SelectItem>
                <SelectItem value="true" className="text-xs">
                  Active
                </SelectItem>
                <SelectItem value="false" className="text-xs">
                  Inactive
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5">
              <Input
                value={minExp}
                onChange={e => {
                  setMinExp(e.target.value);
                  setPage(1);
                }}
                placeholder="Min exp (y)"
                className="h-8 w-24 text-xs"
                type="number"
                min={0}
              />
              <span className="text-xs text-slate-400">–</span>
              <Input
                value={maxExp}
                onChange={e => {
                  setMaxExp(e.target.value);
                  setPage(1);
                }}
                placeholder="Max exp (y)"
                className="h-8 w-24 text-xs"
                type="number"
                min={0}
              />
            </div>

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
        )}
      </div>

      {/* ═══ LIST ═══ */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div>
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <AlertCircle className="w-8 h-8 text-rose-400" />
            <p className="text-sm font-medium text-slate-600">Failed to load candidates.</p>
          </div>
        )}

        {!isLoading && !isError && candidates.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Users className="w-10 h-10 text-slate-200" />
            <p className="text-sm font-medium text-slate-500">No candidates found.</p>
            {(search || hasFilters) && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-slate-500"
                onClick={() => {
                  setSearch('');
                  clearFilters();
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        )}

        {!isLoading &&
          !isError &&
          candidates.map(c => (
            <CandidateRow key={c.id} c={c} onClick={() => router.push(`/candidates/${c.id}`)} />
          ))}
      </div>

      {/* ═══ PAGINATION ═══ */}
      {pagination && pagination.totalPages > 1 && (
        <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-3 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total.toLocaleString()}{' '}
            candidates
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              disabled={!pagination.hasPrevPage}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              disabled={!pagination.hasNextPage}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
