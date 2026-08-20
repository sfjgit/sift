/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
// File: page.tsx
// Path: src/app/(dashboard)/requirements/new/page.tsx

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, useWatch } from 'react-hook-form';
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
  Zap,
  Lock,
  RotateCcw,
  ClipboardList,
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
import { COUNTRIES, getStates, getCities } from '@/data/locationData';

function BandSaleValueFields({
  clientId,
  clientAgreementType,
  control,
  setValue,
}: {
  clientId: string | null | undefined;
  clientAgreementType: string | null | undefined;
  control: any;
  setValue: any;
}) {
  const axios = useAxios();
  const bandId = useWatch({ control, name: 'bandId' });
  const saleValue = useWatch({ control, name: 'saleValue' });
  const showBand = clientAgreementType === 'BAND' && !!clientId;

  const { data: bands, isLoading } = useQuery<Band[]>({
    queryKey: ['client-bands', clientId],
    queryFn: async () => (await axios.get(`/clients/${clientId}/bands`)).data?.data ?? [],
    enabled: showBand,
    staleTime: 5 * 60 * 1000,
  });

  const selectedBand = bands?.find(b => b.id === bandId) ?? null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 mt-2">
      {showBand && (
        <div>
          <FieldLabel>
            Band <span className="text-[11px] font-normal text-slate-400">(optional)</span>
          </FieldLabel>
          {isLoading ? (
            <div className="h-11 rounded-xl border border-slate-200 bg-slate-50 animate-pulse" />
          ) : (
            <Select
              value={bandId ?? '__none__'}
              onValueChange={v =>
                setValue('bandId', v === '__none__' ? null : v, { shouldDirty: true })
              }
            >
              <SelectTrigger className={selectCls}>
                <SelectValue placeholder="Select band…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <span className="text-slate-400">No band</span>
                </SelectItem>
                {(bands ?? []).map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.code}
                    {b.name ? ` · ${b.name}` : ''}
                    {b.rangeFrom != null && b.rangeTo != null
                      ? ` · ${formatINR(b.rangeFrom)}–${formatINR(b.rangeTo)}`
                      : b.value != null
                        ? ` · ${formatINR(b.value)}`
                        : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {selectedBand && (
            <p className="text-[11px] text-slate-400 mt-1">
              {selectedBand.rangeFrom != null
                ? `${formatINR(selectedBand.rangeFrom)} – ${formatINR(selectedBand.rangeTo)}`
                : formatINR(selectedBand.value)}
              {selectedBand.experience != null ? ` · ${selectedBand.experience}y exp` : ''}
            </p>
          )}
        </div>
      )}
      <div>
        <FieldLabel>
          Sale Value <span className="text-[11px] font-normal text-slate-400">(optional)</span>
        </FieldLabel>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[13px] pointer-events-none">
            ₹
          </span>
          <Input
            type="number"
            min={0}
            step={1000}
            placeholder="e.g. 450000"
            value={saleValue ?? ''}
            onChange={e =>
              setValue('saleValue', e.target.value === '' ? null : parseFloat(e.target.value), {
                shouldDirty: true,
              })
            }
            className={`${inputCls} pl-7`}
          />
        </div>
        {saleValue != null && saleValue > 0 && (
          <p className="text-[11px] text-slate-400 mt-1">{formatINR(saleValue)}</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function computeTurnaround(start?: string | null, target?: string | null): number | null {
  if (!start || !target) return null;
  const days = Math.ceil(
    (new Date(target).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
  );
  return days > 0 ? days : null;
}

function toISOOrNull(v?: string | null) {
  if (!v) return null;
  try {
    return new Date(v).toISOString();
  } catch {
    return null;
  }
}

// coerce empty string / NaN → null for optional number fields
function coerceNumber(v: unknown): number | null {
  if (v === '' || v === undefined || v === null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA
// ─────────────────────────────────────────────────────────────────────────────
interface Band {
  id: string;
  code: string;
  name: string | null;
  rangeFrom: number | null;
  rangeTo: number | null;
  value: number | null;
  experience: number | null;
}

function formatINR(n: number | null | undefined): string {
  if (n == null) return '';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}
const optionalNumber = z.preprocess(coerceNumber, z.number().min(0).optional().nullable());

const schema = z.object({
  clientSpocId: z.string().min(1, 'SPOC is required'),
  title: z.string().min(1, 'Title is required').max(300).trim(),
  description: z.string().max(15000).optional().nullable(),
  jobType: z.enum(['CONTRACT', 'PERMANENT', 'CONTRACT_TO_HIRE', 'FREELANCE']),
  remoteType: z.enum(['ONSITE', 'REMOTE', 'HYBRID']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  jobOpenFor: z.enum(['EXTERNAL', 'INTERNAL', 'BOTH']).default('EXTERNAL'),
  totalOpenings: z.number().min(1).default(1),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  experienceMin: z.coerce.number().min(0).optional().default(0),
  experienceMax: z.coerce.number().min(0).optional().default(0),
  salaryMin: z.coerce.number().min(0).optional().default(0),
  salaryMax: z.coerce.number().min(0).optional().default(0),
  salaryType: z.enum(['MONTHLY', 'ANNUAL', 'HOURLY', 'DAILY']).optional().nullable(),
  salaryCurrency: z.string().default('INR'),
  bonusAmount: optionalNumber, // ← no NaN ever reaches here
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
  jdFileKey: z.string().optional().nullable(),
  jdFileName: z.string().optional().nullable(),
  jdFileType: z.string().optional().nullable(),
  jdParsedAt: z.string().optional().nullable(),
  jdParseStatus: z.enum(['PARSED', 'FAILED', 'MANUALLY_OVERRIDDEN']).optional().nullable(),
  jdParsedFields: z.array(z.string()).default([]),
  parsedJDId: z.string().optional().nullable(),

  bandId: z.string().optional().nullable(),
  saleValue: z.preprocess(coerceNumber, z.number().min(0).optional().nullable()),
});

type FormValues = z.infer<typeof schema>;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface MyClient {
  id: string;
  name: string;
  vmsName?: string;
  agreementType?: string | null;
  percentageValue?: number | null;
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
// SECTIONS
// ─────────────────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'sec-jd', label: 'Job Description', icon: Sparkles, sub: 'Search, upload or AI prompt' },
  { id: 'sec-basics', label: 'Basic Info', icon: FileText, sub: 'Title, type, details' },
  { id: 'sec-location', label: 'Location', icon: MapPin, sub: 'City, state, country' },
  { id: 'sec-skills', label: 'Skills', icon: Briefcase, sub: 'Primary & key skills' },
  { id: 'sec-compensation', label: 'Compensation', icon: DollarSign, sub: 'Salary, bonus' },
  { id: 'sec-client', label: 'Client & SPOC', icon: UserCheck, sub: 'Client & contact' },
  { id: 'sec-timeline', label: 'Timeline', icon: Calendar, sub: 'Dates & turnaround' },
];

const SECTION_FIELDS: Record<string, (keyof FormValues)[]> = {
  'sec-jd': [],
  'sec-basics': ['title', 'jobType', 'remoteType', 'totalOpenings'],
  'sec-location': ['city', 'state', 'country'],
  'sec-skills': ['primarySkills', 'keySkills', 'experienceMin', 'experienceMax'],
  'sec-compensation': ['salaryMin', 'salaryMax', 'salaryType', 'salaryCurrency', 'bonusAmount'],
  'sec-client': ['clientSpocId'],
  'sec-timeline': ['startDate', 'targetDate'],
};

// ─────────────────────────────────────────────────────────────────────────────
// UNFILLED FIELDS CONFIG
// Defines every field we track, with a label and how to check if filled
// ─────────────────────────────────────────────────────────────────────────────

// interface UnfilledField {
//   key: string;
//   label: string;
//   section: string;
//   required: boolean;
// }

// We check these reactively via useWatch
const TRACKED_FIELDS = [
  // required
  { key: 'title', label: 'Job Title', section: 'sec-basics', required: true },
  { key: 'jobType', label: 'Job Type', section: 'sec-basics', required: true },
  { key: 'remoteType', label: 'Remote Type', section: 'sec-basics', required: true },
  { key: 'clientSpocId', label: 'SPOC', section: 'sec-client', required: true },
  // optional but recommended
  { key: 'description', label: 'Description', section: 'sec-basics', required: false },
  { key: 'country', label: 'Country', section: 'sec-location', required: false },
  { key: 'state', label: 'State', section: 'sec-location', required: false },
  { key: 'city', label: 'City', section: 'sec-location', required: false },
  { key: 'experienceMin', label: 'Min Experience', section: 'sec-skills', required: false },
  { key: 'experienceMax', label: 'Max Experience', section: 'sec-skills', required: false },
  { key: 'salaryMin', label: 'Salary Min', section: 'sec-compensation', required: false },
  { key: 'salaryMax', label: 'Salary Max', section: 'sec-compensation', required: false },
  { key: 'salaryType', label: 'Salary Type', section: 'sec-compensation', required: false },
  { key: 'targetDate', label: 'Target Date', section: 'sec-timeline', required: false },
  { key: 'education', label: 'Education', section: 'sec-basics', required: false },
  { key: 'shift', label: 'Shift', section: 'sec-basics', required: false },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
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

// ─────────────────────────────────────────────────────────────────────────────
// UNFILLED FIELDS PANEL — right sidebar, sticky
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = {
  'sec-basics': 'Basic Info',
  'sec-location': 'Location',
  'sec-skills': 'Skills',
  'sec-compensation': 'Compensation',
  'sec-client': 'Client & SPOC',
  'sec-timeline': 'Timeline',
};

const SECTION_COLORS: Record<string, string> = {
  'sec-basics': 'text-slate-600',
  'sec-location': 'text-blue-600',
  'sec-skills': 'text-emerald-600',
  'sec-compensation': 'text-amber-600',
  'sec-client': 'text-indigo-600',
  'sec-timeline': 'text-rose-600',
};

function UnfilledPanel({
  control,
  primarySkills,
  // keySkills,
  onGoTo,
}: {
  control: any;
  primarySkills: string[];
  keySkills: string[];
  onGoTo: (sectionId: string) => void;
}) {
  const watched = useWatch({
    control,
    name: TRACKED_FIELDS.map(f => f.key) as any,
  });

  // build a map of key → value
  const valueMap: Record<string, any> = {};
  TRACKED_FIELDS.forEach((f, i) => {
    valueMap[f.key] = watched[i];
  });

  // special: primarySkills from store
  const hasSkills = primarySkills.length > 0;

  const unfilled = TRACKED_FIELDS.filter(f => {
    // @ts-expect-error err
    if (f.key === 'primarySkills') return !hasSkills;
    const v = valueMap[f.key];
    if (v === null || v === undefined || v === '') return true;
    if (typeof v === 'number' && isNaN(v)) return true;
    return false;
  });

  const required = unfilled.filter(f => f.required);
  const optional = unfilled.filter(f => !f.required);
  const filledCount = TRACKED_FIELDS.length - unfilled.length;
  const totalCount = TRACKED_FIELDS.length;
  const pct = Math.round((filledCount / totalCount) * 100);

  // group optional by section
  const bySection: Record<string, (typeof TRACKED_FIELDS)[number][]> = {};
  optional.forEach(f => {
    if (!bySection[f.section]) bySection[f.section] = [];
    bySection[f.section].push(f);
  });

  return (
    <div className="w-55 shrink-0 hidden xl:flex flex-col sticky top-0 h-fit pt-8 pr-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <ClipboardList size={13} className="text-slate-500" />
              <p className="text-[12px] font-bold text-slate-700">Form Progress</p>
            </div>
            <span
              className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                pct === 100
                  ? 'bg-emerald-100 text-emerald-700'
                  : pct >= 60
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              {pct}%
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                pct === 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-blue-500' : 'bg-amber-400'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[10.5px] text-slate-400 mt-1.5">
            {filledCount} of {totalCount} fields filled
          </p>
        </div>

        <div className="p-3 space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto">
          {/* Required missing */}
          {required.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-1.5 px-1">
                Required
              </p>
              <div className="space-y-1">
                {required.map(f => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => onGoTo(f.section)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-red-50 text-left group transition-colors"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                    <span className="text-[12px] text-red-600 font-medium group-hover:text-red-700 truncate">
                      {f.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Optional missing — grouped by section */}
          {optional.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-1">
                Recommended
              </p>
              <div className="space-y-2.5">
                {Object.entries(bySection).map(([sectionId, fields]) => (
                  <div key={sectionId}>
                    <button
                      type="button"
                      onClick={() => onGoTo(sectionId)}
                      className={`text-[10px] font-semibold uppercase tracking-wide mb-1 px-1 ${SECTION_COLORS[sectionId] ?? 'text-slate-400'} hover:underline`}
                    >
                      {SECTION_LABELS[sectionId]}
                    </button>
                    <div className="space-y-0.5">
                      {fields.map(f => (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => onGoTo(sectionId)}
                          className="w-full flex items-center gap-2 px-2.5 py-1 rounded-lg hover:bg-slate-50 text-left group transition-colors"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                          <span className="text-[11.5px] text-slate-500 group-hover:text-slate-700 truncate">
                            {f.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All filled */}
          {unfilled.length === 0 && (
            <div className="flex flex-col items-center py-4 gap-2">
              <CheckCircle size={20} className="text-emerald-500" />
              <p className="text-[12px] font-semibold text-emerald-700 text-center">
                All fields filled!
              </p>
              <p className="text-[11px] text-slate-400 text-center">Ready to submit.</p>
            </div>
          )}
        </div>
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
// LOCATION SECTION — cascading dropdowns
// ─────────────────────────────────────────────────────────────────────────────

function LocationSection({
  control,
  register,
  setValue,
  getValues,
}: {
  control: any;
  register: any;
  setValue: any;
  getValues: any;
}) {
  const watchedCountry = useWatch({ control, name: 'country' });
  const watchedState = useWatch({ control, name: 'state' });

  const states = watchedCountry ? getStates(watchedCountry) : [];
  const cities = watchedCountry && watchedState ? getCities(watchedCountry, watchedState) : [];

  const [manualState, setManualState] = useState(false);
  const [manualCity, setManualCity] = useState(false);

  useEffect(() => {
    setValue('state', '');
    setValue('city', '');
    setManualState(false);
    setManualCity(false);
  }, [watchedCountry, setValue]);

  useEffect(() => {
    setValue('city', '');
    setManualCity(false);
  }, [watchedState, setValue]);

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Country</FieldLabel>
        <Controller
          control={control}
          name="country"
          render={({ field }) => (
            <Select value={field.value ?? ''} onValueChange={v => field.onChange(v || null)}>
              <SelectTrigger className={`${selectCls} w-full`}>
                <div className="flex items-center gap-2">
                  <MapPin size={13} className="text-slate-400 shrink-0" />
                  <SelectValue placeholder="Select country…" />
                </div>
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {COUNTRIES.map((c: string) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <FieldLabel>State / Province</FieldLabel>
            {states.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setManualState(v => !v);
                  setValue('state', '');
                }}
                className="text-[11px] text-primary underline underline-offset-2"
              >
                {manualState ? 'Use list' : 'Type manually'}
              </button>
            )}
          </div>
          {!manualState && states.length > 0 ? (
            <Controller
              control={control}
              name="state"
              render={({ field }) => (
                <Select
                  value={field.value ?? ''}
                  onValueChange={v => field.onChange(v || null)}
                  disabled={!watchedCountry}
                >
                  <SelectTrigger className={selectCls}>
                    <SelectValue
                      placeholder={watchedCountry ? 'Select state…' : 'Select country first'}
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {states.map((s: string) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          ) : (
            <Input
              className={inputCls}
              placeholder="Type state / province…"
              {...register('state')}
            />
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <FieldLabel>City</FieldLabel>
            {cities.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setManualCity(v => !v);
                  setValue('city', '');
                }}
                className="text-[11px] text-primary underline underline-offset-2"
              >
                {manualCity ? 'Use list' : 'Type manually'}
              </button>
            )}
          </div>
          {!manualCity && cities.length > 0 ? (
            <Controller
              control={control}
              name="city"
              render={({ field }) => (
                <Select
                  value={field.value ?? ''}
                  onValueChange={v => field.onChange(v || null)}
                  disabled={!watchedState}
                >
                  <SelectTrigger className={selectCls}>
                    <SelectValue
                      placeholder={watchedState ? 'Select city…' : 'Select state first'}
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {cities.map((c: any) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          ) : (
            <div className="relative">
              <MapPin
                size={13}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <Input
                className={`${inputCls} pl-9`}
                placeholder="Type city…"
                {...register('city')}
              />
            </div>
          )}
        </div>
      </div>

      {(watchedCountry || watchedState) && (
        <div className="flex items-center gap-1.5 text-[12px] text-slate-500 flex-wrap">
          <MapPin size={11} className="text-blue-400 shrink-0" />
          {[getValues('city'), getValues('state'), getValues('country')].filter(Boolean).join(', ')}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TURNAROUND DISPLAY
// ─────────────────────────────────────────────────────────────────────────────

function TurnaroundDisplay({ control }: { control: any }) {
  const startDate = useWatch({ control, name: 'startDate' });
  const targetDate = useWatch({ control, name: 'targetDate' });
  const days = computeTurnaround(startDate, targetDate);
  if (!days) return null;
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-100 w-fit">
      <Calendar size={13} className="text-rose-400 shrink-0" />
      <span className="text-[13px] text-slate-500">
        Turnaround:{' '}
        <span className="font-bold text-rose-600">
          {days} day{days !== 1 ? 's' : ''}
        </span>
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SPOC SELECT ITEM
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
// JD SECTION — library gate + upload + AI prompt tabs
// ─────────────────────────────────────────────────────────────────────────────

// File: page.tsx
// Path: src/app/(dashboard)/requirements/new/page.tsx
// — replace only the JDSection component and the router.push call in handleLibrarySelect —

// ─── add to your router.push calls ───────────────────────────────────────────
// After handleLibrarySelect fills the form:
//   router.push(`/requirements/new?mode=new`) — user stays on this page (already there)
//   router.push(`/requirements/new?mode=duplicate&fromId=<existingReqId>`)
// The page reads searchParams and fires the right prefill.
// ─────────────────────────────────────────────────────────────────────────────

type JDMode = 'new' | 'duplicate';

function JDSection({
  onSelectLibrary,
  onUpload,
  onPromptFill,
  isParsing,
  parsedTitle,
  parsedFileName,
  parsedFieldCount,
  uploadedJDLibraryId,
  viewingJD,
  onViewJD,
}: {
  onSelectLibrary: (id: string) => void;
  onUpload: () => void;
  onPromptFill: (parsed: any, libraryId: string | null) => void;
  isParsing: boolean;
  parsedTitle: string | null;
  parsedFileName?: string | null; // ← add to parent state
  parsedFieldCount?: number | null; // ← add to parent state
  uploadedJDLibraryId: string | null;
  viewingJD: boolean;
  onViewJD: () => void;
}) {
  const axios = useAxios();
  const router = useRouter();

  const [q, setQ] = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isPrompting, setIsPrompting] = useState(false);
  const [promptUsed, setPromptUsed] = useState(0);
  const [mode, setMode] = useState<JDMode>('new');
  const [isDragging, setIsDragging] = useState(false);
  const PROMPT_LIMIT = 3;
  const promptLocked = promptUsed >= PROMPT_LIMIT;
  const dropRef = useRef<HTMLDivElement>(null);

  const { data: libData, isLoading: libLoading } = useQuery({
    queryKey: ['jd-library', q],
    queryFn: async () =>
      (await axios.get(`/jd/library/search?q=${encodeURIComponent(q)}&limit=8`)).data
        ?.data as LibraryResult[],
    enabled: dropOpen,
    staleTime: 30_000,
  });

  // close library dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // drag-over on upload zone
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }
  function handleDragLeave() {
    setIsDragging(false);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    // trigger the hidden file input via onUpload —
    // parent handles the actual file from jdInputRef
    onUpload();
  }

  async function handlePromptSubmit() {
    if (!prompt.trim() || promptLocked || isPrompting) return;
    setIsPrompting(true);
    try {
      const res = await axios.post('/jd/prompt-parse', { prompt });
      const { data: parsed, libraryId, used, limit } = res.data;
      setPromptUsed(used);
      onPromptFill(parsed, libraryId);
      toast.success('AI filled the form from your prompt');
      if (used >= limit) toast.warning(`All ${limit} AI prompts used. Locked for 1 hour.`);
      else toast.info(`${limit - used} AI prompt${limit - used !== 1 ? 's' : ''} remaining`);
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.code === 'PROMPT_LIMIT_EXCEEDED') {
        setPromptUsed(PROMPT_LIMIT);
        toast.error(data.message);
      } else toast.error(data?.message ?? 'AI prompt failed — try rephrasing');
    } finally {
      setIsPrompting(false);
    }
  }

  // ── "Duplicate" mode: pick an existing requirement to clone ───────────────
  function handleModeChange(m: JDMode) {
    setMode(m);
    if (m === 'duplicate') {
      // pass ?mode=duplicate to URL so page can read it on mount
      // and show a requirement picker or redirect
      router.push(`/requirements/new?mode=duplicate`);
    }
  }

  const isParsed = !!parsedTitle;

  return (
    <div className="space-y-4">
      {/* ── PARSED: success banner + mode chooser ── */}
      {isParsed ? (
        <div className="space-y-3">
          {/* Success banner */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <CheckCircle size={18} className="text-emerald-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-emerald-800 truncate">
                {parsedFileName ?? parsedTitle}
              </p>
              <p className="text-[11px] text-emerald-600 mt-0.5">
                {parsedFieldCount ? `${parsedFieldCount} fields auto-filled` : 'Form pre-filled'} ·
                saved to library
              </p>
            </div>
            <button
              type="button"
              onClick={onUpload}
              className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-700 shrink-0"
            >
              <RotateCcw size={12} />
              Reupload
            </button>
            {uploadedJDLibraryId && (
              <button
                type="button"
                onClick={onViewJD}
                disabled={viewingJD}
                className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-700 shrink-0 disabled:opacity-50"
              >
                {viewingJD ? 'Loading...' : 'View JD'}
              </button>
            )}
          </div>

          {/* New vs Duplicate */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              How do you want to use this JD?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  {
                    id: 'new' as JDMode,
                    icon: FileText,
                    title: 'New requirement',
                    sub: 'Fresh form, pre-filled from this JD',
                  },
                  {
                    id: 'duplicate' as JDMode,
                    icon: Users,
                    title: 'Duplicate existing',
                    sub: 'Clone a previous requirement',
                  },
                ] as const
              ).map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleModeChange(opt.id)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    mode === opt.id
                      ? 'border-primary bg-white shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`flex items-center gap-2 text-[13px] font-semibold mb-0.5 ${mode === opt.id ? 'text-primary' : 'text-slate-700'}`}
                  >
                    <opt.icon size={13} />
                    {opt.title}
                  </div>
                  <p className="text-[11px] text-slate-400">{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── NOT PARSED: upload-first UI ── */
        <div className="space-y-4">
          {/* PRIMARY: Upload zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={onUpload}
            className={`cursor-pointer flex flex-col items-center gap-2 py-8 px-6 border-2 border-dashed rounded-xl transition-all ${
              isDragging
                ? 'border-violet-500 bg-violet-50'
                : 'border-violet-200 hover:border-violet-400 hover:bg-violet-50/50'
            } ${isParsing ? 'opacity-60 pointer-events-none' : ''}`}
          >
            {isParsing ? (
              <>
                <Loader2 size={28} className="text-violet-400 animate-spin" />
                <p className="text-[14px] font-semibold text-violet-600">Parsing JD…</p>
                <p className="text-[12px] text-slate-400">AI is extracting fields</p>
              </>
            ) : (
              <>
                <Wand2 size={28} className="text-violet-400" />
                <p className="text-[14px] font-semibold text-violet-600">
                  Drop your JD here or click to upload
                </p>
                <p className="text-[12px] text-slate-400">AI will parse and auto-fill the form</p>
                <div className="flex gap-2 mt-1">
                  {['PDF', 'DOC', 'DOCX'].map(ext => (
                    <span
                      key={ext}
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-600"
                    >
                      {ext}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* SECONDARY: Library search */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-[11px] text-slate-400 shrink-0">or search library</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
            <div className="relative" ref={dropRef}>
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10"
              />
              <input
                className="w-full h-10 pl-9 pr-4 text-[13px] border border-slate-200 rounded-xl bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                placeholder="Search previously parsed JDs…"
                value={q}
                onChange={e => {
                  setQ(e.target.value);
                  setDropOpen(true);
                }}
                onFocus={() => setDropOpen(true)}
              />
              {dropOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-64 overflow-y-auto">
                  {libLoading ? (
                    <div className="flex items-center justify-center py-6 text-slate-400">
                      <Loader2 size={14} className="animate-spin mr-2" />
                      Searching…
                    </div>
                  ) : !libData?.length ? (
                    <div className="py-5 text-center text-[12px] text-slate-400">
                      {q ? 'No matches' : 'Start typing to search'}
                    </div>
                  ) : (
                    libData.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onSelectLibrary(item.id);
                          setDropOpen(false);
                          setQ(item.title);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-slate-900 truncate">
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
            <p className="text-[11px] text-slate-400 mt-1.5">
              Reuse a parsed JD to skip re-parsing and save credits
            </p>
          </div>

          {/* TERTIARY: AI prompt toggle */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowPrompt(v => !v)}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-violet-600 hover:text-violet-800 underline underline-offset-2 decoration-dashed"
            >
              <Zap size={12} />
              {showPrompt ? 'Hide AI prompt' : 'Use AI prompt instead'}
            </button>
          </div>

          {/* AI Prompt — shown only when toggled */}
          {showPrompt && (
            <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50">
              {promptLocked ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-200">
                  <Lock size={14} className="text-red-400 shrink-0" />
                  <div>
                    <p className="text-[13px] font-semibold text-red-700">AI prompt locked</p>
                    <p className="text-[11px] text-red-500 mt-0.5">
                      All {PROMPT_LIMIT} prompts used. Upload a file or wait up to 1 hour.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-[12px] text-slate-500">
                    Describe the role — AI will extract and fill the form automatically.
                  </p>
                  <Textarea
                    rows={3}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="e.g. Senior React Developer, 5+ yrs, remote, permanent, 25–35 LPA, skills: React, TypeScript, Node.js…"
                    className="text-[13px] border-slate-200 rounded-xl resize-none focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:border-violet-400"
                    disabled={isPrompting}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {Array.from({ length: PROMPT_LIMIT }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 w-8 rounded-full transition-colors ${i < promptUsed ? 'bg-violet-500' : 'bg-slate-200'}`}
                        />
                      ))}
                      <span className="text-[11px] text-slate-400 ml-1">
                        {PROMPT_LIMIT - promptUsed} left
                      </span>
                    </div>
                    <Button
                      type="button"
                      onClick={handlePromptSubmit}
                      disabled={!prompt.trim() || isPrompting}
                      size="sm"
                      className="h-8 px-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold gap-1.5 rounded-xl"
                    >
                      {isPrompting ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Generating…
                        </>
                      ) : (
                        <>
                          <Zap size={12} />
                          Generate
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* library-selected indicator */}
      {parsedTitle && !parsedFileName && (
        <p className="flex items-center gap-1.5 text-[12px] text-emerald-600 font-medium">
          <CheckCircle size={12} />
          Using: {parsedTitle}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function NewRequirementPage() {
  const axios = useAxios();
  const router = useRouter();

  const { draft, setDraft, clearDraft, hasDraft } = useRequirementDraftStore();

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
  const userClearedSpoc = useRef(false); // ← add this
  const [uploadedJDLibraryId, setUploadedJDLibraryId] = useState<string | null>(null);
  const [viewingJD, setViewingJD] = useState(false);

  // // 2. In handleJdFile, after fillFormFromParsed:
  // setParsedFileName(file.name);
  // setParsedFieldCount(filled.length);

  // ── RHF ──────────────────────────────────────────────────────────────────
  const {
    register,
    control,
    setValue,
    getValues,
    reset,
    trigger,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      bandId: null,
      saleValue: null,
      priority: 'MEDIUM',
      jobOpenFor: 'EXTERNAL',
      salaryCurrency: 'INR',
      totalOpenings: 1,
      primarySkills: [],
      keySkills: [],
      targetCompanies: [],
      noPoachCompanies: [],
      jdParsedFields: [],
      startDate: todayISO(),
      bonusAmount: null, // ← explicit null, never undefined → never NaN
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
    setValue('bonusAmount', draft.bonusAmount ?? null);
    setValue('hideSalaryFromCandidate', draft.hideSalaryFromCandidate);
    setValue('showMedianSalary', draft.showMedianSalary);
    setValue('clientSpocId', draft.clientSpocId);
    setValue('startDate', draft.startDate || todayISO());
    setValue('targetDate', draft.targetDate);
    setValue('jdFileKey', draft.jdFileKey);
    setValue('jdFileName', draft.jdFileName);
    setValue('jdFileType', draft.jdFileType);
    setValue('jdParsedAt', draft.jdParsedAt);
    setValue('jdParseStatus', draft.jdParseStatus as any);
    setValue('jdParsedFields', draft.jdParsedFields);
    setValue('parsedJDId', draft.parsedJDId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Array sync ────────────────────────────────────────────────────────────
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

  // ── Scroll-spy ────────────────────────────────────────────────────────────
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const sectionEls = SECTIONS.map(s => document.getElementById(s.id)).filter(
      Boolean
    ) as HTMLElement[];
    const visibilityMap = new Map<string, number>();
    sectionEls.forEach(el => {
      const obs = new IntersectionObserver(
        entries => {
          entries.forEach(e => visibilityMap.set(e.target.id, e.intersectionRatio));
          let maxRatio = 0;
          let mostVisible = SECTIONS[0].id;
          visibilityMap.forEach((r, id) => {
            if (r > maxRatio) {
              maxRatio = r;
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

  const scrollToSection = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleViewJD = async () => {
    if (!uploadedJDLibraryId) return;

    setViewingJD(true);

    try {
      const res = await axios.get(`/requirements/${uploadedJDLibraryId}/viewJd`);

      if (res.data?.url) {
        window.open(res.data.url, '_blank');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to open JD');
    } finally {
      setViewingJD(false);
    }
  };

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
      startDate: v.startDate ?? todayISO(),
      targetDate: v.targetDate ?? '',
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
  const selectedClient = clients.find(c => c.id === selectedClientId) ?? null;
  const rawSpocs = spocsRes?.data ?? [];
  const spocs = [...rawSpocs].sort((a, b) => {
    const ad = a.clientSpocDms?.length ?? 0,
      bd = b.clientSpocDms?.length ?? 0;
    if (ad !== bd) return bd - ad;
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return 0;
  });

  // Auto-select single client
  useEffect(() => {
    if (clients.length === 1 && !selectedClientId) setDraft({ selectedClientId: clients[0].id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients]);

  // Reset SPOC on client change
  useEffect(() => {
    userClearedSpoc.current = false;
    setSelectedSpoc(null);
    setValue('clientSpocId', '');
    setDraft({ clientSpocId: '' });
    setValue('bandId', null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId]);

  // Auto-select primary/only SPOC
  useEffect(() => {
    if (!spocs.length) return;
    if (userClearedSpoc.current) return;
    const primary = spocs.find(s => s.isPrimary);
    const autoSelect = primary ?? (spocs.length === 1 ? spocs[0] : null);
    if (autoSelect && !getValues('clientSpocId')) {
      setValue('clientSpocId', autoSelect.id);
      setSelectedSpoc(autoSelect);
      setDraft({ clientSpocId: autoSelect.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spocs]);

  // ── Fill form from parsed data ────────────────────────────────────────────
  function fillFormFromParsed(parsed: any, filled: string[] = []) {
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
    return filled;
  }

  // ── JD file upload ────────────────────────────────────────────────────────
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
      const filled = fillFormFromParsed(parsed);
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

          // Store library ID for viewing the uploaded JD
          setUploadedJDLibraryId(libId);
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

  async function handleLibrarySelect(id: string) {
    try {
      const res = await axios.post(`/jd/library/${id}/use`);
      const parsed = res.data.data as any;
      fillFormFromParsed(parsed);
      setValue('parsedJDId', id);
      setValue('jdParseStatus', 'PARSED');
      setDraft({ parsedJDId: id, parsedTitle: parsed.title, jdParseStatus: 'PARSED' });
      toast.success('Form prefilled from library');
    } catch {
      toast.error('Failed to load from library');
    }
  }

  function handlePromptFill(parsed: any, libraryId: string | null) {
    fillFormFromParsed(parsed);
    setValue('jdParseStatus', 'PARSED');
    if (libraryId) {
      setValue('parsedJDId', libraryId);
      setDraft({ parsedJDId: libraryId, parsedTitle: parsed.title, jdParseStatus: 'PARSED' });
    } else setDraft({ parsedTitle: parsed.title, jdParseStatus: 'PARSED' });
  }

  // ── Mutation ──────────────────────────────────────────────────────────────
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

  async function handleFinalSubmit() {
    snapshotToStore();
    const valid = await trigger();
    if (!valid) {
      function collectMessages(obj: Record<string, any>): string[] {
        const msgs: string[] = [];
        for (const key of Object.keys(obj)) {
          const val = obj[key];
          if (!val) continue;
          if (typeof val.message === 'string') msgs.push(val.message);
          else if (typeof val === 'object') msgs.push(...collectMessages(val));
        }
        return msgs;
      }
      const allMessages = collectMessages(errors as Record<string, any>);
      for (const sec of SECTIONS) {
        if ((SECTION_FIELDS[sec.id] ?? []).some(f => (errors as any)[f])) {
          scrollToSection(sec.id);
          break;
        }
      }
      if (allMessages.length > 0) allMessages.forEach(msg => toast.error(msg));
      else toast.error('Please fix all errors before submitting');
      return;
    }
    const data = getValues();
    await createMutation.mutateAsync({
      ...data,
      startDate: toISOOrNull(data.startDate),
      targetDate: toISOOrNull(data.targetDate),
      bonusAmount:
        data.bonusAmount === null ||
        data.bonusAmount === undefined ||
        isNaN(data.bonusAmount as number)
          ? null
          : data.bonusAmount,
      primarySkills,
      keySkills,
      targetCompanies,
      noPoachCompanies,

      bandId: data.bandId ?? null,
      saleValue: data.saleValue ?? null,
    });
  }

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
      startDate: todayISO(),
      bonusAmount: null,
    });
    setSelectedSpoc(null);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col bg-[#F8F9FB] overflow-hidden">
      {/* Top bar */}
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

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left sidebar — sections nav */}
        <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white h-full overflow-hidden">
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
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${isActive ? 'bg-primary/8 border border-primary/20' : 'hover:bg-slate-50'}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${hasError ? 'bg-red-500 text-white' : isActive ? 'bg-primary text-white shadow-sm shadow-primary/30' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}
                    >
                      {hasError ? <AlertCircle size={13} /> : <Icon size={13} />}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-[12.5px] font-semibold leading-none truncate ${hasError ? 'text-red-600' : isActive ? 'text-primary' : 'text-slate-600'}`}
                      >
                        {sec.label}
                      </p>
                      <p
                        className={`text-[10.5px] mt-0.5 truncate ${hasError ? 'text-red-400' : isActive ? 'text-primary/60' : 'text-slate-400'}`}
                      >
                        {hasError ? 'Has errors' : sec.sub}
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
                  <p className="text-[11.5px] text-violet-600">Search library or use AI</p>
                </>
              )}
            </div>
          </div>
        </aside>

        {/* Scrollable content area */}
        <main ref={scrollAreaRef} className="flex-1 overflow-y-auto">
          <input
            ref={jdInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={handleJdFile}
          />

          {/* Form + right panel side by side */}
          <div className="flex gap-0 min-h-full">
            {/* Form column */}
            <form
              onSubmit={e => {
                e.preventDefault();
                handleFinalSubmit();
              }}
              className="flex-1 px-8 py-8 space-y-6 max-w-3xl min-w-0"
            >
              {/* JD */}
              <SectionCard id="sec-jd">
                <SectionTitle
                  icon={Sparkles}
                  label="Job Description"
                  color="bg-violet-100 text-violet-600"
                />
                <JDSection
                  onSelectLibrary={handleLibrarySelect}
                  onUpload={() => jdInputRef.current?.click()}
                  onPromptFill={handlePromptFill}
                  isParsing={isParsing}
                  parsedTitle={parsedTitle}
                  uploadedJDLibraryId={uploadedJDLibraryId}
                  viewingJD={viewingJD}
                  onViewJD={handleViewJD}
                />
                {parseError && (
                  <p className="text-[12px] text-red-500 flex items-center gap-1">
                    <AlertCircle size={11} />
                    {parseError}
                  </p>
                )}
              </SectionCard>

              {/* Basic Info */}
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

              {/* Location */}
              <SectionCard id="sec-location">
                <SectionTitle icon={MapPin} label="Location" color="bg-blue-100 text-blue-600" />
                <LocationSection
                  control={control}
                  register={register}
                  setValue={setValue}
                  getValues={getValues}
                />
              </SectionCard>

              {/* Skills */}
              <SectionCard id="sec-skills">
                <SectionTitle
                  icon={Briefcase}
                  label="Skills & Experience"
                  color="bg-emerald-100 text-emerald-600"
                />
                <div>
                  <FieldLabel required>
                    Primary Skills{' '}
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
                    Key Skills{' '}
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
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      className={inputCls}
                      placeholder="Min"
                      {...register('experienceMin')}
                    />
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      className={inputCls}
                      placeholder="Max"
                      {...register('experienceMax')}
                    />
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

              {/* Compensation */}
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
                      {...register('salaryMin')}
                    />
                  </div>
                  <div>
                    <FieldLabel>Salary Max</FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      className={inputCls}
                      placeholder="0"
                      {...register('salaryMax')}
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

                  {/* Bonus — toggle pattern, no free input unless user wants it */}
                  <div className="col-span-2">
                    <BonusField control={control} setValue={setValue} register={register} />
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
                    <span className="text-[13px] text-slate-600 font-medium">
                      Show median salary
                    </span>
                  </label>
                </div>
              </SectionCard>

              {/* Client & SPOC */}
              <SectionCard id="sec-client">
                <SectionTitle
                  icon={UserCheck}
                  label="Client & SPOC"
                  color="bg-indigo-100 text-indigo-600"
                />
                <div className="grid grid-cols-1 gap-5">
                  <div>
                    <FieldLabel required>Client</FieldLabel>
                    {clients.length === 1 ? (
                      <div className="h-11 flex items-center px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-[14px] font-semibold text-slate-700 gap-2">
                        <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                        {clients[0].name}
                        {clients[0].vmsName ? ` (${clients[0].vmsName})` : ''}
                      </div>
                    ) : (
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
                    )}
                  </div>
                  <div>
                    <FieldLabel required>SPOC</FieldLabel>
                    {spocs.length > 0 && (
                      <p className="text-[11px] text-slate-400 mb-2 flex items-center gap-1">
                        <Tag size={10} className="text-violet-400" />
                        SPOCs with tagged DMs shown first
                      </p>
                    )}
                    {spocs.length === 1 && selectedSpoc ? (
                      // Only one SPOC — lock it, no change option
                      <div className="h-11 flex items-center px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-[14px] font-semibold text-slate-700 gap-2">
                        <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                        {selectedSpoc.firstName} {selectedSpoc.lastName}
                        {selectedSpoc.isPrimary && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold ml-1">
                            Primary
                          </span>
                        )}
                      </div>
                    ) : selectedSpoc && !userClearedSpoc.current ? (
                      // Auto-selected primary, user can still change
                      <div className="h-11 flex items-center px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-[14px] font-semibold text-slate-700 gap-2">
                        <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                        {selectedSpoc.firstName} {selectedSpoc.lastName}
                        {selectedSpoc.isPrimary && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold ml-1">
                            Primary
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            userClearedSpoc.current = true;
                            setSelectedSpoc(null);
                            setValue('clientSpocId', '');
                          }}
                          className="ml-auto text-[11px] text-primary underline underline-offset-2"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      // Full dropdown
                      <Controller
                        control={control}
                        name="clientSpocId"
                        render={({ field }) => (
                          <Select
                            value={field.value || ''}
                            onValueChange={val => {
                              userClearedSpoc.current = false;
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
                              {(() => {
                                const withDMs = spocs.filter(
                                  s => (s.clientSpocDms?.length ?? 0) > 0
                                );
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
                    )}
                    <FieldError msg={errors.clientSpocId?.message} />
                  </div>
                </div>
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

                <BandSaleValueFields
                  clientId={selectedClientId}
                  clientAgreementType={selectedClient?.agreementType}
                  control={control}
                  setValue={setValue}
                />
              </SectionCard>

              {/* Timeline */}
              <SectionCard id="sec-timeline">
                <SectionTitle icon={Calendar} label="Timeline" color="bg-rose-100 text-rose-600" />
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <FieldLabel>Start Date</FieldLabel>
                    <Input type="date" className={inputCls} {...register('startDate')} />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Defaults to today if unchanged
                    </p>
                  </div>
                  <div>
                    <FieldLabel>Target Date</FieldLabel>
                    <Input type="date" className={inputCls} {...register('targetDate')} />
                  </div>
                </div>
                <TurnaroundDisplay control={control} />
              </SectionCard>

              {/* Bottom submit */}
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

            {/* Right panel — unfilled fields tracker */}
            <UnfilledPanel
              control={control}
              primarySkills={primarySkills}
              keySkills={keySkills}
              onGoTo={scrollToSection}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BONUS FIELD — toggle pattern to avoid NaN
// Shows a button to add bonus; once clicked shows input with clear option
// ─────────────────────────────────────────────────────────────────────────────

function BonusField({
  control,
  setValue,
  register,
}: {
  control: any;
  setValue: any;
  register: any;
}) {
  const bonus = useWatch({ control, name: 'bonusAmount' });
  const hasBonus = bonus !== null && bonus !== undefined && !isNaN(bonus as number);

  if (!hasBonus) {
    return (
      <button
        type="button"
        onClick={() => setValue('bonusAmount', 0)}
        className="flex items-center gap-2 text-[12.5px] font-semibold text-slate-500 hover:text-primary border border-dashed border-slate-300 hover:border-primary px-3 py-2 rounded-xl transition-colors w-full justify-center"
      >
        <Plus size={13} />
        Add Bonus Amount
      </button>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <FieldLabel>Bonus Amount</FieldLabel>
        <button
          type="button"
          onClick={() => setValue('bonusAmount', null)}
          className="text-[11px] text-slate-400 hover:text-red-500 flex items-center gap-1"
        >
          <X size={11} />
          Remove
        </button>
      </div>
      <Input
        type="number"
        min={0}
        className={inputCls}
        placeholder="Enter bonus amount"
        {...register('bonusAmount')}
      />
    </div>
  );
}
