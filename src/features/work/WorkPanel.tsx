// File: WorkPanel.tsx
// Path: src/features/work/WorkPanel.tsx
//
// "Activity & tasks" for a client or one SPOC (CASPA's Comments / Add Call /
// Email / Meeting / Notes tabs, as one panel):
//  1. composer — pick what you did or plan: Comment · Call · Email · WhatsApp ·
//     Meeting · Task. Everything is typed and saved right here, no dialogs.
//  2. open work — tasks, calls to make and meetings not done yet; start them or
//     close them with a note (a meeting's minutes).
//  3. timeline — everything that happened, with filter chips.
// The same component serves the SPOC page (spocId set) and the client page.

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  Check,
  ListTodo,
  Mail,
  MessageCircle,
  MessageSquareText,
  Pencil,
  Phone,
  Play,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Combobox } from '@/components/pickers/Combobox';
import { UserPicker } from '@/components/pickers/pickers';
import { ActivityTimeline } from '@/features/activity/ActivityTimeline';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePermissions } from '@/features/auth/usePermissions';
import { clientHooks, spocHooks } from '@/hooks/queries';
import { clientsApi } from '@/lib/api/endpoints';
import { SECTION_LABEL } from '@/features/clients/detail/SectionComments';
import type { ApiError } from '@/lib/api/client';
import { fmtDateTime, fmtRelative, fullName } from '@/lib/format';
import { cn } from '@/lib/utils';
import type {
  ClientActivity,
  ClientNote,
  InteractionChannel,
  WorkTask,
  WorkTaskKind,
} from '@/types/crm';

export type ComposeMode = 'comment' | 'call' | 'email' | 'whatsapp' | 'meeting' | 'task';

const MODES: { key: ComposeMode; label: string; icon: LucideIcon }[] = [
  { key: 'comment', label: 'Comment', icon: MessageSquareText },
  { key: 'call', label: 'Call', icon: Phone },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { key: 'meeting', label: 'Meeting', icon: CalendarClock },
  { key: 'task', label: 'Task', icon: ListTodo },
];

const KIND: Record<WorkTaskKind, { label: string; icon: LucideIcon; doneLabel: string; notePh: string }> = {
  TASK: { label: 'Task', icon: ListTodo, doneLabel: 'Done', notePh: 'What was done? (optional)' },
  CALL: { label: 'Call', icon: Phone, doneLabel: 'Call done', notePh: 'What did they say?' },
  MEETING: {
    label: 'Meeting',
    icon: CalendarClock,
    doneLabel: 'Meeting done',
    notePh: 'Minutes of the meeting — what was discussed, next steps',
  },
};

const taskKey = (clientId: string, spocId?: string) => ['client-tasks', clientId, spocId ?? 'all'];
const activityKey = (clientId: string, spocId?: string) => ['client-activity', clientId, spocId ?? 'all'];

/** open tasks / calls / meetings — for the count beside the block title */
export function useWorkTasks(clientId: string | undefined, spocId?: string) {
  return useQuery({
    queryKey: taskKey(clientId ?? '', spocId),
    queryFn: () => clientsApi.tasks(clientId!, { spocId }),
    enabled: !!clientId,
  });
}

const toIso = (local: string) => (local ? new Date(local).toISOString() : null);

