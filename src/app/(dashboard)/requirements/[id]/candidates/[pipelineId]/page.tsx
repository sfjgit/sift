/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
// File: page.tsx
// Path: src/app/(dashboard)/requirements/[id]/candidates/[pipelineId]/page.tsx

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Mail,
  Phone,
  Briefcase,
  Clock,
  MapPin,
  FileText,
  TrendingUp,
  ArrowUpDown,
  ChevronRight,
  Send,
  DollarSign,
  PauseCircle,
  XCircle,
  LogOut,
  Loader2,
  AlertCircle,
  MoreHorizontal,
  Linkedin,
  Github,
  Globe,
  Link2,
  GraduationCap,
  Building2,
  Calendar,
  Tag,
  X,
  History,
  Pencil,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAxios } from '@/hooks/useAxios';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface StageLog {
  id: string;
  fromStageId: string | null;
  toStageId: string;
  timeInPrevStageMins: number | null;
  wasSkipped: boolean;
  skipReason: string | null;
  note: string | null;
  createdAt: string;
  fromStage: { id: string; code: string; label: string; order: number } | null;
  toStage: { id: string; code: string; label: string; order: number };
  changedBy: { id: string; firstName: string; lastName: string };
}

interface CandidateDetail {
  id: string;
  requirementId: string;
  recruiterId: string;
  currentStageId: string;
  stageUpdatedAt: string;
  isRejected: boolean;
  isWithdrawn: boolean;
  isOnHold: boolean;
  onHoldAt: string | null;
  onHoldReason: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  withdrawnAt: string | null;
  withdrawnReason: string | null;
  submittedAt: string | null;
  submissionNote: string | null;
  offeredCtc: number | null;
  salaryCurrency: string | null;
  salaryType: string | null;
  offeredAt: string | null;
  offerStatus: string | null;
  expectedJoiningDate: string | null;
  actualJoiningDate: string | null;
  createdAt: string;
  updatedAt: string;
  currentStage: { id: string; code: string; label: string; order: number };
  recruiter: { id: string; firstName: string; lastName: string };
  stageUpdatedBy: { id: string; firstName: string; lastName: string };
  submittedBy: { id: string; firstName: string; lastName: string } | null;
  offeredBy: { id: string; firstName: string; lastName: string } | null;
  rejectedBy: { id: string; firstName: string; lastName: string } | null;
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
    createdBy: { id: string; firstName: string; lastName: string };
  };
  stageHistory: StageLog[];
  aging: { minutes: number; label: string };
  totalPipelineAging: { minutes: number; label: string };
}

interface CandidateDetailResponse {
  success: boolean;
  data: CandidateDetail;
  permissions: { canEdit: boolean; canDelete: boolean };
}

type ActionType = 'move' | 'reject' | 'withdraw' | 'hold' | 'submit' | 'offer' | null;

