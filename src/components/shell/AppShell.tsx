// File: AppShell.tsx
// Path: src/components/shell/AppShell.tsx
//
// Authenticated frame: sidebar + top bar + global dialogs (⌘K palette, AI
// command bar) + tour engine.
// Unauthenticated visitors are sent to /sign-in?next=<where they were>.
//
// Desktop (lg+, mouse): sidebar and top bar are hidden by default and slide in
// over the page when the mouse rests on the left / top window edge (see
// useEdgeReveal). Each bar has its own pin that puts it back in the layout.
// Smaller screens and touch devices keep the classic always-on layout.

'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { RunsTray } from './RunsTray';
import { WebsitePopup } from '@/features/website/WebsitePopup';
import { useRouter } from 'next/navigation';
import { Building2, Menu, Search, UserRoundX } from 'lucide-react';
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
import { VoiceAssistant } from '@/components/ai/VoiceAssistant';
import { AiTopbarControl } from '@/components/ai/AiModeToggle';
import { NotificationsPopover } from './Notifications';
import { PinToggle, SidebarContent } from './Sidebar';
import { HelpMenu, QuickAddMenu, ShortcutsLayer, UserMenu } from './TopbarMenus';
import { announceLayoutChange, useAutoHideDesktop, useEdgeReveal } from './useEdgeReveal';

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
        You’re signed in as <strong>{target.name}</strong> ({target.email}). Every change is audited
        under your name.
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
      className="flex h-8 w-full max-w-md items-center gap-2 rounded-lg border bg-surface px-2.5 text-[14px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
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

// which company's workspace this is — matters once there is more than one
function TenantBadge() {
  const { user } = useAuth();
  if (!user?.tenant) return null;
  return (
    <span
      className="hidden items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1 text-xs font-medium md:inline-flex"
      title={`Workspace: ${user.tenant.name}`}
    >
      <Building2 className="size-3.5 text-muted-foreground" />
      {user.tenant.name}
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isLoading, isAuthenticated, expired } = useAuth();
  const {
    sidebarCollapsed,
    toggleSidebar,
    sidebarPinned,
    topbarPinned,
    toggleSidebarPin,
    toggleTopbarPin,
  } = useUi();
  const [mobileOpen, setMobileOpen] = useState(false);

  const autoHide = useAutoHideDesktop();
  const sideFloat = autoHide && !sidebarPinned;
  const topFloat = autoHide && !topbarPinned;
  const { ref: sideRef, shown: sideShown, setShown: setSideShown } = useEdgeReveal<HTMLElement>(
    'left',
    sideFloat
  );
  const { ref: topRef, shown: topShown, setShown: setTopShown } = useEdgeReveal<HTMLElement>(
    'top',
    topFloat
  );

  // pinning/unpinning reflows the page: let fitted tables re-measure
  useEffect(() => {
    announceLayoutChange();
  }, [sideFloat, topFloat]);

  // unpinning happens under the mouse — keep the bar out until the mouse leaves
  const onSidebarPin = () => {
    if (sidebarPinned) setSideShown(true);
    toggleSidebarPin();
  };
  const onTopbarPin = () => {
    if (topbarPinned) setTopShown(true);
    toggleTopbarPin();
  };

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
    router.replace(`/sign-in?next=${next}${expired ? '&expired=1' : ''}`);
  }, [isLoading, isAuthenticated, expired, router]);

  if (isLoading || !isAuthenticated) return <FullPageLoader />;

  // the floating top bar starts where a pinned sidebar ends
  const topLeft = sideFloat ? 'left-0' : sidebarCollapsed ? 'left-[60px]' : 'left-60';
  const slide = 'duration-200 ease-out motion-reduce:transition-none';

  return (
    <div
      className="flex min-h-svh flex-col"
      // pages that size to the viewport subtract the top bar only when it takes space
      style={{ '--topbar-h': topFloat ? '0px' : '3.5rem' } as CSSProperties}
    >
      <ImpersonationBanner />
      <div className="flex flex-1">
        <aside
          ref={sideRef}
          className={cn(
            'hidden h-svh shrink-0 border-r border-sidebar-border bg-sidebar md:block',
            sideFloat
              ? cn(
                  'fixed top-0 left-0 z-[45] transition-[width,transform,opacity,box-shadow]',
                  slide,
                  sideShown
                    ? 'translate-x-0 opacity-100 shadow-2xl'
                    : 'pointer-events-none -translate-x-full opacity-0'
                )
              : 'sticky top-0 transition-[width] duration-200',
            sidebarCollapsed ? 'w-[60px]' : 'w-60'
          )}
        >
          <SidebarContent
            collapsed={sidebarCollapsed}
            onToggle={toggleSidebar}
            {...(autoHide ? { pinned: sidebarPinned, onPinToggle: onSidebarPin } : {})}
          />
        </aside>

        {/* faint edge hints where the hidden bars live — never intercept the mouse */}
        {sideFloat && (
          <div
            aria-hidden
            className={cn(
              'pointer-events-none fixed inset-y-0 left-0 z-[44] w-[2px] bg-linear-to-b from-transparent via-primary/25 to-transparent transition-opacity',
              slide,
              sideShown && 'opacity-0'
            )}
          />
        )}
        {topFloat && (
          <div
            aria-hidden
            className={cn(
              'pointer-events-none fixed top-0 right-0 z-[44] h-[2px] bg-linear-to-r from-transparent via-primary/25 to-transparent transition-opacity',
              slide,
              topLeft,
              topShown && 'opacity-0'
            )}
          />
        )}

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-64 bg-sidebar p-0" showCloseButton={false}>
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <header
            ref={topRef}
            className={cn(
              'flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-md md:px-6',
              topFloat
                ? cn(
                    'fixed top-0 right-0 z-40 transition-[transform,opacity,box-shadow,left]',
                    slide,
                    topLeft,
                    topShown
                      ? 'translate-y-0 opacity-100 shadow-lg'
                      : 'pointer-events-none -translate-y-full opacity-0'
                  )
                : 'sticky top-0 z-30'
            )}
          >
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu />
            </Button>
            <SearchTrigger />
            <TenantBadge />
            <div className="ml-auto flex items-center gap-1">
              <AiTopbarControl />
              <QuickAddMenu />
              <HelpMenu />
              <NotificationsPopover />
              {autoHide && (
                <PinToggle pinned={topbarPinned} onToggle={onTopbarPin} what="top bar" />
              )}
              <div className="mx-1 h-6 w-px bg-border" />
              <UserMenu />
            </div>
          </header>

          {/* every page uses the full width — no empty side margins */}
          <main className="w-full flex-1 px-4 py-3 md:px-5">{children}</main>
          <RunsTray />
          <WebsitePopup />
        </div>
      </div>

      <CommandPalette />
      <VoiceAssistant />
      <ShortcutsLayer />
      <ClientFormDialog />
      <SpocFormDialog />
      <TourEngine />
      <PendingTourStarter />
    </div>
  );
}
