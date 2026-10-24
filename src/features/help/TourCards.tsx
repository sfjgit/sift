// File: TourCards.tsx
// Path: src/features/help/TourCards.tsx
//
// One card per registered product tour. "Start tour" navigates to the tour's
// page and starts it there (see launchTour / PendingTourStarter).

'use client';

import { useRouter } from 'next/navigation';
import { Check, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/AuthProvider';
import { seenKey, useTourStore } from '@/features/tour/tourStore';
import { ALL_TOURS } from '@/features/tour/tours';
import { launchTour } from './launchTour';

export function TourCards() {
  const router = useRouter();
  const { user } = useAuth();
  const seen = useTourStore(s => s.seen);
  const userKey = user?.id ? String(user.id) : null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {ALL_TOURS.map(t => {
        const done = !!userKey && (seen[seenKey(userKey, t.id)] ?? 0) >= t.version;
        return (
          <div key={t.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-card">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-semibold">
                {t.title}
                {done && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-success">
                    <Check className="size-3" /> Seen
                  </span>
                )}
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">{t.description}</p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {t.steps.length} steps · {t.route.replace('/[id]', ' › any record')}
              </span>
              <Button size="sm" variant={done ? 'outline' : 'default'} onClick={() => launchTour(t, router)}>
                <Play /> {done ? 'Replay' : 'Start tour'}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
