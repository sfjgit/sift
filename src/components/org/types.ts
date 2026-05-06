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
  children: OrgNode[];
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
  isActive: boolean;
  role: { id: string; name: string };
  department: { id: string; name: string } | null;
  reportingTo: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string | null;
  } | null;
  teamLead: { id: string; firstName: string; lastName: string; employeeId: string | null } | null;
  assignmentsReceived: {
    id: string;
    depth: number;
    allocatedOpenings: number | null;
    filledOpenings: number;
    submissionsCount: number;
    interviewsCount: number;
    assignedAt: string;
    deadline: string | null;
    requirement: {
      id: string;
      reqCode: string;
      title: string;
      status: string;
      priority: string;
      totalOpenings: number;
      client: { id: string; name: string };
    };
  }[];
  clientSpocs: {
    id: string;
    isPrimary: boolean;
    client: { id: string; name: string };
    serviceLine: { id: string; name: string };
  }[];
  _count: {
    subordinates: number;
    teamMembers: number;
    assignmentsReceived: number;
  };
}
