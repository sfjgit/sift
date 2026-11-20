// File: ReportProblem.tsx
// Path: src/features/support/ReportProblem.tsx
//
// "Report a problem" / "Suggest a feature" (16 Nov 2026), mounted once in the
// app shell. Opening it takes a screenshot of the page as it was and keeps the
// last ~2 minutes of screen replay, errors, API calls and clicks. The user can
// also press "Record the steps": the form steps aside, a red pill shows while
// they do it again, and Stop attaches the recording. The same pill records
// steps for an existing ticket when support asks for them.

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { create } from 'zustand';
import { toast } from 'sonner';
import {
  Bug,
  Camera,
  CircleDot,
  Film,
  Lightbulb,
  Loader2,
  Square,
  Trash2,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Segmented } from '@/components/ui/segmented';
import { http, toApiError } from '@/lib/api/client';
import { supportApi } from '@/lib/api/endpoints';
import { cn } from '@/lib/utils';
import type { Severity, TicketKind } from '@/types/support';
import {
  evidenceCounts,
  installRecorder,
  noteNavigation,
  packEvents,
  replayBefore,
  snapshotContext,
  startRepro,
  stopRepro,
  takeScreenshot,
} from './recorder';

type Events = ReturnType<typeof replayBefore>;

interface ReportState {
  open: boolean;
  /** the form is hidden while the user shows the steps */
  recording: null | { for: 'new' } | { for: 'ticket'; id: string; number: number };
  kind: TicketKind;
  title: string;
  description: string;
  expected: string;
  severity: Severity;
  pageUrl: string;
  openedAt: number;
  /** when the steps recording began */
  recStarted: number;
  shot: string | null;
  before: Events;
  repro: { events: Events; ms: number } | null;
  busy: boolean;
  set: (p: Partial<ReportState>) => void;
}

const BLANK = {
  title: '',
  description: '',
  expected: '',
  severity: 'MEDIUM' as Severity,
  shot: null,
  before: [] as Events,
  repro: null,
};

export const useReport = create<ReportState>(set => ({
  open: false,
  recording: null,
  kind: 'BUG',
  pageUrl: '',
  openedAt: 0,
  recStarted: 0,
  busy: false,
  ...BLANK,
  set: p => set(p),
}));

/** open the form; a bug report captures the screen first (before the form covers it) */
export const openReport = async (kind: TicketKind = 'BUG', preset?: { title?: string }) => {
  const s = useReport.getState();
  if (s.open || s.recording) return;
  const base = {
    ...BLANK,
    kind,
    title: preset?.title ?? '',
    pageUrl: location.href,
    openedAt: Date.now(),
  };
  if (kind === 'FEATURE') return s.set({ ...base, open: true });
  const t = toast.loading('Capturing the screen…');
  let shot: string | null = null;
  try {
    shot = await takeScreenshot();
  } catch {
    /* some pages can't be drawn — the replay still shows them */
  }
  toast.dismiss(t);
  s.set({ ...base, shot, before: replayBefore(), open: true });
};

/** support asked for the steps: record them and attach to the ticket */
export const recordForTicket = async (id: string, number: number) => {
  await startRepro();
  useReport.getState().set({ recording: { for: 'ticket', id, number }, recStarted: Date.now() });
  toast.info('Recording — now do the steps that cause the problem, then press Stop.');
};

const kb = (b64: string) => Math.round((b64.length * 0.75) / 1024);
const mmss = (ms: number) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function SupportRoot() {
  const pathname = usePathname();
  useEffect(() => installRecorder(http), []);
  useEffect(() => {
    // after the page has its title
    const t = setTimeout(() => noteNavigation(pathname), 300);
    return () => clearTimeout(t);
  }, [pathname]);
  // Ctrl+Shift+B — report a bug from anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        void openReport('BUG');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <>
      <ReportDialog />
      <RecordingPill />
    </>
  );
}

