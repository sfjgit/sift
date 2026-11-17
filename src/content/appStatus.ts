// File: appStatus.ts
// Path: src/content/appStatus.ts
//
// "What's built" — the single source for the /docs page. Update this file
// after every piece of work: the feature's status, a changelog line, and the
// pending list. Plain data only; the page renders it and prints it as a PDF.

export type Status = 'done' | 'partial' | 'not-started';
export type Waiting = 'user' | 'dev' | 'owner';

export interface Feature {
  title: string;
  /** one plain-English line */
  description: string;
  status: Status;
  /** where to find it in the app */
  where?: string;
  note?: string;
}

export interface Area {
  id: string;
  title: string;
  features: Feature[];
}

export interface ParityRow {
  /** what the old CASPA (PHP) page did */
  old: string;
  /** what the new CRM does instead */
  now: string;
  status: Status;
}

export interface PendingItem {
  title: string;
  waitsOn: Waiting;
  note?: string;
}

export interface ChangelogEntry {
  date: string;
  items: string[];
  /** still being built on that date */
  inProgress?: string[];
}

export const LAST_UPDATED = '2026-11-17';

// ── features by area ─────────────────────────────────────────────────────────

export const AREAS: Area[] = [
  {
    id: 'clients-list',
    title: 'Clients list',
    features: [
      {
        title: 'One clients table',
        description:
          'All clients in one spreadsheet-style table with search, sort and paging or endless scroll.',
        status: 'done',
        where: '/clients',
      },
      {
        title: 'Filters',
        description:
          'Status, category, industry, BU, service line, country/state/city, CSR spend range, created dates, handler, assigned, key account, projects, CSR eligible, programme filters, pipeline step done / not done.',
        status: 'done',
        where: '/clients',
      },
      {
        title: 'Filter panel (Zoho style)',
        description: 'All filters in a panel on the left of the table, plus filter chips above it.',
        status: 'done',
        where: '/clients',
      },
      {
        title: 'Columns bar',
        description:
          'Show, hide and drag columns; CASPA-style coloured column groups; per-user layouts.',
        status: 'done',
        where: '/clients',
      },
      {
        title: 'Templates (saved views)',
        description: 'Save a filter + column layout and reopen it later.',
        status: 'done',
        where: '/clients',
      },
      {
        title: 'Column access by role',
        description: 'Admins choose which roles may see which columns.',
        status: 'partial',
        where: '/clients',
        note: 'Hidden in the screen and exports only; the API and the client page are not gated yet.',
      },
      {
        title: 'Export',
        description:
          'Excel / CSV of the shown columns, the page or every matching row, with extra sheets (offices, CSR by FY, reports, SPOCs).',
        status: 'done',
        where: '/clients',
      },
      {
        title: 'Stats panel',
        description:
          'Numbers and top-lists above the table that follow the filters; click a bar to filter.',
        status: 'done',
        where: '/clients → Stats',
      },
      {
        title: 'Pipeline step columns',
        description: 'Run each pipeline step from the row and see its last result.',
        status: 'done',
        where: '/clients',
      },
      {
        title: 'Key account star, projects, CSR eligible',
        description: 'Sales marks from CASPA on each client.',
        status: 'done',
        where: '/clients',
      },
      {
        title: 'Bulk actions',
        description: 'Select rows to assign people or change status in one go.',
        status: 'done',
        where: '/clients',
      },
      {
        title: 'Right-click row menu',
        description:
          'Right-click any row for its actions, copy a cell / row, open in a new tab, select, hide a column. The ⋯ button still works.',
        status: 'done',
        where: 'every table',
      },
      {
        title: 'Business views (CSR / B2G / B2I / B2B)',
        description: 'A view switch by line of business.',
        status: 'partial',
        where: '/clients → CSR ▾',
        note: 'Only CSR is live; the others are placeholders until their columns are defined.',
      },
      {
        title: 'Group-by summaries',
        description: 'Totals grouped by client / category / state inside the table.',
        status: 'not-started',
        note: 'The Stats panel covers counts; a totals row and group-by are still open.',
      },
    ],
  },
  {
    id: 'client-page',
    title: 'Client detail page',
    features: [
      {
        title: 'Client information (inline edit)',
        description:
          'Firmographics, financials and ownership; click a value to edit it in place — no edit pop-ups.',
        status: 'done',
        where: '/clients/[id]',
      },
      {
        title: 'Activity & tasks',
        description:
          'Comments, calls, emails, WhatsApp, meetings and tasks in one panel with history filters.',
        status: 'done',
        where: '/clients/[id]',
      },
      {
        title: 'Branch offices + map',
        description: 'Office list and map; the branch finder fills it.',
        status: 'done',
        where: '/clients/[id]',
      },
      {
        title: 'CSR figures & programmes',
        description:
          'CSR spend by financial year and programmes (sectors, locations, agency, beneficiaries).',
        status: 'done',
        where: '/clients/[id]',
      },
      {
        title: 'Reports & attachments',
        description: 'BRSR / annual / CSR reports and other files.',
        status: 'done',
        where: '/clients/[id]',
      },
      {
        title: 'SPOC details',
        description: "The client's SPOCs with the pipeline steps that find and check them.",
        status: 'done',
        where: '/clients/[id]',
      },
      {
        title: 'Technographics',
        description: 'Technology used by the client.',
        status: 'done',
        where: '/clients/[id]',
      },
      {
        title: 'Outreach',
        description: 'Email drafts per SPOC, reviewed and marked as sent by hand.',
        status: 'done',
        where: '/clients/[id]',
      },
      {
        title: 'Pipeline runs',
        description: 'Every step run on this client with its result.',
        status: 'done',
        where: '/clients/[id]',
      },
      {
        title: 'Meetings',
        description:
          'Every meeting with the client: when, SPOC, agenda, who, status, minutes; Excel export.',
        status: 'done',
        where: '/clients/[id] → Meetings',
      },
      {
        title: 'Comments / observations per section',
        description: 'A comment box under each section, as in CASPA; they also appear in Activity.',
        status: 'done',
        where: '/clients/[id]',
      },
      {
        title: 'Import from Excel (branches, programmes)',
        description:
          'Download the template, pick a file, preview, import; bad rows are listed with the reason.',
        status: 'done',
        where: '/clients/[id] → Branch offices / CSR programmes',
      },
      {
        title:
          'Sales & marketing assets (pitch deck, sales brief, LinkedIn / WhatsApp templates, request campaign)',
        description: 'CASPA built these per client and per SPOC with approval steps.',
        status: 'not-started',
        note: 'Needs the engine to build them; order to decide.',
      },
    ],
  },
  {
    id: 'spocs-list',
    title: 'SPOCs list',
    features: [
      {
        title: 'One SPOCs table',
        description:
          'All SPOCs (CASPA had 4+ copies of this list) with quick tabs: All, My SPOCs, Ready to contact, Inactive.',
        status: 'done',
        where: '/spocs',
      },
      {
        title: 'Filters',
        description:
          'Client, handler, sales status, BU, service line, approval, email status, data quality, key account, projects, data flag, ERP.',
        status: 'done',
        where: '/spocs',
      },
      {
        title: 'Stats panel',
        description:
          'Coverage of email / mobile / LinkedIn etc. and counts by status, handler, category, state, BU and quality.',
        status: 'done',
        where: '/spocs → Stats',
      },
      {
        title: 'Bulk "Update field"',
        description: 'Set sales status, data flag, ERP or projects on many SPOCs.',
        status: 'done',
        where: '/spocs',
      },
      {
        title: 'Reassign / deactivate',
        description: 'Move SPOCs to another handler, or deactivate (history kept).',
        status: 'done',
        where: '/spocs',
      },
      {
        title: 'Right-click row menu',
        description: 'Same row actions on right-click.',
        status: 'done',
        where: '/spocs',
      },
      {
        title: 'Table settings like Clients',
        description: 'Column group bands, CASPA-roster default columns, column access by role.',
        status: 'not-started',
      },
      {
        title: 'New SPOC fields as columns / filters',
        description:
          'Location, role category, decision authority, call connected etc. in the table and filters.',
        status: 'not-started',
      },
    ],
  },
  {
    id: 'spoc-page',
    title: 'SPOC detail page',
    features: [
      {
        title: 'Zoho-style page',
        description:
          'Header with status strip, jump list on the left, field blocks, related lists — everything edits in place.',
        status: 'done',
        where: '/spocs/[id]',
      },
      {
        title: 'All CASPA SPOC fields',
        description:
          'Mobile 1–3, LinkedIn, location, experience, org type, role category, decision authority, revenue, ERP, call connected.',
        status: 'done',
        where: '/spocs/[id]',
      },
      {
        title: 'Sales marks',
        description:
          'Key account (one holder), data flag (contact / email / both wrong), projects.',
        status: 'done',
        where: '/spocs/[id]',
      },
      {
        title: 'Sales status history',
        description: 'Every status change is logged as "Old → New" in activity.',
        status: 'done',
        where: '/spocs/[id]',
      },
      {
        title: 'Quick log buttons',
        description: 'Log a call / email / WhatsApp / meeting from the header.',
        status: 'done',
        where: '/spocs/[id]',
      },
      {
        title: 'Email drafts, data quality, ownership, runs',
        description: 'Related lists at the bottom of the page.',
        status: 'done',
        where: '/spocs/[id]',
      },
      {
        title: 'GPS / distance',
        description: 'Latitude, longitude and distance from office.',
        status: 'partial',
        note: 'Stored in the database, not shown on the page yet.',
      },
    ],
  },
  {
    id: 'work',
    title: 'Activity, tasks & meetings',
    features: [
      {
        title: 'Comments',
        description: 'Comments on a client or tagged to a SPOC; your own can be edited.',
        status: 'done',
      },
      {
        title: 'Calls, emails, WhatsApp logs',
        description: 'Log an interaction; a connected call marks the SPOC as call connected.',
        status: 'done',
      },
      {
        title: 'Tasks',
        description: 'Tasks with assignee, due date, status and a close note.',
        status: 'done',
      },
      {
        title: 'Meetings (simple)',
        description: 'A meeting as a task with notes.',
        status: 'done',
      },
      {
        title: 'Full CASPA meetings',
        description:
          'Meeting mode / category, attendees both sides, MOM 1–4 + files, proposal (status, date, amount, file), MOU upload, credit letter, GPS check-in with photo, lead approval.',
        status: 'not-started',
      },
      {
        title: '"My tasks" page',
        description: 'One list of my open tasks and meetings across clients.',
        status: 'not-started',
      },
      {
        title: 'Send email / WhatsApp from the CRM',
        description: 'Actually send messages (campaign stages, daily limits).',
        status: 'not-started',
        note: 'Today messages are logged, not sent.',
      },
    ],
  },
  {
    id: 'org',
    title: 'Org chart & people',
    features: [
      {
        title: 'Org chart page',
        description:
          'Reporting tree with drag, zoom, fold, search, people stats (clients, SPOCs, tasks, overdue) and a details panel.',
        status: 'done',
        where: '/org',
      },
      {
        title: 'Reporting tree in admin',
        description: 'The same tree as the first tab of Org structure.',
        status: 'done',
        where: '/admin/org',
      },
      {
        title: '"My team" = full reporting chain',
        description:
          'Team reports and permissions follow everyone under you, not just direct reports.',
        status: 'done',
      },
    ],
  },
  {
    id: 'map',
    title: 'Map & 3D',
    features: [
      {
        title: 'Office map',
        description:
          'Clustered map of client offices and SPOCs, colour by type / industry / CSR band, optional 3D pins.',
        status: 'done',
        where: '/map',
      },
      {
        title: 'Landing globe',
        description: 'Decorative 3D globe on the sign-in landing page.',
        status: 'done',
      },
      { title: 'More 3D pages', description: 'Wanted later.', status: 'not-started' },
    ],
  },
  {
    id: 'pipeline',
    title: 'Pipeline engine & branch finder',
    features: [
      {
        title: 'Pipeline steps from the CRM',
        description:
          'Reports, report SPOCs, figures, enrich, Apollo, validate, emails — run per client, results saved into the CRM.',
        status: 'done',
        where: '/clients, /pipeline-runs',
      },
      { title: 'Run all', description: 'Run every step in order for a client.', status: 'done' },
      {
        title: 'Run slots & rerun rules',
        description: 'Daily / weekly / monthly run limits per user and a rerun waiting period.',
        status: 'done',
        where: '/admin/run-slots',
      },
      {
        title: 'Branch finder',
        description: 'Finds branch offices and the current website.',
        status: 'partial',
        note: 'Built and tested; not seeded on the shared DB yet.',
      },
      {
        title: 'CASPA data import',
        description: 'One-time import of CASPA clients and SPOCs.',
        status: 'not-started',
        note: 'Needs CASPA MySQL access.',
      },
    ],
  },
  {
    id: 'outreach',
    title: 'Outreach, approvals, reports',
    features: [
      {
        title: 'Outreach board',
        description: 'Email packs: draft → reviewed → sent → replied / no reply / bounced.',
        status: 'done',
        where: '/outreach',
      },
      {
        title: 'SPOC approvals',
        description: 'Approve or reject SPOCs found by the pipeline.',
        status: 'done',
        where: '/approvals',
      },
      {
        title: 'Reports page',
        description: 'Ready-made reports with drill-down and export.',
        status: 'done',
        where: '/reports',
      },
      {
        title: 'Dashboard',
        description: 'Home page numbers and work.',
        status: 'done',
        where: '/dashboard',
      },
      {
        title: 'Email campaigns',
        description:
          'CASPA campaign stages (fresh, FU1–FU5), 3 per domain / 50 per sender per day, sender report.',
        status: 'not-started',
      },
    ],
  },
  {
    id: 'ai',
    title: 'AI assistant',
    features: [
      {
        title: 'Voice assistant (Jarvis)',
        description:
          'Always-listening orb; wake word, "wait" stops it, mute / unmute, speaks answers.',
        status: 'done',
        note: 'Not yet tested with a real microphone by us.',
      },
      {
        title: 'Page-aware commands',
        description: 'Filter the page, reset filters, go back, show stats — by voice or typing.',
        status: 'done',
      },
      {
        title: 'Explain this',
        description: 'Plain summary of what is on screen from live numbers (no AI cost).',
        status: 'partial',
        note: 'Clients, SPOCs, one client, one SPOC, dashboard. Other pages not yet.',
      },
      {
        title: 'Canvas reports',
        description:
          'Charts with a table under each, built from questions; follow-ups edit the same canvas.',
        status: 'done',
        where: '/ai-canvas',
      },
      {
        title: 'Saved threads & history',
        description: 'Conversations kept per CRM area, like ChatGPT / Claude.',
        status: 'done',
      },
      {
        title: 'Memory',
        description: 'The same question is answered from memory without calling the AI again.',
        status: 'done',
      },
      {
        title: '"Do you mean…"',
        description: 'Asks when unsure; learns from your correction.',
        status: 'done',
      },
      {
        title: 'Suggestions',
        description: 'Ready questions per page plus your top 5.',
        status: 'done',
      },
      {
        title: 'AI actions with undo',
        description:
          'Assign clients, reassign SPOCs, set sales status — after you confirm, with Undo. Never deletes.',
        status: 'done',
      },
      {
        title: 'Free-hand questions (super admin only)',
        description: 'The AI may write one read-only database query when no ready report fits.',
        status: 'partial',
        note: 'Built and guarded; the AI path not live-tested yet (daily quota).',
      },
      {
        title: 'One AI planner for filter vs report',
        description: 'Let the AI decide between filtering the page and building a report.',
        status: 'not-started',
      },
      {
        title: 'Usage, quotas & cost',
        description: 'Per-user quotas and a cost page.',
        status: 'done',
        where: '/admin/ai-usage',
      },
    ],
  },
  {
    id: 'recycle',
    title: 'Recycle bin & undo',
    features: [
      {
        title: 'Every change kept',
        description: 'Before-image of every add / change / delete is saved.',
        status: 'done',
      },
      {
        title: 'Restore & undo',
        description: 'Put one thing back, or undo everything one action did.',
        status: 'done',
        where: '/admin/recycle-bin',
      },
    ],
  },
  {
    id: 'admin',
    title: 'Admin',
    features: [
      {
        title: 'Users',
        description: 'Add, edit, deactivate, reset password, sign in as user.',
        status: 'done',
        where: '/admin/users',
      },
      {
        title: 'Roles & permissions',
        description: 'Per-module permissions with scope (own / team / all).',
        status: 'done',
        where: '/admin/roles',
      },
      {
        title: 'Org structure',
        description: 'Reporting tree, business units, service lines, departments, designations.',
        status: 'done',
        where: '/admin/org',
      },
      {
        title: 'Pick-lists (lookups)',
        description: 'Edit statuses, categories, projects and other drop-down values.',
        status: 'done',
        where: '/admin/lookups',
      },
      {
        title: 'Integrations',
        description: 'Engine status, health and key test.',
        status: 'done',
        where: '/admin/integrations',
      },
      {
        title: 'Run slots',
        description: 'Pipeline run limits.',
        status: 'done',
        where: '/admin/run-slots',
      },
      {
        title: 'System alerts',
        description: 'Engine and system problems in one list.',
        status: 'done',
        where: '/admin/alerts',
      },
      {
        title: 'Sign-in logs',
        description: 'Who signed in, when and from where.',
        status: 'done',
        where: '/admin/auth-logs',
      },
      {
        title: 'AI settings',
        description: 'Modes, quotas, user overrides, templates, pricing.',
        status: 'done',
        where: '/admin/ai',
      },
    ],
  },
  {
    id: 'tables',
    title: 'Tables (everywhere)',
    features: [
      {
        title: 'Saved views, filters, columns, export',
        description: 'The same table features on every list.',
        status: 'done',
      },
      {
        title: 'Right-click menu',
        description: 'Row actions on right-click with a one-time tip.',
        status: 'done',
      },
      {
        title: 'Full screen & density',
        description: 'Lift the table over the whole window; compact or comfortable rows.',
        status: 'done',
      },
      {
        title: 'Keyboard',
        description: '"/" focuses search, N adds a new record.',
        status: 'done',
      },
    ],
  },
  {
    id: 'platform',
    title: 'Security, speed & support',
    features: [
      {
        title: 'Company (tenant) isolation',
        description: 'Every database read and write is limited to your company.',
        status: 'done',
      },
      {
        title: 'AI guardrails',
        description:
          'AI never sees raw rows, names are masked, delete requests refused, read-only database user.',
        status: 'done',
      },
      {
        title: 'Speed: one query per screen call',
        description: 'Related data loaded in one database query — clients list 3 s → 0.55 s.',
        status: 'done',
      },
      {
        title: 'AI canvas loads only when opened',
        description: 'Charts code no longer slows every page.',
        status: 'done',
      },
      {
        title: 'Slow-request meter',
        description: 'Every response reports its database time; slow calls are logged.',
        status: 'done',
      },
      {
        title: 'Report a problem (bug tickets)',
        description:
          'Help → Report a problem or Ctrl+Shift+B. Attaches a screenshot, a replay of the last ~2 minutes of the screen, browser errors, failed API calls and the clicks before it (never typed values; passwords always masked).',
        status: 'done',
        where: '/support',
      },
      {
        title: 'Record the steps',
        description:
          'The reporter (or support) records a screen replay while doing the steps again; support can ask for it with one button and the reporter is notified.',
        status: 'done',
        where: '/support',
      },
      {
        title: 'Automatic diagnosis',
        description:
          'Every bug is read on arrival: failed calls matched to the server’s own error and stack (by request id), browser errors, numbered steps that led there, likely area. Free, no AI.',
        status: 'done',
      },
      {
        title: 'AI diagnosis (on request)',
        description:
          'Button on a bug: likely cause, files to look at, suggested fix. Text evidence only, never the screenshot or replay (~₹0.05). Needs support.diagnose.',
        status: 'done',
      },
      {
        title: 'Suggest a feature (separate pipeline)',
        description:
          'Ideas go New → Under review → Planned → In progress → Shipped / Declined; bugs go New → Needs steps → Investigating → Fixed → Closed / Won’t fix.',
        status: 'done',
        where: '/support',
      },
      {
        title: 'Ticket progress & notifications',
        description:
          'Status changes, assignment, comments and recordings in one timeline; the reporter is notified at each step.',
        status: 'done',
      },
      {
        title: 'Help center & tours',
        description: 'FAQs, product tours, shortcuts, pipeline guide.',
        status: 'done',
        where: '/help',
      },
      {
        title: 'Notifications',
        description: 'In-app notifications with links.',
        status: 'done',
        where: '/notifications',
      },
    ],
  },
];

