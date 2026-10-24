// File: CompanyMark.tsx
// Path: src/components/common/CompanyMark.tsx

import { cn } from '@/lib/utils';

const HUES = [279, 182, 236, 310, 135, 72, 12, 200];

export function CompanyMark({ name, className, size = 'md' }: { name: string; className?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hue = HUES[h % HUES.length];
  const letters = name
    .replace(/\b(pvt|private|ltd|limited|llp|inc|the)\b\.?/gi, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg font-semibold',
        size === 'sm' && 'size-6 text-[10px]',
        size === 'md' && 'size-8 text-xs',
        size === 'lg' && 'size-11 text-sm',
        size === 'xl' && 'size-14 rounded-xl text-lg',
        className
      )}
      style={{
        background: `linear-gradient(135deg, oklch(0.94 0.05 ${hue}), oklch(0.88 0.08 ${hue + 20}))`,
        color: `oklch(0.38 0.13 ${hue})`,
      }}
    >
      {letters || '?'}
    </span>
  );
}
