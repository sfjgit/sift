// File: page.tsx
// Path: src/app/(dashboard)/assignments/[id]/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Users,
  Clock,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  FileText,
  Database,
  Globe,
  ExternalLink,
  GitBranch,
  AlertTriangle,
  CheckCircle2,
  Flame,
  CalendarClock,
  UserPlus,
  X,
  Pencil,
  Search,
  RefreshCw,
  Filter,
  Eye,
  AlertCircle,
  ChevronDown,
  Loader2,
  ArrowUpDown,
  Send,
  DollarSign,
  PauseCircle,
  XCircle,
  LogOut,
  MoreHorizontal,
  SlidersHorizontal,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/context/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

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
  submittedAt: string | null;
  offeredAt: string | null;
  offerStatus: string | null;
  offeredCtc: number | null;
  expectedJoiningDate: string | null;
  actualJoiningDate: string | null;
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
    status: string;
    priority: string;
    totalOpenings: number;
    isRespondByBreached: boolean;
    isTurnaroundBreached: boolean;
    primarySkills: string[];
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
  requirement: { id: string; reqCode: string; title: string; serviceLine: any };
  meta: { total: number; page: number; limit: number; pages: number };
  permissions: { canEdit: boolean; canDelete: boolean };
}

type ActionType = 'move' | 'reject' | 'withdraw' | 'hold' | 'submit' | 'offer' | null;

// ─────────────────────────────────────────────────────────────────────────────
// STAGE COLOURS — same map as requirement page so it's visually consistent
// ─────────────────────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<
  string,
  { bg: string; text: string; dot: string; border: string; bar: string; header: string }
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

// function triggerExtension(rId: string, rCode: string, rTitle: string, app: string) {
//   window.postMessage(
//     {
//       type: 'TALENTOX_SOURCE_NAUKRI',
//       requirementId: rId,
//       requirementCode: rCode,
//       requirementTitle: rTitle,
//       appName: app,
//     },
//     window.location.origin
//   );
// }
// In page.tsx — add assignmentId to triggerExtension call signature and payload

