/* eslint-disable @typescript-eslint/no-explicit-any */
// components/requirements/RequirementForm.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useAxios } from '@/hooks/useAxios';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  clientSpocId: z.string().min(1, 'SPOC is required'),
  title: z.string().min(1, 'Title is required').max(300).trim(),
  description: z.string().max(5000).optional().nullable(),
  jobType: z.enum(['CONTRACT', 'PERMANENT', 'CONTRACT_TO_HIRE', 'FREELANCE']),
  remoteType: z.enum(['ONSITE', 'REMOTE', 'HYBRID']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  totalOpenings: z.number().min(1, 'At least 1 opening').default(1),
  location: z.string().max(200).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  experienceMin: z.number().min(0).optional().nullable(),
  experienceMax: z.number().min(0).optional().nullable(),
  salaryMin: z.number().min(0).optional().nullable(),
  salaryMax: z.number().min(0).optional().nullable(),
  salaryType: z.enum(['MONTHLY', 'ANNUAL', 'HOURLY', 'DAILY']).optional().nullable(),
  skills: z.array(z.string().trim().min(1)).default([]),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  respondBy: z.string().optional().nullable(),
  turnaroundDays: z.number().min(1).optional().nullable(),
  jdFileKey: z.string().optional().nullable(),
  jdFileName: z.string().optional().nullable(),
  jdFileType: z.string().optional().nullable(),
});

export type RequirementFormValues = z.infer<typeof schema>;

// ─── Types ────────────────────────────────────────────────────────────────────

interface MyClient {
  id: string;
  name: string;
  vmsName?: string;
}

interface ClientSpoc {
  id: string;
  isPrimary: boolean;
  handler: { id: string; firstName: string; lastName: string };
  serviceLine: { id: string; name: string };
  businessUnit: { id: string; name: string };
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-sm font-medium text-foreground">
      {children}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  );
}

function ReadonlyField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="h-9 flex items-center px-3 rounded-md border bg-muted/40 text-sm text-muted-foreground">
        {value ?? '—'}
      </div>
    </div>
  );
}

