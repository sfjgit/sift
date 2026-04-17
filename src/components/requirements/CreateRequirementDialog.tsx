'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import RequirementForm from './RequirementForm';
import { Button } from '../ui/button';
import { Plus } from 'lucide-react';

export default function CreateRequirementDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          New Requirement
        </Button>
      </DialogTrigger>

      <DialogContent className="min-w-4xl w-full p-0 gap-0 overflow-hidden rounded-xl border border-border/60 shadow-2xl">
        {' '}
        {/* ── Accent header ─────────────────────────────────────────────── */}
        <div className="relative flex items-start gap-4 px-6 pt-6 pb-5 border-b border-border/50">
          {/* Left accent bar */}
          <div className="absolute left-0 top-4 bottom-4 w-0.75 rounded-full bg-primary" />

          {/* Icon badge */}
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 shrink-0 mt-0.5">
            <Plus className="w-4 h-4 text-primary" />
          </div>

          {/* Title block */}
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-semibold text-foreground tracking-tight">
              New Requirement
            </h2>
            <p className="text-[13px] text-muted-foreground mt-0.5 leading-relaxed">
              Post a new job requirement and assign it to a client.
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1.5 shrink-0 mt-1">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === 1 ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/20'
                }`}
              />
            ))}
          </div>
        </div>
        {/* ── Form body ─────────────────────────────────────────────────── */}
        <div className="px-6 py-5 overflow-y-auto max-h-[55vh] scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {' '}
          <RequirementForm onSuccess={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
