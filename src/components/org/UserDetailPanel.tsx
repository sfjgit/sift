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
  Building2,
  Star,
  ChevronRight,
  Briefcase,
  Users,
  FileText,
  ArrowRightLeft,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAxios } from '@/hooks/useAxios';
import type {
  UserCardData,
  AssignmentReceived,
  AssignmentGiven,
  RequirementCreated,
} from './types';
import { userColor, userInitials } from './org.utils';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const STAGE_ORDER = [
  'SOURCED',
  'SCREENING',
  'SUBMITTED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_DONE',
  'OFFER_ROLLED',
  'OFFER_ACCEPTED',
  'JOINED',
  'REJECTED',
  'WITHDRAWN',
];

const STAGE_COLOR: Record<string, string> = {
  SOURCED: 'bg-zinc-100 text-zinc-600',
  SCREENING: 'bg-blue-100 text-blue-700',
  SUBMITTED: 'bg-indigo-100 text-indigo-700',
  INTERVIEW_SCHEDULED: 'bg-violet-100 text-violet-700',
  INTERVIEW_DONE: 'bg-purple-100 text-purple-700',
  OFFER_ROLLED: 'bg-amber-100 text-amber-700',
  OFFER_ACCEPTED: 'bg-emerald-100 text-emerald-700',
  JOINED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-600',
  WITHDRAWN: 'bg-zinc-100 text-zinc-500',
};

function priorityBadge(p: string) {
  if (p === 'HIGH') return 'border-destructive/40 text-destructive bg-destructive/5';
  if (p === 'MEDIUM') return 'border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-950/20';
  return 'border-border text-muted-foreground';
}

function statusBadge(s: string) {
  if (s === 'ACTIVE') return 'border-emerald-200 text-emerald-700 bg-emerald-50';
  if (s === 'CLOSED' || s === 'CANCELLED') return 'border-destructive/30 text-destructive';
  if (s === 'ON_HOLD') return 'border-amber-200 text-amber-600';
  return 'border-border text-muted-foreground';
}

