// File: crm.ts
// Path: src/types/crm.ts
//
// Client / SPOC / CSR shapes — mirror the selects in crm-core-service controllers.

import type { LookupRef, NamedRef, Person } from './api';

export type ClientStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE';

/** BU / service line as embedded in a client */
export interface OrgRef {
  id: string;
  name: string;
  code: string | null;
}
export type EmailStatus = 'UNVERIFIED' | 'GOOD' | 'RISKY' | 'BAD';
export type ValidationBand = 'READY' | 'REVIEW' | 'NOT_USABLE';

export type ClientActivityType =
  | 'CLIENT_CREATED'
  | 'CLIENT_UPDATED'
  | 'CLIENT_APPROVED'
  | 'SPOC_ADDED'
  | 'SPOC_UPDATED'
  | 'SPOC_REASSIGNED'
  | 'NOTE_ADDED'
  | 'LOCATION_ADDED'
  | 'TECHNOLOGY_UPDATED'
  | 'DOCUMENT_ADDED'
  | 'FINANCIALS_UPDATED'
  | 'PROGRAMS_ADDED'
  | 'OUTREACH_GENERATED'
  | 'STEP_RUN_STARTED'
  | 'STEP_RUN_FINISHED'
  | 'STEP_RUN_FAILED'
  | 'SPOC_APPROVED'
  | 'SPOC_REJECTED'
  | 'OUTREACH_UPDATED'
  | 'CLIENT_ASSIGNED';

// ── clients ──────────────────────────────────────────────────────────────────

export interface ClientListItem {
  id: string;
  name: string;
  shortName: string | null;
  cin: string | null;
  website: string | null;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
  industry: LookupRef | null;
  category: LookupRef | null;
  businessUnit: OrgRef | null;
  serviceLines: { serviceLine: OrgRef }[];
  createdBy: Person;
  locations: { id: string; city: string | null; state: string | null; country: string | null }[];
  _count: { spocs: number };
  /** people who work this client (set by super admin / clients.assign) */
  assignments: { assignedAt: string; user: Person }[];
  /** list rows only: what the CRM holds and the last pipeline run */
  coverage?: ClientCoverage;
}

export interface ClientAssignment {
  id: string;
  note: string | null;
  assignedAt: string;
  endedAt: string | null;
  user: Person & { email: string };
  assignedBy: Person & { email: string };
}

/** latest run of one step for a client (anyone's) — the list's step columns */
export interface ClientStepCell {
  id: string;
  status: StepRunStatus;
  note: string | null;
  createdAt: string;
  requestedBy: Person;
}

export interface ClientCoverage {
  reports: number;
  spocs: number;
  approvedSpocs: number;
  figureYears: number;
  programs: number;
  outreachPacks: number;
  outreachSent: number;
  lastRun: { id: string; status: StepRunStatus; note: string | null; createdAt: string; step: { key: string; label: string } } | null;
  steps: Partial<Record<string, ClientStepCell>>;
}

export interface ClientLocation {
  id: string;
  name: string | null;
  addressLine: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  latitude: string | null;
  longitude: string | null;
  isPrimary: boolean;
  isActive: boolean;
  dmEvidence: string | null;
  createdAt: string;
  type: LookupRef | null;
  addedBy: Person | null;
  _count: { spocs: number };
}

export interface ClientTechnology {
  id: string;
  details: string;
  updatedAt: string;
  category: LookupRef;
  addedBy: Person | null;
}

export interface ClientNote {
  id: string;
  content: string;
  createdAt: string;
  author: Person;
}

export interface ClientDocument {
  id: string;
  fy: string;
  fileKey: string;
  fileName: string | null;
  sourceUrl: string | null;
  createdAt: string;
  type: LookupRef;
}

export interface ClientProgram {
  id: string;
  fy: string;
  name: string;
  budgetRs: string | null;
  locations: string | null;
  beneficiaries: string | null;
  implementor: string | null;
  sourceUrl: string | null;
  sector: LookupRef | null;
}

export interface ClientFinancial {
  id: string;
  fy: string;
  obligationRs: string | null;
  budgetRs: string | null;
  spentRs: string | null;
  unspentRs: string | null;
  evidence: string | null;
  confidence: string | null;
  isLocked: boolean;
  updatedAt: string;
}

export interface ClientDetail extends Omit<ClientListItem, 'locations'> {
  linkedinUrl: string | null;
  approvedAt: string | null;
  approvedBy: Person | null;
  locations: ClientLocation[];
  technologies: ClientTechnology[];
  notes: ClientNote[];
  /** Present only with client_documents.read */
  documents?: ClientDocument[];
  /** Present only with client_programs.read */
  programs?: ClientProgram[];
  /** Present only with client_financials.read */
  financials?: ClientFinancial[];
}

export interface ClientInput {
  name: string;
  shortName?: string | null;
  cin?: string | null;
  website?: string | null;
  linkedinUrl?: string | null;
  industryId?: string | null;
  categoryId?: string | null;
  businessUnitId?: string | null;
  /** replaces the client's whole set */
  serviceLineIds?: string[];
}

