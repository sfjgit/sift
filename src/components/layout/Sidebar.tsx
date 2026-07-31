// File: Sidebar.tsx
// Path: src/components/layout/Sidebar.tsx

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';

const NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Pipeline', href: '/pipeline-stages', icon: Kanban, module: 'pipeline-stages' },

  { label: 'Reports', href: '/reports', icon: BarChart2, module: 'reports' },

  { label: 'My Assignments', href: '/my-assignments', icon: ClipboardList },
  { label: 'Assignments', href: '/assignments', icon: ClipboardList },

  { label: 'Requirements', href: '/requirements', icon: FileText, module: 'requirements' },
  { label: 'Candidates', href: '/candidates', icon: UserSearch, module: 'candidates' },
  { label: 'Clients', href: '/clients', icon: Briefcase, module: 'clients' },
  { type: 'divider' as const },
  { label: 'Users', href: '/users', icon: Users, module: 'users' },
  { label: 'Business Units', href: '/business-units', icon: Building2, module: 'business-units' },
  { label: 'Departments', href: '/departments', icon: Layers, module: 'departments' },
  { label: 'Service Lines', href: '/service-lines', icon: GitBranch, module: 'service-lines' },
  { label: 'Org Tree', href: '/org', icon: Network },
  { label: 'Roles', href: '/roles', icon: UserSquare2, module: 'roles' },
  { type: 'divider' as const },
  { label: 'Extension', href: '/extension', icon: Puzzle },
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Ingest Logs', href: '/ingest-logs', icon: ClipboardList, module: 'ingest-logs' },
  { label: 'Naukri Logs', href: '/naukri-logs', icon: ClipboardList, module: 'Naukri-logs' },
  { label: 'Login Activity', href: '/auth-logs', icon: ClipboardList, module: 'auth-logs' },
];

/** Timings — tweak in one place. */
const REVEAL_DELAY_MS = 120; // pointer must linger on the edge this long before it slides in
const HIDE_DELAY_MS = 2500; // stays visible this long after the pointer leaves
const TRIGGER_WIDTH = 14; // px hot-zone hugging the left edge
const HINT_AUTO_DISMISS_MS = 14000; // first-run coach mark gives up after this

const PIN_KEY = 'talentos.sidebar.pinned';
const HINT_KEY = 'talentos.sidebar.hintSeen';

