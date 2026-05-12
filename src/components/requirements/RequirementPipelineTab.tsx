/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAxios } from '@/hooks/useAxios';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Plus,
  ExternalLink,
  Users,
  PauseCircle,
  UserX,
  Clock,
  Briefcase,
  ArrowRight,
  Send,
  DollarSign,
  LogOut,
  MoreHorizontal,
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  RejectDialog,
  WithdrawDialog,
  HoldDialog,
  SubmitDialog,
  OfferDialog,
  MoveStageDialog,
} from '@/components/pipeline/PipelineActionDialogs';
import { usePipelineStages } from '@/components/pipeline/usePipeline';

// ── stage colors by code ──────────────────────────────────────────────────────
const STAGE_COLORS: Record<string, string> = {
  '01': 'bg-slate-100 text-slate-700 border-slate-200',
  '02': 'bg-blue-50 text-blue-700 border-blue-200',
  '03': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  '04': 'bg-violet-50 text-violet-700 border-violet-200',
  '05': 'bg-purple-50 text-purple-700 border-purple-200',
  '06': 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  '07A': 'bg-pink-50 text-pink-700 border-pink-200',
  '07B': 'bg-pink-50 text-pink-700 border-pink-200',
  '08': 'bg-rose-50 text-rose-700 border-rose-200',
  '09': 'bg-orange-50 text-orange-700 border-orange-200',
  '10': 'bg-green-50 text-green-700 border-green-200',
};

type Dialog = 'reject' | 'withdraw' | 'hold' | 'submit' | 'offer' | 'move' | 'close' | null;

