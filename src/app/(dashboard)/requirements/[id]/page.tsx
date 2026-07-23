/* eslint-disable react/no-unescaped-entities */
// File: page.tsx
// Path: src/app/(dashboard)/requirements/[id]/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ChevronDown,
  UserPlus,
  MapPin,
  Building2,
  Zap,
  X,
  FileText,
  Database,
  Globe,
  ExternalLink,
  Pencil,
  Phone,
  Mail,
  Briefcase,
  Clock,
  SlidersHorizontal,
  Search,
  RefreshCw,
  Filter,
  Eye,
  AlertCircle,
  ChevronRight,
  Loader2,
  Calendar,
  Users,
  TrendingUp,
  ArrowUpDown,
  Send,
  DollarSign,
  PauseCircle,
  XCircle,
  LogOut,
  MoreHorizontal,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  STATUS_LABEL,
  STATUS_COLOR,
  STATUS_FLOW,
  PRIORITY_COLOR,
} from '@/components/requirements/types';
import type { RequirementDetail } from '@/components/requirements/types';
import { RequirementOverviewTab } from '@/components/requirements/RequirementOverviewTab';
// import { RequirementAssignmentsTab } from '@/components/requirements/RequirementAssignmentsTab';
import {
  RequirementNotesTab,
  RequirementDocumentsTab,
  RequirementActivityTab,
} from '@/components/requirements/RequirementNotesDocsActivityTabs';
import { RequirementAssignmentsTab } from './_components/RequirementAssignmentsTab';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface PipelineStageCount {
  id: string;
  code: string;
  label: string;
  order: number;
  count: number;
}
interface PipelineSummary {
  total: number;
  active: number;
  rejected: number;
  withdrawn: number;
  onHold: number;
  byStage: PipelineStageCount[];
}
interface Assignment {
  id: string;
  depth: number;
  allocatedOpenings: number;
  filledOpenings: number;
  submissionsCount: number;
  interviewsCount: number;
  deadline: string | null;
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string | null;
    role: { id: string; name: string };
  };
  assignedBy: { id: string; firstName: string; lastName: string };
}
interface RequirementDetailResponse {
  success: boolean;
  data: RequirementDetail & {
    assignments: Assignment[];
    pipelineSummary: PipelineSummary;
    documents: any[];
  };
  permissions: { canEdit: boolean; canDelete: boolean };
}
interface StageLog {
  id: string;
  fromStage: { id: string; code: string; label: string } | null;
  toStage: { id: string; code: string; label: string };
  changedBy: { id: string; firstName: string; lastName: string };
  wasSkipped: boolean;
  skipReason: string | null;
  timeInPrevStageMins: number | null;
  note: string | null;
  createdAt: string;
}
interface CandidatePipeline {
  id: string;
  isRejected: boolean;
  isWithdrawn: boolean;
  isOnHold: boolean;
  stageUpdatedAt: string;
  createdAt: string;
  submittedAt: string | null;
  offeredCtc: number | null;
  offerStatus: string | null;
  rejectionReason: string | null;
  withdrawnReason: string | null;
  onHoldReason: string | null;
  currentStage: { id: string; code: string; label: string; order: number };
  aging: { minutes: number; label: string };
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
    rawSnapshot: any;
    snapshotAt: string;
  };
  recruiter: { id: string; firstName: string; lastName: string };
  stageHistory: StageLog[];
  assignment: {
    id: string;
    depth: number;
    assignedTo: { id: string; firstName: string; lastName: string; employeeId: string | null };
  } | null;
}
interface CandidateDetail extends CandidatePipeline {
  stageUpdatedBy: { id: string; firstName: string; lastName: string };
  submittedBy: { id: string; firstName: string; lastName: string } | null;
  offeredBy: { id: string; firstName: string; lastName: string } | null;
  rejectedBy: { id: string; firstName: string; lastName: string } | null;
  rejectedAt: string | null;
  withdrawnAt: string | null;
  onHoldAt: string | null;
  offeredAt: string | null;
  salaryCurrency: string | null;
  salaryType: string | null;
  expectedJoiningDate: string | null;
  actualJoiningDate: string | null;
  totalPipelineAging: { minutes: number; label: string };
}
// ── Added permissions to CandidatesResponse
interface CandidatesResponse {
  success: boolean;
  data: CandidatePipeline[];
  meta: { total: number; page: number; limit: number; pages: number };
  permissions: { canEdit: boolean; canDelete: boolean };
}
interface PipelineStage {
  id: string;
  code: string;
  label: string;
  order: number;
  isMandatory: boolean;
  isTerminal: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & HELPERS
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

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD RESUME MODAL
// ─────────────────────────────────────────────────────────────────────────────

function UploadResumeModal({
  open,
  onClose,
  req,
  // assignments,
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
  const ALLOWED_EXT = '.pdf, .docx, .doc, .rtf';

  const mut = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file selected');
      const form = new FormData();
      form.append('file', file, file.name); // ← pass filename as 3rd arg
      form.append('fileName', file.name);
      form.append('mimeType', file.type);
      form.append('requirementId', req.id);
      form.append('reqCode', req.reqCode);
      return axios.post('/candidate/api/resume/ingest', form, {
        baseURL: '/api/proxy',
        withCredentials: true,
        headers: { 'Content-Type': undefined }, // ← let browser set multipart boundary
        transformRequest: data => data, // ← prevent axios from re-serializing FormData
      });
    },
    onSuccess: () => {
      toast.success('Resume uploaded and parsed successfully');
      qc.invalidateQueries({ queryKey: ['requirement-candidates', req.id] });
      qc.invalidateQueries({ queryKey: ['requirement-detail', req.id] });
      onClose();
      setFile(null);
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Upload failed';
      toast.error(msg);
    },
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
            <FileText className="w-4 h-4 text-emerald-600" />
            Upload Resume
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Requirement context pill */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-xs font-bold text-slate-500 font-mono">{req.reqCode}</span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-semibold text-slate-700 truncate">{req.title}</span>
          </div>

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
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            className={`relative border-2 border-dashed rounded-xl transition-colors cursor-pointer ${
              dragOver
                ? 'border-primary bg-primary/5'
                : file
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50'
            }`}
            onClick={() => document.getElementById('resume-file-input')?.click()}
          >
            <input
              id="resume-file-input"
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
                  <p className="text-xs text-slate-400 mt-1">{ALLOWED_EXT} · Max 20 MB</p>
                </>
              )}
            </div>
          </div>

          {/* Upload progress hint */}
          {mut.isPending && (
            <div className="flex items-center gap-2 text-sm text-slate-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />
              <span>Uploading and parsing with AI... this may take a moment</span>
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
  assignments,
}: {
  open: boolean;
  onClose: () => void;
  req: any;
  assignments: Assignment[];
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
              {/* <div>
                <h2 className="text-base font-bold text-slate-900">Add Candidate</h2>
                <p className="text-xs text-slate-500 mt-0.5">Choose how to source</p>
              </div> */}
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
                        // triggerExtension(req.id, req.reqCode, req.title, app.appName);
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
// ACTION DIALOGS
// ─────────────────────────────────────────────────────────────────────────────

type ActionType = 'move' | 'reject' | 'withdraw' | 'hold' | 'submit' | 'offer' | null;

function MoveStageDialog({
  pipeline,
  stages,
  open,
  onClose,
  onDone,
}: {
  pipeline: CandidatePipeline;
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
            <ArrowUpDown className="w-4 h-4 text-indigo-600" />
            Move Stage
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
              placeholder="Add a note about this transition..."
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
  pipeline: CandidatePipeline;
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
  pipeline: CandidatePipeline;
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
// CANDIDATE DETAIL DRAWER
// ─────────────────────────────────────────────────────────────────────────────

function CandidateDetailDrawer({
  pipelineId,
  requirementId,
  onClose,
}: {
  pipelineId: string;
  requirementId: string;
  onClose: () => void;
}) {
  const axios = useAxios();
  const { data, isLoading, isError } = useQuery<{ success: boolean; data: CandidateDetail }>({
    queryKey: ['candidate-detail', requirementId, pipelineId],
    queryFn: async () =>
      (await axios.get(`/requirements/${requirementId}/candidates/${pipelineId}`)).data,
    enabled: !!pipelineId,
  });
  const p = data?.data;
  const snap = p?.snapshot;
  const raw = snap?.rawSnapshot ?? {};

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[560px] h-full bg-white shadow-2xl flex flex-col border-l border-slate-200">
        <div className="flex items-center gap-4 px-6 py-5 border-b border-slate-100 shrink-0 bg-slate-50">
          {snap ? (
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarFallback
                className={`text-base font-bold ${avatarColor(snap.candidateServiceId)}`}
              >
                {initials(snap.fullName)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <Skeleton className="h-12 w-12 rounded-full shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <Skeleton className="h-5 w-40 mb-1.5" />
            ) : (
              <p className="text-base font-bold text-slate-900 truncate">{snap?.fullName}</p>
            )}
            {isLoading ? (
              <Skeleton className="h-3.5 w-28" />
            ) : (
              <p className="text-sm text-slate-600 truncate">
                {snap?.currentTitle}
                {snap?.currentTitle && snap?.currentCompany ? ' · ' : ''}
                {snap?.currentCompany}
              </p>
            )}
          </div>
          {p && (
            <span
              className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${SC(p.currentStage.code).bg} ${SC(p.currentStage.code).text} ${SC(p.currentStage.code).border}`}
            >
              <span
                className={`w-2 h-2 rounded-full ${SC(p.currentStage.code).dot} animate-pulse`}
              />
              {p.currentStage.label}
            </span>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-slate-300" />
          </div>
        )}
        {isError && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500">
            <AlertCircle className="w-10 h-10 text-slate-300" />
            <p className="text-sm font-medium">Failed to load candidate</p>
          </div>
        )}

        {p && snap && (
          <div className="flex-1 overflow-y-auto">
            {(p.isRejected || p.isWithdrawn || p.isOnHold || p.offeredCtc) && (
              <div className="flex flex-wrap gap-2 px-6 py-3 bg-slate-50 border-b border-slate-100">
                {p.isRejected && (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300">
                    Rejected{p.rejectionReason ? ` — ${p.rejectionReason}` : ''}
                  </span>
                )}
                {p.isWithdrawn && (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-200 text-slate-700 border border-slate-300">
                    Withdrawn{p.withdrawnReason ? ` — ${p.withdrawnReason}` : ''}
                  </span>
                )}
                {p.isOnHold && (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300">
                    On Hold{p.onHoldReason ? ` — ${p.onHoldReason}` : ''}
                  </span>
                )}
                {p.offeredCtc && (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-violet-100 text-violet-700 border border-violet-300">
                    Offer: ₹{(p.offeredCtc / 100000).toFixed(1)}L · {p.offerStatus}
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
              {[
                { label: 'In Stage', value: p.aging.label, icon: <Clock className="w-4 h-4" /> },
                {
                  label: 'Total Time',
                  value: p.totalPipelineAging.label,
                  icon: <TrendingUp className="w-4 h-4" />,
                },
                {
                  label: 'Transitions',
                  value: String(p.stageHistory.length),
                  icon: <ArrowUpDown className="w-4 h-4" />,
                },
              ].map(s => (
                <div key={s.label} className="flex flex-col items-center py-5 gap-1.5">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    {s.icon}
                    <span className="text-xs uppercase tracking-wide font-semibold">{s.label}</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="px-6 py-5 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
                Contact & Background
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    icon: <Mail className="w-4 h-4 text-slate-400" />,
                    label: 'Email',
                    value: snap.email,
                  },
                  {
                    icon: <Phone className="w-4 h-4 text-slate-400" />,
                    label: 'Phone',
                    value: snap.phone,
                  },
                  {
                    icon: <Briefcase className="w-4 h-4 text-slate-400" />,
                    label: 'Experience',
                    value:
                      snap.totalExpYears != null
                        ? `${Math.floor(snap.totalExpYears)}y ${Math.round((snap.totalExpYears % 1) * 12)}m`
                        : null,
                  },
                  {
                    icon: <Clock className="w-4 h-4 text-blue-400" />,
                    label: 'Notice Period',
                    value: raw?.noticePeriod,
                  },
                  {
                    icon: <span className="text-slate-400 font-bold">₹</span>,
                    label: 'Current CTC',
                    value: raw?.currentSalary,
                  },
                  {
                    icon: <MapPin className="w-4 h-4 text-slate-400" />,
                    label: 'Location',
                    value: raw?.location,
                  },
                ]
                  .filter(r => r.value)
                  .map(row => (
                    <div key={row.label} className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 shrink-0">{row.icon}</div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-500">{row.label}</p>
                        <p className="text-sm font-semibold text-slate-900 truncate">{row.value}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {snap.topSkills?.length > 0 && (
              <div className="px-6 py-5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Skills
                </p>
                <div className="flex flex-wrap gap-2">
                  {snap.topSkills.map(s => (
                    <span
                      key={s}
                      className="text-sm font-medium bg-slate-100 border border-slate-200 text-slate-800 px-3 py-1 rounded-full"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="px-6 py-5 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
                Pipeline Details
              </p>
              <div className="space-y-3">
                {[
                  { label: 'Recruiter', value: `${p.recruiter.firstName} ${p.recruiter.lastName}` },
                  p.assignment
                    ? {
                        label: 'Assignment',
                        value: `${p.assignment.assignedTo.firstName} ${p.assignment.assignedTo.lastName}`,
                      }
                    : null,
                  { label: 'Added on', value: format(new Date(p.createdAt), 'dd MMM yyyy, HH:mm') },
                  p.submittedAt
                    ? { label: 'Submitted', value: format(new Date(p.submittedAt), 'dd MMM yyyy') }
                    : null,
                  p.offeredAt
                    ? {
                        label: 'Offer',
                        value: `${format(new Date(p.offeredAt), 'dd MMM yyyy')} · ₹${((p.offeredCtc ?? 0) / 100000).toFixed(1)}L`,
                      }
                    : null,
                ]
                  .filter(Boolean)
                  .map((row: any) => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-500">{row.label}</span>
                      <span className="text-sm font-semibold text-slate-900">{row.value}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Stage History
                </p>
                <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
                  {p.stageHistory.length} transitions
                </span>
              </div>
              {p.stageHistory.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No transitions yet</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-[17px] top-5 bottom-5 w-px bg-slate-200" />
                  <div className="space-y-0">
                    {p.stageHistory.map(log => {
                      const c = SC(log.toStage.code);
                      return (
                        <div key={log.id} className="relative flex gap-4 pb-5">
                          <div
                            className={`relative z-10 w-[34px] h-[34px] rounded-full shrink-0 flex items-center justify-center ${c.bg} border-2 ${c.border}`}
                          >
                            <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                          </div>
                          <div className="flex-1 min-w-0 pt-1">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {log.fromStage && (
                                    <span className="text-xs font-medium text-slate-500">
                                      {log.fromStage.label}
                                    </span>
                                  )}
                                  {log.fromStage && (
                                    <ChevronRight className="w-3 h-3 text-slate-400" />
                                  )}
                                  <span className={`text-sm font-bold ${c.text}`}>
                                    {log.toStage.label}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  by{' '}
                                  <span className="font-semibold text-slate-700">
                                    {log.changedBy.firstName} {log.changedBy.lastName}
                                  </span>{' '}
                                  · {format(new Date(log.createdAt), 'dd MMM, HH:mm')}
                                </p>
                                {log.note && (
                                  <p className="text-xs text-slate-600 italic mt-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                    "{log.note}"
                                  </p>
                                )}
                              </div>
                              {log.timeInPrevStageMins != null && log.timeInPrevStageMins > 0 && (
                                <div className="shrink-0 text-right">
                                  <p className="text-sm font-bold text-slate-800">
                                    {formatMins(log.timeInPrevStageMins)}
                                  </p>
                                  <p className="text-xs text-slate-500">in prev</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="relative flex gap-4">
                      <div
                        className={`relative z-10 w-[34px] h-[34px] rounded-full shrink-0 flex items-center justify-center ${SC(p.currentStage.code).bg} border-2 border-primary`}
                      >
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${SC(p.currentStage.code).dot} animate-pulse`}
                        />
                      </div>
                      <div className="pt-1.5">
                        <p className="text-sm font-bold text-primary">
                          Now · {p.currentStage.label}
                        </p>
                        <p className="text-xs text-slate-500">{p.aging.label} here so far</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {snap.resumeUrl && (
              <div className="px-6 pb-8">
                <a
                  href={snap.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                >
                  <FileText className="w-4 h-4" />
                  View Resume
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CANDIDATE CARD — big, readable, dark text
// ─────────────────────────────────────────────────────────────────────────────

function CandidateCard({
  p,
  onView,
  onAction,
  canEdit,
}: {
  p: CandidatePipeline;
  onView: (id: string) => void;
  onAction: (action: ActionType, pipeline: CandidatePipeline) => void;
  canEdit: boolean;
}) {
  const snap = p.snapshot;
  const raw = snap.rawSnapshot ?? {};
  const c = SC(p.currentStage.code);
  const isTerminated = p.isRejected || p.isWithdrawn;

  // coerce any rawSnapshot field to a safe renderable string (or null).
  // objects/arrays from the parser (e.g. location: {}) are NOT renderable — drop them.
  const rawStr = (v: unknown): string | null => {
    if (v == null) return null;
    if (typeof v === 'string') return v.trim() || null;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    return null;
  };
  const noticePeriod = rawStr(raw?.noticePeriod);
  const currentSalary = rawStr(raw?.currentSalary);
  const location = rawStr(raw?.location);

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
      {/* Stage color bar */}
      <div className={`w-1 shrink-0 ${c.bar}`} />

      {/* Checkbox */}
      <div className="flex items-center px-4 shrink-0">
        <input
          type="checkbox"
          className="rounded border-slate-400 text-primary cursor-pointer w-4 h-4"
        />
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 min-w-0 py-4 pr-3">
        {/* ROW 1 — identity + stage badge */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="h-11 w-11 shrink-0">
            <AvatarFallback className={`text-sm font-bold ${avatarColor(snap.candidateServiceId)}`}>
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

        {/* ROW 2 — contact + meta */}
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
          {noticePeriod && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              {noticePeriod}
            </span>
          )}
          {currentSalary && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <span className="text-slate-400 font-bold">₹</span>
              {currentSalary}
            </span>
          )}
          {location && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {location}
            </span>
          )}
        </div>

        {/* ROW 3 — skills */}
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

        {/* FOOTER */}
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

      {/* ACTION BAR */}
      <div className="flex flex-col items-center justify-center gap-1 px-3 shrink-0 border-l border-slate-100">
        <button
          title="View Detail"
          onClick={() => onView(p.id)}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <Eye className="w-4.5 h-4.5" />
        </button>
        {/* ── Candidate action buttons gated on candidates API permission ── */}
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
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="border-b p-6 flex gap-8 min-h-[120px]">
        <div className="w-[42%] flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div>
              <Skeleton className="h-5 w-48 mb-1.5" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-4 w-60 ml-13" />
          <Skeleton className="h-8 w-40 ml-13 mt-1" />
        </div>
        <div className="flex gap-6 flex-1 items-center">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-3 w-20" />
            </div>
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

export default function RequirementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const axios = useAxios();
  const qc = useQueryClient();
  const permission = usePermission('requirements');
  const { user } = useAuth();

  const [tab, setTab] = useState('candidates');
  const [addModal, setAddModal] = useState(false);
  const [activeOnly, setActiveOnly] = useState(true);
  const [search, setSearch] = useState('');
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [statusDialog, setStatusDialog] = useState<{ toStatus: string } | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    type: ActionType;
    pipeline: CandidatePipeline;
  } | null>(null);

  const reqQuery = useQuery<RequirementDetailResponse>({
    queryKey: ['requirement-detail', id],
    queryFn: async () => (await axios.get(`/requirements/${id}/detail`)).data,
    enabled: !!id,
  });

  const candidatesQuery = useQuery<CandidatesResponse>({
    queryKey: ['requirement-candidates', id, activeStageId, activeOnly, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeStageId) params.set('stageId', activeStageId);
      if (activeOnly) params.set('activeOnly', 'true');
      if (search) params.set('search', search);
      params.set('limit', '50');
      return (await axios.get(`/requirements/${id}/candidates?${params}`)).data;
    },
    enabled: !!id && tab === 'candidates',
  });

  const stagesQuery = useQuery<{ success: boolean; data: PipelineStage[] }>({
    queryKey: ['pipeline-stages', (reqQuery.data?.data as any)?.serviceLine?.id],
    queryFn: async () => {
      const slId = (reqQuery.data?.data as any)?.serviceLine?.id;
      return (await axios.get(`/pipeline-stages${slId ? `?serviceLineId=${slId}` : ''}`)).data;
    },
    enabled: !!reqQuery.data,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ status, reason }: { status: string; reason: string }) =>
      (await axios.patch(`/requirements/${id}/status`, { status, reason: reason || undefined }))
        .data,
    onSuccess: (_, vars) => {
      toast.success(`Status changed to ${STATUS_LABEL[vars.status as keyof typeof STATUS_LABEL]}`);
      qc.invalidateQueries({ queryKey: ['requirement-detail', id] });
      qc.invalidateQueries({ queryKey: ['requirements'] });
      setStatusDialog(null);
      setStatusReason('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed'),
  });

  const invalidateAfterAction = () => {
    qc.invalidateQueries({ queryKey: ['requirement-candidates', id] });
    qc.invalidateQueries({ queryKey: ['requirement-detail', id] });
    if (selectedPipelineId)
      qc.invalidateQueries({ queryKey: ['candidate-detail', id, selectedPipelineId] });
  };

  if (reqQuery.isLoading) return <PageSkeleton />;
  if (reqQuery.isError || !reqQuery.data?.data) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="w-10 h-10 text-rose-400" />
        <p className="text-base font-medium text-slate-600">Failed to load requirement.</p>
        <Button variant="ghost" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  const req = reqQuery.data.data;
  const perms = reqQuery.data.permissions;
  // ── Requirement-level permission: gates Edit button, Status dropdown, tab sub-components
  const canEdit = permission.canEdit && perms.canEdit;
  // ── Candidates-level permission: ONLY from the candidates API response
  const canEditCandidates = candidatesQuery.data?.permissions?.canEdit ?? false;

  const nextStatuses = STATUS_FLOW[req.status] ?? [];
  const summary = (req as any).pipelineSummary as PipelineSummary;
  const stages = summary?.byStage ?? [];
  const assignments = ((req as any).assignments as Assignment[]) ?? [];
  const candidates = candidatesQuery.data?.data ?? [];
  const meta = candidatesQuery.data?.meta;
  const activeStage = stages.find(s => s.id === activeStageId);
  const pipelineStages = stagesQuery.data?.data ?? [];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {/* ═══ HEADER ═══ */}
      <div className="border-b border-slate-200 bg-white shrink-0">
        <div className="flex min-h-[120px]">
          {/* LEFT — requirement info */}
          <div className="w-[40%] shrink-0 border-r border-slate-200 px-6 py-5">
            <div className="flex items-start gap-3">
              <button
                onClick={() => router.back()}
                className="mt-1 p-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-base">
                    {(req as any).serviceLine?.name?.[0] ?? req.title[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-base font-bold text-slate-900 leading-tight truncate">
                      {req.title}
                    </h1>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs font-bold text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {req.reqCode}
                      </span>
                      <Badge
                        className={`text-xs font-bold px-2 py-0.5 border ${STATUS_COLOR[req.status]}`}
                        variant="outline"
                      >
                        {STATUS_LABEL[req.status]}
                      </Badge>
                      <Badge
                        className={`text-xs font-bold px-2 py-0.5 ${PRIORITY_COLOR[req.priority]}`}
                        variant="outline"
                      >
                        {req.priority}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 ml-[52px]">
                  {(req as any).client && (
                    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {(req as any).client.name}
                    </span>
                  )}
                  {(req as any).businessUnit && (
                    <span className="text-sm font-medium text-slate-500">
                      · {(req as any).businessUnit.name}
                    </span>
                  )}
                  {((req as any).city || (req as any).state) && (
                    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {[(req as any).city, (req as any).state].filter(Boolean).join(', ')}
                    </span>
                  )}
                  {(req as any).respondBy && (
                    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Fill by {format(new Date((req as any).respondBy), 'dd MMM yyyy')}
                    </span>
                  )}
                  {req.turnaroundDays && (
                    <span className="flex items-center gap-1.5 text-sm font-bold text-amber-700">
                      <Zap className="w-3.5 h-3.5" />
                      {req.turnaroundDays}d TAT
                    </span>
                  )}
                  {/* {req.respondBy && (
                    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {format(new Date(req.respondBy), 'dd MMM yyyy')}
                    </span>
                  )} */}
                </div>

                {assignments.length > 0 && (
                  <div className="flex items-center gap-2 mb-3 ml-[52px]">
                    <div className="flex -space-x-2">
                      {assignments.slice(0, 6).map(a => (
                        <Avatar key={a.id} className="h-6 w-6 border-2 border-white">
                          <AvatarFallback
                            className={`text-[9px] font-bold ${avatarColor(a.assignedTo.id)}`}
                          >
                            {initials(`${a.assignedTo.firstName} ${a.assignedTo.lastName}`)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    {assignments.length > 6 && (
                      <span className="text-sm font-medium text-slate-500">
                        +{assignments.length - 6}
                      </span>
                    )}
                    <span className="text-sm font-medium text-slate-600">
                      {assignments.length} assigned
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 ml-[52px]">
                  {/* <Button
                    size="sm"
                    className="gap-2 h-8 text-sm font-semibold px-4"
                    onClick={() => setAddModal(true)}
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Candidate
                  </Button> */}
                  {canEdit && nextStatuses.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-sm font-semibold gap-1.5 px-3"
                        >
                          Status <ChevronDown className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {nextStatuses.map(s => (
                          <DropdownMenuItem
                            key={s}
                            className="text-sm font-medium"
                            onClick={() => setStatusDialog({ toStatus: s })}
                          >
                            → {STATUS_LABEL[s as keyof typeof STATUS_LABEL]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-sm font-semibold gap-1.5 px-3"
                      onClick={() => router.push(`/requirements/${id}/edit`)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — pipeline summary stats */}
          <div className="flex-1 flex items-center px-8 gap-8 border-l border-slate-200">
            {[
              { label: 'Total', value: summary?.total ?? 0, color: 'text-slate-800' },
              { label: 'Active', value: summary?.active ?? 0, color: 'text-emerald-600' },
              { label: 'On Hold', value: summary?.onHold ?? 0, color: 'text-amber-600' },
              { label: 'Rejected', value: summary?.rejected ?? 0, color: 'text-rose-600' },
              { label: 'Withdrawn', value: summary?.withdrawn ?? 0, color: 'text-slate-400' },
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
            <div className="flex items-center gap-3 ml-auto pl-6 border-l border-slate-200 shrink-0">
              <span className="text-sm font-semibold text-slate-600 whitespace-nowrap">
                Active only
              </span>
              <Switch checked={activeOnly} onCheckedChange={setActiveOnly} />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ TABS ═══ */}
      <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1 overflow-hidden">
        <div className="border-b border-slate-200 bg-white shrink-0 px-6">
          <TabsList className="h-auto gap-0 bg-transparent p-0">
            {[
              { value: 'candidates', label: 'Candidates', count: summary?.total },
              { value: 'overview', label: 'Job Description' },
              { value: 'assignments', label: 'Assignments', count: assignments.length },
              { value: 'notes', label: 'Notes' },
              { value: 'documents', label: 'Documents' },
              { value: 'activity', label: 'Activity' },
            ].map(t => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="rounded-none border-b-2 border-transparent px-5 pb-3 pt-2 text-sm font-semibold text-slate-500 data-[state=active]:border-primary data-[state=active]:text-slate-900 data-[state=active]:shadow-none bg-transparent whitespace-nowrap gap-2"
              >
                {t.label}
                {t.count != null && t.count > 0 && (
                  <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                    {t.count}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* CANDIDATES TAB */}
        <TabsContent value="candidates" className="flex-1 overflow-hidden mt-0 flex flex-col">
          {/* filter bar */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-200 bg-white shrink-0">
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
                onClick={() => candidatesQuery.refetch()}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${candidatesQuery.isFetching ? 'animate-spin' : ''}`}
                />
              </button>
              <button className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors">
                <Filter className="w-3.5 h-3.5" />
              </button>
              <button className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors">
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* sidebar + list */}
          <div className="flex flex-1 overflow-hidden">
            {/* ── STAGE SIDEBAR ── */}
            <div className="w-44 shrink-0 border-r border-slate-200 overflow-y-auto bg-white">
              {/* All */}
              <button
                onClick={() => {
                  setTab('candidates');
                  setActiveStageId(null);
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors border-l-2 ${
                  !activeStageId
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-transparent text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-wide">All</span>
                <span
                  className={`text-sm font-black tabular-nums ${!activeStageId ? 'text-primary' : 'text-slate-700'}`}
                >
                  {summary?.total ?? 0}
                </span>
              </button>

              {stages.map((stage, idx) => {
                const isActive = activeStageId === stage.id;
                const c = SC(stage.code);
                return (
                  <div key={stage.id}>
                    {/* down arrow between stages */}
                    <div className="flex justify-center py-0.5">
                      <ChevronDown className="w-3 h-3 text-slate-300" />
                    </div>
                    <button
                      onClick={() => {
                        setTab('candidates');
                        setActiveStageId(prev => (prev === stage.id ? null : stage.id));
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors border-l-2 ${
                        isActive ? `border-primary ${c.bg}` : 'border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`text-xs font-semibold leading-tight max-w-[90px] truncate ${
                          isActive
                            ? c.text
                            : stage.count === 0
                              ? 'text-slate-300'
                              : 'text-slate-600'
                        }`}
                      >
                        {stage.label}
                      </span>
                      <span
                        className={`text-sm font-black tabular-nums shrink-0 ${
                          isActive
                            ? c.text
                            : stage.count === 0
                              ? 'text-slate-300'
                              : 'text-slate-700'
                        }`}
                      >
                        {stage.count}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* ── CANDIDATE LIST ── */}
            <div className="flex-1 overflow-y-auto">
              {candidatesQuery.isLoading ? (
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
                      canEdit={canEditCandidates}
                      onView={pid => router.push(`/requirements/${id}/candidates/${pid}`)}
                      onAction={(action, pipeline) => setActionDialog({ type: action, pipeline })}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="overview" className="flex-1 overflow-hidden mt-0">
          <RequirementOverviewTab requirement={req} />
        </TabsContent>
        <TabsContent value="assignments" className="flex-1 overflow-y-auto mt-0 p-6">
          {' '}
          <TabsContent value="assignments" className="flex-1 overflow-y-auto mt-0 p-6">
            <RequirementAssignmentsTab
              requirementId={id}
              canEdit={canEdit}
              req={{
                id: req.id,
                reqCode: req.reqCode,
                title: req.title,
                totalOpenings: req.totalOpenings,
                deadline: (req as any).respondBy ?? null,
                // @ts-expect-error err
                client: (req as any).client ?? null,
                businessUnit: (req as any).businessUnit ?? null,
              }}
            />
          </TabsContent>
        </TabsContent>
        <TabsContent value="notes" className="flex-1 overflow-y-auto mt-0 p-6">
          <RequirementNotesTab
            requirementId={id}
            initialNotes={(req as any).notes}
            canEdit={canEdit}
            currentUserId={user?.id ?? ''}
          />
        </TabsContent>
        <TabsContent value="documents" className="flex-1 overflow-y-auto mt-0 p-6">
          <RequirementDocumentsTab requirementId={id} canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="activity" className="flex-1 overflow-y-auto mt-0 p-6">
          <RequirementActivityTab requirementId={id} />
        </TabsContent>
      </Tabs>

      {/* ═══ MODALS & DRAWER ═══ */}
      {/* <AddCandidateModal
        open={addModal}
        onClose={() => setAddModal(false)}
        req={req as any}
        assignments={assignments}
      /> */}

      {selectedPipelineId && (
        <CandidateDetailDrawer
          pipelineId={selectedPipelineId}
          requirementId={id}
          onClose={() => setSelectedPipelineId(null)}
        />
      )}

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

      {/* Status change dialog */}
      <Dialog open={!!statusDialog} onOpenChange={o => !o && setStatusDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Change to{' '}
              {statusDialog && STATUS_LABEL[statusDialog.toStatus as keyof typeof STATUS_LABEL]}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-800">
                Reason <span className="font-normal text-slate-500">(optional)</span>
              </Label>
              <Textarea
                placeholder="Why is this status changing?"
                value={statusReason}
                onChange={e => setStatusReason(e.target.value)}
                rows={3}
                className="resize-none text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(null)}>
              Cancel
            </Button>
            <Button
              disabled={statusMutation.isPending}
              onClick={() =>
                statusDialog &&
                statusMutation.mutate({ status: statusDialog.toStatus, reason: statusReason })
              }
            >
              {statusMutation.isPending ? 'Updating…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
