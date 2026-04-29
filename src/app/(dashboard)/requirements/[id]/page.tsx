/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useContext, useState } from 'react';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useAxios } from '@/hooks/useAxios';
// import { AuthContext } from '@/context/AuthContext';
import { WorkspaceTab } from '../_components/WorkspaceTab';
import type {
  RequirementDetailResponse,
  RequirementStatus,
  Assignment,
} from '@/types/requirements.types';
import {
  addNoteSchema,
  updateStatusSchema,
  type AddNoteInput,
  type UpdateStatusInput,
} from '@/lib/validators/requirement.validator';
import { useAuth } from '@/context/AuthContext';

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
  DRAFT: ['PENDING_APPROVAL', 'ACTIVE', 'CANCELLED'],
  PENDING_APPROVAL: ['ACTIVE', 'DRAFT'],
  ACTIVE: ['ON_HOLD', 'CLOSED', 'CANCELLED'],
  ON_HOLD: ['ACTIVE', 'CANCELLED'],
  CLOSED: [],
  CANCELLED: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Tiny helpers
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

function fmt(n: number) {
  return n >= 100000
    ? `${(n / 100000).toFixed(1)}L`
    : n >= 1000
      ? `${(n / 1000).toFixed(0)}K`
      : String(n);
}

// ─────────────────────────────────────────────────────────────────────────────
// Meta item — left sidebar detail rows
// ─────────────────────────────────────────────────────────────────────────────

function MetaRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0 w-28">{label}</span>
      <span className="text-xs text-foreground text-right">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat chip — header stat pill
// ─────────────────────────────────────────────────────────────────────────────

