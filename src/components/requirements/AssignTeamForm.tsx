/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRequirementsApi } from '@/lib/requirements.api';

import { useQuery } from '@tanstack/react-query';
import { useTeamsApi } from '@/lib/teams.api';
import { toast } from 'sonner';

export default function AssignTeam({
  requirementId,
  onSuccess,
}: {
  requirementId: string;
  onSuccess: () => void;
}) {
  const requirementsApi = useRequirementsApi();

  const [teamId, setTeamId] = useState('');

  const [loading, setLoading] = useState(false);

  const teamsApi = useTeamsApi();

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await teamsApi.getAll();
      return res.data.data ?? [];
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);

      await requirementsApi.assign(requirementId, {
        assignmentType: 'TEAM',
        teamId: teamId,
      });
      toast.success('Requirement assigned to team successfully');
      onSuccess();
    } catch (err) {
      toast.error('Failed to assign requirement to team');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Team Lead */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Team Lead</label>
        <Select value={teamId} onValueChange={setTeamId}>
          <SelectTrigger>
            <SelectValue placeholder="Select Team Lead" />
          </SelectTrigger>
          <SelectContent>
            {teams?.map((team: any) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t">
        <button type="button" onClick={onSuccess} className="h-9 px-4 border rounded-lg">
          Cancel
        </button>

        <button
          type="submit"
          disabled={loading}
          className="h-9 px-5 bg-primary text-white rounded-lg"
        >
          {loading ? 'Assigning...' : 'Approve & Assign'}
        </button>
      </div>
    </form>
  );
}
