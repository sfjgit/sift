/* eslint-disable @typescript-eslint/no-explicit-any */
// File: TicketWorkspace.tsx
// Path: src/components/tickets/TicketWorkspace.tsx
//
// Everything for the ticket UI lives here on purpose: types, hooks, badges,
// attachment previews, the thread composer, the expanded feed row, the wide
// sheet, the full detail view and the dedicated ticket notification bell.
//
// Matches the backend where a single reply can carry text + files + a status
// move, and every thread entry stamps the status it was posted at.

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Bell,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  CornerDownRight,
  FileText,
  Loader2,
  MessageSquare,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Send,
  UserPlus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAxios } from '@/hooks/useAxios';

/* ========================================================================== */
/*                                   TYPES                                    */
/* ========================================================================== */

export type TicketEventKind = 'MESSAGE' | 'STATUS_CHANGE' | 'ASSIGNMENT';

export interface TicketAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url?: string | null;
  createdAt: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  kind: TicketEventKind;
  body?: string | null;
  authorId: string;
  authorName?: string | null;
  authorRole?: string | null;
  statusAtPost: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  attachments?: TicketAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  seq: number;
  ticketNumber: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
  raisedById: string;
  raisedByName?: string | null;
  assignedToId?: string | null;
  assignedToName?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
  attachments?: TicketAttachment[];
  latestComment?: TicketComment | null;
  _count?: { attachments: number; comments: number };
}

export interface TicketMeta {
  statuses: string[];
  priorities: string[];
  categories: { id: string; name: string }[];
}

export interface TicketNotification {
  id: string;
  ticketId: string;
  ticketNumber: string;
  commentId?: string | null;
  actorId: string;
  actorName?: string | null;
  kind: TicketEventKind;
  title: string;
  preview?: string | null;
  isRead: boolean;
  createdAt: string;
  ticket: { seq: number; title: string; status: string };
}

interface Filters {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  priority?: string;
  categoryId?: string;
}

/* ========================================================================== */
/*                                  HELPERS                                   */
/* ========================================================================== */

const ACTIVE_STATUSES = ['OPEN', 'IN_PROGRESS', 'REOPENED'];

const label = (v: string) => v.replace(/_/g, ' ');

const fmtSize = (b: number) =>
  b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const relative = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDateTime(iso);
};

const openInTab = (url?: string | null) => {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
};

const errMsg = (err: any, fallback: string) => err?.response?.data?.message ?? fallback;

const authorLabel = (c: TicketComment, currentUserId: string) =>
  c.authorId === currentUserId ? 'You' : c.authorName || 'Support';

/* ========================================================================== */
/*                                   HOOKS                                    */
/* ========================================================================== */

export const useTicketMeta = () => {
  const axios = useAxios();
  const [meta, setMeta] = useState<TicketMeta | null>(null);

  useEffect(() => {
    let alive = true;
    axios
      .get('/tickets/meta')
      .then(res => alive && setMeta(res.data.data))
      .catch(() => alive && setMeta(null));
    return () => {
      alive = false;
    };
  }, [axios]);

  return meta;
};

export const useTicketFeed = (filters: Filters) => {
  const axios = useAxios();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const key = JSON.stringify(filters);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const f: Filters = JSON.parse(key);
      const res = await axios.get('/tickets', {
        params: {
          page: f.page,
          limit: f.limit,
          ...(f.search ? { search: f.search } : {}),
          ...(f.status ? { status: f.status } : {}),
          ...(f.priority ? { priority: f.priority } : {}),
          ...(f.categoryId ? { categoryId: f.categoryId } : {}),
        },
      });
      setTickets(res.data.data ?? []);
      setTotal(res.data.meta?.total ?? 0);
      setTotalPages(res.data.meta?.totalPages ?? 1);
    } catch (err: any) {
      toast.error(errMsg(err, 'Could not load tickets'));
    } finally {
      setLoading(false);
    }
  }, [axios, key]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { tickets, total, totalPages, loading, refetch };
};

export const useTicketDetail = (id: string | null) => {
  const axios = useAxios();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!id) {
      setTicket(null);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`/tickets/${id}`);
      setTicket(res.data.data);
    } catch (err: any) {
      toast.error(errMsg(err, 'Could not load ticket'));
    } finally {
      setLoading(false);
    }
  }, [axios, id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ticket, loading, refetch };
};

