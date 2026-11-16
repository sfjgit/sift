// File: AiDock.tsx
// Path: src/components/ai/AiDock.tsx
//
// The assistant on every page. Two shapes, so it never hides the page for
// nothing:
//   • a small answer card over the page — for a spoken / quick question whose
//     answer is words ("explain this", a "do you mean…?") or something done on
//     the page (filters applied, stats opened);
//   • the full-screen workspace — only when there is a report (canvas) to look
//     at, or when it is opened on purpose (the Canvas button).
// Ask with openAiDock(prompt) from features/ai/speech; openAiDock() opens the
// workspace.

'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Check, Loader2, Maximize2, Sparkles, Undo2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { MarkdownLite } from '@/components/common/MarkdownLite';
import { APPLY_URL_EVENT } from '@/components/data-table/useTableState';
import dynamic from 'next/dynamic';
import { areaOf, readActive, writeActive, type Incoming } from '@/features/ai/threadArea';

// the canvas (charts, org chart) is fetched the first time the dock opens
const CanvasWorkspace = dynamic(
  () => import('@/features/ai/CanvasWorkspace').then(m => m.CanvasWorkspace),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" /> Opening the canvas…
      </div>
    ),
  }
);
import {
  AI_ASK_EVENT,
  AI_CANCEL_EVENT,
  AI_DOCK_CLOSE_EVENT,
  CANVAS_RESULT_EVENT,
  PAGE_STATS_EVENT,
  aiPending,
} from '@/features/ai/speech';
import { aiApi, recycleApi, runAiAction } from '@/lib/api/endpoints';
import { useQueryClient } from '@tanstack/react-query';
import { toApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import type { AiActionProposal, AiCanvasResult, AiTurnKind } from '@/types/ai';

interface Card {
  prompt: string;
  pending?: boolean;
  kind?: AiTurnKind;
  message?: string | null;
  options?: string[];
  proposal?: AiActionProposal;
  /** a failed request: its words, editable */
  edit?: string;
  running?: boolean;
}

const YES =
  /^(yes|yeah|yep|ok|okay|confirm|confirmed|do it|go ahead|go|sure|proceed|haan|ha|han)( please| do it| go ahead)?$/i;
const NO = /^(no|nope|cancel|stop|don'?t|do not|never ?mind|leave it)( it| please)?$/i;

const ORDINALS: Record<string, number> = {
  first: 1,
  one: 1,
  '1': 1,
  second: 2,
  two: 2,
  '2': 2,
  third: 3,
  three: 3,
  '3': 3,
  fourth: 4,
  four: 4,
  '4': 4,
  last: -1,
};
/** "the first one", "option 2", "second" → that choice of the question just asked */
const pickOption = (said: string, options: string[]) => {
  const m =
    /^(?:the |option |number |choose |pick |go with )*(first|second|third|fourth|last|one|two|three|four|[1-4])(?: one| option)?$/i.exec(
      said.trim().replace(/[.!?]/g, '')
    );
  if (!m) return null;
  const n = ORDINALS[m[1]!.toLowerCase()]!;
  return (n === -1 ? options[options.length - 1] : options[n - 1]) ?? null;
};

/** what Jarvis says aloud for a long written answer: its first line */
const spokenOf = (message: string | null) => {
  const plain = (message ?? '').replace(/[*_#]/g, '');
  const first = plain.split('\n').find(l => l.trim()) ?? '';
  return plain.length > first.length + 5
    ? `${first.trim()} The details are on screen.`
    : first.trim();
};

export function AiDock() {
  const pathname = usePathname();
  const router = useRouter();
  const onCanvasPage = pathname.startsWith('/ai-canvas');
  const [open, setOpen] = useState(false);
  const [incoming, setIncoming] = useState<Incoming | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const cardRef = useRef<Card | null>(null);
  const qc = useQueryClient();
  const openRef = useRef(false);
  // the question I last asked (and what it was about): the next thing said answers it
  const asked = useRef<{ prompt: string; question: string; options: string[] } | null>(null);
  const runRef = useRef(0);
  const pathRef = useRef(pathname);
  useEffect(() => {
    openRef.current = open;
    pathRef.current = pathname;
    cardRef.current = card;
    aiPending.action = !!card?.proposal && !card.running;
  });

  const say = (detail: AiCanvasResult) =>
    window.dispatchEvent(new CustomEvent(CANVAS_RESULT_EVENT, { detail }));

  /** run the confirmed action through the app's own endpoints; offer Undo */
  const confirmAction = useCallback(
    async (p: AiActionProposal) => {
      setCard(c => (c ? { ...c, running: true } : c));
      try {
        const r = await runAiAction(p);
        setCard(null);
        qc.invalidateQueries();
        say({ type: 'clarify', message: `Done. ${p.title}.` });
        toast.success(`Done — ${p.title}`, {
          duration: 15_000,
          ...(r.batchId && {
            action: {
              label: 'Undo',
              onClick: () =>
                void recycleApi
                  .undoBatch(r.batchId!)
                  .then(u => {
                    qc.invalidateQueries();
                    toast.success(
                      u.failed.length
                        ? `Undone (${u.failed.length} could not be)`
                        : 'Undone — everything is back as it was'
                    );
                  })
                  .catch(e => toast.error(toApiError(e).message)),
            },
          }),
        });
      } catch (e) {
        setCard(c => (c ? { ...c, running: false } : c));
        toast.error(toApiError(e).message);
      }
    },
    [qc]
  );

  /** answer without opening the workspace; it opens only if the answer is a report */
  const quickAsk = useCallback(
    async (said: string) => {
      // an action waiting for a yes / no
      const pendingAction = cardRef.current?.proposal;
      if (pendingAction && !cardRef.current?.running) {
        if (YES.test(said.trim().replace(/[.!]/g, ''))) return void confirmAction(pendingAction);
        if (NO.test(said.trim().replace(/[.!]/g, ''))) {
          setCard(null);
          say({ type: 'clarify', message: 'Cancelled. Nothing was changed.' });
          return;
        }
      }
      const path = pathRef.current;
      const area = areaOf(path);
      const last = asked.current;
      asked.current = null;
      // "the second one" → that choice; anything else is sent as the answer to my question
      const picked = last?.options.length ? pickOption(said, last.options) : null;
      const prompt = picked ?? said;
      const run = ++runRef.current;
      setCard({ prompt, pending: true });
      try {
        const threadId = readActive(area);
        const r = await aiApi.assist({
          prompt,
          ...(threadId && { threadId }),
          page: { path, query: window.location.search.slice(1, 2000), canvasShown: false },
          ...(last &&
            !picked && { context: { prompt: last.prompt, question: last.question.slice(0, 400) } }),
        });
        if (run !== runRef.current) return; // "wait" / "cancel" came in meanwhile
        if (r.action) {
          if (r.action.type === 'stats') window.dispatchEvent(new CustomEvent(PAGE_STATS_EVENT));
          else if (r.action.url.startsWith('/ai-canvas')) {
            setCard(null);
            setIncoming({ prompt, n: Date.now() });
            return setOpen(true);
          } else {
            const url = r.action.url;
            router.push(url);
            window.setTimeout(
              () => window.dispatchEvent(new CustomEvent(APPLY_URL_EVENT, { detail: url })),
              60
            );
          }
          if (r.message) toast.success(r.message, { duration: 6000 });
          say({ type: 'clarify', message: r.message ?? 'Done.' });
          return setCard(null);
        }
        if (r.kind === 'canvas' && r.canvas && r.thread) {
          // a report: this is what the workspace is for
          writeActive(area, r.thread.id);
          say({ type: 'canvas', spec: r.canvas.spec, blocks: r.canvas.blocks });
          setCard(null);
          setIncoming(null);
          return setOpen(true);
        }
        if (r.kind === 'action' && r.proposal) {
          say({
            type: 'clarify',
            message: `${r.message ?? r.proposal.title} Say yes to do it, or no.`,
          });
          return setCard({ prompt, kind: 'action', message: r.message, proposal: r.proposal });
        }
        if (r.kind === 'new') writeActive(area, null);
        if (r.kind === 'clarify')
          asked.current = {
            prompt: last && !picked ? last.prompt : prompt,
            question: r.message ?? '',
            options: r.options ?? [],
          };
        say({ type: 'clarify', message: spokenOf(r.message) });
        setCard({
          prompt,
          kind: r.kind,
          message: r.message,
          ...(r.options && { options: r.options }),
          ...((r.kind === 'error' || r.kind === 'rejected') && { edit: prompt }),
        });
      } catch (e) {
        if (run !== runRef.current) return;
        const message = toApiError(e).message;
        say({ type: 'error', message });
        setCard({ prompt, kind: 'error', message, edit: prompt });
      }
    },
    [router, confirmAction]
  );

  useEffect(() => {
    const onAsk = (e: Event) => {
      const prompt = ((e as CustomEvent<{ prompt?: string }>).detail?.prompt ?? '').trim();
      if (onCanvasPage) return; // the full-screen page answers by itself
      if (!prompt) {
        setCard(null);
        setIncoming(null);
        return setOpen(true);
      }
      // workspace already open → it is a message in that conversation
      if (openRef.current) return setIncoming({ prompt, n: Date.now() });
      void quickAsk(prompt);
    };
    window.addEventListener(AI_ASK_EVENT, onAsk);
    return () => window.removeEventListener(AI_ASK_EVENT, onAsk);
  }, [onCanvasPage, quickAsk]);

  useEffect(() => {
    // "close" shuts whatever is showing; "wait" / "cancel" also drops an answer still on its way
    const close = () => {
      setOpen(false);
      setCard(null);
    };
    const cancel = () => {
      runRef.current++;
      asked.current = null;
      setCard(c => (c?.pending ? null : c));
    };
    window.addEventListener(AI_DOCK_CLOSE_EVENT, close);
    window.addEventListener(AI_CANCEL_EVENT, cancel);
    return () => {
      window.removeEventListener(AI_DOCK_CLOSE_EVENT, close);
      window.removeEventListener(AI_CANCEL_EVENT, cancel);
    };
  }, []);

  if (onCanvasPage) return null;
  return (
    <>
      {/* the answer card: over the page, never hiding it */}
      {card && !open && (
        <aside
          role="status"
          aria-label="Assistant answer"
          className="fixed right-5 bottom-24 z-[55] flex max-h-[70vh] w-[min(460px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-xl border bg-card shadow-2xl print:hidden"
        >
          <header className="flex shrink-0 items-center gap-2 border-b bg-surface px-3 py-2">
            <Sparkles className="size-4 shrink-0 text-primary" />
            <p className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
              “{card.prompt}”
            </p>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setCard(null)}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {card.pending ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Working on it…
              </p>
            ) : card.kind === 'explain' ? (
              <MarkdownLite text={card.message} className="text-[14px]" />
            ) : (
              <p
                className={cn(
                  'text-[14px] leading-relaxed whitespace-pre-line',
                  card.kind === 'error' && 'text-destructive'
                )}
              >
                {card.message}
              </p>
            )}
            {!card.pending && card.edit !== undefined && (
              <form
                className="mt-3 space-y-2"
                onSubmit={e => {
                  e.preventDefault();
                  if (card.edit?.trim()) void quickAsk(card.edit.trim());
                }}
              >
                <p className="text-[11px] font-medium text-muted-foreground">
                  Fix the wording and send again:
                </p>
                <textarea
                  autoFocus
                  rows={2}
                  value={card.edit}
                  onChange={e => setCard(c => (c ? { ...c, edit: e.target.value } : c))}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (card.edit?.trim()) void quickAsk(card.edit.trim());
                    }
                  }}
                  className="w-full resize-none rounded-lg border bg-background px-2.5 py-1.5 text-[14px] outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
                <div className="flex justify-end">
                  <Button size="sm" type="submit" disabled={!card.edit?.trim()}>
                    Send again
                  </Button>
                </div>
              </form>
            )}
            {!card.pending && card.proposal && (
              <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <p className="text-[14px] font-semibold">{card.proposal.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{card.proposal.detail}</p>
                <ul className="mt-2 space-y-0.5 text-[13px]">
                  {card.proposal.sample.map(n => (
                    <li key={n} className="truncate">
                      • {n}
                    </li>
                  ))}
                  {card.proposal.count > card.proposal.sample.length && (
                    <li className="text-xs text-muted-foreground">
                      …and {card.proposal.count - card.proposal.sample.length} more
                    </li>
                  )}
                </ul>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    disabled={card.running}
                    onClick={() => void confirmAction(card.proposal!)}
                  >
                    {card.running ? <Loader2 className="animate-spin" /> : <Check />} Yes, do it
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={card.running}
                    onClick={() => setCard(null)}
                  >
                    Cancel
                  </Button>
                  <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Undo2 className="size-3" /> You can undo it after
                  </span>
                </div>
              </div>
            )}
            {!card.pending && !!card.options?.length && (
              <div className="mt-2.5 flex flex-col items-start gap-1.5">
                {card.options.map(o => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => void quickAsk(o)}
                    className="rounded-lg border bg-background px-3 py-1.5 text-left text-[13px] hover:border-primary/50 hover:bg-primary/5"
                  >
                    {o}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!card.pending && (
            <footer className="flex shrink-0 items-center justify-between gap-2 border-t px-3 py-2">
              <span className="text-[11px] text-muted-foreground">
                {card.kind === 'action'
                  ? 'Say “yes” to do it, or “no”.'
                  : card.kind === 'clarify'
                    ? 'Just answer — or say “the first one”.'
                    : 'Keep talking, or say “close”.'}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setCard(null);
                  setIncoming(null);
                  setOpen(true);
                }}
              >
                <Maximize2 /> Open the assistant
              </Button>
            </footer>
          )}
        </aside>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-screen gap-0 bg-background p-0 data-[side=right]:w-screen data-[side=right]:max-w-none data-[side=right]:border-l-0 data-[side=right]:sm:max-w-none"
        >
          <SheetTitle className="sr-only">AI assistant</SheetTitle>
          <SheetDescription className="sr-only">
            Ask for a report and refine it without leaving this page.
          </SheetDescription>
          {open && (
            <Suspense fallback={null}>
              <CanvasWorkspace variant="dock" incoming={incoming} />
            </Suspense>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
