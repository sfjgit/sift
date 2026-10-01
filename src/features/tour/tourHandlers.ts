// File: tourHandlers.ts
// Path: src/features/tour/tourHandlers.ts

import type { TourHandlers } from './types';

/**
 * Pages register a ref (not the handlers directly) so the engine always
 * calls the latest closures without re-registering on every render.
 * Kept outside zustand because functions aren't serializable state.
 */
type HandlersRef = { current: Partial<TourHandlers> | undefined };

const registry = new Map<string, HandlersRef>();

export const registerTourHandlers = (tourId: string, ref: HandlersRef) => {
  registry.set(tourId, ref);
};

export const unregisterTourHandlers = (tourId: string, ref: HandlersRef) => {
  if (registry.get(tourId) === ref) registry.delete(tourId);
};

export const getTourHandlers = (tourId: string) => registry.get(tourId)?.current;
