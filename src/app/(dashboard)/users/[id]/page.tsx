/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  BadgeCheck,
  ShieldAlert,
  Users,
  ChevronRight,
  Briefcase,
  UserCheck,
  UserX,
  Pencil,
  Building2,
  Clock,
  Star,
  TrendingUp,
  Send,
  CheckCircle2,
  FileText,
  Contact2,
  BarChart3,
  Network,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAxios } from '@/hooks/useAxios';
import { usePermission } from '@/hooks/usePermission';
import AppCredentialsManager from '@/components/users/AppCredentialsManager';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserCardData {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  employeeId: string | null;
  email: string;
  phone: string | null;
  workingLocation: string | null;
  timezone: string | null;
  dateOfJoin: string | null;
  dateOfBirth: string | null;
  isActive: boolean;
  isSuperAdmin: boolean;
  createdAt: string;

  role: { id: string; name: string };
  department: { id: string; name: string } | null;

  reportingTo: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string | null;
    role: { id: string; name: string };
  } | null;

  teamLead: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string | null;
    role: { id: string; name: string };
  } | null;

  subordinates: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string | null;
    role: { id: string; name: string };
  }[];
  teamMembers: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string | null;
    role: { id: string; name: string };
  }[];

  assignmentsReceived: Assignment[];
  assignmentsGiven: AssignmentGiven[];
  requirementsCreated: RequirementCreated[];
  spocsHandled: SpocHandled[];

  aggregateStats: {
    activeReqs: number;
    totalSubmissions: number;
    totalInterviews: number;
    totalFilled: number;
    totalAllocated: number;
    totalAssignmentsGiven: number;
    requirementsCreated: number;
    spocsHandledCount: number;
    spocsAddedCount: number;
    candidatesSourced: number;
    candidatesByStage: Record<string, number>;
  };

  _count: {
    subordinates: number;
    teamMembers: number;
    assignmentsReceived: number;
    assignmentsGiven: number;
    requirementsCreated: number;
    spocsHandled: number;
    spocsAdded: number;
  };
}

interface Assignment {
  id: string;
  depth: number;
  status: string;
  allocatedOpenings: number | null;
  filledOpenings: number;
  submissionsCount: number;
  interviewsCount: number;
  assignedAt: string;
  removedAt: string | null;
  removedReason: string | null;
  deadline: string | null;
  deadlineMet: boolean | null;
  assignedBy: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string | null;
    role: { id: string; name: string };
  };
  parentAssignment: {
    id: string;
    depth: number;
    assignedTo: {
      id: string;
      firstName: string;
      lastName: string;
      role: { id: string; name: string };
    };
  } | null;
  childAssignments: {
    id: string;
    depth: number;
    submissionsCount: number;
    interviewsCount: number;
    filledOpenings: number;
    allocatedOpenings: number | null;
    assignedTo: {
      id: string;
      firstName: string;
      lastName: string;
      employeeId: string | null;
      role: { id: string; name: string };
    };
  }[];
  requirement: {
    id: string;
    reqCode: string;
    title: string;
    status: string;
    priority: string;
    totalOpenings: number;
    filledOpenings: number;
    activeApplications: number;
    interviewsScheduled: number;
    offersRolledOut: number;
    location: string | null;
    jobType: string;
    remoteType: string;
    skills: string[];
    respondBy: string | null;
    client: { id: string; name: string; industry: string | null };
    businessUnit: { id: string; name: string } | null;
    serviceLine: { id: string; name: string } | null;
  };
}

interface AssignmentGiven {
  id: string;
  depth: number;
  submissionsCount: number;
  interviewsCount: number;
  filledOpenings: number;
  allocatedOpenings: number | null;
  assignedAt: string;
  deadline: string | null;
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string | null;
    role: { id: string; name: string };
  };
  requirement: {
    id: string;
    reqCode: string;
    title: string;
    status: string;
    priority: string;
    client: { id: string; name: string };
  };
}

interface RequirementCreated {
  id: string;
  reqCode: string;
  title: string;
  status: string;
  priority: string;
  totalOpenings: number;
  filledOpenings: number;
  activeApplications: number;
  interviewsScheduled: number;
  createdAt: string;
  client: { id: string; name: string };
  businessUnit: { id: string; name: string } | null;
}

