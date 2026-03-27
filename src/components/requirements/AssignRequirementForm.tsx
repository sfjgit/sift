'use client';

import { useEffect, useState } from 'react';
import { useUsersApi } from '@/lib/users.api';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRequirementsApi } from '@/lib/requirements.api';

export default function AssignRequirementForm({
  requirementId,
  onSuccess,
}: {
  requirementId: string;
  onSuccess: () => void;
}) {
  const usersApi = useUsersApi();
  const requirementsApi = useRequirementsApi();
  const [deliveryLeadId, setDeliveryLeadId] = useState('');
  const [teamLeadId, setTeamLeadId] = useState('');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 🔥 Fetch users
  useEffect(() => {
    async function loadUsers() {
      const res = await usersApi.getAll({ limit: 100 });
      setUsers(res.data.data ?? []);
    }

    loadUsers();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);

      await requirementsApi.approve(requirementId, {
        deliveryLeadId,
        teamLeadId,
      });

      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Delivery Lead */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Delivery Lead</label>
        <Select value={deliveryLeadId} onValueChange={setDeliveryLeadId}>
          <SelectTrigger>
            <SelectValue placeholder="Select Delivery Lead" />
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

      {/* Team Lead */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Team Lead</label>
        <Select value={teamLeadId} onValueChange={setTeamLeadId}>
          <SelectTrigger>
            <SelectValue placeholder="Select Team Lead" />
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
          {loading ? 'Assigning...' : 'Assign'}
        </button>
      </div>
    </form>
  );
}
