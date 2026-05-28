/* eslint-disable react/no-unescaped-entities */
// File: RequirementForm.tsx
// Path: src/components/requirements/RequirementForm.tsx

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Sparkles,
  Upload,
  X,
  FileText,
  Plus,
  Loader2,
  Wand2,
  AlertCircle,
  Building2,
  Briefcase,
  Calendar,
  DollarSign,
  MapPin,
  Tag,
  Clock,
  CheckCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAxios } from '@/hooks/useAxios';

// ─── Schema ───────────────────────────────────────────────────────────────────
// FIX: jobType and remoteType must have defaults or be optional so RHF/Zod
// doesn't fire a required error before the user has touched them.
// Using .optional() here and validating on submit is the safest pattern.

const schema = z.object({
  clientSpocId: z.string().min(1, 'SPOC is required'),
  title: z.string().min(1, 'Title is required').max(300).trim(),
  description: z.string().max(5000).optional().nullable(),
  // DB enum: CONTRACT | PERMANENT | CONTRACT_TO_HIRE | FREELANCE
  jobType: z.enum(['CONTRACT', 'PERMANENT', 'CONTRACT_TO_HIRE', 'FREELANCE']),
  // DB enum: ONSITE | REMOTE | HYBRID
  remoteType: z.enum(['ONSITE', 'REMOTE', 'HYBRID']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  totalOpenings: z.number().min(1).default(1),
  location: z.string().max(200).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  experienceMin: z.number().min(0).optional().nullable(),
  experienceMax: z.number().min(0).optional().nullable(),
  salaryMin: z.number().min(0).optional().nullable(),
  salaryMax: z.number().min(0).optional().nullable(),
  // DB enum: MONTHLY | ANNUAL | HOURLY | DAILY
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Shared class strings ─────────────────────────────────────────────────────

const inputCls =
  'h-10 text-[13.5px] font-medium text-slate-900 border-slate-300 bg-white placeholder:text-slate-400 placeholder:font-normal focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary rounded-lg transition-colors';

const selectTriggerCls =
  'h-10 text-[13.5px] font-medium text-slate-900 border-slate-300 bg-white focus:ring-2 focus:ring-primary/30 focus:border-primary rounded-lg transition-colors data-[placeholder]:text-slate-400 data-[placeholder]:font-normal';

// ─── Field primitives ─────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-[11.5px] text-red-500 mt-1 flex items-center gap-1">
      <AlertCircle size={11} /> {message}
    </p>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
      {children}
      {required && (
        <span className="text-red-400 ml-0.5 normal-case font-normal text-[10px]"> *</span>
      )}
    </label>
  );
}

function ReadonlyField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="h-10 flex items-center px-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-[13px] font-medium text-slate-600">
        {value ?? '—'}
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  subtitle,
  accentClass,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  accentClass: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className={`flex items-center gap-3 px-6 py-4 border-b border-slate-100 ${accentClass}`}>
        <div className="w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center shrink-0 shadow-sm border border-white/60">
          <Icon size={17} className="text-slate-700" />
        </div>
        <div>
          <h3 className="text-[13.5px] font-bold text-slate-900 leading-none tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11.5px] text-slate-500 mt-0.5 font-normal">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ─── JD Section ───────────────────────────────────────────────────────────────

function JdSection({
  onManualUpload,
  jdDisplayName,
  onRemoveJd,
  jdUploading,
  jdInputRef,
  onFileChange,
}: {
  onManualUpload: () => void;
  jdDisplayName: string;
  onRemoveJd: () => void;
  jdUploading: boolean;
  jdInputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-3">
      {/* AI parse — WIP banner */}
      <div className="relative rounded-xl border-2 border-dashed border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-5 overflow-hidden">
        <div className="absolute top-3 right-3">
          <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
            <Clock size={9} /> In Progress
          </span>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
            <Wand2 size={18} className="text-violet-600" />
          </div>
          <div className="flex-1 min-w-0 pr-16">
            <h4 className="text-[13px] font-bold text-violet-900 mb-0.5 flex items-center gap-1.5">
              <Sparkles size={12} className="text-violet-500" />
              AI-Powered JD Parser
            </h4>
            <p className="text-[12px] text-violet-700/70 leading-relaxed">
              Upload a JD and we'll auto-extract title, skills, experience, and salary range.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {['Auto-fills title', 'Extracts skills', 'Detects salary', 'Parses experience'].map(
                f => (
                  <span
                    key={f}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-semibold border border-violet-200"
                  >
                    {f}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-lg border-2 border-dashed border-violet-200 bg-white/60 py-5 flex flex-col items-center gap-2 opacity-50 cursor-not-allowed select-none">
          <Upload size={20} className="text-violet-400" />
          <p className="text-[12px] text-violet-600 font-semibold">Drop JD here to auto-parse</p>
          <p className="text-[10px] text-violet-400">PDF, DOC, DOCX · Coming soon</p>
        </div>
      </div>

      {/* Manual upload */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <p className="text-[10.5px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <FileText size={11} /> Manual JD Upload
        </p>
        <input
          ref={jdInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={onFileChange}
        />
        {jdDisplayName ? (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
            <CheckCircle size={15} className="text-emerald-500 shrink-0" />
            <span className="text-[13px] text-emerald-800 font-semibold flex-1 truncate">
              {jdDisplayName}
            </span>
            <button
              type="button"
              onClick={onRemoveJd}
              className="text-emerald-400 hover:text-red-500 transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onManualUpload}
            disabled={jdUploading}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-lg border-2 border-dashed border-slate-300 text-[13px] font-semibold text-slate-500 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all disabled:opacity-50"
          >
            {jdUploading ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <Upload size={14} /> Upload JD (PDF / DOC / DOCX)
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
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
    // @ts-expect-error zod resolver type
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      clientSpocId: '',
      // FIX: do NOT set jobType/remoteType to undefined — leave them absent so
      // the Select starts in true placeholder state. Zod will catch missing on submit.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(defaultValues)]);

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
      if (jdInputRef.current) jdInputRef.current.value = '';
    }
  }

  function removeJd() {
    setValue('jdFileKey', null);
    setValue('jdFileName', null);
    setValue('jdFileType', null);
    setJdDisplayName('');
    if (jdInputRef.current) jdInputRef.current.value = '';
  }

  function addSkill() {
    const t = skillInput.trim();
    if (!t || skills.includes(t)) return;
    setSkills(p => [...p, t]);
    setSkillInput('');
  }

  function removeSkill(s: string) {
    setSkills(p => p.filter(x => x !== s));
  }

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

  return (
    <form onSubmit={handleSubmit(handleFormSubmit as any)} className="space-y-5">
      {/* ── 1. Job Description / JD Parser ── */}
      <Section
        icon={Sparkles}
        title="Job Description"
        subtitle="Upload JD for AI parsing (coming soon) or attach manually"
        accentClass="bg-gradient-to-r from-violet-50 to-indigo-50"
      >
        <JdSection
          onManualUpload={() => jdInputRef.current?.click()}
          jdDisplayName={jdDisplayName}
          onRemoveJd={removeJd}
          jdUploading={jdUploading}
          // @ts-expect-error ref type
          jdInputRef={jdInputRef}
          onFileChange={handleJdUpload}
        />
      </Section>

      {/* ── 2. Basic Info ── */}
      <Section
        icon={FileText}
        title="Basic Info"
        subtitle="Role title and description"
        accentClass="bg-slate-50"
      >
        <div className="space-y-4">
          <div>
            <FieldLabel required>Job Title</FieldLabel>
            <Input
              className={inputCls}
              placeholder="e.g. Senior React Developer"
              {...register('title')}
            />
            <FieldError message={errors.title?.message} />
          </div>
          <div>
            <FieldLabel>Description</FieldLabel>
            <Textarea
              placeholder="Role overview, responsibilities, what you're looking for…"
              rows={4}
              className="text-[13.5px] font-medium text-slate-900 placeholder:text-slate-400 placeholder:font-normal border-slate-300 rounded-lg resize-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary transition-colors"
              {...register('description')}
            />
            <FieldError message={errors.description?.message} />
          </div>
        </div>
      </Section>

      {/* ── 3. Client & SPOC ── */}
      <Section
        icon={Building2}
        title="Client & SPOC"
        subtitle="Which client and point of contact?"
        accentClass="bg-blue-50"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mode === 'create' && (
              <div>
                <FieldLabel required>Client</FieldLabel>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue placeholder="Select client…" />
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

            <div>
              <FieldLabel required>SPOC</FieldLabel>
              <Controller
                control={control}
                name="clientSpocId"
                render={({ field }) => (
                  <Select
                    value={field.value || ''}
                    onValueChange={val => {
                      field.onChange(val);
                      setSelectedSpoc(spocs.find(s => s.id === val) ?? null);
                    }}
                    disabled={mode === 'create' && !selectedClientId}
                  >
                    <SelectTrigger className={selectTriggerCls}>
                      <SelectValue
                        placeholder={
                          mode === 'create' && !selectedClientId
                            ? 'Select client first'
                            : 'Select SPOC…'
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

          {selectedSpoc && (
            <div className="grid grid-cols-2 gap-4">
              <ReadonlyField label="Business Unit" value={selectedSpoc.businessUnit.name} />
              <ReadonlyField label="Service Line" value={selectedSpoc.serviceLine.name} />
            </div>
          )}
        </div>
      </Section>

      {/* ── 4. Job Details ── */}
      <Section
        icon={Briefcase}
        title="Job Details"
        subtitle="Type, location, openings and priority"
        accentClass="bg-emerald-50"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* jobType — FIX: was using undefined default, causing uncontrolled Select */}
            <div>
              <FieldLabel required>Job Type</FieldLabel>
              <Controller
                control={control}
                name="jobType"
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={val => field.onChange(val)}>
                    <SelectTrigger className={selectTriggerCls}>
                      <SelectValue placeholder="Select type…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONTRACT">Contract</SelectItem>
                      <SelectItem value="PERMANENT">Permanent</SelectItem>
                      <SelectItem value="CONTRACT_TO_HIRE">Contract to Hire</SelectItem>
                      <SelectItem value="FREELANCE">Freelance</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.jobType?.message} />
            </div>

            {/* remoteType — same fix */}
            <div>
              <FieldLabel required>Remote Type</FieldLabel>
              <Controller
                control={control}
                name="remoteType"
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={val => field.onChange(val)}>
                    <SelectTrigger className={selectTriggerCls}>
                      <SelectValue placeholder="Select mode…" />
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

            <div>
              <FieldLabel>Priority</FieldLabel>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={selectTriggerCls}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HIGH">🔴 High</SelectItem>
                      <SelectItem value="MEDIUM">🟡 Medium</SelectItem>
                      <SelectItem value="LOW">🟢 Low</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <FieldLabel>Openings</FieldLabel>
              <Input
                type="number"
                min={1}
                className={inputCls}
                {...register('totalOpenings', { valueAsNumber: true })}
              />
              <FieldError message={errors.totalOpenings?.message} />
            </div>
            <div>
              <FieldLabel>Location</FieldLabel>
              <div className="relative">
                <MapPin
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <Input
                  className={`${inputCls} pl-8`}
                  placeholder="e.g. Bengaluru"
                  {...register('location')}
                />
              </div>
            </div>
            <div>
              <FieldLabel>Country</FieldLabel>
              <Input className={inputCls} placeholder="e.g. India" {...register('country')} />
            </div>
          </div>
        </div>
      </Section>

      {/* ── 5. Experience & Salary ── */}
      <Section
        icon={DollarSign}
        title="Experience & Salary"
        subtitle="Compensation and experience band"
        accentClass="bg-amber-50"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Exp. Min (yrs)', name: 'experienceMin', placeholder: '0', step: 0.5 },
              { label: 'Exp. Max (yrs)', name: 'experienceMax', placeholder: '10', step: 0.5 },
              { label: 'Salary Min', name: 'salaryMin', placeholder: '0', step: 1 },
              { label: 'Salary Max', name: 'salaryMax', placeholder: '0', step: 1 },
            ].map(f => (
              <div key={f.name}>
                <FieldLabel>{f.label}</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  step={f.step}
                  placeholder={f.placeholder}
                  className={inputCls}
                  {...register(f.name as any, { valueAsNumber: true })}
                />
                <FieldError message={(errors as any)[f.name]?.message} />
              </div>
            ))}
          </div>

          <div className="w-full sm:w-1/4">
            <FieldLabel>Salary Type</FieldLabel>
            <Controller
              control={control}
              name="salaryType"
              render={({ field }) => (
                <Select
                  // FIX: field.value can be null — coerce to '' for Select's value prop
                  value={field.value ?? ''}
                  onValueChange={v => field.onChange(v || null)}
                >
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue placeholder="Select…" />
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
      </Section>

      {/* ── 6. Skills ── */}
      <Section
        icon={Tag}
        title="Skills"
        subtitle="Required skills for this role"
        accentClass="bg-rose-50"
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              className={`${inputCls} flex-1`}
              placeholder="Type a skill and press Enter…"
              value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSkill();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 px-4 shrink-0 font-semibold text-[13px]"
              onClick={addSkill}
            >
              <Plus size={14} className="mr-1" /> Add
            </Button>
          </div>
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {skills.map(s => (
                <span
                  key={s}
                  className="flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-1.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200"
                >
                  {s}
                  <button
                    type="button"
                    onClick={() => removeSkill(s)}
                    className="text-rose-400 hover:text-red-600 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* ── 7. Timeline ── */}
      <Section
        icon={Calendar}
        title="Timeline"
        subtitle="Start, end date and respond-by deadline"
        accentClass="bg-cyan-50"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Start Date', name: 'startDate' },
            { label: 'End Date', name: 'endDate' },
            { label: 'Respond By', name: 'respondBy' },
          ].map(f => (
            <div key={f.name}>
              <FieldLabel>{f.label}</FieldLabel>
              <Input type="date" className={inputCls} {...register(f.name as any)} />
              <FieldError message={(errors as any)[f.name]?.message} />
            </div>
          ))}
          <div>
            <FieldLabel>Turnaround (days)</FieldLabel>
            <Input
              type="number"
              min={1}
              placeholder="—"
              className={inputCls}
              {...register('turnaroundDays', { valueAsNumber: true })}
            />
            <FieldError message={errors.turnaroundDays?.message} />
          </div>
        </div>
      </Section>

      {/* ── Actions ── */}
      <div className="flex items-center justify-between pt-2 pb-10">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
          className="h-10 px-6 text-[13.5px] font-semibold border-slate-300 text-slate-700"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="h-10 px-8 text-[13.5px] font-bold bg-primary hover:bg-primary/90 gap-2 shadow-sm"
        >
          {isPending ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              {mode === 'create' ? 'Creating…' : 'Saving…'}
            </>
          ) : (
            <>{mode === 'create' ? '✓ Create Requirement' : '✓ Save Changes'}</>
          )}
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
