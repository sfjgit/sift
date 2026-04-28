// ─────────────────────────────────────────────────────────────────────────────
// bu.types.ts  — matches the actual backend controller + Prisma schema exactly
// ─────────────────────────────────────────────────────────────────────────────

// ─── Enums (mirror schema) ───────────────────────────────────────────────────

export type TeamCategory = 'DELIVERY' | 'SALES' | 'SUPPORT' | 'MANAGEMENT';
export type NodeType = 'MANAGEMENT' | 'GROUP' | 'INDIVIDUAL';
export type TeamRole = 'LEAD' | 'CO_LEAD' | 'MEMBER';
export type EdgeType = 'ASSIGNS_TO' | 'REPORTS_TO' | 'VISIBILITY';
export type RequirementStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'CLOSED'
  | 'CANCELLED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type SalaryType = 'MONTHLY' | 'ANNUAL' | 'HOURLY' | 'DAILY';
export type ClientStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE';
export type ClientCategory =
  | 'PRODUCT'
  | 'SERVICE'
  | 'CONSULTING'
  | 'STAFFING'
  | 'GOVERNMENT'
  | 'NGO'
  | 'OTHER';
export type ClientHandlerRole = 'PRIMARY' | 'SECONDARY' | 'BACKUP';
export type ClientContactStatus = 'ACTIVE' | 'INACTIVE' | 'REMOVED';
export type AssignmentType = 'MANAGER' | 'TEAM' | 'INDIVIDUAL';
export type AssignmentStatus = 'ACTIVE' | 'REMOVED' | 'REPLACED';

// ─── Shared primitives ───────────────────────────────────────────────────────

export interface BUBasic {
  id: string;
  name: string;
  isActive: boolean;
}

export interface UserBasic {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId?: string | null;
}

// ─── List endpoint (/business-units) ─────────────────────────────────────────

export interface BUFlatItem {
  id: string;
  name: string;
  isActive: boolean;
  parentBUId: string | null;
  createdAt: string;
  _count: {
    users: number;
    teams: number;
    clients: number;
    requirements: number;
  };
  children?: BUFlatItem[];
}

export interface BUListResponse {
  success: boolean;
  message?: string;
  data: BUFlatItem[];
  flat: BUFlatItem[];
}

// ─── Detail endpoint (/business-units/:id) ───────────────────────────────────

// ── 1. Hierarchy ──────────────────────────────────────────────────────────────

export interface BUParentChain {
  id: string;
  name: string;
  isActive: boolean;
  parentBU?: {
    id: string;
    name: string;
    isActive: boolean;
  } | null;
}

export interface BUChildItem {
  id: string;
  name: string;
  isActive: boolean;
  _count: { users: number; teams: number; clients: number };
  childBUs: {
    id: string;
    name: string;
    isActive: boolean;
    _count: { users: number };
  }[];
}

// ── 2. Teams ──────────────────────────────────────────────────────────────────

export interface TeamMemberDetail {
  id: string;
  teamRole: TeamRole;
  joinedAt: string;
  user: UserBasic;
}

export interface BUTeamDetail {
  id: string;
  name: string;
  category: TeamCategory | null;
  nodeType: NodeType;
  /**
   * Used by the BU detail page to build the recursive team tree.
   * Make sure the API selects this field on each team.
   */
  parentTeamId: string | null;
  _count: {
    members: number; // active members only
  };
  members: TeamMemberDetail[];
}

// ── 3. Users ──────────────────────────────────────────────────────────────────

export interface BUUserDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string | null;
  role: { id: string; name: string };
  teamMemberships: {
    teamRole: TeamRole;
    team: { id: string; name: string; category: TeamCategory | null };
  }[];
}

// ── 4. Clients ────────────────────────────────────────────────────────────────

export interface BUClientDetail {
  id: string;
  name: string;
  category: ClientCategory | null;
  industry: string | null;
  status: ClientStatus;
  handlers: {
    role: ClientHandlerRole;
    user: { id: string; firstName: string; lastName: string };
  }[];
  _count: {
    requirements: number; // active + not-deleted only
  };
}

// ── 5. Requirements ───────────────────────────────────────────────────────────

export interface BURequirementDetail {
  id: string;
  reqCode: string;
  title: string;
  status: RequirementStatus;
  priority: Priority;
  totalOpenings: number;
  filledOpenings: number;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryType: SalaryType | null;
  respondBy: string | null;
  isRespondByBreached: boolean;
  client: { id: string; name: string };
}

// ── 6. Req status breakdown ───────────────────────────────────────────────────

export type ReqBreakdown = Partial<Record<RequirementStatus, number>>;

// ── 7. Full BUDetail ─────────────────────────────────────────────────────────

export interface BUDetail {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;

  parentBU: BUParentChain | null;
  childBUs: BUChildItem[];

  teams: BUTeamDetail[];
  users: BUUserDetail[];
  clients: BUClientDetail[];
  requirements: BURequirementDetail[];

  _count: {
    users: number;
    teams: number;
    clients: number;
    requirements: number;
  };

  reqBreakdown: ReqBreakdown;
}

export interface BUDetailResponse {
  success: boolean;
  data: BUDetail;
}

// ─── Mutation payloads / responses ───────────────────────────────────────────

export interface CreateBUPayload {
  name: string;
  parentBUId?: string | null;
}

export interface UpdateBUPayload {
  name?: string;
  isActive?: boolean;
  parentBUId?: string | null;
}

export interface BUMutationResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    name: string;
    isActive: boolean;
    createdAt: string;
    parentBU: { id: string; name: string } | null;
  };
}
