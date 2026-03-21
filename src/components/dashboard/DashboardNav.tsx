'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePermission } from '@/hooks/usePermission';
import { NAV_ITEMS } from '@/config/navigation';
// import ThemeToggle from '@/components/ui/ThemeToggle';
import UserMenu from './UserMenu';
import ThemeToggle from '../ThemeToggle';

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 flex items-center justify-between px-6 h-14 border-b border-border bg-background/80 backdrop-blur-sm">
      {/* Logo */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent">
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
            className="text-sm font-semibold text-foreground/90 tracking-tight"
            style={{ letterSpacing: '-0.02em' }}
          >
            TalentOS
          </span>
        </div>

        {/* Nav items — filtered by permissions */}
        <div className="hidden md:flex items-center gap-0.5">
          <NavItems pathname={pathname} />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <div className="w-px h-4 bg-border mx-1" />
        <UserMenu />
      </div>
    </nav>
  );
}

// Separate component so each item calls usePermission independently
function NavItems({ pathname }: { pathname: string }) {
  return (
    <>
      {NAV_ITEMS.map(item => (
        <NavItemGated key={item.href} item={item} pathname={pathname} />
      ))}
    </>
  );
}

function NavItemGated({ item, pathname }: { item: (typeof NAV_ITEMS)[number]; pathname: string }) {
  const canView = usePermission(item.module, 'canView');
  if (!canView) return null;

  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <Link
      href={item.href}
      className={`
        px-3 py-1.5 rounded-md text-sm transition-all duration-150
        ${
          isActive
            ? 'text-foreground bg-foreground/[0.07] font-medium'
            : 'text-foreground/50 hover:text-foreground/80 hover:bg-foreground/[0.04]'
        }
      `}
    >
      {item.label}
    </Link>
  );
}