// ── old CASPA vs new (client page + SPOC page) ───────────────────────────────

export const CASPA_PARITY: { page: string; source: string; rows: ParityRow[] }[] = [
  {
    page: 'Client page',
    source:
      'update_d_csr_sales.php (6,616 lines, checked section by section on 16 Nov), view_d_csr.php',
    rows: [
      {
        old: 'CSR Skilling Programs (last 2 years) as its own section: attachments by FY, add / replace attachments, saved programmes, add programmes, bulk upload',
        now: 'CSR skilling programmes section in the same order (summary table like CASPA, or all details)',
        status: 'done',
      },
      {
        old: 'Page layout: collapsible coloured cards, each with its own Save',
        now: 'One card per topic, open/closed remembered, left jump rail, edit in place (no Save buttons)',
        status: 'done',
      },
      {
        old: 'ICP firmographics: name, state, district, industry, category, CIN, employee size, pincode, address, website, LinkedIn, country',
        now: 'Client information (inline edit); address from the head office',
        status: 'done',
      },
      {
        old: 'Sub category, LinkedIn employees, Listed (Yes/No)',
        now: 'Client information',
        status: 'done',
      },
      {
        old: 'Foundation name and foundation website',
        now: 'Client information',
        status: 'done',
      },
      {
        old: 'Latitude / longitude of the client',
        now: 'GPS row (from the head office, opens Google Maps)',
        status: 'done',
      },
      {
        old: 'Approx. distance (km) from our office',
        now: '—',
        status: 'not-started',
      },
      {
        old: 'Company logo upload',
        now: '—',
        status: 'not-started',
      },
      {
        old: 'Financials: revenue, market cap, paid-up and authorised capital',
        now: 'Client information → Financials (market cap editable; the rest per FY under CSR figures)',
        status: 'done',
      },
      {
        old: 'CSR spent category band (0–50 Cr … > 1000 Cr)',
        now: 'Worked out from the latest CSR spend',
        status: 'done',
      },
      {
        old: 'No. of beneficiaries',
        now: 'Total of all programmes',
        status: 'done',
      },
      {
        old: 'Technographics: HRMS, LMS, CRM, cloud, ERP',
        now: 'Taken off the client page for now (16 Nov, your call); data kept',
        status: 'partial',
      },
      {
        old: 'Branch offices: saved list with state / district / pincode / lat / lng',
        now: 'Branch offices section + map + branch finder',
        status: 'done',
      },
      {
        old: 'Add several branch offices by hand',
        now: 'Add office',
        status: 'done',
      },
      {
        old: 'Branch offices bulk upload (Excel / CSV) + template',
        now: 'Import from Excel (template, preview, skipped rows with reasons)',
        status: 'done',
      },
      {
        old: 'CSR budget / spent / unspent per FY',
        now: 'CSR figures per FY with chart',
        status: 'done',
      },
      {
        old: 'Saved attachments by FY: BRS (listed only), CSR report, impact assessment, annual report, CSR action plan + budget/spent/unspent',
        now: 'CSR skilling programmes → Attachments by financial year (+ CSR spent category per year)',
        status: 'done',
      },
      {
        old: 'CSR programmes: FY, name, sector, locations, budget, beneficiaries, implementor, report link, totals row',
        now: 'CSR programmes table with totals',
        status: 'done',
      },
      {
        old: 'SDG mapping on programmes',
        now: 'SDG picker on the programme, SDGs column, in the Excel export',
        status: 'done',
      },
      {
        old: 'Programmes export to Excel',
        now: 'Export to Excel',
        status: 'done',
      },
      {
        old: 'Programmes bulk upload (Excel / CSV)',
        now: 'Import from Excel (sector matched to Schedule VII; SDGs read from numbers)',
        status: 'done',
      },
      {
        old: 'Existing SPOCs table with “select the fields to display”, drag to reorder',
        now: 'SPOC details = the full SPOCs table (columns, filters, right-click, export)',
        status: 'done',
      },
      {
        old: 'Download all SPOC data (admin)',
        now: 'Export on the SPOC table',
        status: 'done',
      },
      {
        old: 'SPOC step icons (LinkedIn, contact, validate, email pack)',
        now: 'Run pills on the section + pipeline runs',
        status: 'done',
      },
      {
        old: 'New SPOC form on the page',
        now: 'Add SPOC',
        status: 'done',
      },
      {
        old: 'Comments / observations under every section',
        now: 'Comments / observations under every section (also shown in Activity)',
        status: 'done',
      },
      {
        old: 'Existing meetings table',
        now: 'Meetings section (when, SPOC, agenda, with, status, minutes) + Excel export',
        status: 'done',
      },
      {
        old: 'Meeting MOM files, proposal, MOU, GPS check-in, lead approval',
        now: 'Meeting notes and minutes only',
        status: 'partial',
      },
      {
        old: 'Ask AI about this client',
        now: 'AI assistant on every page (page-aware)',
        status: 'done',
      },
      {
        old: 'Run enrichment / re-check branches buttons',
        now: 'Run all steps + per-section run pills',
        status: 'done',
      },
      {
        old: 'Sales assets: pitch deck (PPT) request → build → publish, sales brief',
        now: 'Sales assets section with both cards (work in progress — engine not connected)',
        status: 'partial',
      },
      {
        old: 'Marketing assets per SPOC: generic, personalised, LinkedIn, WhatsApp templates with approve / remove / restore',
        now: 'Marketing assets section: SPOC picker + 4 cards; personalised email shows the real draft; the rest work in progress',
        status: 'partial',
      },
      {
        old: 'Request marketing asset / request PPT for ticked SPOCs',
        now: '—',
        status: 'not-started',
      },
      {
        old: 'Request campaign with send summary (precheck)',
        now: 'Button in place (coming soon)',
        status: 'partial',
      },
      {
        old: 'Enrichment pending approval (approve / reject sections)',
        now: '—',
        status: 'not-started',
      },
      {
        old: 'CSR data approvals: chat-researched values with sources, approve writes with backup',
        now: 'Recycle bin + undo keeps old values; no proposal / approval queue',
        status: 'partial',
      },
      {
        old: 'Key account, projects (NASSCOM / STPI / AWS-Restart), CSR eligible',
        now: 'Sales marks',
        status: 'done',
      },
    ],
  },
  {
    page: 'SPOC page',
    source: 'spoc_edit.php, csr_spoc.php, combined_spoc_dashboard.php, add_meeting_new.php',
    rows: [
      {
        old: 'Name, designation, email, LinkedIn',
        now: 'SPOC information + Contact',
        status: 'done',
      },
      { old: 'Mobile 1, 2, 3', now: 'Mobile, Mobile 2, Mobile 3', status: 'done' },
      { old: 'State, district, city, pincode, address', now: 'Location block', status: 'done' },
      {
        old: 'GPS latitude / longitude, approx. distance (km)',
        now: 'Stored, not shown on the page',
        status: 'partial',
      },
      {
        old: 'Total / current-org experience',
        now: 'Total experience, At this org',
        status: 'done',
      },
      {
        old: 'Organisation type, role category, decision authority, SPOC revenue',
        now: 'Additional details',
        status: 'done',
      },
      {
        old: 'ERP, connected call status',
        now: 'Business block (ERP, Call connected)',
        status: 'done',
      },
      {
        old: 'SPOC status / sales status',
        now: 'Sales status with change history',
        status: 'done',
      },
      {
        old: 'Tasks (task name, date, time, status)',
        now: 'Tasks in Activity & tasks',
        status: 'done',
      },
      {
        old: 'Meetings (date, time, status, mode, MOM, attendees, proposal, MOU, GPS check-in, photo)',
        now: 'Simple meeting with notes',
        status: 'partial',
      },
      {
        old: 'Training / placement history (vendor, training, trainer, placement year)',
        now: '—',
        status: 'not-started',
      },
      { old: 'Key account (one holder), data flag', now: 'Sales marks', status: 'done' },
      {
        old: 'SPOC dashboard (counts by status, handler…)',
        now: 'SPOCs Stats panel that follows filters',
        status: 'done',
      },
      {
        old: 'Several copies of the SPOC list',
        now: 'One table with quick tabs and filters',
        status: 'done',
      },
      { old: 'WhatsApp send from dashboard', now: 'WhatsApp logged, not sent', status: 'partial' },
      { old: 'Email campaigns (fresh, FU1–FU5, daily limits)', now: '—', status: 'not-started' },
      { old: 'Bulk status update', now: 'Bulk "Update field"', status: 'done' },
      { old: 'Release request approval', now: '—', status: 'not-started' },
      { old: 'Excel ID-list upload as a filter', now: '—', status: 'not-started' },
      { old: 'Distance buckets filter', now: '—', status: 'not-started' },
    ],
  },
];

