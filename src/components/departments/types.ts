// components/departments/types.ts

export interface Department {
  id: string;
  name: string;
  code?: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { users: number };
}

export interface DepartmentUser {
  id: string;
  firstName: string;
  lastName: string;
  employeeId?: string | null;
  email: string;
  phone?: string | null;
  workingLocation?: string | null;
  role: { id: string; name: string };
  reportingTo?: { id: string; firstName: string; lastName: string } | null;
  _count: {
    assignmentsReceived: number;
    assignmentsGiven: number;
    subordinates: number;
  };
}

export interface DepartmentAssignment {
  id: string;
  submissionsCount: number;
  interviewsCount: number;
  filledOpenings: number;
  allocatedOpenings?: number | null;
  assignedAt: string;
  deadline?: string | null;
  assignedToId: string;
  assignedById: string;
  assignedBy: { id: string; firstName: string; lastName: string };
  assignedTo: { id: string; firstName: string; lastName: string };
  requirement: {
    id: string;
    reqCode: string;
    title: string;
    status: string;
    priority: string;
    totalOpenings: number;
    filledOpenings: number;
    activeApplications: number;
    client: { id: string; name: string };
    businessUnit?: { id: string; name: string } | null;
  };
}

export interface DepartmentStats {
  totalUsers: number;
  activeAssignments: number;
  totalSubmissions: number;
  totalInterviews: number;
  totalFilled: number;
  requirementsCreated: number;
  requirementsActive: number;
  candidatesSourced: number;
  candidatesByStage: Record<string, number>;
}

export interface DepartmentDetail extends Department {
  users: DepartmentUser[];
  activeAssignments: DepartmentAssignment[];
  stats: DepartmentStats;
}
