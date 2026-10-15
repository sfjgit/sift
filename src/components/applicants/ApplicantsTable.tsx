// File: ApplicantsTable.tsx
// Path: src/components/applicants/ApplicantsTable.tsx

'use client';

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
import { formatDate, formatExperience, personName } from '@/components/applicants/utils';
import type { Applicant } from '@/types/applicant';

const MAX_SKILLS = 3;
const SKELETON_ROWS = 6;
const COL_COUNT = 9;
const HEAD = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';

// existing candidate detail page — keyed by Candidate Service id
const candidateDetailPath = (candidateServiceId: string) => `/candidates/${candidateServiceId}`;

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
  const router = useRouter();

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
          <TableHead className={`${HEAD} text-`}>Name</TableHead>
          <TableHead className={`${HEAD} text-`}>Experience</TableHead>
          <TableHead className={`${HEAD} text-center`}>Skills</TableHead>
          <TableHead className={`${HEAD} text-`}>Current company</TableHead>
          <TableHead className={`${HEAD} text-`}>Applied for</TableHead>
          <TableHead className={`${HEAD} text-center`}>Applied on</TableHead>
          <TableHead className={`${HEAD} text-center`}>Status</TableHead>
          <TableHead className={`${HEAD} text-center`}>Actions</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {isLoading &&
          Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <TableRow key={`sk-${i}`}>
              {Array.from({ length: COL_COUNT }).map((__, j) => (
                <TableCell key={j}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}

        {!isLoading && rows.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={COL_COUNT}
              className="h-28 text-center text-[13px] text-muted-foreground"
            >
              No applicants match these filters.
            </TableCell>
          </TableRow>
        )}

        {!isLoading &&
          rows.map(a => {
            const assigned = !!a.pipeline;
            return (
              <TableRow
                key={a.id}
                className="cursor-pointer"
                data-state={selected.has(a.id) ? 'selected' : undefined}
                onClick={() => router.push(candidateDetailPath(a.candidateServiceId))}
              >
                <TableCell onClick={e => e.stopPropagation()}>
                  <Checkbox
                    checked={selected.has(a.id)}
                    disabled={assigned}
                    onCheckedChange={() => onToggle(a.id)}
                    aria-label={`Select ${a.fullName}`}
                  />
                </TableCell>

                {/* Name */}
                <TableCell>
                  <p className="text-[13px] font-medium">{a.fullName}</p>
                  <p className="text-[12px] text-muted-foreground">{a.email}</p>
                  {a.phone && <p className="text-[12px] text-muted-foreground">{a.phone}</p>}
                </TableCell>

                {/* Experience */}
                <TableCell className="whitespace-nowrap text-[13px]">
                  {formatExperience(a.totalExpYears)}
                </TableCell>

                {/* Skills */}
                <TableCell>
                  {a.topSkills.length ? (
                    <div className="flex max-w-55 flex-wrap gap-1">
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
                    <span className="text-[13px] text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Current company */}
                <TableCell>
                  <p className="text-[13px]">{a.currentCompany ?? '—'}</p>
                  {a.currentTitle && (
                    <p className="text-[12px] text-muted-foreground">{a.currentTitle}</p>
                  )}
                </TableCell>

                {/* Applied for */}
                <TableCell>
                  <p className="text-[13px] font-medium">{a.requirement.reqCode}</p>
                  <p className="max-w-60 truncate text-[12px] text-muted-foreground">
                    {a.requirement.title}
                  </p>
                  <p className="max-w-60 truncate text-[11px] text-muted-foreground">
                    {a.requirement.client?.name ?? '—'} · by {personName(a.requirement.createdBy)}
                  </p>
                </TableCell>

                {/* Applied on */}
                <TableCell className="whitespace-nowrap text-[13px]">
                  {formatDate(a.snapshotAt, true)}
                </TableCell>

                {/* Status */}
                <TableCell>
                  {assigned ? (
                    <>
                      <Badge variant="secondary">{a.pipeline!.currentStage.label}</Badge>
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        {personName(a.pipeline!.recruiter)}
                      </p>
                    </>
                  ) : (
                    <Badge variant="outline">Unassigned</Badge>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1.5">
                    {!assigned && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-[12px]"
                        onClick={() => onAssign(a)}
                      >
                        <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Assign
                      </Button>
                    )}
                    {/* {a.resumeUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="View resume"
                        aria-label="View resume"
                        asChild
                      >
                        <a href={a.resumeUrl} target="_blank" rel="noopener noreferrer">
                          <FileText className="h-4 w-4" />
                        </a>
                      </Button>
                    )} */}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
      </TableBody>
    </Table>
  );
}
