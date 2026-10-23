// File: ImpersonationBanner.tsx
// Path: src/components/layout/ImpersonationBanner.tsx

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getImpersonationTarget, useImpersonation, ImpersonationTarget } from '@/lib/impersonation';

export function ImpersonationBanner() {
  const impersonation = useImpersonation();
  const [target, setTarget] = useState<ImpersonationTarget | null>(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => setTarget(getImpersonationTarget()), []);

  if (!target) return null;

  const handleExit = async () => {
    setExiting(true);
    await impersonation.stop();
  };

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-amber-500 px-4 py-1.5 text-sm text-black">
      <span>
        Logged in as <strong>{target.name}</strong> ({target.email})
      </span>
      <Button size="sm" variant="outline" className="h-7" onClick={handleExit} disabled={exiting}>
        {exiting ? 'Exiting...' : 'Exit'}
      </Button>
    </div>
  );
}
