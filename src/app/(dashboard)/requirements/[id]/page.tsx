/* eslint-disable react/no-unescaped-entities */
// File: page.tsx
// Path: src/app/(dashboard)/requirements/[id]/page.tsx

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ChevronDown,
  UserPlus,
  MapPin,
  Building2,
  Zap,
  X,
  FileText,
  Database,
  Globe,
  ExternalLink,
  Loader2,
  Pencil,
  Phone,
  Mail,
  Star,
  Briefcase,
  Clock,
  SlidersHorizontal,
  Search,
  RefreshCw,
  Filter,
  MoreVertical,
  Eye,
  MessageSquare,
  ThumbsDown,
  ArrowUpDown,
  Circle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAxios } from '@/hooks/useAxios';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/context/AuthContext';
import {
  STATUS_LABEL,
  STATUS_COLOR,
  STATUS_FLOW,
  PRIORITY_COLOR,
} from '@/components/requirements/types';
import type { RequirementDetail } from '@/components/requirements/types';
import { RequirementOverviewTab } from '@/components/requirements/RequirementOverviewTab';
import { RequirementPipelineTab } from '@/components/requirements/RequirementPipelineTab';
import { RequirementAssignmentsTab } from '@/components/requirements/RequirementAssignmentsTab';
import {
  RequirementNotesTab,
  RequirementDocumentsTab,
  RequirementActivityTab,
} from '@/components/requirements/RequirementNotesDocsActivityTabs';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PipelineStage {
  id: string;
  code: string;
  label: string;
  order: number;
  count: number;
}

interface DetailResponse {
  success: boolean;
  data: RequirementDetail & {
    assignments: { id: string; assignedTo: { id: string; firstName: string; lastName: string } }[];
    pipelineSummary: {
      total: number;
      active: number;
      rejected: number;
      withdrawn: number;
      onHold: number;
      byStage: PipelineStage[];
    };
  };
  permissions: { canEdit: boolean; canDelete: boolean };
}

interface AppCredential {
  id: string;
  appName: string;
  email: string;
}

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

