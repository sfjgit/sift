// File: Sidebar.tsx
// Path: src/components/layout/Sidebar.tsx

'use client';

import { useState } from 'react';
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
  { label: 'Settings', href: '/settings', icon: Settings },
];

type TooltipState = { label: string; top: number; left: number } | null;

export function Sidebar() {
  const [open, setOpen] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const pathname = usePathname();
  const { user, can } = useAuth();

  const isSuperAdmin = user?.isSuperAdmin === true;

  const visibleNav = NAV.filter(item => {
    if ('type' in item) return true;
    // @ts-expect-error err
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

  function showTooltip(e: React.MouseEvent<HTMLAnchorElement>, label: string) {
    if (open) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ label, top: rect.top + rect.height / 2, left: rect.right + 10 });
  }

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <>
      <aside
        className={cn(
          'shrink-0 flex flex-col border-r border-border bg-background overflow-visible relative z-20',
          'transition-[width] duration-200 ease-in-out',
          open ? 'w-[220px]' : 'w-[68px]'
        )}
      >
        {/* Logo / toggle — logo is 3x the nav icon size */}
        <button
          onClick={() => {
            setOpen(o => !o);
            setTooltip(null);
          }}
          className={cn(
            'h-16 flex items-center shrink-0 w-full border-b border-border',
            'hover:bg-muted/40 transition-colors overflow-hidden',
            open ? 'px-3.5 gap-3' : 'justify-center px-0'
          )}
        >
          {/* Logo — 96px (3× the 32px nav icon) */}
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

          {/* Wordmark */}
          <div
            className={cn(
              'flex flex-col items-start leading-none transition-opacity duration-150',
              open ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
            )}
          >
            <span className="text-[14px] font-bold text-foreground tracking-tight whitespace-nowrap">
              TalentOS
            </span>
            <span className="text-[9px] text-muted-foreground tracking-[0.2em] uppercase mt-1 whitespace-nowrap">
              Recruit
            </span>
          </div>
        </button>

        {/* Nav */}
        <nav className="flex-1 overflow-hidden py-2 px-2 flex flex-col gap-0.5">
          {cleanedNav.map((item, i) => {
            if ('type' in item) {
              return <div key={i} className="h-px bg-border my-1.5 shrink-0" />;
            }

            const Icon = item.icon;
            const isActive =
              pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={e => showTooltip(e, item.label)}
                onMouseLeave={() => setTooltip(null)}
                className={cn(
                  'relative flex items-center gap-3 h-11 rounded-lg whitespace-nowrap overflow-hidden transition-colors',
                  open ? 'px-3' : 'justify-center px-0',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <Icon className={cn('h-6 w-6 shrink-0', isActive ? 'text-primary' : '')} />
                <span
                  className={cn(
                    'text-sm font-medium transition-opacity duration-150',
                    open ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-border p-1.5 shrink-0">
          <div
            className={cn(
              'flex items-center gap-2.5 rounded-md hover:bg-muted/50 transition-colors cursor-pointer overflow-hidden whitespace-nowrap',
              open ? 'px-[7px] py-1.5' : 'justify-center py-1.5 px-0'
            )}
          >
            <div className="h-[26px] w-[26px] rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-medium text-primary">{initials}</span>
            </div>
            <div
              className={cn(
                'flex flex-col leading-tight transition-opacity duration-150 min-w-0',
                open ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
              )}
            >
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

      {/* Tooltip */}
      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ top: tooltip.top, left: tooltip.left, transform: 'translateY(-50%)' }}
        >
          <div className="relative bg-foreground text-background text-[11px] px-2.5 py-1 rounded-md whitespace-nowrap shadow-lg">
            <span
              className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent"
              style={{ borderRightColor: 'hsl(var(--foreground))' }}
            />
            {tooltip.label}
          </div>
        </div>
      )}
    </>
  );
}
