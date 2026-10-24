// File: launchTour.ts
// Path: src/features/help/launchTour.ts
//
// "Start tour" from anywhere: if we're already on the tour's page start it
// now, otherwise navigate and let PendingTourStarter pick it up. Tours on
// dynamic routes (/clients/[id]) need a concrete record, so we send the user
// to the list with a hint instead.

import { toast } from 'sonner';
import { useTourStore } from '@/features/tour/tourStore';
import { getTourForPath } from '@/features/tour/tours';
import { queueTour } from '@/features/tour/PendingTourStarter';
import type { TourDefinition } from '@/features/tour/types';

type Router = { push: (href: string) => void };

export function launchTour(tour: Pick<TourDefinition, 'id' | 'route' | 'title'>, router: Router) {
  const here = window.location.pathname;
  if (getTourForPath(here)?.id === tour.id) {
    useTourStore.getState().start(tour.id);
    return;
  }

  if (/\[[^\]]+\]/.test(tour.route)) {
    const parent = tour.route.split('/[')[0] || '/';
    router.push(parent);
    toast.info(`“${tour.title}” runs on a single record`, {
      description: 'Open any client, then pick Help → Tour this page.',
    });
    return;
  }

  queueTour(tour.id);
  router.push(tour.route);
}
