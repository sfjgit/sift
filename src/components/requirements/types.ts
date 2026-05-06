// components/requirements/types.ts

export type RequirementStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'CLOSED'
  | 'CANCELLED';

export type RequirementPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type RequirementJobType = 'CONTRACT' | 'PERMANENT' | 'CONTRACT_TO_HIRE' | 'FREELANCE';
export type RequirementRemoteType = 'ONSITE' | 'REMOTE' | 'HYBRID';

export interface RequirementListItem {
  id: string;
  reqCode: string;
  title: string;
  status: RequirementStatus;
  priority: RequirementPriority;
  jobType: RequirementJobType;
  remoteType: RequirementRemoteType;
  location?: string;
  skills: string[];
  totalOpenings: number;
  filledOpenings: number;
  activeApplications: number;
  interviewsScheduled: number;
  offersRolledOut: number;
  respondBy?: string;
  isRespondByBreached: boolean;
  isTurnaroundBreached: boolean;
  createdAt: string;
  client: { id: string; name: string };
  businessUnit?: { id: string; name: string };
  serviceLine?: { id: string; name: string };
  clientSpoc?: { user: { id: string; firstName: string; lastName: string } };
  createdBy: { id: string; firstName: string; lastName: string };
  assignments: {
    id: string;
    depth: number;
    assignedTo: { id: string; firstName: string; lastName: string };
  }[];
  _count: { candidates: number; assignments: number };
}

export interface RequirementFilters {
  search: string;
  status: RequirementStatus | '';
  priority: RequirementPriority | '';
  jobType: RequirementJobType | '';
  remoteType: RequirementRemoteType | '';
  clientId: string;
  buId: string;
  createdById: string;
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

export interface RequirementMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface RequirementPermissions {
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface RequirementListResponse {
  success: boolean;
  data: RequirementListItem[];
  meta: RequirementMeta;
  permissions: RequirementPermissions;
}

export interface RequirementStats {
  byStatus: Partial<Record<RequirementStatus, number>>;
  byPriority: Partial<Record<RequirementPriority, number>>;
  breached: number;
  recentlyCreated: number;
}

export interface RequirementStatsResponse {
  success: boolean;
  data: RequirementStats;
}
