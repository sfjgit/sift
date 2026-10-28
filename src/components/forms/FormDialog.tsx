// File: FormDialog.tsx
// Path: src/components/forms/FormDialog.tsx
//
// Dialog shell for create / edit forms: header, scrollable body, sticky footer.

'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/common/states';
import { cn } from '@/lib/utils';

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  submitLabel = 'Save',
  busy,
  submitDisabled,
  size = 'md',
  children,
  footerExtra,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  onSubmit: () => void;
  submitLabel?: string;
  busy?: boolean;
  /** e.g. nothing allowed to submit yet */
  submitDisabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  footerExtra?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={o => !busy && onOpenChange(o)}>
      <DialogContent
        className={cn(
          'flex max-h-[90svh] flex-col gap-0 p-0',
          size === 'sm' && 'sm:max-w-md',
          size === 'md' && 'sm:max-w-xl',
          size === 'lg' && 'sm:max-w-3xl'
        )}
      >
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={e => {
            e.preventDefault();
            if (!submitDisabled) onSubmit();
          }}
          noValidate
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">{children}</div>
          <DialogFooter className="items-center border-t px-5 py-3">
            {footerExtra && <div className="mr-auto">{footerExtra}</div>}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || submitDisabled}>
              {busy && <Spinner className="text-current" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</legend>
      {children}
    </fieldset>
  );
}

export function FormGrid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return (
    <div className={cn('grid grid-cols-1 gap-3', cols === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>{children}</div>
  );
}