// ── open to-do list ──────────────────────────────────────────────────────────

export const PENDING: PendingItem[] = [
  {
    title:
      'Give "Support tickets" grants (support.manage / support.diagnose) to the people who fix bugs',
    waitsOn: 'user',
    note: 'Admin → Roles. Super admin already has them; everyone can report.',
  },
  {
    title: 'Full CASPA meetings (MOM, proposal, MOU, GPS check-in, lead approval)',
    waitsOn: 'dev',
  },
  {
    title:
      'Client page — CASPA sales & marketing assets: pitch deck + sales brief, LinkedIn / WhatsApp templates with approval, request campaign',
    waitsOn: 'user',
    note: 'Needs the engine to build decks / templates; decide order.',
  },
  {
    title:
      'Client page — approval queues: enrichment sections, AI-researched field values with sources',
    waitsOn: 'user',
  },
  { title: 'Client page — company logo, approx. distance from our office', waitsOn: 'dev' },
  { title: '"My tasks" page', waitsOn: 'dev' },
  { title: 'SPOCs table settings like Clients (bands, defaults, column access)', waitsOn: 'dev' },
  { title: 'Explain & stats on the other pages', waitsOn: 'dev' },
  { title: 'One AI planner for filter-vs-report', waitsOn: 'dev' },
  {
    title: 'Email campaigns and WhatsApp sending',
    waitsOn: 'user',
    note: 'Provider and rules to decide.',
  },
  {
    title:
      'Lift your AI daily quota (Admin → AI → User overrides) and test the 5 free-hand questions',
    waitsOn: 'user',
  },
  { title: 'Run REVOKE SELECT ON "ChangeLog" FROM ai_readonly;', waitsOn: 'owner' },
  { title: 'Sign-off of the AI read-only deviation (Rahul Y H)', waitsOn: 'owner' },
  { title: 'CASPA → CRM data import (needs CASPA MySQL access)', waitsOn: 'owner' },
  { title: 'Seed the branch finder step on the shared DB', waitsOn: 'user' },
  {
    title:
      'Data tidy-ups: duplicate "Siva Sarathy", "Legacy user 3860", managers without a manager, legacyCaspaId',
    waitsOn: 'user',
  },
  {
    title: 'Measure the recycle-bin write overhead (batch loops or DB triggers if needed)',
    waitsOn: 'dev',
  },
];

