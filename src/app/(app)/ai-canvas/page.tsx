// File: page.tsx
// Path: src/app/(app)/ai-canvas/page.tsx
//
// AI Canvas (beta): describe a report in plain words, the AI picks blocks from
// the report catalogue, the backend runs them and we render the canvas.
// Read-only — numbers come straight from the CRM; the AI never sees the data.
//   • ?prompt=… (sent by the command bar) generates once on load, then clears
//   • saved templates re-run for free (no AI call) — they work in basic mode too
//   • export: Excel / PowerPoint are server files; PDF = server audit + print

'use client';

import { CANVAS_RESULT_EVENT } from '@/features/ai/speech';
import { Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bookmark,
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
  Wand2,
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PageHeader } from '@/components/common/PageHeader';
import { Pill } from '@/components/common/badges';
import { EmptyState, ErrorState } from '@/components/common/states';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { AiCanvas } from '@/components/ai/AiCanvas';
import { aiApi } from '@/lib/api/endpoints';
import { toApiError } from '@/lib/api/client';
import { fmtDate, fmtNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import type {
  AiCanvasResult,
  AiCanvasSpec,
  AiMe,
  AiQuota,
  AiRenderedBlock,
  AiReportTemplate,
} from '@/types/ai';

const ME_KEY = ['ai', 'me'] as const;
const TEMPLATES_KEY = ['ai', 'canvas-templates'] as const;
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

type Note = { type: 'clarify' | 'rejected' | 'error'; message: string };

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

function Workspace({ me }: { me: AiMe }) {
  const qc = useQueryClient();
  const router = useRouter();
  const params = useSearchParams();
  const urlPrompt = params.get('prompt');
  const maxChars = me.maxInputChars || DEFAULT_MAX;

  const [prompt, setPrompt] = useState(() => (urlPrompt ?? '').slice(0, maxChars));
  const [shown, setShown] = useState<Shown | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [quota, setQuota] = useState<AiQuota | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [printFooter, setPrintFooter] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const refreshMe = () => qc.invalidateQueries({ queryKey: ME_KEY });

  const take = (r: AiCanvasResult, extra: { prompt?: string; templateId?: string }) => {
    // the voice assistant reads this out
    window.dispatchEvent(new CustomEvent(CANVAS_RESULT_EVENT, { detail: r }));
    if (r.quota) setQuota(r.quota);
    if (r.type === 'canvas') {
      setShown({ spec: r.spec, blocks: r.blocks, matched: r.matched, ...extra });
      setNote(null);
    } else {
      setNote({ type: r.type, message: r.message });
    }
  };

  const generate = useMutation({
    mutationFn: (p: string) => aiApi.generate(p),
    onSuccess: (r, p) => {
      take(r, { prompt: p });
      refreshMe();
    },
    onError: e => {
      const message = toApiError(e).message;
      window.dispatchEvent(new CustomEvent(CANVAS_RESULT_EVENT, { detail: { type: 'error', message } }));
      setNote({ type: 'error', message });
    },
  });

  const run = useMutation({
    mutationFn: (v: { spec: AiCanvasSpec; templateId?: string; prompt?: string }) =>
      aiApi.run(v.spec, v.templateId),
    onSuccess: (r, v) => {
      take(r, { prompt: v.prompt, templateId: v.templateId });
      if (r.type === 'canvas') setSheetOpen(false);
    },
    onError: e => toast.error(toApiError(e).message),
  });

  // the command bar sends people here as /ai-canvas?prompt=… — generate once
  // (a second prompt while already here — e.g. by voice — runs too)
  const autoRan = useRef<string | null>(null);
  useEffect(() => {
    if (!urlPrompt) {
      autoRan.current = null;
      return;
    }
    if (autoRan.current === urlPrompt) return;
    autoRan.current = urlPrompt;
    setPrompt(urlPrompt.slice(0, maxChars));
    if (!me.basicMode) generate.mutate(urlPrompt.slice(0, maxChars));
    router.replace('/ai-canvas', { scroll: false });
  }, [urlPrompt, me.basicMode, maxChars, generate, router]);

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
    if (!shown) return;
    setExporting(format);
    try {
      const res = await aiApi.exportCanvas(shown.spec, format);
      if (format === 'pdf' && res) setPrintFooter(res.footer);
      else toast.success(format === 'xlsx' ? 'Excel file downloaded' : 'PowerPoint downloaded');
      refreshMe();
    } catch (e) {
      toast.error(toApiError(e).message);
    } finally {
      setExporting(null);
    }
  };

  const submit = () => {
    const p = prompt.trim();
    if (p && !generate.isPending) generate.mutate(p);
  };

  const busy = generate.isPending || run.isPending;
  const q = quotaLine(quota ?? me.quota.canvas);
  const basic = !!me.basicMode;

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

  return (
    <div className="space-y-4">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            AI Canvas
            <Pill tone="violet" dot={false}>
              Beta
            </Pill>
          </span>
        }
        description="Describe a report in plain words — get charts and tables from live CRM numbers."
        actions={
          <Button variant="outline" size="sm" onClick={() => setSheetOpen(true)}>
            <Bookmark /> Saved canvases
          </Button>
        }
      />

      {basic && (
        <div className="flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[oklch(0.55_0.14_60)] dark:text-warning" />
          <div>
            <p>{me.basicMode}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Saved canvases still work — open one from “Saved canvases”.
            </p>
          </div>
        </div>
      )}

      {/* prompt */}
      <section className="rounded-xl border bg-card p-4 shadow-card">
        <form
          onSubmit={e => {
            e.preventDefault();
            submit();
          }}
          className="space-y-3"
        >
          <Textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value.slice(0, maxChars))}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="e.g. CSR spent by FY and top 10 clients by CSR spend"
            rows={3}
            disabled={basic}
            className="min-h-24 resize-y text-[15px]"
            aria-label="Describe the report you want"
          />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span
              className={cn(
                'text-xs tabular text-muted-foreground',
                prompt.length >= maxChars && 'text-destructive'
              )}
            >
              {prompt.length} / {maxChars}
            </span>
            {q && <span className="text-xs text-muted-foreground">Canvas runs: {q}</span>}
            <Button
              type="submit"
              className="ml-auto"
              disabled={basic || !prompt.trim() || generate.isPending}
            >
              {generate.isPending ? <Loader2 className="animate-spin" /> : <Wand2 />}
              {generate.isPending ? 'Building…' : 'Generate'}
            </Button>
          </div>
        </form>
        {!basic && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
            <span className="mr-1 self-center text-xs text-muted-foreground">Try:</span>
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                type="button"
                disabled={generate.isPending}
                onClick={() => {
                  setPrompt(ex);
                  generate.mutate(ex);
                }}
                className="rounded-full border bg-surface px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
              >
                {ex}
              </button>
            ))}
          </div>
        )}
        <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="mt-px size-3.5 shrink-0 text-success" />
          Read-only — it can’t change anything. Numbers come straight from the CRM and follow your
          access; the AI never sees your data, only the report catalogue.
        </p>
      </section>

      {/* clarify / rejected / error */}
      {note && (
        <div
          role="status"
          className={cn(
            'flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm',
            note.type === 'clarify' && 'border-info/40 bg-info/8',
            note.type === 'rejected' && 'border-warning/40 bg-warning/10',
            note.type === 'error' && 'border-destructive/30 bg-destructive/8'
          )}
        >
          {note.type === 'clarify' ? (
            <MessageCircleQuestion className="mt-0.5 size-4 shrink-0 text-info" />
          ) : note.type === 'rejected' ? (
            <Lock className="mt-0.5 size-4 shrink-0 text-[oklch(0.55_0.14_60)] dark:text-warning" />
          ) : (
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          )}
          <div>
            <p className="font-medium">
              {note.type === 'clarify'
                ? 'Could you be more specific?'
                : note.type === 'rejected'
                  ? 'That’s not something AI Canvas can do'
                  : 'Couldn’t build this canvas'}
            </p>
            <p className="mt-0.5 text-muted-foreground">{note.message}</p>
            {note.type === 'rejected' && (
              <p className="mt-1 text-xs text-muted-foreground">
                AI Canvas is read-only: it builds reports, it never creates, edits or deletes
                records.
              </p>
            )}
          </div>
        </div>
      )}

      {/* canvas */}
      {generate.isPending && !shown ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <Skeleton className="h-28 md:col-span-2" />
          <Skeleton className="h-28 md:col-span-2" />
          <Skeleton className="h-28 md:col-span-2" />
          <Skeleton className="h-72 md:col-span-3" />
          <Skeleton className="h-72 md:col-span-3" />
        </div>
      ) : shown ? (
        <section className={cn('space-y-3', busy && 'opacity-60 transition-opacity')}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 className="min-w-0 flex-1 text-base font-semibold">{shown.spec.title}</h2>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() =>
                run.mutate({ spec: shown.spec, templateId: shown.templateId, prompt: shown.prompt })
              }
            >
              <RotateCw className={cn(run.isPending && 'animate-spin')} /> Refresh
            </Button>
            {me.can.saveTemplate && (
              <Button variant="outline" size="sm" disabled={busy} onClick={() => setSaveOpen(true)}>
                <Save /> Save as template
              </Button>
            )}
            {me.can.export ? (
              exportBtn
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>{exportBtn}</span>
                </TooltipTrigger>
                <TooltipContent>Your role can’t export canvases</TooltipContent>
              </Tooltip>
            )}
          </div>
          {shown.matched && shown.matched.length > 0 && (
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="size-3.5" /> Filtered to:
              {shown.matched.map(m => (
                <Pill key={`${m.kind}-${m.label}`} tone="neutral" dot={false}>
                  {m.label}
                </Pill>
              ))}
            </p>
          )}
          <AiCanvas blocks={shown.blocks} />
        </section>
      ) : (
        !note && (
          <EmptyState
            icon={Sparkles}
            title="Your canvas will appear here"
            description="Ask for a few numbers, charts or tables — or open a saved canvas."
          />
        )
      )}

      {shown && saveOpen && (
        <SaveDialog
          open={saveOpen}
          onOpenChange={setSaveOpen}
          shown={shown}
          canShare={me.can.shareTemplate}
        />
      )}
      <TemplatesSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        opening={run.isPending ? run.variables?.templateId : undefined}
        onOpen={t => run.mutate({ spec: t.spec, templateId: t.id, prompt: t.prompt ?? undefined })}
      />

      {/* print rules exist only while a PDF export is printing — Ctrl+P elsewhere is untouched */}
      {shown && printFooter && (
        <>
          <style>{PRINT_CSS}</style>
          <PrintCopy shown={shown} footer={printFooter} />
        </>
      )}
    </div>
  );
}

function AiCanvasPage() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ME_KEY, queryFn: aiApi.me });

  if (me.isLoading) {
    return (
      <div className="space-y-4">
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
  return <Workspace me={data} />;
}

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-40 w-full" />}>
      <AiCanvasPage />
    </Suspense>
  );
}
