// File: page.tsx
// Path: src/app/(dashboard)/applicants/page.tsx

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  Loader2,
  Search,
  UserPlus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApplicantsOverview } from '@/components/applicants/ApplicantsOverview';
import { APPLICANT_COLUMNS, ApplicantsTable } from '@/components/applicants/ApplicantsTable';
import { AssignApplicantDialog } from '@/components/applicants/AssignApplicantDialog';
import { RequirementMultiSelect } from '@/components/applicants/RequirementMultiSelect';
import { RequirementsTable } from '@/components/applicants/RequirementsTable';
import {
  ALL_TAB,
  REQUIREMENTS_TAB,
  toIsoEnd,
  toIsoStart,
  toStatusLabel,
} from '@/components/applicants/utils';
import { useApplicants, useExportApplicants } from '@/hooks/useApplicants';
import type { Applicant } from '@/types/applicant';

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const SEARCH_DEBOUNCE_MS = 400;
// stores HIDDEN keys → any column added later shows by default
const HIDDEN_COLUMNS_STORAGE_KEY = 'applicants:hidden-columns';

const COLUMN_KEYS = APPLICANT_COLUMNS.map(c => c.key);
const TOGGLEABLE_COUNT = APPLICANT_COLUMNS.length;

function useDebounced<T>(value: T, delay: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function ApplicantsPage() {
  const [status, setStatus] = useState(ALL_TAB);
  const [requirementIds, setRequirementIds] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignTarget, setAssignTarget] = useState<{ ids: string[]; label: string } | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);

  const listRef = useRef<HTMLDivElement>(null);
  const exportApplicants = useExportApplicants();

  const search = useDebounced(searchInput, SEARCH_DEBOUNCE_MS);
  const isRequirementsView = status === REQUIREMENTS_TAB;

  // restore saved column choice
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HIDDEN_COLUMNS_STORAGE_KEY);
      const parsed: unknown = saved ? JSON.parse(saved) : [];
      if (Array.isArray(parsed))
        setHiddenColumns(parsed.filter((k): k is string => COLUMN_KEYS.includes(k)));
    } catch {
      /* storage unavailable — keep defaults */
    }
  }, []);

  const saveHiddenColumns = (next: string[]) => {
    setHiddenColumns(next);
    try {
      localStorage.setItem(HIDDEN_COLUMNS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — choice lasts for this session only */
    }
  };

  const toggleColumn = (key: string, visible: boolean) =>
    saveHiddenColumns(
      visible ? hiddenColumns.filter(k => k !== key) : [...new Set([...hiddenColumns, key])]
    );

  const visibleColumnCount = TOGGLEABLE_COUNT - hiddenColumns.length;

  // reset paging + selection whenever filters change
  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [status, requirementIds, search, from, to, pageSize]);

  // selection is per page — never export/assign rows you can't see
  useEffect(() => {
    setSelected(new Set());
  }, [page]);

  // one filter object → table query AND export
  const activeFilters = {
    status: status !== ALL_TAB && !isRequirementsView ? status : undefined,
    requirementIds: requirementIds.length ? requirementIds : undefined,
    search: search.trim() || undefined,
    from: toIsoStart(from),
    to: toIsoEnd(to),
  };

  const { data, isLoading, isError, error } = useApplicants({
    ...activeFilters,
    page,
    limit: pageSize,
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const statusKeys = meta?.assignmentStatuses ?? [];
  const counts = meta?.counts ?? {};
  const allCount = Object.values(counts).reduce((s, n) => s + n, 0);
  const requirementOptions = meta?.requirementOptions ?? [];

  // assign only acts on the unassigned rows in the selection
  const selectedUnassignedIds = rows.filter(r => selected.has(r.id) && !r.pipeline).map(r => r.id);

  // requirements tab — filtered + paged on the client (list is already scoped by backend)
  const term = search.trim().toLowerCase();
  const filteredRequirements = useMemo(
    () =>
      requirementOptions.filter(
        r =>
          (!requirementIds.length || requirementIds.includes(r.id)) &&
          (!term ||
            [r.reqCode, r.title, r.client?.name ?? ''].some(v => v.toLowerCase().includes(term)))
      ),
    [requirementOptions, requirementIds, term]
  );
  const requirementPageRows = filteredRequirements.slice((page - 1) * pageSize, page * pageSize);

  const total = isRequirementsView ? filteredRequirements.length : (meta?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const hasFilters = requirementIds.length > 0 || !!searchInput || !!from || !!to;

  const clearFilters = () => {
    setRequirementIds([]);
    setSearchInput('');
    setFrom('');
    setTo('');
  };

  // export — current filters + visible columns, optionally only the ticked rows
  const visibleColumnKeys = APPLICANT_COLUMNS.filter(
    c => c.locked || !hiddenColumns.includes(c.key)
  ).map(c => c.key);

  const handleExport = (onlySelected: boolean) => {
    const count = onlySelected ? selected.size : total;
    exportApplicants.mutate(
      {
        ...activeFilters,
        columns: visibleColumnKeys,
        snapshotIds: onlySelected ? [...selected] : undefined,
      },
      {
        onSuccess: () => toast.success(`Exported ${count} applicant(s)`),
        onError: () => toast.error('Export failed'),
      }
    );
  };

  // stat card click → switch tab + bring the list into view
  const selectTab = (tab: string) => {
    setStatus(tab);
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // requirements tab → that requirement's applicants
  const openRequirement = (id: string) => {
    setRequirementIds([id]);
    setStatus(ALL_TAB);
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

      {/* overview — stat cards link to the tabs below */}
      <ApplicantsOverview summary={meta?.summary} statusKeys={statusKeys} onSelectTab={selectTab} />

      {/* list */}
      <div ref={listRef} className="scroll-mt-4">
        <Card className="gap-0 py-0">
          {/* tabs + bulk actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <Tabs value={status} onValueChange={setStatus}>
              <TabsList>
                <TabsTrigger value={ALL_TAB} className="text-[13px]">
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
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-muted-foreground">{selected.size} selected</span>
                {selectedUnassignedIds.length > 0 && (
                  <Button
                    size="sm"
                    onClick={() =>
                      setAssignTarget({
                        ids: selectedUnassignedIds,
                        label: `${selectedUnassignedIds.length} applicant(s)`,
                      })
                    }
                  >
                    <UserPlus className="mr-2 h-4 w-4" /> Assign {selectedUnassignedIds.length}
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                  <X className="mr-1 h-4 w-4" /> Deselect
                </Button>
              </div>
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

            <RequirementMultiSelect
              options={requirementOptions}
              value={requirementIds}
              onChange={setRequirementIds}
            />

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

            {!isRequirementsView && (
              <div className="ml-auto flex items-center gap-2">
                {/* export — selected rows or everything matching the filters */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 text-[13px]"
                      disabled={!total || exportApplicants.isPending}
                    >
                      {exportApplicants.isPending ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-1.5 h-4 w-4" />
                      )}
                      Export
                      <ChevronDown className="ml-1.5 h-3.5 w-3.5 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60">
                    <DropdownMenuItem
                      className="text-[13px]"
                      disabled={!selected.size}
                      onSelect={() => handleExport(true)}
                    >
                      Export selected ({selected.size})
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-[13px]" onSelect={() => handleExport(false)}>
                      Export all filtered ({total})
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* column picker */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 text-[13px]">
                      <Columns3 className="mr-1.5 h-4 w-4" />
                      Columns ({visibleColumnCount}/{TOGGLEABLE_COUNT})
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="text-[12px] text-muted-foreground">
                      Show columns
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {APPLICANT_COLUMNS.map(c => (
                      <DropdownMenuCheckboxItem
                        key={c.key}
                        className="text-[13px]"
                        checked={c.locked || !hiddenColumns.includes(c.key)}
                        disabled={c.locked}
                        onCheckedChange={v => toggleColumn(c.key, v === true)}
                        onSelect={e => e.preventDefault()} // keep menu open while toggling
                      >
                        {c.label}
                        {c.locked && (
                          <span className="ml-auto text-[11px] text-muted-foreground">Always</span>
                        )}
                      </DropdownMenuCheckboxItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-[13px]"
                      disabled={!hiddenColumns.length}
                      onSelect={e => {
                        e.preventDefault();
                        saveHiddenColumns([]);
                      }}
                    >
                      Show all columns
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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
                  hiddenColumns={hiddenColumns}
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
      </div>

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
