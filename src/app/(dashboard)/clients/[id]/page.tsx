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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
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
// import { AuthContext } from '@/context/AuthContext';
import type {
  ClientDetailResponse,
  ClientDetail,
  ClientStatus,
  ClientHandler,
  ClientContact,
  ClientNote,
} from '../_components/types';
import {
  addHandlerSchema,
  addContactSchema,
  updateContactSchema,
  addNoteSchema,
  type AddHandlerInput,
  type AddContactInput,
  type UpdateContactInput,
  type AddNoteInput,
} from '../_components/validators';
import { useAuth } from '@/context/AuthContext';

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
// Add handler dialog
// ─────────────────────────────────────────────────────────────────────────────

function AddHandlerDialog({
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
  const form = useForm<AddHandlerInput>({
    // @ts-expect-error err
    resolver: zodResolver(addHandlerSchema),
    defaultValues: { userId: '', role: 'PRIMARY' },
  });

  // Fetch users for picker
  const { data: usersRes } = useQuery<{
    data: { id: string; firstName: string; lastName: string; employeeId?: string }[];
  }>({
    queryKey: ['users-dropdown'],
    queryFn: async () => (await axios.get('/users?limit=200&isActive=true')).data,
    staleTime: 60_000,
    enabled: open,
  });
  const users = usersRes?.data ?? [];

  const mutation = useMutation({
    mutationFn: async (data: AddHandlerInput) =>
      (await axios.post(`/clients/${clientId}/handlers`, data)).data,
    onSuccess: () => {
      toast.success('Handler added');
      form.reset();
      onAdded();
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to add handler'),
  });

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add handler</DialogTitle>
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
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PRIMARY">Primary</SelectItem>
                      <SelectItem value="SECONDARY">Secondary</SelectItem>
                      <SelectItem value="BACKUP">Backup</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
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
                {mutation.isPending ? 'Adding…' : 'Add handler'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add / Edit contact dialog
// ─────────────────────────────────────────────────────────────────────────────

function ContactDialog({
  open,
  onClose,
  clientId,
  onSaved,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  clientId: string;
  onSaved: () => void;
  existing?: ClientContact;
}) {
  const axios = useAxios();
  const isEdit = !!existing;

  const form = useForm<AddContactInput>({
    // @ts-expect-error err
    resolver: zodResolver(isEdit ? updateContactSchema : addContactSchema),
    defaultValues: {
      firstName: existing?.firstName ?? '',
      lastName: existing?.lastName ?? '',
      designation: existing?.designation ?? '',
      email: existing?.email ?? '',
      phone: existing?.phone ?? '',
      linkedinUrl: existing?.linkedinUrl ?? '',
      isPrimary: existing?.isPrimary ?? false,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: AddContactInput) => {
      const payload = { ...data, linkedinUrl: data.linkedinUrl || null };
      if (isEdit)
        return (await axios.put(`/clients/${clientId}/contacts/${existing!.id}`, payload)).data;
      return (await axios.post(`/clients/${clientId}/contacts`, payload)).data;
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Contact updated' : 'Contact added');
      form.reset();
      onSaved();
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to save contact'),
  });

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit contact' : 'Add contact'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(d => mutation.mutate(d as any))}
            className="flex flex-col gap-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <FormField
                // @ts-expect-error err
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      First name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...(field as any)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                // @ts-expect-error err
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last name</FormLabel>
                    <FormControl>
                      <Input {...(field as any)} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              // @ts-expect-error err
              control={form.control}
              name="designation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Designation</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. HR Manager"
                      {...(field as any)}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              // @ts-expect-error err
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Email <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="email" {...(field as any)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                // @ts-expect-error err
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...(field as any)} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                // @ts-expect-error err
                control={form.control}
                name="linkedinUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LinkedIn</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://linkedin.com/in/…"
                        {...(field as any)}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              // @ts-expect-error err
              control={form.control}
              name="isPrimary"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => field.onChange(!field.value)}
                      className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                        field.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border text-muted-foreground'
                      }`}
                    >
                      {field.value ? '★ Primary contact' : 'Set as primary'}
                    </button>
                  </div>
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
                {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add contact'}
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
  // const { user } = useContext();
  const { user } = useAuth();

  const [addHandlerOpen, setAddHandlerOpen] = useState(false);
  const [contactDialog, setContactDialog] = useState<{ open: boolean; existing?: ClientContact }>({
    open: false,
  });
  const [removeHandlerId, setRemoveHandlerId] = useState<string | null>(null);
  const [removeContactId, setRemoveContactId] = useState<string | null>(null);
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

  // ── Handler mutations ──────────────────────────────────────────────────────

  const removeHandlerMutation = useMutation({
    mutationFn: async (handlerId: string) =>
      (await axios.delete(`/clients/${id}/handlers/${handlerId}`)).data,
    onSuccess: () => {
      toast.success('Handler removed');
      setRemoveHandlerId(null);
      invalidate();
    },
    onError: () => toast.error('Failed to remove handler'),
  });

  // ── Contact mutations ──────────────────────────────────────────────────────

  const removeContactMutation = useMutation({
    mutationFn: async (contactId: string) =>
      (await axios.delete(`/clients/${id}/contacts/${contactId}`)).data,
    onSuccess: () => {
      toast.success('Contact removed');
      setRemoveContactId(null);
      invalidate();
    },
    onError: () => toast.error('Failed to remove contact'),
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

  const activeHandlers = client.handlers.filter((h: any) => h.status === 'ACTIVE');

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
              {client.category && (
                <Badge variant="outline" className="text-xs">
                  {humanize(client.category)}
                </Badge>
              )}
              {client.industry && (
                <span className="text-sm text-muted-foreground">{client.industry}</span>
              )}
              {client.businessUnit && (
                <span className="text-sm text-muted-foreground">· {client.businessUnit.name}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-0.5">
            {/* Status actions */}
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
            { label: 'Contacts', value: client._count.contacts },
            { label: 'Handlers', value: activeHandlers.length },
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

            {client.teamAssignments.length > 0 && (
              <>
                <Separator />
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Teams
                  </span>
                  {client.teamAssignments.map(ta => (
                    <div key={ta.id} className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium">{ta.team.name}</span>
                      {ta.team.category && (
                        <span className="text-xs text-muted-foreground">
                          {humanize(ta.team.category)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Main content */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 px-6 pt-4 pb-6">
          <Tabs defaultValue="handlers" className="flex flex-col flex-1 min-h-0">
            <TabsList className="shrink-0 w-fit">
              <TabsTrigger value="handlers">
                Handlers
                {activeHandlers.length > 0 && (
                  <span className="ml-1.5 text-xs opacity-60">{activeHandlers.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="contacts">
                Contacts
                {client.contacts.length > 0 && (
                  <span className="ml-1.5 text-xs opacity-60">{client.contacts.length}</span>
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

            {/* ── Handlers ──────────────────────────────────────────────────── */}
            <TabsContent value="handlers" className="mt-4 flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="flex flex-col gap-4 pb-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      People responsible for managing this client relationship.
                    </p>
                    {permissions?.canEdit && (
                      <Button size="sm" onClick={() => setAddHandlerOpen(true)}>
                        + Add handler
                      </Button>
                    )}
                  </div>

                  {activeHandlers.length === 0 ? (
                    <div className="text-center py-10 text-sm text-muted-foreground">
                      No handlers assigned yet.
                      {permissions?.canEdit && (
                        <button
                          onClick={() => setAddHandlerOpen(true)}
                          className="ml-1 text-primary hover:underline"
                        >
                          Add one
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {activeHandlers.map((h: any) => (
                        <div
                          key={h.id}
                          className="rounded-lg border bg-card p-4 flex items-start justify-between gap-3"
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {h.user.firstName} {h.user.lastName}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {humanize(h.role)}
                              </Badge>
                            </div>
                            {h.user.employeeId && (
                              <span className="text-xs text-muted-foreground font-mono">
                                {h.user.employeeId}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              Added{' '}
                              {formatDistanceToNow(new Date(h.assignedAt), { addSuffix: true })} by{' '}
                              {h.assignedBy.firstName} {h.assignedBy.lastName}
                            </span>
                          </div>
                          {permissions?.canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                              onClick={() => setRemoveHandlerId(h.id)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Handler history */}
                  {client.handlers.filter((h: any) => h.status !== 'ACTIVE').length > 0 && (
                    <>
                      <Separator />
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Past handlers
                      </p>
                      <div className="flex flex-col gap-2">
                        {client.handlers
                          .filter((h: any) => h.status !== 'ACTIVE')
                          .map((h: any) => (
                            <div
                              key={h.id}
                              className="rounded-lg border bg-muted/30 p-3 flex flex-col gap-0.5 opacity-60"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm">
                                  {h.user.firstName} {h.user.lastName}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {humanize(h.role)}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {humanize(h.status)}
                                </Badge>
                              </div>
                              {h.removedAt && (
                                <span className="text-xs text-muted-foreground">
                                  Removed {format(new Date(h.removedAt), 'dd MMM yyyy')}
                                  {h.removedReason ? `: ${h.removedReason}` : ''}
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

            {/* ── Contacts ──────────────────────────────────────────────────── */}
            <TabsContent value="contacts" className="mt-4 flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="flex flex-col gap-4 pb-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Point of contacts at {client.name}.
                    </p>
                    {permissions?.canEdit && (
                      <Button size="sm" onClick={() => setContactDialog({ open: true })}>
                        + Add contact
                      </Button>
                    )}
                  </div>

                  {client.contacts.length === 0 ? (
                    <div className="text-center py-10 text-sm text-muted-foreground">
                      No contacts yet.
                      {permissions?.canEdit && (
                        <button
                          onClick={() => setContactDialog({ open: true })}
                          className="ml-1 text-primary hover:underline"
                        >
                          Add one
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {client.contacts.map(c => (
                        <div
                          key={c.id}
                          className={`rounded-lg border bg-card p-4 flex flex-col gap-2 ${c.isPrimary ? 'border-primary/30' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">
                                {c.firstName} {c.lastName}
                              </span>
                              {c.isPrimary && <Badge className="text-xs">Primary</Badge>}
                            </div>
                            {permissions?.canEdit && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground shrink-0"
                                  >
                                    ···
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => setContactDialog({ open: true, existing: c })}
                                  >
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setRemoveContactId(c.id)}
                                  >
                                    Remove
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                          {c.designation && (
                            <span className="text-xs text-muted-foreground">{c.designation}</span>
                          )}
                          <div className="flex flex-col gap-0.5 text-xs">
                            <a href={`mailto:${c.email}`} className="text-primary hover:underline">
                              {c.email}
                            </a>
                            {c.phone && <span className="text-muted-foreground">{c.phone}</span>}
                            {c.linkedinUrl && (
                              <a
                                href={c.linkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline truncate"
                              >
                                LinkedIn
                              </a>
                            )}
                          </div>
                          {c.owner && (
                            <span className="text-xs text-muted-foreground">
                              Owner: {c.owner.firstName} {c.owner.lastName}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
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

      <AddHandlerDialog
        open={addHandlerOpen}
        onClose={() => setAddHandlerOpen(false)}
        clientId={id}
        onAdded={invalidate}
      />

      <ContactDialog
        open={contactDialog.open}
        onClose={() => setContactDialog({ open: false })}
        clientId={id}
        existing={contactDialog.existing}
        onSaved={invalidate}
      />

      <AlertDialog open={!!removeHandlerId} onOpenChange={o => !o && setRemoveHandlerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove handler?</AlertDialogTitle>
            <AlertDialogDescription>
              This person will no longer manage this client.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removeHandlerMutation.isPending}
              onClick={() => removeHandlerId && removeHandlerMutation.mutate(removeHandlerId)}
            >
              {removeHandlerMutation.isPending ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!removeContactId} onOpenChange={o => !o && setRemoveContactId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove contact?</AlertDialogTitle>
            <AlertDialogDescription>Contact will be marked as removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removeContactMutation.isPending}
              onClick={() => removeContactId && removeContactMutation.mutate(removeContactId)}
            >
              {removeContactMutation.isPending ? 'Removing…' : 'Remove'}
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