function toDateInput(val?: string | null) {
  if (!val) return '';
  try {
    return new Date(val).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function toISOOrNull(val?: string | null) {
  if (!val) return null;
  try {
    return new Date(val).toISOString();
  } catch {
    return null;
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  mode: 'create' | 'edit';
  defaultValues?: Partial<RequirementFormValues>;
  onSubmit: (data: RequirementFormValues) => Promise<void>;
  isPending: boolean;
  onCancel: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RequirementForm({ mode, defaultValues, onSubmit, isPending, onCancel }: Props) {
  const axios = useAxios();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    setError,
    formState: { errors },
  } = useForm<RequirementFormValues>({
    // @ts-expect-error errr
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      clientSpocId: '',
      jobType: undefined,
      remoteType: undefined,
      priority: 'MEDIUM',
      totalOpenings: 1,
      location: '',
      country: '',
      salaryMin: undefined,
      salaryMax: undefined,
      salaryType: undefined,
      experienceMin: undefined,
      experienceMax: undefined,
      startDate: '',
      endDate: '',
      respondBy: '',
      turnaroundDays: undefined,
      skills: [],
      jdFileKey: null,
      jdFileName: null,
      jdFileType: null,
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (defaultValues) reset(defaultValues as RequirementFormValues);
  }, [JSON.stringify(defaultValues)]);

  // ── Local state ───────────────────────────────────────────────────────────

  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedSpoc, setSelectedSpoc] = useState<ClientSpoc | null>(null);
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>(defaultValues?.skills ?? []);
  const [jdUploading, setJdUploading] = useState(false);
  const [jdDisplayName, setJdDisplayName] = useState(defaultValues?.jdFileName ?? '');
  const jdInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue('skills', skills);
  }, [skills]);

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: clientsRes } = useQuery<{ data: MyClient[] }>({
    queryKey: ['my-clients'],
    queryFn: async () => (await axios.get('/clients/mine')).data,
    staleTime: 60_000,
  });

  const { data: spocsRes } = useQuery<{ data: ClientSpoc[] }>({
    queryKey: ['client-spocs', selectedClientId],
    queryFn: async () => (await axios.get(`/clients/${selectedClientId}/spocs?mine=true`)).data,
    enabled: !!selectedClientId,
    staleTime: 30_000,
  });

  const clients = clientsRes?.data ?? [];
  const spocs = spocsRes?.data ?? [];

  useEffect(() => {
    setSelectedSpoc(null);
    setValue('clientSpocId', '');
  }, [selectedClientId]);

  // ── JD upload ─────────────────────────────────────────────────────────────

  async function handleJdUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setJdUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'requirements/jd');
      const res = await axios.post('/uploads/single', fd);
      setValue('jdFileKey', res.data.key);
      setValue('jdFileName', res.data.originalName);
      setValue('jdFileType', res.data.mimeType);
      setJdDisplayName(res.data.originalName);
      toast.success('JD uploaded');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'JD upload failed');
    } finally {
      setJdUploading(false);
    }
  }

  function removeJd() {
    setValue('jdFileKey', null);
    setValue('jdFileName', null);
    setValue('jdFileType', null);
    setJdDisplayName('');
    if (jdInputRef.current) jdInputRef.current.value = '';
  }

  // ── Skills ────────────────────────────────────────────────────────────────

  function addSkill() {
    const trimmed = skillInput.trim();
    if (!trimmed || skills.includes(trimmed)) return;
    setSkills(prev => [...prev, trimmed]);
    setSkillInput('');
  }

  function removeSkill(s: string) {
    setSkills(prev => prev.filter(x => x !== s));
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleFormSubmit(data: RequirementFormValues) {
    try {
      await onSubmit({
        ...data,
        startDate: toISOOrNull(data.startDate),
        endDate: toISOOrNull(data.endDate),
        respondBy: toISOOrNull(data.respondBy),
        skills,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Something went wrong';
      const fieldErrors = err?.response?.data?.errors;

      // map server field errors back to inputs
      if (fieldErrors && typeof fieldErrors === 'object') {
        Object.entries(fieldErrors).forEach(([field, message]) => {
          setError(field as keyof RequirementFormValues, {
            type: 'server',
            message: message as string,
          });
        });
      }

      toast.error(msg);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <form
      // @ts-expect-error errr
      onSubmit={handleSubmit(handleFormSubmit)}
      className="flex flex-col gap-6"
    >
      {/* ── Basic info ── */}
      <div className="flex flex-col gap-4">
        <SectionLabel>Basic info</SectionLabel>

        <div className="flex flex-col gap-1.5">
          <Label required>Title</Label>
          <Input placeholder="e.g. Senior React Developer" {...register('title')} />
          <FieldError message={errors.title?.message} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Description</Label>
          <Textarea
            placeholder="Role overview, responsibilities, context…"
            rows={4}
            className="resize-none"
            {...register('description')}
          />
          <FieldError message={errors.description?.message} />
        </div>
      </div>

      <Separator />

      {/* ── Client & SPOC ── */}
      <div className="flex flex-col gap-4">
        <SectionLabel>Client & SPOC</SectionLabel>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {mode === 'create' && (
            <div className="flex flex-col gap-1.5">
              <Label required>Client</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.vmsName ? ` (${c.vmsName})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label required>SPOC</Label>
            <Controller
              control={control}
              name="clientSpocId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={val => {
                    field.onChange(val);
                    setSelectedSpoc(spocs.find(s => s.id === val) ?? null);
                  }}
                  disabled={mode === 'create' && !selectedClientId}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        mode === 'create' && !selectedClientId
                          ? 'Select client first'
                          : 'Select SPOC'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {spocs.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.handler.firstName} {s.handler.lastName}
                        {s.isPrimary ? ' · Primary' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.clientSpocId?.message} />
          </div>
        </div>

        {/* Auto-filled from spoc */}
        {selectedSpoc && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReadonlyField label="Business unit" value={selectedSpoc.businessUnit.name} />
            <ReadonlyField label="Service line" value={selectedSpoc.serviceLine.name} />
          </div>
        )}
      </div>

      <Separator />

      {/* ── Job details ── */}
      <div className="flex flex-col gap-4">
        <SectionLabel>Job details</SectionLabel>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label required>Job type</Label>
            <Controller
              control={control}
              name="jobType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONTRACT">Contract</SelectItem>
                    <SelectItem value="PERMANENT">Permanent</SelectItem>
                    <SelectItem value="CONTRACT_TO_HIRE">Contract to hire</SelectItem>
                    <SelectItem value="FREELANCE">Freelance</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.jobType?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label required>Remote type</Label>
            <Controller
              control={control}
              name="remoteType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONSITE">Onsite</SelectItem>
                    <SelectItem value="REMOTE">Remote</SelectItem>
                    <SelectItem value="HYBRID">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.remoteType?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Priority</Label>
            <Controller
              control={control}
              name="priority"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Total openings</Label>
            <Input type="number" min={1} {...register('totalOpenings', { valueAsNumber: true })} />
            <FieldError message={errors.totalOpenings?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Location</Label>
            <Input placeholder="e.g. Bengaluru" {...register('location')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Country</Label>
            <Input placeholder="e.g. India" {...register('country')} />
          </div>
        </div>
      </div>

      <Separator />

      {/* ── Experience & salary ── */}
      <div className="flex flex-col gap-4">
        <SectionLabel>Experience & salary</SectionLabel>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Exp. min (yrs)</Label>
            <Input
              type="number"
              min={0}
              step={0.5}
              placeholder="0"
              {...register('experienceMin', { valueAsNumber: true })}
            />
            <FieldError message={errors.experienceMin?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Exp. max (yrs)</Label>
            <Input
              type="number"
              min={0}
              step={0.5}
              placeholder="10"
              {...register('experienceMax', { valueAsNumber: true })}
            />
            <FieldError message={errors.experienceMax?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Salary min</Label>
            <Input
              type="number"
              min={0}
              placeholder="0"
              {...register('salaryMin', { valueAsNumber: true })}
            />
            <FieldError message={errors.salaryMin?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Salary max</Label>
            <Input
              type="number"
              min={0}
              placeholder="0"
              {...register('salaryMax', { valueAsNumber: true })}
            />
            <FieldError message={errors.salaryMax?.message} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Salary type</Label>
            <Controller
              control={control}
              name="salaryType"
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={v => field.onChange(v || null)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="ANNUAL">Annual</SelectItem>
                    <SelectItem value="HOURLY">Hourly</SelectItem>
                    <SelectItem value="DAILY">Daily</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* ── Dates ── */}
      <div className="flex flex-col gap-4">
        <SectionLabel>Dates</SectionLabel>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Start date</Label>
            <Input type="date" {...register('startDate')} />
            <FieldError message={errors.startDate?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>End date</Label>
            <Input type="date" {...register('endDate')} />
            <FieldError message={errors.endDate?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Respond by</Label>
            <Input type="date" {...register('respondBy')} />
            <FieldError message={errors.respondBy?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Turnaround (days)</Label>
            <Input
              type="number"
              min={1}
              placeholder="—"
              {...register('turnaroundDays', { valueAsNumber: true })}
            />
            <FieldError message={errors.turnaroundDays?.message} />
          </div>
        </div>
      </div>

      <Separator />

      {/* ── Skills ── */}
      <div className="flex flex-col gap-4">
        <SectionLabel>Skills</SectionLabel>

        <div className="flex gap-2">
          <Input
            placeholder="Type a skill and press Enter"
            value={skillInput}
            onChange={e => setSkillInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSkill();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={addSkill}>
            Add
          </Button>
        </div>

        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {skills.map(s => (
              <Badge key={s} variant="secondary" className="gap-1 pr-1">
                {s}
                <button
                  type="button"
                  onClick={() => removeSkill(s)}
                  className="ml-0.5 hover:text-destructive transition-colors"
                >
                  ✕
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* ── JD upload ── */}
      <div className="flex flex-col gap-4">
        <SectionLabel>Job description file</SectionLabel>

        {jdDisplayName ? (
          <div className="flex items-center gap-3 rounded-md border px-3 py-2.5 bg-muted/30">
            <span className="text-sm flex-1 truncate">{jdDisplayName}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-muted-foreground hover:text-destructive shrink-0"
              onClick={removeJd}
            >
              Remove
            </Button>
          </div>
        ) : (
          <>
            <input
              ref={jdInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={handleJdUpload}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={jdUploading}
              onClick={() => jdInputRef.current?.click()}
            >
              {jdUploading ? 'Uploading…' : 'Upload JD (PDF / DOC)'}
            </Button>
          </>
        )}
      </div>

      <Separator />

      {/* ── Actions ── */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || jdUploading}>
          {isPending
            ? mode === 'create'
              ? 'Creating…'
              : 'Saving…'
            : mode === 'create'
              ? 'Create requirement'
              : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}

// ─── detailToFormValues ───────────────────────────────────────────────────────

export function detailToFormValues(req: any): Partial<RequirementFormValues> {
  return {
    clientSpocId: req.clientSpoc?.id ?? '',
    title: req.title,
    description: req.description ?? '',
    jobType: req.jobType,
    remoteType: req.remoteType,
    priority: req.priority,
    totalOpenings: req.totalOpenings,
    location: req.location ?? '',
    country: req.country ?? '',
    salaryMin: req.salaryMin ?? undefined,
    salaryMax: req.salaryMax ?? undefined,
    salaryType: req.salaryType ?? undefined,
    experienceMin: req.experienceMin ?? undefined,
    experienceMax: req.experienceMax ?? undefined,
    startDate: toDateInput(req.startDate),
    endDate: toDateInput(req.endDate),
    respondBy: toDateInput(req.respondBy),
    turnaroundDays: req.turnaroundDays ?? undefined,
    skills: req.skills ?? [],
    jdFileKey: req.jdFileKey ?? null,
    jdFileName: req.jdFileName ?? null,
    jdFileType: req.jdFileType ?? null,
  };
}
