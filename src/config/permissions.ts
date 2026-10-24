// File: permissions.ts
// Path: src/config/permissions.ts
//
// Copy of crm-core-service/src/config/permissions.registry.ts — keep in sync.
// The backend is the real gate; this only drives show/hide in the UI.

export const MODULES = {
  clients: {
    label: 'Clients',
    order: 1,
    actions: {
      read: { label: 'View', scoped: true },
      create: { label: 'Add', scoped: false },
      update: { label: 'Edit', scoped: true },
      delete: { label: 'Delete', scoped: true },
      approve: { label: 'Approve / change status', scoped: false },
      view_financials: { label: 'See CSR figures', scoped: false },
    },
  },
  spocs: {
    label: 'Client SPOCs',
    order: 2,
    actions: {
      read: { label: 'View', scoped: true },
      create: { label: 'Add', scoped: true },
      update: { label: 'Edit', scoped: true },
      delete: { label: 'Delete', scoped: true },
      assign: { label: 'Assign', scoped: true },
      view_contact: { label: 'See email / phone', scoped: false },
    },
  },
  step_runs: {
    label: 'Pipeline steps',
    order: 3,
    actions: {
      read: { label: 'View runs', scoped: true },
      run: { label: 'Run steps', scoped: false },
    },
  },
  users: {
    label: 'Users',
    order: 4,
    actions: {
      read: { label: 'View', scoped: true },
    },
  },
  admin: {
    label: 'Administration',
    order: 9,
    actions: {
      manage_users: { label: 'Manage users', scoped: false },
      manage_roles: { label: 'Manage roles', scoped: false },
      manage_lookups: { label: 'Manage lookups & org masters', scoped: false },
      view_auth_logs: { label: 'View login history', scoped: false },
      manage_help: { label: 'Manage help & FAQs', scoped: false },
    },
  },
} as const;

type M = typeof MODULES;
export type ModuleKey = keyof M;
export type PermissionKey = {
  [K in ModuleKey]: `${K}.${keyof M[K]['actions'] & string}`;
}[ModuleKey];

export const PERMISSION_SCOPES = [
  'OWN',
  'TEAM',
  'REPORTING',
  'REPORTING_LINE',
  'DEPARTMENT',
  'BU',
  'ALL',
] as const;
export type PermissionScope = (typeof PERMISSION_SCOPES)[number];

export const SCOPE_LABELS: Record<PermissionScope, string> = {
  OWN: 'Own',
  TEAM: 'Team',
  REPORTING: 'Direct reports',
  REPORTING_LINE: 'Reporting line',
  DEPARTMENT: 'Department',
  BU: 'Business unit',
  ALL: 'Everyone',
};
