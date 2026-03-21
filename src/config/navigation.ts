// config/navigation.ts
// Add a new nav item here when a new section is added to the app.
// module must match what is seeded in RolePermission.module in the DB.

export interface NavItem {
  label: string;
  href: string;
  module: string; // matches RolePermission.module in DB
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/dashboard', module: 'requirements' },
  { label: 'Requirements', href: '/dashboard/requirements', module: 'requirements' },
  { label: 'Clients', href: '/dashboard/clients', module: 'clients' },
  { label: 'Teams', href: '/dashboard/teams', module: 'teams' },
  { label: 'Users', href: '/dashboard/users', module: 'users' },
  { label: 'Business Units', href: '/dashboard/business-units', module: 'business_units' },
  { label: 'Roles', href: '/dashboard/roles', module: 'settings' },
  { label: 'Reports', href: '/dashboard/reports', module: 'reports' },
  { label: 'Settings', href: '/dashboard/settings', module: 'settings' },
];
