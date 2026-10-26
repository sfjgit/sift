// File: page.tsx
// Path: src/app/(app)/reports/page.tsx
//
// Report builder. Deep links: ?template=<id>, ?report=<savedViewId>, ?spec=<json>.

'use client';

import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  BarChartHorizontal,
  Bookmark,
  ChevronDown,
  Download,
  Globe2,
  Link2,
  LineChart,
  PieChart,
  Plus,
  RotateCcw,
  Save,
  Table2,
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { HelpButton } from '@/features/help/HelpSheet';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { EmptyState, ErrorState } from '@/components/common/states';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { downloadRecords } from '@/components/data-table/exporter';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { usePermissions } from '@/features/auth/usePermissions';
import { DrillSheet, type DrillTarget } from '@/features/reports/DrillSheet';
import { ReportBuilder } from '@/features/reports/ReportBuilder';
import { ReportResult, toExportRows } from '@/features/reports/ReportResult';
import {
  DEFAULT_SPEC,
  TEMPLATES,
  breakdownParams,
  dimLabel,
  drillHref,
  type ReportSpec,
  type Viz,
} from '@/features/reports/spec';
import { tourTarget } from '@/features/tour/tour.constants';
import { useTour } from '@/features/tour/useTour';
import { reportsTour } from '@/features/tour/tours/catalog';
import { reportsApi, viewsApi } from '@/lib/api/endpoints';
import { cn } from '@/lib/utils';
import type { ApiError } from '@/lib/api/client';
import type { SavedView } from '@/types/org';
import type { TrendInterval } from '@/types/reports';

const VIEW_KEY = ['views', 'reports'] as const;

/** ?template= / ?spec= deep links (the app shell renders client-side only). */
function initialSpec(canSpocs: boolean): { spec: ReportSpec; templateId: string | null } {
  const sp = new URLSearchParams(window.location.search);
  const tpl = TEMPLATES.find(t => t.id === sp.get('template'));
  if (tpl) return { spec: tpl.spec, templateId: tpl.id };
  const raw = sp.get('spec');
  if (raw) {
    try {
      return { spec: { ...DEFAULT_SPEC, ...JSON.parse(raw) }, templateId: null };
    } catch {
      /* broken link — fall through to the default */
    }
  }
  return {
    spec: canSpocs ? DEFAULT_SPEC : { ...DEFAULT_SPEC, entity: 'clients', groupBy: 'status' },
    templateId: null,
  };
}

function ReportsPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { can } = usePermissions();
  const [initial] = useState(() => initialSpec(can('spocs.read')));
  const [spec, setSpec] = useState<ReportSpec>(initial.spec);
  const [active, setActive] = useState<SavedView<ReportSpec> | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(initial.templateId);
  const [saveOpen, setSaveOpen] = useState(false);
  const [drill, setDrill] = useState<DrillTarget | null>(null);

  const saved = useQuery({
    queryKey: VIEW_KEY,
    queryFn: () => viewsApi.list<ReportSpec>('reports'),
    staleTime: 60_000,
  });

  // ?report=<id> can only resolve once saved reports have loaded
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('report');
    const v = id && saved.data?.find(x => x.id === id);
    if (!v) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from fetched data
    setSpec(v.config);
    setActive(v);
  }, [saved.data]);

  const canEntity = spec.entity === 'spocs' ? can('spocs.read') : can('clients.read');
  const isTrend = spec.viz === 'trend';

  const breakdown = useQuery({
    queryKey: ['reports', 'breakdown', breakdownParams(spec)],
    queryFn: () => reportsApi.breakdown(breakdownParams(spec)),
    enabled: canEntity && !isTrend,
    placeholderData: keepPreviousData,
  });
  const trend = useQuery({
    queryKey: ['reports', 'trend', spec.entity, spec.groupBy, spec.interval, spec.from, spec.to],
    queryFn: () =>
      reportsApi.trend({
        entity: spec.entity,
        interval: spec.interval ?? 'week',
        groupBy: spec.groupBy,
        from: spec.from || undefined,
        to: spec.to || undefined,
        top: 5,
      }),
    enabled: canEntity && isTrend,
    placeholderData: keepPreviousData,
  });
  const q = isTrend ? trend : breakdown;

  useTour(reportsTour, { ready: !q.isLoading });

  const update = (s: ReportSpec) => {
    setSpec(s);
    setTemplateId(null);
  };

  const title =
    active?.name ?? TEMPLATES.find(t => t.id === templateId)?.title ?? 'Untitled report';
  const subtitle = useMemo(
    () =>
      `${spec.entity === 'spocs' ? 'SPOCs' : 'Clients'} by ${dimLabel(spec.entity, spec.groupBy).toLowerCase()}${
        spec.splitBy && !isTrend ? ` × ${dimLabel(spec.entity, spec.splitBy).toLowerCase()}` : ''
      }${isTrend ? ` over time (${spec.interval ?? 'week'})` : ''}`,
    [spec, isTrend]
  );

  const onDrill = (rowKey: string, rowLabel: string, splitKey?: string, splitLabel?: string) => {
    const href = drillHref(spec, rowKey, splitKey);
    if (!href) {
      toast.info('Drill-down isn’t available for this dimension or for “Not set”.');
      return;
    }
    const filters = Object.fromEntries(new URLSearchParams(href.split('?')[1]));
    setDrill({
      entity: spec.entity,
      filters,
      href,
      title: [rowLabel, splitLabel].filter(Boolean).join(' · '),
      dateNote: !!(spec.from || spec.to),
    });
  };

  const exportXlsx = async () => {
    if (!breakdown.data) return;
    await downloadRecords(
      toExportRows(spec, breakdown.data),
      title.replace(/\s+/g, '-').toLowerCase(),
      'xlsx'
    );
  };

  const copyLink = () => {
    const url = new URL(window.location.origin + window.location.pathname);
    if (active) url.searchParams.set('report', active.id);
    else url.searchParams.set('spec', JSON.stringify(spec));
    navigator.clipboard.writeText(url.toString()).then(() => toast.success('Link copied'));
  };

  const saveActive = async () => {
    if (!active) return setSaveOpen(true);
    try {
      const v = await viewsApi.update<ReportSpec>(active.id, { config: spec });
      setActive(v);
      toast.success(`“${v.name}” saved`);
      qc.invalidateQueries({ queryKey: VIEW_KEY });
    } catch (e) {
      toast.error((e as ApiError).message);
    }
  };

  const vizOptions: { value: Viz; label: string; icon: typeof BarChart3 }[] = [
    {
      value: spec.splitBy ? 'stacked' : 'bar',
      label: spec.splitBy ? 'Stacked' : 'Bars',
      icon: spec.splitBy ? BarChart3 : BarChartHorizontal,
    },
    ...(!spec.splitBy ? [{ value: 'donut' as Viz, label: 'Donut', icon: PieChart }] : []),
    { value: 'table', label: 'Table', icon: Table2 },
    { value: 'trend', label: 'Trend', icon: LineChart },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description="Answer any pipeline question — pick a template or build your own, then drill into the records."
        actions={
          <div className="flex flex-wrap items-center gap-2" {...tourTarget('reports-save')}>
            <HelpButton module="reports" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Bookmark /> Saved reports
                  <ChevronDown className="opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                {saved.data?.length ? (
                  <>
                    <DropdownMenuLabel>Saved reports</DropdownMenuLabel>
                    {saved.data.map(v => (
                      <DropdownMenuItem
                        key={v.id}
                        className="group"
                        onSelect={() => {
                          setSpec(v.config);
                          setActive(v);
                          setTemplateId(null);
                        }}
                      >
                        <span className="flex-1 truncate">{v.name}</span>
                        {v.isShared && <Globe2 className="size-3.5 text-muted-foreground" />}
                        {!v.isOwner && (
                          <span className="text-xs text-muted-foreground">{v.user.firstName}</span>
                        )}
                        {v.isOwner && (
                          <button
                            type="button"
                            aria-label="Delete report"
                            className="rounded p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"
                            onClick={async e => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (
                                !(await confirm({
                                  title: `Delete “${v.name}”?`,
                                  destructive: true,
                                  confirmLabel: 'Delete',
                                }))
                              )
                                return;
                              await viewsApi.remove(v.id);
                              if (active?.id === v.id) setActive(null);
                              qc.invalidateQueries({ queryKey: VIEW_KEY });
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </>
                ) : (
                  <p className="px-2 py-3 text-xs text-muted-foreground">
                    No saved reports yet. Build one and hit Save.
                  </p>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    setActive(null);
                    setTemplateId(null);
                    setSpec(DEFAULT_SPEC);
                  }}
                >
                  <RotateCcw /> Start a new report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={copyLink}>
              <Link2 /> Copy link
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void exportXlsx()}
              disabled={isTrend || !breakdown.data}
            >
              <Download /> Export
            </Button>
            <Button size="sm" onClick={() => void saveActive()}>
              <Save /> {active?.isOwner ? 'Save' : 'Save report'}
            </Button>
          </div>
        }
      />

      {/* templates */}
      <div
        className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1"
        {...tourTarget('reports-templates')}
      >
        {TEMPLATES.filter(t =>
          t.spec.entity === 'spocs' ? can('spocs.read') : can('clients.read')
        ).map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setSpec(t.spec);
              setTemplateId(t.id);
              setActive(null);
            }}
            className={cn(
              'flex w-56 shrink-0 snap-start items-start gap-3 rounded-xl border bg-card p-3 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/30',
              templateId === t.id && 'border-primary/50 ring-2 ring-primary/15'
            )}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <t.icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium">{t.title}</span>
              <span className="line-clamp-2 text-xs text-muted-foreground">{t.description}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[280px_1fr]">
        <div className="lg:sticky lg:top-20">
          <ReportBuilder spec={spec} onChange={update} />
        </div>

        <Panel
          title={
            <span className="flex items-center gap-2">
              {title}
              {active?.isShared && (
                <Globe2 className="size-3.5 text-muted-foreground" aria-label="Shared" />
              )}
            </span>
          }
          description={subtitle}
          actions={
            <div
              className="flex flex-wrap items-center justify-end gap-2"
              {...tourTarget('reports-viz')}
            >
              {isTrend && (
                <Segmented<TrendInterval>
                  size="xs"
                  value={spec.interval ?? 'week'}
                  onChange={interval => update({ ...spec, interval })}
                  options={[
                    { value: 'day', label: 'Day' },
                    { value: 'week', label: 'Week' },
                    { value: 'month', label: 'Month' },
                  ]}
                />
              )}
              {spec.splitBy && !isTrend && (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Switch
                    size="sm"
                    checked={!!spec.percent}
                    onCheckedChange={percent => update({ ...spec, percent })}
                  />{' '}
                  %
                </label>
              )}
              <Segmented<Viz>
                size="xs"
                value={spec.viz}
                onChange={viz => update({ ...spec, viz })}
                options={vizOptions}
              />
            </div>
          }
        >
          <div {...tourTarget('reports-result')} className="min-h-[320px]">
            {!canEntity ? (
              <EmptyState
                title="You can’t report on this"
                description="Your role doesn’t include read access to these records."
              />
            ) : q.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-[300px] w-full" />
              </div>
            ) : q.error ? (
              <ErrorState error={q.error} onRetry={() => q.refetch()} />
            ) : !isTrend && !breakdown.data?.rows.length ? (
              <EmptyState
                icon={BarChart3}
                title="No data for this combination"
                description="Loosen the filters or widen the date range."
              />
            ) : (
              <div className={cn('transition-opacity', q.isFetching && 'opacity-60')}>
                <ReportResult
                  spec={spec}
                  breakdown={breakdown.data}
                  trend={trend.data}
                  onDrill={onDrill}
                />
              </div>
            )}
          </div>
        </Panel>
      </div>

      <SaveReportDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        defaultName={active?.name ?? TEMPLATES.find(t => t.id === templateId)?.title ?? ''}
        onSave={async (name, isShared) => {
          const v = await viewsApi.create<ReportSpec>({
            module: 'reports',
            name,
            isShared,
            config: spec,
          });
          setActive(v);
          setTemplateId(null);
          qc.invalidateQueries({ queryKey: VIEW_KEY });
          toast.success(`“${name}” saved`);
        }}
      />
      <DrillSheet target={drill} onClose={() => setDrill(null)} />
    </div>
  );
}

