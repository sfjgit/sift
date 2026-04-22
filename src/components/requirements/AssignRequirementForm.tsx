/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { useRolesApi } from '@/lib/roles.api';
import { useQuery } from '@tanstack/react-query';

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

  const rolesApi = useRolesApi();

  const { data: usersRes } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await usersApi.getAll();
      return res.data.data ?? [];
    },
  });

  const { data: rolesRes } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await rolesApi.getAll();
      return res.data.data ?? [];
    },
  });

  const deliveryLeadRole = rolesRes?.find((r: any) => r.name === 'DELIVERY_LEAD');

  const deliveryLeads =
    deliveryLeadRole && usersRes
      ? usersRes.filter((u: any) => u.roleId === deliveryLeadRole.id)
      : [];

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
            {deliveryLeads.map((user: any) => (
              <SelectItem key={user.id} value={user.id}>
                {user.firstName} {user.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Team Lead */}
      {/* <div className="flex flex-col gap-1.5">
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
      </div> */}

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
