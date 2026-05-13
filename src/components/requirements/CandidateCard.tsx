// File: CandidateCard.tsx
// Path: src/components/requirements/CandidateCard.tsx

/**
 * Replacement for the inline CandidateCard in the detail page.
 *
 * Key additions:
 * 1. "Update Profile" button → opens CandidateUpdateModal
 * 2. RBAC-aware action visibility (canEdit, isOwner)
 * 3. Resume missing warning banner
 *
 * Drop this into src/components/requirements/CandidateCard.tsx
 * Then import it in the detail page and replace the inline CandidateCard.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Phone,
  Mail,
  MapPin,
  Star,
  Briefcase,
  Clock,
  Eye,
  Pencil,
  MessageSquare,
  ThumbsDown,
  ArrowUpDown,
  MoreVertical,
  UserCog,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CandidateUpdateModal } from './CandidateUpdateModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CandidatePipeline {
  id: string;
  isRejected: boolean;
  isWithdrawn: boolean;
  isOnHold: boolean;
  stageUpdatedAt: string;
  createdAt: string;
  submittedAt: string | null;
  offeredCtc: number | null;
  offerStatus: string | null;
  currentStage: { id: string; code: string; label: string; order: number };
  aging: { minutes: number; label: string };
  snapshot: {
    id: string;
    candidateServiceId: string;
    fullName: string;
    email: string;
    phone: string | null;
    currentTitle: string | null;
    currentCompany: string | null;
    totalExpYears: number | null;
    topSkills: string[];
    resumeUrl: string | null;
    rawSnapshot: any;
  };
  recruiter: { id: string; firstName: string; lastName: string };
  stageHistory: any[];
}

interface Props {
  p: CandidatePipeline;
  requirementId: string;
  /** Whether the current user can edit this pipeline entry */
  canEdit: boolean;
  /** Current user ID — used to check if this recruiter owns this entry */
  currentUserId: string;
  onView?: (pipelineId: string) => void;
  onReject?: (pipelineId: string) => void;
  onMoveStage?: (pipelineId: string) => void;
  onNote?: (pipelineId: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
];

function avatarColor(seed: string) {
  return AVATAR_COLORS[seed.charCodeAt(0) % AVATAR_COLORS.length];
}

