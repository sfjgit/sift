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
  DollarSign,
  Tag,
  Wallet,
  CalendarCheck,
  AlertTriangle,
  ExternalLink,
  Send,
  PauseCircle,
  XCircle,
  LogOut,
  ChevronDown,
  ArrowUpDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
    id: string; // pipelineId
    requirementId: string;
    reqCode?: string | null;
    reqTitle?: string | null;
    clientName?: string | null;
    stage: string;
    canonicalStage?: string | null;
    createdAt: string;
    // CTC ladder
    currentCtc?: number | null;
    expectedCtc?: number | null;
    negotiatedCtc?: number | null;
    ctcNotes?: string | null;
    // Offer
    offeredCtc?: number | null;
    salaryType?: string | null;
    offerStatus?: string | null;
    offeredAt?: string | null;
    // Joining
    expectedJoiningDate?: string | null;
    actualJoiningDate?: string | null;
    lastWorkingDate?: string | null;
    monthOfJoining?: string | null;
    remainingDaysToJoin?: number | null;
    // Status
    isRejected?: boolean;
    isWithdrawn?: boolean;
    isOnHold?: boolean;
    onHoldReason?: string | null;
    rejectionReason?: string | null;
    withdrawnReason?: string | null;
    submittedAt?: string | null;
    submissionNote?: string | null;
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

const formatCtcBig = (val: number | null | undefined) =>
  val != null ? `₹${(val / 100000).toFixed(1)}L` : '—';

// formatDateShort
const formatDateShort = (d: string | null | undefined) =>
  d ? format(new Date(d), 'dd MMM yy') : '—';

const humanizeCanonical = (key: string) =>
  key
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

const toNum = (v: string) => (v.trim() === '' ? null : parseFloat(v));

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
// EDIT STATE
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
// PIPELINE ACTION TABS — same logic as CandidateDetailsModal in assignments page
// Submission / Offer & CTC / Joining / Status
// pipelineId = req.id (which IS the pipeline id from the requirements array)
// ─────────────────────────────────────────────────────────────────────────────

type DetailTab = 'submission' | 'offer' | 'joining' | 'status';

