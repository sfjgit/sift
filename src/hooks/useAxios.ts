// File: useAxios.ts
// Path: src/hooks/useAxios.ts

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useMemo, useCallback } from 'react';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { useRouter } from 'next/navigation';

// ============================================
// SHARED REFRESH PROMISE (prevents duplicate refresh calls)
// ============================================
let refreshPromise: Promise<boolean> | null = null;

// ============================================
// AXIOS HOOK
// ============================================
interface FailedRequest {
  resolve: (value: unknown) => void;
  reject: (reason?: any) => void;
}

export const useAxios = (): AxiosInstance => {
  const router = useRouter();
  const isRefreshingRef = useRef(false);
  const failedQueueRef = useRef<FailedRequest[]>([]);

  const processQueue = (error: unknown | null) => {
    failedQueueRef.current.forEach(({ resolve, reject }) => {
      if (error) reject(error);
      else resolve(null);
    });
    failedQueueRef.current = [];
  };

  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (refreshPromise) {
      console.log('⏳ Refresh already in progress, waiting...');
      return refreshPromise;
    }

    refreshPromise = performTokenRefresh();

    try {
      return await refreshPromise;
    } finally {
      refreshPromise = null;
    }
  }, []);

  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: '/api/proxy/core/api', // ✅ Next.js proxy — same origin, no CORS
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // ============================================
    // RESPONSE INTERCEPTOR - Handle 401 & refresh
    // ============================================
    instance.interceptors.response.use(
      response => response,
      async (error: AxiosError) => {
        const originalRequest: any = error.config;

        if (error.response?.status === 401 && !originalRequest?._retry) {
          // Queue concurrent requests while refresh is in progress
          if (isRefreshingRef.current) {
            return new Promise((resolve, reject) => {
              failedQueueRef.current.push({ resolve, reject });
            })
              .then(() => instance(originalRequest))
              .catch(err => Promise.reject(err));
          }

          originalRequest._retry = true;
          isRefreshingRef.current = true;

          try {
            const refreshed = await refreshToken();

            if (!refreshed) {
              processQueue(new Error('Refresh token expired'));
              router.push('/sign-in');
              return Promise.reject(error);
            }

            processQueue(null);
            return instance(originalRequest);
          } catch (refreshError) {
            processQueue(refreshError);
            router.push('/sign-in');
            return Promise.reject(refreshError);
          } finally {
            isRefreshingRef.current = false;
          }
        }

        return Promise.reject(error);
      }
    );

    return instance;
  }, [router, refreshToken]);

  return api;
};

// ============================================
// SHARED REFRESH LOGIC
// ============================================
const performTokenRefresh = async (retries = 2): Promise<boolean> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Refreshing token (attempt ${attempt + 1})...`);

      await axios.post(
        '/api/proxy/core/api/auth/refresh', // ✅ Next.js proxy — same origin
        {},
        { withCredentials: true, timeout: 10000 }
      );

      console.log('✅ Token refreshed successfully');
      return true;
    } catch (error: any) {
      const isNetworkError = !error.response;
      const isServerError = error.response?.status >= 500;

      if ((isNetworkError || isServerError) && attempt < retries) {
        console.warn(`⚠️ Refresh attempt ${attempt + 1} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }

      console.error('❌ Token refresh failed:', error);
      return false;
    }
  }
  return false;
};

// ============================================
// AUTO-REHYDRATE ON PAGE LOAD
// ============================================
export const rehydrateAuth = async (): Promise<boolean> => {
  if (refreshPromise) {
    console.log('⏳ Refresh already in progress, waiting...');
    return refreshPromise;
  }

  console.log('🔄 Rehydrating auth on page load...');
  refreshPromise = performTokenRefresh();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
};
