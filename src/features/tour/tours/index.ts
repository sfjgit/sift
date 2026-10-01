// File: index.ts
// Path: src/features/tour/tours/index.ts

import type { TourDefinition } from '../types';
import { reportsTour } from './reports.tour';

/** Register every tour here. One line per page. */
const ALL_TOURS: TourDefinition[] = [reportsTour as TourDefinition];

const TOUR_REGISTRY = new Map<string, TourDefinition>(ALL_TOURS.map(t => [t.id, t]));

if (process.env.NODE_ENV !== 'production') {
  if (TOUR_REGISTRY.size !== ALL_TOURS.length) {
    console.warn('[tour] duplicate tour ids in registry');
  }
  for (const tour of ALL_TOURS) {
    const ids = new Set(tour.steps.map(s => s.id));
    if (ids.size !== tour.steps.length) console.warn(`[tour] duplicate step ids in "${tour.id}"`);
  }
}

export const getTour = (tourId: string) => TOUR_REGISTRY.get(tourId);
