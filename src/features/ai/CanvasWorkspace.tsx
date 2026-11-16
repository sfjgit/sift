// File: CanvasWorkspace.tsx
// Path: src/features/ai/CanvasWorkspace.tsx
//
// AI Canvas (beta): describe a report in plain words, the AI picks blocks from
// the report catalogue, the backend runs them and we render the canvas.
// Read-only — numbers come straight from the CRM; the AI never sees the data.
//   • ?prompt=… (sent by the command bar) generates once on load, then clears
//   • saved templates re-run for free (no AI call) — they work in basic mode too
//   • export: Excel / PowerPoint are server files; PDF = server audit + print

'use client';

import { APPLY_URL_EVENT } from '@/components/data-table/useTableState';
import { areaOf, readActive, writeActive, type Incoming } from './threadArea';
import {
  AI_ASK_EVENT,
  AI_DOCK_CLOSE_EVENT,
  AI_PREV_CANVAS_EVENT,
  CANVAS_FOCUS_EVENT,
  CANVAS_RESULT_EVENT,
  PAGE_STATS_EVENT,
  VOICE_DRAFT_EVENT,
  canvasFocus,
} from '@/features/ai/speech';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  X,
  ArrowRight,
  BarChart3,
  BookOpenText,
  Bookmark,
  Hash,
  History,
  Network,
  LineChart as LineChartIcon,
  MoveHorizontal,
  Pencil,
  PieChart as PieChartIcon,
  Pin,
  Plus,
  Send,
  Table2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Globe2,
  Info,
  Loader2,
  Lock,
  MessageCircleQuestion,
  Presentation,
  RotateCw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/common/PageHeader';
