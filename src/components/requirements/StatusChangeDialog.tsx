// components/requirements/StatusChangeDialog.tsx
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { STATUS_OPTIONS } from './constants';
import type { RequirementStatus } from './types';
import { RequirementListItem } from '@/types/requirements.types';

interface Props {
  dialog: { req: RequirementListItem; to: RequirementStatus } | null;
  isPending: boolean;
  onConfirm: (req: RequirementListItem, to: RequirementStatus) => void;
  onClose: () => void;
}

export function StatusChangeDialog({ dialog, isPending, onConfirm, onClose }: Props) {
  return (
    <AlertDialog open={!!dialog} onOpenChange={o => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm status change</AlertDialogTitle>
          <AlertDialogDescription>
            Move <span className="font-medium text-foreground">{dialog?.req.reqCode}</span> to{' '}
            <span className="font-medium text-foreground">
              {STATUS_OPTIONS.find(s => s.value === dialog?.to)?.label}
            </span>
            ?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={() => dialog && onConfirm(dialog.req, dialog.to)}
          >
            {isPending ? 'Updating…' : 'Confirm'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
