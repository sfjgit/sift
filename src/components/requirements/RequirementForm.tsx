'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Client, useRequirementsApi } from '@/lib/requirements.api';
import { useClients } from '@/lib/clients.api';
import { BusinessUnit } from '@/types/clients.types';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBusinessUnitsApi } from '@/lib/business-units.api';

const schema = z.object({
  businessUnitId: z.string(),
  title: z.string().min(1),
  description: z.string().min(1),
  clientId: z.string().min(1),
  jobType: z.enum(['CONTRACT', 'PERMANENT', 'CONTRACT_TO_HIRE', 'FREELANCE']),
  remoteType: z.enum(['ONSITE', 'REMOTE', 'HYBRID']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  totalOpenings: z.coerce.number().min(1),
  location: z.string().optional(),
  salaryMin: z.coerce.number().optional(),
  salaryMax: z.coerce.number().optional(),
  respondBy: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const inputCls = [
  'input h-9 w-full text-sm rounded-md px-3',
  'bg-muted/30 border border-border',
  'placeholder:text-muted-foreground/40',
  'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50',
  'transition-[border-color,box-shadow]',
].join(' ');

function Field({
  label,
  required,
  children,
  className = '',
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-[13px] font-medium text-foreground/70">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function SectionLabel({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50 whitespace-nowrap">
        {title}
      </span>
      <div className="h-px flex-1 bg-border/50" />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-full text-sm bg-muted/30 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-[border-color,box-shadow]">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt.value} value={opt.value} className="text-sm">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

const priorityDot: Record<string, string> = {
  LOW: 'bg-emerald-500',
  MEDIUM: 'bg-amber-500',
  HIGH: 'bg-rose-500',
};

export default function RequirementForm({ onSuccess }: { onSuccess: () => void }) {
  const requirementsApi = useRequirementsApi();
  const clientsApi = useClients();
  const businessUnitsApi = useBusinessUnitsApi();

  const [clients, setClients] = useState<Client[]>([]);
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]); // ✅ fixed typo

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      jobType: 'PERMANENT',
      remoteType: 'ONSITE',
      priority: 'MEDIUM',
      totalOpenings: 1,
    },
  });

  const jobType = watch('jobType');
  const remoteType = watch('remoteType');
  const priority = watch('priority');
  const clientId = watch('clientId');
  const businessUnitId = watch('businessUnitId'); // ✅ fixed typo

  useEffect(() => {
    async function load() {
      const clientsRes = await clientsApi.getAll({ limit: 100 });
      setClients(clientsRes.data.data ?? []);
      //  business units API call
      const buRes = await businessUnitsApi.getAll();
      setBusinessUnits(buRes.data.data ?? []);
    }
    load();
  }, []);

  const onSubmit = async (data: FormData) => {
    await requirementsApi.create({
      ...data,
      respondBy: data.respondBy ? new Date(data.respondBy).toISOString() : undefined,
    });
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* ── Basic Info ─────────────────────────────────────────────────────── */}
      <SectionLabel title="Basic Info" />

      <Field label="Job Title" required>
        <input
          {...register('title')}
          className={inputCls}
          placeholder="e.g. Senior Backend Engineer"
        />
      </Field>

      <Field label="Job Description" required>
        <textarea
          {...register('description')}
          rows={4}
          className={[
            'w-full text-sm rounded-md px-3 py-2',
            'bg-muted/30 border border-border',
            'placeholder:text-muted-foreground/40',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50',
            'transition-[border-color,box-shadow]',
            'resize-none overflow-y-auto max-h-40',
          ].join(' ')}
          placeholder="Describe the role, responsibilities, and requirements..."
        />
      </Field>

      {/* ── Client / BU / Openings ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <Field label="Client" required>
          <Select value={clientId} onValueChange={v => setValue('clientId', v)}>
            <SelectTrigger className="h-9 w-full text-sm bg-muted/30 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-[border-color,box-shadow]">
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id} className="text-sm">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Business Unit" required>
          <Select value={businessUnitId ?? ''} onValueChange={v => setValue('businessUnitId', v)}>
            <SelectTrigger className="h-9 w-full text-sm bg-muted/30 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-[border-color,box-shadow]">
              <SelectValue placeholder="Select business unit" />
            </SelectTrigger>
            <SelectContent>
              {businessUnits.map((bu: BusinessUnit) => (
                <SelectItem key={bu.id} value={bu.id} className="text-sm">
                  {bu.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Total Openings">
          <input type="number" min={1} {...register('totalOpenings')} className={inputCls} />
        </Field>
      </div>

      {/* ── Job Details ────────────────────────────────────────────────────── */}
      <SectionLabel title="Job Details" />

      <div className="grid grid-cols-3 gap-4">
        <SelectField
          label="Job Type"
          value={jobType}
          onChange={v => setValue('jobType', v as FormData['jobType'])}
          options={[
            { label: 'Full Time', value: 'PERMANENT' },
            { label: 'Contract', value: 'CONTRACT' },
            { label: 'Contract to Hire', value: 'CONTRACT_TO_HIRE' },
            { label: 'Freelance', value: 'FREELANCE' },
          ]}
        />
        <SelectField
          label="Remote Type"
          value={remoteType}
          onChange={v => setValue('remoteType', v as FormData['remoteType'])}
          options={[
            { label: 'Onsite', value: 'ONSITE' },
            { label: 'Remote', value: 'REMOTE' },
            { label: 'Hybrid', value: 'HYBRID' },
          ]}
        />

        <Field label="Priority">
          <Select
            value={priority}
            onValueChange={v => setValue('priority', v as FormData['priority'])}
          >
            <SelectTrigger className="h-9 w-full text-sm bg-muted/30 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-[border-color,box-shadow]">
              <SelectValue>
                <span className="flex items-center gap-2">
                  <span
                    className={`size-2 rounded-full shrink-0 ${priorityDot[priority] ?? 'bg-muted'}`}
                  />
                  {priority.charAt(0) + priority.slice(1).toLowerCase()}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {[
                { label: 'Low', value: 'LOW', dot: 'bg-emerald-500' },
                { label: 'Medium', value: 'MEDIUM', dot: 'bg-amber-500' },
                { label: 'High', value: 'HIGH', dot: 'bg-rose-500' },
              ].map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-sm">
                  <span className="flex items-center gap-2">
                    <span className={`size-2 rounded-full shrink-0 ${opt.dot}`} />
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Location">
        <input {...register('location')} className={inputCls} placeholder="e.g. Bangalore, India" />
      </Field>

      {/* ── Compensation & Timeline ────────────────────────────────────────── */}
      <SectionLabel title="Compensation & Timeline" />

      <div className="grid grid-cols-3 gap-4">
        <Field label="Salary Min">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">
              ₹
            </span>
            <input
              type="number"
              {...register('salaryMin')}
              className={`${inputCls} pl-6`}
              placeholder="800,000"
            />
          </div>
        </Field>

        <Field label="Salary Max">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">
              ₹
            </span>
            <input
              type="number"
              {...register('salaryMax')}
              className={`${inputCls} pl-6`}
              placeholder="1,500,000"
            />
          </div>
        </Field>

        <Field label="Respond By">
          <input type="datetime-local" {...register('respondBy')} className={inputCls} />
        </Field>
      </div>

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div className="flex justify-end items-center gap-2 pt-4 mt-1 border-t border-border/60">
        <button
          type="button"
          onClick={onSuccess}
          className="h-9 px-4 text-sm font-medium rounded-md border border-border text-foreground/70 hover:bg-muted/50 hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-9 px-5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-55 transition-colors"
        >
          {isSubmitting ? 'Creating…' : 'Create Requirement'}
        </button>
      </div>
    </form>
  );
}
