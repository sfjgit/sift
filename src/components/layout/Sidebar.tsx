// File: Sidebar.tsx
// Path: src/components/layout/Sidebar.tsx

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  Briefcase,
  GitBranch,
  Settings,
  Layers,
  Network,
  UserSquare2,
  ClipboardList,
  UserSearch,
  Kanban,
  BarChart2,
  Puzzle,
  Pin,
  PinOff,
  MoveLeft,
  X,
  LifeBuoy,
  ShieldQuestion,
  ChevronDown,
  Database,
  Landmark,
  Ticket,
  BriefcaseBusiness,
  ChartBarStacked,
  LogOut,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NavChild = {
  label: string;
  href: string;
  icon: React.ElementType;
  module?: string;
  superAdminOnly?: boolean;
};

type NavLink = {
  type: 'link';
  label: string;
  href: string;
  icon: React.ElementType;
  module?: string;
  superAdminOnly?: boolean;
};

type NavGroup = {
  type: 'group';
  label: string;
  icon: React.ElementType;
  key: string;
  children: NavChild[];
};

type NavDivider = { type: 'divider' };

type NavItem = NavLink | NavGroup | NavDivider;

// ---------------------------------------------------------------------------
// Nav definition
// ---------------------------------------------------------------------------

const NAV: NavItem[] = [
  {
    type: 'link',
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },

  { type: 'divider' },

  {
    type: 'group',
    label: 'Jobs',
    icon: BriefcaseBusiness,
    key: 'jobs',
    children: [
      { label: 'Requirements', href: '/requirements', icon: FileText, module: 'requirements' },
      { label: 'Assignments', href: '/assignments', icon: ClipboardList },
      { label: 'My assignments', href: '/my-assignments', icon: ClipboardList },
    ],
  },
  {
    type: 'link',
    label: 'Internal Pool',
    href: '/internal-pool',
    icon: UserSearch,
    module: 'candidates',
  },
  {
    type: 'link',
    label: 'Candidates',
    href: '/candidates',
    icon: UserSearch,
    module: 'candidates',
  },
  { type: 'link', label: 'Clients', href: '/clients', icon: Briefcase, module: 'clients' },
  { type: 'link', label: 'Reports', href: '/reports', icon: BarChart2, module: 'reports' },

  { type: 'divider' },

  {
    type: 'group',
    label: 'Organisation',
    icon: Landmark,
    key: 'org',
    children: [
      { label: 'Pipeline', href: '/pipeline-stages', icon: Kanban, module: 'pipeline-stages' },
      { label: 'Users', href: '/users', icon: Users, module: 'users' },
      {
        label: 'Business units',
        href: '/business-units',
        icon: Building2,
        module: 'business-units',
      },
      { label: 'Departments', href: '/departments', icon: Layers, module: 'departments' },
      { label: 'Service lines', href: '/service-lines', icon: GitBranch, module: 'service-lines' },
      { label: 'Org tree', href: '/org', icon: Network },
      { label: 'Roles', href: '/roles', icon: UserSquare2, module: 'roles' },
      {
        label: 'Requirement categories',
        href: '/requirement-categories',
        icon: ChartBarStacked,
        module: 'requirement-categories',
      },
    ],
  },

  {
    type: 'group',
    label: 'Logs',
    icon: Database,
    key: 'logs',
    children: [
      { label: 'Ingest logs', href: '/ingest-logs', icon: ClipboardList, module: 'ingest-logs' },
      { label: 'Naukri logs', href: '/naukri-logs', icon: ClipboardList, module: 'Naukri-logs' },
      {
        label: 'Naukri capture logs',
        href: '/naukri-capture-logs',
        icon: ClipboardList,
        superAdminOnly: true,
      },
      //{ label: 'Login activity', href: '/auth-logs', icon: ClipboardList, module: 'auth-logs' },
      //],
      //},
      { label: 'Login activity', href: '/auth-logs', icon: ClipboardList, module: 'auth-logs' },
      {
        label: 'Internal search reasons',
        href: '/internal-search-reasons',
        icon: ClipboardList,
        module: 'assignments',
      },
    ],
  },

  {
    type: 'group',
    label: 'Tickets',
    icon: Ticket,
    key: 'tickets',
    children: [
      { label: 'My tickets', href: '/my-tickets', icon: LifeBuoy },
      {
        label: 'System tickets',
        href: '/system-tickets',
        icon: ShieldQuestion,
        module: 'system-tickets',
      },
    ],
  },

  { type: 'divider' },

  { type: 'link', label: 'Extension', href: '/extension', icon: Puzzle },
  { type: 'link', label: 'Settings', href: '/settings', icon: Settings },
];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REVEAL_DELAY_MS = 120;
const HIDE_DELAY_MS = 500;
const TRIGGER_WIDTH = 14;
const HINT_AUTO_DISMISS_MS = 14000;

