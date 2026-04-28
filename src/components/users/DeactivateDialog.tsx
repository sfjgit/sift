'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  userName: string;
  isLoading: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function DeactivateDialog({ open, userName, isLoading, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState('');

  function handleConfirm() {
    onConfirm(reason.trim());
    setReason('');
  }

  function handleCancel() {
    setReason('');
    onCancel();
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && handleCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deactivate User</DialogTitle>
          <DialogDescription>
            You are about to deactivate{' '}
            <span className="font-medium text-foreground">{userName}</span>. They will lose access
            immediately. This can be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="reason" className="text-sm">
            Reason <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="reason"
            placeholder="e.g. Employee has left the organisation"
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            className="resize-none text-sm"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? 'Deactivating...' : 'Deactivate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