type Props = {
  requirementId: string;
  currentStatus: string;
  canEdit: boolean;
  serviceLineId?: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Close candidate dialog — final state, only at offer accepted
// ─────────────────────────────────────────────────────────────────────────────
function CloseDialog({
  pipeline,
  open,
  onClose,
}: {
  pipeline: any;
  open: boolean;
  onClose: () => void;
}) {
  const axios = useAxios();
  const qc = useQueryClient();
  const [joiningDate, setJoiningDate] = useState('');
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      // move to terminal stage (10) — Joined
      return axios.patch(`/pipeline/${pipeline.id}/stage`, {
        stageId: pipeline._joinedStageId,
        note: note || 'Candidate closed / joined',
        skipReason: null,
      });
    },
    onSuccess: () => {
      toast.success('Candidate marked as Joined');
      qc.invalidateQueries({ queryKey: ['requirement-pipeline', pipeline.requirementId] });
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed'),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark as Joined — {pipeline?.snapshot?.fullName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label>Actual Joining Date</Label>
            <Input type="date" value={joiningDate} onChange={e => setJoiningDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>
              Note <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Textarea
              rows={2}
              placeholder="Any closing notes..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Closing...' : 'Confirm Joined'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF Upload panel
// ─────────────────────────────────────────────────────────────────────────────
function UploadResumePanel({
  requirementId,
  recruiterId,
  onSuccess,
  onCancel,
}: {
  requirementId: string;
  recruiterId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const axios = useAxios();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'parsing' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('requirementId', requirementId);
      // formData.append('recruiterId', recruiterId);
      formData.append('source', 'MANUAL');

      setStatus('parsing');

      // hit candidate service ingest endpoint
      // adjust URL to your candidate service base
      await axios.post(process.env.NEXT_PUBLIC_API_URL + '/candidate/api/resume/ingest', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setStatus('done');
      toast.success('Resume uploaded and candidate added to pipeline');
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err?.response?.data?.message ?? 'Upload failed');
    }
  };

  return (
    <div className="rounded-lg border border-dashed p-5 space-y-4 bg-muted/20">
      <div className="flex items-center gap-2">
        <Upload className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">Upload Resume PDF</p>
        <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {/* Drop zone */}
      <div
        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => fileRef.current?.click()}
      >
        {file ? (
          <div className="flex items-center justify-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{file.name}</span>
            <span className="text-muted-foreground">({Math.round(file.size / 1024)} KB)</span>
          </div>
        ) : (
          <div className="space-y-1">
            <Upload className="h-6 w-6 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Click to select PDF</p>
            <p className="text-xs text-muted-foreground/60">Max 10MB</p>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) {
            setFile(f);
            setStatus('idle');
            setErrorMsg('');
          }
        }}
      />

      {/* Status */}
      {status === 'uploading' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
        </div>
      )}
      {status === 'parsing' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Parsing with AI...
        </div>
      )}
      {status === 'done' && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" /> Done — candidate added
        </div>
      )}
      {status === 'error' && <p className="text-sm text-destructive">{errorMsg}</p>}

      {file && status === 'idle' && (
        <Button size="sm" className="w-full" onClick={handleUpload}>
          Parse & Add to Pipeline
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual pipeline row
// ─────────────────────────────────────────────────────────────────────────────
function PipelineRow({
  pipeline: p,
  canEdit,
  stages,
  joinedStageId,
  onAction,
  onViewTimeline,
}: {
  pipeline: any;
  canEdit: boolean;
  stages: any[];
  joinedStageId: string | null;
  onAction: (action: Dialog, pipeline: any) => void;
  onViewTimeline: () => void;
}) {
  const stageColor = STAGE_COLORS[p.currentStage?.code] ?? 'bg-slate-100 text-slate-600';
  const isTerminated = p.isRejected || p.isWithdrawn;

  // show Close button only at offer accepted (offerStatus === ACCEPTED) for canEdit users
  const showClose = canEdit && p.offerStatus === 'ACCEPTED' && !p.isRejected && !p.isWithdrawn;

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-3.5 rounded-lg border bg-card transition-colors hover:bg-muted/20',
        isTerminated && 'opacity-55'
      )}
    >
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm truncate">{p.snapshot?.fullName}</p>
          {p.isOnHold && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200 shrink-0"
            >
              On Hold
            </Badge>
          )}
          {p.isRejected && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 bg-red-50 text-red-700 border-red-200 shrink-0"
            >
              Rejected
            </Badge>
          )}
          {p.isWithdrawn && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
              Withdrawn
            </Badge>
          )}
          {p.offerStatus === 'ACCEPTED' && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-200 shrink-0"
            >
              Offer Accepted
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {p.snapshot?.currentTitle && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Briefcase className="h-3 w-3" />
              {p.snapshot.currentTitle}
              {p.snapshot.currentCompany ? ` @ ${p.snapshot.currentCompany}` : ''}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{p.snapshot?.email}</span>
          {p.snapshot?.totalExpYears && (
            <span className="text-xs text-muted-foreground">{p.snapshot.totalExpYears}y exp</span>
          )}
        </div>
        {p.snapshot?.topSkills?.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {p.snapshot.topSkills.slice(0, 3).map((s: string) => (
              <span key={s} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-sm">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stage */}
      <div className="shrink-0">
        <Badge variant="outline" className={cn('text-xs whitespace-nowrap', stageColor)}>
          {p.currentStage?.code} {p.currentStage?.label}
        </Badge>
      </div>

      {/* Recruiter */}
      <div className="shrink-0 text-xs text-muted-foreground hidden md:block">
        {p.recruiter?.firstName} {p.recruiter?.lastName}
      </div>

      {/* Time */}
      <div className="shrink-0 items-center gap-1 text-xs text-muted-foreground hidden lg:flex">
        <Clock className="h-3 w-3" />
        {timeAgo(new Date(p.stageUpdatedAt))}
      </div>

      {/* Close button — client handler action */}
      {showClose && (
        <Button
          size="sm"
          className="shrink-0 h-7 text-xs bg-green-600 hover:bg-green-700"
          onClick={() => onAction('close', { ...p, _joinedStageId: joinedStageId })}
        >
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark Joined
        </Button>
      )}

      {/* Timeline link */}
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onViewTimeline}>
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>

      {/* Actions dropdown */}
      {canEdit && !isTerminated && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onAction('move', p)}>
              <ArrowRight className="h-4 w-4 mr-2" /> Move Stage
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('submit', p)}>
              <Send className="h-4 w-4 mr-2" /> Submit to Client
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('offer', p)}>
              <DollarSign className="h-4 w-4 mr-2" /> Roll Offer
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {!p.isOnHold && (
              <DropdownMenuItem onClick={() => onAction('hold', p)}>
                <PauseCircle className="h-4 w-4 mr-2" /> Put on Hold
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-amber-600" onClick={() => onAction('withdraw', p)}>
              <LogOut className="h-4 w-4 mr-2" /> Withdraw
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => onAction('reject', p)}>
              <UserX className="h-4 w-4 mr-2" /> Reject
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main tab
// ─────────────────────────────────────────────────────────────────────────────
export function RequirementPipelineTab({
  requirementId,
  currentStatus,
  canEdit,
  serviceLineId,
}: Props) {
  const axios = useAxios();
  const router = useRouter();
  const qc = useQueryClient();

  const [showUpload, setShowUpload] = useState(false);
  const [activeDialog, setActiveDialog] = useState<Dialog>(null);
  const [selectedPipeline, setSelectedPipeline] = useState<any>(null);

  const {
    data: pipelines = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['requirement-pipeline', requirementId],
    queryFn: async () => {
      const res = await axios.get(`/requirements/${requirementId}/candidates`);
      return res.data.data as any[];
    },
    enabled: !!requirementId,
  });

  const { data: stages = [] } = usePipelineStages(serviceLineId ?? undefined);

  // find joined stage id for close action
  const joinedStage = stages.find((s: any) => s.isTerminal);

  const openAction = (action: Dialog, pipeline: any) => {
    setSelectedPipeline(pipeline);
    setActiveDialog(action);
  };

  const closeDialog = () => {
    setActiveDialog(null);
    setSelectedPipeline(null);
    refetch();
  };

  const active = pipelines.filter((p: any) => !p.isRejected && !p.isWithdrawn);
  const terminated = pipelines.filter((p: any) => p.isRejected || p.isWithdrawn);
  const onHoldCount = active.filter((p: any) => p.isOnHold).length;
  const rejectedCount = terminated.filter((p: any) => p.isRejected).length;
  const withdrawnCount = terminated.filter((p: any) => p.isWithdrawn).length;

  const { user } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span className="font-medium text-foreground">{active.length}</span> active
          </span>
          {onHoldCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <PauseCircle className="h-3.5 w-3.5" /> {onHoldCount} on hold
            </span>
          )}
          {rejectedCount > 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <UserX className="h-3.5 w-3.5" /> {rejectedCount} rejected
            </span>
          )}
          {withdrawnCount > 0 && <span>{withdrawnCount} withdrawn</span>}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/pipeline?requirementId=${requirementId}`)}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Full Pipeline View
          </Button>
          {canEdit && currentStatus === 'ACTIVE' && (
            <Button
              size="sm"
              variant={showUpload ? 'secondary' : 'default'}
              onClick={() => setShowUpload(v => !v)}
            >
              <Upload className="h-4 w-4 mr-1.5" />
              {showUpload ? 'Hide Upload' : 'Upload Resume'}
            </Button>
          )}
        </div>
      </div>

      {/* Upload panel */}
      {showUpload && user && (
        <UploadResumePanel
          requirementId={requirementId}
          recruiterId={user.id}
          onSuccess={() => {
            setShowUpload(false);
            refetch();
          }}
          onCancel={() => setShowUpload(false)}
        />
      )}

      {/* Empty */}
      {pipelines.length === 0 && !showUpload && (
        <div className="flex flex-col items-center justify-center py-16 border rounded-lg border-dashed">
          <Users className="h-8 w-8 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No candidates yet</p>
          {canEdit && currentStatus === 'ACTIVE' && (
            <Button variant="link" size="sm" className="mt-2" onClick={() => setShowUpload(true)}>
              Upload a resume to get started
            </Button>
          )}
        </div>
      )}

      {/* Active candidates */}
      {active.length > 0 && (
        <div className="space-y-2">
          {active.map((p: any) => (
            <PipelineRow
              key={p.id}
              pipeline={p}
              canEdit={canEdit}
              stages={stages}
              joinedStageId={joinedStage?.id ?? null}
              onAction={openAction}
              onViewTimeline={() => router.push(`/pipeline/${p.id}`)}
            />
          ))}
        </div>
      )}

      {/* Terminated — collapsed */}
      {terminated.length > 0 && (
        <details className="group">
          <summary className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none list-none py-1">
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
            Show {terminated.length} rejected / withdrawn
          </summary>
          <div className="mt-2 space-y-2">
            {terminated.map((p: any) => (
              <PipelineRow
                key={p.id}
                pipeline={p}
                canEdit={false}
                stages={stages}
                joinedStageId={null}
                onAction={() => {}}
                onViewTimeline={() => router.push(`/pipeline/${p.id}`)}
              />
            ))}
          </div>
        </details>
      )}

      {/* Action dialogs */}
      {activeDialog === 'move' && selectedPipeline && (
        <MoveStageDialog pipeline={selectedPipeline} stages={stages} open onClose={closeDialog} />
      )}
      {activeDialog === 'submit' && selectedPipeline && (
        <SubmitDialog pipeline={selectedPipeline} open onClose={closeDialog} />
      )}
      {activeDialog === 'offer' && selectedPipeline && (
        <OfferDialog pipeline={selectedPipeline} open onClose={closeDialog} />
      )}
      {activeDialog === 'reject' && selectedPipeline && (
        <RejectDialog pipeline={selectedPipeline} open onClose={closeDialog} />
      )}
      {activeDialog === 'withdraw' && selectedPipeline && (
        <WithdrawDialog pipeline={selectedPipeline} open onClose={closeDialog} />
      )}
      {activeDialog === 'hold' && selectedPipeline && (
        <HoldDialog pipeline={selectedPipeline} open onClose={closeDialog} />
      )}
      {activeDialog === 'close' && selectedPipeline && (
        <CloseDialog pipeline={selectedPipeline} open onClose={closeDialog} />
      )}
    </div>
  );
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  return `${mins}m ago`;
}