export interface LocationInput {
  typeId?: string | null;
  name?: string | null;
  addressLine?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  isPrimary?: boolean;
  dmEvidence?: string | null;
}

export interface ClientActivity {
  id: string;
  type: ClientActivityType;
  summary: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
  actor: Person | null;
  spoc: Person | null;
  client?: NamedRef;
}

// ── spocs ────────────────────────────────────────────────────────────────────

export interface Spoc {
  id: string;
  firstName: string;
  lastName: string | null;
  /** null when the caller lacks spocs.view_contact */
  email: string | null;
  phone: string | null;
  designation: string | null;
  department: string | null;
  linkedinUrl: string | null;
  seniority: string | null;
  totalExpYears: string | null;
  currentOrgExpYears: string | null;
  emailStatus: EmailStatus;
  validationScore: number | null;
  validationBand: ValidationBand | null;
  validatedAt: string | null;
  isPrimary: boolean;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  client: NamedRef;
  handler: Person;
  addedBy: Person;
  businessUnit: NamedRef;
  serviceLine: NamedRef;
  location: { id: string; name: string | null; city: string | null; state: string | null } | null;
  source: LookupRef | null;
  emailSource: LookupRef | null;
  salesStatus: LookupRef | null;
  /** where each contact field came from — { email: "apollo", linkedinUrl: "brightdata" } */
  fieldSources: Record<string, string> | null;
  reviewFlag: boolean;
  reviewReason: string | null;
  approvalStatus: SpocApprovalStatus;
  approvedAt: string | null;
  approvalNote: string | null;
  approvedBy: Person | null;
}

export type SpocApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface SpocAssignment {
  id: string;
  reason: string | null;
  assignedAt: string;
  endedAt: string | null;
  assignedTo: Person;
  assignedBy: Person;
}

export interface SpocDetail extends Spoc {
  validationChecks: Record<string, unknown> | null;
  assignments?: SpocAssignment[];
}

export interface SpocInput {
  clientId?: string;
  handlerId?: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  designation?: string | null;
  department?: string | null;
  linkedinUrl?: string | null;
  seniority?: string | null;
  totalExpYears?: number | null;
  currentOrgExpYears?: number | null;
  businessUnitId: string;
  serviceLineId: string;
  locationId?: string | null;
  sourceId?: string | null;
  emailSourceId?: string | null;
  salesStatusId?: string | null;
  isPrimary?: boolean;
  notes?: string | null;
}

export interface BulkResult {
  updated: number;
  skipped: { id: string; reason: string }[];
}

// ── outreach + pipeline ──────────────────────────────────────────────────────

export type StepRunStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'DONE'
  | 'EMPTY'
  | 'FAILED'
  | 'STOPPED'
  | 'DISPATCH_FAILED'
  | 'TIMED_OUT';

export interface PipelineStep {
  id: string;
  key: string;
  label: string;
  target: 'CLIENT' | 'SPOC';
  uiOrder: number | null;
  userClientLimit: number | null;
  service: { code: string; name: string; isActive: boolean; lastHealthOk: boolean | null };
}

export interface StepRun {
  id: string;
  status: StepRunStatus;
  progress: number | null;
  note: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  howToContinue: string | null;
  costUsd: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  parentRunId: string | null;
  step: { id: string; key: string; label: string; target: 'CLIENT' | 'SPOC' };
  client: NamedRef;
  spoc: Person | null;
  requestedBy: Person;
  _count?: { childRuns: number; events: number };
}

export interface StepRunDetail extends StepRun {
  options: unknown;
  viewData: unknown;
  resultSummary: unknown;
  credits: Record<string, number> | null;
  events: {
    id: string;
    fromStatus: StepRunStatus | null;
    toStatus: StepRunStatus | null;
    message: string;
    createdAt: string;
  }[];
  /** lighter rows than the list — no client / SPOC / requester / cost */
  childRuns: Pick<StepRun, 'id' | 'status' | 'progress' | 'note' | 'createdAt' | 'step'>[];
  /** what this run put into the CRM (null for "Run all": see its child runs) */
  produced: RunProduced | null;
}

export interface RunProduced {
  clientId: string;
  spocs: (Person & {
    designation: string | null;
    approvalStatus: SpocApprovalStatus;
    validationScore: number | null;
    validationBand: ValidationBand | null;
    emailStatus: EmailStatus | null;
    change: 'added' | 'updated';
    /** fields this run filled in; "score" = validated */
    fields: string[];
  })[];
  documents: { id: string; type: string; fy: string; fileName: string | null }[];
  outreach: { id: string; spoc: Person; messages: number; firstSubject: string | null }[];
  programs: number;
  financials: number;
}

export type OutreachStatus = 'DRAFT' | 'REVIEWED' | 'SENT' | 'REPLIED' | 'NO_REPLY' | 'BOUNCED';

export interface OutreachMessage {
  id: string;
  sequenceNo: number;
  subject: string;
  body: string;
  editedAt: string | null;
  editedBy: Person | null;
  sentAt: string | null;
  sentBy: Person | null;
}

