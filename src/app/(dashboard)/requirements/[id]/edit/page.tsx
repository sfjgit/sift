/* eslint-disable @typescript-eslint/no-explicit-any */
// File: page.tsx
// Path: src/app/(dashboard)/requirements/[id]/edit/page.tsx

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Check,
  Loader2,
  AlertCircle,
  FileText,
  MapPin,
  Briefcase,
  DollarSign,
  Calendar,
  UserCheck,
  X,
  Plus,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAxios } from '@/hooks/useAxios';

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA — only the fields that are actually editable in edit mode
// client, serviceLine, businessUnit, status, reqCode → NOT editable here
// ─────────────────────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(300).trim(),
  description: z.string().max(5000).optional().nullable(),
  jobType: z.enum(['CONTRACT', 'PERMANENT', 'CONTRACT_TO_HIRE', 'FREELANCE']),
  remoteType: z.enum(['ONSITE', 'REMOTE', 'HYBRID']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  jobOpenFor: z.enum(['EXTERNAL', 'INTERNAL', 'BOTH']),
  totalOpenings: z.number().min(1),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  experienceMin: z.number().min(0).optional().nullable(),
  experienceMax: z.number().min(0).optional().nullable(),
  salaryMin: z.number().min(0).optional().nullable(),
  salaryMax: z.number().min(0).optional().nullable(),
  salaryType: z.enum(['MONTHLY', 'ANNUAL', 'HOURLY', 'DAILY']).optional().nullable(),
  salaryCurrency: z.string(),
  bonusAmount: z.number().min(0).optional().nullable(),
  hideSalaryFromCandidate: z.boolean(),
  showMedianSalary: z.boolean(),
  primarySkills: z.array(z.string().trim().min(1)),
  keySkills: z.array(z.string().trim().min(1)),
  education: z.string().max(300).optional().nullable(),
  functionalArea: z.string().max(200).optional().nullable(),
  shift: z.string().max(100).optional().nullable(),
  targetCompanies: z.array(z.string().trim().min(1)),
  noPoachCompanies: z.array(z.string().trim().min(1)),
  startDate: z.string().optional().nullable(),
  targetDate: z.string().optional().nullable(),
  respondBy: z.string().optional().nullable(),
  turnaroundDays: z.number().min(1).optional().nullable(),
});

type EditFormValues = z.infer<typeof schema>;

// ─────────────────────────────────────────────────────────────────────────────
// LOCATION DATA
// ─────────────────────────────────────────────────────────────────────────────

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

const MAJOR_INDIAN_CITIES = [
  'Bengaluru',
  'Mumbai',
  'Delhi',
  'Hyderabad',
  'Chennai',
  'Pune',
  'Kolkata',
  'Ahmedabad',
  'Jaipur',
  'Surat',
  'Lucknow',
  'Kanpur',
  'Nagpur',
  'Indore',
  'Thane',
  'Bhopal',
  'Visakhapatnam',
  'Patna',
  'Vadodara',
  'Ghaziabad',
  'Ludhiana',
  'Agra',
  'Nashik',
  'Faridabad',
  'Meerut',
  'Rajkot',
  'Varanasi',
  'Srinagar',
  'Aurangabad',
  'Dhanbad',
  'Amritsar',
  'Allahabad',
  'Ranchi',
  'Howrah',
  'Coimbatore',
  'Jabalpur',
  'Gwalior',
  'Vijayawada',
  'Jodhpur',
  'Madurai',
  'Raipur',
  'Kota',
  'Guwahati',
  'Chandigarh',
  'Solapur',
  'Hubli',
  'Tiruchirappalli',
  'Bareilly',
  'Mysuru',
  'Noida',
  'Gurugram',
];