interface CandidatesResponse {
  success: boolean;
  data: CandidatePipeline[];
  meta: { total: number; page: number; limit: number; pages: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const initials = (name: string) =>
  name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const avatarColor = (seed: string) => {
  const p = [
    'bg-violet-100 text-violet-700',
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-cyan-100 text-cyan-700',
    'bg-indigo-100 text-indigo-700',
    'bg-orange-100 text-orange-700',
  ];
  return p[seed.charCodeAt(0) % p.length];
};

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

const STAGE_HEADER_COLORS = [
  'text-amber-500',
  'text-blue-500',
  'text-rose-500',
  'text-violet-500',
  'text-emerald-500',
  'text-orange-500',
  'text-cyan-500',
  'text-indigo-500',
];

const APP_META: Record<string, { bg: string; short: string; color: string }> = {
  NAUKRI: { bg: 'bg-orange-50', short: 'N', color: 'text-orange-600' },
  LINKEDIN: { bg: 'bg-blue-50', short: 'in', color: 'text-blue-700' },
  FOUNDIT: { bg: 'bg-purple-50', short: 'F', color: 'text-purple-600' },
  SHINE: { bg: 'bg-sky-50', short: 'S', color: 'text-sky-600' },
  INDEED: { bg: 'bg-blue-50', short: 'I', color: 'text-blue-700' },
  GITHUB: { bg: 'bg-slate-100', short: 'G', color: 'text-slate-700' },
};

// ─── Extension bridge ─────────────────────────────────────────────────────────

// function triggerExtension(
//   requirementId: string,
//   requirementCode: string,
//   requirementTitle: string,
//   appName: string
// ) {
//   window.postMessage(
//     {
//       type: 'TALENTOX_SOURCE_NAUKRI',
//       requirementId,
//       requirementCode,
//       requirementTitle,
//       appName,
//     },
//     window.location.origin
//   );
// }

// // ─── Add Candidate Modal ──────────────────────────────────────────────────────

// function AddCandidateModal({
//   open,
//   onClose,
//   req,
// }: {
//   open: boolean;
//   onClose: () => void;
//   req: DetailResponse['data'];
// }) {
//   const axios = useAxios();
//   const [portalExpanded, setPortalExpanded] = useState(false);
//   const [launching, setLaunching] = useState<string | null>(null);

//   const { data: credsData, isLoading: credsLoading } = useQuery<{
//     success: boolean;
//     data: AppCredential[];
//   }>({
//     queryKey: ['user-app-credentials'],
//     queryFn: async () => (await axios.get('/users/app-credentials')).data,
//     enabled: open && portalExpanded,
//   });

//   const credentials = credsData?.data ?? [];

//   function handleLaunch(cred: AppCredential) {
//     setLaunching(cred.appName);
//     triggerExtension(req.id, req.reqCode, req.title, cred.appName);
//     setTimeout(() => {
//       setLaunching(null);
//       onClose();
//     }, 800);
//   }

//   if (!open) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center">
//       <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
//       <div className="relative z-10 w-full max-w-[420px] rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100">
//         {/* Header */}
//         <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
//           <div className="flex items-center gap-2.5">
//             <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
//               <UserPlus className="w-4 h-4 text-primary" />
//             </div>
//             <h2 className="text-sm font-semibold text-slate-900">Add Candidate</h2>
//           </div>
//           <button
//             onClick={onClose}
//             className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
//           >
//             <X className="w-4 h-4" />
//           </button>
//         </div>

//         {/* Body */}
//         <div className="px-3 py-3 space-y-0.5">
//           <ModalRow
//             iconBg="bg-rose-50"
//             icon={<Pencil className="w-4 h-4 text-rose-500" />}
//             title="Enter Details Manually"
//             desc="Create a candidate profile based on the information you already know"
//             onClick={onClose}
//           />

//           <ModalRow
//             iconBg="bg-green-50"
//             icon={<FileText className="w-4 h-4 text-green-600" />}
//             title="Upload Resume"
//             desc="Upload resumes directly from your system"
//             onClick={onClose}
//           />

//           <ModalRow
//             iconBg="bg-blue-50"
//             icon={<Database className="w-4 h-4 text-blue-500" />}
//             title="Database"
//             desc="Search the candidates from your own database"
//             onClick={onClose}
//           />

//           {/* Portal Recruit — expandable */}
//           <div>
//             <button
//               onClick={() => setPortalExpanded(v => !v)}
//               className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 transition-colors group"
//             >
//               <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
//                 <Globe className="w-4 h-4 text-amber-600" />
//               </div>
//               <div className="flex-1 text-left min-w-0">
//                 <p className="text-sm font-medium text-slate-800">Portal Recruit</p>
//                 <p className="text-xs text-slate-400 mt-0.5">
//                   Connect to Job Boards to parse resumes
//                 </p>
//               </div>
//               <div
//                 className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all text-[11px] font-bold leading-none ${portalExpanded ? 'border-primary bg-primary text-white' : 'border-slate-300 text-slate-500 group-hover:border-slate-400'}`}
//               >
//                 {portalExpanded ? '−' : '+'}
//               </div>
//             </button>

//             {portalExpanded && (
//               <div className="ml-12 pl-4 border-l-2 border-slate-100 py-1 space-y-0.5">
//                 {credsLoading ? (
//                   <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
//                     <Loader2 className="w-3.5 h-3.5 animate-spin" />
//                     Loading connected apps...
//                   </div>
//                 ) : credentials.length === 0 ? (
//                   <p className="py-3 text-xs text-slate-400 leading-relaxed">
//                     No apps connected yet.{' '}
//                     <span className="text-primary font-medium cursor-pointer hover:underline">
//                       Settings → Connected Apps
//                     </span>
//                   </p>
//                 ) : (
//                   credentials.map(cred => {
//                     const meta = APP_META[cred.appName] ?? {
//                       bg: 'bg-slate-100',
//                       short: cred.appName[0],
//                       color: 'text-slate-700',
//                     };
//                     const isLaunching = launching === cred.appName;
//                     const displayName =
//                       cred.appName.charAt(0) + cred.appName.slice(1).toLowerCase();
//                     return (
//                       <button
//                         key={cred.id}
//                         onClick={() => handleLaunch(cred)}
//                         disabled={!!launching}
//                         className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left group disabled:opacity-60"
//                       >
//                         <div
//                           className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}
//                         >
//                           <span className={`text-xs font-bold ${meta.color}`}>{meta.short}</span>
//                         </div>
//                         <div className="flex-1 min-w-0">
//                           <p className="text-sm font-medium text-slate-800">{displayName}</p>
//                           <p className="text-[11px] text-slate-400 truncate">
//                             Click here to login to {displayName} to start recruiting
//                           </p>
//                         </div>
//                         {isLaunching ? (
//                           <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
//                         ) : (
//                           <ExternalLink className="w-3.5 h-3.5 text-slate-200 group-hover:text-slate-500 shrink-0 transition-colors" />
//                         )}
//                       </button>
//                     );
//                   })
//                 )}
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

function ModalRow({
  iconBg,
  icon,
  title,
  desc,
  onClick,
}: {
  iconBg: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 transition-colors text-left group"
    >
      <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
      </div>
      <ChevronDown className="w-4 h-4 text-slate-200 group-hover:text-slate-400 transition-colors -rotate-90 shrink-0" />
    </button>
  );
}

// ─── Stage Header Tab ─────────────────────────────────────────────────────────

function StageTab({
  label,
  count,
  colorClass,
  active,
  onClick,
  hasArrow,
}: {
  label: string;
  count: number;
  colorClass: string;
  active: boolean;
  onClick: () => void;
  hasArrow?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 px-5 py-3.5 border-b-2 transition-all shrink-0 min-w-[80px] ${active ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-slate-50/80'}`}
    >
      <div className="flex items-center gap-1">
        <span className={`text-[22px] font-bold tabular-nums leading-none ${colorClass}`}>
          {count}
        </span>
        {hasArrow && <ChevronDown className={`w-3 h-3 ${colorClass} opacity-60 mt-0.5`} />}
      </div>
      <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mt-0.5">
        {label}
      </span>
    </button>
  );
}

// ─── Candidate Card ───────────────────────────────────────────────────────────

function CandidateCard({ p }: { p: CandidatePipeline }) {
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

  return (
    <div
      className={`group relative flex border-b border-slate-100 hover:bg-slate-50/60 transition-colors ${p.isRejected || p.isWithdrawn ? 'opacity-60' : ''}`}
    >
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
                  & {snap.topSkills.length - 3} more skills
                </span>
              )}
            </div>
          )}
          {snap.totalExpYears != null && (
            <div className="flex items-center gap-1">
              <Briefcase className="w-3 h-3 text-slate-300 shrink-0" />
              <span className="text-[11px] text-slate-400">Experience</span>
              <span className="text-[11px] text-slate-600">
                {Math.floor(snap.totalExpYears)} Years {Math.round((snap.totalExpYears % 1) * 12)}{' '}
                Months
              </span>
            </div>
          )}
          {raw?.currentSalary && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-300 shrink-0 font-medium">₹</span>
              <span className="text-[11px] text-slate-400">Current Salary</span>
              <span className="text-[11px] text-slate-600">{raw.currentSalary}</span>
            </div>
          )}
          {raw?.noticePeriod && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-blue-300 shrink-0" />
              <span className="text-[11px] text-slate-400">Notice Period</span>
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
            {raw?.source && <span> Via {raw.source}</span>}
            {' · Last processed '}
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

      {/* Action icons — right edge, visible on hover */}
      <div className="flex flex-col items-center gap-0.5 pt-3 pr-2 pl-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {[
          { Icon: Eye, title: 'View' },
          { Icon: Pencil, title: 'Edit' },
          { Icon: MessageSquare, title: 'Note' },
          { Icon: ThumbsDown, title: 'Reject' },
          { Icon: ArrowUpDown, title: 'Move Stage' },
          { Icon: MoreVertical, title: 'More' },
        ].map(({ Icon, title }) => (
          <button
            key={title}
            title={title}
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RequirementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const axios = useAxios();
  const qc = useQueryClient();
  const permission = usePermission('requirements');
  const { user } = useAuth();

  const [tab, setTab] = useState('candidates');
  const [addModal, setAddModal] = useState(false);
  const [activeOnly, setActiveOnly] = useState(true);
  const [search, setSearch] = useState('');
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [statusDialog, setStatusDialog] = useState<{ toStatus: string } | null>(null);
  const [statusReason, setStatusReason] = useState('');

  // ── Requirement detail (uses /detail for pipeline summary)
  const reqQuery = useQuery<DetailResponse>({
    queryKey: ['requirement-detail', id],
    queryFn: async () => (await axios.get(`/requirements/${id}/detail`)).data,
    enabled: !!id,
  });

  // ── Candidates
  const candidatesQuery = useQuery<CandidatesResponse>({
    queryKey: ['requirement-candidates', id, activeStageId, activeOnly, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeStageId) params.set('stageId', activeStageId);
      if (activeOnly) params.set('activeOnly', 'true');
      if (search) params.set('search', search);
      params.set('limit', '50');
      return (await axios.get(`/requirements/${id}/candidates?${params}`)).data;
    },
    enabled: !!id && tab === 'candidates',
  });

  // ── Status mutation
  const statusMutation = useMutation({
    mutationFn: async ({ status, reason }: { status: string; reason: string }) =>
      (await axios.patch(`/requirements/${id}/status`, { status, reason: reason || undefined }))
        .data,
    onSuccess: (_, vars) => {
      toast.success(`Status changed to ${STATUS_LABEL[vars.status as keyof typeof STATUS_LABEL]}`);
      qc.invalidateQueries({ queryKey: ['requirement-detail', id] });
      qc.invalidateQueries({ queryKey: ['requirements'] });
      setStatusDialog(null);
      setStatusReason('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to change status'),
  });

  // ── Loading
  if (reqQuery.isLoading) return <PageSkeleton />;
  if (reqQuery.isError || !reqQuery.data?.data) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <AlertCircle className="w-8 h-8 text-rose-400" />
        <p className="text-sm text-slate-500">Failed to load requirement.</p>
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  const req = reqQuery.data.data;
  const perms = reqQuery.data.permissions;
  const canEdit = permission.canEdit && perms.canEdit;
  const nextStatuses = STATUS_FLOW[req.status] ?? [];
  const summary = (req as any).pipelineSummary as DetailResponse['data']['pipelineSummary'];
  const stages = summary?.byStage ?? [];
  const assignments = ((req as any).assignments as DetailResponse['data']['assignments']) ?? [];

  const candidates = candidatesQuery.data?.data ?? [];
  const meta = candidatesQuery.data?.meta;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {/* ═══════════════════════════════════════════════════════════════════════
          TOP HEADER — split left (req info) + right (pipeline stage counts)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="border-b border-slate-100 bg-white shrink-0">
        <div className="flex">
          {/* LEFT — Requirement info ──────────────────────────────────────── */}
          <div className="w-[42%] shrink-0 border-r border-slate-100 px-5 pt-4 pb-3.5">
            <div className="flex items-start gap-2.5">
              {/* Back */}
              <button
                onClick={() => router.back()}
                className="mt-0.5 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="flex-1 min-w-0">
                {/* Icon + title */}
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">
                    {req.serviceLine?.name?.[0] ?? req.title[0]}
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-sm font-bold text-slate-900 leading-tight truncate">
                      {req.title}
                    </h1>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-slate-400 font-mono">ID:{req.reqCode}</span>
                      <Badge
                        className={`text-[10px] px-1.5 py-0 border ${STATUS_COLOR[req.status]}`}
                        variant="outline"
                      >
                        {STATUS_LABEL[req.status]}
                      </Badge>
                      <Badge
                        className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLOR[req.priority]}`}
                        variant="outline"
                      >
                        {req.priority}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Team avatars */}
                {assignments.length > 0 && (
                  <div className="flex items-center gap-1.5 ml-11 mb-1">
                    <div className="flex -space-x-1.5">
                      {assignments.slice(0, 5).map(a => (
                        <Avatar key={a.id} className="h-5 w-5 border-2 border-white">
                          <AvatarFallback
                            className={`text-[8px] font-bold ${avatarColor(a.assignedTo.id)}`}
                          >
                            {initials(`${a.assignedTo.firstName} ${a.assignedTo.lastName}`)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    {assignments.length > 5 && (
                      <span className="text-[11px] text-slate-400">+{assignments.length - 5}</span>
                    )}
                  </div>
                )}

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 ml-11">
                  {req.businessUnit && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Building2 className="w-3 h-3" />
                      {req.businessUnit.name}
                    </span>
                  )}
                  {req.location && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-500">
                      <MapPin className="w-3 h-3" />
                      {req.location} (
                      {req.remoteType.charAt(0) + req.remoteType.slice(1).toLowerCase()})
                    </span>
                  )}
                  {req.turnaroundDays && (
                    <span className="flex items-center gap-1 text-[11px] text-amber-600 font-medium">
                      <Zap className="w-3 h-3" />
                      {req.turnaroundDays} TAT
                    </span>
                  )}
                </div>

                {/* Respond by */}
                {req.respondBy && (
                  <p className="ml-11 mt-0.5 text-[11px] text-slate-400">
                    <span className="text-emerald-500 mr-1">●</span>
                    Respond by {format(new Date(req.respondBy), 'dd MMM yyyy')}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 ml-11 mt-2.5">
                  <Button
                    size="sm"
                    className="gap-1.5 h-7 text-xs font-medium"
                    onClick={() => setAddModal(true)}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Add Candidate
                  </Button>

                  {canEdit && nextStatuses.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                          Change Status <ChevronDown className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {nextStatuses.map(s => (
                          <DropdownMenuItem
                            key={s}
                            onClick={() => setStatusDialog({ toStatus: s })}
                          >
                            → {STATUS_LABEL[s as keyof typeof STATUS_LABEL]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {canEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1"
                      onClick={() => router.push(`/requirements/${id}/edit`)}
                    >
                      <Pencil className="w-3 h-3" /> Edit
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — Pipeline stage count tabs ───────────────────────────── */}
          <div className="flex-1 flex items-stretch overflow-x-auto border-slate-100">
            {/* ALL */}
            <StageTab
              label="ALL"
              count={summary?.total ?? 0}
              colorClass="text-slate-600"
              active={tab === 'candidates' && activeStageId === null}
              onClick={() => {
                setTab('candidates');
                setActiveStageId(null);
              }}
            />

            {stages.map((stage, idx) => (
              <StageTab
                key={stage.id}
                label={stage.label.toUpperCase()}
                count={stage.count}
                colorClass={STAGE_HEADER_COLORS[idx % STAGE_HEADER_COLORS.length]}
                active={tab === 'candidates' && activeStageId === stage.id}
                onClick={() => {
                  setTab('candidates');
                  setActiveStageId(prev => (prev === stage.id ? null : stage.id));
                }}
                hasArrow
              />
            ))}

            {/* Active toggle */}
            <div className="flex items-center gap-2 px-4 ml-auto shrink-0 border-l border-slate-100">
              <span className="text-[11px] text-slate-500 whitespace-nowrap">
                Display Candidates with Active Status
              </span>
              <Switch
                checked={activeOnly}
                onCheckedChange={setActiveOnly}
                className="scale-75 origin-right"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TABS
      ════════════════════════════════════════════════════════════════════════ */}
      <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1 overflow-hidden">
        <div className="border-b border-slate-100 bg-white shrink-0 px-5">
          <TabsList className="h-auto gap-0 bg-transparent p-0">
            {[
              { value: 'candidates', label: 'Candidates' },
              { value: 'overview', label: 'Job Description' },
              { value: 'pipeline', label: 'Pipeline' },
              { value: 'assignments', label: 'Assignments' },
              { value: 'notes', label: 'Notes' },
              { value: 'documents', label: 'Documents' },
              { value: 'activity', label: 'Activity' },
            ].map(t => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="rounded-none border-b-2 border-transparent px-4 pb-2.5 pt-1 text-xs font-medium text-slate-500 data-[state=active]:border-primary data-[state=active]:text-slate-900 data-[state=active]:shadow-none bg-transparent whitespace-nowrap"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* ── CANDIDATES TAB ──────────────────────────────────────────────── */}
        <TabsContent value="candidates" className="flex-1 overflow-hidden mt-0 flex flex-col">
          {/* Filter bar */}
          <div className="flex items-center gap-3 px-5 py-2 border-b border-slate-100 bg-white shrink-0">
            <div className="flex items-center gap-2">
              <input type="checkbox" className="rounded border-slate-300 w-3.5 h-3.5" />
              <span className="text-xs text-slate-500">Total {meta?.total ?? 0} Found</span>
            </div>

            {activeStageId === null && (
              <button className="text-[11px] px-2.5 py-1 rounded-full border border-primary bg-primary/5 text-primary font-medium">
                All Candidates
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                <Input
                  placeholder="Search candidates..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-7 text-xs w-44 border-slate-200 focus-visible:ring-1"
                />
              </div>
              <button
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                onClick={() => candidatesQuery.refetch()}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                <Filter className="w-3.5 h-3.5" />
              </button>
              <button className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-1 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-500 cursor-pointer hover:border-slate-300 transition-colors select-none">
                Sort By: Recently Proce...
                <ChevronDown className="w-3 h-3 ml-1" />
              </div>
            </div>
          </div>

          {/* Candidate list */}
          <div className="flex-1 overflow-y-auto">
            {candidatesQuery.isLoading ? (
              <div>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-4 p-4 border-b border-slate-100">
                    <Skeleton className="h-11 w-11 rounded-full shrink-0" />
                    <div className="flex-1 flex flex-col gap-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-64" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                ))}
              </div>
            ) : candidates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center gap-2">
                <Circle className="w-10 h-10 text-slate-200" />
                <p className="text-sm font-medium text-slate-500">No candidates yet</p>
                <p className="text-xs text-slate-400">
                  Use "Add Candidate" or source from a portal to get started.
                </p>
              </div>
            ) : (
              candidates.map(c => <CandidateCard key={c.id} p={c} />)
            )}
          </div>
        </TabsContent>

        {/* ── OTHER TABS — your existing components, untouched ─────────────── */}
        <TabsContent value="overview" className="flex-1 overflow-y-auto mt-0 p-6">
          <RequirementOverviewTab requirement={req} />
        </TabsContent>

        <TabsContent value="pipeline" className="flex-1 overflow-y-auto mt-0 p-6">
          <RequirementPipelineTab
            requirementId={id}
            currentStatus={req.status}
            canEdit={canEdit}
            serviceLineId={req.serviceLine?.id ?? null}
          />
        </TabsContent>

        <TabsContent value="assignments" className="flex-1 overflow-y-auto mt-0 p-6">
          <RequirementAssignmentsTab requirementId={id} canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="notes" className="flex-1 overflow-y-auto mt-0 p-6">
          <RequirementNotesTab
            requirementId={id}
            initialNotes={req.notes}
            canEdit={canEdit}
            currentUserId={user?.id ?? ''}
          />
        </TabsContent>

        <TabsContent value="documents" className="flex-1 overflow-y-auto mt-0 p-6">
          <RequirementDocumentsTab requirementId={id} canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="activity" className="flex-1 overflow-y-auto mt-0 p-6">
          <RequirementActivityTab requirementId={id} />
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODALS
      ════════════════════════════════════════════════════════════════════════ */}

      {/* Add Candidate modal */}
      <AddCandidateModal open={addModal} onClose={() => setAddModal(false)} req={req as any} />

      {/* Status change dialog */}
      <Dialog open={!!statusDialog} onOpenChange={o => !o && setStatusDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Change to{' '}
              {statusDialog && STATUS_LABEL[statusDialog.toStatus as keyof typeof STATUS_LABEL]}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>
                Reason <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Textarea
                placeholder="Why is this status changing?"
                value={statusReason}
                onChange={e => setStatusReason(e.target.value)}
                rows={3}
                className="resize-none text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(null)}>
              Cancel
            </Button>
            <Button
              disabled={statusMutation.isPending}
              onClick={() =>
                statusDialog &&
                statusMutation.mutate({ status: statusDialog.toStatus, reason: statusReason })
              }
            >
              {statusMutation.isPending ? 'Updating…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="flex flex-col h-screen">
      <div className="border-b p-4 flex gap-6">
        <div className="w-[42%] flex flex-col gap-2">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="flex gap-4 flex-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <Skeleton className="h-6 w-10" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 p-6 flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4 border rounded-xl">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="flex-1 flex flex-col gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// File: AddCandidateModal.tsx (drop-in replacement for the modal section in page.tsx)
// Path: src/app/(dashboard)/requirements/[id]/page.tsx — replace the AddCandidateModal component

// ─── Hardcoded portal apps ─────────────────────────────────────────────────
// No API call needed — these are fixed portals.
// Clicking opens the portal URL directly. If recruiter is already logged in
// on that site, they land on the dashboard. If not, they see login.
// Extension picks up the requirementId and shows it in the popup.

// File: AddCandidateModal.tsx
// Path: src/app/(dashboard)/requirements/[id]/_components/AddCandidateModal.tsx
// Drop this into page.tsx replacing the existing AddCandidateModal + triggerExtension

const PORTAL_APPS = [
  {
    appName: 'NAUKRI',
    displayName: 'Naukri',
    url: 'https://resdex.naukri.com',
    bg: 'bg-orange-50',
    short: 'N',
    color: 'text-orange-600',
    desc: 'Source from Naukri Resdex',
  },
  {
    appName: 'LINKEDIN',
    displayName: 'LinkedIn',
    url: 'https://www.linkedin.com/talent/home',
    bg: 'bg-blue-50',
    short: 'in',
    color: 'text-blue-700',
    desc: 'Source from LinkedIn Recruiter',
  },
  {
    appName: 'FOUNDIT',
    displayName: 'Foundit',
    url: 'https://www.foundit.in/recruiter',
    bg: 'bg-purple-50',
    short: 'F',
    color: 'text-purple-600',
    desc: 'Source from Foundit (Monster)',
  },
];

function triggerExtension(
  requirementId: string,
  requirementCode: string,
  requirementTitle: string,
  appName: string
) {
  window.postMessage(
    {
      type: 'TALENTOX_SOURCE_NAUKRI',
      requirementId,
      requirementCode,
      requirementTitle,
      appName,
    },
    window.location.origin
  );
}

function AddCandidateModal({
  open,
  onClose,
  req,
}: {
  open: boolean;
  onClose: () => void;
  req: DetailResponse['data'];
}) {
  const [portalExpanded, setPortalExpanded] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[420px] rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-sm font-semibold text-slate-900">Add Candidate</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-3 py-3 space-y-0.5">
          <ModalRow
            iconBg="bg-rose-50"
            icon={<Pencil className="w-4 h-4 text-rose-500" />}
            title="Enter Details Manually"
            desc="Create a candidate profile based on the information you already know"
            onClick={onClose}
          />

          <ModalRow
            iconBg="bg-green-50"
            icon={<FileText className="w-4 h-4 text-green-600" />}
            title="Upload Resume"
            desc="Upload resumes directly from your system"
            onClick={onClose}
          />

          <ModalRow
            iconBg="bg-blue-50"
            icon={<Database className="w-4 h-4 text-blue-500" />}
            title="Database"
            desc="Search the candidates from your own database"
            onClick={onClose}
          />

          {/* Portal Recruit */}
          <div>
            <button
              onClick={() => setPortalExpanded(v => !v)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-slate-800">Portal Recruit</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Connect to Job Boards to parse resumes
                </p>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all text-[11px] font-bold leading-none ${portalExpanded ? 'border-primary bg-primary text-white' : 'border-slate-300 text-slate-500'}`}
              >
                {portalExpanded ? '−' : '+'}
              </div>
            </button>

            {portalExpanded && (
              <div className="ml-12 pl-4 border-l-2 border-slate-100 py-1 space-y-0.5">
                {PORTAL_APPS.map(app => (
                  // ✅ Use <a> tag — browser never blocks anchor clicks
                  // onClick fires postMessage to extension BEFORE navigation
                  <a
                    key={app.appName}
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      // sync requirement to extension first
                      triggerExtension(req.id, req.reqCode, req.title, app.appName);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left group no-underline"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg ${app.bg} flex items-center justify-center shrink-0`}
                    >
                      <span className={`text-xs font-bold ${app.color}`}>{app.short}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{app.displayName}</p>
                      <p className="text-[11px] text-slate-400 truncate">{app.desc}</p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-200 group-hover:text-slate-500 shrink-0 transition-colors" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
