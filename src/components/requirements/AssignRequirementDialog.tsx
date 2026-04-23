'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import AssignDeliveryLead from './AssignDeliveryLeadForm';
import { useAuth } from '@/context/AuthContext';
import AssignTeam from './AssignTeamForm';

export default function AssignRequirementDialog({ requirementId }: { requirementId: string }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role?.name === 'ADMIN' || user?.role?.name === 'SUPER_ADMIN';
  const isDeliveryLead = user?.role?.name === 'DELIVERY_LEAD';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-green-100 text-green-700 hover:bg-green-200">
          <CheckCircle className="w-4 h-4" />
          Assign Requirement
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Approve and assign requirement</DialogTitle>
        </DialogHeader>
        {isAdmin && (
          <AssignDeliveryLead requirementId={requirementId} onSuccess={() => setOpen(false)} />
        )}

        {isDeliveryLead && (
          <AssignTeam requirementId={requirementId} onSuccess={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