function SaveReportDialog({
  open,
  onOpenChange,
  defaultName,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultName: string;
  onSave: (name: string, isShared: boolean) => Promise<void>;
}) {
  const canShare = usePermissions().can('views.share');
  const [name, setName] = useState(defaultName);
  const [shared, setShared] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setName(defaultName);
      setShared(false);
    }
  }, [open, defaultName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save report</DialogTitle>
          <DialogDescription>
            Saved reports keep the grouping, filters and visual.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async e => {
            e.preventDefault();
            if (!name.trim()) return;
            setBusy(true);
            try {
              await onSave(name.trim(), shared);
              onOpenChange(false);
            } catch (err) {
              toast.error((err as ApiError).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="report-name">Name</Label>
            <Input
              id="report-name"
              autoFocus
              maxLength={100}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Weekly pipeline review"
            />
          </div>
          {canShare && (
            <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <span>
                <span className="block text-sm font-medium">Share with everyone</span>
                <span className="block text-xs text-muted-foreground">
                  Others see the numbers for their own scope.
                </span>
              </span>
              <Switch checked={shared} onCheckedChange={setShared} />
            </label>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || busy}>
              <Plus /> Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Page() {
  return (
    <RequirePermission perm="reports.read" any={['clients.read', 'spocs.read']}>
      <ReportsPage />
    </RequirePermission>
  );
}
