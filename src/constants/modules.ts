// ─────────────────────────────────────────
// MODULE CONSTANTS
// Never use raw strings in components — always import from here
// ─────────────────────────────────────────

export const MODULES = {
  USERS: 'users',
  TEAMS: 'teams',
  BUSINESS_UNITS: 'business_units',
  CLIENTS: 'clients',
  REQUIREMENTS: 'requirements',
  REPORTS: 'reports',
  SETTINGS: 'settings',
} as const;

export type ModuleKey = (typeof MODULES)[keyof typeof MODULES];

// ─────────────────────────────────────────
// PERMISSION ACTIONS
// ─────────────────────────────────────────

export const ACTIONS = {
  VIEW: 'canView',
  ADD: 'canAdd',
  EDIT: 'canEdit',
  DELETE: 'canDelete',
} as const;

export type ActionKey = (typeof ACTIONS)[keyof typeof ACTIONS];

// ─────────────────────────────────────────
// PERMISSION SCOPES
// ─────────────────────────────────────────

export const PERMISSION_SCOPE = {
  OWN: 'OWN',
  TEAM: 'TEAM',
  BU: 'BU',
  ALL: 'ALL',
} as const;

export type PermissionScope = (typeof PERMISSION_SCOPE)[keyof typeof PERMISSION_SCOPE];

// ─────────────────────────────────────────
// CLIENT CONSTANTS
// ─────────────────────────────────────────

export const CLIENT_STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type ClientStatus = (typeof CLIENT_STATUS)[keyof typeof CLIENT_STATUS];

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
};

export const CLIENT_HANDLER_ROLE = {
  PRIMARY: 'PRIMARY',
  SECONDARY: 'SECONDARY',
  BACKUP: 'BACKUP',
} as const;

export type ClientHandlerRole = (typeof CLIENT_HANDLER_ROLE)[keyof typeof CLIENT_HANDLER_ROLE];

// ─────────────────────────────────────────
// REQUIREMENT CONSTANTS
// ─────────────────────────────────────────

export const REQUIREMENT_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  ACTIVE: 'ACTIVE',
  ON_HOLD: 'ON_HOLD',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const;

export type RequirementStatus = (typeof REQUIREMENT_STATUS)[keyof typeof REQUIREMENT_STATUS];

export const REQUIREMENT_STATUS_LABELS: Record<RequirementStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

// Valid transitions for status workflow
export const REQUIREMENT_STATUS_TRANSITIONS: Record<RequirementStatus, RequirementStatus[]> = {
  DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['ACTIVE', 'DRAFT', 'CANCELLED'],
  ACTIVE: ['ON_HOLD', 'CLOSED', 'CANCELLED'],
  ON_HOLD: ['ACTIVE', 'CLOSED', 'CANCELLED'],
  CLOSED: [],
  CANCELLED: [],
};

export const JOB_TYPE = {
  CONTRACT: 'CONTRACT',
  PERMANENT: 'PERMANENT',
  CONTRACT_TO_HIRE: 'CONTRACT_TO_HIRE',
  FREELANCE: 'FREELANCE',
} as const;

export type JobType = (typeof JOB_TYPE)[keyof typeof JOB_TYPE];

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  CONTRACT: 'Contract',
  PERMANENT: 'Permanent',
  CONTRACT_TO_HIRE: 'Contract to Hire',
  FREELANCE: 'Freelance',
};

export const REMOTE_TYPE = {
  ONSITE: 'ONSITE',
  REMOTE: 'REMOTE',
  HYBRID: 'HYBRID',
} as const;

export type RemoteType = (typeof REMOTE_TYPE)[keyof typeof REMOTE_TYPE];

export const REMOTE_TYPE_LABELS: Record<RemoteType, string> = {
  ONSITE: 'Onsite',
  REMOTE: 'Remote',
  HYBRID: 'Hybrid',
};

export const PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;

export type Priority = (typeof PRIORITY)[keyof typeof PRIORITY];

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

// ─────────────────────────────────────────
// ASSIGNMENT CONSTANTS
// ─────────────────────────────────────────

export const ASSIGNMENT_TYPE = {
  INDIVIDUAL: 'INDIVIDUAL',
  TEAM: 'TEAM',
} as const;

export type AssignmentType = (typeof ASSIGNMENT_TYPE)[keyof typeof ASSIGNMENT_TYPE];

export const ASSIGNMENT_STATUS = {
  ACTIVE: 'ACTIVE',
  REMOVED: 'REMOVED',
  REPLACED: 'REPLACED',
} as const;

export type AssignmentStatus = (typeof ASSIGNMENT_STATUS)[keyof typeof ASSIGNMENT_STATUS];

// ─────────────────────────────────────────
// DOCUMENT EVENT TYPES
// ─────────────────────────────────────────

export const DOCUMENT_EVENT_TYPE = {
  FILE_UPLOAD: 'FILE_UPLOAD',
  STATUS_CHANGE: 'STATUS_CHANGE',
  ISSUE_RAISED: 'ISSUE_RAISED',
  NOTE: 'NOTE',
  POSITION_FILLED: 'POSITION_FILLED',
  REQUIREMENT_CLOSED: 'REQUIREMENT_CLOSED',
} as const;

export type DocumentEventType = (typeof DOCUMENT_EVENT_TYPE)[keyof typeof DOCUMENT_EVENT_TYPE];

// ─────────────────────────────────────────
// TEAM CONSTANTS
// ─────────────────────────────────────────

export const TEAM_ROLE = {
  LEAD: 'LEAD',
  CO_LEAD: 'CO_LEAD',
  MEMBER: 'MEMBER',
} as const;

export type TeamRole = (typeof TEAM_ROLE)[keyof typeof TEAM_ROLE];

// ─────────────────────────────────────────
// QUERY KEYS — centralized for TanStack Query cache control
// ─────────────────────────────────────────

export const QUERY_KEYS = {
  // Clients
  CLIENTS: 'clients',
  CLIENT_DETAIL: 'client-detail',
  CLIENT_CONTACTS: 'client-contacts',
  CLIENT_HANDLERS: 'client-handlers',
  CLIENT_TEAMS: 'client-teams',
  CLIENT_NOTES: 'client-notes',

  // Requirements
  REQUIREMENTS: 'requirements',
  REQUIREMENT_DETAIL: 'requirement-detail',
  REQUIREMENT_ASSIGNMENTS: 'requirement-assignments',
  REQUIREMENT_DOCUMENTS: 'requirement-documents',
  REQUIREMENT_NOTES: 'requirement-notes',
  REQUIREMENT_HISTORY: 'requirement-history',

  // Shared
  USERS: 'users',
  TEAMS: 'teams',
  BUSINESS_UNITS: 'business-units',
  ROLES: 'roles',
} as const;
