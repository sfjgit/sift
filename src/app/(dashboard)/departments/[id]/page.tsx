/* eslint-disable @typescript-eslint/no-explicit-any */
// app/departments/[id]/page.tsx
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useAxios } from '@/hooks/useAxios';
import { DepartmentForm } from '@/components/departments/DepartmentForm';
import { ToggleConfirmDialog } from '@/components/departments/ToggleConfirmDialog';
import type {
  DepartmentDetail,
  DepartmentUser,
  DepartmentAssignment,
} from '@/components/departments/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function humanize(str: string) {
  return str
    .split('_')
    .map(w => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function StatBox({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-card p-4">
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
        {label}
      </span>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

const PRIORITY_CLS: Record<string, string> = {
  HIGH: 'text-destructive',
  MEDIUM: 'text-amber-600',
  LOW: 'text-muted-foreground',
};

const STATUS_CLS: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DRAFT: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-200',
  ON_HOLD: 'bg-orange-50 text-orange-700 border-orange-200',
  CLOSED: 'bg-blue-50 text-blue-700 border-blue-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function UsersTable({ users }: { users: DepartmentUser[] }) {
  const router = useRouter();

  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        No active users in this department.
      </p>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Reports to</TableHead>
            <TableHead className="text-center">Active assignments</TableHead>
            <TableHead className="text-center">Assigned to others</TableHead>
            <TableHead className="text-center">Subordinates</TableHead>
            <TableHead className="w-[80px]">Location</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(u => (
            <TableRow
              key={u.id}
              className="cursor-pointer hover:bg-muted/40 transition-colors"
              onClick={() => router.push(`/users/${u.id}`)}
            >
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-sm">
                    {u.firstName} {u.lastName}
                  </span>
                  {u.employeeId && (
                    <span className="text-xs text-muted-foreground font-mono">{u.employeeId}</span>
                  )}
                  <span className="text-xs text-muted-foreground">{u.email}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {u.role.name}
                </Badge>
              </TableCell>
              <TableCell>
                {u.reportingTo ? (
                  <span className="text-sm">
                    {u.reportingTo.firstName} {u.reportingTo.lastName}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                <span className="text-sm tabular-nums font-medium">
                  {u._count.assignmentsReceived}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-sm tabular-nums font-medium">
                  {u._count.assignmentsGiven}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-sm tabular-nums font-medium">{u._count.subordinates}</span>
              </TableCell>
              <TableCell>
                <span className="text-xs text-muted-foreground">{u.workingLocation ?? '—'}</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AssignmentsTable({ assignments }: { assignments: DepartmentAssignment[] }) {
  const router = useRouter();

  if (assignments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">No active assignments.</p>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead>Requirement</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Assigned to</TableHead>
            <TableHead>Assigned by</TableHead>
            <TableHead className="text-center">Submissions</TableHead>
            <TableHead className="text-center">Interviews</TableHead>
            <TableHead className="text-center">Filled</TableHead>
            <TableHead>Deadline</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.map(a => (
            <TableRow
              key={a.id}
              className="cursor-pointer hover:bg-muted/40 transition-colors"
              onClick={() => router.push(`/requirements/${a.requirement.id}`)}
            >
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs text-muted-foreground">
                      {a.requirement.reqCode}
                    </span>
                    <span
                      className={`text-xs font-medium ${PRIORITY_CLS[a.requirement.priority] ?? ''}`}
                    >
                      {humanize(a.requirement.priority)}
                    </span>
                  </div>
                  <span className="text-sm font-medium line-clamp-1">{a.requirement.title}</span>
                  {a.requirement.businessUnit && (
                    <span className="text-xs text-muted-foreground">
                      {a.requirement.businessUnit.name}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm">{a.requirement.client.name}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm">
                  {a.assignedTo.firstName} {a.assignedTo.lastName}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm">
                  {a.assignedBy.firstName} {a.assignedBy.lastName}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-sm tabular-nums">{a.submissionsCount}</span>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-sm tabular-nums">{a.interviewsCount}</span>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-sm tabular-nums">{a.filledOpenings}</span>
              </TableCell>
              <TableCell>
                {a.deadline ? (
                  <span className="text-xs tabular-nums">
                    {format(new Date(a.deadline), 'dd MMM yy')}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DepartmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const axios = useAxios();
  const qc = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [toggleOpen, setToggleOpen] = useState(false);

  const { data, isLoading } = useQuery<{ data: DepartmentDetail }>({
    queryKey: ['department', id],
    queryFn: async () => (await axios.get(`/departments/${id}`)).data,
    enabled: !!id,
  });

  const dept = data?.data;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['department', id] });
    qc.invalidateQueries({ queryKey: ['departments'] });
  };

  const toggleMutation = useMutation({
    mutationFn: async () => (await axios.patch(`/departments/${id}/toggle`)).data,
    onSuccess: () => {
      toast.success(`Department ${dept?.isActive ? 'deactivated' : 'activated'}`);
      setToggleOpen(false);
      invalidate();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed');
      setToggleOpen(false);
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col gap-4">
        <Skeleton className="h-7 w-48" />
        <div className="grid grid-cols-4 gap-3 mt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64 mt-4" />
      </div>
    );
  }

  if (!dept) {
    return <div className="p-6 text-sm text-muted-foreground">Department not found.</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 border-b bg-background px-6 pt-4 pb-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <button
            onClick={() => router.push('/departments')}
            className="hover:text-foreground transition-colors"
          >
            Departments
          </button>
          <span>/</span>
          <span>{dept.name}</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-semibold">{dept.name}</h1>
              {dept.code && (
                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded border">
                  {dept.code}
                </span>
              )}
              <Badge variant={dept.isActive ? 'default' : 'outline'} className="text-xs">
                {dept.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Created {format(new Date(dept.createdAt), 'dd MMM yyyy')}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={
                dept.isActive ? 'text-destructive border-destructive/30 hover:text-destructive' : ''
              }
              onClick={() => setToggleOpen(true)}
            >
              {dept.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        </div>

        {/* Stat boxes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mt-4">
          <StatBox label="Users" value={dept.stats.totalUsers} />
          <StatBox label="Active assignments" value={dept.stats.activeAssignments} />
          <StatBox label="Submissions" value={dept.stats.totalSubmissions} />
          <StatBox label="Interviews" value={dept.stats.totalInterviews} />
          <StatBox label="Filled" value={dept.stats.totalFilled} />
          <StatBox label="Reqs created" value={dept.stats.requirementsCreated} />
          <StatBox label="Active reqs" value={dept.stats.requirementsActive} />
          <StatBox label="Candidates sourced" value={dept.stats.candidatesSourced} />
        </div>

        {/* Candidate stage breakdown */}
        {Object.keys(dept.stats.candidatesByStage).length > 0 && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {Object.entries(dept.stats.candidatesByStage).map(([stage, count]) => (
              <span
                key={stage}
                className="text-xs px-2 py-0.5 rounded-full border bg-muted text-muted-foreground"
              >
                {humanize(stage)}: <span className="font-medium text-foreground">{count}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 px-6 pt-4 pb-6">
        <Tabs defaultValue="users" className="flex flex-col h-full">
          <TabsList className="shrink-0 w-fit">
            <TabsTrigger value="users">
              Users
              {dept.stats.totalUsers > 0 && (
                <span className="ml-1.5 text-xs opacity-60">{dept.stats.totalUsers}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="assignments">
              Active assignments
              {dept.stats.activeAssignments > 0 && (
                <span className="ml-1.5 text-xs opacity-60">{dept.stats.activeAssignments}</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4 flex-1 min-h-0">
            <ScrollArea className="h-full">
              <UsersTable users={dept.users} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="assignments" className="mt-4 flex-1 min-h-0">
            <ScrollArea className="h-full">
              <AssignmentsTable assignments={dept.activeAssignments} />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      <DepartmentForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={invalidate}
        editing={dept}
      />

      <ToggleConfirmDialog
        department={toggleOpen ? dept : null}
        isPending={toggleMutation.isPending}
        onConfirm={() => toggleMutation.mutate()}
        onClose={() => setToggleOpen(false)}
      />
    </div>
  );
}