function humanize(s: string) {
  return s
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function StatBox({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-2 text-center">
      <div className="text-base font-bold tabular-nums leading-none">{value}</div>
      <div className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{label}</div>
      {sub && <div className="text-[9px] text-muted-foreground/70">{sub}</div>}
    </div>
  );
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
// Tab: Pipeline (assignments received)
// ─────────────────────────────────────────────────────────────────────────────

function PipelineTab({ assignments }: { assignments: AssignmentReceived[] }) {
  const active = assignments.filter(a => a.status === 'ACTIVE');
  const history = assignments.filter(a => a.status !== 'ACTIVE');

  const AssignCard = ({ a }: { a: AssignmentReceived }) => (
    <div
      className={cn(
        'rounded-lg border bg-card p-3 flex flex-col gap-2',
        a.status !== 'ACTIVE' && 'opacity-60'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[11px] font-semibold truncate">{a.requirement.title}</span>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground flex-wrap">
            <span className="font-mono">{a.requirement.reqCode}</span>
            <span>·</span>
            <span className="truncate">{a.requirement.client.name}</span>
            {a.requirement.location && (
              <>
                <span>·</span>
                <span>{a.requirement.location}</span>
              </>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground">
            Assigned by {a.assignedBy.firstName} {a.assignedBy.lastName}
            {a.assignedBy.role && ` (${a.assignedBy.role.name})`}
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
            {humanize(a.requirement.status)}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-1">
        {[
          { l: 'Alloc', v: a.allocatedOpenings ?? '—' },
          { l: 'Sub', v: a.submissionsCount },
          { l: 'Int', v: a.interviewsCount },
          { l: 'Fill', v: a.filledOpenings },
        ].map(s => (
          <div key={s.l} className="flex flex-col items-center bg-muted/40 rounded py-1">
            <span className="text-[11px] font-bold tabular-nums">{s.v}</span>
            <span className="text-[9px] text-muted-foreground">{s.l}</span>
          </div>
        ))}
      </div>

      {/* Skills */}
      {a.requirement.skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {a.requirement.skills.slice(0, 4).map(sk => (
            <span
              key={sk}
              className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
            >
              {sk}
            </span>
          ))}
          {a.requirement.skills.length > 4 && (
            <span className="text-[9px] text-muted-foreground">
              +{a.requirement.skills.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Chain context */}
      {a.childAssignments.length > 0 && (
        <div className="border-t border-border/40 pt-1.5">
          <p className="text-[9px] text-muted-foreground mb-1 uppercase tracking-wide font-semibold">
            Assigned down to
          </p>
          <div className="flex flex-col gap-0.5">
            {a.childAssignments.map(c => (
              <div key={c.id} className="flex items-center justify-between text-[10px]">
                <span>
                  {c.assignedTo.firstName} {c.assignedTo.lastName}
                  <span className="text-muted-foreground"> · {c.assignedTo.role?.name}</span>
                </span>
                <span className="text-muted-foreground">
                  {c.submissionsCount} sub · {c.interviewsCount} int
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {a.deadline && (
        <p className="text-[10px] text-muted-foreground">
          Due {formatDistanceToNow(new Date(a.deadline), { addSuffix: true })}
          {a.deadlineMet === false && <span className="text-destructive ml-1">· breached</span>}
        </p>
      )}
      {a.status !== 'ACTIVE' && a.removedAt && (
        <p className="text-[10px] text-muted-foreground">
          Removed {format(new Date(a.removedAt), 'dd MMM yyyy')}
          {a.removedReason && ` · ${a.removedReason}`}
        </p>
      )}
    </div>
  );

  return (
    <div className="p-3 flex flex-col gap-2">
      {active.length === 0 && history.length === 0 && (
        <div className="py-8 text-center">
          <Briefcase className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No requirements</p>
        </div>
      )}
      {active.map(a => (
        <AssignCard key={a.id} a={a} />
      ))}
      {history.length > 0 && (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mt-1">
            Past
          </p>
          {history.map(a => (
            <AssignCard key={a.id} a={a} />
          ))}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Given (assignments they gave out as DM/TL)
// ─────────────────────────────────────────────────────────────────────────────

function GivenTab({ assignments }: { assignments: AssignmentGiven[] }) {
  if (assignments.length === 0)
    return (
      <div className="py-8 text-center">
        <ArrowRightLeft className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">No assignments given</p>
      </div>
    );
  return (
    <div className="p-3 flex flex-col gap-2">
      {assignments.map(a => (
        <div key={a.id} className="rounded-lg border bg-card p-3 flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[11px] font-semibold truncate">{a.requirement.title}</span>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="font-mono">{a.requirement.reqCode}</span>
                <span>·</span>
                <span>{a.requirement.client.name}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                → {a.assignedTo.firstName} {a.assignedTo.lastName}
                {a.assignedTo.role && ` (${a.assignedTo.role.name})`}
              </span>
            </div>
            <Badge
              variant="outline"
              className={cn('text-[9px] px-1.5 shrink-0', priorityBadge(a.requirement.priority))}
            >
              {a.requirement.priority}
            </Badge>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[
              { l: 'Alloc', v: a.allocatedOpenings ?? '—' },
              { l: 'Sub', v: a.submissionsCount },
              { l: 'Int', v: a.interviewsCount },
              { l: 'Fill', v: a.filledOpenings },
            ].map(s => (
              <div key={s.l} className="flex flex-col items-center bg-muted/40 rounded py-1">
                <span className="text-[11px] font-bold tabular-nums">{s.v}</span>
                <span className="text-[9px] text-muted-foreground">{s.l}</span>
              </div>
            ))}
          </div>
          {a.deadline && (
            <p className="text-[10px] text-muted-foreground">
              Due {formatDistanceToNow(new Date(a.deadline), { addSuffix: true })}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Requirements Created
// ─────────────────────────────────────────────────────────────────────────────

function CreatedTab({ requirements }: { requirements: RequirementCreated[] }) {
  if (requirements.length === 0)
    return (
      <div className="py-8 text-center">
        <FileText className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">No requirements created</p>
      </div>
    );
  return (
    <div className="p-3 flex flex-col gap-2">
      {requirements.map(r => (
        <div key={r.id} className="rounded-lg border bg-card p-3 flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[11px] font-semibold truncate">{r.title}</span>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="font-mono">{r.reqCode}</span>
                <span>·</span>
                <span className="truncate">{r.client.name}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Badge
                variant="outline"
                className={cn('text-[9px] px-1.5', priorityBadge(r.priority))}
              >
                {r.priority}
              </Badge>
              <Badge variant="outline" className={cn('text-[9px] px-1.5', statusBadge(r.status))}>
                {humanize(r.status)}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[
              { l: 'Total', v: r.totalOpenings },
              { l: 'Active', v: r.activeApplications },
              { l: 'Int', v: r.interviewsScheduled },
              { l: 'Fill', v: r.filledOpenings },
            ].map(s => (
              <div key={s.l} className="flex flex-col items-center bg-muted/40 rounded py-1">
                <span className="text-[11px] font-bold tabular-nums">{s.v}</span>
                <span className="text-[9px] text-muted-foreground">{s.l}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {format(new Date(r.createdAt), 'dd MMM yyyy')}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Clients
// ─────────────────────────────────────────────────────────────────────────────

function ClientsTab({ spocs }: { spocs: UserCardData['clientSpocs'] }) {
  if (spocs.length === 0)
    return (
      <div className="py-8 text-center">
        <Building2 className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">No client SPOCs</p>
      </div>
    );
  return (
    <div className="p-3 flex flex-col gap-2">
      {spocs.map(s => (
        <div
          key={s.id}
          className={cn(
            'rounded-lg border bg-card p-3 flex flex-col gap-1.5',
            s.isPrimary && 'border-amber-200'
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold truncate">{s.client.name}</span>
                {s.isPrimary && (
                  <Badge
                    variant="outline"
                    className="text-[9px] border-amber-300 text-amber-600 shrink-0"
                  >
                    Primary
                  </Badge>
                )}
              </div>
              {s.client.industry && (
                <span className="text-[10px] text-muted-foreground">{s.client.industry}</span>
              )}
              {(s.client.city || s.client.country) && (
                <span className="text-[10px] text-muted-foreground">
                  {[s.client.city, s.client.country].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0 text-[10px] text-muted-foreground">
              <span>{s.client._count.requirements} reqs</span>
              <span>{s.serviceLine.name}</span>
            </div>
          </div>
          {s.notes && <p className="text-[10px] text-muted-foreground italic">{s.notes}</p>}
          <p className="text-[10px] text-muted-foreground">
            Assigned {formatDistanceToNow(new Date(s.assignedAt), { addSuffix: true })} by{' '}
            {s.assignedBy.firstName} {s.assignedBy.lastName}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Team
// ─────────────────────────────────────────────────────────────────────────────

function TeamTab({ u }: { u: UserCardData }) {
  return (
    <div className="p-3 flex flex-col gap-3">
      {u.subordinates.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Direct Reportees ({u.subordinates.length})
          </p>
          {u.subordinates.map(s => (
            <div
              key={s.id}
              className="flex items-center justify-between px-2.5 py-2 rounded-lg border bg-card text-xs"
            >
              <span className="font-medium">
                {s.firstName} {s.lastName}
              </span>
              <div className="flex items-center gap-2 text-muted-foreground">
                {s.employeeId && <span className="font-mono text-[10px]">{s.employeeId}</span>}
                {s.role && <span className="text-[10px]">{s.role.name}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      {u.teamMembers.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Team Members ({u.teamMembers.length})
          </p>
          {u.teamMembers.map(m => (
            <div
              key={m.id}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-muted/40 text-xs"
            >
              <span>
                {m.firstName} {m.lastName}
              </span>
              {m.employeeId && (
                <span className="font-mono text-[10px] text-muted-foreground">{m.employeeId}</span>
              )}
            </div>
          ))}
        </div>
      )}
      {u.subordinates.length === 0 && u.teamMembers.length === 0 && (
        <div className="py-8 text-center">
          <Users className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No team members</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function PanelSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex flex-col gap-1.5 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel content
// ─────────────────────────────────────────────────────────────────────────────

type TabKey = 'pipeline' | 'given' | 'created' | 'clients' | 'team';

function PanelContent({ userId }: { userId: string }) {
  const axios = useAxios();
  const [tab, setTab] = useState<TabKey>('pipeline');

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
  const st = u.aggregateStats;
  const color = userColor(u.id);
  const initials = userInitials(u.firstName, u.lastName);

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'pipeline', label: 'Pipeline', count: u._count.assignmentsReceived },
    { key: 'given', label: 'Given', count: u._count.assignmentsGiven },
    { key: 'created', label: 'Created', count: u._count.requirementsCreated },
    { key: 'clients', label: 'Clients', count: u._count.clientSpocs },
    { key: 'team', label: 'Team', count: u._count.subordinates + u._count.teamMembers },
  ];

  // Candidates by stage — sorted by pipeline order
  const stageEntries = STAGE_ORDER.filter(s => st.candidatesByStage[s]).map(s => ({
    stage: s,
    count: st.candidatesByStage[s],
  }));

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b shrink-0 bg-muted/20">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
              color
            )}
          >
            {initials}
          </div>
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">
                {u.firstName} {u.lastName}
              </span>
              {!u.isActive && (
                <Badge variant="outline" className="text-[9px] text-muted-foreground">
                  Inactive
                </Badge>
              )}
              {u.isSuperAdmin && (
                <Badge variant="outline" className="text-[9px] border-violet-300 text-violet-600">
                  SA
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{u.role.name}</span>
            {u.employeeId && (
              <span className="text-[10px] font-mono text-muted-foreground">{u.employeeId}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1 mt-2.5">
          <MetaRow icon={Mail} value={u.email} />
          <MetaRow icon={Phone} value={u.phone} />
          <MetaRow icon={Building2} value={u.department?.name} />
          <MetaRow icon={MapPin} value={u.workingLocation} />
          <MetaRow
            icon={Calendar}
            value={u.dateOfJoin ? `Joined ${format(new Date(u.dateOfJoin), 'dd MMM yyyy')}` : null}
          />
          <MetaRow
            icon={ChevronRight}
            value={
              u.reportingTo
                ? `Reports to ${u.reportingTo.firstName} ${u.reportingTo.lastName} · ${u.reportingTo.role?.name}`
                : null
            }
          />
          <MetaRow
            icon={Star}
            value={u.teamLead ? `TL: ${u.teamLead.firstName} ${u.teamLead.lastName}` : null}
          />
        </div>
      </div>

      {/* ── Aggregate stats ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-1 px-3 py-2 border-b shrink-0">
        <StatBox label="Active Reqs" value={st.activeReqs} />
        <StatBox label="Submitted" value={st.totalSubmissions} />
        <StatBox label="Interviews" value={st.totalInterviews} />
        <StatBox label="Filled" value={st.totalFilled} />
      </div>
      <div className="grid grid-cols-4 gap-1 px-3 py-2 border-b shrink-0">
        <StatBox label="Sourced" value={st.candidatesSourced} />
        <StatBox label="Reqs Created" value={st.requirementsCreated} />
        <StatBox label="Given" value={st.totalAssignmentsGiven} />
        <StatBox label="Clients" value={st.clientSpocsCount} />
      </div>

      {/* ── Candidate pipeline stages ────────────────────────────────────── */}
      {stageEntries.length > 0 && (
        <div className="px-3 py-2 border-b shrink-0">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
            Candidates by Stage
          </p>
          <div className="flex flex-wrap gap-1">
            {stageEntries.map(({ stage, count }) => (
              <span
                key={stage}
                className={cn(
                  'text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                  STAGE_COLOR[stage] ?? 'bg-muted text-muted-foreground'
                )}
              >
                {humanize(stage)} {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex border-b shrink-0 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 py-2 text-[10px] font-medium transition-colors whitespace-nowrap px-1',
              tab === t.key
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-0.5 opacity-60">({t.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'pipeline' && <PipelineTab assignments={u.assignmentsReceived} />}
        {tab === 'given' && <GivenTab assignments={u.assignmentsGiven} />}
        {tab === 'created' && <CreatedTab requirements={u.requirementsCreated} />}
        {tab === 'clients' && <ClientsTab spocs={u.clientSpocs} />}
        {tab === 'team' && <TeamTab u={u} />}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="border-t px-3 py-2 flex items-center justify-between text-[10px] text-muted-foreground shrink-0">
        <span>{u._count.subordinates} reportees</span>
        {st.totalAllocated > 0 && (
          <span>
            {st.totalFilled}/{st.totalAllocated} filled
          </span>
        )}
        <span>{u._count.teamMembers} team members</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

export function UserDetailPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
  return (
    <div className="flex flex-col h-full border-l bg-card overflow-hidden w-96 shrink-0">
      <div className="flex items-center justify-between px-4 py-2.5 border-b shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Member Detail
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
