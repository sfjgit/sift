// types/user.types.ts

export type TeamRole = 'LEAD' | 'CO_LEAD' | 'MEMBER';

export interface RoleBasic {
  id: string;
  name: string;
}

export interface BusinessUnitBasic {
  id: string;
  name: string;
}

export interface UserBasic {
  id: string;
  firstName: string;
  lastName: string;
}

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
  department: { id: string; name: string } | null;
  reportingTo: UserBasic | null;
  teamLead: UserBasic | null;
  _count: {
    subordinates: number;
    teamMembers: number;
    spocsHandled: number;
    assignmentsReceived: number;
  };
}

export interface UsersListParams {
  search?: string;
  roleId?: string;
  departmentId?: string;
  reportingToId?: string;
  isActive?: 'true' | 'false';
  buId?: string;
  teamId?: string;
  teamRole?: TeamRole;
  isClientHandler?: 'true' | 'false';
  page?: number;
  limit?: number;
  sortBy?: 'firstName' | 'lastName' | 'createdAt' | 'dateOfJoin';
  sortDir?: 'asc' | 'desc';
}

export interface UsersListPermissions {
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canView?: boolean;
  scope?: string;
}

export interface UsersListResponse {
  success: boolean;
  data: UserListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  // page returns meta but frontend uses pagination key — support both
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  permissions: UsersListPermissions;
}

export interface UserFormDataResponse {
  success: boolean;
  data: {
    roles: RoleBasic[];
    businessUnits: BusinessUnitBasic[];
  };
}

// File: user.types.ts
// Path: src/types/user.types.ts

export interface FilterOption {
  id: string;
  name: string;
}

export interface FilterPerson {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string | null;
}

export interface UserFilterOptions {
  departments: FilterOption[];
  roles: FilterOption[];
  reportingTo: FilterPerson[];
  teamLeads: FilterPerson[];
  teamRoles: { value: TeamRole; label: string }[];
}

export interface UserFilterOptionsResponse {
  success: boolean;
  data: UserFilterOptions;
}
