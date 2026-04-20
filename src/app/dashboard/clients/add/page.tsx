/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useClients } from '@/lib/clients.api';
import { useBusinessUnitsApi } from '@/lib/business-units.api';
import { usePermissions } from '@/hooks/usePermission';
import { MODULES } from '@/constants/modules';
import { BusinessUnit, CreateClientPayload } from '@/types/core.types';

// ── Schema (mirrors backend exactly) ────────────────────────────────────────
const createClientSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  vmsName: z.string().optional().or(z.literal('')),
  category: z.string().optional().or(z.literal('')),
  industry: z.string().optional().or(z.literal('')),
  website: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(v => !v || /^https?:\/\/.+/.test(v), { message: 'Enter a valid URL (https://…)' }),
  country: z.string().min(1, 'Country is required'),
  state: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  businessUnitId: z.string().optional().or(z.literal('')),
});

type TCreateClientForm = z.infer<typeof createClientSchema>;

// ── Constants ───────────────────────────────────────────────────────────────
const COUNTRIES = [
  'India',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Singapore',
  'UAE',
  'Japan',
];
const INDUSTRIES = [
  'Information Technology',
  'Banking & Finance',
  'Healthcare',
  'Manufacturing',
  'Retail',
  'Telecom',
  'Education',
  'Government',
  'Energy',
  'Consulting',
];
const CATEGORIES = ['Enterprise', 'Mid-Market', 'SMB', 'Startup', 'Government', 'Non-Profit'];

