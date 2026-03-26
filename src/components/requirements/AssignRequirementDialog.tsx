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
import { Plus } from 'lucide-react';

export default function AssignRequirementDialog({ requirementId }: { requirementId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="h-8 px-3 text-xs rounded-lg border hover:bg-muted/50">Assign</button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Requirement</DialogTitle>
        </DialogHeader>

        <AssignRequirementForm requirementId={requirementId} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
