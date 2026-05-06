'use client';

import useSWR from 'swr';
import { format, formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import {
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Users,
  Briefcase,
  ChevronRight,
  Building2,
  Star,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAxios } from '@/hooks/useAxios';
import type { UserCardData } from './types';
import { userColor, userInitials } from './org.utils';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function priorityBadge(p: string) {
  if (p === 'HIGH') return 'border-destructive/40 text-destructive bg-destructive/5';
  if (p === 'MEDIUM') return 'border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-950/20';
  return 'text-muted-foreground';
}

function statusBadge(s: string) {
  if (s === 'ACTIVE')
    return 'border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20';
  if (s === 'CLOSED' || s === 'CANCELLED') return 'border-destructive/30 text-destructive';
  return 'text-muted-foreground';
}

function MetaRow({ icon: Icon, value }: { icon: React.ElementType; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function PanelSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-lg" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel content
// ─────────────────────────────────────────────────────────────────────────────

function PanelContent({ userId }: { userId: string }) {
  const axios = useAxios();
  const [tab, setTab] = useState<'pipeline' | 'clients'>('pipeline');

  const { data, isLoading } = useSWR<{ data: UserCardData }>(
    `/users/${userId}/card`,
    url => axios.get(url).then(r => r.data),
    { revalidateOnFocus: false }
  );

  if (isLoading) return <PanelSkeleton />;
  if (!data?.data)
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
        Failed to load
      </div>
    );

  const u = data.data;
  const color = userColor(u.id);
  const initials = userInitials(u.firstName, u.lastName);

  // aggregate pipeline stats across all assignments
  const totalSubmissions = u.assignmentsReceived.reduce((s, a) => s + a.submissionsCount, 0);
  const totalInterviews = u.assignmentsReceived.reduce((s, a) => s + a.interviewsCount, 0);
  const totalFilled = u.assignmentsReceived.reduce((s, a) => s + a.filledOpenings, 0);
  const totalAllocated = u.assignmentsReceived.reduce((s, a) => s + (a.allocatedOpenings ?? 0), 0);

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="px-4 py-4 border-b shrink-0">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
              color
            )}
          >
            {initials}
          </div>
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">
                {u.firstName} {u.lastName}
              </span>
              {!u.isActive && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  Inactive
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{u.role.name}</span>
            {u.employeeId && (
              <span className="text-[10px] font-mono text-muted-foreground">{u.employeeId}</span>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-col gap-1.5 mt-3">
          <MetaRow icon={Mail} value={u.email} />
          <MetaRow icon={Phone} value={u.phone} />
          <MetaRow icon={Building2} value={u.department?.name} />
          <MetaRow icon={MapPin} value={u.workingLocation} />
          <MetaRow
            icon={Calendar}
            value={u.dateOfJoin ? `Joined ${format(new Date(u.dateOfJoin), 'dd MMM yyyy')}` : null}
          />
          {u.reportingTo && (
            <MetaRow
              icon={ChevronRight}
              value={`Reports to ${u.reportingTo.firstName} ${u.reportingTo.lastName}`}
            />
          )}
          {u.teamLead && (
            <MetaRow icon={Star} value={`TL: ${u.teamLead.firstName} ${u.teamLead.lastName}`} />
          )}
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-1.5 px-4 py-3 border-b shrink-0">
        {[
          { label: 'Active Reqs', value: u._count.assignmentsReceived },
          { label: 'Submitted', value: totalSubmissions },
          { label: 'Interviews', value: totalInterviews },
          { label: 'Filled', value: totalFilled },
        ].map(s => (
          <div key={s.label} className="bg-muted/50 rounded-lg p-2 text-center">
            <div className="text-base font-bold tabular-nums leading-none">{s.value}</div>
            <div className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex border-b shrink-0">
        {(
          [
            { key: 'pipeline', label: `Pipeline (${u.assignmentsReceived.length})` },
            { key: 'clients', label: `Clients (${u.clientSpocs.length})` },
          ] as const
        ).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 py-2 text-xs font-medium transition-colors',
              tab === t.key
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {/* Pipeline tab */}
        {tab === 'pipeline' && (
          <div className="p-4 flex flex-col gap-2">
            {u.assignmentsReceived.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                <Briefcase className="h-8 w-8 opacity-20" />
                <p className="text-xs">No active requirements</p>
              </div>
            ) : (
              u.assignmentsReceived.map(a => (
                <div key={a.id} className="flex flex-col gap-2 rounded-lg border bg-card p-3">
                  {/* Req title + badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-xs font-medium truncate leading-snug">
                        {a.requirement.title}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="font-mono">{a.requirement.reqCode}</span>
                        <span>·</span>
                        <span className="truncate">{a.requirement.client.name}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge
                        variant="outline"
                        className={cn('text-[9px] px-1.5', priorityBadge(a.requirement.priority))}
                      >
                        {a.requirement.priority}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn('text-[9px] px-1.5', statusBadge(a.requirement.status))}
                      >
                        {a.requirement.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Mini stats */}
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { label: 'Alloc', value: a.allocatedOpenings ?? '—' },
                      { label: 'Sub', value: a.submissionsCount },
                      { label: 'Int', value: a.interviewsCount },
                      { label: 'Fill', value: a.filledOpenings },
                    ].map(s => (
                      <div
                        key={s.label}
                        className="flex flex-col items-center bg-muted/40 rounded-md py-1.5"
                      >
                        <span className="text-xs font-bold tabular-nums">{s.value}</span>
                        <span className="text-[9px] text-muted-foreground">{s.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Deadline */}
                  {a.deadline && (
                    <div className="text-[10px] text-muted-foreground">
                      Due {formatDistanceToNow(new Date(a.deadline), { addSuffix: true })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Clients tab */}
        {tab === 'clients' && (
          <div className="p-4 flex flex-col gap-2">
            {u.clientSpocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                <Building2 className="h-8 w-8 opacity-20" />
                <p className="text-xs">No client SPOCs</p>
              </div>
            ) : (
              u.clientSpocs.map(s => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-lg border bg-card p-3"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-xs font-medium truncate">{s.client.name}</span>
                    <span className="text-[10px] text-muted-foreground">{s.serviceLine.name}</span>
                  </div>
                  {s.isPrimary && (
                    <Badge
                      variant="outline"
                      className="text-[9px] shrink-0 border-amber-300 text-amber-600"
                    >
                      Primary
                    </Badge>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Counts footer ───────────────────────────────────────────────── */}
      <div className="border-t px-4 py-2.5 flex items-center justify-between text-[10px] text-muted-foreground shrink-0">
        <span>{u._count.subordinates} reportees</span>
        {totalAllocated > 0 && (
          <span>
            {totalFilled}/{totalAllocated} openings filled
          </span>
        )}
        <span>{u._count.teamMembers} team members</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported panel — fixed right side, not a popover
// ─────────────────────────────────────────────────────────────────────────────

export function UserDetailPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
  return (
    <div className="flex flex-col h-full border-l bg-card overflow-hidden w-80 shrink-0">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0 bg-muted/30">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Member detail
        </span>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <PanelContent userId={userId} />
    </div>
  );
}
