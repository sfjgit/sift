/* eslint-disable @typescript-eslint/no-explicit-any */
// File: page.tsx
// Path: src/app/(dashboard)/requirements/[id]/edit/page.tsx

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller, useWatch } from 'react-hook-form';
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
  CheckCircle,
  Tag,
  ExternalLink,
  Wand2,
  RotateCcw,
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
import { COUNTRIES, getStates, getCities } from '@/data/locationData';

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

function coerceNumber(v: unknown): number | null {
  if (v === '' || v === undefined || v === null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function toNum(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function computeTurnaround(start?: string | null, target?: string | null): number | null {
  if (!start || !target) return null;
  const days = Math.ceil(
    (new Date(target).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
  );
  return days > 0 ? days : null;
}

function formatINR(n: number | null | undefined): string {
  if (n == null) return '';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
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

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

const optionalNumber = z.preprocess(coerceNumber, z.number().min(0).optional().nullable());

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
  experienceMin: optionalNumber,
  experienceMax: optionalNumber,
  salaryMin: optionalNumber,
  salaryMax: optionalNumber,
  salaryType: z.enum(['MONTHLY', 'ANNUAL', 'HOURLY', 'DAILY']).optional().nullable(),
  salaryCurrency: z.string(),
  bonusAmount: optionalNumber,
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
  // clientSpocId IS present — needed to track dirty state for SPOC changes
  clientSpocId: z.string().optional().nullable(),
  bandId: z.string().optional().nullable(),
  saleValue: z.preprocess(coerceNumber, z.number().min(0).optional().nullable()),
});

type EditFormValues = z.infer<typeof schema>;

// ─────────────────────────────────────────────────────────────────────────────
// MAP API → form defaults
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
    country: req.country ?? null,
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
    clientSpocId: req.clientSpoc?.id ?? null,
    bandId: req.bandId ?? null,
    saleValue: req.saleValue ?? null,
  };
}

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
// JD UPLOAD + VIEW FIELD
//
// Fix #2: After parsing, we store parsedJDId (library entry ID) — not jdFileKey.
// The backend resolves the actual S3 key from the library.
//
// Fix #1: "View JD" calls GET /requirements/:id/jd which generates a signed
// URL on demand — never stored.
// ─────────────────────────────────────────────────────────────────────────────

interface JDMeta {
  parsedJDId: string | null; // Fix #2: this is what we send to the backend
  jdFileName: string | null; // display only
}

// File: page.tsx
// Path: src/app/(dashboard)/requirements/[id]/edit/page.tsx
// — Replace only JDUploadField, everything else untouched —

function JDUploadField({
  requirementId,
  jdMeta,
  hasExistingFile,
  onUploaded,
  onFieldsFilled,
}: {
  requirementId: string;
  jdMeta: JDMeta;
  hasExistingFile: boolean;
  onUploaded: (meta: JDMeta) => void;
  onFieldsFilled: (parsed: any) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [viewingJD, setViewingJD] = useState(false);
  const axios = useAxios();

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('jd', file);
      const res = await axios.post('/jd/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const json = res.data;

      if (!json.success) {
        toast.error(json.message ?? 'Failed to parse JD');
        return;
      }

      let parsedJDId: string | null = null;
      try {
        const libRes = await axios.post('/jd/library', {
          title: json.data.title ?? file.name,
          parsedData: json.data,
          jdFileKey: json.jdFileKey,
          jdFileName: json.jdFileName ?? file.name,
          jdFileType: json.jdFileType ?? file.type,
        });
        parsedJDId = libRes.data.data?.id ?? null;
      } catch {
        // non-fatal
      }

      onUploaded({
        parsedJDId,
        jdFileName: json.jdFileName ?? file.name,
      });
      onFieldsFilled(json.data);
      toast.success('JD parsed — fields updated. Review and save.');
    } catch {
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleViewJD() {
    const viewId = jdMeta.parsedJDId ?? requirementId;
    if (!viewId) return;
    setViewingJD(true);
    try {
      const res = await axios.get(`/requirements/${viewId}/viewJd`);
      if (res.data.url) {
        window.open(res.data.url, '_blank', 'noopener,noreferrer');
      }
    } catch {
      toast.error('Could not load JD. Try again.');
    } finally {
      setViewingJD(false);
    }
  }

  const canView = hasExistingFile || !!jdMeta.parsedJDId;
  const hasParsed = canView; // mirrors parsedTitle check on new page

  // ── hidden file input — always rendered ──────────────────────────────────
  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept=".pdf,.doc,.docx,.rtf"
      className="sr-only"
      disabled={uploading}
      onChange={e => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        e.target.value = '';
      }}
    />
  );

  // ── PARSED STATE — mirrors new page's success banner ─────────────────────
  if (hasParsed) {
    return (
      <div className="space-y-3 mt-3">
        {fileInput}
        {/* Success banner — identical to new page */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
          <CheckCircle size={18} className="text-emerald-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-emerald-800 truncate">
              {jdMeta.jdFileName ?? 'Job Description'}
            </p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Attached · saved to library</p>
          </div>
          {/* Reupload — same style as new page's RotateCcw button */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-700 shrink-0 disabled:opacity-50"
          >
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
            {uploading ? 'Parsing…' : 'Replace'}
          </button>
          {/* View JD — same style as new page's View JD button */}
          <button
            type="button"
            onClick={handleViewJD}
            disabled={viewingJD}
            className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-700 shrink-0 disabled:opacity-50"
          >
            {viewingJD ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <ExternalLink size={12} />
            )}
            {viewingJD ? 'Loading…' : 'View JD'}
          </button>
        </div>
        <p className="text-[11px] text-slate-400">
          PDF, DOCX, DOC, RTF · max 10 MB · fields auto-fill on upload
        </p>
      </div>
    );
  }

  // ── UNPARSED STATE — upload zone matching new page's dashed box ──────────
  return (
    <div className="space-y-3 mt-3">
      {fileInput}
      <div
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer flex flex-col items-center gap-2 py-8 px-6 border-2 border-dashed rounded-xl transition-all ${
          uploading
            ? 'border-violet-300 bg-violet-50/60 opacity-60 pointer-events-none'
            : 'border-violet-200 hover:border-violet-400 hover:bg-violet-50/50'
        }`}
      >
        {uploading ? (
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
              {['PDF', 'DOC', 'DOCX', 'RTF'].map(ext => (
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
      <p className="text-[11px] text-slate-400">Fields auto-fill on upload · max 10 MB</p>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// BAND + SALE VALUE FIELDS
//
// clientId and clientAgreementType are passed from the parent.
// In readonly mode  → uses req.client data (stable).
// In change mode    → uses the live selected client's data from ClientSpocEditor.
// ─────────────────────────────────────────────────────────────────────────────

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

  // When client changes (in change mode), clear the band selection so a stale
  // band ID from the old client doesn't get submitted.
  const prevClientIdRef = useRef<string | null | undefined>(clientId);
  useEffect(() => {
    if (prevClientIdRef.current !== undefined && prevClientIdRef.current !== clientId) {
      setValue('bandId', null, { shouldDirty: true });
    }
    prevClientIdRef.current = clientId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

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
// CLIENT & SPOC EDITOR
//
// onClientChange — called whenever the active client changes so the parent can
//                  pass the live clientId + agreementType down to BandSaleValueFields.
// ─────────────────────────────────────────────────────────────────────────────

function ClientSpocEditor({
  value,
  onChange,
  onClientChange,
}: {
  value: string | null;
  onChange: (spocId: string) => void;
  onClientChange?: (client: MyClient | null) => void;
}) {
  const axios = useAxios();

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedSpoc, setSelectedSpoc] = useState<ClientSpoc | null>(null);
  const userClearedSpoc = useRef(false);

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
  const spocs = [...rawSpocs].sort((a, b) => {
    const ad = a.clientSpocDms?.length ?? 0,
      bd = b.clientSpocDms?.length ?? 0;
    if (ad !== bd) return bd - ad;
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return 0;
  });

  // Auto-select when there's only one client
  useEffect(() => {
    if (clients.length === 1 && !selectedClientId) setSelectedClientId(clients[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients]);

  // Notify parent whenever selected client changes
  useEffect(() => {
    if (!onClientChange) return;
    const client = clients.find(c => c.id === selectedClientId) ?? null;
    onClientChange(client);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId, clients]);

  // Clear SPOC when client changes
  const prevClientRef = useRef<string>('');
  useEffect(() => {
    if (prevClientRef.current && prevClientRef.current !== selectedClientId) {
      userClearedSpoc.current = false;
      setSelectedSpoc(null);
      onChange('');
    }
    prevClientRef.current = selectedClientId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId]);

  // Auto-select SPOC when list loads / value already set
  useEffect(() => {
    if (!spocs.length) return;
    if (userClearedSpoc.current) return;
    const existing = value ? spocs.find(s => s.id === value) : null;
    if (existing) {
      setSelectedSpoc(existing);
      return;
    }
    const primary = spocs.find(s => s.isPrimary);
    const autoSelect = primary ?? (spocs.length === 1 ? spocs[0] : null);
    if (autoSelect && !value) {
      setSelectedSpoc(autoSelect);
      onChange(autoSelect.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spocs]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5">
        {/* Client picker */}
        <div>
          <FieldLabel required>Client</FieldLabel>
          {clients.length === 1 ? (
            <div className="h-11 flex items-center px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-[14px] font-semibold text-slate-700 gap-2">
              <CheckCircle size={14} className="text-emerald-500 shrink-0" />
              {clients[0].name}
              {clients[0].vmsName ? ` (${clients[0].vmsName})` : ''}
            </div>
          ) : (
            <Select value={selectedClientId} onValueChange={id => setSelectedClientId(id)}>
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

        {/* SPOC picker */}
        <div>
          <FieldLabel required>SPOC</FieldLabel>
          {spocs.length > 0 && (
            <p className="text-[11px] text-slate-400 mb-2 flex items-center gap-1">
              <Tag size={10} className="text-violet-400" />
              SPOCs with tagged DMs shown first
            </p>
          )}
          {spocs.length === 1 && selectedSpoc ? (
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
                  onChange('');
                }}
                className="ml-auto text-[11px] text-primary underline underline-offset-2"
              >
                Change
              </button>
            </div>
          ) : (
            <Select
              value={value || ''}
              onValueChange={val => {
                userClearedSpoc.current = false;
                onChange(val);
                setSelectedSpoc(spocs.find(s => s.id === val) ?? null);
              }}
              disabled={!selectedClientId}
            >
              <SelectTrigger className={selectCls}>
                <SelectValue
                  placeholder={!selectedClientId ? 'Select client first' : 'Select SPOC…'}
                />
              </SelectTrigger>
              <SelectContent>
                {(() => {
                  const withDMs = spocs.filter(s => (s.clientSpocDms?.length ?? 0) > 0);
                  const withoutDMs = spocs.filter(s => (s.clientSpocDms?.length ?? 0) === 0);
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
        </div>
      </div>

      {/* Derived info display */}
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCATION SECTION
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

  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    setValue('state', '');
    setValue('city', '');
    setManualState(false);
    setManualCity(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedCountry]);

  const stateChangedRef = useRef(false);
  useEffect(() => {
    if (!stateChangedRef.current) {
      stateChangedRef.current = true;
      return;
    }
    setValue('city', '');
    setManualCity(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedState]);

  return (
    <div className="space-y-4">
      <p className="text-[11.5px] text-slate-400">Pick from the list or type any custom value</p>
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
                {COUNTRIES.map(c => (
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
                    {states.map(s => (
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
                    {cities.map(c => (
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
// BONUS FIELD
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
        <Plus size={13} /> Add Bonus Amount
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
          <X size={11} /> Remove
        </button>
      </div>
      <Input
        type="number"
        min={0}
        className={inputCls}
        placeholder="Enter bonus amount"
        {...register('bonusAmount', { valueAsNumber: true })}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTIONS CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'edit-basics', label: 'Basic Info', icon: FileText, sub: 'Title, type, details' },
  { id: 'edit-location', label: 'Location', icon: MapPin, sub: 'City, state, country' },
  { id: 'edit-skills', label: 'Skills', icon: Briefcase, sub: 'Primary & key skills' },
  { id: 'edit-compensation', label: 'Compensation', icon: DollarSign, sub: 'Salary, bonus' },
  { id: 'edit-client', label: 'Client & SPOC', icon: UserCheck, sub: 'Client, SPOC, SL & BU' },
  { id: 'edit-timeline', label: 'Timeline', icon: Calendar, sub: 'Dates & turnaround' },
];

const SECTION_FIELDS: Record<string, (keyof EditFormValues)[]> = {
  'edit-basics': ['title', 'jobType', 'remoteType'],
  'edit-location': ['city', 'state', 'country'],
  'edit-skills': ['primarySkills', 'keySkills'],
  'edit-compensation': ['salaryMin', 'salaryMax', 'salaryType', 'bonusAmount'],
  'edit-client': ['clientSpocId'],
  'edit-timeline': ['startDate', 'targetDate'],
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
  const [changingClient, setChangingClient] = useState(false);

  // Tracks the live selected client when in "change client" mode so we can
  // pass the correct clientId + agreementType to BandSaleValueFields.
  const [liveClient, setLiveClient] = useState<MyClient | null>(null);

  // ── JD file meta — lives outside react-hook-form (not a form field) ────────
  const [jdMeta, setJdMeta] = useState<JDMeta>({
    parsedJDId: null,
    jdFileName: null,
  });
  const [hasExistingFile, setHasExistingFile] = useState(false);

  const { data: reqRes, isLoading } = useQuery({
    queryKey: ['requirement', id],
    queryFn: async () => (await axios.get(`/requirements/${id}`)).data,
  });
  const req = reqRes?.data;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, dirtyFields },
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
      bonusAmount: null,
      clientSpocId: null,
      bandId: null,
      saleValue: null,
    },
  });

  useEffect(() => {
    if (!req) return;
    reset(reqToFormValues(req));
    setTimeout(() => {
      // Seed jdMeta from the existing requirement
      setJdMeta({
        // jdFileKey: req.jdFileKey ?? null,
        // jdFileName: req.jdFileName ?? null,
        // jdFileType: req.jdFileType ?? null,
        parsedJDId: req.parsedJDId ?? null,
        jdFileName: req.jdFileName ?? null,
      });
      setHasExistingFile(!!req.jdFileKey);
      setIsReady(true);
    }, 0);
  }, [req, reset]);

  // Intersection observer for sidebar active section
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
  }, [req, changingClient]);

  const scrollToSection = useCallback((sid: string) => {
    document.getElementById(sid)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) =>
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

  // ── Called by JDUploadField after a successful parse ──────────────────────
  function handleJDFieldsFilled(parsed: any) {
    const fieldMap: Partial<Record<keyof EditFormValues, any>> = {
      title: parsed.title,
      description: parsed.description,
      primarySkills: parsed.primarySkills,
      keySkills: parsed.keySkills,
      experienceMin: parsed.experienceMin,
      experienceMax: parsed.experienceMax,
      education: parsed.education,
      city: parsed.city,
      state: parsed.state,
      country: parsed.country,
      salaryMin: parsed.salaryMin,
      salaryMax: parsed.salaryMax,
      salaryType: parsed.salaryType,
      jobType: parsed.jobType,
      remoteType: parsed.remoteType,
      shift: parsed.shift,
      functionalArea: parsed.functionalArea,
      targetCompanies: parsed.targetCompanies,
      noPoachCompanies: parsed.noPoachCompanies,
      bonusAmount: parsed.bonusAmount,
    };
    (Object.entries(fieldMap) as [keyof EditFormValues, any][]).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        setValue(key, val, { shouldDirty: true });
      }
    });
  }

  async function onSubmit(allValues: EditFormValues) {
    const payload: Record<string, any> = {};

    (Object.keys(dirtyFields) as (keyof EditFormValues)[]).forEach(field => {
      payload[field] = allValues[field];
    });

    if (Object.keys(payload).length === 0) {
      toast.info('No changes to save');
      return;
    }

    // If clientSpocId is being changed, enforce a valid value
    if ('clientSpocId' in payload && !payload.clientSpocId) {
      toast.error('Select a SPOC before saving the client change');
      return;
    }

    // Coerce numeric fields
    const numFields = [
      'experienceMin',
      'experienceMax',
      'salaryMin',
      'salaryMax',
      'bonusAmount',
      'totalOpenings',
      'saleValue',
    ] as const;
    numFields.forEach(f => {
      if (f in payload) payload[f] = toNum(payload[f]);
    });

    // ISO-ify dates and auto-compute turnaround
    if ('startDate' in payload) payload.startDate = toISOOrNull(payload.startDate);
    if ('targetDate' in payload) payload.targetDate = toISOOrNull(payload.targetDate);

    if ('startDate' in payload || 'targetDate' in payload) {
      const start = payload.startDate ?? toISOOrNull(allValues.startDate);
      const target = payload.targetDate ?? toISOOrNull(allValues.targetDate);
      if (start && target) {
        payload.turnaroundDays = Math.ceil(
          (new Date(target).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
        );
      } else {
        // One date was cleared — clear turnaround too
        payload.turnaroundDays = null;
      }
    }

    // payload.jdFileKey = jdMeta.jdFileKey;
    // payload.jdFileName = jdMeta.jdFileName;
    // payload.jdFileType = jdMeta.jdFileType;
    payload.parsedJDId = jdMeta.parsedJDId;
    await updateMutation.mutateAsync(payload);
  }

  // ── Determine which client data to show in BandSaleValueFields ─────────────
  // Readonly mode → stable req.client data
  // Change mode   → live selected client from ClientSpocEditor
  const bandClientId = changingClient ? liveClient?.id : req?.client?.id;
  const bandAgreementType = changingClient ? liveClient?.agreementType : req?.client?.agreementType;

  if (isLoading || !isReady || !req) {
    return (
      <div className="h-screen flex flex-col bg-[#F8F9FB] overflow-hidden">
        <div className="shrink-0 bg-white border-b px-6 py-3 flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-32 ml-auto" />
        </div>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="hidden lg:block w-60 border-r bg-white" />
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

  const dirtyCount = Object.keys(dirtyFields).length;

  return (
    <div className="h-screen flex flex-col bg-[#F8F9FB] overflow-hidden">
      {/* ── Top bar ── */}
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
        {dirtyCount > 0 && (
          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            {dirtyCount} unsaved change{dirtyCount !== 1 ? 's' : ''}
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

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
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
                const isDirty = secFields.some(f => (dirtyFields as any)[f]);
                const Icon = sec.icon;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => scrollToSection(sec.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                      isActive ? 'bg-primary/8 border border-primary/20' : 'hover:bg-slate-50'
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
          <div className="shrink-0 p-4 border-t border-slate-100">
            <div className="rounded-xl p-3 bg-slate-50 border border-slate-200 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Context
              </p>
              <p className="text-[12px] font-semibold text-slate-700">
                {changingClient ? (liveClient?.name ?? '—') : (req.client?.name ?? '—')}
              </p>
              <p className="text-[11px] text-slate-500">{req.serviceLine?.name}</p>
              <p className="text-[11px] text-slate-400">{req.businessUnit?.name}</p>
            </div>
          </div>
        </aside>

        {/* Scrollable form */}
        <main className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-8 space-y-6 max-w-3xl">
            {/* ── Basic Info ── */}
            <SectionCard id="edit-basics">
              <SectionTitle
                icon={FileText}
                label="Basic Info"
                color="bg-slate-100 text-slate-600"
              />
              {/* JD Upload + View */}
              <JDUploadField
                requirementId={id}
                jdMeta={jdMeta}
                hasExistingFile={hasExistingFile}
                onUploaded={meta => {
                  setJdMeta(meta);
                  setHasExistingFile(false); /* new upload, view will work after save */
                }}
                onFieldsFilled={handleJDFieldsFilled}
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

            {/* ── Location ── */}
            <SectionCard id="edit-location">
              <SectionTitle icon={MapPin} label="Location" color="bg-blue-100 text-blue-600" />
              <LocationSection
                control={control}
                register={register}
                setValue={setValue}
                getValues={getValues}
              />
            </SectionCard>

            {/* ── Skills ── */}
            <SectionCard id="edit-skills">
              <SectionTitle
                icon={Briefcase}
                label="Skills & Experience"
                color="bg-emerald-100 text-emerald-600"
              />
              <div>
                <FieldLabel>
                  Primary Skills{' '}
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
                  Key Skills{' '}
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

            {/* ── Compensation ── */}
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
                  <span className="text-[13px] text-slate-600 font-medium">Show median salary</span>
                </label>
              </div>
            </SectionCard>

            {/* ── Client & SPOC ── */}
            <SectionCard id="edit-client">
              <SectionTitle
                icon={UserCheck}
                label="Client & SPOC"
                color="bg-indigo-100 text-indigo-600"
              />

              {!changingClient ? (
                <>
                  <div className="flex items-center justify-between -mt-1">
                    <p className="text-[11.5px] text-slate-400 flex items-center gap-1.5">
                      <Sparkles size={11} className="text-slate-400" />
                      Service Line & Business Unit follow the SPOC.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setChangingClient(true);
                        // Initialise liveClient from the current req so band
                        // context doesn't flash while the picker loads.
                        setLiveClient(
                          req.client
                            ? {
                                id: req.client.id,
                                name: req.client.name,
                                agreementType: req.client.agreementType,
                                percentageValue: req.client.percentageValue,
                              }
                            : null
                        );
                      }}
                      className="text-[11px] font-semibold text-primary underline underline-offset-2"
                    >
                      Change
                    </button>
                  </div>

                  {/* Readonly snapshot */}
                  <div className="grid grid-cols-2 gap-4">
                    <ReadonlyField label="Client" value={req.client?.name ?? '—'} />
                    <ReadonlyField
                      label="SPOC"
                      value={
                        req.clientSpoc
                          ? `${req.clientSpoc.firstName ?? req.clientSpoc.handler?.firstName ?? ''} ${req.clientSpoc.lastName ?? req.clientSpoc.handler?.lastName ?? ''}`.trim() ||
                            '—'
                          : '—'
                      }
                    />
                    <ReadonlyField label="Service Line" value={req.serviceLine?.name ?? '—'} />
                    <ReadonlyField label="Business Unit" value={req.businessUnit?.name ?? '—'} />
                  </div>

                  {/* Band + Sale Value using stable req data */}
                  <BandSaleValueFields
                    clientId={bandClientId}
                    clientAgreementType={bandAgreementType}
                    control={control}
                    setValue={setValue}
                  />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between -mt-1">
                    <p className="text-[11.5px] text-slate-400">
                      Pick a client, then a SPOC. SL &amp; BU update automatically.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setChangingClient(false);
                        setLiveClient(null);
                        // Restore original SPOC — mark as not dirty
                        setValue('clientSpocId', req.clientSpoc?.id ?? null, {
                          shouldDirty: false,
                          shouldValidate: false,
                        });
                        // Also restore bandId if it was cleared by client change
                        setValue('bandId', req.bandId ?? null, {
                          shouldDirty: false,
                          shouldValidate: false,
                        });
                      }}
                      className="text-[11px] text-slate-400 hover:text-red-500 flex items-center gap-1"
                    >
                      <X size={11} /> Cancel
                    </button>
                  </div>

                  {/* Live SPOC/client editor */}
                  <Controller
                    control={control}
                    name="clientSpocId"
                    render={({ field }) => (
                      <ClientSpocEditor
                        value={field.value ?? null}
                        onChange={v => {
                          field.onChange(v);
                        }}
                        onClientChange={client => {
                          setLiveClient(client);
                        }}
                      />
                    )}
                  />
                  <FieldError msg={(errors as any).clientSpocId?.message} />

                  {/* Band + Sale Value using live client data */}
                  <BandSaleValueFields
                    clientId={bandClientId}
                    clientAgreementType={bandAgreementType}
                    control={control}
                    setValue={setValue}
                  />
                </>
              )}
            </SectionCard>

            {/* ── Timeline ── */}
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
              </div>
              <TurnaroundDisplay control={control} />
              <p className="text-[11px] text-slate-400">
                Turnaround is auto-calculated and saved on submit.
              </p>
            </SectionCard>

            {/* ── Bottom actions ── */}
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
