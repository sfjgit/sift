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
import { useDeleteStage, PipelineStage } from './usePipelineStages';

type Props = {
  stage: PipelineStage | null;
  onClose: () => void;
};

export function DeleteStageDialog({ stage, onClose }: Props) {
  const deleteStage = useDeleteStage();
  if (!stage) return null;

  return (
    <AlertDialog
      open={!!stage}
      onOpenChange={v => {
        if (!v) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{stage.label}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Stage <span className="font-mono font-medium">{stage.code}</span> will be permanently
            deleted. This will fail if any active pipeline rows are currently at this stage.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={async () => {
              await deleteStage.mutateAsync(stage.id);
              onClose();
            }}
          >
            {deleteStage.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
