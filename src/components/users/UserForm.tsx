/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Eye, EyeOff } from 'lucide-react';
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
  teamLeadId: z.string().optional().nullable(),
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
  users: FormOption[]; // for reportingTo + teamLead dropdowns
  isSubmitting: boolean;
  onSubmit: (values: UserFormValues) => void;
  onCancel: () => void;
}

// ─── Field wrappers ───────────────────────────────────────────────────────────

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
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="pt-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      <Separator className="mt-3" />
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
            'w-full justify-start text-left font-normal text-sm h-9',
            !value && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
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

// ─── Main Form ────────────────────────────────────────────────────────────────

export function UserForm({
  mode,
  defaultValues,
  roles,
  departments,
  users,
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
    defaultValues: {
      isSuperAdmin: false,
      ...defaultValues,
    },
  });

  const NONE_VALUE = '__none__';
  const toSelect = (v: string | null | undefined) => v ?? NONE_VALUE;
  const fromSelect = (v: string) => (v === NONE_VALUE ? null : v);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {/* ── Identity ─────────────────────────────────────────────────────── */}
      <SectionHead title="Identity" sub="Core profile information" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        <Field label="First Name" required error={errors.firstName?.message as string}>
          <Input {...register('firstName')} placeholder="Rahul" className="h-9 text-sm" />
        </Field>

        <Field label="Last Name" required error={errors.lastName?.message as string}>
          <Input {...register('lastName')} placeholder="Kumar" className="h-9 text-sm" />
        </Field>

        <Field label="Middle Name" error={errors.middleName?.message as string}>
          <Input {...register('middleName')} placeholder="Optional" className="h-9 text-sm" />
        </Field>

        <Field label="Display Name" error={errors.displayName?.message as string}>
          <Input
            {...register('displayName')}
            placeholder="How they appear in the app"
            className="h-9 text-sm"
          />
        </Field>

        <Field label="Nickname" error={errors.nickName?.message as string}>
          <Input {...register('nickName')} placeholder="Optional" className="h-9 text-sm" />
        </Field>

        <Field label="Employee ID" error={errors.employeeId?.message as string}>
          <Input {...register('employeeId')} placeholder="EMP001" className="h-9 text-sm" />
        </Field>
      </div>

      {/* ── Account (create only) ─────────────────────────────────────────── */}
      {mode === 'create' && (
        <>
          <SectionHead title="Account" sub="Login credentials" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Email" required error={errors.email?.message as string}>
              <Input
                {...register('email')}
                type="email"
                placeholder="rahul@company.com"
                className="h-9 text-sm"
              />
            </Field>

            <Field label="Password" required error={errors.password?.message as string}>
              <div className="relative">
                <Input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  className="h-9 text-sm pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
          </div>
        </>
      )}

      {/* ── Contact ───────────────────────────────────────────────────────── */}
      <SectionHead title="Contact & Location" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        <Field label="Phone" error={errors.phone?.message as string}>
          <Input {...register('phone')} placeholder="+91 98765 43210" className="h-9 text-sm" />
        </Field>

        <Field label="Working Location" error={errors.workingLocation?.message as string}>
          <Input {...register('workingLocation')} placeholder="Bengaluru" className="h-9 text-sm" />
        </Field>

        <Field label="Timezone" error={errors.timezone?.message as string}>
          <Input {...register('timezone')} placeholder="Asia/Kolkata" className="h-9 text-sm" />
        </Field>
      </div>

      {/* ── Dates ─────────────────────────────────────────────────────────── */}
      <SectionHead title="Dates" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      {/* ── Organisation ──────────────────────────────────────────────────── */}
      <SectionHead title="Organisation" sub="Role, department, and reporting structure" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {/* Role — required */}
        <Field label="Role" required error={errors.roleId?.message as string}>
          <Controller
            control={control}
            name="roleId"
            render={({ field }) => (
              <Select
                value={toSelect(field.value)}
                onValueChange={v => field.onChange(fromSelect(v))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        {/* Department */}
        <Field label="Department" error={errors.departmentId?.message as string}>
          <Controller
            control={control}
            name="departmentId"
            render={({ field }) => (
              <Select
                value={toSelect(field.value)}
                onValueChange={v => field.onChange(fromSelect(v))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>None</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        {/* Reporting To */}
        <Field label="Reporting To" error={errors.reportingToId?.message as string}>
          <Controller
            control={control}
            name="reportingToId"
            render={({ field }) => (
              <Select
                value={toSelect(field.value)}
                onValueChange={v => field.onChange(fromSelect(v))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>None</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        {/* Team Lead */}
        <Field label="Team Lead" error={errors.teamLeadId?.message as string}>
          <Controller
            control={control}
            name="teamLeadId"
            render={({ field }) => (
              <Select
                value={toSelect(field.value)}
                onValueChange={v => field.onChange(fromSelect(v))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select team lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>None</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>

      {/* ── Access ────────────────────────────────────────────────────────── */}
      <SectionHead title="Access" />

      <Controller
        control={control}
        name="isSuperAdmin"
        render={({ field }) => (
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Super Admin</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Full unrestricted access to all modules and data.
              </p>
            </div>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </div>
        )}
      />

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 border-t pt-5">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
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
