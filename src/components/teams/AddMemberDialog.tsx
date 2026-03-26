'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { useState } from 'react';
import { useTeamsApi } from '@/lib/teams.api';

type AddMemberDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  teamId: string;
  refresh: () => void;
};

export default function AddMemberDialog({ open, setOpen, teamId, refresh }: AddMemberDialogProps) {
  const { addMembers } = useTeamsApi();

  const [userId, setUserId] = useState('');

  const handleAdd = async () => {
    await addMembers(teamId, {
      members: [{ userId }],
    });

    refresh();
    setOpen(false);
    setUserId('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Enter User ID"
            value={userId}
            onChange={e => setUserId(e.target.value)}
          />

          <div className="flex justify-end">
            <Button onClick={handleAdd}>Add</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
