// File: impersonation.ts
// Path: src/lib/impersonation.ts

import { useAxios } from '@/hooks/useAxios';

export interface ImpersonationTarget {
  id: string;
  name: string;
  email: string;
  logId: string;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const raw = document.cookie
    .split('; ')
    .find(c => c.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=');
  return raw ? decodeURIComponent(raw) : null;
}

export function getImpersonationTarget(): ImpersonationTarget | null {
  const raw = readCookie('impersonatingAs');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// UI-only check — backend enforces the real permission
export function isCurrentUserSuperAdmin(): boolean {
  const token = readCookie('accessToken');
  if (!token) return false;
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return payload?.isSuperAdmin === true;
  } catch {
    return false;
  }
}

export function useImpersonation() {
  const api = useAxios();
  return {
    start: async (userId: string) => {
      await api.post(`/admin/users/${userId}/impersonate`);
      window.location.href = '/dashboard';
    },
    stop: async () => {
      try {
        await api.post('/admin/impersonation/stop');
        await api.post('/auth/refresh');
        window.location.href = '/users';
      } catch {
        window.location.href = '/sign-in';
      }
    },
  };
}
