// File: client.ts
// Path: src/lib/api/client.ts
//
// One axios instance for the whole app. Cookies carry the session (same-origin
// via the /api/proxy rewrite). A 401 triggers one shared refresh; concurrent
// requests wait on it, then replay. If refresh fails, listeners are told the
// session is gone (AuthProvider redirects to /sign-in).

import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import env from '@/config/env';
import type { ApiEnvelope, Paginated } from '@/types/api';

export const http = axios.create({
  baseURL: env.API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// ── normalized error ─────────────────────────────────────────────────────────

export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  fieldErrors: FieldError[];

  constructor(status: number, message: string, code?: string, fieldErrors: FieldError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export const toApiError = (err: unknown): ApiError => {
  if (err instanceof ApiError) return err;
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as
      | { message?: string; code?: string; errors?: FieldError[] }
      | undefined;
    if (!err.response) {
      return new ApiError(0, 'Can’t reach the server. Check your connection and try again.', 'NETWORK');
    }
    const fieldErrors = body?.errors ?? [];
    const message =
      fieldErrors.length && body?.message === 'Validation failed'
        ? fieldErrors.map(e => e.message).join(' · ')
        : (body?.message ?? err.message);
    return new ApiError(err.response.status, message, body?.code, fieldErrors);
  }
  return new ApiError(500, err instanceof Error ? err.message : 'Something went wrong');
};

// ── session expiry hooks ─────────────────────────────────────────────────────

type Listener = () => void;
const sessionExpiredListeners = new Set<Listener>();

export const onSessionExpired = (fn: Listener) => {
  sessionExpiredListeners.add(fn);
  return () => {
    sessionExpiredListeners.delete(fn);
  };
};

// ── refresh (single flight) ──────────────────────────────────────────────────

let refreshing: Promise<boolean> | null = null;

export const refreshSession = (): Promise<boolean> => {
  refreshing ??= axios
    .post(`${env.API_BASE}/auth/refresh`, {}, { withCredentials: true, timeout: 15000 })
    .then(() => true)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
};

// auth endpoints that must never trigger a refresh loop
const NO_REFRESH = ['/auth/login', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password'];

http.interceptors.response.use(
  res => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const url = original?.url ?? '';

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !NO_REFRESH.some(p => url.startsWith(p))
    ) {
      original._retry = true;
      if (await refreshSession()) return http(original);
      sessionExpiredListeners.forEach(fn => fn());
    }
    return Promise.reject(toApiError(error));
  }
);

// ── typed helpers — unwrap the { success, data, meta } envelope ──────────────

const clean = (params?: object) =>
  params
    ? Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
      )
    : undefined;

export const api = {
  async get<T>(url: string, params?: object, config?: AxiosRequestConfig): Promise<T> {
    const { data } = await http.get<ApiEnvelope<T>>(url, { ...config, params: clean(params) });
    return data.data;
  },
  async page<T>(url: string, params?: object): Promise<Paginated<T>> {
    const { data } = await http.get<ApiEnvelope<T[]>>(url, { params: clean(params) });
    return {
      data: data.data,
      meta: data.meta ?? { total: data.data.length, page: 1, limit: data.data.length, pages: 1 },
    };
  },
  async post<T>(url: string, body?: unknown): Promise<T> {
    const { data } = await http.post<ApiEnvelope<T>>(url, body);
    return data.data;
  },
  async put<T>(url: string, body?: unknown): Promise<T> {
    const { data } = await http.put<ApiEnvelope<T>>(url, body);
    return data.data;
  },
  async patch<T>(url: string, body?: unknown): Promise<T> {
    const { data } = await http.patch<ApiEnvelope<T>>(url, body);
    return data.data;
  },
  async delete<T = void>(url: string, params?: object): Promise<T> {
    const { data } = await http.delete<ApiEnvelope<T>>(url, { params: clean(params) });
    return data.data;
  },
};
