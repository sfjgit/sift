// File: page.tsx
// Path: src/app/(dashboard)/candidates/[id]/page.tsx

'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  FileText,
  Link2,
  Github,
  Linkedin,
  Globe,
  GraduationCap,
  Building2,
  Calendar,
  AlertCircle,
  Loader2,
  Pencil,
  Save,
  X,
  CheckCircle2,
  ShieldAlert,
  Clock,
  DollarSign,
  Tag,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAxios } from '@/hooks/useAxios';
import { ResumeViewButton } from './ResumeViewButton';
import { ResumeReplaceButton } from './ResumeReplaceButton';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface CandidateDetail {
  id: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  altPhone: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  githubUrl: string | null;
  otherUrl: string | null;
  currentSalary: number | null;
  expectedSalary: number | null;
  salaryCurrency: string;
  salaryType: string | null;
  noticePeriodDays: number | null;
  isImmediateJoiner: boolean;
  isActive: boolean;
  isBlocked: boolean;
  blockReason: string | null;
  doNotContact: boolean;
  doNotContactReason: string | null;
  consentGiven: boolean;
  source: string;
  sourceNote: string | null;
  reqCode: string | null;
  requirementId: string | null;
  cachedCurrentTitle: string | null;
  cachedCurrentCompany: string | null;
  cachedLocationCity: string | null;
  cachedLocationState: string | null;
  cachedTopSkills: string[];
  cachedTotalExpYears: number | null;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  skills: {
    id: string;
    rawSkill: string;
    normalizedSkill: string;
    yearsExp: number | null;
    proficiency: string | null;
    category: string | null;
  }[];
  experiences: {
    id: string;
    company: string;
    role: string;
    city: string | null;
    state: string | null;
    isCurrent: boolean;
    startDate: string | null;
    endDate: string | null;
    durationMonths: number | null;
    description: string | null;
    employmentType: string | null;
  }[];
  educations: {
    id: string;
    institution: string;
    degree: string | null;
    fieldOfStudy: string | null;
    startYear: number | null;
    endYear: number | null;
    isCurrent: boolean;
    grade: string | null;
  }[];
  locations: {
    id: string;
    type: string;
    city: string | null;
    state: string | null;
    country: string;
    isRemoteOk: boolean;
    isHybridOk: boolean;
  }[];
  resumes: {
    id: string;
    fileName: string;
    url: string;
    isActive: boolean;
    parseStatus: string;
    createdAt: string;
  }[];
  requirements: {
    id: string;
    requirementId: string;
    stage: string;
    createdAt: string;
  }[];
  certifications: {
    id: string;
    name: string;
    issuer: string | null;
    issueDate: string | null;
  }[];
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

const formatExp = (years: number | null) => {
  if (years == null) return '—';
  return `${Math.floor(years)}y ${Math.round((years % 1) * 12)}m`;
};

const formatDuration = (months: number | null) => {
  if (!months) return null;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y}y` : '', m ? `${m}m` : ''].filter(Boolean).join(' ');
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION WRAPPER
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// EDIT FORM FIELDS
// ─────────────────────────────────────────────────────────────────────────────

interface EditState {
  firstName: string;
  lastName: string;
  phone: string;
  altPhone: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  otherUrl: string;
  currentSalary: string;
  expectedSalary: string;
  salaryType: string;
  noticePeriodDays: string;
  isImmediateJoiner: boolean;
  isActive: boolean;
  doNotContact: boolean;
  doNotContactReason: string;
  sourceNote: string;
}

function buildEditState(c: CandidateDetail): EditState {
  return {
    firstName: c.firstName ?? '',
    lastName: c.lastName ?? '',
    phone: c.phone ?? '',
    altPhone: c.altPhone ?? '',
    linkedinUrl: c.linkedinUrl ?? '',
    githubUrl: c.githubUrl ?? '',
    portfolioUrl: c.portfolioUrl ?? '',
    otherUrl: c.otherUrl ?? '',
    currentSalary: c.currentSalary != null ? String(c.currentSalary) : '',
    expectedSalary: c.expectedSalary != null ? String(c.expectedSalary) : '',
    salaryType: c.salaryType ?? '',
    noticePeriodDays: c.noticePeriodDays != null ? String(c.noticePeriodDays) : '',
    isImmediateJoiner: c.isImmediateJoiner,
    isActive: c.isActive,
    doNotContact: c.doNotContact,
    doNotContactReason: c.doNotContactReason ?? '',
    sourceNote: c.sourceNote ?? '',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const axios = useAxios();
  const qc = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [editState, setEditState] = useState<EditState | null>(null);

  const { data, isLoading, isError } = useQuery<{ success: boolean; data: CandidateDetail }>({
    queryKey: ['candidate', id],
    queryFn: async () =>
      (
        await axios.get(`/candidate/api/candidates/${id}`, {
          baseURL: '/api/proxy',
        })
      ).data,
    enabled: !!id,
  });

  const updateMut = useMutation({
    mutationFn: async (payload: Partial<EditState>) => {
      // convert number strings back
      const body: any = { ...payload };
      if (body.currentSalary !== undefined)
        body.currentSalary = body.currentSalary ? parseFloat(body.currentSalary) : null;
      if (body.expectedSalary !== undefined)
        body.expectedSalary = body.expectedSalary ? parseFloat(body.expectedSalary) : null;
      if (body.noticePeriodDays !== undefined)
        body.noticePeriodDays = body.noticePeriodDays ? parseInt(body.noticePeriodDays) : null;
      if (body.firstName || body.lastName) {
        const c = data!.data;
        body.fullName =
          `${body.firstName ?? c.firstName ?? ''} ${body.lastName ?? c.lastName ?? ''}`.trim();
      }
      return axios.patch(`/candidates/${id}`, body);
    },
    onSuccess: () => {
      toast.success('Candidate updated');
      qc.invalidateQueries({ queryKey: ['candidate', id] });
      qc.invalidateQueries({ queryKey: ['candidates'] });
      setEditing(false);
      setEditState(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Update failed'),
  });

  const startEditing = () => {
    if (!data?.data) return;
    setEditState(buildEditState(data.data));
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditState(null);
  };

  const saveEditing = () => {
    if (!editState) return;
    updateMut.mutate(editState);
  };

  const set = (key: keyof EditState, val: any) =>
    setEditState(prev => (prev ? { ...prev, [key]: val } : prev));

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
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
          <div className="col-span-1 flex flex-col gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
          <div className="col-span-2 flex flex-col gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="w-10 h-10 text-rose-400" />
        <p className="text-base font-medium text-slate-600">Failed to load candidate.</p>
        <Button variant="ghost" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  const c = data.data;
  const es = editState;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {/* ═══ HEADER ═══ */}
      <div className="border-b border-slate-200 bg-white shrink-0 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <Avatar className="h-11 w-11 shrink-0">
            <AvatarFallback className={`text-sm font-bold ${avatarColor(c.id)}`}>
              {initials(c.fullName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-slate-900">{c.fullName}</h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {SOURCE_LABELS[c.source] ?? c.source}
              </span>
              {!c.isActive && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600 border border-slate-300">
                  Inactive
                </span>
              )}
              {c.isBlocked && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300">
                  Blocked
                </span>
              )}
              {c.doNotContact && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                  Do Not Contact
                </span>
              )}
              {c.isImmediateJoiner && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                  Immediate Joiner
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

          <div className="flex items-center gap-2 shrink-0">
            {editing ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 h-8 text-sm"
                  onClick={cancelEditing}
                  disabled={updateMut.isPending}
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="gap-2 h-8 text-sm font-semibold"
                  onClick={saveEditing}
                  disabled={updateMut.isPending}
                >
                  {updateMut.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Save
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="gap-2 h-8 text-sm font-semibold"
                onClick={startEditing}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ═══ BODY ═══ */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-3 divide-x divide-slate-200 h-full">
          {/* LEFT — quick stats + contact */}
          <div className="col-span-1 overflow-y-auto bg-slate-50/40">
            {/* Stat strip */}
            <div className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200 bg-white">
              {[
                { label: 'Experience', value: formatExp(c.cachedTotalExpYears) },
                { label: 'Skills', value: String(c.skills.length || c.cachedTopSkills.length) },
                { label: 'Applied', value: String(c.requirements.length) },
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
                  {[
                    {
                      icon: <Mail className="w-3.5 h-3.5 text-slate-400" />,
                      label: 'Email',
                      value: c.email,
                      editable: false,
                    },
                    {
                      icon: <Phone className="w-3.5 h-3.5 text-slate-400" />,
                      label: 'Phone',
                      value: editing ? es?.phone : c.phone,
                      editKey: 'phone' as const,
                    },
                    {
                      icon: <Phone className="w-3.5 h-3.5 text-slate-400" />,
                      label: 'Alt Phone',
                      value: editing ? es?.altPhone : c.altPhone,
                      editKey: 'altPhone' as const,
                    },
                    {
                      icon: <MapPin className="w-3.5 h-3.5 text-slate-400" />,
                      label: 'Location',
                      value:
                        [c.cachedLocationCity, c.cachedLocationState].filter(Boolean).join(', ') ||
                        null,
                      editable: false,
                    },
                  ].map(row =>
                    row.value || editing ? (
                      <div key={row.label} className="flex items-start gap-3 px-4 py-3">
                        <div className="mt-0.5 shrink-0">{row.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                            {row.label}
                          </p>
                          {editing && row.editKey ? (
                            <Input
                              value={(es as any)?.[row.editKey] ?? ''}
                              onChange={e => set(row.editKey!, e.target.value)}
                              className="h-7 text-xs mt-0.5 px-2"
                              placeholder={row.label}
                            />
                          ) : (
                            <p className="text-xs font-semibold text-slate-800 break-words mt-0.5">
                              {row.value || '—'}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              </Section>

              {/* Links */}
              {(c.linkedinUrl || c.githubUrl || c.portfolioUrl || c.otherUrl || editing) && (
                <Section title="Links">
                  <div className="divide-y divide-slate-100">
                    {[
                      {
                        icon: <Linkedin className="w-3.5 h-3.5 text-sky-600" />,
                        label: 'LinkedIn',
                        key: 'linkedinUrl' as const,
                        val: editing ? es?.linkedinUrl : c.linkedinUrl,
                      },
                      {
                        icon: <Github className="w-3.5 h-3.5 text-slate-700" />,
                        label: 'GitHub',
                        key: 'githubUrl' as const,
                        val: editing ? es?.githubUrl : c.githubUrl,
                      },
                      {
                        icon: <Globe className="w-3.5 h-3.5 text-indigo-500" />,
                        label: 'Portfolio',
                        key: 'portfolioUrl' as const,
                        val: editing ? es?.portfolioUrl : c.portfolioUrl,
                      },
                      {
                        icon: <Link2 className="w-3.5 h-3.5 text-slate-400" />,
                        label: 'Other',
                        key: 'otherUrl' as const,
                        val: editing ? es?.otherUrl : c.otherUrl,
                      },
                    ].map(row =>
                      row.val || editing ? (
                        <div key={row.label} className="flex items-start gap-3 px-4 py-3">
                          <div className="mt-0.5 shrink-0">{row.icon}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                              {row.label}
                            </p>
                            {editing ? (
                              <Input
                                value={es?.[row.key] ?? ''}
                                onChange={e => set(row.key, e.target.value)}
                                className="h-7 text-xs mt-0.5 px-2"
                                placeholder={`${row.label} URL`}
                              />
                            ) : row.val ? (
                              <a
                                href={row.val}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-primary hover:underline truncate block mt-0.5"
                              >
                                {row.val}
                              </a>
                            ) : null}
                          </div>
                        </div>
                      ) : null
                    )}
                  </div>
                </Section>
              )}

              {/* Salary & Notice */}
              <Section title="Compensation & Availability">
                <div className="divide-y divide-slate-100">
                  {[
                    {
                      label: 'Current CTC',
                      key: 'currentSalary' as const,
                      val: editing
                        ? es?.currentSalary
                        : c.currentSalary != null
                          ? String(c.currentSalary)
                          : '',
                    },
                    {
                      label: 'Expected CTC',
                      key: 'expectedSalary' as const,
                      val: editing
                        ? es?.expectedSalary
                        : c.expectedSalary != null
                          ? String(c.expectedSalary)
                          : '',
                    },
                    {
                      label: 'Notice Period (days)',
                      key: 'noticePeriodDays' as const,
                      val: editing
                        ? es?.noticePeriodDays
                        : c.noticePeriodDays != null
                          ? String(c.noticePeriodDays)
                          : '',
                    },
                  ].map(row =>
                    row.val || editing ? (
                      <div key={row.label} className="flex items-start gap-3 px-4 py-3">
                        <DollarSign className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                            {row.label}
                          </p>
                          {editing ? (
                            <Input
                              type="number"
                              value={es?.[row.key] ?? ''}
                              onChange={e => set(row.key, e.target.value)}
                              className="h-7 text-xs mt-0.5 px-2"
                            />
                          ) : (
                            <p className="text-xs font-semibold text-slate-800 mt-0.5">
                              {row.val || '—'}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : null
                  )}

                  {editing && (
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                          Immediate Joiner
                        </p>
                      </div>
                      <Switch
                        checked={es?.isImmediateJoiner ?? false}
                        onCheckedChange={v => set('isImmediateJoiner', v)}
                      />
                    </div>
                  )}
                </div>
              </Section>

              {/* Flags */}
              {editing && (
                <Section title="Flags">
                  <div className="divide-y divide-slate-100">
                    <div className="px-4 py-3 flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-700">Active</p>
                      <Switch
                        checked={es?.isActive ?? true}
                        onCheckedChange={v => set('isActive', v)}
                      />
                    </div>
                    <div className="px-4 py-3 flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-700">Do Not Contact</p>
                      <Switch
                        checked={es?.doNotContact ?? false}
                        onCheckedChange={v => set('doNotContact', v)}
                      />
                    </div>
                    {es?.doNotContact && (
                      <div className="px-4 py-3">
                        <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                          DNC Reason
                        </Label>
                        <Textarea
                          value={es?.doNotContactReason ?? ''}
                          onChange={e => set('doNotContactReason', e.target.value)}
                          rows={2}
                          className="resize-none text-xs mt-1"
                        />
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {/* Resumes */}
              {c.resumes.length > 0 && (
                <Section title="Resumes">
                  <div className="divide-y divide-slate-100">
                    {c.resumes.map(r => (
                      <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">
                            {r.fileName}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {format(new Date(r.createdAt), 'dd MMM yyyy')} · v
                            {
                              // @ts-expect-error err
                              r.version
                            }{' '}
                            · {r.parseStatus}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <ResumeViewButton resumeId={r.id} fileName={r.fileName} />
                          <ResumeReplaceButton candidateId={c.id} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Meta */}
              <Section title="Meta">
                <div className="divide-y divide-slate-100">
                  {[
                    { label: 'Added', value: format(new Date(c.createdAt), 'dd MMM yyyy, HH:mm') },
                    {
                      label: 'Updated',
                      value: format(new Date(c.updatedAt), 'dd MMM yyyy, HH:mm'),
                    },
                    {
                      label: 'Last activity',
                      value: format(new Date(c.lastActivityAt), 'dd MMM yyyy'),
                    },
                    c.reqCode ? { label: 'Req Code', value: c.reqCode } : null,
                  ]
                    .filter(Boolean)
                    .map((row: any) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between gap-2 px-4 py-2.5"
                      >
                        <span className="text-xs text-slate-400">{row.label}</span>
                        <span className="text-xs font-semibold text-slate-700">{row.value}</span>
                      </div>
                    ))}
                </div>
              </Section>
            </div>
          </div>

          {/* RIGHT — skills, experience, education, certifications, requirements */}
          <div className="col-span-2 overflow-y-auto px-6 py-5 space-y-5">
            {/* Skills */}
            {(c.skills.length > 0 || c.cachedTopSkills.length > 0) && (
              <Section title={`Skills (${c.skills.length || c.cachedTopSkills.length})`}>
                <div className="px-4 py-3 flex flex-wrap gap-2">
                  {(c.skills.length > 0
                    ? c.skills
                    : c.cachedTopSkills.map(s => ({
                        rawSkill: s,
                        yearsExp: null,
                        proficiency: null,
                        category: null,
                      }))
                  ).map((s: any, i: number) => (
                    <div
                      key={s.id ?? i}
                      className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1"
                    >
                      <span className="text-xs font-semibold text-slate-800">{s.rawSkill}</span>
                      {s.yearsExp && (
                        <span className="text-[10px] text-slate-400">{s.yearsExp}y</span>
                      )}
                      {s.proficiency && (
                        <span className="text-[10px] font-bold text-violet-600 uppercase">
                          {s.proficiency.slice(0, 3)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Experience */}
            {c.experiences.length > 0 && (
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
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {(exp.startDate || exp.endDate) && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Calendar className="w-3 h-3" />
                              {exp.startDate ? format(new Date(exp.startDate), 'MMM yyyy') : '?'}
                              {' — '}
                              {exp.isCurrent
                                ? 'Present'
                                : exp.endDate
                                  ? format(new Date(exp.endDate), 'MMM yyyy')
                                  : '?'}
                            </span>
                          )}
                          {exp.durationMonths && (
                            <span className="text-xs text-slate-400">
                              · {formatDuration(exp.durationMonths)}
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
                        </div>
                        {exp.description && (
                          <p className="text-xs text-slate-500 mt-2 leading-relaxed line-clamp-3">
                            {exp.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Education */}
            {c.educations.length > 0 && (
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
                            {edu.degree && edu.fieldOfStudy ? ' · ' : ''}
                            {edu.fieldOfStudy}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {(edu.startYear || edu.endYear) && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Calendar className="w-3 h-3" />
                              {edu.startYear ?? '?'} —{' '}
                              {edu.isCurrent ? 'Present' : (edu.endYear ?? '?')}
                            </span>
                          )}
                          {edu.grade && (
                            <span className="text-xs text-slate-400">· Grade: {edu.grade}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Certifications */}
            {c.certifications.length > 0 && (
              <Section title={`Certifications (${c.certifications.length})`}>
                <div className="divide-y divide-slate-100">
                  {c.certifications.map(cert => (
                    <div key={cert.id} className="px-4 py-3 flex items-center gap-3">
                      <Tag className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800">{cert.name}</p>
                        {cert.issuer && <p className="text-[10px] text-slate-400">{cert.issuer}</p>}
                      </div>
                      {cert.issueDate && (
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {format(new Date(cert.issueDate), 'MMM yyyy')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Requirements / pipeline */}
            {c.requirements.length > 0 && (
              <Section title={`Pipeline History (${c.requirements.length})`}>
                <div className="divide-y divide-slate-100">
                  {c.requirements.map(req => (
                    <div
                      key={req.id}
                      className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 cursor-pointer group"
                      onClick={() => router.push(`/requirements/${req.requirementId}`)}
                    >
                      <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 font-mono">
                          {req.requirementId}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {req.stage}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {format(new Date(req.createdAt), 'dd MMM yyyy')}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-colors" />
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
