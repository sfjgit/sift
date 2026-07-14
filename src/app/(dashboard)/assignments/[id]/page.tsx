// File: page.tsx
// Path: src/app/(dashboard)/assignments/[id]/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Users,
  Clock,
  ChevronRight,
  Mail,
  Phone,
  Briefcase,
  FileText,
  Database,
  Globe,
  ExternalLink,
  GitBranch,
  CheckCircle2,
  Flame,
  CalendarClock,
  UserPlus,
  X,
  Pencil,
  Search,
  RefreshCw,
  Filter,
  AlertCircle,
  ChevronDown,
  Loader2,
  ArrowUpDown,
  Send,
  PauseCircle,
  XCircle,
  LogOut,
  SlidersHorizontal,
  Wallet,
  CalendarCheck,
  AlertTriangle,
  Files,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAxios } from '@/hooks/useAxios';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface BulkResultItem {
  status: 'success' | 'duplicate' | 'failed';
  index: number;
  fileName: string;
  candidateId?: string;
  candidateName?: string;
  email?: string;
  error?: string;
  durationMs?: number;
}

interface BulkUploadResult {
  success: boolean;
  summary: {
    total: number;
    succeeded: number;
    duplicates: number;
    failed: number;
    durationMs: number;
  };
  results: BulkResultItem[];
}

interface StageHistory {
  id: string;
  fromCanonicalStage: string | null;
  toCanonicalStage: string | null;
  timeInPrevStageMins: number | null;
  createdAt: string;
  changedBy: { id: string; firstName: string; lastName: string };
}

interface PipelineCandidate {
  id: string;
  disposition: string;
  currentCanonicalStage: string | null;
  dropReason: string | null;
  dropNote: string | null;
  isRejected: boolean;
  isWithdrawn: boolean;
  isOnHold: boolean;
  onHoldReason: string | null;
  rejectionReason: string | null;
  withdrawnReason: string | null;
  submissionNote: string | null;
  submittedAt: string | null;
  offeredAt: string | null;
  offerStatus: string | null;
  offeredCtc: number | null;
  salaryCurrency: string | null;
  salaryType: string | null;
  // ── CTC ladder ──
  currentCtc: number | null;
  expectedCtc: number | null;
  negotiatedCtc: number | null;
  ctcNotes: string | null;
  // ── Joining ──
  lastWorkingDate: string | null;
  expectedJoiningDate: string | null;
  actualJoiningDate: string | null;
  monthOfJoining: string | null;
  remainingDaysToJoin: number | null;
  stageUpdatedAt: string;
  createdAt: string;
  aging: { minutes: number; label: string };
  currentStage: {
    id: string;
    label: string;
    code: string;
    order: number;
    canonicalStage: string | null;
  };
  recruiter: { id: string; firstName: string; lastName: string; role: { name: string } };
  snapshot: {
    id: string;
    candidateServiceId: string;
    fullName: string;
    email: string;
    phone: string | null;
    currentTitle: string | null;
    currentCompany: string | null;
    totalExpYears: number | null;
    topSkills: string[];
    resumeUrl: string | null;
  };
  stageHistory: StageHistory[];
  assignment: {
    id: string;
    depth: number;
    assignedTo: { id: string; firstName: string; lastName: string; employeeId: string | null };
  } | null;
}

interface PipelineStage {
  id: string;
  code: string;
  label: string;
  order: number;
  isMandatory: boolean;
  isTerminal: boolean;
  canonicalStage: string | null;
}

interface CandidateStats {
  total: number;
  active: number;
  placed: number;
  dropped: number;
  onHold: number;
  rejected: number;
  withdrawn: number;
  submitted: number;
  offered: number;
  joined: number;
  byPipelineStage: {
    id: string;
    code: string;
    label: string;
    order: number;
    count: number;
  }[];
  agingBuckets: { fresh: number; normal: number; stale: number; critical: number };
  rates: { submission: number; offer: number; joining: number };
}

export type RequirementStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'CLOSED'
  | 'CANCELLED';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type JobType = 'CONTRACT' | 'PERMANENT' | 'CONTRACT_TO_HIRE' | 'FREELANCE';
export type RemoteType = 'ONSITE' | 'REMOTE' | 'HYBRID';
export type SalaryType = 'MONTHLY' | 'ANNUAL' | 'HOURLY' | 'DAILY';
export type JobOpenFor = 'EXTERNAL' | 'INTERNAL' | 'BOTH';
export type ClosureReason =
  | 'FILLED'
  | 'CANCELLED'
  | 'CLIENT_WITHDREW'
  | 'BUDGET_HOLD'
  | 'DUPLICATE';
export type JDParseStatus = 'PARSED' | 'FAILED' | 'MANUALLY_OVERRIDDEN';

interface AssignmentDetail {
  id: string;
  depth: number;
  status: string;
  allocatedOpenings: number | null;
  deadline: string | null;
  breachedAt: string | null;
  assignedAt: string;
  assignedBy: {
    id: string;
    firstName: string;
    lastName: string;
    role: { id: string; name: string };
  };
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
    role: { id: string; name: string };
    department: { id: string; name: string } | null;
  };
  requirement: {
    id: string;
    reqCode: string;
    title: string;
    description: string | null;
    status: RequirementStatus;
    priority: Priority;
    jobType: JobType;
    remoteType: RemoteType;
    jobOpenFor: JobOpenFor;

    // location — split fields (location + skills flat strings REMOVED)
    city: string | null;
    state: string | null;
    country: string | null;

    // skills — split
    primarySkills: string[];
    keySkills: string[];

    experienceMin: number | null;
    experienceMax: number | null;

    // compensation
    salaryMin: number | null;
    salaryMax: number | null;
    salaryType: SalaryType | null;
    salaryCurrency: string | null;
    bonusAmount: number | null;
    hideSalaryFromCandidate: boolean;
    showMedianSalary: boolean;

    // employment details
    education: string | null;
    functionalArea: string | null;
    shift: string | null;

    // sourcing strategy
    targetCompanies: string[];
    noPoachCompanies: string[];

    totalOpenings: number;
    // filledOpenings / activeApplications / interviewsScheduled / offersRolledOut
    // REMOVED — all computed from pipeline rows on demand

    // dates
    startDate: string | null;
    targetDate: string | null; // was endDate — renamed
    respondBy: string | null;
    turnaroundDays: number | null;
    closedAt: string | null;
    closureReason: ClosureReason | null;

    isRespondByBreached: boolean;
    isTurnaroundBreached: boolean;

    // JD file
    jdFileKey: string | null;
    jdFileName: string | null;
    jdFileType: string | null;
    jdUploadedAt: string | null;

    // JD parse metadata
    jdParsedAt: string | null;
    jdParseStatus: JDParseStatus | null;
    jdParsedFields: string[];
    parsedJDId: string | null;

    createdAt: string;
    updatedAt: string;
    approvedAt: string | null;

    client: { id: string; name: string } | null;
    serviceLine: { id: string; name: string } | null;
    businessUnit: { id: string; name: string } | null;
  };
  candidateStats: CandidateStats;
  permissions: { canEdit: boolean; canDelete: boolean };
}

interface PipelineResponse {
  success: boolean;
  data: PipelineCandidate[];
  candidateStats: CandidateStats;
  pipelineStages: PipelineStage[];
  requirement: {
    id: string;
    reqCode: string;
    title: string;
    serviceLine: any;
    description: string;
  };
  meta: { total: number; page: number; limit: number; pages: number };
  permissions: { canEdit: boolean; canDelete: boolean };
}

// Only two row-level actions now — everything else lives inside the details modal.
type ActionType = 'move' | 'details' | null;

// ─────────────────────────────────────────────────────────────────────────────
// STAGE COLOURS
// ─────────────────────────────────────────────────────────────────────────────
const STAGE_COLORS: Record<
  string,
  {
    bg: string;
    text: string;
    dot: string;
    border: string;
    bar: string;
    header: string;
  }
