// File: Sidebar.tsx
// Path: src/components/shell/Sidebar.tsx
//
// Permission-filtered navigation. Collapses to an icon rail on desktop
// (remembered), renders inside a Sheet on mobile.

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FOOTER_NAV, NAV_SECTIONS, type NavItem } from '@/config/navigation';
import { usePermissions } from '@/features/auth/usePermissions';
import { tourTarget } from '@/features/tour/tour.constants';
import { useUnreadCount } from '@/hooks/queries';
import { cn } from '@/lib/utils';

export function useVisibleNav() {
  const { can, canAny, isSuperAdmin } = usePermissions();
  const visible = (i: NavItem) =>
    isSuperAdmin ||
    ((!i.perm || can(i.perm)) && (!i.anyPerm || canAny(i.anyPerm)) && !i.superAdmin);
  return {
    sections: NAV_SECTIONS.map(s => ({ ...s, items: s.items.filter(visible) })).filter(
      s => s.items.length
    ),
    footer: FOOTER_NAV.filter(visible),
  };
}

const isActive = (pathname: string, href: string) =>
  href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

function NavLink({
  item,
  collapsed,
  onNavigate,
  badge,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
  badge?: number;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      {...(item.tour ? tourTarget(item.tour) : {})}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors',
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
        collapsed && 'justify-center px-0'
      )}
    >
      {active && (
        <span className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-sidebar-primary" />
      )}
      <item.icon
        className={cn('size-4 shrink-0', active ? 'text-sidebar-primary' : 'opacity-75')}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!!badge && (
        <span
          className={cn(
            'rounded-full bg-primary text-[10px] leading-4 font-semibold text-primary-foreground tabular',
            collapsed ? 'absolute top-0.5 right-1 size-2 p-0 text-[0px]' : 'ml-auto px-1.5'
          )}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function SidebarContent({
  collapsed = false,
  onToggle,
  onNavigate,
}: {
  collapsed?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  const { sections, footer } = useVisibleNav();
  const unread = useUnreadCount().data?.meta.unread ?? 0;

  return (
    <div className="flex h-full flex-col" {...tourTarget('sidebar')}>
      <div
        className={cn('flex h-14 shrink-0 items-center px-4', collapsed && 'justify-center px-0')}
      >
        <Link href="/dashboard" onClick={onNavigate} aria-label="SFJBS CRM home">
          <Logo compact={collapsed} />
        </Link>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {sections.map(section => (
          <div key={section.label} className="space-y-0.5">
            {!collapsed ? (
              <p className="px-2.5 pb-1 text-[10.5px] font-semibold tracking-wider text-muted-foreground/80 uppercase">
                {section.label}
              </p>
            ) : (
              <div className="mx-auto mb-1.5 h-px w-5 bg-sidebar-border" />
            )}
            {section.items.map(item => (
              <NavLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>

      <div className="space-y-0.5 border-t border-sidebar-border px-3 py-3">
        {footer.map(item => (
          <NavLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            onNavigate={onNavigate}
            badge={item.href === '/notifications' ? unread : undefined}
          />
        ))}
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              'mt-1 flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground',
              collapsed && 'justify-center px-0'
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
            {!collapsed && 'Collapse'}
          </button>
        )}
      </div>
    </div>
  );
}
