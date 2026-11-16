// File: page.tsx
// Path: src/app/(app)/docs/page.tsx
//
// "What's built" — what the CRM can do today, what is half done and what is
// not started, the old CASPA pages vs the new ones, the open to-do list and a
// changelog. Data lives in src/content/appStatus.ts (update it after every
// piece of work). "Download PDF" prints a clean full copy.

'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { BookOpenCheck, Download, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/common/PageHeader';
import { Pill, type Tone } from '@/components/common/badges';
import { useBrowserValue } from '@/hooks/useBrowserValue';
import { cn } from '@/lib/utils';
import {
  AREAS,
  CASPA_PARITY,
  CHANGELOG,
  LAST_UPDATED,
  PENDING,
  type Area,
  type Status,
  type Waiting,
} from '@/content/appStatus';

const STATUS: Record<Status, { label: string; tone: Tone }> = {
  done: { label: 'Done', tone: 'success' },
  partial: { label: 'Partly done', tone: 'warning' },
  'not-started': { label: 'Not started', tone: 'neutral' },
};
const WAITS: Record<Waiting, string> = {
  user: 'You',
  dev: 'Development',
  owner: 'DB / spec owner',
};

const fmtDay = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const StatusPill = ({ s }: { s: Status }) => <Pill tone={STATUS[s].tone}>{STATUS[s].label}</Pill>;

// print: only the portal copy, full length, no app chrome
const PRINT_CSS = `
@media print {
  @page { margin: 14mm; }
  html, body { height: auto !important; overflow: visible !important; background: #fff !important; }
  body > *:not(#docs-print) { display: none !important; }
  #docs-print { display: block !important; color: #0f172a; font-size: 11px; }
  #docs-print table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
  #docs-print tr { page-break-inside: avoid; }
  #docs-print th, #docs-print td { border: 1px solid #cbd5e1; padding: 3px 6px; text-align: left; vertical-align: top; }
  #docs-print th { background: #eff6ff; }
  #docs-print h1 { font-size: 20px; margin: 0 0 4px; }
  #docs-print h2 { font-size: 14px; margin: 14px 0 6px; page-break-after: avoid; }
  #docs-print h3 { font-size: 12px; margin: 10px 0 4px; page-break-after: avoid; }
}
`;

const matches = (q: string, ...parts: (string | undefined)[]) =>
  !q || parts.some(p => p?.toLowerCase().includes(q));

function Section({
  id,
  title,
  count,
  children,
}: {
  id: string;
  title: string;
  count?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-4 rounded-xl border bg-card">
      <header className="flex items-baseline justify-between border-b px-4 py-2.5">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {count != null && <span className="text-xs text-muted-foreground tabular">{count}</span>}
      </header>
      {children}
    </section>
  );
}

const TH =
  'h-9 border-b bg-[color-mix(in_oklch,var(--card),var(--primary)_8%)] px-3 text-left text-xs font-semibold text-muted-foreground';
const TD = 'border-b px-3 py-2 align-top text-[13px] group-last/r:border-b-0';

