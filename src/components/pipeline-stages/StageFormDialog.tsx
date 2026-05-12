/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateStage,
  useUpdateStage,
  useServiceLines,
  PipelineStage,
} from './usePipelineStages';

const schema = z.object({
  code: z.string().min(1, 'Code is required').max(10).trim().toUpperCase(),
  label: z.string().min(1, 'Label is required').max(100).trim(),
  order: z.coerce.number().int().min(1, 'Order must be at least 1'),
  serviceLineId: z.string().optional().nullable(),
  isMandatory: z.boolean().default(true),
  isTerminal: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  stage?: PipelineStage | null;
};

export function StageFormDialog({ open, onClose, stage }: Props) {
  const isEdit = !!stage;
  const { data: serviceLines = [] } = useServiceLines();
  const create = useCreateStage();
  const update = useUpdateStage();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    // @ts-expect-error errr
    resolver: zodResolver(schema),
    defaultValues: { isMandatory: true, isTerminal: false, isActive: true },
  });

  useEffect(() => {
    if (!open) return;
    reset(
      stage
        ? {
            code: stage.code,
            label: stage.label,
            order: stage.order,
            serviceLineId: stage.serviceLineId ?? null,
            isMandatory: stage.isMandatory,
            isTerminal: stage.isTerminal,
            isActive: stage.isActive,
          }
        : {
            code: '',
            label: '',
            order: undefined as any,
            serviceLineId: null,
            isMandatory: true,
            isTerminal: false,
            isActive: true,
          }
    );
  }, [open, stage, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit) {
        await update.mutateAsync({
          id: stage!.id,
          ...data,
          serviceLineId: data.serviceLineId ?? null,
        });
      } else {
        await create.mutateAsync({ ...data, serviceLineId: data.serviceLineId ?? null });
      }
      handleClose();
    } catch {
      /* handled by hooks */
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        if (!v) handleClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit Stage — ${stage!.code}` : 'New Pipeline Stage'}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={
            // @ts-expect-error errr
            handleSubmit(onSubmit)
          }
          className="space-y-4 pt-1"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Code <span className="text-destructive">*</span>
              </Label>
              <Input placeholder="e.g. 07C" {...register('code')} className="uppercase" />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>
                Order <span className="text-destructive">*</span>
              </Label>
              <Input type="number" min={1} placeholder="e.g. 7" {...register('order')} />
              {errors.order && <p className="text-xs text-destructive">{errors.order.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              Label <span className="text-destructive">*</span>
            </Label>
            <Input placeholder="e.g. Technical Assessment" {...register('label')} />
            {errors.label && <p className="text-xs text-destructive">{errors.label.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>
              Service Line{' '}
              <span className="text-muted-foreground text-xs">(leave blank = all)</span>
            </Label>
            <Select
              value={watch('serviceLineId') ?? 'all'}
              onValueChange={v => setValue('serviceLineId', v === 'all' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All service lines" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All service lines</SelectItem>
                {serviceLines.map(sl => (
                  <SelectItem key={sl.id} value={sl.id}>
                    {sl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 pt-1 border-t">
            <div className="flex items-center justify-between pt-3">
              <div>
                <p className="text-sm font-medium">Mandatory</p>
                <p className="text-xs text-muted-foreground">Skipping requires a reason</p>
              </div>
              <Switch
                checked={watch('isMandatory')}
                onCheckedChange={v => setValue('isMandatory', v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Terminal</p>
                <p className="text-xs text-muted-foreground">Final stage — no further movement</p>
              </div>
              <Switch
                checked={watch('isTerminal')}
                onCheckedChange={v => setValue('isTerminal', v)}
              />
            </div>
            {isEdit && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">
                    Inactive stages hidden from pipeline
                  </p>
                </div>
                <Switch
                  checked={watch('isActive')}
                  onCheckedChange={v => setValue('isActive', v)}
                />
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEdit
                  ? 'Saving...'
                  : 'Creating...'
                : isEdit
                  ? 'Save Changes'
                  : 'Create Stage'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
