export type ClientStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE';
export type ClientHandlerRole = 'PRIMARY' | 'SECONDARY' | 'BACKUP'; // kept for spoc isPrimary display
export type ClientContactStatus = 'ACTIVE' | 'INACTIVE' | 'REMOVED';

export interface UserRef {
  id: string;
  firstName: string;
  lastName: string;
  employeeId?: string | null;
}

// ── Spoc (what the API actually returns on both list + detail) ────────────────

export interface ClientSpoc {
  id: string;
  isPrimary: boolean;
  isActive: boolean;
  notes?: string | null;
  assignedAt: string;
  removedAt?: string | null;
  user: UserRef;
  serviceLine: { id: string; name: string };
  businessUnit?: { id: string; name: string } | null;
  assignedBy?: UserRef; // present on detail, absent on list
}

// ── Contact ───────────────────────────────────────────────────────────────────

export interface ClientContact {
  id: string;
  firstName: string;
  lastName?: string | null;
  designation?: string | null;
  email: string;
  phone?: string | null;
  linkedinUrl?: string | null;
  isPrimary: boolean;
  status: ClientContactStatus;
  createdAt: string;
  owner?: UserRef | null;
}

// ── Team assignment ───────────────────────────────────────────────────────────

export interface ClientTeamAssignment {
  id: string;
  assignedAt: string;
  team: { id: string; name: string; category: string | null };
  assignedBy: UserRef;
}

// ── Note ─────────────────────────────────────────────────────────────────────

export interface ClientNote {
  id: string;
  content: string;
  createdAt: string;
  author: UserRef;
}

// ── Requirement (summary) ─────────────────────────────────────────────────────

export interface ClientRequirement {
  id: string;
  reqCode: string;
  title: string;
  status: string;
  priority: string;
  totalOpenings: number;
  filledOpenings: number;
  createdAt: string;
}

// ── List item — matches getClients select ─────────────────────────────────────

export interface ClientListItem {
  id: string;
  name: string;
  vmsName?: string | null;
  industry?: string | null;
  status: ClientStatus;
  createdAt: string;
  businessUnit?: { id: string; name: string } | null;
  createdBy: UserRef;
  spocs: ClientSpoc[];
  _count: { requirements: number };
}

// ── Detail — matches getClientById select ─────────────────────────────────────

export interface ClientDetail {
  id: string;
  name: string;
  vmsName?: string | null;
  industry?: string | null;
  website?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  address?: string | null;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string | null;
  businessUnit?: { id: string; name: string } | null;
  parentClient?: { id: string; name: string } | null;
  childClients: { id: string; name: string; status: ClientStatus }[];
  createdBy: UserRef;
  approvedBy?: UserRef | null;
  spocs: ClientSpoc[];
  notes: ClientNote[];
  requirements: ClientRequirement[];
  // contacts and teamAssignments not returned by current controller
  // add here when backend includes them
  _count: { requirements: number };
}

// ── API response wrappers ─────────────────────────────────────────────────────

export interface ClientListResponse {
  success: boolean;
  data: ClientListItem[];
  meta: { total: number; page: number; limit: number; pages: number };
  permissions: { canAdd: boolean; canEdit: boolean; canDelete: boolean };
}

export interface ClientDetailResponse {
  success: boolean;
  data: ClientDetail;
  permissions: { canEdit: boolean; canDelete: boolean };
}
