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
  ListOrdered,
  ClipboardList,
} from 'lucide-react';

const NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'My Assignments', href: '/my-assignments', icon: ClipboardList },
  { label: 'Requirements', href: '/requirements', icon: FileText, module: 'requirements' },
  { label: 'Clients', href: '/clients', icon: Briefcase, module: 'clients' },
  { type: 'divider' as const },
  { label: 'Users', href: '/users', icon: Users, module: 'users' },
  { label: 'Business Units', href: '/business-units', icon: Building2, module: 'business_units' },
  { label: 'Departments', href: '/departments', icon: Layers, module: 'departments' },
  { label: 'Service Lines', href: '/service-lines', icon: GitBranch, module: 'service_lines' },
  { label: 'Org Tree', href: '/org', icon: Network, superAdminOnly: true },
  { label: 'Roles', href: '/roles', icon: UserSquare2, superAdminOnly: true },
  { type: 'divider' as const },
  { label: 'Settings', href: '/settings', icon: Settings },
];

type TooltipState = { label: string; top: number; left: number } | null;

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const pathname = usePathname();
  const { user } = useAuth();

  const isSuperAdmin = user?.isSuperAdmin === true;
  const permMap = Object.fromEntries((user?.role?.permissions ?? []).map(p => [p.module, p]));

  const visibleNav = NAV.filter(item => {
    if ('type' in item) return true;
    if (item.superAdminOnly) return isSuperAdmin;
    if (isSuperAdmin) return true;
    if (!item.module) return true;
    return permMap[item.module]?.canView === true;
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

  return (
    <>
      <aside
        className={cn(
          'shrink-0 flex flex-col border-r border-border bg-muted/40 overflow-visible relative z-20',
          'transition-[width] duration-[200ms] ease-in-out',
          open ? 'w-[220px]' : 'w-[52px]'
        )}
      >
        {/* Logo / toggle */}
        <button
          onClick={() => {
            setOpen(o => !o);
            setTooltip(null);
          }}
          className="h-14 flex items-center border-b border-border shrink-0 w-full hover:bg-background transition-colors overflow-hidden"
        >
          {/* Collapsed: show favicon T mark */}
          <div
            className={cn(
              'absolute flex items-center justify-center transition-opacity duration-150',
              open ? 'opacity-0 pointer-events-none' : 'opacity-100'
            )}
            style={{ left: 0, width: 52 }}
          >
            <svg width="28" height="28" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="7" fill="#0d1b4b" />
              <rect x="3" y="5" width="26" height="7" rx="2" fill="#4f7cff" />
              <rect x="12" y="12" width="8" height="15" rx="2" fill="#4f7cff" />
            </svg>
          </div>

          {/* Expanded: full logo + wordmark */}
          <div
            className={cn(
              'flex items-center gap-3 pl-3 transition-opacity duration-150',
              open ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="7" fill="#0d1b4b" />
              <rect x="3" y="5" width="26" height="7" rx="2" fill="#4f7cff" />
              <rect x="12" y="12" width="8" height="15" rx="2" fill="#4f7cff" />
            </svg>
            <div className="flex flex-col leading-none">
              <span className="text-[14px] font-semibold text-foreground tracking-tight">
                TalentOS
              </span>
              <span className="text-[9px] text-muted-foreground tracking-[0.2em] uppercase mt-0.5">
                Recruit
              </span>
            </div>
          </div>
        </button>

        {/* Nav */}
        <nav className="flex-1 overflow-hidden py-1.5 px-1.5 flex flex-col gap-px">
          {cleanedNav.map((item, i) => {
            if ('type' in item) return <div key={i} className="h-px bg-border my-1 shrink-0" />;

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
                  'flex items-center gap-2.5 h-[34px] px-[7px] rounded-md whitespace-nowrap overflow-hidden transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : '')} />
                <span
                  className={cn(
                    'text-xs transition-opacity duration-150',
                    open ? 'opacity-100' : 'opacity-0'
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
          <div className="flex items-center gap-2.5 px-[7px] py-1 rounded-md hover:bg-background transition-colors cursor-pointer overflow-hidden whitespace-nowrap">
            <div className="h-[26px] w-[26px] rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-medium text-primary">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </span>
            </div>
            <div
              className={cn(
                'flex flex-col leading-tight transition-opacity duration-150',
                open ? 'opacity-100' : 'opacity-0'
              )}
            >
              <span className="text-[11px] font-medium text-foreground">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="text-[10px] text-muted-foreground">{user?.role?.name}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Tooltip portal */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ top: tooltip.top, left: tooltip.left, transform: 'translateY(-50%)' }}
        >
          <div className="relative bg-foreground text-background text-[11px] px-2.5 py-1 rounded-md whitespace-nowrap">
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