function SubmissionTab({
  req,
  axios,
  onDone,
}: {
  req: CandidateDetail['requirements'][number];
  axios: any;
  onDone: () => void;
}) {
  const [note, setNote] = useState(req.submissionNote ?? '');
  const mut = useMutation({
    mutationFn: async () =>
      axios.patch(`/pipeline/${req.id}/submit`, { submissionNote: note || undefined }),
    onSuccess: () => {
      toast.success(req.submittedAt ? 'Submission updated' : 'Submitted to client');
      onDone();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });

  return (
    <div className="space-y-4 p-4">
      {req.submittedAt ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-xs font-semibold text-blue-800">
          Submitted on {formatDateShort(req.submittedAt)}
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs font-medium text-slate-500">
          Not submitted to client yet.
        </div>
      )}
      <div>
        <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">Submission note</Label>
        <Textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Notes for the client..."
          rows={3}
          className="resize-none text-sm"
        />
      </div>
      <div className="flex justify-end">
        <Button size="sm" disabled={mut.isPending} onClick={() => mut.mutate()} className="gap-2">
          {mut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {req.submittedAt ? 'Update Submission' : 'Mark Submitted'}
        </Button>
      </div>
    </div>
  );
}

function OfferCtcTab({
  req,
  axios,
  onDone,
}: {
  req: CandidateDetail['requirements'][number];
  axios: any;
  onDone: () => void;
}) {
  const [currentCtc, setCurrentCtc] = useState(req.currentCtc?.toString() ?? '');
  const [expectedCtc, setExpectedCtc] = useState(req.expectedCtc?.toString() ?? '');
  const [negotiatedCtc, setNegotiatedCtc] = useState(req.negotiatedCtc?.toString() ?? '');
  const [ctcNotes, setCtcNotes] = useState(req.ctcNotes ?? '');
  const [offeredCtc, setOfferedCtc] = useState(req.offeredCtc?.toString() ?? '');
  const [salaryType, setSalaryType] = useState(req.salaryType ?? 'MONTHLY');
  const [expectedJoiningDate, setExpectedJoiningDate] = useState(
    req.expectedJoiningDate ? req.expectedJoiningDate.slice(0, 10) : ''
  );

  const mut = useMutation({
    mutationFn: async () => {
      await axios.patch(`/pipeline/${req.id}/offer`, {
        currentCtc: toNum(currentCtc),
        expectedCtc: toNum(expectedCtc),
        negotiatedCtc: toNum(negotiatedCtc),
        ctcNotes: ctcNotes.trim() || null,
        ...(offeredCtc.trim() && {
          offeredCtc: toNum(offeredCtc),
          salaryCurrency: 'INR',
          salaryType,
        }),
        ...(expectedJoiningDate && { expectedJoiningDate }),
      });
    },
    onSuccess: () => {
      toast.success('Offer & CTC saved');
      onDone();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to save'),
  });

  return (
    <div className="space-y-4 p-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">
          CTC Ladder
        </p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Current CTC (₹)', val: currentCtc, set: setCurrentCtc },
            { label: 'Expected CTC (₹)', val: expectedCtc, set: setExpectedCtc },
            { label: 'Negotiated CTC (₹)', val: negotiatedCtc, set: setNegotiatedCtc },
          ].map(f => (
            <div key={f.label}>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">{f.label}</Label>
              <Input
                type="number"
                value={f.val}
                onChange={e => f.set(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          ))}
        </div>
        <div className="mt-3">
          <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">CTC Notes</Label>
          <Textarea
            value={ctcNotes}
            onChange={e => setCtcNotes(e.target.value)}
            rows={2}
            className="resize-none text-sm"
            placeholder="Any context on negotiation, breakup, etc."
          />
        </div>
      </div>

      <div className="pt-1 border-t border-slate-100">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2 mt-2">
          Formal Offer
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">
              Offered CTC (₹)
            </Label>
            <Input
              type="number"
              value={offeredCtc}
              onChange={e => setOfferedCtc(e.target.value)}
              placeholder="e.g. 800000"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Salary Type</Label>
            <Select value={salaryType} onValueChange={setSalaryType}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['MONTHLY', 'ANNUAL', 'HOURLY', 'DAILY'].map(t => (
                  <SelectItem key={t} value={t} className="text-sm">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3">
          <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">
            Expected Joining
          </Label>
          <Input
            type="date"
            value={expectedJoiningDate}
            onChange={e => setExpectedJoiningDate(e.target.value)}
            className="h-8 text-sm w-44"
          />
        </div>
        {req.offerStatus && (
          <p className="text-xs text-slate-500 mt-2">
            Offer status: <span className="font-semibold text-slate-700">{req.offerStatus}</span>
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={mut.isPending}
          onClick={() => mut.mutate()}
          className="gap-2 bg-violet-600 hover:bg-violet-700"
        >
          {mut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save Offer & CTC
        </Button>
      </div>
    </div>
  );
}

function JoiningTab({
  req,
  axios,
  onDone,
}: {
  req: CandidateDetail['requirements'][number];
  axios: any;
  onDone: () => void;
}) {
  const [lastWorkingDate, setLastWorkingDate] = useState(
    req.lastWorkingDate ? req.lastWorkingDate.slice(0, 10) : ''
  );
  const [actualJoiningDate, setActualJoiningDate] = useState(
    req.actualJoiningDate ? req.actualJoiningDate.slice(0, 10) : ''
  );

  const mut = useMutation({
    mutationFn: async () =>
      axios.patch(`/pipeline/${req.id}/details`, {
        lastWorkingDate: lastWorkingDate || null,
        actualJoiningDate: actualJoiningDate || null,
      }),
    onSuccess: () => {
      toast.success('Joining details saved');
      onDone();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to save'),
  });

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">
            Last Working Day
          </Label>
          <Input
            type="date"
            value={lastWorkingDate}
            onChange={e => setLastWorkingDate(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">
            Actual Joining Date
          </Label>
          <Input
            type="date"
            value={actualJoiningDate}
            onChange={e => setActualJoiningDate(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Expected Joining
          </p>
          <p className="text-sm font-semibold text-slate-700 mt-0.5">
            {formatDateShort(req.expectedJoiningDate)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Days to Join
          </p>
          <p
            className={`text-sm font-semibold mt-0.5 ${req.remainingDaysToJoin != null && req.remainingDaysToJoin < 0 ? 'text-rose-600' : 'text-slate-700'}`}
          >
            {req.remainingDaysToJoin != null ? req.remainingDaysToJoin : '—'}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Month of Joining
          </p>
          <p className="text-sm font-semibold text-slate-700 mt-0.5">{req.monthOfJoining ?? '—'}</p>
        </div>
      </div>
      <div className="flex justify-end">
        <Button size="sm" disabled={mut.isPending} onClick={() => mut.mutate()} className="gap-2">
          {mut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save Joining Details
        </Button>
      </div>
    </div>
  );
}

function StatusTab({
  req,
  axios,
  onDone,
}: {
  req: CandidateDetail['requirements'][number];
  axios: any;
  onDone: () => void;
}) {
  const [active, setActive] = useState<'hold' | 'withdraw' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const isTerminated = req.isRejected || req.isWithdrawn;

  const endpointFor = (a: string) =>
    a === 'hold'
      ? `/pipeline/${req.id}/hold`
      : a === 'withdraw'
        ? `/pipeline/${req.id}/withdraw`
        : `/pipeline/${req.id}/reject`;

  const bodyKeyFor = (a: string) =>
    a === 'hold' ? 'onHoldReason' : a === 'withdraw' ? 'withdrawnReason' : 'rejectionReason';

  const mut = useMutation({
    mutationFn: async () =>
      axios.patch(endpointFor(active!), { [bodyKeyFor(active!)]: reason || undefined }),
    onSuccess: () => {
      toast.success('Status updated');
      onDone();
      setActive(null);
      setReason('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });

  const ROWS = [
    {
      id: 'hold' as const,
      label: 'Put on Hold',
      icon: <PauseCircle className="w-4 h-4 text-amber-600" />,
      isActive: req.isOnHold,
      reasonText: req.onHoldReason,
      variant: 'amber',
    },
    {
      id: 'withdraw' as const,
      label: 'Withdraw',
      icon: <LogOut className="w-4 h-4 text-slate-600" />,
      isActive: req.isWithdrawn,
      reasonText: req.withdrawnReason,
      variant: 'default',
    },
    {
      id: 'reject' as const,
      label: 'Reject',
      icon: <XCircle className="w-4 h-4 text-rose-600" />,
      isActive: req.isRejected,
      reasonText: req.rejectionReason,
      variant: 'danger',
    },
  ];

  return (
    <div className="space-y-2 p-4">
      {isTerminated && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs font-medium text-slate-500 mb-3">
          This candidate is already out of the active pipeline.
        </div>
      )}
      {ROWS.map(row => (
        <div key={row.id} className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setActive(prev => (prev === row.id ? null : row.id))}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
          >
            {row.icon}
            <span className="text-sm font-semibold text-slate-800 flex-1">{row.label}</span>
            {row.isActive && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                Applied
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${active === row.id ? 'rotate-180' : ''}`}
            />
          </button>
          {row.isActive && row.reasonText && active !== row.id && (
            <p className="px-4 pb-3 text-xs text-slate-500">Reason: {row.reasonText}</p>
          )}
          {active === row.id && (
            <div className="px-4 pb-4 pt-1 space-y-2.5 bg-slate-50/60 border-t border-slate-100">
              <Textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder={`Why is this candidate being ${row.label.toLowerCase()}ed?`}
                rows={2}
                className="resize-none text-sm bg-white"
              />
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setActive(null);
                    setReason('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={mut.isPending}
                  className={
                    row.variant === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : row.variant === 'amber'
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : ''
                  }
                  onClick={() => mut.mutate()}
                >
                  {mut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />}
                  Confirm {row.label}
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ENGAGEMENT CARD — read view + inline edit panel (same tabs as assignment page)
// ─────────────────────────────────────────────────────────────────────────────

function EngagementCard({
  req,
  router,
  axios,
  onDone,
}: {
  req: CandidateDetail['requirements'][number];
  router: any;
  axios: any;
  onDone: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState<DetailTab>('submission');

  const isTerminated = req.isRejected || req.isWithdrawn;
  const hasOffer = req.offeredCtc != null;
  const overdue =
    req.remainingDaysToJoin != null && req.remainingDaysToJoin < 0 && !req.actualJoiningDate;

  const TABS: { id: DetailTab; label: string; icon: React.ReactNode }[] = [
    { id: 'submission', label: 'Submission', icon: <Send className="w-3.5 h-3.5" /> },
    { id: 'offer', label: 'Offer & CTC', icon: <Wallet className="w-3.5 h-3.5" /> },
    { id: 'joining', label: 'Joining', icon: <CalendarCheck className="w-3.5 h-3.5" /> },
    { id: 'status', label: 'Status', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  ];

  return (
    <div
      className={`border-2 rounded-2xl overflow-hidden ${
        isTerminated
          ? 'border-slate-200 opacity-60'
          : hasOffer
            ? 'border-violet-300'
            : 'border-slate-200'
      }`}
    >
      {/* ── TOP BAR — req identity + actions ── */}
      <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
        <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {req.reqCode && (
              <span className="text-xs font-bold text-slate-500 font-mono">{req.reqCode}</span>
            )}
            <span className="text-sm font-bold text-slate-900 truncate">
              {req.reqTitle ?? req.requirementId}
            </span>
          </div>
          {req.clientName && <p className="text-xs text-slate-500 mt-0.5">{req.clientName}</p>}
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white border border-slate-300 text-slate-700 shrink-0">
          {req.stage}
        </span>
        {req.canonicalStage && (
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 shrink-0">
            {humanizeCanonical(req.canonicalStage)}
          </span>
        )}
        {/* Edit toggle */}
        <button
          title={editOpen ? 'Close edit panel' : 'Edit pipeline details'}
          onClick={() => setEditOpen(v => !v)}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
            editOpen
              ? 'bg-primary text-white'
              : 'text-slate-400 hover:text-primary hover:bg-primary/10'
          }`}
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          title="View in requirement pipeline"
          onClick={() => router.push(`/requirements/${req.requirementId}?pipelineId=${req.id}`)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {/* ── STATUS FLAGS ── */}
      {(req.submittedAt ||
        req.isOnHold ||
        req.isRejected ||
        req.isWithdrawn ||
        req.offerStatus) && (
        <div className="flex items-center gap-1.5 px-5 py-2 border-b border-slate-100 flex-wrap">
          {req.submittedAt && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
              <Send className="w-2.5 h-2.5" /> Submitted {formatDateShort(req.submittedAt)}
            </span>
          )}
          {req.offerStatus && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-100 text-violet-700">
              Offer: {req.offerStatus}
            </span>
          )}
          {req.isOnHold && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700">
              <PauseCircle className="w-2.5 h-2.5" /> On Hold
            </span>
          )}
          {req.isRejected && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700">
              <XCircle className="w-2.5 h-2.5" /> Rejected
            </span>
          )}
          {req.isWithdrawn && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
              <LogOut className="w-2.5 h-2.5" /> Withdrawn
            </span>
          )}
        </div>
      )}

      {/* ── HEADLINE NUMBERS — CTC + Joining ── */}
      <div className="grid grid-cols-2 divide-x divide-slate-100">
        {/* CTC ladder */}
        <div className="px-5 py-4">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">
            <Wallet className="w-3 h-3" /> CTC
          </p>
          <div className="grid grid-cols-3 gap-3 mb-2">
            {[
              { label: 'Current', val: req.currentCtc },
              { label: 'Expected', val: req.expectedCtc },
              { label: 'Negotiated', val: req.negotiatedCtc },
            ].map(f => (
              <div key={f.label}>
                <p className="text-[10px] font-semibold text-slate-400">{f.label}</p>
                <p className="text-lg font-black text-slate-900 leading-tight">
                  {formatCtcBig(f.val)}
                </p>
              </div>
            ))}
          </div>
          {hasOffer && (
            <div className="bg-violet-50 border border-violet-200 rounded-lg px-3 py-2 mt-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-violet-500">
                Offered
              </p>
              <p className="text-2xl font-black text-violet-700 leading-tight">
                {formatCtcBig(req.offeredCtc)}
                {req.salaryType && (
                  <span className="text-xs font-semibold text-violet-400 ml-1.5">
                    / {req.salaryType.toLowerCase()}
                  </span>
                )}
              </p>
            </div>
          )}
          {req.ctcNotes && <p className="text-xs text-slate-500 mt-2 italic">{req.ctcNotes}</p>}
        </div>

        {/* Joining */}
        <div className="px-5 py-4">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">
            <CalendarCheck className="w-3 h-3" /> Joining
          </p>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div>
              <p className="text-[10px] font-semibold text-slate-400">Expected</p>
              <p className="text-lg font-black text-slate-900 leading-tight">
                {formatDateShort(req.expectedJoiningDate)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400">Actual</p>
              <p className="text-lg font-black text-emerald-700 leading-tight">
                {formatDateShort(req.actualJoiningDate)}
              </p>
            </div>
          </div>
          {req.lastWorkingDate && (
            <p className="text-xs text-slate-500">
              Last working day:{' '}
              <span className="font-semibold text-slate-700">
                {formatDateShort(req.lastWorkingDate)}
              </span>
            </p>
          )}
          {req.monthOfJoining && (
            <p className="text-xs text-slate-500 mt-0.5">
              Month of joining:{' '}
              <span className="font-semibold text-slate-700">{req.monthOfJoining}</span>
            </p>
          )}
          {req.remainingDaysToJoin != null && !req.actualJoiningDate && (
            <div
              className={`mt-2 inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                overdue ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {overdue && <AlertTriangle className="w-3 h-3" />}
              {overdue
                ? `${Math.abs(req.remainingDaysToJoin)} days overdue`
                : `Joining in ${req.remainingDaysToJoin} days`}
            </div>
          )}
        </div>
      </div>

      {/* ── INLINE EDIT PANEL — slides open below the numbers ── */}
      {editOpen && (
        <div className="border-t-2 border-primary/20 bg-slate-50/60">
          {/* Tab nav */}
          <div className="flex border-b border-slate-200 bg-white">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
            <button
              onClick={() => setEditOpen(false)}
              className="ml-auto px-3 py-2.5 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab content */}
          {tab === 'submission' && <SubmissionTab req={req} axios={axios} onDone={onDone} />}
          {tab === 'offer' && <OfferCtcTab req={req} axios={axios} onDone={onDone} />}
          {tab === 'joining' && <JoiningTab req={req} axios={axios} onDone={onDone} />}
          {tab === 'status' && <StatusTab req={req} axios={axios} onDone={onDone} />}
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-2 border-t border-slate-100">
        <p className="text-[10px] text-slate-400">
          Added to pipeline {formatDateShort(req.createdAt)}
        </p>
      </div>
    </div>
  );
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
      (await axios.get(`/candidate/api/candidates/${id}`, { baseURL: '/api/proxy' })).data,
    enabled: !!id,
  });

  const updateMut = useMutation({
    mutationFn: async (payload: Partial<EditState>) => {
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

  // Invalidate candidate query after any pipeline action so the numbers refresh
  const onPipelineDone = () => {
    qc.invalidateQueries({ queryKey: ['candidate', id] });
  };

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
          <div className="col-span-2 flex flex-col gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
          <div className="col-span-1 flex flex-col gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
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

  const bestOffer = c.requirements
    .filter(r => r.offeredCtc != null)
    .sort((a, b) => (b.offeredCtc ?? 0) - (a.offeredCtc ?? 0))[0];
  const nearestJoining = c.requirements
    .filter(r => r.expectedJoiningDate && !r.actualJoiningDate)
    .sort(
      (a, b) =>
        new Date(a.expectedJoiningDate!).getTime() - new Date(b.expectedJoiningDate!).getTime()
    )[0];

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
          {bestOffer && (
            <div className="flex flex-col items-center px-4 border-l border-slate-200 shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">
                Best Offer
              </p>
              <p className="text-xl font-black text-violet-700 leading-tight">
                {formatCtcBig(bestOffer.offeredCtc)}
              </p>
            </div>
          )}
          {nearestJoining && (
            <div className="flex flex-col items-center px-4 border-l border-slate-200 shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                Next Joining
              </p>
              <p className="text-xl font-black text-emerald-700 leading-tight">
                {formatDateShort(nearestJoining.expectedJoiningDate)}
              </p>
            </div>
          )}
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
                  <X className="w-3.5 h-3.5" /> Cancel
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
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ═══ BODY ═══ */}
      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-slate-200 h-full">
          {/* ── LEFT col-span-2 — Engagements, Skills, Experience, Education, Certs ── */}
          <div className="col-span-2 overflow-y-auto px-6 py-5 space-y-5">
            {c.requirements.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Requirement Engagements ({c.requirements.length})
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                    CTC / Offer / Joining — click ✏️ to edit
                  </span>
                </div>
                <div className="space-y-4">
                  {c.requirements
                    .slice()
                    .sort(
                      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    )
                    .map(req => (
                      <EngagementCard
                        key={req.id}
                        req={req}
                        router={router}
                        axios={axios}
                        onDone={onPipelineDone}
                      />
                    ))}
                </div>
              </div>
            )}

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
          </div>

          {/* ── RIGHT col-span-1 — Stat strip + Contact/Links/Salary/Flags/Resumes/Meta ── */}
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
                          {editing && (row as any).editKey ? (
                            <Input
                              value={(es as any)?.[(row as any).editKey] ?? ''}
                              onChange={e => set((row as any).editKey, e.target.value)}
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

              {/* Compensation */}
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
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                        Immediate Joiner
                      </p>
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
                            {format(new Date(r.createdAt), 'dd MMM yyyy')} · {r.parseStatus}
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
        </div>
      </div>
    </div>
  );
}
