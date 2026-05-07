// components/clients/detail/types.ts

export type ClientStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE';

export interface ClientSpoc {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  designation?: string | null;
  department?: string | null;
  isPrimary: boolean;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  handler: { id: string; firstName: string; lastName: string };
  addedBy: { id: string; firstName: string; lastName: string };
  serviceLine: { id: string; name: string };
  businessUnit: { id: string; name: string };
}

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
  createdBy: { id: string; firstName: string; lastName: string };
  approvedBy?: { id: string; firstName: string; lastName: string } | null;
  spocs: ClientSpoc[];
  notes: {
    id: string;
    content: string;
    createdAt: string;
    author: { id: string; firstName: string; lastName: string };
  }[];
  requirements: {
    id: string;
    reqCode: string;
    title: string;
    status: string;
    priority: string;
    totalOpenings: number;
    filledOpenings: number;
    createdAt: string;
  }[];
  _count: { requirements: number };
}

export interface ClientDetailPermissions {
  canEdit: boolean;
  canDelete: boolean;
}
