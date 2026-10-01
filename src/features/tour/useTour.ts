// File: useTour.ts
// Path: src/features/tour/useTour.ts

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { seenKey, useTourStore } from './tourStore';
import { registerTourHandlers, unregisterTourHandlers } from './tourHandlers';
import { TOUR_CONFIG } from './tour.constants';
import type { TourDefinition, TourHandlers } from './types';

interface UseTourOptions<R extends string> {
  /** One handler per requirement key the tour uses (e.g. switch tab, open filters). */
  handlers?: TourHandlers<R>;
  /** Hold auto-start until the page is ready (data loaded, access checked). */
  ready?: boolean;
  /** Auto-start on first visit. Default true. */
  autoStart?: boolean;
}

/**
 * Call once in the page that owns the tour.
 * - registers requirement handlers
 * - auto-starts for logged-in users who haven't seen this tour version
 * - stops the tour (without marking seen) if the page unmounts mid-tour
 */
export function useTour<R extends string>(
  tour: TourDefinition<R>,
  options: UseTourOptions<R> = {}
) {
  const { handlers, ready = true, autoStart = true } = options;
  const tourId = tour.id;
  const { user } = useAuth();
  const userId = user?.id ? String(user.id) : null;

  const handlersRef = useRef<Partial<TourHandlers> | undefined>(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    registerTourHandlers(tourId, handlersRef);
    return () => {
      unregisterTourHandlers(tourId, handlersRef);
      const store = useTourStore.getState();
      if (store.activeTourId === tourId) store.stop();
    };
  }, [tourId]);

  const hydrated = useTourStore(s => s.hydrated);
  const isActive = useTourStore(s => s.activeTourId === tourId);
  const hasSeen = useTourStore(s =>
    userId ? (s.seen[seenKey(userId, tourId)] ?? 0) >= tour.version : true
  );

  useEffect(() => {
    if (!autoStart || !ready || !hydrated || hasSeen) return;
    const timer = setTimeout(
      () => useTourStore.getState().start(tourId),
      TOUR_CONFIG.autoStartDelayMs
    );
    return () => clearTimeout(timer);
  }, [autoStart, ready, hydrated, hasSeen, tourId]);

  const start = useCallback(() => useTourStore.getState().start(tourId), [tourId]);

  return { start, isActive, hasSeen };
}
