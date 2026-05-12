// File: AuthContext.tsx
// Path: src/context/AuthContext.tsx

'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import env from '@/config/env';
import { notifyExtensionLogin, notifyExtensionLogout } from '@/utils/talentOS-extension-bridge';

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
  const [isLoading, setIsLoading] = useState(true);

  // ── Restore session on mount via refresh cookie
  const hydrateSession = useCallback(async () => {
    try {
      const res = await fetch(`${API}/core/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        setUser(null);
        return;
      }

      const json = await res.json();
      if (json.success && json.data) {
        const u = json.data as AuthUser;
        setUser(u);

        // ✅ Sync extension on page reload / tab reopen
        // accessToken cookie is already set by backend — extension picks it up
        // via chrome.cookies.onChanged. But we also send name+email via postMessage
        // so the popup can show "Connected · John Doe" immediately.
        notifyExtensionLogin(
          '', // token not needed here — cookie handles auth, we just need name
          `${u.firstName} ${u.lastName}`,
          u.email
        );
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

  // ── Login
  async function login(email: string, password: string) {
    const res = await fetch(`${API}/core/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message ?? 'Login failed');

    const u = json.data as AuthUser;
    setUser(u);

    // ✅ Sync extension — cookie is already set by backend at this point
    // postMessage tells content-talentOS.js → background.js → storage
    // so popup shows "Connected · John Doe" without needing a manual re-sync
    notifyExtensionLogin(
      '', // token handled via cookie — extension reads it from chrome.cookies
      `${u.firstName} ${u.lastName}`,
      u.email
    );
  }

  // ── Logout
  async function logout() {
    try {
      await fetch(`${API}/core/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      setUser(null);
      // ✅ Tell extension to clear its session
      notifyExtensionLogout();
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout }}>
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
