// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

// export type RequirementStatus =
//   | 'DRAFT'
//   | 'PENDING_APPROVAL'
//   | 'ACTIVE'
//   | 'ON_HOLD'
//   | 'CLOSED'
//   | 'CANCELLED';

export type RequirementType = 'CONTRACT' | 'PERMANENT' | 'CONTRACT_TO_HIRE' | 'FREELANCE';

export type RemoteType = 'ONSITE' | 'REMOTE' | 'HYBRID';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export type SalaryType = 'MONTHLY' | 'ANNUAL' | 'HOURLY' | 'DAILY';

export type AssignmentType = 'MANAGER' | 'TEAM' | 'INDIVIDUAL';

export type AssignmentStatus = 'ACTIVE' | 'REMOVED' | 'REPLACED';

// ─────────────────────────────────────────────────────────────────────────────
// Shared refs
// ─────────────────────────────────────────────────────────────────────────────

export interface UserRef {
  id: string;
  firstName: string;
  lastName: string;
  employeeId?: string;
}

export interface ClientRef {
  id: string;
  name: string;
  vmsName?: string;
  status?: string;
  industry?: string;
}

export interface TeamRef {
  id: string;
  name: string;
  nodeType?: string;
}

export interface BusinessUnitRef {
  id: string;
  name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Assignment
// ─────────────────────────────────────────────────────────────────────────────

export interface Assignment {
  id: string;
  assignmentType: AssignmentType;
  allocatedOpenings: number | null;
  filledOpenings: number;
  submissionsCount?: number;
  interviewsCount?: number;
  assignedAt?: string;
  deadline?: string | null;
  breachedAt?: string | null;
  isAutoRouted?: boolean;
  recruiter?: UserRef | null;
  team?: TeamRef | null;
  assignedBy?: UserRef | null;
  childAssignments?: Assignment[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Requirement — list item
// ─────────────────────────────────────────────────────────────────────────────

// export interface RequirementListItem {
//   id: string;
//   reqCode: string;
//   title: string;
//   status: RequirementStatus;
//   priority: Priority;
//   jobType: RequirementType;
//   remoteType: RemoteType;
//   totalOpenings: number;
//   filledOpenings: number;
//   salaryMin?: number | null;
//   salaryMax?: number | null;
//   salaryType?: SalaryType | null;
//   respondBy?: string | null;
//   turnaroundDays?: number | null;
//   isRespondByBreached: boolean;
//   isTurnaroundBreached: boolean;
//   createdAt: string;
//   updatedAt: string;
//   businessUnit?: BusinessUnitRef | null;
//   client: ClientRef;
//   createdBy: UserRef;
//   skills: { skill: { canonicalName: string } }[];
//   assignments: Assignment[];
// }

// ─────────────────────────────────────────────────────────────────────────────
// Requirement — full detail
// ─────────────────────────────────────────────────────────────────────────────

// export interface RequirementDetail extends RequirementListItem {
//   description?: string | null;
//   clientContactId?: string | null;
//   clientContact?: {
//     id: string;
//     firstName: string;
//     lastName: string;
//     designation?: string | null;
//     email: string;
//   } | null;
//   location?: string | null;
//   country?: string | null;
//   experienceMin?: number | null;
//   experienceMax?: number | null;
//   startDate?: string | null;
//   endDate?: string | null;
//   closedAt?: string | null;
//   approvedBy?: UserRef | null;
//   approvedAt?: string | null;
//   closedBy?: UserRef | null;
//   jd: {
//     id: string;
//     fileName: string;
//     fileKey: string;
//     fileType: string;
//     fileSizeBytes?: number | null;
//     version: number;
//     uploadedAt: string;
//     uploadedBy: UserRef;
//   }[];
//   notes: {
//     id: string;
//     content: string;
//     createdAt: string;
//     updatedAt: string;
//     author: UserRef;
//   }[];
//   statusHistory: {
//     id: string;
//     fromStatus: RequirementStatus;
//     toStatus: RequirementStatus;
//     reason?: string | null;
//     changedAt: string;
//     changedBy: UserRef;
//   }[];
//   activities: {
//     id: string;
//     type: string;
//     summary: string;
//     meta?: unknown;
//     createdAt: string;
//     actor: UserRef;
//   }[];
//   documents: {
//     id: string;
//     type: string;
//     fileName?: string | null;
//     fileKey?: string | null;
//     content?: string | null;
//     isIssue: boolean;
//     issueResolved: boolean;
//     createdAt: string;
//     raisedBy: UserRef;
//   }[];
// }

// ─────────────────────────────────────────────────────────────────────────────
// API shapes
// ─────────────────────────────────────────────────────────────────────────────

// export interface RequirementListResponse {
//   success: boolean;
//   data: RequirementListItem[];
//   meta: {
//     total: number;
//     page: number;
//     limit: number;
//     pages: number;
//   };
//   permissions: {
//     canAdd: boolean;
//     canEdit: boolean;
//     canDelete: boolean;
//   };
// }

export interface RequirementDetailResponse {
  success: boolean;
  data: RequirementDetail;
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
  };
}

// export interface RequirementStatsResponse {
//   success: boolean;
//   data: {
//     byStatus: Partial<Record<RequirementStatus, number>>;
//     byPriority: Partial<Record<Priority, number>>;
//     breached: number;
//     recentlyCreated: number;
//   };
// }

// ─────────────────────────────────────────────────────────────────────────────
// Filter state
// ─────────────────────────────────────────────────────────────────────────────

export interface RequirementFilters {
  search: string;
  status: RequirementStatus | '';
  priority: Priority | '';
  jobType: RequirementType | '';
  remoteType: RemoteType | '';
  clientId: string;
  buId: string;
  createdById: string;
  assignedTeamId: string;
  assignedToMe: boolean;
  breached: boolean;
  respondByFrom: string;
  respondByTo: string;
  startDateFrom: string;
  startDateTo: string;
  createdFrom: string;
  createdTo: string;
  page: number;
  limit: number;
  sortBy: 'createdAt' | 'updatedAt' | 'respondBy' | 'priority' | 'status' | 'startDate';
  sortDir: 'asc' | 'desc';
}

// types/requirements.types.ts  (or components/requirements/types.ts)

export type RequirementStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'CLOSED'
  | 'CANCELLED';

export const STATUS_LABEL: Record<RequirementStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

export const STATUS_COLOR: Record<RequirementStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 border-slate-200',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ON_HOLD: 'bg-orange-50 text-orange-700 border-orange-200',
  CLOSED: 'bg-red-50 text-red-700 border-red-200',
  CANCELLED: 'bg-gray-100 text-gray-500 border-gray-200',
};

export const STATUS_FLOW: Record<RequirementStatus, RequirementStatus[]> = {
  DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['ACTIVE', 'DRAFT', 'CANCELLED'],
  ACTIVE: ['ON_HOLD', 'CLOSED', 'CANCELLED'],
  ON_HOLD: ['ACTIVE', 'CLOSED', 'CANCELLED'],
  CLOSED: [],
  CANCELLED: [],
};

export const PRIORITY_COLOR: Record<string, string> = {
  HIGH: 'bg-red-50 text-red-700 border-red-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  LOW: 'bg-green-50 text-green-700 border-green-200',
};

// ── Pipeline stage — code-based, from DB, not hardcoded enum ─────────────────
export type PipelineStageSnapshot = {
  id: string;
  code: string;
  label: string;
  order: number;
};

// ── Candidate pipeline row (from GET /requirements/:id/candidates) ────────────
export type PipelineRow = {
  id: string;
  recruiterId: string;
  isRejected: boolean;
  isWithdrawn: boolean;
  isOnHold: boolean;
  rejectionReason: string | null;
  withdrawnReason: string | null;
  onHoldReason: string | null;
  submittedAt: string | null;
  offeredCtc: number | null;
  offerStatus: string | null;
  stageUpdatedAt: string;
  createdAt: string;
  currentStage: PipelineStageSnapshot;
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
  };
  recruiter: { id: string; firstName: string; lastName: string };
  assignment: {
    id: string;
    assignedTo: { id: string; firstName: string; lastName: string };
  } | null;
};

