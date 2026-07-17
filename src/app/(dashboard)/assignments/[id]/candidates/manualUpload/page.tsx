/* eslint-disable @typescript-eslint/no-explicit-any */
// File: page.tsx
// Path: src/app/(dashboard)/assignments/[id]/candidates/manualUpload/page.tsx

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  UserPlus,
  User,
  MapPin,
  Briefcase,
  GraduationCap,
  DollarSign,
  FileText,
  Plus,
  X,
  Check,
  Loader2,
  AlertCircle,
  Link as LinkIcon,
  UploadCloud,
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

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function coerceNumber(v: unknown): number | null {
  if (v === '' || v === undefined || v === null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}
const optionalNumber = z.preprocess(coerceNumber, z.number().min(0).optional().nullable());
const optionalYear = z.preprocess(
  coerceNumber,
  z.number().int().min(1900).max(2100).optional().nullable()
);

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

const experienceSchema = z.object({
  company: z.string().trim().min(1, 'Company is required'),
  role: z.string().trim().min(1, 'Role is required'),
  employmentType: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isCurrent: z.boolean().default(false),
  description: z.string().optional().nullable(),
});

const educationSchema = z.object({
  institution: z.string().trim().min(1, 'Institution is required'),
  degree: z.string().optional().nullable(),
  fieldOfStudy: z.string().optional().nullable(),
  startYear: optionalYear,
  endYear: optionalYear,
});

const schema = z
  .object({
    firstName: z.string().max(100).optional().nullable(),
    lastName: z.string().max(100).optional().nullable(),
    email: z.string().min(1, 'Email is required').email('Enter a valid email').trim(),
    phone: z.string().max(30).optional().nullable(),
    altPhone: z.string().max(30).optional().nullable(),

    linkedinUrl: z.string().optional().nullable(),
    githubUrl: z.string().optional().nullable(),
    portfolioUrl: z.string().optional().nullable(),
    otherUrl: z.string().optional().nullable(),

    currentSalary: optionalNumber,
    expectedSalary: optionalNumber,
    salaryCurrency: z.string().default('INR'),
    salaryType: z.enum(['MONTHLY', 'ANNUAL', 'HOURLY']).optional().nullable(),
    noticePeriodDays: optionalNumber,
    isImmediateJoiner: z.boolean().default(false),

    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    country: z.string().default('India'),

    skills: z.array(z.string().trim().min(1)).default([]),
    experiences: z.array(experienceSchema).default([]),
    educations: z.array(educationSchema).default([]),

    sourceNote: z.string().max(500).optional().nullable(),
  })
  .refine(v => !!(v.firstName?.trim() || v.lastName?.trim()), {
    message: 'Enter at least a first or last name',
    path: ['firstName'],
  });

type FormValues = z.infer<typeof schema>;

const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'FREELANCE'];

// minimal shape we read from GET /assignments/:id
interface AssignmentLite {
  data: {
    id: string;
    requirement: { id: string; reqCode: string; title: string };
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES (matched to requirements/new)
// ─────────────────────────────────────────────────────────────────────────────

const inputCls =
  'h-11 text-[14px] font-medium border-slate-200 bg-white placeholder:text-slate-400 placeholder:font-normal focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary rounded-xl transition-colors';
const selectCls =
  'h-11 text-[14px] font-medium border-slate-200 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-xl data-[placeholder]:text-slate-400';

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="text-[12px] text-red-500 mt-1.5 flex items-center gap-1">
      <AlertCircle size={11} />
      {msg}
    </p>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[13px] font-semibold text-slate-700 mb-2">
      {children}
      {required && <span className="text-red-400 ml-1">*</span>}
    </label>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
      {children}
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  label,
  color = 'bg-slate-100 text-slate-600',
}: {
  icon: React.ElementType;
  label: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 pb-1">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={15} />
      </div>
      <p className="text-[14px] font-bold text-slate-900">{label}</p>
    </div>
  );
}

