// File: RequirementsTable.tsx
// Path: src/components/applicants/RequirementsTable.tsx

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate, personName, toStatusLabel } from '@/components/applicants/utils';
import type { ApplicantRequirementOption } from '@/types/applicant';

const SKELETON_ROWS = 6;
const COL_COUNT = 7;
const HEAD = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';

interface Props {
  rows: ApplicantRequirementOption[];
  statusKeys: string[];
  isLoading: boolean;
  onOpen: (requirementId: string) => void; // show this requirement's applicants
}

export function RequirementsTable({ rows, statusKeys, isLoading, onOpen }: Props) {
  return (
    <Table>
      <TableHeader className="sticky top-0 z-10 bg-muted">
        <TableRow className="hover:bg-transparent">
          <TableHead className={HEAD}>Requirement</TableHead>
          <TableHead className={HEAD}>Client</TableHead>
          <TableHead className={HEAD}>Applicants</TableHead>
          <TableHead className={HEAD}>Created by</TableHead>
          <TableHead className={HEAD}>Status</TableHead>
          <TableHead className={HEAD}>Created on</TableHead>
          <TableHead className="w-28" />
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
              No requirements found.
            </TableCell>
          </TableRow>
        )}

        {!isLoading &&
          rows.map(r => (
            <TableRow key={r.id} className="cursor-pointer" onClick={() => onOpen(r.id)}>
              <TableCell>
                <p className="text-[13px] font-medium">{r.reqCode}</p>
                <p className="max-w-72 truncate text-[12px] text-muted-foreground">{r.title}</p>
              </TableCell>

              <TableCell className="text-[13px]">{r.client?.name ?? '—'}</TableCell>

              <TableCell>
                <p className="text-[13px] font-semibold">{r.count}</p>
                {r.count > 0 && (
                  <p className="text-[12px] text-muted-foreground">
                    {statusKeys
                      .map(k => `${r.counts[k] ?? 0} ${toStatusLabel(k).toLowerCase()}`)
                      .join(' · ')}
                  </p>
                )}
              </TableCell>

              <TableCell className="whitespace-nowrap text-[13px]">
                {personName(r.createdBy)}
              </TableCell>

              <TableCell>
                <Badge variant="outline">{toStatusLabel(r.status)}</Badge>
              </TableCell>

              <TableCell className="whitespace-nowrap text-[13px] text-muted-foreground">
                {formatDate(r.createdAt)}
              </TableCell>

              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={r.count === 0}
                  onClick={e => {
                    e.stopPropagation();
                    onOpen(r.id);
                  }}
                >
                  View applicants
                </Button>
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}
