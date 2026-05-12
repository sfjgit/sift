'use client';

import { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';

const NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Pipeline Stages', href: '/pipeline-stages', icon: LayoutDashboard },

  { label: 'Requirements', href: '/requirements', icon: FileText },
  { label: 'Clients', href: '/clients', icon: Briefcase },
  { type: 'divider' as const },
  { label: 'Users', href: '/users', icon: Users, adminOnly: true },
  { label: 'Business Units', href: '/business-units', icon: Building2, adminOnly: true },
  { label: 'Departments', href: '/departments', icon: Layers, adminOnly: true },
  { label: 'Service Lines', href: '/service-lines', icon: GitBranch, adminOnly: true },
  { label: 'Org Tree', href: '/org', icon: Network, adminOnly: true },
  { label: 'Roles', href: '/roles', icon: UserSquare2, adminOnly: true },
  { type: 'divider' as const },
  { label: 'Settings', href: '/settings', icon: Settings },
];

type TooltipState = { label: string; top: number; left: number } | null;

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const pathname = usePathname();
  const { user } = useAuth();
  const isSuperAdmin = user?.isSuperAdmin;

  const permMap = Object.fromEntries((user?.role?.permissions ?? []).map(p => [p.module, p]));

  const visibleNav = NAV.filter(item => {
    if ('type' in item) return true;
    // @ts-expect-error errr
    if (!item.module) return true; // Dashboard, Org Tree, Settings
    if (isSuperAdmin) return true;
    // @ts-expect-error errr
    return permMap[item.module]?.canView === true;
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
          'transition-[width] duration-[180ms]',
          open ? 'w-[210px]' : 'w-[52px]'
        )}
      >
        {/* Logo toggle */}
        <button
          onClick={() => {
            setOpen(o => !o);
            setTooltip(null);
          }}
          className="h-12 flex items-center gap-2.5 px-[13px] border-b border-border shrink-0 overflow-hidden whitespace-nowrap w-full hover:bg-background transition-colors"
        >
          <div className="h-[26px] w-[26px] rounded-[7px] bg-foreground flex items-center justify-center shrink-0">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2 6 L6 2 L10 6 L6 10 Z"
                fill="currentColor"
                className="text-background"
                opacity="0.9"
              />
              <circle cx="6" cy="6" r="1.8" fill="currentColor" className="text-background" />
            </svg>
          </div>
          <div
            className={cn(
              'flex flex-col leading-none transition-opacity duration-150',
              open ? 'opacity-100' : 'opacity-0'
            )}
          >
            <span className="text-[12px] font-medium text-foreground">TalentOS</span>
            <span className="text-[9px] text-muted-foreground tracking-widest uppercase">
              Recruit
            </span>
          </div>
        </button>

        {/* Nav */}
        <nav className="flex-1 overflow-hidden py-1.5 px-1.5 flex flex-col gap-px">
          {visibleNav.map((item, i) => {
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