function StatChip({
  label,
  value,
  alert,
}: {
  label: string;
  value: string | number;
  alert?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center px-4 py-2 rounded-md border ${alert ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-muted/30'}`}
    >
      <span
        className={`text-lg font-bold tabular-nums leading-none ${alert ? 'text-destructive' : 'text-foreground'}`}
      >
        {value}
      </span>
      <span className="text-xs text-muted-foreground mt-0.5">{label}</span>
    </div>
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
                  <FormLabel>
                    Reason <span className="text-muted-foreground font-normal">(optional)</span>
                  </FormLabel>
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
                {isPending ? 'Updating…' : 'Update status'}
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
  // const { user } = useContext(AuthContext);
  const { user } = useAuth();

  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery<RequirementDetailResponse>({
    queryKey: ['requirement', id],
    queryFn: async () => (await axios.get(`/requirements/${id}`)).data,
    enabled: !!id,
  });

  const req: any = data?.data as any;
  const permissions = data?.permissions;

  // ── Note form ─────────────────────────────────────────────────────────────

  const noteForm = useForm<AddNoteInput>({
    resolver: zodResolver(addNoteSchema),
    defaultValues: { content: '' },
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['requirement', id] });
    queryClient.invalidateQueries({ queryKey: ['requirements'] });
    queryClient.invalidateQueries({ queryKey: ['requirement-stats'] });
  };

  const statusMutation = useMutation({
    mutationFn: async (d: UpdateStatusInput) =>
      (await axios.patch(`/requirements/${id}/status`, d)).data,
    onSuccess: (_, { toStatus }) => {
      toast.success(`Status → ${STATUS_LABELS[toStatus]}`);
      setStatusOpen(false);
      invalidate();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to update status'),
  });

  const addNoteMutation = useMutation({
    mutationFn: async (d: AddNoteInput) => (await axios.post(`/requirements/${id}/notes`, d)).data,
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

  // ── Loading / empty ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col gap-4">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-48" />
        <div className="grid grid-cols-4 gap-3 mt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
        <Skeleton className="h-96 mt-4" />
      </div>
    );
  }

  if (!req) {
    return <div className="p-6 text-sm text-muted-foreground">Requirement not found.</div>;
  }

  const transitions = VALID_TRANSITIONS[req.status as RequirementStatus];
  const canEdit = permissions?.canEdit ?? false;
  const canAssign = canEdit;
  // Assign button shown whenever user has edit permission.
  // Backend will reject if requirement is not ACTIVE.
  const canRemoveAssignment = canEdit;

  const salary =
    req.salaryMin || req.salaryMax
      ? `₹${fmt(req.salaryMin ?? 0)}${req.salaryMax ? ` – ₹${fmt(req.salaryMax)}` : ''}${req.salaryType ? ` / ${req.salaryType.toLowerCase()}` : ''}`
      : null;

  return (
    <div className="flex flex-col h-full">
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b bg-background">
        {/* Breadcrumb */}
        <div className="px-6 pt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <button
            onClick={() => router.push('/requirements')}
            className="hover:text-foreground transition-colors"
          >
            Requirements
          </button>
          <span>/</span>
          <span className="font-mono">{req.reqCode}</span>
        </div>

        {/* Title + actions */}
        <div className="px-6 pt-2 pb-4 flex items-start justify-between gap-6">
          <div className="flex flex-col gap-2 min-w-0">
            <h1 className="text-xl font-semibold leading-tight">{req.title}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={statusVariant(req.status)} className="text-xs">
                {STATUS_LABELS[req.status as RequirementStatus]}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {humanize(req.priority)}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {humanize(req.jobType)}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {humanize(req.remoteType)}
              </Badge>
              <span className="text-sm text-muted-foreground">{req.client.name}</span>
              {req.businessUnit && (
                <span className="text-sm text-muted-foreground">· {req.businessUnit.name}</span>
              )}
              {(req.isRespondByBreached || req.isTurnaroundBreached) && (
                <Badge variant="destructive" className="text-xs">
                  ⚠ Breached
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-0.5">
            {canEdit && transitions.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setStatusOpen(true)}>
                Change status
              </Button>
            )}
            {canEdit && (
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

        {/* Stat chips */}
        <div className="px-6 pb-4 flex items-center gap-3 flex-wrap">
          <StatChip
            label="Openings"
            value={`${req.filledOpenings}/${req.totalOpenings}`}
            alert={req.filledOpenings < req.totalOpenings && req.status === 'ACTIVE'}
          />
          <StatChip label="Applications" value={req.activeApplications ?? 0} />
          <StatChip label="Interviews" value={req.interviewsScheduled ?? 0} />
          <StatChip label="Offers" value={req.offersRolledOut ?? 0} />
          {req.assignments.length > 0 && (
            <StatChip label="Assigned to" value={req.assignments.length} />
          )}
          {req.respondBy && (
            <StatChip
              label="Respond by"
              value={format(new Date(req.respondBy), 'dd MMM yy')}
              alert={req.isRespondByBreached}
            />
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Left sidebar ─────────────────────────────────────────────────── */}
        <ScrollArea className="w-64 shrink-0 border-r">
          <div className="p-4 flex flex-col gap-5">
            {/* Job info */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                Job info
              </span>
              <MetaRow label="Job type" value={humanize(req.jobType)} />
              <MetaRow label="Remote" value={humanize(req.remoteType)} />
              <MetaRow label="Location" value={req.location} />
              <MetaRow label="Country" value={req.country} />
              {salary && <MetaRow label="Salary" value={salary} />}
              <MetaRow
                label="Experience"
                value={
                  req.experienceMin != null || req.experienceMax != null
                    ? `${req.experienceMin ?? 0} – ${req.experienceMax ?? '?'} yrs`
                    : undefined
                }
              />
              {req.turnaroundDays && (
                <MetaRow label="Turnaround" value={`${req.turnaroundDays} days`} />
              )}
              {req.startDate && (
                <MetaRow label="Start" value={format(new Date(req.startDate), 'dd MMM yyyy')} />
              )}
              {req.endDate && (
                <MetaRow label="End" value={format(new Date(req.endDate), 'dd MMM yyyy')} />
              )}
            </div>

            <Separator />

            {/* Skills */}
            {req.skills.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Skills
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {req.skills.map((s: any) => (
                    <span
                      key={s.skill.id}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border ${
                        s.isMandatory
                          ? 'bg-secondary text-secondary-foreground border-secondary'
                          : 'bg-background text-muted-foreground border-border'
                      }`}
                    >
                      {s.skill.canonicalName}
                      {s.experience ? (
                        <span className="text-muted-foreground">{s.experience}y</span>
                      ) : null}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Client contact */}
            {req.clientContact && (
              <>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                    Client contact
                  </span>
                  <MetaRow
                    label="Name"
                    value={`${req.clientContact.firstName} ${req.clientContact.lastName ?? ''}`}
                  />
                  <MetaRow label="Title" value={req.clientContact.designation} />
                  <MetaRow label="Email" value={req.clientContact.email} />
                </div>
                <Separator />
              </>
            )}

            {/* Meta */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                Record
              </span>
              <MetaRow
                label="Created by"
                value={`${req.createdBy.firstName} ${req.createdBy.lastName}`}
              />
              <MetaRow label="Created" value={format(new Date(req.createdAt), 'dd MMM yyyy')} />
              {req.approvedBy && (
                <MetaRow
                  label="Approved by"
                  value={`${req.approvedBy.firstName} ${req.approvedBy.lastName}`}
                />
              )}
              {req.closedBy && (
                <MetaRow
                  label="Closed by"
                  value={`${req.closedBy.firstName} ${req.closedBy.lastName}`}
                />
              )}
            </div>

            {/* JD */}
            {req.jd.length > 0 && (
              <>
                <Separator />
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Job description
                  </span>
                  {req.jd.map((jd: any) => (
                    <a
                      key={jd.id}
                      href={`/api/files/${jd.fileKey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline truncate flex items-center gap-1"
                    >
                      <span>📄</span> {jd.fileName}
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {/* Description banner */}
          {req.description && (
            <div className="shrink-0 px-6 pt-4">
              <div className="rounded-md bg-muted/40 border px-4 py-3">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {req.description}
                </p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex-1 min-h-0 px-6 pt-4 pb-6 flex flex-col">
            <Tabs defaultValue="workspace" className="flex flex-col flex-1 min-h-0">
              <TabsList className="shrink-0 w-fit">
                <TabsTrigger value="workspace">
                  Workspace
                  {req.assignments.length > 0 && (
                    <span className="ml-1.5 text-xs opacity-60">{req.assignments.length}</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="notes">
                  Notes
                  {req.notes.length > 0 && (
                    <span className="ml-1.5 text-xs opacity-60">{req.notes.length}</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="history">Status history</TabsTrigger>
                <TabsTrigger value="documents">
                  Documents
                  {req.documents.length > 0 && (
                    <span className="ml-1.5 text-xs opacity-60">{req.documents.length}</span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* ── Workspace ──────────────────────────────────────────────── */}
              <TabsContent value="workspace" className="mt-4 flex-1 min-h-0">
                <ScrollArea className="h-full">
                  <WorkspaceTab
                    req={req}
                    currentUserId={user?.id ?? ''}
                    canAssign={canAssign}
                    canRemoveAssignment={canRemoveAssignment}
                  />
                </ScrollArea>
              </TabsContent>

              {/* ── Notes ──────────────────────────────────────────────────── */}
              <TabsContent value="notes" className="mt-4 flex-1 min-h-0">
                <ScrollArea className="h-full">
                  <div className="flex flex-col gap-4 pb-4">
                    {/* Add note */}
                    <form
                      onSubmit={noteForm.handleSubmit(d => addNoteMutation.mutate(d))}
                      className="flex flex-col gap-2"
                    >
                      <Textarea
                        placeholder="Write a note…"
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

                    {req.notes.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        No notes yet.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {req.notes.map((note: any) => (
                          <div key={note.id} className="group rounded-lg border bg-card p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {note.author.firstName} {note.author.lastName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(note.createdAt), {
                                    addSuffix: true,
                                  })}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleteNoteId(note.id)}
                              >
                                Delete
                              </Button>
                            </div>
                            <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">
                              {note.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* ── Activity ───────────────────────────────────────────────── */}
              <TabsContent value="activity" className="mt-4 flex-1 min-h-0">
                <ScrollArea className="h-full">
                  <div className="pb-4">
                    {req.activities.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        No activity yet.
                      </p>
                    ) : (
                      <div className="flex flex-col">
                        {req.activities.map((a: any, i: number) => (
                          <div key={a.id} className="flex gap-3">
                            <div className="flex flex-col items-center pt-1.5">
                              <div className="h-2 w-2 rounded-full bg-border shrink-0 ring-2 ring-background" />
                              {i < req.activities.length - 1 && (
                                <div className="flex-1 w-px bg-border/60 mt-1" />
                              )}
                            </div>
                            <div className="pb-4 flex flex-col gap-0.5 min-w-0">
                              <p className="text-sm text-foreground">{a.summary}</p>
                              <span className="text-xs text-muted-foreground">
                                {a.actor.firstName} {a.actor.lastName} ·{' '}
                                {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* ── Status history ─────────────────────────────────────────── */}
              <TabsContent value="history" className="mt-4 flex-1 min-h-0">
                <ScrollArea className="h-full">
                  <div className="pb-4">
                    {req.statusHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        No history yet.
                      </p>
                    ) : (
                      <div className="flex flex-col">
                        {req.statusHistory.map((h: any, i: number) => (
                          <div key={h.id} className="flex gap-3">
                            <div className="flex flex-col items-center pt-1.5">
                              <div className="h-2 w-2 rounded-full bg-border shrink-0 ring-2 ring-background" />
                              {i < req.statusHistory.length - 1 && (
                                <div className="flex-1 w-px bg-border/60 mt-1" />
                              )}
                            </div>
                            <div className="pb-4 flex flex-col gap-1.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={statusVariant(h.fromStatus)} className="text-xs">
                                  {
                                    // @ts-expect-error err
                                    STATUS_LABELS[h.fromStatus as Status]
                                  }
                                </Badge>
                                <span className="text-xs text-muted-foreground">→</span>
                                <Badge variant={statusVariant(h.toStatus)} className="text-xs">
                                  {
                                    // @ts-expect-error err
                                    STATUS_LABELS[h.toStatus as Status]
                                  }
                                </Badge>
                              </div>
                              {h.reason && (
                                <p className="text-xs text-muted-foreground italic">{h.reason}</p>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {h.changedBy.firstName} {h.changedBy.lastName} ·{' '}
                                {format(new Date(h.changedAt), 'dd MMM yyyy, HH:mm')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* ── Documents ──────────────────────────────────────────────── */}
              <TabsContent value="documents" className="mt-4 flex-1 min-h-0">
                <ScrollArea className="h-full">
                  <div className="pb-4">
                    {req.documents.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        No documents or issues.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {req.documents.map((doc: any) => (
                          <div
                            key={doc.id}
                            className={`rounded-lg border p-4 flex flex-col gap-2 ${
                              doc.isIssue && !doc.issueResolved
                                ? 'border-destructive/30 bg-destructive/5'
                                : 'bg-card'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
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
                                {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            {doc.content && (
                              <p className="text-sm whitespace-pre-wrap text-foreground">
                                {doc.content}
                              </p>
                            )}
                            {doc.fileName && (
                              <a
                                href={`/api/files/${doc.fileKey}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline"
                              >
                                📄 {doc.fileName}
                              </a>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {doc.raisedBy.firstName} {doc.raisedBy.lastName}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────────────────── */}

      <StatusDialog
        open={statusOpen}
        currentStatus={req.status}
        onClose={() => setStatusOpen(false)}
        onSubmit={d => statusMutation.mutate(d)}
        isPending={statusMutation.isPending}
      />

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
