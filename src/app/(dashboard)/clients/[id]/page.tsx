/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useAxios } from '@/hooks/useAxios';
import { useAuth } from '@/context/AuthContext';
import type { ClientDetailResponse, ClientStatus, ClientSpoc } from '../_components/types';
import {
  addSpocSchema,
  addNoteSchema,
  type AddSpocInput,
  type AddNoteInput,
} from '../_components/validators';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function statusVariant(s: ClientStatus): 'default' | 'secondary' | 'outline' {
  switch (s) {
    case 'ACTIVE':
      return 'default';
    case 'PENDING':
      return 'secondary';
    case 'INACTIVE':
      return 'outline';
  }
}

function humanize(str: string) {
  return str
    .split('_')
    .map(w => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function MetaRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0 w-24">{label}</span>
      <span className="text-xs text-foreground text-right">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add SPOC dialog
// ─────────────────────────────────────────────────────────────────────────────

function AddSpocDialog({
  open,
  onClose,
  clientId,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  clientId: string;
  onAdded: () => void;
}) {
  const axios = useAxios();
  const form = useForm<AddSpocInput>({
    // @ts-expect-error err
    resolver: zodResolver(addSpocSchema),
    defaultValues: { userId: '', serviceLineId: '', businessUnitId: '', isPrimary: false },
  });

  const { data: usersRes } = useQuery<{
    data: { id: string; firstName: string; lastName: string; employeeId?: string }[];
  }>({
    queryKey: ['users-dropdown'],
    queryFn: async () => (await axios.get('/users?limit=200&isActive=true')).data,
    staleTime: 60_000,
    enabled: open,
  });

  const { data: slRes } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['service-lines-dropdown'],
    queryFn: async () => (await axios.get('/service-lines?limit=100')).data,
    staleTime: 60_000,
    enabled: open,
  });

  const { data: busRes } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['bus-dropdown'],
    queryFn: async () => (await axios.get('/business-units?limit=100')).data,
    staleTime: 60_000,
    enabled: open,
  });

  const users = usersRes?.data ?? [];
  const serviceLines = slRes?.data ?? [];
  const businessUnits = busRes?.data ?? [];

  const mutation = useMutation({
    mutationFn: async (data: AddSpocInput) =>
      (await axios.post(`/clients/${clientId}/spocs`, data)).data,
    onSuccess: () => {
      toast.success('SPOC added');
      form.reset();
      onAdded();
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to add SPOC'),
  });

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add SPOC</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(d => mutation.mutate(d as any))}
            className="flex flex-col gap-4"
          >
            <FormField
              // @ts-expect-error err
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.firstName} {u.lastName}
                          {u.employeeId ? ` · ${u.employeeId}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              // @ts-expect-error err
              control={form.control}
              name="serviceLineId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service line</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service line" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {serviceLines.map(sl => (
                        <SelectItem key={sl.id} value={sl.id}>
                          {sl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              // @ts-expect-error err
              control={form.control}
              name="businessUnitId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business unit</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select BU" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {businessUnits?.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              // @ts-expect-error err
              control={form.control}
              name="isPrimary"
              render={({ field }) => (
                <FormItem>
                  <button
                    type="button"
                    onClick={() => field.onChange(!field.value)}
                    className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                      field.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border text-muted-foreground'
                    }`}
                  >
                    {field.value ? '★ Primary SPOC' : 'Set as primary'}
                  </button>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Adding…' : 'Add SPOC'}
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

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const axios = useAxios();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [addSpocOpen, setAddSpocOpen] = useState(false);
  const [removeSpocId, setRemoveSpocId] = useState<string | null>(null);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  const noteForm = useForm<AddNoteInput>({
    resolver: zodResolver(addNoteSchema),
    defaultValues: { content: '' },
  });

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery<ClientDetailResponse>({
    queryKey: ['client', id],
    queryFn: async () => (await axios.get(`/clients/${id}`)).data,
    enabled: !!id,
  });

  const client = data?.data;
  const permissions = data?.permissions;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['client', id] });

  // ── Status mutation ────────────────────────────────────────────────────────

  const statusMutation = useMutation({
    mutationFn: async (status: string) =>
      (await axios.patch(`/clients/${id}/status`, { status })).data,
    onSuccess: (_, status) => {
      toast.success(`Client ${humanize(status).toLowerCase()}`);
      invalidate();
    },
    onError: () => toast.error('Failed to update status'),
  });

  // ── SPOC mutations ─────────────────────────────────────────────────────────

  const removeSpocMutation = useMutation({
    mutationFn: async (spocId: string) =>
      (await axios.delete(`/clients/${id}/spocs/${spocId}`)).data,
    onSuccess: () => {
      toast.success('SPOC removed');
      setRemoveSpocId(null);
      invalidate();
    },
    onError: () => toast.error('Failed to remove SPOC'),
  });

  // ── Note mutations ─────────────────────────────────────────────────────────

  const addNoteMutation = useMutation({
    mutationFn: async (data: AddNoteInput) => (await axios.post(`/clients/${id}/notes`, data)).data,
    onSuccess: () => {
      toast.success('Note added');
      noteForm.reset();
      invalidate();
    },
    onError: () => toast.error('Failed to add note'),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) =>
      (await axios.delete(`/clients/${id}/notes/${noteId}`)).data,
    onSuccess: () => {
      toast.success('Note deleted');
      setDeleteNoteId(null);
      invalidate();
    },
    onError: () => toast.error('Failed to delete note'),
  });

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col gap-4">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-4 gap-3 mt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
        <Skeleton className="h-96 mt-4" />
      </div>
    );
  }

  if (!client) {
    return <div className="p-6 text-sm text-muted-foreground">Client not found.</div>;
  }

  const activeSpocs = client.spocs.filter(s => s.isActive);

  return (
    <div className="flex flex-col h-full">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b bg-background">
        {/* Breadcrumb */}
        <div className="px-6 pt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <button
            onClick={() => router.push('/clients')}
            className="hover:text-foreground transition-colors"
          >
            Clients
          </button>
          <span>/</span>
          <span>{client.name}</span>
        </div>

        {/* Title + actions */}
        <div className="px-6 pt-2 pb-3 flex items-start justify-between gap-6">
          <div className="flex flex-col gap-1.5 min-w-0">
            <h1 className="text-xl font-semibold">{client.name}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={statusVariant(client.status)} className="text-xs">
                {humanize(client.status)}
              </Badge>
              {client.industry && (
                <span className="text-sm text-muted-foreground">{client.industry}</span>
              )}
              {client.businessUnit && (
                <span className="text-sm text-muted-foreground">· {client.businessUnit.name}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-0.5">
            {permissions?.canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Change status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {client.status !== 'ACTIVE' && (
                    <DropdownMenuItem onClick={() => statusMutation.mutate('ACTIVE')}>
                      Mark as Active
                    </DropdownMenuItem>
                  )}
                  {client.status !== 'PENDING' && (
                    <DropdownMenuItem onClick={() => statusMutation.mutate('PENDING')}>
                      Mark as Pending
                    </DropdownMenuItem>
                  )}
                  {client.status !== 'INACTIVE' && (
                    <DropdownMenuItem onClick={() => statusMutation.mutate('INACTIVE')}>
                      Mark as Inactive
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {permissions?.canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/clients/${id}/edit`)}
              >
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Stat chips */}
        <div className="px-6 pb-4 flex items-center gap-3 flex-wrap">
          {[
            { label: 'Requirements', value: client._count.requirements },
            { label: 'SPOCs', value: activeSpocs.length },
            ...(client.requirements.filter(r => r.status === 'ACTIVE').length > 0
              ? [
                  {
                    label: 'Active reqs',
                    value: client.requirements.filter(r => r.status === 'ACTIVE').length,
                  },
                ]
              : []),
          ].map(stat => (
            <div
              key={stat.label}
              className="flex flex-col items-center px-4 py-2 rounded-md border bg-muted/30"
            >
              <span className="text-lg font-bold tabular-nums">{stat.value}</span>
              <span className="text-xs text-muted-foreground mt-0.5">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left sidebar */}
        <ScrollArea className="w-64 shrink-0 border-r">
          <div className="p-4 flex flex-col gap-5">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                Details
              </span>
              <MetaRow label="VMS name" value={client.vmsName} />
              <MetaRow
                label="Website"
                value={
                  client.website ? (
                    <a
                      href={client.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {client.website}
                    </a>
                  ) : undefined
                }
              />
              <MetaRow label="Country" value={client.country} />
              <MetaRow label="State" value={client.state} />
              <MetaRow label="City" value={client.city} />
              <MetaRow label="Address" value={client.address} />
            </div>

            {client.parentClient && (
              <>
                <Separator />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                    Parent
                  </span>
                  <button
                    onClick={() => router.push(`/clients/${client.parentClient!.id}`)}
                    className="text-xs text-primary hover:underline text-left"
                  >
                    {client.parentClient.name}
                  </button>
                </div>
              </>
            )}

            {client.childClients.length > 0 && (
              <>
                <Separator />
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Child clients ({client.childClients.length})
                  </span>
                  {client.childClients.map(c => (
                    <button
                      key={c.id}
                      onClick={() => router.push(`/clients/${c.id}`)}
                      className="text-xs text-primary hover:underline text-left"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </>
            )}

            <Separator />

            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                Record
              </span>
              <MetaRow
                label="Created by"
                value={`${client.createdBy.firstName} ${client.createdBy.lastName}`}
              />
              <MetaRow label="Created" value={format(new Date(client.createdAt), 'dd MMM yyyy')} />
              {client.approvedBy && (
                <MetaRow
                  label="Approved by"
                  value={`${client.approvedBy.firstName} ${client.approvedBy.lastName}`}
                />
              )}
              {client.approvedAt && (
                <MetaRow
                  label="Approved"
                  value={format(new Date(client.approvedAt), 'dd MMM yyyy')}
                />
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Main content */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 px-6 pt-4 pb-6">
          <Tabs defaultValue="spocs" className="flex flex-col flex-1 min-h-0">
            <TabsList className="shrink-0 w-fit">
              <TabsTrigger value="spocs">
                SPOCs
                {activeSpocs.length > 0 && (
                  <span className="ml-1.5 text-xs opacity-60">{activeSpocs.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="requirements">
                Requirements
                {client.requirements.length > 0 && (
                  <span className="ml-1.5 text-xs opacity-60">{client.requirements.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="notes">
                Notes
                {client.notes.length > 0 && (
                  <span className="ml-1.5 text-xs opacity-60">{client.notes.length}</span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ── SPOCs ─────────────────────────────────────────────────────── */}
            <TabsContent value="spocs" className="mt-4 flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="flex flex-col gap-4 pb-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Single points of contact managing this client.
                    </p>
                    {permissions?.canEdit && (
                      <Button size="sm" onClick={() => setAddSpocOpen(true)}>
                        + Add SPOC
                      </Button>
                    )}
                  </div>

                  {activeSpocs.length === 0 ? (
                    <div className="text-center py-10 text-sm text-muted-foreground">
                      No SPOCs assigned yet.
                      {permissions?.canEdit && (
                        <button
                          onClick={() => setAddSpocOpen(true)}
                          className="ml-1 text-primary hover:underline"
                        >
                          Add one
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {activeSpocs.map(s => (
                        <div
                          key={s.id}
                          className="rounded-lg border bg-card p-4 flex items-start justify-between gap-3"
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {s.user.firstName} {s.user.lastName}
                              </span>
                              {s.isPrimary && (
                                <Badge variant="outline" className="text-xs">
                                  Primary
                                </Badge>
                              )}
                            </div>
                            {s.user.employeeId && (
                              <span className="text-xs text-muted-foreground font-mono">
                                {s.user.employeeId}
                              </span>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{s.serviceLine.name}</span>
                              {s.businessUnit && (
                                <>
                                  <span>·</span>
                                  <span>{s.businessUnit.name}</span>
                                </>
                              )}
                            </div>
                            {s.assignedBy && (
                              <span className="text-xs text-muted-foreground">
                                Assigned{' '}
                                {formatDistanceToNow(new Date(s.assignedAt), { addSuffix: true })}{' '}
                                by {s.assignedBy.firstName} {s.assignedBy.lastName}
                              </span>
                            )}
                            {s.notes && (
                              <span className="text-xs text-muted-foreground italic">
                                {s.notes}
                              </span>
                            )}
                          </div>
                          {permissions?.canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                              onClick={() => setRemoveSpocId(s.id)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Past SPOCs */}
                  {client.spocs.filter(s => !s.isActive).length > 0 && (
                    <>
                      <Separator />
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Past SPOCs
                      </p>
                      <div className="flex flex-col gap-2">
                        {client.spocs
                          .filter(s => !s.isActive)
                          .map(s => (
                            <div
                              key={s.id}
                              className="rounded-lg border bg-muted/30 p-3 flex flex-col gap-0.5 opacity-60"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm">
                                  {s.user.firstName} {s.user.lastName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {s.serviceLine.name}
                                </span>
                              </div>
                              {s.removedAt && (
                                <span className="text-xs text-muted-foreground">
                                  Removed {format(new Date(s.removedAt), 'dd MMM yyyy')}
                                </span>
                              )}
                            </div>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── Requirements ──────────────────────────────────────────────── */}
            <TabsContent value="requirements" className="mt-4 flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="flex flex-col gap-3 pb-4">
                  {client.requirements.length === 0 ? (
                    <div className="text-center py-10 text-sm text-muted-foreground">
                      No requirements yet.
                    </div>
                  ) : (
                    client.requirements.map(r => (
                      <div
                        key={r.id}
                        className="rounded-lg border bg-card p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => router.push(`/requirements/${r.id}`)}
                      >
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">
                              {r.reqCode}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-xs ${r.priority === 'HIGH' ? 'border-destructive/40 text-destructive' : ''}`}
                            >
                              {humanize(r.priority)}
                            </Badge>
                          </div>
                          <span className="text-sm font-medium line-clamp-1">{r.title}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {r.filledOpenings}/{r.totalOpenings} filled
                          </span>
                          <Badge
                            variant={
                              r.status === 'ACTIVE'
                                ? 'default'
                                : r.status === 'CLOSED' || r.status === 'CANCELLED'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                            className="text-xs"
                          >
                            {humanize(r.status)}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── Notes ─────────────────────────────────────────────────────── */}
            <TabsContent value="notes" className="mt-4 flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="flex flex-col gap-4 pb-4">
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

                  {client.notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No notes yet.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {client.notes.map(note => (
                        <div key={note.id} className="group rounded-lg border bg-card p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {note.author.firstName} {note.author.lastName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            {(user?.id === note.author.id || user?.isSuperAdmin) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleteNoteId(note.id)}
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            {note.content}
                          </p>
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

      {/* ── Dialogs ───────────────────────────────────────────────────────────── */}

      <AddSpocDialog
        open={addSpocOpen}
        onClose={() => setAddSpocOpen(false)}
        clientId={id}
        onAdded={invalidate}
      />

      <AlertDialog open={!!removeSpocId} onOpenChange={o => !o && setRemoveSpocId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove SPOC?</AlertDialogTitle>
            <AlertDialogDescription>
              This person will no longer be a SPOC for this client.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removeSpocMutation.isPending}
              onClick={() => removeSpocId && removeSpocMutation.mutate(removeSpocId)}
            >
              {removeSpocMutation.isPending ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
