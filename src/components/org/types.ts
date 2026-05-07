export interface OrgNodeStats {
  activeReqs: number;
  totalSubmissions: number;
  totalInterviews: number;
  totalFilled: number;
  totalAllocated: number;
  requirementsCreated: number;
  clientSpocs: {
    userId: string;
    isPrimary: boolean;
    client: { id: string; name: string };
    serviceLine: { id: string; name: string };
  }[];
}

export interface OrgNode {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string | null;
  reportingToId: string | null;
  teamLeadId: string | null;
  phone: string | null;
  workingLocation: string | null;
  dateOfJoin: string | null;
  isActive: boolean;
  depth: number;
  role: { id: string; name: string };
  department: { id: string; name: string } | null;
  stats: OrgNodeStats;
  children: OrgNode[];
}

export interface UserRef {
  id: string;
  firstName: string;
  lastName: string;
  employeeId?: string | null;
  role?: { id: string; name: string };
}

export interface AssignmentReceived {
  id: string;
  depth: number;
  status: string;
  allocatedOpenings: number | null;
  filledOpenings: number;
  submissionsCount: number;
  interviewsCount: number;
  assignedAt: string;
  removedAt: string | null;
  removedReason: string | null;
  deadline: string | null;
  deadlineMet: boolean | null;
  assignedBy: UserRef;
  parentAssignment: { id: string; depth: number; assignedTo: UserRef } | null;
  childAssignments: {
    id: string;
    depth: number;
    submissionsCount: number;
    interviewsCount: number;
    filledOpenings: number;
    allocatedOpenings: number | null;
    assignedTo: UserRef;
  }[];
  requirement: {
    id: string;
    reqCode: string;
    title: string;
    status: string;
    priority: string;
    totalOpenings: number;
    filledOpenings: number;
    activeApplications: number;
    interviewsScheduled: number;
    offersRolledOut: number;
    location: string | null;
    jobType: string;
    remoteType: string;
    skills: string[];
    respondBy: string | null;
    client: { id: string; name: string; industry: string | null };
    businessUnit: { id: string; name: string } | null;
    serviceLine: { id: string; name: string } | null;
  };
}

export interface AssignmentGiven {
  id: string;
  depth: number;
  submissionsCount: number;
  interviewsCount: number;
  filledOpenings: number;
  allocatedOpenings: number | null;
  assignedAt: string;
  deadline: string | null;
  assignedTo: UserRef;
  requirement: {
    id: string;
    reqCode: string;
    title: string;
    status: string;
    priority: string;
    client: { id: string; name: string };
  };
}

export interface RequirementCreated {
  id: string;
  reqCode: string;
  title: string;
  status: string;
  priority: string;
  totalOpenings: number;
  filledOpenings: number;
  activeApplications: number;
  interviewsScheduled: number;
  createdAt: string;
  client: { id: string; name: string };
  businessUnit: { id: string; name: string } | null;
}

export interface ClientSpocDetail {
  id: string;
  isPrimary: boolean;
  notes: string | null;
  assignedAt: string;
  client: {
    id: string;
    name: string;
    industry: string | null;
    city: string | null;
    country: string | null;
    _count: { requirements: number };
  };
  serviceLine: { id: string; name: string };
  businessUnit: { id: string; name: string };
  assignedBy: UserRef;
}

export interface AggregateStats {
  activeReqs: number;
  totalSubmissions: number;
  totalInterviews: number;
  totalFilled: number;
  totalAllocated: number;
  totalAssignmentsGiven: number;
  requirementsCreated: number;
  clientSpocsCount: number;
  candidatesSourced: number;
  candidatesByStage: Record<string, number>;
}

export interface UserCardData {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  employeeId: string | null;
  email: string;
  phone: string | null;
  workingLocation: string | null;
  timezone: string | null;
  dateOfJoin: string | null;
  dateOfBirth: string | null;
  isActive: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  role: { id: string; name: string };
  department: { id: string; name: string } | null;
  reportingTo: UserRef | null;
  teamLead: UserRef | null;
  subordinates: UserRef[];
  teamMembers: UserRef[];
  assignmentsReceived: AssignmentReceived[];
  assignmentsGiven: AssignmentGiven[];
  requirementsCreated: RequirementCreated[];
  clientSpocs: ClientSpocDetail[];
  aggregateStats: AggregateStats;
  _count: {
    subordinates: number;
    teamMembers: number;
    assignmentsReceived: number;
    assignmentsGiven: number;
    requirementsCreated: number;
    clientSpocs: number;
  };
}
