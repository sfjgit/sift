// File: MobileTabBar.tsx
// Path: src/components/shell/MobileTabBar.tsx
//
// Phones only (< md): the four most-used pages one thumb-tap away at the
// bottom of the screen, plus "Menu" for everything else (opens the sidebar
// sheet). Permission-filtered like the sidebar. Its height is the CSS var
// --mobile-nav-h (globals.css) — page padding and floating widgets use it.

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVisibleNav } from './Sidebar';

/** first four of these the user may open */
const PRIORITY = ['/dashboard', '/clients', '/spocs', '/map', '/reports', '/approvals'];

const isActive = (pathname: string, href: string) =>
  href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

export function MobileTabBar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const { sections } = useVisibleNav();
  const all = sections.flatMap(s => s.items);
  const tabs = PRIORITY.map(h => all.find(i => i.href === h))
    .filter(i => !!i)
    .slice(0, 4);

  const tab =
    'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors';

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 flex h-[var(--mobile-nav-h)] border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden print:hidden"
    >
      {tabs.map(item => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(tab, active ? 'text-primary' : 'text-muted-foreground')}
          >
            <span
              className={cn(
                'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                active && 'bg-primary/12'
              )}
            >
              <item.icon className="size-5" />
            </span>
            <span className="max-w-full truncate px-1">{item.label}</span>
          </Link>
        );
      })}
      <button type="button" onClick={onMenu} className={cn(tab, 'text-muted-foreground')}>
        <span className="flex h-7 w-12 items-center justify-center">
          <Menu className="size-5" />
        </span>
        Menu
      </button>
    </nav>
  );
}
