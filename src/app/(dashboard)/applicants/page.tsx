// File: page.tsx
// Path: src/app/(dashboard)/applicants/page.tsx

'use client';

import { useEffect, useState } from 'react';
import {
  Briefcase,
  Eye,
  MoreHorizontal,
  Search,
  UserCheck,
  Users,
  UserX,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { RequirementApplicantsDialog } from '@/components/applicants/RequirementApplicantsDialog';
import { StatCard } from '@/components/applicants/StatCard';
import { getStatusTone, StatusPill } from '@/components/applicants/StatusPill';
import { TablePagination } from '@/components/applicants/TablePagination';
import { UserStack } from '@/components/applicants/UserStack';
import { formatDate, toStatusLabel } from '@/components/applicants/utils';
import { useApplicantRequirements } from '@/hooks/useApplicants';

const ALL = 'ALL';
const PAGE_SIZE_OPTIONS = [10, 20, 50];
const SEARCH_DEBOUNCE_MS = 400;
const SKELETON_ROWS = 6;
const STAT_SKELETONS = 4;
const COL_COUNT = 8; // Requirement, Applicants, Created by, Assigned to, Assigned by, Status, Created on, Action
const HEAD = 'whitespace-nowrap text-xs font-medium uppercase tracking-wide text-muted-foreground';

// icon per assignment bucket — unknown keys fall back to Users
const BUCKET_ICONS: Record<string, LucideIcon> = {
  UNASSIGNED: UserX,
  ASSIGNED: UserCheck,
};

const TAB_TRIGGER =
  'gap-2 rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none';

function useDebounced<T>(value: T, delay: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function ApplicantsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState(ALL);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [page, setPage] = useState(1);
  const [activeId, setActiveId] = useState<string | null>(null);

  const search = useDebounced(searchInput, SEARCH_DEBOUNCE_MS);

  useEffect(() => setPage(1), [search, status, pageSize]);

  const { data, isLoading, isError, error } = useApplicantRequirements({
    search: search.trim() || undefined,
    status: status !== ALL ? status : undefined,
    page,
    limit: pageSize,
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const summary = meta?.summary;
  const statusKeys = meta?.assignmentStatuses ?? [];
  const totalPages = meta ? Math.max(1, Math.ceil(meta.total / meta.limit)) : 1;

  // derived from the live list so counts refresh after an assign
  const active = rows.find(r => r.id === activeId) ?? null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errorMessage = (error as any)?.response?.data?.message ?? 'Failed to load applicants';

  const pct = (n: number) =>
    summary?.totalApplicants
      ? `${Math.round((n / summary.totalApplicants) * 100)}% of applicants`
      : undefined;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Applicants</h1>
          {summary && (
            <Badge variant="secondary" className="rounded-full">
              {summary.totalApplicants}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Self-applied candidates from the careers site, grouped by requirement.
        </p>
      </div>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary
          ? [
              <StatCard
                key="total"
                label="Total applicants"
                value={summary.totalApplicants}
                icon={Users}
                tone="blue"
                hint={`Across ${summary.requirementsWithApplicants} requirement(s)`}
              />,
              ...statusKeys.map(k => (
                <StatCard
                  key={k}
                  label={toStatusLabel(k)}
                  value={summary.counts[k] ?? 0}
                  icon={BUCKET_ICONS[k] ?? Users}
                  tone={getStatusTone(k)}
                  hint={pct(summary.counts[k] ?? 0)}
                />
              )),
              <StatCard
                key="requirements"
                label="Requirements"
                value={summary.totalRequirements}
                icon={Briefcase}
                tone="violet"
                hint={`${summary.requirementsWithApplicants} with applicants`}
              />,
            ]
          : Array.from({ length: STAT_SKELETONS }).map((_, i) => (
              <Skeleton key={i} className="h-23 w-full rounded-xl" />
            ))}
      </div>

      {/* ── Table card ───────────────────────────────────────────────────── */}
      <Card className="overflow-hidden shadow-sm">
        <div className="border-b px-4">
          <Tabs value={status} onValueChange={setStatus}>
            <TabsList className="h-auto gap-5 bg-transparent p-0">
              <TabsTrigger value={ALL} className={TAB_TRIGGER}>
                All requirements
                {summary && (
                  <Badge variant="secondary" className="h-5 rounded-full px-1.5">
                    {summary.totalRequirements}
                  </Badge>
                )}
              </TabsTrigger>
              {statusKeys.map(k => (
                <TabsTrigger key={k} value={k} className={TAB_TRIGGER}>
                  {toStatusLabel(k)}
                  {summary && (
                    <Badge variant="secondary" className="h-5 rounded-full px-1.5">
                      {summary.counts[k] ?? 0}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Showing
            <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
              <SelectTrigger className="h-9 w-18">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map(n => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search requirement code or title…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="h-9 w-72 pl-8"
            />
          </div>
        </div>

        {/* scroll container: the shadcn Table wrapper (first child) scrolls, header stays sticky */}
        <div className="mx-4 overflow-hidden rounded-lg border [&>div]:max-h-130">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted">
              <TableRow className="hover:bg-transparent">
                <TableHead className={HEAD}>Requirement</TableHead>
                <TableHead className={HEAD}>Applicants</TableHead>
                <TableHead className={HEAD}>Created by</TableHead>
                <TableHead className={HEAD}>Assigned to</TableHead>
                <TableHead className={HEAD}>Assigned by</TableHead>
                <TableHead className={HEAD}>Status</TableHead>
                <TableHead className={HEAD}>Created on</TableHead>
                <TableHead className={cn(HEAD, 'text-right')}>Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isError && (
                <TableRow>
                  <TableCell colSpan={COL_COUNT} className="h-32 text-center text-muted-foreground">
                    {errorMessage}
                  </TableCell>
                </TableRow>
              )}

              {!isError &&
                isLoading &&
                Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    {Array.from({ length: COL_COUNT }).map((__, j) => (
                      <TableCell key={j} className="py-4">
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!isError && !isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={COL_COUNT} className="h-32 text-center text-muted-foreground">
                    No requirements found.
                  </TableCell>
                </TableRow>
              )}

              {!isError &&
                !isLoading &&
                rows.map(r => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => setActiveId(r.id)}>
                    <TableCell className="py-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{r.reqCode}</span>
                        <span className="max-w-65 truncate text-xs text-muted-foreground">
                          {r.title}
                        </span>
                        {r.client?.name && (
                          <span className="max-w-65 truncate text-xs text-muted-foreground">
                            {r.client.name}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            'inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm font-semibold',
                            r.applicantCount > 0
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {r.applicantCount}
                        </span>
                        {statusKeys.map(k =>
                          r.counts[k] > 0 ? (
                            <StatusPill
                              key={k}
                              status={k}
                              label={`${r.counts[k]} ${toStatusLabel(k)}`}
                            />
                          ) : null
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-3">
                      <UserStack users={[r.createdBy]} />
                    </TableCell>

                    <TableCell className="py-3">
                      <UserStack users={r.assignments.map(a => a.assignedTo)} />
                    </TableCell>

                    <TableCell className="py-3">
                      <UserStack users={r.assignments.map(a => a.assignedBy)} />
                    </TableCell>

                    <TableCell className="py-3">
                      <StatusPill status={r.status} />
                    </TableCell>

                    <TableCell className="whitespace-nowrap py-3 text-sm text-muted-foreground">
                      {formatDate(r.createdAt)}
                    </TableCell>

                    <TableCell className="py-3 text-right">
                      <div
                        className="flex items-center justify-end gap-2"
                        onClick={e => e.stopPropagation()}
                      >
                        <Button variant="outline" size="sm" onClick={() => setActiveId(r.id)}>
                          View
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              aria-label="More actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setActiveId(r.id)}>
                              <Eye className="mr-2 h-4 w-4" /> View applicants
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-4 text-sm text-muted-foreground">
          <span>
            {meta && meta.total > 0
              ? `Showing ${(meta.page - 1) * meta.limit + 1}–${Math.min(meta.page * meta.limit, meta.total)} of ${meta.total} requirements`
              : '\u00A0'}
          </span>
          <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </Card>

      <RequirementApplicantsDialog
        requirement={active}
        onOpenChange={o => !o && setActiveId(null)}
        defaultStatus={status !== ALL ? status : undefined}
      />
    </div>
  );
}