function ReportDialog() {
  const s = useReport();
  const bug = s.kind === 'BUG';
  const [counts, setCounts] = useState(() => ({ errors: 0, failed: 0, steps: 0 }));
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the recorder once per opening
    if (s.open) setCounts(evidenceCounts());
  }, [s.open]);

  const close = () => s.set({ open: false });

  const showSteps = async () => {
    await startRepro();
    s.set({ open: false, recording: { for: 'new' }, recStarted: Date.now() });
    toast.info('Recording — do the steps that cause the problem, then press Stop.');
  };

  const send = async () => {
    if (s.title.trim().length < 3) return toast.error('Give it a short title (3+ letters).');
    s.set({ busy: true });
    try {
      // the reproduction is the better replay; otherwise the minutes before reporting
      const events = s.repro?.events.length ? s.repro.events : s.before;
      const replay = bug && events.length ? await packEvents(events) : undefined;
      const replayMs =
        events.length > 1 ? events[events.length - 1]!.timestamp - events[0]!.timestamp : undefined;
      const t = await supportApi.create({
        kind: s.kind,
        title: s.title.trim(),
        description: s.description.trim() || undefined,
        expected: bug ? s.expected.trim() || undefined : undefined,
        severity: bug ? s.severity : undefined,
        pageUrl: s.pageUrl,
        context: bug
          ? snapshotContext(s.openedAt - 10 * 60_000)
          : { page: { url: location.pathname } },
        screenshot: bug && s.shot ? s.shot : undefined,
        replay,
        replayMs,
      });
      s.set({ open: false, busy: false, ...BLANK });
      // the link can be shared with a teammate ("same problem as #12")
      const link = `${location.origin}/support/${t.id}`;
      toast.success(`${bug ? 'Problem' : 'Idea'} #${t.number} sent — thank you!`, {
        description: 'Share the link so others can follow it or add to it.',
        duration: 10_000,
        action: {
          label: 'Copy link',
          onClick: () =>
            void navigator.clipboard
              .writeText(link)
              .then(() => toast.success(`Link to #${t.number} copied`)),
        },
        cancel: { label: 'View', onClick: () => (location.href = `/support/${t.id}`) },
      });
    } catch (e) {
      s.set({ busy: false });
      toast.error(toApiError(e).message);
    }
  };

  return (
    <Dialog open={s.open} onOpenChange={o => !o && !s.busy && close()}>
      <DialogContent className="sm:max-w-xl" data-support-ui="">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {bug ? (
              <Bug className="size-4 text-destructive" />
            ) : (
              <Lightbulb className="size-4 text-amber-500" />
            )}
            {bug ? 'Report a problem' : 'Suggest a feature'}
          </DialogTitle>
          <DialogDescription>
            {bug
              ? 'Tell us what went wrong. We attach a screenshot and a short replay of your screen so we can see it exactly.'
              : 'Tell us what would make your work easier. Ideas go to the product list, not the bug queue.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Segmented
            value={s.kind}
            onChange={k => s.set({ kind: k })}
            options={[
              { value: 'BUG', label: 'Something is wrong', icon: Bug },
              { value: 'FEATURE', label: 'An idea / new feature', icon: Lightbulb },
            ]}
          />
          <Input
            autoFocus
            value={s.title}
            onChange={e => s.set({ title: e.target.value })}
            placeholder={
              bug ? 'e.g. Saving a SPOC shows an error' : 'e.g. Export SPOCs with their meetings'
            }
            maxLength={200}
          />
          <Textarea
            value={s.description}
            onChange={e => s.set({ description: e.target.value })}
            placeholder={
              bug
                ? 'What did you do, and what happened?'
                : 'What should it do, and why would it help?'
            }
            rows={3}
            maxLength={5000}
          />
          {bug && (
            <>
              <Textarea
                value={s.expected}
                onChange={e => s.set({ expected: e.target.value })}
                placeholder="What did you expect instead? (optional)"
                rows={2}
                maxLength={3000}
              />
              <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className="text-muted-foreground">How bad is it?</span>
                <Segmented
                  size="xs"
                  value={s.severity}
                  onChange={v => s.set({ severity: v })}
                  options={[
                    { value: 'LOW', label: 'Minor' },
                    { value: 'MEDIUM', label: 'Annoying' },
                    { value: 'HIGH', label: 'Blocks part of my work' },
                    { value: 'BLOCKER', label: 'Can’t work' },
                  ]}
                />
              </div>

              {/* what gets attached — visible, removable */}
              <div className="space-y-2 rounded-lg border bg-muted/30 p-2.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Attached</p>
                <div className="flex gap-3">
                  {s.shot ? (
                    <div className="relative shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL */}
                      <img
                        src={`data:image/jpeg;base64,${s.shot}`}
                        alt="Screenshot"
                        className="h-20 w-32 rounded border object-cover object-top"
                      />
                      <button
                        type="button"
                        onClick={() => s.set({ shot: null })}
                        title="Don't send the screenshot"
                        className="absolute -top-1.5 -right-1.5 rounded-full border bg-background p-0.5 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded border border-dashed text-xs text-muted-foreground">
                      <Camera className="mr-1 size-3.5" /> No screenshot
                    </div>
                  )}
                  <ul className="min-w-0 flex-1 space-y-1 text-[13px]">
                    {s.repro ? (
                      <li className="flex items-center gap-1.5">
                        <Video className="size-3.5 text-primary" /> Your steps, recorded (
                        {mmss(s.repro.ms)})
                        <button
                          type="button"
                          onClick={() => s.set({ repro: null })}
                          className="ml-auto text-xs text-muted-foreground hover:text-destructive"
                        >
                          remove
                        </button>
                      </li>
                    ) : s.before.length > 0 ? (
                      <li className="flex items-center gap-1.5">
                        <Film className="size-3.5 text-primary" /> Replay of the last ~2 minutes
                        <button
                          type="button"
                          onClick={() => s.set({ before: [] })}
                          className="ml-auto text-xs text-muted-foreground hover:text-destructive"
                        >
                          remove
                        </button>
                      </li>
                    ) : null}
                    <li className="text-muted-foreground">
                      {counts.errors} error{counts.errors === 1 ? '' : 's'}, {counts.failed} failed
                      request
                      {counts.failed === 1 ? '' : 's'}, your last {counts.steps} clicks — never what
                      you typed
                    </li>
                    <li className="text-muted-foreground">Browser, screen size and page</li>
                  </ul>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void showSteps()}
                  className="w-full"
                >
                  <CircleDot className="text-destructive" />
                  {s.repro ? 'Record the steps again' : 'Show us how it happens — record the steps'}
                </Button>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <Link
            href="/support"
            onClick={close}
            className="text-[13px] text-primary hover:underline"
          >
            My tickets
          </Link>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={close} disabled={s.busy}>
              Cancel
            </Button>
            <Button onClick={() => void send()} disabled={s.busy}>
              {s.busy && <Loader2 className="animate-spin" />} Send
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecordingPill() {
  const rec = useReport(st => st.recording);
  const started = useReport(st => st.recStarted);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!rec) return;
    const t = setInterval(() => setElapsed(Date.now() - started), 1000);
    return () => clearInterval(t);
  }, [rec, started]);
  if (!rec) return null;

  const stop = async () => {
    const { events, ms } = stopRepro();
    const s = useReport.getState();
    if (rec.for === 'new') {
      s.set({ recording: null, open: true, repro: { events, ms } });
      return;
    }
    setBusy(true);
    try {
      const replay = await packEvents(events);
      await supportApi.addRecording(rec.id, {
        replay,
        replayMs: ms,
        context: snapshotContext(s.recStarted - 60_000),
      });
      toast.success(`Steps attached to #${rec.number} (${kb(replay)} KB) — thank you!`);
    } catch (e) {
      toast.error(toApiError(e).message);
    }
    setBusy(false);
    s.set({ recording: null });
  };

  return (
    <div
      data-support-ui=""
      className="fixed bottom-[calc(6rem+var(--mobile-nav-h))] left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-full border border-destructive/40 bg-popover py-1.5 pr-1.5 pl-4 shadow-float"
    >
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive/60" />
        <span className="relative inline-flex size-2.5 rounded-full bg-destructive" />
      </span>
      <span className="text-sm font-medium">
        Recording {rec.for === 'ticket' ? `for #${rec.number}` : 'your steps'} ·{' '}
        <span className="tabular">{mmss(elapsed)}</span>
      </span>
      <span className="hidden text-xs text-muted-foreground sm:inline">
        do what you did when it went wrong
      </span>
      <Button
        size="sm"
        variant="destructive"
        className={cn('rounded-full')}
        onClick={() => void stop()}
        disabled={busy}
      >
        {busy ? <Loader2 className="animate-spin" /> : <Square className="fill-current" />} Stop
      </Button>
    </div>
  );
}
