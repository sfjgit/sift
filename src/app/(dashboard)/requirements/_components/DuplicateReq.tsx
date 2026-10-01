// File: DuplicateRequirementDialog.tsx
// Path: src/components/requirements/DuplicateRequirementDialog.tsx

'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Copy,
  AlertTriangle,
  FileText,
  Briefcase,
  MapPin,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { useAxios } from '@/hooks/useAxios';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DuplicatePreview {
  id: string;
  title: string;
  suggestedTitle: string;
  description: string | null;
  jobType: string;
  remoteType: string;
  priority: string;
  jobOpenFor: string;
  totalOpenings: number;
  primarySkills: string[];
  keySkills: string[];
  targetCompanies: string[];
  noPoachCompanies: string[];
  city: string | null;
  state: string | null;
  country: string | null;
  experienceMin: number | null;
  experienceMax: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryType: string | null;
  salaryCurrency: string | null;
  education: string | null;
  functionalArea: string | null;
  shift: string | null;
  jdFileName: string | null;
  jdFileKey: string | null;
  parsedJDId: string | null;
  client: { name: string } | null;
  serviceLine: { name: string } | null;
  clientId: string | null;
  clientSpocId: string | null;
  serviceLineId: string | null;
  clientSpoc: { firstName: string; lastName: string } | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  requirementId: string;
  reqCode: string;
}

// ─── Utils ────────────────────────────────────────────────────────────────────

// function fmtExp(min: number | null, max: number | null): string {
//   if (min == null && max == null) return '—';
//   if (min != null && max != null) return `${min}–${max} yrs`;
//   return min != null ? `${min}+ yrs` : `Up to ${max} yrs`;
// }

// function fmtSalary(
//   min: number | null,
//   max: number | null,
//   type: string | null,
//   currency: string | null
// ): string {
//   const sym = currency === 'USD' ? '$' : '₹';
//   const fmt = (n: number) =>
//     n >= 10_000_000
//       ? `${sym}${(n / 10_000_000).toFixed(1)}Cr`
//       : n >= 100_000
//         ? `${sym}${(n / 100_000).toFixed(1)}L`
//         : `${sym}${n.toLocaleString('en-IN')}`;
//   if (min == null && max == null) return '—';
//   const range =
//     min != null && max != null
//       ? `${fmt(min)} – ${fmt(max)}`
//       : min != null
//         ? `${fmt(min)}+`
//         : `Up to ${fmt(max!)}`;
//   return type ? `${range} / ${type.toLowerCase()}` : range;
// }

// function SkillPills({ skills }: { skills: string[] }) {
//   if (!skills.length) return <span className="text-slate-300">—</span>;
//   return (
//     <div className="flex flex-wrap gap-1">
//       {skills.map(s => (
//         <span
//           key={s}
//           className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium"
//         >
//           {s}
//         </span>
//       ))}
//     </div>
//   );
// }
// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeading({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2 mt-4 first:mt-0">
      <span className="text-slate-400">{icon}</span>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
    </div>
  );
}

