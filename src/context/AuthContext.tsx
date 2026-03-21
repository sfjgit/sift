'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import env from '@/config/env';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Permission {
  id: string;
  name: string;
  description?: string;
  module: string;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  canView?: boolean;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions: Permission[];
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  nickName: string | null;
  displayName: string | null;
  employeeId: string;
  phone: string | null;
  workingLocation: string | null;
  timezone: string | null;
  dateOfBirth: string | null;
  dateOfJoin: string | null;
  isSuperAdmin: boolean;
  isActive: boolean;
  roleId: string;
  reportingToId: string | null;
  businessUnitId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  role: Role;
  businessUnit: {
    id: string;
    name: string;
  };
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

const API = env.NEXT_PUBLIC_API_URL;

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true); // true on mount — hydrating session

  /**
   * Attempt to restore session via /auth/refresh.
   * Tokens are httpOnly cookies — browser sends them automatically.
   * If the cookie is valid, backend returns the full user object.
   * If not, user stays null (not logged in).
   */
  const hydrateSession = useCallback(async () => {
    try {
      const res = await fetch(`${API}/core/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // send cookies
      });

      if (!res.ok) {
        setUser(null);
        return;
      }

      const json = await res.json();
      if (json.success && json.data) {
        setUser(json.data as AuthUser);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // On mount — restore session
  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  async function login(email: string, password: string) {
    const res = await fetch(`${API}/core/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // receive cookies
      body: JSON.stringify({ email, password }),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message ?? 'Login failed');
    }

    setUser(json.data as AuthUser);
  }

  async function logout() {
    try {
      await fetch(`${API}/core/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
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
