// File: page.tsx
// Path: src/app/(app)/support/[id]/page.tsx
//
// One ticket. Support sees everything the browser captured: screenshot, the
// replay of the minutes before reporting and of any recorded steps, the
// automatic diagnosis (failed calls matched to the server's own error, browser
// errors, the steps that led there), an optional AI diagnosis, console /
// network / clicks, and the progress log. The reporter sees the story, can
// comment, and records the steps when asked.

'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Bug,
  CircleDot,
  Info,
  Lightbulb,
  Loader2,
  Send,
  Sparkles,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { Pill } from '@/components/common/badges';
import { ErrorState } from '@/components/common/states';
import { UserPicker } from '@/components/pickers/pickers';
import { recordForTicket } from '@/features/support/ReportProblem';
import { ReplayPlayer } from '@/features/support/ReplayPlayer';
import { SEVERITY_LABEL, SEVERITY_TONE, STATUS_TONE } from '@/features/support/tones';
import { supportApi } from '@/lib/api/endpoints';
import { toApiError } from '@/lib/api/client';
import { fmtDateTime, fmtRelative } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Severity, TicketDetail } from '@/types/support';

const KEY = (id: string) => ['tickets', 'one', id];

export default function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const q = useQuery({ queryKey: KEY(id), queryFn: () => supportApi.get(id) });
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data)
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-72" />
      </div>
    );
  return <Ticket t={q.data} />;
}

function Ticket({ t }: { t: TicketDetail }) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['tickets'] });
  const bug = t.kind === 'BUG';
  const label = (s: string) => t.labels[s] ?? s;
  const recordings = t.attachments.filter(a => a.kind !== 'SCREENSHOT');
  const shot = t.attachments.find(a => a.kind === 'SCREENSHOT');

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      await refresh();
    } catch (e) {
      toast.error(toApiError(e).message);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/support"
          className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Support tickets
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {bug ? (
            <Bug className="size-5 text-destructive" />
          ) : (
            <Lightbulb className="size-5 text-amber-500" />
          )}
          <h1 className="text-xl font-semibold">
            <span className="text-muted-foreground">#{t.number}</span> {t.title}
          </h1>
          <Pill tone={STATUS_TONE[t.status] ?? 'neutral'}>{label(t.status)}</Pill>
          {t.severity && (
            <Pill tone={SEVERITY_TONE[t.severity]} dot={false}>
              {SEVERITY_LABEL[t.severity]}
            </Pill>
          )}
        </div>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {t.reporter.name} · {fmtDateTime(t.createdAt)}
          {t.pageUrl && (
            <>
              {' · on '}
              <a href={t.pageUrl} className="text-primary hover:underline">
                {new URL(t.pageUrl, location.origin).pathname}
              </a>
            </>
          )}
        </p>
      </div>

      {/* the pipeline */}
      <ol className="flex flex-wrap items-center gap-1">
        {t.pipeline.map((s, i) => {
          const at = t.pipeline.indexOf(t.status);
          const done = i < at;
          const now = s === t.status;
          return (
            <li key={s} className="flex items-center gap-1">
              {i > 0 && (
                <span className={cn('h-px w-4', done || now ? 'bg-primary' : 'bg-border')} />
              )}
              <button
                type="button"
                disabled={!t.canManage || now}
                onClick={() =>
                  void act(() => supportApi.update(t.id, { status: s }), `Moved to “${label(s)}”`)
                }
                title={t.canManage ? `Move to “${label(s)}”` : undefined}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[12.5px]',
                  now && 'border-primary bg-primary text-primary-foreground',
                  done && 'border-primary/40 text-primary',
                  !now && t.canManage && 'hover:bg-muted'
                )}
              >
                {label(s)}
              </button>
            </li>
          );
        })}
      </ol>

      {/* asked for the steps — the reporter's call to action */}
      {bug && t.reproRequested && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="size-5 text-amber-600" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium">Support asked to see the steps.</p>
            <p className="text-muted-foreground">
              Press “Record the steps”, go to where it went wrong and do the same thing again, then
              press Stop. We see exactly what you see.
            </p>
          </div>
          <Button onClick={() => void recordForTicket(t.id, t.number)}>
            <CircleDot /> Record the steps
          </Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-4">
          <section className="space-y-2 rounded-xl border bg-card p-4">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {bug ? 'What happened' : 'The idea'}
            </p>
            <p className="text-sm whitespace-pre-wrap">
              {t.description || <span className="text-muted-foreground">No description.</span>}
            </p>
            {t.expected && (
              <>
                <p className="pt-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Expected
                </p>
                <p className="text-sm whitespace-pre-wrap">{t.expected}</p>
              </>
            )}
          </section>

          {bug && <Recordings t={t} recordings={recordings} />}
          {shot && <Screenshot ticketId={t.id} id={shot.id} />}
          {t.canManage && t.context && <Evidence t={t} />}
        </div>

        <div className="space-y-4">
          {t.canManage && <Triage t={t} act={act} />}
          {t.canManage && bug && <DiagnosisCard t={t} />}
          <Activity t={t} onDone={refresh} />
        </div>
      </div>
    </div>
  );
}

