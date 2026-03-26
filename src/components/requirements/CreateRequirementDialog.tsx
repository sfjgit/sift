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

export default function CreateRequirementDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="h-9 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          + New Requirement
        </button>
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