/** "today 3:30 pm", "tomorrow", "18 Nov" + overdue flag */
function dueInfo(dueAt: string | null) {
  if (!dueAt) return null;
  const d = new Date(dueAt);
  const now = new Date();
  const days = Math.round(
    (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      86_400_000
  );
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const date = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const label = days === 0 ? `Today ${time}` : days === 1 ? `Tomorrow ${time}` : `${date}, ${time}`;
  return { label, overdue: d.getTime() < now.getTime(), today: days === 0 };
}

// ── timeline filters ─────────────────────────────────────────────────────────

type Bucket = 'comments' | 'calls' | 'emails' | 'whatsapp' | 'meetings' | 'tasks' | 'status' | 'changes' | 'other';

const bucketOf = (a: ClientActivity): Bucket => {
  const meta = a.meta ?? {};
  switch (a.type) {
    case 'NOTE_ADDED':
    case 'NOTE_UPDATED':
      return 'comments';
    case 'INTERACTION_LOGGED':
      return meta.channel === 'CALL'
        ? 'calls'
        : meta.channel === 'EMAIL'
          ? 'emails'
          : meta.channel === 'WHATSAPP'
            ? 'whatsapp'
            : 'other';
    case 'TASK_ADDED':
    case 'TASK_UPDATED':
    case 'TASK_CLOSED':
      return meta.kind === 'CALL' ? 'calls' : meta.kind === 'MEETING' ? 'meetings' : 'tasks';
    case 'SALES_STATUS_CHANGED':
      return 'status';
    case 'OUTREACH_GENERATED':
    case 'OUTREACH_UPDATED':
      return 'emails';
    case 'SPOC_UPDATED':
    case 'CLIENT_UPDATED':
    case 'SPOC_REASSIGNED':
    case 'CLIENT_ASSIGNED':
    case 'SPOC_APPROVED':
    case 'SPOC_REJECTED':
    case 'CLIENT_APPROVED':
      return 'changes';
    default:
      return 'other';
  }
};

/** written by the engine (pipeline runs, generated drafts, anything with no person) —
 * hidden from the sales history unless asked for */
const isEngine = (a: ClientActivity) =>
  a.type.startsWith('STEP_RUN') || a.type === 'OUTREACH_GENERATED' || !a.actor;

const BUCKETS: { key: Bucket; label: string }[] = [
  { key: 'comments', label: 'Comments' },
  { key: 'calls', label: 'Calls' },
  { key: 'emails', label: 'Emails' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'meetings', label: 'Meetings' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'status', label: 'Status' },
  { key: 'changes', label: 'Changes' },
  { key: 'other', label: 'Other' },
];

// ── pieces ───────────────────────────────────────────────────────────────────

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-0.5 text-[12.5px] font-medium',
        on
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:bg-muted'
      )}
    >
      {children}
    </button>
  );
}

/** history rows shown before "Show all" */
const RECENT = 8;

const fieldLabel = 'mb-1 block text-[11px] font-semibold tracking-wider text-muted-foreground uppercase';

