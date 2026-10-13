// File: RequirementApplicantsDialog.tsx
// Path: src/components/applicants/RequirementApplicantsDialog.tsx

'use client';

import { useEffect, useMemo, useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApplicantsTable } from '@/components/applicants/ApplicantsTable';
import { AssignApplicantDialog } from '@/components/applicants/AssignApplicantDialog';
import { StatusPill } from '@/components/applicants/StatusPill';
import { TablePagination } from '@/components/applicants/TablePagination';
import { formatDate, toIsoEnd, toIsoStart, toStatusLabel } from '@/components/applicants/utils';
import { useApplicants } from '@/hooks/useApplicants';
import type { Applicant, ApplicantRequirementRow } from '@/types/applicant';

const ALL = 'ALL';
const PAGE_SIZE = 10;

interface Props {
  requirement: ApplicantRequirementRow | null;
  onOpenChange: (open: boolean) => void;
  defaultStatus?: string;
}

export function RequirementApplicantsDialog({ requirement, onOpenChange, defaultStatus }: Props) {
  const statusKeys = useMemo(() => Object.keys(requirement?.counts ?? {}), [requirement?.counts]);

  const [status, setStatus] = useState<string>(ALL);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignTarget, setAssignTarget] = useState<{ ids: string[]; label: string } | null>(null);

  // fresh state whenever a different requirement is opened
  useEffect(() => {
    setStatus(defaultStatus ?? statusKeys[0] ?? ALL);
    setFrom('');
    setTo('');
    setPage(1);
    setSelected(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirement?.id]);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [status, from, to]);

  const hasApplicants = (requirement?.applicantCount ?? 0) > 0;

  const { data, isLoading } = useApplicants(
    {
      requirementId: requirement?.id,
      status: status !== ALL ? status : undefined,
      from: toIsoStart(from),
      to: toIsoEnd(to),
      page,
      limit: PAGE_SIZE,
    },
    !!requirement && hasApplicants
  );

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta ? Math.max(1, Math.ceil(meta.total / meta.limit)) : 1;

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

  return (
    <Dialog open={!!requirement} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-6xl flex-col gap-4 overflow-hidden sm:max-w-6xl">
        {requirement && (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2 pr-6">
                <DialogTitle>{requirement.reqCode}</DialogTitle>
                <StatusPill status={requirement.status} />
              </div>
              <DialogDescription>
                {requirement.title}
                {requirement.client?.name ? ` · ${requirement.client.name}` : ''} · Created{' '}
                {formatDate(requirement.createdAt)}
              </DialogDescription>
            </DialogHeader>

            {/* toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Tabs value={status} onValueChange={setStatus}>
                <TabsList>
                  {statusKeys.map(k => (
                    <TabsTrigger key={k} value={k} className="gap-2">
                      {toStatusLabel(k)}
                      <Badge variant="secondary" className="h-5 px-1.5">
                        {requirement.counts[k]}
                      </Badge>
                    </TabsTrigger>
                  ))}
                  <TabsTrigger value={ALL} className="gap-2">
                    All
                    <Badge variant="secondary" className="h-5 px-1.5">
                      {requirement.applicantCount}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={e => setFrom(e.target.value)}
                  className="h-9 w-36"
                  aria-label="Applied from"
                />
                <span className="text-sm text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={e => setTo(e.target.value)}
                  className="h-9 w-36"
                  aria-label="Applied to"
                />
                {(from || to) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFrom('');
                      setTo('');
                    }}
                  >
                    <X className="mr-1 h-4 w-4" /> Clear
                  </Button>
                )}
                {selected.size > 0 && (
                  <Button
                    size="sm"
                    onClick={() =>
                      setAssignTarget({
                        ids: [...selected],
                        label: `${selected.size} applicant(s)`,
                      })
                    }
                  >
                    <UserPlus className="mr-2 h-4 w-4" /> Assign {selected.size}
                  </Button>
                )}
              </div>
            </div>

            {/* table */}
            <div className="min-h-0 flex-1 overflow-hidden rounded-lg border [&>div]:max-h-[55vh]">
              {' '}
              {hasApplicants ? (
                <ApplicantsTable
                  rows={rows}
                  isLoading={isLoading}
                  selected={selected}
                  onToggle={toggle}
                  onToggleAll={toggleAll}
                  onAssign={(a: Applicant) => setAssignTarget({ ids: [a.id], label: a.fullName })}
                />
              ) : (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  No one has applied to this requirement yet.
                </p>
              )}
            </div>

            {/* footer */}
            {meta && meta.total > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>
                  Showing {(meta.page - 1) * meta.limit + 1}–
                  {Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
                </span>
                <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}

            <AssignApplicantDialog
              open={!!assignTarget}
              onOpenChange={o => !o && setAssignTarget(null)}
              snapshotIds={assignTarget?.ids ?? []}
              label={assignTarget?.label ?? ''}
              onAssigned={() => setSelected(new Set())}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
