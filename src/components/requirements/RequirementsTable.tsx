/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Users,
  ExternalLink,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import type { RequirementListItem, RequirementStatus } from '@/types/requirements.types';

// ── helpers ───────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<RequirementStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DRAFT: 'bg-slate-100 text-slate-600 border-slate-200',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-200',
  ON_HOLD: 'bg-orange-50 text-orange-700 border-orange-200',
  CLOSED: 'bg-red-50 text-red-700 border-red-200',
  CANCELLED: 'bg-gray-100 text-gray-500 border-gray-200',
};

const STATUS_LABELS: Record<RequirementStatus, string> = {
  ACTIVE: 'Active',
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending',
  ON_HOLD: 'On Hold',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

const PRIORITY_STYLES: Record<string, string> = {
  HIGH: 'bg-red-50 text-red-700 border-red-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  LOW: 'bg-green-50 text-green-700 border-green-200',
};

const NEXT_STATUSES: Record<RequirementStatus, RequirementStatus[]> = {
  DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['ACTIVE', 'DRAFT', 'CANCELLED'],
  ACTIVE: ['ON_HOLD', 'CLOSED', 'CANCELLED'],
  ON_HOLD: ['ACTIVE', 'CLOSED', 'CANCELLED'],
  CLOSED: [],
  CANCELLED: [],
};

function jobAge(createdAt: string): string {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return '1d';
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

function formatSalary(min?: number | null, max?: number | null, type?: string | null): string {
  if (!min && !max) return '—';
  const fmt = (n: number) =>
    n >= 100_000 ? `${(n / 100_000).toFixed(1)}L` : `${(n / 1000).toFixed(0)}K`;
  const range = min && max ? `${fmt(min)}–${fmt(max)}` : min ? `${fmt(min)}+` : `≤${fmt(max!)}`;
  const suffix = type === 'ANNUAL' ? '/yr' : type === 'MONTHLY' ? '/mo' : '';
  return `₹${range}${suffix}`;
}

// ── types ─────────────────────────────────────────────────────────────────────

type Meta = { total: number; page: number; limit: number; pages: number };
type Permissions = { canAdd?: boolean; canEdit?: boolean; canDelete?: boolean };

type Props = {
  requirements: RequirementListItem[];
  meta?: Meta;
  permissions?: Permissions;
  isLoading: boolean;
  isFetching: boolean;
  page: number;
  onPageChange: (p: number) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  onStatusChange: (req: RequirementListItem, to: RequirementStatus) => void;
};

// ── component ─────────────────────────────────────────────────────────────────

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

  if (isLoading) return <TableSkeleton />;

  if (!!requirements.length) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 border rounded-lg">
        <p className="text-sm font-medium text-muted-foreground">No requirements found</p>
        {hasActiveFilters && (
          <Button variant="link" size="sm" className="mt-2" onClick={onClearFilters}>
            Clear filters
          </Button>
        )}
      </div>
    );
  }

  return (
    // This wrapper fills the flex-1 space from the page and manages both scrolls
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col flex-1 min-h-0 rounded-lg border overflow-hidden">
        {/* Horizontal + vertical scroll lives here — table never escapes this box */}
        <div
          className={`flex-1 min-h-0 overflow-auto transition-opacity ${isFetching ? 'opacity-70' : ''}`}
          // always show scrollbars so user knows they can scroll
          style={{ scrollbarGutter: 'stable' }}
        >
          <table className="w-max min-w-full text-sm border-collapse">
            {/* Sticky header — stays visible while scrolling vertically */}
            <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm">
              <tr className="border-b">
                <Th sticky className="w-32">
                  Job Code
                </Th>
                <Th className="min-w-50">Job Title</Th>
                <Th className="w-24">Status</Th>
                <Th className="w-20">Priority</Th>
                <Th className="w-14 text-center">Age</Th>
                <Th className="min-w-32.5">Client</Th>
                <Th className="min-w-32.5">BU</Th>
                <Th className="min-w-32.5">Service Line</Th>
                <Th className="min-w-32.5">Location</Th>
                <Th className="min-w-32.5">Created By</Th>
                <Th className="min-w-32.5">Assigned To</Th>
                <Th className="min-w-32.5">Salary</Th>
                <Th className="w-20 text-center">Openings</Th>
                <Th className="w-24 text-center">Pipeline</Th>
                <Th className="w-20 text-center">Interviews</Th>
                <Th className="w-16 text-center">Offers</Th>
                <Th className="w-10" />
              </tr>
            </thead>

            <tbody className="divide-y bg-background">
              {requirements.map(req => {
                const nextStatuses = NEXT_STATUSES[req.status] ?? [];
                const assignees = req.assignments ?? [];
                const uniqueAssignees = assignees.filter(
                  (a: any, i: number, arr: any[]) =>
                    arr.findIndex((x: any) => x.assignedTo.id === a.assignedTo.id) === i
                );
                const assignedLabel = uniqueAssignees.length
                  ? uniqueAssignees
                      .map((a: any) => `${a.assignedTo.firstName} ${a.assignedTo.lastName}`.trim())
                      .join(', ')
                  : '—';

                const isBreached = req.isRespondByBreached || req.isTurnaroundBreached;
                const fillPct =
                  req.totalOpenings > 0
                    ? Math.min((req.filledOpenings / req.totalOpenings) * 100, 100)
                    : 0;

                return (
                  <tr
                    key={req.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => router.push(`/requirements/${req.id}`)}
                  >
                    {/* Job Code */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {isBreached && (
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent>Deadline breached</TooltipContent>
                          </Tooltip>
                        )}
                        <span className="font-mono text-xs text-muted-foreground">
                          {req.reqCode}
                        </span>
                      </div>
                    </td>

                    {/* Job Title + skills */}
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-sm leading-tight line-clamp-1">{req.title}</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {(req.skills ?? []).slice(0, 2).map((s: string) => (
                          <span key={s} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-sm">
                            {s}
                          </span>
                        ))}
                        {(req.skills ?? []).length > 2 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{req.skills.length - 2}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td
                      className="px-3 py-2.5 whitespace-nowrap"
                      onClick={e => e.stopPropagation()}
                    >
                      <Badge variant="outline" className={`text-xs ${STATUS_STYLES[req.status]}`}>
                        {STATUS_LABELS[req.status]}
                      </Badge>
                    </td>

                    {/* Priority */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className={`text-xs ${PRIORITY_STYLES[req.priority] ?? ''}`}
                      >
                        {req.priority}
                      </Badge>
                    </td>

                    {/* Age */}
                    <td className="px-3 py-2.5 text-center">
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="text-xs text-muted-foreground">
                            {jobAge(req.createdAt)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {new Date(req.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </TooltipContent>
                      </Tooltip>
                    </td>

                    {/* Client */}
                    <td className="px-3 py-2.5 whitespace-nowrap text-sm">
                      {req.client?.name ?? '—'}
                    </td>

                    {/* BU */}
                    <td className="px-3 py-2.5 whitespace-nowrap text-sm text-muted-foreground">
                      {req.businessUnit?.name ?? '—'}
                    </td>

                    {/* Service Line */}
                    <td className="px-3 py-2.5 whitespace-nowrap text-sm text-muted-foreground">
                      {req.serviceLine?.name ?? '—'}
                    </td>

                    {/* Location */}
                    <td className="px-3 py-2.5 max-w-32.5">
                      <Tooltip>
                        <TooltipTrigger className="block truncate text-sm text-muted-foreground text-left w-full">
                          {req.location ?? '—'}
                        </TooltipTrigger>
                        {req.location && <TooltipContent>{req.location}</TooltipContent>}
                      </Tooltip>
                    </td>

                    {/* Created By */}
                    <td className="px-3 py-2.5 whitespace-nowrap text-sm">
                      {req.createdBy
                        ? `${req.createdBy.firstName} ${req.createdBy.lastName}`.trim()
                        : '—'}
                    </td>

                    {/* Assigned To */}
                    <td className="px-3 py-2.5 max-w-37.5">
                      <Tooltip>
                        <TooltipTrigger className="block truncate text-sm text-left w-full">
                          {assignedLabel}
                        </TooltipTrigger>
                        {assignedLabel !== '—' && <TooltipContent>{assignedLabel}</TooltipContent>}
                      </Tooltip>
                    </td>

                    {/* Salary */}
                    <td className="px-3 py-2.5 whitespace-nowrap text-sm text-muted-foreground">
                      {formatSalary(
                        (req as any).salaryMin,
                        (req as any).salaryMax,
                        (req as any).salaryType
                      )}
                    </td>

                    {/* Openings — filled / total + mini progress */}
                    <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1 text-xs">
                        <span className="font-medium text-emerald-600">{req.filledOpenings}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="font-medium">{req.totalOpenings}</span>
                      </div>
                      <div className="mt-1 h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${fillPct}%` }}
                        />
                      </div>
                    </td>

                    {/* Pipeline count + eye button */}
                    <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <span className="flex items-center gap-1 text-xs font-medium">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {req.activeApplications}
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => router.push(`/pipeline?requirementId=${req.id}`)}
                            >
                              <Eye className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View pipeline</TooltipContent>
                        </Tooltip>
                      </div>
                    </td>

                    {/* Interviews */}
                    <td className="px-3 py-2.5 text-center text-xs font-medium">
                      {req.interviewsScheduled > 0 ? (
                        <span className="text-blue-600">{req.interviewsScheduled}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Offers */}
                    <td className="px-3 py-2.5 text-center text-xs font-medium">
                      {req.offersRolledOut > 0 ? (
                        <span className="text-violet-600">{req.offersRolledOut}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => router.push(`/requirements/${req.id}`)}>
                            <Eye className="h-4 w-4 mr-2" /> View Detail
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(`/pipeline?requirementId=${req.id}`)}
                          >
                            <Users className="h-4 w-4 mr-2" /> View Pipeline
                          </DropdownMenuItem>
                          {permissions?.canEdit && (
                            <DropdownMenuItem
                              onClick={() => router.push(`/requirements/${req.id}/edit`)}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                          )}
                          {permissions?.canEdit && nextStatuses.length > 0 && (
                            <>
                              <DropdownMenuSeparator />
                              {nextStatuses.map(s => (
                                <DropdownMenuItem
                                  key={s}
                                  className={
                                    s === 'CANCELLED' || s === 'CLOSED' ? 'text-destructive' : ''
                                  }
                                  onClick={() => onStatusChange(req, s)}
                                >
                                  → {STATUS_LABELS[s]}
                                </DropdownMenuItem>
                              ))}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination — pinned to bottom of the table box, never hidden */}
        {meta && meta.pages > 1 && (
          <div className="flex-none flex items-center justify-between px-4 py-2.5 border-t bg-background">
            <span className="text-xs text-muted-foreground">
              {(page - 1) * meta.limit + 1}–{Math.min(page * meta.limit, meta.total)} of{' '}
              {meta.total}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              {Array.from({ length: Math.min(meta.pages, 7) }, (_, i) => {
                const p = i + 1;
                return (
                  <Button
                    key={p}
                    variant={p === page ? 'default' : 'outline'}
                    size="icon"
                    className="h-6 w-6 text-xs"
                    onClick={() => onPageChange(p)}
                  >
                    {p}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6"
                disabled={page >= meta.pages}
                onClick={() => onPageChange(page + 1)}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// ── sticky header cell helper ─────────────────────────────────────────────────

function Th({
  children,
  className = '',
  sticky = false,
}: {
  children?: React.ReactNode;
  className?: string;
  sticky?: boolean;
}) {
  return (
    <th
      className={`
        px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap
        border-b
        ${sticky ? 'sticky left-0 z-20 bg-muted/90' : ''}
        ${className}
      `}
    >
      {children}
    </th>
  );
}

// ── loading skeleton ──────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="flex-1 min-h-0 rounded-lg border overflow-hidden flex flex-col">
      <div className="bg-muted/40 px-3 py-2.5 border-b flex gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-20" />
        ))}
      </div>
      <div className="flex-1 overflow-hidden divide-y">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-3 py-3 items-center">
            <Skeleton className="h-3 w-24 shrink-0" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
            <Skeleton className="h-3 w-12 shrink-0" />
            <Skeleton className="h-3 w-20 shrink-0" />
            <Skeleton className="h-3 w-20 shrink-0" />
            <Skeleton className="h-3 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
