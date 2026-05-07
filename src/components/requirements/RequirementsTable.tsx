/* eslint-disable @typescript-eslint/no-explicit-any */
// components/requirements/RequirementsTable.tsx
'use client';

import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
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
import { RowActions } from './RowActions';
import { statusVariant, priorityVariant, humanize } from './utils';
import { STATUS_OPTIONS } from './constants';
import type { RequirementListItem, RequirementStatus } from '@/types/requirements.types';

interface Props {
  requirements: RequirementListItem[];
  meta?: any;
  permissions?: any;
  isLoading: boolean;
  isFetching: boolean;
  page: number;
  onPageChange: (p: number) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  onStatusChange: (req: RequirementListItem, to: RequirementStatus) => void;
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 9 }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function RequirementsTable({
  requirements,
  meta,
  permissions,
  isLoading,
  isFetching,
  page,
  onPageChange,
  onClearFilters,
  hasActiveFilters,
  onStatusChange,
}: Props) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[110px]">Code</TableHead>
              <TableHead>Title / Skills</TableHead>
              <TableHead className="w-[130px]">Client</TableHead>
              <TableHead className="w-[80px]">BU</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[80px]">Priority</TableHead>
              <TableHead className="w-[120px]">Type</TableHead>
              <TableHead className="w-[90px]">Openings</TableHead>
              <TableHead className="w-[110px]">Respond by</TableHead>
              <TableHead className="w-[40px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton />
            ) : requirements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-16 text-muted-foreground text-sm">
                  No requirements found
                  {hasActiveFilters && (
                    <button onClick={onClearFilters} className="ml-1 text-primary hover:underline">
                      Clear filters
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              requirements.map(req => (
                <TableRow
                  key={req.id}
                  className={`cursor-pointer hover:bg-muted/40 transition-colors ${isFetching ? 'opacity-60' : ''}`}
                  onClick={() => router.push(`/requirements/${req.id}`)}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {req.reqCode}
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-sm line-clamp-1">{req.title}</span>
                      {req.skills.length > 0 && (
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {req.skills.slice(0, 4).join(', ')}
                          {req.skills.length > 4 && ` +${req.skills.length - 4}`}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <span className="text-sm line-clamp-1">{req.client.name}</span>
                  </TableCell>

                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {req.businessUnit?.name ?? '—'}
                    </span>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Badge
                        variant={statusVariant(req.status)}
                        className="text-xs whitespace-nowrap"
                      >
                        {STATUS_OPTIONS.find(s => s.value === req.status)?.label ?? req.status}
                      </Badge>
                      {(req.isRespondByBreached || req.isTurnaroundBreached) && (
                        <span className="text-destructive text-xs" title="Deadline breached">
                          ⚠
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant={priorityVariant(req.priority)} className="text-xs">
                      {humanize(req.priority)}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {humanize(req.jobType)} · {humanize(req.remoteType)}
                    </span>
                  </TableCell>

                  <TableCell>
                    <span className="text-sm tabular-nums">
                      {req.filledOpenings}/{req.totalOpenings}
                    </span>
                  </TableCell>

                  <TableCell>
                    {req.respondBy ? (
                      <span
                        className={`text-xs tabular-nums ${req.isRespondByBreached ? 'text-destructive font-medium' : 'text-muted-foreground'}`}
                      >
                        {format(new Date(req.respondBy), 'dd MMM yy')}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell onClick={e => e.stopPropagation()} className="p-1">
                    <RowActions
                      req={req}
                      canEdit={permissions?.canEdit ?? false}
                      onStatusChange={onStatusChange}
                      onView={id => router.push(`/requirements/${id}`)}
                      onEdit={id => router.push(`/requirements/${id}/edit`)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {meta && meta.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of{' '}
            {meta.total}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="h-8"
            >
              Previous
            </Button>
            <span className="px-3 tabular-nums">
              {meta.page} / {meta.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.pages}
              onClick={() => onPageChange(page + 1)}
              className="h-8"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
