// File: segmented.tsx
// Path: src/components/ui/segmented.tsx
//
// Compact single-choice toggle (Day / Week / Month, Bar / Line ...).

'use client';

import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label?: string;
  icon?: LucideIcon;
  title?: string;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'sm',
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegmentedOption<T>[];
  className?: string;
  size?: 'sm' | 'xs';
}) {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value}
      onValueChange={v => v && onChange(v as T)}
      className={cn('inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5', className)}
    >
      {options.map(o => (
        <ToggleGroupPrimitive.Item
          key={o.value}
          value={o.value}
          title={o.title ?? o.label}
          aria-label={o.title ?? o.label}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2.5 font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm',
            size === 'sm' ? 'h-7 text-xs' : 'h-6 text-[11px]'
          )}
        >
          {o.icon && <o.icon className="size-3.5" />}
          {o.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );
}