const COUNTRIES = [
  'India',
  'United States',
  'United Kingdom',
  'United Arab Emirates',
  'Singapore',
  'Australia',
  'Canada',
  'Germany',
  'Netherlands',
  'Qatar',
  'Saudi Arabia',
  'Bahrain',
  'Malaysia',
  'Japan',
  'New Zealand',
  'France',
  'Ireland',
  'South Africa',
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function toDateInput(iso?: string | null) {
  if (!iso) return '';
  try {
    return new Date(iso).toISOString().split('T')[0];
  } catch {
    return '';
  }
}

function toISOOrNull(v?: string | null) {
  if (!v) return null;
  try {
    return new Date(v).toISOString();
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAP API response → form default values
// ─────────────────────────────────────────────────────────────────────────────

function reqToFormValues(req: any): EditFormValues {
  return {
    title: req.title ?? '',
    description: req.description ?? null,
    jobType: req.jobType,
    remoteType: req.remoteType,
    priority: req.priority ?? 'MEDIUM',
    jobOpenFor: req.jobOpenFor ?? 'EXTERNAL',
    totalOpenings: req.totalOpenings ?? 1,
    city: req.city ?? null,
    state: req.state ?? null,
    country: req.country ?? 'India',
    experienceMin: req.experienceMin ?? null,
    experienceMax: req.experienceMax ?? null,
    salaryMin: req.salaryMin ?? null,
    salaryMax: req.salaryMax ?? null,
    salaryType: req.salaryType ?? null,
    salaryCurrency: req.salaryCurrency ?? 'INR',
    bonusAmount: req.bonusAmount ?? null,
    hideSalaryFromCandidate: req.hideSalaryFromCandidate ?? false,
    showMedianSalary: req.showMedianSalary ?? false,
    primarySkills: req.primarySkills ?? [],
    keySkills: req.keySkills ?? [],
    education: req.education ?? null,
    functionalArea: req.functionalArea ?? null,
    shift: req.shift ?? null,
    targetCompanies: req.targetCompanies ?? [],
    noPoachCompanies: req.noPoachCompanies ?? [],
    startDate: toDateInput(req.startDate),
    targetDate: toDateInput(req.targetDate),
    respondBy: toDateInput(req.respondBy),
    turnaroundDays: req.turnaroundDays ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED STYLES
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

function SectionCard({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div
      id={id}
      className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5 scroll-mt-20"
    >
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

// Read-only display field — for things like client, SPOC, reqCode
function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="h-11 flex items-center px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-[14px] text-slate-500 select-none">
        {value}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAG INPUT
// ─────────────────────────────────────────────────────────────────────────────

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
// COMBO SELECT
// ─────────────────────────────────────────────────────────────────────────────

function ComboSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value ?? '');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputVal(value ?? '');
  }, [value]);

  const filtered = options
    .filter(o => o.toLowerCase().includes(inputVal.toLowerCase()))
    .slice(0, 12);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <input
        className={className}
        placeholder={placeholder}
        value={inputVal}
        autoComplete="off"
        onChange={e => {
          setInputVal(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto">
          {filtered.map(opt => (
            <button
              key={opt}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => {
                setInputVal(opt);
                onChange(opt);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-[13px] hover:bg-slate-50 transition-colors ${opt === value ? 'bg-primary/5 text-primary font-semibold' : 'text-slate-700'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTIONS for scroll-spy sidebar
// ─────────────────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'edit-basics', label: 'Basic Info', icon: FileText, sub: 'Title, type, details' },
  { id: 'edit-location', label: 'Location', icon: MapPin, sub: 'City, state, country' },
  { id: 'edit-skills', label: 'Skills', icon: Briefcase, sub: 'Primary & key skills' },
  { id: 'edit-compensation', label: 'Compensation', icon: DollarSign, sub: 'Salary, bonus' },
  { id: 'edit-client', label: 'Client & SPOC', icon: UserCheck, sub: 'Read-only context' },
  { id: 'edit-timeline', label: 'Timeline', icon: Calendar, sub: 'Dates & deadlines' },
];

const SECTION_FIELDS: Record<string, (keyof EditFormValues)[]> = {
  'edit-basics': ['title', 'jobType', 'remoteType'],
  'edit-location': [],
  'edit-skills': [],
  'edit-compensation': [],
  'edit-client': [],
  'edit-timeline': [],
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function EditRequirementPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const axios = useAxios();
  const qc = useQueryClient();

  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const [isReady, setIsReady] = useState(false);

  // ── Fetch requirement ─────────────────────────────────────────────────────
  const { data: reqRes, isLoading } = useQuery({
    queryKey: ['requirement', id],
    queryFn: async () => (await axios.get(`/requirements/${id}`)).data,
  });

  const req = reqRes?.data;

  // ── RHF ──────────────────────────────────────────────────────────────────
  const {
    register,
    control,
    handleSubmit,
    reset,
    trigger,
    formState: { errors, dirtyFields },
    watch,
  } = useForm<EditFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      primarySkills: [],
      keySkills: [],
      targetCompanies: [],
      noPoachCompanies: [],
      salaryCurrency: 'INR',
      hideSalaryFromCandidate: false,
      showMedianSalary: false,
      priority: 'MEDIUM',
      jobOpenFor: 'EXTERNAL',
      totalOpenings: 1,
    },
  });

  // Hydrate once when data arrives — set isReady AFTER reset so Controllers
  // mount with the correct values already in the form store
  useEffect(() => {
    if (!req) return;
    reset(reqToFormValues(req));
    // small tick ensures react re-renders Controllers with new values before showing form
    setTimeout(() => setIsReady(true), 0);
  }, [req, reset]);

  // Live watch for tag arrays (controlled via Controller)
  const primarySkills = watch('primarySkills') ?? [];
  const keySkills = watch('keySkills') ?? [];
  const targetCompanies = watch('targetCompanies') ?? [];
  const noPoachCompanies = watch('noPoachCompanies') ?? [];

  // ── Scroll-spy ────────────────────────────────────────────────────────────
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const visibilityMap = new Map<string, number>();

    SECTIONS.forEach(sec => {
      const el = document.getElementById(sec.id);
      if (!el) return;
      const obs = new IntersectionObserver(
        entries => {
          entries.forEach(e => visibilityMap.set(e.target.id, e.intersectionRatio));
          let max = 0;
          let best = SECTIONS[0].id;
          visibilityMap.forEach((r, sid) => {
            if (r > max) {
              max = r;
              best = sid;
            }
          });
          if (max > 0) setActiveSection(best);
        },
        { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1], rootMargin: '-80px 0px -40% 0px' }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, [req]); // re-run after req loads so elements exist

  const scrollToSection = useCallback((sid: string) => {
    document.getElementById(sid)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // ── Mutation — only send dirty fields ────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async (payload: Partial<EditFormValues>) =>
      (await axios.put(`/requirements/${id}`, payload)).data,
    onSuccess: () => {
      toast.success('Requirement updated');
      qc.invalidateQueries({ queryKey: ['requirement', id] });
      router.push(`/requirements/${id}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to update');
    },
  });

  async function onSubmit(allValues: EditFormValues) {
    // Build payload from only dirty fields
    const payload: Record<string, any> = {};

    (Object.keys(dirtyFields) as (keyof EditFormValues)[]).forEach(field => {
      payload[field] = allValues[field];
    });

    if (Object.keys(payload).length === 0) {
      toast.info('No changes to save');
      return;
    }

    // Convert date strings to ISO for dirty date fields
    if (payload.startDate !== undefined)
      payload.startDate = toISOOrNull(payload.startDate as string);
    if (payload.targetDate !== undefined)
      payload.targetDate = toISOOrNull(payload.targetDate as string);
    if (payload.respondBy !== undefined)
      payload.respondBy = toISOOrNull(payload.respondBy as string);

    await updateMutation.mutateAsync(payload as Partial<EditFormValues>);
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  const showSkeleton = isLoading || !isReady || !req;

  if (showSkeleton) {
    return (
      <div className="h-screen flex flex-col bg-[#F8F9FB] overflow-hidden">
        <div className="shrink-0 bg-white border-b px-6 py-3 flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-32 ml-auto" />
        </div>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="hidden lg:block w-[240px] border-r bg-white" />
          <div className="flex-1 p-8 flex flex-col gap-4">
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#F8F9FB] overflow-hidden">
      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div className="shrink-0 z-20 bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-[15px] font-bold text-slate-900 leading-none">Edit Requirement</h1>
          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{req.reqCode}</p>
        </div>

        {/* Dirty field count badge */}
        {Object.keys(dirtyFields).length > 0 && (
          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            {Object.keys(dirtyFields).length} unsaved change
            {Object.keys(dirtyFields).length !== 1 ? 's' : ''}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[12px] border-slate-200 text-slate-500"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-[12px] font-bold bg-primary hover:bg-primary/90 gap-1.5"
            onClick={handleSubmit(onSubmit)}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Check size={13} />
                Save changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className="hidden lg:flex w-[240px] shrink-0 flex-col border-r border-slate-200 bg-white h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto py-6 px-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2 mb-3">
              Sections
            </p>
            <nav className="space-y-0.5">
              {SECTIONS.map(sec => {
                const isActive = activeSection === sec.id;
                const secFields = SECTION_FIELDS[sec.id] ?? [];
                const hasError = secFields.some(f => (errors as any)[f]);
                const Icon = sec.icon;
                const isDirty = secFields.some(f => (dirtyFields as any)[f]);

                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => scrollToSection(sec.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                      isActive ? 'bg-primary/[0.08] border border-primary/20' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                        hasError
                          ? 'bg-red-500 text-white'
                          : isActive
                            ? 'bg-primary text-white shadow-sm shadow-primary/30'
                            : isDirty
                              ? 'bg-amber-400 text-white'
                              : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                      }`}
                    >
                      {hasError ? <AlertCircle size={13} /> : <Icon size={13} />}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-[12.5px] font-semibold leading-none truncate ${
                          hasError ? 'text-red-600' : isActive ? 'text-primary' : 'text-slate-600'
                        }`}
                      >
                        {sec.label}
                      </p>
                      <p
                        className={`text-[10.5px] mt-0.5 truncate ${
                          hasError
                            ? 'text-red-400'
                            : isActive
                              ? 'text-primary/60'
                              : 'text-slate-400'
                        }`}
                      >
                        {hasError ? 'Has errors' : isDirty ? 'Modified' : sec.sub}
                      </p>
                    </div>
                    {isActive && !hasError && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary ml-auto shrink-0" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Req context widget */}
          <div className="shrink-0 p-4 border-t border-slate-100">
            <div className="rounded-xl p-3 bg-slate-50 border border-slate-200 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Context
              </p>
              <p className="text-[12px] font-semibold text-slate-700">{req.client?.name}</p>
              <p className="text-[11px] text-slate-500">{req.serviceLine?.name}</p>
              <p className="text-[11px] text-slate-400">{req.businessUnit?.name}</p>
            </div>
          </div>
        </aside>

        {/* ── Scrollable form ───────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-8 space-y-6 max-w-3xl">
            {/* ── Basic Info ─────────────────────────────────────────────── */}
            <SectionCard id="edit-basics">
              <SectionTitle
                icon={FileText}
                label="Basic Info"
                color="bg-slate-100 text-slate-600"
              />

              <div>
                <FieldLabel required>Job Title</FieldLabel>
                <Input
                  className={`${inputCls} ${errors.title ? 'border-red-400' : ''}`}
                  {...register('title')}
                />
                <FieldError msg={errors.title?.message} />
              </div>

              <div>
                <FieldLabel>Description</FieldLabel>
                <Textarea
                  rows={4}
                  className="text-[14px] font-medium border-slate-200 rounded-xl resize-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-colors"
                  {...register('description')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Job Type</FieldLabel>
                  <Controller
                    control={control}
                    name="jobType"
                    render={({ field }) => (
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <SelectTrigger
                          className={`${selectCls} ${errors.jobType ? 'border-red-400' : ''}`}
                        >
                          <SelectValue />
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
                </div>
                <div>
                  <FieldLabel>Remote Type</FieldLabel>
                  <Controller
                    control={control}
                    name="remoteType"
                    render={({ field }) => (
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <SelectTrigger
                          className={`${selectCls} ${errors.remoteType ? 'border-red-400' : ''}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ONSITE">Onsite</SelectItem>
                          <SelectItem value="REMOTE">Remote</SelectItem>
                          <SelectItem value="HYBRID">Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
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
            </SectionCard>

            {/* ── Location ─────────────────────────────────────────────────── */}
            <SectionCard id="edit-location">
              <SectionTitle icon={MapPin} label="Location" color="bg-blue-100 text-blue-600" />
              <p className="text-[11.5px] text-slate-400 -mt-2">
                Pick from the list or type any custom value
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <FieldLabel>City</FieldLabel>
                  <Controller
                    control={control}
                    name="city"
                    render={({ field }) => (
                      <ComboSelect
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        options={MAJOR_INDIAN_CITIES}
                        placeholder="e.g. Bengaluru"
                        className={`w-full ${inputCls}`}
                      />
                    )}
                  />
                </div>
                <div>
                  <FieldLabel>State</FieldLabel>
                  <Controller
                    control={control}
                    name="state"
                    render={({ field }) => (
                      <ComboSelect
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        options={INDIAN_STATES}
                        placeholder="e.g. Karnataka"
                        className={`w-full ${inputCls}`}
                      />
                    )}
                  />
                </div>
                <div>
                  <FieldLabel>Country</FieldLabel>
                  <Controller
                    control={control}
                    name="country"
                    render={({ field }) => (
                      <ComboSelect
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        options={COUNTRIES}
                        placeholder="India"
                        className={`w-full ${inputCls}`}
                      />
                    )}
                  />
                </div>
              </div>
            </SectionCard>

            {/* ── Skills ────────────────────────────────────────────────────── */}
            <SectionCard id="edit-skills">
              <SectionTitle
                icon={Briefcase}
                label="Skills & Experience"
                color="bg-emerald-100 text-emerald-600"
              />

              <div>
                <FieldLabel>
                  Primary Skills
                  <span className="ml-2 text-[11px] font-normal text-slate-400 normal-case">
                    top 3–5 must-have
                  </span>
                </FieldLabel>
                <Controller
                  control={control}
                  name="primarySkills"
                  render={({ field }) => (
                    <TagInput
                      values={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="Add primary skill and press Enter…"
                      colorClass="bg-rose-50 text-rose-700 border-rose-200"
                    />
                  )}
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
                <Controller
                  control={control}
                  name="keySkills"
                  render={({ field }) => (
                    <TagInput
                      values={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="Add key skill and press Enter…"
                      colorClass="bg-blue-50 text-blue-700 border-blue-200"
                    />
                  )}
                />
              </div>

              <div className="h-px bg-slate-100" />

              <div>
                <FieldLabel>Experience Range (years)</FieldLabel>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    className={inputCls}
                    placeholder="Min"
                    {...register('experienceMin', { valueAsNumber: true })}
                  />
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    className={inputCls}
                    placeholder="Max"
                    {...register('experienceMax', { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <FieldLabel>Target Companies</FieldLabel>
                  <Controller
                    control={control}
                    name="targetCompanies"
                    render={({ field }) => (
                      <TagInput
                        values={field.value ?? []}
                        onChange={field.onChange}
                        placeholder="e.g. Infosys, TCS…"
                        colorClass="bg-teal-50 text-teal-700 border-teal-200"
                      />
                    )}
                  />
                </div>
                <div>
                  <FieldLabel>No-Poach Companies</FieldLabel>
                  <Controller
                    control={control}
                    name="noPoachCompanies"
                    render={({ field }) => (
                      <TagInput
                        values={field.value ?? []}
                        onChange={field.onChange}
                        placeholder="e.g. Client name…"
                        colorClass="bg-orange-50 text-orange-700 border-orange-200"
                      />
                    )}
                  />
                </div>
              </div>
            </SectionCard>

            {/* ── Compensation ──────────────────────────────────────────────── */}
            <SectionCard id="edit-compensation">
              <SectionTitle
                icon={DollarSign}
                label="Compensation"
                color="bg-amber-100 text-amber-600"
              />
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
              <div className="flex gap-6 pt-1">
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
                  <span className="text-[13px] text-slate-600 font-medium">Show median salary</span>
                </label>
              </div>
            </SectionCard>

            {/* ── Client & SPOC — READ ONLY ─────────────────────────────────── */}
            <SectionCard id="edit-client">
              <SectionTitle
                icon={UserCheck}
                label="Client & SPOC"
                color="bg-indigo-100 text-indigo-600"
              />
              <p className="text-[11.5px] text-slate-400 -mt-2 flex items-center gap-1.5">
                <Sparkles size={11} className="text-slate-400" />
                Client and SPOC cannot be changed after creation. Create a new requirement if
                needed.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <ReadonlyField label="Client" value={req.client?.name ?? '—'} />
                <ReadonlyField
                  label="SPOC Handler"
                  value={
                    req.clientSpoc
                      ? `${req.clientSpoc.handler.firstName} ${req.clientSpoc.handler.lastName}`
                      : '—'
                  }
                />
                <ReadonlyField label="Service Line" value={req.serviceLine?.name ?? '—'} />
                <ReadonlyField label="Business Unit" value={req.businessUnit?.name ?? '—'} />
              </div>
            </SectionCard>

            {/* ── Timeline ──────────────────────────────────────────────────── */}
            <SectionCard id="edit-timeline">
              <SectionTitle icon={Calendar} label="Timeline" color="bg-rose-100 text-rose-600" />
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <FieldLabel>Start Date</FieldLabel>
                  <Input type="date" className={inputCls} {...register('startDate')} />
                </div>
                <div>
                  <FieldLabel>Target Date</FieldLabel>
                  <Input type="date" className={inputCls} {...register('targetDate')} />
                </div>
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
            </SectionCard>

            {/* ── Bottom submit ─────────────────────────────────────────────── */}
            <div className="pb-16 pt-2 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="h-11 px-6 rounded-xl border-slate-200 text-slate-600"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="h-11 px-10 font-bold rounded-xl gap-2 shadow-sm"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    Save changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
