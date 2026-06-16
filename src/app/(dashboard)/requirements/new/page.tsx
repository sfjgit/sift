/* eslint-disable @typescript-eslint/no-explicit-any */
// File: page.tsx
// Path: src/app/(dashboard)/requirements/new/page.tsx

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
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
  DollarSign,
  Calendar,
  UserCheck,
  Tag,
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
  jobType: z.enum(['CONTRACT', 'PERMANENT', 'CONTRACT_TO_HIRE', 'FREELANCE']),
  remoteType: z.enum(['ONSITE', 'REMOTE', 'HYBRID']),
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

interface SpocDMUser {
  id: string;
  firstName: string;
  lastName: string;
}

interface SpocDM {
  id: string;
  dm: SpocDMUser;
}

interface ClientSpoc {
  id: string;
  firstName: string;
  lastName: string;
  isPrimary: boolean;
  designation?: string | null;
  handler: { id: string; firstName: string; lastName: string };
  serviceLine: { id: string; name: string };
  businessUnit: { id: string; name: string };
  clientSpocDms?: SpocDM[];
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
// SECTIONS CONFIG — used for sidebar + scroll-spy
// ─────────────────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'sec-jd', label: 'Job Description', icon: Sparkles, sub: 'Upload or search library' },
  { id: 'sec-basics', label: 'Basic Info', icon: FileText, sub: 'Title, type, details' },
  { id: 'sec-location', label: 'Location', icon: MapPin, sub: 'City, state, country' },
  { id: 'sec-skills', label: 'Skills', icon: Briefcase, sub: 'Primary & key skills' },
  { id: 'sec-compensation', label: 'Compensation', icon: DollarSign, sub: 'Salary, bonus' },
  { id: 'sec-client', label: 'Client & SPOC', icon: UserCheck, sub: 'Client & contact' },
  { id: 'sec-timeline', label: 'Timeline', icon: Calendar, sub: 'Dates & deadlines' },
];

// Which fields belong to which section — for error dot on sidebar
// Update SECTION_FIELDS to cover all required fields:
const SECTION_FIELDS: Record<string, (keyof FormValues)[]> = {
  'sec-jd': [],
  'sec-basics': ['title', 'jobType', 'remoteType', 'totalOpenings'],
  'sec-location': ['city', 'state', 'country'],
  'sec-skills': ['primarySkills', 'keySkills', 'experienceMin', 'experienceMax'],
  'sec-compensation': ['salaryMin', 'salaryMax', 'salaryType', 'salaryCurrency', 'bonusAmount'],
  'sec-client': ['clientSpocId'],
  'sec-timeline': ['startDate', 'targetDate', 'respondBy', 'turnaroundDays'],
};

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
// SHARED STYLES
// ─────────────────────────────────────────────────────────────────────────────

const inputCls =
  'h-11 text-[14px] font-medium border-slate-200 bg-white placeholder:text-slate-400 placeholder:font-normal focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary rounded-xl transition-colors';
const selectCls =
  'h-11 text-[14px] font-medium border-slate-200 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-xl data-[placeholder]:text-slate-400';

// ─────────────────────────────────────────────────────────────────────────────
// SMALL PRIMITIVES
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

// Section card wrapper
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
            className="w-full h-11 pl-10 pr-4 text-[14px] font-medium border border-slate-200 rounded-xl bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            placeholder="Search previously parsed JDs…"
            value={q}
            onChange={e => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
          {open && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-72 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-slate-400">
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Searching…
                </div>
              ) : !data?.length ? (
                <div className="py-6 text-center text-[13px] text-slate-400">
                  {q ? 'No matches found' : 'Start typing to search'}
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
                          <Users size={10} />
                          {item.usageCount} used
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
            <CheckCircle size={12} />
            Using: {parsedTitle}
          </p>
        )}
      </div>
      <div>
        <FieldLabel>Or Upload JD to Parse with AI</FieldLabel>
        <button
          type="button"
          onClick={onUpload}
          disabled={isParsing}
          className="w-full h-11 flex items-center justify-center gap-2.5 border-2 border-dashed border-violet-200 rounded-xl text-[14px] font-semibold text-violet-500 hover:border-violet-400 hover:text-violet-700 hover:bg-violet-50/50 transition-all disabled:opacity-50"
        >
          {isParsing ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Parsing…
            </>
          ) : (
            <>
              <Wand2 size={15} />
              Upload PDF / DOC / DOCX
            </>
          )}
        </button>
        <p className="mt-2 text-[11.5px] text-slate-400">
          Auto-fills the form and saves to library
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SPOC SELECT ITEM — shows DM tags inline
// ─────────────────────────────────────────────────────────────────────────────

