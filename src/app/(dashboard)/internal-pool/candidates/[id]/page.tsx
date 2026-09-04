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
  Info,
  Calendar,
  AlertCircle,
  Link2,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
    yearsExp: number | null;
    proficiency: string | null;
    isVerified: boolean;
    source: string;
  }[];
  experiences: {
    id: string;
    company: string;
    role: string;
    industry: string | null;
    employmentType: string | null;
    city: string | null;
    state: string | null;
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
    degree: string | null;
    fieldOfStudy: string | null;
    grade: string | null;
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
    isRemoteOk: boolean;
    isHybridOk: boolean;
  }[];
  tags: { id: string; tag: string }[];
  notes: { id: string; note: string; createdAt: string; createdById: string }[];
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

function fmtExp(years: number | null) {
  if (years == null) return null;
  const y = Math.floor(years);
  const m = Math.round((years % 1) * 12);
  return `${y}y ${m}m`;
}

function fmtSalary(val: number | null) {
  if (!val || val === 0) return null;
  // If value > 1000, it's stored in raw rupees (e.g. 1500000 = 15L)
  // If value <= 1000, it's already in lacs (e.g. 15 = 15L)
  const inLacs = val > 1000 ? val / 100000 : val;
  if (inLacs >= 100) return `₹${(inLacs / 100).toFixed(1)}Cr`;
  return `₹${inLacs % 1 === 0 ? inLacs.toFixed(0) : inLacs.toFixed(1)}L`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return null;
  return format(new Date(d), 'MMM yyyy');
}

function fmtDateFull(d: string | null | undefined) {
  if (!d) return null;
  return format(new Date(d), 'dd MMM yyyy');
}

