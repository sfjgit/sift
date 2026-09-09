// File: TransferCandidateDialog.tsx
// Path: src/components/assignments/TransferCandidateDialog.tsx

'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowRightLeft,
  Loader2,
  Search,
  X,
  Users,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAxios } from '@/hooks/useAxios';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface SubordinateUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  reqCode: string;
  employeeId: string | null;
  reportingToId: string | null;
  teamLeadId: string | null;
  _source: 'self' | 'chain' | 'extra';
  role: { id: string; name: string };
  department: { id: string; name: string } | null;
}

export interface PipelineCandidateMin {
  id: string;
  isTransferred?: boolean;
  snapshot: {
    fullName: string;
    email: string;
    currentTitle: string | null;
    currentCompany: string | null;
  };
  recruiter: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface Props {
  pipeline: PipelineCandidateMin;
  assignmentId: string;
  requirementId: string;
  reqCode: string;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const initials = (name: string) =>
  name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const avatarColor = (seed: string) => {
  const palette = [
    'bg-violet-200 text-violet-800',
    'bg-blue-200 text-blue-800',
    'bg-emerald-200 text-emerald-800',
    'bg-amber-200 text-amber-800',
    'bg-rose-200 text-rose-800',
    'bg-cyan-200 text-cyan-800',
    'bg-indigo-200 text-indigo-800',
    'bg-orange-200 text-orange-800',
  ];
  return palette[seed.charCodeAt(0) % palette.length];
};

// ─────────────────────────────────────────────────────────────────────────────
// RE-TRANSFER CONFIRM POPUP
// Shown on top of TransferCandidateDialog when isAlreadyTransferred.
// Collects reason + acknowledgement, then calls onConfirm(reason).
// ─────────────────────────────────────────────────────────────────────────────

interface RetransferConfirmProps {
  open: boolean;
  isPending: boolean;
  candidateName: string;
  toRecruiterName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

function RetransferConfirmDialog({
  open,
  isPending,
  candidateName,
  toRecruiterName,
  onConfirm,
  onCancel,
}: RetransferConfirmProps) {
  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  const canConfirm = reason.trim().length > 0 && acknowledged;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(reason.trim());
  };

  const handleCancel = () => {
    setReason('');
    setAcknowledged(false);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleCancel()}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2.5 text-sm font-bold text-slate-900">
            <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            </span>
            Confirm Re-transfer
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            <span className="font-semibold text-slate-700">{candidateName}</span> has already been
            transferred once. You&apos;re re-assigning them to{' '}
            <span className="font-semibold text-slate-700">{toRecruiterName}</span>.
          </p>
        </DialogHeader>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-amber-700">
              Reason for re-transfer <span className="text-rose-500 font-bold">*</span>
            </Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Why is this candidate being transferred again?…"
              rows={3}
              autoFocus
              className="resize-none text-sm border-amber-200 focus-visible:ring-amber-400"
            />
          </div>

          {/* Acknowledgement */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={e => setAcknowledged(e.target.checked)}
              className="mt-0.5 accent-amber-600 w-4 h-4 shrink-0 cursor-pointer"
            />
            <span className="text-xs text-slate-600 leading-snug">
              I understand this candidate was already transferred and want to re-transfer them.
            </span>
          </label>
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 pb-5 pt-0">
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={isPending}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!canConfirm || isPending}
              onClick={handleConfirm}
              className="gap-1.5 min-w-28 bg-amber-600 hover:bg-amber-700"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Transferring…
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Re-transfer
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function TransferCandidateDialog({ pipeline, reqCode, open, onClose, onDone }: Props) {
  const axios = useAxios();
  const qc = useQueryClient();

  const isAlreadyTransferred = pipeline.isTransferred === true;

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  // controls the re-transfer confirm popup
  const [showRetransferConfirm, setShowRetransferConfirm] = useState(false);

  // ── Fetch subordinates ────────────────────────────────────────────────────
  const { data: subData, isLoading } = useQuery({
    queryKey: ['my-subordinates'],
    queryFn: async () => {
      const res = await axios.get('/users/subordinates');
      return res.data as { success: boolean; data: SubordinateUser[] };
    },
    enabled: open,
    staleTime: 60_000,
  });

  const allUsers = useMemo(() => {
    const subs = subData?.data ?? [];
    return subs.filter(u => u.id !== pipeline.recruiter.id);
  }, [subData, pipeline.recruiter.id]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return allUsers;
    return allUsers.filter(
      u =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.role.name.toLowerCase().includes(q) ||
        u.department?.name.toLowerCase().includes(q) ||
        u.employeeId?.toLowerCase().includes(q)
    );
  }, [allUsers, search]);

  const selected = allUsers.find(u => u.id === selectedId) ?? null;

  // ── Transfer mutation — accepts optional retransferReason ─────────────────
  const mut = useMutation({
    mutationFn: async ({ retransferReason }: { retransferReason?: string } = {}) => {
      if (!selectedId) throw new Error('No recruiter selected');
      return axios.patch(`/pipeline/${pipeline.id}/transfer`, {
        targetUserId: selectedId,
        note: note.trim() || undefined,
        ...(retransferReason ? { retransferReason } : {}),
      });
    },
    onSuccess: res => {
      const toName = selected
        ? `${selected.firstName.trim()} ${selected.lastName.trim()}`
        : 'new recruiter';

      const data = res.data?.data;
      if (data?.transferredFrom && data?.transferredTo) {
        console.info('[Transfer]', {
          from: `${data.transferredFrom.firstName} ${data.transferredFrom.lastName}`,
          fromAssignment: data.transferredFrom.assignmentId,
          to: `${data.transferredTo.firstName} ${data.transferredTo.lastName}`,
          toAssignment: data.transferredTo.assignmentId,
        });
      }

      toast.success(`${pipeline.snapshot.fullName} transferred to ${toName}`);
      qc.invalidateQueries({ queryKey: ['assignment-pipeline'] });
      qc.invalidateQueries({ queryKey: ['assignment-detail'] });
      handleClose();
      onDone();
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Transfer failed'),
  });

  const handleClose = () => {
    setSearch('');
    setSelectedId(null);
    setNote('');
    setShowRetransferConfirm(false);
    onClose();
  };

  // ── What the main footer button does ─────────────────────────────────────
  // Normal transfer  → fire mutation directly
  // Re-transfer      → open confirm popup; popup calls onConfirm(reason) → mutation
  const handlePrimaryClick = () => {
    if (isAlreadyTransferred) {
      setShowRetransferConfirm(true);
    } else {
      mut.mutate({});
    }
  };

  const handleRetransferConfirm = (reason: string) => {
    mut.mutate({ retransferReason: reason });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Dialog open={open} onOpenChange={v => !v && handleClose()}>
        {/*
          Layout: 3-zone flex column
            1. Header  — shrink-0
            2. Body    — flex-1 min-h-0, single overflow-y-auto scroll region
            3. Footer  — shrink-0
        */}
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden h-[90vh] flex flex-col">
          {/* ── ZONE 1: Header ─────────────────────────────────────────── */}
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
            <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-slate-900">
              <span className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
              </span>
              Transfer Candidate
            </DialogTitle>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-bold font-mono bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-500">
                {reqCode}
              </span>
              <span className="text-[10px] text-slate-400">
                Recruiters assigned to this requirement
              </span>
            </div>

            {/* Candidate strip */}
            <div className="flex items-center gap-3 mt-3 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback
                  className={`text-xs font-bold ${avatarColor(pipeline.snapshot.fullName)}`}
                >
                  {initials(pipeline.snapshot.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {pipeline.snapshot.fullName}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {pipeline.snapshot.currentTitle}
                  {pipeline.snapshot.currentTitle && pipeline.snapshot.currentCompany ? ' · ' : ''}
                  {pipeline.snapshot.currentCompany}
                </p>
              </div>
              {/* FROM → TO */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded-lg">
                  {pipeline.recruiter.firstName.trim()} {pipeline.recruiter.lastName.trim()}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                <span
                  className={`text-[11px] font-semibold px-2 py-1 rounded-lg border transition-colors ${
                    selected
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-white text-slate-400 border-dashed border-slate-300'
                  }`}
                >
                  {selected
                    ? `${selected.firstName.trim()} ${selected.lastName.trim()}`
                    : 'Select…'}
                </span>
              </div>
            </div>
          </DialogHeader>

          {/* ── ZONE 2: flex column — warning + search fixed, list scrolls, note fixed ── */}
          <div className="flex-1 min-h-0 flex flex-col">
            {/* 2a: Warning banner — shrink-0, never scrolls */}
            {isAlreadyTransferred && (
              <div className="mx-6 mt-4 shrink-0 flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-amber-800">Already transferred</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    This candidate has been transferred before. You&apos;ll be asked for a reason
                    when you click Re-transfer.
                  </p>
                </div>
              </div>
            )}

            {/* 2b: Search — shrink-0, never scrolls */}
            <div className="px-6 pt-4 pb-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  placeholder="Search by name, role or department…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm border-slate-200 focus-visible:ring-1"
                  autoFocus
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* 2c: User list — flex-1 min-h-0, THIS is the only scroll region */}
            <div className="mx-6 flex-1 min-h-0 overflow-y-auto rounded-xl border border-slate-200 bg-white">
              {isLoading ? (
                <div className="flex items-center justify-center py-10 gap-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading…
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Users className="w-6 h-6 text-slate-300" />
                  <p className="text-sm text-slate-500 text-center px-4">
                    {search
                      ? 'No match for your search'
                      : 'No one in your scope is assigned to this requirement'}
                  </p>
                  {!search && (
                    <p className="text-xs text-slate-400 text-center px-4">
                      Assign another recruiter to this requirement first, then transfer.
                    </p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filtered.map(u => {
                    const isSelected = u.id === selectedId;
                    const fullName = `${u.firstName.trim()} ${u.lastName.trim()}`;
                    return (
                      <button
                        key={u.id}
                        onClick={() => setSelectedId(prev => (prev === u.id ? null : u.id))}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className={`text-[11px] font-bold ${avatarColor(u.id)}`}>
                            {initials(fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-semibold truncate ${
                              isSelected ? 'text-indigo-800' : 'text-slate-900'
                            }`}
                          >
                            {fullName}
                            {u.reqCode && (
                              <span className="ml-1.5 text-[10px] font-mono text-slate-400">
                                #{u.reqCode}
                              </span>
                            )}
                            {u._source === 'self' && (
                              <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {u.role.name}
                            {u.department?.name ? ` · ${u.department.name}` : ''}
                          </p>
                        </div>
                        <span
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-600'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && (
                            <svg viewBox="0 0 10 10" className="w-3 h-3" fill="none">
                              <path
                                d="M2 5l2.5 2.5L8 3"
                                stroke="white"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2d: Handover note — shrink-0, never scrolls, always visible above footer */}
            <div className="px-6 pt-4 pb-4 shrink-0">
              <Label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                Handover note <span className="font-normal text-slate-400">(optional)</span>
              </Label>
              <Textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Context for the new recruiter…"
                rows={2}
                className="resize-none text-sm"
              />
            </div>
          </div>
          {/* ── end ZONE 2 ─────────────────────────────────────────────── */}

          {/* ── ZONE 3: Footer ─────────────────────────────────────────── */}
          <DialogFooter className="px-6 py-4 border-t border-slate-100 shrink-0">
            <div className="flex items-center justify-between w-full">
              <p className="text-xs text-slate-400">
                {allUsers.length} recruiter{allUsers.length !== 1 ? 's' : ''} available to transfer
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleClose} disabled={mut.isPending}>
                  Cancel
                </Button>
                <Button
                  disabled={!selectedId || mut.isPending}
                  onClick={handlePrimaryClick}
                  className={`gap-2 min-w-32 ${
                    isAlreadyTransferred
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {mut.isPending && !showRetransferConfirm ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Transferring…
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      {isAlreadyTransferred ? 'Re-transfer' : 'Transfer'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Re-transfer confirm popup — rendered outside the main dialog ── */}
      {isAlreadyTransferred && selected && (
        <RetransferConfirmDialog
          key={String(showRetransferConfirm)}
          open={showRetransferConfirm}
          isPending={mut.isPending}
          candidateName={pipeline.snapshot.fullName}
          toRecruiterName={`${selected.firstName.trim()} ${selected.lastName.trim()}`}
          onConfirm={handleRetransferConfirm}
          onCancel={() => setShowRetransferConfirm(false)}
        />
      )}
    </>
  );
}
