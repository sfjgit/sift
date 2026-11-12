// File: page.tsx
// Path: src/app/(app)/admin/ai-usage/page.tsx
//
// Admin → AI usage & cost: the month's AI spend against budget, a health
// warning when command templates aren't catching enough requests, the usage
// dashboard (rendered with the same AiCanvas blocks) and who is near their
// quota. Filters: date range, role, business unit, mode. Excel export.

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { format, startOfMonth } from 'date-fns';
import { AlertTriangle, Download, Gauge, Loader2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { Pill } from '@/components/common/badges';
import { EmptyState, ErrorState } from '@/components/common/states';
import { Field } from '@/components/forms/fields';
import { MasterPicker, RolePicker } from '@/components/pickers/pickers';
import { AiCanvas } from '@/components/ai/AiCanvas';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { aiApi } from '@/lib/api/endpoints';
import { toApiError } from '@/lib/api/client';
import { fmtInr, fmtNumber, titleCase } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AiBudget, AiUsageFilters, AiUsageMode } from '@/types/ai';

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

type ModeFilter = 'ALL' | AiUsageMode;
const MODES: { value: ModeFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'COMMAND', label: 'Command' },
  { value: 'CANVAS', label: 'Canvas' },
  { value: 'EXPORT', label: 'Export' },
];

function BudgetBar({ budget }: { budget: AiBudget }) {
  const pct = Math.max(0, budget.usedPct);
  const over = pct >= 100 || budget.exhausted;
  const warn = !over && pct >= 80;
  return (
    <Panel
      title={
        <span className="flex items-center gap-1.5">
          <Wallet className="size-4 text-muted-foreground" /> Budget this month
        </span>
      }
      actions={
        <span
          className={cn(
            'text-sm font-semibold tabular',
            over && 'text-destructive',
            warn && 'text-[oklch(0.55_0.14_60)] dark:text-warning'
          )}
        >
          {pct.toFixed(1)}%
        </span>
      }
    >
      <p className="text-sm">
        <span className="text-lg font-semibold tabular">{fmtInr(budget.spentInr)}</span>
        <span className="text-muted-foreground"> spent of {fmtInr(budget.budgetInr)}</span>
      </p>
      <div
        className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Budget used"
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width]',
            over ? 'bg-destructive' : warn ? 'bg-warning' : 'bg-primary'
          )}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      {over && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-destructive">
          <AlertTriangle className="mt-px size-3.5 shrink-0" />
          Budget used up — AI Canvas is in basic mode (saved templates only) until next month or
          until the budget is raised in AI settings.
        </p>
      )}
    </Panel>
  );
}

function UsagePage() {
  const [from, setFrom] = useState(() => ymd(startOfMonth(new Date())));
  const [to, setTo] = useState(() => ymd(new Date()));
  const [roleId, setRoleId] = useState<string | null>(null);
  const [buId, setBuId] = useState<string | null>(null);
  const [mode, setMode] = useState<ModeFilter>('ALL');
  const [exporting, setExporting] = useState(false);

  const filters = useMemo<AiUsageFilters>(
    () => ({
      from: from || undefined,
      to: to || undefined,
      roleId: roleId ?? undefined,
      buId: buId ?? undefined,
      mode: mode === 'ALL' ? undefined : mode,
    }),
    [from, to, roleId, buId, mode]
  );

  const usage = useQuery({
    queryKey: ['ai', 'usage', filters],
    queryFn: () => aiApi.usage(filters),
    placeholderData: keepPreviousData,
  });

  const exportXlsx = async () => {
    setExporting(true);
    try {
      await aiApi.exportUsage(filters);
      toast.success('Excel file downloaded');
    } catch (e) {
      toast.error(toApiError(e).message);
    } finally {
      setExporting(false);
    }
  };

  const data = usage.data;

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI usage & cost"
        description="What the AI assistant costs, who uses it and how close people are to their quotas."
        actions={
          <Button variant="outline" size="sm" onClick={exportXlsx} disabled={exporting}>
            {exporting ? <Loader2 className="animate-spin" /> : <Download />}
            Export to Excel
          </Button>
        }
      />

      {/* filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card px-4 py-3 shadow-card">
        <Field label="From" htmlFor="u-from" className="w-40">
          <Input
            id="u-from"
            type="date"
            className="h-8"
            value={from}
            max={to || undefined}
            onChange={e => setFrom(e.target.value)}
          />
        </Field>
        <Field label="To" htmlFor="u-to" className="w-40">
          <Input
            id="u-to"
            type="date"
            className="h-8"
            value={to}
            min={from || undefined}
            onChange={e => setTo(e.target.value)}
          />
        </Field>
        <Field label="Role" className="w-48">
          <RolePicker
            value={roleId}
            onChange={v => setRoleId(v)}
            placeholder="All roles"
            size="sm"
          />
        </Field>
        <Field label="Business unit" className="w-48">
          <MasterPicker
            kind="business-units"
            value={buId}
            onChange={v => setBuId(v)}
            placeholder="All business units"
            size="sm"
          />
        </Field>
        <Field label="Mode">
          <Segmented value={mode} onChange={setMode} options={MODES} />
        </Field>
        {usage.isFetching && data && (
          <Loader2 className="mb-2 size-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {usage.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      ) : usage.isError || !data ? (
        <ErrorState error={usage.error} onRetry={() => usage.refetch()} />
      ) : (
        <>
          <BudgetBar budget={data.budget} />

          {data.health.alert && (
            <div className="flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[oklch(0.55_0.14_60)] dark:text-warning" />
              <div>
                <p className="font-medium">
                  Template hit rate is{' '}
                  {data.health.hitRatePct === null
                    ? 'unknown'
                    : `${data.health.hitRatePct.toFixed(1)}%`}{' '}
                  after {fmtNumber(data.health.ageDays)} days — below the 50% target
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  Too many requests are going to the AI instead of a saved command template, which
                  costs more. Tune the command templates and entity extraction in{' '}
                  <Link href="/admin/ai" className="font-medium text-primary hover:underline">
                    AI settings
                  </Link>
                  .
                </p>
              </div>
            </div>
          )}

          <AiCanvas blocks={data.blocks} />

          <Panel
            title={
              <span className="flex items-center gap-1.5">
                <Gauge className="size-4 text-muted-foreground" /> Usage vs quota
              </span>
            }
            description={`${fmtNumber(data.quotas.length)} people · counts are for the current day and month`}
            bodyClassName="p-0"
          >
            {data.quotas.length ? (
              <div className="max-h-[480px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-[1] bg-card">
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead className="text-right">Today</TableHead>
                      <TableHead className="text-right">Daily limit</TableHead>
                      <TableHead className="text-right">This month</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.quotas.map((q, i) => (
                      <TableRow key={`${q.user}-${q.mode}-${i}`}>
                        <TableCell className="font-medium">{q.user}</TableCell>
                        <TableCell className="text-muted-foreground">{q.role ?? '—'}</TableCell>
                        <TableCell>{titleCase(q.mode)}</TableCell>
                        <TableCell className="text-right tabular">{fmtNumber(q.today)}</TableCell>
                        <TableCell className="text-right tabular">
                          {q.dailyLimit === null ? (
                            <span className="text-muted-foreground">Unlimited</span>
                          ) : (
                            fmtNumber(q.dailyLimit)
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular">
                          {fmtNumber(q.thisMonth)}
                        </TableCell>
                        <TableCell className="text-right">
                          {q.nearLimit && <Pill tone="warning">Near limit</Pill>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState compact title="No AI usage in this period" />
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission perm="ai_assistant.usage_view">
      <UsagePage />
    </RequirePermission>
  );
}
