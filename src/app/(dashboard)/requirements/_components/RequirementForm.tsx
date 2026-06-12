/* eslint-disable react/no-unescaped-entities */
// File: RequirementForm.tsx
// Path: src/app/(dashboard)/requirements/_components/RequirementForm.tsx

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
  CheckCircle,
  Users,
  GraduationCap,
  Target,
  ChevronDown,
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
// SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

const schema = z.object({
  clientSpocId: z.string().min(1, 'SPOC is required'),
  title: z.string().min(1, 'Title is required').max(300).trim(),
  description: z.string().max(5000).optional().nullable(),

  jobType: z.enum(['CONTRACT', 'PERMANENT', 'CONTRACT_TO_HIRE', 'FREELANCE']),
  remoteType: z.enum(['ONSITE', 'REMOTE', 'HYBRID']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  jobOpenFor: z.enum(['EXTERNAL', 'INTERNAL', 'BOTH']).default('EXTERNAL'),

  totalOpenings: z.number().min(1).default(1),

  // location — split fields
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),

  experienceMin: z.number().min(0).optional().nullable(),
  experienceMax: z.number().min(0).optional().nullable(),

  salaryMin: z.number().min(0).optional().nullable(),
  salaryMax: z.number().min(0).optional().nullable(),
  salaryType: z.enum(['MONTHLY', 'ANNUAL', 'HOURLY', 'DAILY']).optional().nullable(),
  salaryCurrency: z.string().default('INR'),
  bonusAmount: z.number().min(0).optional().nullable(),
  hideSalaryFromCandidate: z.boolean().default(false),
  showMedianSalary: z.boolean().default(false),

  // skills — split into primary and key
  primarySkills: z.array(z.string().trim().min(1)).default([]),
  keySkills: z.array(z.string().trim().min(1)).default([]),

  education: z.string().max(300).optional().nullable(),
  functionalArea: z.string().max(200).optional().nullable(),
  shift: z.string().max(100).optional().nullable(),

  targetCompanies: z.array(z.string().trim().min(1)).default([]),
  noPoachCompanies: z.array(z.string().trim().min(1)).default([]),

  startDate: z.string().optional().nullable(),
  targetDate: z.string().optional().nullable(),
  respondBy: z.string().optional().nullable(),
  turnaroundDays: z.number().min(1).optional().nullable(),

  jdFileKey: z.string().optional().nullable(),
  jdFileName: z.string().optional().nullable(),
  jdFileType: z.string().optional().nullable(),

  // JD parse metadata — set by form after /jd/parse, not user-entered
  jdParsedAt: z.string().optional().nullable(),
  jdParseStatus: z.enum(['PARSED', 'FAILED', 'MANUALLY_OVERRIDDEN']).optional().nullable(),
  jdParsedFields: z.array(z.string()).default([]),
});

export type RequirementFormValues = z.infer<typeof schema>;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

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

