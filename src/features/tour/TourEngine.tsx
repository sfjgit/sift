// File: TourEngine.tsx
// Path: src/features/tour/TourEngine.tsx

'use client';

import { useEffect } from 'react';
import { driver } from 'driver.js';
import type { DriveStep, PopoverDOM } from 'driver.js';
import 'driver.js/dist/driver.css';
import './tour.css';
import { useAuth } from '@/context/AuthContext';
import { useTourStore } from './tourStore';
import { getTour } from './tours';
import { getTourHandlers } from './tourHandlers';
import { ANONYMOUS_USER_KEY, TOUR_CONFIG, tourSelector } from './tour.constants';
import { escapeHtml, nextFrame, prefersReducedMotion, waitForElement } from './tourDom';
import type { TourDefinition, TourEndReason, TourStep } from './types';

const isDev = process.env.NODE_ENV !== 'production';

function toDriveStep(step: TourStep): DriveStep {
  return {
    element: step.target ? tourSelector(step.target) : undefined,
    popover: {
      title: escapeHtml(step.title),
      description: escapeHtml(step.body),
      side: step.placement,
      align: step.align,
    },
  };
}

async function applyRequirements(tourId: string, requires: TourStep['requires']) {
  if (!requires) return;
  const handlers = getTourHandlers(tourId);
  for (const [key, value] of Object.entries(requires)) {
    const handler = handlers?.[key];
    if (!handler) {
      if (isDev) console.warn(`[tour] "${tourId}" has no handler for requirement "${key}"`);
      continue;
    }
    await handler(value ?? null);
  }
  // Two frames: one for React to commit, one for layout to settle.
  await nextFrame();
  await nextFrame();
}

/**
 * One runner per tour session. Owns the driver instance and guards against
 * double clicks, unmount mid-await, and targets that never appear.
 */
function createRunner(tour: TourDefinition, userKey: string) {
  const { steps } = tour;
  let disposed = false;
  let busy = false;
  let current = -1;

  const end = (reason: TourEndReason) => {
    if (disposed) return;
    disposed = true;
    const store = useTourStore.getState();
    if (reason !== 'interrupted') store.markSeen(userKey, tour.id, tour.version);
    if (d.isActive()) d.destroy();
    if (store.activeTourId === tour.id) store.stop();
  };

  const addSkipButton = (popover: PopoverDOM) => {
    if (d.isLastStep() || popover.footerButtons.querySelector('.app-tour-skip')) return;
    const skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'app-tour-skip';
    skip.textContent = TOUR_CONFIG.labels.skip;
    skip.addEventListener('click', () => end('skipped'));
    popover.footerButtons.prepend(skip);
  };

  /** Walks from `from` in `dir`, applying requirements and skipping missing optional targets. */
  const resolveIndex = async (from: number, dir: 1 | -1): Promise<number | null> => {
    for (let i = from; i >= 0 && i < steps.length; i += dir) {
      const step = steps[i];
      await applyRequirements(tour.id, step.requires);
      if (disposed) return null;
      if (!step.target) return i;

      const el = await waitForElement(
        tourSelector(step.target),
        step.optional ? TOUR_CONFIG.optionalTargetTimeoutMs : TOUR_CONFIG.targetTimeoutMs
      );
      if (disposed) return null;
      if (el) return i;
      if (!step.optional) {
        // driver.js falls back to a centered popover — better than a dead tour.
        if (isDev) console.warn(`[tour] "${tour.id}" step "${step.id}" target not found`);
        return i;
      }
    }
    return null;
  };

  const go = async (from: number, dir: 1 | -1) => {
    if (busy || disposed) return;
    if (from >= steps.length) {
      end('completed');
      return;
    }
    if (from < 0) return;

    busy = true;
    try {
      const idx = await resolveIndex(from, dir);
      if (disposed) return;
      if (idx === null) {
        if (dir === 1) end('completed');
        return;
      }
      current = idx;
      if (d.isActive()) d.moveTo(idx);
      else d.drive(idx);
    } finally {
      busy = false;
    }
  };

  const d = driver({
    steps: steps.map(toDriveStep),
    animate: !prefersReducedMotion(),
    allowClose: true,
    overlayOpacity: TOUR_CONFIG.overlayOpacity,
    stagePadding: TOUR_CONFIG.stagePadding,
    stageRadius: TOUR_CONFIG.stageRadius,
    popoverClass: TOUR_CONFIG.popoverClass,
    showProgress: true,
    progressText: TOUR_CONFIG.labels.progress,
    nextBtnText: TOUR_CONFIG.labels.next,
    prevBtnText: TOUR_CONFIG.labels.prev,
    doneBtnText: TOUR_CONFIG.labels.done,
    showButtons: ['next', 'previous', 'close'],
    onNextClick: () => void go(current + 1, 1),
    onPrevClick: () => void go(current - 1, -1),
    // Close button, Esc, overlay click → treated as skip.
    onDestroyStarted: () => end('skipped'),
    // Safety net if driver tears itself down any other way.
    onDestroyed: () => {
      if (!disposed) end('skipped');
    },
    onPopoverRender: popover => addSkipButton(popover),
  });

  return {
    start: () => void go(0, 1),
    /** Page unmounted / tour switched — don't mark as seen. */
    dispose: () => {
      if (disposed) return;
      disposed = true;
      if (d.isActive()) d.destroy();
    },
  };
}

/** Mount once inside AuthProvider (dashboard layout). Renders nothing. */
export function TourEngine() {
  const { user } = useAuth();
  const userKey = user?.id ? String(user.id) : ANONYMOUS_USER_KEY;
  const activeTourId = useTourStore(s => s.activeTourId);

  useEffect(() => {
    Promise.resolve(useTourStore.persist.rehydrate()).finally(() =>
      useTourStore.getState().setHydrated(true)
    );
  }, []);

  useEffect(() => {
    if (!activeTourId) return;
    const tour = getTour(activeTourId);
    if (!tour?.steps.length) {
      if (isDev) console.warn(`[tour] unknown or empty tour "${activeTourId}"`);
      useTourStore.getState().stop();
      return;
    }
    const runner = createRunner(tour, userKey);
    runner.start();
    return () => runner.dispose();
  }, [activeTourId, userKey]);

  return null;
}
