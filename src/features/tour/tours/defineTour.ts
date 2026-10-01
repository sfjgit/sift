// File: defineTour.ts
// Path: src/features/tour/tours/defineTour.ts

import type { TourDefinition } from '../types';

/** Identity helper — gives typed `requires` keys per tour. */
export const defineTour = <R extends string>(tour: TourDefinition<R>): TourDefinition<R> => tour;