interface ParsedJD {
  title: string | null;
  description: string | null;
  primarySkills: string[];
  keySkills: string[];
  experienceMin: number | null;
  experienceMax: number | null;
  education: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryType: 'MONTHLY' | 'ANNUAL' | 'HOURLY' | 'DAILY' | null;
  jobType: 'CONTRACT' | 'PERMANENT' | 'CONTRACT_TO_HIRE' | 'FREELANCE' | null;
  remoteType: 'ONSITE' | 'REMOTE' | 'HYBRID' | null;
  shift: string | null;
  functionalArea: string | null;
  targetCompanies: string[];
  noPoachCompanies: string[];
  bonusAmount: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// SHARED STYLES
// ─────────────────────────────────────────────────────────────────────────────

const inputCls =
  'h-10 text-[13.5px] font-medium text-slate-900 border-slate-300 bg-white placeholder:text-slate-400 placeholder:font-normal focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary rounded-lg transition-colors';

const selectTriggerCls =
  'h-10 text-[13.5px] font-medium text-slate-900 border-slate-300 bg-white focus:ring-2 focus:ring-primary/30 focus:border-primary rounded-lg transition-colors data-[placeholder]:text-slate-400 data-[placeholder]:font-normal';

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

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

function Section({
  icon: Icon,
  title,
  subtitle,
  accentClass,
  children,
  badge,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  accentClass: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className={`flex items-center gap-3 px-6 py-4 border-b border-slate-100 ${accentClass}`}>
        <div className="w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center shrink-0 shadow-sm border border-white/60">
          <Icon size={17} className="text-slate-700" />
        </div>
        <div className="flex-1">
          <h3 className="text-[13.5px] font-bold text-slate-900 leading-none tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11.5px] text-slate-500 mt-0.5 font-normal">{subtitle}</p>
          )}
        </div>
        {badge}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKILL TAG INPUT — reusable for primarySkills, keySkills, targetCompanies, noPoach
// ─────────────────────────────────────────────────────────────────────────────

function TagInput({
  values,
  onChange,
  placeholder,
  colorClass = 'bg-slate-100 text-slate-700 border-slate-200',
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

  function remove(s: string) {
    onChange(values.filter(x => x !== s));
  }

  return (
    <div className="space-y-2">
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
          className="h-10 px-4 shrink-0 font-semibold text-[13px]"
          onClick={add}
        >
          <Plus size={13} className="mr-1" /> Add
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map(s => (
            <span
              key={s}
              className={`flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full border ${colorClass}`}
            >
              {s}
              <button
                type="button"
                onClick={() => remove(s)}
                className="opacity-50 hover:opacity-100 transition-opacity"
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
// JD PARSER SECTION
// ─────────────────────────────────────────────────────────────────────────────

function JdParserSection({
  onParsed,
  onManualUpload,
  jdDisplayName,
  onRemoveJd,
  jdUploading,
  jdInputRef,
  onFileChange,
  isParsing,
  parseError,
  parsedAt,
}: {
  onParsed: (parsed: ParsedJD, fileName: string) => void;
  onManualUpload: () => void;
  jdDisplayName: string;
  onRemoveJd: () => void;
  jdUploading: boolean;
  jdInputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isParsing: boolean;
  parseError: string | null;
  parsedAt: string | null;
}) {
  return (
    <div className="space-y-3">
      {/* AI Parse zone */}
      <div className="relative rounded-xl border-2 border-dashed border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-5 overflow-hidden">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
            {isParsing ? (
              <Loader2 size={18} className="text-violet-600 animate-spin" />
            ) : (
              <Wand2 size={18} className="text-violet-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-[13px] font-bold text-violet-900 mb-0.5 flex items-center gap-1.5">
              <Sparkles size={12} className="text-violet-500" />
              AI-Powered JD Parser
            </h4>
            <p className="text-[12px] text-violet-700/70 leading-relaxed">
              {isParsing
                ? 'Extracting and parsing your JD with AI…'
                : parsedAt
                  ? `Parsed on ${new Date(parsedAt).toLocaleString()} — fields auto-filled below. Review and adjust.`
                  : "Upload a JD and we'll auto-fill title, skills, experience, salary, location and more."}
            </p>
            {!isParsing && !parsedAt && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {['Title', 'Primary skills', 'Experience', 'Salary', 'Location', 'Job type'].map(
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
            )}
            {parsedAt && (
              <div className="flex items-center gap-1.5 mt-2">
                <CheckCircle size={12} className="text-emerald-500" />
                <span className="text-[11px] text-emerald-700 font-semibold">
                  Fields auto-filled — you can still edit everything
                </span>
              </div>
            )}
            {parseError && (
              <p className="text-[11px] text-red-500 mt-1.5 flex items-center gap-1">
                <AlertCircle size={11} /> {parseError}
              </p>
            )}
          </div>
        </div>

        {/* Drop / parse zone */}
        <div className="mt-4">
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
              onClick={() => jdInputRef.current?.click()}
              disabled={isParsing || jdUploading}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-lg border-2 border-dashed border-violet-200 text-[13px] font-semibold text-violet-500 hover:border-violet-400 hover:text-violet-700 hover:bg-violet-50/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isParsing || jdUploading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Processing…
                </>
              ) : (
                <>
                  <Upload size={14} /> Drop JD here to auto-parse · PDF, DOC, DOCX
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  mode: 'create' | 'edit';
  defaultValues?: Partial<RequirementFormValues>;
  onSubmit: (data: RequirementFormValues) => Promise<void>;
  isPending: boolean;
  onCancel: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function RequirementForm({ mode, defaultValues, onSubmit, isPending, onCancel }: Props) {
  const axios = useAxios();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<RequirementFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      title: '',
      description: '',
      clientSpocId: '',
      priority: 'MEDIUM',
      jobOpenFor: 'EXTERNAL',
      salaryCurrency: 'INR',
      totalOpenings: 1,
      city: '',
      state: '',
      country: '',
      primarySkills: [],
      keySkills: [],
      targetCompanies: [],
      noPoachCompanies: [],
      jdParsedFields: [],
      hideSalaryFromCandidate: false,
      showMedianSalary: false,
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (defaultValues) reset(defaultValues as RequirementFormValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(defaultValues)]);

  // controlled array state — kept in sync with RHF via setValue
  const [primarySkills, setPrimarySkills] = useState<string[]>(defaultValues?.primarySkills ?? []);
  const [keySkills, setKeySkills] = useState<string[]>(defaultValues?.keySkills ?? []);
  const [targetCompanies, setTargetCompanies] = useState<string[]>(
    defaultValues?.targetCompanies ?? []
  );
  const [noPoachCompanies, setNoPoachCompanies] = useState<string[]>(
    defaultValues?.noPoachCompanies ?? []
  );

  useEffect(() => {
    setValue('primarySkills', primarySkills);
  }, [primarySkills]);
  useEffect(() => {
    setValue('keySkills', keySkills);
  }, [keySkills]);
  useEffect(() => {
    setValue('targetCompanies', targetCompanies);
  }, [targetCompanies]);
  useEffect(() => {
    setValue('noPoachCompanies', noPoachCompanies);
  }, [noPoachCompanies]);

  // client + spoc
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedSpoc, setSelectedSpoc] = useState<ClientSpoc | null>(null);

  // JD
  const [jdUploading, setJdUploading] = useState(false);
  const [jdDisplayName, setJdDisplayName] = useState(defaultValues?.jdFileName ?? '');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedAt, setParsedAt] = useState<string | null>(defaultValues?.jdParsedAt ?? null);
  const jdInputRef = useRef<HTMLInputElement>(null!);

  const hideSalary = watch('hideSalaryFromCandidate');
  const showMedian = watch('showMedianSalary');

  // ── queries ────────────────────────────────────────────────────────────────

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

  // ── JD parse (upload → extract → GPT → autofill) ──────────────────────────

  async function handleJdFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseError(null);

    try {
      // 1. parse via /jd/parse — returns ParsedJD + uploads to S3 inside the endpoint
      const fd = new FormData();
      fd.append('jd', file);

      const res = await axios.post<{
        success: boolean;
        data: ParsedJD;
        meta: { fileName: string; fileSizeBytes: number; charCount: number };
        jdFileKey: string;
        jdFileName: string;
        jdFileType: string;
      }>('/jd/parse', fd, { headers: { 'Content-Type': 'multipart/form-data' } });

      const parsed = res.data.data;
      const fileName = res.data.meta.fileName;

      // 2. store jd file fields (backend returns S3 key after upload)
      setValue('jdFileKey', res.data.jdFileKey ?? null);
      setValue('jdFileName', res.data.jdFileName ?? fileName);
      setValue('jdFileType', res.data.jdFileType ?? file.type);
      setJdDisplayName(res.data.jdFileName ?? fileName);

      // 3. autofill form fields — track which were filled
      const filled: string[] = [];

      function fill<K extends keyof RequirementFormValues>(
        field: K,
        val: RequirementFormValues[K] | null | undefined
      ) {
        if (val === null || val === undefined) return;
        // @ts-expect-error err
        setValue(field, val);
        filled.push(field as string);
      }

      fill('title', parsed.title);
      fill('description', parsed.description);
      fill('jobType', parsed.jobType);
      fill('remoteType', parsed.remoteType);
      fill('experienceMin', parsed.experienceMin as any);
      fill('experienceMax', parsed.experienceMax as any);
      fill('salaryMin', parsed.salaryMin as any);
      fill('salaryMax', parsed.salaryMax as any);
      fill('salaryType', parsed.salaryType);
      fill('education', parsed.education);
      fill('functionalArea', parsed.functionalArea);
      fill('shift', parsed.shift);
      fill('city', parsed.city);
      fill('state', parsed.state);
      fill('country', parsed.country);
      fill('bonusAmount', parsed.bonusAmount as any);

      // arrays
      if (parsed.primarySkills.length) {
        setPrimarySkills(parsed.primarySkills);
        filled.push('primarySkills');
      }
      if (parsed.keySkills.length) {
        setKeySkills(parsed.keySkills);
        filled.push('keySkills');
      }
      if (parsed.targetCompanies.length) {
        setTargetCompanies(parsed.targetCompanies);
        filled.push('targetCompanies');
      }
      if (parsed.noPoachCompanies.length) {
        setNoPoachCompanies(parsed.noPoachCompanies);
        filled.push('noPoachCompanies');
      }

      // parse metadata
      const now = new Date().toISOString();
      setValue('jdParsedAt', now);
      setValue('jdParseStatus', 'PARSED');
      setValue('jdParsedFields', filled);
      setParsedAt(now);

      toast.success(`JD parsed — ${filled.length} fields auto-filled`);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'JD parsing failed';
      setParseError(msg);
      setValue('jdParseStatus', 'FAILED');
      toast.error(msg);
    } finally {
      setIsParsing(false);
      if (jdInputRef.current) jdInputRef.current.value = '';
    }
  }

  function removeJd() {
    setValue('jdFileKey', null);
    setValue('jdFileName', null);
    setValue('jdFileType', null);
    setValue('jdParsedAt', null);
    setValue('jdParseStatus', null);
    setValue('jdParsedFields', []);
    setJdDisplayName('');
    setParsedAt(null);
    setParseError(null);
    if (jdInputRef.current) jdInputRef.current.value = '';
  }

  // ── submit ─────────────────────────────────────────────────────────────────

  async function handleFormSubmit(data: RequirementFormValues) {
    try {
      await onSubmit({
        ...data,
        startDate: toISOOrNull(data.startDate),
        targetDate: toISOOrNull(data.targetDate),
        respondBy: toISOOrNull(data.respondBy),
        primarySkills,
        keySkills,
        targetCompanies,
        noPoachCompanies,
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

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(handleFormSubmit as any)} className="space-y-5">
      {/* ── 1. JD Parser ── */}
      <Section
        icon={Sparkles}
        title="Job Description"
        subtitle="Upload JD — AI will auto-fill the form"
        accentClass="bg-gradient-to-r from-violet-50 to-indigo-50"
        badge={
          parsedAt ? (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
              <CheckCircle size={9} /> Parsed
            </span>
          ) : null
        }
      >
        <JdParserSection
          onParsed={() => {}}
          onManualUpload={() => jdInputRef.current?.click()}
          jdDisplayName={jdDisplayName}
          onRemoveJd={removeJd}
          jdUploading={jdUploading}
          jdInputRef={jdInputRef}
          onFileChange={handleJdFileChange}
          isParsing={isParsing}
          parseError={parseError}
          parsedAt={parsedAt}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <FieldLabel required>Job Type</FieldLabel>
              <Controller
                control={control}
                name="jobType"
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
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
            <div>
              <FieldLabel required>Remote Type</FieldLabel>
              <Controller
                control={control}
                name="remoteType"
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
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
            <div>
              <FieldLabel>Open For</FieldLabel>
              <Controller
                control={control}
                name="jobOpenFor"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={selectTriggerCls}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXTERNAL">External</SelectItem>
                      <SelectItem value="INTERNAL">Internal</SelectItem>
                      <SelectItem value="BOTH">Both</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
              <FieldLabel>City</FieldLabel>
              <div className="relative">
                <MapPin
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <Input
                  className={`${inputCls} pl-8`}
                  placeholder="e.g. Bengaluru"
                  {...register('city')}
                />
              </div>
            </div>
            <div>
              <FieldLabel>State</FieldLabel>
              <Input className={inputCls} placeholder="e.g. Karnataka" {...register('state')} />
            </div>
            <div>
              <FieldLabel>Country</FieldLabel>
              <Input className={inputCls} placeholder="e.g. India" {...register('country')} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <FieldLabel>Functional Area</FieldLabel>
              <Input
                className={inputCls}
                placeholder="e.g. Engineering"
                {...register('functionalArea')}
              />
            </div>
            <div>
              <FieldLabel>Shift</FieldLabel>
              <Input
                className={inputCls}
                placeholder="e.g. Morning / Flexible"
                {...register('shift')}
              />
            </div>
            <div>
              <FieldLabel>Education</FieldLabel>
              <Input
                className={inputCls}
                placeholder="e.g. B.Tech / B.E."
                {...register('education')}
              />
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
              { label: 'Exp. Min (yrs)', name: 'experienceMin', step: 0.5 },
              { label: 'Exp. Max (yrs)', name: 'experienceMax', step: 0.5 },
              { label: 'Salary Min', name: 'salaryMin', step: 1 },
              { label: 'Salary Max', name: 'salaryMax', step: 1 },
            ].map(f => (
              <div key={f.name}>
                <FieldLabel>{f.label}</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  step={f.step}
                  className={inputCls}
                  {...register(f.name as any, { valueAsNumber: true })}
                />
                <FieldError message={(errors as any)[f.name]?.message} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <FieldLabel>Salary Type</FieldLabel>
              <Controller
                control={control}
                name="salaryType"
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={v => field.onChange(v || null)}>
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
            <div>
              <FieldLabel>Currency</FieldLabel>
              <Controller
                control={control}
                name="salaryCurrency"
                render={({ field }) => (
                  <Select value={field.value ?? 'INR'} onValueChange={field.onChange}>
                    <SelectTrigger className={selectTriggerCls}>
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
              <FieldLabel>Bonus Amount</FieldLabel>
              <Input
                type="number"
                min={0}
                className={inputCls}
                placeholder="0"
                {...register('bonusAmount', { valueAsNumber: true })}
              />
            </div>
            <div className="flex flex-col gap-2 pt-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-primary focus:ring-primary/30"
                  {...register('hideSalaryFromCandidate')}
                />
                <span className="text-[12px] text-slate-600 font-medium">
                  Hide salary from candidate
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-primary focus:ring-primary/30"
                  {...register('showMedianSalary')}
                />
                <span className="text-[12px] text-slate-600 font-medium">Show median salary</span>
              </label>
            </div>
          </div>
        </div>
      </Section>

      {/* ── 6. Skills ── */}
      <Section
        icon={Tag}
        title="Skills"
        subtitle="Primary must-have skills and other key skills"
        accentClass="bg-rose-50"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <FieldLabel required>
              Primary Skills{' '}
              <span className="normal-case font-normal text-[10px] text-slate-400 ml-1">
                top 3–5 must-have
              </span>
            </FieldLabel>
            <TagInput
              values={primarySkills}
              onChange={setPrimarySkills}
              placeholder="Add primary skill…"
              colorClass="bg-rose-100 text-rose-800 border-rose-200"
            />
          </div>
          <div>
            <FieldLabel>
              Key Skills{' '}
              <span className="normal-case font-normal text-[10px] text-slate-400 ml-1">
                all other required skills
              </span>
            </FieldLabel>
            <TagInput
              values={keySkills}
              onChange={setKeySkills}
              placeholder="Add key skill…"
              colorClass="bg-slate-100 text-slate-700 border-slate-200"
            />
          </div>
        </div>
      </Section>

      {/* ── 7. Sourcing Strategy ── */}
      <Section
        icon={Target}
        title="Sourcing Strategy"
        subtitle="Target and no-poach companies"
        accentClass="bg-teal-50"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <FieldLabel>Target Companies</FieldLabel>
            <TagInput
              values={targetCompanies}
              onChange={setTargetCompanies}
              placeholder="e.g. Infosys, TCS…"
              colorClass="bg-teal-100 text-teal-800 border-teal-200"
            />
          </div>
          <div>
            <FieldLabel>No-Poach Companies</FieldLabel>
            <TagInput
              values={noPoachCompanies}
              onChange={setNoPoachCompanies}
              placeholder="e.g. Client name…"
              colorClass="bg-orange-100 text-orange-800 border-orange-200"
            />
          </div>
        </div>
      </Section>

      {/* ── 8. Timeline ── */}
      <Section
        icon={Calendar}
        title="Timeline"
        subtitle="Start, target date and respond-by deadline"
        accentClass="bg-cyan-50"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Start Date', name: 'startDate' },
            { label: 'Target Date', name: 'targetDate' },
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

// ─────────────────────────────────────────────────────────────────────────────
// detailToFormValues
// ─────────────────────────────────────────────────────────────────────────────

export function detailToFormValues(req: any): Partial<RequirementFormValues> {
  return {
    clientSpocId: req.clientSpoc?.id ?? '',
    title: req.title,
    description: req.description ?? '',
    jobType: req.jobType,
    remoteType: req.remoteType,
    priority: req.priority,
    jobOpenFor: req.jobOpenFor ?? 'EXTERNAL',
    totalOpenings: req.totalOpenings,
    city: req.city ?? '',
    state: req.state ?? '',
    country: req.country ?? '',
    primarySkills: req.primarySkills ?? [],
    keySkills: req.keySkills ?? [],
    targetCompanies: req.targetCompanies ?? [],
    noPoachCompanies: req.noPoachCompanies ?? [],
    salaryMin: req.salaryMin ?? undefined,
    salaryMax: req.salaryMax ?? undefined,
    salaryType: req.salaryType ?? undefined,
    salaryCurrency: req.salaryCurrency ?? 'INR',
    bonusAmount: req.bonusAmount ?? undefined,
    hideSalaryFromCandidate: req.hideSalaryFromCandidate ?? false,
    showMedianSalary: req.showMedianSalary ?? false,
    experienceMin: req.experienceMin ?? undefined,
    experienceMax: req.experienceMax ?? undefined,
    education: req.education ?? '',
    functionalArea: req.functionalArea ?? '',
    shift: req.shift ?? '',
    startDate: toDateInput(req.startDate),
    targetDate: toDateInput(req.targetDate),
    respondBy: toDateInput(req.respondBy),
    turnaroundDays: req.turnaroundDays ?? undefined,
    jdFileKey: req.jdFileKey ?? null,
    jdFileName: req.jdFileName ?? null,
    jdFileType: req.jdFileType ?? null,
    jdParsedAt: req.jdParsedAt ?? null,
    jdParseStatus: req.jdParseStatus ?? null,
    jdParsedFields: req.jdParsedFields ?? [],
  };
}
