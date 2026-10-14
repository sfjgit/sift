// File: applicant.ts
// Path: src/types/applicant.ts

export interface UserLite {
  id: string;
  firstName: string;
  lastName: string;
}
export interface RequirementAssignmentLite {
  id: string;
  depth: number;
  assignedAt: string;
  assignedTo: UserLite;
  assignedBy: UserLite;
}

/** One row per application — same person applying to 2 requirements = 2 rows */
export interface Applicant {
  id: string;
  candidateServiceId: string;
  candidateCode: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  currentTitle: string | null;
  currentCompany: string | null;
  totalExpYears: number | null;
  topSkills: string[];
  resumeUrl: string | null;
  sourced: string | null;
  snapshotAt: string;
  requirement: {
    id: string;
    reqCode: string;
    title: string;
    status: string;
    client: { name: string } | null;
    createdBy: UserLite | null;
    assignments: RequirementAssignmentLite[];
  };
  pipeline: {
    id: string;
    createdAt: string;
    recruiter: UserLite;
    currentStage: { id: string; label: string; canonicalStage: string | null };
  } | null;
}

export interface ApplicantFilters {
  requirementId?: string;
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}

export interface ApplicantRequirementOption {
  id: string;
  reqCode: string;
  title: string;
  status: string;
  createdAt: string;
  client: { name: string } | null;
  createdBy: UserLite | null;
  assignments: RequirementAssignmentLite[];

  counts: Record<string, number>; // per bucket (UNASSIGNED / ASSIGNED)
  count: number; // total applicants, 0 when none
}

export interface ApplicantSummary {
  totalApplicants: number;
  counts: Record<string, number>;
  totalRequirements: number;
  requirementsWithApplicants: number;
  trend: { date: string; count: number }[];
  topRequirements: ApplicantRequirementOption[];
}

export interface ApplicantListMeta {
  total: number;
  page: number;
  limit: number;
  assignmentStatuses: string[]; // tab keys from backend
  counts: Record<string, number>; // per tab, current filters
  requirementOptions: ApplicantRequirementOption[];
  summary: ApplicantSummary;
}

export interface AssignableUser extends UserLite {
  email: string;
  employeeId: string | null;
  role: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  _source: 'self' | 'chain' | 'extra';
}

export type AssignResultItem =
  | { snapshotId: string; status: 'assigned'; pipelineId: string }
  | { snapshotId: string; status: 'skipped'; reason: string };