export default function DocsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Status | 'all'>('all');
  const q = search.trim().toLowerCase();

  const all = AREAS.flatMap(a => a.features);
  const counts = {
    done: all.filter(f => f.status === 'done').length,
    partial: all.filter(f => f.status === 'partial').length,
    'not-started': all.filter(f => f.status === 'not-started').length,
  };

  const areas: Area[] = useMemo(
    () =>
      AREAS.map(a => ({
        ...a,
        features: a.features.filter(
          f =>
            (status === 'all' || f.status === status) &&
            matches(q, a.title, f.title, f.description, f.note, f.where)
        ),
      })).filter(a => a.features.length),
    [q, status]
  );
  const parity = CASPA_PARITY.map(p => ({
    ...p,
    rows: p.rows.filter(
      r => (status === 'all' || r.status === status) && matches(q, p.page, r.old, r.now)
    ),
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-10">
      <style>{PRINT_CSS}</style>
      <PageHeader
        icon={
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookOpenCheck className="size-5" />
          </span>
        }
        title="What's built"
        description={`What the CRM can do today, what is partly done and what is still open. Updated ${fmtDay(LAST_UPDATED)}.`}
        actions={
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Download /> Download PDF
          </Button>
        }
      />

      {/* counters double as filters */}
      <div className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
        {(
          [
            ['all', 'All features', all.length],
            ['done', 'Done', counts.done],
            ['partial', 'Partly done', counts.partial],
            ['not-started', 'Not started', counts['not-started']],
          ] as const
        ).map(([key, label, n]) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatus(key)}
            className={cn(
              'bg-card px-4 py-3 text-left transition-colors hover:bg-muted/60',
              status === key && 'bg-primary/5 ring-2 ring-primary ring-inset'
            )}
          >
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {label}
            </p>
            <p className="text-2xl font-semibold tabular">{n}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search features, pages, CASPA fields…"
            className="pl-8"
          />
        </div>
        {(search || status !== 'all') && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSearch('');
              setStatus('all');
            }}
          >
            <X /> Clear
          </Button>
        )}
        <nav className="ml-auto flex flex-wrap gap-1 text-[13px]">
          {[
            ['features', 'Features'],
            ['caspa', 'Old CASPA vs new'],
            ['pending', 'Pending'],
            ['changelog', 'Changelog'],
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-md px-2 py-1 text-primary hover:bg-primary/10"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>

      {/* features */}
      <div id="features" className="space-y-3">
        {areas.map(a => (
          <Section
            key={a.id}
            id={`area-${a.id}`}
            title={a.title}
            count={`${a.features.length} items`}
          >
            <table className="w-full">
              <thead>
                <tr>
                  <th className={cn(TH, 'w-64')}>Feature</th>
                  <th className={TH}>What it does</th>
                  <th className={cn(TH, 'w-36')}>Where</th>
                  <th className={cn(TH, 'w-32')}>Status</th>
                </tr>
              </thead>
              <tbody>
                {a.features.map(f => (
                  <tr key={f.title} className="group/r">
                    <td className={cn(TD, 'font-medium')}>{f.title}</td>
                    <td className={TD}>
                      {f.description}
                      {f.note && <p className="mt-0.5 text-xs text-muted-foreground">{f.note}</p>}
                    </td>
                    <td className={cn(TD, 'text-xs text-muted-foreground')}>{f.where ?? '—'}</td>
                    <td className={TD}>
                      <StatusPill s={f.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        ))}
        {!areas.length && (
          <p className="rounded-xl border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            No feature matches.
          </p>
        )}
      </div>

      {/* old CASPA vs new */}
      <div id="caspa" className="space-y-3 scroll-mt-4">
        <h2 className="pt-2 text-lg font-semibold">Old CASPA vs new</h2>
        {parity.map(p => (
          <Section
            key={p.page}
            id={`caspa-${p.page}`}
            title={p.page}
            count={`${p.rows.filter(r => r.status === 'done').length} of ${
              CASPA_PARITY.find(x => x.page === p.page)!.rows.length
            } done · from ${p.source}`}
          >
            <table className="w-full">
              <thead>
                <tr>
                  <th className={cn(TH, 'w-[42%]')}>Old CASPA</th>
                  <th className={TH}>New CRM</th>
                  <th className={cn(TH, 'w-32')}>Status</th>
                </tr>
              </thead>
              <tbody>
                {p.rows.map(r => (
                  <tr key={r.old} className="group/r">
                    <td className={TD}>{r.old}</td>
                    <td className={cn(TD, r.now === '—' && 'text-muted-foreground')}>{r.now}</td>
                    <td className={TD}>
                      <StatusPill s={r.status} />
                    </td>
                  </tr>
                ))}
                {!p.rows.length && (
                  <tr>
                    <td colSpan={3} className={cn(TD, 'text-muted-foreground')}>
                      Nothing matches.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Section>
        ))}
      </div>

      {/* pending */}
      <Section id="pending" title="Pending" count={`${PENDING.length} open`}>
        <table className="w-full">
          <thead>
            <tr>
              <th className={TH}>To do</th>
              <th className={cn(TH, 'w-44')}>Waiting on</th>
            </tr>
          </thead>
          <tbody>
            {PENDING.filter(p => matches(q, p.title, p.note)).map(p => (
              <tr key={p.title} className="group/r">
                <td className={TD}>
                  {p.title}
                  {p.note && <p className="mt-0.5 text-xs text-muted-foreground">{p.note}</p>}
                </td>
                <td className={TD}>
                  <Pill
                    tone={
                      p.waitsOn === 'user'
                        ? 'primary'
                        : p.waitsOn === 'owner'
                          ? 'violet'
                          : 'neutral'
                    }
                  >
                    {WAITS[p.waitsOn]}
                  </Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* changelog */}
      <Section id="changelog" title="Changelog">
        <ol className="divide-y">
          {CHANGELOG.map(c => (
            <li key={c.date} className="grid gap-1 px-4 py-3 sm:grid-cols-[120px_1fr]">
              <p className="text-[13px] font-semibold tabular">{fmtDay(c.date)}</p>
              <ul className="list-disc space-y-0.5 pl-4 text-[13px]">
                {c.items.map(i => (
                  <li key={i}>{i}</li>
                ))}
                {c.inProgress?.map(i => (
                  <li key={i} className="text-muted-foreground">
                    In progress: {i}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Section>

      <PrintCopy />
    </div>
  );
}

/** the full, unfiltered document — rendered straight into <body>, shown only when printing */
function PrintCopy() {
  const inBrowser = useBrowserValue(() => true, false);
  if (!inBrowser) return null;
  return createPortal(
    <div id="docs-print" style={{ display: 'none' }}>
      <h1>SFJBS CRM — What&apos;s built</h1>
      <p>Updated {fmtDay(LAST_UPDATED)}</p>
      <h2>Features</h2>
      {AREAS.map(a => (
        <div key={a.id}>
          <h3>{a.title}</h3>
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th>What it does</th>
                <th>Where</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {a.features.map(f => (
                <tr key={f.title}>
                  <td>{f.title}</td>
                  <td>
                    {f.description}
                    {f.note ? ` (${f.note})` : ''}
                  </td>
                  <td>{f.where ?? '—'}</td>
                  <td>{STATUS[f.status].label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <h2>Old CASPA vs new</h2>
      {CASPA_PARITY.map(p => (
        <div key={p.page}>
          <h3>
            {p.page} ({p.source})
          </h3>
          <table>
            <thead>
              <tr>
                <th>Old CASPA</th>
                <th>New CRM</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {p.rows.map(r => (
                <tr key={r.old}>
                  <td>{r.old}</td>
                  <td>{r.now}</td>
                  <td>{STATUS[r.status].label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <h2>Pending</h2>
      <table>
        <thead>
          <tr>
            <th>To do</th>
            <th>Waiting on</th>
          </tr>
        </thead>
        <tbody>
          {PENDING.map(p => (
            <tr key={p.title}>
              <td>
                {p.title}
                {p.note ? ` (${p.note})` : ''}
              </td>
              <td>{WAITS[p.waitsOn]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Changelog</h2>
      {CHANGELOG.map(c => (
        <div key={c.date}>
          <h3>{fmtDay(c.date)}</h3>
          <ul>
            {c.items.map(i => (
              <li key={i}>{i}</li>
            ))}
            {c.inProgress?.map(i => (
              <li key={i}>In progress: {i}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>,
    document.body
  );
}