function Recordings({
  t,
  recordings,
}: {
  t: TicketDetail;
  recordings: TicketDetail['attachments'];
}) {
  const [pick, setPick] = useState(recordings[recordings.length - 1]?.id ?? '');
  const mine = !t.canManage;
  if (!recordings.length)
    return (
      <section className="flex items-center gap-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        <Video className="size-4" /> No screen recording yet.
        {mine && (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto"
            onClick={() => void recordForTicket(t.id, t.number)}
          >
            <CircleDot className="text-destructive" /> Record the steps
          </Button>
        )}
      </section>
    );
  return (
    <section className="space-y-2 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Screen replay
        </p>
        {recordings.length > 1 && (
          <Segmented
            size="xs"
            value={pick}
            onChange={setPick}
            options={recordings.map((r, i) => ({
              value: r.id,
              label:
                r.kind === 'REPLAY'
                  ? 'Before reporting'
                  : `Steps ${recordings.filter(x => x.kind === 'REPRO').indexOf(r) + 1 || i}`,
            }))}
          />
        )}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          onClick={() => void recordForTicket(t.id, t.number)}
        >
          <CircleDot className="text-destructive" /> Record {mine ? 'the steps' : 'it myself'}
        </Button>
      </div>
      {pick && <ReplayPlayer key={pick} ticketId={t.id} attachmentId={pick} />}
      <p className="text-xs text-muted-foreground">
        Passwords are never recorded. Inactive stretches are skipped; use the speed buttons to go
        faster.
      </p>
    </section>
  );
}

function Screenshot({ ticketId, id }: { ticketId: string; id: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u: string | null = null;
    void supportApi.attachment(ticketId, id).then(buf => {
      u = URL.createObjectURL(new Blob([buf], { type: 'image/jpeg' }));
      setUrl(u);
    });
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [ticketId, id]);
  return (
    <section className="space-y-2 rounded-xl border bg-card p-4">
      <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Screenshot when reported
      </p>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element -- a local blob URL */}
          <img
            src={url}
            alt="Screenshot"
            className="max-h-[420px] w-full rounded border object-contain object-top"
          />
        </a>
      ) : (
        <Skeleton className="h-48" />
      )}
    </section>
  );
}

const LEVEL_ICON = { error: AlertCircle, warn: AlertTriangle, info: Info } as const;
const LEVEL_TONE = {
  error: 'text-destructive',
  warn: 'text-amber-600',
  info: 'text-muted-foreground',
} as const;

