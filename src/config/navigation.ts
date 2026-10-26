// File: navigation.ts
// Path: src/config/navigation.ts
//
// Sidebar + command palette share this list. `perm` hides an item the user
// can't open; `anyPerm` shows it when any one of the keys is granted.

import {
  BarChart3,
  Bell,
  Building2,
  ContactRound,
  GitBranch,
  History,
  LayoutDashboard,
  LifeBuoy,
  ListTree,
  Network,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { PermissionKey } from './permissions';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  perm?: PermissionKey;
  anyPerm?: PermissionKey[];
  superAdmin?: boolean;
  /** data-tour key so tours can point at sidebar entries */
  tour?: string;
  keywords?: string[];
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Workspace',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, tour: 'nav-dashboard', keywords: ['home'] },
      { label: 'Clients', href: '/clients', icon: Building2, perm: 'clients.read', tour: 'nav-clients', keywords: ['companies', 'accounts'] },
      { label: 'SPOCs', href: '/spocs', icon: ContactRound, perm: 'spocs.read', tour: 'nav-spocs', keywords: ['contacts', 'people', 'leads'] },
      { label: 'Reports', href: '/reports', icon: BarChart3, perm: 'reports.read', anyPerm: ['clients.read', 'spocs.read'], tour: 'nav-reports', keywords: ['analytics', 'insights', 'charts'] },
      { label: 'Pipeline runs', href: '/pipeline-runs', icon: GitBranch, perm: 'step_runs.read', keywords: ['steps', 'jobs', 'enrichment'] },
    ],
  },
  {
    label: 'Organisation',
    items: [
      { label: 'Users', href: '/admin/users', icon: Users, perm: 'users.read', keywords: ['team', 'people', 'employees'] },
      { label: 'Roles & access', href: '/admin/roles', icon: ShieldCheck, perm: 'roles.read', keywords: ['permissions'] },
      { label: 'Org structure', href: '/admin/org', icon: Network, perm: 'org.manage', keywords: ['business units', 'service lines', 'departments', 'designations'] },
      { label: 'Pick-lists', href: '/admin/lookups', icon: ListTree, perm: 'lookups.manage', keywords: ['lookups', 'industry', 'sales status'] },
      { label: 'Login history', href: '/admin/auth-logs', icon: History, perm: 'audit.view_login_history', keywords: ['audit', 'auth logs'] },
    ],
  },
];

export const FOOTER_NAV: NavItem[] = [
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Help center', href: '/help', icon: LifeBuoy, tour: 'nav-help', keywords: ['faq', 'tour', 'support'] },
  { label: 'Settings', href: '/settings', icon: Settings, keywords: ['profile', 'password', 'theme'] },
];
