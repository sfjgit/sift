// components/service-lines/ToggleConfirmDialog.tsx
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
import type { ServiceLine } from './types';

interface Props {
  serviceLine: ServiceLine | null;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ToggleConfirmDialog({ serviceLine, isPending, onConfirm, onClose }: Props) {
  if (!serviceLine) return null;
  const deactivating = serviceLine.isActive;

  return (
    <AlertDialog open={!!serviceLine} onOpenChange={o => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {deactivating ? 'Deactivate' : 'Activate'} service line?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {deactivating
              ? `"${serviceLine.name}" will no longer be available for new SPOCs or requirements.`
              : `"${serviceLine.name}" will be available again for SPOCs and requirements.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            className={
              deactivating
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : ''
            }
            onClick={onConfirm}
          >
            {isPending ? 'Updating…' : deactivating ? 'Deactivate' : 'Activate'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
