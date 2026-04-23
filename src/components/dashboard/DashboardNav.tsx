'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
// import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { NAV_ITEMS } from '@/config/navigation';
import UserMenu from './UserMenu';
import ThemeToggle from '../ThemeToggle';
import BuDropdown from './BuDropdown';
import { useEffect, useState, useRef, useMemo } from 'react';
import { Building2, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parsePathSegments(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  const afterDashboard = segments.slice(1); // drop 'dashboard'
  const hasBU = !!afterDashboard[0] && UUID_REGEX.test(afterDashboard[0]);
  return {
    buId: hasBU ? afterDashboard[0] : '',
    tail: hasBU ? afterDashboard.slice(1) : afterDashboard,
  };
}

// ─────────────────────────────────────────
// PERMISSION HELPERS — derived from user context
// ─────────────────────────────────────────

type PermissionScope = 'OWN' | 'TEAM' | 'MANAGER' | 'BU' | 'ALL';

interface ResolvedUser {
  isSuperAdmin: boolean;
  role: string; // e.g. "RECRUITER"
  scope: PermissionScope; // broadest scope across all permissions
  canViewModules: Set<string>;
  businessUnitId: string | null;
  buName: string | null;
  displayName: string;
}

const SCOPE_RANK: Record<PermissionScope, number> = {
  OWN: 1,
  TEAM: 2,
  MANAGER: 3,
  BU: 4,
  ALL: 5,
};

function resolveUser(user: ReturnType<typeof useAuth>['user']): ResolvedUser | null {
  if (!user) return null;

  const canViewModules = new Set<string>(
    user.role.permissions.filter(p => p.canView).map(p => p.module)
  );

  // Broadest scope across all permissions
  let broadestScope: PermissionScope = 'OWN';
  for (const p of user.role.permissions) {
    if (p.scope && SCOPE_RANK[p.scope as PermissionScope] > SCOPE_RANK[broadestScope]) {
      broadestScope = p.scope as PermissionScope;
    }
  }

  return {
    isSuperAdmin: user.isSuperAdmin,
    role: user.role.name,
    scope: broadestScope,
    canViewModules,
    businessUnitId: user.businessUnitId ?? null,
    buName: user.businessUnit?.name ?? null,
    displayName: user.displayName ?? `${user.firstName} ${user.lastName}`,
  };
}

// Who gets the BU switcher?
// SUPER_ADMIN → full switcher (all BUs)
// ADMIN → locked to their own BU (show as pill, no switch)
// Everyone else → no BU switcher at all
function getBUMode(resolved: ResolvedUser): 'full' | 'locked' | 'none' {
  if (resolved.isSuperAdmin || resolved.scope === 'ALL') return 'full';
  if (resolved.scope === 'BU') return 'locked';
  return 'none';
}

// ─────────────────────────────────────────
// ROLE BADGE — subtle pill next to logo
// ─────────────────────────────────────────

const ROLE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  SUPER_ADMIN: { bg: 'bg-red-500/10', text: 'text-red-500', dot: 'bg-red-500' },
  ADMIN: { bg: 'bg-violet-500/10', text: 'text-violet-500', dot: 'bg-violet-500' },
  DELIVERY_MANAGER: { bg: 'bg-amber-500/10', text: 'text-amber-500', dot: 'bg-amber-500' },
  TEAM_LEAD: { bg: 'bg-blue-500/10', text: 'text-blue-500', dot: 'bg-blue-500' },
  RECRUITER: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', dot: 'bg-emerald-500' },
  SALES: { bg: 'bg-pink-500/10', text: 'text-pink-500', dot: 'bg-pink-500' },
};

