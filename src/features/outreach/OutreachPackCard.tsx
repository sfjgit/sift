// File: OutreachPackCard.tsx
// Path: src/features/outreach/OutreachPackCard.tsx
//
// One outreach pack (first mail + follow-ups) and how it is being sent.
// The CRM never sends mail: a person reviews the pack, sends each mail from
// their own Outlook, marks it sent here, then records the outcome.
//   Draft → Reviewed → Sent → Replied / No reply / Bounced

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, CheckCheck, Copy, History, Mail, Pencil, RotateCcw, Send, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/forms/fields';
import { FormDialog } from '@/components/forms/FormDialog';
import { OUTREACH_STATUS, OutreachStatusBadge } from '@/components/common/badges';
import { usePermissions } from '@/features/auth/usePermissions';
import { useAction } from '@/hooks/useResource';
import { outreachApi } from '@/lib/api/endpoints';
import { fmtDate, fmtDateTime, fmtRelative, fullName } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { OutreachMessage, OutreachPack, OutreachStatus } from '@/types/crm';

const INVALIDATE = [['outreach'], ['clients']];
const today = () => new Date().toISOString().slice(0, 10);
const mailName = (seq: number) => (seq === 0 ? 'First email' : `Follow-up ${seq}`);

type Outcome = Extract<OutreachStatus, 'REPLIED' | 'NO_REPLY' | 'BOUNCED'>;

/** Replied / No reply / Bounced, with a note (and the reply date). */
function OutcomeDialog({ pack, outcome, onClose }: { pack: OutreachPack; outcome: Outcome | null; onClose: () => void }) {
  const [note, setNote] = useState(pack.outcomeNote ?? '');
  const [date, setDate] = useState(today());
  const save = useAction(
    (v: { note: string; date: string }) =>
      outreachApi.setStatus(pack.id, {
        status: outcome!,
        note: v.note,
        ...(outcome === 'REPLIED' && { repliedAt: new Date(v.date).toISOString() }),
      }),
    { success: () => `Marked ${OUTREACH_STATUS[outcome!].label.toLowerCase()}`, invalidate: INVALIDATE, onSuccess: onClose }
  );
  if (!outcome) return null;
  return (
    <FormDialog
      open
      onOpenChange={o => !o && onClose()}
      title={`${OUTREACH_STATUS[outcome].label} — ${fullName(pack.spoc)}`}
      description={OUTREACH_STATUS[outcome].hint}
      submitLabel="Save"
      busy={save.isPending}
      onSubmit={() => save.mutate({ note, date })}
      size="sm"
    >
      <div className="space-y-3">
        {outcome === 'REPLIED' && (
          <Field label="Reply received on" htmlFor="replied-at">
            <Input id="replied-at" type="date" value={date} max={today()} onChange={e => setDate(e.target.value)} />
          </Field>
        )}
        <Field label="Note" htmlFor="outcome-note" hint="What they said, the next step, or why it bounced.">
          <Textarea id="outcome-note" rows={4} value={note} onChange={e => setNote(e.target.value)} />
        </Field>
      </div>
    </FormDialog>
  );
}

function SentDialog({ pack, message, onClose }: { pack: OutreachPack; message: OutreachMessage | null; onClose: () => void }) {
  const [date, setDate] = useState(today());
  const save = useAction(
    (d: string) => outreachApi.markSent(pack.id, message!.id, { sent: true, sentAt: new Date(`${d}T12:00:00`).toISOString() }),
    { success: 'Marked as sent', invalidate: INVALIDATE, onSuccess: onClose }
  );
  if (!message) return null;
  return (
    <FormDialog
      open
      onOpenChange={o => !o && onClose()}
      title={`${mailName(message.sequenceNo)} sent?`}
      description={`Send it from your Outlook to ${fullName(pack.spoc)} first, then record it here. The text is locked once sent.`}
      submitLabel="Mark as sent"
      busy={save.isPending}
      onSubmit={() => save.mutate(date > today() ? today() : date)}
      size="sm"
    >
      <Field label="Sent on" htmlFor="sent-at">
        <Input id="sent-at" type="date" value={date} max={today()} onChange={e => setDate(e.target.value)} />
      </Field>
    </FormDialog>
  );
}

