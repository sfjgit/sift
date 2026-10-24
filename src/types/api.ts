// File: api.ts
// Path: src/types/api.ts
//
// Envelope + shared shapes returned by crm-core-service.

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: PageMeta;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export type SortDir = 'asc' | 'desc';

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortDir?: SortDir;
  [filter: string]: string | number | boolean | undefined | null;
}

export interface Person {
  id: string;
  firstName: string;
  lastName: string | null;
}

export interface LookupRef {
  id: string;
  code: string;
  label: string;
}

export interface NamedRef {
  id: string;
  name: string;
}
