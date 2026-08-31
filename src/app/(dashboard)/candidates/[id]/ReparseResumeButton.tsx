// File: ReparseResumeButton.tsx
// Path: src/app/(dashboard)/candidates/[id]/ReparseResumeButton.tsx

'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Cpu,
  Clock,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAxios } from '@/hooks/useAxios';
import { format } from 'date-fns';

// =============================================================================
// TYPES
// =============================================================================

interface ActiveResumeData {
  id: string;
  fileName: string;
  mimeType: string | null;
  fileSizeKb: number | null;
  parseStatus: string;
  parsedAt: string | null;
  version: number;
  createdAt: string;
  source: string;
}

// ingestCandidate response shape:
// { success, draft, steps, durationMs, data: { candidate, resume, skills, experience, ... } }
interface ReparseResult {
  success: boolean;
  draft: boolean;
  durationMs: number;
  steps: Record<string, string>;
  data: {
    candidate: {
      id: string;
      fullName: string;
      email: string;
      cachedCurrentTitle: string | null;
      cachedCurrentCompany: string | null;
    };
    resume: { id: string; fileName: string; parseStatus: string } | null;
    skills: unknown[];
    experience: unknown[];
    education: unknown[];
    certifications: unknown[];
    languages: unknown[];
    location: unknown | null;
  };
}

// =============================================================================
// HELPERS
// =============================================================================

const formatFileSize = (kb: number | null) => {
  if (kb == null) return null;
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
};

const parseStatusColor = (status: string) => {
  switch (status) {
    case 'DONE':
      return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    case 'PENDING':
      return 'text-amber-700 bg-amber-50 border-amber-200';
    case 'FAILED':
      return 'text-rose-700 bg-rose-50 border-rose-200';
    default:
      return 'text-slate-700 bg-slate-100 border-slate-200';
  }
};

const stepLabel: Record<string, string> = {
  candidate: 'Candidate',
  snapshot: 'Snapshot',
  resume: 'Resume file',
  parseResult: 'Parse result',
  skills: 'Skills',
  experience: 'Experience',
  education: 'Education',
  certifications: 'Certifications',
  languages: 'Languages',
  location: 'Location',
  cachedFields: 'Cached fields',
  dedup: 'Core sync',
};

// =============================================================================
// RESULT PANEL — shown after successful re-parse
// =============================================================================

