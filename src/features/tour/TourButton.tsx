// File: TourButton.tsx
// Path: src/features/tour/TourButton.tsx

'use client';

import type { ButtonHTMLAttributes } from 'react';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { useTourStore } from './tourStore';
import { getTour } from './tours';
import { tourTarget } from './tour.constants';

interface TourButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  tourId: string;
  label?: string;
  /** Optional data-tour key so the tour itself can point at this button. */
  tourKey?: string;
}

/** Replays a tour on demand. Works on any page whose tour is registered. */
export function TourButton({
  tourId,
  label = 'Take tour',
  tourKey,
  className,
  disabled,
  ...rest
}: TourButtonProps) {
  const exists = !!getTour(tourId);

  return (
    <button
      type="button"
      {...rest}
      {...(tourKey ? tourTarget(tourKey) : {})}
      disabled={disabled || !exists}
      onClick={() => useTourStore.getState().start(tourId)}
      className={cn(buttonVariants({ variant: 'outline' }), 'text-xs', className)}
    >
      <HelpCircle className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
