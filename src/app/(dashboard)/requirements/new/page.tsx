/* eslint-disable @typescript-eslint/no-explicit-any */
// File: page.tsx
// Path: src/app/(dashboard)/requirements/new/page.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  X,
  FileText,
  Plus,
  Loader2,
  Wand2,
  AlertCircle,
  Briefcase,
  MapPin,
  CheckCircle,
  Search,
  Users,
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
import { useRequirementDraftStore } from '@/stores/useRequirementDraftStore';

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

const schema = z.object({
  clientSpocId: z.string().min(1, 'SPOC is required'),
  title: z.string().min(1, 'Title is required').max(300).trim(),
  description: z.string().max(5000).optional().nullable(),
  jobType: z.enum(['CONTRACT', 'PERMANENT', 'CONTRACT_TO_HIRE', 'FREELANCE'], {
    errorMap: () => ({ message: 'Job type is required' }),
  }),
  remoteType: z.enum(['ONSITE', 'REMOTE', 'HYBRID'], {
    errorMap: () => ({ message: 'Remote type is required' }),
  }),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  jobOpenFor: z.enum(['EXTERNAL', 'INTERNAL', 'BOTH']).default('EXTERNAL'),
  totalOpenings: z.number().min(1).default(1),
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
  jdParsedAt: z.string().optional().nullable(),
  jdParseStatus: z.enum(['PARSED', 'FAILED', 'MANUALLY_OVERRIDDEN']).optional().nullable(),
  jdParsedFields: z.array(z.string()).default([]),
  parsedJDId: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

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
interface LibraryResult {
  id: string;
  title: string;
  usageCount: number;
  parsedAt: string;
  parsedBy: { firstName: string; lastName: string };
  primarySkills: string[];
  experienceMin: number | null;
  experienceMax: number | null;
  jobType: string | null;
  remoteType: string | null;
  city: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function toISOOrNull(v?: string | null) {
  if (!v) return null;
  try {
    return new Date(v).toISOString();
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEPS CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Job Information', sub: 'Title, type, location' },
  { id: 2, label: 'Skills & Details', sub: 'Skills, experience, education' },
  { id: 3, label: 'Compensation', sub: 'Salary, bonus, currency' },
  { id: 4, label: 'Client & SPOC', sub: 'Client, point of contact' },
  { id: 5, label: 'Timeline', sub: 'Dates and deadlines' },
];

// Fields to validate per step — used for per-step validation on Next click
const STEP_FIELDS: Record<number, (keyof FormValues)[]> = {
  1: ['title', 'jobType', 'remoteType'],
  2: [],
  3: [],
  4: ['clientSpocId'],
  5: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED STYLES
// ─────────────────────────────────────────────────────────────────────────────

const inputCls =
  'h-12 text-[14px] font-medium border-slate-200 bg-white placeholder:text-slate-400 placeholder:font-normal focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary rounded-xl transition-colors';
const selectCls =
  'h-12 text-[14px] font-medium border-slate-200 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-xl data-[placeholder]:text-slate-400';

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
          className="h-12 px-5 shrink-0 font-semibold rounded-xl border-slate-200"
          onClick={add}
        >
          <Plus size={14} className="mr-1" /> Add
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
// JD LIBRARY SEARCH
// ─────────────────────────────────────────────────────────────────────────────

function JDLibrarySearch({
  onSelect,
  onUpload,
  isParsing,
  parsedTitle,
}: {
  onSelect: (id: string) => void;
  onUpload: () => void;
  isParsing: boolean;
  parsedTitle: string | null;
}) {
  const axios = useAxios();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['jd-library', q],
    queryFn: async () =>
      (await axios.get(`/jd/library/search?q=${encodeURIComponent(q)}&limit=8`)).data
        ?.data as LibraryResult[],
    staleTime: 30_000,
  });

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <FieldLabel>Search JD Library</FieldLabel>
        <div className="relative" ref={ref}>
          <Search
            size={15}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10"
          />
          <input
            className="w-full h-12 pl-10 pr-4 text-[14px] font-medium border border-slate-200 rounded-xl bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            placeholder="Search previously parsed JDs…"
            value={q}
            onChange={e => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
          {open && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-slate-400">
                  <Loader2 size={16} className="animate-spin mr-2" /> Searching…
                </div>
              ) : !data?.length ? (
                <div className="py-6 text-center text-[13px] text-slate-400">
                  {q ? 'No matches found' : 'Start typing to search the library'}
                </div>
              ) : (
                data.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelect(item.id);
                      setOpen(false);
                      setQ(item.title);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold text-slate-900 truncate">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {item.primarySkills.slice(0, 3).map(s => (
                            <span
                              key={s}
                              className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium"
                            >
                              {s}
                            </span>
                          ))}
                          {item.experienceMin != null && (
                            <span className="text-[11px] text-slate-400">
                              {item.experienceMin}–{item.experienceMax}y
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Users size={10} /> {item.usageCount} used
                        </span>
                        <span className="text-[10px] text-slate-300 mt-0.5 block">
                          by {item.parsedBy.firstName}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        {parsedTitle && (
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-emerald-600 font-medium">
            <CheckCircle size={12} /> Using: {parsedTitle}
          </p>
        )}
      </div>

      <div>
        <FieldLabel>Or Upload JD to Parse with AI</FieldLabel>
        <button
          type="button"
          onClick={onUpload}
          disabled={isParsing}
          className="w-full h-12 flex items-center justify-center gap-2.5 border-2 border-dashed border-violet-200 rounded-xl text-[14px] font-semibold text-violet-500 hover:border-violet-400 hover:text-violet-700 hover:bg-violet-50/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isParsing ? (
            <>
              <Loader2 size={15} className="animate-spin text-violet-500" /> Parsing with AI…
            </>
          ) : (
            <>
              <Wand2 size={15} className="text-violet-500" /> Upload PDF / DOC / DOCX
            </>
          )}
        </button>
        <p className="mt-2 text-[11.5px] text-slate-400">
          AI extracts title, skills, salary, location — auto-fills the form and saves to library
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP PANEL WRAPPER
// ─────────────────────────────────────────────────────────────────────────────

function StepPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-[26px] font-bold text-slate-900 leading-tight">{title}</h2>
        <p className="text-[14px] text-slate-500 mt-1">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function NewRequirementPage() {
  const axios = useAxios();
  const router = useRouter();

  // ── Zustand draft store ────────────────────────────────────────────────────
  const { draft, setDraft, setStep, markStepComplete, clearDraft, hasDraft } =
    useRequirementDraftStore();

  const step = draft.currentStep;
  const completedSteps = new Set(draft.completedSteps);
  const primarySkills = draft.primarySkills;
  const keySkills = draft.keySkills;
  const targetCompanies = draft.targetCompanies;
  const noPoachCompanies = draft.noPoachCompanies;
  const parsedTitle = draft.parsedTitle;
  const selectedClientId = draft.selectedClientId;

  // transient UI state
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [selectedSpoc, setSelectedSpoc] = useState<ClientSpoc | null>(null);
  const jdInputRef = useRef<HTMLInputElement>(null!);

  // ── RHF ───────────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    reset,
    trigger,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      priority: 'MEDIUM',
      jobOpenFor: 'EXTERNAL',
      salaryCurrency: 'INR',
      totalOpenings: 1,
      primarySkills: [],
      keySkills: [],
      targetCompanies: [],
      noPoachCompanies: [],
      jdParsedFields: [],
    },
  });

  // ── Hydrate from draft on mount ───────────────────────────────────────────
  useEffect(() => {
    if (!draft.title && !draft.jobType) return;
    setValue('title', draft.title);
    setValue('description', draft.description);
    setValue('jobType', draft.jobType as any);
    setValue('remoteType', draft.remoteType as any);
    setValue('priority', draft.priority as any);
    setValue('jobOpenFor', draft.jobOpenFor as any);
    setValue('totalOpenings', draft.totalOpenings);
    setValue('city', draft.city);
    setValue('state', draft.state);
    setValue('country', draft.country);
    setValue('functionalArea', draft.functionalArea);
    setValue('shift', draft.shift);
    setValue('education', draft.education);
    setValue('salaryMin', draft.salaryMin as any);
    setValue('salaryMax', draft.salaryMax as any);
    setValue('salaryType', draft.salaryType as any);
    setValue('salaryCurrency', draft.salaryCurrency);
    setValue('bonusAmount', draft.bonusAmount as any);
    setValue('hideSalaryFromCandidate', draft.hideSalaryFromCandidate);
    setValue('showMedianSalary', draft.showMedianSalary);
    setValue('clientSpocId', draft.clientSpocId);
    setValue('startDate', draft.startDate);
    setValue('targetDate', draft.targetDate);
    setValue('respondBy', draft.respondBy);
    setValue('turnaroundDays', draft.turnaroundDays as any);
    setValue('jdFileKey', draft.jdFileKey);
    setValue('jdFileName', draft.jdFileName);
    setValue('jdFileType', draft.jdFileType);
    setValue('jdParsedAt', draft.jdParsedAt);
    setValue('jdParseStatus', draft.jdParseStatus as any);
    setValue('jdParsedFields', draft.jdParsedFields);
    setValue('parsedJDId', draft.parsedJDId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync arrays → RHF ─────────────────────────────────────────────────────
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

  // ── Store-synced setters ───────────────────────────────────────────────────
  function setPrimarySkills(v: string[]) {
    setDraft({ primarySkills: v });
  }
  function setKeySkills(v: string[]) {
    setDraft({ keySkills: v });
  }
  function setTargetCompanies(v: string[]) {
    setDraft({ targetCompanies: v });
  }
  function setNoPoachCompanies(v: string[]) {
    setDraft({ noPoachCompanies: v });
  }
  function setParsedTitle(v: string | null) {
    setDraft({ parsedTitle: v });
  }
  function setSelectedClientIdInStore(id: string) {
    setDraft({ selectedClientId: id });
  }

  // ── Snapshot RHF → store ──────────────────────────────────────────────────
  function snapshotToStore() {
    const v = getValues();
    setDraft({
      title: v.title ?? '',
      description: v.description ?? '',
      jobType: v.jobType ?? '',
      remoteType: v.remoteType ?? '',
      priority: v.priority ?? 'MEDIUM',
      jobOpenFor: v.jobOpenFor ?? 'EXTERNAL',
      totalOpenings: v.totalOpenings ?? 1,
      city: v.city ?? '',
      state: v.state ?? '',
      country: v.country ?? '',
      functionalArea: v.functionalArea ?? '',
      shift: v.shift ?? '',
      education: v.education ?? '',
      salaryMin: v.salaryMin ?? null,
      salaryMax: v.salaryMax ?? null,
      salaryType: v.salaryType ?? '',
      salaryCurrency: v.salaryCurrency ?? 'INR',
      bonusAmount: v.bonusAmount ?? null,
      hideSalaryFromCandidate: v.hideSalaryFromCandidate ?? false,
      showMedianSalary: v.showMedianSalary ?? false,
      clientSpocId: v.clientSpocId ?? '',
      startDate: v.startDate ?? '',
      targetDate: v.targetDate ?? '',
      respondBy: v.respondBy ?? '',
      turnaroundDays: v.turnaroundDays ?? null,
      jdFileKey: v.jdFileKey ?? null,
      jdFileName: v.jdFileName ?? null,
      jdFileType: v.jdFileType ?? null,
      jdParsedAt: v.jdParsedAt ?? null,
      jdParseStatus: v.jdParseStatus ?? null,
      jdParsedFields: v.jdParsedFields ?? [],
      parsedJDId: v.parsedJDId ?? null,
    });
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  async function goNext() {
    const fields = STEP_FIELDS[step] ?? [];
    if (fields.length > 0) {
      const valid = await trigger(fields as any);
      if (!valid) {
        // collect friendly messages
        const msgs = fields.map(f => (errors as any)[f]?.message).filter(Boolean);
        toast.error(msgs[0] ?? `Fix errors in "${STEPS[step - 1].label}" before continuing`, {
          description: msgs.length > 1 ? `${msgs.length} fields need attention` : undefined,
        });
        return;
      }
    }
    snapshotToStore();
    markStepComplete(step);
    setStep(Math.min(step + 1, STEPS.length));
  }

  function goPrev() {
    snapshotToStore();
    setStep(Math.max(step - 1, 1));
  }

  // ── Clear draft ────────────────────────────────────────────────────────────
  function handleClearDraft() {
    if (!confirm('Clear draft? All unsaved progress will be lost.')) return;
    clearDraft();
    reset({
      priority: 'MEDIUM',
      jobOpenFor: 'EXTERNAL',
      salaryCurrency: 'INR',
      totalOpenings: 1,
      primarySkills: [],
      keySkills: [],
      targetCompanies: [],
      noPoachCompanies: [],
      jdParsedFields: [],
    });
    setSelectedSpoc(null);
  }

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: clientsRes } = useQuery<{ data: MyClient[] }>({
    queryKey: ['my-clients'],
    queryFn: async () => (await axios.get('/clients/mine')).data,
    staleTime: 60_000,
    refetchOnMount: true,
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
    setDraft({ clientSpocId: '' });
  }, [selectedClientId]);

  // ── JD parse ───────────────────────────────────────────────────────────────
  async function handleJdFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsing(true);
    setParseError(null);

    try {
      const fd = new FormData();
      fd.append('jd', file);
      const res = await axios.post('/jd/parse', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const parsed = res.data.data;
      const fileName = res.data.meta.fileName;

      const filled: string[] = [];
      function fill<K extends keyof FormValues>(field: K, val: any) {
        if (val == null) return;
        setValue(field, val);
        filled.push(field as string);
      }

      fill('title', parsed.title);
      fill('description', parsed.description);
      fill('jobType', parsed.jobType);
      fill('remoteType', parsed.remoteType);
      fill('experienceMin', parsed.experienceMin);
      fill('experienceMax', parsed.experienceMax);
      fill('salaryMin', parsed.salaryMin);
      fill('salaryMax', parsed.salaryMax);
      fill('salaryType', parsed.salaryType);
      fill('education', parsed.education);
      fill('functionalArea', parsed.functionalArea);
      fill('shift', parsed.shift);
      fill('city', parsed.city);
      fill('state', parsed.state);
      fill('country', parsed.country);
      fill('bonusAmount', parsed.bonusAmount);

      if (parsed.primarySkills?.length) {
        setPrimarySkills(parsed.primarySkills);
        filled.push('primarySkills');
      }
      if (parsed.keySkills?.length) {
        setKeySkills(parsed.keySkills);
        filled.push('keySkills');
      }
      if (parsed.targetCompanies?.length) {
        setTargetCompanies(parsed.targetCompanies);
        filled.push('targetCompanies');
      }
      if (parsed.noPoachCompanies?.length) {
        setNoPoachCompanies(parsed.noPoachCompanies);
        filled.push('noPoachCompanies');
      }

      const now = new Date().toISOString();
      setValue('jdFileKey', res.data.jdFileKey ?? null);
      setValue('jdFileName', res.data.jdFileName ?? fileName);
      setValue('jdFileType', res.data.jdFileType ?? file.type);
      setValue('jdParsedAt', now);
      setValue('jdParseStatus', 'PARSED');
      setValue('jdParsedFields', filled);
      setParsedTitle(parsed.title ?? fileName);

      axios
        .post('/jd/library', {
          title: parsed.title ?? fileName,
          parsedData: parsed,
          jdFileKey: res.data.jdFileKey,
          jdFileName: res.data.jdFileName ?? fileName,
          jdFileType: res.data.jdFileType ?? file.type,
        })
        .then(libRes => {
          const libId = libRes.data.data?.id ?? null;
          setValue('parsedJDId', libId);
          setDraft({ parsedJDId: libId });
        })
        .catch(() => {});

      snapshotToStore();
      setDraft({
        jdFileName: res.data.jdFileName ?? fileName,
        jdParsedAt: now,
        jdParseStatus: 'PARSED',
        jdParsedFields: filled,
      });

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

  // ── Use from library ───────────────────────────────────────────────────────
  async function handleLibrarySelect(id: string) {
    try {
      const res = await axios.post(`/jd/library/${id}/use`);
      const parsed = res.data.data as any;

      function fill<K extends keyof FormValues>(field: K, val: any) {
        if (val == null) return;
        setValue(field, val);
      }

      fill('title', parsed.title);
      fill('description', parsed.description);
      fill('jobType', parsed.jobType);
      fill('remoteType', parsed.remoteType);
      fill('experienceMin', parsed.experienceMin);
      fill('experienceMax', parsed.experienceMax);
      fill('salaryMin', parsed.salaryMin);
      fill('salaryMax', parsed.salaryMax);
      fill('salaryType', parsed.salaryType);
      fill('education', parsed.education);
      fill('functionalArea', parsed.functionalArea);
      fill('shift', parsed.shift);
      fill('city', parsed.city);
      fill('state', parsed.state);
      fill('country', parsed.country);
      fill('bonusAmount', parsed.bonusAmount);

      if (parsed.primarySkills?.length) setPrimarySkills(parsed.primarySkills);
      if (parsed.keySkills?.length) setKeySkills(parsed.keySkills);
      if (parsed.targetCompanies?.length) setTargetCompanies(parsed.targetCompanies);
      if (parsed.noPoachCompanies?.length) setNoPoachCompanies(parsed.noPoachCompanies);

      setValue('parsedJDId', id);
      setValue('jdParseStatus', 'PARSED');
      setParsedTitle(parsed.title);

      snapshotToStore();
      setDraft({ parsedJDId: id, parsedTitle: parsed.title, jdParseStatus: 'PARSED' });

      toast.success('Form prefilled from library');
    } catch {
      toast.error('Failed to load from library');
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => (await axios.post('/requirements', data)).data,
    onSuccess: res => {
      clearDraft();
      toast.success('Requirement created successfully');
      router.push(`/requirements/${res.data?.id ?? ''}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Something went wrong');
    },
  });

  async function handleFinalSubmit() {
    snapshotToStore();

    // run full validation
    const valid = await trigger();
    if (!valid) {
      // find which step has the first error and jump there
      for (let s = 1; s <= STEPS.length; s++) {
        const stepFields = STEP_FIELDS[s] ?? [];
        const hasError = stepFields.some(f => (errors as any)[f]);
        if (hasError) {
          setStep(s);
          const firstMsg = stepFields.map(f => (errors as any)[f]?.message).filter(Boolean)[0];
          toast.error(firstMsg ?? `Fix errors in "${STEPS[s - 1].label}"`, {
            description: `Jumped to step ${s} — ${STEPS[s - 1].label}`,
          });
          return;
        }
      }
      // fallback — errors exist but not mapped to a step (shouldn't happen)
      toast.error('Please fix all errors before submitting');
      return;
    }

    const data = getValues();
    await createMutation.mutateAsync({
      ...data,
      startDate: toISOOrNull(data.startDate),
      targetDate: toISOOrNull(data.targetDate),
      respondBy: toISOOrNull(data.respondBy),
      primarySkills,
      keySkills,
      targetCompanies,
      noPoachCompanies,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-[15px] font-bold text-slate-900 leading-none">Create A Job</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Step {step} of {STEPS.length}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {draft.lastSavedAt && (
            <span className="text-[11px] text-slate-400 hidden sm:block">
              Saved{' '}
              {new Date(draft.lastSavedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
          {hasDraft() && (
            <button
              type="button"
              onClick={handleClearDraft}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
            >
              <X size={12} /> Clear Draft
            </button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[12px] font-semibold border-slate-200 text-slate-500"
            onClick={() => {
              snapshotToStore();
              toast.success('Draft saved');
            }}
            disabled={createMutation.isPending}
          >
            Save as Draft
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left stepper sidebar ── */}
        <aside className="hidden lg:flex w-[260px] shrink-0 flex-col border-r border-slate-200 bg-white pt-8 pb-6 px-5">
          <div className="space-y-1">
            {STEPS.map((s, i) => {
              const isDone = completedSteps.has(s.id);
              const isCurrent = step === s.id;
              const isLocked = !isDone && !isCurrent && s.id > step;
              // check if this step has any validation errors
              const stepFields = STEP_FIELDS[s.id] ?? [];
              const hasStepError = stepFields.some(f => (errors as any)[f]);
              return (
                <div key={s.id}>
                  <button
                    onClick={() => !isLocked && setStep(s.id)}
                    disabled={isLocked}
                    className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-xl text-left transition-all ${
                      isCurrent
                        ? 'bg-primary/[0.08] border border-primary/20'
                        : isDone
                          ? 'hover:bg-slate-50 cursor-pointer'
                          : 'opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold transition-all ${
                        hasStepError
                          ? 'bg-red-500 text-white'
                          : isDone
                            ? 'bg-emerald-500 text-white'
                            : isCurrent
                              ? 'bg-primary text-white shadow-md shadow-primary/30'
                              : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {hasStepError ? (
                        <AlertCircle size={15} />
                      ) : isDone ? (
                        <Check size={15} />
                      ) : (
                        s.id
                      )}
                    </div>
                    <div>
                      <p
                        className={`text-[13.5px] font-semibold leading-none ${
                          hasStepError
                            ? 'text-red-600'
                            : isCurrent
                              ? 'text-primary'
                              : isDone
                                ? 'text-slate-700'
                                : 'text-slate-400'
                        }`}
                      >
                        {s.label}
                      </p>
                      <p
                        className={`text-[11px] mt-0.5 ${
                          hasStepError
                            ? 'text-red-400'
                            : isCurrent
                              ? 'text-primary/60'
                              : 'text-slate-400'
                        }`}
                      >
                        {hasStepError
                          ? 'Has errors'
                          : isCurrent
                            ? 'In Progress'
                            : isDone
                              ? 'Completed'
                              : 'Pending'}
                      </p>
                    </div>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`ml-7 my-0.5 w-px h-5 ${isDone ? 'bg-emerald-300' : 'bg-slate-200'}`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* JD status widget */}
          <div className="mt-auto pt-6 border-t border-slate-100">
            <div
              className={`rounded-xl p-3 ${parsedTitle ? 'bg-emerald-50 border border-emerald-100' : 'bg-violet-50 border border-violet-100'}`}
            >
              {parsedTitle ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                    <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
                      JD Loaded
                    </p>
                  </div>
                  <p className="text-[12px] text-emerald-700 font-medium truncate">{parsedTitle}</p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={13} className="text-violet-500 shrink-0" />
                    <p className="text-[11px] font-bold text-violet-700 uppercase tracking-wide">
                      AI Parser
                    </p>
                  </div>
                  <p className="text-[12px] text-violet-600">
                    Upload a JD or search the library to auto-fill
                  </p>
                </>
              )}
            </div>
          </div>
        </aside>

        {/* ── Main form area ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-8 py-10">
            <input
              ref={jdInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={handleJdFile}
            />

            <form
              onSubmit={e => {
                e.preventDefault();
                handleFinalSubmit();
              }}
              className="space-y-10"
            >
              {/* ── STEP 1 ── */}
              {step === 1 && (
                <StepPanel
                  title="Job Information"
                  subtitle="Start by searching the JD library or uploading a new JD to auto-fill"
                >
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-5">
                      <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                        <Sparkles size={15} className="text-violet-600" />
                      </div>
                      <div>
                        <p className="text-[13.5px] font-bold text-slate-900">Job Description</p>
                        <p className="text-[11.5px] text-slate-500">
                          Search library first — no AI cost. Upload only if not found.
                        </p>
                      </div>
                    </div>
                    <JDLibrarySearch
                      onSelect={handleLibrarySelect}
                      onUpload={() => jdInputRef.current?.click()}
                      isParsing={isParsing}
                      parsedTitle={parsedTitle}
                    />
                    {parseError && (
                      <p className="mt-3 text-[12px] text-red-500 flex items-center gap-1">
                        <AlertCircle size={11} /> {parseError}
                      </p>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <FileText size={15} className="text-slate-600" />
                      </div>
                      <p className="text-[13.5px] font-bold text-slate-900">Basic Info</p>
                    </div>
                    <div>
                      <FieldLabel required>Job Title</FieldLabel>
                      <Input
                        className={`${inputCls} ${errors.title ? 'border-red-400 focus-visible:ring-red-200' : ''}`}
                        placeholder="e.g. Senior React Developer"
                        {...register('title')}
                      />
                      <FieldError msg={errors.title?.message} />
                    </div>
                    <div>
                      <FieldLabel>Description</FieldLabel>
                      <Textarea
                        placeholder="Role overview, responsibilities, what you're looking for…"
                        rows={5}
                        className="text-[14px] font-medium border-slate-200 rounded-xl resize-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-colors"
                        {...register('description')}
                      />
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                        <Briefcase size={15} className="text-emerald-600" />
                      </div>
                      <p className="text-[13.5px] font-bold text-slate-900">Job Details</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FieldLabel required>Job Type</FieldLabel>
                        <Controller
                          control={control}
                          name="jobType"
                          render={({ field }) => (
                            <Select value={field.value ?? ''} onValueChange={field.onChange}>
                              <SelectTrigger
                                className={`${selectCls} ${errors.jobType ? 'border-red-400' : ''}`}
                              >
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
                        <FieldError msg={errors.jobType?.message} />
                      </div>
                      <div>
                        <FieldLabel required>Remote Type</FieldLabel>
                        <Controller
                          control={control}
                          name="remoteType"
                          render={({ field }) => (
                            <Select value={field.value ?? ''} onValueChange={field.onChange}>
                              <SelectTrigger
                                className={`${selectCls} ${errors.remoteType ? 'border-red-400' : ''}`}
                              >
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
                        <FieldError msg={errors.remoteType?.message} />
                      </div>
                      <div>
                        <FieldLabel>Priority</FieldLabel>
                        <Controller
                          control={control}
                          name="priority"
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className={selectCls}>
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
                              <SelectTrigger className={selectCls}>
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
                      <div>
                        <FieldLabel>Openings</FieldLabel>
                        <Input
                          type="number"
                          min={1}
                          className={inputCls}
                          {...register('totalOpenings', { valueAsNumber: true })}
                        />
                      </div>
                      <div>
                        <FieldLabel>Functional Area</FieldLabel>
                        <Input
                          className={inputCls}
                          placeholder="e.g. Engineering"
                          {...register('functionalArea')}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <FieldLabel>City</FieldLabel>
                        <div className="relative">
                          <MapPin
                            size={14}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                          />
                          <Input
                            className={`${inputCls} pl-9`}
                            placeholder="Bengaluru"
                            {...register('city')}
                          />
                        </div>
                      </div>
                      <div>
                        <FieldLabel>State</FieldLabel>
                        <Input
                          className={inputCls}
                          placeholder="Karnataka"
                          {...register('state')}
                        />
                      </div>
                      <div>
                        <FieldLabel>Country</FieldLabel>
                        <Input className={inputCls} placeholder="India" {...register('country')} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FieldLabel>Shift</FieldLabel>
                        <Input
                          className={inputCls}
                          placeholder="Morning / Night / Flexible"
                          {...register('shift')}
                        />
                      </div>
                      <div>
                        <FieldLabel>Education</FieldLabel>
                        <Input
                          className={inputCls}
                          placeholder="B.Tech / B.E."
                          {...register('education')}
                        />
                      </div>
                    </div>
                  </div>
                </StepPanel>
              )}

              {/* ── STEP 2 ── */}
              {step === 2 && (
                <StepPanel
                  title="Skills & Details"
                  subtitle="Define the skills required for this role"
                >
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                    <div>
                      <FieldLabel required>
                        Primary Skills
                        <span className="ml-2 text-[11px] font-normal text-slate-400 normal-case">
                          top 3–5 must-have
                        </span>
                      </FieldLabel>
                      <TagInput
                        values={primarySkills}
                        onChange={setPrimarySkills}
                        placeholder="Add primary skill and press Enter…"
                        colorClass="bg-rose-50 text-rose-700 border-rose-200"
                      />
                    </div>
                    <div className="h-px bg-slate-100" />
                    <div>
                      <FieldLabel>
                        Key Skills
                        <span className="ml-2 text-[11px] font-normal text-slate-400 normal-case">
                          all other required skills
                        </span>
                      </FieldLabel>
                      <TagInput
                        values={keySkills}
                        onChange={setKeySkills}
                        placeholder="Add key skill and press Enter…"
                        colorClass="bg-blue-50 text-blue-700 border-blue-200"
                      />
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                    <p className="text-[13.5px] font-bold text-slate-900">Experience Band</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FieldLabel>Min Experience (yrs)</FieldLabel>
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          className={inputCls}
                          placeholder="0"
                          {...register('experienceMin', { valueAsNumber: true })}
                        />
                      </div>
                      <div>
                        <FieldLabel>Max Experience (yrs)</FieldLabel>
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          className={inputCls}
                          placeholder="10"
                          {...register('experienceMax', { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                    <p className="text-[13.5px] font-bold text-slate-900">Sourcing Strategy</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <FieldLabel>Target Companies</FieldLabel>
                        <TagInput
                          values={targetCompanies}
                          onChange={setTargetCompanies}
                          placeholder="e.g. Infosys, TCS…"
                          colorClass="bg-teal-50 text-teal-700 border-teal-200"
                        />
                      </div>
                      <div>
                        <FieldLabel>No-Poach Companies</FieldLabel>
                        <TagInput
                          values={noPoachCompanies}
                          onChange={setNoPoachCompanies}
                          placeholder="e.g. Client name…"
                          colorClass="bg-orange-50 text-orange-700 border-orange-200"
                        />
                      </div>
                    </div>
                  </div>
                </StepPanel>
              )}

              {/* ── STEP 3 ── */}
              {step === 3 && (
                <StepPanel
                  title="Compensation"
                  subtitle="Salary range, bonus, and currency details"
                >
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FieldLabel>Salary Min</FieldLabel>
                        <Input
                          type="number"
                          min={0}
                          className={inputCls}
                          placeholder="0"
                          {...register('salaryMin', { valueAsNumber: true })}
                        />
                      </div>
                      <div>
                        <FieldLabel>Salary Max</FieldLabel>
                        <Input
                          type="number"
                          min={0}
                          className={inputCls}
                          placeholder="0"
                          {...register('salaryMax', { valueAsNumber: true })}
                        />
                      </div>
                      <div>
                        <FieldLabel>Salary Type</FieldLabel>
                        <Controller
                          control={control}
                          name="salaryType"
                          render={({ field }) => (
                            <Select
                              value={field.value ?? ''}
                              onValueChange={v => field.onChange(v || null)}
                            >
                              <SelectTrigger className={selectCls}>
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
                        <FieldLabel>Bonus Amount</FieldLabel>
                        <Input
                          type="number"
                          min={0}
                          className={inputCls}
                          placeholder="0"
                          {...register('bonusAmount', { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                    <div className="flex gap-6 pt-2">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-primary focus:ring-primary/20"
                          {...register('hideSalaryFromCandidate')}
                        />
                        <span className="text-[13px] text-slate-600 font-medium">
                          Hide salary from candidate
                        </span>
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-primary focus:ring-primary/20"
                          {...register('showMedianSalary')}
                        />
                        <span className="text-[13px] text-slate-600 font-medium">
                          Show median salary
                        </span>
                      </label>
                    </div>
                  </div>
                </StepPanel>
              )}

              {/* ── STEP 4 ── */}
              {step === 4 && (
                <StepPanel title="Client & SPOC" subtitle="Which client is this requirement for?">
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <FieldLabel required>Client</FieldLabel>
                        <Select value={selectedClientId} onValueChange={setSelectedClientIdInStore}>
                          <SelectTrigger className={selectCls}>
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
                              disabled={!selectedClientId}
                            >
                              <SelectTrigger
                                className={`${selectCls} ${errors.clientSpocId ? 'border-red-400' : ''}`}
                              >
                                <SelectValue
                                  placeholder={
                                    !selectedClientId ? 'Select client first' : 'Select SPOC…'
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
                        <FieldError msg={errors.clientSpocId?.message} />
                      </div>
                    </div>
                    {selectedSpoc && (
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        {[
                          { label: 'Business Unit', value: selectedSpoc.businessUnit.name },
                          { label: 'Service Line', value: selectedSpoc.serviceLine.name },
                        ].map(f => (
                          <div key={f.label}>
                            <FieldLabel>{f.label}</FieldLabel>
                            <div className="h-12 flex items-center px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-[14px] font-medium text-slate-600">
                              {f.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </StepPanel>
              )}

              {/* ── STEP 5 ── */}
              {step === 5 && (
                <StepPanel
                  title="Timeline"
                  subtitle="Set key dates and deadlines for this requirement"
                >
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <FieldLabel>Respond By</FieldLabel>
                        <Input type="date" className={inputCls} {...register('respondBy')} />
                      </div>
                      <div>
                        <FieldLabel>Turnaround (days)</FieldLabel>
                        <Input
                          type="number"
                          min={1}
                          placeholder="—"
                          className={inputCls}
                          {...register('turnaroundDays', { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                  </div>
                </StepPanel>
              )}

              {/* ── Navigation ── */}
              <div className="flex items-center justify-between pt-2 pb-16">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goPrev}
                  disabled={step === 1}
                  className="h-11 px-6 font-semibold rounded-xl border-slate-200 text-slate-600 gap-2"
                >
                  <ArrowLeft size={15} /> Previous
                </Button>

                {step < STEPS.length ? (
                  <Button
                    type="button"
                    onClick={goNext}
                    className="h-11 px-8 font-bold rounded-xl gap-2 shadow-sm"
                  >
                    Next <ArrowRight size={15} />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="h-11 px-10 font-bold rounded-xl gap-2 shadow-sm bg-emerald-600 hover:bg-emerald-700"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 size={15} className="animate-spin" /> Creating…
                      </>
                    ) : (
                      <>
                        <Check size={15} /> Create Requirement
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