function RoleBadge({ role }: { role: string }) {
  const c = ROLE_COLORS[role] ?? {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    dot: 'bg-muted-foreground',
  };
  const label = role
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase());
  return (
    <span
      className={`hidden lg:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide ${c.bg} ${c.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {label}
    </span>
  );
}

// ─────────────────────────────────────────
// LOCKED BU PILL — for ADMIN users
// ─────────────────────────────────────────

function LockedBUPill({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-muted/40 text-[12px] font-medium text-muted-foreground select-none">
      <Building2 size={11} className="flex-shrink-0" />
      {name}
    </div>
  );
}

// ─────────────────────────────────────────
// BREADCRUMB TRAIL — shows current section for non-super users
// ─────────────────────────────────────────

function ScopePill({ scope, buName }: { scope: PermissionScope; buName: string | null }) {
  if (scope === 'ALL') return null;
  const label =
    scope === 'BU'
      ? (buName ?? 'BU scope')
      : scope === 'MANAGER'
        ? 'Manager scope'
        : scope === 'TEAM'
          ? 'Team scope'
          : 'Own scope';
  return (
    <span className="hidden xl:inline-flex items-center gap-1 text-[11px] text-muted-foreground/60 border-l border-border pl-3">
      <ChevronRight size={10} />
      {label}
    </span>
  );
}

// ─────────────────────────────────────────
// MAIN NAV
// ─────────────────────────────────────────

export default function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const resolved = useMemo(() => resolveUser(user), [user]);
  const buMode = resolved ? getBUMode(resolved) : 'none';

  // BU state — init from URL (super admin) or from user's own BU (admin)
  const [selectedBU, setSelectedBU] = useState<string>(() => {
    if (!resolved) return '';
    if (buMode === 'locked') return resolved.businessUnitId ?? '';
    return parsePathSegments(pathname).buId;
  });

  const isMounted = useRef(false);

  // Sync BU selection → URL (only for full switcher mode)
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    if (buMode !== 'full') return; // locked/none users don't drive URL

    const { tail } = parsePathSegments(pathname);
    const tailPath = tail.join('/');

    if (selectedBU) {
      router.push(`/dashboard/${selectedBU}${tailPath ? `/${tailPath}` : ''}`);
    } else {
      router.push(`/dashboard${tailPath ? `/${tailPath}` : ''}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBU]);

  // For locked BU users — keep URL in sync with their fixed BU on mount
  useEffect(() => {
    if (buMode !== 'locked' || !resolved?.businessUnitId) return;
    const { tail } = parsePathSegments(pathname);
    const tailPath = tail.join('/');
    // If URL doesn't already have their BU, push it in
    if (!pathname.includes(resolved.businessUnitId)) {
      router.replace(`/dashboard/${resolved.businessUnitId}${tailPath ? `/${tailPath}` : ''}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <nav className="sticky top-0 z-40 h-14 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex items-center justify-between h-full px-4 lg:px-6 gap-4">
        {/* ── Left: Logo + role badge + BU + nav items ── */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo */}
          <Link
            href={selectedBU ? `/dashboard/${selectedBU}` : '/dashboard'}
            className="flex items-center gap-2 shrink-0 group"
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/60 transition-opacity group-hover:opacity-80">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 12L8 4L13 12"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M5 9H11" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <span
              className="text-[13px] font-semibold text-foreground tracking-tight"
              style={{ letterSpacing: '-0.025em' }}
            >
              TalentOS
            </span>
          </Link>

          {/* Role badge */}
          {resolved && <RoleBadge role={resolved.role} />}

          {/* Scope pill */}
          {resolved && <ScopePill scope={resolved.scope} buName={resolved.buName} />}

          {/* Divider */}
          <div className="w-px h-4 bg-border shrink-0" />

          {/* BU control */}
          {buMode === 'full' && <BuDropdown value={selectedBU} onChange={setSelectedBU} />}
          {buMode === 'locked' && resolved?.buName && <LockedBUPill name={resolved.buName} />}

          {/* Nav items */}
          {resolved && (
            <div className="hidden md:flex items-center gap-0.5">
              <NavItems
                pathname={pathname}
                canViewModules={resolved.canViewModules}
                activeBuId={selectedBU || resolved.businessUnitId || ''}
              />
            </div>
          )}
        </div>

        {/* ── Right: Theme + user menu ── */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <div className="w-px h-4 bg-border" />
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────
// NAV ITEMS — filtered by canViewModules
// ─────────────────────────────────────────

// NAV_ITEMS hrefs are like /dashboard/requirements, /dashboard/clients etc.
// When a BU is active we rewrite them to /dashboard/:buId/requirements etc.
function injectBuId(href: string, buId: string): string {
  if (!buId) return href;
  // href is always /dashboard/something — insert buId after /dashboard
  return href.replace(/^\/dashboard/, `/dashboard/${buId}`);
}

function NavItems({
  pathname,
  canViewModules,
  activeBuId,
}: {
  pathname: string;
  canViewModules: Set<string>;
  activeBuId: string;
}) {
  return (
    <>
      {NAV_ITEMS.map(item => (
        <NavItemGated
          key={item.href}
          item={item}
          pathname={pathname}
          canViewModules={canViewModules}
          activeBuId={activeBuId}
        />
      ))}
    </>
  );
}

function NavItemGated({
  item,
  pathname,
  canViewModules,
  activeBuId,
}: {
  item: (typeof NAV_ITEMS)[number];
  pathname: string;
  canViewModules: Set<string>;
  activeBuId: string;
}) {
  const hookCanView = usePermission(item.module, 'canView');
  const ctxCanView = !item.module || canViewModules.has(item.module);
  if (!hookCanView && !ctxCanView) return null;

  // Strip BU uuid from current pathname for isActive comparison
  const cleanPath = pathname.replace(
    /\/dashboard\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    '/dashboard'
  );
  const isActive = cleanPath === item.href || cleanPath.startsWith(item.href + '/');

  // Actual href — inject active BU id so navigation preserves BU context
  const resolvedHref = injectBuId(item.href, activeBuId);

  return (
    <Link
      href={resolvedHref}
      className={[
        'relative px-3 py-1.5 rounded-md text-[13px] transition-all duration-150',
        isActive ? 'text-foreground font-medium' : 'text-foreground/50 hover:text-foreground/80',
      ].join(' ')}
    >
      {isActive && (
        <span className="absolute inset-x-2 -bottom-[13px] h-px bg-foreground rounded-full" />
      )}
      {item.label}
    </Link>
  );
}
