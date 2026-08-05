// File: ticket.types.ts
// Path: src/types/ticket.types.ts

export interface TicketCategory {
  id: string;
  name: string;
  isActive: boolean;
  _count?: { tickets: number };
}

export interface TicketAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url?: string | null;
  createdAt: string;
}

export interface Ticket {
  id: string;
  seq: number;
  ticketNumber?: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
  raisedById: string;
  assignedToId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  attachments?: TicketAttachment[];
  _count?: { attachments: number };
}

export interface TicketMeta {
  statuses: string[];
  priorities: string[];
  categories: { id: string; name: string }[];
}

export interface TicketFilters {
  page: number;
  limit: number;
  search?: string;
  status?: string[];
  priority?: string[];
  categoryId?: string;
}
