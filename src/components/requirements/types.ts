/* eslint-disable @typescript-eslint/no-explicit-any */
// File: types.ts
// Path: src/components/requirements/types.ts

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

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type JobType = 'CONTRACT' | 'PERMANENT' | 'CONTRACT_TO_HIRE' | 'FREELANCE';
export type RemoteType = 'ONSITE' | 'REMOTE' | 'HYBRID';
export type SalaryType = 'MONTHLY' | 'ANNUAL' | 'HOURLY' | 'DAILY';
export type JobOpenFor = 'EXTERNAL' | 'INTERNAL' | 'BOTH';
export type ClosureReason =
  | 'FILLED'
  | 'CANCELLED'
  | 'CLIENT_WITHDREW'
  | 'BUDGET_HOLD'
  | 'DUPLICATE';
export type JDParseStatus = 'PARSED' | 'FAILED' | 'MANUALLY_OVERRIDDEN';

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
  jobOpenFor: JobOpenFor;

  // location — split fields (location + skills flat strings REMOVED)
  city: string | null;
  state: string | null;
  country: string | null;

  // skills — split
  primarySkills: string[];
  keySkills: string[];

  experienceMin: number | null;
  experienceMax: number | null;

  // compensation
  salaryMin: number | null;
  salaryMax: number | null;
  salaryType: SalaryType | null;
  salaryCurrency: string | null;
  bonusAmount: number | null;
  hideSalaryFromCandidate: boolean;
  showMedianSalary: boolean;

  // employment details
  education: string | null;
  functionalArea: string | null;
  shift: string | null;

  // sourcing strategy
  targetCompanies: string[];
  noPoachCompanies: string[];

  totalOpenings: number;
  // filledOpenings / activeApplications / interviewsScheduled / offersRolledOut
  // REMOVED — all computed from pipeline rows on demand

  // dates
  startDate: string | null;
  targetDate: string | null; // was endDate — renamed
  respondBy: string | null;
  turnaroundDays: number | null;
  closedAt: string | null;
  closureReason: ClosureReason | null;

  isRespondByBreached: boolean;
  isTurnaroundBreached: boolean;

  // JD file
  jdFileKey: string | null;
  jdFileName: string | null;
  jdFileType: string | null;
  jdUploadedAt: string | null;

  // JD parse metadata
  jdParsedAt: string | null;
  jdParseStatus: JDParseStatus | null;
  jdParsedFields: string[];
  parsedJDId: string | null;

  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;

  client:
    | (NameRef & {
        industry: string | null;
        city: string | null;
        country: string | null;
      })
    | null;

  businessUnit: NameRef | null;

  serviceLine:
    | (NameRef & {
        code: string | null;
      })
    | null;

  clientSpoc: {
    id: string;
    firstName: string;
    lastName: string;
    designation: string | null;
    email: string | null;
    phone: string | null;
    isPrimary: boolean;
    handler: UserRef;
  } | null;

  createdBy: UserRef;
  approvedBy: UserRef | null;
  closedBy: UserRef | null;

  statusHistory: StatusHistoryItem[];
  notes: NoteItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS HISTORY & NOTES
// ─────────────────────────────────────────────────────────────────────────────

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
  pipelines: {
    id: string;
    isRejected: boolean;
    isWithdrawn: boolean;
    isOnHold: boolean;
    stageUpdatedAt: string;
    currentStage: { id: string; code: string; label: string; order: number };
    snapshot: {
      id: string;
      candidateServiceId: string;
      fullName: string;
      email: string;
      currentTitle: string | null;
      currentCompany: string | null;
      topSkills: string[];
    };
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
    // counters removed — computed from pipeline rows
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
  DRAFT: 'bg-zinc-100 text-zinc-700',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  ON_HOLD: 'bg-blue-100 text-blue-700',
  CLOSED: 'bg-slate-100 text-slate-600',
  CANCELLED: 'bg-red-100 text-red-700',
};

export const PRIORITY_COLOR: Record<Priority, string> = {
  LOW: 'bg-zinc-100 text-zinc-600',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-red-100 text-red-700',
};

export function daysRemaining(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function fullName(u: UserRef) {
  return `${u.firstName} ${u.lastName}`;
}
