// File: applicant.ts
// Path: src/types/applicant.ts

export interface UserLite {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Applicant {
  id: string;
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
    client: { id: string; name: string } | null;
  };
  pipeline: {
    id: string;
    createdAt: string;
    recruiter: UserLite;
    currentStage: {
      id: string;
      code: string;
      label: string;
      canonicalStage: string | null;
    };
    stageUpdatedBy: UserLite;
    assignedBy: UserLite | null;
    assignedAt: string;
  } | null;
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
}

export interface ApplicantListMeta extends PageMeta {
  counts: Record<string, number>;
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

export interface ApplicantRequirementRow {
  id: string;
  reqCode: string;
  title: string;
  status: string;
  createdAt: string;
  client: { name: string } | null;
  applicantCount: number;
  counts: Record<string, number>; // keys from backend (UNASSIGNED / ASSIGNED)
  createdBy: UserLite | null;
  assignments: {
    id: string;
    depth: number;
    assignedTo: UserLite;
    assignedBy: UserLite;
  }[];
}

export interface ApplicantRequirementFilters {
  search?: string;
  status?: string;
  page: number;
  limit: number;
}

export interface ApplicantRequirementMeta extends PageMeta {
  assignmentStatuses: string[];
  summary: {
    totalApplicants: number;
    counts: Record<string, number>;
    totalRequirements: number;
    requirementsWithApplicants: number;
  };
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
