// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export type PermissionScope = 'OWN' | 'DEPARTMENT' | 'BU' | 'ALL';

export const PERMISSION_SCOPES: PermissionScope[] = ['OWN', 'DEPARTMENT', 'BU', 'ALL'];

export const SCOPE_OPTIONS: { value: PermissionScope; label: string; desc: string }[] = [
  { value: 'OWN', label: 'Own', desc: 'own records only' },
  { value: 'DEPARTMENT', label: 'Department', desc: 'department records' },
  { value: 'BU', label: 'Business Unit', desc: 'entire BU' },
  { value: 'ALL', label: 'All', desc: 'all records' },
];

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSION ROW — one per module, each action has its own scope
// ─────────────────────────────────────────────────────────────────────────────

export interface PermissionRow {
  id?: string;
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

// Alias used in form/matrix components
export type PermissionRowPayload = Omit<PermissionRow, 'id'>;

// ─────────────────────────────────────────────────────────────────────────────
// LIST — /roles
// ─────────────────────────────────────────────────────────────────────────────

export interface RoleListItem {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    users: number;
    permissions: number;
  };
  permissions: PermissionRow[];
}

export interface RolesListResponse {
  success: boolean;
  data: RoleListItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// DETAIL — /roles/:id
// ─────────────────────────────────────────────────────────────────────────────

export interface RoleUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string | null;
}

export interface RoleDetail extends RoleListItem {
  users: RoleUser[];
  modules: string[]; // full system module list, always from API
}

export interface RoleDetailResponse {
  success: boolean;
  data: RoleDetail;
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULES — /roles/modules
// ─────────────────────────────────────────────────────────────────────────────

export interface ModulesResponse {
  success: boolean;
  data: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateRolePayload {
  name: string;
  description?: string | null;
  permissions: PermissionRowPayload[];
}

export interface UpdateRolePayload {
  name?: string;
  description?: string | null;
  permissions?: PermissionRowPayload[];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const formatModule = (module: string) =>
  module
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export const formatScope = (scope: PermissionScope): string => {
  const map: Record<PermissionScope, string> = {
    OWN: 'Own',
    DEPARTMENT: 'Department',
    BU: 'Business Unit',
    ALL: 'All',
  };
  return map[scope];
};

export const EMPTY_PERMISSION = (module: string): PermissionRowPayload => ({
  module,
  canView: false,
  canAdd: false,
  canEdit: false,
  canDelete: false,
  canViewScope: 'OWN',
  canAddScope: 'OWN',
  canEditScope: 'OWN',
  canDeleteScope: 'OWN',
});
