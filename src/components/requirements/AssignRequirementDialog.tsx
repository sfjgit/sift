'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import AssignRequirementForm from './AssignRequirementForm';
import { CheckCircle, Plus } from 'lucide-react';
import { Button } from '../ui/button';

export default function AssignRequirementDialog({ requirementId }: { requirementId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-green-100 text-green-700 hover:bg-green-200">
          <CheckCircle className="w-4 h-4" />
          Assign to Delivery Manager
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Approve and assign requirement</DialogTitle>
        </DialogHeader>

        <AssignRequirementForm requirementId={requirementId} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
