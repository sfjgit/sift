// File: page.tsx
// Path: src/app/(dashboard)/internal-pool/candidates/[id]/page.tsx

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Briefcase,
  Mail,
  Phone,
  Linkedin,
  Github,
  Globe,
  ExternalLink,
  UserPlus,
  CheckCircle2,
  Loader2,
  ChevronDown,
  FileText,
  GraduationCap,
  Award,
  Languages,
  Tag,
  Building2,
  Zap,
  Calendar,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAxios } from '@/hooks/useAxios';
import { useInternalPoolStore } from '@/stores/internalPoolStore';

// =============================================================================
// TYPES
// =============================================================================

interface CandidateFull {
  id: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  altPhone: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  otherUrl: string | null;
  type: string;
  source: string;
  sourceNote: string | null;
  noticePeriodDays: number | null;
  isImmediateJoiner: boolean;
  functionalArea: string | null;
  industryType: string | null;
  preferredJobType: string | null;
  preferredEmpStatus: string | null;
  salaryCurrency: string;
  salaryType: string | null;
  currentSalary: number | null;
  salaryFixed: number | null;
  salaryVariable: number | null;
  expectedSalary: number | null;
  expectedSalaryFixed: number | null;
  cachedCurrentTitle: string | null;
  cachedCurrentCompany: string | null;
  cachedTotalExpYears: number | null;
  cachedTopSkills: string[];
  cachedLocationCity: string | null;
  cachedLocationState: string | null;
  isActive: boolean;
  isBlocked: boolean;
  doNotContact: boolean;
  consentGiven: boolean;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;

  skills: {
    id: string;
    rawSkill: string;
    normalizedSkill: string;
    category: string | null;
    subcategory: string | null;
    yearsExp: number | null;
    lastUsedYear: number | null;
    proficiency: string | null;
    isVerified: boolean;
    source: string;
  }[];

  experiences: {
    id: string;
    company: string;
    companyNormalized: string | null;
    role: string;
    industry: string | null;
    employmentType: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    isRemote: boolean;
    startDate: string | null;
    endDate: string | null;
    isCurrent: boolean;
    durationMonths: number | null;
    description: string | null;
    achievements: string | null;
    source: string;
  }[];

  educations: {
    id: string;
    institution: string;
    institutionNormalized: string | null;
    degree: string | null;
    fieldOfStudy: string | null;
    grade: string | null;
    gradeNumeric: number | null;
    startYear: number | null;
    endYear: number | null;
    isCurrent: boolean;
    institutionTier: string | null;
    source: string;
  }[];

  certifications: {
    id: string;
    name: string;
    issuer: string | null;
    credentialId: string | null;
    verifyUrl: string | null;
    issueDate: string | null;
    expiryDate: string | null;
    isExpired: boolean;
  }[];

  languages: { id: string; language: string; proficiency: string | null }[];

  locations: {
    id: string;
    type: string;
    city: string | null;
    state: string | null;
    country: string;
    pincode: string | null;
    isRemoteOk: boolean;
    isHybridOk: boolean;
  }[];

  tags: { id: string; tag: string }[];

  notes: {
    id: string;
    note: string;
    createdAt: string;
    createdById: string;
  }[];

  resumes: {
    id: string;
    url: string;
    fileName: string;
    mimeType: string;
    fileSizeKb: number | null;
    version: number;
    isActive: boolean;
    parseStatus: string;
    source: string;
    createdAt: string;
  }[];

  requirements: {
    id: string;
    requirementId: string;
    stage: string;
    stageUpdatedAt: string;
    createdAt: string;
  }[];
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
function fmtSalary(val: number | null, currency = 'INR') {
  if (!val) return null;
  return `₹ ${(val / 100000).toFixed(1)} Lacs`;
}
function fmtDate(d: string | null | undefined) {
  if (!d) return null;
  return format(new Date(d), 'MMM yyyy');
}
function fmtDateFull(d: string | null | undefined) {
  if (!d) return null;
  return format(new Date(d), 'dd MMM yyyy');
}
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
}
function noticePeriodLabel(days: number | null, isImmediate: boolean) {
  if (isImmediate || days === 0) return 'Available to join immediately';
  if (!days) return null;
  if (days <= 15) return `Available to join in ${days} days or less`;
  if (days <= 30) return `1 month notice period`;
  if (days <= 60) return `2 months notice period`;
  if (days <= 90) return `3 months notice period`;
  return `${Math.round(days / 30)} months notice period`;
}

