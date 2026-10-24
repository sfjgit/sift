// File: impersonation.ts
// Path: src/features/auth/impersonation.ts
//
// The backend sets a readable `impersonatingAs` cookie while a super admin is
// signed in as someone else; the banner reads it.

export interface ImpersonationTarget {
  id: string;
  name: string;
  email: string;
  logId: string;
}

export function getImpersonationTarget(): ImpersonationTarget | null {
  if (typeof document === 'undefined') return null;
  const raw = document.cookie
    .split('; ')
    .find(c => c.startsWith('impersonatingAs='))
    ?.split('=')
    .slice(1)
    .join('=');
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
}

/** accessToken is readable (httpOnly: false) — only used to decide landing CTA */
export const hasSessionCookie = () =>
  typeof document !== 'undefined' && document.cookie.split('; ').some(c => c.startsWith('accessToken='));
