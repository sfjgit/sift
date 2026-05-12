'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useAxios } from '@/hooks/useAxios';
import type { Assignment, RequirementDetail } from '@/types/requirements.types';
// ─────────────────────────────────────────────────────────────────────────────
// Types from assignable-targets API
// ─────────────────────────────────────────────────────────────────────────────

interface TargetMember {
  memberId: string;
  teamRole: string;
  alreadyAssigned?: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId?: string | null;
  };
}

interface TargetTeam {
  id: string;
  name: string;
  nodeType: string;
  category: string | null;
  alreadyAssigned: boolean;
  members: TargetMember[];
}

interface AssignableTargetsResponse {
  success: boolean;
  role: 'sales' | 'dm' | 'none';
  parentAssignmentId: string | null;
  targets: { teams: TargetTeam[] } | [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function humanize(str: string) {
  return str
    .split('_')
    .map(w => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function ProgressBar({ filled, total }: { filled: number; total: number }) {
  const pct = total > 0 ? Math.min((filled / total) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground shrink-0">
        {filled}/{total}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Assignment card — shows one node in the chain
// ─────────────────────────────────────────────────────────────────────────────

function AssignmentCard({
  assignment,
  depth,
  canRemove,
  onRemove,
  onProgressUpdate,
  isOwn,
}: {
  assignment: Assignment;
  depth: number;
  canRemove: boolean;
  onRemove: (id: string) => void;
  onProgressUpdate?: (id: string) => void;
  isOwn: boolean;
}) {
  const label =
    assignment.assignmentType === 'TEAM'
      ? (assignment.team?.name ?? 'Team')
      : assignment.recruiter
        ? `${assignment.recruiter.firstName} ${assignment.recruiter.lastName}`
        : 'Unknown';

  return (
    <div style={{ marginLeft: depth > 0 ? `${depth * 24}px` : undefined }}>
      {depth > 0 && (
        <div className="ml-[-16px] mb-1 flex items-center gap-1">
          <div className="w-4 h-px bg-border" />
        </div>
      )}
      <div
        className={`rounded-lg border p-3 flex flex-col gap-2 ${
          isOwn ? 'border-primary/30 bg-primary/5' : 'bg-card'
        }`}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="outline" className="text-xs shrink-0">
              {humanize(assignment.assignmentType)}
            </Badge>
            <span className="text-sm font-medium truncate">{label}</span>
            {isOwn && (
              <Badge variant="secondary" className="text-xs shrink-0">
                You
              </Badge>
            )}
            {assignment.breachedAt && (
              <span className="text-destructive text-xs shrink-0">⚠ breached</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isOwn && onProgressUpdate && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onProgressUpdate(assignment.id)}
              >
                Update progress
              </Button>
            )}
            {canRemove && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(assignment.id)}
              >
                Remove
              </Button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          {assignment.allocatedOpenings != null && (
            <span>{assignment.allocatedOpenings} allocated</span>
          )}
          {assignment.submissionsCount != null && (
            <span>{assignment.submissionsCount} submissions</span>
          )}
          {assignment.interviewsCount != null && (
            <span>{assignment.interviewsCount} interviews</span>
          )}
          {assignment.deadline && (
            <span className={assignment.breachedAt ? 'text-destructive' : ''}>
              Due {format(new Date(assignment.deadline), 'dd MMM yy')}
            </span>
          )}
          {assignment.assignedAt && (
            <span>{formatDistanceToNow(new Date(assignment.assignedAt), { addSuffix: true })}</span>
          )}
        </div>

        {/* Progress bar */}
        {assignment.allocatedOpenings != null && (
          <ProgressBar filled={assignment.filledOpenings} total={assignment.allocatedOpenings} />
        )}
      </div>

      {/* Children */}
      {assignment.childAssignments && assignment.childAssignments.length > 0 && (
        <div className="mt-2 flex flex-col gap-2 border-l pl-4 ml-3">
          {assignment.childAssignments.map(child => (
            <AssignmentCard
              key={child.id}
              assignment={child}
              depth={0}
              canRemove={canRemove}
              onRemove={onRemove}
              onProgressUpdate={onProgressUpdate}
              isOwn={isOwn}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Assign dialog — built from assignable-targets response
// ─────────────────────────────────────────────────────────────────────────────

function AssignDialog({
  open,
  onClose,
  requirementId,
  totalOpenings,
  onAssigned,
}: {
  open: boolean;
  onClose: () => void;
  requirementId: string;
  totalOpenings: number;
  onAssigned: () => void;
}) {
  const axios = useAxios();

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedRecruiterId, setSelectedRecruiterId] = useState<string | null>(null);
  const [allocatedOpenings, setAllocatedOpenings] = useState<number>(totalOpenings);
  const [deadline, setDeadline] = useState('');

  const { data: targetsRes, isLoading } = useQuery<AssignableTargetsResponse>({
    queryKey: ['assignable-targets', requirementId],
    queryFn: async () =>
      (await axios.get(`/requirements/${requirementId}/assignable-targets`)).data,
    enabled: open,
  });

  const role = targetsRes?.role;
  const teams = !Array.isArray(targetsRes?.targets) ? (targetsRes?.targets?.teams ?? []) : [];
  const parentAssignmentId = targetsRes?.parentAssignmentId ?? null;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedTeamId && !selectedRecruiterId) throw new Error('Select a target');

      const payload: Record<string, unknown> = {
        allocatedOpenings,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        parentAssignmentId: parentAssignmentId ?? null,
      };

      if (selectedRecruiterId) {
        // Direct individual assignment
        payload.type = 'INDIVIDUAL';
        payload.recruiterId = selectedRecruiterId;
        // find teamId from selected recruiter's team
        const team = teams.find(t => t.members.some(m => m.user.id === selectedRecruiterId));
        if (team)
          payload.teamMemberId = team.members.find(
            m => m.user.id === selectedRecruiterId
          )?.memberId;
      } else {
        // Team assignment
        payload.type = 'TEAM';
        payload.teamId = selectedTeamId;
      }

      return (await axios.post(`/requirements/${requirementId}/assign`, payload)).data;
    },
    onSuccess: () => {
      toast.success('Assigned successfully');
      onAssigned();
      onClose();
      setSelectedTeamId(null);
      setSelectedRecruiterId(null);
    },
    onError: (err: unknown) => {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to assign'
      );
    },
  });

  function handleClose() {
    setSelectedTeamId(null);
    setSelectedRecruiterId(null);
    setDeadline('');
    setAllocatedOpenings(totalOpenings);
    onClose();
  }

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {role === 'sales'
              ? 'Assign to delivery manager'
              : // @ts-expect-error err
                role === 'tl'
                ? 'Assign to team member'
                : 'Distribute to team / recruiter'}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading targets…</div>
        ) : role === 'none' || teams.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No assignable targets available.
            <p className="mt-1 text-xs">
              {role === 'none'
                ? 'You do not have authority to assign this requirement.'
                : 'No teams are connected via assignment edges.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Step 1 — pick team */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                {role === 'sales'
                  ? 'Select delivery manager'
                  : // @ts-expect-error err
                    role === 'tl'
                    ? 'Select member'
                    : 'Select team'}
              </Label>
              <div className="flex flex-col gap-2">
                {teams.map(team => (
                  <button
                    key={team.id}
                    type="button"
                    disabled={team.alreadyAssigned}
                    onClick={() => {
                      setSelectedTeamId(team.id);
                      setSelectedRecruiterId(null);
                    }}
                    className={`text-left rounded-lg border p-3 transition-colors ${
                      team.alreadyAssigned
                        ? 'opacity-50 cursor-not-allowed bg-muted/30'
                        : selectedTeamId === team.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{team.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {team.members.length} members
                        </Badge>
                      </div>
                      {team.alreadyAssigned && (
                        <Badge variant="secondary" className="text-xs">
                          Assigned
                        </Badge>
                      )}
                    </div>
                    {team.members.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {team.members
                          .slice(0, 3)
                          .map(m => `${m.user.firstName} ${m.user.lastName}`)
                          .join(', ')}
                        {team.members.length > 3 && ` +${team.members.length - 3}`}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2 — optionally pick individual from selected team (DM only) */}
            {(role === 'dm' ||
              // @ts-expect-error err
              role === 'tl') &&
              selectedTeam &&
              selectedTeam.members.length > 0 && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                      Or assign directly to a recruiter (optional)
                    </Label>
                    <div className="flex flex-col gap-1.5">
                      {selectedTeam.members.map(m => (
                        <button
                          key={m.memberId}
                          type="button"
                          disabled={m.alreadyAssigned}
                          onClick={() =>
                            setSelectedRecruiterId(
                              selectedRecruiterId === m.user.id ? null : m.user.id
                            )
                          }
                          className={`text-left rounded-md border px-3 py-2 text-sm transition-colors ${
                            m.alreadyAssigned
                              ? 'opacity-50 cursor-not-allowed bg-muted/30'
                              : selectedRecruiterId === m.user.id
                                ? 'border-primary bg-primary/5'
                                : 'hover:bg-muted/40'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {m.user.firstName} {m.user.lastName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {humanize(m.teamRole)}
                              </span>
                              {m.user.employeeId && (
                                <span className="text-xs text-muted-foreground font-mono">
                                  {m.user.employeeId}
                                </span>
                              )}
                            </div>
                            {m.alreadyAssigned && (
                              <Badge variant="secondary" className="text-xs">
                                Assigned
                              </Badge>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

            <Separator />

            {/* Config */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Allocated openings</Label>
                <Input
                  type="number"
                  min={1}
                  max={totalOpenings}
                  value={allocatedOpenings}
                  onChange={e =>
                    setAllocatedOpenings(e.target.value ? Number(e.target.value) : totalOpenings)
                  }
                  className="h-9"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Deadline (optional)</Label>
                <Input
                  type="date"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            disabled={
              mutation.isPending ||
              (!selectedTeamId && !selectedRecruiterId) ||
              role === 'none' ||
              isLoading
            }
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Assigning…' : 'Confirm assignment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress update dialog — recruiter only
// ─────────────────────────────────────────────────────────────────────────────

function ProgressDialog({
  open,
  assignmentId,
  requirementId,
  onClose,
  current,
}: {
  open: boolean;
  assignmentId: string | null;
  requirementId: string;
  onClose: () => void;
  current?: Assignment;
}) {
  const axios = useAxios();
  const queryClient = useQueryClient();

  const [submissions, setSubmissions] = useState(current?.submissionsCount ?? 0);
  const [interviews, setInterviews] = useState(current?.interviewsCount ?? 0);
  const [filled, setFilled] = useState(current?.filledOpenings ?? 0);

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await axios.patch(`/requirements/${requirementId}/assignments/${assignmentId}/progress`, {
          submissionsCount: submissions,
          interviewsCount: interviews,
          filledOpenings: filled,
        })
      ).data,
    onSuccess: res => {
      toast.success('Progress updated');
      if (res.hint) toast.info(res.hint);
      queryClient.invalidateQueries({ queryKey: ['requirement', requirementId] });
      queryClient.invalidateQueries({ queryKey: ['requirements'] });
      onClose();
    },
    onError: () => toast.error('Failed to update progress'),
  });

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Update progress</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Submissions</Label>
            <Input
              type="number"
              min={0}
              value={submissions}
              onChange={e => setSubmissions(Number(e.target.value))}
              className="h-9"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Interviews scheduled</Label>
            <Input
              type="number"
              min={0}
              value={interviews}
              onChange={e => setInterviews(Number(e.target.value))}
              className="h-9"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Openings filled</Label>
            <Input
              type="number"
              min={0}
              max={current?.allocatedOpenings ?? 999}
              value={filled}
              onChange={e => setFilled(Number(e.target.value))}
              className="h-9"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Workspace tab
// ─────────────────────────────────────────────────────────────────────────────

export function WorkspaceTab({
  req,
  currentUserId,
  canAssign,
  canRemoveAssignment,
}: {
  req: RequirementDetail;
  currentUserId: string;
  canAssign: boolean;
  canRemoveAssignment: boolean;
}) {
  const axios = useAxios();
  const queryClient = useQueryClient();

  const [assignOpen, setAssignOpen] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [progressAssignmentId, setProgressAssignmentId] = useState<string | null>(null);

  // Fetch assignable targets to determine if THIS user can assign
  // This covers DMs who have team assignment but no canEdit on module
  const { data: targetsRes } = useQuery<AssignableTargetsResponse>({
    queryKey: ['assignable-targets', req.id],
    queryFn: async () => (await axios.get(`/requirements/${req.id}/assignable-targets`)).data,
    enabled: req.status === 'ACTIVE',
    staleTime: 30_000,
  });

  // Show assign button if:
  // 1. canAssign prop (admin/sales with canEdit) OR
  // 2. assignable-targets says role is dm or sales (covers DM case)
  const canShowAssign =
    req.status === 'ACTIVE' && (canAssign || (targetsRes?.role && targetsRes.role !== 'none'));

  // Find caller's own assignment if any
  function findOwnAssignment(assignments: Assignment[]): Assignment | undefined {
    for (const a of assignments) {
      if (a.recruiter?.id === currentUserId) return a;
      if (a.childAssignments?.length) {
        const found = findOwnAssignment(a.childAssignments);
        if (found) return found;
      }
    }
    return undefined;
  }

  // @ts-expect-error err
  const myAssignment = findOwnAssignment(req.assignments);
  // @ts-expect-error err
  const hasAnyAssignment = req.assignments.length > 0;

  const removeAssignMutation = useMutation({
    mutationFn: async (assignmentId: string) =>
      (await axios.delete(`/requirements/${req.id}/assignments/${assignmentId}`)).data,
    onSuccess: () => {
      toast.success('Assignment removed');
      setRemoveId(null);
      queryClient.invalidateQueries({ queryKey: ['requirement', req.id] });
      queryClient.invalidateQueries({ queryKey: ['requirements'] });
      queryClient.invalidateQueries({ queryKey: ['requirement-stats'] });
    },
    onError: () => toast.error('Failed to remove assignment'),
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Header strip */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">Assignment chain</span>
          <span className="text-xs text-muted-foreground">
            {req.filledOpenings}/{req.totalOpenings} openings filled
          </span>
        </div>
        {canShowAssign && (
          <Button size="sm" onClick={() => setAssignOpen(true)}>
            + Assign
          </Button>
        )}
      </div>

      {/* Overall progress bar */}
      <ProgressBar filled={req.filledOpenings} total={req.totalOpenings} />

      <Separator />

      {/* Assignment tree */}
      {!hasAnyAssignment ? (
        <div className="py-8 text-center flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Not assigned yet.</p>
          {canShowAssign && (
            <button
              onClick={() => setAssignOpen(true)}
              className="text-sm text-primary hover:underline"
            >
              Assign now
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {
            // @ts-expect-error err
            req.assignments.map(a => (
              <AssignmentCard
                key={a.id}
                assignment={a}
                depth={0}
                canRemove={canRemoveAssignment}
                onRemove={id => setRemoveId(id)}
                onProgressUpdate={id => setProgressAssignmentId(id)}
                isOwn={
                  a.recruiter?.id === currentUserId ||
                  // @ts-expect-error err
                  !!a.childAssignments?.some(c => c.recruiter?.id === currentUserId)
                }
              />
            ))
          }
        </div>
      )}

      {/* Stats summary if assignments exist */}
      {hasAnyAssignment && (
        <>
          <Separator />
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: 'Total submissions',
                // @ts-expect-error err
                value: req.assignments.reduce((s, a) => s + (a.submissionsCount ?? 0), 0),
              },
              {
                label: 'Interviews',
                // @ts-expect-error err
                value: req.assignments.reduce((s, a) => s + (a.interviewsCount ?? 0), 0),
              },
              {
                label: 'Offers rolled out',
                value: req.offersRolledOut ?? 0,
              },
            ].map(stat => (
              <div key={stat.label} className="rounded-lg border bg-card p-3 flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <span className="text-lg font-bold tabular-nums">{stat.value}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Assign dialog */}
      <AssignDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        requirementId={req.id}
        totalOpenings={req.totalOpenings}
        onAssigned={() => {
          queryClient.invalidateQueries({ queryKey: ['requirement', req.id] });
          queryClient.invalidateQueries({ queryKey: ['requirements'] });
          queryClient.invalidateQueries({ queryKey: ['assignable-targets', req.id] });
        }}
      />

      {/* Progress dialog */}
      <ProgressDialog
        open={!!progressAssignmentId}
        assignmentId={progressAssignmentId}
        requirementId={req.id}
        onClose={() => setProgressAssignmentId(null)}
        current={myAssignment}
      />

      {/* Remove confirm */}
      <AlertDialog open={!!removeId} onOpenChange={o => !o && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will also remove all child assignments under it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removeAssignMutation.isPending}
              onClick={() => removeId && removeAssignMutation.mutate(removeId)}
            >
              {removeAssignMutation.isPending ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
