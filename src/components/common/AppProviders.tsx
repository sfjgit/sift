// File: AppProviders.tsx
// Path: src/components/common/AppProviders.tsx

'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { ConfirmProvider } from './ConfirmProvider';
import type { ApiError } from '@/lib/api/client';

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // 4xx won't fix itself — only retry network / server errors
            retry: (count, err) => count < 2 && ((err as ApiError).status ?? 500) >= 500,
          },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={client}>
        <AuthProvider>
          <TooltipProvider delayDuration={250}>
            <ConfirmProvider>{children}</ConfirmProvider>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
