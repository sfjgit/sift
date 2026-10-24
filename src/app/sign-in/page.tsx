// File: page.tsx
// Path: src/app/sign-in/page.tsx
//
// Sign in · forgot password · reset password (?token= from the email link) ·
// welcome link for new users (same token flow). Redirects back to ?next=
// (same-origin paths only) after sign-in.

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Logo, LogoMark } from '@/components/common/Logo';
import { useAuth } from '@/features/auth/AuthProvider';
import { authApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useBrowserValue } from '@/hooks/useBrowserValue';

type Mode = 'signin' | 'forgot' | 'sent' | 'reset' | 'done';

const REMEMBER_KEY = 'crm:last-email';

/** only same-origin relative paths — never //evil.com or https://… */
const safeNext = (raw: string | null) =>
  raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/sign-in') ? raw : '/dashboard';

const readRememberedEmail = () => {
  try {
    return localStorage.getItem(REMEMBER_KEY) ?? '';
  } catch {
    return '';
  }
};

export default function SignInPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const search = useBrowserValue(() => window.location.search, '');
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const token = params.get('token');
  const next = safeNext(params.get('next'));
  const notice = params.get('expired') ? 'Your session expired. Sign in again to pick up where you left off.' : null;
  const remembered = useBrowserValue(readRememberedEmail, '');
  // null = follow the URL (reset link → reset form); set once the user moves on
  const [modeOverride, setMode] = useState<Mode | null>(null);
  const mode: Mode = modeOverride ?? (token ? 'reset' : 'signin');
  const [typedEmail, setEmail] = useState<string | null>(null);
  const email = typedEmail ?? remembered;

  // already signed in → straight through (but let reset links finish)
  useEffect(() => {
    if (!isLoading && isAuthenticated && mode === 'signin') router.replace(next);
  }, [isLoading, isAuthenticated, mode, next, router]);

  return (
    <div className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />
      <div className="flex flex-col px-6 py-8 sm:px-10">
        <div className="flex items-center justify-between lg:justify-end">
          <Link href="/" className="lg:hidden" aria-label="Home">
            <Logo />
          </Link>
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm animate-fade-up">
            {mode === 'signin' && (
              <SignInForm
                defaultEmail={email}
                notice={notice}
                onForgot={e => {
                  setEmail(e);
                  setMode('forgot');
                }}
                onSuccess={() => router.replace(next)}
              />
            )}
            {mode === 'forgot' && (
              <ForgotForm
                defaultEmail={email}
                onBack={() => setMode('signin')}
                onSent={e => {
                  setEmail(e);
                  setMode('sent');
                }}
              />
            )}
            {mode === 'sent' && (
              <Message
                icon={MailCheck}
                title="Check your inbox"
                body={
                  <>
                    If an account exists for <strong className="text-foreground">{email}</strong>, we’ve sent a reset
                    link. It expires in 15 minutes.
                  </>
                }
                action={
                  <Button variant="outline" className="w-full" onClick={() => setMode('signin')}>
                    <ArrowLeft /> Back to sign in
                  </Button>
                }
              />
            )}
            {mode === 'reset' && token && (
              <ResetForm
                token={token}
                onDone={() => {
                  window.history.replaceState(null, '', '/sign-in');
                  setMode('done');
                }}
                onBack={() => {
                  window.history.replaceState(null, '', '/sign-in');
                  setMode('forgot');
                }}
              />
            )}
            {mode === 'done' && (
              <Message
                icon={CheckCircle2}
                title="Password updated"
                body="You can now sign in with your new password."
                action={
                  <Button className="w-full" onClick={() => setMode('signin')}>
                    Continue to sign in
                  </Button>
                }
              />
            )}
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Trouble signing in? Contact your SFJBS administrator.
        </p>
      </div>
    </div>
  );
}

// ── panels ───────────────────────────────────────────────────────────────────

function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden brand-gradient p-10 text-white lg:flex lg:flex-col">
      <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:22px_22px]" />
      <div className="absolute -right-24 -bottom-24 size-[420px] rounded-full bg-white/10 blur-3xl" />
      <div className="relative flex items-center gap-2.5">
        <LogoMark className="size-8 ring-1 ring-white/30" />
        <span className="text-lg font-bold tracking-tight">SFJBS CRM</span>
      </div>
      <div className="relative mt-auto max-w-md space-y-6">
        <h2 className="text-4xl leading-tight font-bold tracking-tight text-white">
          Know every client.
          <br />
          Own every relationship.
        </h2>
        <ul className="space-y-3 text-sm text-white/85">
          {[
            'Clients, SPOCs and CSR data in one profile',
            'Quality-scored contacts with clear ownership',
            'Reports you build and share in seconds',
          ].map(t => (
            <li key={t} className="flex items-center gap-2.5">
              <CheckCircle2 className="size-4 shrink-0 text-white" /> {t}
            </li>
          ))}
        </ul>
      </div>
      <p className="relative mt-10 text-xs text-white/60">© {new Date().getFullYear()} SFJBS · Internal use only</p>
    </div>
  );
}

function Message({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: typeof MailCheck;
  title: string;
  body: React.ReactNode;
  action: React.ReactNode;
}) {
  return (
    <div className="space-y-6 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-6" />
      </span>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
      {action}
    </div>
  );
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/8 p-3 text-[13px] text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" /> {message}
    </div>
  );
}