// function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
//   return (
//     <div className="flex items-start gap-2 py-1.5 border-b border-slate-100 last:border-0">
//       <span className="text-[11px] text-slate-400 font-medium w-32 shrink-0 pt-0.5">{label}</span>
//       <span className="text-[12px] text-slate-700 leading-snug flex-1">
//         {value != null && value !== '' ? value : <span className="text-slate-300">—</span>}
//       </span>
//     </div>
//   );
// }
function EditableRow({
  label,
  display,
  editing,
  onChange,
  onReset,
  children,
}: {
  label: string;
  display: React.ReactNode;
  editing: boolean;
  onChange: () => void;
  onReset: () => void;
  children: React.ReactNode;
}) {
  const empty = display == null || display === '';
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-[11px] text-slate-400 font-medium w-32 shrink-0">{label}</span>
      <div className="flex-1 min-w-0">
        {editing ? (
          children
        ) : (
          <span className="text-[12px] text-slate-700 leading-snug">
            {empty ? <span className="text-slate-300">—</span> : display}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={editing ? onReset : onChange}
        className={`text-[11px] font-medium shrink-0 ${
          editing ? 'text-slate-400 hover:text-slate-600' : 'text-blue-600 hover:text-blue-700'
        }`}
      >
        {editing ? 'Reset' : 'Change'}
      </button>
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex gap-2">
          <Skeleton className="h-4 w-32 shrink-0" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

export function DuplicateRequirementDialog({ open, onClose, requirementId, reqCode }: Props) {
  const axios = useAxios();
  const queryClient = useQueryClient();

  // null = untouched → shows suggestedTitle from preview; string = user typed
  const [titleOverride, setTitleOverride] = useState<string | null>(null);
  const [duplicated, setDuplicated] = useState<{ reqCode: string; id: string } | null>(null);
  const [overrides, setOverrides] = useState<Partial<DuplicatePreview>>({});
  const [editing, setEditing] = useState<Partial<Record<keyof DuplicatePreview, boolean>>>({});

  const startEdit = (k: keyof DuplicatePreview) => setEditing(e => ({ ...e, [k]: true }));

  // Reset = drop override + back to original display
  const resetField = (...keys: (keyof DuplicatePreview)[]) => {
    setOverrides(o => {
      const next = { ...o };
      keys.forEach(k => delete next[k]);
      return next;
    });
    setEditing(e => {
      const next = { ...e };
      keys.forEach(k => delete next[k]);
      return next;
    });
  };
  const val = <K extends keyof DuplicatePreview>(k: K): DuplicatePreview[K] | undefined =>
    k in overrides ? (overrides[k] as DuplicatePreview[K]) : preview?.[k];

  const setVal = <K extends keyof DuplicatePreview>(k: K, v: DuplicatePreview[K]) =>
    setOverrides(o => ({ ...o, [k]: v }));
  const {
    data: preview,
    isLoading: previewLoading,
    isError: previewError,
  } = useQuery({
    queryKey: ['requirement-duplicate-preview', requirementId],
    queryFn: async () => {
      const res = await axios.get(`/requirements/${requirementId}/duplicate-preview`);
      return res.data.data as DuplicatePreview;
    },
    enabled: open && !!requirementId,
    staleTime: 30_000,
  });
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-dropdown'],
    queryFn: async () => (await axios.get('/clients')).data.data as { id: string; name: string }[],
    enabled: open,
  });

  const { data: serviceLines = [] } = useQuery({
    queryKey: ['service-lines-dropdown'],
    queryFn: async () =>
      (await axios.get('/service-lines')).data.data as { id: string; name: string }[],
    enabled: open,
  });

  const selectedClientId = val('clientId');
  const { data: spocs = [] } = useQuery({
    queryKey: ['client-spocs', selectedClientId],
    queryFn: async () =>
      (await axios.get(`/clients/${selectedClientId}/spocs`)).data.data as {
        id: string;
        firstName: string;
        lastName: string;
      }[],
    enabled: open && !!selectedClientId,
  });

  // Derived: user override wins, else suggested from preview
  const title = titleOverride ?? preview?.suggestedTitle ?? '';

  const handleClose = () => {
    setTitleOverride(null);
    setOverrides({});
    setEditing({});
    setDuplicated(null);
    onClose();
  };

  const {
    mutate: doDuplicate,
    isPending: duplicating,
    error: duplicateError,
  } = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { ...overrides, title: title.trim() };
      // clean comma-separated lists
      for (const k of [
        'primarySkills',
        'keySkills',
        'targetCompanies',
        'noPoachCompanies',
      ] as const) {
        if (overrides[k]) body[k] = overrides[k]!.map(s => s.trim()).filter(Boolean);
      }
      const res = await axios.post(`/requirements/${requirementId}/duplicate`, body);
      return res.data.data as { id: string; reqCode: string };
    },
    onSuccess: data => {
      setTitleOverride(null);
      setOverrides({});
      setEditing({});
      setDuplicated(data);
      queryClient.invalidateQueries({ queryKey: ['requirements'] });
    },
  });

  const errMsg =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (duplicateError as any)?.response?.data?.message ??
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (duplicateError as any)?.response?.data?.errors?.[0]?.message ??
    null;

  const canSubmit = title.trim().length >= 3 && !duplicating;
  const inputCls = 'h-7 text-[12px] bg-white border-slate-200 focus:border-blue-400';

  const textInput = (k: keyof DuplicatePreview) => (
    <Input
      value={(val(k) as string | null) ?? ''}
      onChange={e => setVal(k, e.target.value as never)}
      className={inputCls}
    />
  );

  const numInput = (k: keyof DuplicatePreview) => (
    <Input
      type="number"
      value={(val(k) as number | null) ?? ''}
      onChange={e => setVal(k, (e.target.value === '' ? null : Number(e.target.value)) as never)}
      className={inputCls}
    />
  );

  const listInput = (k: keyof DuplicatePreview) => (
    <Input
      value={((val(k) as string[] | undefined) ?? []).join(',')}
      onChange={e => setVal(k, e.target.value.split(',') as never)}
      placeholder="Comma separated"
      className={inputCls}
    />
  );

  const dropdown = (
    value: string | null | undefined,
    options: { id: string; name: string }[],
    onChange: (v: string) => void,
    placeholder: string,
    disabled = false
  ) => (
    <Select value={value ?? undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={inputCls}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(o => (
          <SelectItem key={o.id} value={o.id} className="text-[12px]">
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
  // ── Success state ─────────────────────────────────────────────────────────
  if (duplicated) {
    return (
      <Dialog
        open={open}
        onOpenChange={o => {
          if (!o) handleClose();
        }}
      >
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 size={24} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-slate-900">Requirement duplicated</p>
              <p className="text-[12px] text-slate-500 mt-0.5">
                New code:{' '}
                <span className="font-mono font-semibold text-slate-700">{duplicated.reqCode}</span>
              </p>
            </div>
            <div className="flex gap-2 mt-2 w-full">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-[12px]"
                onClick={handleClose}
              >
                Close
              </Button>
              <Button
                size="sm"
                className="flex-1 text-[12px] bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  handleClose();
                  window.open(`/requirements/${duplicated.id}`, '_blank');
                }}
              >
                Open →
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  const row = (
    label: string,
    k: keyof DuplicatePreview,
    editor: React.ReactNode,
    display?: React.ReactNode,
    resetKeys: (keyof DuplicatePreview)[] = [k]
  ) => (
    <EditableRow
      label={label}
      display={display !== undefined ? display : (preview?.[k] as React.ReactNode)}
      editing={!!editing[k]}
      onChange={() => startEdit(k)}
      onReset={() => resetField(...resetKeys)}
    >
      {editor}
    </EditableRow>
  );
  // ── Main dialog ───────────────────────────────────────────────────────────
  return (
    <Dialog
      open={open}
      onOpenChange={o => {
        if (!o) handleClose();
      }}
    >
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <Copy size={15} className="text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-[15px] font-semibold text-slate-900">
                Duplicate Requirement
              </DialogTitle>
              <p className="text-[12px] text-slate-400 mt-0.5">
                Duplicating{' '}
                <span className="font-mono text-slate-500 font-semibold">{reqCode}</span> — all
                fields copied, JD file inherited and not re-parsed
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* ── Title — only editable field ── */}
          <div className="px-5 py-4 bg-blue-50/50 border-b border-blue-100">
            <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
              Title for new requirement <span className="text-red-500">*</span>
            </label>
            <Input
              value={title}
              onChange={e => setTitleOverride(e.target.value)}
              placeholder="Enter a title…"
              className="text-[13px] bg-white border-slate-200 focus:border-blue-400 font-medium"
              autoFocus
            />
            {title.trim().length > 0 && title.trim().length < 3 && (
              <p className="text-[11px] text-red-500 mt-1">Minimum 3 characters</p>
            )}
          </div>

          {/* ── Editable fields ── */}
          <div className="px-5 py-4">
            {previewLoading ? (
              <PreviewSkeleton />
            ) : previewError ? (
              <div className="flex items-center gap-2 py-6 text-red-500">
                <AlertTriangle size={14} />
                <span className="text-[12px]">Failed to load preview. Please try again.</span>
              </div>
            ) : preview ? (
              <>
                {/* Core */}
                <SectionHeading icon={<Briefcase size={11} />} label="Core" />
                {row(
                  'Client',
                  'clientId',
                  dropdown(
                    val('clientId'),
                    clients,
                    v => {
                      setVal('clientId', v);
                      setVal('clientSpocId', null);
                      startEdit('clientSpocId'); // new client → must pick SPOC
                    },
                    'Select client'
                  ),
                  preview.client?.name,
                  ['clientId', 'clientSpocId'] // reset client also resets SPOC
                )}
                {row(
                  'Client SPOC',
                  'clientSpocId',
                  dropdown(
                    val('clientSpocId'),
                    spocs.map(s => ({
                      id: s.id,
                      name: `${s.firstName} ${s.lastName ?? ''}`.trim(),
                    })),
                    v => setVal('clientSpocId', v),
                    'Select SPOC',
                    !selectedClientId
                  ),
                  preview.clientSpoc
                    ? `${preview.clientSpoc.firstName} ${preview.clientSpoc.lastName}`
                    : null
                )}
                {row(
                  'Service Line',
                  'serviceLineId',
                  dropdown(
                    val('serviceLineId'),
                    serviceLines,
                    v => setVal('serviceLineId', v),
                    'Select service line'
                  ),
                  preview.serviceLine?.name
                )}
                {row('Job Type', 'jobType', textInput('jobType'))}
                {row('Remote Type', 'remoteType', textInput('remoteType'))}
                {row('Priority', 'priority', textInput('priority'))}
                {row('Open For', 'jobOpenFor', textInput('jobOpenFor'))}
                {row('Total Openings', 'totalOpenings', numInput('totalOpenings'))}
                {row('Functional Area', 'functionalArea', textInput('functionalArea'))}
                {row('Education', 'education', textInput('education'))}
                {row('Shift', 'shift', textInput('shift'))}
                {row('Description', 'description', textInput('description'))}

                {/* Location & Experience */}
                <SectionHeading icon={<MapPin size={11} />} label="Location & Experience" />
                {row('City', 'city', textInput('city'))}
                {row('State', 'state', textInput('state'))}
                {row('Country', 'country', textInput('country'))}
                {row('Min Experience', 'experienceMin', numInput('experienceMin'))}
                {row('Max Experience', 'experienceMax', numInput('experienceMax'))}
                {row('Min Salary', 'salaryMin', numInput('salaryMin'))}
                {row('Max Salary', 'salaryMax', numInput('salaryMax'))}
                {row('Salary Type', 'salaryType', textInput('salaryType'))}
                {row('Currency', 'salaryCurrency', textInput('salaryCurrency'))}

                {/* Skills */}
                <SectionHeading icon={<Users size={11} />} label="Skills" />
                {row(
                  'Primary Skills',
                  'primarySkills',
                  listInput('primarySkills'),
                  preview.primarySkills.join(', ')
                )}
                {row(
                  'Key Skills',
                  'keySkills',
                  listInput('keySkills'),
                  preview.keySkills.join(', ')
                )}
                {row(
                  'Target Companies',
                  'targetCompanies',
                  listInput('targetCompanies'),
                  preview.targetCompanies.join(', ')
                )}
                {row(
                  'No-Poach',
                  'noPoachCompanies',
                  listInput('noPoachCompanies'),
                  preview.noPoachCompanies.join(', ')
                )}

                {/* JD File */}
                <SectionHeading icon={<FileText size={11} />} label="JD File" />
                {preview.jdFileName ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg mt-1">
                    <FileText size={13} className="text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-slate-700 font-medium truncate">
                        {preview.jdFileName}
                      </p>
                      <p className="text-[10px] text-amber-600 mt-0.5">
                        Inherited from original — cannot re-parse on duplicate
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[12px] text-slate-400 italic mt-1">No JD file attached</p>
                )}
              </>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
          {errMsg && (
            <p className="text-[11px] text-red-600 flex items-center gap-1.5 flex-1">
              <AlertTriangle size={11} />
              {errMsg}
            </p>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={duplicating}
              className="text-[12px]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!canSubmit || previewLoading || !!previewError}
              onClick={() => doDuplicate()}
              className="gap-1.5 text-[12px] bg-blue-600 hover:bg-blue-700 min-w-32.5"
            >
              {duplicating ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                  Duplicating…
                </>
              ) : (
                <>
                  <Copy size={12} />
                  Confirm Duplicate
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
