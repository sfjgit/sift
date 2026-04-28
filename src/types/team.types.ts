// team.types.ts — mirrors team.controller.ts + arc.controller responses exactly
// Updated: parentTeamId removed, TeamArc + BusinessUnit added, tree from edges

// ─── Enums ────────────────────────────────────────────────────────────────────

export type TeamRole = 'LEAD' | 'CO_LEAD' | 'MEMBER';
export type NodeType = 'MANAGEMENT' | 'GROUP' | 'INDIVIDUAL';
export type TeamCategory = 'DELIVERY' | 'SALES' | 'SUPPORT' | 'MANAGEMENT';
export type EdgeType = 'ASSIGNS_TO' | 'REPORTS_TO' | 'VISIBILITY';
export type TeamMemberEvent = 'JOINED' | 'LEFT' | 'REPLACED' | 'DEACTIVATED';
export type RequirementStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'CLOSED'
  | 'CANCELLED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type SalaryType = 'MONTHLY' | 'ANNUAL' | 'HOURLY' | 'DAILY';
export type AssignmentType = 'MANAGER' | 'TEAM' | 'INDIVIDUAL';
export type AssignmentStatus = 'ACTIVE' | 'REMOVED' | 'REPLACED';
export type ClientStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE';
export type ClientCategory =
  | 'PRODUCT'
  | 'SERVICE'
  | 'CONSULTING'
  | 'STAFFING'
  | 'GOVERNMENT'
  | 'NGO'
  | 'OTHER';

// ─── Shared primitives ────────────────────────────────────────────────────────

export interface UserMinimal {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  employeeId?: string | null;
}

export interface BusinessUnit {
  id: string;
  name: string;
  isActive: boolean;
}

// ─── Team Arc ─────────────────────────────────────────────────────────────────
// Returned by GET /arcs and GET /arcs/:id

export interface TeamArc {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  businessUnit: { id: string; name: string; isActive?: boolean } | null;
  _count: { teams: number };
  // only in GET /arcs list — root teams for sidebar preview
  rootTeams?: ArcTeamPreview[];
  // only in GET /arcs list — all teams (with parentEdges for root detection)
  teams?: ArcTeamPreview[];
}

export interface ArcTeamPreview {
  id: string;
  name: string;
  nodeType: NodeType;
  category: TeamCategory | null;
  _count: { members: number };
  // parentEdges used server-side to detect root teams
  parentEdges?: { parentId: string }[];
}

export interface ArcsResponse {
  success: boolean;
  data: TeamArc[];
}

// ─── Arc Detail — GET /arcs/:id ───────────────────────────────────────────────
// Full arc with all teams + edges, tree built from ASSIGNS_TO

export interface TeamArcDetail extends TeamArc {
  tree: TeamListItem[]; // top-down hierarchy from ASSIGNS_TO edges (with .children)
  flat: TeamListItem[]; // every team flat — for canvas, dropdowns
}

export interface TeamArcDetailResponse {
  success: boolean;
  data: TeamArcDetail;
}

// ─── GET /teams — list ────────────────────────────────────────────────────────

export interface TeamEdgeMinimal {
  id: string;
  edgeType: EdgeType;
  isActive: boolean;
  // outgoing edges (childEdges)
  childId?: string;
  child?: { id: string; name: string; nodeType: NodeType };
  // incoming edges (parentEdges)
  parentId?: string;
  parent?: { id: string; name: string; nodeType: NodeType };
}

export interface TeamListItem {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  nodeType: NodeType;
  category: TeamCategory | null;
  businessUnitId: string | null;
  teamArcId: string;
  createdAt: string;
  businessUnit: { id: string; name: string } | null;
  teamArc: { id: string; name: string } | null;
  _count: { members: number };
  members: {
    id: string;
    teamRole: TeamRole;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      employeeId: string | null;
    };
  }[];
  // edges included in arc detail + getTeams responses
  childEdges?: TeamEdgeMinimal[];
  parentEdges?: TeamEdgeMinimal[];
  // client-side only — populated by layoutTree / buildTreeFromEdges
  children?: TeamListItem[];
}

export interface TeamListResponse {
  success: boolean;
  data: TeamListItem[]; // tree (roots with nested children)
  flat: TeamListItem[]; // all teams flat
}

// ─── GET /teams/:id — detail ──────────────────────────────────────────────────

export interface TeamEdge {
  id: string;
  edgeType: EdgeType;
  isActive: boolean;
  parentId: string;
  parent?: { id: string; name: string; nodeType: NodeType };
  childId: string;
  child?: { id: string; name: string; nodeType: NodeType };
}

export interface TeamMemberFull {
  id: string;
  teamRole: TeamRole;
  joinedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeId: string | null;
    phone: string | null;
    role: { id: string; name: string };
  };
}