interface SpocHandled {
  id: string;
  firstName: string;
  lastName: string;
  designation: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
  notes: string | null;
  createdAt: string;
  client: {
    id: string;
    name: string;
    industry: string | null;
    city: string | null;
    country: string | null;
    _count: { requirements: number };
  };
  serviceLine: { id: string; name: string };
  businessUnit: { id: string; name: string };
  addedBy: { id: string; firstName: string; lastName: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

function avatarColor(id: string) {
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-violet-100 text-violet-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-cyan-100 text-cyan-700',
    'bg-indigo-100 text-indigo-700',
    'bg-orange-100 text-orange-700',
  ];
  return colors[id.charCodeAt(0) % colors.length];
}

const PRIORITY_STYLES: Record<string, string> = {
  HIGH: 'bg-rose-50 text-rose-700 border-rose-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  LOW: 'bg-slate-50 text-slate-600 border-slate-200',
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DRAFT: 'bg-slate-50 text-slate-600 border-slate-200',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-200',
  ON_HOLD: 'bg-orange-50 text-orange-700 border-orange-200',
  CLOSED: 'bg-slate-100 text-slate-500 border-slate-200',
  CANCELLED: 'bg-rose-50 text-rose-600 border-rose-200',
};

const STAGE_LABELS: Record<string, string> = {
  SOURCED: 'Sourced',
  SCREENING: 'Screening',
  SUBMITTED: 'Submitted',
  INTERVIEW_SCHEDULED: 'Interview Scheduled',
  INTERVIEW_DONE: 'Interview Done',
  OFFER_ROLLED: 'Offer Rolled',
  OFFER_ACCEPTED: 'Offer Accepted',
  JOINED: 'Joined',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

const STAGE_COLORS: Record<string, string> = {
  SOURCED: 'bg-slate-100 text-slate-600',
  SCREENING: 'bg-blue-50 text-blue-700',
  SUBMITTED: 'bg-indigo-50 text-indigo-700',
  INTERVIEW_SCHEDULED: 'bg-violet-50 text-violet-700',
  INTERVIEW_DONE: 'bg-purple-50 text-purple-700',
  OFFER_ROLLED: 'bg-amber-50 text-amber-700',
  OFFER_ACCEPTED: 'bg-emerald-50 text-emerald-700',
  JOINED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-rose-50 text-rose-600',
  WITHDRAWN: 'bg-slate-100 text-slate-500',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: any;
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function UserChip({
  user,
  onClick,
}: {
  user: { id: string; firstName: string; lastName: string; role: { name: string } };
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5 text-left transition-colors hover:bg-muted/60"
    >
      <Avatar className="h-6 w-6 shrink-0">
        <AvatarFallback className={`text-[10px] font-semibold ${avatarColor(user.id)}`}>
          {initials(user.firstName, user.lastName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium">
          {user.firstName} {user.lastName}
        </p>
        <p className="truncate text-[10px] text-muted-foreground">
          {user.role.name.replace(/_/g, ' ')}
        </p>
      </div>
    </button>
  );
}

function AssignmentCard({ a, router }: { a: Assignment; router: any }) {
  const req = a.requirement;
  const isActive = a.status === 'ACTIVE';
  return (
    <div
      className="group cursor-pointer rounded-lg border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-muted/30"
      onClick={() => router.push(`/requirements/${req.id}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="text-[11px] font-mono text-muted-foreground">{req.reqCode}</span>
            <Badge
              className={`text-[10px] px-1.5 py-0 border ${PRIORITY_STYLES[req.priority] ?? ''}`}
              variant="outline"
            >
              {req.priority}
            </Badge>
            <Badge
              className={`text-[10px] px-1.5 py-0 border ${STATUS_STYLES[req.status] ?? ''}`}
              variant="outline"
            >
              {req.status.replace(/_/g, ' ')}
            </Badge>
            {!isActive && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {a.status}
              </Badge>
            )}
          </div>
          <p className="font-medium text-sm leading-snug">{req.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{req.client.name}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
      </div>

      {/* Stats row */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground border-t pt-3">
        <span>
          <span className="font-medium text-foreground">{a.submissionsCount}</span> submissions
        </span>
        <span>
          <span className="font-medium text-foreground">{a.interviewsCount}</span> interviews
        </span>
        <span>
          <span className="font-medium text-foreground">{a.filledOpenings}</span> /{' '}
          {a.allocatedOpenings ?? req.totalOpenings} filled
        </span>
        {a.deadline && (
          <span className="ml-auto flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(a.deadline), 'dd MMM')}
          </span>
        )}
      </div>

      {/* Skills */}
      {req.skills?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {req.skills.slice(0, 5).map(s => (
            <span
              key={s}
              className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {s}
            </span>
          ))}
          {req.skills.length > 5 && (
            <span className="text-[10px] text-muted-foreground">+{req.skills.length - 5} more</span>
          )}
        </div>
      )}

      {/* Assigned by */}
      <p className="mt-2 text-[11px] text-muted-foreground/60">
        Assigned by {a.assignedBy.firstName} {a.assignedBy.lastName}
        {' · '}
        {format(new Date(a.assignedAt), 'dd MMM yyyy')}
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const axios = useAxios();
  const qc = useQueryClient();
  const permission = usePermission('users');

  const [tab, setTab] = useState('overview');

  const { data, isLoading, isError } = useQuery<{ success: boolean; data: UserCardData }>({
    queryKey: ['user-card', id],
    queryFn: async () => {
      const res = await axios.get(`/users/${id}/card`);
      return res.data;
    },
    enabled: !!id,
  });

  const toggleMutation = useMutation({
    mutationFn: async () => {
      await axios.patch(`/users/${id}/toggle`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-card', id] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });

  if (isLoading) return <UserDetailSkeleton />;
  if (isError || !data?.data)
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center">
        <p className="text-sm text-muted-foreground">Failed to load user. Please try again.</p>
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );

  const user = data.data;
  const stats = user.aggregateStats;
  const activeAssignments = user.assignmentsReceived.filter(a => a.status === 'ACTIVE');
  const pastAssignments = user.assignmentsReceived.filter(a => a.status !== 'ACTIVE');

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Users
        </button>
        <div className="flex items-center gap-2">
          {permission.canEdit && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/users/${id}/edit`)}
                className="gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button
                variant={user.isActive ? 'destructive' : 'default'}
                size="sm"
                className="gap-1.5"
                disabled={toggleMutation.isPending}
                onClick={() => toggleMutation.mutate()}
              >
                {user.isActive ? (
                  <>
                    <UserX className="h-3.5 w-3.5" /> Deactivate
                  </>
                ) : (
                  <>
                    <UserCheck className="h-3.5 w-3.5" /> Activate
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 gap-0 overflow-hidden">
        {/* ── LEFT SIDEBAR ──────────────────────────────────────────────── */}
        <aside className="w-72 shrink-0 border-r overflow-y-auto">
          <div className="flex flex-col gap-5 p-5">
            {/* Avatar + name */}
            <div className="flex flex-col items-center gap-3 text-center pt-2">
              <Avatar className="h-20 w-20">
                <AvatarFallback className={`text-2xl font-bold ${avatarColor(user.id)}`}>
                  {initials(user.firstName, user.lastName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold text-base leading-tight">
                  {user.displayName ?? `${user.firstName} ${user.lastName}`}
                </h2>
                {user.employeeId && (
                  <p className="text-xs text-muted-foreground mt-0.5">#{user.employeeId}</p>
                )}
                <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                  <Badge
                    className={`text-xs border ${
                      user.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                    variant="outline"
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  {user.isSuperAdmin && (
                    <Badge
                      className="text-xs bg-violet-50 text-violet-700 border-violet-200"
                      variant="outline"
                    >
                      <ShieldAlert className="h-3 w-3 mr-1" />
                      Super Admin
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Role + dept */}
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <BadgeCheck className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Role</p>
                  <p className="text-sm font-medium">{user.role.name.replace(/_/g, ' ')}</p>
                </div>
              </div>
              {user.department && (
                <div className="flex items-start gap-2">
                  <Building2 className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Department
                    </p>
                    <p className="text-sm">{user.department.name}</p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Contact info */}
            <div className="flex flex-col gap-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Contact</p>
              <a
                href={`mailto:${user.email}`}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{user.email}</span>
              </a>
              {user.phone && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{user.phone}</span>
                </div>
              )}
              {user.workingLocation && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>{user.workingLocation}</span>
                </div>
              )}
              {user.timezone && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>{user.timezone}</span>
                </div>
              )}
              {user.dateOfJoin && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>Joined {format(new Date(user.dateOfJoin), 'dd MMM yyyy')}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Org chain */}
            <div className="flex flex-col gap-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Reporting Chain
              </p>

              {user.reportingTo ? (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Reports to</p>
                  <UserChip
                    user={user.reportingTo}
                    onClick={() => router.push(`/users/${user.reportingTo!.id}`)}
                  />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/50">No reporting manager</p>
              )}

              {user.teamLead && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Team lead</p>
                  <UserChip
                    user={user.teamLead}
                    onClick={() => router.push(`/users/${user.teamLead!.id}`)}
                  />
                </div>
              )}

              {user.subordinates.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1.5">
                    Direct reports ({user._count.subordinates})
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {user.subordinates.slice(0, 5).map(s => (
                      <UserChip key={s.id} user={s} onClick={() => router.push(`/users/${s.id}`)} />
                    ))}
                    {user._count.subordinates > 5 && (
                      <p className="text-[10px] text-muted-foreground pl-1">
                        +{user._count.subordinates - 5} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {user.teamMembers.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1.5">
                    Team members ({user._count.teamMembers})
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {user.teamMembers.slice(0, 5).map(m => (
                      <UserChip key={m.id} user={m} onClick={() => router.push(`/users/${m.id}`)} />
                    ))}
                    {user._count.teamMembers > 5 && (
                      <p className="text-[10px] text-muted-foreground pl-1">
                        +{user._count.teamMembers - 5} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Org tree link */}
              <button
                onClick={() => router.push(`/users/${id}/tree`)}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-1"
              >
                <Network className="h-3.5 w-3.5" /> View org tree
              </button>
            </div>
          </div>
        </aside>

        {/* ── RIGHT CONTENT ─────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          <Tabs value={tab} onValueChange={setTab} className="flex flex-col h-full">
            {/* Tab bar */}
            <div className="border-b px-6 pt-4 sticky top-0 bg-background z-10">
              <TabsList className="h-auto gap-1 bg-transparent p-0">
                {[
                  { value: 'overview', icon: BarChart3, label: 'Overview' },
                  {
                    value: 'assignments',
                    icon: Briefcase,
                    label: `Assignments (${user._count.assignmentsReceived})`,
                  },
                  { value: 'given', icon: Send, label: `Given (${user._count.assignmentsGiven})` },
                  {
                    value: 'requirements',
                    icon: FileText,
                    label: `Requirements (${user._count.requirementsCreated})`,
                  },
                  { value: 'spocs', icon: Contact2, label: `Spocs (${user._count.spocsHandled})` },
                  { value: 'Apps', icon: Contact2, label: `APPs (${user._count.spocsHandled})` },
                ].map(t => (
                  <TabsTrigger
                    key={t.value}
                    value={t.value}
                    className="flex items-center gap-1.5 rounded-none border-b-2 border-transparent px-3 pb-3 pt-1 text-xs font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none bg-transparent"
                  >
                    <t.icon className="h-3.5 w-3.5" />
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* ── OVERVIEW TAB ────────────────────────────────────────────── */}
            <TabsContent value="overview" className="flex-1 p-6 mt-0">
              <div className="flex flex-col gap-6 max-w-3xl">
                {/* Stats strip */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard icon={Briefcase} label="Active Reqs" value={stats.activeReqs} />
                  <StatCard icon={Send} label="Submissions" value={stats.totalSubmissions} />
                  <StatCard icon={TrendingUp} label="Interviews" value={stats.totalInterviews} />
                  <StatCard
                    icon={CheckCircle2}
                    label="Filled"
                    value={stats.totalFilled}
                    sub={`of ${stats.totalAllocated} allocated`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard
                    icon={FileText}
                    label="Reqs Created"
                    value={stats.requirementsCreated}
                  />
                  <StatCard icon={Users} label="Assigned Out" value={stats.totalAssignmentsGiven} />
                  <StatCard icon={Contact2} label="Spocs Handled" value={stats.spocsHandledCount} />
                  <StatCard icon={Star} label="Candidates" value={stats.candidatesSourced} />
                </div>

                {/* Candidate pipeline breakdown */}
                {Object.keys(stats.candidatesByStage).length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold">Candidate Pipeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-2">
                        {Object.entries(stats.candidatesByStage)
                          .sort((a, b) => b[1] - a[1])
                          .map(([stage, count]) => (
                            <div key={stage} className="flex items-center gap-3">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium w-40 shrink-0 ${STAGE_COLORS[stage] ?? 'bg-muted text-muted-foreground'}`}
                              >
                                {STAGE_LABELS[stage] ?? stage}
                              </span>
                              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary transition-all"
                                  style={{
                                    width: `${Math.round((count / stats.candidatesSourced) * 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs font-medium w-6 text-right">{count}</span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent active assignments preview */}
                {activeAssignments.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold">Active Assignments</h3>
                      <button
                        onClick={() => setTab('assignments')}
                        className="text-xs text-primary hover:underline"
                      >
                        View all
                      </button>
                    </div>
                    <div className="flex flex-col gap-3">
                      {activeAssignments.slice(0, 3).map(a => (
                        <AssignmentCard key={a.id} a={a} router={router} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── ASSIGNMENTS TAB ─────────────────────────────────────────── */}
            <TabsContent value="assignments" className="flex-1 p-6 mt-0">
              <div className="flex flex-col gap-6 max-w-3xl">
                {activeAssignments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">
                      Active{' '}
                      <span className="text-muted-foreground font-normal">
                        ({activeAssignments.length})
                      </span>
                    </h3>
                    <div className="flex flex-col gap-3">
                      {activeAssignments.map(a => (
                        <AssignmentCard key={a.id} a={a} router={router} />
                      ))}
                    </div>
                  </div>
                )}

                {pastAssignments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">
                      Past{' '}
                      <span className="text-muted-foreground font-normal">
                        ({pastAssignments.length})
                      </span>
                    </h3>
                    <div className="flex flex-col gap-3">
                      {pastAssignments.map(a => (
                        <AssignmentCard key={a.id} a={a} router={router} />
                      ))}
                    </div>
                  </div>
                )}

                {user.assignmentsReceived.length === 0 && (
                  <EmptyState icon={Briefcase} label="No assignments yet" />
                )}
              </div>
            </TabsContent>

            {/* ── GIVEN TAB ───────────────────────────────────────────────── */}
            <TabsContent value="given" className="flex-1 p-6 mt-0">
              <div className="flex flex-col gap-3 max-w-3xl">
                {user.assignmentsGiven.length === 0 && (
                  <EmptyState icon={Send} label="No assignments given" />
                )}
                {user.assignmentsGiven.map(a => (
                  <div
                    key={a.id}
                    className="group cursor-pointer rounded-lg border bg-card p-4 hover:border-primary/30 hover:bg-muted/30 transition-colors"
                    onClick={() => router.push(`/requirements/${a.requirement.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {a.requirement.reqCode}
                          </span>
                          <Badge
                            className={`text-[10px] px-1.5 py-0 border ${PRIORITY_STYLES[a.requirement.priority] ?? ''}`}
                            variant="outline"
                          >
                            {a.requirement.priority}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm">{a.requirement.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {a.requirement.client.name}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                    </div>

                    <div className="mt-3 flex items-center gap-2 border-t pt-3">
                      <Avatar className="h-5 w-5 shrink-0">
                        <AvatarFallback
                          className={`text-[9px] font-semibold ${avatarColor(a.assignedTo.id)}`}
                        >
                          {initials(a.assignedTo.firstName, a.assignedTo.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">
                        {a.assignedTo.firstName} {a.assignedTo.lastName}
                        <span className="ml-1 text-muted-foreground/60">
                          · {a.assignedTo.role.name.replace(/_/g, ' ')}
                        </span>
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {a.submissionsCount} sub · {a.interviewsCount} int · {a.filledOpenings}{' '}
                        filled
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* ── REQUIREMENTS TAB ────────────────────────────────────────── */}
            <TabsContent value="requirements" className="flex-1 p-6 mt-0">
              <div className="flex flex-col gap-3 max-w-3xl">
                {user.requirementsCreated.length === 0 && (
                  <EmptyState icon={FileText} label="No requirements created" />
                )}
                {user.requirementsCreated.map(r => (
                  <div
                    key={r.id}
                    className="group cursor-pointer rounded-lg border bg-card p-4 hover:border-primary/30 hover:bg-muted/30 transition-colors"
                    onClick={() => router.push(`/requirements/${r.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {r.reqCode}
                          </span>
                          <Badge
                            className={`text-[10px] px-1.5 py-0 border ${PRIORITY_STYLES[r.priority] ?? ''}`}
                            variant="outline"
                          >
                            {r.priority}
                          </Badge>
                          <Badge
                            className={`text-[10px] px-1.5 py-0 border ${STATUS_STYLES[r.status] ?? ''}`}
                            variant="outline"
                          >
                            {r.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm">{r.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {r.client.name}
                          {r.businessUnit && (
                            <span className="ml-1.5 text-muted-foreground/60">
                              · {r.businessUnit.name}
                            </span>
                          )}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground border-t pt-3">
                      <span>
                        <span className="font-medium text-foreground">{r.filledOpenings}</span> /{' '}
                        {r.totalOpenings} filled
                      </span>
                      <span>
                        <span className="font-medium text-foreground">{r.activeApplications}</span>{' '}
                        active
                      </span>
                      <span>
                        <span className="font-medium text-foreground">{r.interviewsScheduled}</span>{' '}
                        interviews
                      </span>
                      <span className="ml-auto">
                        {format(new Date(r.createdAt), 'dd MMM yyyy')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* ── SPOCS TAB ───────────────────────────────────────────────── */}
            <TabsContent value="spocs" className="flex-1 p-6 mt-0">
              <div className="flex flex-col gap-3 max-w-3xl">
                {user.spocsHandled.length === 0 && (
                  <EmptyState icon={Contact2} label="No spocs handled" />
                )}
                {user.spocsHandled.map(s => (
                  <div
                    key={s.id}
                    className="group cursor-pointer rounded-lg border bg-card p-4 hover:border-primary/30 hover:bg-muted/30 transition-colors"
                    onClick={() => router.push(`/clients/${s.client.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">
                            {s.firstName} {s.lastName}
                          </p>
                          {s.isPrimary && (
                            <Badge
                              className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200"
                              variant="outline"
                            >
                              Primary
                            </Badge>
                          )}
                        </div>
                        {s.designation && (
                          <p className="text-xs text-muted-foreground">
                            {s.designation}
                            {s.department ? ` · ${s.department}` : ''}
                          </p>
                        )}
                        <p className="mt-1 text-xs font-medium">{s.client.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {s.serviceLine.name} · {s.businessUnit.name}
                          {s.client.city && <span> · {s.client.city}</span>}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                    </div>

                    {(s.email || s.phone) && (
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-[11px] text-muted-foreground">
                        {s.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {s.email}
                          </span>
                        )}
                        {s.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {s.phone}
                          </span>
                        )}
                        <span className="ml-auto">{s.client._count.requirements} reqs</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="Apps" className="flex-1 p-6 mt-0">
              <AppCredentialsManager />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function UserDetailSkeleton() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-72 shrink-0 border-r p-5">
        <div className="flex flex-col items-center gap-3 pt-2">
          <Skeleton className="h-20 w-20 rounded-full" />
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Separator className="my-5" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </aside>
      <main className="flex-1 p-6">
        <div className="grid grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </main>
    </div>
  );
}

function EmptyState({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-14 text-center">
      <Icon className="mb-2 h-8 w-8 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