function TagInput({
  values,
  onChange,
  placeholder,
  colorClass = 'bg-blue-50 text-blue-700 border-blue-200',
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  colorClass?: string;
}) {
  const [input, setInput] = useState('');
  function add() {
    const t = input.trim();
    if (!t || values.includes(t)) return;
    onChange([...values, t]);
    setInput('');
  }
  return (
    <div className="space-y-2.5">
      <div className="flex gap-2">
        <Input
          className={`${inputCls} flex-1`}
          placeholder={placeholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-11 px-4 shrink-0 rounded-xl border-slate-200"
          onClick={add}
        >
          <Plus size={14} />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map(s => (
            <span
              key={s}
              className={`flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-1.5 rounded-full border ${colorClass}`}
            >
              {s}
              <button
                type="button"
                onClick={() => onChange(values.filter(x => x !== s))}
                className="opacity-50 hover:opacity-100"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function ManualUploadCandidatePage() {
  const { id: assignmentId } = useParams<{ id: string }>();
  const axios = useAxios();
  const router = useRouter();
  const qc = useQueryClient();

  // Requirement context — fetched from the assignment (default axios base).
  const { data: assignment, isLoading: assignmentLoading } = useQuery({
    queryKey: ['assignment-detail', assignmentId],
    queryFn: async () => (await axios.get(`/assignments/${assignmentId}`)).data as AssignmentLite,
    enabled: !!assignmentId,
  });
  const req = assignment?.data?.requirement;

  const [resume, setResume] = useState<File | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      salaryCurrency: 'INR',
      country: 'India',
      isImmediateJoiner: false,
      skills: [],
      experiences: [],
      educations: [],
    },
  });

  const expArray = useFieldArray({ control, name: 'experiences' });
  const eduArray = useFieldArray({ control, name: 'educations' });

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!resume) throw new Error('__NO_RESUME__');

      const fullName = [values.firstName, values.lastName]
        .map(s => s?.trim())
        .filter(Boolean)
        .join(' ');

      const payload = {
        // requirement / assignment context
        assignmentId,
        requirementId: req?.id ?? null,
        reqCode: req?.reqCode ?? null,

        // personal
        fullName,
        firstName: values.firstName?.trim() || null,
        lastName: values.lastName?.trim() || null,
        email: values.email.trim(),
        phone: values.phone?.trim() || null,
        altPhone: values.altPhone?.trim() || null,

        // links
        linkedinUrl: values.linkedinUrl?.trim() || null,
        githubUrl: values.githubUrl?.trim() || null,
        portfolioUrl: values.portfolioUrl?.trim() || null,
        otherUrl: values.otherUrl?.trim() || null,

        // compensation / availability
        currentSalary: values.currentSalary ?? null,
        expectedSalary: values.expectedSalary ?? null,
        salaryCurrency: values.salaryCurrency || 'INR',
        salaryType: values.salaryType ?? null,
        noticePeriodDays: values.noticePeriodDays ?? null,
        isImmediateJoiner: values.isImmediateJoiner,

        sourceNote: values.sourceNote?.trim() || null,

        // nested — createCandidate accepts string skills directly
        skills: values.skills,
        locations:
          values.city?.trim() || values.state?.trim()
            ? [
                {
                  type: 'CURRENT',
                  city: values.city?.trim() || null,
                  state: values.state?.trim() || null,
                  country: values.country?.trim() || 'India',
                },
              ]
            : [],
        experiences: values.experiences.map(e => ({
          company: e.company.trim(),
          role: e.role.trim(),
          employmentType: e.employmentType || null,
          city: e.city?.trim() || null,
          state: e.state?.trim() || null,
          startDate: e.startDate || null,
          endDate: e.endDate || null,
          isCurrent: e.isCurrent,
          description: e.description?.trim() || null,
        })),
        educations: values.educations.map(ed => ({
          institution: ed.institution.trim(),
          degree: ed.degree?.trim() || null,
          fieldOfStudy: ed.fieldOfStudy?.trim() || null,
          startYear: ed.startYear ?? null,
          endYear: ed.endYear ?? null,
        })),
      };

      // multipart: one JSON blob (typed) + the resume file.
      const form = new FormData();
      form.append('data', JSON.stringify(payload));
      form.append('file', resume, resume.name);

      // Candidate service is behind the proxy — same config as resume ingest.
      return axios.post('/candidate/api/candidates/create', form, {
        baseURL: '/api/proxy',
        withCredentials: true,
        headers: { 'Content-Type': undefined },
        transformRequest: (d: any) => d,
      });
    },
    onSuccess: () => {
      toast.success('Candidate added');
      qc.invalidateQueries({ queryKey: ['assignment-pipeline', assignmentId] });
      router.push(`/assignments/${assignmentId}?tab=candidates`);
    },
    onError: (err: any) => {
      if (err?.message === '__NO_RESUME__') return toast.error('Resume file is required');
      const code = err?.response?.data?.code;
      const msg =
        err?.response?.data?.message ??
        (code === 'DUPLICATE_RESUME'
          ? 'This resume has already been ingested.'
          : 'Failed to add candidate');
      toast.error(msg);
    },
  });

  function onInvalid() {
    toast.error('Please fix the highlighted fields');
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0">
          <h1 className="text-[15px] font-bold text-slate-900 leading-none">Add Candidate</h1>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {assignmentLoading ? (
              'Loading requirement…'
            ) : req ? (
              <>
                <span className="font-semibold text-slate-500 font-mono">{req.reqCode}</span> ·{' '}
                {req.title}
              </>
            ) : (
              'Manual entry'
            )}
          </p>
        </div>
        <div className="ml-auto">
          <Button
            size="sm"
            className="h-8 text-[12px] font-bold bg-emerald-600 hover:bg-emerald-700 gap-1.5"
            onClick={handleSubmit(v => createMutation.mutate(v), onInvalid)}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Check size={13} />
                Add Candidate
              </>
            )}
          </Button>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(v => createMutation.mutate(v), onInvalid)}
        className="max-w-3xl mx-auto px-6 py-8 space-y-6"
      >
        {/* Personal */}
        <SectionCard>
          <SectionTitle icon={User} label="Personal" color="bg-slate-100 text-slate-600" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <FieldLabel required>First Name</FieldLabel>
              <Input
                className={`${inputCls} ${errors.firstName ? 'border-red-400' : ''}`}
                placeholder="First"
                {...register('firstName')}
              />
              <FieldError msg={errors.firstName?.message} />
            </div>

            <div>
              <FieldLabel>Last Name</FieldLabel>
              <Input className={inputCls} placeholder="Last" {...register('lastName')} />
            </div>
            <div>
              <FieldLabel required>Email</FieldLabel>
              <Input
                type="email"
                className={`${inputCls} ${errors.email ? 'border-red-400' : ''}`}
                placeholder="name@example.com"
                {...register('email')}
              />
              <FieldError msg={errors.email?.message} />
            </div>
            <div>
              <FieldLabel required>Phone</FieldLabel>
              <Input className={inputCls} placeholder="Phone" {...register('phone')} />
            </div>
            <div>
              <FieldLabel>Alternate Phone</FieldLabel>
              <Input className={inputCls} placeholder="Alternate" {...register('altPhone')} />
            </div>
          </div>
        </SectionCard>

        {/* Links */}
        <SectionCard>
          <SectionTitle icon={LinkIcon} label="Links" color="bg-blue-100 text-blue-600" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>LinkedIn</FieldLabel>
              <Input
                className={inputCls}
                placeholder="https://linkedin.com/in/…"
                {...register('linkedinUrl')}
              />
            </div>
            <div>
              <FieldLabel>GitHub</FieldLabel>
              <Input
                className={inputCls}
                placeholder="https://github.com/…"
                {...register('githubUrl')}
              />
            </div>
            <div>
              <FieldLabel>Portfolio</FieldLabel>
              <Input className={inputCls} placeholder="https://…" {...register('portfolioUrl')} />
            </div>
            <div>
              <FieldLabel>Other</FieldLabel>
              <Input className={inputCls} placeholder="https://…" {...register('otherUrl')} />
            </div>
          </div>
        </SectionCard>

        {/* Location */}
        <SectionCard>
          <SectionTitle icon={MapPin} label="Current Location" color="bg-teal-100 text-teal-600" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <FieldLabel>City</FieldLabel>
              <Input className={inputCls} placeholder="City" {...register('city')} />
            </div>
            <div>
              <FieldLabel>State</FieldLabel>
              <Input className={inputCls} placeholder="State" {...register('state')} />
            </div>
            <div>
              <FieldLabel>Country</FieldLabel>
              <Input className={inputCls} placeholder="Country" {...register('country')} />
            </div>
          </div>
        </SectionCard>

        {/* Skills */}
        <SectionCard>
          <SectionTitle icon={Briefcase} label="Skills" color="bg-emerald-100 text-emerald-600" />
          <Controller
            control={control}
            name="skills"
            render={({ field }) => (
              <TagInput
                values={field.value ?? []}
                onChange={field.onChange}
                placeholder="Add a skill and press Enter…"
                colorClass="bg-rose-50 text-rose-700 border-rose-200"
              />
            )}
          />
        </SectionCard>

        {/* Compensation */}
        <SectionCard>
          <SectionTitle
            icon={DollarSign}
            label="Compensation & Availability"
            color="bg-amber-100 text-amber-600"
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Current Salary</FieldLabel>
              <Input
                type="number"
                min={0}
                className={inputCls}
                placeholder="0"
                {...register('currentSalary')}
              />
            </div>
            <div>
              <FieldLabel>Expected Salary</FieldLabel>
              <Input
                type="number"
                min={0}
                className={inputCls}
                placeholder="0"
                {...register('expectedSalary')}
              />
            </div>
            <div>
              <FieldLabel>Currency</FieldLabel>
              <Controller
                control={control}
                name="salaryCurrency"
                render={({ field }) => (
                  <Select value={field.value ?? 'INR'} onValueChange={field.onChange}>
                    <SelectTrigger className={selectCls}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">₹ INR</SelectItem>
                      <SelectItem value="USD">$ USD</SelectItem>
                      <SelectItem value="GBP">£ GBP</SelectItem>
                      <SelectItem value="AED">AED</SelectItem>
                      <SelectItem value="SGD">SGD</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <FieldLabel>Salary Type</FieldLabel>
              <Controller
                control={control}
                name="salaryType"
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={v => field.onChange(v || null)}>
                    <SelectTrigger className={selectCls}>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="ANNUAL">Annual</SelectItem>
                      <SelectItem value="HOURLY">Hourly</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <FieldLabel>Notice Period (days)</FieldLabel>
              <Input
                type="number"
                min={0}
                className={inputCls}
                placeholder="0"
                {...register('noticePeriodDays')}
              />
            </div>
            <label className="flex items-end gap-2.5 pb-3 cursor-pointer select-none">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-primary focus:ring-primary/20"
                {...register('isImmediateJoiner')}
              />
              <span className="text-[13px] text-slate-600 font-medium">Immediate joiner</span>
            </label>
          </div>
        </SectionCard>

        {/* Experience */}
        <SectionCard>
          <SectionTitle icon={Briefcase} label="Experience" color="bg-indigo-100 text-indigo-600" />
          <div className="space-y-3">
            {expArray.fields.map((f, i) => (
              <div
                key={f.id}
                className="relative rounded-xl border border-slate-200 bg-slate-50/60 p-4"
              >
                <button
                  type="button"
                  onClick={() => expArray.remove(i)}
                  className="absolute right-3 top-3 text-[11px] font-medium text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-16">
                  <div>
                    <FieldLabel>Company</FieldLabel>
                    <Input className={inputCls} {...register(`experiences.${i}.company`)} />
                    <FieldError msg={errors.experiences?.[i]?.company?.message} />
                  </div>
                  <div>
                    <FieldLabel>Role</FieldLabel>
                    <Input className={inputCls} {...register(`experiences.${i}.role`)} />
                    <FieldError msg={errors.experiences?.[i]?.role?.message} />
                  </div>
                  <div>
                    <FieldLabel>Employment Type</FieldLabel>
                    <Controller
                      control={control}
                      name={`experiences.${i}.employmentType`}
                      render={({ field }) => (
                        <Select
                          value={field.value ?? ''}
                          onValueChange={v => field.onChange(v || null)}
                        >
                          <SelectTrigger className={selectCls}>
                            <SelectValue placeholder="Select…" />
                          </SelectTrigger>
                          <SelectContent>
                            {EMPLOYMENT_TYPES.map(t => (
                              <SelectItem key={t} value={t}>
                                {t.replace('_', ' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <FieldLabel>City</FieldLabel>
                    <Input className={inputCls} {...register(`experiences.${i}.city`)} />
                  </div>
                  <div>
                    <FieldLabel>Start Date</FieldLabel>
                    <Input
                      type="date"
                      className={inputCls}
                      {...register(`experiences.${i}.startDate`)}
                    />
                  </div>
                  <div>
                    <FieldLabel>End Date</FieldLabel>
                    <Input
                      type="date"
                      className={inputCls}
                      {...register(`experiences.${i}.endDate`)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel>Description</FieldLabel>
                    <Textarea
                      rows={2}
                      className="text-[14px] border-slate-200 rounded-xl resize-none focus-visible:ring-2 focus-visible:ring-primary/20"
                      {...register(`experiences.${i}.description`)}
                    />
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none sm:col-span-2">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-primary focus:ring-primary/20"
                      {...register(`experiences.${i}.isCurrent`)}
                    />
                    <span className="text-[13px] text-slate-600 font-medium">Current role</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl border-dashed border-slate-300 text-slate-500 gap-1.5"
            onClick={() =>
              expArray.append({
                company: '',
                role: '',
                employmentType: null,
                city: '',
                state: '',
                startDate: '',
                endDate: '',
                isCurrent: false,
                description: '',
              })
            }
          >
            <Plus size={13} /> Add experience
          </Button>
        </SectionCard>

        {/* Education */}
        <SectionCard>
          <SectionTitle
            icon={GraduationCap}
            label="Education"
            color="bg-purple-100 text-purple-600"
          />
          <div className="space-y-3">
            {eduArray.fields.map((f, i) => (
              <div
                key={f.id}
                className="relative rounded-xl border border-slate-200 bg-slate-50/60 p-4"
              >
                <button
                  type="button"
                  onClick={() => eduArray.remove(i)}
                  className="absolute right-3 top-3 text-[11px] font-medium text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pr-16">
                  <div className="sm:col-span-3">
                    <FieldLabel required>Institution</FieldLabel>
                    <Input className={inputCls} {...register(`educations.${i}.institution`)} />
                    <FieldError msg={errors.educations?.[i]?.institution?.message} />
                  </div>
                  <div>
                    <FieldLabel>Degree</FieldLabel>
                    <Input className={inputCls} {...register(`educations.${i}.degree`)} />
                  </div>
                  <div>
                    <FieldLabel>Field of Study</FieldLabel>
                    <Input className={inputCls} {...register(`educations.${i}.fieldOfStudy`)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Start Yr</FieldLabel>
                      <Input
                        type="number"
                        className={inputCls}
                        {...register(`educations.${i}.startYear`)}
                      />
                    </div>
                    <div>
                      <FieldLabel>End Yr</FieldLabel>
                      <Input
                        type="number"
                        className={inputCls}
                        {...register(`educations.${i}.endYear`)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl border-dashed border-slate-300 text-slate-500 gap-1.5"
            onClick={() =>
              eduArray.append({
                institution: '',
                degree: '',
                fieldOfStudy: '',
                startYear: null,
                endYear: null,
              })
            }
          >
            <Plus size={13} /> Add education
          </Button>
        </SectionCard>

        {/* Resume */}
        <SectionCard>
          <SectionTitle icon={FileText} label="Resume" color="bg-violet-100 text-violet-600" />
          <label
            className={`cursor-pointer flex flex-col items-center gap-2 py-8 px-6 border-2 border-dashed rounded-xl transition-all ${
              resume
                ? 'border-emerald-300 bg-emerald-50/40'
                : 'border-violet-200 hover:border-violet-400 hover:bg-violet-50/50'
            }`}
          >
            <input
              type="file"
              accept=".pdf,.doc,.docx,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/rtf,text/rtf"
              className="hidden"
              onChange={e => setResume(e.target.files?.[0] ?? null)}
            />
            <UploadCloud size={26} className={resume ? 'text-emerald-500' : 'text-violet-400'} />
            {resume ? (
              <p className="text-[13px] font-semibold text-emerald-700">
                {resume.name} · {(resume.size / 1024).toFixed(0)} KB
              </p>
            ) : (
              <>
                <p className="text-[14px] font-semibold text-violet-600">Click to upload resume</p>
                <p className="text-[12px] text-slate-400">PDF, DOC, DOCX or RTF · max 20MB</p>
              </>
            )}
          </label>
          <div>
            <FieldLabel>Source Note</FieldLabel>
            <Input
              className={inputCls}
              placeholder="e.g. Referral from internal team"
              {...register('sourceNote')}
            />
          </div>
        </SectionCard>

        {/* Submit */}
        <div className="pb-16 flex justify-end">
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="h-11 px-10 font-bold rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-sm"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <UserPlus size={15} />
                Add Candidate
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
