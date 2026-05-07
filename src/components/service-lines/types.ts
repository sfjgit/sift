// components/service-lines/types.ts

export interface ServiceLine {
  id: string;
  name: string;
  code?: string | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    requirements: number;
    clientSpocs: number;
  };
}

export interface ServiceLineListResponse {
  success: boolean;
  data: ServiceLine[];
}

export interface ServiceLinePermissions {
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

// components/service-lines/types.ts — add these

export interface ServiceLineSpoc {
  id: string;
  firstName: string;
  lastName: string;
  designation?: string | null;
  email?: string | null;
  isPrimary: boolean;
  client: {
    id: string;
    name: string;
    industry?: string | null;
    status: string;
    businessUnit?: { id: string; name: string } | null;
  };
  handler: { id: string; firstName: string; lastName: string };
  businessUnit: { id: string; name: string };
}

export interface ServiceLineRequirement {
  id: string;
  reqCode: string;
  title: string;
  status: string;
  priority: string;
  totalOpenings: number;
  filledOpenings: number;
  activeApplications: number;
  createdAt: string;
  client: { id: string; name: string };
  businessUnit?: { id: string; name: string } | null;
  createdBy: { id: string; firstName: string; lastName: string };
}

export interface ServiceLineDetail extends ServiceLine {
  clientSpocs: ServiceLineSpoc[];
  requirements: ServiceLineRequirement[];
  stats: {
    totalRequirements: number;
    activeSpocs: number;
    uniqueClients: number;
    requirementsByStatus: Partial<Record<string, number>>;
  };
}
