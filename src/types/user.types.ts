// ─────────────────────────────────────────
// types/user.types.ts
// All types derived from the final schema.
// Used across /users list, detail, create, edit pages.
// ─────────────────────────────────────────

// ── Enums — mirrors schema exactly ───────────────────────────────────────────

export type PermissionScope = 'OWN' | 'TEAM' | 'MANAGER' | 'BU' | 'ALL';
export type TeamRole = 'LEAD' | 'CO_LEAD' | 'MEMBER';
export type TeamCategory = 'DELIVERY' | 'SALES' | 'SUPPORT' | 'MANAGEMENT';
export type NodeType = 'MANAGEMENT' | 'GROUP' | 'INDIVIDUAL';
export type ClientHandlerRole = 'PRIMARY' | 'SECONDARY' | 'BACKUP';
export type ClientHandlerStatus = 'ACTIVE' | 'REMOVED' | 'REPLACED';
export type ClientContactStatus = 'ACTIVE' | 'INACTIVE' | 'REMOVED';
export type ClientStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE';

// ── Permission ────────────────────────────────────────────────────────────────

export interface RolePermission {
  module: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  scope: PermissionScope;
}

// ── Role ──────────────────────────────────────────────────────────────────────

export interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: RolePermission[];
}

// Role without permissions — used in list views where we just show the name
export interface RoleBasic {
  id: string;
  name: string;
  description?: string | null;
}

// ── Business Unit ─────────────────────────────────────────────────────────────

export interface BusinessUnitBasic {
  id: string;
  name: string;
}

// ── Team (nested inside user) ─────────────────────────────────────────────────

export interface TeamBasic {
  id: string;
  name: string;
  category: TeamCategory | null;
}

export interface TeamInMembership {
  id: string;
  name: string;
  category: TeamCategory | null;
  nodeType: NodeType;
  businessUnit: BusinessUnitBasic | null;
  parentTeam: { id: string; name: string } | null;
}

// ── Team Membership ───────────────────────────────────────────────────────────

// Used in list table — compact
export interface TeamMembershipCompact {
  teamRole: TeamRole;
  joinedAt: string;
  team: TeamBasic;
}

// Used in detail page — full
export interface TeamMembershipDetail {
  id: string;
  teamRole: TeamRole;
  isActive: boolean;
  joinedAt: string;
  deactivatedAt: string | null;
  team: TeamInMembership;
}

// ── Client Handler Entry (on user) ────────────────────────────────────────────

export interface ClientHandlerEntry {
  id: string;
  role: ClientHandlerRole;
  client: {
    id: string;
    name: string;
    status: ClientStatus;
  };
}

// ── Client Contact Owned (on user) ────────────────────────────────────────────

export interface ClientContactOwned {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  designation: string | null;
  client: {
    id: string;
    name: string;
  };
}

// ── Reporting chain ───────────────────────────────────────────────────────────

export interface ReportingToUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string | null;
  role: RoleBasic;
  businessUnit: BusinessUnitBasic | null;
}

export interface SubordinateUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string | null;
  role: RoleBasic;
}

// ── User — List row ───────────────────────────────────────────────────────────
// Returned by GET /api/users (list)

export interface UserListItem {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  email: string;
  employeeId: string | null;
  phone: string | null;
  workingLocation: string | null;
  isActive: boolean;
  isSuperAdmin: boolean;
  dateOfJoin: string | null;
  createdAt: string;
  role: RoleBasic;
  businessUnit: BusinessUnitBasic | null;
  reportingTo: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  teamMemberships: TeamMembershipCompact[];
  clientHandlerEntries: ClientHandlerEntry[];
  _count: {
    clientContactsOwned: number;
  };
}

// ── User — Full detail ────────────────────────────────────────────────────────
// Returned by GET /api/users/:id

export interface UserDetail {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  nickName: string | null;
  displayName: string | null;
  email: string;
  employeeId: string | null;
  phone: string | null;
  workingLocation: string | null;
  timezone: string | null;
  dateOfBirth: string | null;
  dateOfJoin: string | null;
  isActive: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  role: Role; // full with permissions
  businessUnit: BusinessUnitBasic | null;
  reportingTo: ReportingToUser | null;
  subordinates: SubordinateUser[];
  teamMemberships: TeamMembershipDetail[];
  clientHandlerEntries: ClientHandlerEntry[];
  clientContactsOwned: ClientContactOwned[];
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

// ── API Response wrappers ─────────────────────────────────────────────────────

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// What the API returns for canAdd/canEdit/canDelete
// Frontend uses this to show/hide buttons — not role name
export interface ModulePermissions {
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  scope: PermissionScope;
}

export interface UsersListResponse {
  success: boolean;
  data: UserListItem[];
  pagination: Pagination;
  permissions: ModulePermissions;
}

export interface UserDetailResponse {
  success: boolean;
  data: UserDetail;
  permissions: ModulePermissions;
}

export interface UserMutationResponse {
  success: boolean;
  data?: Partial<UserListItem>;
  message: string;
}

// ── Form data (dropdowns) ─────────────────────────────────────────────────────

export interface UserFormData {
  roles: RoleBasic[];
  businessUnits: BusinessUnitBasic[];
}

export interface UserFormDataResponse {
  success: boolean;
  data: UserFormData;
}

// ── Search (reportingTo lazy search) ─────────────────────────────────────────

export interface UserSearchItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string | null;
  role: RoleBasic;
}

export interface UserSearchResponse {
  success: boolean;
  data: UserSearchItem[];
}

// ── Create / Update payloads ──────────────────────────────────────────────────

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roleId: string;
  businessUnitId: string | null;
  employeeId: string | null;
  phone: string | null;
  reportingToId: string | null;
  dateOfJoin: string | null;
  workingLocation: string | null;
  timezone: string | null;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  roleId?: string;
  businessUnitId?: string | null;
  employeeId?: string | null;
  phone?: string | null;
  reportingToId?: string | null;
  dateOfJoin?: string | null;
  workingLocation?: string | null;
  timezone?: string | null;
  displayName?: string | null;
  nickName?: string | null;
}

export interface DeactivateUserPayload {
  reason?: string;
}

// ── Query params ──────────────────────────────────────────────────────────────

export interface UsersListParams {
  search?: string;
  buId?: string;
  roleId?: string;
  isActive?: 'true' | 'false';
  teamId?: string;
  teamRole?: TeamRole;
  isClientHandler?: 'true';
  isContactOwner?: 'true';
  page?: number;
  limit?: number;
}