// =============================================================================
// TIMELINE BAR — like Naukri's horizontal career timeline
// =============================================================================

function CareerTimeline({ experiences }: { experiences: CandidateFull['experiences'] }) {
  if (!experiences.length) return null;

  const sorted = [...experiences].sort((a, b) => {
    const da = a.startDate ? new Date(a.startDate).getTime() : 0;
    const db = b.startDate ? new Date(b.startDate).getTime() : 0;
    return da - db;
  });

  const first = sorted[0];
  const startYear = first.startDate ? new Date(first.startDate).getFullYear() : null;
  const now = new Date();

  return (
    <div className="flex items-center gap-3 mt-4 mb-1">
      {startYear && <span className="text-xs text-slate-500 shrink-0">{startYear}</span>}
      <div className="flex-1 flex items-center h-2 bg-slate-100 rounded-full overflow-hidden">
        {sorted.map((exp, i) => {
          const start = exp.startDate ? new Date(exp.startDate) : null;
          const end = exp.endDate ? new Date(exp.endDate) : now;
          const totalMs =
            now.getTime() - (sorted[0].startDate ? new Date(sorted[0].startDate).getTime() : 0);
          const width = start ? ((end.getTime() - start.getTime()) / totalMs) * 100 : 0;
          const colors = [
            'bg-blue-400',
            'bg-violet-400',
            'bg-emerald-400',
            'bg-amber-400',
            'bg-rose-400',
          ];
          return (
            <div
              key={exp.id}
              title={`${exp.role} at ${exp.company}`}
              className={cn('h-full', colors[i % colors.length], i > 0 ? 'ml-px' : '')}
              style={{ width: `${Math.max(width, 2)}%` }}
            />
          );
        })}
      </div>
      <span className="text-xs text-slate-500 shrink-0">
        {fmtDate(experiences.find(e => e.isCurrent)?.startDate ?? null) ?? 'till date'}
      </span>
    </div>
  );
}

// =============================================================================
// SOURCE DIALOG
// =============================================================================