const PIN_KEY = 'talentos.sidebar.pinned';
const HINT_KEY = 'talentos.sidebar.hintSeen';

function groupStorageKey(key: string) {
  return `talentos.sidebar.group.${key}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Sidebar() {
  const [pinned, setPinned] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pathname = usePathname();
  const router = useRouter();
  const { user, can, logout } = useAuth();

  // ── Restore persisted preferences ────────────────────────────────────────
  useEffect(() => {
    try {
      const isPinned = window.localStorage.getItem(PIN_KEY) === '1';
      if (isPinned) setPinned(true);

      if (!isPinned && window.localStorage.getItem(HINT_KEY) !== '1') {
        setShowHint(true);
        hintTimer.current = setTimeout(() => setShowHint(false), HINT_AUTO_DISMISS_MS);
      }

      const restoredGroups: Record<string, boolean> = {};
      NAV.forEach(item => {
        if (item.type !== 'group') return;
        restoredGroups[item.key] = window.localStorage.getItem(groupStorageKey(item.key)) === '1';
      });
      setOpenGroups(restoredGroups);
    } catch {
      /* storage unavailable */
    }
    return () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    };
  }, []);

  // Auto-open group that contains the active route
  useEffect(() => {
    NAV.forEach(item => {
      if (item.type !== 'group') return;
      const hasActiveChild = item.children.some(
        c => pathname === c.href || pathname.startsWith(c.href + '/')
      );
      if (hasActiveChild) {
        setOpenGroups(prev => ({ ...prev, [item.key]: true }));
        try {
          window.localStorage.setItem(groupStorageKey(item.key), '1');
        } catch {
          /* ignore */
        }
      }
    });
  }, [pathname]);

  const toggleGroup = useCallback((key: string) => {
    setOpenGroups(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        window.localStorage.setItem(groupStorageKey(key), next[key] ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // ── Hint ─────────────────────────────────────────────────────────────────
  const dismissHint = useCallback(() => {
    setShowHint(false);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    try {
      window.localStorage.setItem(HINT_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  // ── Hover timers ─────────────────────────────────────────────────────────
  const clearTimers = useCallback(() => {
    if (revealTimer.current) clearTimeout(revealTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    revealTimer.current = null;
    hideTimer.current = null;
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  useEffect(() => {
    if (visible && showHint) dismissHint();
  }, [visible, showHint, dismissHint]);

  const scheduleReveal = useCallback(() => {
    if (pinned) return;
    clearTimers();
    revealTimer.current = setTimeout(() => setVisible(true), REVEAL_DELAY_MS);
  }, [pinned, clearTimers]);

  const scheduleHide = useCallback(() => {
    if (pinned) return;
    clearTimers();
    hideTimer.current = setTimeout(() => setVisible(false), HIDE_DELAY_MS);
  }, [pinned, clearTimers]);

  const keepAlive = useCallback(() => {
    if (pinned) return;
    clearTimers();
    setVisible(true);
  }, [pinned, clearTimers]);

  const togglePin = useCallback(() => {
    setPinned(p => {
      const next = !p;
      try {
        window.localStorage.setItem(PIN_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      clearTimers();
      setVisible(next);
      return next;
    });
  }, [clearTimers]);

  useEffect(() => {
    if (!pinned) scheduleHide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ── RBAC ─────────────────────────────────────────────────────────────────
  const isSuperAdmin = user?.isSuperAdmin === true;

  function linkVisible(item: { module?: string; superAdminOnly?: boolean }): boolean {
    if (item.superAdminOnly) return isSuperAdmin;
    if (isSuperAdmin) return true;
    if (!item.module) return true;
    return can(item.module, 'canView');
  }

  // ── Filter + clean nav ────────────────────────────────────────────────────
  const filteredNav = NAV.reduce<NavItem[]>((acc, item) => {
    if (item.type === 'divider') {
      acc.push(item);
      return acc;
    }
    if (item.type === 'link') {
      if (linkVisible(item)) acc.push(item);
      return acc;
    }
    if (item.type === 'group') {
      const kids = item.children.filter(c => linkVisible(c));
      if (kids.length > 0) acc.push({ ...item, children: kids });
      return acc;
    }
    return acc;
  }, []);

  const cleanedNav = filteredNav.filter((item, i, arr) => {
    if (item.type !== 'divider') return true;
    const prev = arr[i - 1];
    const next = arr[i + 1];
    if (!prev || !next) return false;
    if (prev.type === 'divider') return false;
    return true;
  });

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();
  const shown = pinned || visible;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Edge hot-zone */}
      {!pinned && (
        <div
          aria-hidden
          onMouseEnter={scheduleReveal}
          onMouseLeave={() => {
            if (revealTimer.current) clearTimeout(revealTimer.current);
            revealTimer.current = null;
          }}
          className="fixed left-0 top-0 h-screen z-30"
          style={{ width: TRIGGER_WIDTH }}
        />
      )}

      {/* Pulsing grabber */}
      {!pinned && (
        <div
          aria-hidden
          className={cn(
            'fixed left-0 top-1/2 z-30 pointer-events-none',
            'h-16 w-0.75 rounded-r-full bg-primary/50 sidebar-grabber',
            'transition-opacity duration-200',
            shown ? 'opacity-0' : 'opacity-100'
          )}
        />
      )}

      {/* First-run coach mark */}
      {showHint && !pinned && !shown && (
        <div className="fixed left-5 top-1/2 z-60 sidebar-hint" role="status" aria-live="polite">
          <div className="relative flex items-start gap-3 max-w-72.5 rounded-xl border border-border bg-background/95 backdrop-blur px-4 py-3 shadow-2xl">
            <MoveLeft className="h-5 w-5 shrink-0 text-primary mt-0.5 sidebar-hint-arrow" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground leading-tight">
                Your menu lives on the edge
              </p>
              <p className="text-[12px] text-muted-foreground leading-snug mt-1">
                Move your cursor to the far left of the screen and the sidebar slides out. It tucks
                away again a couple of seconds after you leave — or hit the pin to keep it open.
              </p>
              <button
                onClick={dismissHint}
                className="mt-2.5 text-[12px] font-medium text-primary hover:underline"
              >
                Got it
              </button>
            </div>
            <button
              onClick={dismissHint}
              aria-label="Dismiss"
              className="shrink-0 -mr-1 -mt-1 h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Layout spacer */}
      <div
        className={cn(
          'shrink-0 transition-[width] duration-200 ease-in-out',
          pinned ? 'w-55' : 'w-0'
        )}
      />

      <aside
        onMouseEnter={keepAlive}
        onMouseLeave={scheduleHide}
        className={cn(
          'fixed left-0 top-0 h-screen w-55 z-40 flex flex-col min-h-0',
          'border-r border-border bg-background',
          'transition-transform duration-200 ease-in-out will-change-transform',
          shown ? 'translate-x-0' : '-translate-x-full',
          !pinned && shown && 'shadow-2xl'
        )}
      >
        {/* Header */}
        <div className="h-14 flex items-center shrink-0 w-full border-b border-border px-3.5 gap-3">
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0"
          >
            <rect width="32" height="32" rx="7" fill="#0d1b4b" />
            <rect x="3" y="5" width="26" height="7" rx="2" fill="#4f7cff" />
            <rect x="12" y="12" width="8" height="15" rx="2" fill="#4f7cff" />
          </svg>
          <div className="flex flex-col items-start leading-none min-w-0">
            <span className="text-[13px] font-semibold text-foreground tracking-tight whitespace-nowrap">
              TalentOS
            </span>
            <span className="text-[9px] text-muted-foreground tracking-[0.2em] uppercase mt-0.5 whitespace-nowrap">
              Recruit
            </span>
          </div>
          <button
            onClick={togglePin}
            title={pinned ? 'Unpin sidebar' : 'Pin sidebar open'}
            aria-pressed={pinned}
            className={cn(
              'ml-auto shrink-0 h-7 w-7 rounded-md flex items-center justify-center transition-colors',
              pinned
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            {pinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 min-h-0 overflow-y-auto">
          <div className="py-2 px-2 flex flex-col gap-0.5">
            {cleanedNav.map((item, i) => {
              if (item.type === 'divider') {
                return <div key={`d-${i}`} className="h-px bg-border my-1 shrink-0" />;
              }

              // ── Flat link ──────────────────────────────────────────────────
              if (item.type === 'link') {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href + '/'));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 h-10 px-2.5 rounded-lg whitespace-nowrap overflow-hidden transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground/70 hover:text-foreground hover:bg-muted/60'
                    )}
                  >
                    {/* filled icon via strokeWidth=0 + fill trick; falls back to stroked if fill not available */}
                    <Icon
                      className={cn(
                        'h-5 w-5 shrink-0',
                        isActive ? 'text-primary' : 'text-foreground/60'
                      )}
                      strokeWidth={isActive ? 2.2 : 1.8}
                      fill={isActive ? 'currentColor' : 'none'}
                      style={isActive ? { opacity: 1 } : undefined}
                    />
                    <span
                      className={cn('text-[13.5px]', isActive ? 'font-semibold' : 'font-medium')}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              }

              // ── Group ──────────────────────────────────────────────────────
              if (item.type === 'group') {
                const GroupIcon = item.icon;
                const isOpen = !!openGroups[item.key];
                const hasActiveChild = item.children.some(
                  c => pathname === c.href || pathname.startsWith(c.href + '/')
                );

                return (
                  <div key={item.key}>
                    <button
                      onClick={() => toggleGroup(item.key)}
                      aria-expanded={isOpen}
                      className={cn(
                        'w-full flex items-center gap-3 h-10 px-2.5 rounded-lg transition-colors',
                        hasActiveChild && !isOpen
                          ? 'text-primary'
                          : 'text-foreground/70 hover:text-foreground hover:bg-muted/60'
                      )}
                    >
                      <GroupIcon
                        className={cn(
                          'h-5 w-5 shrink-0',
                          hasActiveChild && !isOpen ? 'text-primary' : 'text-foreground/60'
                        )}
                        strokeWidth={hasActiveChild && !isOpen ? 2.2 : 1.8}
                        fill={hasActiveChild && !isOpen ? 'currentColor' : 'none'}
                      />
                      <span
                        className={cn(
                          'flex-1 text-left text-[13.5px]',
                          hasActiveChild && !isOpen ? 'font-semibold' : 'font-medium'
                        )}
                      >
                        {item.label}
                      </span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 shrink-0 text-foreground/40 transition-transform duration-200',
                          isOpen && 'rotate-180'
                        )}
                        strokeWidth={2}
                      />
                    </button>

                    {/* Children */}
                    <div
                      className={cn(
                        'overflow-hidden transition-all duration-200 ease-in-out',
                        isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                      )}
                    >
                      <div className="mt-0.5 mb-0.5 flex flex-col gap-0.5 pl-3 border-l border-border ml-4.5">
                        {item.children.map(child => {
                          const ChildIcon = child.icon;
                          const isActive =
                            pathname === child.href ||
                            (child.href !== '/' && pathname.startsWith(child.href + '/'));
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={cn(
                                'flex items-center gap-2.5 h-9 px-2 rounded-md whitespace-nowrap overflow-hidden transition-colors',
                                isActive
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-foreground/60 hover:text-foreground hover:bg-muted/60'
                              )}
                            >
                              <ChildIcon
                                className={cn(
                                  'h-4.5 w-4.5 shrink-0',
                                  isActive ? 'text-primary' : 'text-foreground/50'
                                )}
                                strokeWidth={isActive ? 2.2 : 1.8}
                                fill={isActive ? 'currentColor' : 'none'}
                              />
                              <span
                                className={cn(
                                  'text-[13px]',
                                  isActive ? 'font-semibold' : 'font-medium'
                                )}
                              >
                                {child.label}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        </nav>

        {/* User footer */}
        {/* User footer */}
        <div className="border-t border-border p-1.5 shrink-0 flex flex-col gap-0.5">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted/60 transition-colors cursor-pointer overflow-hidden whitespace-nowrap">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-semibold text-primary">{initials}</span>
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[12px] font-semibold text-foreground truncate">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="text-[11px] text-foreground/50 truncate">
                {user?.role?.name?.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          <button
            onClick={async () => {
              await logout();
              router.replace('/sign-in');
            }}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-destructive/10 transition-colors overflow-hidden whitespace-nowrap text-destructive w-full"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[12px] font-medium">Sign out</span>
          </button>
        </div>
      </aside>

      <style jsx>{`
        .sidebar-grabber {
          animation: grabber-breathe 2.4s ease-in-out infinite;
        }
        .sidebar-hint {
          animation: hint-in 260ms ease-out both;
        }
        .sidebar-hint-arrow {
          animation: arrow-nudge 1.4s ease-in-out infinite;
        }
        @keyframes grabber-breathe {
          0%,
          100% {
            opacity: 0.35;
            transform: translateY(-50%) scaleY(0.85);
          }
          50% {
            opacity: 1;
            transform: translateY(-50%) scaleY(1);
          }
        }
        @keyframes hint-in {
          from {
            opacity: 0;
            transform: translate(-10px, -50%);
          }
          to {
            opacity: 1;
            transform: translate(0, -50%);
          }
        }
        @keyframes arrow-nudge {
          0%,
          100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(-5px);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .sidebar-grabber {
            animation: none;
            transform: translateY(-50%);
          }
          .sidebar-hint {
            animation: none;
            transform: translateY(-50%);
          }
          .sidebar-hint-arrow {
            animation: none;
          }
        }
      `}</style>
    </>
  );
}
