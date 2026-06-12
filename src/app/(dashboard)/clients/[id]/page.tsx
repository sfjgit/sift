// File: page.tsx
// Path: app/clients/[id]/page.tsx

'use client';

// ─── React & Next ────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// ─── Data fetching ────────────────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

// ─── Zod ─────────────────────────────────────────────────────────────────────
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';

// ─── ShadCN / UI ─────────────────────────────────────────────────────────────
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ─── Lucide icons ─────────────────────────────────────────────────────────────
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  Edit2,
  ExternalLink,
  Globe,
  LayoutList,
  Loader2,
  MapPin,
  MoreVertical,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
  UserCircle2,
  Users,
  X,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Star,
  Briefcase,
  Tag,
} from 'lucide-react';

// ─── Local hooks ──────────────────────────────────────────────────────────────
import { useAxios } from '@/hooks/useAxios';
import { useAuth } from '@/context/AuthContext';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type ClientStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE';

interface SpocDMUser {
  id: string;
  firstName: string;
  lastName: string;
  displayName?: string | null;
  email: string;
  role: { id: string; name: string };
}

interface SpocDM {
  id: string;
  spocId: string;
  createdAt: string;
  dm: SpocDMUser;
}

interface ClientSpoc {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  designation?: string | null;
  department?: string | null;
  isPrimary: boolean;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  handler: { id: string; firstName: string; lastName: string };
  addedBy: { id: string; firstName: string; lastName: string };
  serviceLine: { id: string; name: string };
  businessUnit: { id: string; name: string };
  clientSpocDms?: SpocDM[];
}

interface ClientRequirement {
  id: string;
  reqCode: string;
  title: string;
  status: string;
  priority: string;
  totalOpenings: number;
  createdAt: string;
}

interface ClientNote {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; firstName: string; lastName: string };
}

interface ClientDetail {
  id: string;
  name: string;
  vmsName?: string | null;
  industry?: string | null;
  website?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  address?: string | null;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string | null;
  businessUnit?: { id: string; name: string } | null;
  parentClient?: { id: string; name: string } | null;
  childClients: { id: string; name: string; status: ClientStatus }[];
  createdBy: { id: string; firstName: string; lastName: string };
  approvedBy?: { id: string; firstName: string; lastName: string } | null;
  spocs: ClientSpoc[];
  notes: ClientNote[];
  requirements: ClientRequirement[];
  _count: { requirements: number };
}

