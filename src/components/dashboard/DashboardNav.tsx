'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermission';
import UserMenu from './UserMenu';
import ThemeToggle from '../ThemeToggle';
import { useMemo } from 'react';

// ─────────────────────────────────────────
// NAV ITEMS
// module = RolePermission.module in DB
// ─────────────────────────────────────────

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', module: 'requirements' },
  { label: 'Requirements', href: '/requirements', module: 'requirements' },
  { label: 'Clients', href: '/clients', module: 'clients' },
  { label: 'Teams', href: '/teams', module: 'teams' },
  { label: 'Users', href: '/users', module: 'users' },
  { label: 'Business Units', href: '/business-units', module: 'business_units' },
  { label: 'Roles', href: '/roles', module: 'settings' },
  { label: 'Reports', href: '/reports', module: 'reports' },
  { label: 'Audit Logs', href: '/audit-logs', module: 'settings' },
  { label: 'Settings', href: '/settings', module: 'settings' },
] as const;

type NavItem = (typeof NAV_ITEMS)[number];

// ─────────────────────────────────────────
// ROLE BADGE
// ─────────────────────────────────────────

const ROLE_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  SUPER_ADMIN: { bg: 'bg-red-500/10', text: 'text-red-500', dot: 'bg-red-500' },
  ADMIN: { bg: 'bg-violet-500/10', text: 'text-violet-500', dot: 'bg-violet-500' },
  DELIVERY_MANAGER: { bg: 'bg-amber-500/10', text: 'text-amber-500', dot: 'bg-amber-500' },
  TEAM_LEAD: { bg: 'bg-sky-500/10', text: 'text-sky-500', dot: 'bg-sky-500' },
  RECRUITER: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', dot: 'bg-emerald-500' },
  SALES: { bg: 'bg-pink-500/10', text: 'text-pink-500', dot: 'bg-pink-500' },
};

function RoleBadge({ roleName }: { roleName: string }) {
  const s = ROLE_STYLES[roleName] ?? {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    dot: 'bg-muted-foreground',
  };
  const label = roleName
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());

  return (
    <span
      className={`
      hidden lg:inline-flex items-center gap-1.5
      px-2 py-0.5 rounded-full
      text-[10px] font-semibold tracking-wider
      ${s.bg} ${s.text}
      ring-1 ring-inset ring-current/15
    `}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
      {label}
    </span>
  );
}

// ─────────────────────────────────────────
// LOGO
// ─────────────────────────────────────────

function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 shrink-0 group">
      <div
        className="
        flex items-center justify-center
        w-7 h-7 rounded-lg
        bg-foreground
        shadow-sm
        transition-opacity duration-150
        group-hover:opacity-75
      "
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path
            d="M3 12L8 3L13 12"
            stroke="hsl(var(--background))"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5.5 8.5H10.5"
            stroke="hsl(var(--background))"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <span
        className="
        text-[13.5px] font-bold tracking-tight
        text-foreground
        transition-opacity duration-150
        group-hover:opacity-70
      "
      >
        TalentOS
      </span>
    </Link>
  );
}

// ─────────────────────────────────────────
// NAV LINK
// ─────────────────────────────────────────

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive =
    item.href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <Link
      href={item.href}
      className={`
        relative px-3 py-1.5 rounded-md
        text-[13px] font-medium whitespace-nowrap
        transition-colors duration-150
        ${
          isActive
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }
      `}
    >
      {item.label}

      {/* Primary coloured underline on active */}
      {isActive && (
        <span
          className="
          absolute inset-x-3 -bottom-[14px]
          h-[2px] rounded-full
          bg-primary
        "
        />
      )}
    </Link>
  );
}

// ─────────────────────────────────────────
// MAIN NAVBAR
// ─────────────────────────────────────────

export default function DashboardNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const allModules = NAV_ITEMS.map(i => i.module);
  const permissions = usePermissions(allModules);

  const visibleItems = useMemo(() => {
    if (!user) return [];
    return NAV_ITEMS.filter(item => {
      if (user.isSuperAdmin) return true;
      return permissions[item.module]?.canView === true;
    });
  }, [user, permissions]);

  const roleName = user?.isSuperAdmin ? 'SUPER_ADMIN' : (user?.role?.name ?? '');

  return (
    <nav
      className="
      sticky top-0 z-40 h-14
      bg-background/95 backdrop-blur-md
      border-b border-border
    "
    >
      <div className="flex items-center justify-between h-full px-5 lg:px-8">
        {/* ── Left ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 min-w-0">
          <Logo />

          {user && <RoleBadge roleName={roleName} />}

          <div className="w-px h-4 bg-border shrink-0" />

          {/* Nav items */}
          <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
            {visibleItems.map(item => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        </div>

        {/* ── Right ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 shrink-0 pl-3">
          <ThemeToggle />
          <div className="w-px h-4 bg-border mx-1" />
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
