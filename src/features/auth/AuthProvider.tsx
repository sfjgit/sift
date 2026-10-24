// File: AuthProvider.tsx
// Path: src/features/auth/AuthProvider.tsx
//
// Session = GET /auth/me (the API client refreshes once on 401). The payload
// carries the permission map, so show/hide checks need no extra request.

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api/endpoints';
import { onSessionExpired } from '@/lib/api/client';
import type { SessionUser } from '@/types/org';

interface AuthContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** true after a 401 that couldn't be refreshed — the gate redirects with a notice */
  expired: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expired, setExpired] = useState(false);

  const reload = useCallback(async () => {
    try {
      setUser(await authApi.me());
      setExpired(false);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(
    () =>
      onSessionExpired(() => {
        if (userRef.current) setExpired(true);
        setUser(null);
        qc.clear();
      }),
    [qc]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const u = await authApi.login(email, password);
      qc.clear();
      setUser(u);
      setExpired(false);
      return u;
    },
    [qc]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      qc.clear();
    }
  }, [qc]);

  const value = useMemo(
    () => ({ user, isLoading, isAuthenticated: !!user, expired, login, logout, reload }),
    [user, isLoading, expired, login, logout, reload]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