// ── Shared styles ────────────────────────────────────────────────────────────
const inputBase: React.CSSProperties = {
  height: 38,
  padding: '0 12px',
  borderRadius: 8,
  border: '1px solid #e4e4e7',
  background: '#fff',
  fontSize: 14,
  color: '#18181b',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

const selectBase: React.CSSProperties = {
  ...inputBase,
  cursor: 'pointer',
  appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: 32,
};

// ── Sub-components ───────────────────────────────────────────────────────────

function Field({
  name,
  label,
  required,
  children,
}: {
  name: keyof TCreateClientForm;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  const {
    formState: { errors },
  } = useFormContext<TCreateClientForm>();
  const error = errors[name];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#52525b',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {label}
        {required && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {error?.message && (
        <span style={{ fontSize: 12, color: '#ef4444' }}>{error.message as string}</span>
      )}
    </div>
  );
}

function TextInput({
  name,
  placeholder,
  type = 'text',
}: {
  name: keyof TCreateClientForm;
  placeholder?: string;
  type?: string;
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext<TCreateClientForm>();
  const hasError = !!errors[name];

  return (
    <input
      {...register(name)}
      type={type}
      placeholder={placeholder}
      style={{
        ...inputBase,
        borderColor: hasError ? '#fca5a5' : '#e4e4e7',
        background: hasError ? '#fff7f7' : '#fff',
      }}
    />
  );
}

function SelectInput({
  name,
  placeholder,
  options,
  disabled,
}: {
  name: keyof TCreateClientForm;
  placeholder?: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext<TCreateClientForm>();
  const hasError = !!errors[name];

  return (
    <select
      {...register(name)}
      disabled={disabled}
      style={{
        ...selectBase,
        borderColor: hasError ? '#fca5a5' : '#e4e4e7',
        background: disabled ? '#f4f4f5' : hasError ? '#fff7f7' : '#fff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? '#a1a1aa' : '#18181b',
      }}
    >
      <option value="">{placeholder ?? 'Select…'}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #e4e4e7',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 24px',
          borderBottom: '1px solid #f4f4f5',
          background: '#fafafa',
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 600, color: '#18181b', margin: 0 }}>{title}</p>
        <p style={{ fontSize: 12, color: '#a1a1aa', margin: '2px 0 0' }}>{description}</p>
      </div>
      <div style={{ padding: '20px 24px' }}>{children}</div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NewClientPage() {
  const router = useRouter();
  const { canAdd, canView } = usePermissions(MODULES.CLIENTS);
  const clientsApi = useClients();
  const businessUnitsApi = useBusinessUnitsApi();

  // No useState — form state fully owned by RHF
  const form = useForm<TCreateClientForm>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      name: '',
      vmsName: '',
      category: '',
      industry: '',
      website: '',
      country: 'India',
      state: '',
      city: '',
      address: '',
      businessUnitId: '',
    },
    mode: 'onTouched', // validate on blur, not on every keystroke
  });

  const { data, isLoading: buLoading } = useQuery({
    queryKey: ['business-units'],
    queryFn: async () => {
      const res = await businessUnitsApi.getAll();
      return res.data.data;
    },
  });

  const businessUnits = Array.isArray(data) ? data : [];

  const createMutation = useMutation({
    mutationFn: (data: CreateClientPayload) => clientsApi.create(data),
    onSuccess: res => {
      toast.success('Client created successfully!');
      router.push(`/dashboard/clients/${res?.data?.data?.id}`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? 'Failed to create client. Please try again.');
    },
  });

  const onSubmit = form.handleSubmit(
    values => {
      // Normalize: empty string → undefined so the API gets a clean payload
      const payload: CreateClientPayload = {
        ...values,
        vmsName: values.vmsName || undefined,
        category: values.category || undefined,
        industry: values.industry || undefined,
        website: values.website || undefined,
        state: values.state || undefined,
        city: values.city || undefined,
        address: values.address || undefined,
        businessUnitId: values.businessUnitId || undefined,
      };
      createMutation.mutate(payload);
    },
    errors => {
      const labelMap: Partial<Record<keyof TCreateClientForm, string>> = {
        name: 'Client Name',
        country: 'Country',
        website: 'Website',
      };
      const fields = (Object.keys(errors) as Array<keyof TCreateClientForm>)
        .map(f => labelMap[f] ?? f)
        .join(', ');
      toast.error(`Please fix the following fields: ${fields}`);
    }
  );

  const isPending = createMutation.isPending;

  // ── Guards ───────────────────────────────────────────────────
  if (canView === undefined || canAdd === undefined) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#F0F4F8',
        }}
      >
        <div className="spinner" />
        <style>{`.spinner{width:28px;height:28px;border-radius:50%;border:3px solid #0066CC;border-top-color:transparent;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!canAdd) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: 10,
          background: '#F0F4F8',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#fef2f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: 0 }}>
          You don&apos;t have permission to create clients.
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            fontSize: 13,
            color: '#0066CC',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#F0F4F8',
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      }}
    >
      {/* ── Top bar ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          height: 52,
          background: '#fff',
          borderBottom: '1px solid #e4e4e7',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => router.push('/dashboard/clients')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              color: '#71717a',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Clients
          </button>
          <span style={{ color: '#d4d4d8', fontSize: 16 }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#18181b' }}>New Client</span>
        </div>
      </div>

      {/* ── Scrollable body ──────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px 80px' }}>
          <FormProvider {...form}>
            <form onSubmit={onSubmit} noValidate>
              {/* Page header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: 28,
                }}
              >
                <div>
                  <h1 style={{ fontSize: 20, fontWeight: 700, color: '#18181b', margin: 0 }}>
                    Create New Client
                  </h1>
                  <p style={{ fontSize: 13, color: '#71717a', margin: '4px 0 0' }}>
                    Fill out the details below. Fields marked{' '}
                    <span style={{ color: '#ef4444' }}>*</span> are required.
                  </p>
                </div>

                {/* Action buttons — inside <form> so type="submit" works natively */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginTop: 2 }}>
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/clients')}
                    style={{
                      height: 36,
                      padding: '0 16px',
                      borderRadius: 8,
                      border: '1px solid #e4e4e7',
                      background: '#fff',
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#52525b',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    style={{
                      height: 36,
                      padding: '0 20px',
                      borderRadius: 8,
                      background: isPending ? '#93c5fd' : '#0066CC',
                      border: 'none',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#fff',
                      cursor: isPending ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    {isPending && (
                      <span
                        style={{
                          width: 13,
                          height: 13,
                          borderRadius: '50%',
                          border: '2px solid rgba(255,255,255,0.35)',
                          borderTopColor: '#fff',
                          animation: 'spin .7s linear infinite',
                          display: 'inline-block',
                        }}
                      />
                    )}
                    {isPending ? 'Saving…' : 'Save Client'}
                  </button>
                </div>
              </div>

              {/* ── Sections ──────────────────────────────────── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Basic Info */}
                <SectionCard
                  title="Basic Information"
                  description="Core client identity, classification, and system references"
                >
                  <div
                    style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}
                  >
                    <Field name="name" label="Client Name" required>
                      <TextInput name="name" placeholder="Acme Corporation" />
                    </Field>

                    <Field name="vmsName" label="VMS Name">
                      <TextInput name="vmsName" placeholder="Name in vendor management system" />
                    </Field>

                    <Field name="category" label="Category">
                      <SelectInput
                        name="category"
                        placeholder="Select category"
                        options={CATEGORIES.map(c => ({ value: c, label: c }))}
                      />
                    </Field>

                    <Field name="industry" label="Industry">
                      <SelectInput
                        name="industry"
                        placeholder="Select industry"
                        options={INDUSTRIES.map(i => ({ value: i, label: i }))}
                      />
                    </Field>

                    <Field name="website" label="Website">
                      <TextInput name="website" placeholder="https://acme.com" type="url" />
                    </Field>

                    <Field name="businessUnitId" label="Business Unit">
                      <SelectInput
                        name="businessUnitId"
                        placeholder={buLoading ? 'Loading…' : 'Select business unit'}
                        options={businessUnits.map((bu: BusinessUnit) => ({
                          value: bu.id,
                          label: bu.name,
                        }))}
                        disabled={buLoading}
                      />
                    </Field>
                  </div>
                </SectionCard>

                {/* Location */}
                <SectionCard
                  title="Location"
                  description="Client's primary registered or operational address"
                >
                  <div
                    style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}
                  >
                    <Field name="country" label="Country" required>
                      <SelectInput
                        name="country"
                        placeholder="Select country"
                        options={COUNTRIES.map(c => ({ value: c, label: c }))}
                      />
                    </Field>

                    <Field name="state" label="State / Province">
                      <TextInput name="state" placeholder="Karnataka" />
                    </Field>

                    <Field name="city" label="City">
                      <TextInput name="city" placeholder="Bengaluru" />
                    </Field>

                    <Field name="address" label="Street Address">
                      <TextInput name="address" placeholder="123, MG Road" />
                    </Field>
                  </div>
                </SectionCard>
              </div>
            </form>
          </FormProvider>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        input:focus { border-color: #0066CC !important; box-shadow: 0 0 0 3px rgba(0,102,204,0.1) !important; background: #fff !important; }
        select:focus { border-color: #0066CC !important; box-shadow: 0 0 0 3px rgba(0,102,204,0.1) !important; }
        button[type="submit"]:hover:not(:disabled) { background: #0052a3 !important; }
        button[type="button"]:hover { background: #f4f4f5 !important; }
      `}</style>
    </div>
  );
}
