// File: tour.constants.ts
// Path: src/features/tour/tour.constants.ts

export const TOUR_CONFIG = {
  storageKey: 'app-tours',
  storageVersion: 1,
  /** Delay before auto-start so the page settles first. */
  autoStartDelayMs: 600,
  /** How long to wait for a required target to mount. */
  targetTimeoutMs: 2500,
  /** Shorter wait for optional targets before skipping them. */
  optionalTargetTimeoutMs: 1200,
  overlayOpacity: 0.45,
  stagePadding: 6,
  stageRadius: 4,
  popoverClass: 'app-tour',
  labels: {
    next: 'Next',
    prev: 'Back',
    done: 'Finish',
    skip: 'Skip tour',
    progress: '{{current}} of {{total}}',
  },
} as const;

export const ANONYMOUS_USER_KEY = 'anonymous';

export const TOUR_ATTR = 'data-tour' as const;

/** Spread onto any element to make it a tour target: <div {...tourTarget(KEY)} /> */
export const tourTarget = (key: string) =>
  ({ [TOUR_ATTR]: key }) as Record<typeof TOUR_ATTR, string>;

export const tourSelector = (key: string) => `[${TOUR_ATTR}="${CSS.escape(key)}"]`;
