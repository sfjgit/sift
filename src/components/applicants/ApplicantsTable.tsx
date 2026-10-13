// File: ApplicantsTable.tsx
// Path: src/components/applicants/ApplicantsTable.tsx

'use client';

import { FileText, MoreHorizontal, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { StatusPill } from '@/components/applicants/StatusPill';
import { UserStack } from '@/components/applicants/UserStack';
import { avatarTone, formatDate, getInitials } from '@/components/applicants/utils';
import type { Applicant } from '@/types/applicant';

const MAX_SKILLS = 3;
const SKELETON_ROWS = 5;
const COL_COUNT = 9;
const HEAD = 'whitespace-nowrap text-xs font-medium uppercase tracking-wide text-muted-foreground';

interface Props {
  rows: Applicant[];
  isLoading: boolean;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], checked: boolean) => void;
  onAssign: (applicant: Applicant) => void;
}

export function ApplicantsTable({
  rows,
  isLoading,
  selected,
  onToggle,
  onToggleAll,
  onAssign,
}: Props) {
  const selectableIds = rows.filter(r => !r.pipeline).map(r => r.id);
  const allChecked = selectableIds.length > 0 && selectableIds.every(id => selected.has(id));
  const someChecked = selectableIds.some(id => selected.has(id));

  return (
    <Table>
      <TableHeader className="sticky top-0 z-10 bg-muted">
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-10">
            <Checkbox
              checked={allChecked ? true : someChecked ? 'indeterminate' : false}
              disabled={!selectableIds.length}
              onCheckedChange={c => onToggleAll(selectableIds, c === true)}
              aria-label="Select all unassigned"
            />
          </TableHead>
          <TableHead className={HEAD}>Applicant</TableHead>
          <TableHead className={HEAD}>Profile</TableHead>
          <TableHead className={HEAD}>Skills</TableHead>
          <TableHead className={HEAD}>Applied on</TableHead>
          <TableHead className={HEAD}>Stage</TableHead>
          <TableHead className={HEAD}>Assigned to</TableHead>
          <TableHead className={HEAD}>Assigned by</TableHead>
          <TableHead className={cn(HEAD, 'w-12 text-right')}>Action</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {isLoading &&
          Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <TableRow key={`sk-${i}`}>
              {Array.from({ length: COL_COUNT }).map((__, j) => (
                <TableCell key={j} className="py-4">
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}

        {!isLoading && rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={COL_COUNT} className="h-32 text-center text-muted-foreground">
              No applicants match these filters.
            </TableCell>
          </TableRow>
        )}

        {!isLoading &&
          rows.map(a => {
            const assigned = !!a.pipeline;
            return (
              <TableRow key={a.id} data-state={selected.has(a.id) ? 'selected' : undefined}>
                <TableCell className="py-3">
                  <Checkbox
                    checked={selected.has(a.id)}
                    disabled={assigned}
                    onCheckedChange={() => onToggle(a.id)}
                    aria-label={`Select ${a.fullName}`}
                  />
                </TableCell>

                <TableCell className="py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback
                        className={cn('text-xs font-semibold', avatarTone(a.fullName))}
                      >
                        {getInitials(a.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col">
                      <span className="whitespace-nowrap font-medium">{a.fullName}</span>
                      <span className="truncate text-xs text-muted-foreground">{a.email}</span>
                      {a.phone && <span className="text-xs text-muted-foreground">{a.phone}</span>}
                    </div>
                  </div>
                </TableCell>

                <TableCell className="py-3">
                  <div className="flex flex-col text-sm">
                    <span>{a.currentTitle ?? '—'}</span>
                    <span className="text-xs text-muted-foreground">
                      {a.currentCompany ?? '—'}
                      {a.totalExpYears != null && ` · ${a.totalExpYears} yrs`}
                    </span>
                  </div>
                </TableCell>

                <TableCell className="py-3">
                  <div className="flex max-w-[220px] flex-wrap gap-1">
                    {a.topSkills.slice(0, MAX_SKILLS).map(s => (
                      <Badge key={s} variant="secondary" className="font-normal">
                        {s}
                      </Badge>
                    ))}
                    {a.topSkills.length > MAX_SKILLS && (
                      <Badge variant="outline" className="font-normal">
                        +{a.topSkills.length - MAX_SKILLS}
                      </Badge>
                    )}
                  </div>
                </TableCell>

                <TableCell className="whitespace-nowrap py-3 text-sm">
                  {formatDate(a.snapshotAt, true)}
                  {a.sourced && <div className="text-xs text-muted-foreground">{a.sourced}</div>}
                </TableCell>

                <TableCell className="py-3">
                  {assigned ? (
                    <StatusPill
                      status="ASSIGNED"
                      tone="blue"
                      label={a.pipeline!.currentStage.label}
                    />
                  ) : (
                    <StatusPill status="UNASSIGNED" />
                  )}
                </TableCell>

                <TableCell className="py-3">
                  <UserStack users={[a.pipeline?.recruiter]} />
                </TableCell>

                <TableCell className="py-3">
                  <div className="flex flex-col gap-0.5">
                    <UserStack users={[a.pipeline?.assignedBy]} />
                    {a.pipeline?.assignedAt && (
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(a.pipeline.assignedAt, true)}
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem disabled={assigned} onSelect={() => onAssign(a)}>
                        <UserPlus className="mr-2 h-4 w-4" /> Assign to recruiter
                      </DropdownMenuItem>
                      {a.resumeUrl && (
                        <DropdownMenuItem asChild>
                          <a href={a.resumeUrl} target="_blank" rel="noopener noreferrer">
                            <FileText className="mr-2 h-4 w-4" /> View resume
                          </a>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
      </TableBody>
    </Table>
  );
}
