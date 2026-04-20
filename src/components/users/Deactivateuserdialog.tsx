'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUsersApi } from '@/lib/users.api';

type DeactivateUserDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  userId: string;
  userName: string;
  refresh: () => void;
};

export default function DeactivateUserDialog({
  open,
  setOpen,
  userId,
  userName,
  refresh,
}: DeactivateUserDialogProps) {
  const { deactivate } = useUsersApi();

  const handleDeactivate = async () => {
    try {
      await deactivate(userId);
      refresh();
      setOpen(false);
    } catch (err) {
      console.error('Error deactivating user:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Deactivate User</DialogTitle>
        </DialogHeader>

        <div className="mt-1 space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to deactivate{' '}
            <span className="font-medium text-foreground">{userName}</span>? They will lose access
            immediately.
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="destructive" onClick={handleDeactivate}>
              Deactivate
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
