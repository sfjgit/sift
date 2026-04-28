// config/navigation.ts
// module must match RolePermission.module seeded in DB exactly.
// Order here = order in navbar.

export interface NavItem {
  label: string;
  href: string;
  module: string; // matches RolePermission.module in DB
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', module: 'requirements' }, // everyone with any permission sees dashboard
  { label: 'Requirements', href: '/requirements', module: 'requirements' },
  { label: 'Clients', href: '/clients', module: 'clients' },
  { label: 'Teams', href: '/teams', module: 'teams' },
  { label: 'Users', href: '/users', module: 'users' },
  { label: 'Business Units', href: '/business-units', module: 'business_units' },
  { label: 'Roles', href: '/roles', module: 'settings' },
  { label: 'Reports', href: '/reports', module: 'reports' },
  { label: 'Audit Logs', href: '/audit-logs', module: 'settings' }, // super admin only — settings scope
  { label: 'Settings', href: '/settings', module: 'settings' },
];
