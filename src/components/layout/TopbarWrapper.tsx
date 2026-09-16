// File: TopbarWrapper.tsx
// Path: src/components/layout/TopbarWrapper.tsx

'use client';

import { usePathname } from 'next/navigation';
import { Topbar } from './Topbar';

export function TopbarWrapper() {
  const pathname = usePathname();
  if (pathname.startsWith('/reports')) return null;
  return <Topbar />;
}
