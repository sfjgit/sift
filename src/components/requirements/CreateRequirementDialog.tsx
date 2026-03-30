'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import RequirementForm from './RequirementForm';
import { Button } from '../ui/button';
import { Plus } from 'lucide-react';

export default function CreateRequirementDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-gray-200 hover:bg-gray-300">
          <Plus className="w-4 h-4" /> New Requirement
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl w-full p-0 gap-0 overflow-hidden">
        {/* Header strip */}
        <div className="px-6 py-4 border-b border-border/60 bg-muted/20">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold text-foreground">
              Create Requirement
            </DialogTitle>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Fill in the details below to post a new job requirement.
            </p>
          </DialogHeader>
        </div>

        {/* Form body */}
        <div className="px-6 py-5 overflow-y-auto max-h-[80vh]">
          <RequirementForm onSuccess={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
