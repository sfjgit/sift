// File: Logo.tsx
// Path: src/components/common/Logo.tsx

'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  // unique per instance — a shared id breaks when the first copy is display:none
  const gid = `sfjbs-g-${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn('size-8 shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5b4cf5" />
          <stop offset="1" stopColor="#a03ce0" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${gid})`} />
      <path
        d="M9 20.5c1.6 1.5 3.6 2.3 6 2.3 3.2 0 5.2-1.5 5.2-3.7 0-2.3-1.9-3.1-5.1-3.8-2.6-.6-3.6-1-3.6-2.1 0-1 1-1.8 2.8-1.8 1.6 0 3 .6 4.2 1.6"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="23" cy="9.5" r="2" fill="#fff" fillOpacity=".85" />
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className="size-7" />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-bold tracking-tight">SFJBS</span>
          <span className="text-[10.5px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            CRM
          </span>
        </span>
      )}
    </span>
  );
}