// ── changelog, newest first ──────────────────────────────────────────────────

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026-11-17',
    items: [
      'Clients list: "CSR year" and "CSR spent" are separate columns, both show the latest year and both sort from the header (newest year / biggest spend first). Clicking either opens every year’s CSR figures in a dialog.',
      'Top bar: a red "Report bug" button on every page (screen captured for you, Ctrl⇧B still works). After sending, "Copy link" shares the ticket.',
      'Run results page (/pipeline-runs/<run>): every row a run touched, marked New / Changed (old → new, struck through) / Already there / Kept CRM value / Locked, with All · New · Changed · Unchanged filters. Offices also list the ones already on file that the run did not find. "Run all steps" shows each step in turn.',
      'When a run you started finishes, a "Results are in" pop-up offers "See results"; a run that found nothing shows a short note. The finished-run notification and the runs tray open the results page too.',
      'Each run now records what it did to every row (viewData.changes), including the old value it replaced — before this, replaced CSR figures, programmes and report files kept no old value.',
      'AI understanding layer: (1) financial years — "2025 26", "2025-26", "FY 24-25", "25-26" all work, and year filters now actually match the stored years (every year-filtered report used to come back empty); for CSR, "this year" = latest full year, "last year" = the one before, "this FY" = the running year. (2) a client named in the request filters every block to that client; partial names ("tata consultancy") find the one client they belong to. (3) "open <client>" goes to its page; "<client> details / report" builds a one-client report — both without an AI call. (4) cities and states (Bangalore / Bengaluru, Karnataka) are recognised and always applied. (5) "CSR" next to money words means CSR money, not the CSR service line.',
      'New AI reports: CSR money by industry / category / business unit / state; "clients that spent more than 10 crore" (amount range). The client page "generate a report" now shows CSR by year + SPOCs.',
      'AI honesty: an answer whose blocks are all empty is logged as "empty" (not success) and never remembered; the extra list under a chart is no longer added when it would show the wrong clients.',
      'AI answers questions: "what is CSR obligation", "how much did they spend", "how many SPOCs does this client have", "which client spent the most in 2024-25" are answered in words from live numbers (amounts in crore / lakh) — the canvas on screen is not changed. "What is …" questions about CRM words (obligation, budget, spent, unspent, Schedule VII, implementing agency, FY, SPOC, not set, data quality) are answered instantly without an AI call, with the matching figure from the canvas.',
      'A CSR figure no client has is shown as "not recorded", never ₹0 (KPI boxes), and left out of the CSR-by-year chart. Note: CSR obligation is not recorded for any client yet (0 of 156 years) — the pipeline does not read it.',
      'AI: ask or show is decided by the words, not guessed — a question ("which team is working on this client?", "how many offices does it have?") is answered in words and the canvas stays; "show / add / list …" adds a block to the canvas and keeps the others. "This client", "it", "its" mean the client the canvas is about.',
      'New AI reports about a client: its offices (head office / branches / factories), who works on it (assigned people, SPOC handlers, who acted lately, with role, manager, team lead, business unit), its CSR programmes, and recent activity.',
      'Report a problem: the AI assistant (voice mic, clap wake-up, panels) is switched off while the form is open or steps are recorded, and back on after. The recording is the page only (rrweb: clicks, scrolling, what is on screen) — no sound, no camera, no video.',
      'AI limits: the super admin is never limited — no daily command / canvas / export quota, no per-minute limit, and the "monthly budget used up" basic mode does not apply to them (usage is still counted on the usage page). Everyone else keeps their limits.',
      'Security: removed a startup log line that printed the backend secrets (JWT secret, SMTP password) to the console.',
    ],
  },
  {
    date: '2026-11-16',
    items: [
      'Right-click menu on every table row (actions, copy, open in new tab, select, hide column) with a one-time tip; the ⋯ button stays.',
      'Speed: related data now loads in one database query — clients list 3 s → 0.55 s, SPOCs 0.8 s → 0.2 s, sign-in check 0.6 s → 0.13 s.',
      'AI canvas code loads only when the canvas is opened.',
      'Slow-request meter on the backend (Server-Timing header, [slow] log lines).',
      'Org chart page (/org) and "Reporting tree" tab in Admin → Org structure.',
      'This "What\'s built" page.',
      'Report a problem / Suggest a feature: screenshot, ~2-minute screen replay, errors, failed calls and clicks attached; "Record the steps"; automatic diagnosis matched to server errors; optional AI diagnosis; separate bug and idea pipelines; /support pages.',
      'Every API response carries X-Request-Id; the server keeps its last 300 errors for bug tickets.',
      'Client page vs old CASPA page re-checked section by section; added: sub category, LinkedIn employees, Listed, foundation name / website, market cap, CSR spent band, total beneficiaries, head-office GPS.',
      'Reports & attachments “By year” grid (BRSR for listed only, CSR report, impact, annual report, action plan + CSR budget / spent / unspent), + in a cell uploads for that year.',
      'SDG mapping on CSR programmes (picker, column, export).',
      'Import from Excel / CSV for branch offices and CSR programmes (template, preview, skipped rows with reasons).',
      'Comments / observations under every client-page section; Meetings section on the client page.',
      'Client page re-ordered: Client information first, then sales Activity & tasks, then the rest. Technographics taken off the page.',
      'New "CSR skilling programmes" section like CASPA: attachments by year, add / replace for a year (amounts + files, one Save), saved programmes (summary or all details), add programmes in rows, Excel import.',
      'Sales assets and Marketing assets sections (pitch deck, sales brief, generic / personalised email, LinkedIn, WhatsApp) — work-in-progress cards; the personalised email shows the real draft.',
      'Engine activity (pipeline runs, machine-made log entries) hidden by default — "Show engine activity" buttons on the client page and in Activity.',
      'Exports (tables, reports, AI canvas, client export details, AI usage) are for the super admin only — hidden in the app and refused by the server.',
      'Copying is off for everyone but the super admin: no text selection, copy / cut blocked (input boxes still work), copy items removed from menus.',
      'Colour themes: Blue, Indigo, Violet, Teal, Rose, Orange, Graphite — pick from the account menu or Settings → Preferences; works in light and dark, remembered per device. Graphite is now the default.',
      'Screenshot protection for everyone but the super admin: a faint watermark on every page (name, employee ID, email, date and time), printing / Save as PDF prints a blank page, and the page blurs while the window is out of focus.',
    ],
  },
  {
    date: '2026-11-14',
    items: [
      'AI actions with confirm + Undo (assign clients, reassign SPOCs, set sales status).',
      'Recycle bin for every change with restore and undo.',
      'Free-hand read-only AI questions for the super admin.',
      'Page-aware assistant: explain, show stats, filters, go back; voice made more responsive.',
      'Client assignments filled from SPOC handlers (158 rows).',
    ],
  },
  {
    date: '2026-11-13',
    items: [
      'SPOC page rebuilt Zoho-style with inline editing and all CASPA SPOC fields.',
      'Activity & tasks panel (comments, calls, emails, WhatsApp, meetings, tasks) on SPOC and client pages.',
      'Client information edits in place.',
      'AI threads, memory and "Do you mean…".',
    ],
  },
  {
    date: '2026-11-12',
    items: [
      'Sales marks from CASPA: key account star, projects, CSR eligible, SPOC data flag, ERP, bulk update.',
    ],
  },
  {
    date: '2026-11-11',
    items: [
      'Slate + blue theme, new column bar, column access by role, client page redesign, CSR view switch.',
    ],
  },
  {
    date: '2026-11-06',
    items: ['AI assistant layer: command mode, canvas, voice assistant, usage & quotas.'],
  },
  {
    date: '2026-11-05',
    items: ['Table UX: column chips, templates, full ₹ amounts, auto-hiding bars, scroll loading.'],
  },
  {
    date: '2026-11-03',
    items: ['Office map and landing globe; branch finder connected as a second engine.'],
  },
  {
    date: '2026-10-27',
    items: [
      'Pipeline engine connected end to end; outreach board; run slots and rerun rules; system alerts.',
    ],
  },
];
