// File: reports.tour.ts
// Path: src/features/tour/tours/reports.tour.ts

import { defineTour } from './defineTour';

/** Page state the reports tour can ask for. Page must register a handler for each. */
export type ReportsTourRequirement = 'tab' | 'filtersOpen';

/** Single source for data-tour keys — the page imports these, never raw strings. */
export const REPORTS_TOUR_TARGETS = {
  tabs: 'reports-tabs',
  window: 'reports-window',
  filtersToggle: 'reports-filters-toggle',
  filterDate: 'reports-filter-date',
  filterScope: 'reports-filter-scope',
  filterCreator: 'reports-filter-creator',
  filterMoj: 'reports-filter-moj',
  filterView: 'reports-filter-view',
  summary: 'reports-summary',
  serviceLines: 'reports-service-lines',
  tourButton: 'reports-tour-button',
} as const;

const T = REPORTS_TOUR_TARGETS;

export const reportsTour = defineTour<ReportsTourRequirement>({
  id: 'reports',
  version: 2,
  steps: [
    {
      id: 'welcome',
      title: 'Welcome to Reports',
      body: 'A quick look at where everything is. Takes about a minute, and you can replay it anytime from Take tour.',
      requires: { tab: 'requirements', filtersOpen: false },
    },
    {
      id: 'tabs',
      target: T.tabs,
      title: 'Two sheets',
      body: 'Requirements shows sale value and pipeline per requirement. Recruiters shows each recruiter’s pipeline and joinings.',
      placement: 'bottom',
      align: 'start',
      requires: { tab: 'requirements', filtersOpen: false },
    },
    {
      id: 'window',
      target: T.window,
      title: 'Date window',
      body: 'Everything on the page is scoped to this window. It starts on This month to keep reports fast. Click it to change.',
      placement: 'bottom',
      align: 'end',
      requires: { tab: 'requirements', filtersOpen: false },
    },
    {
      id: 'filters-toggle',
      target: T.filtersToggle,
      title: 'All filters in one place',
      body: 'Opens and closes the filter ribbon. The number shows how many filters are active.',
      placement: 'bottom',
      align: 'end',
      requires: { tab: 'requirements', filtersOpen: false },
    },
    {
      id: 'filter-date',
      target: T.filterDate,
      title: 'Pick a time range',
      body: 'Quick presets, the last few hours, or a custom from–to range.',
      placement: 'bottom',
      align: 'start',
      requires: { tab: 'requirements', filtersOpen: true },
    },
    {
      id: 'filter-scope',
      target: T.filterScope,
      title: 'Narrow the data',
      body: 'Filter by client, SPOC, service line, business unit, status or team. Picking clients limits the SPOC list to those clients.',
      placement: 'bottom',
      align: 'start',
      requires: { tab: 'requirements', filtersOpen: true },
    },
    {
      id: 'filter-creator',
      target: T.filterCreator,
      title: 'Filter by creator',
      body: 'Show only requirements created by one person. People are grouped by role.',
      placement: 'bottom',
      align: 'start',
      requires: { tab: 'requirements', filtersOpen: true },
      optional: true,
    },
    {
      id: 'filter-view',
      target: T.filterView,
      title: 'How rows are counted',
      body: 'Pipeline activity counts movement inside the window. Requirement created counts requirements created in it. Clear all filters keeps the date window.',
      placement: 'bottom',
      align: 'start',
      requires: { tab: 'requirements', filtersOpen: true },
    },
    {
      id: 'summary',
      target: T.summary,
      title: 'Sale summary',
      body: 'Totals for the current filters. Click pipeline, offered, achieved or closed to filter the table to those rows. Click again to clear.',
      placement: 'bottom',
      align: 'start',
      requires: { tab: 'requirements', filtersOpen: false },
      optional: true,
    },
    {
      id: 'service-lines',
      target: T.serviceLines,
      title: 'Service line sheets',
      body: 'Each service line gets its own sheet. Pick a single service line in filters for one flat table.',
      placement: 'bottom',
      align: 'start',
      requires: { tab: 'requirements', filtersOpen: false },
      optional: true,
    },
    {
      id: 'filter-moj',
      target: T.filterMoj,
      title: 'Month of joining',
      body: 'On Recruiters, filter candidates by the month they join. You can pick several months at once.',
      placement: 'bottom',
      align: 'start',
      requires: { tab: 'recruiters', filtersOpen: true },
      optional: true,
    },
    {
      id: 'replay',
      target: T.tourButton,
      title: 'Replay anytime',
      body: 'Click Take tour to see this again.',
      placement: 'bottom',
      align: 'end',
      requires: { tab: 'requirements', filtersOpen: false },
    },
  ],
});
