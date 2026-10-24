// File: page.tsx
// Path: src/app/page.tsx
//
// Public landing. Signed-in visitors get "Open workspace" instead of "Sign in".

'use client';

import Link from 'next/link';
import { useBrowserValue } from '@/hooks/useBrowserValue';
import {
  ArrowRight,
  BarChart3,
  Bookmark,
  Building2,
  ContactRound,
  GitBranch,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/common/Logo';
import { hasSessionCookie } from '@/features/auth/impersonation';

const FEATURES = [
  {
    icon: Building2,
    title: 'Clients with full context',
    body: 'Locations, technology landscape, CSR figures, notes and a complete activity timeline for every company.',
  },
  {
    icon: ContactRound,
    title: 'SPOCs you can trust',
    body: 'Every contact is scored — Ready, Review or Not usable — with verified email status and a clear owner.',
  },
  {
    icon: BarChart3,
    title: 'Reports you build yourself',
    body: 'Group, split, filter and chart any slice of your pipeline. Click a number to see the records behind it.',
  },
  {
    icon: Bookmark,
    title: 'Saved views',
    body: 'Your filters, columns and sort, one click away. Share the useful ones with the whole team.',
  },
  {
    icon: GitBranch,
    title: 'Enrichment pipeline',
    body: 'Follow every enrichment run — what it found, what it wrote and what needs a human.',
  },
  {
    icon: ShieldCheck,
    title: 'Access that fits your org',
    body: 'Roles with scopes — own, team, reporting line, department, business unit or everyone.',
  },
];

export default function LandingPage() {
  const signedIn = useBrowserValue(hasSessionCookie, false);
  const cta = signedIn ? { href: '/dashboard', label: 'Open workspace' } : { href: '/sign-in', label: 'Sign in' };

  return (
    <div className="relative min-h-svh overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />

      <header className="relative z-10 mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo />
        <Button asChild size="sm" variant={signedIn ? 'default' : 'outline'}>
          <Link href={cta.href}>
            {cta.label} <ArrowRight />
          </Link>
        </Button>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-4xl px-6 pt-16 pb-14 text-center sm:pt-24">
          <span className="inline-flex animate-fade-up items-center gap-1.5 rounded-full border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-card backdrop-blur">
            <Sparkles className="size-3.5 text-primary" /> Sales & marketing workspace for SFJBS
          </span>
          <h1 className="mt-6 animate-fade-up text-4xl leading-[1.08] font-bold tracking-tight [animation-delay:60ms] sm:text-6xl">
            Every client, contact and
            <br className="hidden sm:block" /> conversation — <span className="text-brand-gradient">in one place.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl animate-fade-up text-base text-muted-foreground [animation-delay:120ms] sm:text-lg">
            Track clients from first contact to active account, keep SPOC data clean, and answer any pipeline question
            with reports you build in seconds.
          </p>
          <div className="mt-8 flex animate-fade-up flex-wrap items-center justify-center gap-3 [animation-delay:180ms]">
            <Button asChild size="lg" className="h-10 px-5 text-sm shadow-float">
              <Link href={cta.href}>
                {signedIn ? 'Open workspace' : 'Sign in to your workspace'} <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="h-10 px-4 text-sm">
              <a href="#features">See what’s inside</a>
            </Button>
          </div>
        </section>

        <ProductPreview />

        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Built for how the team actually sells</h2>
            <p className="mt-3 text-muted-foreground">
              No spreadsheets to reconcile, no guessing who owns a contact.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(f => (
              <div
                key={f.title}
                className="group rounded-2xl border bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-float"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-muted-foreground">
          <Logo className="opacity-80" />
          <span>© {new Date().getFullYear()} SFJBS. Internal use only.</span>
        </div>
      </footer>
    </div>
  );
}

/** Decorative app preview — illustrative shapes, not real data. */
function ProductPreview() {
  return (
    <div aria-hidden className="mx-auto max-w-5xl animate-fade-up px-6 [animation-delay:240ms]">
      <div className="rounded-2xl border bg-card/70 p-2 shadow-float backdrop-blur">
        <div className="overflow-hidden rounded-xl border bg-background">
          <div className="flex h-9 items-center gap-1.5 border-b bg-surface px-3">
            <span className="size-2.5 rounded-full bg-destructive/50" />
            <span className="size-2.5 rounded-full bg-warning/60" />
            <span className="size-2.5 rounded-full bg-success/60" />
            <span className="mx-auto h-4 w-56 rounded-md bg-muted" />
          </div>
          <div className="grid grid-cols-[150px_1fr] gap-0 max-sm:grid-cols-1">
            <div className="space-y-2 border-r bg-sidebar p-3 max-sm:hidden">
              {[70, 55, 62, 48, 58].map((w, i) => (
                <div key={i} className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${i === 1 ? 'bg-sidebar-accent' : ''}`}>
                  <span className={`size-3 rounded ${i === 1 ? 'bg-primary' : 'bg-muted-foreground/25'}`} />
                  <span className="h-2 rounded bg-muted-foreground/20" style={{ width: `${w}%` }} />
                </div>
              ))}
            </div>
            <div className="space-y-4 p-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {['bg-primary', 'bg-chart-2', 'bg-chart-3', 'bg-chart-6'].map((c, i) => (
                  <div key={c} className="rounded-lg border bg-card p-3">
                    <span className="block h-2 w-14 rounded bg-muted-foreground/20" />
                    <span className="mt-2.5 block h-4 w-10 rounded bg-foreground/80" />
                    <span className="mt-3 block h-1.5 rounded-full bg-muted">
                      <span className={`block h-full rounded-full ${c}`} style={{ width: `${45 + i * 12}%` }} />
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-[1.6fr_1fr]">
                <div className="flex h-36 items-end gap-2 rounded-lg border bg-card p-3">
                  {[40, 62, 48, 75, 58, 88, 70, 95, 80, 66, 90, 100].map((h, i) => (
                    <span
                      key={i}
                      className="flex-1 rounded-t bg-gradient-to-t from-primary/70 to-primary/30"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <div className="space-y-2 rounded-lg border bg-card p-3">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="size-5 rounded-full bg-accent" />
                      <span className="h-2 flex-1 rounded bg-muted-foreground/20" />
                      <span
                        className={`h-3.5 w-10 rounded-full ${['bg-success/25', 'bg-warning/30', 'bg-success/25', 'bg-destructive/20'][i]}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
