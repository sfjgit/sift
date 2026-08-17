/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { useForm, Controller, useWatch } from 'react-hook-form';

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
  DropdownMenuSeparator,
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
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Edit2,
  ExternalLink,
  Globe,
  LayoutList,
  Loader2,
  MapPin,
  MoreVertical,
  Pencil,
  Plus,
  Sparkles,
  Star,
  StickyNote,
  Tag,
  Trash2,
  UserCircle2,
  UserPlus,
  Users,
  X,
  XCircle,
  AlertCircle,
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

// User shape returned by /users dropdown endpoint
// Your backend should include defaultServiceLineId + defaultBUId
// (the user's department BU / primary service line they operate in)
interface UserDropdown {
  id: string;
  firstName: string;
  lastName: string;
  employeeId?: string;
  role: { id: string; name: string };
  department?: { id: string; name: string } | null;
  // These two should be included by your /users endpoint
  // so the handler auto-fill can work. If not yet present,
  // add them to the serializer on the backend.
  defaultServiceLineId?: string | null;
  defaultBUId?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const addSpocSchema = z.object({
  handlerId: z.string().min(1, 'Select a handler'),
  firstName: z.string().min(1, 'Required').max(100).trim(),
  lastName: z.string().min(1, 'Required').max(100).trim(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  designation: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  serviceLineId: z.string().min(1, 'Required'),
  businessUnitId: z.string().min(1, 'Required'),
  isPrimary: z.boolean().default(false),
  notes: z.string().max(500).optional(),
});

// ─── Updated schema (replace the existing editSpocSchema) ───────────────────
const editSpocSchema = z.object({
  firstName: z.string().min(1, 'Required').max(100).trim(),
  lastName: z.string().min(1, 'Required').max(100).trim(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  designation: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  handlerId: z.string().min(1, 'Required'),
  serviceLineId: z.string().min(1, 'Required'), // ← added
  businessUnitId: z.string().min(1, 'Required'), // ← added
  isPrimary: z.boolean(),
  notes: z.string().max(500).optional(),
});

const addNoteSchema = z.object({
  content: z.string().min(1, 'Required').max(2000).trim(),
});

type AddSpocValues = z.infer<typeof addSpocSchema>;
type EditSpocValues = z.infer<typeof editSpocSchema>;
type AddNoteValues = z.infer<typeof addNoteSchema>;

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
      className:
        'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
      dot: 'bg-emerald-500',
    };
  if (s === 'PENDING')
    return {
      label: 'Pending',
      className:
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
      dot: 'bg-amber-500',
    };
  return {
    label: 'Inactive',
    className:
      'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-400 dark:border-zinc-700',
    dot: 'bg-zinc-400',
  };
}

function reqStatusConfig(s: string) {
  const m: Record<string, string> = {
    ACTIVE:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
    DRAFT:
      'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
    CLOSED:
      'bg-zinc-50 text-zinc-400 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-500 dark:border-zinc-800',
    CANCELLED:
      'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
    ON_HOLD:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    PENDING_APPROVAL:
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800',
  };
  return m[s] ?? 'bg-zinc-50 text-zinc-400 border-zinc-200';
}

function priorityDotColor(p: string) {
  if (p === 'HIGH') return 'bg-red-500';
  if (p === 'MEDIUM') return 'bg-amber-400';
  return 'bg-zinc-300 dark:bg-zinc-600';
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
  colorClass,
}: {
  first: string;
  last: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  colorClass?: string;
}) {
  const sz = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-11 h-11 text-sm',
  }[size];

  return (
    <div
      className={`${sz} rounded-full font-semibold flex items-center justify-center shrink-0 ring-1 ${
        colorClass ?? 'bg-primary/10 text-primary ring-primary/20'
      }`}
    >
      {initials(first, last)}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DM CHIP
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
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="group/chip inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-[11px] font-medium text-violet-700 dark:bg-violet-950/40 dark:border-violet-800 dark:text-violet-400 cursor-default select-none">
            <span className="w-4 h-4 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center text-[9px] font-bold shrink-0 text-violet-700 dark:text-violet-300">
              {initials(dm.dm.firstName, dm.dm.lastName)}
            </span>
            <span className="max-w-[88px] truncate">
              {dm.dm.firstName} {dm.dm.lastName}
            </span>
            {canEdit && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onRemove(dm.id);
                }}
                className="ml-0.5 w-3 h-3 rounded-full flex items-center justify-center opacity-0 group-hover/chip:opacity-100 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-950 transition-all shrink-0"
              >
                <X className="w-2 h-2" />
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
// ADD DM INLINE
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

  const { data: usersRes } = useQuery<{ data: UserDropdown[] }>({
    queryKey: ['users-dm-dropdown'],
    queryFn: async () => (await axios.get('/users?limit=200&isActive=true')).data,
    staleTime: 60_000,
    enabled: open,
  });

  const available = (usersRes?.data ?? []).filter(u => !existingDmIds.includes(u.id));

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
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed border-border/60 text-[11px] text-muted-foreground hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
      >
        <UserPlus className="w-2.5 h-2.5" />
        Tag DM
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1.5 w-60 z-[200] rounded-xl border border-border bg-popover shadow-lg"
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="p-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">Tag delivery manager</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
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
                        ? 'All DMs tagged'
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
// Handler is first. Selecting a handler auto-fills serviceLineId + businessUnitId
// from that user's profile. Fields remain editable after auto-fill.
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
    setValue,
    formState: { errors },
  } = useForm<AddSpocValues>({
    // @ts-expect-error err
    resolver: zodResolver(addSpocSchema),
    defaultValues: {
      handlerId: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      designation: '',
      department: '',
      serviceLineId: '',
      businessUnitId: '',
      isPrimary: false,
      notes: '',
    },
  });

  // Watch handlerId so we can react to changes and auto-fill
  const watchedHandlerId = useWatch({ control, name: 'handlerId' });

  // ── Dropdown data ─────────────────────────────────────────────────────────
  const { data: usersRes } = useQuery<{ data: UserDropdown[] }>({
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

  // ── Derive selected handler object for preview card ───────────────────────
  const selectedHandler = users.find(u => u.id === watchedHandlerId) ?? null;

  // ── Auto-fill serviceLineId + businessUnitId when handler changes ─────────
  useEffect(() => {
    if (!selectedHandler) return;

    if (selectedHandler.defaultServiceLineId) {
      setValue('serviceLineId', selectedHandler.defaultServiceLineId, { shouldValidate: false });
    }
    if (selectedHandler.defaultBUId) {
      setValue('businessUnitId', selectedHandler.defaultBUId, { shouldValidate: false });
    }
  }, [selectedHandler, setValue]);

  // ── Reset form when dialog closes ─────────────────────────────────────────
  const handleClose = () => {
    reset();
    onClose();
  };

  const mutation = useMutation({
    mutationFn: async (data: AddSpocValues) =>
      (await axios.post(`/clients/${clientId}/spocs`, data)).data,
    onSuccess: () => {
      toast.success('SPOC added');
      reset();
      onAdded();
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to add SPOC'),
  });

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Add SPOC</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={
            // @ts-expect-error err
            handleSubmit(d => mutation.mutate(d))
          }
          className="flex flex-col gap-5 mt-1"
        >
          {/* ── STEP 1: Handler selection ──────────────────────────────── */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                1
              </span>
              <span className="text-xs font-semibold text-foreground">Select handler</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label required>Handler</Label>
              <Controller
                control={control}
                name="handlerId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Pick the handler for this SPOC…" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id} className="text-sm">
                          <span className="font-medium">
                            {u.firstName} {u.lastName}
                          </span>
                          {u.employeeId && (
                            <span className="text-muted-foreground ml-1.5">· {u.employeeId}</span>
                          )}
                          {u.role && (
                            <span className="text-muted-foreground ml-1.5">· {u.role.name}</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.handlerId?.message} />
            </div>

            {/* Handler preview card — visible once a handler is selected */}
            {selectedHandler && (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-900 mt-1">
                <Avatar
                  first={selectedHandler.firstName}
                  last={selectedHandler.lastName}
                  size="md"
                  colorClass="bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:ring-blue-800"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {selectedHandler.firstName} {selectedHandler.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[selectedHandler.role?.name, selectedHandler.department?.name]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                {(selectedHandler.defaultServiceLineId || selectedHandler.defaultBUId) && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900 shrink-0">
                    <Sparkles className="w-2.5 h-2.5" />
                    Auto-filled
                  </span>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* ── STEP 2: SPOC contact details ───────────────────────────── */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                2
              </span>
              <span className="text-xs font-semibold text-foreground">SPOC contact details</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label required>First name</Label>
                <Input className="h-9 text-sm" placeholder="Rekha" {...register('firstName')} />
                <FieldError message={errors.firstName?.message} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label required>Last name</Label>
                <Input className="h-9 text-sm" placeholder="Krishnan" {...register('lastName')} />
                <FieldError message={errors.lastName?.message} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Email</Label>
                <Input
                  className="h-9 text-sm"
                  type="email"
                  placeholder="rekha@client.com"
                  {...register('email')}
                />
                <FieldError message={errors.email?.message} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Phone</Label>
                <Input
                  className="h-9 text-sm"
                  placeholder="+91 9999999999"
                  {...register('phone')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Designation</Label>
                <Input
                  className="h-9 text-sm"
                  placeholder="HR Manager"
                  {...register('designation')}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Department</Label>
                <Input className="h-9 text-sm" placeholder="HR" {...register('department')} />
              </div>
            </div>
          </div>

          <Separator />

          {/* ── STEP 3: Assignment (pre-filled from handler, editable) ─── */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                3
              </span>
              <span className="text-xs font-semibold text-foreground">Assignment</span>
              {selectedHandler &&
                (selectedHandler.defaultServiceLineId || selectedHandler.defaultBUId) && (
                  <span className="text-[10px] text-muted-foreground">
                    (auto-filled from handler — edit if needed)
                  </span>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label required>Service line</Label>
                <Controller
                  control={control}
                  name="serviceLineId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-9 text-sm">
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
                      <SelectTrigger className="h-9 text-sm">
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
              <Input
                className="h-9 text-sm"
                placeholder="Optional notes about this SPOC"
                {...register('notes')}
              />
            </div>

            <Controller
              control={control}
              name="isPrimary"
              render={({ field }) => (
                <button
                  type="button"
                  onClick={() => field.onChange(!field.value)}
                  className={`self-start flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
                    field.value
                      ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400'
                      : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/40'
                  }`}
                >
                  <Star
                    className={`w-3 h-3 ${field.value ? 'fill-amber-500 text-amber-500' : ''}`}
                  />
                  {field.value ? 'Primary SPOC' : 'Set as primary'}
                </button>
              )}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
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

// ─── Full replacement: EditSpocDialog ───────────────────────────────────────
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
        serviceLineId: spoc.serviceLine.id, // ← seeded from existing data
        businessUnitId: spoc.businessUnit.id, // ← seeded from existing data
        isPrimary: spoc.isPrimary,
        notes: spoc.notes ?? '',
      });
    }
  }, [spoc, reset]);

  const { data: usersRes } = useQuery<{ data: UserDropdown[] }>({
    queryKey: ['users-dropdown'],
    queryFn: async () => (await axios.get('/users?limit=200&isActive=true')).data,
    staleTime: 60_000,
    enabled: !!spoc,
  });

  const { data: slRes } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['service-lines-dropdown'],
    queryFn: async () => (await axios.get('/service-lines?limit=100')).data,
    staleTime: 60_000,
    enabled: !!spoc,
  });

  const { data: busRes } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['bus-dropdown'],
    queryFn: async () => (await axios.get('/business-units?limit=100')).data,
    staleTime: 60_000,
    enabled: !!spoc,
  });

  const users = usersRes?.data ?? [];
  const serviceLines = slRes?.data ?? [];
  const businessUnits = busRes?.data ?? [];

  const mutation = useMutation({
    mutationFn: async (data: EditSpocValues) =>
      (await axios.patch(`/clients/${clientId}/spocs/${spoc!.id}`, data)).data,
    onSuccess: () => {
      toast.success('SPOC updated');
      onUpdated();
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to update'),
  });

  return (
    <Dialog open={!!spoc} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Edit SPOC</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="flex flex-col gap-4 mt-1">
          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label required>First name</Label>
              <Input className="h-9 text-sm" {...register('firstName')} />
              <FieldError message={errors.firstName?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label required>Last name</Label>
              <Input className="h-9 text-sm" {...register('lastName')} />
              <FieldError message={errors.lastName?.message} />
            </div>
          </div>

          {/* Email / Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input className="h-9 text-sm" type="email" {...register('email')} />
              <FieldError message={errors.email?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Phone</Label>
              <Input className="h-9 text-sm" {...register('phone')} />
            </div>
          </div>

          {/* Designation / Department */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Designation</Label>
              <Input className="h-9 text-sm" {...register('designation')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Department</Label>
              <Input className="h-9 text-sm" {...register('department')} />
            </div>
          </div>

          {/* Handler */}
          <div className="flex flex-col gap-1.5">
            <Label required>Handler</Label>
            <Controller
              control={control}
              name="handlerId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-9 text-sm">
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

          {/* Service line / Business unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label required>Service line</Label>
              <Controller
                control={control}
                name="serviceLineId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9 text-sm">
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
                    <SelectTrigger className="h-9 text-sm">
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

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label>Notes</Label>
            <Input className="h-9 text-sm" {...register('notes')} />
          </div>

          {/* Primary toggle */}
          <Controller
            control={control}
            name="isPrimary"
            render={({ field }) => (
              <button
                type="button"
                onClick={() => field.onChange(!field.value)}
                className={`self-start flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
                  field.value
                    ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400'
                    : 'border-border text-muted-foreground hover:border-primary/40'
                }`}
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
    <div
      className={`group relative rounded-2xl border bg-card transition-all duration-150 hover:border-border/80 hover:shadow-sm ${
        spoc.isPrimary ? 'border-amber-200 dark:border-amber-900' : 'border-border/60'
      }`}
    >
      {/* Primary accent top bar */}
      {spoc.isPrimary && (
        <div className="h-[3px] rounded-t-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-transparent" />
      )}

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <Avatar first={spoc.firstName} last={spoc.lastName} size="lg" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm text-foreground leading-tight">
                {spoc.firstName} {spoc.lastName}
              </span>
              {spoc.isPrimary && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                  Primary
                </span>
              )}
            </div>
            {(spoc.designation || spoc.department) && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {[spoc.designation, spoc.department].filter(Boolean).join(' · ')}
              </p>
            )}
            <div className="flex flex-col gap-0.5 mt-1.5">
              {spoc.email && (
                <a
                  href={`mailto:${spoc.email}`}
                  className="text-xs text-primary hover:underline underline-offset-2 w-fit"
                >
                  {spoc.email}
                </a>
              )}
              {spoc.phone && (
                <a
                  href={`tel:${spoc.phone}`}
                  className="text-xs text-muted-foreground hover:text-foreground w-fit"
                >
                  {spoc.phone}
                </a>
              )}
            </div>
          </div>

          {/* Actions — appear on hover */}
          {canEdit && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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

        {/* Handler / service line / BU row */}
        <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground/70">
            Handled by
          </span>
          <span className="font-medium text-foreground text-[11px]">
            {spoc.handler.firstName} {spoc.handler.lastName}
          </span>
          <span className="text-border">·</span>
          <span className="text-[11px]">{spoc.serviceLine.name}</span>
          <span className="text-border">·</span>
          <span className="text-[11px]">{spoc.businessUnit.name}</span>
        </div>

        {/* DM chips row */}
        <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium flex items-center gap-1 shrink-0">
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

        {/* Notes */}
        {spoc.notes && (
          <p className="mt-2.5 text-[11px] text-muted-foreground italic border-l-2 border-border/40 pl-2 leading-relaxed">
            {spoc.notes}
          </p>
        )}

        {/* Footer */}
        <p className="mt-2.5 text-[10px] text-muted-foreground/50">
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
      <div className="flex flex-col gap-5 pb-8">
        {/* Section header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {activeSpocs.length === 0
              ? 'No SPOCs assigned yet.'
              : `${activeSpocs.length} active contact${activeSpocs.length !== 1 ? 's' : ''}`}
          </p>
          {canEdit && (
            <Button size="sm" onClick={() => setAddOpen(true)} className="h-8 gap-1.5 rounded-lg">
              <Plus className="w-3.5 h-3.5" />
              Add SPOC
            </Button>
          )}
        </div>

        {/* Active spocs grid */}
        {activeSpocs.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/10 flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center">
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No SPOCs assigned</p>
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddOpen(true)}
                className="gap-1.5 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                Add first SPOC
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

        {/* Inactive spocs collapsible */}
        {inactiveSpocs.length > 0 && (
          <details className="mt-1">
            <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none flex items-center gap-1.5 list-none">
              <ChevronRight className="w-3 h-3 transition-transform [details[open]_&]:rotate-90" />
              {inactiveSpocs.length} past SPOC{inactiveSpocs.length !== 1 ? 's' : ''}
            </summary>
            <div className="mt-3 flex flex-col gap-2">
              {inactiveSpocs.map(s => (
                <div
                  key={s.id}
                  className="rounded-xl border bg-muted/20 px-3 py-2.5 flex items-center gap-2.5 opacity-50"
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

      {/* Dialogs */}
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
      <div className="rounded-2xl border border-dashed bg-muted/10 flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center">
          <Briefcase className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No requirements yet</p>
        <Link href={`/requirements/new?clientId=${clientId}`}>
          <Button size="sm" variant="outline" className="gap-1.5 rounded-lg">
            <Plus className="w-3.5 h-3.5" />
            Create requirement
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 pb-8">
      {requirements.map(r => (
        <div
          key={r.id}
          onClick={() => router.push(`/requirements/${r.id}`)}
          className="group rounded-xl border border-border/60 bg-card px-4 py-3.5 flex items-center gap-4 cursor-pointer hover:border-border hover:bg-muted/20 transition-all"
        >
          {/* Priority dot */}
          <div className={`w-2 h-2 rounded-full shrink-0 ${priorityDotColor(r.priority)}`} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {r.reqCode}
              </span>
            </div>
            <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs tabular-nums text-muted-foreground">
              {r.totalOpenings} opening{r.totalOpenings !== 1 ? 's' : ''}
            </span>
            <span
              className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${reqStatusConfig(r.status)}`}
            >
              {humanize(r.status)}
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
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
      <div className="flex flex-col gap-4 pb-8">
        {/* Add note form */}
        <form onSubmit={handleSubmit(d => addMutation.mutate(d))} className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <Input
              className="h-9 text-sm flex-1 rounded-lg"
              placeholder="Add a note about this client…"
              {...register('content')}
            />
            <Button
              type="submit"
              size="sm"
              className="h-9 shrink-0 rounded-lg px-4"
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

        {/* Notes list */}
        {notes.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/10 flex flex-col items-center justify-center py-14 gap-2">
            <StickyNote className="w-8 h-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No notes yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notes.map(note => {
              const canDelete = isSuperAdmin || note.author.id === currentUserId;
              return (
                <div
                  key={note.id}
                  className="group rounded-xl border border-border/60 bg-card p-4 flex gap-3 hover:border-border/80 transition-colors"
                >
                  <Avatar first={note.author.firstName} last={note.author.lastName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold text-foreground">
                        {note.author.firstName} {note.author.lastName}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(note.createdAt), {
                          addSuffix: true,
                        })}
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
// SIDEBAR STAT CARD
// ═══════════════════════════════════════════════════════════════════════════════

function StatCard({
  href,
  value,
  label,
  icon: Icon,
  colorClass,
}: {
  href: string;
  value: number;
  label: string;
  icon: React.ElementType;
  colorClass: string;
}) {
  if (value === 0) return null;
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/60 bg-card hover:border-border hover:bg-muted/20 transition-all cursor-pointer"
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold tabular-nums leading-none">{value}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
      </div>
      <ExternalLink className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
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
    <div className="flex items-start gap-2 py-1.5 border-b border-border/30 last:border-0">
      <Icon className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium mb-0.5">
          {label}
        </p>
        <div className="text-[11px] text-foreground leading-snug">{children}</div>
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

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-6 flex flex-col gap-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-start gap-4 mt-2">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <Skeleton className="h-[72px] rounded-xl" />
          <Skeleton className="h-[72px] rounded-xl" />
          <Skeleton className="h-[72px] rounded-xl" />
          <Skeleton className="h-[72px] rounded-xl" />
        </div>
        <Skeleton className="h-[400px] mt-4 rounded-2xl" />
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
      {/* ── Sticky top bar ───────────────────────────────────────────────── */}
      <div className="shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20">
        {/* Breadcrumb */}
        <div className="px-6 pt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <button
            onClick={() => router.push('/clients')}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Clients
          </button>
          <ChevronRight className="w-3 h-3 opacity-30" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{client.name}</span>
        </div>

        {/* Client header */}
        <div className="px-6 pb-3 mt-2.5 flex items-start justify-between gap-6">
          <div className="flex items-start gap-3 min-w-0">
            {/* Logo badge */}
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-bold text-base flex items-center justify-center shrink-0 ring-1 ring-primary/20">
              {client.name[0]?.toUpperCase()}
            </div>

            <div className="min-w-0">
              <h1 className="text-[17px] font-bold text-foreground leading-tight truncate">
                {client.name}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {/* Status pill */}
                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${sc.className}`}
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
          {permissions?.canEdit && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/clients/${client.id}/edit`)}
                className="h-8 gap-1.5 rounded-lg"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-lg"
                    disabled={statusMutation.isPending}
                  >
                    {statusMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <MoreVertical className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="text-sm w-44">
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
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => statusMutation.mutate('INACTIVE')}
                        className="text-muted-foreground"
                      >
                        <XCircle className="w-3.5 h-3.5 mr-2" />
                        Mark inactive
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* ── Left sidebar ────────────────────────────────────────────── */}
        <ScrollArea className="w-[220px] shrink-0 border-r">
          <div className="p-4 flex flex-col gap-3">
            {/* Stat cards */}
            <div className="flex flex-col gap-2">
              <StatCard
                href={`/requirements?clientId=${client.id}`}
                value={client._count.requirements}
                label="Total requirements"
                icon={LayoutList}
                colorClass="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
              />
              <StatCard
                href={`/requirements?clientId=${client.id}&status=ACTIVE`}
                value={activeReqs}
                label="Active requirements"
                icon={CheckCircle2}
                colorClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
              />
              <StatCard
                href={`/requirements?clientId=${client.id}&status=PENDING_APPROVAL`}
                value={pendingReqs}
                label="Pending approval"
                icon={Clock3}
                colorClass="bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
              />
              <StatCard
                href={`/clients/${client.id}?tab=spocs`}
                value={activeSpocs.length}
                label="Active SPOCs"
                icon={Users}
                colorClass="bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400"
              />
            </div>

            <Separator className="my-1" />

            {/* Meta info */}
            <div className="flex flex-col gap-0">
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
                    className="text-primary hover:underline underline-offset-2 flex items-center gap-1 truncate"
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
            </div>

            {/* Relations */}
            {(client.parentClient || client.childClients.length > 0) && (
              <>
                <Separator className="my-1" />
                <div className="flex flex-col gap-3">
                  {client.parentClient && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1.5">
                        Parent client
                      </p>
                      <Link
                        href={`/clients/${client.parentClient.id}`}
                        className="text-[11px] text-primary hover:underline underline-offset-2 flex items-center gap-1"
                      >
                        <ChevronRight className="w-3 h-3" />
                        {client.parentClient.name}
                      </Link>
                    </div>
                  )}
                  {client.childClients.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1.5">
                        Child clients ({client.childClients.length})
                      </p>
                      <div className="flex flex-col gap-1">
                        {client.childClients.map(c => (
                          <Link
                            key={c.id}
                            href={`/clients/${c.id}`}
                            className="text-[11px] text-primary hover:underline underline-offset-2 flex items-center gap-1"
                          >
                            <ChevronRight className="w-3 h-3" />
                            {c.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <Separator className="my-1" />

            {/* Audit */}
            <div className="flex flex-col gap-0">
              <InfoRow icon={UserCircle2} label="Created by">
                {client.createdBy.firstName} {client.createdBy.lastName}
              </InfoRow>
              <InfoRow icon={Clock3} label="Created">
                {format(new Date(client.createdAt), 'dd MMM yyyy')}
              </InfoRow>
              {client.approvedBy && (
                <InfoRow icon={CheckCircle2} label="Approved by">
                  {client.approvedBy.firstName} {client.approvedBy.lastName}
                </InfoRow>
              )}
              {client.approvedAt && (
                <InfoRow icon={Clock3} label="Approved">
                  {format(new Date(client.approvedAt), 'dd MMM yyyy')}
                </InfoRow>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* ── Main content ────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {/* Tab bar */}
          <div className="shrink-0 border-b px-6 flex items-center gap-0 bg-background">
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
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold tabular-nums min-w-[18px] text-center ${
                      activeTab === tab.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <ScrollArea className="flex-1 h-0">
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
