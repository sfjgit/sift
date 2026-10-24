// File: not-found.tsx
// Path: src/app/not-found.tsx

import Link from 'next/link';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/common/Logo';

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <Logo />
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Compass className="size-7" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">This page doesn’t exist</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The link may be old, or the page moved when we rebuilt the CRM.
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/help">Help center</Link>
        </Button>
      </div>
    </div>
  );
}
