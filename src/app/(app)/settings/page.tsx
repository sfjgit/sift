// File: page.tsx
// Path: src/app/(app)/settings/page.tsx
//
// Personal settings: profile (read-only — admins own profile data), password
// change, and display preferences. ?tab=profile|security|preferences deep-links.

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Check,
  Keyboard,
  KeyRound,
  Monitor,
  Moon,
  PanelLeftClose,
  Palette,
  RotateCcw,
  Sun,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/common/PageHeader';
import { DetailList, Panel } from '@/components/common/Panel';
import { Pill } from '@/components/common/badges';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Spinner } from '@/components/common/states';
import { TextField, applyServerErrors } from '@/components/forms/fields';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePermissions } from '@/features/auth/usePermissions';
import { launchTour } from '@/features/help/launchTour';
import { useTourStore } from '@/features/tour/tourStore';
import { ALL_TOURS } from '@/features/tour/tours';
import { authApi } from '@/lib/api/endpoints';
import { fullName } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useUi } from '@/stores/ui';
import type { ApiError } from '@/lib/api/client';

type Tab = 'profile' | 'security' | 'preferences';
const TABS: Tab[] = ['profile', 'security', 'preferences'];

const initialTab = (): Tab => {
  if (typeof window === 'undefined') return 'profile';
  const t = new URLSearchParams(window.location.search).get('tab');
  return TABS.includes(t as Tab) ? (t as Tab) : 'profile';
};

// ── profile ──────────────────────────────────────────────────────────────────

