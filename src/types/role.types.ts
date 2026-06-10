// types/role.types.ts

// export type PermissionScope = 'OWN' | 'TEAM' | 'MANAGER' | 'BU' | 'ALL';

// ── Permission row ────────────────────────────────────────────────────────────
export type PermissionScope = string; // runtime values from /roles/scopes

export interface RolePermission {
  id?: string;
  module: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  scope: PermissionScope;
}

// ── Role — list item ──────────────────────────────────────────────────────────

export interface RoleListItem {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  permissions: RolePermission[];
  _count: {
    users: number;
    permissions: number;
  };
}

// ── Role — full detail ────────────────────────────────────────────────────────

// export interface RoleDetail {
//   id: string;
//   name: string;
//   description: string | null;
//   isSystem: boolean;
//   createdAt: string;
//   updatedAt: string;
//   permissions: RolePermission[];
//   users: {
//     id: string;
//     firstName: string;
//     lastName: string;
//     email: string;
//     employeeId: string | null;
//     businessUnit: { id: string; name: string } | null;
//   }[];
//   _count: {
//     users: number;
//     permissions: number;
//   };
// }

// ── API responses ─────────────────────────────────────────────────────────────

export interface RolesListResponse {
  success: boolean;
  data: RoleListItem[];
}

export interface RoleDetail {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  permissions: PermissionRowPayload[];
  modules?: string[];
}

export interface RoleDetailResponse {
  success: boolean;
  data: RoleDetail;
}

export interface ModulesResponse {
  success: boolean;
  data: string[]; // distinct module names from DB
}

export interface RoleMutationResponse {
  success: boolean;
  data?: Partial<RoleListItem>;
  message: string;
}

// ── Form payloads ─────────────────────────────────────────────────────────────

export interface PermissionRowPayload {
  module: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  scope: PermissionScope;
}

export interface CreateRolePayload {
  name: string;
  description: string | null;
  permissions: PermissionRowPayload[];
}

export interface UpdateRolePayload {
  name?: string;
  description?: string | null;
  permissions?: PermissionRowPayload[];
}

// ── Scope options for select ──────────────────────────────────────────────────

export const SCOPE_OPTIONS: { value: PermissionScope; label: string }[] = [
  { value: 'OWN', label: 'Own' },
  { value: 'TEAM', label: 'Team' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'BU', label: 'BU' },
  { value: 'ALL', label: 'All' },
];

// ── Format module name for display ───────────────────────────────────────────

export function formatModule(module: string): string {
  return module.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// File: role.types.ts
// Path: src/types/role.types.ts

// ─────────────────────────────────────────────────────────────────────────────
// PermissionScope — string union, NOT a hardcoded enum
// Values come from GET /roles/scopes at runtime — never hardcode here
// ─────────────────────────────────────────────────────────────────────────────

export interface ScopeOption {
  value: string;
  label: string;
  desc: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission row
// ─────────────────────────────────────────────────────────────────────────────

export interface PermissionRowPayload {
  module: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewScope: PermissionScope;
  canAddScope: PermissionScope;
  canEditScope: PermissionScope;
  canDeleteScope: PermissionScope;
}

export function EMPTY_PERMISSION(module: string, defaultScope = 'OWN'): PermissionRowPayload {
  return {
    module,
    canView: false,
    canAdd: false,
    canEdit: false,
    canDelete: false,
    canViewScope: defaultScope,
    canAddScope: defaultScope,
    canEditScope: defaultScope,
    canDeleteScope: defaultScope,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// API response shapes
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// SCOPE_OPTIONS — no longer a hardcoded constant here
// Import useScopeOptions() hook wherever you need the list
// ─────────────────────────────────────────────────────────────────────────────
