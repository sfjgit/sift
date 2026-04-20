import { Requirement, TeamRef } from './core.types';

export interface ClientContact {
  id: string;
  clientId: string;
  firstName: string;
  lastName: string | null;
  designation: string | null;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface ClientHandler {
  id: string;
  clientId: string;
  userId: string;
  role: 'PRIMARY' | 'SECONDARY' | 'BACKUP';
  assignedById: string;
  assignedAt: string;
}

export interface BusinessUnit {
  id: string;
  name: string;
  isActive: boolean;
  parentBUId: string | null;
  createdAt: string;
}

export interface TeamAssignment {
  id: string;
  clientId: string;
  teamId: string;
  team: TeamRef;
  assignedById: string;
  assignedAt: string;
}

export interface Client {
  id: string;
  name: string;
  vmsName: string | null;
  category: string | null;
  industry: string | null;
  website: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  businessUnitId: string | null;
  createdById: string;
  approvedById: string | null;
  approvedAt: string | null;
  parentClientId: string | null;
  createdAt: string;
  updatedAt: string;
  businessUnit: BusinessUnit | null;
  teamAssignments: TeamAssignment[];
  requirements: Requirement[];
  contacts: ClientContact[];
  handlers: ClientHandler[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ClientsResponse {
  success: boolean;
  data: Client[];
  pagination: PaginationMeta;
}

export interface ContactFormValues {
  firstName: string;
  lastName: string;
  designation: string;
  officeNumber: string;
  officeExtension: string;
  mobileNumber: string;
  pocEmailId: string;
  secondaryEmailId: string;
  primaryOwnerId: string;
  ownership: string;
  allowAccessAll: boolean;
  address1: string;
  address2: string;
  country: string;
  state: string;
  city: string;
  zipCode: string;
  linkedinUrl: string;
  status: 'ACTIVE' | 'INACTIVE' | '';
  clientGroup: string;
  aboutContact: string;
  isPrimary: boolean;
}

export const DEFAULT_CONTACT: ContactFormValues = {
  firstName: '',
  lastName: '',
  designation: '',
  officeNumber: '',
  officeExtension: '',
  mobileNumber: '',
  pocEmailId: '',
  secondaryEmailId: '',
  primaryOwnerId: '',
  ownership: '',
  allowAccessAll: false,
  address1: '',
  address2: '',
  country: 'India',
  state: 'Karnataka',
  city: '',
  zipCode: '',
  linkedinUrl: '',
  status: '',
  clientGroup: '',
  aboutContact: '',
  isPrimary: false,
};
