// components/departments/ToggleConfirmDialog.tsx
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
import type { Department } from './types';

interface Props {
  department: Department | null;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ToggleConfirmDialog({ department, isPending, onConfirm, onClose }: Props) {
  if (!department) return null;
  const deactivating = department.isActive;

  return (
    <AlertDialog open={!!department} onOpenChange={o => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {deactivating ? 'Deactivate' : 'Activate'} department?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {deactivating
              ? `"${department.name}" cannot be deactivated if users are still assigned.`
              : `"${department.name}" will be available again for user assignments.`}
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
