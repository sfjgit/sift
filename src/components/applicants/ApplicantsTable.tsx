// File: ApplicantsTable.tsx
// Path: src/components/applicants/ApplicantsTable.tsx

'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatDate, formatExperience, personName } from '@/components/applicants/utils';
import type { Applicant } from '@/types/applicant';

const MAX_SKILLS = 3;
const SKELETON_ROWS = 6;

// one border + padding rule for every header / cell → even grid lines
const BORDER = 'border-r border-border last:border-r-0';
const HEAD = cn(
  BORDER,
  'h-10 px-3 whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'
);
const CELL = cn(BORDER, 'px-3 py-2.5 align-middle text-[13px]');
const NOWRAP = 'whitespace-nowrap';

// visible on the muted header and on rows
const CHECKBOX = 'border-muted-foreground/60 bg-background';

// existing candidate detail page — keyed by Candidate Service id
const candidateDetailPath = (candidateServiceId: string) => `/candidates/${candidateServiceId}`;

interface CellContext {
  onAssign: (applicant: Applicant) => void;
}

export interface ApplicantColumn {
  key: string;
  label: string;
  locked?: boolean; // always visible, can't be hidden
  headClassName?: string;
  cellClassName?: string;
  stopRowClick?: boolean; // interactive cell — don't open the candidate page
  render: (a: Applicant, ctx: CellContext) => ReactNode;
}

// single source of truth — headers, cells, column picker and export all read this
export const APPLICANT_COLUMNS: ApplicantColumn[] = [
  {
    key: 'actions',
    label: 'Actions',
    locked: true,
    headClassName: 'text-center',
    cellClassName: 'text-center',
    stopRowClick: true,
    render: (a, { onAssign }) =>
      a.pipeline ? (
        <span className="text-[12px] text-muted-foreground">Assigned</span>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-[12px]"
          onClick={() => onAssign(a)}
        >
          <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Assign
        </Button>
      ),
  },
  {
    key: 'appliedOn',
    label: 'Applied on',
    cellClassName: NOWRAP,
    render: a => formatDate(a.snapshotAt),
  },
  {
    key: 'name',
    label: 'Name',
    locked: true,
    cellClassName: cn(NOWRAP, 'font-medium'),
    render: a => a.fullName,
  },
  {
    key: 'email',
    label: 'Email',
    cellClassName: NOWRAP,
    render: a => a.email,
  },
  {
    key: 'phone',
    label: 'Ph.no',
    cellClassName: NOWRAP,
    render: a => a.phone ?? '—',
  },
  {
    key: 'experience',
    label: 'Experience',
    cellClassName: NOWRAP,
    render: a => formatExperience(a.totalExpYears),
  },
  {
    key: 'skills',
    label: 'Skills',
    render: a =>
      a.topSkills.length ? (
        <div className="flex min-w-40 max-w-55 flex-wrap gap-1">
          {a.topSkills.slice(0, MAX_SKILLS).map(s => (
            <Badge key={s} variant="secondary" className="font-normal">
              {s}
            </Badge>
          ))}
          {a.topSkills.length > MAX_SKILLS && (
            <Badge
              variant="outline"
              className="font-normal"
              title={a.topSkills.slice(MAX_SKILLS).join(', ')}
            >
              +{a.topSkills.length - MAX_SKILLS}
            </Badge>
          )}
        </div>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: 'currentCompany',
    label: 'Current company',
    cellClassName: NOWRAP,
    render: a => a.currentCompany ?? '—',
  },
  {
    key: 'designation',
    label: 'Designation',
    cellClassName: NOWRAP,
    render: a => a.currentTitle ?? '—',
  },
  {
    key: 'appliedFor',
    label: 'Applied for',
    render: a => (
      <div className="max-w-60">
        <p className="truncate font-medium">{a.requirement.title}</p>
        <p className="truncate text-[12px] text-muted-foreground">{a.requirement.reqCode}</p>
      </div>
    ),
  },
  {
    key: 'client',
    label: 'Client',
    cellClassName: NOWRAP,
    render: a => a.requirement.client?.name ?? '—',
  },
  {
    key: 'createdBy',
    label: 'Created by',
    cellClassName: NOWRAP,
    render: a => personName(a.requirement.createdBy),
  },
];

interface Props {
  rows: Applicant[];
  isLoading: boolean;
  hiddenColumns: string[]; // keys from APPLICANT_COLUMNS
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], checked: boolean) => void;
  onAssign: (applicant: Applicant) => void;
}

export function ApplicantsTable({
  rows,
  isLoading,
  hiddenColumns,
  selected,
  onToggle,
  onToggleAll,
  onAssign,
}: Props) {
  const router = useRouter();

  const columns = APPLICANT_COLUMNS.filter(c => c.locked || !hiddenColumns.includes(c.key));
  const colCount = columns.length + 1; // + checkbox

  // every row is selectable (export); assign only acts on the unassigned ones
  const rowIds = rows.map(r => r.id);
  const allChecked = rowIds.length > 0 && rowIds.every(id => selected.has(id));
  const someChecked = rowIds.some(id => selected.has(id));

  return (
    <Table>
      <TableHeader className="sticky top-0 z-10 bg-muted">
        <TableRow className="border-b border-border hover:bg-transparent">
          <TableHead className={cn(BORDER, 'w-10 px-3')}>
            <Checkbox
              className={CHECKBOX}
              checked={allChecked ? true : someChecked ? 'indeterminate' : false}
              disabled={!rowIds.length}
              onCheckedChange={c => onToggleAll(rowIds, c === true)}
              aria-label="Select all on this page"
            />
          </TableHead>
          {columns.map(c => (
            <TableHead key={c.key} className={cn(HEAD, c.headClassName)}>
              {c.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>

      <TableBody>
        {isLoading &&
          Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <TableRow key={`sk-${i}`} className="border-b border-border">
              {Array.from({ length: colCount }).map((__, j) => (
                <TableCell key={j} className={CELL}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}

        {!isLoading && rows.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={colCount}
              className="h-28 text-center text-[13px] text-muted-foreground"
            >
              No applicants match these filters.
            </TableCell>
          </TableRow>
        )}

        {!isLoading &&
          rows.map(a => (
            <TableRow
              key={a.id}
              className="cursor-pointer border-b border-border"
              data-state={selected.has(a.id) ? 'selected' : undefined}
              onClick={() => router.push(candidateDetailPath(a.candidateServiceId))}
            >
              <TableCell className={cn(BORDER, 'w-10 px-3')} onClick={e => e.stopPropagation()}>
                <Checkbox
                  className={CHECKBOX}
                  checked={selected.has(a.id)}
                  onCheckedChange={() => onToggle(a.id)}
                  aria-label={`Select ${a.fullName}`}
                />
              </TableCell>

              {columns.map(c => (
                <TableCell
                  key={c.key}
                  className={cn(CELL, c.cellClassName)}
                  onClick={c.stopRowClick ? e => e.stopPropagation() : undefined}
                >
                  {c.render(a, { onAssign })}
                </TableCell>
              ))}
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}