// ── Assignment tree node — uses pipelines[], not old candidates[] ─────────────
export type AssignmentNode = {
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
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
    department: { id: string; name: string } | null;
  };
  assignedBy: { id: string; firstName: string; lastName: string };
  assigneeBU: { id: string; name: string } | null;
  // new — pipeline rows for this assignment
  pipelines: PipelineRow[];
  children: AssignmentNode[];
};

export type RequirementTree = {
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
};

// ── Full requirement detail ───────────────────────────────────────────────────
export type RequirementDetail = {
  id: string;
  reqCode: string;
  title: string;
  description: string | null;
  status: RequirementStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  jobType: string;
  remoteType: string;
  location: string | null;
  country: string | null;
  skills: string[];
  experienceMin: number | null;
  experienceMax: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryType: string | null;
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
  client: { id: string; name: string; industry: string | null };
  businessUnit: { id: string; name: string } | null;
  serviceLine: { id: string; name: string } | null;
  clientSpoc: {
    id: string;
    isPrimary: boolean;
    handler: { id: string; firstName: string; lastName: string };
    serviceLine: { id: string; name: string } | null;
  } | null;
  createdBy: { id: string; firstName: string; lastName: string };
  approvedBy: { id: string; firstName: string; lastName: string } | null;
  closedBy: { id: string; firstName: string; lastName: string } | null;
  statusHistory: {
    id: string;
    fromStatus: RequirementStatus;
    toStatus: RequirementStatus;
    reason: string | null;
    changedAt: string;
    changedBy: { id: string; firstName: string; lastName: string };
  }[];
  notes: {
    id: string;
    content: string;
    createdAt: string;
    author: { id: string; firstName: string; lastName: string };
  }[];
};

