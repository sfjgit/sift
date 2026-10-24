// File: catalog.ts
// Path: src/features/tour/tours/catalog.ts
//
// Every product tour. Steps point at `data-tour` keys (tourTarget('key')) in
// the pages. Bump `version` when steps change so people see the new tour.

import { defineTour } from './defineTour';

export const welcomeTour = defineTour({
  id: 'welcome',
  version: 1,
  route: '/dashboard',
  title: 'Welcome to SFJBS CRM',
  description: 'A two-minute lap around the workspace: navigation, search, quick add and your dashboard.',
  steps: [
    {
      id: 'hello',
      title: 'Welcome to SFJBS CRM 👋',
      body: 'This is your sales & marketing workspace — clients, SPOCs, pipeline and reports in one place. Let’s take a quick lap.',
    },
    {
      id: 'nav',
      target: 'sidebar',
      title: 'Everything is one click away',
      body: 'Clients, SPOCs, Reports and admin pages live here. You only see what your role allows. Collapse the bar with the arrow at the bottom.',
      placement: 'right',
    },
    {
      id: 'search',
      target: 'global-search',
      title: 'Search anything — ⌘K',
      body: 'Jump to any client, SPOC, person or page. Press ⌘K (Ctrl K on Windows) from anywhere.',
      placement: 'bottom',
    },
    {
      id: 'quick-add',
      target: 'quick-add',
      title: 'Quick add',
      body: 'Create a client or a SPOC without leaving the page you’re on.',
      placement: 'bottom',
      optional: true,
    },
    {
      id: 'notifications',
      target: 'notifications',
      title: 'Stay in the loop',
      body: 'You’re notified when a SPOC is assigned to you or someone adds a note on your client.',
      placement: 'bottom',
    },
    {
      id: 'range',
      target: 'dashboard-range',
      title: 'Pick a period',
      body: 'The “new” counts and the activity chart follow this range.',
      placement: 'bottom',
    },
    {
      id: 'kpis',
      target: 'dashboard-kpis',
      title: 'Your numbers at a glance',
      body: 'Click any card to open the matching list, already filtered.',
      placement: 'bottom',
    },
    {
      id: 'quality',
      target: 'dashboard-quality',
      title: 'Data quality',
      body: 'How many SPOCs are ready to contact, need review, or aren’t usable — based on their validation score.',
      placement: 'top',
      optional: true,
    },
    {
      id: 'activity',
      target: 'dashboard-activity',
      title: 'What changed recently',
      body: 'A live feed of notes, new SPOCs, reassignments and approvals across the clients you can see.',
      placement: 'left',
      optional: true,
    },
    {
      id: 'help',
      target: 'help-menu',
      title: 'Help is always here',
      body: 'Replay a tour for the page you’re on, browse FAQs, or see keyboard shortcuts. That’s it — enjoy!',
      placement: 'bottom',
    },
  ],
});

export const clientsTour = defineTour({
  id: 'clients',
  version: 1,
  route: '/clients',
  title: 'Working with clients',
  description: 'Find, filter and save views of your client list, and add new clients.',
  steps: [
    {
      id: 'intro',
      title: 'Your client list',
      body: 'Every company you work with. You see clients you created plus any where a SPOC is handled by someone in your scope.',
    },
    {
      id: 'status',
      target: 'clients-status',
      title: 'Jump between statuses',
      body: 'New clients start as Pending until someone with approval rights activates them.',
      placement: 'bottom',
    },
    {
      id: 'search',
      target: 'table-search',
      title: 'Search',
      body: 'Matches name, short name and CIN. Press / to jump here from anywhere on the page.',
      placement: 'bottom',
    },
    {
      id: 'filters',
      target: 'table-filters',
      title: 'Filter by anything',
      body: 'Industry, category, business unit, service line, handler, state or city. Filters stack and show as chips.',
      placement: 'bottom',
    },
    {
      id: 'views',
      target: 'table-views',
      title: 'Save views',
      body: 'Save your filters, sort and columns as a view. Star one to open it by default, or share it with the team.',
      placement: 'bottom',
    },
    {
      id: 'columns',
      target: 'table-columns',
      title: 'Make the table yours',
      body: 'Show, hide and drag columns into the order you like, and switch to compact rows for more on screen.',
      placement: 'left',
    },
    {
      id: 'export',
      target: 'table-export',
      title: 'Export',
      body: 'Download this page or every matching client as CSV or Excel — only the columns you’re showing.',
      placement: 'left',
    },
    {
      id: 'row',
      target: 'table-row',
      title: 'Open a client',
      body: 'Click a row for the full profile. Ctrl/⌘-click opens it in a new tab.',
      placement: 'bottom',
      optional: true,
    },
    {
      id: 'new',
      target: 'clients-new',
      title: 'Add a client',
      body: 'Create a client in seconds — add locations and SPOCs from its profile after.',
      placement: 'bottom',
      optional: true,
    },
  ],
});

