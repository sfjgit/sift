// File: Topbar.tsx
// Path: src/components/layout/Topbar.tsx

'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAxios } from '@/hooks/useAxios';
import { Bell, Search, Moon, Sun, LogOut, ChevronRight, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  referenceId: string;
  referenceType: string;
  isRead: boolean;
  createdAt: string;
}

const LABELS: Record<string, string> = {
  '': 'Dashboard',
  requirements: 'Requirements',
  clients: 'Clients',
  users: 'Users',
  'business-units': 'Business Units',
  departments: 'Departments',
  'service-lines': 'Service Lines',
  org: 'Org Tree',
  roles: 'Roles',
  settings: 'Settings',
};

function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return (
      <Link href="/" className="text-sm font-semibold hover:text-foreground transition-colors">
        Dashboard
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      <Link
        href="/dashboard"
        className="text-muted-foreground font-medium hover:text-foreground transition-colors"
      >
        TalentOS
      </Link>

      {segments.map((seg, i) => {
        const label = LABELS[seg] ?? seg;
        const isLast = i === segments.length - 1;
        // Build the href up to this segment: /seg0/seg1/...
        const href = '/' + segments.slice(0, i + 1).join('/');

        return (
          <span key={seg} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            {isLast ? (
              // Last segment: not a link, just bold label
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link
                href={href}
                className="font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </div>
  );
}

function NotificationBell() {
  const axios = useAxios();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: async () => {
      const res = await axios.get('/notifications?isRead=false&limit=5');
      return res.data as { data: Notification[]; meta: { unread: number; total: number } };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => axios.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications-count'] }),
  });

  const unread = data?.meta?.unread ?? 0;
  const recent = data?.data?.slice(0, 5) ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[9px] font-bold text-white flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <Badge className="text-[10px] px-1.5 bg-destructive text-white">{unread} unread</Badge>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-2 text-muted-foreground">
            <BellOff className="h-6 w-6 opacity-30" />
            <p className="text-xs">No new notifications</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {recent.map(n => (
              <div
                key={n.id}
                className={cn(
                  'flex items-start gap-2.5 px-4 py-3 cursor-pointer transition-colors',
                  !n.isRead ? 'bg-primary/5 hover:bg-primary/8' : 'hover:bg-muted/40'
                )}
                onClick={() => {
                  if (!n.isRead) markRead.mutate(n.id);
                  router.push(`/requirements/${n.referenceId}`);
                }}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full shrink-0 mt-1.5',
                    !n.isRead ? 'bg-primary' : 'bg-transparent'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-xs font-medium line-clamp-1',
                      !n.isRead ? 'text-foreground' : 'text-foreground/70'
                    )}
                  >
                    {n.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t px-4 py-2.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs text-primary"
            onClick={() => router.push('/notifications')}
          >
            View all notifications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}

export function Topbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <header className="h-14 border-b border-border bg-background/95 backdrop-blur-sm flex items-center px-5 gap-4 shrink-0 z-10">
      {/* breadcrumb */}
      <div className="flex-1 min-w-0">
        <Breadcrumb />
      </div>

      {/* right actions */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Search className="h-4 w-4" />
        </Button>

        <ThemeToggle />
        <NotificationBell />

        {/* user menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 flex items-center gap-2 px-2 ml-1">
              <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary">
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </span>
              </div>
              <span className="text-xs font-medium hidden sm:block">{user?.firstName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-3 py-2.5">
              <p className="text-sm font-semibold">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              <Badge variant="outline" className="mt-1.5 text-[10px] px-1.5 py-0">
                {user?.role?.name}
              </Badge>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/settings')}>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={async () => {
                await logout();
                router.replace('/sign-in');
              }}
            >
              <LogOut className="h-3.5 w-3.5 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
