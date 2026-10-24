// File: error.tsx
// Path: src/app/(app)/error.tsx
//
// Catches render errors inside the app shell so one broken widget doesn't
// blank the whole workspace.

'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/common/states';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      title="Something went wrong on this page"
      error={new Error('The rest of the app still works. Try again, or head back to the dashboard.')}
      onRetry={reset}
      className="min-h-[60vh]"
    />
  );
}
