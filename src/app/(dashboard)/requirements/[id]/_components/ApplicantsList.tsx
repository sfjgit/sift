/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// File: ApplicantsList.tsx
// Path: src/app/(dashboard)/requirements/[id]/_components/ApplicantsList.tsx
//
// Renders the website-applicant rows with assignment controls:
//   • per-row "Assign ▾" dropdown → single PATCH .../assign
//   • multi-select + bulk bar     → POST .../assign-bulk
// Recruiter options are passed in from the parent (deduped from the
// requirement's assignments). The backend re-checks "under me", so this list
// only needs to be a convenient set of targets.

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Eye,
  Mail,
  Phone,
  Briefcase,
  Clock,
  Globe,
  UserPlus,
  Loader2,
  Check,
  FileText,
  ChevronDown,
} from 'lucide-react';
import { useAxios } from '@/hooks/useAxios';

// ── minimal shapes (compatible with the page's CandidatePipeline) ────────────
export interface RecruiterOption {
  id: string;
  firstName: string;
  lastName: string;
  employeeId?: string | null;
  role?: { name: string } | null;
}
interface ApplicantPipeline {
  id: string;
  createdAt: string;
  recruiter: { id: string; firstName: string; lastName: string };
  aging: { minutes: number; label: string };
  snapshot: {
    candidateServiceId: string;
    fullName: string;
    email: string;
    phone: string | null;
    currentTitle: string | null;
    currentCompany: string | null;
    totalExpYears: number | null;
    topSkills: string[];
    resumeUrl: string | null;
  };
}

const initials = (name: string) =>
  name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const avatarColor = (seed: string) => {
  const p = [
    'bg-violet-200 text-violet-800',
    'bg-blue-200 text-blue-800',
    'bg-emerald-200 text-emerald-800',
    'bg-amber-200 text-amber-800',
    'bg-rose-200 text-rose-800',
    'bg-cyan-200 text-cyan-800',
    'bg-indigo-200 text-indigo-800',
    'bg-orange-200 text-orange-800',
  ];
  return p[(seed?.charCodeAt(0) ?? 0) % p.length];
};

// Website applicants land owned by the System user — treat that as "unassigned".
const isSystemOwner = (r: { firstName: string; lastName: string }) =>
  `${r.firstName} ${r.lastName}`.trim().toLowerCase() === 'system sfj';

