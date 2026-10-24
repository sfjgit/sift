// File: PendingTourStarter.tsx
// Path: src/features/tour/PendingTourStarter.tsx
//
// Lets "Start tour" buttons elsewhere (help center, settings) navigate first
// and start the tour once the target page has rendered. The caller stores the
// tour id in sessionStorage; on every pathname change we check whether this
// page owns it, wait for the page to settle, then start it. Mount once in the
// app shell. Renders nothing.

'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTourStore } from './tourStore';
import { getTourForPath } from './tours';

export const PENDING_TOUR_KEY = 'crm:pending-tour';

const START_DELAY_MS = 700;

const readPending = () => {
  try {
    return sessionStorage.getItem(PENDING_TOUR_KEY);
  } catch {
    return null;
  }
};

const clearPending = () => {
  try {
    sessionStorage.removeItem(PENDING_TOUR_KEY);
  } catch {
    /* storage blocked — nothing to clear */
  }
};

/** Queue a tour to start on the next page that owns it. */
export function queueTour(tourId: string) {
  try {
    sessionStorage.setItem(PENDING_TOUR_KEY, tourId);
  } catch {
    /* storage blocked — the user can still start it from the Help menu */
  }
}

export function PendingTourStarter() {
  const pathname = usePathname();

  useEffect(() => {
    const id = readPending();
    if (!id || getTourForPath(pathname)?.id !== id) return;
    const timer = setTimeout(() => {
      clearPending();
      useTourStore.getState().start(id);
    }, START_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
