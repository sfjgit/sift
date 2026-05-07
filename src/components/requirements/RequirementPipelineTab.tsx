/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, User } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAxios } from '@/hooks/useAxios';
import {
  STAGE_ORDER,
  STAGE_TERMINAL,
  STAGE_LABEL,
  STAGE_COLOR,
  STATUS_FLOW,
  fullName,
} from './types';
import type { CandidateItem, RequirementStatus, CandidateStageStatus } from './types';

interface Props {
  requirementId: string;
  currentStatus: RequirementStatus;
  canEdit: boolean;
}

// ─── Funnel bar ──────────────────────────────────────────────────────────────
function FunnelBar({
  label,
  count,
  max,
  color,
}: {
  label: string;
  count: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{count}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function RequirementPipelineTab({ requirementId, currentStatus, canEdit }: Props) {
  const axios = useAxios();
  const queryClient = useQueryClient();

  const [selectedStage, setSelectedStage] = useState<CandidateStageStatus | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateItem | null>(null);

  // ── Fetch all candidates ──────────────────────────────────────────────────
  const candidatesQuery = useQuery<{ success: boolean; data: CandidateItem[] }>({
    queryKey: ['requirement-candidates', requirementId],
    queryFn: async () => (await axios.get(`/requirements/${requirementId}/candidates`)).data,
  });

  // ── Stage update mutation ─────────────────────────────────────────────────
  const stageMutation = useMutation({
    mutationFn: async ({
      candidateId,
      stage,
    }: {
      candidateId: string;
      stage: CandidateStageStatus;
    }) => {
      return (
        await axios.patch(`/requirements/${requirementId}/candidates/${candidateId}/stage`, {
          currentStage: stage,
        })
      ).data;
    },
    onSuccess: () => {
      toast.success('Stage updated');
      queryClient.invalidateQueries({ queryKey: ['requirement-candidates', requirementId] });
      setSelectedCandidate(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to update stage'),
  });

  const candidates = candidatesQuery.data?.data ?? [];

  // Group by stage
  const byStage: Record<string, CandidateItem[]> = {};
  candidates.forEach(c => {
    byStage[c.currentStage] = [...(byStage[c.currentStage] ?? []), c];
  });

  const maxCount = Math.max(...STAGE_ORDER.map(s => (byStage[s] ?? []).length), 1);
  const totalActive = STAGE_ORDER.reduce((s, stage) => s + (byStage[stage] ?? []).length, 0);
  const totalTerminal = STAGE_TERMINAL.reduce((s, stage) => s + (byStage[stage] ?? []).length, 0);

  const FUNNEL_COLORS: Record<string, string> = {
    SOURCED: 'bg-zinc-400',
    SCREENING: 'bg-blue-500',
    SUBMITTED: 'bg-violet-500',
    INTERVIEW_SCHEDULED: 'bg-amber-500',
    INTERVIEW_DONE: 'bg-orange-500',
    OFFER_ROLLED: 'bg-cyan-500',
    OFFER_ACCEPTED: 'bg-teal-500',
    JOINED: 'bg-emerald-600',
  };

  return (
    <div className="space-y-5">
      {/* ── Summary row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{totalActive}</p>
          <p className="text-xs text-muted-foreground">In Pipeline</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{byStage['JOINED']?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground">Joined</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{totalTerminal}</p>
          <p className="text-xs text-muted-foreground">Dropped</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Funnel visualization ──────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Pipeline Funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {STAGE_ORDER.map(stage => (
              <FunnelBar
                key={stage}
                label={STAGE_LABEL[stage]}
                count={byStage[stage]?.length ?? 0}
                max={maxCount}
                color={FUNNEL_COLORS[stage] ?? 'bg-zinc-400'}
              />
            ))}
            <div className="pt-2 border-t space-y-2">
              {STAGE_TERMINAL.map(stage => (
                <FunnelBar
                  key={stage}
                  label={STAGE_LABEL[stage]}
                  count={byStage[stage]?.length ?? 0}
                  max={maxCount}
                  color="bg-red-400"
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Stage selector + candidates ───────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                {selectedStage ? STAGE_LABEL[selectedStage] : 'All Candidates'}
              </CardTitle>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs h-7">
                      {selectedStage ? STAGE_LABEL[selectedStage] : 'All stages'}
                      <ChevronDown className="ml-1.5 h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSelectedStage(null)}>
                      All stages
                    </DropdownMenuItem>
                    {[...STAGE_ORDER, ...STAGE_TERMINAL].map(s => (
                      <DropdownMenuItem key={s} onClick={() => setSelectedStage(s)}>
                        <span className="flex items-center gap-2">
                          {STAGE_LABEL[s]}
                          <Badge className={`text-[9px] ${STAGE_COLOR[s]}`} variant="outline">
                            {byStage[s]?.length ?? 0}
                          </Badge>
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {candidatesQuery.isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 rounded bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {(selectedStage ? (byStage[selectedStage] ?? []) : candidates).map(c => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2.5 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.candidateName}</p>
                        {c.candidateEmail && (
                          <p className="text-xs text-muted-foreground truncate">
                            {c.candidateEmail}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Badge
                        className={`text-[10px] ${STAGE_COLOR[c.currentStage]}`}
                        variant="outline"
                      >
                        {STAGE_LABEL[c.currentStage]}
                      </Badge>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() => setSelectedCandidate(c)}
                        >
                          Move
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {candidates.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No candidates yet
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Stage update dialog ───────────────────────────────────────────── */}
      <Dialog open={!!selectedCandidate} onOpenChange={o => !o && setSelectedCandidate(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Move {selectedCandidate?.candidateName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            <p className="text-xs text-muted-foreground">Select new stage:</p>
            {[...STAGE_ORDER, ...STAGE_TERMINAL].map(stage => (
              <button
                key={stage}
                disabled={stage === selectedCandidate?.currentStage || stageMutation.isPending}
                onClick={() =>
                  stageMutation.mutate({ candidateId: selectedCandidate!.candidateId, stage })
                }
                className={`w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors
                  ${
                    stage === selectedCandidate?.currentStage
                      ? 'opacity-40 cursor-not-allowed bg-muted'
                      : 'hover:bg-muted/60 cursor-pointer'
                  }`}
              >
                <span>{STAGE_LABEL[stage]}</span>
                {stage === selectedCandidate?.currentStage && (
                  <Badge variant="outline" className="text-[10px]">
                    Current
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