interface PipelineStage {
  id: string;
  code: string;
  label: string;
  order: number;
  isMandatory: boolean;
  isTerminal: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<
  string,
  { bg: string; text: string; dot: string; border: string; bar: string }
> = {
  '01': {
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    dot: 'bg-slate-500',
    border: 'border-slate-300',
    bar: 'bg-slate-400',
  },
  '02': {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    dot: 'bg-blue-500',
    border: 'border-blue-300',
    bar: 'bg-blue-500',
  },
  '03': {
    bg: 'bg-indigo-50',
    text: 'text-indigo-800',
    dot: 'bg-indigo-500',
    border: 'border-indigo-300',
    bar: 'bg-indigo-500',
  },
  '04': {
    bg: 'bg-violet-50',
    text: 'text-violet-800',
    dot: 'bg-violet-500',
    border: 'border-violet-300',
    bar: 'bg-violet-500',
  },
  '05': {
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    dot: 'bg-purple-500',
    border: 'border-purple-300',
    bar: 'bg-purple-500',
  },
  '06': {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    dot: 'bg-amber-500',
    border: 'border-amber-300',
    bar: 'bg-amber-500',
  },
  '7B': {
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    dot: 'bg-orange-500',
    border: 'border-orange-300',
    bar: 'bg-orange-500',
  },
  '8B': {
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    dot: 'bg-rose-500',
    border: 'border-rose-300',
    bar: 'bg-rose-500',
  },
  '9B': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    dot: 'bg-emerald-500',
    border: 'border-emerald-300',
    bar: 'bg-emerald-500',
  },
  '10B': {
    bg: 'bg-green-100',
    text: 'text-green-900',
    dot: 'bg-green-600',
    border: 'border-green-400',
    bar: 'bg-green-600',
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

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{title}</p>
        {action}
      </div>
      <div className="bg-white">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE HISTORY BOTTOM SHEET
// ─────────────────────────────────────────────────────────────────────────────

function StageHistorySheet({
  open,
  onClose,
  p,
}: {
  open: boolean;
  onClose: () => void;
  p: CandidateDetail;
}) {
  const c = SC(p.currentStage.code);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 bg-white rounded-t-2xl shadow-2xl border-t border-slate-200 flex flex-col"
        style={{ maxHeight: '75vh' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4 pt-2 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
              <History className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Stage History</h3>
              <p className="text-xs text-slate-500">
                {p.stageHistory.length} transitions · {p.totalPipelineAging.label} total
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 shrink-0">
          {[
            { label: 'In Stage', value: p.aging.label, icon: <Clock className="w-3.5 h-3.5" /> },
            {
              label: 'Total Time',
              value: p.totalPipelineAging.label,
              icon: <TrendingUp className="w-3.5 h-3.5" />,
            },
            {
              label: 'Transitions',
              value: String(p.stageHistory.length),
              icon: <ArrowUpDown className="w-3.5 h-3.5" />,
            },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center py-4 gap-1">
              <div className="flex items-center gap-1.5 text-slate-400">
                {s.icon}
                <span className="text-[10px] uppercase tracking-wide font-semibold">{s.label}</span>
              </div>
              <p className="text-2xl font-black text-slate-900">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="overflow-y-auto flex-1 px-6 py-6">
          {p.stageHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <ArrowUpDown className="w-8 h-8 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">No transitions yet</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-[17px] top-4 bottom-4 w-px bg-slate-200" />
              <div className="space-y-0">
                {p.stageHistory.map(log => {
                  const lc = SC(log.toStage.code);
                  return (
                    <div key={log.id} className="relative flex gap-5 pb-6">
                      <div
                        className={`relative z-10 w-9 h-9 rounded-full shrink-0 flex items-center justify-center ${lc.bg} border-2 ${lc.border}`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${lc.dot}`} />
                      </div>
                      <div className="flex-1 min-w-0 pt-1.5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {log.fromStage && (
                                <>
                                  <span className="text-xs font-medium text-slate-400">
                                    {log.fromStage.label}
                                  </span>
                                  <ChevronRight className="w-3 h-3 text-slate-300" />
                                </>
                              )}
                              <span className={`text-sm font-bold ${lc.text}`}>
                                {log.toStage.label}
                              </span>
                              {log.wasSkipped && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                  Skipped
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400">
                              by{' '}
                              <span className="font-semibold text-slate-600">
                                {log.changedBy.firstName} {log.changedBy.lastName}
                              </span>
                              {' · '}
                              {format(new Date(log.createdAt), 'dd MMM yyyy, HH:mm')}
                            </p>
                            {log.note && (
                              <p className="text-xs text-slate-600 italic mt-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                "{log.note}"
                              </p>
                            )}
                            {log.skipReason && (
                              <p className="text-xs text-amber-700 mt-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                Skip reason: {log.skipReason}
                              </p>
                            )}
                          </div>
                          {log.timeInPrevStageMins != null && log.timeInPrevStageMins > 0 && (
                            <div className="shrink-0 text-right bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                              <p className="text-sm font-black text-slate-800">
                                {formatMins(log.timeInPrevStageMins)}
                              </p>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                                in prev
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Current live node */}
                <div className="relative flex gap-5">
                  <div
                    className={`relative z-10 w-9 h-9 rounded-full shrink-0 flex items-center justify-center ${c.bg} border-2 border-primary`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${c.dot} animate-pulse`} />
                  </div>
                  <div className="pt-1.5">
                    <p className="text-sm font-bold text-primary">Now · {p.currentStage.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{p.aging.label} here so far</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION DIALOGS
// ─────────────────────────────────────────────────────────────────────────────

function MoveStageDialog({
  pipeline,
  stages,
  open,
  onClose,
  onDone,
}: {
  pipeline: CandidateDetail;
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
        <div className="py-1">
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
  pipeline: CandidateDetail;
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
          </div>
          <div>
            <Label className="text-sm font-semibold text-slate-800 mb-2 block">
              Note <span className="font-normal text-slate-500">(optional)</span>
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
  pipeline: CandidateDetail;
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-semibold text-slate-800 mb-2 block">CTC (₹)</Label>
              <Input
                type="number"
                value={ctc}
                onChange={e => setCtc(e.target.value)}
                placeholder="e.g. 800000"
                className="h-10 text-sm"
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
// EDIT STATE
// ─────────────────────────────────────────────────────────────────────────────

interface EditState {
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
  doNotContact: boolean;
  doNotContactReason: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function CandidateDetailPage() {
  const { id: requirementId, pipelineId } = useParams<{ id: string; pipelineId: string }>();
  const router = useRouter();
  const axios = useAxios();
  const qc = useQueryClient();

  const [actionDialog, setActionDialog] = useState<ActionType>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editState, setEditState] = useState<EditState | null>(null);

  const { data, isLoading, isError } = useQuery<CandidateDetailResponse>({
    queryKey: ['candidate-detail', requirementId, pipelineId],
    queryFn: async () =>
      (await axios.get(`/requirements/${requirementId}/candidates/${pipelineId}`)).data,
    enabled: !!requirementId && !!pipelineId,
  });

  const stagesQuery = useQuery<{ success: boolean; data: PipelineStage[] }>({
    queryKey: ['pipeline-stages-candidate', requirementId],
    queryFn: async () => (await axios.get(`/pipeline-stages`)).data,
    enabled: !!data,
  });

  const candidateServiceId = data?.data?.snapshot?.candidateServiceId;
  const profileQuery = useQuery<{ success: boolean; data: any }>({
    queryKey: ['candidate-profile', candidateServiceId],
    queryFn: async () =>
      (
        await axios.get(`/candidate/api/candidates/${candidateServiceId}`, {
          baseURL: '/api/proxy',
        })
      ).data,
    enabled: !!candidateServiceId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['candidate-detail', requirementId, pipelineId] });
    qc.invalidateQueries({ queryKey: ['requirement-candidates', requirementId] });
    qc.invalidateQueries({ queryKey: ['requirement-detail', requirementId] });
    qc.invalidateQueries({ queryKey: ['candidate-profile', candidateServiceId] });
  };

  const updateMut = useMutation({
    mutationFn: async (payload: Partial<EditState>) => {
      const body: any = { ...payload };
      if (body.currentSalary !== undefined)
        body.currentSalary = body.currentSalary ? parseFloat(body.currentSalary) : null;
      if (body.expectedSalary !== undefined)
        body.expectedSalary = body.expectedSalary ? parseFloat(body.expectedSalary) : null;
      if (body.noticePeriodDays !== undefined)
        body.noticePeriodDays = body.noticePeriodDays ? parseInt(body.noticePeriodDays) : null;
      return axios.patch(`/candidates/${candidateServiceId}`, body, { baseURL: '/api/proxy' });
    },
    onSuccess: () => {
      toast.success('Candidate updated');
      invalidate();
      setEditing(false);
      setEditState(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Update failed'),
  });

  const startEditing = (cp: any) => {
    setEditState({
      phone: cp?.phone ?? '',
      altPhone: cp?.altPhone ?? '',
      linkedinUrl: cp?.linkedinUrl ?? '',
      githubUrl: cp?.githubUrl ?? '',
      portfolioUrl: cp?.portfolioUrl ?? '',
      otherUrl: cp?.otherUrl ?? '',
      currentSalary: cp?.currentSalary != null ? String(cp.currentSalary) : '',
      expectedSalary: cp?.expectedSalary != null ? String(cp.expectedSalary) : '',
      salaryType: cp?.salaryType ?? '',
      noticePeriodDays: cp?.noticePeriodDays != null ? String(cp.noticePeriodDays) : '',
      isImmediateJoiner: cp?.isImmediateJoiner ?? false,
      doNotContact: cp?.doNotContact ?? false,
      doNotContactReason: cp?.doNotContactReason ?? '',
    });
    setEditing(true);
  };

  const set = (key: keyof EditState, val: any) =>
    setEditState(prev => (prev ? { ...prev, [key]: val } : prev));

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
        <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-4xl mx-auto w-full">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
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

  const p = data.data;
  const snap = p.snapshot;
  const raw = snap.rawSnapshot ?? {};
  const perms = data.permissions;
  const canEdit = perms.canEdit;
  const c = SC(p.currentStage.code);
  const isTerminated = p.isRejected || p.isWithdrawn;
  const pipelineStages = stagesQuery.data?.data ?? [];

  const cp = profileQuery.data?.data ?? null;
  const skills = cp?.skills?.length
    ? cp.skills
    : (snap.topSkills?.map((s: string) => ({ rawSkill: s, yearsExp: null, proficiency: null })) ??
      []);
  const experiences = cp?.experiences ?? [];
  const educations = cp?.educations ?? [];
  const certifications = cp?.certifications ?? [];
  const pipelineHistory = cp?.requirements ?? [];
  const resumes = cp?.resumes?.length
    ? cp.resumes
    : snap.resumeUrl
      ? [
          {
            id: '1',
            fileName: 'Resume',
            url: snap.resumeUrl,
            isActive: true,
            parseStatus: 'DONE',
            createdAt: snap.snapshotAt,
          },
        ]
      : [];

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
            <AvatarFallback className={`text-sm font-bold ${avatarColor(snap.candidateServiceId)}`}>
              {initials(snap.fullName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-base font-bold text-slate-900">{snap.fullName}</h1>
              <span
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${c.bg} ${c.text} ${c.border}`}
              >
                <span className={`w-2 h-2 rounded-full ${c.dot} animate-pulse`} />
                {p.currentStage.label}
              </span>
              {p.isRejected && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 border border-rose-300">
                  Rejected
                </span>
              )}
              {p.isWithdrawn && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 border border-slate-300">
                  Withdrawn
                </span>
              )}
              {p.isOnHold && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-300">
                  On Hold
                </span>
              )}
              {p.offeredCtc && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 border border-violet-300">
                  ₹{(p.offeredCtc / 100000).toFixed(1)}L Offer · {p.offerStatus}
                </span>
              )}
            </div>
            {(snap.currentTitle || snap.currentCompany) && (
              <p className="text-sm text-slate-500 mt-0.5">
                {snap.currentTitle}
                {snap.currentTitle && snap.currentCompany ? ' · ' : ''}
                {snap.currentCompany}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Stage history */}
            <Button
              size="sm"
              variant="outline"
              className="gap-2 h-8 text-sm font-semibold"
              onClick={() => setHistoryOpen(true)}
            >
              <History className="w-3.5 h-3.5" />
              Stage History
              {p.stageHistory.length > 0 && (
                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full ml-0.5">
                  {p.stageHistory.length}
                </span>
              )}
            </Button>

            {/* Edit / Save / Cancel */}
            {editing ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 h-8 text-sm"
                  onClick={() => {
                    setEditing(false);
                    setEditState(null);
                  }}
                  disabled={updateMut.isPending}
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="gap-2 h-8 text-sm font-semibold"
                  onClick={() => editState && updateMut.mutate(editState)}
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
              canEdit &&
              !isTerminated && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 h-8 text-sm font-semibold"
                  onClick={() => startEditing(cp)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Button>
              )
            )}

            {/* Pipeline actions — hidden while editing */}
            {canEdit && !isTerminated && !editing && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 h-8 text-sm font-semibold"
                  onClick={() => setActionDialog('move')}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  Move Stage
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 h-8 text-sm font-semibold"
                  onClick={() => setActionDialog('submit')}
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 h-8 text-sm font-semibold"
                  onClick={() => setActionDialog('offer')}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  Offer
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    {!p.isOnHold && (
                      <DropdownMenuItem
                        onClick={() => setActionDialog('hold')}
                        className="text-amber-700 font-medium text-sm"
                      >
                        <PauseCircle className="w-4 h-4 mr-2" />
                        Put on Hold
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => setActionDialog('withdraw')}
                      className="text-slate-700 font-medium text-sm"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Withdraw
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setActionDialog('reject')}
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
      </div>

      {/* ═══ BODY ═══ */}
      <div className="flex-1 overflow-y-auto bg-slate-50/30">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">
          {/* STATUS BANNERS */}
          {(p.isRejected || p.isWithdrawn || p.isOnHold || p.offeredCtc) && (
            <div className="flex flex-wrap gap-3">
              {p.isRejected && (
                <div className="flex-1 min-w-[200px] bg-rose-50 border border-rose-200 rounded-xl px-5 py-4">
                  <p className="text-xs font-bold text-rose-700 uppercase tracking-wide mb-1">
                    Rejected
                  </p>
                  {p.rejectedAt && (
                    <p className="text-xs text-rose-600">
                      {format(new Date(p.rejectedAt), 'dd MMM yyyy')}
                    </p>
                  )}
                  {p.rejectionReason && (
                    <p className="text-sm font-medium text-rose-800 mt-1">{p.rejectionReason}</p>
                  )}
                </div>
              )}
              {p.isWithdrawn && (
                <div className="flex-1 min-w-[200px] bg-slate-100 border border-slate-200 rounded-xl px-5 py-4">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                    Withdrawn
                  </p>
                  {p.withdrawnAt && (
                    <p className="text-xs text-slate-500">
                      {format(new Date(p.withdrawnAt), 'dd MMM yyyy')}
                    </p>
                  )}
                  {p.withdrawnReason && (
                    <p className="text-sm font-medium text-slate-700 mt-1">{p.withdrawnReason}</p>
                  )}
                </div>
              )}
              {p.isOnHold && (
                <div className="flex-1 min-w-[200px] bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">
                    On Hold
                  </p>
                  {p.onHoldAt && (
                    <p className="text-xs text-amber-600">
                      {format(new Date(p.onHoldAt), 'dd MMM yyyy')}
                    </p>
                  )}
                  {p.onHoldReason && (
                    <p className="text-sm font-medium text-amber-800 mt-1">{p.onHoldReason}</p>
                  )}
                </div>
              )}
              {p.offeredCtc && (
                <div className="flex-1 min-w-[200px] bg-violet-50 border border-violet-200 rounded-xl px-5 py-4">
                  <p className="text-xs font-bold text-violet-700 uppercase tracking-wide mb-1">
                    Offer Rolled
                  </p>
                  <p className="text-lg font-black text-violet-900">
                    ₹{(p.offeredCtc / 100000).toFixed(1)}L
                  </p>
                  <p className="text-xs text-violet-600">
                    {p.salaryType} · {p.offerStatus}
                  </p>
                  {p.offeredAt && (
                    <p className="text-xs text-violet-500 mt-0.5">
                      {format(new Date(p.offeredAt), 'dd MMM yyyy')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* OVERVIEW */}
          <Section title="Overview">
            <div className="grid grid-cols-2 divide-x divide-slate-100">
              {/* Contact column */}
              <div className="p-5 space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Contact
                </p>
                <div className="space-y-3">
                  {[
                    {
                      icon: <Mail className="w-3.5 h-3.5 text-slate-400" />,
                      label: 'Email',
                      value: snap.email,
                      editable: false,
                    },
                    {
                      icon: <Phone className="w-3.5 h-3.5 text-slate-400" />,
                      label: 'Phone',
                      value: editing ? es?.phone : (snap.phone ?? raw?.phone),
                      editKey: 'phone' as keyof EditState,
                    },
                    {
                      icon: <Briefcase className="w-3.5 h-3.5 text-slate-400" />,
                      label: 'Experience',
                      value: formatExp(snap.totalExpYears),
                      editable: false,
                    },
                    {
                      icon: <MapPin className="w-3.5 h-3.5 text-slate-400" />,
                      label: 'Location',
                      value: raw?.location,
                      editable: false,
                    },
                  ]
                    .filter(r => r.value || editing)
                    .map(row => (
                      <div key={row.label} className="flex items-start gap-3">
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
                            <p className="text-sm font-semibold text-slate-800 break-words mt-0.5">
                              {row.value || '—'}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Pipeline meta column */}
              <div className="p-5 space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Pipeline
                </p>
                <div className="space-y-3">
                  {[
                    {
                      label: 'Recruiter',
                      value: `${p.recruiter.firstName} ${p.recruiter.lastName}`,
                    },
                    {
                      label: 'Added on',
                      value: format(new Date(p.createdAt), 'dd MMM yyyy, HH:mm'),
                    },
                    {
                      label: 'Stage updated by',
                      value: `${p.stageUpdatedBy.firstName} ${p.stageUpdatedBy.lastName}`,
                    },
                    { label: 'In stage', value: p.aging.label },
                    { label: 'Total time', value: p.totalPipelineAging.label },
                    p.submittedAt
                      ? {
                          label: 'Submitted',
                          value: format(new Date(p.submittedAt), 'dd MMM yyyy'),
                        }
                      : null,
                    p.submittedBy
                      ? {
                          label: 'Submitted by',
                          value: `${p.submittedBy.firstName} ${p.submittedBy.lastName}`,
                        }
                      : null,
                    p.expectedJoiningDate
                      ? {
                          label: 'Expected joining',
                          value: format(new Date(p.expectedJoiningDate), 'dd MMM yyyy'),
                        }
                      : null,
                  ]
                    .filter(Boolean)
                    .map((row: any) => (
                      <div key={row.label} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500">{row.label}</span>
                        <span className="text-xs font-semibold text-slate-800 text-right">
                          {row.value}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </Section>

          {/* SKILLS */}
          {skills.length > 0 && (
            <Section title={`Skills (${skills.length})`}>
              <div className="px-5 py-4 flex flex-wrap gap-2">
                {skills.map((s: any, i: number) => (
                  <div
                    key={s.id ?? i}
                    className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5"
                  >
                    <span className="text-xs font-semibold text-slate-800">{s.rawSkill ?? s}</span>
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

          {/* COMPENSATION */}
          <Section
            title="Compensation & Availability"
            action={
              editing ? (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Switch
                    checked={es?.isImmediateJoiner ?? false}
                    onCheckedChange={v => set('isImmediateJoiner', v)}
                  />
                  <span className="font-semibold">Immediate Joiner</span>
                </div>
              ) : cp?.isImmediateJoiner ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                  Immediate Joiner
                </span>
              ) : null
            }
          >
            <div className="grid grid-cols-3 divide-x divide-slate-100">
              {[
                {
                  label: 'Current CTC',
                  key: 'currentSalary',
                  value:
                    cp?.currentSalary != null
                      ? `₹${cp.currentSalary.toLocaleString()}`
                      : (raw?.currentSalary ?? null),
                },
                {
                  label: 'Expected CTC',
                  key: 'expectedSalary',
                  value:
                    cp?.expectedSalary != null ? `₹${cp.expectedSalary.toLocaleString()}` : null,
                },
                {
                  label: 'Notice Period',
                  key: 'noticePeriodDays',
                  value:
                    cp?.noticePeriodDays != null
                      ? `${cp.noticePeriodDays} days`
                      : (raw?.noticePeriod ?? null),
                },
              ].map(col => (
                <div key={col.label} className="p-5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                    {col.label}
                  </p>
                  {editing ? (
                    <Input
                      type="number"
                      value={(es as any)?.[col.key] ?? ''}
                      onChange={e => set(col.key as any, e.target.value)}
                      className="h-8 text-sm px-2"
                      placeholder="—"
                    />
                  ) : (
                    <p className="text-base font-black text-slate-900">{col.value ?? '—'}</p>
                  )}
                </div>
              ))}
            </div>
          </Section>

          {/* LINKS */}
          {(cp?.linkedinUrl || cp?.githubUrl || cp?.portfolioUrl || cp?.otherUrl || editing) && (
            <Section title="Links">
              <div className="divide-y divide-slate-100">
                {[
                  {
                    icon: <Linkedin className="w-3.5 h-3.5 text-sky-600" />,
                    label: 'LinkedIn',
                    key: 'linkedinUrl',
                    val: editing ? es?.linkedinUrl : cp?.linkedinUrl,
                  },
                  {
                    icon: <Github className="w-3.5 h-3.5 text-slate-700" />,
                    label: 'GitHub',
                    key: 'githubUrl',
                    val: editing ? es?.githubUrl : cp?.githubUrl,
                  },
                  {
                    icon: <Globe className="w-3.5 h-3.5 text-indigo-500" />,
                    label: 'Portfolio',
                    key: 'portfolioUrl',
                    val: editing ? es?.portfolioUrl : cp?.portfolioUrl,
                  },
                  {
                    icon: <Link2 className="w-3.5 h-3.5 text-slate-400" />,
                    label: 'Other',
                    key: 'otherUrl',
                    val: editing ? es?.otherUrl : cp?.otherUrl,
                  },
                ]
                  .filter(row => row.val || editing)
                  .map(row => (
                    <div key={row.label} className="flex items-center gap-4 px-5 py-3">
                      <div className="shrink-0">{row.icon}</div>
                      <p className="text-xs font-semibold text-slate-500 w-16 shrink-0">
                        {row.label}
                      </p>
                      {editing ? (
                        <Input
                          value={(es as any)?.[row.key] ?? ''}
                          onChange={e => set(row.key as any, e.target.value)}
                          className="flex-1 h-7 text-xs px-2"
                          placeholder={`${row.label} URL`}
                        />
                      ) : row.val ? (
                        <a
                          href={row.val}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-primary hover:underline truncate"
                        >
                          {row.val}
                        </a>
                      ) : null}
                    </div>
                  ))}
              </div>
            </Section>
          )}

          {/* EXPERIENCE */}
          {experiences.length > 0 && (
            <Section title={`Experience (${experiences.length})`}>
              <div className="divide-y divide-slate-100">
                {experiences.map((exp: any) => (
                  <div key={exp.id} className="px-5 py-5 flex gap-4">
                    <div className="shrink-0 mt-0.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
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

          {/* EDUCATION */}
          {educations.length > 0 && (
            <Section title={`Education (${educations.length})`}>
              <div className="divide-y divide-slate-100">
                {educations.map((edu: any) => (
                  <div key={edu.id} className="px-5 py-4 flex gap-4">
                    <div className="shrink-0 mt-0.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
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

          {/* CERTIFICATIONS */}
          {certifications.length > 0 && (
            <Section title={`Certifications (${certifications.length})`}>
              <div className="divide-y divide-slate-100">
                {certifications.map((cert: any) => (
                  <div key={cert.id} className="px-5 py-3 flex items-center gap-3">
                    <Tag className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800">{cert.name}</p>
                      {cert.issuer && <p className="text-xs text-slate-400">{cert.issuer}</p>}
                    </div>
                    {cert.issueDate && (
                      <span className="text-xs text-slate-400 shrink-0">
                        {format(new Date(cert.issueDate), 'MMM yyyy')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* RESUMES */}
          {resumes.length > 0 && (
            <Section title="Resumes">
              <div className="divide-y divide-slate-100">
                {resumes.map((r: any) => (
                  <div key={r.id} className="flex items-center gap-4 px-5 py-3">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{r.fileName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {format(new Date(r.createdAt), 'dd MMM yyyy')} · {r.parseStatus}
                        {r.isActive && (
                          <span className="ml-2 text-emerald-600 font-semibold">· Active</span>
                        )}
                      </p>
                    </div>
                    {r.url && (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-primary hover:underline shrink-0"
                      >
                        View
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* PIPELINE HISTORY */}
          {pipelineHistory.length > 0 && (
            <Section title={`Pipeline History (${pipelineHistory.length} requirements)`}>
              <div className="divide-y divide-slate-100">
                {pipelineHistory.map((req: any) => (
                  <div
                    key={req.id}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 cursor-pointer group transition-colors"
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
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-colors shrink-0" />
                  </div>
                ))}
              </div>
            </Section>
          )}

          <div className="h-4" />
        </div>
      </div>

      {/* ═══ STAGE HISTORY BOTTOM SHEET ═══ */}
      <StageHistorySheet open={historyOpen} onClose={() => setHistoryOpen(false)} p={p} />

      {/* ═══ ACTION DIALOGS ═══ */}
      {actionDialog === 'move' && (
        <MoveStageDialog
          pipeline={p}
          stages={pipelineStages}
          open
          onClose={() => setActionDialog(null)}
          onDone={invalidate}
        />
      )}
      {actionDialog === 'submit' && (
        <SubmitDialog pipeline={p} open onClose={() => setActionDialog(null)} onDone={invalidate} />
      )}
      {actionDialog === 'offer' && (
        <OfferDialog pipeline={p} open onClose={() => setActionDialog(null)} onDone={invalidate} />
      )}
      {actionDialog === 'reject' && (
        <SimpleActionDialog
          open
          onClose={() => setActionDialog(null)}
          onDone={invalidate}
          title="Reject Candidate"
          icon={<XCircle className="w-4 h-4 text-rose-600" />}
          placeholder="Why is this candidate being rejected?"
          actionLabel="Reject"
          actionVariant="danger"
          endpoint={`/pipeline/${p.id}/reject`}
          bodyKey="rejectionReason"
        />
      )}
      {actionDialog === 'withdraw' && (
        <SimpleActionDialog
          open
          onClose={() => setActionDialog(null)}
          onDone={invalidate}
          title="Withdraw Candidate"
          icon={<LogOut className="w-4 h-4 text-slate-600" />}
          placeholder="Why is this candidate withdrawing?"
          actionLabel="Withdraw"
          endpoint={`/pipeline/${p.id}/withdraw`}
          bodyKey="withdrawnReason"
        />
      )}
      {actionDialog === 'hold' && (
        <SimpleActionDialog
          open
          onClose={() => setActionDialog(null)}
          onDone={invalidate}
          title="Put on Hold"
          icon={<PauseCircle className="w-4 h-4 text-amber-600" />}
          placeholder="Why is this candidate on hold?"
          actionLabel="Put on Hold"
          actionVariant="amber"
          endpoint={`/pipeline/${p.id}/hold`}
          bodyKey="onHoldReason"
        />
      )}
    </div>
  );
}
