'use client';

import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/context/AuthContext';
import type { ReactNode } from 'react';

interface ClientProvidersProps {
  children: ReactNode;
}

/**
 * ClientProviders
 *
 * Single boundary for all client-side context/providers.
 * Import into layout.tsx so the root tree stays a server component.
 *
 * Stack:
 *  - ThemeProvider (next-themes)  — dark/light/system toggle
 *  - AuthProvider                 — session state (user, login, logout)
 *  - Toaster (sonner)             — toast notifications
 */
export default function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ThemeProvider
      attribute="class" // injects .dark on <html>
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast:
                'bg-card text-card-foreground border border-border shadow-lg rounded-lg text-sm',
              title: 'font-medium',
              description: 'text-muted-foreground',
              actionButton: 'bg-primary text-primary-foreground',
              cancelButton: 'bg-muted text-muted-foreground',
              error: 'border-destructive/40',
              success: 'border-chart-4/40',
            },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