export const useThread = (ticketId: string | null) => {
  const axios = useAxios();
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!ticketId) {
      setComments([]);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`/tickets/${ticketId}/comments`);
      setComments(res.data.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [axios, ticketId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { comments, loading, refetch };
};

export const useTicketActions = () => {
  const axios = useAxios();

  const createTicket = async (payload: Record<string, string | undefined>, files: File[]) => {
    const form = new FormData();
    Object.entries(payload).forEach(([k, v]) => v && form.append(k, v));
    files.forEach(f => form.append('files', f));
    const res = await axios.post('/tickets', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data as Ticket;
  };

  const patchTicket = async (id: string, payload: Record<string, unknown>) => {
    const res = await axios.patch(`/tickets/${id}`, payload);
    return res.data.data as Ticket;
  };

  /** one call: message + files + optional status move, all on one thread entry */
  const reply = async (id: string, args: { body?: string; status?: string; files?: File[] }) => {
    const form = new FormData();
    if (args.body?.trim()) form.append('body', args.body.trim());
    if (args.status) form.append('status', args.status);
    (args.files ?? []).forEach(f => form.append('files', f));

    const res = await axios.post(`/tickets/${id}/comments`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data as TicketComment & { ticketStatus: string };
  };

  const addFiles = async (id: string, files: File[]) => {
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    const res = await axios.post(`/tickets/${id}/attachments`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  };

  return { createTicket, patchTicket, reply, addFiles };
};

/** dedicated ticket notification stream — separate from global notifications */
export const useTicketNotifications = (pollMs = 45000) => {
  const axios = useAxios();
  const [items, setItems] = useState<TicketNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/tickets/notifications', { params: { limit: 20 } });
      setItems(res.data.data ?? []);
      setUnread(res.data.meta?.unread ?? 0);
    } catch {
      /* silent — a failed bell poll should never toast */
    } finally {
      setLoading(false);
    }
  }, [axios]);

  const pollCount = useCallback(async () => {
    try {
      const res = await axios.get('/tickets/notifications/count');
      setUnread(res.data.data?.unread ?? 0);
    } catch {
      /* silent */
    }
  }, [axios]);

  useEffect(() => {
    pollCount();
    if (!pollMs) return;
    const t = setInterval(pollCount, pollMs);
    return () => clearInterval(t);
  }, [pollCount, pollMs]);

  const markRead = async (id: string) => {
    setItems(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread(u => Math.max(0, u - 1));
    try {
      await axios.patch(`/tickets/notifications/${id}/read`);
    } catch {
      await refetch();
    }
  };

  const markAllRead = async () => {
    setItems(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnread(0);
    try {
      await axios.post('/tickets/notifications/read-all');
    } catch {
      await refetch();
    }
  };

  return { items, unread, loading, refetch, markRead, markAllRead };
};

/* ========================================================================== */
/*                                   BADGES                                   */
/* ========================================================================== */

const STATUS_STYLE: Record<string, string> = {
  OPEN: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  ON_HOLD: 'bg-slate-100 text-slate-600 border-slate-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CLOSED: 'bg-gray-50 text-gray-500 border-gray-200',
  REOPENED: 'bg-red-50 text-red-700 border-red-200',
};

const PRIORITY_STYLE: Record<string, string> = {
  LOW: 'bg-gray-50 text-gray-600 border-gray-200',
  MEDIUM: 'bg-sky-50 text-sky-700 border-sky-200',
  HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
  URGENT: 'bg-red-50 text-red-700 border-red-200',
};

const chipBase =
  'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap';

export const StatusBadge = ({ value }: { value: string }) => (
  <span className={`${chipBase} ${STATUS_STYLE[value] ?? STATUS_STYLE.CLOSED}`}>
    {label(value)}
  </span>
);

export const PriorityBadge = ({ value }: { value: string }) => (
  <span className={`${chipBase} ${PRIORITY_STYLE[value] ?? PRIORITY_STYLE.LOW}`}>
    {label(value)}
  </span>
);

/** tiny inline "posted while X" marker used inside message bubbles */
const StatusStamp = ({ value, onDark = false }: { value: string; onDark?: boolean }) => (
  <span
    className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
      onDark ? 'bg-white/15 text-white/80' : 'bg-gray-100 text-gray-500'
    }`}
  >
    {label(value)}
  </span>
);

/* ========================================================================== */
/*                             ATTACHMENT PREVIEWS                            */
/* ========================================================================== */

function AttachmentStrip({
  attachments,
  size = 'md',
  onDark = false,
}: {
  attachments?: TicketAttachment[];
  size?: 'sm' | 'md';
  onDark?: boolean;
}) {
  if (!attachments?.length) return null;

  const images = attachments.filter(a => a.mimeType.startsWith('image/'));
  const docs = attachments.filter(a => !a.mimeType.startsWith('image/'));
  const box = size === 'sm' ? 'h-14 w-14' : 'h-24 w-24';

  return (
    <div className="space-y-2">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map(a => (
            <button
              key={a.id}
              type="button"
              title={a.fileName}
              onClick={() => openInTab(a.url)}
              className={`${box} overflow-hidden rounded-lg border bg-gray-50 transition hover:ring-2 hover:ring-gray-300 ${
                onDark ? 'border-white/20' : ''
              }`}
            >
              {a.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.url}
                  alt={a.fileName}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                  image
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {docs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {docs.map(a => (
            <button
              key={a.id}
              type="button"
              onClick={() => openInTab(a.url)}
              className={`flex max-w-[220px] items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs transition ${
                onDark
                  ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                  : 'bg-white hover:border-gray-400'
              }`}
            >
              <FileText
                className={`h-3.5 w-3.5 shrink-0 ${onDark ? 'text-white/60' : 'text-gray-400'}`}
              />
              <span className="truncate">{a.fileName}</span>
              <span
                className={`shrink-0 text-[10px] ${onDark ? 'text-white/50' : 'text-gray-400'}`}
              >
                {fmtSize(a.sizeBytes)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ========================================================================== */
/*                                 FILE PICKER                                */
/* ========================================================================== */

function FilePicker({
  files,
  onChange,
  maxFiles = 10,
  maxSizeMb = 10,
  compact = false,
}: {
  files: File[];
  onChange: (f: File[]) => void;
  maxFiles?: number;
  maxSizeMb?: number;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = (selected: FileList | null) => {
    if (!selected) return;
    const incoming: File[] = [];
    let oversized = 0;

    Array.from(selected).forEach(f => {
      if (f.size > maxSizeMb * 1024 * 1024) return void (oversized += 1);
      const dupe =
        files.some(e => e.name === f.name && e.size === f.size) ||
        incoming.some(e => e.name === f.name && e.size === f.size);
      if (!dupe) incoming.push(f);
    });

    if (oversized) toast.error(`${oversized} file(s) over ${maxSizeMb}MB`);
    onChange([...files, ...incoming].slice(0, maxFiles));
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={
          compact
            ? 'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs text-gray-500 hover:border-gray-400'
            : 'flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-3 text-xs text-gray-500 hover:border-gray-400'
        }
      >
        <Paperclip className="h-3.5 w-3.5" />
        {compact ? 'Attach' : `Attach files — up to ${maxFiles}, ${maxSizeMb}MB each`}
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={e => handle(e.target.files)}
      />

      {files.length > 0 && (
        <ul className="divide-y rounded-lg border text-xs">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center justify-between px-2.5 py-1.5">
              <span className="truncate">{f.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400">{fmtSize(f.size)}</span>
                <button
                  type="button"
                  onClick={() => onChange(files.filter((_, x) => x !== i))}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ========================================================================== */
/*                              THREAD COMPOSER                               */
/* ========================================================================== */

/**
 * Text + files + an optional status move, sent as one thread entry.
 * Admins get the status dropdown; everyone else just replies.
 */
function ThreadComposer({
  ticketId,
  currentStatus,
  statuses,
  canChangeStatus,
  onPosted,
  autoFocus = false,
}: {
  ticketId: string;
  currentStatus: string;
  statuses: string[];
  canChangeStatus: boolean;
  onPosted: () => void | Promise<void>;
  autoFocus?: boolean;
}) {
  const { reply } = useTicketActions();
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [nextStatus, setNextStatus] = useState(currentStatus);
  const [sending, setSending] = useState(false);

  useEffect(() => setNextStatus(currentStatus), [currentStatus]);

  const statusMoved = nextStatus !== currentStatus;
  const canSend = !!body.trim() || files.length > 0 || statusMoved;

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      await reply(ticketId, {
        body,
        files,
        ...(statusMoved ? { status: nextStatus } : {}),
      });
      setBody('');
      setFiles([]);
      toast.success(statusMoved ? `Replied · status → ${label(nextStatus)}` : 'Reply posted');
      await onPosted();
    } catch (err: any) {
      toast.error(errMsg(err, 'Reply failed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-2 rounded-xl border bg-white p-3">
      <textarea
        value={body}
        autoFocus={autoFocus}
        onChange={e => setBody(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send();
        }}
        rows={3}
        placeholder="Write a reply… (Ctrl+Enter to send)"
        className="w-full resize-y rounded-lg border px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
      />

      {files.length > 0 && (
        <ul className="divide-y rounded-lg border text-xs">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center justify-between px-2.5 py-1.5">
              <span className="truncate">{f.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400">{fmtSize(f.size)}</span>
                <button
                  type="button"
                  onClick={() => setFiles(files.filter((_, x) => x !== i))}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <FilePicker files={[]} onChange={f => setFiles([...files, ...f])} maxFiles={5} compact />

        {canChangeStatus && (
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="whitespace-nowrap">Set status</span>
            <select
              value={nextStatus}
              onChange={e => setNextStatus(e.target.value)}
              className={`rounded-lg border px-2 py-1.5 text-xs font-medium ${
                statusMoved ? 'border-gray-900 bg-gray-900 text-white' : 'bg-white'
              }`}
            >
              {statuses.map(s => (
                <option key={s} value={s} className="text-gray-900">
                  {label(s)}
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          type="button"
          onClick={send}
          disabled={sending || !canSend}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {statusMoved ? 'Reply & update' : 'Send'}
        </button>
      </div>

      {statusMoved && (
        <p className="text-[11px] text-gray-500">
          This reply will move the ticket {label(currentStatus)} → {label(nextStatus)}.
        </p>
      )}
    </div>
  );
}

/* ========================================================================== */
/*                              THREAD RENDERING                              */
/* ========================================================================== */

/** status moves and assignments render as centred system events, not bubbles */
function SystemEvent({
  comment,
  currentUserId,
}: {
  comment: TicketComment;
  currentUserId: string;
}) {
  const who = authorLabel(comment, currentUserId);

  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-gray-200" />
      <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-gray-500">
        {comment.kind === 'ASSIGNMENT' ? (
          <UserPlus className="h-3 w-3 text-gray-400" />
        ) : (
          <ArrowRight className="h-3 w-3 text-gray-400" />
        )}
        <span className="font-semibold text-gray-700">{who}</span>
        {comment.kind === 'STATUS_CHANGE' && comment.fromStatus && comment.toStatus ? (
          <>
            <span>moved</span>
            <StatusBadge value={comment.fromStatus} />
            <ArrowRight className="h-3 w-3" />
            <StatusBadge value={comment.toStatus} />
          </>
        ) : (
          <span>{comment.body ?? 'updated the ticket'}</span>
        )}
        <span className="text-gray-400">· {fmtDateTime(comment.createdAt)}</span>
      </div>
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  );
}

function MessageBubble({
  comment,
  currentUserId,
}: {
  comment: TicketComment;
  currentUserId: string;
}) {
  const mine = comment.authorId === currentUserId;
  const hasFiles = !!comment.attachments?.length;

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[82%] space-y-2 rounded-2xl px-4 py-3 ${
          mine ? 'bg-gray-900 text-white' : 'border bg-white text-gray-800'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[11px] font-bold ${mine ? 'text-white/85' : 'text-gray-700'}`}>
            {authorLabel(comment, currentUserId)}
          </span>
          {comment.authorRole && (
            <span className={`text-[10px] ${mine ? 'text-white/50' : 'text-gray-400'}`}>
              {label(comment.authorRole)}
            </span>
          )}
          <StatusStamp value={comment.statusAtPost} onDark={mine} />
          <span className={`text-[10px] ${mine ? 'text-white/50' : 'text-gray-400'}`}>
            {fmtDateTime(comment.createdAt)}
          </span>
        </div>

        {comment.body && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{comment.body}</p>
        )}

        {hasFiles && (
          <div className={comment.body ? 'pt-1' : ''}>
            <AttachmentStrip attachments={comment.attachments} size="sm" onDark={mine} />
          </div>
        )}

        {/* a reply that also moved the status says so inline */}
        {comment.fromStatus && comment.toStatus && (
          <div
            className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
              mine ? 'bg-white/15 text-white/85' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {label(comment.fromStatus)}
            <ArrowRight className="h-3 w-3" />
            {label(comment.toStatus)}
          </div>
        )}
      </div>
    </div>
  );
}

