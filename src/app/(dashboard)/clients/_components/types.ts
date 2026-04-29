export type ClientStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE';
export type ClientCategory =
  | 'PRODUCT'
  | 'SERVICE'
  | 'CONSULTING'
  | 'STAFFING'
  | 'GOVERNMENT'
  | 'NGO'
  | 'OTHER';
export type ClientHandlerRole = 'PRIMARY' | 'SECONDARY' | 'BACKUP';
export type ClientHandlerStatus = 'ACTIVE' | 'REMOVED' | 'REPLACED';
export type ClientContactStatus = 'ACTIVE' | 'INACTIVE' | 'REMOVED';

export interface UserRef {
  id: string;
  firstName: string;
  lastName: string;
  employeeId?: string | null;
  phone?: string | null;
}

export interface ClientHandler {
  id: string;
  role: ClientHandlerRole;
  status: ClientHandlerStatus;
  assignedAt: string;
  removedAt?: string | null;
  removedReason?: string | null;
  user: UserRef;
  assignedBy: UserRef;
}

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

export interface ClientTeamAssignment {
  id: string;
  assignedAt: string;
  team: { id: string; name: string; category: string | null };
  assignedBy: UserRef;
}

export interface ClientNote {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: UserRef;
}

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

export interface ClientListItem {
  id: string;
  name: string;
  vmsName?: string | null;
  category?: ClientCategory | null;
  industry?: string | null;
  website?: string | null;
  country?: string | null;
  city?: string | null;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
  businessUnit?: { id: string; name: string } | null;
  createdBy: UserRef;
  approvedBy?: UserRef | null;
  handlers: { id: string; role: ClientHandlerRole; user: UserRef }[];
  _count: { contacts: number; requirements: number };
}

export interface ClientDetail extends ClientListItem {
  state?: string | null;
  address?: string | null;
  approvedAt?: string | null;
  parentClient?: { id: string; name: string } | null;
  childClients: { id: string; name: string; status: ClientStatus }[];
  contacts: ClientContact[];
  teamAssignments: ClientTeamAssignment[];
  notes: ClientNote[];
  requirements: ClientRequirement[];
}

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

export interface ClientFilters {
  search: string;
  status: ClientStatus | '';
  category: ClientCategory | '';
  industry: string;
  buId: string;
  handledByMe: boolean;
  page: number;
  limit: number;
  sortBy: 'name' | 'createdAt' | 'updatedAt' | 'status';
  sortDir: 'asc' | 'desc';
}