export function ApplicantsList({
  applicants,
  recruiters,
  requirementId,
  isLoading,
  canEdit,
  onView,
}: {
  applicants: ApplicantPipeline[];
  recruiters: RecruiterOption[];
  requirementId: string;
  isLoading: boolean;
  canEdit: boolean;
  onView: (pipelineId: string) => void;
}) {
  const axios = useAxios();
  const qc = useQueryClient();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkRecruiter, setBulkRecruiter] = useState('');

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['requirement-applicants', requirementId] });
    qc.invalidateQueries({ queryKey: ['requirement-detail', requirementId] });
    qc.invalidateQueries({ queryKey: ['requirement-candidates', requirementId] });
  };

  // single (per-row) assign
  const singleAssign = useMutation({
    mutationFn: async (v: { pipelineId: string; recruiterId: string }) =>
      axios.patch(`/requirements/${requirementId}/candidates/${v.pipelineId}/assign`, {
        recruiterId: v.recruiterId,
      }),
    onSuccess: () => {
      toast.success('Applicant assigned');
      invalidate();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to assign'),
  });

  // bulk assign
  const bulkAssign = useMutation({
    mutationFn: async (v: { pipelineIds: string[]; recruiterId: string }) =>
      axios.post(`/requirements/${requirementId}/candidates/assign-bulk`, v),
    onSuccess: (res: any) => {
      const n = res?.data?.data?.assigned ?? selected.size;
      toast.success(`Assigned ${n} applicant${n === 1 ? '' : 's'}`);
      setSelected(new Set());
      setBulkRecruiter('');
      invalidate();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to assign'),
  });

  const allIds = useMemo(() => applicants.map(a => a.id), [applicants]);
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));

  const toggleOne = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(allIds));

  const recruiterName = (r: RecruiterOption) => `${r.firstName} ${r.lastName}`;

  // ── loading ──
  if (isLoading) {
    return (
      <div className="divide-y divide-slate-100">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-5 py-4">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
              <Skeleton className="h-3 w-36" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── empty ──
  if (applicants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
          <Globe className="w-7 h-7 text-slate-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-700">No website applicants yet</p>
          <p className="text-xs font-medium text-slate-500 mt-1">
            People who apply from the careers page will show up here
          </p>
        </div>
      </div>
    );
  }

  const noRecruiters = recruiters.length === 0;

  return (
    <div>
      {/* ── Select-all + bulk bar ── */}
      {canEdit && (
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-2 bg-white border-b border-slate-200">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="rounded border-slate-400 text-primary w-4 h-4 cursor-pointer"
            />
            <span className="text-xs font-semibold text-slate-600">
              {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
            </span>
          </label>

          {selected.size > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <Select value={bulkRecruiter} onValueChange={setBulkRecruiter}>
                <SelectTrigger className="h-8 text-sm w-52">
                  <SelectValue
                    placeholder={noRecruiters ? 'No recruiters available' : 'Assign to recruiter…'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {recruiters.map(r => (
                    <SelectItem key={r.id} value={r.id} className="text-sm">
                      {recruiterName(r)}
                      {r.role?.name ? ` · ${r.role.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-8 gap-1.5"
                disabled={!bulkRecruiter || bulkAssign.isPending}
                onClick={() =>
                  bulkAssign.mutate({
                    pipelineIds: [...selected],
                    recruiterId: bulkRecruiter,
                  })
                }
              >
                {bulkAssign.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UserPlus className="w-3.5 h-3.5" />
                )}
                Assign {selected.size}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-slate-500"
                onClick={() => setSelected(new Set())}
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      )}

      {noRecruiters && canEdit && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-xs font-medium text-amber-700">
          No assignable recruiters found. Assign recruiters to this requirement first, then you can
          route applicants to them.
        </div>
      )}

      {/* ── Rows ── */}
      {applicants.map(a => {
        const snap = a.snapshot;
        const owned = !isSystemOwner(a.recruiter);
        const isSelected = selected.has(a.id);
        return (
          <div
            key={a.id}
            className={`flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 transition-colors ${
              isSelected ? 'bg-primary/5' : 'hover:bg-slate-50'
            }`}
          >
            {canEdit && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleOne(a.id)}
                className="rounded border-slate-400 text-primary w-4 h-4 cursor-pointer shrink-0"
              />
            )}

            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback
                className={`text-sm font-bold ${avatarColor(snap.candidateServiceId)}`}
              >
                {initials(snap.fullName)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900 leading-tight truncate">
                  {snap.fullName}
                </h3>
                <span className="text-[11px] font-medium text-slate-400">
                  applied {format(new Date(a.createdAt), 'dd MMM')}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap mt-0.5">
                {snap.email && (
                  <span className="flex items-center gap-1 text-xs text-slate-600">
                    <Mail className="w-3 h-3 text-slate-400" />
                    {snap.email}
                  </span>
                )}
                {snap.phone && (
                  <span className="flex items-center gap-1 text-xs text-slate-600">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {snap.phone}
                  </span>
                )}
                {snap.totalExpYears != null && (
                  <span className="flex items-center gap-1 text-xs text-slate-600">
                    <Briefcase className="w-3 h-3 text-slate-400" />
                    {Math.floor(snap.totalExpYears)}y exp
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {a.aging.label}
                </span>
              </div>
              {snap.topSkills?.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                  {snap.topSkills.slice(0, 5).map(s => (
                    <span
                      key={s}
                      className="text-[11px] font-semibold bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* current owner */}
            <div className="shrink-0 text-right hidden sm:block">
              {owned ? (
                <>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                    Assigned to
                  </p>
                  <p className="text-xs font-bold text-slate-700">
                    {a.recruiter.firstName} {a.recruiter.lastName}
                  </p>
                </>
              ) : (
                <span className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  Unassigned
                </span>
              )}
            </div>

            {/* actions */}
            <div className="flex items-center gap-1 shrink-0">
              {snap.resumeUrl && (
                <a
                  href={snap.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View resume"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                </a>
              )}
              <button
                title="View detail"
                onClick={() => onView(a.id)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <Eye className="w-4 h-4" />
              </button>

              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1 text-xs font-semibold"
                      disabled={singleAssign.isPending || noRecruiters}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      {owned ? 'Reassign' : 'Assign'}
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 max-h-72 overflow-y-auto">
                    <DropdownMenuLabel className="text-xs">Assign to recruiter</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {recruiters.map(r => {
                      const current = r.id === a.recruiter.id;
                      return (
                        <DropdownMenuItem
                          key={r.id}
                          className="text-sm"
                          onClick={() =>
                            !current && singleAssign.mutate({ pipelineId: a.id, recruiterId: r.id })
                          }
                        >
                          <span className="flex-1 truncate">
                            {recruiterName(r)}
                            {r.role?.name ? (
                              <span className="text-slate-400"> · {r.role.name}</span>
                            ) : null}
                          </span>
                          {current && <Check className="w-3.5 h-3.5 text-primary" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