> = {
  '01': {
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    dot: 'bg-slate-500',
    border: 'border-slate-300',
    bar: 'bg-slate-400',
    header: 'text-slate-600',
  },
  '02': {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    dot: 'bg-blue-500',
    border: 'border-blue-300',
    bar: 'bg-blue-500',
    header: 'text-blue-600',
  },
  '03': {
    bg: 'bg-indigo-50',
    text: 'text-indigo-800',
    dot: 'bg-indigo-500',
    border: 'border-indigo-300',
    bar: 'bg-indigo-500',
    header: 'text-indigo-600',
  },
  '04': {
    bg: 'bg-violet-50',
    text: 'text-violet-800',
    dot: 'bg-violet-500',
    border: 'border-violet-300',
    bar: 'bg-violet-500',
    header: 'text-violet-600',
  },
  '05': {
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    dot: 'bg-purple-500',
    border: 'border-purple-300',
    bar: 'bg-purple-500',
    header: 'text-purple-600',
  },
  '06': {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    dot: 'bg-amber-500',
    border: 'border-amber-300',
    bar: 'bg-amber-500',
    header: 'text-amber-600',
  },
  '7B': {
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    dot: 'bg-orange-500',
    border: 'border-orange-300',
    bar: 'bg-orange-500',
    header: 'text-orange-600',
  },
  '8B': {
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    dot: 'bg-rose-500',
    border: 'border-rose-300',
    bar: 'bg-rose-500',
    header: 'text-rose-600',
  },
  '9B': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    dot: 'bg-emerald-500',
    border: 'border-emerald-300',
    bar: 'bg-emerald-500',
    header: 'text-emerald-600',
  },
  '10B': {
    bg: 'bg-green-100',
    text: 'text-green-900',
    dot: 'bg-green-600',
    border: 'border-green-400',
    bar: 'bg-green-600',
    header: 'text-green-700',
  },
};

const SC = (code: string) => STAGE_COLORS[code] ?? STAGE_COLORS['01'];

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

const formatMins = (mins: number | null) => {
  if (!mins || mins === 0) return '—';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return `${Math.floor(d / 30)}mo`;
};

const formatCtc = (val: number | null | undefined) =>
  val != null ? `₹${(val / 100000).toFixed(1)}L` : '—';

const formatDate = (d: string | null | undefined) => (d ? format(new Date(d), 'dd MMM yy') : '—');

// "OFFER_IN_PROGRESS" → "Offer In Progress" — used for the dynamic canonical-stage chips
const humanizeCanonical = (key: string) =>
  key
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

const PORTAL_APPS = [
  {
    appName: 'NAUKRI',
    displayName: 'Naukri',
    url: 'https://resdex.naukri.com',
    bg: 'bg-orange-100',
    short: 'N',
    color: 'text-orange-700',
    desc: 'Source from Naukri Resdex',
  },
  {
    appName: 'LINKEDIN',
    displayName: 'LinkedIn',
    url: 'https://www.linkedin.com/talent/home',
    bg: 'bg-blue-100',
    short: 'in',
    color: 'text-blue-800',
    desc: 'Source from LinkedIn Recruiter',
  },
  {
    appName: 'FOUNDIT',
    displayName: 'Foundit',
    url: 'https://www.foundit.in/recruiter',
    bg: 'bg-purple-100',
    short: 'F',
    color: 'text-purple-700',
    desc: 'Source from Foundit (Monster)',
  },
];