function MessageRow({
  pack,
  m,
  canManage,
  onMarkSent,
}: {
  pack: OutreachPack;
  m: OutreachMessage;
  canManage: boolean;
  onMarkSent: (m: OutreachMessage) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(m.subject);
  const [body, setBody] = useState(m.body);
  const edit = useAction((v: { subject: string; body: string }) => outreachApi.editMessage(pack.id, m.id, v), {
    success: 'Email updated',
    invalidate: INVALIDATE,
    onSuccess: () => setEditing(false),
  });
  const unsend = useAction(() => outreachApi.markSent(pack.id, m.id, { sent: false }), {
    success: 'Marked as not sent',
    invalidate: INVALIDATE,
  });
  const canSend = canManage && !m.sentAt && (pack.status === 'REVIEWED' || pack.status === 'SENT');

  const copy = () =>
    navigator.clipboard.writeText(`Subject: ${m.subject}\n\n${m.body}`).then(
      () => toast.success('Copied — paste it into Outlook'),
      () => toast.error('Couldn’t copy')
    );

  return (
    <div className={cn('rounded-lg border p-3', m.sentAt ? 'border-primary/30 bg-primary/5' : 'bg-surface')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {mailName(m.sequenceNo)}
          {m.sentAt ? (
            <span className="inline-flex items-center gap-1 text-primary" title={fmtDateTime(m.sentAt)}>
              <CheckCheck className="size-3.5" /> Sent {fmtDate(m.sentAt)}
              {m.sentBy && ` by ${fullName(m.sentBy)}`}
            </span>
          ) : (
            <span>Not sent</span>
          )}
          {m.editedAt && !m.sentAt && <span title={fmtDateTime(m.editedAt)}>· edited{m.editedBy && ` by ${fullName(m.editedBy)}`}</span>}
        </span>
        {!editing && (
          <span className="flex items-center gap-1">
            <Button variant="ghost" size="xs" onClick={copy}>
              <Copy /> Copy
            </Button>
            {canManage && !m.sentAt && (
              <Button variant="ghost" size="xs" onClick={() => setEditing(true)}>
                <Pencil /> Edit
              </Button>
            )}
            {canSend && (
              <Button variant="outline" size="xs" onClick={() => onMarkSent(m)}>
                <Send /> Mark sent
              </Button>
            )}
            {canManage && m.sentAt && (
              <Button variant="ghost" size="xs" onClick={() => unsend.mutate(undefined)} disabled={unsend.isPending}>
                <Undo2 /> Undo
              </Button>
            )}
          </span>
        )}
      </div>

      {editing ? (
        <div className="mt-2 space-y-2">
          <Input value={subject} onChange={e => setSubject(e.target.value)} aria-label="Subject" />
          <Textarea value={body} onChange={e => setBody(e.target.value)} rows={10} aria-label="Body" />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSubject(m.subject);
                setBody(m.body);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
            <Button size="sm" disabled={edit.isPending || !subject.trim() || !body.trim()} onClick={() => edit.mutate({ subject, body })}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm font-medium">{m.subject}</p>
          <p className="mt-2 text-[13px] whitespace-pre-line text-muted-foreground">{m.body}</p>
        </>
      )}
    </div>
  );
}

function PackHistory({ packId }: { packId: string }) {
  const q = useQuery({ queryKey: ['outreach', 'detail', packId], queryFn: () => outreachApi.get(packId) });
  if (q.isLoading) return <p className="text-xs text-muted-foreground">Loading…</p>;
  const rows = q.data?.history ?? [];
  if (!rows.length) return <p className="text-xs text-muted-foreground">No history yet.</p>;
  return (
    <ol className="space-y-1.5 border-l pl-3">
      {rows.map(h => (
        <li key={h.id} className="text-xs">
          <span className="font-medium text-foreground">{h.summary}</span>
          <span className="text-muted-foreground">
            {' '}
            · {h.actor ? fullName(h.actor) : 'Pipeline'} · {fmtRelative(h.createdAt)}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Status line + the action that moves the pack on. */
function PackActions({ pack, canManage, onOutcome }: { pack: OutreachPack; canManage: boolean; onOutcome: (o: Outcome) => void }) {
  const setStatus = useAction((status: 'DRAFT' | 'REVIEWED') => outreachApi.setStatus(pack.id, { status }), {
    success: (_r, s) => (s === 'REVIEWED' ? 'Reviewed — ready to send' : 'Moved back to draft'),
    invalidate: INVALIDATE,
  });
  if (!canManage) return null;

  if (pack.status === 'DRAFT')
    return (
      <Button size="sm" onClick={() => setStatus.mutate('REVIEWED')} disabled={setStatus.isPending}>
        <Check /> Mark reviewed
      </Button>
    );
  if (pack.status === 'REVIEWED')
    return (
      <Button variant="ghost" size="sm" onClick={() => setStatus.mutate('DRAFT')} disabled={setStatus.isPending}>
        <RotateCcw /> Back to draft
      </Button>
    );
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{pack.status === 'SENT' ? 'Outcome:' : 'Change outcome:'}</span>
      {(['REPLIED', 'NO_REPLY', 'BOUNCED'] as const)
        .filter(o => o !== pack.status)
        .map(o => (
          <Button key={o} variant="outline" size="xs" onClick={() => onOutcome(o)}>
            {OUTREACH_STATUS[o].label}
          </Button>
        ))}
    </span>
  );
}

export function OutreachPackCard({ pack, showClient = false }: { pack: OutreachPack; showClient?: boolean }) {
  const { can } = usePermissions();
  const canManage = can('outreach.manage');
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [sending, setSending] = useState<OutreachMessage | null>(null);

  const mails = pack.messages.slice().sort((a, b) => a.sequenceNo - b.sequenceNo);
  const sent = mails.filter(m => m.sentAt).length;
  const next = mails.find(m => !m.sentAt);

  return (
    <div className="rounded-xl border bg-card shadow-card">
      <div className="flex flex-wrap items-start gap-3 p-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Mail className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/spocs/${pack.spoc.id}`} className="font-medium hover:text-primary">
              {fullName(pack.spoc)}
            </Link>
            {pack.spoc.designation && <span className="truncate text-xs text-muted-foreground">{pack.spoc.designation}</span>}
            <OutreachStatusBadge status={pack.status} />
          </div>
          <p className="text-xs text-muted-foreground">
            {showClient && (
              <>
                <Link href={`/clients/${pack.client.id}?tab=outreach`} className="font-medium text-foreground hover:text-primary">
                  {pack.client.name}
                </Link>{' '}
                ·{' '}
              </>
            )}
            {sent} of {mails.length} sent
            {next && pack.status !== 'DRAFT' && ` · next: ${mailName(next.sequenceNo).toLowerCase()}`}
            {pack.reviewedBy && ` · reviewed by ${fullName(pack.reviewedBy)}`}
            {' · '}written {fmtDate(pack.createdAt)}
          </p>
          {pack.outcomeNote && (
            <p className="rounded-md bg-muted/60 px-2 py-1 text-xs">
              {pack.repliedAt && <span className="font-medium">Replied {fmtDate(pack.repliedAt)}: </span>}
              {pack.outcomeNote}
            </p>
          )}
          {pack.status === 'DRAFT' && (
            <p className="text-xs text-warning">Read all {mails.length} emails and mark the pack reviewed before sending any.</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PackActions pack={pack} canManage={canManage} onOutcome={setOutcome} />
          <Button variant="ghost" size="sm" onClick={() => setOpen(o => !o)}>
            {open ? 'Hide emails' : `Show ${mails.length} emails`}
          </Button>
        </div>
      </div>

      {open && (
        <div className="space-y-3 border-t p-4">
          {mails.map(m => (
            <MessageRow key={m.id} pack={pack} m={m} canManage={canManage} onMarkSent={setSending} />
          ))}
          <div className="flex items-center justify-between gap-2">
            {pack.model ? <span className="text-[11px] text-muted-foreground">Drafted by {pack.model}</span> : <span />}
            <Button variant="ghost" size="xs" onClick={() => setHistory(h => !h)}>
              <History /> {history ? 'Hide history' : 'History'}
            </Button>
          </div>
          {history && <PackHistory packId={pack.id} />}
        </div>
      )}

      <OutcomeDialog key={`o-${outcome}`} pack={pack} outcome={outcome} onClose={() => setOutcome(null)} />
      <SentDialog key={`s-${sending?.id}`} pack={pack} message={sending} onClose={() => setSending(null)} />
    </div>
  );
}
