// File: page.tsx
// Path: src/app/(dashboard)/applicants/page.tsx

'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApplicantsOverview } from '@/components/applicants/ApplicantsOverview';
import { ApplicantsTable } from '@/components/applicants/ApplicantsTable';
import { AssignApplicantDialog } from '@/components/applicants/AssignApplicantDialog';
import { toIsoEnd, toIsoStart, toStatusLabel } from '@/components/applicants/utils';
import { useApplicants } from '@/hooks/useApplicants';
import type { Applicant } from '@/types/applicant';
import { RequirementsTable } from '@/components/applicants/RequirementsTable';

const ALL = 'ALL';
const REQUIREMENTS_TAB = 'REQUIREMENTS'; // frontend-only view — every requirement in scope
const PAGE_SIZE_OPTIONS = [10, 20, 50];
const SEARCH_DEBOUNCE_MS = 400;

function useDebounced<T>(value: T, delay: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function ApplicantsPage() {
  const [status, setStatus] = useState(ALL);
  const [requirementId, setRequirementId] = useState(ALL);
  const [searchInput, setSearchInput] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignTarget, setAssignTarget] = useState<{ ids: string[]; label: string } | null>(null);

  const search = useDebounced(searchInput, SEARCH_DEBOUNCE_MS);
  const isRequirementsView = status === REQUIREMENTS_TAB;

  // reset paging + selection whenever filters change
  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [status, requirementId, search, from, to, pageSize]);

  const { data, isLoading, isError, error } = useApplicants({
    status: status !== ALL && !isRequirementsView ? status : undefined,
    requirementId: requirementId !== ALL ? requirementId : undefined,
    search: search.trim() || undefined,
    from: toIsoStart(from),
    to: toIsoEnd(to),
    page,
    limit: pageSize,
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const statusKeys = meta?.assignmentStatuses ?? [];
  const counts = meta?.counts ?? {};
  const allCount = Object.values(counts).reduce((s, n) => s + n, 0);
  const requirementOptions = meta?.requirementOptions ?? [];

  // requirements tab — filtered + paged on the client (list is already scoped by backend)
  const term = search.trim().toLowerCase();
  const filteredRequirements = useMemo(
    () =>
      requirementOptions.filter(
        r =>
          (requirementId === ALL || r.id === requirementId) &&
          (!term ||
            [r.reqCode, r.title, r.client?.name ?? ''].some(v => v.toLowerCase().includes(term)))
      ),
    [requirementOptions, requirementId, term]
  );
  const requirementPageRows = filteredRequirements.slice((page - 1) * pageSize, page * pageSize);

  const total = isRequirementsView ? filteredRequirements.length : (meta?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const hasFilters = requirementId !== ALL || !!searchInput || !!from || !!to;

  const clearFilters = () => {
    setRequirementId(ALL);
    setSearchInput('');
    setFrom('');
    setTo('');
  };

  // requirements tab → that requirement's applicants
  const openRequirement = (id: string) => {
    setRequirementId(id);
    setStatus(ALL);
  };

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = (ids: string[], checked: boolean) =>
    setSelected(prev => {
      const next = new Set(prev);
      ids.forEach(id => (checked ? next.add(id) : next.delete(id)));
      return next;
    });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errorMessage = (error as any)?.response?.data?.message ?? 'Failed to load applicants';

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* header */}
      <div>
        <h1 className="text-xl font-semibold">Applicants</h1>
        <p className="text-[13px] text-muted-foreground">
          Candidates who applied through the careers site.
        </p>
      </div>

      {/* overview — stats + charts */}
      <ApplicantsOverview summary={meta?.summary} statusKeys={statusKeys} />

      {/* list */}
      <Card className="gap-0 py-0">
        {/* tabs + bulk action */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <Tabs value={status} onValueChange={setStatus}>
            <TabsList>
              <TabsTrigger value={ALL} className="text-[13px]">
                All ({allCount})
              </TabsTrigger>
              {statusKeys.map(k => (
                <TabsTrigger key={k} value={k} className="text-[13px]">
                  {toStatusLabel(k)} ({counts[k] ?? 0})
                </TabsTrigger>
              ))}
              <TabsTrigger value={REQUIREMENTS_TAB} className="text-[13px]">
                All requirements ({requirementOptions.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {!isRequirementsView && selected.size > 0 && (
            <Button
              size="sm"
              onClick={() =>
                setAssignTarget({ ids: [...selected], label: `${selected.size} applicant(s)` })
              }
            >
              <UserPlus className="mr-2 h-4 w-4" /> Assign {selected.size} selected
            </Button>
          )}
        </div>

        {/* filters */}
        <div className="flex flex-wrap items-center gap-2 border-b p-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={
                isRequirementsView
                  ? 'Search req code, title, client…'
                  : 'Search name, email, company, skill, req code…'
              }
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="h-9 w-80 pl-8 text-[13px]"
            />
          </div>

          <Select value={requirementId} onValueChange={setRequirementId}>
            <SelectTrigger className="h-9 w-72 text-[13px]">
              <SelectValue placeholder="All requirements" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All requirements</SelectItem>
              {requirementOptions.map(o => (
                <SelectItem key={o.id} value={o.id}>
                  {o.reqCode} · {o.title} ({o.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!isRequirementsView && (
            <>
              <Input
                type="date"
                value={from}
                max={to || undefined}
                onChange={e => setFrom(e.target.value)}
                className="h-9 w-36 text-[13px]"
                aria-label="Applied from"
              />
              <span className="text-[13px] text-muted-foreground">to</span>
              <Input
                type="date"
                value={to}
                min={from || undefined}
                onChange={e => setTo(e.target.value)}
                className="h-9 w-36 text-[13px]"
                aria-label="Applied to"
              />
            </>
          )}

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 h-4 w-4" /> Clear
            </Button>
          )}
        </div>

        {/* table — inner scroll, sticky header */}
        {isError ? (
          <p className="py-16 text-center text-[13px] text-muted-foreground">{errorMessage}</p>
        ) : (
          <div className="[&>div]:max-h-130">
            {isRequirementsView ? (
              <RequirementsTable
                rows={requirementPageRows}
                statusKeys={statusKeys}
                isLoading={isLoading}
                onOpen={openRequirement}
              />
            ) : (
              <ApplicantsTable
                rows={rows}
                isLoading={isLoading}
                selected={selected}
                onToggle={toggle}
                onToggleAll={toggleAll}
                onAssign={(a: Applicant) => setAssignTarget({ ids: [a.id], label: a.fullName })}
              />
            )}
          </div>
        )}

        {/* pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-[13px] text-muted-foreground">
          <div className="flex items-center gap-2">
            Rows
            <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
              <SelectTrigger className="h-8 w-18 text-[13px]">
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
            {total > 0 && (
              <span>
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      <AssignApplicantDialog
        open={!!assignTarget}
        onOpenChange={o => !o && setAssignTarget(null)}
        snapshotIds={assignTarget?.ids ?? []}
        label={assignTarget?.label ?? ''}
        onAssigned={() => setSelected(new Set())}
      />
    </div>
  );
}