export function Sidebar() {
  const [pinned, setPinned] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pathname = usePathname();
  const { user, can } = useAuth();

  // restore preferences
  useEffect(() => {
    try {
      const isPinned = window.localStorage.getItem(PIN_KEY) === '1';
      if (isPinned) setPinned(true);
      if (!isPinned && window.localStorage.getItem(HINT_KEY) !== '1') {
        setShowHint(true);
        hintTimer.current = setTimeout(() => setShowHint(false), HINT_AUTO_DISMISS_MS);
      }
    } catch {
      /* storage unavailable — ignore */
    }
    return () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    };
  }, []);

  const dismissHint = useCallback(() => {
    setShowHint(false);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    try {
      window.localStorage.setItem(HINT_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  const clearTimers = useCallback(() => {
    if (revealTimer.current) clearTimeout(revealTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    revealTimer.current = null;
    hideTimer.current = null;
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  // the moment they actually pull the sidebar out, the lesson is learned
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

  // hovering the panel itself keeps it alive indefinitely
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
      setVisible(next); // pinning => stays open, unpinning => slide away
      return next;
    });
  }, [clearTimers]);

  // navigating away should let it retract on its own
  useEffect(() => {
    if (!pinned) scheduleHide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const isSuperAdmin = user?.isSuperAdmin === true;

  const visibleNav = NAV.filter(item => {
    if ('type' in item) return true;
    // @ts-expect-error optional flag on some nav entries
    if (item.superAdminOnly) return isSuperAdmin;
    if (isSuperAdmin) return true;
    if (!item.module) return true;
    return can(item.module, 'canView');
  });

  const cleanedNav = visibleNav.filter((item, i, arr) => {
    if (!('type' in item)) return true;
    const prev = arr[i - 1];
    const next = arr[i + 1];
    if (!prev || !next) return false;
    if ('type' in prev) return false;
    return true;
  });

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  const shown = pinned || visible;

  return (
    <>
      {/* Edge hot-zone — only exists while floating */}
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

      {/* Permanent breadcrumb: slim pulsing grabber on the edge while hidden */}
      {!pinned && (
        <div
          aria-hidden
          className={cn(
            'fixed left-0 top-1/2 z-30 pointer-events-none',
            'h-16 w-[3px] rounded-r-full bg-primary/50 sidebar-grabber',
            'transition-opacity duration-200',
            shown ? 'opacity-0' : 'opacity-100'
          )}
        />
      )}

      {/* First-run coach mark */}
      {showHint && !pinned && !shown && (
        <div className="fixed left-5 top-1/2 z-[60] sidebar-hint" role="status" aria-live="polite">
          <div className="relative flex items-start gap-3 max-w-[290px] rounded-xl border border-border bg-background/95 backdrop-blur px-4 py-3 shadow-2xl">
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

      {/* Layout spacer — reserves width only when pinned */}
      <div
        className={cn(
          'shrink-0 transition-[width] duration-200 ease-in-out',
          pinned ? 'w-[220px]' : 'w-0'
        )}
      />

      <aside
        onMouseEnter={keepAlive}
        onMouseLeave={scheduleHide}
        className={cn(
          'fixed left-0 top-0 h-screen w-[220px] z-40 flex flex-col',
          'border-r border-border bg-background',
          'transition-transform duration-200 ease-in-out will-change-transform',
          shown ? 'translate-x-0' : '-translate-x-full',
          !pinned && shown && 'shadow-2xl'
        )}
      >
        {/* Logo + pin toggle */}
        <div className="h-16 flex items-center shrink-0 w-full border-b border-border px-3.5 gap-3">
          <svg
            width="48"
            height="48"
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0"
          >
            <rect width="32" height="32" rx="7" fill="#0d1b4b" />
            <rect x="3" y="5" width="26" height="7" rx="2" fill="#4f7cff" />
            <rect x="12" y="12" width="8" height="15" rx="2" fill="#4f7cff" />
          </svg>

          <div className="flex flex-col items-start leading-none min-w-0">
            <span className="text-[14px] font-bold text-foreground tracking-tight whitespace-nowrap">
              TalentOS
            </span>
            <span className="text-[9px] text-muted-foreground tracking-[0.2em] uppercase mt-1 whitespace-nowrap">
              Recruit
            </span>
          </div>

          <button
            onClick={togglePin}
            title={pinned ? 'Unpin sidebar (auto-hide)' : 'Pin sidebar open'}
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
        <nav className="flex-1 overflow-y-auto py-2 px-2 flex flex-col gap-0.5">
          {cleanedNav.map((item, i) => {
            if ('type' in item) {
              return <div key={`d-${i}`} className="h-px bg-border my-1.5 shrink-0" />;
            }

            const Icon = item.icon;
            const isActive =
              pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex items-center gap-3 h-11 px-3 rounded-lg whitespace-nowrap overflow-hidden transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <Icon className={cn('h-6 w-6 shrink-0', isActive ? 'text-primary' : '')} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-border p-1.5 shrink-0">
          <div className="flex items-center gap-2.5 px-[7px] py-1.5 rounded-md hover:bg-muted/50 transition-colors cursor-pointer overflow-hidden whitespace-nowrap">
            <div className="h-[26px] w-[26px] rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-medium text-primary">{initials}</span>
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[11px] font-medium text-foreground truncate">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="text-[10px] text-muted-foreground truncate">
                {user?.role?.name?.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
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
