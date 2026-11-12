// File: UserAvatar.tsx
// Path: src/components/common/UserAvatar.tsx

import { cn } from '@/lib/utils';
import { fullName, initials } from '@/lib/format';

type Named = {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
};

// Deterministic hue per person so the same user always gets the same colour
const HUES = [279, 182, 72, 12, 236, 310, 135, 30, 200, 340];
const hueFor = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
};

const SIZES = {
  xs: 'size-5 text-[10px]',
  sm: 'size-6 text-[11px]',
  md: 'size-8 text-xs',
  lg: 'size-10 text-sm',
  xl: 'size-14 text-lg',
} as const;

export function UserAvatar({
  person,
  size = 'sm',
  className,
}: {
  person?: Named | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const hue = hueFor(person?.id ?? fullName(person));
  return (
    <span
      title={fullName(person)}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none',
        SIZES[size],
        className
      )}
      style={{
        background: `oklch(0.93 0.05 ${hue})`,
        color: `oklch(0.42 0.14 ${hue})`,
      }}
    >
      {initials(person)}
    </span>
  );
}

export function PersonCell({
  person,
  sub,
  size = 'sm',
  inline = false,
}: {
  person?: Named | null;
  sub?: React.ReactNode;
  size?: keyof typeof SIZES;
  /** sub text beside the name (one line, for sheet rows) instead of under it */
  inline?: boolean;
}) {
  if (!person) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex min-w-0 items-center gap-2">
      <UserAvatar person={person} size={size} />
      <span className={cn('min-w-0', inline && 'flex items-baseline gap-2')}>
        <span className={cn('truncate', inline ? 'shrink-0' : 'block')}>{fullName(person)}</span>
        {sub && (
          <span className={cn('truncate text-xs text-muted-foreground', !inline && 'block')}>
            {sub}
          </span>
        )}
      </span>
    </span>
  );
}
