'use client';

import { useAuth } from '@/context/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// useBUScope
//
// Returns:
//   autoApply: true  → user's BU is fixed, don't show BU picker, send user.businessUnitId
//   autoApply: false → user can pick BU (BU/ALL scope), show the picker
//   businessUnitId   → always the user's own BU id (use as default/hidden value)
//   businessUnitName → for display when picker is hidden
// ─────────────────────────────────────────────────────────────────────────────

export function useBUScope(module: string) {
  //   const { user, permissions } = useContext(AuthContext);
  const { user } = useAuth();

  const permissions = user?.role?.permissions;

  const modPerm = permissions?.[module as keyof typeof permissions];
  //   @ts-expect-error err
  const scope = modPerm?.scope ?? 'OWN';

  // OWN, TEAM, MANAGER → BU is auto-applied, no picker shown
  // BU, ALL → user can select BU
  const autoApply = !['BU', 'ALL'].includes(scope);

  return {
    autoApply,
    businessUnitId: user?.businessUnitId ?? null,
    businessUnitName: user?.businessUnit?.name ?? null,
    scope,
  };
}
