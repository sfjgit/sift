/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import type {
  RequirementDetailResponse,
  RequirementStatus,
  Assignment,
} from '@/types/requirements.types';
import {
  addNoteSchema,
  createAssignmentSchema,
  updateStatusSchema,
  type AddNoteInput,
  type CreateAssignmentInput,
  type UpdateStatusInput,
} from '@/lib/validators/requirement.validator';
import { useAxios } from '@/hooks/useAxios';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<RequirementStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

const VALID_TRANSITIONS: Record<RequirementStatus, RequirementStatus[]> = {
  DRAFT: ['PENDING_APPROVAL'],
  PENDING_APPROVAL: ['ACTIVE', 'DRAFT'],
  ACTIVE: ['ON_HOLD', 'CLOSED', 'CANCELLED'],
  ON_HOLD: ['ACTIVE', 'CANCELLED'],
  CLOSED: [],
  CANCELLED: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function statusVariant(s: RequirementStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (s) {
    case 'ACTIVE':
      return 'default';
    case 'DRAFT':
    case 'PENDING_APPROVAL':
      return 'secondary';
    case 'CLOSED':
    case 'CANCELLED':
      return 'destructive';
    case 'ON_HOLD':
      return 'outline';
  }
}

function humanize(str: string) {
  return str
    .split('_')
    .map(w => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function formatSalary(min?: number | null, max?: number | null, type?: string | null) {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    n >= 100000 ? `${(n / 100000).toFixed(1)}L` : `${(n / 1000).toFixed(0)}K`;
  const range = min && max ? `${fmt(min)} – ${fmt(max)}` : fmt((min || max)!);
  return `₹${range}${type ? ` / ${type.toLowerCase()}` : ''}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail row
// ─────────────────────────────────────────────────────────────────────────────

function Detail({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Assignment node (recursive)
// ─────────────────────────────────────────────────────────────────────────────

function AssignmentNode({
  assignment,
  depth,
  canEdit,
  onRemove,
}: {
  assignment: Assignment;
  depth: number;
  canEdit: boolean;
  onRemove: (id: string) => void;
}) {
  const label =
    assignment.assignmentType === 'TEAM'
      ? (assignment.team?.name ?? 'Team')
      : assignment.recruiter
        ? `${assignment.recruiter.firstName} ${assignment.recruiter.lastName}`
        : 'Unknown';

  const typeLabel = humanize(assignment.assignmentType);

  return (
    <div className="relative" style={{ marginLeft: depth > 0 ? `${depth * 20}px` : undefined }}>
      {depth > 0 && <div className="absolute left-[-16px] top-4 h-px w-4 bg-border" />}
      <div className="rounded-md border bg-card p-3 flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs shrink-0">
              {typeLabel}
            </Badge>
            <span className="text-sm font-medium truncate">{label}</span>
            {assignment.breachedAt && (
              <span className="text-destructive text-xs shrink-0">⚠ breached</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span>
              {assignment.filledOpenings}/{assignment.allocatedOpenings ?? '—'} filled
            </span>
            {assignment.submissionsCount != null && (
              <span>{assignment.submissionsCount} submissions</span>
            )}
            {assignment.interviewsCount != null && (
              <span>{assignment.interviewsCount} interviews</span>
            )}
            {assignment.deadline && (
              <span>Due {format(new Date(assignment.deadline), 'dd MMM yy')}</span>
            )}
            {assignment.assignedAt && (
              <span>
                Assigned{' '}
                {formatDistanceToNow(new Date(assignment.assignedAt), {
                  addSuffix: true,
                })}
              </span>
            )}
          </div>
        </div>
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive shrink-0 h-7 px-2"
            onClick={() => onRemove(assignment.id)}
          >
            Remove
          </Button>
        )}
      </div>

      {assignment.childAssignments && assignment.childAssignments.length > 0 && (
        <div className="mt-2 flex flex-col gap-2 relative">
          <div className="absolute left-[-16px] top-0 bottom-0 w-px bg-border" />
          {assignment.childAssignments.map(child => (
            <AssignmentNode
              key={child.id}
              assignment={child}
              depth={depth + 1}
              canEdit={canEdit}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add assignment dialog
// ─────────────────────────────────────────────────────────────────────────────

function AssignDialog({
  open,
  onClose,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAssignmentInput) => void;
  isPending: boolean;
}) {
  const form = useForm<CreateAssignmentInput>({
    resolver: zodResolver(createAssignmentSchema),
    defaultValues: {
      type: 'INDIVIDUAL',
      recruiterId: '',
      teamId: '',
      teamMemberId: '',
      parentAssignmentId: '',
      allocatedOpenings: undefined,
      deadline: '',
    },
  });

  const type = form.watch('type');

  function handleSubmit(data: CreateAssignmentInput) {
    onSubmit(data);
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign requirement</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assignment type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    //  @ts-ignore
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="TEAM">Team</SelectItem>
                      <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(type === 'MANAGER' || type === 'INDIVIDUAL') && (
              <FormField
                control={form.control}
                name="recruiterId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recruiter ID</FormLabel>
                    <FormControl>
                      <Input placeholder="User UUID" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {type === 'TEAM' && (
              <FormField
                control={form.control}
                name="teamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Team UUID" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {(type === 'TEAM' || type === 'INDIVIDUAL') && (
              <FormField
                control={form.control}
                name="parentAssignmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent assignment ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Assignment UUID" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="allocatedOpenings"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allocated openings</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="—"
                        value={field.value ?? ''}
                        onChange={e =>
                          field.onChange(e.target.value ? Number(e.target.value) : undefined)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deadline</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Assigning…' : 'Assign'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Status change dialog
// ─────────────────────────────────────────────────────────────────────────────

function StatusDialog({
  open,
  currentStatus,
  onClose,
  onSubmit,
  isPending,
}: {
  open: boolean;
  currentStatus: RequirementStatus;
  onClose: () => void;
  onSubmit: (data: UpdateStatusInput) => void;
  isPending: boolean;
}) {
  const form = useForm<UpdateStatusInput>({
    resolver: zodResolver(updateStatusSchema),
    defaultValues: { toStatus: undefined, reason: '' },
  });

  const transitions = VALID_TRANSITIONS[currentStatus];

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change status</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="toStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Move to</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {transitions.map(s => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Why is the status changing?"
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Updating…' : 'Update'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function RequirementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const axios = useAxios();
  const queryClient = useQueryClient();

  const [assignOpen, setAssignOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [removeAssignId, setRemoveAssignId] = useState<string | null>(null);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  // ── Fetch detail ─────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery<RequirementDetailResponse>({
    queryKey: ['requirement', id],
    queryFn: async () => (await axios.get(`/requirements/${id}`)).data,
    enabled: !!id,
  });

  const req = data?.data;
  const permissions = data?.permissions;

  // ── Note form ────────────────────────────────────────────────────────────────

  const noteForm = useForm<AddNoteInput>({
    resolver: zodResolver(addNoteSchema),
    defaultValues: { content: '' },
  });

  // ── Mutations ────────────────────────────────────────────────────────────────

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['requirement', id] });
    queryClient.invalidateQueries({ queryKey: ['requirements'] });
    queryClient.invalidateQueries({ queryKey: ['requirement-stats'] });
  };

  const statusMutation = useMutation({
    mutationFn: async (data: UpdateStatusInput) =>
      (await axios.patch(`/requirements/${id}/status`, data)).data,
    onSuccess: (_, { toStatus }) => {
      toast.success(`Status moved to ${STATUS_LABELS[toStatus]}`);
      setStatusOpen(false);
      invalidate();
    },
    onError: (err: unknown) => {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to update status'
      );
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (data: CreateAssignmentInput) => {
      const payload = {
        ...data,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : undefined,
      };
      return (await axios.post(`/requirements/${id}/assign`, payload)).data;
    },
    onSuccess: () => {
      toast.success('Assignment created');
      setAssignOpen(false);
      invalidate();
    },
    onError: (err: unknown) => {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to create assignment'
      );
    },
  });

  const removeAssignMutation = useMutation({
    mutationFn: async (assignmentId: string) =>
      (await axios.delete(`/requirements/${id}/assignments/${assignmentId}`)).data,
    onSuccess: () => {
      toast.success('Assignment removed');
      setRemoveAssignId(null);
      invalidate();
    },
    onError: () => toast.error('Failed to remove assignment'),
  });

  const addNoteMutation = useMutation({
    mutationFn: async (data: AddNoteInput) =>
      (await axios.post(`/requirements/${id}/notes`, data)).data,
    onSuccess: () => {
      toast.success('Note added');
      noteForm.reset();
      invalidate();
    },
    onError: () => toast.error('Failed to add note'),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) =>
      (await axios.delete(`/requirements/${id}/notes/${noteId}`)).data,
    onSuccess: () => {
      toast.success('Note deleted');
      setDeleteNoteId(null);
      invalidate();
    },
    onError: () => toast.error('Failed to delete note'),
  });

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-3 gap-4 mt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      </div>
    );
  }

  if (!req) {
    return <div className="p-6 text-muted-foreground text-sm">Requirement not found.</div>;
  }

  const transitions = VALID_TRANSITIONS[req.status];
  const salary = formatSalary(req.salaryMin, req.salaryMax, req.salaryType);

  return (
    <div className="flex flex-col gap-0 min-h-full">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => router.back()}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              ← Requirements
            </button>
            <span className="text-muted-foreground">/</span>
            <span className="font-mono text-sm text-muted-foreground">{req.reqCode}</span>
          </div>
          <h1 className="text-xl font-semibold leading-snug">{req.title}</h1>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <Badge variant={statusVariant(req.status)}>{STATUS_LABELS[req.status]}</Badge>
            <Badge variant="outline">{humanize(req.priority)} priority</Badge>
            <span className="text-sm text-muted-foreground">{req.client.name}</span>
            {req.businessUnit && (
              <span className="text-sm text-muted-foreground">· {req.businessUnit.name}</span>
            )}
            {(req.isRespondByBreached || req.isTurnaroundBreached) && (
              <Badge variant="destructive" className="text-xs">
                ⚠ Deadline breached
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {permissions?.canEdit && transitions.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setStatusOpen(true)}>
              Change status
            </Button>
          )}
          {permissions?.canEdit && req.status === 'ACTIVE' && (
            <Button size="sm" onClick={() => setAssignOpen(true)}>
              Assign
            </Button>
          )}
          {permissions?.canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/requirements/${id}/edit`)}
            >
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Left — core info */}
        <div className="w-72 shrink-0 border-r p-5 flex flex-col gap-5">
          {/* Core details */}
          <section className="flex flex-col gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Details
            </span>
            <Detail label="Job type" value={humanize(req.jobType)} />
            <Detail label="Remote" value={humanize(req.remoteType)} />
            <Detail
              label="Openings"
              value={`${req.filledOpenings} / ${req.totalOpenings} filled`}
            />
            {salary && <Detail label="Salary" value={salary} />}
            <Detail
              label="Experience"
              value={
                req.experienceMin != null || req.experienceMax != null
                  ? `${req.experienceMin ?? '?'} – ${req.experienceMax ?? '?'} yrs`
                  : undefined
              }
            />
            <Detail label="Location" value={req.location} />
            <Detail label="Country" value={req.country} />
            {req.respondBy && (
              <Detail
                label="Respond by"
                value={
                  <span className={req.isRespondByBreached ? 'text-destructive' : ''}>
                    {format(new Date(req.respondBy), 'dd MMM yyyy')}
                  </span>
                }
              />
            )}
            {req.turnaroundDays && (
              <Detail label="Turnaround" value={`${req.turnaroundDays} days`} />
            )}
            {req.startDate && (
              <Detail label="Start date" value={format(new Date(req.startDate), 'dd MMM yyyy')} />
            )}
            {req.endDate && (
              <Detail label="End date" value={format(new Date(req.endDate), 'dd MMM yyyy')} />
            )}
          </section>

          <Separator />

          {/* Client contact */}
          {req.clientContact && (
            <>
              <section className="flex flex-col gap-3">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Contact
                </span>
                <Detail
                  label="Name"
                  value={`${req.clientContact.firstName} ${req.clientContact.lastName ?? ''}`}
                />
                <Detail label="Designation" value={req.clientContact.designation} />
                <Detail label="Email" value={req.clientContact.email} />
              </section>
              <Separator />
            </>
          )}

          {/* Skills */}
          {req.skills.length > 0 && (
            <section className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Skills
              </span>
              <div className="flex flex-wrap gap-1.5">
                {req.skills.map((s: any) => (
                  <Badge
                    key={s.skill.id}
                    variant={s.isMandatory ? 'secondary' : 'outline'}
                    className="text-xs"
                  >
                    {s.skill.canonicalName}
                    {s.experience ? ` ${s.experience}y` : ''}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          <Separator />

          {/* Meta */}
          <section className="flex flex-col gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Meta
            </span>
            <Detail
              label="Created by"
              value={`${req.createdBy.firstName} ${req.createdBy.lastName}`}
            />
            <Detail label="Created" value={format(new Date(req.createdAt), 'dd MMM yyyy, HH:mm')} />
            {req.approvedBy && (
              <Detail
                label="Approved by"
                value={`${req.approvedBy.firstName} ${req.approvedBy.lastName}`}
              />
            )}
            {req.closedBy && (
              <Detail
                label="Closed by"
                value={`${req.closedBy.firstName} ${req.closedBy.lastName}`}
              />
            )}
          </section>

          {/* JD */}
          {req.jd.length > 0 && (
            <>
              <Separator />
              <section className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Job description
                </span>
                {req.jd.map(jd => (
                  <a
                    key={jd.id}
                    href={`/api/files/${jd.fileKey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline truncate"
                  >
                    {jd.fileName}
                  </a>
                ))}
              </section>
            </>
          )}
        </div>

        {/* Right — tabs */}
        <div className="flex-1 min-w-0 p-5">
          {/* Description */}
          {req.description && (
            <div className="mb-5 rounded-md border bg-muted/30 p-4">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {req.description}
              </p>
            </div>
          )}

          <Tabs defaultValue="assignments">
            <TabsList>
              <TabsTrigger value="assignments">
                Assignments
                {req.assignments.length > 0 && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {req.assignments.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="notes">
                Notes
                {req.notes.length > 0 && (
                  <span className="ml-1.5 text-xs text-muted-foreground">{req.notes.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="history">Status history</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            {/* ── Assignments ────────────────────────────────────────────────── */}
            <TabsContent value="assignments" className="mt-4">
              {req.assignments.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">
                  No assignments yet.
                  {permissions?.canEdit && req.status === 'ACTIVE' && (
                    <Button
                      variant="link"
                      size="sm"
                      className="ml-1 p-0 h-auto"
                      onClick={() => setAssignOpen(true)}
                    >
                      Assign now
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {req.assignments.map(a => (
                    <AssignmentNode
                      key={a.id}
                      assignment={a}
                      depth={0}
                      canEdit={permissions?.canEdit ?? false}
                      onRemove={assignId => setRemoveAssignId(assignId)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Notes ─────────────────────────────────────────────────────── */}
            <TabsContent value="notes" className="mt-4">
              <div className="flex flex-col gap-4">
                {/* Add note */}
                <form
                  onSubmit={noteForm.handleSubmit(data => addNoteMutation.mutate(data))}
                  className="flex flex-col gap-2"
                >
                  <Textarea
                    placeholder="Add a note…"
                    className="resize-none"
                    rows={3}
                    {...noteForm.register('content')}
                  />
                  {noteForm.formState.errors.content && (
                    <p className="text-xs text-destructive">
                      {noteForm.formState.errors.content.message}
                    </p>
                  )}
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" disabled={addNoteMutation.isPending}>
                      {addNoteMutation.isPending ? 'Adding…' : 'Add note'}
                    </Button>
                  </div>
                </form>

                <Separator />

                {/* Note list */}
                {req.notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No notes yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {req.notes.map(note => (
                      <div
                        key={note.id}
                        className="rounded-md border bg-card p-3 flex flex-col gap-1"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {note.author.firstName} {note.author.lastName}
                            </span>
                            <span>
                              {formatDistanceToNow(new Date(note.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteNoteId(note.id)}
                          >
                            Delete
                          </Button>
                        </div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {note.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Activity ──────────────────────────────────────────────────── */}
            <TabsContent value="activity" className="mt-4">
              <ScrollArea className="h-[500px] pr-2">
                {req.activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No activity yet.</p>
                ) : (
                  <div className="flex flex-col gap-0">
                    {req.activities.map((a, i) => (
                      <div key={a.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="mt-1.5 h-2 w-2 rounded-full bg-border shrink-0" />
                          {i < req.activities.length - 1 && (
                            <div className="flex-1 w-px bg-border mt-1" />
                          )}
                        </div>
                        <div className="pb-4 flex flex-col gap-0.5 min-w-0">
                          <p className="text-sm">{a.summary}</p>
                          <span className="text-xs text-muted-foreground">
                            {a.actor.firstName} {a.actor.lastName} ·{' '}
                            {formatDistanceToNow(new Date(a.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* ── Status history ────────────────────────────────────────────── */}
            <TabsContent value="history" className="mt-4">
              {req.statusHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No history yet.</p>
              ) : (
                <div className="flex flex-col gap-0">
                  {req.statusHistory.map((h, i) => (
                    <div key={h.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="mt-1.5 h-2 w-2 rounded-full bg-border shrink-0" />
                        {i < req.statusHistory.length - 1 && (
                          <div className="flex-1 w-px bg-border mt-1" />
                        )}
                      </div>
                      <div className="pb-4 flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant={statusVariant(h.fromStatus)} className="text-xs">
                            {STATUS_LABELS[h.fromStatus]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">→</span>
                          <Badge variant={statusVariant(h.toStatus)} className="text-xs">
                            {STATUS_LABELS[h.toStatus]}
                          </Badge>
                        </div>
                        {h.reason && <p className="text-xs text-muted-foreground">{h.reason}</p>}
                        <span className="text-xs text-muted-foreground">
                          {h.changedBy.firstName} {h.changedBy.lastName} ·{' '}
                          {format(new Date(h.changedAt), 'dd MMM yyyy, HH:mm')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Documents ─────────────────────────────────────────────────── */}
            <TabsContent value="documents" className="mt-4">
              {req.documents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No documents or issues.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {req.documents.map(doc => (
                    <div
                      key={doc.id}
                      className={`rounded-md border p-3 flex flex-col gap-1 ${
                        doc.isIssue && !doc.issueResolved
                          ? 'border-destructive/40 bg-destructive/5'
                          : 'bg-card'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {humanize(doc.type)}
                          </Badge>
                          {doc.isIssue && (
                            <Badge
                              variant={doc.issueResolved ? 'secondary' : 'destructive'}
                              className="text-xs"
                            >
                              {doc.issueResolved ? 'Resolved' : 'Open issue'}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(doc.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      {doc.content && (
                        <p className="text-sm text-foreground whitespace-pre-wrap">{doc.content}</p>
                      )}
                      {doc.fileName && (
                        <a
                          href={`/api/files/${doc.fileKey}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          {doc.fileName}
                        </a>
                      )}
                      <span className="text-xs text-muted-foreground">
                        By {doc.raisedBy.firstName} {doc.raisedBy.lastName}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ── Dialogs ───────────────────────────────────────────────────────────── */}

      <AssignDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        onSubmit={data => assignMutation.mutate(data)}
        isPending={assignMutation.isPending}
      />

      <StatusDialog
        open={statusOpen}
        currentStatus={req.status}
        onClose={() => setStatusOpen(false)}
        onSubmit={data => statusMutation.mutate(data)}
        isPending={statusMutation.isPending}
      />

      {/* Remove assignment confirm */}
      <AlertDialog open={!!removeAssignId} onOpenChange={o => !o && setRemoveAssignId(null)}>
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
              onClick={() => removeAssignId && removeAssignMutation.mutate(removeAssignId)}
            >
              {removeAssignMutation.isPending ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete note confirm */}
      <AlertDialog open={!!deleteNoteId} onOpenChange={o => !o && setDeleteNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteNoteMutation.isPending}
              onClick={() => deleteNoteId && deleteNoteMutation.mutate(deleteNoteId)}
            >
              {deleteNoteMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