function fmtDatetime(d: string | null | undefined) {
  if (!d) return null;
  return format(new Date(d), 'dd MMM yyyy, HH:mm');
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function durationLabel(months: number | null) {
  if (!months) return null;
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m}m`;
  if (m === 0) return `${y}y`;
  return `${y}y ${m}m`;
}

function noticePeriodLabel(days: number | null, isImmediate: boolean) {
  if (isImmediate || days === 0) return 'Immediate joiner';
  if (!days) return null;
  if (days <= 15) return `${days} days notice`;
  if (days <= 30) return '1 month notice';
  if (days <= 60) return '2 months notice';
  if (days <= 90) return '3 months notice';
  return `${Math.round(days / 30)} months notice`;
}

// =============================================================================
// SECTION WRAPPER — matches existing candidates page style exactly
// =============================================================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</p>
      </div>
      <div className="bg-white">{children}</div>
    </div>
  );
}

// =============================================================================
// RESUME VIEW BUTTON — fetches presigned URL then opens it
// Route: GET /candidate/api/resume/:resumeId/view
// If you get 404, share your candidate routes file to get the exact path
// =============================================================================

function ResumeOpenButton({
  resumeId,
  fileName,
  axios,
}: {
  resumeId: string;
  fileName: string;
  axios: any;
}) {
  const [loading, setLoading] = useState(false);

  async function handleOpen() {
    try {
      setLoading(true);
      const res = await axios.get(`/candidate/api/resume/${resumeId}/view`, {
        baseURL: '/api/proxy',
        withCredentials: true,
      });
      const url = res.data?.data?.presignedUrl;
      if (!url) throw new Error('No presigned URL in response');
      window.open(url, '_blank');
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404) {
        toast.error('Resume endpoint not found — share your candidate routes file to fix the path');
      } else {
        toast.error('Could not open resume. Try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleOpen}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-50 transition-colors"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <ExternalLink className="w-3.5 h-3.5" />
      )}
      {loading ? 'Opening…' : 'View'}
    </button>
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
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className={cn('text-sm font-bold', avatarColor(candidate.id))}>
                {initials(candidate.fullName)}
              </AvatarFallback>
            </Avatar>
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
// PAGE SKELETON
// =============================================================================

function PageSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="border-b border-slate-200 px-6 py-5 flex items-center gap-4">
        <Skeleton className="w-8 h-8 rounded-xl" />
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="w-48 h-5" />
          <Skeleton className="w-32 h-4" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-3 gap-5">
        <div className="col-span-2 flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <div className="col-span-1 flex flex-col gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
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
      const res = await axios.get(`/candidate/api/candidates/${id}`, {
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
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="w-10 h-10 text-rose-400" />
        <p className="text-base font-medium text-slate-600">Candidate not found.</p>
        <Button variant="ghost" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  const c = data;
  const activeResume = c.resumes?.find(r => r.isActive) ?? c.resumes?.[0];
  const expLabel = fmtExp(c.cachedTotalExpYears);
  const location = [c.cachedLocationCity, c.cachedLocationState].filter(Boolean).join(', ');
  const currentExp = c.experiences?.find(e => e.isCurrent) ?? null;
  const topEdu = c.educations?.[0] ?? null;

  // Group skills by category
  const skillsByCategory: Record<string, typeof c.skills> = {};
  for (const s of c.skills ?? []) {
    const cat = s.category ?? 'Skills';
    if (!skillsByCategory[cat]) skillsByCategory[cat] = [];
    skillsByCategory[cat].push(s);
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {/* ═══ HEADER — matches existing candidates page exactly ═══ */}
      <div className="border-b border-slate-200 bg-white shrink-0 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <Avatar className="h-11 w-11 shrink-0">
            <AvatarFallback className={cn('text-sm font-bold', avatarColor(c.id))}>
              {initials(c.fullName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-slate-900">{c.fullName}</h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {SOURCE_LABELS[c.source] ?? c.source}
              </span>
              {c.isImmediateJoiner && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                  Immediate Joiner
                </span>
              )}
              {!c.isActive && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600">
                  Inactive
                </span>
              )}
              {c.isBlocked && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
                  Blocked
                </span>
              )}
              {c.doNotContact && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                  Do Not Contact
                </span>
              )}
            </div>
            {(c.cachedCurrentTitle || c.cachedCurrentCompany) && (
              <p className="text-sm text-slate-500 mt-0.5">
                {c.cachedCurrentTitle}
                {c.cachedCurrentTitle && c.cachedCurrentCompany ? ' · ' : ''}
                {c.cachedCurrentCompany}
              </p>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            {activeResume && (
              <ResumeOpenButton
                resumeId={activeResume.id}
                fileName={activeResume.fileName}
                axios={axios}
              />
            )}
            {activeContext ? (
              <Button
                disabled={sourced || sourceMut.isPending}
                onClick={() => setSourceDialogOpen(true)}
                size="sm"
                className={cn(
                  'gap-2 font-bold h-8',
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
              <span className="text-xs text-slate-400 border border-slate-200 rounded-lg px-3 py-1.5">
                Open from an assignment to source
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ═══ BODY — same 3-col layout as existing candidates page ═══ */}
      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-slate-200 h-full">
          {/* ── LEFT col-span-2 ─────────────────────────────────────────── */}
          <div className="col-span-2 overflow-y-auto px-6 py-5 space-y-5">
            {/* Skills */}
            {c.skills?.length > 0 && (
              <Section title={`Skills (${c.skills.length})`}>
                <div className="px-4 py-3 flex flex-wrap gap-2">
                  {c.skills.map((s, i) => (
                    <div
                      key={s.id ?? i}
                      className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1"
                    >
                      <span className="text-xs font-semibold text-slate-800">{s.rawSkill}</span>
                      {s.yearsExp && (
                        <span className="text-[10px] text-slate-400">{s.yearsExp}y</span>
                      )}
                      {s.proficiency && (
                        <span
                          className={cn(
                            'text-[10px] font-bold uppercase',
                            s.proficiency === 'EXPERT'
                              ? 'text-emerald-600'
                              : s.proficiency === 'ADVANCED'
                                ? 'text-violet-600'
                                : s.proficiency === 'INTERMEDIATE'
                                  ? 'text-blue-600'
                                  : 'text-slate-400'
                          )}
                        >
                          {s.proficiency.slice(0, 3)}
                        </span>
                      )}
                      {s.isVerified && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Experience */}
            {c.experiences?.length > 0 && (
              <Section title={`Experience (${c.experiences.length})`}>
                <div className="divide-y divide-slate-100">
                  {c.experiences.map(exp => (
                    <div key={exp.id} className="px-4 py-4 flex gap-4">
                      <div className="shrink-0 mt-0.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{exp.role}</p>
                            <p className="text-xs font-semibold text-slate-600 mt-0.5">
                              {exp.company}
                            </p>
                          </div>
                          {exp.isCurrent && (
                            <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {(exp.startDate || exp.endDate) && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Calendar className="w-3 h-3" />
                              {fmtDate(exp.startDate) ?? '?'} –{' '}
                              {exp.isCurrent ? 'Present' : (fmtDate(exp.endDate) ?? '?')}
                            </span>
                          )}
                          {exp.durationMonths && (
                            <span className="text-xs text-slate-400">
                              · {durationLabel(exp.durationMonths)}
                            </span>
                          )}
                          {(exp.city || exp.state) && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <MapPin className="w-3 h-3" />
                              {[exp.city, exp.state].filter(Boolean).join(', ')}
                            </span>
                          )}
                          {exp.employmentType && (
                            <span className="text-xs text-slate-400">· {exp.employmentType}</span>
                          )}
                          {exp.isRemote && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              Remote
                            </span>
                          )}
                        </div>
                        {exp.description && (
                          <p className="text-xs text-slate-500 mt-2 leading-relaxed line-clamp-4">
                            {exp.description}
                          </p>
                        )}
                        {exp.achievements && (
                          <div className="mt-2 pl-3 border-l-2 border-blue-200">
                            <p className="text-[10px] font-bold text-blue-600 mb-1 uppercase tracking-wide">
                              Achievements
                            </p>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {exp.achievements}
                            </p>
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
              <Section title={`Education (${c.educations.length})`}>
                <div className="divide-y divide-slate-100">
                  {c.educations.map(edu => (
                    <div key={edu.id} className="px-4 py-4 flex gap-4">
                      <div className="shrink-0 mt-0.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                          <GraduationCap className="w-4 h-4 text-blue-500" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900">{edu.institution}</p>
                        {(edu.degree || edu.fieldOfStudy) && (
                          <p className="text-xs font-semibold text-slate-600 mt-0.5">
                            {edu.degree}
                            {edu.degree && edu.fieldOfStudy ? ' / ' : ''}
                            {edu.fieldOfStudy}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {(edu.startYear || edu.endYear) && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Calendar className="w-3 h-3" />
                              {edu.startYear ?? '?'} –{' '}
                              {edu.isCurrent ? 'Present' : (edu.endYear ?? '?')}
                            </span>
                          )}
                          {edu.grade && (
                            <span className="text-xs text-slate-400">· Grade: {edu.grade}</span>
                          )}
                          {edu.institutionTier && (
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
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
              <Section title={`Certifications (${c.certifications.length})`}>
                <div className="divide-y divide-slate-100">
                  {c.certifications.map(cert => (
                    <div key={cert.id} className="px-4 py-3 flex items-center gap-3">
                      <Tag className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800">{cert.name}</p>
                        {cert.issuer && <p className="text-[10px] text-slate-400">{cert.issuer}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {cert.issueDate && (
                          <span className="text-[10px] text-slate-400">
                            {fmtDate(cert.issueDate)}
                          </span>
                        )}
                        {cert.isExpired && (
                          <span className="text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded-full">
                            Expired
                          </span>
                        )}
                        {cert.verifyUrl && (
                          <a
                            href={cert.verifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-semibold text-blue-600 hover:underline flex items-center gap-0.5"
                          >
                            <ExternalLink className="w-3 h-3" /> Verify
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Languages */}
            {c.languages?.length > 0 && (
              <Section title={`Languages (${c.languages.length})`}>
                <div className="px-4 py-3 flex flex-wrap gap-2">
                  {c.languages.map(lang => (
                    <div
                      key={lang.id}
                      className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5"
                    >
                      <span className="text-xs font-bold text-slate-800">{lang.language}</span>
                      {lang.proficiency && (
                        <span className="text-[10px] text-slate-400 capitalize">
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
              <Section title={`Notes (${c.notes.length})`}>
                <div className="divide-y divide-slate-100">
                  {c.notes.map(note => (
                    <div key={note.id} className="px-4 py-3">
                      <p className="text-xs text-slate-700 leading-relaxed">{note.note}</p>
                      <p className="text-[10px] text-slate-400 mt-1.5">
                        {fmtDateFull(note.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Attached CVs */}
            {c.resumes?.length > 0 && (
              <Section title={`Resumes (${c.resumes.length})`}>
                <div className="divide-y divide-slate-100">
                  {c.resumes.map(r => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                      <FileText
                        className={cn(
                          'w-4 h-4 shrink-0',
                          r.isActive ? 'text-blue-500' : 'text-slate-400'
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {r.fileName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                          <span>v{r.version}</span>
                          {r.fileSizeKb && <span>{Math.round(r.fileSizeKb)} KB</span>}
                          <span>{r.parseStatus}</span>
                          <span>{fmtDateFull(r.createdAt)}</span>
                          {r.isActive && (
                            <span className="font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                      <ResumeOpenButton resumeId={r.id} fileName={r.fileName} axios={axios} />
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>

          {/* ── RIGHT col-span-1 ─────────────────────────────────────────── */}
          <div className="col-span-1 overflow-y-auto bg-slate-50/40">
            {/* Stat strip — matches existing page */}
            <div className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200 bg-white">
              {[
                {
                  label: 'Experience',
                  value:
                    expLabel ?? (c.cachedTotalExpYears != null ? `${c.cachedTotalExpYears}y` : '—'),
                },
                { label: 'Skills', value: String(c.skills?.length ?? 0) },
                { label: 'Applied', value: String(c.requirements?.length ?? 0) },
              ].map(s => (
                <div key={s.label} className="flex flex-col items-center py-4 gap-0.5">
                  <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400">
                    {s.label}
                  </p>
                  <p className="text-xl font-black text-slate-900">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="p-4 space-y-4">
              {/* Contact */}
              <Section title="Contact">
                <div className="divide-y divide-slate-100">
                  {c.email && (
                    <div className="flex items-start gap-3 px-4 py-3">
                      <Mail className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                          Email
                        </p>
                        <p className="text-xs font-semibold text-slate-800 break-all mt-0.5">
                          {c.email}
                        </p>
                      </div>
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-start gap-3 px-4 py-3">
                      <Phone className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                          Phone
                        </p>
                        <p className="text-xs font-semibold text-slate-800 mt-0.5">{c.phone}</p>
                      </div>
                    </div>
                  )}
                  {location && (
                    <div className="flex items-start gap-3 px-4 py-3">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                          Location
                        </p>
                        <p className="text-xs font-semibold text-slate-800 mt-0.5">{location}</p>
                      </div>
                    </div>
                  )}
                </div>
              </Section>

              {/* Links */}
              {(c.linkedinUrl || c.githubUrl || c.portfolioUrl || c.otherUrl) && (
                <Section title="Links">
                  <div className="divide-y divide-slate-100">
                    {[
                      {
                        icon: <Linkedin className="w-3.5 h-3.5 text-sky-600" />,
                        label: 'LinkedIn',
                        url: c.linkedinUrl,
                      },
                      {
                        icon: <Github className="w-3.5 h-3.5 text-slate-700" />,
                        label: 'GitHub',
                        url: c.githubUrl,
                      },
                      {
                        icon: <Globe className="w-3.5 h-3.5 text-indigo-500" />,
                        label: 'Portfolio',
                        url: c.portfolioUrl,
                      },
                      {
                        icon: <Link2 className="w-3.5 h-3.5 text-slate-400" />,
                        label: 'Other',
                        url: c.otherUrl,
                      },
                    ]
                      .filter(r => r.url)
                      .map(row => (
                        <div key={row.label} className="flex items-start gap-3 px-4 py-3">
                          <div className="mt-0.5 shrink-0">{row.icon}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                              {row.label}
                            </p>
                            <a
                              href={row.url!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-blue-600 hover:underline truncate block mt-0.5"
                            >
                              {row.url}
                            </a>
                          </div>
                        </div>
                      ))}
                  </div>
                </Section>
              )}

              {/* Compensation */}
              {(c.currentSalary != null ||
                c.expectedSalary != null ||
                c.salaryFixed != null ||
                c.noticePeriodDays != null ||
                c.isImmediateJoiner) && (
                <Section title="Compensation & Availability">
                  <div className="divide-y divide-slate-100">
                    {c.currentSalary != null && c.currentSalary > 0 && (
                      <div className="flex items-start gap-3 px-4 py-3">
                        <DollarSign className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                            Current CTC
                          </p>
                          <p className="text-xs font-semibold text-slate-800 mt-0.5">
                            {fmtSalary(c.currentSalary)}
                          </p>
                        </div>
                      </div>
                    )}
                    {c.salaryFixed != null && c.salaryFixed > 0 && (
                      <div className="flex items-start gap-3 px-4 py-3">
                        <DollarSign className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                            Fixed
                          </p>
                          <p className="text-xs font-semibold text-slate-800 mt-0.5">
                            {fmtSalary(c.salaryFixed)}
                          </p>
                        </div>
                      </div>
                    )}
                    {c.expectedSalary != null && c.expectedSalary > 0 && (
                      <div className="flex items-start gap-3 px-4 py-3">
                        <DollarSign className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                            Expected CTC
                          </p>
                          <p className="text-xs font-bold text-blue-700 mt-0.5">
                            {fmtSalary(c.expectedSalary)}
                          </p>
                        </div>
                      </div>
                    )}
                    {(c.noticePeriodDays != null || c.isImmediateJoiner) && (
                      <div className="flex items-start gap-3 px-4 py-3">
                        {c.isImmediateJoiner ? (
                          <Zap className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                            Notice Period (days)
                          </p>
                          <p
                            className={cn(
                              'text-xs font-semibold mt-0.5',
                              c.isImmediateJoiner ? 'text-emerald-700' : 'text-slate-800'
                            )}
                          >
                            {c.isImmediateJoiner
                              ? 'Immediate joiner'
                              : c.noticePeriodDays != null
                                ? `${c.noticePeriodDays} days`
                                : '—'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {/* Pipeline History */}
              {c.requirements?.length > 0 && (
                <Section title={`Pipeline History (${c.requirements.length})`}>
                  <div className="divide-y divide-slate-100">
                    {c.requirements.map(r => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between gap-2 px-4 py-2.5"
                      >
                        <span className="text-[10px] font-mono text-slate-400 truncate">
                          {r.requirementId.slice(0, 8)}…
                        </span>
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0',
                            r.stage === 'SOURCED'
                              ? 'bg-blue-50 text-blue-600'
                              : r.stage === 'OFFERED'
                                ? 'bg-violet-50 text-violet-600'
                                : r.stage === 'JOINED'
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : r.stage === 'REJECTED'
                                    ? 'bg-rose-50 text-rose-600'
                                    : 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {r.stage}
                        </span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Meta */}
              <Section title="Meta">
                <div className="divide-y divide-slate-100">
                  {[
                    { label: 'Source', value: SOURCE_LABELS[c.source] ?? c.source },
                    { label: 'Added', value: fmtDatetime(c.createdAt) ?? '—' },
                    { label: 'Updated', value: fmtDatetime(c.updatedAt) ?? '—' },
                    { label: 'Last activity', value: fmtDateFull(c.lastActivityAt) ?? '—' },
                    { label: 'Consent', value: c.consentGiven ? 'Given' : 'Not given' },
                  ].map(row => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between gap-2 px-4 py-2.5"
                    >
                      <span className="text-xs text-slate-400">{row.label}</span>
                      <span
                        className={cn(
                          'text-xs font-semibold',
                          row.label === 'Consent' && c.consentGiven
                            ? 'text-emerald-600'
                            : 'text-slate-700'
                        )}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
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
