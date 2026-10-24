// File: HelpSheet.tsx
// Path: src/features/help/HelpSheet.tsx
//
// <HelpButton module="clients" /> — drop into a page header. Opens a side
// sheet with that module's FAQs, a "Tour this page" shortcut when the page
// has a tour, and a way into the full help center.

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CircleHelp, LifeBuoy, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/common/states';
import { useTourStore } from '@/features/tour/tourStore';
import { getTourForPath } from '@/features/tour/tours';
import { faqsApi } from '@/lib/api/endpoints';
import { cn } from '@/lib/utils';
import { FaqAccordion } from './FaqAccordion';

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  clients: 'Clients',
  spocs: 'SPOCs',
  reports: 'Reports',
  admin: 'Administration',
};

function HelpSheetBody({ module, onClose }: { module: string; onClose: () => void }) {
  const pathname = usePathname();
  const tour = getTourForPath(pathname);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['faqs', 'module', module],
    queryFn: () => faqsApi.list({ module }),
    staleTime: 5 * 60_000,
  });

  return (
    <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-6">
      {tour && (
        <button
          type="button"
          onClick={() => {
            onClose();
            // let the sheet close before the tour measures the page
            setTimeout(() => useTourStore.getState().start(tour.id), 250);
          }}
          className="flex w-full items-center gap-3 rounded-xl border bg-accent/40 p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Tour this page</span>
            <span className="block truncate text-xs text-muted-foreground">{tour.description}</span>
          </span>
          <ArrowRight className="size-4 text-muted-foreground" />
        </button>
      )}

      <section>
        <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Common questions</h3>
        {isLoading ? (
          <div className="space-y-3 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={() => refetch()} className="py-8" />
        ) : data?.length ? (
          <FaqAccordion faqs={data} />
        ) : (
          <EmptyState
            compact
            icon={CircleHelp}
            title="No questions for this page yet"
            description="The help center has guides for every part of the CRM."
          />
        )}
      </section>

      <Button asChild variant="outline" className="w-full">
        <Link href="/help" onClick={onClose}>
          <LifeBuoy /> Open the help center
        </Link>
      </Button>
    </div>
  );
}

export function HelpButton({ module, className }: { module: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const label = MODULE_LABELS[module] ?? 'this page';
  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className={cn('text-muted-foreground', className)}
        aria-label={`Help with ${label}`}
        title="Help"
        onClick={() => setOpen(true)}
      >
        <CircleHelp />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-md">
          <SheetHeader className="px-5 pt-5 pb-4">
            <SheetTitle className="text-base font-semibold">Help · {label}</SheetTitle>
            <SheetDescription>Quick answers for what you’re looking at.</SheetDescription>
          </SheetHeader>
          {open && <HelpSheetBody module={module} onClose={() => setOpen(false)} />}
        </SheetContent>
      </Sheet>
    </>
  );
}