// ── List item (from GET /requirements) ───────────────────────────────────────
export type RequirementListItem = {
  id: string;
  reqCode: string;
  title: string;
  status: RequirementStatus;
  priority: string;
  jobType: string;
  remoteType: string;
  location: string | null;
  skills: string[];
  totalOpenings: number;
  filledOpenings: number;
  activeApplications: number;
  interviewsScheduled: number;
  offersRolledOut: number;
  respondBy: string | null;
  isRespondByBreached: boolean;
  isTurnaroundBreached: boolean;
  createdAt: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryType?: string | null;
  client: { id: string; name: string };
  businessUnit: { id: string; name: string } | null;
  serviceLine: { id: string; name: string } | null;
  clientSpoc: { handler: { id: string; firstName: string; lastName: string } } | null;
  createdBy: { id: string; firstName: string; lastName: string };
  assignments: {
    id: string;
    depth: number;
    assignedTo: { id: string; firstName: string; lastName: string };
  }[];
  _count: { pipelines: number; assignments: number };
};

export type RequirementListResponse = {
  success: boolean;
  data: RequirementListItem[];
  meta: { total: number; page: number; limit: number; pages: number };
  permissions: { canAdd: boolean; canEdit: boolean; canDelete: boolean };
};

export type RequirementStatsResponse = {
  success: boolean;
  data: {
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    breached: number;
    recentlyCreated: number;
  };
};

// ── Helpers ───────────────────────────────────────────────────────────────────
export function fullName(u: { firstName: string; lastName: string }): string {
  return `${u.firstName} ${u.lastName}`.trim();
}

export function daysRemaining(dateStr: string): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}
