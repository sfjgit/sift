// File: TopbarMenus.tsx
// Path: src/components/shell/TopbarMenus.tsx
//
// Help, quick-add, theme and account menus in the top bar, plus the
// keyboard-shortcuts dialog.

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
  Building2,
  CircleHelp,
  ContactRound,
  Keyboard,
  LifeBuoy,
  LogOut,
  Monitor,
  Moon,
  Plus,
  RotateCcw,
  Settings,
  Sparkles,
  Sun,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePermissions } from '@/features/auth/usePermissions';
import { tourTarget } from '@/features/tour/tour.constants';
import { useTourStore } from '@/features/tour/tourStore';
import { getTourForPath } from '@/features/tour/tours';
import { fullName } from '@/lib/format';
import { useUi } from '@/stores/ui';

export function QuickAddMenu() {
  const { can } = usePermissions();
  const { openClientDialog, openSpocDialog } = useUi();
  if (!can('clients.create') && !can('spocs.create')) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1.5" {...tourTarget('quick-add')}>
          <Plus /> <span className="hidden sm:inline">New</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Create</DropdownMenuLabel>
        {can('clients.create') && (
          <DropdownMenuItem onSelect={() => openClientDialog(true)}>
            <Building2 /> Client
          </DropdownMenuItem>
        )}
        {can('spocs.create') && (
          <DropdownMenuItem onSelect={() => openSpocDialog({})}>
            <ContactRound /> SPOC
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function HelpMenu() {
  const pathname = usePathname();
  const { user } = useAuth();
  const setShortcutsOpen = useUi(s => s.setShortcutsOpen);
  const tour = getTourForPath(pathname);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Help" {...tourTarget('help-menu')}>
          <CircleHelp />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Help</DropdownMenuLabel>
        {tour && (
          <DropdownMenuItem onSelect={() => useTourStore.getState().start(tour.id)}>
            <Sparkles /> Tour this page
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/help">
            <LifeBuoy /> Help center & FAQs
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setShortcutsOpen(true)}>
          <Keyboard /> Keyboard shortcuts <DropdownMenuShortcut>?</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            if (!user) return;
            useTourStore.getState().resetSeen(user.id);
            toast.success('Tours reset — they’ll play again as you visit each page.');
          }}
        >
          <RotateCcw /> Replay all tours
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UserMenu() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full p-0.5 pr-2 transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Account menu"
        >
          <UserAvatar person={user} size="md" />
          <span className="hidden max-w-28 truncate text-[13px] font-medium lg:block">{user.firstName}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="flex items-center gap-3 px-2 py-2">
          <UserAvatar person={user} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{fullName(user)}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <p className="mt-0.5 truncate text-[11px] text-primary">
              {user.isSuperAdmin ? 'Super admin' : user.role.name}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <UserRound /> Profile & password
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings?tab=preferences">
            <Settings /> Preferences
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme ?? 'system'} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Sun /> Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon /> Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor /> System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={async () => {
            await logout();
            router.replace('/sign-in');
          }}
        >
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const SHORTCUTS: [string[], string][] = [
  [['⌘', 'K'], 'Search everything / command palette'],
  [['/'], 'Focus the table search'],
  [['G', 'D'], 'Go to dashboard'],
  [['G', 'C'], 'Go to clients'],
  [['G', 'S'], 'Go to SPOCs'],
  [['G', 'R'], 'Go to reports'],
  [['N'], 'New client / SPOC (on that page)'],
  [['?'], 'Show this list'],
  [['Esc'], 'Close dialogs and menus'],
];

/** Global single-key shortcuts ("g c" style chords) + the cheat-sheet dialog. */
export function ShortcutsLayer() {
  const router = useRouter();
  const { shortcutsOpen, setShortcutsOpen } = useUi();

  useEffect(() => {
    let pendingG = 0;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable) return;
      if (document.querySelector('[role=dialog]')) return;
      const k = e.key.toLowerCase();
      if (k === '?') {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }
      if (k === 'g') {
        pendingG = Date.now();
        return;
      }
      if (Date.now() - pendingG < 900) {
        const map: Record<string, string> = { d: '/dashboard', c: '/clients', s: '/spocs', r: '/reports', h: '/help' };
        if (map[k]) {
          e.preventDefault();
          router.push(map[k]);
        }
        pendingG = 0;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router, setShortcutsOpen]);

  return (
    <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Move around without the mouse.</DialogDescription>
        </DialogHeader>
        <ul className="divide-y">
          {SHORTCUTS.map(([keys, label]) => (
            <li key={label} className="flex items-center justify-between py-2 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="flex items-center gap-1">
                {keys.map(k => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