function ThreadList({
  ticket,
  comments,
  currentUserId,
}: {
  ticket: Ticket;
  comments: TicketComment[];
  currentUserId: string;
}) {
  return (
    <>
      {/* the original request reads as the first entry */}
      <div className="rounded-xl border bg-gray-50 p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-gray-700">
            {ticket.raisedById === currentUserId ? 'You' : ticket.raisedByName || 'Requester'}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-gray-400">
            opened this · {fmtDateTime(ticket.createdAt)}
          </span>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
          {ticket.description || 'No description provided.'}
        </p>
        {!!ticket.attachments?.length && (
          <div className="mt-3">
            <AttachmentStrip attachments={ticket.attachments} />
          </div>
        )}
      </div>

      {comments.map(c =>
        c.kind === 'MESSAGE' || c.body ? (
          <MessageBubble key={c.id} comment={c} currentUserId={currentUserId} />
        ) : (
          <SystemEvent key={c.id} comment={c} currentUserId={currentUserId} />
        )
      )}
    </>
  );
}

/* ========================================================================== */
/*                               EXPANDED ROW                                 */
/* ========================================================================== */

function TicketRow({
  ticket,
  meta,
  isAdmin,
  currentUserId,
  onOpen,
  onChanged,
}: {
  ticket: Ticket;
  meta: TicketMeta | null;
  isAdmin: boolean;
  currentUserId: string;
  onOpen: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const { patchTicket } = useTicketActions();
  const [replyOpen, setReplyOpen] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const patch = async (payload: Record<string, unknown>) => {
    setBusy(true);
    try {
      await patchTicket(ticket.id, payload);
      toast.success('Updated');
      await onChanged();
    } catch (err: any) {
      toast.error(errMsg(err, 'Update failed'));
    } finally {
      setBusy(false);
    }
  };

  const latest = ticket.latestComment;
  const lastWasMine = latest?.authorId === currentUserId;
  const awaiting = ACTIVE_STATUSES.includes(ticket.status) && lastWasMine;
  const longDesc = (ticket.description?.length ?? 0) > 260;
  const select = 'rounded-md border bg-white px-2 py-1 text-xs font-medium disabled:opacity-50';

  return (
    <div className="grid grid-cols-1 gap-5 border-b p-5 last:border-b-0 hover:bg-gray-50/60 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      {/* ---------------------------- left: the ask ---------------------------- */}
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpen}
            className="font-mono text-xs text-gray-500 underline-offset-2 hover:text-gray-900 hover:underline"
          >
            {ticket.ticketNumber}
          </button>
          <StatusBadge value={ticket.status} />
          <PriorityBadge value={ticket.priority} />
          {ticket.category && (
            <span className="rounded-full border bg-white px-2 py-0.5 text-[11px] text-gray-600">
              {ticket.category.name}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="block text-left text-[15px] font-semibold leading-snug text-gray-900 hover:underline"
        >
          {ticket.title}
        </button>

        <p className="text-[11px] text-gray-400">
          {ticket.raisedById === currentUserId ? 'You' : ticket.raisedByName || 'Someone'} raised
          this {relative(ticket.createdAt)}
          {ticket.assignedToName ? ` · handled by ${ticket.assignedToName}` : ' · unassigned'}
        </p>

        {ticket.description && (
          <div>
            <p
              className={`whitespace-pre-wrap text-sm leading-relaxed text-gray-600 ${
                !descOpen && longDesc ? 'line-clamp-4' : ''
              }`}
            >
              {ticket.description}
            </p>
            {longDesc && (
              <button
                type="button"
                onClick={() => setDescOpen(v => !v)}
                className="mt-1 flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-900"
              >
                {descOpen ? (
                  <>
                    <ChevronUp className="h-3 w-3" /> Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" /> Show full description
                  </>
                )}
              </button>
            )}
          </div>
        )}

        <AttachmentStrip attachments={ticket.attachments} />

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <select
              value={ticket.status}
              disabled={busy}
              onChange={e => patch({ status: e.target.value })}
              className={select}
            >
              {meta?.statuses.map(s => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
            <select
              value={ticket.priority}
              disabled={busy}
              onChange={e => patch({ priority: e.target.value })}
              className={select}
            >
              {meta?.priorities.map(p => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={ticket.categoryId ?? ''}
              disabled={busy}
              onChange={e => patch({ categoryId: e.target.value || null })}
              className={select}
            >
              <option value="">Uncategorised</option>
              {meta?.categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ------------------------- right: latest activity ------------------------ */}
      <div className="min-w-0 space-y-2 lg:border-l lg:pl-5">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            <MessageSquare className="h-3 w-3" />
            Latest {ticket._count?.comments ? `of ${ticket._count.comments}` : ''}
          </p>
          {awaiting && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
              awaiting reply
            </span>
          )}
        </div>

        {latest ? (
          <div
            className={`space-y-2 rounded-lg border p-3 ${
              lastWasMine ? 'bg-white' : 'border-gray-900/10 bg-gray-900/[0.04]'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-gray-700">
                {authorLabel(latest, currentUserId)}
              </span>
              {latest.authorRole && (
                <span className="text-[10px] text-gray-400">{label(latest.authorRole)}</span>
              )}
              <StatusStamp value={latest.statusAtPost} />
              <span className="ml-auto shrink-0 text-[10px] text-gray-400">
                {relative(latest.createdAt)}
              </span>
            </div>

            {latest.fromStatus && latest.toStatus && (
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                {label(latest.fromStatus)}
                <ArrowRight className="h-3 w-3" />
                {label(latest.toStatus)}
              </p>
            )}

            {latest.body ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {latest.body}
              </p>
            ) : (
              <p className="text-xs italic text-gray-400">Status update, no message</p>
            )}

            <AttachmentStrip attachments={latest.attachments} size="sm" />
          </div>
        ) : (
          <p className="rounded-lg border border-dashed py-4 text-center text-xs text-gray-400">
            No replies yet
          </p>
        )}

        {replyOpen ? (
          <div className="space-y-2">
            <ThreadComposer
              ticketId={ticket.id}
              currentStatus={ticket.status}
              statuses={meta?.statuses ?? []}
              canChangeStatus={isAdmin}
              autoFocus
              onPosted={async () => {
                setReplyOpen(false);
                await onChanged();
              }}
            />
            <button
              type="button"
              onClick={() => setReplyOpen(false)}
              className="text-[11px] text-gray-400 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setReplyOpen(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-900 hover:underline"
            >
              <CornerDownRight className="h-3.5 w-3.5" />
              Reply here
            </button>
            <button
              type="button"
              onClick={onOpen}
              className="text-xs font-medium text-gray-500 hover:text-gray-900 hover:underline"
            >
              Full thread
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ========================================================================== */
/*                              WIDE REPLY SHEET                              */
/* ========================================================================== */

function TicketSheet({
  ticketId,
  isAdmin,
  currentUserId,
  onClose,
  onChanged,
}: {
  ticketId: string | null;
  isAdmin: boolean;
  currentUserId: string;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const meta = useTicketMeta();
  const { ticket, loading, refetch } = useTicketDetail(ticketId);
  const { comments, refetch: refetchThread } = useThread(ticketId);
  const { patchTicket, addFiles } = useTicketActions();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [comments.length]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  if (!ticketId) return null;

  const patch = async (payload: Record<string, unknown>) => {
    setBusy(true);
    try {
      await patchTicket(ticketId, payload);
      toast.success('Updated');
      await Promise.all([refetch(), refetchThread(), onChanged()]);
    } catch (err: any) {
      toast.error(errMsg(err, 'Update failed'));
    } finally {
      setBusy(false);
    }
  };

  const upload = async () => {
    if (!files.length) return;
    setBusy(true);
    try {
      await addFiles(ticketId, files);
      toast.success('Files attached');
      setFiles([]);
      await Promise.all([refetch(), onChanged()]);
    } catch (err: any) {
      toast.error(errMsg(err, 'Upload failed'));
    } finally {
      setBusy(false);
    }
  };

  const select = 'w-full rounded-lg border px-3 py-2 text-sm';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <aside className="flex h-full w-full max-w-[1180px] flex-col bg-white shadow-2xl">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b px-6 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-gray-500">{ticket?.ticketNumber ?? '…'}</span>
              {ticket && <StatusBadge value={ticket.status} />}
              {ticket && <PriorityBadge value={ticket.priority} />}
              {ticket?.category && (
                <span className="rounded-full border px-2 py-0.5 text-[11px] text-gray-600">
                  {ticket.category.name}
                </span>
              )}
            </div>
            <h2 className="mt-1.5 truncate text-lg font-semibold text-gray-900">
              {ticket?.title ?? 'Loading…'}
            </h2>
            {ticket && (
              <p className="mt-0.5 text-[11px] text-gray-500">
                {ticket.raisedByName || 'Requester'} ·{' '}
                {ticket.assignedToName ? `handled by ${ticket.assignedToName}` : 'unassigned'} ·
                last activity {relative(ticket.lastActivityAt)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {loading || !ticket ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* thread */}
            <section className="flex min-h-0 flex-col border-r">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
                <ThreadList ticket={ticket} comments={comments} currentUserId={currentUserId} />
                <div ref={bottomRef} />
              </div>

              <div className="shrink-0 border-t bg-gray-50/60 px-6 py-4">
                <ThreadComposer
                  ticketId={ticket.id}
                  currentStatus={ticket.status}
                  statuses={meta?.statuses ?? []}
                  canChangeStatus={isAdmin}
                  onPosted={async () => {
                    await Promise.all([refetchThread(), refetch(), onChanged()]);
                  }}
                />
              </div>
            </section>

            {/* side rail */}
            <aside className="min-h-0 space-y-5 overflow-y-auto bg-gray-50/60 px-5 py-5">
              {isAdmin && (
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Manage
                  </p>
                  <select
                    value={ticket.status}
                    disabled={busy}
                    onChange={e => patch({ status: e.target.value })}
                    className={select}
                  >
                    {meta?.statuses.map(s => (
                      <option key={s} value={s}>
                        {label(s)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={ticket.priority}
                    disabled={busy}
                    onChange={e => patch({ priority: e.target.value })}
                    className={select}
                  >
                    {meta?.priorities.map(p => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <select
                    value={ticket.categoryId ?? ''}
                    disabled={busy}
                    onChange={e => patch({ categoryId: e.target.value || null })}
                    className={select}
                  >
                    <option value="">Uncategorised</option>
                    {meta?.categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400">
                    Changing status here posts a system event in the thread.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Ticket files ({ticket.attachments?.length ?? 0})
                </p>
                {ticket.attachments?.length ? (
                  <AttachmentStrip attachments={ticket.attachments} size="sm" />
                ) : (
                  <p className="text-xs text-gray-400">None</p>
                )}
                <FilePicker files={files} onChange={setFiles} />
                {!!files.length && (
                  <button
                    type="button"
                    onClick={upload}
                    disabled={busy}
                    className="w-full rounded-lg bg-gray-900 py-2 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {busy ? 'Uploading…' : `Upload ${files.length} file(s)`}
                  </button>
                )}
                <p className="text-[10px] text-gray-400">
                  Files sent inside a reply stay attached to that message instead.
                </p>
              </div>

              <div className="space-y-1 border-t pt-4 text-[11px] text-gray-500">
                <p>Raised {fmtDateTime(ticket.createdAt)}</p>
                <p>Last activity {fmtDateTime(ticket.lastActivityAt)}</p>
                {ticket.resolvedAt && <p>Resolved {fmtDateTime(ticket.resolvedAt)}</p>}
                {ticket.closedAt && <p>Closed {fmtDateTime(ticket.closedAt)}</p>}
              </div>
            </aside>
          </div>
        )}
      </aside>
    </div>
  );
}

/* ========================================================================== */
/*                              CREATE DIALOG                                 */
/* ========================================================================== */

function CreateTicketDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const meta = useTicketMeta();
  const { createTicket } = useTicketActions();
  const [form, setForm] = useState({ title: '', description: '', priority: '', categoryId: '' });
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const input = 'w-full rounded-lg border px-3 py-2 text-sm';
  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    if (form.title.trim().length < 3) {
      toast.error('Title needs at least 3 characters');
      return;
    }
    setSaving(true);
    try {
      await createTicket(form, files);
      toast.success('Ticket raised');
      setForm({ title: '', description: '', priority: '', categoryId: '' });
      setFiles([]);
      await onCreated();
      onClose();
    } catch (err: any) {
      toast.error(errMsg(err, 'Could not raise ticket'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold">Raise a ticket</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
              Title
            </label>
            <input
              value={form.title}
              onChange={set('title')}
              placeholder="One line — what's broken or needed"
              className={input}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                Priority
              </label>
              <select value={form.priority} onChange={set('priority')} className={input}>
                <option value="">Default</option>
                {meta?.priorities.map(p => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                Category
              </label>
              <select value={form.categoryId} onChange={set('categoryId')} className={input}>
                <option value="">Uncategorised</option>
                {meta?.categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={set('description')}
              rows={5}
              placeholder="What happened, what you expected, steps to reproduce"
              className={input}
            />
          </div>

          <FilePicker files={files} onChange={setFiles} />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*                        TICKET NOTIFICATION BELL                            */
/* ========================================================================== */

/**
 * Dedicated ticket stream. Drop next to the global bell in your topbar —
 * deliberately its own feed so ticket activity never drowns in regular noise.
 */
export function TicketNotificationBell({
  onOpenTicket,
}: {
  onOpenTicket?: (ticketId: string) => void;
}) {
  const { items, unread, loading, refetch, markRead, markAllRead } = useTicketNotifications();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) refetch();
  }, [open, refetch]);

  useEffect(() => {
    const away = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);

  const handleClick = async (n: TicketNotification) => {
    if (!n.isRead) await markRead(n.id);
    setOpen(false);
    if (onOpenTicket) onOpenTicket(n.ticketId);
    else window.location.assign(`/tickets/${n.ticketId}`);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        title="Ticket activity"
        className="relative rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[380px] overflow-hidden rounded-xl border bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <p className="text-sm font-semibold text-gray-900">Ticket activity</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-900"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded bg-gray-100" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="py-12 text-center text-sm text-gray-400">Nothing yet</p>
            ) : (
              <ul className="divide-y">
                {items.map(n => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleClick(n)}
                      className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${
                        n.isRead ? '' : 'bg-blue-50/40'
                      }`}
                    >
                      <span
                        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                          n.isRead ? 'bg-transparent' : 'bg-blue-500'
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-xs font-semibold text-gray-900">
                            {n.title}
                          </span>
                          <span className="ml-auto shrink-0 text-[10px] text-gray-400">
                            {relative(n.createdAt)}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-gray-500">
                          {n.actorName ? `${n.actorName} · ` : ''}
                          {n.preview || n.ticket.title}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ========================================================================== */
/*                            CATEGORY MANAGER (admin)                        */
/* ========================================================================== */

function CategoryManager() {
  const axios = useAxios();
  const [rows, setRows] = useState<
    { id: string; name: string; isActive: boolean; _count?: { tickets: number } }[]
  >([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await axios.get('/tickets/categories', { params: { includeInactive: true } });
    setRows(res.data.data ?? []);
  }, [axios]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (name.trim().length < 2) return toast.error('Name too short');
    setBusy(true);
    try {
      await axios.post('/tickets/categories', { name: name.trim() });
      setName('');
      await load();
      toast.success('Category added');
    } catch (err: any) {
      toast.error(errMsg(err, 'Could not add category'));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (id: string, isActive: boolean) => {
    setBusy(true);
    try {
      await axios.patch(`/tickets/categories/${id}`, { isActive: !isActive });
      await load();
    } catch (err: any) {
      toast.error(errMsg(err, 'Could not update'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl rounded-xl border bg-white p-5">
      <h3 className="text-sm font-semibold">Categories</h3>
      <p className="mt-1 text-xs text-gray-500">
        Deactivated categories stay on old tickets but vanish from the raise form.
      </p>

      <div className="mt-4 flex gap-2">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="e.g. Data Correction"
          className="flex-1 rounded-lg border px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={add}
          disabled={busy}
          className="flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      <ul className="mt-4 divide-y rounded-lg border">
        {rows.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-gray-400">Nothing yet</li>
        )}
        {rows.map(c => (
          <li key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
            <span className="flex items-center gap-2">
              <span className={c.isActive ? '' : 'text-gray-400 line-through'}>{c.name}</span>
              <span className="text-[11px] text-gray-400">{c._count?.tickets ?? 0} tickets</span>
            </span>
            <button
              type="button"
              onClick={() => toggle(c.id, c.isActive)}
              disabled={busy}
              className="text-xs font-medium text-gray-500 hover:text-gray-900"
            >
              {c.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ========================================================================== */
/*                          MAIN WORKSPACE (default)                          */
/* ========================================================================== */

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'OPEN,IN_PROGRESS,REOPENED', label: 'Active' },
  { key: 'ON_HOLD', label: 'On Hold' },
  { key: 'RESOLVED', label: 'Resolved' },
  { key: 'CLOSED', label: 'Closed' },
];

export default function TicketWorkspace({
  currentUserId,
  isAdmin = false,
  heading,
  subheading,
  showCategoryTab = false,
  canRaise = true,
}: {
  currentUserId: string;
  isAdmin?: boolean;
  heading: string;
  subheading?: string;
  showCategoryTab?: boolean;
  canRaise?: boolean;
}) {
  const meta = useTicketMeta();
  const [view, setView] = useState<'tickets' | 'categories'>('tickets');
  const [statusTab, setStatusTab] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<Filters>({ page: 1, limit: 10 });
  const [createOpen, setCreateOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setFilters(p => ({ ...p, search: searchInput, page: 1 })), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const effective = useMemo<Filters>(
    () => ({ ...filters, status: statusTab || undefined }),
    [filters, statusTab]
  );

  const { tickets, total, totalPages, loading, refetch } = useTicketFeed(effective);

  const patchFilters = (p: Partial<Filters>) => setFilters(prev => ({ ...prev, ...p }));

  const control = 'rounded-lg border bg-white px-3 py-2 text-sm text-gray-700';

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{heading}</h1>
          <p className="text-sm text-gray-500">
            {subheading ? `${subheading} · ` : ''}
            {total} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TicketNotificationBell onOpenTicket={id => setOpenId(id)} />
          <button
            type="button"
            onClick={refetch}
            className="flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm text-gray-600"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {canRaise && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" /> Raise ticket
            </button>
          )}
        </div>
      </div>

      {showCategoryTab && (
        <div className="flex gap-6 border-b text-sm">
          {(['tickets', 'categories'] as const).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`-mb-px border-b-2 pb-2 font-medium capitalize ${
                view === v ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      )}

      {view === 'categories' ? (
        <CategoryManager />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map(t => (
              <button
                key={t.key || 'all'}
                type="button"
                onClick={() => {
                  setStatusTab(t.key);
                  patchFilters({ page: 1 });
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  statusTab === t.key
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search title or description…"
                className={`${control} w-full pl-9`}
              />
            </div>
            <select
              value={filters.priority ?? ''}
              onChange={e => patchFilters({ priority: e.target.value || undefined, page: 1 })}
              className={control}
            >
              <option value="">All priorities</option>
              {meta?.priorities.map(p => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={filters.categoryId ?? ''}
              onChange={e => patchFilters({ categoryId: e.target.value || undefined, page: 1 })}
              className={control}
            >
              <option value="">All categories</option>
              {meta?.categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={String(filters.limit)}
              onChange={e => patchFilters({ limit: Number(e.target.value), page: 1 })}
              className={control}
            >
              {[5, 10, 20, 50].map(n => (
                <option key={n} value={n}>
                  {n} per page
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-hidden rounded-xl border bg-white">
            {loading ? (
              <div className="space-y-4 p-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-44 animate-pulse rounded-lg bg-gray-100" />
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-sm font-medium text-gray-600">No tickets here</p>
                <p className="mt-1 text-xs text-gray-400">
                  Try a different tab or clear the filters.
                </p>
              </div>
            ) : (
              tickets.map(t => (
                <TicketRow
                  key={t.id}
                  ticket={t}
                  meta={meta}
                  isAdmin={isAdmin}
                  currentUserId={currentUserId}
                  onOpen={() => setOpenId(t.id)}
                  onChanged={refetch}
                />
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 text-sm">
              <button
                type="button"
                disabled={filters.page <= 1}
                onClick={() => patchFilters({ page: filters.page - 1 })}
                className="rounded-lg border bg-white px-3 py-1.5 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-gray-500">
                {filters.page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={filters.page >= totalPages}
                onClick={() => patchFilters({ page: filters.page + 1 })}
                className="rounded-lg border bg-white px-3 py-1.5 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <CreateTicketDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={refetch}
      />

      <TicketSheet
        ticketId={openId}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
        onClose={() => setOpenId(null)}
        onChanged={refetch}
      />
    </div>
  );
}

/* ========================================================================== */
/*                     FULL PAGE DETAIL VIEW (/tickets/[id])                  */
/* ========================================================================== */

export function TicketDetailView({
  ticketId,
  currentUserId,
  isAdmin = false,
}: {
  ticketId: string;
  currentUserId: string;
  isAdmin?: boolean;
}) {
  const meta = useTicketMeta();
  const { ticket, loading, refetch } = useTicketDetail(ticketId);
  const { comments, refetch: refetchThread } = useThread(ticketId);
  const { patchTicket, addFiles } = useTicketActions();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const patch = async (payload: Record<string, unknown>) => {
    setBusy(true);
    try {
      await patchTicket(ticketId, payload);
      await Promise.all([refetch(), refetchThread()]);
      toast.success('Updated');
    } catch (err: any) {
      toast.error(errMsg(err, 'Update failed'));
    } finally {
      setBusy(false);
    }
  };

  const upload = async () => {
    if (!files.length) return;
    setBusy(true);
    try {
      await addFiles(ticketId, files);
      setFiles([]);
      await refetch();
      toast.success('Files attached');
    } catch (err: any) {
      toast.error(errMsg(err, 'Upload failed'));
    } finally {
      setBusy(false);
    }
  };

  if (loading || !ticket) {
    return (
      <div className="mx-auto max-w-5xl space-y-3 p-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-gray-100" />
        ))}
      </div>
    );
  }

  const select = 'w-full rounded-lg border px-3 py-2 text-sm';

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-gray-500">{ticket.ticketNumber}</span>
          <StatusBadge value={ticket.status} />
          <PriorityBadge value={ticket.priority} />
          {ticket.category && (
            <span className="rounded-full border bg-white px-2 py-0.5 text-[11px] text-gray-600">
              {ticket.category.name}
            </span>
          )}
        </div>
        <h1 className="mt-2 text-xl font-semibold text-gray-900">{ticket.title}</h1>
        <p className="mt-1 text-xs text-gray-500">
          {ticket.raisedByName || 'Requester'} ·{' '}
          {ticket.assignedToName ? `handled by ${ticket.assignedToName}` : 'unassigned'} · raised{' '}
          {fmtDateTime(ticket.createdAt)} · last activity {relative(ticket.lastActivityAt)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <ThreadList ticket={ticket} comments={comments} currentUserId={currentUserId} />

          <ThreadComposer
            ticketId={ticket.id}
            currentStatus={ticket.status}
            statuses={meta?.statuses ?? []}
            canChangeStatus={isAdmin}
            onPosted={async () => {
              await Promise.all([refetchThread(), refetch()]);
            }}
          />
        </div>

        <aside className="space-y-5">
          {isAdmin && (
            <div className="space-y-3 rounded-xl border bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Manage
              </p>
              <select
                value={ticket.status}
                disabled={busy}
                onChange={e => patch({ status: e.target.value })}
                className={select}
              >
                {meta?.statuses.map(s => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </select>
              <select
                value={ticket.priority}
                disabled={busy}
                onChange={e => patch({ priority: e.target.value })}
                className={select}
              >
                {meta?.priorities.map(p => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                value={ticket.categoryId ?? ''}
                disabled={busy}
                onChange={e => patch({ categoryId: e.target.value || null })}
                className={select}
              >
                <option value="">Uncategorised</option>
                {meta?.categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2 rounded-xl border bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Ticket files ({ticket.attachments?.length ?? 0})
            </p>
            {ticket.attachments?.length ? (
              <AttachmentStrip attachments={ticket.attachments} size="sm" />
            ) : (
              <p className="text-xs text-gray-400">None</p>
            )}
            <FilePicker files={files} onChange={setFiles} />
            {!!files.length && (
              <button
                type="button"
                onClick={upload}
                disabled={busy}
                className="w-full rounded-lg bg-gray-900 py-2 text-xs font-medium text-white disabled:opacity-50"
              >
                {busy ? 'Uploading…' : `Upload ${files.length} file(s)`}
              </button>
            )}
          </div>

          <div className="space-y-1 rounded-xl border bg-white p-4 text-[11px] text-gray-500">
            <p>Raised {fmtDateTime(ticket.createdAt)}</p>
            <p>Last activity {fmtDateTime(ticket.lastActivityAt)}</p>
            {ticket.resolvedAt && <p>Resolved {fmtDateTime(ticket.resolvedAt)}</p>}
            {ticket.closedAt && <p>Closed {fmtDateTime(ticket.closedAt)}</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