export interface TeamChildItem {
  id: string;
  name: string;
  nodeType: NodeType;
  category: TeamCategory | null;
  _count: { members: number };
  members: {
    teamRole: TeamRole;
    user: { id: string; firstName: string; lastName: string };
  }[];
}

export interface TeamClientAssignment {
  assignedAt: string;
  client: {
    id: string;
    name: string;
    category: ClientCategory | null;
    industry: string | null;
    status: ClientStatus;
    _count: { requirements: number };
  };
}

export interface TeamRequirementAssignment {
  id: string;
  assignmentType: AssignmentType;
  allocatedOpenings: number | null;
  filledOpenings: number;
  submissionsCount: number;
  interviewsCount: number;
  assignedAt: string;
  deadline: string | null;
  breachedAt: string | null;
  requirement: {
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
  };
}

export interface TeamMemberHistoryEntry {
  id: string;
  event: TeamMemberEvent;
  eventAt: string;
  reason: string | null;
  userId: string;
  user: { id: string; firstName: string; lastName: string };
  performedById: string | null;
  performedBy: { id: string; firstName: string; lastName: string } | null;
}

export interface TeamVisibilityConfig {
  id: string;
  teamId: string;
  membersCanSeePeerReqs: boolean;
  leadCanSeeChildReqs: boolean;
  canSeeInboundReqs: boolean;
  canSeeOutboundReqs: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamDetail {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  nodeType: NodeType;
  category: TeamCategory | null;
  teamArcId: string;
  createdAt: string;
  updatedAt: string;

  businessUnit: { id: string; name: string; isActive: boolean } | null;
  teamArc: { id: string; name: string; isActive: boolean } | null;

  // Derived from ASSIGNS_TO parentEdges (array — a team can have multiple parents)
  parentTeams: { id: string; name: string; nodeType: NodeType }[];
  // Derived from ASSIGNS_TO childEdges (fetched separately in controller)
  childTeams: TeamChildItem[];

  members: TeamMemberFull[];

  // All incoming edges (this team is the child)
  parentEdges: TeamEdge[];
  // All outgoing edges (this team is the parent)
  childEdges: TeamEdge[];

  visibilityConfig: TeamVisibilityConfig | null;
  clientAssignments: TeamClientAssignment[];
  requirementAssignments: TeamRequirementAssignment[];
  memberHistories: TeamMemberHistoryEntry[];

  _count: {
    members: number;
    // childEdges where edgeType=ASSIGNS_TO and isActive=true
    childEdges: number;
    clientAssignments: number;
    requirementAssignments: number;
  };
}

export interface TeamDetailResponse {
  success: boolean;
  data: TeamDetail;
}

// ─── GET /teams/:id/members ───────────────────────────────────────────────────

export interface TeamMembersResponse {
  success: boolean;
  data: TeamMemberFull[];
}

// ─── GET /teams/:id/available-users ──────────────────────────────────────────

export interface AvailableUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string | null;
  role: { id: string; name: string };
}

export interface AvailableUsersResponse {
  success: boolean;
  data: AvailableUser[];
}

// ─── Mutation payloads ────────────────────────────────────────────────────────

export interface CreateTeamPayload {
  name: string;
  description?: string | null;
  nodeType?: NodeType;
  category?: TeamCategory | null;
  teamArcId: string; // required — no arc = no team
  businessUnitId?: string | null;
}

export interface UpdateTeamPayload {
  name?: string;
  description?: string | null;
  nodeType?: NodeType;
  category?: TeamCategory | null;
  isActive?: boolean;
  teamArcId?: string; // allowed — move team to different arc
  // no parentTeamId — linking is done via edges
}

export interface CreateEdgePayload {
  targetTeamId: string;
  edgeType: EdgeType;
  direction: 'outgoing' | 'incoming';
}

export interface UpdateEdgePayload {
  isActive: boolean;
}

export interface AddTeamMembersPayload {
  members: Array<{ userId: string; teamRole?: TeamRole }>;
}

export interface UpdateMemberRolePayload {
  teamRole: TeamRole;
}

export interface RemoveMemberPayload {
  reason?: string;
}

// ─── Arc mutation payloads ────────────────────────────────────────────────────

export interface CreateArcPayload {
  name: string;
  description?: string | null;
  businessUnitId: string;
}

export interface UpdateArcPayload {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

// ─── Mutation responses ───────────────────────────────────────────────────────

export interface MutationResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
  warning?: string; // returned by deleteEdge when assignments are affected
}

// convenience aliases
export type TeamMutationResponse = MutationResponse<Partial<TeamDetail>>;
export type EdgeMutationResponse = MutationResponse<{
  id: string;
  edgeType: EdgeType;
  isActive: boolean;
  parentId: string;
  childId: string;
}>;
export type ArcMutationResponse = MutationResponse<TeamArc>;
