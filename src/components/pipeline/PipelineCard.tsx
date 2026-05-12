'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Building2,
  Briefcase,
  Clock,
  AlertCircle,
  PauseCircle,
  UserX,
  LogOut,
  ArrowRight,
  Send,
  DollarSign,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { PipelineRow, PipelineStage } from './usePipeline';
import {
  RejectDialog,
  WithdrawDialog,
  HoldDialog,
  SubmitDialog,
  OfferDialog,
  MoveStageDialog,
} from './PipelineActionDialogs';

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700 border-red-200',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
  LOW: 'bg-green-100 text-green-700 border-green-200',
};

const STAGE_COLORS: Record<string, string> = {
  '01': 'bg-slate-100 text-slate-700',
  '02': 'bg-blue-100 text-blue-700',
  '03': 'bg-indigo-100 text-indigo-700',
  '04': 'bg-violet-100 text-violet-700',
  '05': 'bg-purple-100 text-purple-700',
  '06': 'bg-fuchsia-100 text-fuchsia-700',
  '07A': 'bg-pink-100 text-pink-700',
  '07B': 'bg-pink-100 text-pink-700',
  '08': 'bg-rose-100 text-rose-700',
  '09': 'bg-orange-100 text-orange-700',
  '10': 'bg-green-100 text-green-700',
};

type Dialog = 'reject' | 'withdraw' | 'hold' | 'submit' | 'offer' | 'move' | null;

type Props = {
  pipeline: PipelineRow;
  stages: PipelineStage[];
};

export default function PipelineCard({ pipeline, stages }: Props) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const { snapshot, requirement, currentStage, recruiter } = pipeline;

  const isTerminated = pipeline.isRejected || pipeline.isWithdrawn;
  const stageColor = STAGE_COLORS[currentStage.code] ?? 'bg-slate-100 text-slate-600';

  return (
    <>
      <Card className={`border transition-all hover:shadow-md ${isTerminated ? 'opacity-60' : ''}`}>
        <CardContent className="p-4 space-y-3">
          {/* Top row — name + actions */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{snapshot.fullName}</p>
              <p className="text-xs text-muted-foreground truncate">{snapshot.email}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {!isTerminated && (
                  <>
                    <DropdownMenuItem onClick={() => setDialog('move')}>
                      <ArrowRight className="h-4 w-4 mr-2" /> Move Stage
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDialog('submit')}>
                      <Send className="h-4 w-4 mr-2" /> Submit to Client
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDialog('offer')}>
                      <DollarSign className="h-4 w-4 mr-2" /> Roll Offer
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {!pipeline.isOnHold && (
                      <DropdownMenuItem onClick={() => setDialog('hold')}>
                        <PauseCircle className="h-4 w-4 mr-2" /> Put on Hold
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-amber-600"
                      onClick={() => setDialog('withdraw')}
                    >
                      <LogOut className="h-4 w-4 mr-2" /> Withdraw
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDialog('reject')}
                    >
                      <UserX className="h-4 w-4 mr-2" /> Reject
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <a href={`/pipeline/${pipeline.id}`} target="_blank">
                    <ExternalLink className="h-4 w-4 mr-2" /> View Timeline
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Current role info */}
          {(snapshot.currentTitle || snapshot.currentCompany) && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Briefcase className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {snapshot.currentTitle}
                {snapshot.currentTitle && snapshot.currentCompany ? ' @ ' : ''}
                {snapshot.currentCompany}
              </span>
            </div>
          )}

          {/* Requirement */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {requirement.reqCode} — {requirement.title}
            </span>
          </div>

          {/* Skills */}
          {snapshot.topSkills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {snapshot.topSkills.slice(0, 3).map(s => (
                <span key={s} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-sm font-medium">
                  {s}
                </span>
              ))}
              {snapshot.topSkills.length > 3 && (
                <span className="text-[10px] text-muted-foreground">
                  +{snapshot.topSkills.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Status badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${stageColor}`}>
              {currentStage.code} {currentStage.label}
            </Badge>

            {pipeline.isOnHold && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200"
              >
                <PauseCircle className="h-2.5 w-2.5 mr-1" /> On Hold
              </Badge>
            )}
            {pipeline.isRejected && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 bg-red-50 text-red-700 border-red-200"
              >
                <AlertCircle className="h-2.5 w-2.5 mr-1" /> Rejected
              </Badge>
            )}
            {pipeline.isWithdrawn && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-600"
              >
                Withdrawn
              </Badge>
            )}
            {requirement.priority && (
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLORS[requirement.priority]}`}
              >
                {requirement.priority}
              </Badge>
            )}
          </div>

          {/* Footer — recruiter + time */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
            <span>
              {recruiter.firstName} {recruiter.lastName}
            </span>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                {formatDistanceToNow(new Date(pipeline.stageUpdatedAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action dialogs */}
      {dialog === 'reject' && (
        <RejectDialog pipeline={pipeline} open onClose={() => setDialog(null)} />
      )}
      {dialog === 'withdraw' && (
        <WithdrawDialog pipeline={pipeline} open onClose={() => setDialog(null)} />
      )}
      {dialog === 'hold' && <HoldDialog pipeline={pipeline} open onClose={() => setDialog(null)} />}
      {dialog === 'submit' && (
        <SubmitDialog pipeline={pipeline} open onClose={() => setDialog(null)} />
      )}
      {dialog === 'offer' && (
        <OfferDialog pipeline={pipeline} open onClose={() => setDialog(null)} />
      )}
      {dialog === 'move' && (
        <MoveStageDialog pipeline={pipeline} stages={stages} open onClose={() => setDialog(null)} />
      )}
    </>
  );
}