import { Pill } from '@/components/common/badges';
import { EmptyState, ErrorState } from '@/components/common/states';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { AiCanvas } from '@/components/ai/AiCanvas';
import { MarkdownLite } from '@/components/common/MarkdownLite';
import { aiApi } from '@/lib/api/endpoints';
import { toApiError } from '@/lib/api/client';
import { fmtDate, fmtNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import type {
  AiCanvasResult,
  AiCanvasSpec,
  AiCanvasView,
  AiComponent,
  AiSpecBlock,
  AiThreadRef,
  AiTurn,
  AiTurnKind,
  AiWidth,
  AiMe,
  AiQuota,
  AiRenderedBlock,
  AiReportTemplate,
} from '@/types/ai';

const ME_KEY = ['ai', 'me'] as const;
const TEMPLATES_KEY = ['ai', 'canvas-templates'] as const;
const THREADS_KEY = ['ai', 'threads'] as const;
const DEFAULT_MAX = 500;

const EXAMPLES = [
  'CSR spent by FY and top 10 clients by CSR spend',
  'Clients by industry and new clients per month this year',
  'SPOCs by sales status for my clients',
  'Pipeline runs per day last 30 days and by status',
];

const PERIOD_WORD = { DAY: 'today', WEEK: 'this week', MONTH: 'this month' } as const;

const quotaLine = (q?: AiQuota | null) => {
  if (!q) return null;
  if (q.max === null) return `${fmtNumber(q.used)} used · unlimited`;
  return `${fmtNumber(q.used)} / ${fmtNumber(q.max)} ${q.period ? PERIOD_WORD[q.period] : ''}`.trim();
};

interface Shown {
  spec: AiCanvasSpec;
  blocks: AiRenderedBlock[];
  prompt?: string;
  templateId?: string;
  matched?: { label: string; kind: string }[];
}


// ── access gate ──────────────────────────────────────────────────────────────

function NotAllowed({ me }: { me: AiMe }) {
  const why =
    me.reason === 'kill_switch'
      ? 'The AI assistant is switched off for everyone right now.'
      : me.reason === 'org_off' || !me.enabled
        ? 'AI Canvas isn’t enabled for your organisation.'
        : 'AI Canvas isn’t enabled for your role. Ask an admin if you need it.';
  return (
    <EmptyState
      icon={Lock}
      title="AI Canvas isn’t available to you"
      description={why}
      className="min-h-[60vh]"
    />
  );
}

function TurnOn({ onDone }: { onDone: () => void }) {
  const turnOn = useMutation({
    mutationFn: () => aiApi.setPreference('CANVAS'),
    onSuccess: () => {
      toast.success('AI Canvas is on');
      onDone();
    },
    onError: e => toast.error(toApiError(e).message),
  });
  return (
    <EmptyState
      icon={Sparkles}
      title="AI Canvas is off for you"
      description="Describe a report in plain words and get charts and tables built from live CRM numbers. It’s read-only: it can’t change anything, and the AI only sees the report catalogue — never your data."
      action={
        <Button onClick={() => turnOn.mutate()} disabled={turnOn.isPending}>
          {turnOn.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
          Turn on AI Canvas
        </Button>
      }
      className="min-h-[60vh]"
    />
  );
}

// ── save as template ─────────────────────────────────────────────────────────

function SaveDialog({
  open,
  onOpenChange,
  shown,
  canShare,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  shown: Shown;
  canShare: boolean;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(shown.spec.title);
  const [shared, setShared] = useState(false);
  const save = useMutation({
    mutationFn: () =>
      aiApi.saveTemplate({
        name: name.trim(),
        prompt: shown.prompt,
        spec: shown.spec,
        ...(canShare && { isShared: shared }),
      }),
    onSuccess: () => {
      toast.success('Saved — find it under Saved canvases');
      qc.invalidateQueries({ queryKey: TEMPLATES_KEY });
      onOpenChange(false);
    },
    onError: e => toast.error(toApiError(e).message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save as template</DialogTitle>
          <DialogDescription>
            Saved canvases re-run with fresh numbers whenever you open them — no AI call, no quota
            used.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault();
            if (name.trim()) save.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name">Name</Label>
            <Input
              id="tpl-name"
              value={name}
              maxLength={120}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>
          {canShare && (
            <label className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
              <span>
                <span className="block text-sm font-medium">Share with everyone</span>
                <span className="block text-xs text-muted-foreground">
                  Others see the layout; numbers still follow their own access.
                </span>
              </span>
              <Switch checked={shared} onCheckedChange={setShared} />
            </label>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || save.isPending}>
              {save.isPending ? <Loader2 className="animate-spin" /> : <Save />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── saved canvases (side sheet) ──────────────────────────────────────────────

function TemplatesSheet({
  open,
  onOpenChange,
  onOpen,
  opening,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onOpen: (t: AiReportTemplate) => void;
  opening?: string;
}) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const list = useQuery({ queryKey: TEMPLATES_KEY, queryFn: aiApi.templates, enabled: open });

  const remove = async (t: AiReportTemplate) => {
    if (
      !(await confirm({ title: `Delete “${t.name}”?`, destructive: true, confirmLabel: 'Delete' }))
    )
      return;
    try {
      await aiApi.deleteTemplate(t.id);
      toast.success('Template deleted');
      qc.invalidateQueries({ queryKey: TEMPLATES_KEY });
    } catch (e) {
      toast.error(toApiError(e).message);
    }
  };

  const mine = list.data?.filter(t => t.mine) ?? [];
  const shared = list.data?.filter(t => !t.mine) ?? [];

  const row = (t: AiReportTemplate) => (
    <li key={t.id} className="group flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={() => onOpen(t)}
        disabled={!!opening}
      >
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <span className="truncate">{t.name}</span>
          {t.isShared && <Globe2 className="size-3.5 shrink-0 text-muted-foreground" />}
          {opening === t.id && <Loader2 className="size-3.5 shrink-0 animate-spin" />}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {t.spec.blocks.length} block{t.spec.blocks.length === 1 ? '' : 's'}
          {!t.mine && t.createdBy ? ` · by ${t.createdBy}` : ''} · {fmtDate(t.updatedAt)}
        </span>
      </button>
      {t.mine && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${t.name}`}
          className="text-muted-foreground hover:text-destructive"
          onClick={() => remove(t)}
        >
          <Trash2 />
        </Button>
      )}
    </li>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Saved canvases</SheetTitle>
          <SheetDescription>
            Opening one re-runs it with today’s numbers — free, no AI involved.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-6">
          {list.isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map(i => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : list.isError ? (
            <ErrorState error={list.error} onRetry={() => list.refetch()} />
          ) : !list.data?.length ? (
            <EmptyState
              compact
              icon={Bookmark}
              title="No saved canvases yet"
              description="Build a canvas, then use “Save as template” to keep it."
            />
          ) : (
            <>
              {mine.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-xs font-medium text-muted-foreground">Mine</h3>
                  <ul className="space-y-1.5">{mine.map(row)}</ul>
                </section>
              )}
              {shared.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-xs font-medium text-muted-foreground">Shared with me</h3>
                  <ul className="space-y-1.5">{shared.map(row)}</ul>
                </section>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── print (PDF) ──────────────────────────────────────────────────────────────

const PRINT_CSS = `
@media screen {
  #ai-canvas-print { position: fixed; left: -10000px; top: 0; width: 700px; pointer-events: none; }
}
@media print {
  @page { margin: 12mm; }
  html, body { height: auto !important; overflow: visible !important; }
  body > *:not(#ai-canvas-print) { display: none !important; }
  #ai-canvas-print { display: block; position: static; width: 700px; margin: 0 auto;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`;

/** off-screen copy of the canvas at a fixed page width; only it prints */
function PrintCopy({ shown, footer }: { shown: Shown; footer: string }) {
  return createPortal(
    <div id="ai-canvas-print" className="bg-background p-1 text-foreground" aria-hidden>
      <h1 className="mb-3 text-lg font-bold">{shown.spec.title}</h1>
      <AiCanvas blocks={shown.blocks} printable />
      <p className="mt-4 border-t pt-2 text-[11px] text-muted-foreground">{footer}</p>
    </div>,
    document.body
  );
}

// ── workspace ────────────────────────────────────────────────────────────────

const UUID_TAIL = /\/[0-9a-f]{8}-[0-9a-f-]{27}$/i;
/** "/spocs/<id>" → "this SPOC", "/clients" → "the Clients page" */
const pageLabel = (path: string) => {
  const one = UUID_TAIL.test(path);
  if (path.startsWith('/clients')) return one ? 'this client' : 'the Clients page';
  if (path.startsWith('/spocs')) return one ? 'this SPOC' : 'the SPOCs page';
  return `the ${path.split('/')[1]?.replace(/-/g, ' ') || 'home'} page`;
};

/** what makes sense to ask on this page — the first ones act on the page itself */
const startersFor = (path: string) => {
  if (UUID_TAIL.test(path) && (path.startsWith('/clients/') || path.startsWith('/spocs/')))
    return ['Explain this', 'Give me a summary'];
  if (path === '/clients')
    return ['Explain this', 'Show stats', 'Show active clients', 'Clients with no SPOCs', 'Top 10 clients by CSR spend'];
  if (path === '/spocs')
    return ['Explain this', 'Show stats', 'Show my SPOCs', 'SPOCs by sales status', 'Clear filters'];
  if (path.startsWith('/pipeline')) return ['Pipeline runs per day last 30 days', 'Pipeline runs by status'];
  return ['Explain this', ...EXAMPLES.slice(0, 3)];
};

const FOLLOW_UPS = ['Explain this report', 'Show it as a table', 'Only the top 5', 'Add a trend over time'];

const CHART_FOR: Record<string, AiComponent[]> = {
  single: ['kpi'],
  series: ['bar', 'line', 'pie', 'table'],
  rows: ['table'],
  tree: ['org'],
};
const CHART_ICON: Record<AiComponent, typeof BarChart3> = {
  kpi: Hash,
  bar: BarChart3,
  line: LineChartIcon,
  pie: PieChartIcon,
  table: Table2,
  org: Network,
};
const WIDTH_NEXT: Record<AiWidth, AiWidth> = { third: 'half', half: 'full', full: 'third' };

const usePathnameSafe = () => usePathname() ?? '/';

/** "go back", "previous canvas", "back to the last report" — inside the assistant, never leaves it */
export const PREVIOUS_RE =
  /^(please )?((go |take me |get )?back( again)?( to)?( the| my)?( previous| last| old| earlier| prior)?( canvas| report| chart| one| chat| conversation| screen| page)?|(go to |open |show |take me to )?(the |my )?(previous|last|earlier|prior) (canvas|report|chart|one|chat|conversation|screen|page))( please)?$/i;

/** a reply that was not saved in a thread (errors before the first canvas, "new chat") */
interface LocalNote {
  id: string;
  input: string;
  kind: AiTurnKind;
  message: string | null;
  options?: string[];
}

function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-[14px] whitespace-pre-line text-primary-foreground">
        {children}
      </p>
    </div>
  );
}

function Reply({
  kind,
  message,
  options,
  tier,
  onPick,
  disabled,
}: {
  kind: AiTurnKind;
  message: string | null;
  options?: string[] | null;
  tier?: string;
  onPick: (text: string) => void;
  disabled: boolean;
}) {
  const Icon =
    kind === 'clarify'
      ? MessageCircleQuestion
      : kind === 'rejected'
        ? Lock
        : kind === 'error'
          ? AlertTriangle
          : kind === 'explain'
            ? BookOpenText
            : Sparkles;
  return (
    <div className="flex gap-2.5">
      <span
        className={cn(
          'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg',
          kind === 'error'
            ? 'bg-destructive/10 text-destructive'
            : kind === 'rejected'
              ? 'bg-warning/15 text-warning'
              : 'bg-primary/10 text-primary'
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        {kind === 'explain' ? (
          <MarkdownLite text={message} className="text-[14px]" />
        ) : (
          <p className="text-[14px] leading-relaxed whitespace-pre-line">{message}</p>
        )}
        {kind === 'clarify' && !!options?.length && (
          <div className="mt-2 flex flex-col items-start gap-1.5">
            {options.map(o => (
              <button
                key={o}
                type="button"
                disabled={disabled}
                onClick={() => onPick(o)}
                className="rounded-lg border bg-card px-3 py-1.5 text-left text-[13px] transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
              >
                {o}
              </button>
            ))}
            <span className="text-xs text-muted-foreground">…or type what you meant.</span>
          </div>
        )}
        {(tier === 'memory' || (tier === 'local' && kind === 'explain')) && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            {tier === 'memory' ? 'Answered from memory — no AI call' : 'Read from live numbers — no AI call'}
          </p>
        )}
      </div>
    </div>
  );
}

function Workspace({ me, variant, incoming }: { me: AiMe; variant: 'page' | 'dock'; incoming?: Incoming | null }) {
  const here = usePathnameSafe();
  const area = variant === 'page' ? '/ai-canvas' : areaOf(here);
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const urlPrompt = variant === 'page' ? params.get('prompt') : null;
  const maxChars = me.maxInputChars || DEFAULT_MAX;
  const dock = variant === 'dock';

  const [activeId, setActiveId] = useState<string | null>(null);
  const [thread, setThread] = useState<AiThreadRef | null>(null);
  const [turns, setTurns] = useState<AiTurn[]>([]);
  const [canvas, setCanvas] = useState<AiCanvasView | null>(null);
  const [matched, setMatched] = useState<{ label: string; kind: string }[]>([]);
  const [notes, setNotes] = useState<LocalNote[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [quota, setQuota] = useState<AiQuota | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [saveOpen, setSaveOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [printFooter, setPrintFooter] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  // the reports visited in this session, newest last — "go back" walks it
  const visited = useRef<string[]>([]);
  // the feed: each new report in this session is a card below the last one (follow-ups update it)
  const [feed, setFeed] = useState<{ id: string; title: string; blocks: number; at: number }[]>([]);
  const latestRef = useRef<HTMLDivElement>(null);
  const feedEnd = useRef<HTMLDivElement>(null);
  const askedRef = useRef<{ prompt: string; question: string } | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  // the words behind my last "do you mean…" (inside a saved conversation)
  const clarifiedRef = useRef<string | null>(null);

  const refreshMe = () => qc.invalidateQueries({ queryKey: ME_KEY });
  const refreshList = () => {
    qc.invalidateQueries({ queryKey: THREADS_KEY });
    qc.invalidateQueries({ queryKey: ['ai', 'suggestions'] });
  };
  const history = useQuery({ queryKey: [...THREADS_KEY, search], queryFn: () => aiApi.threads(search || undefined) });
  // one click instead of saying it again: my top 5 + good questions for the page behind
  const suggest = useQuery({ queryKey: ['ai', 'suggestions', pathname], queryFn: () => aiApi.suggestions(pathname), staleTime: 60_000 });

  const reset = () => {
    if (activeId) visited.current = [...visited.current.filter(x => x !== activeId), activeId];
    setActiveId(null);
    writeActive(area, null);
    setThread(null);
    setTurns([]);
    setCanvas(null);
    setMatched([]);
  };

  const load = async (id: string, quiet = false, remember = true) => {
    if (remember && activeId && activeId !== id) visited.current = [...visited.current.filter(x => x !== activeId), activeId];
    setLoadingThread(true);
    try {
      const t = await aiApi.thread(id);
      setActiveId(t.id);
      writeActive(area, t.id);
      setThread(t);
      setTurns(t.turns);
      setCanvas(t.canvas);
      setMatched([]);
      setNotes([]);
      setHistoryOpen(false);
      if (t.stale) toast.info('This saved canvas no longer matches your access — ask again to rebuild it.');
    } catch (e) {
      reset();
      if (!quiet) toast.error(toApiError(e).message);
    } finally {
      setLoadingThread(false);
    }
  };

  useEffect(() => {
    if (!canvas || !activeId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the feed mirrors which report is current
    setFeed(f => {
      const rest = f.filter(x => x.id !== activeId);
      const moved = f.length > 0 && f[f.length - 1]!.id !== activeId;
      const next = [...rest, { id: activeId, title: canvas.spec.title, blocks: canvas.spec.blocks.length, at: Date.now() }].slice(-12);
      if (moved || !f.length) window.setTimeout(() => latestRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      return next;
    });
  }, [canvas, activeId]);

  // while this workspace is on screen, spoken requests are follow-ups for it
  useEffect(() => {
    canvasFocus.on = true;
    window.dispatchEvent(new CustomEvent(CANVAS_FOCUS_EVENT, { detail: true }));
    return () => {
      canvasFocus.on = false;
      window.dispatchEvent(new CustomEvent(CANVAS_FOCUS_EVENT, { detail: false }));
    };
  }, []);

  // come back to the conversation you were in
  useEffect(() => {
    const id = readActive(area);
    if (id) void load(id, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const say = (detail: AiCanvasResult) => window.dispatchEvent(new CustomEvent(CANVAS_RESULT_EVENT, { detail }));

  const ask = useMutation({
    mutationFn: (prompt: string) =>
      aiApi.assist({
        prompt,
        ...(activeId && { threadId: activeId }),
        // the page behind the panel: where you are, the filters on it, and whether a canvas is showing
        // inCanvas: while this is open nothing navigates away — filters and stats become report changes
        page: { path: pathname, query: window.location.search.slice(1, 2000), canvasShown: !!canvas, inCanvas: true },
        // answering a question I asked outside a saved thread ("which Rahul?")
        ...(askedRef.current && { context: askedRef.current }),
        ...(clarifiedRef.current && !askedRef.current && { learnFrom: clarifiedRef.current }),
      }),
    onMutate: prompt => {
      setPending(prompt);
      typedRef.current = false;
      setHearing(false);
      setDraft('');
    },
    onSuccess: (r, prompt) => {
      setPending(null);
      askedRef.current =
        r.kind === 'clarify' && !r.turn ? { prompt: askedRef.current?.prompt ?? prompt, question: (r.message ?? '').slice(0, 400) } : null;
      clarifiedRef.current = r.kind === 'clarify' && r.turn ? (clarifiedRef.current ?? prompt) : null;
      if (r.quota) setQuota(r.quota);
      // the voice assistant reads the outcome out
      say(
        r.kind === 'canvas' && r.canvas
          ? { type: 'canvas', spec: r.canvas.spec, blocks: r.canvas.blocks }
          : { type: 'clarify', message: (r.message ?? '').replace(/[*_#-]/g, '').slice(0, 400) }
      );
      // something to do on the page itself: do it, and get out of the way so it can be seen
      if (r.action) {
        if (r.action.type === 'stats') window.dispatchEvent(new CustomEvent(PAGE_STATS_EVENT));
        else if (r.action.url.startsWith('/ai-canvas')) {
          // never bounce into the canvas page from inside it (that was the endless loop)
          setNotes(n => [...n, { id: crypto.randomUUID(), input: prompt, kind: 'clarify', message: 'Tell me what the report should show — for example “clients by industry”.' }]);
          return;
        } else {
          const url = r.action.url;
          router.push(url);
          window.setTimeout(() => window.dispatchEvent(new CustomEvent(APPLY_URL_EVENT, { detail: url })), 60);
        }
        if (r.message) toast.success(r.message, { duration: 6000 });
        if (dock) window.dispatchEvent(new Event(AI_DOCK_CLOSE_EVENT));
        setNotes(n => [...n, { id: crypto.randomUUID(), input: prompt, kind: 'canvas', message: r.message }]);
        return;
      }
      if (r.kind === 'new') {
        reset();
        setNotes([{ id: crypto.randomUUID(), input: prompt, kind: 'new', message: r.message }]);
        return;
      }
      // didn't work → the words go back in the box to fix and send again
      if (r.kind === 'error' || r.kind === 'rejected') {
        setDraft(prompt);
        window.setTimeout(() => composerRef.current?.focus(), 30);
      }
      if (!r.thread || !r.turn) {
        // nothing was saved (an error before the first canvas)
        setNotes(n => [...n, { id: crypto.randomUUID(), input: prompt, kind: r.kind, message: r.message, ...(r.options && { options: r.options }) }]);
        return;
      }
      const moved = r.thread.id !== activeId;
      if (moved && activeId) visited.current = [...visited.current.filter(x => x !== activeId), activeId];
      setActiveId(r.thread.id);
      writeActive(area, r.thread.id);
      setThread(r.thread);
      setTurns(t => (moved ? [r.turn!] : [...t, r.turn!]));
      setNotes([]);
      if (r.canvas) {
        setCanvas(r.canvas);
        setMatched(r.matched ?? []);
      } else if (moved) setCanvas(null);
      if (r.startedNew) toast.info('That looked like a new topic, so I started a new canvas. The previous one is in your history.');
      refreshList();
      refreshMe();
    },
    onError: (e, prompt) => {
      setPending(null);
      setDraft(prompt);
      window.setTimeout(() => composerRef.current?.focus(), 30);
      const message = toApiError(e).message;
      say({ type: 'error', message });
      setNotes(n => [...n, { id: crypto.randomUUID(), input: prompt, kind: 'error', message }]);
    },
  });
  /** back to the report before this one: this session's trail first, then the history list */
  const goPrevious = () => {
    const trail = visited.current.filter(x => x !== activeId);
    let id = trail.pop() ?? null;
    visited.current = trail;
    if (!id) {
      const list = history.data ?? [];
      const at = list.findIndex(t => t.id === activeId);
      id = list[at + 1]?.id ?? (at === -1 ? list[0]?.id : undefined) ?? null;
    }
    if (!id) {
      toast.info('There is no earlier report in your history.');
      return;
    }
    void load(id, false, false);
  };

  const send = (text: string) => {
    const p = text.trim().slice(0, maxChars);
    if (!p || ask.isPending) return;
    if (PREVIOUS_RE.test(p)) {
      setDraft('');
      return goPrevious();
    }
    ask.mutate(p);
  };

  useEffect(() => {
    const prev = () => goPrevious();
    window.addEventListener(AI_PREV_CANVAS_EVENT, prev);
    return () => window.removeEventListener(AI_PREV_CANVAS_EVENT, prev);
  });

  // manual design changes — saved as a step of the conversation, no AI call
  const edit = useMutation({
    mutationFn: (v: { spec: AiCanvasSpec; note: string }) => aiApi.editThreadSpec(activeId!, v.spec, v.note),
    onSuccess: r => {
      setCanvas(r.canvas);
      setTurns(t => [...t, r.turn]);
    },
    onError: e => toast.error(toApiError(e).message),
  });
  const changeBlocks = (next: AiSpecBlock[], note: string) => {
    if (!canvas || !activeId || edit.isPending) return;
    if (!next.length) return toast.error('A canvas needs at least one block — start a new canvas instead.');
    edit.mutate({ spec: { title: canvas.spec.title, blocks: next }, note });
  };

  const refresh = useMutation({
    mutationFn: () => aiApi.thread(activeId!),
    onSuccess: t => setCanvas(t.canvas),
    onError: e => toast.error(toApiError(e).message),
  });

  const openTemplate = useMutation({
    mutationFn: (t: AiReportTemplate) => aiApi.threadFromSpec(t.spec, t.name),
    onSuccess: r => {
      setSheetOpen(false);
      refreshList();
      void load(r.thread.id);
    },
    onError: e => toast.error(toApiError(e).message),
  });

  const removeThread = async (id: string) => {
    try {
      await aiApi.deleteThread(id);
      if (id === activeId) reset();
      refreshList();
    } catch (e) {
      toast.error(toApiError(e).message);
    }
  };

  // /ai-canvas?prompt=… (old links, the command bar)
  const autoRan = useRef<string | null>(null);
  useEffect(() => {
    if (!urlPrompt) {
      autoRan.current = null;
      return;
    }
    if (autoRan.current === urlPrompt) return;
    autoRan.current = urlPrompt;
    if (!me.basicMode) send(urlPrompt);
    router.replace('/ai-canvas', { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlPrompt, me.basicMode]);

  // on the full-screen page, voice prompts arrive as an event (the side panel is not mounted here)
  useEffect(() => {
    if (variant !== 'page') return;
    const onAsk = (e: Event) => {
      const p = (e as CustomEvent<{ prompt?: string }>).detail?.prompt;
      if (p) send(p);
    };
    window.addEventListener(AI_ASK_EVENT, onAsk);
    return () => window.removeEventListener(AI_ASK_EVENT, onAsk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, activeId, ask.isPending]);

  // words being spoken appear in this box as they are heard
  const [hearing, setHearing] = useState(false);
  const typedRef = useRef(false);
  // the voice box's countdown: "sends in 2 s"
  const [sendIn, setSendIn] = useState<{ ms: number; key: number } | null>(null);
  useEffect(() => {
    const onDraft = (e: Event) => {
      // something typed by hand is never overwritten by what the mic hears
      if (typedRef.current) return;
      const d = (e as CustomEvent<{ text: string; sendInMs: number | null; key: number }>).detail;
      const text = d?.text ?? '';
      setHearing(!!text);
      setDraft(text.slice(0, maxChars));
      setSendIn(text && d?.sendInMs ? { ms: d.sendInMs, key: d.key } : null);
    };
    window.addEventListener(VOICE_DRAFT_EVENT, onDraft);
    return () => window.removeEventListener(VOICE_DRAFT_EVENT, onDraft);
  }, [maxChars]);

  // a prompt handed over by voice / another component
  const lastIncoming = useRef(0);
  useEffect(() => {
    if (!incoming || incoming.n === lastIncoming.current) return;
    lastIncoming.current = incoming.n;
    send(incoming.prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming]);

  useEffect(() => {
    feedEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [turns.length, notes.length, pending]);

  // PDF: once the print copy has laid out its charts, print, then unmount it
  useEffect(() => {
    if (!printFooter) return;
    const done = () => setPrintFooter(null);
    window.addEventListener('afterprint', done);
    const t = window.setTimeout(() => window.print(), 500);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('afterprint', done);
    };
  }, [printFooter]);

  const doExport = async (format: 'xlsx' | 'pptx' | 'pdf') => {
    if (!canvas) return;
    setExporting(format);
    try {
      const res = await aiApi.exportCanvas(canvas.spec, format);
      if (format === 'pdf' && res) setPrintFooter(res.footer);
      else toast.success(format === 'xlsx' ? 'Excel file downloaded' : 'PowerPoint downloaded');
      refreshMe();
    } catch (e) {
      toast.error(toApiError(e).message);
    } finally {
      setExporting(null);
    }
  };

  const busy = ask.isPending || edit.isPending || refresh.isPending || loadingThread;
  const basic = !!me.basicMode;
  const q = quotaLine(quota ?? me.quota.canvas);
  const empty = !turns.length && !notes.length && !pending;

  const blockTools = (b: AiRenderedBlock, i: number) => {
    if (!canvas) return null;
    const blocks = canvas.spec.blocks;
    const kinds = CHART_FOR[b.result?.kind ?? ''] ?? [b.component];
    const swap = (to: number) => {
      const next = [...blocks];
      [next[i], next[to]] = [next[to]!, next[i]!];
      changeBlocks(next, `Moved “${b.title}” ${to < i ? 'earlier' : 'later'}`);
    };
    const tool = 'rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30';
    return (
      <>
        {kinds.length > 1 &&
          kinds.map(k => {
            const Icon = CHART_ICON[k];
            return (
              <button
                key={k}
                type="button"
                title={`Show as ${k}`}
                disabled={busy}
                onClick={() =>
                  k !== b.component &&
                  changeBlocks(
                    blocks.map(x => (x.id === b.id ? { ...x, component: k } : x)),
                    `Changed “${b.title}” to a ${k}`
                  )
                }
                className={cn(tool, k === b.component && 'bg-primary/10 text-primary')}
              >
                <Icon className="size-3.5" />
              </button>
            );
          })}
        <button
          type="button"
          title={`Width: ${b.width} — click to change`}
          disabled={busy}
          onClick={() =>
            changeBlocks(
              blocks.map(x => (x.id === b.id ? { ...x, width: WIDTH_NEXT[b.width] } : x)),
              `Resized “${b.title}” to ${WIDTH_NEXT[b.width]} width`
            )
          }
          className={tool}
        >
          <MoveHorizontal className="size-3.5" />
        </button>
        <button type="button" title="Move earlier" disabled={busy || i === 0} onClick={() => swap(i - 1)} className={tool}>
          <ArrowLeft className="size-3.5" />
        </button>
        <button type="button" title="Move later" disabled={busy || i === blocks.length - 1} onClick={() => swap(i + 1)} className={tool}>
          <ArrowRight className="size-3.5" />
        </button>
        <button
          type="button"
          title="Remove this block"
          disabled={busy}
          onClick={() => changeBlocks(blocks.filter(x => x.id !== b.id), `Removed “${b.title}”`)}
          className={cn(tool, 'hover:text-destructive')}
        >
          <Trash2 className="size-3.5" />
        </button>
      </>
    );
  };

  // ── pieces ──
  const historyList = (
    <div className="flex h-full min-h-0 flex-col">
      <Button size="sm" className="w-full justify-start" onClick={() => (reset(), setNotes([]), setHistoryOpen(false))}>
        <Plus /> New canvas
      </Button>
      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search history…"
        className="mt-2 h-8"
      />
      <div className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto">
        {history.data?.length === 0 && (
          <p className="px-2 py-3 text-xs text-muted-foreground">
            {search ? 'Nothing matches.' : 'Your canvases are saved here automatically.'}
          </p>
        )}
        {history.data?.map(t => (
          <div
            key={t.id}
            className={cn(
              'group flex items-center gap-1 rounded-md pr-1',
              t.id === activeId ? 'bg-primary/10' : 'hover:bg-muted'
            )}
          >
            <button type="button" onClick={() => load(t.id)} className="min-w-0 flex-1 px-2 py-1.5 text-left">
              <span className={cn('block truncate text-[13px]', t.id === activeId && 'font-medium text-primary')}>
                {t.pinned && <Pin className="mr-1 inline size-3 -translate-y-px" />}
                {t.title}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {fmtDate(t.updatedAt)} · {t._count.turns} step{t._count.turns === 1 ? '' : 's'}
              </span>
            </button>
            <button
              type="button"
              title={t.pinned ? 'Unpin' : 'Pin to the top'}
              onClick={() => aiApi.patchThread(t.id, { pinned: !t.pinned }).then(refreshList)}
              className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground"
            >
              <Pin className="size-3.5" />
            </button>
            <button
              type="button"
              title="Remove from history"
              onClick={() => removeThread(t.id)}
              className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const exportBtn = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={!me.can.export || !!exporting || busy}>
          {exporting ? <Loader2 className="animate-spin" /> : <Download />}
          Export
          <ChevronDown className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={() => doExport('xlsx')}>
          <FileSpreadsheet /> Excel
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => doExport('pptx')}>
          <Presentation /> PowerPoint
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => doExport('pdf')}>
          <FileText /> PDF (print)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const conversation = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-1">
        {empty && (
          <div className="py-4">
            <p className="flex items-center gap-2 text-[15px] font-semibold">
              <Sparkles className="size-4 text-primary" /> What would you like to see?
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Ask in plain words. Then keep going — “make it a pie”, “only this year”, “explain this
              report”. Everything is saved in your history.
            </p>
            {!!suggest.data?.mine.length && (
              <>
                <p className="mt-4 mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  <History className="size-3" /> Your most asked
                </p>
                <div className="flex flex-col items-start gap-1.5">
                  {suggest.data.mine.map(m => (
                    <button
                      key={m.text}
                      type="button"
                      disabled={basic || busy}
                      onClick={() => send(m.text)}
                      className="flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-1.5 text-left text-[13px] hover:border-primary/50 disabled:opacity-50"
                    >
                      {m.text}
                      {m.uses > 1 && <span className="text-[11px] text-muted-foreground tabular">×{m.uses}</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
            <p className="mt-4 mb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Try</p>
            <div className="flex flex-col items-start gap-1.5">
              {(suggest.data?.starters ?? startersFor(pathname)).map(ex => (
                <button
                  key={ex}
                  type="button"
                  disabled={basic || busy}
                  onClick={() => send(ex)}
                  className="rounded-lg border bg-card px-3 py-1.5 text-left text-[13px] hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}
        {turns.map(t =>
          t.kind === 'edit' ? (
            <p key={t.id} className="text-center text-[12px] text-muted-foreground">
              <Pencil className="mr-1 inline size-3 -translate-y-px" />
              {t.input}
            </p>
          ) : (
            <div key={t.id} className="space-y-2.5">
              <Bubble>{t.input}</Bubble>
              <Reply kind={t.kind} message={t.message} options={t.options} tier={t.tier} onPick={send} disabled={busy} />
            </div>
          )
        )}
        {notes.map(n => (
          <div key={n.id} className="space-y-2.5">
            <Bubble>{n.input}</Bubble>
            <Reply kind={n.kind} message={n.message} options={n.options} onPick={send} disabled={busy} />
          </div>
        ))}
        {pending && (
          <div className="space-y-2.5">
            <Bubble>{pending}</Bubble>
            <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Working on it…
            </p>
          </div>
        )}
        <div ref={feedEnd} />
      </div>

      {/* composer */}
      <div className="shrink-0 pt-2">
        {canvas && !basic && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {FOLLOW_UPS.map(f => (
              <button
                key={f}
                type="button"
                disabled={busy}
                onClick={() => send(f)}
                className="rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:opacity-50"
              >
                {f}
              </button>
            ))}
          </div>
        )}
        {basic && (
          <p className="mb-2 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
            <AlertTriangle className="mt-px size-3.5 shrink-0 text-warning" />
            <span>{me.basicMode} Saved canvases, “explain” and anything asked before still work.</span>
          </p>
        )}
        <form
          onSubmit={e => {
            e.preventDefault();
            send(draft);
          }}
          className="rounded-xl border bg-card focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30"
        >
          <Textarea
            value={draft}
            onChange={e => {
              typedRef.current = !!e.target.value;
              setHearing(false);
              setDraft(e.target.value.slice(0, maxChars));
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            rows={2}
            placeholder={
              canvas
                ? 'Ask a follow-up, or say “new canvas”…'
                : dock
                  ? `Ask about ${pageLabel(pathname)} — “explain this”, “show stats”, a filter, or any report`
                  : 'e.g. CSR spent by FY and top 10 clients'
            }
            ref={composerRef}
            aria-label="Message the assistant"
            className="min-h-14 resize-none border-0 bg-transparent text-[14px] shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          <div className="flex items-center gap-3 px-2.5 pb-2">
            {hearing ? (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600">
                <span className="size-2 animate-pulse rounded-full bg-amber-500" />
                {sendIn ? (
                  <span key={sendIn.key}>
                    Sending in {Math.round(sendIn.ms / 1000)} s — say “go” now, or “wait”
                  </span>
                ) : (
                  'Listening… it sends when you pause'
                )}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <ShieldCheck className="size-3.5 text-success" /> Read-only
              </span>
            )}
            {q && <span className="text-[11px] text-muted-foreground">AI calls: {q}</span>}
            <Button type="submit" size="sm" className="ml-auto" disabled={!draft.trim() || busy}>
              {ask.isPending ? <Loader2 className="animate-spin" /> : <Send />} Send
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  const canvasPane = canvas ? (
    <section className={cn('min-w-0 space-y-3', busy && 'opacity-70 transition-opacity')}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        <h2 className="min-w-0 flex-1 truncate text-base font-semibold">{canvas.spec.title}</h2>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => send('Explain this report')}>
          <BookOpenText /> Explain
        </Button>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => refresh.mutate()}>
          <RotateCw className={cn(refresh.isPending && 'animate-spin')} /> Refresh
        </Button>
        {me.can.saveTemplate && (
          <Button variant="outline" size="sm" disabled={busy} onClick={() => setSaveOpen(true)}>
            <Save /> Save as template
          </Button>
        )}
        {exportBtn}
      </div>
      {matched.length > 0 && (
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="size-3.5" /> Filtered to:
          {matched.map(m => (
            <Pill key={`${m.kind}-${m.label}`} tone="neutral" dot={false}>
              {m.label}
            </Pill>
          ))}
        </p>
      )}
      <AiCanvas blocks={canvas.blocks} tools={blockTools} />
      <p className="text-[11px] text-muted-foreground">
        Hover a block to change its chart, size or order, or to remove it. Changes are saved to this
        conversation.
      </p>
    </section>
  ) : ask.isPending || loadingThread ? (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
      <Skeleton className="h-28 md:col-span-2" />
      <Skeleton className="h-28 md:col-span-2" />
      <Skeleton className="h-28 md:col-span-2" />
      <Skeleton className="h-72 md:col-span-6" />
    </div>
  ) : (
    <EmptyState
      icon={Sparkles}
      title={dock ? 'Ask about this page, or for any report' : 'Your canvas will appear here'}
      description={
        dock
          ? '“Explain this” and “show stats” read what is on the page behind. Filters you ask for are applied to it. Reports appear here.'
          : 'Ask for numbers, charts or tables on the left — or open one from your history.'
      }
    />
  );

  const dialogs = (
    <>
      {canvas && saveOpen && (
        <SaveDialog
          open={saveOpen}
          onOpenChange={setSaveOpen}
          shown={{ spec: canvas.spec, blocks: canvas.blocks, prompt: turns.find(t => t.kind === 'canvas')?.input }}
          canShare={me.can.shareTemplate}
        />
      )}
      <TemplatesSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        opening={openTemplate.isPending ? openTemplate.variables?.id : undefined}
        onOpen={t => openTemplate.mutate(t)}
      />
      {/* print rules exist only while a PDF export is printing — Ctrl+P elsewhere is untouched */}
      {canvas && printFooter && (
        <>
          <style>{PRINT_CSS}</style>
          <PrintCopy shown={{ spec: canvas.spec, blocks: canvas.blocks }} footer={printFooter} />
        </>
      )}
    </>
  );

  // ── full page: history | conversation | canvas ──
  const close = () => window.dispatchEvent(new Event(AI_DOCK_CLOSE_EVENT));
  return (
    <div className={cn('space-y-3', dock && 'flex h-full flex-col space-y-0')}>
      {dock ? (
        <div className="flex shrink-0 items-center gap-2 border-b bg-card px-4 py-2.5">
          <Sparkles className="size-4 text-primary" />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">
            Assistant <span className="font-normal text-muted-foreground">· {thread?.title ?? pageLabel(pathname)}</span>
          </p>
          <Button variant="outline" size="sm" onClick={() => setSheetOpen(true)}>
            <Bookmark /> Shared templates
          </Button>
          <Button size="sm" onClick={close} title="Close and go back to the page (Esc)">
            <X /> Close
          </Button>
        </div>
      ) : (
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            AI Canvas
            <Pill tone="violet" dot={false}>
              Alpha
            </Pill>
          </span>
        }
        description="Ask for a report, then keep refining it. Every conversation is saved; repeats are answered from memory."
        actions={
          <Button variant="outline" size="sm" onClick={() => setSheetOpen(true)}>
            <Bookmark /> Shared templates
          </Button>
        }
      />
      )}
      <div
        className={cn(
          'grid gap-4 lg:grid-cols-[220px_380px_minmax(0,1fr)]',
          dock ? 'min-h-0 flex-1 p-4' : 'lg:h-[calc(100vh-11rem)]'
        )}
      >
        <aside className="hidden min-h-0 rounded-xl border bg-card p-3 shadow-card lg:block">{historyList}</aside>
        <section className="flex min-h-[28rem] flex-col rounded-xl border bg-surface p-3 shadow-card lg:min-h-0">
          <div className="mb-1 flex items-center gap-2 lg:hidden">
            <Button variant="outline" size="sm" onClick={() => setHistoryOpen(o => !o)}>
              <History /> History
            </Button>
          </div>
          {historyOpen ? <div className="min-h-0 flex-1 lg:hidden">{historyList}</div> : null}
          <div className={cn('flex min-h-0 flex-1 flex-col', historyOpen && 'hidden lg:flex')}>{conversation}</div>
        </section>
        <div className="min-h-0 space-y-3 overflow-y-auto lg:pr-1">
          {/* earlier reports of this session: one line each, click to bring back */}
          {feed.slice(0, -1).map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => void load(f.id)}
              className="flex w-full items-center gap-3 rounded-xl border bg-card px-4 py-2.5 text-left shadow-card transition-colors hover:border-primary/40"
            >
              <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <BarChart3 className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">{f.title}</span>
                <span className="text-xs text-muted-foreground">{f.blocks} parts · earlier in this session — click to open</span>
              </span>
            </button>
          ))}
          <div ref={latestRef} className="scroll-mt-2">
            {canvasPane}
          </div>
        </div>
      </div>
      {dialogs}
    </div>
  );
}


/** access gate + workspace — the /ai-canvas page and the side panel both render this */
export function CanvasWorkspace({ variant = 'page', incoming }: { variant?: 'page' | 'dock'; incoming?: Incoming | null }) {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ME_KEY, queryFn: aiApi.me });

  if (me.isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (me.isError || !me.data) {
    return <ErrorState error={me.error} onRetry={() => me.refetch()} className="min-h-[60vh]" />;
  }
  const data = me.data;
  if (!data.allowed.canvas) return <NotAllowed me={data} />;
  if (!data.active.canvas) {
    return <TurnOn onDone={() => qc.invalidateQueries({ queryKey: ME_KEY })} />;
  }
  return <Workspace me={data} variant={variant} incoming={incoming} />;
}
