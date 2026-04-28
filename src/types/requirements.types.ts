// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export type RequirementStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'CLOSED'
  | 'CANCELLED';

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

export interface RequirementListItem {
  id: string;
  reqCode: string;
  title: string;
  status: RequirementStatus;
  priority: Priority;
  jobType: RequirementType;
  remoteType: RemoteType;
  totalOpenings: number;
  filledOpenings: number;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryType?: SalaryType | null;
  respondBy?: string | null;
  turnaroundDays?: number | null;
  isRespondByBreached: boolean;
  isTurnaroundBreached: boolean;
  createdAt: string;
  updatedAt: string;
  businessUnit?: BusinessUnitRef | null;
  client: ClientRef;
  createdBy: UserRef;
  skills: { skill: { canonicalName: string } }[];
  assignments: Assignment[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Requirement — full detail
// ─────────────────────────────────────────────────────────────────────────────

export interface RequirementDetail extends RequirementListItem {
  description?: string | null;
  clientContactId?: string | null;
  clientContact?: {
    id: string;
    firstName: string;
    lastName: string;
    designation?: string | null;
    email: string;
  } | null;
  location?: string | null;
  country?: string | null;
  experienceMin?: number | null;
  experienceMax?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  closedAt?: string | null;
  approvedBy?: UserRef | null;
  approvedAt?: string | null;
  closedBy?: UserRef | null;
  jd: {
    id: string;
    fileName: string;
    fileKey: string;
    fileType: string;
    fileSizeBytes?: number | null;
    version: number;
    uploadedAt: string;
    uploadedBy: UserRef;
  }[];
  notes: {
    id: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    author: UserRef;
  }[];
  statusHistory: {
    id: string;
    fromStatus: RequirementStatus;
    toStatus: RequirementStatus;
    reason?: string | null;
    changedAt: string;
    changedBy: UserRef;
  }[];
  activities: {
    id: string;
    type: string;
    summary: string;
    meta?: unknown;
    createdAt: string;
    actor: UserRef;
  }[];
  documents: {
    id: string;
    type: string;
    fileName?: string | null;
    fileKey?: string | null;
    content?: string | null;
    isIssue: boolean;
    issueResolved: boolean;
    createdAt: string;
    raisedBy: UserRef;
  }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// API shapes
// ─────────────────────────────────────────────────────────────────────────────

export interface RequirementListResponse {
  success: boolean;
  data: RequirementListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  permissions: {
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
}

export interface RequirementDetailResponse {
  success: boolean;
  data: RequirementDetail;
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
  };
}

export interface RequirementStatsResponse {
  success: boolean;
  data: {
    byStatus: Partial<Record<RequirementStatus, number>>;
    byPriority: Partial<Record<Priority, number>>;
    breached: number;
    recentlyCreated: number;
  };
}

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
  assignedToMe: boolean;
  breached: boolean;
  page: number;
  limit: number;
  sortBy: 'createdAt' | 'updatedAt' | 'respondBy' | 'priority' | 'status';
  sortDir: 'asc' | 'desc';
}
