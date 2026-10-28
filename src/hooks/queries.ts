// File: queries.ts
// Path: src/hooks/queries.ts
//
// Domain hooks. CRUD comes from createResourceHooks; pick-list data
// (lookups, masters, roles) is cached for 5 minutes since it rarely changes.

'use client';

import { useQuery } from '@tanstack/react-query';
import { createResourceHooks } from './useResource';
import {
  clientsApi,
  lookupsApi,
  mastersApi,
  notificationsApi,
  rolesApi,
  spocsApi,
  usersApi,
  type MasterKind,
} from '@/lib/api/endpoints';
import type { LookupType } from '@/types/org';

const STATIC = 5 * 60 * 1000;

export const clientHooks = createResourceHooks(clientsApi, { singular: 'Client' });
export const spocHooks = createResourceHooks(spocsApi, { singular: 'SPOC' });
export const userHooks = createResourceHooks(usersApi, { singular: 'User' });
export const roleHooks = createResourceHooks(rolesApi, { singular: 'Role' });

export const lookupKeys = {
  all: ['lookups'] as const,
  type: (type?: LookupType, includeInactive = false) => ['lookups', type ?? 'all', includeInactive] as const,
};

export const useLookups = (type?: LookupType, { includeInactive = false, enabled = true } = {}) =>
  useQuery({
    queryKey: lookupKeys.type(type, includeInactive),
    queryFn: () => lookupsApi.list({ type, includeInactive }),
    staleTime: includeInactive ? 0 : STATIC,
    enabled,
  });

export const masterKeys = (kind: MasterKind) => ['masters', kind] as const;

export const useMasters = (kind: MasterKind, { activeOnly = false, enabled = true } = {}) =>
  useQuery({
    queryKey: [...masterKeys(kind), activeOnly],
    queryFn: () => mastersApi(kind).all(activeOnly ? { isActive: true } : undefined),
    staleTime: STATIC,
    enabled,
  });

export const useRoles = () =>
  useQuery({ queryKey: roleHooks.keys.list(), queryFn: () => rolesApi.all(), staleTime: STATIC });

export const useUserOptions = (
  search: string,
  purpose: 'assign' | 'client_assign' | 'filter' = 'filter',
  enabled = true,
  limit = 20
) =>
  useQuery({
    queryKey: ['user-options', purpose, search, limit],
    queryFn: () => usersApi.options({ search: search || undefined, for: purpose, limit }),
    staleTime: 60_000,
    enabled,
  });

export const notificationKeys = { all: ['notifications'] as const };

export const useUnreadCount = () =>
  useQuery({
    queryKey: [...notificationKeys.all, 'unread'],
    queryFn: () => notificationsApi.list({ limit: 8 }),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
