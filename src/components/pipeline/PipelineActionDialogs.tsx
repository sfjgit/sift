/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useRejectCandidate,
  useWithdrawCandidate,
  useHoldCandidate,
  useSubmitCandidate,
  useRollOffer,
  useMoveStage,
  PipelineRow,
  PipelineStage,
} from './usePipeline';
import { toast } from 'sonner';

// ── shared dialog wrapper
function ActionDialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

// ── REJECT
const rejectSchema = z.object({ rejectionReason: z.string().min(1, 'Reason required').max(500) });
export function RejectDialog({
  pipeline,
  open,
  onClose,
}: {
  pipeline: PipelineRow;
  open: boolean;
  onClose: () => void;
}) {
  const reject = useRejectCandidate();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(rejectSchema),
  });
  const onSubmit = async (data: any) => {
    try {
      await reject.mutateAsync({ pipelineId: pipeline.id, rejectionReason: data.rejectionReason });
      toast.success('Candidate rejected');
      reset();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed');
    }
  };
  return (
    <ActionDialog open={open} onClose={onClose} title={`Reject — ${pipeline.snapshot.fullName}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
        <div className="space-y-1.5">
          <Label>
            Rejection Reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            rows={3}
            placeholder="Why is this candidate being rejected?"
            {...register('rejectionReason')}
          />
          {errors.rejectionReason && (
            <p className="text-xs text-destructive">{String(errors.rejectionReason.message)}</p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button variant="destructive" type="submit" disabled={reject.isPending}>
            {reject.isPending ? 'Rejecting...' : 'Reject'}
          </Button>
        </DialogFooter>
      </form>
    </ActionDialog>
  );
}

// ── WITHDRAW
const withdrawSchema = z.object({ withdrawnReason: z.string().min(1, 'Reason required').max(500) });
export function WithdrawDialog({
  pipeline,
  open,
  onClose,
}: {
  pipeline: PipelineRow;
  open: boolean;
  onClose: () => void;
}) {
  const withdraw = useWithdrawCandidate();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(withdrawSchema) });
  const onSubmit = async (data: any) => {
    try {
      await withdraw.mutateAsync({
        pipelineId: pipeline.id,
        withdrawnReason: data.withdrawnReason,
      });
      toast.success('Candidate withdrawn');
      reset();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed');
    }
  };
  return (
    <ActionDialog open={open} onClose={onClose} title={`Withdraw — ${pipeline.snapshot.fullName}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
        <div className="space-y-1.5">
          <Label>
            Withdrawal Reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            rows={3}
            placeholder="Why is this candidate withdrawing?"
            {...register('withdrawnReason')}
          />
          {errors.withdrawnReason && (
            <p className="text-xs text-destructive">{String(errors.withdrawnReason.message)}</p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={withdraw.isPending}>
            {withdraw.isPending ? 'Withdrawing...' : 'Withdraw'}
          </Button>
        </DialogFooter>
      </form>
    </ActionDialog>
  );
}

// ── HOLD
const holdSchema = z.object({ onHoldReason: z.string().min(1, 'Reason required').max(500) });
export function HoldDialog({
  pipeline,
  open,
  onClose,
}: {
  pipeline: PipelineRow;
  open: boolean;
  onClose: () => void;
}) {
  const hold = useHoldCandidate();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(holdSchema) });
  const onSubmit = async (data: any) => {
    try {
      await hold.mutateAsync({ pipelineId: pipeline.id, onHoldReason: data.onHoldReason });
      toast.success('Candidate placed on hold');
      reset();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed');
    }
  };
  return (
    <ActionDialog open={open} onClose={onClose} title={`Hold — ${pipeline.snapshot.fullName}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
        <div className="space-y-1.5">
          <Label>
            On Hold Reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            rows={3}
            placeholder="Why is this candidate on hold?"
            {...register('onHoldReason')}
          />
          {errors.onHoldReason && (
            <p className="text-xs text-destructive">{String(errors.onHoldReason.message)}</p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={hold.isPending}>
            {hold.isPending ? 'Holding...' : 'Put on Hold'}
          </Button>
        </DialogFooter>
      </form>
    </ActionDialog>
  );
}

// ── SUBMIT TO CLIENT
const submitSchema = z.object({ submissionNote: z.string().min(1, 'Note required').max(2000) });
export function SubmitDialog({
  pipeline,
  open,
  onClose,
}: {
  pipeline: PipelineRow;
  open: boolean;
  onClose: () => void;
}) {
  const submit = useSubmitCandidate();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(submitSchema) });
  const onSubmit = async (data: any) => {
    try {
      await submit.mutateAsync({ pipelineId: pipeline.id, submissionNote: data.submissionNote });
      toast.success('Candidate submitted to client');
      reset();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed');
    }
  };
  return (
    <ActionDialog
      open={open}
      onClose={onClose}
      title={`Submit to Client — ${pipeline.snapshot.fullName}`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
        <div className="space-y-1.5">
          <Label>
            Submission Note <span className="text-destructive">*</span>
          </Label>
          <Textarea
            rows={4}
            placeholder="Notes for the client..."
            {...register('submissionNote')}
          />
          {errors.submissionNote && (
            <p className="text-xs text-destructive">{String(errors.submissionNote.message)}</p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submit.isPending}>
            {submit.isPending ? 'Submitting...' : 'Submit to Client'}
          </Button>
        </DialogFooter>
      </form>
    </ActionDialog>
  );
}

// ── ROLL OFFER
const offerSchema = z.object({
  offeredCtc: z.coerce.number().min(1, 'CTC required'),
  salaryCurrency: z.string().default('INR'),
  salaryType: z.enum(['MONTHLY', 'ANNUAL', 'HOURLY', 'DAILY']),
  expectedJoiningDate: z.string().optional(),
});
export function OfferDialog({
  pipeline,
  open,
  onClose,
}: {
  pipeline: PipelineRow;
  open: boolean;
  onClose: () => void;
}) {
  const offer = useRollOffer();
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(offerSchema),
    defaultValues: { salaryCurrency: 'INR' },
  });
  const onSubmit = async (data: any) => {
    try {
      await offer.mutateAsync({ pipelineId: pipeline.id, ...data });
      toast.success('Offer rolled out');
      reset();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed');
    }
  };
  return (
    <ActionDialog
      open={open}
      onClose={onClose}
      title={`Roll Offer — ${pipeline.snapshot.fullName}`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>
              Offered CTC <span className="text-destructive">*</span>
            </Label>
            <Input type="number" placeholder="1200000" {...register('offeredCtc')} />
            {errors.offeredCtc && (
              <p className="text-xs text-destructive">{String(errors.offeredCtc.message)}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select defaultValue="INR" onValueChange={v => setValue('salaryCurrency', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INR">INR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>
              Salary Type <span className="text-destructive">*</span>
            </Label>
            <Select onValueChange={v => setValue('salaryType', v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANNUAL">Annual</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
                <SelectItem value="HOURLY">Hourly</SelectItem>
                <SelectItem value="DAILY">Daily</SelectItem>
              </SelectContent>
            </Select>
            {errors.salaryType && (
              <p className="text-xs text-destructive">{String(errors.salaryType.message)}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Expected Joining Date</Label>
            <Input type="date" {...register('expectedJoiningDate')} />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={offer.isPending}>
            {offer.isPending ? 'Rolling...' : 'Roll Offer'}
          </Button>
        </DialogFooter>
      </form>
    </ActionDialog>
  );
}

// ── MOVE STAGE
export function MoveStageDialog({
  pipeline,
  stages,
  open,
  onClose,
}: {
  pipeline: PipelineRow;
  stages: PipelineStage[];
  open: boolean;
  onClose: () => void;
}) {
  const moveStage = useMoveStage();
  const schema = z
    .object({
      stageId: z.string().min(1, 'Stage required'),
      skipReason: z.string().optional(),
      note: z.string().optional(),
      noticePeriod: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      const targetStage = stages.find(s => s.id === data.stageId);
      const isSubmittedToClient = targetStage?.canonicalStage === 'SUBMMITED';

      if (isSubmittedToClient && !data.noticePeriod?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['noticePeriod'],
          message: 'Notice period is required when submitting to client',
        });
      }
    });
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });
  const selectedStageId = watch('stageId');
  const validStages = stages.filter(s => s.order > pipeline.currentStage.order);

  // ← NEW: figure out if the currently-selected target stage is "Submitted to Client"
  const selectedStage = stages.find(s => s.id === selectedStageId);
  const requiresNoticePeriod = selectedStage?.canonicalStage === 'SUBMMITED';

  const onSubmit = async (data: any) => {
    try {
      await moveStage.mutateAsync({ pipelineId: pipeline.id, ...data });
      toast.success('Stage updated');
      reset();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed');
    }
  };

  return (
    <ActionDialog
      open={open}
      onClose={onClose}
      title={`Move Stage — ${pipeline.snapshot.fullName}`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
        <p className="text-sm text-muted-foreground">
          Current:{' '}
          <span className="font-medium text-foreground">{pipeline.currentStage.label}</span>
        </p>
        <div className="space-y-1.5">
          <Label>
            Move to Stage <span className="text-destructive">*</span>
          </Label>
          <Select onValueChange={v => setValue('stageId', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select next stage" />
            </SelectTrigger>
            <SelectContent>
              {validStages.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.code} — {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.stageId && (
            <p className="text-xs text-destructive">{String(errors.stageId.message)}</p>
          )}
        </div>

        {/* ← NEW: only rendered when the selected target is "Submitted to Client" */}
        {requiresNoticePeriod && (
          <div className="space-y-1.5">
            <Label>
              Notice Period <span className="text-destructive">*</span>
            </Label>
            <Input placeholder="e.g. 30 days" {...register('noticePeriod')} />
            {errors.noticePeriod && (
              <p className="text-xs text-destructive">{String(errors.noticePeriod.message)}</p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label>
            Skip Reason{' '}
            <span className="text-muted-foreground text-xs">
              (required if skipping mandatory stages)
            </span>
          </Label>
          <Input placeholder="Reason for skipping..." {...register('skipReason')} />
        </div>
        <div className="space-y-1.5">
          <Label>Note</Label>
          <Input placeholder="Optional note..." {...register('note')} />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={moveStage.isPending}>
            {moveStage.isPending ? 'Moving...' : 'Move Stage'}
          </Button>
        </DialogFooter>
      </form>
    </ActionDialog>
  );
}