function ProfileTab() {
  const { user } = useAuth();
  const { can } = usePermissions();
  if (!user) return null;
  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-wrap items-center gap-4">
          <UserAvatar person={user} size="xl" />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-lg font-semibold">
              {fullName(user)}
              {user.isSuperAdmin && (
                <Pill tone="violet" dot={false}>
                  Super admin
                </Pill>
              )}
            </p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </Panel>
      <Panel title="Your details">
        <DetailList
          items={[
            { label: 'First name', value: user.firstName },
            { label: 'Last name', value: user.lastName },
            { label: 'Display name', value: user.displayName },
            { label: 'Employee ID', value: user.employeeId && <span className="font-mono text-[13px]">{user.employeeId}</span> },
            { label: 'Email', value: user.email },
            { label: 'Role', value: user.role?.name },
            { label: 'Department', value: user.department?.name },
            { label: 'Designation', value: user.designation?.name },
          ]}
        />
      </Panel>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-3 text-[13px] text-muted-foreground">
        <span>Profile details are managed by your admins. Ask one if something here is wrong.</span>
        {can('users.read') && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/users/${user.id}`}>View full profile</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

// ── security ─────────────────────────────────────────────────────────────────

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(8, 'At least 8 characters'),
    confirm: z.string(),
  })
  .refine(v => v.newPassword === v.confirm, { message: 'Passwords don’t match', path: ['confirm'] })
  .refine(v => !v.currentPassword || v.newPassword !== v.currentPassword, {
    message: 'Pick something different from your current password',
    path: ['newPassword'],
  });

type PasswordValues = z.input<typeof passwordSchema>;

const STRENGTH = [
  { label: 'Too short', cls: 'bg-destructive' },
  { label: 'Weak', cls: 'bg-destructive' },
  { label: 'Fair', cls: 'bg-warning' },
  { label: 'Good', cls: 'bg-info' },
  { label: 'Strong', cls: 'bg-success' },
] as const;

/** 0 (too short) … 4 (strong) — length + variety, deliberately simple */
function passwordScore(pw: string) {
  if (pw.length < 8) return 0;
  let s = 1;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}

function StrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const score = passwordScore(password);
  return (
    <div className="space-y-1" aria-live="polite">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <span
            key={i}
            className={cn('h-1 flex-1 rounded-full transition-colors', i <= score ? STRENGTH[score].cls : 'bg-muted')}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Strength: <span className="font-medium text-foreground">{STRENGTH[score].label}</span>
        {score < 3 && ' · longer, with mixed case, numbers and symbols, is better'}
      </p>
    </div>
  );
}

function SecurityTab() {
  const form = useForm<PasswordValues, unknown, z.output<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  });
  const newPassword = useWatch({ control: form.control, name: 'newPassword' });

  const submit = form.handleSubmit(async v => {
    try {
      await authApi.changePassword(v.currentPassword, v.newPassword);
      toast.success('Password changed', { description: 'Use the new password next time you sign in.' });
      form.reset();
    } catch (e) {
      const err = e as ApiError;
      if (err.code === 'WRONG_PASSWORD') form.setError('currentPassword', { message: err.message });
      else if (!applyServerErrors(form, e)) toast.error(err.message);
    }
  });

  return (
    <Panel title="Change password" description="You’ll stay signed in on this device." className="max-w-xl">
      <form onSubmit={submit} noValidate className="space-y-4">
        <TextField
          form={form}
          name="currentPassword"
          label="Current password"
          type="password"
          autoComplete="current-password"
          required
        />
        <div className="space-y-2">
          <TextField
            form={form}
            name="newPassword"
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            hint="At least 8 characters."
          />
          <StrengthMeter password={newPassword ?? ''} />
        </div>
        <TextField
          form={form}
          name="confirm"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          required
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Spinner className="text-current" />}
            Update password
          </Button>
        </div>
      </form>
    </Panel>
  );
}

// ── preferences ──────────────────────────────────────────────────────────────

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun, preview: 'bg-white', bar: 'bg-zinc-200' },
  { value: 'dark', label: 'Dark', icon: Moon, preview: 'bg-zinc-900', bar: 'bg-zinc-700' },
  { value: 'system', label: 'System', icon: Monitor, preview: 'bg-gradient-to-r from-white from-50% to-zinc-900 to-50%', bar: 'bg-zinc-400' },
] as const;

function PreferenceRow({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Sun;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function PreferencesTab() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const sidebarCollapsed = useUi(s => s.sidebarCollapsed);
  const toggleSidebar = useUi(s => s.toggleSidebar);

  const replayTours = () => {
    if (!user) return;
    useTourStore.getState().resetSeen(String(user.id));
    const welcome = ALL_TOURS.find(t => t.id === 'welcome');
    toast.success('Tours reset', {
      description: 'Each page’s tour plays again the next time you open it.',
      action: welcome ? { label: 'Start now', onClick: () => launchTour(welcome, router) } : undefined,
    });
  };

  return (
    <div className="max-w-3xl space-y-4">
      <Panel title="Appearance" description="Applies on this device.">
        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {THEMES.map(t => {
            const active = (theme ?? 'system') === t.value;
            return (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(t.value)}
                className={cn(
                  'group relative overflow-hidden rounded-xl border text-left transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  active ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/40'
                )}
              >
                <div className={cn('flex h-20 flex-col gap-1.5 border-b p-3', t.preview)}>
                  <span className={cn('h-2 w-12 rounded-full', t.bar)} />
                  <span className={cn('h-2 w-20 rounded-full opacity-70', t.bar)} />
                  <span className="mt-auto h-3 w-8 rounded bg-primary" />
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <t.icon className="size-4 text-muted-foreground" /> {t.label}
                  </span>
                  {active && (
                    <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel title="Workspace">
        <div className="divide-y">
          <PreferenceRow
            icon={PanelLeftClose}
            title="Collapse sidebar"
            description="Icons only, for more room. You can also toggle it from the sidebar."
          >
            <Switch checked={sidebarCollapsed} onCheckedChange={toggleSidebar} aria-label="Collapse sidebar" />
          </PreferenceRow>
          <PreferenceRow
            icon={RotateCcw}
            title="Product tours"
            description="Replay the guided walkthroughs on every page."
          >
            <Button variant="outline" size="sm" onClick={replayTours}>
              Replay all tours
            </Button>
          </PreferenceRow>
          <PreferenceRow icon={Keyboard} title="Keyboard shortcuts" description="Move around without the mouse.">
            <Button variant="outline" size="sm" onClick={() => useUi.getState().setShortcutsOpen(true)}>
              View shortcuts
            </Button>
          </PreferenceRow>
        </div>
      </Panel>
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>(initialTab);

  const change = (next: string) => {
    setTab(next as Tab);
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?tab=${next}`);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Your account, password and how the CRM looks for you." />
      <Tabs value={tab} onValueChange={change} className="gap-5">
        <TabsList>
          <TabsTrigger value="profile" className="px-3">
            <UserRound /> Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="px-3">
            <KeyRound /> Security
          </TabsTrigger>
          <TabsTrigger value="preferences" className="px-3">
            <Palette /> Preferences
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>
        <TabsContent value="preferences">
          <PreferencesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