function triggerExtension(
  rId: string,
  rCode: string,
  rTitle: string,
  app: string,
  assignmentId: string
) {
  window.postMessage(
    {
      type: 'TALENTOX_SOURCE_NAUKRI',
      requirementId: rId,
      requirementCode: rCode,
      requirementTitle: rTitle,
      appName: app,
      assignmentId,
    },
    window.location.origin
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT CHIP — small reusable header metric
// ─────────────────────────────────────────────────────────────────────────────

function StatChip({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <span className={`text-3xl font-black tabular-nums leading-none ${colorClass}`}>{value}</span>
      <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
        {label}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// JD TAB — SKILL PILL + DETAIL ROW
// ─────────────────────────────────────────────────────────────────────────────

function SkillPill({ text, variant }: { text: string; variant: 'primary' | 'key' }) {
  const styles =
    variant === 'primary'
      ? 'bg-rose-50 text-rose-600 border-rose-100'
      : 'bg-blue-50 text-blue-600 border-blue-100';
  return (
    <span
      className={`inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-full border ${styles}`}
    >
      {text}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-center py-3.5 border-b border-slate-100 last:border-0">
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </span>
      <span className="text-sm font-semibold text-slate-800">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD RESUME MODAL  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function UploadResumeModal({
  open,
  onClose,
  req,
  assignmentId,
}: {
  open: boolean;
  onClose: () => void;
  req: any;
  assignmentId: string;
}) {
  const axios = useAxios();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const ALLOWED = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/rtf',
    'text/rtf',
  ];

  const mut = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file selected');
      const form = new FormData();
      form.append('file', file, file.name);
      form.append('fileName', file.name);
      form.append('mimeType', file.type);
      form.append('requirementId', req.id);
      form.append('reqCode', req.reqCode);
      form.append('assignmentId', assignmentId);
      return axios.post('/candidate/api/resume/ingest', form, {
        baseURL: '/api/proxy',
        withCredentials: true,
        headers: { 'Content-Type': undefined },
        transformRequest: data => data,
      });
    },
    onSuccess: () => {
      toast.success('Resume uploaded and parsed successfully');
      qc.invalidateQueries({ queryKey: ['assignment-pipeline'] });
      onClose();
      setFile(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Upload failed'),
  });

  const handleFile = (f: File) => {
    if (!ALLOWED.includes(f.type)) {
      toast.error('Invalid file type. Only PDF, DOCX, DOC, RTF allowed.');
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      toast.error('File too large. Max 20MB.');
      return;
    }
    setFile(f);
  };

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        if (!v) {
          onClose();
          setFile(null);
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <FileText className="w-4 h-4 text-emerald-600" /> Upload Resume
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-xs font-bold text-slate-500 font-mono">{req.reqCode}</span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-semibold text-slate-700 truncate">{req.title}</span>
          </div>
          <div
            onDragOver={e => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            className={`relative border-2 border-dashed rounded-xl transition-colors cursor-pointer ${dragOver ? 'border-primary bg-primary/5' : file ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300 bg-slate-50'}`}
            onClick={() => document.getElementById('resume-file-input-assign')?.click()}
          >
            <input
              id="resume-file-input-assign"
              type="file"
              accept=".pdf,.docx,.doc,.rtf"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              {file ? (
                <>
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-3">
                    <FileText className="w-6 h-6 text-emerald-600" />
                  </div>
                  <p className="text-sm font-bold text-emerald-800 truncate max-w-60">
                    {file.name}
                  </p>
                  <p className="text-xs text-emerald-600 mt-1">
                    {(file.size / 1024).toFixed(0)} KB · Click to change
                  </p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                    <FileText className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    Drop resume here or <span className="text-primary">browse</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">.pdf, .docx, .doc, .rtf · Max 20 MB</p>
                </>
              )}
            </div>
          </div>
          {mut.isPending && (
            <div className="flex items-center gap-2 text-sm text-slate-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />
              <span>Uploading and parsing with AI...</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              setFile(null);
            }}
            disabled={mut.isPending}
          >
            Cancel
          </Button>
          <Button disabled={!file || mut.isPending} onClick={() => mut.mutate()} className="gap-2">
            {mut.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Parsing...
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5" />
                Upload & Parse
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkUploadModal({
  open,
  onClose,
  req,
  assignmentId,
}: {
  open: boolean;
  onClose: () => void;
  req: { id: string; reqCode: string; title: string };
  assignmentId: string;
}) {
  const axios = useAxios();
  const qc = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const ALLOWED = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/rtf',
    'text/rtf',
  ];
  const MAX_FILES = 100;
  const MAX_MB = 20;

  function extBadge(name: string) {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'bg-rose-100 text-rose-700';
    if (ext === 'docx' || ext === 'doc') return 'bg-blue-100 text-blue-700';
    return 'bg-slate-100 text-slate-600';
  }

  function addFiles(incoming: FileList | File[]) {
    const valid: File[] = [];
    for (const f of Array.from(incoming)) {
      if (!ALLOWED.includes(f.type)) {
        toast.error(`${f.name}: unsupported type`);
        continue;
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        toast.error(`${f.name}: exceeds ${MAX_MB}MB`);
        continue;
      }
      valid.push(f);
    }
    setFiles(prev => {
      const combined = [...prev, ...valid];
      if (combined.length > MAX_FILES) {
        toast.warning(`Max ${MAX_FILES} files — extras removed`);
        return combined.slice(0, MAX_FILES);
      }
      return combined;
    });
  }

  function removeFile(idx: number) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleUpload() {
    if (!files.length || isUploading) return;
    setIsUploading(true);
    try {
      const form = new FormData();
      // multer field name must match uploadBulk's configured field name
      files.forEach(f => form.append('files', f, f.name));
      form.append('reqCode', req.reqCode);
      form.append('requirementId', req.id);
      form.append('assignmentId', assignmentId);

      const res = await axios.post('/candidate/api/resume/ingest/bulk', form, {
        baseURL: '/api/proxy',
        withCredentials: true,
        headers: { 'Content-Type': undefined },
        transformRequest: (data: any) => data,
      });

      setResult(res.data);
      // Refresh the pipeline table — some candidates may now appear
      qc.invalidateQueries({ queryKey: ['assignment-pipeline'] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Bulk upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  function handleClose() {
    if (isUploading) return; // block closing while processing
    setFiles([]);
    setResult(null);
    onClose();
  }

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-slate-900">
            <span className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
              <Files className="w-4 h-4 text-violet-700" />
            </span>
            {result
              ? 'Upload Complete'
              : isUploading
                ? 'Processing Resumes…'
                : 'Bulk Upload Resumes'}
          </DialogTitle>
          {!result && !isUploading && (
            <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-xs font-bold text-slate-500 font-mono">{req.reqCode}</span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-semibold text-slate-700 truncate">{req.title}</span>
            </div>
          )}
        </DialogHeader>

        {/* ════ PHASE: uploading ════════════════════════════════════════════ */}
        {isUploading && (
          <div className="flex flex-col items-center justify-center py-16 px-8 gap-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">
                Processing {files.length} resume{files.length !== 1 ? 's' : ''}…
              </p>
              <p className="text-sm text-slate-500 mt-1">
                AI parsing, dedup checks, and profile creation in progress
              </p>
              <p className="text-xs text-slate-400 mt-3">
                Processing {Math.ceil(files.length / 5)} batch
                {Math.ceil(files.length / 5) !== 1 ? 'es' : ''} of 5 — please wait
              </p>
            </div>
            <div className="flex flex-col items-start gap-2.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 w-full max-w-xs">
              {[
                'Extracting text from each file',
                'Parsing with AI (parallel)',
                'Checking for duplicates',
                'Creating candidate profiles',
              ].map(step => (
                <span key={step} className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse shrink-0" />
                  {step}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ════ PHASE: results ════════════════════════════════════════════════ */}
        {result && !isUploading && (
          <div className="flex flex-col">
            {/* Summary bar */}
            <div className="grid grid-cols-4 divide-x divide-slate-200 border-b border-slate-200">
              {[
                { label: 'Total', value: result.summary.total, color: 'text-slate-800' },
                {
                  label: 'Succeeded',
                  value: result.summary.succeeded,
                  color: 'text-emerald-600',
                },
                {
                  label: 'Duplicates',
                  value: result.summary.duplicates,
                  color: 'text-amber-600',
                },
                { label: 'Failed', value: result.summary.failed, color: 'text-rose-600' },
              ].map(s => (
                <div key={s.label} className="flex flex-col items-center gap-1 py-4 bg-slate-50">
                  <span className={`text-2xl font-black tabular-nums ${s.color}`}>{s.value}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Per-file results table */}
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white border-b border-slate-100">
                  <tr>
                    <th className="w-8 px-4 py-2" />
                    <th className="text-left px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      File
                    </th>
                    <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 w-44">
                      Candidate / Note
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.results.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        {r.status === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : r.status === 'duplicate' ? (
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-500" />
                        )}
                      </td>
                      <td className="px-2 py-3">
                        <p className="text-xs font-medium text-slate-700 truncate max-w-72">
                          {r.fileName}
                        </p>
                        {r.email && (
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">{r.email}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.status === 'success' && r.candidateName ? (
                          <span className="text-xs font-semibold text-slate-800">
                            {r.candidateName}
                          </span>
                        ) : r.status === 'duplicate' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            Duplicate
                          </span>
                        ) : (
                          <span
                            className="text-xs text-rose-600 truncate block max-w-40"
                            title={r.error}
                          >
                            {r.error ?? 'Parse failed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs text-slate-400">
                Completed in {(result.summary.durationMs / 1000).toFixed(1)}s
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFiles([]);
                    setResult(null);
                  }}
                >
                  Upload more
                </Button>
                <Button size="sm" onClick={handleClose}>
                  Done
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ════ PHASE: file selection ══════════════════════════════════════════ */}
        {!result && !isUploading && (
          <>
            <div className="px-6 py-4 space-y-4">
              {/* Drop zone */}
              <div
                onDragOver={e => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault();
                  setDragOver(false);
                  addFiles(e.dataTransfer.files);
                }}
                onClick={() => document.getElementById('bulk-file-input')?.click()}
                className={`relative border-2 border-dashed rounded-xl cursor-pointer transition-colors text-center py-8 px-6 ${
                  dragOver
                    ? 'border-primary bg-primary/5'
                    : files.length > 0
                      ? 'border-violet-300 bg-violet-50/40'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                }`}
              >
                <input
                  id="bulk-file-input"
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.rtf"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files) {
                      addFiles(e.target.files);
                      // reset so the same file can be re-added after removal
                      e.target.value = '';
                    }
                  }}
                />
                <Files
                  className={`w-8 h-8 mx-auto mb-3 ${files.length > 0 ? 'text-violet-500' : 'text-slate-400'}`}
                />
                <p className="text-sm font-semibold text-slate-700">
                  Drop resumes here or <span className="text-primary">browse</span>
                </p>
                <p className="text-xs text-slate-400 mt-1.5">
                  .pdf · .docx · .doc · .rtf &nbsp;·&nbsp; max {MAX_MB}MB each &nbsp;·&nbsp; up to{' '}
                  {MAX_FILES} files
                </p>
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      {files.length} file{files.length !== 1 ? 's' : ''} selected
                    </p>
                    <button
                      onClick={() => setFiles([])}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-700 transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-0.5">
                    {files.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg group"
                      >
                        {/* Extension badge */}
                        <span
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0 ${extBadge(f.name)}`}
                        >
                          {f.name.split('.').pop()?.toUpperCase().slice(0, 4)}
                        </span>

                        {/* Name + size */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{f.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {f.size > 1024 * 1024
                              ? `${(f.size / (1024 * 1024)).toFixed(1)} MB`
                              : `${Math.round(f.size / 1024)} KB`}
                          </p>
                        </div>

                        {/* Remove */}
                        <button
                          onClick={() => removeFile(i)}
                          className="text-slate-300 hover:text-rose-500 transition-colors p-1 rounded opacity-0 group-hover:opacity-100"
                          title="Remove"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="px-6 py-4 border-t border-slate-100">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                disabled={!files.length}
                onClick={handleUpload}
                className="gap-2 min-w-44 bg-violet-600 hover:bg-violet-700"
              >
                <Files className="w-3.5 h-3.5" />
                {files.length > 0
                  ? `Upload ${files.length} resume${files.length !== 1 ? 's' : ''}`
                  : 'Select files first'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD CANDIDATE MODAL  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function AddCandidateModal({
  open,
  onClose,
  req,
  assignmentId,
}: {
  open: boolean;
  onClose: () => void;
  req: any;
  assignmentId: string;
}) {
  const [portalExpanded, setPortalExpanded] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 w-full max-w-110 rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <UserPlus className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Add Candidate</h2>
                <p className="text-xs text-slate-500 mt-0.5">Choose how to source</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-3 py-3 space-y-1">
            {[
              {
                iconBg: 'bg-rose-100',
                icon: <Pencil className="w-4 h-4 text-rose-600" />,
                title: 'Enter Manually',
                desc: 'Type in candidate details',
              },
              {
                iconBg: 'bg-emerald-100',
                icon: <FileText className="w-4 h-4 text-emerald-700" />,
                title: 'Upload Resume',
                desc: 'PDF parsed with AI instantly',
                onClickOverride: () => setUploadOpen(true),
              },
              {
                iconBg: 'bg-violet-100',
                icon: <Files className="w-4 h-4 text-violet-700" />,
                title: 'Bulk Upload',
                desc: 'Upload multiple resumes at once',
                onClickOverride: () => setBulkUploadOpen(true),
              },
              {
                iconBg: 'bg-blue-100',
                icon: <Database className="w-4 h-4 text-blue-600" />,
                title: 'From Database',
                desc: 'Search existing candidate pool',
              },
            ].map(row => (
              <button
                key={row.title}
                onClick={(row as any).onClickOverride ?? onClose}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-slate-50 transition-colors text-left group"
              >
                <div
                  className={`w-10 h-10 rounded-xl ${row.iconBg} flex items-center justify-center shrink-0`}
                >
                  {row.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{row.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{row.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0" />
              </button>
            ))}
            <div>
              <button
                onClick={() => setPortalExpanded(v => !v)}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-slate-50 transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4 text-amber-700" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-slate-900">Portal Recruit</p>
                  <p className="text-xs text-slate-500 mt-0.5">Source directly from job boards</p>
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${portalExpanded ? 'border-primary bg-primary text-white' : 'border-slate-300 text-slate-500'}`}
                >
                  {portalExpanded ? '−' : '+'}
                </div>
              </button>
              {portalExpanded && (
                <div className="ml-14 pl-4 border-l-2 border-slate-100 py-1 space-y-0.5">
                  {PORTAL_APPS.map(app => (
                    <a
                      key={app.appName}
                      href={app.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        triggerExtension(req.id, req.reqCode, req.title, app.appName, assignmentId);
                        onClose();
                      }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 no-underline group"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg ${app.bg} flex items-center justify-center shrink-0`}
                      >
                        <span className={`text-xs font-bold ${app.color}`}>{app.short}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">{app.displayName}</p>
                        <p className="text-xs text-slate-500">{app.desc}</p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <UploadResumeModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        req={req}
        assignmentId={assignmentId}
      />
      <BulkUploadModal
        open={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        req={req}
        assignmentId={assignmentId}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOVE STAGE DIALOG  (unchanged — already does exactly one job well)
// ─────────────────────────────────────────────────────────────────────────────

function MoveStageDialog({
  pipeline,
  stages,
  open,
  onClose,
  onDone,
}: {
  pipeline: PipelineCandidate;
  stages: PipelineStage[];
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const axios = useAxios();
  const [stageId, setStageId] = useState('');
  const [note, setNote] = useState('');

  const currentOrder = pipeline.currentStage.order;

  const selectableStages = useMemo(
    () => [...stages].filter(s => !s.isTerminal).sort((a, b) => a.order - b.order),
    [stages]
  );

  const selected = stages.find(s => s.id === stageId) ?? null;
  const cc = SC(pipeline.currentStage.code);
  const tc = selected ? SC(selected.code) : null;

  const reset = () => {
    setStageId('');
    setNote('');
  };

  const mut = useMutation({
    mutationFn: async () =>
      axios.patch(`/pipeline/${pipeline.id}/stage`, { stageId, note: note.trim() || undefined }),
    onSuccess: () => {
      toast.success(`Moved to ${selected?.label}`);
      onDone();
      onClose();
      reset();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to move stage'),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        if (!v) {
          onClose();
          reset();
        }
      }}
    >
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-slate-900">
              <span className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                <ArrowUpDown className="w-4 h-4 text-indigo-600" />
              </span>
              Move Stage
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3 mt-3">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className={`text-xs font-bold ${avatarColor(pipeline.snapshot.id)}`}>
                {initials(pipeline.snapshot.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">
                {pipeline.snapshot.fullName}
              </p>
              {(pipeline.snapshot.currentTitle || pipeline.snapshot.currentCompany) && (
                <p className="text-xs text-slate-500 truncate">
                  {pipeline.snapshot.currentTitle}
                  {pipeline.snapshot.currentTitle && pipeline.snapshot.currentCompany ? ' · ' : ''}
                  {pipeline.snapshot.currentCompany}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-100">
          <div className="flex items-end gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                From
              </p>
              <span
                className={`inline-flex items-center gap-2 max-w-full text-sm font-bold px-3 py-1.5 rounded-lg border ${cc.bg} ${cc.text} ${cc.border}`}
              >
                <span className={`w-2 h-2 rounded-full ${cc.dot} shrink-0`} />
                <span className="truncate">{pipeline.currentStage.label}</span>
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 shrink-0 mb-1.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                To
              </p>
              {selected && tc ? (
                <span
                  className={`inline-flex items-center gap-2 max-w-full text-sm font-bold px-3 py-1.5 rounded-lg border ${tc.bg} ${tc.text} ${tc.border}`}
                >
                  <span className={`w-2 h-2 rounded-full ${tc.dot} shrink-0`} />
                  <span className="truncate">{selected.label}</span>
                </span>
              ) : (
                <span className="inline-flex items-center text-sm font-medium px-3 py-1.5 rounded-lg border border-dashed border-slate-300 text-slate-400">
                  Select a stage
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 max-h-[44vh] overflow-y-auto">
          <div className="space-y-1">
            {selectableStages.map(s => {
              const c = SC(s.code);
              const isCurrent = s.id === pipeline.currentStage.id;
              const isSelected = s.id === stageId;
              const isPast = s.order < currentOrder;
              return (
                <button
                  key={s.id}
                  disabled={isCurrent}
                  onClick={() => setStageId(s.id)}
                  className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                    isCurrent
                      ? 'border-slate-200 bg-slate-50 cursor-default'
                      : isSelected
                        ? `${c.border} ${c.bg} ring-2 ring-primary/30`
                        : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 border-2 ${
                      isCurrent || isSelected
                        ? `${c.dot} text-white border-transparent`
                        : isPast
                          ? 'bg-white text-slate-400 border-slate-200'
                          : 'bg-white text-slate-500 border-slate-300'
                    }`}
                  >
                    {s.order}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-bold leading-tight truncate ${isCurrent ? 'text-slate-500' : 'text-slate-900'}`}
                    >
                      {s.label}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.isMandatory ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-400'}`}
                      >
                        {s.isMandatory ? 'Mandatory' : 'Optional'}
                      </span>
                      {s.canonicalStage && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-500">
                          {humanizeCanonical(s.canonicalStage)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {isCurrent ? (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded-full">
                        Current
                      </span>
                    ) : isSelected ? (
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center ${c.dot} text-white`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wide ${isPast ? 'text-amber-500' : 'text-slate-300'}`}
                      >
                        {isPast ? 'Back' : 'Ahead'}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 space-y-3">
          <div>
            <Label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5 block">
              Note{' '}
              <span className="font-normal lowercase tracking-normal text-slate-400">
                (optional)
              </span>
            </Label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add context for this move…"
              rows={2}
              className="resize-none text-sm"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onClose();
                reset();
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!stageId || mut.isPending}
              onClick={() => mut.mutate()}
              className="gap-2 min-w-32.5"
            >
              {mut.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowUpDown className="w-3.5 h-3.5" />
              )}
              {mut.isPending ? 'Moving…' : 'Move Stage'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CANDIDATE DETAILS MODAL — replaces SubmitDialog / OfferDialog / SimpleActionDialog
// One place: Submission, Offer & CTC, Joining, Status (hold / withdraw / reject)
// ─────────────────────────────────────────────────────────────────────────────

type DetailTab = 'submission' | 'offer' | 'joining' | 'status';

function CandidateDetailsModal({
  pipeline,
  open,
  onClose,
  onDone,
}: {
  pipeline: PipelineCandidate;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const axios = useAxios();
  const [tab, setTab] = useState<DetailTab>('submission');
  const snap = pipeline.snapshot;
  const isTerminated = pipeline.isRejected || pipeline.isWithdrawn;

  const TABS: { id: DetailTab; label: string; icon: React.ReactNode }[] = [
    { id: 'submission', label: 'Submission', icon: <Send className="w-3.5 h-3.5" /> },
    { id: 'offer', label: 'Offer & CTC', icon: <Wallet className="w-3.5 h-3.5" /> },
    { id: 'joining', label: 'Joining', icon: <CalendarCheck className="w-3.5 h-3.5" /> },
    { id: 'status', label: 'Status', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden">
        {/* HEADER — identity, always visible regardless of tab */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 shrink-0">
              <AvatarFallback className={`text-sm font-bold ${avatarColor(snap.id)}`}>
                {initials(snap.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 truncate">{snap.fullName}</h2>
                {pipeline.isRejected && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300">
                    Rejected
                  </span>
                )}
                {pipeline.isWithdrawn && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 border border-slate-300">
                    Withdrawn
                  </span>
                )}
                {pipeline.isOnHold && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300">
                    On Hold
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {snap.currentTitle}
                {snap.currentTitle && snap.currentCompany ? ' · ' : ''}
                {snap.currentCompany}
                {snap.email && <> &nbsp;·&nbsp; {snap.email}</>}
                {snap.phone && <> &nbsp;·&nbsp; {snap.phone}</>}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex">
          {/* TAB NAV */}
          <div className="w-40 shrink-0 border-r border-slate-100 py-2">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold transition-colors border-l-2 ${
                  tab === t.id
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-transparent text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB CONTENT */}
          <div className="flex-1 p-6 max-h-[55vh] overflow-y-auto">
            {tab === 'submission' && (
              <SubmissionTab pipeline={pipeline} axios={axios} onDone={onDone} onClose={onClose} />
            )}
            {tab === 'offer' && (
              <OfferCtcTab pipeline={pipeline} axios={axios} onDone={onDone} onClose={onClose} />
            )}
            {tab === 'joining' && (
              <JoiningTab pipeline={pipeline} axios={axios} onDone={onDone} onClose={onClose} />
            )}
            {tab === 'status' && (
              <StatusTab
                pipeline={pipeline}
                axios={axios}
                onDone={onDone}
                onClose={onClose}
                isTerminated={isTerminated}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Submission tab ──────────────────────────────────────────────────────────
function SubmissionTab({ pipeline, axios, onDone, onClose }: any) {
  const [note, setNote] = useState(pipeline.submissionNote ?? '');
  const mut = useMutation({
    mutationFn: async () =>
      axios.patch(`/pipeline/${pipeline.id}/submit`, { submissionNote: note || undefined }),
    onSuccess: () => {
      toast.success(pipeline.submittedAt ? 'Submission updated' : 'Submitted to client');
      onDone();
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });
  return (
    <div className="space-y-4">
      {pipeline.submittedAt ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-xs font-semibold text-blue-800">
          Submitted on {formatDate(pipeline.submittedAt)}
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs font-medium text-slate-500">
          Not submitted to client yet.
        </div>
      )}
      <div>
        <Label className="text-sm font-semibold text-slate-800 mb-2 block">Submission note</Label>
        <Textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Notes for the client..."
          rows={4}
          className="resize-none text-sm"
        />
      </div>
      <div className="flex justify-end">
        <Button disabled={mut.isPending} onClick={() => mut.mutate()} className="gap-2">
          {mut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {pipeline.submittedAt ? 'Update Submission' : 'Mark Submitted'}
        </Button>
      </div>
    </div>
  );
}

// ── Offer & CTC tab ─────────────────────────────────────────────────────────
function OfferCtcTab({ pipeline, axios, onDone, onClose }: any) {
  const [currentCtc, setCurrentCtc] = useState(pipeline.currentCtc?.toString() ?? '');
  const [expectedCtc, setExpectedCtc] = useState(pipeline.expectedCtc?.toString() ?? '');
  const [negotiatedCtc, setNegotiatedCtc] = useState(pipeline.negotiatedCtc?.toString() ?? '');
  const [ctcNotes, setCtcNotes] = useState(pipeline.ctcNotes ?? '');
  const [offeredCtc, setOfferedCtc] = useState(pipeline.offeredCtc?.toString() ?? '');
  const [salaryType, setSalaryType] = useState(pipeline.salaryType ?? 'MONTHLY');
  const [expectedJoiningDate, setExpectedJoiningDate] = useState(
    pipeline.expectedJoiningDate ? pipeline.expectedJoiningDate.slice(0, 10) : ''
  );

  // Guard: parseFloat('') === NaN which backend discards — use null instead
  const toNum = (v: string) => (v.trim() === '' ? null : parseFloat(v));

  const mut = useMutation({
    mutationFn: async () => {
      // Single call — merge CTC ladder + formal offer into /offer endpoint
      // because /details endpoint does not exist yet
      await axios.patch(`/pipeline/${pipeline.id}/offer`, {
        // CTC ladder
        currentCtc: toNum(currentCtc),
        expectedCtc: toNum(expectedCtc),
        negotiatedCtc: toNum(negotiatedCtc),
        ctcNotes: ctcNotes.trim() || null,
        // Formal offer (optional)
        ...(offeredCtc.trim() && {
          offeredCtc: toNum(offeredCtc),
          salaryCurrency: 'INR',
          salaryType,
        }),
        ...(expectedJoiningDate && { expectedJoiningDate }),
      });
    },
    onSuccess: () => {
      toast.success('Offer & CTC details saved');
      onDone();
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to save'),
  });

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">CTC Ladder</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">
              Current CTC (₹)
            </Label>
            <Input
              type="number"
              value={currentCtc}
              onChange={e => setCurrentCtc(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">
              Expected CTC (₹)
            </Label>
            <Input
              type="number"
              value={expectedCtc}
              onChange={e => setExpectedCtc(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">
              Negotiated CTC (₹)
            </Label>
            <Input
              type="number"
              value={negotiatedCtc}
              onChange={e => setNegotiatedCtc(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
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
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 mt-3">
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
              className="h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Salary Type</Label>
            <Select value={salaryType} onValueChange={setSalaryType}>
              <SelectTrigger className="h-9 text-sm">
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
            className="h-9 text-sm w-48"
          />
        </div>
        {pipeline.offerStatus && (
          <p className="text-xs text-slate-500 mt-2">
            Current offer status:{' '}
            <span className="font-semibold text-slate-700">{pipeline.offerStatus}</span>
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <Button
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

// ── Joining tab ──────────────────────────────────────────────────────────────
function JoiningTab({ pipeline, axios, onDone, onClose }: any) {
  const [lastWorkingDate, setLastWorkingDate] = useState(
    pipeline.lastWorkingDate ? pipeline.lastWorkingDate.slice(0, 10) : ''
  );
  const [actualJoiningDate, setActualJoiningDate] = useState(
    pipeline.actualJoiningDate ? pipeline.actualJoiningDate.slice(0, 10) : ''
  );

  const mut = useMutation({
    mutationFn: async () =>
      axios.patch(`/pipeline/${pipeline.id}/details`, {
        lastWorkingDate: lastWorkingDate || null,
        actualJoiningDate: actualJoiningDate || null,
      }),
    onSuccess: () => {
      toast.success('Joining details saved');
      onDone();
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to save'),
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">
            Last Working Day (current company)
          </Label>
          <Input
            type="date"
            value={lastWorkingDate}
            onChange={e => setLastWorkingDate(e.target.value)}
            className="h-9 text-sm"
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
            className="h-9 text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Expected Joining
          </p>
          <p className="text-sm font-semibold text-slate-700 mt-0.5">
            {formatDate(pipeline.expectedJoiningDate)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Days to Join
          </p>
          <p
            className={`text-sm font-semibold mt-0.5 ${pipeline.remainingDaysToJoin != null && pipeline.remainingDaysToJoin < 0 ? 'text-rose-600' : 'text-slate-700'}`}
          >
            {pipeline.remainingDaysToJoin != null ? pipeline.remainingDaysToJoin : '—'}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Month of Joining
          </p>
          <p className="text-sm font-semibold text-slate-700 mt-0.5">
            {pipeline.monthOfJoining ?? '—'}
          </p>
        </div>
      </div>
      <div className="flex justify-end">
        <Button disabled={mut.isPending} onClick={() => mut.mutate()} className="gap-2">
          {mut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save Joining Details
        </Button>
      </div>
    </div>
  );
}

// ── Status tab — hold / withdraw / reject, consolidated ────────────────────
function StatusTab({ pipeline, axios, onDone, onClose, isTerminated }: any) {
  const [active, setActive] = useState<'hold' | 'withdraw' | 'reject' | null>(null);
  const [reason, setReason] = useState('');

  const endpointFor = (a: string) =>
    a === 'hold'
      ? `/pipeline/${pipeline.id}/hold`
      : a === 'withdraw'
        ? `/pipeline/${pipeline.id}/withdraw`
        : `/pipeline/${pipeline.id}/reject`;
  const bodyKeyFor = (a: string) =>
    a === 'hold' ? 'onHoldReason' : a === 'withdraw' ? 'withdrawnReason' : 'rejectionReason';

  const mut = useMutation({
    mutationFn: async () =>
      axios.patch(endpointFor(active!), { [bodyKeyFor(active!)]: reason || undefined }),
    onSuccess: () => {
      toast.success('Status updated');
      onDone();
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });

  const ROWS = [
    {
      id: 'hold' as const,
      label: 'Put on Hold',
      icon: <PauseCircle className="w-4 h-4 text-amber-600" />,
      active: pipeline.isOnHold,
      reasonText: pipeline.onHoldReason,
      variant: 'amber',
    },
    {
      id: 'withdraw' as const,
      label: 'Withdraw',
      icon: <LogOut className="w-4 h-4 text-slate-600" />,
      active: pipeline.isWithdrawn,
      reasonText: pipeline.withdrawnReason,
      variant: 'default',
    },
    {
      id: 'reject' as const,
      label: 'Reject',
      icon: <XCircle className="w-4 h-4 text-rose-600" />,
      active: pipeline.isRejected,
      reasonText: pipeline.rejectionReason,
      variant: 'danger',
    },
  ];

  return (
    <div className="space-y-3">
      {isTerminated && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs font-medium text-slate-500">
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
            {row.active && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                Applied
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${active === row.id ? 'rotate-180' : ''}`}
            />
          </button>
          {row.active && row.reasonText && active !== row.id && (
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
// CANDIDATE TABLE — replaces the card list
// ─────────────────────────────────────────────────────────────────────────────

function CandidateTable({
  candidates,
  canEdit,
  requirementId,
  onAction,
}: {
  candidates: PipelineCandidate[];
  canEdit: boolean;
  requirementId: string;
  onAction: (a: ActionType, p: PipelineCandidate) => void;
}) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
          <tr>
            {/* <th className="w-9 px-3 py-2.5">
              <input type="checkbox" className="rounded border-slate-400 w-3.5 h-3.5" />
            </th> */}
            <th className="w-20 px-3 py-2.5 font-bold text-[10px] uppercase tracking-wide text-slate-700 text-center">
              Actions
            </th>
            <th className="text-left px-3 py-2.5 font-bold text-[10px] uppercase tracking-wide text-slate-700 min-w-57.5">
              Candidate
            </th>
            <th className="text-left px-3 py-2.5 font-bold text-[10px] uppercase tracking-wide text-slate-700 min-w-35">
              Stage
            </th>
            <th className="text-left px-3 py-2.5 font-bold text-[10px] uppercase tracking-wide text-slate-700 min-w-32.5">
              Recruiter
            </th>
            <th className="text-left px-3 py-2.5 font-bold text-[10px] uppercase tracking-wide text-slate-700 min-w-37.5">
              CTC (Cur / Exp / Neg / Offered)
            </th>
            <th className="text-left px-3 py-2.5 font-bold text-[10px] uppercase tracking-wide text-slate-700 min-w-35">
              Joining
            </th>
            {/* <th className="text-left px-3 py-2.5 font-bold text-[10px] uppercase tracking-wide text-slate-500 min-w-32.5">
              Status
            </th> */}
            <th className="text-left px-3 py-2.5 font-bold text-[10px] uppercase tracking-wide text-slate-500 min-w-22.5">
              Aging
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {candidates.map(p => {
            const snap = p.snapshot;
            const c = SC(p.currentStage.code);
            const isTerminated = p.isRejected || p.isWithdrawn;
            const agingColor =
              p.aging.minutes > 43200
                ? 'text-rose-600 bg-rose-50 border-rose-200'
                : p.aging.minutes > 10080
                  ? 'text-amber-600 bg-amber-50 border-amber-200'
                  : 'text-slate-600 bg-slate-50 border-slate-200';

            return (
              <tr
                key={p.id}
                // onClick={() => router.push(`/candidates/${p.snapshot.candidateServiceId}`)}
                className={`hover:bg-blue-50/30 transition-colors ${isTerminated ? 'opacity-50' : ''}`}
              >
                {/* <td className="px-3 py-3 align-top">
                  <input type="checkbox" className="rounded border-slate-400 w-3.5 h-3.5" />
                </td> */}

                {/* Actions — only Move Stage + Edit Details */}
                <td className="px-3 py-3 align-top">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      title="Open in requirement"
                      onClick={() =>
                        router.push(`/requirements/${requirementId}?pipelineId=${p.id}`)
                      }
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    {canEdit && (
                      <>
                        {!isTerminated && (
                          <button
                            title="Move Stage"
                            onClick={() => onAction('move', p)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-700 hover:bg-indigo-100 transition-colors"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          title="Update Candidate Details"
                          onClick={() => onAction('details', p)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-700 hover:bg-emerald-100 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>

                {/* Candidate */}
                <td className="px-3 py-3 align-top">
                  <div className="flex items-start gap-2.5">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className={`text-xs font-bold ${avatarColor(snap.id)}`}>
                        {initials(snap.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <Link href={`/candidates/${snap.candidateServiceId}`}>
                        <p className="text-sm font-bold text-slate-900 leading-tight truncate">
                          {snap.fullName}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {snap.currentTitle}
                          {snap.currentTitle && snap.currentCompany ? ' · ' : ''}
                          {snap.currentCompany}
                        </p>
                      </Link>
                      <div className="flex items-center gap-2.5 mt-1 text-[11px] text-slate-600">
                        {snap.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3 shrink-0" />
                            {snap.email}
                          </span>
                        )}
                        {snap.phone && (
                          <span className="flex items-center gap-1 shrink-0">
                            <Phone className="w-3 h-3" />
                            {snap.phone}
                          </span>
                        )}
                      </div>
                      {snap.totalExpYears != null && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                          <Briefcase className="w-3 h-3" />
                          {Math.floor(snap.totalExpYears)}y{' '}
                          {Math.round((snap.totalExpYears % 1) * 12)}m exp
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Stage */}
                <td className="px-3 py-3 align-top">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${c.bg} ${c.text} ${c.border}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot} shrink-0`} />
                    {p.currentStage.label}
                  </span>
                  {p.stageHistory.length > 0 && (
                    <p className="text-[10px] text-slate-400 mt-1">{p.stageHistory.length} moves</p>
                  )}
                </td>

                {/* Recruiter */}
                <td className="px-3 py-3 align-top text-xs font-semibold text-slate-700">
                  {p.recruiter.firstName} {p.recruiter.lastName}
                  <p className="text-[10px] font-normal text-slate-400 mt-0.5">
                    {format(new Date(p.stageUpdatedAt), 'dd MMM yyyy')}
                  </p>
                </td>

                {/* CTC ladder */}
                <td className="px-3 py-3 align-top">
                  <div className="space-y-0.5 text-[11px]">
                    <p className="text-slate-500">
                      Cur:{' '}
                      <span className="font-semibold text-slate-700">
                        {formatCtc(p.currentCtc)}
                      </span>
                    </p>
                    <p className="text-slate-500">
                      Exp:{' '}
                      <span className="font-semibold text-slate-700">
                        {formatCtc(p.expectedCtc)}
                      </span>
                    </p>
                    <p className="text-slate-500">
                      Neg:{' '}
                      <span className="font-semibold text-slate-700">
                        {formatCtc(p.negotiatedCtc)}
                      </span>
                    </p>
                    {p.offeredCtc != null && (
                      <p className="text-violet-600 font-bold">
                        Offered: {formatCtc(p.offeredCtc)}
                      </p>
                    )}
                  </div>
                </td>

                {/* Joining */}
                <td className="px-3 py-3 align-top text-[11px] text-slate-500 space-y-0.5">
                  <p>
                    Exp:{' '}
                    <span className="font-semibold text-slate-700">
                      {formatDate(p.expectedJoiningDate)}
                    </span>
                  </p>
                  <p>
                    Act:{' '}
                    <span className="font-semibold text-slate-700">
                      {formatDate(p.actualJoiningDate)}
                    </span>
                  </p>
                  {p.remainingDaysToJoin != null && (
                    <p
                      className={
                        p.remainingDaysToJoin < 0 ? 'text-rose-600 font-semibold' : 'text-slate-400'
                      }
                    >
                      {p.remainingDaysToJoin < 0
                        ? `${Math.abs(p.remainingDaysToJoin)}d overdue`
                        : `in ${p.remainingDaysToJoin}d`}
                    </p>
                  )}
                </td>

                {/* Status pills */}
                {/* <td className="px-3 py-3 align-top">
                  <div className="flex flex-col gap-1 items-start">
                    {p.submittedAt && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                        Submitted
                      </span>
                    )}
                    {p.offerStatus && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">
                        {p.offerStatus}
                      </span>
                    )}
                    {p.isOnHold && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                        On Hold
                      </span>
                    )}
                    {p.isRejected && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                        Rejected
                      </span>
                    )}
                    {p.isWithdrawn && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                        Withdrawn
                      </span>
                    )}
                    {!p.submittedAt &&
                      !p.offerStatus &&
                      !p.isOnHold &&
                      !p.isRejected &&
                      !p.isWithdrawn && <span className="text-[10px] text-slate-300">—</span>}
                  </div>
                </td> */}

                {/* Aging */}
                <td className="px-3 py-3 align-top">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full border ${agingColor}`}
                  >
                    <Clock className="w-3 h-3" />
                    {p.aging.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE SKELETON  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="border-b p-6 flex gap-4 min-h-25">
        <div className="flex flex-col gap-3 flex-1">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-8 w-40 mt-1" />
        </div>
        <div className="flex gap-4 items-center">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-16 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="flex-1 divide-y divide-slate-100">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-6 py-5">
            <Skeleton className="h-11 w-11 rounded-full shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const axios = useAxios();
  const qc = useQueryClient();
  // const [tab, setTab] = useState('candidate');

  const VALID_TABS = ['candidates', 'jd'] as const;
  const tabFromUrl = searchParams.get('tab');
  const tab = VALID_TABS.includes(tabFromUrl as any) ? (tabFromUrl as string) : 'jd';

  const setTab = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (!searchParams.get('tab')) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', 'candidates');
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [activeOnly, setActiveOnly] = useState(true);
  const [search, setSearch] = useState('');
  const [addModal, setAddModal] = useState(false);
  const [actionDialog, setActionDialog] = useState<{
    type: ActionType;
    pipeline: PipelineCandidate;
  } | null>(null);

  const { data: assignmentData, isLoading: assignmentLoading } = useQuery({
    queryKey: ['assignment-detail', id],
    queryFn: async () => {
      const res = await axios.get(`/assignments/${id}`);
      return res.data as {
        data: AssignmentDetail;
        permissions: { canEdit: boolean; canDelete: boolean };
      };
    },
    enabled: !!id,
  });

  const pipelineParams = useMemo(() => {
    const p = new URLSearchParams();
    if (activeStageId) p.set('stageId', activeStageId);
    if (activeOnly) p.set('activeOnly', 'true');
    if (search.trim()) p.set('search', search.trim());
    p.set('limit', '50');
    return p.toString();
  }, [activeStageId, activeOnly, search]);

  const {
    data: pipelineData,
    isLoading: pipelineLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['assignment-pipeline', id, pipelineParams],
    queryFn: async () => {
      const res = await axios.get(`/assignments/${id}/pipeline?${pipelineParams}`);
      return res.data as PipelineResponse;
    },
    enabled: !!id,
    placeholderData: prev => prev,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // IMPORTANT: this useMemo MUST run on every single render, including the
  // loading-skeleton render and the "assignment not found" render below.
  // That's why it lives here — above both early `return`s — instead of after
  // them. Hooks can never be skipped conditionally (Rules of Hooks), so all
  // its inputs are read defensively via optional chaining instead of from
  // the `a` / `stats` / `pipelineStages` constants (which aren't declared
  // yet at this point in the component).
  // ─────────────────────────────────────────────────────────────────────────
  const canonicalChips = useMemo(() => {
    const stats = pipelineData?.candidateStats ?? assignmentData?.data?.candidateStats;
    const stages = pipelineData?.pipelineStages ?? [];
    const source = stats?.byPipelineStage ?? [];
    if (!source.length || !stages.length) return [];
    const stageMeta = new Map(stages.map(s => [s.id, s]));
    const counts: Record<string, number> = {};
    const repStage: Record<string, PipelineStage> = {};
    for (const row of source) {
      const meta = stageMeta.get(row.id);
      const canon = meta?.canonicalStage;
      if (!canon) continue;
      if (!(canon in counts)) {
        counts[canon] = 0;
        repStage[canon] = meta!;
      } else if (meta!.order < repStage[canon].order) {
        repStage[canon] = meta!;
      }
      counts[canon] += row.count;
    }
    return Object.keys(counts)
      .sort((x, y) => repStage[x].order - repStage[y].order)
      .map(key => ({
        key,
        label: humanizeCanonical(key),
        value: counts[key],
        color: SC(repStage[key].code),
      }));
  }, [pipelineData, assignmentData]);

  const invalidateAfterAction = () => {
    qc.invalidateQueries({ queryKey: ['assignment-pipeline', id] });
    qc.invalidateQueries({ queryKey: ['assignment-detail', id] });
  };

  if (assignmentLoading) return <PageSkeleton />;

  const a = assignmentData?.data;
  if (!a) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="w-10 h-10 text-rose-400" />
        <p className="text-base font-medium text-slate-600">Assignment not found.</p>
        <Button variant="ghost" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  const req = a.requirement;
  const canEdit = pipelineData?.permissions?.canEdit ?? false;
  const stats = pipelineData?.candidateStats ?? a.candidateStats;
  const candidates = pipelineData?.data ?? [];
  const meta = pipelineData?.meta;
  const pipelineStages = pipelineData?.pipelineStages ?? [];
  const sidebarStages = a.candidateStats?.byPipelineStage ?? [];
  const isBreached = !!a.breachedAt || !!req.isRespondByBreached;
  const reqForModal = pipelineData?.requirement ?? {
    id: req.id,
    reqCode: req.reqCode,
    title: req.title,
  };
  const candidateCount = meta?.total ?? stats?.total ?? 0;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {/* ═══ HEADER ═══ */}
      <div className="border-b border-slate-200 bg-white shrink-0">
        {isBreached && <div className="h-0.5 w-full bg-red-500" />}

        <div className="flex min-h-27.5">
          <div className="w-[42%] shrink-0 border-r border-slate-200 px-6 py-5">
            <div className="flex items-start gap-3">
              <button
                onClick={() => router.back()}
                className="mt-1 p-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-xs font-bold text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {req.reqCode}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${req.priority === 'HIGH' ? 'bg-red-50 text-red-600' : req.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {req.priority}
                  </span>
                  <span className="text-xs font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <GitBranch className="w-3 h-3" />
                    {a.assignedTo.firstName} {a.assignedTo.lastName} · {a.assignedTo.role.name}
                  </span>
                  {isBreached && (
                    <span className="text-xs font-semibold bg-red-50 text-red-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Flame className="w-3 h-3" />
                      Breached
                    </span>
                  )}
                </div>
                <h1 className="text-base font-bold text-slate-900 leading-tight truncate mb-1">
                  {req.title}
                </h1>
                <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 mb-3">
                  {req.client?.name && (
                    <span className="font-medium text-slate-700">{req.client.name}</span>
                  )}
                  {req.businessUnit?.name && (
                    <>
                      <span>·</span>
                      <span>{req.businessUnit.name}</span>
                    </>
                  )}
                  {req.serviceLine?.name && (
                    <>
                      <span>·</span>
                      <span>{req.serviceLine.name}</span>
                    </>
                  )}
                  <span>·</span>
                  <span>
                    by {a.assignedBy.firstName} {a.assignedBy.lastName}
                  </span>
                  {a.deadline && (
                    <>
                      <span>·</span>
                      <span
                        className={`font-semibold flex items-center gap-0.5 ${new Date(a.deadline) < new Date() ? 'text-red-500' : 'text-slate-600'}`}
                      >
                        <CalendarClock className="w-3 h-3" />
                        {format(new Date(a.deadline), 'dd MMM yyyy')}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="gap-2 h-8 text-sm font-semibold px-4"
                    onClick={() => setAddModal(true)}
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Candidate
                  </Button>

                  {/* Requirement Button */}
                  <Button
                    size="sm"
                    className="gap-2 h-8 text-sm font-semibold px-4"
                    // onClick={() => setAddModal(true)}
                  >
                    <Link href={`/requirements/${req.id}`}>Requirement</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — dynamic stats chips */}
          <div className="flex-1 flex items-center px-8 gap-6 flex-wrap">
            <StatChip label="Total" value={stats?.total ?? 0} colorClass="text-slate-800" />
            <StatChip label="Active" value={stats?.active ?? 0} colorClass="text-emerald-600" />

            {/* fully data-driven — one chip per canonical stage that exists in this pipeline */}
            {canonicalChips.map(chip => (
              <StatChip
                key={chip.key}
                label={chip.label}
                value={chip.value}
                colorClass={chip.color.header}
              />
            ))}

            <StatChip label="Dropped" value={stats?.dropped ?? 0} colorClass="text-rose-500" />

            {stats?.agingBuckets.critical > 0 && (
              <StatChip
                label="Stale"
                value={stats.agingBuckets.critical}
                colorClass="text-amber-600"
              />
            )}

            <div className="flex items-center gap-3 ml-auto pl-6 border-l border-slate-200 shrink-0">
              <span className="text-sm font-semibold text-slate-600 whitespace-nowrap">
                Active only
              </span>
              <Switch checked={activeOnly} onCheckedChange={setActiveOnly} />
            </div>
          </div>
        </div>
      </div>
      <Tabs
        value={tab}
        onValueChange={setTab}
        defaultValue="jd"
        className="flex flex-col flex-1 overflow-hidden"
      >
        {/* 🔹 Tabs Header */}
        <div className="m-2 border-b border-slate-200 bg-white px-4">
          <TabsList className="h-12 bg-transparent p-0 gap-1 rounded-none">
            <TabsTrigger
              value="candidates"
              className="h-10 px-4 rounded-lg border border-transparent bg-transparent shadow-none text-sm font-semibold text-slate-500 gap-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-blue-500 data-[state=active]:text-slate-900"
            >
              Candidates
              <span className="flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold">
                {candidateCount}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="jd"
              className="h-10 px-4 rounded-lg border border-transparent bg-transparent shadow-none text-sm font-semibold text-slate-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-blue-500 data-[state=active]:text-slate-900"
            >
              Job Description
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ✅ JD TAB */}
        <TabsContent value="jd" className="flex-1 overflow-hidden">
          <div className="grid h-full overflow-hidden" style={{ gridTemplateColumns: '1fr 300px' }}>
            {/* ═══ LEFT — header + description prose (scrollable) ═══ */}
            <div className="overflow-y-auto p-5 space-y-4 border-r border-slate-200">
              {/* Header card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-[10px] font-mono font-semibold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-500">
                        {req.reqCode}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${req.priority === 'HIGH' ? 'bg-red-50 text-red-700 border-red-200' : req.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                      >
                        {req.priority} priority
                      </span>
                      {req.client?.name && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {req.client.name}
                        </span>
                      )}
                    </div>
                    <h1 className="text-lg font-bold text-slate-900 mb-2">{req.title}</h1>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        {
                          label: req.remoteType,
                          color: 'bg-blue-50 text-blue-700 border-blue-200',
                        },
                        {
                          label: req.jobType?.replace(/_/g, ' '),
                          color: 'bg-slate-100 text-slate-600 border-slate-200',
                        },
                        req.experienceMin != null && {
                          label: `${req.experienceMin}–${req.experienceMax} yrs exp`,
                          color: 'bg-slate-100 text-slate-600 border-slate-200',
                        },
                        {
                          label: `${req.totalOpenings} opening${req.totalOpenings !== 1 ? 's' : ''}`,
                          color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        },
                        req.businessUnit?.name && {
                          label: `${req.businessUnit.name} · ${req.serviceLine?.name ?? ''}`,
                          color: 'bg-slate-100 text-slate-600 border-slate-200',
                        },
                      ]
                        .filter(Boolean)
                        .map((b: any) => (
                          <span
                            key={b.label}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${b.color}`}
                          >
                            {b.label}
                          </span>
                        ))}
                    </div>
                  </div>
                  {/* // AFTER */}
                  {req.salaryMin && req.salaryMax && (
                    <div className="text-right shrink-0">
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">
                        Salary range
                      </p>
                      <p className="text-base font-bold text-emerald-700">
                        ₹{req.salaryMin.toLocaleString('en-IN')} – ₹
                        {req.salaryMax.toLocaleString('en-IN')}
                      </p>
                      {req.salaryType && (
                        <p className="text-[10px] text-slate-400 mt-0.5">{req.salaryType}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Description prose */}
              {req.description && (
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">
                    Job description
                  </p>
                  <div
                    className="prose-jd text-[13px] leading-relaxed text-slate-600"
                    dangerouslySetInnerHTML={{ __html: parseMd(req.description) }}
                  />
                </div>
              )}
            </div>

            {/* ═══ RIGHT SIDEBAR — sticky, no scroll ═══ */}
            <div className="overflow-y-auto p-4 space-y-3 bg-slate-50/40">
              {/* Skills */}
              {(req.primarySkills?.length > 0 || req.keySkills?.length > 0) && (
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                    Skills
                  </p>
                  {req.primarySkills?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                        Must-have
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {req.primarySkills.map(s => (
                          <span
                            key={s}
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {req.keySkills?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                        Key skills
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {req.keySkills.map(s => (
                          <span
                            key={s}
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Job details */}
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                  Job details
                </p>
                {[
                  ['Job type', req.jobType?.replace(/_/g, ' ')],
                  ['Remote', req.remoteType],
                  [
                    'Experience',
                    req.experienceMin != null
                      ? `${req.experienceMin} – ${req.experienceMax} yrs`
                      : null,
                  ],
                  ['Education', req.education ? "Bachelor's in CS / IT" : null],
                  ['Openings', req.totalOpenings],
                  ['Client', req.client?.name],
                  ['BU', req.businessUnit?.name],
                  ['Service line', req.serviceLine?.name],
                ]
                  .filter(([, v]) => v != null && v !== '')
                  .map(([label, val]) => (
                    <div
                      key={label as string}
                      className="flex items-baseline justify-between gap-2 py-2 border-b border-slate-100 last:border-0"
                    >
                      <span className="text-[11px] text-slate-400 shrink-0">{label}</span>
                      <span className="text-xs font-semibold text-slate-800 text-right">
                        {val as string}
                      </span>
                    </div>
                  ))}
              </div>

              {/* Assignment info */}
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                  Assignment
                </p>
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(a.assignedTo.id)}`}
                  >
                    {initials(`${a.assignedTo.firstName} ${a.assignedTo.lastName}`)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {a.assignedTo.firstName} {a.assignedTo.lastName}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {a.assignedTo.role.name}
                      {a.assignedTo.department?.name ? ` · ${a.assignedTo.department.name}` : ''}
                    </p>
                  </div>
                </div>
                {[
                  ['Assigned by', `${a.assignedBy.firstName} ${a.assignedBy.lastName}`],
                  ['Assigned on', format(new Date(a.assignedAt), 'dd MMM yyyy')],
                  ['Status', a.status],
                ].map(([label, val]) => (
                  <div
                    key={label}
                    className="flex items-baseline justify-between gap-2 py-2 border-b border-slate-100 last:border-0"
                  >
                    <span className="text-[11px] text-slate-400">{label}</span>
                    <span className="text-xs font-semibold text-slate-800">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ✅ CANDIDATES TAB */}
        <TabsContent value="candidates" className="flex flex-col flex-1 overflow-hidden">
          {/* ═══ FILTER BAR ═══ */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-200 bg-slate-50 shrink-0">
            <span className="text-sm font-semibold text-slate-600">
              {meta?.total ?? 0} candidates
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  placeholder="Search candidates..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-8 text-sm w-52 border-slate-200 focus-visible:ring-1"
                />
              </div>
              <button
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors"
                onClick={() => refetch()}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              </button>
              <button className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors">
                <Filter className="w-3.5 h-3.5" />
              </button>
              <button className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors">
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ═══ SIDEBAR + TABLE ═══ */}
          <div className="flex flex-1 overflow-hidden">
            {/* sidebar */}
            <div className="w-44 shrink-0 border-r border-slate-200 overflow-y-auto bg-white">
              <button
                onClick={() => setActiveStageId(null)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors border-l-2 ${!activeStageId ? 'border-primary bg-primary/5 text-primary' : 'border-transparent text-slate-600 hover:bg-slate-50'}`}
              >
                <span className="text-xs font-bold uppercase tracking-wide">All</span>
                <span
                  className={`text-sm font-black tabular-nums ${!activeStageId ? 'text-primary' : 'text-slate-700'}`}
                >
                  {a.candidateStats?.total ?? 0}
                </span>
              </button>

              {sidebarStages.map(stage => {
                const isActive = activeStageId === stage.id;
                const c = SC(stage.code);
                return (
                  <div key={stage.id}>
                    <div className="flex justify-center py-0.5">
                      <ChevronDown className="w-3 h-3 text-slate-300" />
                    </div>
                    <button
                      onClick={() =>
                        setActiveStageId(prev => (prev === stage.id ? null : stage.id))
                      }
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors border-l-2 ${isActive ? `border-primary ${c.bg}` : 'border-transparent hover:bg-slate-50'}`}
                    >
                      <span
                        className={`text-xs font-semibold leading-tight max-w-22.5 truncate ${isActive ? c.text : stage.count === 0 ? 'text-slate-300' : 'text-slate-600'}`}
                      >
                        {stage.label}
                      </span>
                      <span
                        className={`text-sm font-black tabular-nums shrink-0 ${isActive ? c.text : stage.count === 0 ? 'text-slate-300' : 'text-slate-700'}`}
                      >
                        {stage.count}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto">
              {pipelineLoading ? (
                <div className="divide-y divide-slate-100">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-4 px-5 py-4">
                      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                      <div className="flex-1 flex flex-col gap-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-64" />
                        <Skeleton className="h-3 w-36" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : candidates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-72 gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                    <Users className="w-7 h-7 text-slate-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-700">
                      No candidates {activeStageId ? 'in this stage' : 'yet'}
                    </p>
                    <p className="text-xs font-medium text-slate-500 mt-1">
                      {activeStageId
                        ? 'Try a different stage or clear the filter'
                        : 'Use "Add Candidate" to get started'}
                    </p>
                  </div>
                  {activeStageId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-semibold"
                      onClick={() => setActiveStageId(null)}
                    >
                      Clear filter
                    </Button>
                  )}
                </div>
              ) : (
                <div>
                  <CandidateTable
                    candidates={candidates}
                    canEdit={canEdit}
                    requirementId={req.id}
                    onAction={(action, pipeline) => setActionDialog({ type: action, pipeline })}
                  />
                  {meta && meta.pages > 1 && (
                    <div className="flex items-center justify-center gap-3 py-6 border-t border-slate-100">
                      <span className="text-xs text-slate-500">
                        {meta.total} total · page {meta.page} of {meta.pages}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══ MODALS ═══ */}
      <AddCandidateModal
        open={addModal}
        onClose={() => setAddModal(false)}
        req={reqForModal}
        assignmentId={a.id}
      />

      {actionDialog?.type === 'move' && (
        <MoveStageDialog
          pipeline={actionDialog.pipeline}
          stages={pipelineStages}
          open
          onClose={() => setActionDialog(null)}
          onDone={invalidateAfterAction}
        />
      )}
      {actionDialog?.type === 'details' && (
        <CandidateDetailsModal
          pipeline={actionDialog.pipeline}
          open
          onClose={() => setActionDialog(null)}
          onDone={invalidateAfterAction}
        />
      )}
    </div>
  );
}

function parseMd(md: string): string {
  return (
    md
      // strip the redundant "## Job Title: ..." block at the top
      .replace(/^## Job Title:.*\n?/m, '')
      // h3 before h2 so h3 doesn't get double-processed
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      // bullet lines → li, then wrap consecutive li blocks in ul
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>[^]*?<\/li>)(\n<li>[^]*?<\/li>)*/g, match => `<ul>${match}</ul>`)
      // blank lines between paragraphs
      .replace(/\n{2,}/g, '\n')
      // plain text lines that aren't already HTML tags → wrap in p
      .split('\n')
      .map(line => {
        const t = line.trim();
        if (!t) return '';
        if (t.startsWith('<')) return t;
        return `<p>${t}</p>`;
      })
      .filter(Boolean)
      .join('')
  );
}
