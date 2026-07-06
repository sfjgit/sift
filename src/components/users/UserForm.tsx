// File: UserForm.tsx
// Path: src/components/users/UserForm.tsx

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Eye, EyeOff, User, Lock, Phone, Building2, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

// ─── Schema ───────────────────────────────────────────────────────────────────

const baseSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  middleName: z.string().max(100).optional().nullable(),
  nickName: z.string().max(100).optional().nullable(),
  displayName: z.string().max(100).optional().nullable(),
  employeeId: z.string().max(50).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  workingLocation: z.string().max(200).optional().nullable(),
  timezone: z.string().max(100).optional().nullable(),
  dateOfBirth: z.date().optional().nullable(),
  dateOfJoin: z.date().optional().nullable(),
  roleId: z.string().min(1, 'Role is required'),
  departmentId: z.string().optional().nullable(),
  reportingToId: z.string().optional().nullable(),
  isSuperAdmin: z.boolean().default(false),
});

export const createSchema = baseSchema.extend({
  email: z.string().email('Invalid email').min(1, 'Email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const editSchema = baseSchema;

export type CreateFormValues = z.infer<typeof createSchema>;
export type EditFormValues = z.infer<typeof editSchema>;
export type UserFormValues = CreateFormValues | EditFormValues;

// ─── Supporting types ─────────────────────────────────────────────────────────

export interface FormOption {
  id: string;
  name: string;
}

export interface UserFormProps {
  mode: 'create' | 'edit';
  defaultValues?: Partial<CreateFormValues>;
  roles: FormOption[];
  departments: FormOption[];
  users: FormOption[];
  businessUnits: FormOption[];
  serviceLines: FormOption[];
  isSubmitting: boolean;
  onSubmit: (values: UserFormValues) => void;
  onCancel: () => void;
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <span className="inline-block w-1 h-1 rounded-full bg-destructive" />
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHead({
  icon: Icon,
  title,
  sub,
}: {
  icon: React.ElementType;
  title: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-3 pt-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted mt-0.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold leading-none">{title}</p>
        {sub && <p className="text-sm text-muted-foreground mt-1">{sub}</p>}
        <Separator className="mt-3" />
      </div>
    </div>
  );
}

// ─── Date picker ──────────────────────────────────────────────────────────────

function DatePicker({
  value,
  onChange,
  placeholder,
}: {
  value: Date | null | undefined;
  onChange: (d: Date | null) => void;
  placeholder?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal text-sm h-10',
            !value && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          {value ? format(value, 'dd MMM yyyy') : (placeholder ?? 'Pick a date')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={d => onChange(d ?? null)}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

// ─── Select with None option ──────────────────────────────────────────────────

const NONE_VALUE = '__none__';
const toSelect = (v: string | null | undefined) => v ?? NONE_VALUE;
const fromSelect = (v: string) => (v === NONE_VALUE ? null : v);

function UserSelect({
  value,
  onChange,
  placeholder,
  options,
  withNone = true,
}: {
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  placeholder: string;
  options: FormOption[];
  withNone?: boolean;
}) {
  return (
    <Select value={toSelect(value)} onValueChange={v => onChange(fromSelect(v))}>
      <SelectTrigger className="h-10 text-sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {withNone && (
          <SelectItem value={NONE_VALUE} className="text-muted-foreground">
            None
          </SelectItem>
        )}
        {options.map(o => (
          <SelectItem key={o.id} value={o.id}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export function UserForm({
  mode,
  defaultValues,
  roles,
  departments,
  users,
  businessUnits,
  serviceLines,
  isSubmitting,
  onSubmit,
  onCancel,
}: UserFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const schema = mode === 'create' ? createSchema : editSchema;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: { isSuperAdmin: false, ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
      {/* ── Identity ───────────────────────────────────────────────────────── */}
      <SectionHead icon={User} title="Identity" sub="Core profile information" />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
        <Field label="First Name" required error={errors.firstName?.message as string}>
          <Input {...register('firstName')} placeholder="Rahul" className="h-10 text-sm" />
        </Field>

        <Field label="Last Name" required error={errors.lastName?.message as string}>
          <Input {...register('lastName')} placeholder="Kumar" className="h-10 text-sm" />
        </Field>

        <Field label="Middle Name" error={errors.middleName?.message as string}>
          <Input {...register('middleName')} placeholder="Optional" className="h-10 text-sm" />
        </Field>

        <Field label="Display Name" error={errors.displayName?.message as string}>
          <Input
            {...register('displayName')}
            placeholder="How they appear in the app"
            className="h-10 text-sm"
          />
        </Field>

        <Field label="Nickname" error={errors.nickName?.message as string}>
          <Input {...register('nickName')} placeholder="Optional" className="h-10 text-sm" />
        </Field>

        <Field label="Employee ID" error={errors.employeeId?.message as string}>
          <Input {...register('employeeId')} placeholder="EMP001" className="h-10 text-sm" />
        </Field>
      </div>

      {/* ── Account (create only) ──────────────────────────────────────────── */}
      {mode === 'create' && (
        <>
          <SectionHead icon={Lock} title="Account" sub="Login credentials for this user" />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Email" required error={errors.email?.message as string}>
              <Input
                {...register('email')}
                type="email"
                placeholder="rahul@company.com"
                className="h-10 text-sm"
              />
            </Field>

            <Field label="Password" required error={errors.password?.message as string}>
              <div className="relative">
                <Input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  className="h-10 text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
          </div>
        </>
      )}

      {/* ── Contact ────────────────────────────────────────────────────────── */}
      <SectionHead icon={Phone} title="Contact & Location" />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
        <Field label="Phone" error={errors.phone?.message as string}>
          <Input {...register('phone')} placeholder="+91 98765 43210" className="h-10 text-sm" />
        </Field>

        <Field label="Working Location" error={errors.workingLocation?.message as string}>
          <Input
            {...register('workingLocation')}
            placeholder="Bengaluru"
            className="h-10 text-sm"
          />
        </Field>

        <Field label="Timezone" error={errors.timezone?.message as string}>
          <Input {...register('timezone')} placeholder="Asia/Kolkata" className="h-10 text-sm" />
        </Field>

        <Field label="Date of Birth" error={errors.dateOfBirth?.message as string}>
          <Controller
            control={control}
            name="dateOfBirth"
            render={({ field }) => (
              <DatePicker value={field.value} onChange={field.onChange} placeholder="Select DOB" />
            )}
          />
        </Field>

        <Field label="Date of Joining" error={errors.dateOfJoin?.message as string}>
          <Controller
            control={control}
            name="dateOfJoin"
            render={({ field }) => (
              <DatePicker value={field.value} onChange={field.onChange} placeholder="Select DOJ" />
            )}
          />
        </Field>
      </div>

      {/* ── Organisation ───────────────────────────────────────────────────── */}
      <SectionHead
        icon={Building2}
        title="Organisation"
        sub="Role, department, and reporting structure"
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
        <Field label="Role" required error={errors.roleId?.message as string}>
          <Controller
            control={control}
            name="roleId"
            render={({ field }) => (
              <UserSelect
                value={field.value}
                onChange={field.onChange}
                placeholder="Select role"
                options={roles.map(r => ({ id: r.id, name: r.name.replace(/_/g, ' ') }))}
                withNone={false}
              />
            )}
          />
        </Field>

        <Field label="Department" required error={errors.departmentId?.message as string}>
          <Controller
            control={control}
            name="departmentId"
            render={({ field }) => (
              <UserSelect
                value={field.value}
                onChange={field.onChange}
                placeholder="Select department"
                options={departments}
              />
            )}
          />
        </Field>

        <Field label="Reporting To" error={errors.reportingToId?.message as string}>
          <Controller
            control={control}
            name="reportingToId"
            render={({ field }) => (
              <UserSelect
                value={field.value}
                onChange={field.onChange}
                placeholder="Select manager"
                options={users}
              />
            )}
          />
        </Field>
      </div>

      {/* ── Assignments ───────────────────────────────────────────────────── */}
      <SectionHead icon={User} title="Assignments" sub="Clients,BU,Service line" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
        <Field label="BuinessUnit" required error={errors.buId?.message as string}>
          <Controller
            control={control}
            name="buId"
            render={({ field }) => (
              <UserSelect
                value={field.value}
                onChange={field.onChange}
                placeholder="Select Buisness Unit"
                options={(businessUnits || []).map(bu => ({
                  id: bu.id,
                  name: bu.name.replace(/_/g, ' '),
                }))}
                withNone={false}
              />
            )}
          />
        </Field>

        <Field label="ServiceLine" required error={errors.serviceLineId?.message as string}>
          <Controller
            control={control}
            name="serviceLineId"
            render={({ field }) => (
              <UserSelect
                value={field.value}
                onChange={field.onChange}
                placeholder="Select Service Line"
                options={(serviceLines || []).map(sl => ({
                  id: sl.id,
                  name: sl.name.replace(/_/g, ' '),
                }))}
              />
            )}
          />
        </Field>
      </div>
      {/* ── Access ─────────────────────────────────────────────────────────── */}
      <SectionHead icon={ShieldAlert} title="Access" sub="System-level permissions" />

      <Controller
        control={control}
        name="isSuperAdmin"
        render={({ field }) => (
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-5">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Super Admin</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Full unrestricted access to all modules and data. Assign with caution.
                </p>
              </div>
            </div>
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
              className="ml-4 shrink-0"
            />
          </div>
        )}
      />

      {/* ── Actions ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 border-t pt-6">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onCancel}
          disabled={isSubmitting}
          className="min-w-24"
        >
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={isSubmitting} className="min-w-32">
          {isSubmitting
            ? mode === 'create'
              ? 'Creating…'
              : 'Saving…'
            : mode === 'create'
              ? 'Create User'
              : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
