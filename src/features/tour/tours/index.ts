// File: index.ts
// Path: src/features/tour/tours/index.ts

import type { TourDefinition } from '../types';
import { clientDetailTour, clientsTour, reportsTour, spocsTour, welcomeTour } from './catalog';

/** Register every tour here. One line per page. */
export const ALL_TOURS: TourDefinition[] = [
  welcomeTour,
  clientsTour,
  clientDetailTour,
  spocsTour,
  reportsTour,
] as TourDefinition[];

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

// "/clients/[id]" → matches /clients/abc but not /clients/new or /clients
const toMatcher = (route: string) =>
  new RegExp(`^${route.replace(/\[[^\]]+\]/g, '(?!new$)[^/]+')}/?$`);

/** Tour for the current page, if any. */
export const getTourForPath = (pathname: string) =>
  ALL_TOURS.find(t => toMatcher(t.route).test(pathname));
