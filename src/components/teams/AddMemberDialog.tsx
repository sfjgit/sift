'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTeamsApi } from '@/lib/teams.api';
import { useUsersApi } from '@/lib/users.api';
import { useQuery } from '@tanstack/react-query';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { z } from 'zod';

export const addTeamMembersBodySchema = z.array(
  z.object({
    userId: z.string(),
    teamRole: z.enum(['MEMBER', 'LEAD', 'CO_LEAD']),
    isActive: z.boolean().optional(),
  })
);

type AddMemberDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  teamId: string;
  refresh: () => void;
};

export default function AddMemberDialog({ open, setOpen, teamId, refresh }: AddMemberDialogProps) {
  const { addMembers } = useTeamsApi();
  const usersApi = useUsersApi();

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [teamRole, setTeamRole] = useState<string>('MEMBER');

  // ✅ Fetch users using useQuery
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await usersApi.getAll({ limit: 100 });
      return res.data.data ?? [];
    },
  });

  const handleAdd = async () => {
    if (!selectedUserId) return;

    const members = addTeamMembersBodySchema.parse([
      { userId: selectedUserId, teamRole, isActive: true },
    ]);

    await addMembers(teamId, { members }); // ✅ FIXED

    refresh();
    setOpen(false);
    setSelectedUserId('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <Label>Select User</Label>
            <Select
              value={selectedUserId}
              onValueChange={value => setSelectedUserId(value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? 'Loading users...' : 'Select a user'} />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Assign team role</Label>
            <Select
              value={teamRole}
              onValueChange={value => setTeamRole(value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={isLoading ? 'Loading team roles...' : 'Select a team role'}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={'MEMBER'}>MEMBER</SelectItem>
                <SelectItem value={'LEAD'}>LEAD</SelectItem>
                <SelectItem value={'CO_LEAD'}>CO_LEAD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleAdd} disabled={!selectedUserId}>
              Add
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