/** one open / done task row; closing asks for the note right in the row */
function TaskRow({
  task,
  clientId,
  showSpoc,
  canWork,
  onChanged,
}: {
  task: WorkTask;
  clientId: string;
  showSpoc: boolean;
  canWork: boolean;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const [closing, setClosing] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const k = KIND[task.kind];
  const due = dueInfo(task.dueAt);
  const done = task.status === 'DONE';

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    try {
      await fn();
      if (ok) toast.success(ok);
      onChanged();
      setClosing(false);
      setNote('');
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="py-2.5">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg',
            done ? 'bg-success/12 text-success' : 'bg-primary/10 text-primary'
          )}
        >
          {done ? <Check className="size-3.5" /> : <k.icon className="size-3.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('text-[14px] leading-snug', done && 'text-muted-foreground')}>
            <span className="font-medium">{k.label}: </span>
            {task.title}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {due && !done && (
              <span
                className={cn(
                  'rounded px-1.5 py-px font-medium',
                  due.overdue
                    ? 'bg-destructive/10 text-destructive'
                    : due.today
                      ? 'bg-warning/15 text-warning'
                      : 'bg-muted'
                )}
              >
                {due.overdue ? `Overdue · ${due.label}` : due.label}
              </span>
            )}
            {task.status === 'IN_PROGRESS' && (
              <span className="rounded bg-info/12 px-1.5 py-px font-medium text-info">In progress</span>
            )}
            <span className="inline-flex items-center gap-1">
              <UserAvatar person={task.assignee} size="xs" /> {fullName(task.assignee)}
            </span>
            {showSpoc && task.spoc && (
              <Link href={`/spocs/${task.spoc.id}`} className="hover:text-primary">
                with {fullName(task.spoc)}
              </Link>
            )}
            {done && task.closedAt && <span>closed {fmtRelative(task.closedAt)}</span>}
          </p>
          {task.notes && <p className="mt-1 text-[13px] whitespace-pre-line text-muted-foreground">{task.notes}</p>}
          {done && task.closeNote && (
            <p className="mt-1 rounded-md bg-surface px-2.5 py-1.5 text-[13px] whitespace-pre-line">
              {task.closeNote}
            </p>
          )}
          {closing && (
            <div className="mt-2 space-y-2">
              <Textarea
                autoFocus
                rows={task.kind === 'MEETING' ? 4 : 2}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={k.notePh}
                className="text-[14px]"
              />
              <div className="flex gap-2">
                <Button
                  size="xs"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () =>
                        clientsApi.updateTask(clientId, task.id, {
                          status: 'DONE',
                          closeNote: note.trim() || null,
                        }),
                      `${k.label} closed`
                    )
                  }
                >
                  <Check /> Save & close
                </Button>
                <Button size="xs" variant="ghost" onClick={() => setClosing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
        {canWork && !closing && (
          <div className="flex shrink-0 items-center gap-1">
            {task.status === 'OPEN' && (
              <Button
                size="xs"
                variant="outline"
                disabled={busy}
                onClick={() => run(() => clientsApi.updateTask(clientId, task.id, { status: 'IN_PROGRESS' }))}
              >
                <Play /> Start
              </Button>
            )}
            {!done && (
              <Button size="xs" variant="outline" disabled={busy} onClick={() => setClosing(true)}>
                <Check /> {k.doneLabel}
              </Button>
            )}
            {done && (
              <Button
                size="xs"
                variant="ghost"
                disabled={busy}
                onClick={() => run(() => clientsApi.updateTask(clientId, task.id, { status: 'OPEN' }), 'Reopened')}
              >
                Reopen
              </Button>
            )}
            {!done && (task.createdBy.id === user?.id || task.assignee.id === user?.id || user?.isSuperAdmin) && (
              <button
                type="button"
                aria-label="Remove"
                disabled={busy}
                onClick={() => run(() => clientsApi.deleteTask(clientId, task.id), 'Removed')}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

/** full comments with edit (own) and delete */
function CommentList({
  notes,
  clientId,
  showSpoc,
  onChanged,
}: {
  notes: ClientNote[];
  clientId: string;
  showSpoc: boolean;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const { can } = usePermissions();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      setEditing(null);
      onChanged();
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };
  if (!notes.length) return <p className="py-4 text-center text-sm text-muted-foreground">No comments yet.</p>;
  return (
    <ul className="space-y-3">
      {notes.map(n => {
        const mine = n.author.id === user?.id;
        return (
          <li key={n.id} className="group flex gap-2.5">
            <UserAvatar person={n.author} size="sm" className="mt-0.5" />
            <div className="min-w-0 flex-1 rounded-lg bg-surface px-3 py-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span>
                  <span className="font-medium">{fullName(n.author)}</span>
                  {showSpoc && n.spoc && (
                    <Link href={`/spocs/${n.spoc.id}`} className="text-muted-foreground hover:text-primary">
                      {' '}
                      · about {fullName(n.spoc)}
                    </Link>
                  )}
                  {n.section && (
                    <span className="text-muted-foreground"> · on {SECTION_LABEL[n.section]}</span>
                  )}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <time title={fmtDateTime(n.createdAt)}>{fmtRelative(n.createdAt)}</time>
                  {n.editedAt && <span title={fmtDateTime(n.editedAt)}>· edited</span>}
                  {mine && editing !== n.id && (
                    <button
                      type="button"
                      aria-label="Edit comment"
                      onClick={() => {
                        setDraft(n.content);
                        setEditing(n.id);
                      }}
                      className="rounded p-0.5 opacity-0 group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  )}
                  {(mine || can('client_notes.delete_any')) && editing !== n.id && (
                    <button
                      type="button"
                      aria-label="Delete comment"
                      disabled={busy}
                      onClick={() => run(() => clientsApi.deleteNote(clientId, n.id), 'Comment deleted')}
                      className="rounded p-0.5 opacity-0 group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </span>
              </div>
              {editing === n.id ? (
                <div className="mt-1.5 space-y-2">
                  <Textarea autoFocus rows={3} value={draft} onChange={e => setDraft(e.target.value)} className="bg-card text-[14px]" />
                  <div className="flex gap-2">
                    <Button
                      size="xs"
                      disabled={busy || !draft.trim()}
                      onClick={() => run(() => clientsApi.updateNote(clientId, n.id, draft.trim()), 'Comment updated')}
                    >
                      Save
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-[14px] whitespace-pre-line">{n.content}</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ── the panel ────────────────────────────────────────────────────────────────

export function WorkPanel({
  clientId,
  spocId,
  notes,
  spocs,
  mode,
  onModeChange,
}: {
  clientId: string;
  /** set on a SPOC's page: everything is about (and filtered to) that SPOC */
  spocId?: string;
  /** the client's notes (already filtered to the SPOC on a SPOC page) */
  notes: ClientNote[];
  /** client page: lets the composer tag one of the client's SPOCs */
  spocs?: { id: string; name: string }[];
  mode: ComposeMode;
  onModeChange: (m: ComposeMode) => void;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { can } = usePermissions();
  const canWork = can('client_notes.create');

  const tasksQ = useWorkTasks(clientId, spocId);
  const activityQ = useQuery({
    queryKey: activityKey(clientId, spocId),
    queryFn: () => clientsApi.activities(clientId, { spocId, limit: 100 }),
  });

  // composer state
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState('');
  const [connected, setConnected] = useState<boolean | null>(null);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [about, setAbout] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<'all' | Bucket>('all');
  const [showDone, setShowDone] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showEngine, setShowEngine] = useState(false);

  const target = spocId ?? about ?? null;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['client-tasks', clientId] });
    qc.invalidateQueries({ queryKey: ['client-activity', clientId] });
    qc.invalidateQueries({ queryKey: clientHooks.keys.detail(clientId) });
    if (target) qc.invalidateQueries({ queryKey: spocHooks.keys.all });
  };

  const submit = async () => {
    const note = text.trim();
    let job: (() => Promise<unknown>) | null = null;
    let ok = '';
    if (mode === 'comment') {
      if (!note) return;
      job = () => clientsApi.addNote(clientId, note, target);
      ok = 'Comment added';
    } else if (mode === 'email' || mode === 'whatsapp') {
      const channel: InteractionChannel = mode === 'email' ? 'EMAIL' : 'WHATSAPP';
      job = () => clientsApi.logInteraction(clientId, { spocId: target, channel, note: note || null });
      ok = mode === 'email' ? 'Email logged' : 'WhatsApp logged';
    } else if (mode === 'call') {
      if (connected === null && !note && !when) return toast.error('Say if the call connected, or add a note');
      job = async () => {
        if (connected !== null || note)
          await clientsApi.logInteraction(clientId, {
            spocId: target,
            channel: 'CALL',
            note: note || null,
            ...(connected !== null && { connected }),
          });
        if (when)
          await clientsApi.createTask(clientId, {
            spocId: target,
            kind: 'CALL',
            title: title.trim() || 'Follow-up call',
            dueAt: toIso(when),
          });
      };
      ok = when ? 'Call saved — follow-up added' : 'Call logged';
    } else {
      // meeting / task
      if (!title.trim()) return toast.error(mode === 'meeting' ? 'Give the meeting a title' : 'Say what needs doing');
      job = () =>
        clientsApi.createTask(clientId, {
          spocId: target,
          kind: mode === 'meeting' ? 'MEETING' : 'TASK',
          title: title.trim(),
          notes: note || null,
          dueAt: toIso(when),
          ...(assigneeId && { assigneeId }),
        });
      ok = mode === 'meeting' ? 'Meeting added' : 'Task added';
    }
    setBusy(true);
    try {
      await job();
      toast.success(ok);
      setText('');
      setTitle('');
      setWhen('');
      setConnected(null);
      setAssigneeId(null);
      refresh();
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  const tasks = tasksQ.data ?? [];
  const open = tasks.filter(t => t.status !== 'DONE');
  const done = tasks.filter(t => t.status === 'DONE');

  const all = useMemo(() => activityQ.data?.data ?? [], [activityQ.data]);
  const engineCount = useMemo(() => all.filter(isEngine).length, [all]);
  const items = useMemo(
    () => (showEngine ? all : all.filter(a => !isEngine(a))),
    [all, showEngine]
  );
  const counts = useMemo(() => {
    const c: Partial<Record<Bucket, number>> = {};
    for (const a of items) c[bucketOf(a)] = (c[bucketOf(a)] ?? 0) + 1;
    c.comments = notes.length;
    return c;
  }, [items, notes.length]);

  const shown = filter === 'all' ? items : items.filter(a => bucketOf(a) === filter);

  const textPlaceholder: Record<ComposeMode, string> = {
    comment: 'Write a comment… (date & time are saved automatically)',
    call: 'What was said on the call?',
    email: 'What did you send? (subject, attachment…) — optional',
    whatsapp: 'What did you send on WhatsApp? — optional',
    meeting: 'Agenda, meeting link, who is joining… — optional',
    task: 'Details — optional',
  };
  const submitLabel: Record<ComposeMode, string> = {
    comment: 'Post comment',
    call: 'Save call',
    email: 'Log email sent',
    whatsapp: 'Log WhatsApp sent',
    meeting: 'Add meeting',
    task: 'Add task',
  };

  return (
    <div className="space-y-5 py-3">
      {/* 1 ── composer */}
      {canWork && (
        <div className="rounded-lg border bg-surface">
          <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5">
            {MODES.map(m => (
              <button
                key={m.key}
                type="button"
                onClick={() => onModeChange(m.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-medium',
                  mode === m.key
                    ? 'bg-card text-primary shadow-sm ring-1 ring-border'
                    : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'
                )}
              >
                <m.icon className="size-3.5" /> {m.label}
              </button>
            ))}
            {spocs && spocs.length > 0 && (
              <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                About
                <Combobox
                  size="sm"
                  className="w-48 bg-card"
                  value={about}
                  onChange={setAbout}
                  placeholder="The whole client"
                  options={spocs.map(s => ({ value: s.id, label: s.name }))}
                />
              </div>
            )}
          </div>

          <div className="space-y-2.5 p-3">
            {(mode === 'meeting' || mode === 'task') && (
              <div className="grid gap-2.5 sm:grid-cols-[1fr_210px_200px]">
                <div>
                  <label className={fieldLabel}>{mode === 'meeting' ? 'Meeting title' : 'What needs doing'}</label>
                  <Input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder={mode === 'meeting' ? 'e.g. Intro call with CSR head' : 'e.g. Send the proposal'}
                    className="h-8 bg-card"
                  />
                </div>
                <div>
                  <label className={fieldLabel}>{mode === 'meeting' ? 'When' : 'Due'}</label>
                  <Input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} className="h-8 bg-card" />
                </div>
                <div>
                  <label className={fieldLabel}>Assigned to</label>
                  <UserPicker
                    purpose="assign"
                    value={assigneeId ?? user?.id ?? null}
                    onChange={setAssigneeId}
                    clearable={false}
                    selectedLabel={user ? `${fullName(user)} (you)` : undefined}
                    className="bg-card"
                  />
                </div>
              </div>
            )}

            {mode === 'call' && (
              <div className="flex flex-wrap items-end gap-x-5 gap-y-2.5">
                <div>
                  <span className={fieldLabel}>Did it connect?</span>
                  <div className="flex gap-1.5">
                    <Chip on={connected === true} onClick={() => setConnected(connected === true ? null : true)}>
                      Connected
                    </Chip>
                    <Chip on={connected === false} onClick={() => setConnected(connected === false ? null : false)}>
                      Not connected
                    </Chip>
                  </div>
                </div>
                <div>
                  <label className={fieldLabel}>Call again on (optional)</label>
                  <Input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} className="h-8 w-52 bg-card" />
                </div>
                {when && (
                  <div className="min-w-48 flex-1">
                    <label className={fieldLabel}>Follow-up is about</label>
                    <Input
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Follow-up call"
                      className="h-8 bg-card"
                    />
                  </div>
                )}
              </div>
            )}

            <Textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
              }}
              rows={mode === 'comment' ? 3 : 2}
              maxLength={2000}
              placeholder={textPlaceholder[mode]}
              className="resize-none bg-card text-[14px]"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Ctrl + Enter to save</span>
              <Button size="sm" onClick={submit} disabled={busy}>
                {submitLabel[mode]}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2 ── open work */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold">
            Open tasks, calls & meetings{' '}
            <span className="ml-1 rounded-full bg-muted px-1.5 py-px text-xs font-medium text-muted-foreground tabular">
              {open.length}
            </span>
          </h3>
          {done.length > 0 && (
            <button type="button" onClick={() => setShowDone(s => !s)} className="text-xs text-primary hover:underline">
              {showDone ? 'Hide' : 'Show'} {done.length} done
            </button>
          )}
        </div>
        {open.length === 0 && !showDone ? (
          <p className="rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
            Nothing open. Add a task, a call to make or a meeting above.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border px-3">
            {[...open, ...(showDone ? done : [])].map(t => (
              <TaskRow key={t.id} task={t} clientId={clientId} showSpoc={!spocId} canWork={canWork} onChanged={refresh} />
            ))}
          </ul>
        )}
      </div>

      {/* 3 ── timeline */}
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <h3 className="mr-1 text-[13px] font-semibold">History</h3>
          <Chip on={filter === 'all'} onClick={() => setFilter('all')}>
            All <span className="tabular opacity-70">{items.length}</span>
          </Chip>
          {BUCKETS.filter(b => counts[b.key]).map(b => (
            <Chip key={b.key} on={filter === b.key} onClick={() => setFilter(b.key)}>
              {b.label} <span className="tabular opacity-70">{counts[b.key]}</span>
            </Chip>
          ))}
          {engineCount > 0 && (
            <button
              type="button"
              onClick={() => setShowEngine(v => !v)}
              className="ml-auto text-xs font-medium text-muted-foreground hover:text-primary"
              title="Pipeline runs and other entries written by the engine"
            >
              {showEngine ? 'Hide engine activity' : `Show engine activity (${engineCount})`}
            </button>
          )}
        </div>
        {filter === 'comments' ? (
          <CommentList notes={notes} clientId={clientId} showSpoc={!spocId} onChanged={refresh} />
        ) : (
          <>
            <ActivityTimeline
              items={showAll ? shown : shown.slice(0, RECENT)}
              loading={activityQ.isLoading}
              hideSpoc={!!spocId}
              emptyText="Nothing here yet"
            />
            {shown.length > RECENT && (
              <button
                type="button"
                onClick={() => setShowAll(v => !v)}
                className="mt-3 text-[13px] font-medium text-primary hover:underline"
              >
                {showAll ? 'Show less' : `Show all ${shown.length}`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
