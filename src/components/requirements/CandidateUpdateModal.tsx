// File: CandidateUpdateModal.tsx
// Path: src/components/requirements/CandidateUpdateModal.tsx

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, UserCog, Upload, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAxios } from '@/hooks/useAxios';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SnapshotFields {
  fullName: string;
  email: string;
  phone: string;
  currentTitle: string;
  currentCompany: string;
  totalExpYears: string; // string for form, parsed to float on submit
  topSkills: string[];
  resumeUrl: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  requirementId: string;
  pipelineId: string;
  /** Prefill from existing snapshot */
  snapshot: {
    fullName: string;
    email: string;
    phone?: string | null;
    currentTitle?: string | null;
    currentCompany?: string | null;
    totalExpYears?: number | null;
    topSkills?: string[];
    resumeUrl?: string | null;
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CandidateUpdateModal({
  open,
  onClose,
  requirementId,
  pipelineId,
  snapshot,
}: Props) {
  const axios = useAxios();
  const qc = useQueryClient();

  const [form, setForm] = useState<SnapshotFields>({
    fullName: snapshot.fullName ?? '',
    email: snapshot.email ?? '',
    phone: snapshot.phone ?? '',
    currentTitle: snapshot.currentTitle ?? '',
    currentCompany: snapshot.currentCompany ?? '',
    totalExpYears: snapshot.totalExpYears != null ? String(snapshot.totalExpYears) : '',
    topSkills: snapshot.topSkills ?? [],
    resumeUrl: snapshot.resumeUrl ?? '',
  });

  const [skillInput, setSkillInput] = useState('');

  function set(key: keyof SnapshotFields, val: string) {
    setForm(p => ({ ...p, [key]: val }));
  }

  function addSkill() {
    const s = skillInput.trim();
    if (s && !form.topSkills.includes(s)) {
      setForm(p => ({ ...p, topSkills: [...p.topSkills, s] }));
    }
    setSkillInput('');
  }

  function removeSkill(s: string) {
    setForm(p => ({ ...p, topSkills: p.topSkills.filter(x => x !== s) }));
  }

  /**
   * PATCH /requirements/:id/candidates/:pipelineId/snapshot
   * Body: { fullName, email, phone, currentTitle, currentCompany, totalExpYears, topSkills, resumeUrl }
   *
   * Backend should update CandidateSnapshot display fields only.
   * It must NOT overwrite rawSnapshot.
   */
  const mutation = useMutation({
    mutationFn: async () => {
      const body: any = {
        fullName: form.fullName.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        currentTitle: form.currentTitle.trim() || undefined,
        currentCompany: form.currentCompany.trim() || undefined,
        totalExpYears: form.totalExpYears ? parseFloat(form.totalExpYears) : undefined,
        topSkills: form.topSkills.length ? form.topSkills : undefined,
        resumeUrl: form.resumeUrl.trim() || undefined,
      };
      return (
        await axios.patch(`/requirements/${requirementId}/candidates/${pipelineId}/snapshot`, body)
      ).data;
    },
    onSuccess: () => {
      toast.success('Candidate profile updated');
      qc.invalidateQueries({ queryKey: ['requirement-candidates', requirementId] });
      qc.invalidateQueries({ queryKey: ['requirement-candidate-detail', pipelineId] });
      onClose();
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Failed to update candidate'),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[480px] rounded-2xl bg-white shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <UserCog className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Update Candidate Profile</h2>
              <p className="text-[11px] text-slate-400">
                Edits display fields only — original data is preserved
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Name + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Full Name *</Label>
              <Input
                value={form.fullName}
                onChange={e => set('fullName', e.target.value)}
                placeholder="Ravi Kumar"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="ravi@example.com"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Phone + Experience */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="+91 9876543210"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Total Experience (years)</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                max="50"
                value={form.totalExpYears}
                onChange={e => set('totalExpYears', e.target.value)}
                placeholder="4.5"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Current Title + Company */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Current Title</Label>
              <Input
                value={form.currentTitle}
                onChange={e => set('currentTitle', e.target.value)}
                placeholder="Senior Developer"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Current Company</Label>
              <Input
                value={form.currentCompany}
                onChange={e => set('currentCompany', e.target.value)}
                placeholder="Infosys"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Skills */}
          <div className="space-y-1.5">
            <Label className="text-xs">Top Skills</Label>
            <div className="flex gap-2">
              <Input
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="Type a skill and press Enter"
                className="h-8 text-sm flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={addSkill}
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            {form.topSkills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.topSkills.map(s => (
                  <span
                    key={s}
                    className="flex items-center gap-1 text-[11px] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full"
                  >
                    {s}
                    <button
                      onClick={() => removeSkill(s)}
                      className="text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Resume URL */}
          <div className="space-y-1.5">
            <Label className="text-xs">Resume URL</Label>
            <div className="flex gap-2 items-center">
              <Upload className="w-4 h-4 text-slate-400 shrink-0" />
              <Input
                value={form.resumeUrl}
                onChange={e => set('resumeUrl', e.target.value)}
                placeholder="https://... or S3 key"
                className="h-8 text-sm"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Paste a direct link, or ask admin to re-upload via the resume parser
            </p>
          </div>

          {/* Info banner */}
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
            <p className="text-[11px] text-amber-700 leading-relaxed">
              <span className="font-semibold">Note:</span> This updates only the display snapshot
              (name, contact, title, skills). The original raw resume data from the parsing service
              is not overwritten. A full re-parse requires uploading the resume again.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={mutation.isPending || !form.fullName.trim() || !form.email.trim()}
            onClick={() => mutation.mutate()}
            className="gap-1.5"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