function triggerExtension(
  rId: string,
  rCode: string,
  rTitle: string,
  app: string,
  assignmentId: string // ← add this
) {
  console.log('triggerExtension', rId, rCode, rTitle, app, assignmentId);

  window.postMessage(
    {
      type: 'TALENTOX_SOURCE_NAUKRI',
      requirementId: rId,
      requirementCode: rCode,
      requirementTitle: rTitle,
      appName: app,
      assignmentId: assignmentId, // ← add this
    },
    window.location.origin
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD RESUME MODAL
// ─────────────────────────────────────────────────────────────────────────────

function UploadResumeModal({
  open,
  onClose,
  req,
}: {
  open: boolean;
  onClose: () => void;
  req: any;
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
                  <p className="text-sm font-bold text-emerald-800 truncate max-w-[240px]">
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

// ─────────────────────────────────────────────────────────────────────────────
// ADD CANDIDATE MODAL
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
  assignmentId: string; // ← add
}) {
  const [portalExpanded, setPortalExpanded] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 w-full max-w-[440px] rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
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
      <UploadResumeModal open={uploadOpen} onClose={() => setUploadOpen(false)} req={req} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION DIALOGS — identical to requirement page
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
  const [skipReason, setSkipReason] = useState('');
  const available = stages.filter(s => s.order > pipeline.currentStage.order && !s.isTerminal);
  const selected = stages.find(s => s.id === stageId);
  const currentIdx = stages.findIndex(s => s.id === pipeline.currentStage.id);
  const selectedIdx = stages.findIndex(s => s.id === stageId);
  const skippedMandatory = stages.slice(currentIdx + 1, selectedIdx).filter(s => s.isMandatory);
  const mut = useMutation({
    mutationFn: async () =>
      axios.patch(`/pipeline/${pipeline.id}/stage`, {
        stageId,
        note: note || undefined,
        skipReason: skipReason || undefined,
      }),
    onSuccess: () => {
      toast.success(`Moved to ${selected?.label}`);
      onDone();
      onClose();
      setStageId('');
      setNote('');
      setSkipReason('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to move stage'),
  });
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ArrowUpDown className="w-4 h-4 text-indigo-600" /> Move Stage
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="bg-slate-50 rounded-lg px-3 py-2.5">
            <p className="text-xs text-slate-500">Currently at</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{pipeline.currentStage.label}</p>
          </div>
          <div>
            <Label className="text-sm font-semibold text-slate-800 mb-2 block">Move to stage</Label>
            <Select value={stageId} onValueChange={setStageId}>
              <SelectTrigger className="h-10 text-sm font-medium">
                <SelectValue placeholder="Select a stage..." />
              </SelectTrigger>
              <SelectContent>
                {available.map(s => (
                  <SelectItem key={s.id} value={s.id} className="text-sm">
                    {s.label}
                    {!s.isMandatory ? ' (optional)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {skippedMandatory.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <p className="text-sm font-semibold text-amber-800 mb-1">Skipping mandatory stages</p>
              <p className="text-xs text-amber-700 mb-2">
                {skippedMandatory.map(s => s.label).join(', ')}
              </p>
              <Label className="text-xs font-semibold text-amber-800 mb-1 block">
                Reason (required)
              </Label>
              <Input
                value={skipReason}
                onChange={e => setSkipReason(e.target.value)}
                placeholder="Why are you skipping?"
                className="h-9 text-sm"
              />
            </div>
          )}
          <div>
            <Label className="text-sm font-semibold text-slate-800 mb-2 block">
              Note <span className="font-normal text-slate-500">(optional)</span>
            </Label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add a note..."
              rows={2}
              className="resize-none text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!stageId || mut.isPending || (skippedMandatory.length > 0 && !skipReason)}
            onClick={() => mut.mutate()}
          >
            {mut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />}Move Stage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SimpleActionDialog({
  open,
  onClose,
  onDone,
  title,
  icon,
  description,
  placeholder,
  actionLabel,
  actionVariant,
  endpoint,
  bodyKey,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  title: string;
  icon: React.ReactNode;
  description?: string;
  placeholder: string;
  actionLabel: string;
  actionVariant?: string;
  endpoint: string;
  bodyKey: string;
}) {
  const axios = useAxios();
  const [reason, setReason] = useState('');
  const mut = useMutation({
    mutationFn: async () => axios.patch(endpoint, { [bodyKey]: reason || undefined }),
    onSuccess: () => {
      toast.success(`${title} successful`);
      onDone();
      onClose();
      setReason('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {icon}
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          {description && <p className="text-sm text-slate-600">{description}</p>}
          <div>
            <Label className="text-sm font-semibold text-slate-800 mb-2 block">
              Reason <span className="font-normal text-slate-500">(optional)</span>
            </Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={placeholder}
              rows={3}
              className="resize-none text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={mut.isPending}
            className={
              actionVariant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : actionVariant === 'amber'
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : ''
            }
            onClick={() => mut.mutate()}
          >
            {mut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />}
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubmitDialog({
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
  const [note, setNote] = useState('');
  const mut = useMutation({
    mutationFn: async () =>
      axios.patch(`/pipeline/${pipeline.id}/submit`, { submissionNote: note || undefined }),
    onSuccess: () => {
      toast.success('Submitted to client');
      onDone();
      onClose();
      setNote('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Send className="w-4 h-4 text-blue-600" />
            Submit to Client
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <p className="text-sm font-semibold text-blue-900">{pipeline.snapshot.fullName}</p>
            <p className="text-xs text-blue-700 mt-0.5">
              {pipeline.snapshot.currentTitle}
              {pipeline.snapshot.currentTitle && pipeline.snapshot.currentCompany ? ' · ' : ''}
              {pipeline.snapshot.currentCompany}
            </p>
          </div>
          <div>
            <Label className="text-sm font-semibold text-slate-800 mb-2 block">
              Submission note <span className="font-normal text-slate-500">(optional)</span>
            </Label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Notes for the client..."
              rows={3}
              className="resize-none text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />}Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OfferDialog({
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
  const [ctc, setCtc] = useState('');
  const [salaryType, setSalaryType] = useState('MONTHLY');
  const [joiningDate, setJoiningDate] = useState('');
  const mut = useMutation({
    mutationFn: async () =>
      axios.patch(`/pipeline/${pipeline.id}/offer`, {
        offeredCtc: parseFloat(ctc),
        salaryCurrency: 'INR',
        salaryType,
        expectedJoiningDate: joiningDate || undefined,
      }),
    onSuccess: () => {
      toast.success('Offer rolled out');
      onDone();
      onClose();
      setCtc('');
      setJoiningDate('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <DollarSign className="w-4 h-4 text-violet-600" />
            Roll Offer
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="bg-violet-50 border border-violet-200 rounded-lg px-4 py-3">
            <p className="text-sm font-semibold text-violet-900">{pipeline.snapshot.fullName}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-semibold text-slate-800 mb-2 block">CTC (₹)</Label>
              <Input
                type="number"
                value={ctc}
                onChange={e => setCtc(e.target.value)}
                placeholder="e.g. 800000"
                className="h-10 text-sm font-medium"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold text-slate-800 mb-2 block">Salary Type</Label>
              <Select value={salaryType} onValueChange={setSalaryType}>
                <SelectTrigger className="h-10 text-sm">
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
          <div>
            <Label className="text-sm font-semibold text-slate-800 mb-2 block">
              Expected Joining <span className="font-normal text-slate-500">(optional)</span>
            </Label>
            <Input
              type="date"
              value={joiningDate}
              onChange={e => setJoiningDate(e.target.value)}
              className="h-10 text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-violet-600 hover:bg-violet-700"
            disabled={!ctc || mut.isPending}
            onClick={() => mut.mutate()}
          >
            {mut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />}Roll Offer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CANDIDATE CARD — identical layout to requirement page
// ─────────────────────────────────────────────────────────────────────────────

function CandidateCard({
  p,
  onAction,
  canEdit,
  requirementId,
}: {
  p: PipelineCandidate;
  onAction: (action: ActionType, pipeline: PipelineCandidate) => void;
  canEdit: boolean;
  requirementId: string;
}) {
  const router = useRouter();
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
    <div
      className={`relative flex border-b border-slate-100 hover:bg-blue-50/30 transition-colors ${isTerminated ? 'opacity-50' : ''}`}
    >
      {/* Stage colour bar */}
      <div className={`w-1 shrink-0 ${c.bar}`} />
      {/* Checkbox */}
      <div className="flex items-center px-4 shrink-0">
        <input
          type="checkbox"
          className="rounded border-slate-400 text-primary cursor-pointer w-4 h-4"
        />
      </div>
      {/* Main content */}
      <div className="flex-1 min-w-0 py-4 pr-3">
        {/* Row 1 — identity + stage badge */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="h-11 w-11 shrink-0">
            <AvatarFallback className={`text-sm font-bold ${avatarColor(snap.id)}`}>
              {initials(snap.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 leading-tight">{snap.fullName}</h3>
              {p.isRejected && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300">
                  Rejected
                </span>
              )}
              {p.isWithdrawn && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 border border-slate-300">
                  Withdrawn
                </span>
              )}
              {p.isOnHold && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300">
                  On Hold
                </span>
              )}
              {p.offeredCtc && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-300">
                  ₹{(p.offeredCtc / 100000).toFixed(1)}L Offer
                </span>
              )}
            </div>
            {(snap.currentTitle || snap.currentCompany) && (
              <p className="text-sm font-medium text-slate-600 mt-0.5 truncate">
                {snap.currentTitle}
                {snap.currentTitle && snap.currentCompany ? ' · ' : ''}
                {snap.currentCompany}
              </p>
            )}
          </div>
          <span
            className={`shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${c.bg} ${c.text} ${c.border}`}
          >
            <span className={`w-2 h-2 rounded-full ${c.dot} shrink-0`} />
            {p.currentStage.label}
          </span>
        </div>
        {/* Row 2 — contact + meta */}
        <div className="flex items-center gap-4 flex-wrap ml-14">
          {snap.email && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {snap.email}
            </span>
          )}
          {snap.phone && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              {snap.phone}
            </span>
          )}
          {snap.totalExpYears != null && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
              {Math.floor(snap.totalExpYears)}y {Math.round((snap.totalExpYears % 1) * 12)}m exp
            </span>
          )}
        </div>
        {/* Row 3 — skills */}
        {snap.topSkills?.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mt-2.5 ml-14">
            {snap.topSkills.slice(0, 4).map(s => (
              <span
                key={s}
                className="text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-0.5 rounded-md"
              >
                {s}
              </span>
            ))}
            {snap.topSkills.length > 4 && (
              <span className="text-xs font-medium text-slate-500">
                +{snap.topSkills.length - 4} more
              </span>
            )}
          </div>
        )}
        {/* Footer */}
        <div className="flex items-center gap-3 mt-2.5 ml-14">
          <p className="text-xs font-medium text-slate-500">
            by{' '}
            <span className="font-bold text-slate-700">
              {p.recruiter.firstName} {p.recruiter.lastName}
            </span>
            {' · '}
            {format(new Date(p.stageUpdatedAt), 'dd MMM yyyy')}
          </p>
          {p.stageHistory.length > 0 && (
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              {p.stageHistory.length} moves
            </span>
          )}
          <span
            className={`ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full border ${agingColor} flex items-center gap-1`}
          >
            <Clock className="w-3 h-3" />
            {p.aging.label}
          </span>
        </div>
      </div>
      {/* Action bar */}
      <div className="flex flex-col items-center justify-center gap-1 px-3 shrink-0 border-l border-slate-100">
        <button
          title="Open in requirement"
          onClick={() => router.push(`/requirements/${requirementId}?pipelineId=${p.id}`)}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
        {canEdit && !isTerminated && (
          <>
            <button
              title="Move Stage"
              onClick={() => onAction('move', p)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
            <button
              title="Submit to Client"
              onClick={() => onAction('submit', p)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
            <button
              title="Roll Offer"
              onClick={() => onAction('offer', p)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-violet-700 hover:bg-violet-100 transition-colors"
            >
              <DollarSign className="w-4 h-4" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {!p.isOnHold && (
                  <DropdownMenuItem
                    onClick={() => onAction('hold', p)}
                    className="text-amber-700 font-medium text-sm"
                  >
                    <PauseCircle className="w-4 h-4 mr-2" />
                    Put on Hold
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => onAction('withdraw', p)}
                  className="text-slate-700 font-medium text-sm"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Withdraw
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onAction('reject', p)}
                  className="text-rose-700 font-medium text-sm"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE SKELETON
// ─────────────────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="border-b p-6 flex gap-4 min-h-[100px]">
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
  const axios = useAxios();
  const qc = useQueryClient();

  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [activeOnly, setActiveOnly] = useState(true);
  const [search, setSearch] = useState('');
  const [addModal, setAddModal] = useState(false);
  const [actionDialog, setActionDialog] = useState<{
    type: ActionType;
    pipeline: PipelineCandidate;
  } | null>(null);

  // ── Fetch assignment detail (header data + stats) ──────────────────────────
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

  // ── Fetch pipeline candidates (with filters) ───────────────────────────────
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

  // Stats come from the pipeline response (freshest after filters)
  // Fall back to assignment-level stats for the header chips before pipeline loads
  const stats = pipelineData?.candidateStats ?? a.candidateStats;
  const candidates = pipelineData?.data ?? [];
  const meta = pipelineData?.meta;
  const pipelineStages = pipelineData?.pipelineStages ?? [];

  // Stage sidebar: use byPipelineStage from unfiltered stats (always the assignment-level ones)
  const sidebarStages = a.candidateStats?.byPipelineStage ?? [];

  const isBreached = !!a.breachedAt || !!req.isRespondByBreached;

  // The req object to pass to the add-candidate modal
  const reqForModal = pipelineData?.requirement ?? {
    id: req.id,
    reqCode: req.reqCode,
    title: req.title,
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {/* ═══ HEADER ═══ */}
      <div className="border-b border-slate-200 bg-white shrink-0">
        {isBreached && <div className="h-0.5 w-full bg-red-500" />}

        <div className="flex min-h-[110px]">
          {/* LEFT — assignment info */}
          <div className="w-[42%] shrink-0 border-r border-slate-200 px-6 py-5">
            <div className="flex items-start gap-3">
              <button
                onClick={() => router.back()}
                className="mt-1 p-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0">
                {/* Badges row */}
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
                {/* Title */}
                <h1 className="text-base font-bold text-slate-900 leading-tight truncate mb-1">
                  {req.title}
                </h1>
                {/* Meta */}
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
                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="gap-2 h-8 text-sm font-semibold px-4"
                    onClick={() => setAddModal(true)}
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Candidate
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-sm font-semibold gap-1.5 px-3"
                    onClick={() => router.push(`/requirements/${req.id}`)}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Requirement
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — stats chips */}
          <div className="flex-1 flex items-center px-8 gap-6 flex-wrap">
            {[
              { label: 'Total', value: stats?.total ?? 0, color: 'text-slate-800' },
              { label: 'Active', value: stats?.active ?? 0, color: 'text-emerald-600' },
              { label: 'Submitted', value: stats?.submitted ?? 0, color: 'text-blue-600' },
              { label: 'Offered', value: stats?.offered ?? 0, color: 'text-violet-600' },
              { label: 'Placed', value: stats?.placed ?? 0, color: 'text-emerald-700' },
              { label: 'Dropped', value: stats?.dropped ?? 0, color: 'text-rose-500' },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center gap-1 shrink-0">
                <span className={`text-3xl font-black tabular-nums leading-none ${s.color}`}>
                  {s.value}
                </span>
                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  {s.label}
                </span>
              </div>
            ))}
            {stats?.agingBuckets.critical > 0 && (
              <div className="flex flex-col items-center gap-1 shrink-0">
                <span className="text-3xl font-black tabular-nums leading-none text-amber-600">
                  {stats.agingBuckets.critical}
                </span>
                <span className="text-[10px] font-bold tracking-widest text-amber-400 uppercase">
                  Stale
                </span>
              </div>
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

      {/* ═══ FILTER BAR ═══ */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-200 bg-white shrink-0">
        <span className="text-sm font-semibold text-slate-600">{meta?.total ?? 0} candidates</span>
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

      {/* ═══ SIDEBAR + LIST ═══ */}
      <div className="flex flex-1 overflow-hidden">
        {/* STAGE SIDEBAR */}
        <div className="w-44 shrink-0 border-r border-slate-200 overflow-y-auto bg-white">
          {/* All */}
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
                  onClick={() => setActiveStageId(prev => (prev === stage.id ? null : stage.id))}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors border-l-2 ${isActive ? `border-primary ${c.bg}` : 'border-transparent hover:bg-slate-50'}`}
                >
                  <span
                    className={`text-xs font-semibold leading-tight max-w-[90px] truncate ${isActive ? c.text : stage.count === 0 ? 'text-slate-300' : 'text-slate-600'}`}
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

        {/* CANDIDATE LIST */}
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
              {candidates.map(c => (
                <CandidateCard
                  key={c.id}
                  p={c}
                  canEdit={canEdit}
                  requirementId={req.id}
                  onAction={(action, pipeline) => setActionDialog({ type: action, pipeline })}
                />
              ))}
              {/* Pagination (if needed beyond the 50 limit) */}
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

      {/* ═══ MODALS ═══ */}
      <AddCandidateModal
        open={addModal}
        onClose={() => setAddModal(false)}
        req={reqForModal}
        assignmentId={a.id} // ← add this, a.id is the assignment UUID
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
      {actionDialog?.type === 'submit' && (
        <SubmitDialog
          pipeline={actionDialog.pipeline!}
          open
          onClose={() => setActionDialog(null)}
          onDone={invalidateAfterAction}
        />
      )}
      {actionDialog?.type === 'offer' && (
        <OfferDialog
          pipeline={actionDialog.pipeline!}
          open
          onClose={() => setActionDialog(null)}
          onDone={invalidateAfterAction}
        />
      )}
      {actionDialog?.type === 'reject' && (
        <SimpleActionDialog
          open
          onClose={() => setActionDialog(null)}
          onDone={invalidateAfterAction}
          title="Reject Candidate"
          icon={<XCircle className="w-4 h-4 text-rose-600" />}
          placeholder="Why is this candidate being rejected?"
          actionLabel="Reject"
          actionVariant="danger"
          endpoint={`/pipeline/${actionDialog.pipeline?.id}/reject`}
          bodyKey="rejectionReason"
        />
      )}
      {actionDialog?.type === 'withdraw' && (
        <SimpleActionDialog
          open
          onClose={() => setActionDialog(null)}
          onDone={invalidateAfterAction}
          title="Withdraw Candidate"
          icon={<LogOut className="w-4 h-4 text-slate-600" />}
          placeholder="Why is this candidate withdrawing?"
          actionLabel="Withdraw"
          endpoint={`/pipeline/${actionDialog.pipeline?.id}/withdraw`}
          bodyKey="withdrawnReason"
        />
      )}
      {actionDialog?.type === 'hold' && (
        <SimpleActionDialog
          open
          onClose={() => setActionDialog(null)}
          onDone={invalidateAfterAction}
          title="Put on Hold"
          icon={<PauseCircle className="w-4 h-4 text-amber-600" />}
          placeholder="Why is this candidate on hold?"
          actionLabel="Put on Hold"
          actionVariant="amber"
          endpoint={`/pipeline/${actionDialog.pipeline?.id}/hold`}
          bodyKey="onHoldReason"
        />
      )}
    </div>
  );
}