function ReparseResultPanel({ result, onClose }: { result: ReparseResult; onClose: () => void }) {
  const { data, durationMs, steps } = result;

  const successSteps = Object.entries(steps).filter(([, v]) => v === 'SUCCESS').length;
  const skippedSteps = Object.entries(steps).filter(([, v]) => v === 'SKIPPED').length;
  const failedSteps = Object.entries(steps).filter(([, v]) => v === 'PENDING' || v === 'FAILED');

  return (
    <div className="space-y-4">
      {/* Success banner */}
      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-bold text-emerald-800">Re-parse complete</p>
          <p className="text-xs text-emerald-600 mt-0.5">
            {data.candidate.fullName} updated in {(durationMs / 1000).toFixed(1)}s
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Skills', value: String(data.skills.length) },
          { label: 'Experience', value: String(data.experience.length) },
          { label: 'Education', value: String(data.education.length) },
          { label: 'Steps done', value: `${successSteps} / ${Object.keys(steps).length}` },
        ].map(s => (
          <div key={s.label} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {s.label}
            </p>
            <p className="text-xl font-black text-slate-900 mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Skipped notice */}
      {skippedSteps > 0 && (
        <p className="text-[10px] text-slate-400 text-center">
          {skippedSteps} step{skippedSteps > 1 ? 's' : ''} skipped (no data found in resume)
        </p>
      )}

      {/* Failed steps warning */}
      {failedSteps.length > 0 && (
        <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700">
            Some steps did not complete: {failedSteps.map(([k]) => stepLabel[k] ?? k).join(', ')}
          </p>
        </div>
      )}

      <Button className="w-full" onClick={onClose}>
        Done
      </Button>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface ReparseResumeButtonProps {
  candidateId: string;
  existingEmail?: string;
}

export function ResumeReparseButton({ candidateId }: ReparseResumeButtonProps) {
  const axios = useAxios();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reparseResult, setReparseResult] = useState<ReparseResult | null>(null);

  // ── Fetch active resume metadata — powers the info card before confirming ──
  const {
    data: resumeData,
    isLoading: resumeLoading,
    isError: resumeError,
    refetch: refetchResume,
  } = useQuery<{ success: boolean; data: ActiveResumeData }>({
    queryKey: ['active-resume', candidateId],
    queryFn: async () =>
      (
        await axios.get(`/candidate/api/candidates/${candidateId}/active-resume`, {
          baseURL: '/api/proxy',
        })
      ).data,
    enabled: open && !reparseResult,
    retry: 1,
  });

  const resume = resumeData?.data;

  // ── Re-parse mutation — hits reparseSetup → extractResumeText → parseResumeWithAI → ingestCandidate ──
  const reparseMut = useMutation({
    mutationFn: async () => {
      const res = await axios.post(
        `/candidate/api/candidates/${candidateId}/reparse`,
        {},
        { baseURL: '/api/proxy' }
      );
      // ingestCandidate responds with { success, draft, steps, durationMs, data }
      return res.data as ReparseResult;
    },
    onSuccess: res => {
      setReparseResult(res);
      qc.invalidateQueries({ queryKey: ['candidate', candidateId] });
      qc.invalidateQueries({ queryKey: ['active-resume', candidateId] });
      toast.success('Profile updated from re-parse');
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      const code = err?.response?.data?.code;
      const message = err?.response?.data?.message;

      if (code === 'NO_ACTIVE_RESUME') {
        toast.error('No resume on file — upload one first.');
      } else if (code === 'S3_FETCH_FAILED' || code === 'S3_EMPTY_RESPONSE') {
        toast.error('Resume file missing from storage. Please re-upload.');
      } else if (code === 'TEXT_EXTRACTION_FAILED') {
        toast.error(message ?? 'Could not read text from this resume.');
      } else if (code === 'MANUAL_REVIEW_REQUIRED') {
        toast.error('AI could not extract an email. Manual review needed.');
      } else {
        toast.error(message ?? 'Re-parse failed. Please try again.');
      }
    },
  });

  const handleOpen = () => {
    setReparseResult(null);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setReparseResult(null);
  };

  return (
    <>
      {/* Trigger — sits inline in the resume row */}
      <button
        onClick={handleOpen}
        title="Re-parse resume with AI"
        className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg
                   border border-slate-200 text-slate-500 hover:text-violet-700
                   hover:border-violet-300 hover:bg-violet-50 transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        Re-parse
      </button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="px-6 pt-5 pb-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-500" />
                Re-parse Resume
              </DialogTitle>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </DialogHeader>

          <div className="px-6 pb-6 pt-4 space-y-4">
            {reparseResult ? (
              <ReparseResultPanel result={reparseResult} onClose={handleClose} />
            ) : (
              <>
                {/* Resume info card */}
                {resumeLoading && (
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-4">
                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin shrink-0" />
                    <p className="text-xs text-slate-500">Loading resume info…</p>
                  </div>
                )}

                {resumeError && (
                  <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-rose-700">Could not load resume info</p>
                      <button
                        onClick={() => refetchResume()}
                        className="text-[10px] text-rose-500 underline mt-0.5"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                )}

                {resume && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                    <div className="flex items-start gap-3 px-4 py-3.5">
                      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {resume.fileName}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${parseStatusColor(resume.parseStatus)}`}
                          >
                            {resume.parseStatus}
                          </span>
                          <span className="text-[10px] text-slate-400">v{resume.version}</span>
                          {formatFileSize(resume.fileSizeKb) && (
                            <span className="text-[10px] text-slate-400">
                              {formatFileSize(resume.fileSizeKb)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 grid grid-cols-2 divide-x divide-slate-200">
                      <div className="px-4 py-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Uploaded
                        </p>
                        <p className="text-xs font-semibold text-slate-700 mt-0.5">
                          {format(new Date(resume.createdAt), 'dd MMM yyyy')}
                        </p>
                      </div>
                      <div className="px-4 py-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1">
                          <Cpu className="w-2.5 h-2.5" /> Last parsed
                        </p>
                        <p className="text-xs font-semibold text-slate-700 mt-0.5">
                          {resume.parsedAt ? format(new Date(resume.parsedAt), 'dd MMM yyyy') : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* What happens */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    What happens
                  </p>
                  {[
                    'Resume fetched directly from S3 — no re-upload needed',
                    'Text extracted and sent to AI for parsing',
                    'Skills, experience, education, location replaced',
                    'Profile snapshot versioned — nothing permanently lost',
                    'Core service synced automatically',
                  ].map(line => (
                    <div key={line} className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-violet-400 shrink-0 mt-1.5" />
                      <p className="text-xs text-slate-600">{line}</p>
                    </div>
                  ))}
                </div>

                {/* Scanned PDF warning */}
                <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Scanned or image-only PDFs will fail text extraction. Replace the resume with a
                    text-based PDF or DOCX if re-parse fails.
                  </p>
                </div>

                <div className="flex gap-3 pt-1">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleClose}
                    disabled={reparseMut.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 gap-2 bg-violet-600 hover:bg-violet-700"
                    disabled={reparseMut.isPending || resumeLoading || !!resumeError || !resume}
                    onClick={() => reparseMut.mutate()}
                  >
                    {reparseMut.isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Parsing…
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Re-parse Now
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