function PasswordInput({
  id,
  invalid,
  autoComplete,
  ...props
}: React.ComponentProps<'input'> & { invalid?: boolean }) {
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          aria-invalid={invalid || undefined}
          className="h-10 pr-10"
          onKeyUp={e => setCaps(e.getModifierState?.('CapsLock') ?? false)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {caps && <p className="text-xs text-warning">Caps Lock is on</p>}
    </div>
  );
}

// ── forms ────────────────────────────────────────────────────────────────────

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
  remember: z.boolean(),
});

function SignInForm({
  defaultEmail,
  notice,
  onForgot,
  onSuccess,
}: {
  defaultEmail: string;
  notice: string | null;
  onForgot: (email: string) => void;
  onSuccess: () => void;
}) {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: defaultEmail, password: '', remember: true },
  });
  const { errors, isSubmitting } = form.formState;

  useEffect(() => {
    if (defaultEmail && !form.getValues('email')) form.setValue('email', defaultEmail);
  }, [defaultEmail, form]);

  const submit = form.handleSubmit(async v => {
    setError(null);
    try {
      await login(v.email, v.password);
      try {
        if (v.remember) localStorage.setItem(REMEMBER_KEY, v.email);
        else localStorage.removeItem(REMEMBER_KEY);
      } catch {
        /* ignore */
      }
      onSuccess();
    } catch (e) {
      const err = e as ApiError;
      setError(
        err.status === 401
          ? 'That email and password don’t match. Check them and try again.'
          : err.status === 429
            ? 'Too many attempts. Wait a few minutes and try again.'
            : err.message
      );
      form.setValue('password', '');
      form.setFocus('password');
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to your SFJBS CRM workspace.</p>
      </div>

      {notice && !error && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-[13px]">{notice}</div>
      )}
      <FormError message={error} />

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            autoFocus={!defaultEmail}
            placeholder="you@sfjbs.com"
            aria-invalid={!!errors.email || undefined}
            className="h-10"
            {...form.register('email')}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => onForgot(form.getValues('email'))}
            >
              Forgot password?
            </button>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            autoFocus={!!defaultEmail}
            invalid={!!errors.password}
            {...form.register('password')}
          />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
        <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Checkbox
            checked={form.watch('remember')}
            onCheckedChange={v => form.setValue('remember', !!v)}
          />
          Remember my email on this device
        </label>
      </div>

      <Button type="submit" className="h-10 w-full text-sm" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" />}
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}

function ForgotForm({
  defaultEmail,
  onBack,
  onSent,
}: {
  defaultEmail: string;
  onBack: () => void;
  onSent: (email: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<{ email: string }>({
    resolver: zodResolver(z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email') })),
    defaultValues: { email: defaultEmail },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async ({ email }) => {
    setError(null);
    try {
      await authApi.forgotPassword(email);
      onSent(email);
    } catch (e) {
      setError((e as ApiError).message);
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to sign in
      </button>
      <div className="space-y-2">
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <KeyRound className="size-5" />
        </span>
        <h1 className="text-2xl font-semibold">Reset your password</h1>
        <p className="text-sm text-muted-foreground">Enter your work email and we’ll send you a reset link.</p>
      </div>
      <FormError message={error} />
      <div className="space-y-1.5">
        <Label htmlFor="forgot-email">Work email</Label>
        <Input
          id="forgot-email"
          type="email"
          autoFocus
          autoComplete="username"
          className="h-10"
          aria-invalid={!!errors.email || undefined}
          {...form.register('email')}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" />}
        Send reset link
      </Button>
    </form>
  );
}

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Za-z]/, 'Include a letter')
      .regex(/[0-9]/, 'Include a number'),
    confirm: z.string(),
  })
  .refine(v => v.password === v.confirm, { path: ['confirm'], message: 'Passwords don’t match' });

const strength = (p: string) =>
  [p.length >= 8, p.length >= 12, /[A-Z]/.test(p) && /[a-z]/.test(p), /\d/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean)
    .length;

function ResetForm({ token, onDone, onBack }: { token: string; onDone: () => void; onBack: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirm: '' },
  });
  const { errors, isSubmitting } = form.formState;
  const pw = form.watch('password');
  const score = strength(pw);

  const submit = form.handleSubmit(async v => {
    setError(null);
    try {
      await authApi.resetPassword(token, v.password);
      onDone();
    } catch (e) {
      const err = e as ApiError;
      setError(err.code === 'INVALID_TOKEN' ? 'This link has expired or was already used. Request a new one.' : err.message);
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <div className="space-y-2">
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <KeyRound className="size-5" />
        </span>
        <h1 className="text-2xl font-semibold">Set a new password</h1>
        <p className="text-sm text-muted-foreground">Use at least 8 characters with a letter and a number.</p>
      </div>
      <FormError message={error} />
      {error && (
        <button type="button" onClick={onBack} className="text-xs font-medium text-primary hover:underline">
          Request a new link
        </button>
      )}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="new-password">New password</Label>
          <PasswordInput id="new-password" autoComplete="new-password" autoFocus invalid={!!errors.password} {...form.register('password')} />
          <div className="flex gap-1 pt-1" aria-hidden>
            {[0, 1, 2, 3, 4].map(i => (
              <span
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full bg-muted transition-colors',
                  i < score && (score <= 2 ? 'bg-destructive' : score <= 3 ? 'bg-warning' : 'bg-success')
                )}
              />
            ))}
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <PasswordInput id="confirm-password" autoComplete="new-password" invalid={!!errors.confirm} {...form.register('confirm')} />
          {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
        </div>
      </div>
      <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" />}
        Update password
      </Button>
    </form>
  );
}
