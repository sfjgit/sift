import type {
  ClientStatus,
  ClientHandlerRole,
  RequirementStatus,
  JobType,
  RemoteType,
  Priority,
  AssignmentType,
  AssignmentStatus,
  DocumentEventType,
  TeamRole,
  PermissionScope,
} from '@/constants/modules';

// ─────────────────────────────────────────
// AUTH / USER TYPES
// ─────────────────────────────────────────

export interface RolePermission {
  id: string;
  roleId: string;
  module: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  scope: PermissionScope;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  permissions: RolePermission[];
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  nickName: string | null;
  displayName: string | null;
  employeeId: string | null;
  phone: string | null;
  workingLocation: string | null;
  timezone: string | null;
  dateOfBirth: string | null;
  dateOfJoin: string | null;
  isSuperAdmin: boolean;
  isActive: boolean;
  roleId: string;
  role: Role;
  reportingToId: string | null;
  businessUnitId: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

// Lightweight user ref — used in dropdowns, assignment lists etc.
export interface UserRef {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string | null;
  isActive: boolean;
  role: Pick<Role, 'id' | 'name'>;
}

// ─────────────────────────────────────────
// BUSINESS UNIT
// ─────────────────────────────────────────

export interface BusinessUnit {
  id: string;
  name: string;
  isActive: boolean;
  parentBUId: string | null;
  parentBU: Pick<BusinessUnit, 'id' | 'name'> | null;
  childBUs: Pick<BusinessUnit, 'id' | 'name'>[];
  createdAt: string;
}

// ─────────────────────────────────────────
// TEAM
// ─────────────────────────────────────────

export interface TeamRef {
  id: string;
  name: string;
  isActive: boolean;
  businessUnitId: string | null;
}

export interface TeamMember {
  id: string;
  userId: string;
  user: UserRef;
  teamId: string;
  teamRole: TeamRole;
  isActive: boolean;
  joinedAt: string;
}

// ─────────────────────────────────────────
// CLIENT TYPES
// ─────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
  vmsName: string | null;
  category: string | null;
  industry: string | null;
  website: string | null;
  country: string;
  state: string | null;
  city: string | null;
  address: string | null;
  status: ClientStatus;
  businessUnitId: string | null;
  businessUnit: Pick<BusinessUnit, 'id' | 'name'> | null;
  parentClientId: string | null;
  parentClient: Pick<Client, 'id' | 'name'> | null;
  childClients: Pick<Client, 'id' | 'name'>[];
  createdById: string;
  createdBy: UserRef;
  approvedById: string | null;
  approvedBy: UserRef | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// List item — lighter, no deep relations
export interface ClientListItem {
  id: string;
  name: string;
  vmsName: string | null;
  category: string | null;
  industry: string | null;
  status: ClientStatus;
  businessUnit: Pick<BusinessUnit, 'id' | 'name'> | null;
  country: string;
  city: string | null;
  createdAt: string;
  _count?: { requirements: number };
}

export interface ClientContact {
  id: string;
  clientId: string;
  firstName: string;
  lastName: string | null;
  designation: string | null;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface ClientHandler {
  id: string;
  clientId: string;
  userId: string;
  user: UserRef;
  role: ClientHandlerRole;
  assignedById: string;
  assignedBy: UserRef;
  assignedAt: string;
}

export interface ClientTeamAssignment {
  id: string;
  clientId: string;
  teamId: string;
  team: TeamRef;
  assignedById: string;
  assignedBy: UserRef;
  assignedAt: string;
}

export interface ClientNote {
  id: string;
  clientId: string;
  authorId: string;
  author: UserRef;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────
// CLIENT FORM PAYLOADS
// ─────────────────────────────────────────

export interface CreateClientPayload {
  name: string;
  vmsName?: string;
  category?: string;
  industry?: string;
  website?: string;
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  businessUnitId?: string;
  parentClientId?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UpdateClientPayload extends Partial<CreateClientPayload> {}

export interface UpdateClientStatusPayload {
  status: ClientStatus;
}

export interface AssignClientHandlerPayload {
  userId: string;
  role: ClientHandlerRole;
}

export interface AssignClientTeamPayload {
  teamId: string;
}

export interface CreateClientContactPayload {
  firstName: string;
  lastName?: string;
  designation?: string;
  email: string;
  phone?: string;
  linkedinUrl?: string;
  isPrimary?: boolean;
}

export interface CreateClientNotePayload {
  content: string;
}

// ─────────────────────────────────────────
// REQUIREMENT TYPES
// ─────────────────────────────────────────

export interface Requirement {
  id: string;
  reqCode: string;
  title: string;
  description: string | null;
  clientId: string;
  client: Pick<Client, 'id' | 'name'>;
  clientContactId: string | null;
  clientContact: Pick<ClientContact, 'id' | 'firstName' | 'lastName' | 'email'> | null;
  businessUnitId: string | null;
  businessUnit: Pick<BusinessUnit, 'id' | 'name'> | null;
  jobType: JobType;
  remoteType: RemoteType;
  priority: Priority;
  totalOpenings: number;
  filledOpenings: number;
  location: string | null;
  country: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryType: string | null;
  startDate: string | null;
  endDate: string | null;
  respondBy: string | null;
  turnaroundDays: number | null;
  closedAt: string | null;
  status: RequirementStatus;
  createdById: string;
  createdBy: UserRef;
  approvedById: string | null;
  approvedBy: UserRef | null;
  approvedAt: string | null;
  deliveryLeadId: string | null;
  deliveryLead: UserRef | null;
  teamLeadId: string | null;
  teamLead: UserRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface RequirementListItem {
  id: string;
  reqCode: string;
  title: string;
  status: RequirementStatus;
  priority: Priority;
  jobType: JobType;
  remoteType: RemoteType;
  totalOpenings: number;
  filledOpenings: number;
  client: Pick<Client, 'id' | 'name'>;
  businessUnit: Pick<BusinessUnit, 'id' | 'name'> | null;
  respondBy: string | null;
  createdAt: string;
  _count?: { applicationCount: number };
}

export interface RequirementAssignment {
  id: string;
  requirementId: string;
  assignmentType: AssignmentType;
  status: AssignmentStatus;
  recruiterId: string | null;
  recruiter: UserRef | null;
  teamId: string | null;
  team: TeamRef | null;
  allocatedOpenings: number | null;
  filledOpenings: number;
  isAutoRouted: boolean;
  isSystemAssigned: boolean;
  assignedById: string | null;
  assignedBy: UserRef | null;
  assignedAt: string;
  removedAt: string | null;
  removedReason: string | null;
}

export interface RequirementDocument {
  id: string;
  requirementId: string;
  type: DocumentEventType;
  fileName: string | null;
  fileUrl: string | null;
  fileType: string | null;
  content: string | null;
  isIssue: boolean;
  issueResolved: boolean;
  resolvedById: string | null;
  resolvedBy: UserRef | null;
  resolvedAt: string | null;
  raisedById: string;
  raisedBy: UserRef;
  createdAt: string;
}

export interface RequirementNote {
  id: string;
  requirementId: string;
  authorId: string;
  author: UserRef;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface RequirementStatusHistory {
  id: string;
  requirementId: string;
  fromStatus: RequirementStatus;
  toStatus: RequirementStatus;
  changedById: string;
  changedBy: UserRef;
  reason: string | null;
  changedAt: string;
}

// ─────────────────────────────────────────
// REQUIREMENT FORM PAYLOADS
// ─────────────────────────────────────────

export interface CreateRequirementPayload {
  title: string;
  description?: string;
  clientId: string;
  clientContactId?: string;
  businessUnitId?: string;
  jobType: JobType;
  remoteType: RemoteType;
  priority?: Priority;
  totalOpenings?: number;
  location?: string;
  country?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryType?: string;
  startDate?: string;
  endDate?: string;
  respondBy?: string;
  turnaroundDays?: number;
  deliveryLeadId?: string;
  teamLeadId?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UpdateRequirementPayload extends Partial<CreateRequirementPayload> {}

export interface UpdateRequirementStatusPayload {
  status: RequirementStatus;
  reason?: string;
}

export interface AssignRequirementPayload {
  assignmentType: AssignmentType;
  recruiterId?: string;
  teamId?: string;
  allocatedOpenings?: number;
}

export interface CreateRequirementNotePayload {
  content: string;
}

// ─────────────────────────────────────────
// API RESPONSE WRAPPERS
// ─────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─────────────────────────────────────────
// FILTER TYPES
// ─────────────────────────────────────────

export interface ClientFilters {
  search?: string;
  status?: ClientStatus;
  businessUnitId?: string;
  industry?: string;
  page?: number;
  limit?: number;
}

export interface RequirementFilters {
  search?: string;
  status?: RequirementStatus;
  clientId?: string;
  businessUnitId?: string;
  priority?: Priority;
  jobType?: JobType;
  page?: number;
  limit?: number;
}