function SourceDialog({
  candidate,
  context,
  open,
  onClose,
  onConfirm,
  isLoading,
}: {
  candidate: CandidateFull | null;
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
            {isLoading ? 'Adding…' : 'Confirm & Source'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// SECTION WRAPPER
// =============================================================================

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
        <span className="text-slate-500">{icon}</span>
        <h3 className="text-base font-bold text-slate-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// =============================================================================
// PROFICIENCY BADGE
// =============================================================================

function ProficiencyBadge({ level }: { level: string | null }) {
  if (!level) return null;
  const map: Record<string, string> = {
    BEGINNER: 'bg-slate-100 text-slate-600',
    INTERMEDIATE: 'bg-blue-50 text-blue-700',
    ADVANCED: 'bg-violet-50 text-violet-700',
    EXPERT: 'bg-emerald-50 text-emerald-700',
  };
  return (
    <span
      className={cn(
        'text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide',
        map[level] ?? 'bg-slate-100 text-slate-600'
      )}
    >
      {level.toLowerCase()}
    </span>
  );
}

// =============================================================================
// PAGE SKELETON
// =============================================================================

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[#F1F4F8]">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">
        <div className="bg-white rounded-2xl p-6">
          <div className="flex gap-5">
            <Skeleton className="w-24 h-24 rounded-full shrink-0" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-48" />
              <div className="flex gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function CandidateProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const axios = useAxios();
  const qc = useQueryClient();
  const { activeContext } = useInternalPoolStore();

  const [sourced, setSourced] = useState(false);
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['candidate-full', id],
    queryFn: async () => {
      const res = await axios.get(`/candidate/api/internal-pool/candidates/${id}`, {
        baseURL: '/api/proxy',
        withCredentials: true,
      });
      return res.data.data as CandidateFull;
    },
    enabled: !!id,
    staleTime: 60_000,
  });

  const sourceMut = useMutation({
    mutationFn: async () => {
      if (!activeContext || !data) throw new Error('Missing context');
      return axios.post('/internal-pool/source', {
        candidateServiceId: data.id,
        requirementId: activeContext.requirementId,
        assignmentId: activeContext.assignmentId,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        currentTitle: data.cachedCurrentTitle,
        currentCompany: data.cachedCurrentCompany,
        totalExpYears: data.cachedTotalExpYears,
        topSkills: data.cachedTopSkills,
        resumeUrl: data.resumes?.find(r => r.isActive)?.url ?? null,
        rawSnapshot: {
          candidateId: data.id,
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          currentTitle: data.cachedCurrentTitle,
          currentCompany: data.cachedCurrentCompany,
          totalExpYears: data.cachedTotalExpYears,
          topSkills: data.cachedTopSkills,
          skills: data.skills.map(s => ({ name: s.rawSkill, yearsExp: s.yearsExp })),
        },
      });
    },
    onSuccess: res => {
      setSourced(true);
      setSourceDialogOpen(false);
      if (res.data.alreadyExists) toast.info('Already in the pipeline');
      else toast.success(`${data?.fullName} added to ${activeContext?.reqCode}`);
      qc.invalidateQueries({ queryKey: ['assignment-pipeline'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to source'),
  });

  if (isLoading) return <PageSkeleton />;
  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F1F4F8] flex items-center justify-center">
        <div className="text-center">
          <p className="text-base font-bold text-slate-700">Candidate not found</p>
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>
            Go back
          </Button>
        </div>
      </div>
    );
  }

  const c = data;
  const activeResume = c.resumes?.find(r => r.isActive);
  const expLabel = fmtExp(c.cachedTotalExpYears);
  const currentSalaryLabel = fmtSalary(c.currentSalary);
  const expectedSalaryLabel = fmtSalary(c.expectedSalary);
  const location = [c.cachedLocationCity, c.cachedLocationState].filter(Boolean).join(', ');
  const currentExp = c.experiences?.find(e => e.isCurrent) ?? null;
  const previousExp = c.experiences?.filter(e => !e.isCurrent)?.[0] ?? null;
  const topEdu = c.educations?.[0] ?? null;

  // Group skills by category
  const skillsByCategory: Record<string, typeof c.skills> = {};
  for (const s of c.skills) {
    const cat = s.category ?? 'Other';
    if (!skillsByCategory[cat]) skillsByCategory[cat] = [];
    skillsByCategory[cat].push(s);
  }

  return (
    <div className="min-h-screen bg-[#F1F4F8]">
      {/* ── Top action bar — like Naukri ─────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 flex-1">
            {activeResume && (
              <a
                href={activeResume.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-300 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors"
              >
                <FileText className="w-4 h-4 text-slate-500" />
                Attached CV
              </a>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeContext ? (
              <Button
                disabled={sourced || sourceMut.isPending}
                onClick={() => setSourceDialogOpen(true)}
                className={cn(
                  'gap-2 font-bold',
                  sourced ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'
                )}
              >
                {sourceMut.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : sourced ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {sourced
                  ? 'Sourced'
                  : sourceMut.isPending
                    ? 'Adding…'
                    : `Source to ${activeContext.reqCode}`}
              </Button>
            ) : (
              <div className="text-xs text-slate-400 border border-slate-200 rounded-lg px-3 py-2">
                Open from an assignment to source
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-5 flex gap-5">
        {/* ═══ MAIN CONTENT ════════════════════════════════════════════════ */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* ── HEADER CARD ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-6">
              <div className="flex gap-5">
                {/* Big avatar */}
                <div
                  className={cn(
                    'w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white shrink-0',
                    avatarColor(c.id)
                  )}
                >
                  {initials(c.fullName)}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Name + meta */}
                  <h1 className="text-2xl font-bold text-slate-900">{c.fullName}</h1>

                  {/* Exp | Salary | Location */}
                  <div className="flex items-center gap-4 mt-1.5 text-sm text-slate-600 flex-wrap">
                    {expLabel && (
                      <span className="flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-slate-400" />
                        {expLabel}
                      </span>
                    )}
                    {(currentSalaryLabel || expectedSalaryLabel) && (
                      <span className="flex items-center gap-1.5">
                        <span className="text-slate-400">₹</span>
                        {currentSalaryLabel && <span>{currentSalaryLabel}</span>}
                        {expectedSalaryLabel && (
                          <span className="text-slate-400">(expects: {expectedSalaryLabel})</span>
                        )}
                      </span>
                    )}
                    {location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {location}
                      </span>
                    )}
                  </div>

                  {/* Previous */}
                  {previousExp && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
                      <span className="text-slate-400 text-xs">Previous</span>
                      <span>
                        {previousExp.role} at {previousExp.company}
                      </span>
                    </div>
                  )}

                  {/* Highest degree */}
                  {topEdu && (
                    <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                      <span className="text-slate-400 text-xs">Highest degree</span>
                      <span>
                        {[topEdu.degree, topEdu.fieldOfStudy].filter(Boolean).join(' / ')}
                        {topEdu.institution ? ` ${topEdu.institution}` : ''}
                        {topEdu.endYear ? ` ${topEdu.endYear}` : ''}
                      </span>
                    </div>
                  )}

                  {/* Preferred location */}
                  {location && (
                    <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                      <span className="text-slate-400 text-xs">Pref. location</span>
                      <span>{location}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notice period notice */}
              {noticePeriodLabel(c.noticePeriodDays, c.isImmediateJoiner) && (
                <div
                  className={cn(
                    'mt-4 flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg w-fit',
                    c.isImmediateJoiner
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {c.isImmediateJoiner ? (
                    <Zap className="w-4 h-4" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                  {noticePeriodLabel(c.noticePeriodDays, c.isImmediateJoiner)}
                </div>
              )}

              {/* Contact row */}
              <div className="flex items-center gap-3 mt-4 flex-wrap">
                {c.phone && (
                  <button className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-300 rounded-lg px-4 py-2 hover:bg-slate-50 transition-colors">
                    <Phone className="w-4 h-4 text-slate-500" />
                    View phone number
                  </button>
                )}
                {c.phone && (
                  <button className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-300 rounded-lg px-4 py-2 hover:bg-slate-50 transition-colors">
                    <Phone className="w-4 h-4 text-slate-500" />
                    Call candidate
                  </button>
                )}
                {c.linkedinUrl && (
                  <a
                    href={c.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm font-semibold text-blue-700 border border-blue-200 rounded-lg px-4 py-2 hover:bg-blue-50 transition-colors"
                  >
                    <Linkedin className="w-4 h-4" />
                    LinkedIn
                  </a>
                )}
                {c.githubUrl && (
                  <a
                    href={c.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-300 rounded-lg px-4 py-2 hover:bg-slate-50 transition-colors"
                  >
                    <Github className="w-4 h-4" />
                    GitHub
                  </a>
                )}
                {c.portfolioUrl && (
                  <a
                    href={c.portfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-300 rounded-lg px-4 py-2 hover:bg-slate-50 transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    Portfolio
                  </a>
                )}
              </div>

              {/* Email row */}
              <div className="flex items-center gap-3 mt-3 text-sm text-slate-500">
                <Mail className="w-4 h-4 text-slate-400" />
                {c.email}
                {c.altPhone && (
                  <>
                    <span>·</span>
                    <Phone className="w-4 h-4 text-slate-400" />
                    {c.altPhone}
                  </>
                )}
              </div>

              {/* Career timeline */}
              {c.experiences?.length > 0 && <CareerTimeline experiences={c.experiences} />}

              {/* Bottom meta */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
                <span
                  className={cn(
                    'font-semibold px-2 py-0.5 rounded-full border',
                    'bg-slate-100 text-slate-600 border-slate-200'
                  )}
                >
                  {SOURCE_LABELS[c.source] ?? c.source}
                </span>
                {c.tags?.map(t => (
                  <span
                    key={t.id}
                    className="flex items-center gap-1 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full text-slate-600 font-medium"
                  >
                    <Tag className="w-3 h-3" />
                    {t.tag}
                  </span>
                ))}
                <span className="ml-auto">Modified {timeAgo(c.lastActivityAt)}</span>
                <span>Active {timeAgo(c.lastActivityAt)}</span>
              </div>
            </div>
          </div>

          {/* ── TABS: Profile Detail | Attached CV ───────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <Tabs defaultValue="profile">
              <TabsList className="h-12 bg-transparent p-0 border-b border-slate-200 w-full rounded-none justify-start">
                <TabsTrigger
                  value="profile"
                  className="h-12 px-6 rounded-none border-b-2 border-transparent data-[state=active]:border-red-500 data-[state=active]:text-slate-900 data-[state=active]:shadow-none bg-transparent text-slate-500 font-semibold"
                >
                  Profile detail
                </TabsTrigger>
                <TabsTrigger
                  value="cv"
                  className="h-12 px-6 rounded-none border-b-2 border-transparent data-[state=active]:border-red-500 data-[state=active]:text-slate-900 data-[state=active]:shadow-none bg-transparent text-slate-500 font-semibold"
                >
                  Attached CV
                </TabsTrigger>
              </TabsList>

              {/* ── PROFILE DETAIL TAB ─────────────────────────────────── */}
              <TabsContent value="profile" className="p-6 mt-0">
                {/* Key skills */}
                {c.skills.length > 0 && (
                  <Section title="Key skills" icon={<Briefcase className="w-4 h-4" />}>
                    {Object.keys(skillsByCategory).length > 1 ? (
                      Object.entries(skillsByCategory).map(([cat, skills]) => (
                        <div key={cat} className="mb-4">
                          <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                            {cat}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {skills.map(s => (
                              <div
                                key={s.id}
                                className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5"
                              >
                                <span className="text-sm text-slate-800 font-medium">
                                  {s.rawSkill}
                                </span>
                                {s.yearsExp && (
                                  <span className="text-xs text-slate-400">{s.yearsExp}y</span>
                                )}
                                <ProficiencyBadge level={s.proficiency} />
                                {s.isVerified && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {c.skills.map(s => (
                          <div
                            key={s.id}
                            className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5"
                          >
                            <span className="text-sm text-slate-800 font-medium">{s.rawSkill}</span>
                            {s.yearsExp && (
                              <span className="text-xs text-slate-400">{s.yearsExp}y</span>
                            )}
                            <ProficiencyBadge level={s.proficiency} />
                          </div>
                        ))}
                      </div>
                    )}
                  </Section>
                )}

                {/* Employment */}
                {c.experiences?.length > 0 && (
                  <Section title="Employment" icon={<Building2 className="w-4 h-4" />}>
                    <div className="space-y-6">
                      {c.experiences.map((exp, i) => (
                        <div key={exp.id} className="flex gap-4">
                          {/* Timeline dot */}
                          <div className="flex flex-col items-center">
                            <div
                              className={cn(
                                'w-3 h-3 rounded-full mt-1 shrink-0',
                                exp.isCurrent ? 'bg-blue-500' : 'bg-slate-300'
                              )}
                            />
                            {i < c.experiences.length - 1 && (
                              <div className="w-px flex-1 bg-slate-200 mt-2" />
                            )}
                          </div>
                          <div className="flex-1 pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-base font-bold text-slate-900">{exp.role}</p>
                                <p className="text-sm font-semibold text-slate-700 mt-0.5">
                                  {exp.company}
                                </p>
                              </div>
                              {exp.isCurrent && (
                                <span className="text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full shrink-0">
                                  Current
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                              <span>
                                {fmtDate(exp.startDate) ?? '—'} –{' '}
                                {exp.isCurrent ? 'Present' : (fmtDate(exp.endDate) ?? '—')}
                              </span>
                              {exp.durationMonths && (
                                <span className="text-slate-400">
                                  · {Math.floor(exp.durationMonths / 12)}y {exp.durationMonths % 12}
                                  m
                                </span>
                              )}
                              {exp.employmentType && (
                                <span className="text-slate-400">· {exp.employmentType}</span>
                              )}
                              {exp.city && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {exp.city}
                                </span>
                              )}
                              {exp.isRemote && (
                                <span className="text-emerald-600 font-semibold">Remote</span>
                              )}
                            </div>
                            {exp.description && (
                              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                                {exp.description}
                              </p>
                            )}
                            {exp.achievements && (
                              <div className="mt-2 pl-3 border-l-2 border-blue-200">
                                <p className="text-xs font-bold text-slate-500 mb-1">
                                  Achievements
                                </p>
                                <p className="text-sm text-slate-600">{exp.achievements}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Education */}
                {c.educations?.length > 0 && (
                  <Section title="Education" icon={<GraduationCap className="w-4 h-4" />}>
                    <div className="space-y-4">
                      {c.educations.map(edu => (
                        <div
                          key={edu.id}
                          className="flex gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl"
                        >
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                            <GraduationCap className="w-5 h-5 text-slate-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-900">
                              {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(' / ') ||
                                'Degree not specified'}
                            </p>
                            <p className="text-sm text-slate-600 mt-0.5">{edu.institution}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                              {(edu.startYear || edu.endYear) && (
                                <span>
                                  {edu.startYear ?? ''}
                                  {edu.startYear && edu.endYear ? ' – ' : ''}
                                  {edu.endYear ?? ''}
                                  {edu.isCurrent ? ' (Ongoing)' : ''}
                                </span>
                              )}
                              {edu.grade && <span>Grade: {edu.grade}</span>}
                              {edu.institutionTier && (
                                <span className="bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-semibold">
                                  {edu.institutionTier}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Certifications */}
                {c.certifications?.length > 0 && (
                  <Section title="Certifications" icon={<Award className="w-4 h-4" />}>
                    <div className="space-y-3">
                      {c.certifications.map(cert => (
                        <div
                          key={cert.id}
                          className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl"
                        >
                          <Award className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-900">{cert.name}</p>
                            {cert.issuer && (
                              <p className="text-xs text-slate-500 mt-0.5">{cert.issuer}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                              {cert.issueDate && <span>Issued {fmtDateFull(cert.issueDate)}</span>}
                              {cert.expiryDate && (
                                <span>Expires {fmtDateFull(cert.expiryDate)}</span>
                              )}
                              {cert.isExpired && (
                                <span className="text-rose-600 font-semibold">Expired</span>
                              )}
                              {cert.verifyUrl && (
                                <a
                                  href={cert.verifyUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Verify
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Languages */}
                {c.languages?.length > 0 && (
                  <Section title="Languages" icon={<Languages className="w-4 h-4" />}>
                    <div className="flex flex-wrap gap-2">
                      {c.languages.map(lang => (
                        <div
                          key={lang.id}
                          className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                        >
                          <span className="text-sm font-semibold text-slate-800">
                            {lang.language}
                          </span>
                          {lang.proficiency && (
                            <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                              {lang.proficiency.toLowerCase()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Notes */}
                {c.notes?.length > 0 && (
                  <Section title="Notes" icon={<Info className="w-4 h-4" />}>
                    <div className="space-y-3">
                      {c.notes.map(note => (
                        <div
                          key={note.id}
                          className="p-4 bg-amber-50 border border-amber-200 rounded-xl"
                        >
                          <p className="text-sm text-slate-700 leading-relaxed">{note.note}</p>
                          <p className="text-xs text-slate-400 mt-2">
                            {fmtDateFull(note.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </TabsContent>

              {/* ── ATTACHED CV TAB ────────────────────────────────────── */}
              <TabsContent value="cv" className="p-6 mt-0">
                {c.resumes?.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-semibold">No resume attached</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {c.resumes.map(r => (
                      <div
                        key={r.id}
                        className={cn(
                          'flex items-center gap-4 p-4 border rounded-xl',
                          r.isActive ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'
                        )}
                      >
                        <FileText
                          className={cn(
                            'w-8 h-8 shrink-0',
                            r.isActive ? 'text-blue-500' : 'text-slate-400'
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{r.fileName}</p>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                            <span>v{r.version}</span>
                            {r.fileSizeKb && <span>{Math.round(r.fileSizeKb)} KB</span>}
                            <span>{SOURCE_LABELS[r.source] ?? r.source}</span>
                            <span>{fmtDateFull(r.createdAt)}</span>
                            {r.isActive && <span className="text-blue-600 font-bold">Active</span>}
                          </div>
                        </div>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 border border-blue-200 bg-white px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors shrink-0"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Open
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* ═══ RIGHT SIDEBAR ════════════════════════════════════════════════ */}
        <div className="w-72 shrink-0 space-y-4">
          {/* Salary card */}
          {(c.currentSalary || c.expectedSalary) && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                Salary
              </p>
              <div className="space-y-2">
                {c.currentSalary && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Current CTC</span>
                    <span className="font-bold text-slate-900">{fmtSalary(c.currentSalary)}</span>
                  </div>
                )}
                {c.salaryFixed && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Fixed</span>
                    <span className="font-semibold text-slate-700">{fmtSalary(c.salaryFixed)}</span>
                  </div>
                )}
                {c.salaryVariable && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Variable</span>
                    <span className="font-semibold text-slate-700">
                      {fmtSalary(c.salaryVariable)}
                    </span>
                  </div>
                )}
                {c.expectedSalary && (
                  <div className="flex justify-between text-sm pt-2 border-t border-slate-100">
                    <span className="text-slate-500">Expected</span>
                    <span className="font-bold text-blue-700">{fmtSalary(c.expectedSalary)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Preferences card */}
          {(c.preferredJobType ||
            c.preferredEmpStatus ||
            c.functionalArea ||
            c.industryType ||
            c.locations?.length > 0) && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                Preferences
              </p>
              <div className="space-y-2 text-sm">
                {c.preferredJobType && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Job type</span>
                    <span className="font-semibold text-slate-800">{c.preferredJobType}</span>
                  </div>
                )}
                {c.preferredEmpStatus && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Employment</span>
                    <span className="font-semibold text-slate-800">{c.preferredEmpStatus}</span>
                  </div>
                )}
                {c.functionalArea && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Function</span>
                    <span className="font-semibold text-slate-800">{c.functionalArea}</span>
                  </div>
                )}
                {c.industryType && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Industry</span>
                    <span className="font-semibold text-slate-800 text-right max-w-36 truncate">
                      {c.industryType}
                    </span>
                  </div>
                )}
                {c.locations
                  ?.filter(l => l.type === 'PREFERRED')
                  .map(l => (
                    <div key={l.id} className="flex justify-between">
                      <span className="text-slate-500">Pref. location</span>
                      <span className="font-semibold text-slate-800">
                        {[l.city, l.state].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Pipeline history */}
          {c.requirements?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                Pipeline History
              </p>
              <div className="space-y-2">
                {c.requirements.map(r => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 truncate max-w-36 font-mono text-xs">
                      {r.requirementId.slice(0, 8)}…
                    </span>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {r.stage}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Meta</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Source</span>
                <span className="font-semibold text-slate-800">
                  {SOURCE_LABELS[c.source] ?? c.source}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Added</span>
                <span className="font-semibold text-slate-800">{fmtDateFull(c.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Last active</span>
                <span className="font-semibold text-slate-800">{timeAgo(c.lastActivityAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Consent</span>
                <span
                  className={cn(
                    'font-semibold',
                    c.consentGiven ? 'text-emerald-600' : 'text-slate-400'
                  )}
                >
                  {c.consentGiven ? 'Given' : 'Not given'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Source dialog */}
      <SourceDialog
        candidate={c}
        context={activeContext}
        open={sourceDialogOpen}
        onClose={() => setSourceDialogOpen(false)}
        onConfirm={() => sourceMut.mutate()}
        isLoading={sourceMut.isPending}
      />
    </div>
  );
}
