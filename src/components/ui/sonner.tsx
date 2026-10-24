// File: sonner.tsx
// Path: src/components/ui/sonner.tsx

'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps['theme']) ?? 'system'}
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{ classNames: { toast: 'font-sans text-[13px]! rounded-lg!' } }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
}