const STAGE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  '01': { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  '02': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  '03': { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  '04': { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  '05': { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  '06': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  '07': { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  '07A': { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  '07B': { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  '08': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  '09': { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-600' },
  '10': { bg: 'bg-green-200', text: 'text-green-900', dot: 'bg-green-700' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function CandidateCard({
  p,
  requirementId,
  canEdit,
  currentUserId,
  onView,
  onReject,
  onMoveStage,
  onNote,
}: Props) {
  const [updateModalOpen, setUpdateModalOpen] = useState(false);

  const snap = p.snapshot;
  const stage = p.currentStage;
  const colors = STAGE_COLORS[stage.code] ?? STAGE_COLORS['01'];
  const raw = snap.rawSnapshot ?? {};

  const agingColor =
    p.aging.minutes > 43200
      ? 'text-rose-500'
      : p.aging.minutes > 10080
        ? 'text-amber-500'
        : 'text-slate-400';

  // RBAC: recruiter can edit only their own entries; managers/leads can edit all
  const isOwner = p.recruiter.id === currentUserId;
  const canAct = canEdit || isOwner; // can do stage ops
  const canUpdate = canEdit || isOwner; // can update snapshot

  const resumeMissing = !snap.resumeUrl;

  return (
    <>
      <div
        className={`group relative flex border-b border-slate-100 hover:bg-slate-50/60 transition-colors ${
          p.isRejected || p.isWithdrawn ? 'opacity-60' : ''
        }`}
      >
        {/* Resume missing strip */}
        {resumeMissing && !p.isRejected && !p.isWithdrawn && (
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-400" />
        )}

        {/* Checkbox */}
        <div className="flex items-start pt-[18px] pl-4 pr-2 shrink-0">
          <input
            type="checkbox"
            className="rounded border-slate-300 text-primary cursor-pointer w-3.5 h-3.5"
          />
        </div>

        {/* Left — avatar + identity */}
        <div className="flex gap-3 py-3.5 pl-1 pr-3 w-[38%] shrink-0">
          <Avatar className="h-11 w-11 shrink-0 mt-0.5">
            <AvatarFallback className={`text-sm font-bold ${avatarColor(snap.candidateServiceId)}`}>
              {initials(snap.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-400 font-mono leading-none mb-0.5">
              ID:{snap.candidateServiceId.slice(-6).toUpperCase()}
            </p>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase leading-tight">
              {snap.fullName}
            </h3>
            {(snap.currentTitle || snap.currentCompany) && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {snap.currentTitle}
                {snap.currentTitle && snap.currentCompany ? ' at ' : ''}
                {snap.currentCompany}
              </p>
            )}

            {/* Resume missing warning */}
            {resumeMissing && !p.isRejected && !p.isWithdrawn && (
              <div className="flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="text-[10px] text-amber-600 font-medium">Resume not captured</span>
                {canUpdate && (
                  <button
                    onClick={() => setUpdateModalOpen(true)}
                    className="text-[10px] text-primary underline ml-0.5"
                  >
                    Update
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-col gap-0.5 mt-1.5">
              {snap.phone && (
                <span className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Phone className="w-3 h-3 shrink-0" />
                  {snap.phone}
                </span>
              )}
              {snap.email && (
                <span className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate max-w-[160px]">{snap.email}</span>
                </span>
              )}
              {raw?.location && (
                <span className="flex items-center gap-1 text-[11px] text-slate-500">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {raw.location}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right — stage + details */}
        <div className="flex flex-col gap-1.5 py-3.5 pl-3 pr-2 flex-1 min-w-0 border-l border-slate-50">
          {/* Stage tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} shrink-0`} />
              {stage.label}
            </span>
            {p.isRejected && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 font-medium">
                Rejected
              </span>
            )}
            {p.isWithdrawn && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                Withdrawn
              </span>
            )}
            {p.isOnHold && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">
                On Hold
              </span>
            )}
            {p.offeredCtc && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-medium">
                Offer: ₹{(p.offeredCtc / 100000).toFixed(1)}L
              </span>
            )}
            {snap.resumeUrl && (
              <a
                href={snap.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <FileText className="w-3 h-3" />
                Resume
              </a>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col gap-0.5">
            {snap.topSkills?.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <Star className="w-3 h-3 text-slate-300 shrink-0" />
                <span className="text-[11px] text-slate-400">Skills</span>
                {snap.topSkills.slice(0, 3).map(s => (
                  <span key={s} className="text-[11px] text-slate-600">
                    • {s}
                  </span>
                ))}
                {snap.topSkills.length > 3 && (
                  <span className="text-[11px] text-slate-400">
                    & {snap.topSkills.length - 3} more
                  </span>
                )}
              </div>
            )}
            {snap.totalExpYears != null && (
              <div className="flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-slate-300 shrink-0" />
                <span className="text-[11px] text-slate-400">Experience</span>
                <span className="text-[11px] text-slate-600">
                  {Math.floor(snap.totalExpYears)}y {Math.round((snap.totalExpYears % 1) * 12)}m
                </span>
              </div>
            )}
            {raw?.currentSalary && (
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-slate-300 shrink-0 font-medium">₹</span>
                <span className="text-[11px] text-slate-400">Current</span>
                <span className="text-[11px] text-slate-600">{raw.currentSalary}</span>
              </div>
            )}
            {raw?.noticePeriod && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-300 shrink-0" />
                <span className="text-[11px] text-slate-400">Notice</span>
                <span className="text-[11px] text-slate-600">{raw.noticePeriod}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-end justify-between mt-auto pt-1">
            <p className="text-[10px] text-slate-400 leading-relaxed max-w-[75%]">
              Added by{' '}
              <span className="text-slate-500 font-medium">
                {p.recruiter.firstName} {p.recruiter.lastName}
              </span>
              {raw?.source && <span> via {raw.source}</span>}
              {' · '}
              <span className="text-slate-500">
                {format(new Date(p.stageUpdatedAt), 'dd MMM yyyy')}
              </span>
            </p>
            <span
              className={`flex items-center gap-1 text-[11px] font-semibold ${agingColor} shrink-0`}
            >
              <Clock className="w-3 h-3" />
              {p.aging.label}
            </span>
          </div>
        </div>

        {/* Action icons — visible on hover, RBAC-gated */}
        <div className="flex flex-col items-center gap-0.5 pt-3 pr-2 pl-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <ActionBtn Icon={Eye} title="View" onClick={() => onView?.(p.id)} />
          {canUpdate && (
            <ActionBtn
              Icon={UserCog}
              title="Update Profile"
              onClick={() => setUpdateModalOpen(true)}
            />
          )}
          {canAct && (
            <ActionBtn Icon={MessageSquare} title="Add Note" onClick={() => onNote?.(p.id)} />
          )}
          {canAct && !p.isRejected && !p.isWithdrawn && (
            <ActionBtn Icon={ArrowUpDown} title="Move Stage" onClick={() => onMoveStage?.(p.id)} />
          )}
          {canAct && !p.isRejected && !p.isWithdrawn && (
            <ActionBtn Icon={ThumbsDown} title="Reject" onClick={() => onReject?.(p.id)} />
          )}
          <ActionBtn Icon={MoreVertical} title="More" onClick={() => {}} />
        </div>
      </div>

      {/* Update Modal */}
      <CandidateUpdateModal
        open={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        requirementId={requirementId}
        pipelineId={p.id}
        snapshot={snap}
      />
    </>
  );
}

// ─── Action Button ────────────────────────────────────────────────────────────

function ActionBtn({
  Icon,
  title,
  onClick,
}: {
  Icon: React.ElementType;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      title={title}
      onClick={e => {
        e.stopPropagation();
        onClick();
      }}
      className="w-7 h-7 rounded-md flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}
