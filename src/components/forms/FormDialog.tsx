// File: FormDialog.tsx
// Path: src/components/forms/FormDialog.tsx
//
// Dialog shell for create / edit forms: header, scrollable body, sticky footer.
// asPage: the same form as a full page — sections become cards, Save / Cancel sit in a sticky bar
// (create forms with many sections: client with its add-ons, SPOC).

'use client';

import { createContext, useContext, type ReactNode } from 'react';
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
  asPage,
}: {
  /** render as a page instead of a dialog */
  asPage?: boolean;
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
  if (asPage)
    return (
      <PageMode.Provider value={true}>
        <form
          className="mx-auto max-w-4xl pb-24"
          onSubmit={e => {
            e.preventDefault();
            if (!submitDisabled) onSubmit();
          }}
          noValidate
        >
          <header className="mb-4">
            <h1 className="text-xl font-bold">{title}</h1>
            {description && (
              <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
            )}
          </header>
          <div className="space-y-4">{children}</div>
          <div className="sticky bottom-0 z-20 mt-5 -mx-1 flex items-center gap-2 rounded-xl border bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
            {footerExtra && <div className="mr-auto">{footerExtra}</div>}
            <Button
              type="button"
              variant="outline"
              className="ml-auto"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy || submitDisabled}>
              {busy && <Spinner className="text-current" />}
              {submitLabel}
            </Button>
          </div>
        </form>
      </PageMode.Provider>
    );
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
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
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

const PageMode = createContext(false);

export function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  /** one line under the title (page mode) */
  hint?: ReactNode;
  children: ReactNode;
}) {
  const page = useContext(PageMode);
  if (page)
    return (
      <section className="space-y-3 rounded-xl border bg-card p-5 shadow-card">
        <div>
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {hint && <p className="text-[12.5px] text-muted-foreground">{hint}</p>}
        </div>
        {children}
      </section>
    );
  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

export function FormGrid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return (
    <div className={cn('grid grid-cols-1 gap-3', cols === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
      {children}
    </div>
  );
}
