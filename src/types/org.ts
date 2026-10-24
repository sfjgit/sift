// File: org.ts
// Path: src/types/org.ts
//
// Users, roles, permissions, masters, lookups, notifications, help.

import type { NamedRef, Person } from './api';
import type { PermissionKey, PermissionScope } from '@/config/permissions';

export type Grant = PermissionScope | true;
export type PermissionMap = Partial<Record<PermissionKey, Grant>>;

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  employeeId: string | null;
  isSuperAdmin: boolean;
  roleId: string;
  role: NamedRef;
  department: NamedRef | null;
  designation: NamedRef | null;
  permissions: PermissionMap;
}

export interface UserPerson extends Person {
  employeeId: string | null;
}

export interface UserListItem {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  email: string;
  employeeId: string | null;
  phone: string | null;
  workingLocation: string | null;
  isActive: boolean;
  isSuperAdmin: boolean;
  dateOfJoin: string | null;
  createdAt: string;
  role: NamedRef;
  department: NamedRef | null;
  designation: NamedRef | null;
  reportingTo: UserPerson | null;
  teamLead: UserPerson | null;
  _count: { subordinates: number; teamMembers: number; spocsHandled: number };
}

export interface UserDetail extends UserListItem {
  middleName: string | null;
  timezone: string | null;
  dateOfBirth: string | null;
  updatedAt: string;
  createdBy: UserPerson | null;
  businessUnits: { businessUnit: NamedRef }[];
  serviceLines: { serviceLine: NamedRef }[];
  subordinates: UserPerson[];
  teamMembers: UserPerson[];
}

export interface UserInput {
  email?: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  displayName?: string | null;
  employeeId?: string | null;
  phone?: string | null;
  workingLocation?: string | null;
  timezone?: string | null;
  dateOfBirth?: string | null;
  dateOfJoin?: string | null;
  roleId: string;
  departmentId?: string | null;
  designationId?: string | null;
  reportingToId?: string | null;
  teamLeadId?: string | null;
  businessUnitIds?: string[];
  serviceLineIds?: string[];
  isSuperAdmin?: boolean;
}

export interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string | null;
  designation: NamedRef | null;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  _count?: { users: number; permissions: number };
}

export interface RoleDetail extends Role {
  permissions: RoleGrant[];
  users: { id: string; firstName: string; lastName: string; email: string }[];
}

export interface RoleGrant {
  permissionKey: string;
  scope: PermissionScope;
}

export interface ScopeOption {
  value: PermissionScope;
  label: string;
  desc: string;
}

export interface MasterRow {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { users: number; clientSpocs?: number };
}

export type LookupType =
  | 'INDUSTRY'
  | 'CLIENT_CATEGORY'
  | 'LOCATION_TYPE'
  | 'TECH_CATEGORY'
  | 'DOCUMENT_TYPE'
  | 'SPOC_SOURCE'
  | 'EMAIL_SOURCE'
  | 'SALES_STATUS'
  | 'PROGRAM_SECTOR';

export interface Lookup {
  id: string;
  type: LookupType;
  code: string;
  label: string;
  order: number | null;
  isActive: boolean;
  isSystem: boolean;
  meta: Record<string, unknown> | null;
}

export type NotificationType = 'SPOC_ASSIGNED' | 'NOTE_ADDED' | 'STEP_RUN_FINISHED' | 'STEP_RUN_FAILED';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  referenceId: string;
  referenceType: 'CLIENT' | 'SPOC' | 'STEP_RUN';
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export type AuthLogType =
  | 'LOGIN'
  | 'LOGOUT'
  | 'REFRESH'
  | 'PASSWORD_RESET'
  | 'PASSWORD_CHANGE'
  | 'ACCOUNT_CREATED'
  | 'ACCOUNT_DEACTIVATED'
  | 'ACCOUNT_REACTIVATED'
  | 'FAILED_LOGIN';

export interface AuthLog {
  id: string;
  type: AuthLogType;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string };
}

export interface SavedView<C = Record<string, unknown>> {
  id: string;
  module: string;
  name: string;
  config: C;
  isDefault: boolean;
  isShared: boolean;
  isOwner: boolean;
  user: Person;
  createdAt: string;
  updatedAt: string;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string;
  module: string | null;
  order: number;
  isPublished: boolean;
  helpfulCount: number;
  notHelpfulCount: number;
  updatedAt: string;
}

export interface SearchResults {
  clients: { id: string; name: string; shortName: string | null; status: string; city: string | null }[];
  spocs: {
    id: string;
    firstName: string;
    lastName: string | null;
    designation: string | null;
    email: string | null;
    client: NamedRef;
  }[];
  users: { id: string; firstName: string; lastName: string; email: string; designation: { name: string } | null }[];
}