function SpocSelectItem({ spoc }: { spoc: ClientSpoc }) {
  const dms = spoc.clientSpocDms ?? [];
  return (
    <div className="flex flex-col gap-0.5 py-0.5">
      <div className="flex items-center gap-2">
        <span className="font-medium text-[13px]">
          {spoc.firstName} {spoc.lastName}
        </span>
        {spoc.isPrimary && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
            Primary
          </span>
        )}
        {dms.length > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full font-medium">
            <Tag size={9} />
            {dms.length} DM{dms.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-slate-400">{spoc.serviceLine.name}</span>
        {spoc.designation && (
          <span className="text-[11px] text-slate-400">· {spoc.designation}</span>
        )}
        {dms.length > 0 && (
          <span className="text-[11px] text-slate-500">
            ·{' '}
            {dms
              .slice(0, 2)
              .map(d => `${d.dm.firstName} ${d.dm.lastName}`)
              .join(', ')}
            {dms.length > 2 ? ` +${dms.length - 2}` : ''}
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function NewRequirementPage() {
  const axios = useAxios();
  const router = useRouter();

  const { draft, setDraft, markStepComplete, clearDraft, hasDraft } = useRequirementDraftStore();

  const primarySkills = draft.primarySkills;
  const keySkills = draft.keySkills;
  const targetCompanies = draft.targetCompanies;
  const noPoachCompanies = draft.noPoachCompanies;
  const parsedTitle = draft.parsedTitle;
  const selectedClientId = draft.selectedClientId;

  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [selectedSpoc, setSelectedSpoc] = useState<ClientSpoc | null>(null);
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const jdInputRef = useRef<HTMLInputElement>(null!);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // ── RHF ──────────────────────────────────────────────────────────────────
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

  // ── Hydrate from draft ────────────────────────────────────────────────────
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

  // ── Sync arrays → RHF ────────────────────────────────────────────────────
  useEffect(() => {
    setValue('primarySkills', primarySkills);
  }, [primarySkills, setValue]);
  useEffect(() => {
    setValue('keySkills', keySkills);
  }, [keySkills, setValue]);
  useEffect(() => {
    setValue('targetCompanies', targetCompanies);
  }, [targetCompanies, setValue]);
  useEffect(() => {
    setValue('noPoachCompanies', noPoachCompanies);
  }, [noPoachCompanies, setValue]);

  // ── Scroll-spy via IntersectionObserver ──────────────────────────────────
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const sectionEls = SECTIONS.map(s => document.getElementById(s.id)).filter(
      Boolean
    ) as HTMLElement[];

    // track which sections are currently visible with their ratio
    const visibilityMap = new Map<string, number>();

    sectionEls.forEach(el => {
      const obs = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            visibilityMap.set(entry.target.id, entry.intersectionRatio);
          });
          // pick the section with the highest intersection ratio
          let maxRatio = 0;
          let mostVisible = SECTIONS[0].id;
          visibilityMap.forEach((ratio, id) => {
            if (ratio > maxRatio) {
              maxRatio = ratio;
              mostVisible = id;
            }
          });
          if (maxRatio > 0) setActiveSection(mostVisible);
        },
        { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0], rootMargin: '-80px 0px -40% 0px' }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach(o => o.disconnect());
  }, []);

  // ── Scroll to section from sidebar click ─────────────────────────────────
  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // ── Snapshot to store ─────────────────────────────────────────────────────
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
  const rawSpocs = spocsRes?.data ?? [];

  // Sort: SPOCs that have tagged DMs come first, then by isPrimary, then rest
  const spocs = [...rawSpocs].sort((a, b) => {
    const aDms = a.clientSpocDms?.length ?? 0;
    const bDms = b.clientSpocDms?.length ?? 0;
    if (aDms !== bDms) return bDms - aDms; // more DMs first
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1; // primary first within group
    return 0;
  });

  useEffect(() => {
    setSelectedSpoc(null);
    setValue('clientSpocId', '');
    setDraft({ clientSpocId: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId]);

  // ── JD parse ──────────────────────────────────────────────────────────────
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
        setDraft({ primarySkills: parsed.primarySkills });
        filled.push('primarySkills');
      }
      if (parsed.keySkills?.length) {
        setDraft({ keySkills: parsed.keySkills });
        filled.push('keySkills');
      }
      if (parsed.targetCompanies?.length) {
        setDraft({ targetCompanies: parsed.targetCompanies });
        filled.push('targetCompanies');
      }
      if (parsed.noPoachCompanies?.length) {
        setDraft({ noPoachCompanies: parsed.noPoachCompanies });
        filled.push('noPoachCompanies');
      }

      const now = new Date().toISOString();
      setValue('jdFileKey', res.data.jdFileKey ?? null);
      setValue('jdFileName', res.data.jdFileName ?? fileName);
      setValue('jdFileType', res.data.jdFileType ?? file.type);
      setValue('jdParsedAt', now);
      setValue('jdParseStatus', 'PARSED');
      setValue('jdParsedFields', filled);
      setDraft({ parsedTitle: parsed.title ?? fileName });

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

  // ── Use from library ──────────────────────────────────────────────────────
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

      if (parsed.primarySkills?.length) setDraft({ primarySkills: parsed.primarySkills });
      if (parsed.keySkills?.length) setDraft({ keySkills: parsed.keySkills });
      if (parsed.targetCompanies?.length) setDraft({ targetCompanies: parsed.targetCompanies });
      if (parsed.noPoachCompanies?.length) setDraft({ noPoachCompanies: parsed.noPoachCompanies });

      setValue('parsedJDId', id);
      setValue('jdParseStatus', 'PARSED');
      setDraft({ parsedJDId: id, parsedTitle: parsed.title, jdParseStatus: 'PARSED' });

      toast.success('Form prefilled from library');
    } catch {
      toast.error('Failed to load from library');
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => (await axios.post('/requirements', data)).data,
    onSuccess: res => {
      clearDraft();
      toast.success('Requirement created');
      router.push(`/requirements/${res.data?.id ?? ''}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Something went wrong');
    },
  });

  // Replace handleFinalSubmit with this:

  async function handleFinalSubmit() {
    snapshotToStore();
    const valid = await trigger();
    if (!valid) {
      // Collect ALL error messages from the entire errors object (flat + nested)
      function collectMessages(obj: Record<string, any>): string[] {
        const msgs: string[] = [];
        for (const key of Object.keys(obj)) {
          const val = obj[key];
          if (!val) continue;
          if (typeof val.message === 'string') {
            msgs.push(val.message);
          } else if (typeof val === 'object') {
            msgs.push(...collectMessages(val));
          }
        }
        return msgs;
      }

      const allMessages = collectMessages(errors as Record<string, any>);

      // Scroll to the first section that has an error
      for (const sec of SECTIONS) {
        const fields = SECTION_FIELDS[sec.id] ?? [];
        const hasError = fields.some(f => (errors as any)[f]);
        if (hasError) {
          scrollToSection(sec.id);
          break;
        }
      }

      // Show each error as its own toast so nothing is hidden
      if (allMessages.length > 0) {
        allMessages.forEach(msg => toast.error(msg));
      } else {
        toast.error('Please fix all errors before submitting');
      }
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

  // ── Clear draft ───────────────────────────────────────────────────────────
  function handleClearDraft() {
    if (!confirm('Clear draft? All progress will be lost.')) return;
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

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col bg-[#F8F9FB] overflow-hidden">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 z-20 bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-[15px] font-bold text-slate-900 leading-none">Create Requirement</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">Fill all sections and submit</p>
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
              <X size={12} />
              Clear Draft
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
            Save Draft
          </Button>
          <Button
            size="sm"
            className="h-8 text-[12px] font-bold bg-emerald-600 hover:bg-emerald-700 gap-1.5"
            onClick={handleFinalSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <Check size={13} />
                Create Requirement
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Body: sidebar + scroll area ──────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Sidebar — sticky, never scrolls ──────────────────────────── */}
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
                        {hasError ? 'Has errors' : sec.sub}
                      </p>
                    </div>
                    {/* Active dot */}
                    {isActive && !hasError && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary ml-auto shrink-0" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* JD status widget */}
          <div className="shrink-0 p-4 border-t border-slate-100">
            <div
              className={`rounded-xl p-3 ${parsedTitle ? 'bg-emerald-50 border border-emerald-100' : 'bg-violet-50 border border-violet-100'}`}
            >
              {parsedTitle ? (
                <>
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle size={12} className="text-emerald-500 shrink-0" />
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                      JD Loaded
                    </p>
                  </div>
                  <p className="text-[11.5px] text-emerald-700 font-medium truncate">
                    {parsedTitle}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles size={12} className="text-violet-500 shrink-0" />
                    <p className="text-[10px] font-bold text-violet-700 uppercase tracking-wide">
                      AI Parser
                    </p>
                  </div>
                  <p className="text-[11.5px] text-violet-600">Upload or search to auto-fill</p>
                </>
              )}
            </div>
          </div>
        </aside>

        {/* ── Scrollable form area ─────────────────────────────────────── */}
        <main ref={scrollAreaRef} className="flex-1 overflow-y-auto">
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
            className="px-8 py-8 space-y-6 max-w-3xl"
          >
            {/* ── JD section ─────────────────────────────────────────────── */}
            <SectionCard id="sec-jd">
              <SectionTitle
                icon={Sparkles}
                label="Job Description"
                color="bg-violet-100 text-violet-600"
              />
              <JDLibrarySearch
                onSelect={handleLibrarySelect}
                onUpload={() => jdInputRef.current?.click()}
                isParsing={isParsing}
                parsedTitle={parsedTitle}
              />
              {parseError && (
                <p className="text-[12px] text-red-500 flex items-center gap-1">
                  <AlertCircle size={11} />
                  {parseError}
                </p>
              )}
            </SectionCard>

            {/* ── Basic info ─────────────────────────────────────────────── */}
            <SectionCard id="sec-basics">
              <SectionTitle
                icon={FileText}
                label="Basic Info"
                color="bg-slate-100 text-slate-600"
              />

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
                  placeholder="Role overview, responsibilities…"
                  rows={4}
                  className="text-[14px] font-medium border-slate-200 rounded-xl resize-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-colors"
                  {...register('description')}
                />
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

            {/* ── Location ───────────────────────────────────────────────── */}
            <SectionCard id="sec-location">
              <SectionTitle icon={MapPin} label="Location" color="bg-blue-100 text-blue-600" />
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <FieldLabel>City</FieldLabel>
                  <div className="relative">
                    <MapPin
                      size={13}
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
                  <Input className={inputCls} placeholder="Karnataka" {...register('state')} />
                </div>
                <div>
                  <FieldLabel>Country</FieldLabel>
                  <Input className={inputCls} placeholder="India" {...register('country')} />
                </div>
              </div>
            </SectionCard>

            {/* ── Skills ─────────────────────────────────────────────────── */}
            <SectionCard id="sec-skills">
              <SectionTitle
                icon={Briefcase}
                label="Skills & Experience"
                color="bg-emerald-100 text-emerald-600"
              />
              <div>
                <FieldLabel required>
                  Primary Skills
                  <span className="ml-2 text-[11px] font-normal text-slate-400 normal-case">
                    top 3–5 must-have
                  </span>
                </FieldLabel>
                <TagInput
                  values={primarySkills}
                  onChange={v => setDraft({ primarySkills: v })}
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
                  onChange={v => setDraft({ keySkills: v })}
                  placeholder="Add key skill and press Enter…"
                  colorClass="bg-blue-50 text-blue-700 border-blue-200"
                />
              </div>
              <div className="h-px bg-slate-100" />
              <div>
                <FieldLabel>Experience Range (years)</FieldLabel>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      className={inputCls}
                      placeholder="Min"
                      {...register('experienceMin', { valueAsNumber: true })}
                    />
                  </div>
                  <div>
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
              </div>
              <div className="h-px bg-slate-100" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <FieldLabel>Target Companies</FieldLabel>
                  <TagInput
                    values={targetCompanies}
                    onChange={v => setDraft({ targetCompanies: v })}
                    placeholder="e.g. Infosys, TCS…"
                    colorClass="bg-teal-50 text-teal-700 border-teal-200"
                  />
                </div>
                <div>
                  <FieldLabel>No-Poach Companies</FieldLabel>
                  <TagInput
                    values={noPoachCompanies}
                    onChange={v => setDraft({ noPoachCompanies: v })}
                    placeholder="e.g. Client name…"
                    colorClass="bg-orange-50 text-orange-700 border-orange-200"
                  />
                </div>
              </div>
            </SectionCard>

            {/* ── Compensation ───────────────────────────────────────────── */}
            <SectionCard id="sec-compensation">
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

            {/* ── Client & SPOC ──────────────────────────────────────────── */}
            <SectionCard id="sec-client">
              <SectionTitle
                icon={UserCheck}
                label="Client & SPOC"
                color="bg-indigo-100 text-indigo-600"
              />
              <div className="grid grid-cols-1 gap-5">
                <div>
                  <FieldLabel required>Client</FieldLabel>
                  <Select
                    value={selectedClientId}
                    onValueChange={id => setDraft({ selectedClientId: id })}
                  >
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
                  {/* Helper text explaining ordering */}
                  {spocs.length > 0 && (
                    <p className="text-[11px] text-slate-400 mb-2 flex items-center gap-1">
                      <Tag size={10} className="text-violet-400" />
                      SPOCs with tagged DMs shown first
                    </p>
                  )}
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
                            placeholder={!selectedClientId ? 'Select client first' : 'Select SPOC…'}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {/* SPOCs with DMs tagged — shown first with a group label */}
                          {(() => {
                            const withDMs = spocs.filter(s => (s.clientSpocDms?.length ?? 0) > 0);
                            const withoutDMs = spocs.filter(
                              s => (s.clientSpocDms?.length ?? 0) === 0
                            );
                            return (
                              <>
                                {withDMs.length > 0 && (
                                  <>
                                    <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-500 flex items-center gap-1">
                                      <Tag size={9} />
                                      DMs assigned
                                    </div>
                                    {withDMs.map(s => (
                                      <SelectItem key={s.id} value={s.id} className="py-2">
                                        <SpocSelectItem spoc={s} />
                                      </SelectItem>
                                    ))}
                                    {withoutDMs.length > 0 && (
                                      <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                                        No DMs assigned
                                      </div>
                                    )}
                                  </>
                                )}
                                {withoutDMs.map(s => (
                                  <SelectItem key={s.id} value={s.id} className="py-2">
                                    <SpocSelectItem spoc={s} />
                                  </SelectItem>
                                ))}
                              </>
                            );
                          })()}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError msg={errors.clientSpocId?.message} />
                </div>
              </div>

              {/* SPOC detail chips */}
              {selectedSpoc && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {[
                    { label: 'Business Unit', value: selectedSpoc.businessUnit.name },
                    { label: 'Service Line', value: selectedSpoc.serviceLine.name },
                  ].map(f => (
                    <div key={f.label}>
                      <FieldLabel>{f.label}</FieldLabel>
                      <div className="h-11 flex items-center px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-[14px] font-medium text-slate-600">
                        {f.value}
                      </div>
                    </div>
                  ))}

                  {/* Tagged DMs preview */}
                  {(selectedSpoc.clientSpocDms?.length ?? 0) > 0 && (
                    <div className="col-span-2">
                      <FieldLabel>Tagged Delivery Managers</FieldLabel>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedSpoc.clientSpocDms!.map(dm => (
                          <span
                            key={dm.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-[12px] font-medium text-violet-700"
                          >
                            <div className="w-4 h-4 rounded-full bg-violet-200 flex items-center justify-center text-[9px] font-bold">
                              {dm.dm.firstName[0]}
                              {dm.dm.lastName[0]}
                            </div>
                            {dm.dm.firstName} {dm.dm.lastName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </SectionCard>

            {/* ── Timeline ───────────────────────────────────────────────── */}
            <SectionCard id="sec-timeline">
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

            {/* ── Bottom submit ───────────────────────────────────────────── */}
            <div className="pb-16 pt-2 flex justify-end">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="h-11 px-10 font-bold rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-sm"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    Create Requirement
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
