// File: StatCard.tsx
// Path: src/components/applicants/StatCard.tsx

import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TONE_CLASSES, type PillTone } from '@/components/applicants/StatusPill';

interface Props {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: PillTone;
  hint?: string;
}

export function StatCard({ label, value, icon: Icon, tone, hint }: Props) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            TONE_CLASSES[tone]
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight">{value.toLocaleString()}</p>
          {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
