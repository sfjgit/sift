// File: CommandPalette.tsx
// Path: src/components/shell/CommandPalette.tsx
//
// ⌘K / Ctrl+K: live search across clients, SPOCs and people (scoped by the
// backend), page navigation and quick actions.

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { useTheme } from 'next-themes';
import { Building2, ContactRound, Keyboard, LogOut, Moon, Plus, Sparkles, Sun, User } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { Command } from '@/components/ui/command';
import { ClientStatusBadge } from '@/components/common/badges';
import { Spinner } from '@/components/common/states';
import { searchApi } from '@/lib/api/endpoints';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePermissions } from '@/features/auth/usePermissions';
import { useTourStore } from '@/features/tour/tourStore';
import { getTourForPath } from '@/features/tour/tours';
import { fullName } from '@/lib/format';
import { useUi } from '@/stores/ui';
import { useVisibleNav } from './Sidebar';
import type { ClientStatus } from '@/types/crm';

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const { can } = usePermissions();
  const { resolvedTheme, setTheme } = useTheme();
  const { commandOpen: open, setCommandOpen: setOpen, openClientDialog, openSpocDialog, setShortcutsOpen } = useUi();
  const { sections, footer } = useVisibleNav();
  const [q, setQ] = useState('');
  const [debounced] = useDebounce(q.trim(), 200);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!useUi.getState().commandOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  const { data, isFetching } = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => searchApi.query(debounced, 6),
    enabled: open && debounced.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

  const go = (href: string) => {
    setOpen(false);
    setQ('');
    router.push(href);
  };
  const run = (fn: () => void) => {
    setOpen(false);
    setQ('');
    fn();
  };

  const tour = getTourForPath(pathname);
  const hasResults = !!data && debounced.length >= 2;

  return (
    <CommandDialog
      open={open}
      onOpenChange={o => {
        setOpen(o);
        if (!o) setQ('');
      }}
      title="Search"
      description="Search clients, SPOCs, people and pages"
      className="sm:max-w-xl"
    >
      <Command shouldFilter={!hasResults}>
        <CommandInput placeholder="Search clients, SPOCs, people, pages…" value={q} onValueChange={setQ} />
        <CommandList className="max-h-[60vh]">
          <CommandEmpty>
            {isFetching ? (
              <span className="inline-flex items-center gap-2">
                <Spinner /> Searching…
              </span>
            ) : debounced.length >= 2 ? (
              'No results'
            ) : (
              'Type at least 2 characters'
            )}
          </CommandEmpty>

          {hasResults && data.clients.length > 0 && (
            <CommandGroup heading="Clients">
              {data.clients.map(c => (
                <CommandItem key={c.id} value={`client-${c.id}`} onSelect={() => go(`/clients/${c.id}`)}>
                  <Building2 className="text-muted-foreground" />
                  <span className="truncate">{c.name}</span>
                  {c.city && <span className="truncate text-xs text-muted-foreground">{c.city}</span>}
                  <span className="ml-auto">
                    <ClientStatusBadge status={c.status as ClientStatus} />
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {hasResults && data.spocs.length > 0 && (
            <CommandGroup heading="SPOCs">
              {data.spocs.map(s => (
                <CommandItem key={s.id} value={`spoc-${s.id}`} onSelect={() => go(`/spocs/${s.id}`)}>
                  <ContactRound className="text-muted-foreground" />
                  <span className="truncate">{fullName(s)}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {[s.designation, s.client.name].filter(Boolean).join(' · ')}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {hasResults && data.users.length > 0 && (
            <CommandGroup heading="People">
              {data.users.map(u => (
                <CommandItem key={u.id} value={`user-${u.id}`} onSelect={() => go(`/admin/users/${u.id}`)}>
                  <User className="text-muted-foreground" />
                  <span className="truncate">{fullName(u)}</span>
                  <span className="truncate text-xs text-muted-foreground">{u.designation?.name ?? u.email}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!hasResults && (
            <>
              <CommandGroup heading="Quick actions">
                {can('clients.create') && (
                  <CommandItem onSelect={() => run(() => openClientDialog(true))}>
                    <Plus /> New client
                  </CommandItem>
                )}
                {can('spocs.create') && (
                  <CommandItem onSelect={() => run(() => openSpocDialog({}))}>
                    <Plus /> New SPOC
                  </CommandItem>
                )}
                {tour && (
                  <CommandItem onSelect={() => run(() => useTourStore.getState().start(tour.id))}>
                    <Sparkles /> Take the tour of this page
                  </CommandItem>
                )}
                <CommandItem onSelect={() => run(() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'))}>
                  {resolvedTheme === 'dark' ? <Sun /> : <Moon />} Switch to {resolvedTheme === 'dark' ? 'light' : 'dark'} mode
                </CommandItem>
                <CommandItem onSelect={() => run(() => setShortcutsOpen(true))}>
                  <Keyboard /> Keyboard shortcuts
                  <CommandShortcut>?</CommandShortcut>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Go to">
                {[...sections.flatMap(s => s.items), ...footer].map(item => (
                  <CommandItem
                    key={item.href}
                    value={`${item.label} ${item.keywords?.join(' ') ?? ''}`}
                    onSelect={() => go(item.href)}
                  >
                    <item.icon className="text-muted-foreground" /> {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem onSelect={() => run(() => void logout())}>
                  <LogOut /> Sign out
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