export interface OutreachPack {
  id: string;
  model: string | null;
  fileKey: string | null;
  createdAt: string;
  status: OutreachStatus;
  reviewedAt: string | null;
  reviewedBy: Person | null;
  outcomeNote: string | null;
  repliedAt: string | null;
  statusAt: string | null;
  statusBy: Person | null;
  client: NamedRef;
  spoc: Person & { designation: string | null; email: string | null };
  sourceRun: { id: string; step: { label: string } } | null;
  messages: OutreachMessage[];
}

export interface OutreachPackDetail extends OutreachPack {
  history: { id: string; type: string; summary: string; createdAt: string; actor: Person | null }[];
}

// ── running steps ────────────────────────────────────────────────────────────

export interface StartRunInput {
  stepKey: string;
  clientId: string;
  spocIds?: string[];
  businessUnitId?: string;
  serviceLineId?: string;
  /** run again although it was done recently (super admin / step_runs.rerun) */
  rerun?: boolean;
  /** forwarded to the engine; run_all: { steps[], dryRun, stepOptions{} } */
  options?: Record<string, unknown>;
}

export type StartedRun = Pick<StepRun, 'id' | 'status' | 'note' | 'createdAt' | 'parentRunId'> & {
  step: { id: string; key: string; label: string };
  duplicate: boolean;
};

export interface StepOverview {
  counts: {
    spocs: number;
    approvedSpocs: number;
    documents: number;
    financials: number;
    programs: number;
    outreachPacks: number;
    /** SPOCs this user handles (or sees through their team); the rest are other people's */
    mySpocs: number;
    myApprovedSpocs: number;
    othersSpocs: number;
  };
  /** may run a step again before its re-run date */
  canRerun: boolean;
  /** super admin / step_runs.unlimited: no run slots */
  unlimitedSlots: boolean;
  steps: StepOverviewRow[];
}

export type StepOverviewRow = Pick<PipelineStep, 'id' | 'key' | 'label' | 'uiOrder' | 'userClientLimit'> & {
  rerunAfterDays: number | null;
  service: { isActive: boolean; lastHealthOk: boolean | null };
  lastRun: Pick<StepRun, 'id' | 'status' | 'progress' | 'note' | 'errorMessage' | 'createdAt' | 'finishedAt'> | null;
  /** last finished run that counts for this user (anyone's for client-level steps) */
  done: { runId: string; at: string; by: string; byMe: boolean; note: string | null; until: string } | null;
  /** done recently with nothing new since — a re-run needs an admin */
  rerunBlocked: { message: string; until: string } | null;
  slots: RunSlot[];
};

// ── run slots ────────────────────────────────────────────────────────────────

export type QuotaPeriod = 'DAY' | 'WEEK' | 'MONTH';

export interface RunSlot {
  ruleId: string;
  stepId: string | null;
  stepLabel: string | null;
  appliesTo: 'USER' | 'ROLE' | 'EVERYONE';
  period: QuotaPeriod;
  max: number;
  used: number;
  left: number;
  resetsAt: string;
}

export interface RunQuota {
  id: string;
  period: QuotaPeriod;
  maxRuns: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  step: { id: string; key: string; label: string } | null;
  role: { id: string; name: string } | null;
  user: (Person & { email: string }) | null;
  createdBy: Person;
}

export interface RunQuotaInput {
  stepId?: string | null;
  roleId?: string | null;
  userId?: string | null;
  period: QuotaPeriod;
  maxRuns: number;
  isActive?: boolean;
}

/** viewData written by the CRM when it saved a run's results */
export interface RunViewData {
  conflicts?: { spocId: string; name: string; field: string; current?: string; proposed: unknown; source?: string | null; reason?: string }[];
  skipped?: { kind: string; name?: string; reason: string; [k: string]: unknown }[];
  flaggedFigures?: { fy: string; reviewReason?: string; [k: string]: unknown }[];
}

// ── integrations (admin) ─────────────────────────────────────────────────────

export interface IntegrationStep {
  id: string;
  key: string;
  label: string;
  target: 'CLIENT' | 'SPOC';
  uiOrder: number | null;
  userClientLimit: number | null;
  rerunAfterDays: number | null;
  isActive: boolean;
  config: Record<string, unknown> | null;
}

export interface IntegrationService {
  id: string;
  code: string;
  name: string;
  baseUrl: string | null;
  outboundKeyEnv: string | null;
  outboundKeySet: boolean;
  inboundKeySet: boolean;
  scopes: string[];
  timeoutMins: number;
  maxDispatchTries: number;
  isActive: boolean;
  lastUsedAt: string | null;
  lastHealthAt: string | null;
  lastHealthOk: boolean | null;
  steps: IntegrationStep[];
}

export interface EngineHealth {
  ok: boolean;
  reachable: boolean;
  error: string | null;
  engine: {
    ok: boolean;
    worker: { online: boolean; ageSeconds: number | null };
    queued: number;
    keys: Record<string, boolean>;
    callbackKeySet: boolean;
    s3: boolean;
    limits: Record<string, string | null>;
    crmMode: boolean;
    version: string;
  } | null;
}
