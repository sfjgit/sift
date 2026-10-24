// File: AppShell.tsx
// Path: src/components/shell/AppShell.tsx
//
// Authenticated frame: sidebar + top bar + global dialogs + tour engine.
// Unauthenticated visitors are sent to /sign-in?next=<where they were>.

'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Search, UserRoundX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { FullPageLoader } from '@/components/common/states';
import { useAuth } from '@/features/auth/AuthProvider';
import { getImpersonationTarget, type ImpersonationTarget } from '@/features/auth/impersonation';
import { authApi } from '@/lib/api/endpoints';
import { refreshSession } from '@/lib/api/client';
import { TourEngine } from '@/features/tour/TourEngine';
import { PendingTourStarter } from '@/features/tour/PendingTourStarter';
import { tourTarget } from '@/features/tour/tour.constants';
import { ClientFormDialog } from '@/features/clients/ClientFormDialog';
import { SpocFormDialog } from '@/features/spocs/SpocFormDialog';
import { cn } from '@/lib/utils';
import { useUi } from '@/stores/ui';
import { CommandPalette } from './CommandPalette';
import { NotificationsPopover } from './Notifications';
import { SidebarContent } from './Sidebar';
import { HelpMenu, QuickAddMenu, ShortcutsLayer, UserMenu } from './TopbarMenus';

function ImpersonationBanner() {
  // rendered only after auth resolves (client-side), so the cookie can be read directly
  const [target] = useState<ImpersonationTarget | null>(getImpersonationTarget);
  const [busy, setBusy] = useState(false);
  if (!target) return null;

  const stop = async () => {
    setBusy(true);
    try {
      await authApi.stopImpersonation();
      await refreshSession();
      window.location.href = '/admin/users';
    } catch {
      window.location.href = '/sign-in';
    }
  };

  return (
    <div className="flex items-center justify-center gap-3 bg-warning px-4 py-1.5 text-xs font-medium text-[oklch(0.25_0.05_60)]">
      <UserRoundX className="size-3.5" />
      <span>
        You’re signed in as <strong>{target.name}</strong> ({target.email}). Every change is audited under your name.
      </span>
      <button
        type="button"
        onClick={stop}
        disabled={busy}
        className="rounded-md bg-black/10 px-2 py-0.5 font-semibold hover:bg-black/20 disabled:opacity-60"
      >
        {busy ? 'Switching…' : 'Back to my account'}
      </button>
    </div>
  );
}

function SearchTrigger() {
  const setOpen = useUi(s => s.setCommandOpen);
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      {...tourTarget('global-search')}
      className="flex h-8 w-full max-w-md items-center gap-2 rounded-lg border bg-surface px-2.5 text-[13px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
    >
      <Search className="size-3.5" />
      <span className="flex-1 truncate text-left">Search clients, SPOCs, people…</span>
      <span className="hidden items-center gap-0.5 sm:flex">
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </span>
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isLoading, isAuthenticated, expired } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useUi();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
    router.replace(`/sign-in?next=${next}${expired ? '&expired=1' : ''}`);
  }, [isLoading, isAuthenticated, expired, router]);

  if (isLoading || !isAuthenticated) return <FullPageLoader />;

  return (
    <div className="flex min-h-svh flex-col">
      <ImpersonationBanner />
      <div className="flex flex-1">
        <aside
          className={cn(
            'sticky top-0 hidden h-svh shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:block',
            sidebarCollapsed ? 'w-[60px]' : 'w-60'
          )}
        >
          <SidebarContent collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        </aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-64 bg-sidebar p-0" showCloseButton={false}>
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-md md:px-6">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu />
            </Button>
            <SearchTrigger />
            <div className="ml-auto flex items-center gap-1">
              <QuickAddMenu />
              <HelpMenu />
              <NotificationsPopover />
              <div className="mx-1 h-6 w-px bg-border" />
              <UserMenu />
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 md:px-6 lg:px-8">{children}</main>
        </div>
      </div>

      <CommandPalette />
      <ShortcutsLayer />
      <ClientFormDialog />
      <SpocFormDialog />
      <TourEngine />
      <PendingTourStarter />
    </div>
  );
}
