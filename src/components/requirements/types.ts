/* eslint-disable @typescript-eslint/no-explicit-any */
// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export type RequirementStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'CLOSED'
  | 'CANCELLED';

export type CandidateStageStatus =
  | 'SOURCED'
  | 'SCREENING'
  | 'SUBMITTED'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEW_DONE'
  | 'OFFER_ROLLED'
  | 'OFFER_ACCEPTED'
  | 'JOINED'
  | 'REJECTED'
  | 'WITHDRAWN';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type JobType = 'CONTRACT' | 'PERMANENT' | 'CONTRACT_TO_HIRE' | 'FREELANCE';
export type RemoteType = 'ONSITE' | 'REMOTE' | 'HYBRID';
export type SalaryType = 'MONTHLY' | 'ANNUAL' | 'HOURLY' | 'DAILY';

// ─────────────────────────────────────────────────────────────────────────────
// SHARED REFS
// ─────────────────────────────────────────────────────────────────────────────

export interface UserRef {
  id: string;
  firstName: string;
  lastName: string;
}
export interface NameRef {
  id: string;
  name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUIREMENT DETAIL
// ─────────────────────────────────────────────────────────────────────────────

export interface RequirementDetail {
  id: string;
  reqCode: string;
  title: string;
  description: string | null;
  status: RequirementStatus;
  priority: Priority;
  jobType: JobType;
  remoteType: RemoteType;
  location: string | null;
  country: string | null;
  skills: string[];
  experienceMin: number | null;
  experienceMax: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryType: SalaryType | null;
  totalOpenings: number;
  filledOpenings: number;
  activeApplications: number;
  interviewsScheduled: number;
  offersRolledOut: number;
  startDate: string | null;
  endDate: string | null;
  respondBy: string | null;
  turnaroundDays: number | null;
  closedAt: string | null;
  isRespondByBreached: boolean;
  isTurnaroundBreached: boolean;
  jdFileKey: string | null;
  jdFileName: string | null;
  jdFileType: string | null;
  jdUploadedAt: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  client: NameRef & { industry: string | null };
  businessUnit: NameRef | null;
  serviceLine: NameRef | null;
  clientSpoc: {
    id: string;
    isPrimary: boolean;
    handler: UserRef;
    serviceLine: NameRef;
  } | null;
  createdBy: UserRef;
  approvedBy: UserRef | null;
  closedBy: UserRef | null;
  statusHistory: StatusHistoryItem[];
  notes: NoteItem[];
}

export interface StatusHistoryItem {
  id: string;
  fromStatus: RequirementStatus;
  toStatus: RequirementStatus;
  reason: string | null;
  changedAt: string;
  changedBy: UserRef;
}

export interface NoteItem {
  id: string;
  content: string;
  createdAt: string;
  author: UserRef;
}

// ─────────────────────────────────────────────────────────────────────────────
// CANDIDATES
// ─────────────────────────────────────────────────────────────────────────────

export interface CandidateItem {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string | null;
  currentStage: CandidateStageStatus;
  rejectionReason: string | null;
  notes: string | null;
  stageUpdatedAt: string;
  createdAt: string;
  assignment: {
    id: string;
    assignedTo: UserRef;
  } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNMENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface AssignmentNode {
  id: string;
  depth: number;
  parentAssignmentId: string | null;
  status: string;
  allocatedOpenings: number | null;
  filledOpenings: number;
  submissionsCount: number;
  interviewsCount: number;
  deadline: string | null;
  deadlineMet: boolean | null;
  breachedAt: string | null;
  assignedAt: string;
  assignedTo: UserRef & { employeeId: string | null; department: NameRef | null };
  assignedBy: UserRef;
  assigneeBU: NameRef | null;
  candidates: {
    id: string;
    candidateId: string;
    candidateName: string;
    candidateEmail: string | null;
    currentStage: CandidateStageStatus;
    stageUpdatedAt: string;
    rejectionReason: string | null;
    notes: string | null;
  }[];
  children: AssignmentNode[];
}

export interface RequirementTree {
  requirement: {
    id: string;
    reqCode: string;
    title: string;
    status: RequirementStatus;
    totalOpenings: number;
    filledOpenings: number;
    activeApplications: number;
    interviewsScheduled: number;
    offersRolledOut: number;
  };
  assignmentTree: AssignmentNode[];
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface DocumentItem {
  id: string;
  fileName: string | null;
  fileKey: string | null;
  fileType: string | null;
  content: string | null;
  isIssue: boolean;
  issueResolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
  raisedBy: UserRef;
  resolvedBy: UserRef | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITIES
// ─────────────────────────────────────────────────────────────────────────────

export interface ActivityItem {
  id: string;
  type: string;
  summary: string;
  meta: Record<string, any> | null;
  createdAt: string;
  actor: UserRef;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const STATUS_FLOW: Record<RequirementStatus, RequirementStatus[]> = {
  DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['ACTIVE', 'DRAFT', 'CANCELLED'],
  ACTIVE: ['ON_HOLD', 'CLOSED', 'CANCELLED'],
  ON_HOLD: ['ACTIVE', 'CLOSED', 'CANCELLED'],
  CLOSED: [],
  CANCELLED: [],
};

export const STATUS_LABEL: Record<RequirementStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

export const STATUS_COLOR: Record<RequirementStatus, string> = {
  DRAFT: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  ON_HOLD: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  CLOSED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};

export const PRIORITY_COLOR: Record<Priority, string> = {
  LOW: 'bg-zinc-100 text-zinc-600',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-red-100 text-red-700',
};

export const STAGE_ORDER: CandidateStageStatus[] = [
  'SOURCED',
  'SCREENING',
  'SUBMITTED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_DONE',
  'OFFER_ROLLED',
  'OFFER_ACCEPTED',
  'JOINED',
];
export const STAGE_TERMINAL: CandidateStageStatus[] = ['REJECTED', 'WITHDRAWN'];

export const STAGE_LABEL: Record<CandidateStageStatus, string> = {
  SOURCED: 'Sourced',
  SCREENING: 'Screening',
  SUBMITTED: 'Submitted',
  INTERVIEW_SCHEDULED: 'Interview Scheduled',
  INTERVIEW_DONE: 'Interview Done',
  OFFER_ROLLED: 'Offer Rolled',
  OFFER_ACCEPTED: 'Offer Accepted',
  JOINED: 'Joined',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

export const STAGE_COLOR: Record<CandidateStageStatus, string> = {
  SOURCED: 'bg-zinc-100 text-zinc-600',
  SCREENING: 'bg-blue-100 text-blue-700',
  SUBMITTED: 'bg-violet-100 text-violet-700',
  INTERVIEW_SCHEDULED: 'bg-amber-100 text-amber-700',
  INTERVIEW_DONE: 'bg-orange-100 text-orange-700',
  OFFER_ROLLED: 'bg-cyan-100 text-cyan-700',
  OFFER_ACCEPTED: 'bg-teal-100 text-teal-700',
  JOINED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
  WITHDRAWN: 'bg-rose-100 text-rose-700',
};

export function daysRemaining(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function fullName(u: UserRef) {
  return `${u.firstName} ${u.lastName}`;
}
