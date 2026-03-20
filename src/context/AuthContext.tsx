'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
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

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount — check if a session exists (swap with real /me endpoint later)
  useEffect(() => {
    async function hydrateSession() {
      try {
        // TODO: replace with actual session check, e.g.:
        // const res = await fetch('/api/auth/me');
        // const data = await res.json();
        // setUser(data.user);
        setUser(null);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    hydrateSession();
  }, []);

  async function login(email: string, _password: string) {
    setIsLoading(true);
    try {
      // TODO: replace with actual login call
      // const res = await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      // const data = await res.json();
      // setUser(data.user);
      console.log('login stub called for', email);
    } finally {
      setIsLoading(false);
    }
  }

  async function logout() {
    setIsLoading(true);
    try {
      // TODO: replace with actual logout call
      // await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } finally {
      setIsLoading(false);
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
