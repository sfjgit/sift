// File: WebsitePopup.tsx
// Path: src/features/website/WebsitePopup.tsx
//
// "The website does not open" — its own dialog, never the run sheet.
//   - pops up by itself when a step I ran stopped because a client's website
//     does not open (GET /website-suggestions/mine)
//   - opens from a website-check run, and from an admin's notification
//     (/clients/:id?fixWebsite=<run>) through useUi().openWebsiteFix
// The system finds the current website itself. Anyone may pick one it found and
// verified. A typed website can't be trusted: only an admin types one, and it is
// checked (opens + the client's CIN / name on the page) before it is saved.
// Everyone else asks an admin. Saving keeps the old website in the history and
// runs the failed steps again (as the person who asked).

'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  Loader2,
  Search,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Pill } from '@/components/common/badges';
import { usePermissions } from '@/features/auth/usePermissions';
import { clientHooks } from '@/hooks/queries';
import { clientsApi, websiteApi } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/client';
import { fmtDate, fmtRelative } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useUi } from '@/stores/ui';
import type { TypedCheck, WebsiteCandidate, WebsiteCheck } from './types';

const POLL_MS = 20_000;
const STEP_NAME: Record<string, string> = { branches: 'Find offices', reports: 'Find CSR reports' };
const TYPE = '__type__';