interface ClientDetailPermissions {
  canEdit: boolean;
  canDelete: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const addSpocSchema = z.object({
  firstName: z.string().min(1, 'Required').max(100).trim(),
  lastName: z.string().min(1, 'Required').max(100).trim(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  designation: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  handlerId: z.string().min(1, 'Required'),
  serviceLineId: z.string().min(1, 'Required'),
  businessUnitId: z.string().min(1, 'Required'),
  isPrimary: z.boolean().default(false),
  notes: z.string().max(500).optional(),
});

const editSpocSchema = z.object({
  firstName: z.string().min(1, 'Required').max(100).trim(),
  lastName: z.string().min(1, 'Required').max(100).trim(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  designation: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  handlerId: z.string().min(1, 'Required'),
  isPrimary: z.boolean(),
  notes: z.string().max(500).optional(),
});

const addNoteSchema = z.object({
  content: z.string().min(1, 'Required').max(2000).trim(),
});

const addSpocDMSchema = z.object({
  dmId: z.string().min(1, 'Select a DM'),
});

type AddSpocValues = z.infer<typeof addSpocSchema>;
type EditSpocValues = z.infer<typeof editSpocSchema>;
type AddNoteValues = z.infer<typeof addNoteSchema>;
type AddSpocDMValues = z.infer<typeof addSpocDMSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// SMALL HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function humanize(str: string) {
  return str
    .split('_')
    .map(w => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

function statusConfig(s: ClientStatus) {
  if (s === 'ACTIVE')
    return {
      label: 'Active',
      color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
      dot: 'bg-emerald-500',
    };
  if (s === 'PENDING')
    return {
      label: 'Pending',
      color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
      dot: 'bg-amber-500',
    };
  return {
    label: 'Inactive',
    color: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
    dot: 'bg-zinc-400',
  };
}

function reqStatusConfig(s: string) {
  const m: Record<string, string> = {
    ACTIVE: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20',
    DRAFT: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
    CLOSED: 'bg-zinc-500/10 text-zinc-500 border-zinc-400/20',
    CANCELLED: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20',
    ON_HOLD: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
    PENDING_APPROVAL: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20',
  };
  return m[s] ?? 'bg-zinc-500/10 text-zinc-500 border-zinc-400/20';
}

function priorityDot(p: string) {
  if (p === 'HIGH') return 'text-red-500';
  if (p === 'MEDIUM') return 'text-amber-500';
  return 'text-zinc-400';
}

// ─── Tiny form helpers ────────────────────────────────────────────────────────
function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-xs font-medium text-foreground/70">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[11px] text-red-500 mt-0.5">{message}</p>;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({
  first,
  last,
  size = 'md',
}: {
  first: string;
  last: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sz =
    size === 'sm' ? 'w-6 h-6 text-[10px]' : size === 'lg' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';
  return (
    <div
      className={`${sz} rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center shrink-0 ring-1 ring-primary/20`}
    >
      {initials(first, last)}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DM TAG PILL — inline chip on a SPOC card
// ═══════════════════════════════════════════════════════════════════════════════

function DmChip({
  dm,
  onRemove,
  canEdit,
}: {
  dm: SpocDM;
  onRemove: (id: string) => void;
  canEdit: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-[11px] font-medium text-violet-700 dark:text-violet-400 cursor-default select-none"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <span className="w-4 h-4 rounded-full bg-violet-500/20 flex items-center justify-center text-[9px] font-bold shrink-0">
              {initials(dm.dm.firstName, dm.dm.lastName)}
            </span>
            <span className="max-w-[90px] truncate">
              {dm.dm.firstName} {dm.dm.lastName}
            </span>
            {canEdit && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onRemove(dm.id);
                }}
                className={`ml-0.5 rounded-full transition-all shrink-0 flex items-center justify-center w-3.5 h-3.5 ${hovered ? 'opacity-100 hover:bg-red-500/20 hover:text-red-500' : 'opacity-0'}`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-medium">
            {dm.dm.firstName} {dm.dm.lastName}
          </p>
          <p className="text-muted-foreground">
            {dm.dm.role.name} · {dm.dm.email}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADD DM POPOVER — inline picker to tag a DM to a SPOC
// ═══════════════════════════════════════════════════════════════════════════════

function AddDmInline({
  clientId,
  spocId,
  existingDmIds,
  onAdded,
}: {
  clientId: string;
  spocId: string;
  existingDmIds: string[];
  onAdded: () => void;
}) {
  const axios = useAxios();
  const [open, setOpen] = useState(false);
  const [selectedDmId, setSelectedDmId] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const { data: usersRes } = useQuery<{
    data: { id: string; firstName: string; lastName: string; role: { name: string } }[];
  }>({
    queryKey: ['users-dm-dropdown'],
    queryFn: async () => (await axios.get('/users?limit=200&isActive=true')).data,
    staleTime: 60_000,
    enabled: open,
  });

  const available = (usersRes?.data ?? []).filter(u => !existingDmIds.includes(u.id));

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const mutation = useMutation({
    mutationFn: async (dmId: string) =>
      (await axios.post(`/clients/${clientId}/spocs/${spocId}/dms`, { dmId })).data,
    onSuccess: () => {
      toast.success('DM tagged');
      setSelectedDmId('');
      setOpen(false);
      onAdded();
    },
    onError: () => toast.error('Failed to tag DM'),
  });

  return (
    // overflow-visible so the popover isn't clipped by parent card
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-dashed border-border/60 text-[11px] text-muted-foreground hover:border-violet-400/60 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-500/5 transition-colors"
      >
        <UserPlus className="w-2.5 h-2.5" />
        Tag DM
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-2 w-64 z-[200] rounded-xl border border-border bg-popover shadow-xl"
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">Tag delivery manager</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <Select value={selectedDmId} onValueChange={setSelectedDmId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue
                  placeholder={
                    !usersRes
                      ? 'Loading…'
                      : available.length === 0
                        ? 'All DMs already tagged'
                        : 'Select a DM…'
                  }
                />
              </SelectTrigger>
              <SelectContent className="z-[300]">
                {available.length === 0 ? (
                  <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                    {usersRes ? 'All DMs already tagged' : 'Loading…'}
                  </div>
                ) : (
                  available.map(u => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      <span className="font-medium">
                        {u.firstName} {u.lastName}
                      </span>
                      <span className="text-muted-foreground ml-1">· {u.role.name}</span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                className="h-7 text-xs flex-1"
                disabled={!selectedDmId || mutation.isPending}
                onClick={() => mutation.mutate(selectedDmId)}
              >
                {mutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Tag'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => {
                  setOpen(false);
                  setSelectedDmId('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADD SPOC DIALOG
// ═══════════════════════════════════════════════════════════════════════════════

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
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<AddSpocValues>({
    // @ts-expect-error zod compat
    resolver: zodResolver(addSpocSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      designation: '',
      department: '',
      handlerId: '',
      serviceLineId: '',
      businessUnitId: '',
      isPrimary: false,
      notes: '',
    },
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
    mutationFn: async (data: AddSpocValues) =>
      (await axios.post(`/clients/${clientId}/spocs`, data)).data,
    onSuccess: () => {
      toast.success('SPOC added');
      reset();
      onAdded();
      onClose();
    },
    // @ts-expect-error err type
    onError: err => toast.error(err?.response?.data?.message ?? 'Failed to add SPOC'),
  });

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Add SPOC</DialogTitle>
        </DialogHeader>
        {/* @ts-expect-error zod compat */}
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="flex flex-col gap-4 mt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label required>First name</Label>
              <Input className="h-8 text-sm" placeholder="John" {...register('firstName')} />
              <FieldError message={errors.firstName?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label required>Last name</Label>
              <Input className="h-8 text-sm" placeholder="Doe" {...register('lastName')} />
              <FieldError message={errors.lastName?.message} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input
                className="h-8 text-sm"
                type="email"
                placeholder="john@client.com"
                {...register('email')}
              />
              <FieldError message={errors.email?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Phone</Label>
              <Input className="h-8 text-sm" placeholder="+91 9999999999" {...register('phone')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Designation</Label>
              <Input
                className="h-8 text-sm"
                placeholder="HR Manager"
                {...register('designation')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Department</Label>
              <Input className="h-8 text-sm" placeholder="HR" {...register('department')} />
            </div>
          </div>
          <Separator />
          <div className="flex flex-col gap-1.5">
            <Label required>Handler</Label>
            <Controller
              control={control}
              name="handlerId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Who handles this SPOC" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id} className="text-sm">
                        {u.firstName} {u.lastName}
                        {u.employeeId ? ` · ${u.employeeId}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.handlerId?.message} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label required>Service line</Label>
              <Controller
                control={control}
                name="serviceLineId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceLines.map(sl => (
                        <SelectItem key={sl.id} value={sl.id} className="text-sm">
                          {sl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.serviceLineId?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label required>Business unit</Label>
              <Controller
                control={control}
                name="businessUnitId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessUnits.map(b => (
                        <SelectItem key={b.id} value={b.id} className="text-sm">
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.businessUnitId?.message} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Notes</Label>
            <Input className="h-8 text-sm" placeholder="Optional notes" {...register('notes')} />
          </div>
          <Controller
            control={control}
            name="isPrimary"
            render={({ field }) => (
              <button
                type="button"
                onClick={() => field.onChange(!field.value)}
                className={`self-start flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${field.value ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400' : 'border-border text-muted-foreground hover:border-primary/40'}`}
              >
                <Star className={`w-3 h-3 ${field.value ? 'fill-amber-500 text-amber-500' : ''}`} />
                {field.value ? 'Primary SPOC' : 'Set as primary'}
              </button>
            )}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Adding…
                </>
              ) : (
                'Add SPOC'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDIT SPOC DIALOG
// ═══════════════════════════════════════════════════════════════════════════════

function EditSpocDialog({
  spoc,
  clientId,
  onClose,
  onUpdated,
}: {
  spoc: ClientSpoc | null;
  clientId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const axios = useAxios();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EditSpocValues>({
    resolver: zodResolver(editSpocSchema),
  });

  useEffect(() => {
    if (spoc) {
      reset({
        firstName: spoc.firstName,
        lastName: spoc.lastName,
        email: spoc.email ?? '',
        phone: spoc.phone ?? '',
        designation: spoc.designation ?? '',
        department: spoc.department ?? '',
        handlerId: spoc.handler.id,
        isPrimary: spoc.isPrimary,
        notes: spoc.notes ?? '',
      });
    }
  }, [spoc, reset]);

  const { data: usersRes } = useQuery<{
    data: { id: string; firstName: string; lastName: string }[];
  }>({
    queryKey: ['users-dropdown'],
    queryFn: async () => (await axios.get('/users?limit=200&isActive=true')).data,
    staleTime: 60_000,
    enabled: !!spoc,
  });
  const users = usersRes?.data ?? [];

  const mutation = useMutation({
    mutationFn: async (data: EditSpocValues) =>
      (await axios.patch(`/clients/${clientId}/spocs/${spoc!.id}`, data)).data,
    onSuccess: () => {
      toast.success('SPOC updated');
      onUpdated();
      onClose();
    },
    // @ts-expect-error err
    onError: err => toast.error(err?.response?.data?.message ?? 'Failed to update'),
  });

  return (
    <Dialog open={!!spoc} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Edit SPOC</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="flex flex-col gap-4 mt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label required>First name</Label>
              <Input className="h-8 text-sm" {...register('firstName')} />
              <FieldError message={errors.firstName?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label required>Last name</Label>
              <Input className="h-8 text-sm" {...register('lastName')} />
              <FieldError message={errors.lastName?.message} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input className="h-8 text-sm" type="email" {...register('email')} />
              <FieldError message={errors.email?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Phone</Label>
              <Input className="h-8 text-sm" {...register('phone')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Designation</Label>
              <Input className="h-8 text-sm" {...register('designation')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Department</Label>
              <Input className="h-8 text-sm" {...register('department')} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label required>Handler</Label>
            <Controller
              control={control}
              name="handlerId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id} className="text-sm">
                        {u.firstName} {u.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.handlerId?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Notes</Label>
            <Input className="h-8 text-sm" {...register('notes')} />
          </div>
          <Controller
            control={control}
            name="isPrimary"
            render={({ field }) => (
              <button
                type="button"
                onClick={() => field.onChange(!field.value)}
                className={`self-start flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${field.value ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400' : 'border-border text-muted-foreground'}`}
              >
                <Star className={`w-3 h-3 ${field.value ? 'fill-amber-500 text-amber-500' : ''}`} />
                {field.value ? 'Primary SPOC' : 'Set as primary'}
              </button>
            )}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPOC CARD
// ═══════════════════════════════════════════════════════════════════════════════

function SpocCard({
  spoc,
  clientId,
  canEdit,
  onEdit,
  onRemove,
  onMutated,
}: {
  spoc: ClientSpoc;
  clientId: string;
  canEdit: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onMutated: () => void;
}) {
  const axios = useAxios();

  const removeDmMutation = useMutation({
    mutationFn: async (spocDmId: string) =>
      (await axios.delete(`/clients/${clientId}/spocs/${spoc.id}/dms/${spocDmId}`)).data,
    onSuccess: () => {
      toast.success('DM untagged');
      onMutated();
    },
    onError: () => toast.error('Failed to untag DM'),
  });

  const dms = spoc.clientSpocDms ?? [];

  return (
    <div className="group rounded-xl border bg-card hover:border-primary/20 transition-all duration-200">
      {/* top strip — primary badge */}
      {spoc.isPrimary && (
        <div className="h-0.5 rounded-t-xl bg-gradient-to-r from-amber-400 via-amber-300 to-transparent" />
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar first={spoc.firstName} last={spoc.lastName} size="lg" />

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-foreground">
                {spoc.firstName} {spoc.lastName}
              </span>
              {spoc.isPrimary && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                  <Star className="w-2.5 h-2.5 fill-amber-500" />
                  Primary
                </span>
              )}
            </div>
            {spoc.designation && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {spoc.designation}
                {spoc.department ? ` · ${spoc.department}` : ''}
              </p>
            )}
            <div className="flex flex-col gap-0.5 mt-1">
              {spoc.email && (
                <a href={`mailto:${spoc.email}`} className="text-xs text-primary hover:underline">
                  {spoc.email}
                </a>
              )}
              {spoc.phone && (
                <a
                  href={`tel:${spoc.phone}`}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {spoc.phone}
                </a>
              )}
            </div>
          </div>

          {/* Actions */}
          {canEdit && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit SPOC</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:text-destructive hover:bg-destructive/10"
                      onClick={onRemove}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Remove SPOC</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>

        {/* Handler / service line row */}
        <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Handled by
            </span>
            <span className="text-xs font-medium text-foreground">
              {spoc.handler.firstName} {spoc.handler.lastName}
            </span>
          </div>
          <span className="text-border/60">·</span>
          <span className="text-xs text-muted-foreground">{spoc.serviceLine.name}</span>
          <span className="text-border/60">·</span>
          <span className="text-xs text-muted-foreground">{spoc.businessUnit.name}</span>
        </div>

        {/* DM tags row */}
        <div className="mt-2.5 flex items-start gap-1.5 flex-wrap overflow-visible">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1 mt-0.5 shrink-0">
            <Tag className="w-2.5 h-2.5" />
            DMs
          </span>
          {dms.map(dm => (
            <DmChip
              key={dm.id}
              dm={dm}
              canEdit={canEdit}
              onRemove={id => removeDmMutation.mutate(id)}
            />
          ))}
          {canEdit && (
            <AddDmInline
              clientId={clientId}
              spocId={spoc.id}
              existingDmIds={dms.map(d => d.dm.id)}
              onAdded={onMutated}
            />
          )}
        </div>

        {spoc.notes && (
          <p className="mt-2.5 text-[11px] text-muted-foreground italic border-l-2 border-border/40 pl-2">
            {spoc.notes}
          </p>
        )}

        <p className="mt-2 text-[10px] text-muted-foreground/60">
          Added {formatDistanceToNow(new Date(spoc.createdAt), { addSuffix: true })} by{' '}
          {spoc.addedBy.firstName} {spoc.addedBy.lastName}
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPOC TAB
// ═══════════════════════════════════════════════════════════════════════════════

function SpocTab({
  clientId,
  spocs,
  canEdit,
  onMutated,
}: {
  clientId: string;
  spocs: ClientSpoc[];
  canEdit: boolean;
  onMutated: () => void;
}) {
  const axios = useAxios();
  const [addOpen, setAddOpen] = useState(false);
  const [editSpoc, setEditSpoc] = useState<ClientSpoc | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const activeSpocs = spocs.filter(s => s.isActive);
  const inactiveSpocs = spocs.filter(s => !s.isActive);

  const removeMutation = useMutation({
    mutationFn: async (spocId: string) =>
      (await axios.delete(`/clients/${clientId}/spocs/${spocId}`)).data,
    onSuccess: () => {
      toast.success('SPOC removed');
      setRemoveId(null);
      onMutated();
    },
    onError: () => toast.error('Failed to remove SPOC'),
  });

  return (
    <>
      <div className="flex flex-col gap-4 pb-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {activeSpocs.length === 0
              ? 'No SPOCs assigned yet.'
              : `${activeSpocs.length} active contact${activeSpocs.length !== 1 ? 's' : ''} for this account`}
          </p>
          {canEdit && (
            <Button size="sm" onClick={() => setAddOpen(true)} className="h-8 gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Add SPOC
            </Button>
          )}
        </div>

        {activeSpocs.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/20 flex flex-col items-center justify-center py-14 gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No SPOCs assigned</p>
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddOpen(true)}
                className="gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add first SPOC
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {activeSpocs.map(s => (
              <SpocCard
                key={s.id}
                spoc={s}
                clientId={clientId}
                canEdit={canEdit}
                onEdit={() => setEditSpoc(s)}
                onRemove={() => setRemoveId(s.id)}
                onMutated={onMutated}
              />
            ))}
          </div>
        )}

        {inactiveSpocs.length > 0 && (
          <details className="mt-2">
            <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none flex items-center gap-1.5">
              <ChevronRight className="w-3 h-3 transition-transform [details[open]_&]:rotate-90" />
              {inactiveSpocs.length} past SPOC{inactiveSpocs.length !== 1 ? 's' : ''}
            </summary>
            <div className="mt-3 flex flex-col gap-2">
              {inactiveSpocs.map(s => (
                <div
                  key={s.id}
                  className="rounded-lg border bg-muted/20 px-3 py-2.5 flex items-center gap-2.5 opacity-60"
                >
                  <Avatar first={s.firstName} last={s.lastName} size="sm" />
                  <div>
                    <p className="text-xs font-medium">
                      {s.firstName} {s.lastName}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {s.serviceLine.name}
                      {s.designation ? ` · ${s.designation}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      <AddSpocDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        clientId={clientId}
        onAdded={onMutated}
      />
      <EditSpocDialog
        spoc={editSpoc}
        clientId={clientId}
        onClose={() => setEditSpoc(null)}
        onUpdated={onMutated}
      />

      <AlertDialog open={!!removeId} onOpenChange={o => !o && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove SPOC?</AlertDialogTitle>
            <AlertDialogDescription>
              This contact will be marked inactive for this client.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removeMutation.isPending}
              onClick={() => removeId && removeMutation.mutate(removeId)}
            >
              {removeMutation.isPending ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REQUIREMENTS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function RequirementsTab({
  clientId,
  requirements,
}: {
  clientId: string;
  requirements: ClientRequirement[];
}) {
  const router = useRouter();

  if (requirements.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 flex flex-col items-center justify-center py-14 gap-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <Briefcase className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No requirements yet</p>
        <Link href={`/requirements/new?clientId=${clientId}`}>
          <Button size="sm" variant="outline" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Create requirement
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 pb-6">
      {requirements.map(r => (
        <div
          key={r.id}
          onClick={() => router.push(`/requirements/${r.id}`)}
          className="group rounded-xl border bg-card p-4 flex items-center gap-4 cursor-pointer hover:border-primary/20 hover:bg-muted/20 transition-all"
        >
          {/* Priority dot */}
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${r.priority === 'HIGH' ? 'bg-red-500' : r.priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-zinc-400'}`}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {r.reqCode}
              </span>
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${priorityDot(r.priority)}`}
              >
                {humanize(r.priority)}
              </span>
            </div>
            <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs tabular-nums text-muted-foreground">
              {r.totalOpenings} opening{r.totalOpenings !== 1 ? 's' : ''}
            </span>
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${reqStatusConfig(r.status)}`}
            >
              {humanize(r.status)}
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTES TAB
// ═══════════════════════════════════════════════════════════════════════════════

function NotesTab({
  clientId,
  notes,
  currentUserId,
  isSuperAdmin,
  onMutated,
}: {
  clientId: string;
  notes: ClientNote[];
  currentUserId?: string;
  isSuperAdmin?: boolean;
  onMutated: () => void;
}) {
  const axios = useAxios();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddNoteValues>({
    resolver: zodResolver(addNoteSchema),
  });

  const addMutation = useMutation({
    mutationFn: async (data: AddNoteValues) =>
      (await axios.post(`/clients/${clientId}/notes`, data)).data,
    onSuccess: () => {
      toast.success('Note added');
      reset();
      onMutated();
    },
    onError: () => toast.error('Failed to add note'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (noteId: string) =>
      (await axios.delete(`/clients/${clientId}/notes/${noteId}`)).data,
    onSuccess: () => {
      toast.success('Note deleted');
      setDeleteId(null);
      onMutated();
    },
    onError: () => toast.error('Failed to delete note'),
  });

  return (
    <>
      <div className="flex flex-col gap-4 pb-6">
        {/* Add note form */}
        <form onSubmit={handleSubmit(d => addMutation.mutate(d))} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              className="h-9 text-sm flex-1"
              placeholder="Add a note about this client…"
              {...register('content')}
            />
            <Button
              type="submit"
              size="sm"
              className="h-9 shrink-0"
              disabled={isSubmitting || addMutation.isPending}
            >
              {addMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                'Add note'
              )}
            </Button>
          </div>
          <FieldError message={errors.content?.message} />
        </form>

        {notes.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/20 flex flex-col items-center justify-center py-12 gap-2">
            <StickyNote className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No notes yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notes.map(note => {
              const canDelete = isSuperAdmin || note.author.id === currentUserId;
              return (
                <div key={note.id} className="group rounded-xl border bg-card p-4 flex gap-3">
                  <Avatar first={note.author.firstName} last={note.author.lastName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-medium text-foreground">
                        {note.author.firstName} {note.author.lastName}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed">{note.content}</p>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => setDeleteId(note.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0 mt-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAT CARD — clickable, navigates with query param pre-set
// ═══════════════════════════════════════════════════════════════════════════════

function StatLink({
  href,
  value,
  label,
  icon: Icon,
  color,
}: {
  href: string;
  value: number;
  label: string;
  icon: React.ElementType;
  color: string;
}) {
  if (value === 0) return null;
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 px-4 py-3 rounded-xl border bg-card hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer`}
    >
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center shrink-0`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold tabular-nums leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">{label}</p>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground ml-auto transition-colors" />
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR INFO ROW
// ═══════════════════════════════════════════════════════════════════════════════

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-border/30 last:border-0">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
          {label}
        </p>
        <div className="text-xs text-foreground">{children}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

type TabId = 'spocs' | 'requirements' | 'notes';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const axios = useAxios();
  const qc = useQueryClient();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>('spocs');

  const { data, isLoading } = useQuery<{
    data: ClientDetail;
    permissions: ClientDetailPermissions;
  }>({
    queryKey: ['client', id],
    queryFn: async () => (await axios.get(`/clients/${id}`)).data,
    enabled: !!id,
  });

  const client = data?.data;
  const permissions = data?.permissions;
  const invalidate = () => qc.invalidateQueries({ queryKey: ['client', id] });

  const statusMutation = useMutation({
    mutationFn: async (status: string) =>
      (await axios.patch(`/clients/${id}/status`, { status })).data,
    onSuccess: (_, status) => {
      toast.success(`Client marked ${status.toLowerCase()}`);
      invalidate();
    },
    onError: () => toast.error('Failed to update status'),
  });

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-6 flex flex-col gap-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-start gap-4 mt-2">
          <div className="flex flex-col gap-2 flex-1">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-2">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-[400px] mt-4 rounded-xl" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <AlertCircle className="w-8 h-8" />
        <p className="text-sm">Client not found.</p>
        <Button size="sm" variant="outline" onClick={() => router.push('/clients')}>
          Back to clients
        </Button>
      </div>
    );
  }

  const sc = statusConfig(client.status);
  const activeSpocs = client.spocs.filter(s => s.isActive);
  const activeReqs = client.requirements.filter(r => r.status === 'ACTIVE').length;
  const pendingReqs = client.requirements.filter(
    r => r.status === 'PENDING_APPROVAL' || r.status === 'DRAFT'
  ).length;

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'spocs', label: 'SPOCs', count: activeSpocs.length },
    { id: 'requirements', label: 'Requirements', count: client.requirements.length },
    { id: 'notes', label: 'Notes', count: client.notes.length },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ── Top nav bar ────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20">
        <div className="px-6 pt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <button
            onClick={() => router.push('/clients')}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Clients
          </button>
          <ChevronRight className="w-3 h-3 opacity-40" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{client.name}</span>
        </div>

        <div className="px-6 pb-3 mt-2 flex items-start justify-between gap-6">
          <div className="flex items-start gap-3 min-w-0">
            {/* Client initial badge */}
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-bold text-base flex items-center justify-center shrink-0 ring-1 ring-primary/20">
              {client.name[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground leading-tight truncate">
                {client.name}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {/* Status pill */}
                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${sc.color}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                  {sc.label}
                </span>
                {client.industry && (
                  <span className="text-xs text-muted-foreground">{client.industry}</span>
                )}
                {client.businessUnit && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {client.businessUnit.name}
                  </span>
                )}
                {(client.city || client.country) && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {[client.city, client.country].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {permissions?.canEdit && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/clients/${client.id}/edit`)}
                  className="h-8 gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={statusMutation.isPending}
                    >
                      {statusMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <MoreVertical className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="text-sm">
                    {client.status !== 'ACTIVE' && (
                      <DropdownMenuItem onClick={() => statusMutation.mutate('ACTIVE')}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                        Mark active
                      </DropdownMenuItem>
                    )}
                    {client.status !== 'PENDING' && (
                      <DropdownMenuItem onClick={() => statusMutation.mutate('PENDING')}>
                        <Clock3 className="w-3.5 h-3.5 mr-2 text-amber-500" />
                        Mark pending
                      </DropdownMenuItem>
                    )}
                    {client.status !== 'INACTIVE' && (
                      <DropdownMenuItem
                        onClick={() => statusMutation.mutate('INACTIVE')}
                        className="text-muted-foreground"
                      >
                        <AlertCircle className="w-3.5 h-3.5 mr-2" />
                        Mark inactive
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Left sidebar ──────────────────────────────────────────────── */}
        <ScrollArea className="w-[240px] shrink-0 border-r">
          <div className="p-4 flex flex-col gap-4">
            {/* Stat cards — all are deep links */}
            <div className="flex flex-col gap-2">
              <StatLink
                href={`/requirements?clientId=${client.id}`}
                value={client._count.requirements}
                label="Total requirements"
                icon={LayoutList}
                color="bg-blue-500/10 text-blue-600 dark:text-blue-400"
              />
              <StatLink
                href={`/requirements?clientId=${client.id}&status=ACTIVE`}
                value={activeReqs}
                label="Active requirements"
                icon={CheckCircle2}
                color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              />
              <StatLink
                href={`/requirements?clientId=${client.id}&status=PENDING_APPROVAL`}
                value={pendingReqs}
                label="Pending approval"
                icon={Clock3}
                color="bg-amber-500/10 text-amber-600 dark:text-amber-400"
              />
              <StatLink
                href={`/clients/${client.id}?tab=spocs`}
                value={activeSpocs.length}
                label="Active SPOCs"
                icon={Users}
                color="bg-violet-500/10 text-violet-600 dark:text-violet-400"
              />
            </div>

            <Separator />

            {/* Meta info */}
            {client.vmsName && (
              <InfoRow icon={Building2} label="VMS name">
                {client.vmsName}
              </InfoRow>
            )}
            {client.website && (
              <InfoRow icon={Globe} label="Website">
                <a
                  href={client.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 truncate"
                >
                  {client.website.replace(/^https?:\/\//, '')}
                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                </a>
              </InfoRow>
            )}
            {(client.city || client.state || client.country) && (
              <InfoRow icon={MapPin} label="Location">
                {[client.city, client.state, client.country].filter(Boolean).join(', ')}
              </InfoRow>
            )}
            {client.address && (
              <InfoRow icon={MapPin} label="Address">
                {client.address}
              </InfoRow>
            )}

            <Separator />

            {/* Relations */}
            {client.parentClient && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                  Parent client
                </p>
                <Link
                  href={`/clients/${client.parentClient.id}`}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <ChevronRight className="w-3 h-3" />
                  {client.parentClient.name}
                </Link>
              </div>
            )}
            {client.childClients.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                  Child clients ({client.childClients.length})
                </p>
                <div className="flex flex-col gap-1">
                  {client.childClients.map(c => (
                    <Link
                      key={c.id}
                      href={`/clients/${c.id}`}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <ChevronRight className="w-3 h-3" />
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Audit */}
            <div className="flex flex-col gap-0">
              <InfoRow icon={UserCircle2} label="Created by">
                {client.createdBy.firstName} {client.createdBy.lastName}
              </InfoRow>
              <div className="py-2 border-b border-border/30">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
                  Created
                </p>
                <p className="text-xs text-foreground">
                  {format(new Date(client.createdAt), 'dd MMM yyyy')}
                </p>
              </div>
              {client.approvedBy && (
                <InfoRow icon={CheckCircle2} label="Approved by">
                  {client.approvedBy.firstName} {client.approvedBy.lastName}
                </InfoRow>
              )}
              {client.approvedAt && (
                <div className="py-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
                    Approved
                  </p>
                  <p className="text-xs text-foreground">
                    {format(new Date(client.approvedAt), 'dd MMM yyyy')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* ── Main content ──────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {/* Tab bar */}
          <div className="shrink-0 border-b px-6 flex items-center gap-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold tabular-nums ${
                      activeTab === tab.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {/* Active underline */}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              {activeTab === 'spocs' && (
                <SpocTab
                  clientId={id}
                  spocs={client.spocs}
                  canEdit={permissions?.canEdit ?? false}
                  onMutated={invalidate}
                />
              )}
              {activeTab === 'requirements' && (
                <RequirementsTab clientId={id} requirements={client.requirements} />
              )}
              {activeTab === 'notes' && (
                <NotesTab
                  clientId={id}
                  notes={client.notes}
                  currentUserId={user?.id}
                  isSuperAdmin={user?.isSuperAdmin}
                  onMutated={invalidate}
                />
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
