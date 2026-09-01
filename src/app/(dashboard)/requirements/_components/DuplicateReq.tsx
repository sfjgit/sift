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
  clientSpoc: { firstName: string; lastName: string } | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  requirementId: string;
  reqCode: string;
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function fmtExp(min: number | null, max: number | null): string {
  if (min == null && max == null) return '—';
  if (min != null && max != null) return `${min}–${max} yrs`;
  return min != null ? `${min}+ yrs` : `Up to ${max} yrs`;
}

function fmtSalary(
  min: number | null,
  max: number | null,
  type: string | null,
  currency: string | null
): string {
  const sym = currency === 'USD' ? '$' : '₹';
  const fmt = (n: number) =>
    n >= 10_000_000
      ? `${sym}${(n / 10_000_000).toFixed(1)}Cr`
      : n >= 100_000
        ? `${sym}${(n / 100_000).toFixed(1)}L`
        : `${sym}${n.toLocaleString('en-IN')}`;
  if (min == null && max == null) return '—';
  const range =
    min != null && max != null
      ? `${fmt(min)} – ${fmt(max)}`
      : min != null
        ? `${fmt(min)}+`
        : `Up to ${fmt(max!)}`;
  return type ? `${range} / ${type.toLowerCase()}` : range;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeading({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2 mt-4 first:mt-0">
      <span className="text-slate-400">{icon}</span>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-[11px] text-slate-400 font-medium w-32 shrink-0 pt-0.5">{label}</span>
      <span className="text-[12px] text-slate-700 leading-snug flex-1">
        {value != null && value !== '' ? value : <span className="text-slate-300">—</span>}
      </span>
    </div>
  );
}

function SkillPills({ skills }: { skills: string[] }) {
  if (!skills.length) return <span className="text-slate-300">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {skills.map(s => (
        <span
          key={s}
          className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium"
        >
          {s}
        </span>
      ))}
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

  // Derived: user override wins, else suggested from preview
  const title = titleOverride ?? preview?.suggestedTitle ?? '';

  const handleClose = () => {
    setTitleOverride(null);
    setDuplicated(null);
    onClose();
  };

  const {
    mutate: doDuplicate,
    isPending: duplicating,
    error: duplicateError,
  } = useMutation({
    mutationFn: async () => {
      // Only title goes in the body — everything else copied server-side from original
      const res = await axios.post(`/requirements/${requirementId}/duplicate`, {
        title: title.trim(),
      });
      return res.data.data as { id: string; reqCode: string };
    },
    onSuccess: data => {
      setTitleOverride(null);
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

          {/* ── Preview — read-only ── */}
          <div className="px-5 py-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Fields being copied
            </p>

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
                <FieldRow label="Client" value={preview.client?.name} />
                <FieldRow label="Service Line" value={preview.serviceLine?.name} />
                <FieldRow
                  label="Client SPOC"
                  value={
                    preview.clientSpoc
                      ? `${preview.clientSpoc.firstName} ${preview.clientSpoc.lastName}`
                      : null
                  }
                />
                <FieldRow label="Job Type" value={preview.jobType} />
                <FieldRow label="Remote Type" value={preview.remoteType} />
                <FieldRow label="Priority" value={preview.priority} />
                <FieldRow label="Open For" value={preview.jobOpenFor} />
                <FieldRow label="Total Openings" value={preview.totalOpenings} />
                {preview.functionalArea && (
                  <FieldRow label="Functional Area" value={preview.functionalArea} />
                )}
                {preview.education && <FieldRow label="Education" value={preview.education} />}
                {preview.shift && <FieldRow label="Shift" value={preview.shift} />}

                {/* Location & Experience */}
                <SectionHeading icon={<MapPin size={11} />} label="Location & Experience" />
                <FieldRow
                  label="Location"
                  value={
                    [preview.city, preview.state, preview.country].filter(Boolean).join(', ') ||
                    null
                  }
                />
                <FieldRow
                  label="Experience"
                  value={fmtExp(preview.experienceMin, preview.experienceMax)}
                />
                <FieldRow
                  label="Salary"
                  value={fmtSalary(
                    preview.salaryMin,
                    preview.salaryMax,
                    preview.salaryType,
                    preview.salaryCurrency
                  )}
                />

                {/* Skills */}
                <SectionHeading icon={<Users size={11} />} label="Skills" />
                <FieldRow
                  label="Primary Skills"
                  value={<SkillPills skills={preview.primarySkills} />}
                />
                <FieldRow label="Key Skills" value={<SkillPills skills={preview.keySkills} />} />
                {preview.targetCompanies.length > 0 && (
                  <FieldRow
                    label="Target Companies"
                    value={<SkillPills skills={preview.targetCompanies} />}
                  />
                )}
                {preview.noPoachCompanies.length > 0 && (
                  <FieldRow
                    label="No-Poach"
                    value={<SkillPills skills={preview.noPoachCompanies} />}
                  />
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