const googleFor = (name: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(`"${name}" official website`)}`;
const plainWhy = (tried: { why?: string }[]) => {
  const why = [...new Set(tried.map(t => t.why).filter(Boolean))];
  return why.length ? `${why.join(', ')} — checked ${tried.length} ways, twice.` : '';
};

type Shown = Partial<Omit<WebsiteCheck, 'client'>> &
  Pick<WebsiteCheck, 'runId' | 'oldUrl' | 'tried' | 'candidates' | 'triggerStep'> & {
    client: Partial<WebsiteCheck['client']> & { id: string; name: string };
  };

export function WebsitePopup() {
  const { websiteFix, openWebsiteFix } = useUi();
  const [later, setLater] = useState<Set<string>>(new Set());
  const mine = useQuery({
    queryKey: ['website-suggestions'],
    queryFn: () => websiteApi.mine(),
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
  });
  const one = useQuery({
    queryKey: ['website-suggestions', websiteFix],
    queryFn: () => websiteApi.one(websiteFix!),
    enabled: !!websiteFix,
    refetchInterval: q =>
      q.state.data && ['QUEUED', 'RUNNING'].includes(q.state.data.status) ? 4000 : false,
  });

  if (websiteFix) {
    if (!one.data) return null;
    return <FixDialog key={websiteFix} s={one.data} onClose={() => openWebsiteFix(null)} />;
  }
  const next = (mine.data ?? []).find(s => !later.has(s.runId));
  if (!next) return null;
  return (
    <FixDialog
      key={next.runId}
      s={{ ...next, dead: true }}
      onClose={() => setLater(l => new Set(l).add(next.runId))}
    />
  );
}

export function FixDialog({ s, onClose }: { s: Shown; onClose: () => void }) {
  const qc = useQueryClient();
  const { can, isSuperAdmin } = usePermissions();
  const canPick = can('clients.update');
  const found = s.candidates;
  const [pick, setPick] = useState(found[0]?.url ?? (isSuperAdmin ? TYPE : ''));
  const [typed, setTyped] = useState('');
  const [check, setCheck] = useState<TypedCheck | null>(null);
  const [busy, setBusy] = useState<'save' | 'keep' | 'ask' | 'check' | null>(null);

  const checking = s.status === 'QUEUED' || s.status === 'RUNNING';
  const opens = s.dead === false;
  const decided = s.decision;
  const waiting = s.request?.status === 'OPEN' ? s.request : null;
  const typing = pick === TYPE;
  const url = typing ? typed.trim() : pick;
  const verified = !typing || check?.belongs === 'CIN' || check?.belongs === 'NAME';
  const doubtful = typing && (check?.belongs === 'UNKNOWN' || check?.belongs === 'OTHER_CIN');

  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['website-suggestions'] }),
      qc.invalidateQueries({ queryKey: clientHooks.keys.all }),
      qc.invalidateQueries({ queryKey: ['step-runs'] }),
      qc.invalidateQueries({ queryKey: ['website-history', s.client.id] }),
    ]);

  const act = async (kind: 'save' | 'keep' | 'ask', fn: () => Promise<string>) => {
    setBusy(kind);
    try {
      toast.success(await fn());
      await refresh();
      onClose();
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(null);
    }
  };

  const save = () =>
    act('save', async () => {
      const r = await clientsApi.replaceWebsite(s.client.id, {
        website: url,
        runId: s.runId,
        ...(doubtful && { force: true }),
      });
      return r.rerun.length
        ? `Website saved — ${r.rerun.map(k => STEP_NAME[k] ?? k).join(' and ')} running again`
        : 'Website saved';
    });
  const ask = () =>
    act('ask', async () => {
      const r = await websiteApi.requestAdmin(s.runId);
      return r.alreadyAsked
        ? 'An admin was already asked'
        : 'Sent to the admins — you’ll be told when it is updated';
    });
  const keep = () =>
    act('keep', async () => {
      await websiteApi.dismiss(s.runId);
      return 'Kept the current website';
    });
  const runCheck = async () => {
    if (!typed.trim()) return;
    setBusy('check');
    try {
      setCheck(await clientsApi.checkWebsite(s.client.id, typed.trim()));
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(null);
    }
  };

  const simple = (title: React.ReactNode, body: React.ReactNode) => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">{title}</DialogTitle>
        <DialogDescription>{body}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button onClick={onClose}>OK</Button>
      </DialogFooter>
    </>
  );

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        {checking ? (
          simple(
            <>
              <Loader2 className="size-4.5 animate-spin text-primary" /> Checking the website of{' '}
              {s.client.name}
            </>,
            'It could not be opened. It is being checked again and the current website is being looked for — under a minute.'
          )
        ) : decided ? (
          simple(
            <>
              <CheckCircle2 className="size-4.5 text-success" /> Already handled
            </>,
            decided.action === 'replaced'
              ? `${decided.byName} changed the website to ${decided.url} on ${fmtDate(decided.at)}. It is in the client’s website history.`
              : `${decided.byName} kept the current website on ${fmtDate(decided.at)}.`
          )
        ) : opens ? (
          simple(
            <>
              <CheckCircle2 className="size-4.5 text-success" /> The website of {s.client.name}{' '}
              opens
            </>,
            'It opened when it was checked again, so nothing needs to change. If the step still fails, the site may be blocking automated reading.'
          )
        ) : waiting && !isSuperAdmin ? (
          simple(
            <>
              <Clock className="size-4.5 text-warning" /> Waiting for an admin
            </>,
            `${waiting.byName} asked an admin to update the website of ${s.client.name} ${fmtRelative(waiting.at)}. You’ll get a notification when it is done.`
          )
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TriangleAlert className="size-4.5 text-warning" /> The website of {s.client.name}{' '}
                does not open
              </DialogTitle>
              <DialogDescription>
                {s.triggerStep
                  ? `“${STEP_NAME[s.triggerStep] ?? 'A step'}” stopped because of it. `
                  : ''}
                {found.length
                  ? 'The system found its current website and checked it belongs to the client.'
                  : 'The system could not find its current website.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-[14px]">
              {/* the admin sees which client and who asked */}
              {isSuperAdmin && (
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg border bg-surface px-3 py-2 text-xs">
                  <dt className="text-muted-foreground">Client</dt>
                  <dd className="font-medium">{s.client.name}</dd>
                  {s.client.cin && (
                    <>
                      <dt className="text-muted-foreground">CIN</dt>
                      <dd className="font-mono">{s.client.cin}</dd>
                    </>
                  )}
                  {s.client.industry && (
                    <>
                      <dt className="text-muted-foreground">Industry</dt>
                      <dd>{s.client.industry}</dd>
                    </>
                  )}
                  {waiting && (
                    <>
                      <dt className="text-muted-foreground">Asked by</dt>
                      <dd>
                        {waiting.byName}, {fmtRelative(waiting.at)}
                      </dd>
                    </>
                  )}
                </dl>
              )}

              <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2">
                <p className="text-xs text-muted-foreground">Website stored now — not in use</p>
                <p className="font-medium break-all text-destructive line-through decoration-1">
                  {s.oldUrl}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{plainWhy(s.tried)}</p>
              </div>

              {found.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Open the link to check it is {s.client.name}’s, then pick it
                  </p>
                  {found.map(c => (
                    <Choice key={c.url} checked={pick === c.url} onPick={() => setPick(c.url)}>
                      <Candidate c={c} />
                    </Choice>
                  ))}
                  {isSuperAdmin && (
                    <Choice checked={typing} onPick={() => setPick(TYPE)}>
                      <span className="text-sm">None of these — I’ll put in the right website</span>
                    </Choice>
                  )}
                </div>
              )}

              {/* only an admin types a website — and it is checked before it is saved */}
              {isSuperAdmin && typing && (
                <div className="space-y-2 rounded-lg border p-3">
                  <Button asChild variant="outline" size="sm">
                    <a href={googleFor(s.client.name)} target="_blank" rel="noreferrer">
                      <Search /> Search “{s.client.name}” on Google <ExternalLink />
                    </a>
                  </Button>
                  <div className="flex gap-2">
                    <Input
                      autoFocus
                      value={typed}
                      onChange={e => {
                        setTyped(e.target.value);
                        setCheck(null);
                      }}
                      onKeyDown={e => e.key === 'Enter' && runCheck()}
                      placeholder="Paste the website, e.g. www.company.com"
                      aria-label="The right website"
                    />
                    <Button
                      variant="outline"
                      onClick={runCheck}
                      disabled={!typed.trim() || busy === 'check'}
                    >
                      {busy === 'check' ? <Loader2 className="animate-spin" /> : <ShieldCheck />}{' '}
                      Check
                    </Button>
                  </div>
                  {check && <CheckResult c={check} />}
                </div>
              )}

              {!isSuperAdmin && !found.length && (
                <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  A website typed by hand can’t be trusted, so an admin puts in the right one. Ask
                  an admin below — you’ll get a notification when it is done, and the step runs
                  again by itself.
                </p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="ghost" onClick={keep} disabled={!!busy}>
                {busy === 'keep' && <Loader2 className="animate-spin" />} Keep the current website
              </Button>
              <div className="flex flex-wrap gap-2">
                {!isSuperAdmin && (
                  <Button
                    variant={found.length ? 'outline' : 'default'}
                    onClick={ask}
                    disabled={!!busy}
                  >
                    {busy === 'ask' && <Loader2 className="animate-spin" />} Ask admin to update
                  </Button>
                )}
                {(found.length > 0 || isSuperAdmin) && (
                  <Button
                    onClick={save}
                    variant={doubtful ? 'destructive' : 'default'}
                    disabled={
                      !!busy ||
                      !url ||
                      !canPick ||
                      (typing && (!check || !check.opens)) ||
                      (!verified && !doubtful)
                    }
                    title={typing && !check ? 'Check the website first' : undefined}
                  >
                    {busy === 'save' && <Loader2 className="animate-spin" />}
                    {doubtful ? 'Save anyway' : 'Save website'}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Candidate({ c }: { c: WebsiteCandidate }) {
  return (
    <>
      <span className="flex flex-wrap items-center gap-2">
        <a
          href={c.opened ?? c.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          <Globe className="size-3.5" /> {c.url.replace(/^https?:\/\//, '')}
          <ExternalLink className="size-3" />
        </a>
        <Pill
          tone={c.confidence >= 0.8 ? 'success' : c.confidence >= 0.6 ? 'info' : 'warning'}
          dot={false}
        >
          {Math.round(c.confidence * 100)}% sure
        </Pill>
      </span>
      {c.title && <span className="block truncate text-xs text-muted-foreground">“{c.title}”</span>}
      <span className="block text-xs text-muted-foreground">{c.evidence.join(' · ')}</span>
    </>
  );
}

function CheckResult({ c }: { c: TypedCheck }) {
  const ok = c.belongs === 'CIN' || c.belongs === 'NAME';
  const Icon = !c.opens ? XCircle : ok ? ShieldCheck : ShieldAlert;
  return (
    <div
      className={cn(
        'flex gap-2 rounded-md px-2.5 py-2 text-xs',
        !c.opens ? 'bg-destructive/8 text-destructive' : ok ? 'bg-success/10' : 'bg-warning/12'
      )}
    >
      <Icon
        className={cn(
          'mt-0.5 size-3.5 shrink-0',
          ok && 'text-success',
          c.opens && !ok && 'text-warning'
        )}
      />
      <div>
        <p className="font-medium">
          {!c.opens
            ? `It does not open (${c.why}) — it can’t be saved.`
            : ok
              ? 'It opens and belongs to the client.'
              : c.belongs === 'OTHER_CIN'
                ? 'It opens, but it shows another company’s CIN.'
                : 'It opens, but nothing on it shows it is the client’s.'}
        </p>
        {c.title && <p className="text-muted-foreground">“{c.title}”</p>}
        {c.opens && <p className="text-muted-foreground">{c.evidence.join(' · ')}</p>}
        {c.opens && !ok && <p className="mt-1">Open it and make sure before you save.</p>}
      </div>
    </div>
  );
}

function Choice({
  checked,
  onPick,
  children,
}: {
  checked: boolean;
  onPick: () => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40',
        checked && 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
      )}
    >
      <input
        type="radio"
        className="mt-1 accent-[var(--primary)]"
        checked={checked}
        onChange={onPick}
      />
      <span className="min-w-0 flex-1 space-y-1">{children}</span>
    </label>
  );
}
