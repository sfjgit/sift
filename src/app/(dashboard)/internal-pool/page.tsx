// File: page.tsx
// Path: src/app/(dashboard)/internal-pool/page.tsx

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Database,
  Clock,
  Bookmark,
  BookmarkPlus,
  Zap,
  GraduationCap,
  Briefcase,
  Loader2,
  History,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAxios } from '@/hooks/useAxios';
import {
  useInternalPoolStore,
  useInternalPoolStoreReady,
  DEFAULT_FILTERS,
  type SavedSearch,
  type RecentSearch,
} from '@/stores/internalPoolStore';
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

// =============================================================================
// SKILL TAG INPUT
// =============================================================================

function SkillTagInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('');

  function add(raw: string) {
    const t = raw.trim().toLowerCase();
    if (!t) return;
    if (!value.includes(t)) onChange([...value, t]);
    setInput('');
  }

  return (
    <div className="flex flex-wrap gap-1.5 px-3 py-2.5 border-2 border-slate-200 rounded-xl bg-white min-h-12 items-center focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-colors">
      {value.map(skill => (
        <span
          key={skill}
          className="inline-flex items-center gap-1 text-sm font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200"
        >
          {skill}
          <button
            onClick={() => onChange(value.filter(s => s !== skill))}
            className="hover:text-blue-900 ml-0.5"
          >
            <X className="w-3.5 h-3.5" />
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
        placeholder={value.length ? '' : 'e.g. React, Node.js, Python — press Enter to add'}
        className="flex-1 min-w-48 text-sm outline-none bg-transparent placeholder:text-slate-400"
      />
    </div>
  );
}

// =============================================================================
// COLLAPSIBLE SECTION
// =============================================================================

function Section({
  title,
  icon,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        'border-2 rounded-2xl overflow-hidden transition-colors',
        open ? 'border-slate-300 bg-white' : 'border-slate-200 bg-white hover:border-slate-300'
      )}
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-6 py-4"
      >
        <div className="flex items-center gap-3">
          <span className={cn('transition-colors', open ? 'text-blue-600' : 'text-slate-400')}>
            {icon}
          </span>
          <span
            className={cn(
              'text-base font-bold transition-colors',
              open ? 'text-slate-900' : 'text-slate-700'
            )}
          >
            {title}
          </span>
          {badge && badge > 0 ? (
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-black flex items-center justify-center">
              {badge}
            </span>
          ) : null}
        </div>
        {open ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>
      {open && (
        <div className="px-6 pb-6 pt-2 border-t-2 border-slate-100 space-y-5">{children}</div>
      )}
    </div>
  );
}

// =============================================================================
// NOTICE PERIOD CHIPS
// =============================================================================

const NOTICE_OPTIONS = [
  { label: 'Any', value: '' },
  { label: '0–15 days', value: '15' },
  { label: '1 month', value: '30' },
  { label: '2 months', value: '60' },
  { label: '3 months', value: '90' },
  { label: '3 months+', value: '999' },
];

function NoticeChips({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {NOTICE_OPTIONS.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value === value ? '' : o.value)}
          className={cn(
            'text-sm font-semibold px-4 py-2 rounded-full border-2 transition-colors',
            value === o.value
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// SAVE SEARCH DIALOG
// =============================================================================

function SaveSearchDialog({
  open,
  onClose,
  onSave,
  isLoading,
  hasContext,
  context,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, pinToReq: boolean) => void;
  isLoading: boolean;
  hasContext: boolean;
  context: any;
}) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState(false);

  function handleSave() {
    if (!name.trim()) return;
    onSave(name.trim(), pin);
    setName('');
    setPin(false);
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
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
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="e.g. React 5yr Bengaluru"
              className="h-10 text-sm"
              autoFocus
            />
          </div>
          {hasContext && context && (
            <button
              onClick={() => setPin(v => !v)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors text-left',
                pin
                  ? 'bg-blue-50 border-blue-400 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              )}
            >
              <div
                className={cn(
                  'w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors',
                  pin ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                )}
              >
                {pin && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
              <div className="min-w-0">
                <p>Pin to {context.reqCode}</p>
                <p className="text-[11px] font-normal text-slate-500 truncate">
                  {context.requirementTitle}
                </p>
              </div>
            </button>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!name.trim() || isLoading} onClick={handleSave} className="gap-2">
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  NAUKRI: 'Naukri',
  MANUAL: 'Manual',
  CHROME_EXTENSION: 'Extension',
  BULK_INGEST: 'Bulk Upload',
  LINKEDIN: 'LinkedIn',
  PORTAL: 'Portal',
  REFERRAL: 'Referral',
  AGENCY: 'Agency',
  WALK_IN: 'Walk-in',
};

// =============================================================================
// SEARCH BUTTON — reused top + bottom
// =============================================================================

function SearchBtn({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      size="lg"
      className="h-13 px-10 text-base font-bold gap-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-200"
    >
      <Search className="w-5 h-5" />
      Search candidates
    </Button>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function InternalPoolSearchPage() {
  const axios = useAxios();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrated = useInternalPoolStoreReady();

  const {
    filters,
    activeContext,
    savedSearches,
    recentSearches,
    setFilters,
    resetFilters,
    setActiveContext,
    setSavedSearches,
    addSavedSearch,
    removeSavedSearch,
    applySavedSearch,
    applyRecentSearch,
    setHasSearched,
  } = useInternalPoolStore();

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  // Count active filters per section for badges
  const employmentCount = [
    filters.maxNoticeDays,
    filters.isImmediateJoiner,
    filters.company,
    filters.designation,
    filters.source,
    filters.minSalary,
    filters.maxSalary,
  ].filter(Boolean).length;

  const educationCount = [filters.degree, filters.fieldOfStudy].filter(Boolean).length;

  // ── On mount: read context from URL ──────────────────────────────────────
  useEffect(() => {
    const assignmentId = searchParams.get('assignmentId');
    const requirementId = searchParams.get('requirementId');
    const reqCode = searchParams.get('reqCode');
    const requirementTitle = searchParams.get('requirementTitle');
    if (assignmentId && requirementId && reqCode) {
      setActiveContext({
        assignmentId,
        requirementId,
        reqCode,
        requirementTitle: requirementTitle ?? reqCode,
      });
      const skills = searchParams.get('skills');
      if (skills)
        setFilters({
          skills: skills
            .split(',')
            .map(s => s.trim().toLowerCase())
            .filter(Boolean),
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch saved searches ──────────────────────────────────────────────────
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

  const saveSearchMut = useMutation({
    mutationFn: async ({ name, pinToReq }: { name: string; pinToReq: boolean }) =>
      axios.post('/internal-pool/saved-searches', {
        name,
        filters,
        requirementId: pinToReq ? activeContext?.requirementId : undefined,
        assignmentId: pinToReq ? activeContext?.assignmentId : undefined,
      }),
    onSuccess: res => {
      addSavedSearch(res.data.data);
      setSaveDialogOpen(false);
      toast.success('Search saved');
    },
    onError: () => toast.error('Failed to save search'),
  });

  const deleteSavedSearchMut = useMutation({
    mutationFn: async (id: string) => axios.delete(`/internal-pool/saved-searches/${id}`),
    onSuccess: (_, id) => {
      removeSavedSearch(id);
    },
  });

  function handleSearch() {
    setHasSearched(true);
    router.push('/internal-pool/results');
  }

  const f = filters;
  const set = setFilters;

  const totalActiveFilters = [
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
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#EEF2F7]">
      {/* ═══ LEFT — search form ═══════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-8 space-y-4">
          {/* ── PAGE HEADER ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-200">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Search Candidates
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">Internal pool · 10L+ profiles</p>
              </div>
            </div>

            {activeContext && (
              <div className="flex items-center gap-2.5 bg-blue-50 border-2 border-blue-200 rounded-xl px-4 py-2.5 shrink-0">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <div className="min-w-0">
                  <p className="text-xs font-black text-blue-700 truncate max-w-44">
                    {activeContext.requirementTitle}
                  </p>
                  <p className="text-[11px] text-blue-500 font-mono">{activeContext.reqCode}</p>
                </div>
                <button
                  onClick={() => setActiveContext(null)}
                  className="text-blue-400 hover:text-blue-600 ml-1 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* ── TOP SEARCH BUTTON ────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-4 bg-white border-2 border-slate-200 rounded-2xl px-6 py-4">
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-500">
                {totalActiveFilters > 0
                  ? `${totalActiveFilters} filter${totalActiveFilters !== 1 ? 's' : ''} applied — ready to search`
                  : 'Fill in your filters below and hit search'}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {totalActiveFilters > 0 && (
                <button
                  onClick={resetFilters}
                  className="text-sm font-semibold text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  Clear all
                </button>
              )}
              <SearchBtn onClick={handleSearch} />
            </div>
          </div>

          {/* ── CORE SECTION ─────────────────────────────────────────────── */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 space-y-5">
            {/* Keyword */}
            <div>
              <Label className="text-sm font-bold text-slate-700 mb-2 block">
                Keywords / Job Title
              </Label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  value={f.keyword}
                  onChange={e => set({ keyword: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="e.g. React Developer, Java, Product Manager"
                  className="pl-12 h-13 text-sm border-2 border-slate-200 focus-visible:border-blue-500 focus-visible:ring-0 rounded-xl"
                />
                {f.keyword && (
                  <button
                    onClick={() => set({ keyword: '' })}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Skills */}
            <div>
              <Label className="text-sm font-bold text-slate-700 mb-2 block">
                Skills
                <span className="text-xs font-normal text-slate-400 ml-2">
                  Candidate must have ALL skills listed
                </span>
              </Label>
              <SkillTagInput value={f.skills} onChange={skills => set({ skills })} />
            </div>

            {/* Experience */}
            <div>
              <Label className="text-sm font-bold text-slate-700 mb-2 block">Experience</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={f.minExp}
                  onChange={e => set({ minExp: e.target.value })}
                  placeholder="Min"
                  className="h-12 text-sm border-2 border-slate-200 focus-visible:border-blue-500 focus-visible:ring-0 rounded-xl"
                />
                <span className="text-slate-400 text-sm font-semibold shrink-0">to</span>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={f.maxExp}
                  onChange={e => set({ maxExp: e.target.value })}
                  placeholder="Max"
                  className="h-12 text-sm border-2 border-slate-200 focus-visible:border-blue-500 focus-visible:ring-0 rounded-xl"
                />
                <span className="text-sm font-semibold text-slate-500 shrink-0">Years</span>
              </div>
            </div>

            {/* Location */}
            <div>
              <Label className="text-sm font-bold text-slate-700 mb-2 block">Location</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  value={f.city}
                  onChange={e => set({ city: e.target.value })}
                  placeholder="City — e.g. Bengaluru"
                  className="h-12 text-sm border-2 border-slate-200 focus-visible:border-blue-500 focus-visible:ring-0 rounded-xl"
                />
                <Input
                  value={f.state}
                  onChange={e => set({ state: e.target.value })}
                  placeholder="State — e.g. Karnataka"
                  className="h-12 text-sm border-2 border-slate-200 focus-visible:border-blue-500 focus-visible:ring-0 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* ── EMPLOYMENT DETAILS ─────────────────────────────────────────── */}
          <Section
            title="Employment Details"
            icon={<Briefcase className="w-5 h-5" />}
            defaultOpen
            badge={employmentCount}
          >
            <div>
              <Label className="text-sm font-bold text-slate-700 mb-2.5 block">
                Notice Period / Availability to join
              </Label>
              <NoticeChips
                value={f.maxNoticeDays}
                onChange={v => set({ maxNoticeDays: v, isImmediateJoiner: v === '0' })}
              />
            </div>

            <button
              onClick={() =>
                set({
                  isImmediateJoiner: !f.isImmediateJoiner,
                  maxNoticeDays: !f.isImmediateJoiner ? '0' : '',
                })
              }
              className={cn(
                'flex items-center gap-3 px-5 py-3 rounded-xl border-2 text-sm font-bold transition-colors w-fit',
                f.isImmediateJoiner
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              )}
            >
              <Zap
                className={cn(
                  'w-4 h-4',
                  f.isImmediateJoiner ? 'text-emerald-500' : 'text-slate-400'
                )}
              />
              Immediate joiners only
              {f.isImmediateJoiner && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />}
            </button>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-bold text-slate-700 mb-2 block">
                  Current Company
                </Label>
                <Input
                  value={f.company}
                  onChange={e => set({ company: e.target.value })}
                  placeholder="e.g. Infosys, TCS"
                  className="h-12 text-sm border-2 border-slate-200 focus-visible:border-blue-500 focus-visible:ring-0 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-sm font-bold text-slate-700 mb-2 block">
                  Designation / Title
                </Label>
                <Input
                  value={f.designation}
                  onChange={e => set({ designation: e.target.value })}
                  placeholder="e.g. Software Engineer"
                  className="h-12 text-sm border-2 border-slate-200 focus-visible:border-blue-500 focus-visible:ring-0 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-bold text-slate-700 mb-2 block">Source</Label>
                <Select
                  value={f.source || 'any'}
                  onValueChange={v => set({ source: v === 'any' ? '' : v })}
                >
                  <SelectTrigger className="h-12 text-sm border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-blue-500">
                    <SelectValue placeholder="Any source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any source</SelectItem>
                    {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-sm font-bold text-slate-700 mb-2 block">
                Annual Salary (₹ Lacs)
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  value={f.minSalary}
                  onChange={e => set({ minSalary: e.target.value })}
                  placeholder="Min"
                  className="h-12 text-sm border-2 border-slate-200 focus-visible:border-blue-500 focus-visible:ring-0 rounded-xl"
                />
                <span className="text-slate-400 text-sm font-semibold shrink-0">to</span>
                <Input
                  type="number"
                  min={0}
                  value={f.maxSalary}
                  onChange={e => set({ maxSalary: e.target.value })}
                  placeholder="Max"
                  className="h-12 text-sm border-2 border-slate-200 focus-visible:border-blue-500 focus-visible:ring-0 rounded-xl"
                />
                <span className="text-sm font-semibold text-slate-500 shrink-0">Lacs</span>
              </div>
            </div>
          </Section>

          {/* ── EDUCATION DETAILS ──────────────────────────────────────────── */}
          <Section
            title="Education Details"
            icon={<GraduationCap className="w-5 h-5" />}
            badge={educationCount}
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-bold text-slate-700 mb-2 block">Degree</Label>
                <Input
                  value={f.degree}
                  onChange={e => set({ degree: e.target.value })}
                  placeholder="e.g. B.Tech, MBA, BCA"
                  className="h-12 text-sm border-2 border-slate-200 focus-visible:border-blue-500 focus-visible:ring-0 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-sm font-bold text-slate-700 mb-2 block">
                  Field of Study
                </Label>
                <Input
                  value={f.fieldOfStudy}
                  onChange={e => set({ fieldOfStudy: e.target.value })}
                  placeholder="e.g. Computer Science"
                  className="h-12 text-sm border-2 border-slate-200 focus-visible:border-blue-500 focus-visible:ring-0 rounded-xl"
                />
              </div>
            </div>
          </Section>

          {/* ── BOTTOM ACTION BAR ─────────────────────────────────────────── */}
          <div className="flex items-center gap-3 pb-8">
            <SearchBtn onClick={handleSearch} />
            <Button
              variant="outline"
              size="lg"
              className="h-13 px-6 rounded-xl border-2 font-bold gap-2"
              onClick={() => setSaveDialogOpen(true)}
            >
              <BookmarkPlus className="w-4 h-4" />
              Save search
            </Button>
            {totalActiveFilters > 0 && (
              <Button
                variant="ghost"
                size="lg"
                className="h-13 px-5 rounded-xl font-semibold text-slate-500 gap-2"
                onClick={resetFilters}
              >
                <X className="w-4 h-4" />
                Clear all
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ═══ RIGHT SIDEBAR ═══════════════════════════════════════════════════ */}
      <div className="w-72 shrink-0 border-l-2 border-slate-200 bg-white overflow-y-auto">
        <div className="p-5 space-y-7">
          {/* Recent Searches */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-black text-slate-800">Recent Searches</h3>
            </div>
            {recentSearches.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">No recent searches yet</p>
            ) : (
              <div className="space-y-0.5">
                {recentSearches.slice(0, 5).map(r => (
                  <div key={r.id} className="group rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-2 px-3 py-3">
                      <button
                        onClick={() => applyRecentSearch(r)}
                        className="flex-1 text-left min-w-0"
                      >
                        <p className="text-sm font-semibold text-slate-700 group-hover:text-blue-600 transition-colors leading-snug truncate">
                          {r.label}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {r.resultCount.toLocaleString()} results
                        </p>
                      </button>
                      <button
                        onClick={() => {
                          applyRecentSearch(r);
                          router.push('/internal-pool/results');
                        }}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 border border-blue-200 bg-blue-50 px-2 py-1 rounded-lg"
                      >
                        Run
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-slate-100" />

          {/* Saved Searches */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-black text-slate-800">Saved Searches</h3>
              </div>
            </div>
            {savedSearches.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">Save a search to reuse it later</p>
            ) : (
              <div className="space-y-0.5">
                {savedSearches.map(s => (
                  <div key={s.id} className="group rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-2 px-3 py-3">
                      <button
                        onClick={() => applySavedSearch(s)}
                        className="flex-1 text-left min-w-0"
                      >
                        <p className="text-sm font-semibold text-slate-700 group-hover:text-blue-600 transition-colors truncate">
                          {s.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {s.requirementId && (
                            <span className="text-[11px] text-blue-500 font-semibold">Pinned</span>
                          )}
                          {s.runCount ? (
                            <span className="text-[11px] text-slate-400">Used {s.runCount}×</span>
                          ) : null}
                        </div>
                      </button>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            applySavedSearch(s);
                            router.push('/internal-pool/results');
                          }}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 border border-blue-200 bg-blue-50 px-2 py-1 rounded-lg"
                        >
                          Run
                        </button>
                        <button
                          onClick={() => deleteSavedSearchMut.mutate(s.id)}
                          className="text-xs font-bold text-slate-300 hover:text-rose-500 px-1.5 py-1 rounded-lg transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <SaveSearchDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        onSave={(name, pinToReq) => saveSearchMut.mutate({ name, pinToReq })}
        isLoading={saveSearchMut.isPending}
        hasContext={!!activeContext}
        context={activeContext}
      />
    </div>
  );
}