function DiagnosisCard({ t }: { t: TicketDetail }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const d = t.diagnosis;
  const runAi = async () => {
    setBusy(true);
    try {
      await supportApi.diagnose(t.id);
      await qc.invalidateQueries({ queryKey: KEY(t.id) });
    } catch (e) {
      toast.error(toApiError(e).message);
    }
    setBusy(false);
  };
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Automatic diagnosis
      </p>
      {!d ? (
        <p className="text-sm text-muted-foreground">No evidence was captured.</p>
      ) : (
        <>
          <p className="text-sm font-medium">{d.summary}</p>
          <ul className="space-y-1.5">
            {d.findings.map((f, i) => {
              const Icon = LEVEL_ICON[f.level];
              return (
                <li key={i} className="flex gap-2 text-[13px]">
                  <Icon className={cn('mt-0.5 size-3.5 shrink-0', LEVEL_TONE[f.level])} />
                  <span className="min-w-0">
                    <span className="font-medium break-words">{f.title}</span>
                    {f.detail && (
                      <span className="block break-words text-muted-foreground">{f.detail}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          {d.steps.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">
                Steps that led there
              </p>
              <ol className="list-decimal space-y-0.5 pl-5 text-[13px]">
                {d.steps.map((s, i) => (
                  <li key={i} className="break-words">
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          )}
          {d.serverErrors.length > 0 && (
            <details className="rounded-md border bg-muted/30 p-2 text-[12.5px]">
              <summary className="cursor-pointer font-medium">
                Server errors ({d.serverErrors.length})
              </summary>
              {d.serverErrors.map(e => (
                <div key={e.requestId} className="mt-2">
                  <p>
                    <b>{e.method}</b> {e.path} → {e.status} · {e.message}
                  </p>
                  {e.stack && (
                    <pre className="mt-1 overflow-x-auto text-[11px] whitespace-pre text-muted-foreground">
                      {e.stack}
                    </pre>
                  )}
                  <p className="text-[11px] text-muted-foreground">request {e.requestId}</p>
                </div>
              ))}
            </details>
          )}
        </>
      )}

      <div className="border-t pt-3">
        {d?.ai ? (
          <div className="space-y-1.5 text-[13px]">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" /> AI diagnosis · {d.ai.confidence}{' '}
              confidence
            </p>
            <p className="font-medium">{d.ai.summary}</p>
            <p className="text-muted-foreground">{d.ai.likelyCause}</p>
            {d.ai.whereToLook.length > 0 && (
              <ul className="list-disc pl-5">
                {d.ai.whereToLook.map(w => (
                  <li key={w} className="break-words">
                    <code className="text-[12px]">{w}</code>
                  </li>
                ))}
              </ul>
            )}
            <p>
              <span className="font-medium">Try: </span>
              {d.ai.suggestedFix}
            </p>
          </div>
        ) : null}
        {t.canDiagnose && (
          <Button
            size="sm"
            variant={d?.ai ? 'ghost' : 'outline'}
            className="mt-2"
            onClick={() => void runAi()}
            disabled={busy}
          >
            {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}{' '}
            {d?.ai ? 'Diagnose again' : 'Ask the AI to diagnose'}
          </Button>
        )}
        {t.canDiagnose && !d?.ai && (
          <p className="mt-1 text-xs text-muted-foreground">
            Sends the text evidence only — never the screenshot or replay. About ₹0.05.
          </p>
        )}
      </div>
    </section>
  );
}

function Triage({
  t,
  act,
}: {
  t: TicketDetail;
  act: (fn: () => Promise<unknown>, ok: string) => Promise<void>;
}) {
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Triage</p>
      <div className="grid grid-cols-[90px_1fr] items-center gap-2 text-[13px]">
        <span className="text-muted-foreground">Assigned to</span>
        <UserPicker
          value={t.assignee?.id ?? null}
          selectedLabel={t.assignee?.name ?? undefined}
          onChange={v =>
            void act(
              () => supportApi.update(t.id, { assigneeId: v }),
              v ? 'Assigned' : 'Unassigned'
            )
          }
          placeholder="Nobody yet"
          clearable
          size="sm"
        />
        {t.kind === 'BUG' && (
          <>
            <span className="text-muted-foreground">Severity</span>
            <Segmented
              size="xs"
              value={(t.severity ?? 'MEDIUM') as Severity}
              onChange={v =>
                void act(() => supportApi.update(t.id, { severity: v }), 'Severity changed')
              }
              options={(['LOW', 'MEDIUM', 'HIGH', 'BLOCKER'] as Severity[]).map(s => ({
                value: s,
                label: SEVERITY_LABEL[s],
              }))}
            />
          </>
        )}
      </div>
      {t.kind === 'BUG' && !t.reproRequested && (
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() =>
            void act(
              () => supportApi.requestRepro(t.id),
              `${t.reporter.name} was asked to record the steps`
            )
          }
        >
          <Video /> Ask {t.reporter.name?.split(' ')[0] ?? 'the reporter'} to show the steps
        </Button>
      )}
    </section>
  );
}

const EVENT_TEXT: Record<
  string,
  (e: TicketDetail['events'][number], label: (s: string) => string) => string
> = {
  CREATED: () => 'reported it',
  STATUS: (e, l) => `moved it to “${l(String(e.data?.to ?? ''))}”`,
  ASSIGN: e => (e.data?.name ? `assigned it to ${String(e.data.name)}` : 'unassigned it'),
  SEVERITY: e =>
    `set severity to ${SEVERITY_LABEL[e.data?.to as Severity] ?? String(e.data?.to ?? '—')}`,
  REPRO_REQUESTED: () => 'asked for a recording of the steps',
  REPRO_ADDED: () => 'recorded the steps',
  DIAGNOSIS: () => 'ran the AI diagnosis',
};

function Activity({ t, onDone }: { t: TicketDetail; onDone: () => Promise<unknown> }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const label = (s: string) => t.labels[s] ?? s;
  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await supportApi.comment(t.id, text.trim());
      setText('');
      await onDone();
    } catch (e) {
      toast.error(toApiError(e).message);
    }
    setBusy(false);
  };
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Progress
      </p>
      <ol className="space-y-2.5">
        {t.events.map(e => (
          <li key={e.id} className="text-[13px]">
            {e.type === 'COMMENT' ? (
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  <b className="text-foreground">{e.author ?? 'System'}</b> ·{' '}
                  {fmtRelative(e.createdAt)}
                </p>
                <p className="whitespace-pre-wrap">{e.body}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">
                <b className="text-foreground">{e.author ?? 'System'}</b>{' '}
                {EVENT_TEXT[e.type]?.(e, label) ?? e.type.toLowerCase()}
                {e.body && <span> — “{e.body}”</span>} · {fmtRelative(e.createdAt)}
              </p>
            )}
          </li>
        ))}
      </ol>
      <div className="space-y-2">
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Write a comment…"
          rows={2}
        />
        <Button size="sm" onClick={() => void send()} disabled={busy || !text.trim()}>
          {busy ? <Loader2 className="animate-spin" /> : <Send />} Comment
        </Button>
      </div>
    </section>
  );
}

function Evidence({ t }: { t: TicketDetail }) {
  const c = t.context!;
  const failed = (c.network ?? []).filter(n => n.status === 0 || n.status >= 400);
  return (
    <section className="space-y-2 rounded-xl border bg-card p-4 text-[13px]">
      <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        What the browser recorded
      </p>
      <details open={failed.length > 0}>
        <summary className="cursor-pointer font-medium">
          API calls ({c.network?.length ?? 0}, {failed.length} failed)
        </summary>
        <table className="mt-1 w-full text-[12px] [&_td]:align-top">
          <tbody>
            {(c.network ?? []).map((n, i) => (
              <tr
                key={i}
                className={cn(
                  'border-b last:border-0',
                  (n.status === 0 || n.status >= 400) && 'bg-destructive/5 text-destructive'
                )}
              >
                <td className="py-0.5 pr-2 font-mono">{n.method}</td>
                <td className="py-0.5 pr-2 font-mono break-all" title={n.url}>
                  {n.url}
                </td>
                <td className="py-0.5 pr-2 tabular">{n.status || '—'}</td>
                <td className="py-0.5 pr-2 text-right tabular">{n.ms} ms</td>
                <td className="max-w-40 truncate py-0.5 text-muted-foreground" title={n.message}>
                  {n.message}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <details open={!!c.console?.length}>
        <summary className="cursor-pointer font-medium">
          Browser errors & warnings ({c.console?.length ?? 0})
        </summary>
        <ul className="mt-1 space-y-1">
          {(c.console ?? []).map((l, i) => (
            <li
              key={i}
              className={cn(
                'font-mono text-[11.5px] break-words',
                l.level === 'error' ? 'text-destructive' : 'text-amber-700'
              )}
            >
              {l.msg}
              {l.stack && (
                <details>
                  <summary className="cursor-pointer text-muted-foreground">stack</summary>
                  <pre className="overflow-x-auto whitespace-pre text-muted-foreground">
                    {l.stack}
                  </pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      </details>
      <details>
        <summary className="cursor-pointer font-medium">
          Clicks & pages ({c.crumbs?.length ?? 0})
        </summary>
        <ol className="mt-1 space-y-0.5 text-[12px]">
          {(c.crumbs ?? []).map((b, i) => (
            <li key={i}>
              <span className="text-muted-foreground tabular">{b.at.slice(11, 19)}</span> {b.type} ·{' '}
              {b.path ?? b.label}
            </li>
          ))}
        </ol>
      </details>
      <details>
        <summary className="cursor-pointer font-medium">Browser & screen</summary>
        <dl className="mt-1 grid grid-cols-[120px_1fr] gap-x-2 text-[12px]">
          {Object.entries(c.env ?? {}).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd>{String(v)}</dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  );
}
