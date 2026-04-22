/* eslint-disable @typescript-eslint/no-explicit-any */
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
  buId: string;
  refresh: () => void;
};

export default function AddMemberDialog({
  open,
  setOpen,
  teamId,
  refresh,
  buId,
}: AddMemberDialogProps) {
  const { addMembers } = useTeamsApi();
  const usersApi = useUsersApi();

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [teamRole, setTeamRole] = useState<string>('MEMBER');

  // const { data: users = [], isLoading } = useQuery<any[]>({
  //   queryKey: ['users'],
  //   queryFn: async () => {
  //     const res = await usersApi.getAll({ limit: 100 });
  //     return res.data.data ?? [];
  //   },
  // });
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users-by-bu', buId],
    queryFn: async () => {
      const res = await usersApi.getAll({
        buId: buId,
        limit: 100,
      });
      return res.data.data;
    },
    enabled: !!buId,
  });

  const handleAdd = async () => {
    if (!selectedUserId) return;

    const members = addTeamMembersBodySchema.parse([
      { userId: selectedUserId, teamRole, isActive: true },
    ]);

    await addMembers(teamId, { members });

    refresh();
    setOpen(false);
    setSelectedUserId('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Add Member</DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          {/* User Select */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">User</Label>
            <Select
              value={selectedUserId}
              onValueChange={value => setSelectedUserId(value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? 'Loading users...' : 'Select a user'} />
              </SelectTrigger>
              <SelectContent>
                {users.map((user: any) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Role Select */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Team Role</Label>
            <Select
              value={teamRole}
              onValueChange={value => setTeamRole(value)}
              // disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">Member</SelectItem>
                <SelectItem value="LEAD">Lead</SelectItem>
                <SelectItem value="CO_LEAD">Co-Lead</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={!selectedUserId}>
              Add Member
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
