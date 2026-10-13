// File: UserStack.tsx
// Path: src/components/applicants/UserStack.tsx

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { avatarTone, getInitials, personName } from '@/components/applicants/utils';
import type { UserLite } from '@/types/applicant';

const DEFAULT_MAX = 3;

interface Props {
  users: (UserLite | null | undefined)[];
  max?: number;
}

export function UserStack({ users, max = DEFAULT_MAX }: Props) {
  // de-dupe by id, drop nulls
  const unique = [...new Map(users.filter((u): u is UserLite => !!u).map(u => [u.id, u])).values()];

  if (!unique.length) return <span className="text-sm text-muted-foreground">—</span>;

  const names = unique.map(personName);
  const shown = unique.slice(0, max);
  const extra = unique.length - shown.length;

  return (
    <div className="flex items-center gap-2" title={names.join(', ')}>
      <div className="flex -space-x-2">
        {shown.map(u => {
          const name = personName(u);
          return (
            <Avatar key={u.id} className="h-7 w-7 border-2 border-background">
              <AvatarFallback className={cn('text-[10px] font-semibold', avatarTone(name))}>
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
          );
        })}
        {extra > 0 && (
          <Avatar className="h-7 w-7 border-2 border-background">
            <AvatarFallback className="bg-muted text-[10px] font-semibold">+{extra}</AvatarFallback>
          </Avatar>
        )}
      </div>
      {unique.length === 1 && <span className="whitespace-nowrap text-sm">{names[0]}</span>}
    </div>
  );
}
