export type ReqStatus =
  | 'ACTIVE'
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'ON_HOLD'
  | 'CLOSED'
  | 'CANCELLED';
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
export type CandidateStage =
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

export interface BU {
  id: string;
  name: string;
  code?: string | null;
  parentBUId?: string | null;
  children?: BU[];
}

export interface Department {
  id: string;
  name: string;
  code?: string | null;
}

export interface ServiceLine {
  id: string;
  name: string;
  code?: string | null;
}

export interface ClientOption {
  id: string;
  name: string;
  industry?: string | null;
}

export interface RequirementSummary {
  id: string;
  reqCode: string;
  title: string;
  status: ReqStatus;
  priority: Priority;
  totalOpenings: number;
  filledOpenings: number;
  activeApplications: number;
  interviewsScheduled: number;
  offersRolledOut: number;
  respondBy?: string | null;
  isRespondByBreached: boolean;
  isTurnaroundBreached: boolean;
  createdAt: string;
  client: { id: string; name: string };
  businessUnit?: { id: string; name: string } | null;
  serviceLine?: { id: string; name: string } | null;
  createdBy: { id: string; firstName: string; lastName: string };
  assignments?: AssignmentSummary[];
}

export interface AssignmentSummary {
  id: string;
  depth: number;
  status: string;
  requirementId: string;
  requirement?: {
    id: string;
    reqCode: string;
    title: string;
    status: ReqStatus;
    priority: Priority;
    client: { id: string; name: string };
  };
  allocatedOpenings?: number | null;
  filledOpenings: number;
  submissionsCount: number;
  interviewsCount: number;
  deadline?: string | null;
  breachedAt?: string | null;
  assignedTo: { id: string; firstName: string; lastName: string };
  assignedBy: { id: string; firstName: string; lastName: string };
  candidates?: CandidateSnapshot[];
  children?: AssignmentSummary[];
}

export interface CandidateSnapshot {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail?: string | null;
  currentStage: CandidateStage;
  stageUpdatedAt: string;
}

export interface ClientSummary {
  id: string;
  name: string;
  industry?: string | null;
  status: string;
  businessUnit?: { id: string; name: string } | null;
  spocs?: {
    user: { id: string; firstName: string; lastName: string };
    serviceLine: { id: string; name: string };
  }[];
  _count: { requirements: number };
}

export interface DashboardStats {
  totalRequirements: number;
  active: number;
  pendingApproval: number;
  draft: number;
  onHold: number;
  closed: number;
  breached: number;
  thisWeek: number;
  highPriority: number;
  totalClients: number;
  totalCandidates: number;
  // pipeline funnel
  pipeline: {
    sourced: number;
    screening: number;
    submitted: number;
    interviewScheduled: number;
    interviewDone: number;
    offerRolled: number;
    offerAccepted: number;
    joined: number;
  };
  // BU breakdown
  buBreakdown: { id: string; name: string; count: number }[];
  // service line breakdown
  slBreakdown: { id: string; name: string; count: number }[];
}

export interface OrgNode {
  id: string;
  firstName: string;
  lastName: string;
  employeeId?: string | null;
  reportingToId?: string | null;
  teamLeadId?: string | null;
  depth: number;
  role?: { name: string };
  department?: { name: string } | null;
  children?: OrgNode[];
}

export interface ActivityItem {
  id: string;
  type: string;
  summary: string;
  createdAt: string;
  actor: { id: string; firstName: string; lastName: string };
  requirement: { id: string; reqCode: string; title: string };
}

export interface BreachAlert {
  id: string;
  reqCode: string;
  title: string;
  priority: Priority;
  respondBy?: string | null;
  isRespondByBreached: boolean;
  isTurnaroundBreached: boolean;
  client: { id: string; name: string };
}