export const clientDetailTour = defineTour({
  id: 'client-detail',
  version: 1,
  route: '/clients/[id]',
  title: 'A client’s profile',
  description: 'Status, SPOCs, locations, notes, CSR data and the activity timeline for one client.',
  steps: [
    {
      id: 'header',
      target: 'client-header',
      title: 'The essentials',
      body: 'Name, status, industry and the quick facts. Website and LinkedIn open in a new tab.',
      placement: 'bottom',
    },
    {
      id: 'status',
      target: 'client-status',
      title: 'Approve or change status',
      body: 'People with approval rights can activate or deactivate the client here. The first activation records who approved it.',
      placement: 'bottom',
      optional: true,
    },
    {
      id: 'tabs',
      target: 'client-tabs',
      title: 'Everything about this client',
      body: 'SPOCs, locations, technology landscape, notes, CSR figures, outreach and pipeline runs — each in its own tab.',
      placement: 'bottom',
    },
    {
      id: 'note',
      target: 'client-note',
      title: 'Leave a note',
      body: 'Notes go on the timeline and notify every active SPOC handler on this client.',
      placement: 'left',
      optional: true,
    },
    {
      id: 'timeline',
      target: 'client-activity',
      title: 'Full history',
      body: 'Every change — new SPOCs, reassignments, notes, approvals — with who did it and when.',
      placement: 'left',
      optional: true,
    },
  ],
});

export const spocsTour = defineTour({
  id: 'spocs',
  version: 1,
  route: '/spocs',
  title: 'Managing SPOCs',
  description: 'Your contacts across clients — quality bands, handlers, bulk reassignment and saved views.',
  steps: [
    {
      id: 'intro',
      title: 'SPOCs = your contacts',
      body: 'Each SPOC belongs to a client, a business unit + service line combination, and has one handler responsible for them.',
    },
    {
      id: 'quick',
      target: 'spocs-quick',
      title: 'Quick lists',
      body: 'Switch between your own SPOCs, everyone in your scope, and contacts that are ready to reach out to.',
      placement: 'bottom',
    },
    {
      id: 'filters',
      target: 'table-filters',
      title: 'Slice the list',
      body: 'Filter by client, handler, BU, service line, sales status, email status or validation band.',
      placement: 'bottom',
    },
    {
      id: 'row',
      target: 'table-row',
      title: 'Quality at a glance',
      body: 'Email status shows whether the address is verified; the band (Ready / Review / Not usable) comes from the validation score.',
      placement: 'bottom',
      optional: true,
    },
    {
      id: 'bulk',
      target: 'spocs-select-hint',
      title: 'Bulk reassign',
      body: 'Tick rows to reassign many SPOCs to a new handler at once. The new handler gets one notification.',
      placement: 'bottom',
      optional: true,
    },
    {
      id: 'views',
      target: 'table-views',
      title: 'Save your lists',
      body: 'Turn any combination of filters into a saved view — e.g. “Ready SPOCs in Cloud”.',
      placement: 'bottom',
    },
  ],
});

export const reportsTour = defineTour({
  id: 'reports',
  version: 1,
  route: '/reports',
  title: 'Building reports',
  description: 'Start from a template or build your own: group, split, filter, chart, drill down and save.',
  steps: [
    {
      id: 'intro',
      title: 'Reports, your way',
      body: 'Every report is a question: “how many X, grouped by Y, split by Z?”. Start from a template or build one from scratch.',
    },
    {
      id: 'templates',
      target: 'reports-templates',
      title: 'Start from a template',
      body: 'Handler leaderboard, pipeline by sales status, data quality, coverage by state and more — one click each.',
      placement: 'bottom',
    },
    {
      id: 'entity',
      target: 'reports-entity',
      title: 'What are you counting?',
      body: 'SPOCs or clients. Each has its own dimensions and filters.',
      placement: 'right',
    },
    {
      id: 'group',
      target: 'reports-group',
      title: 'Group and split',
      body: 'Group rows by one dimension and optionally split columns by another for a pivot — e.g. handler × validation band.',
      placement: 'right',
    },
    {
      id: 'filters',
      target: 'reports-filters',
      title: 'Narrow it down',
      body: 'Filters and a date range on when records were created.',
      placement: 'right',
    },
    {
      id: 'viz',
      target: 'reports-viz',
      title: 'Pick a visual',
      body: 'Bars, stacked bars, donut, trend line or a plain table — switch any time.',
      placement: 'bottom',
    },
    {
      id: 'result',
      target: 'reports-result',
      title: 'Drill into any number',
      body: 'Click a bar or a cell to see the exact records behind it.',
      placement: 'top',
    },
    {
      id: 'save',
      target: 'reports-save',
      title: 'Save & share',
      body: 'Save the report to your list, share it with the team, or export the numbers to Excel.',
      placement: 'bottom',
    },
  ],
});
