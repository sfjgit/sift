// File: AuthContext.tsx
// Path: src/context/AuthContext.tsx

'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import axios from 'axios';
import { notifyExtensionLogin, notifyExtensionLogout } from '@/utils/talentOS-extension-bridge';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PermissionScope = 'OWN' | 'TEAM' | 'REPORTING' | 'DEPARTMENT' | 'BU' | 'ALL';

export interface Permission {
  id: string;
  roleId: string;
  module: string;
  moduleId: string | null;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewScope: PermissionScope;
  canAddScope: PermissionScope;
  canEditScope: PermissionScope;
  canDeleteScope: PermissionScope;
}

export interface Role {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  canonical: string | null;
  permissions: Permission[];
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
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
  reportingToId: string | null;
  teamLeadId: string | null;
  departmentId: string | null;
  businessUnitId: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  role: Role;
  businessUnit: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
}

// ─── Permission helpers ───────────────────────────────────────────────────────

export type PermissionAction = 'canView' | 'canAdd' | 'canEdit' | 'canDelete';
export type ScopeAction = 'canViewScope' | 'canAddScope' | 'canEditScope' | 'canDeleteScope';

const SUPERADMIN_PERMISSION = (module: string, roleId: string): Permission => ({
  id: 'superadmin',
  roleId,
  module,
  moduleId: null,
  canView: true,
  canAdd: true,
  canEdit: true,
  canDelete: true,
  canViewScope: 'ALL',
  canAddScope: 'ALL',
  canEditScope: 'ALL',
  canDeleteScope: 'ALL',
});

// ─── Context value ────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * can('requirements', 'canAdd') → true/false
   * isSuperAdmin always returns true.
   */
  can: (module: string, action: PermissionAction) => boolean;
  /**
   * scope('requirements', 'canViewScope') → 'ALL' | 'BU' | 'DEPARTMENT' | ...
   * isSuperAdmin always returns 'ALL'.
   * Returns null if no permission row found.
   */
  scope: (module: string, action: ScopeAction) => PermissionScope | null;
  /**
   * Full permission row for a module.
   * isSuperAdmin gets a synthetic full-access row.
   * Returns null if user has no permission for that module.
   */
  getModulePermission: (module: string) => Permission | null;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

const API = '/api/proxy';

const authAxios = axios.create({
  baseURL: `${API}/core/api/auth`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hydrateSession = useCallback(async () => {
    try {
      const { data: json } = await authAxios.post('/refresh');
      if (json.success && json.data) {
        setUser(json.data as AuthUser);
        const u = json.data as AuthUser;
        notifyExtensionLogin('', `${u.firstName} ${u.lastName}`, u.email);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  async function login(email: string, password: string) {
    const { data: json } = await authAxios.post('/login', { email, password });
    if (!json.success) throw new Error(json.message ?? 'Login failed');
    const u = json.data as AuthUser;
    setUser(u);
    notifyExtensionLogin('', `${u.firstName} ${u.lastName}`, u.email);
  }

  async function logout() {
    try {
      await authAxios.post('/logout');
    } finally {
      setUser(null);
      notifyExtensionLogout();
    }
  }

  // ── Permission helpers ──────────────────────────────────────────────────────

  const getModulePermission = useCallback(
    (module: string): Permission | null => {
      if (!user) return null;
      if (user.isSuperAdmin) return SUPERADMIN_PERMISSION(module, user.roleId);
      return user.role?.permissions?.find(p => p.module === module) ?? null;
    },
    [user]
  );

  const can = useCallback(
    (module: string, action: PermissionAction): boolean => {
      if (!user) return false;
      if (user.isSuperAdmin) return true;
      const perm = user.role?.permissions?.find(p => p.module === module);
      return perm?.[action] === true;
    },
    [user]
  );

  const scope = useCallback(
    (module: string, action: ScopeAction): PermissionScope | null => {
      if (!user) return null;
      if (user.isSuperAdmin) return 'ALL';
      const perm = user.role?.permissions?.find(p => p.module === module);
      return perm?.[action] ?? null;
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        can,
        scope,
        getModulePermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
