// components/service-lines/ServiceLineList.tsx
'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ServiceLine, ServiceLinePermissions } from './types';
import { useRouter } from 'next/navigation';

interface Props {
  serviceLines: ServiceLine[];
  isLoading: boolean;
  permissions?: ServiceLinePermissions;
  onEdit: (sl: ServiceLine) => void;
  onToggle: (sl: ServiceLine) => void;
}

function ServiceLineRow({
  sl,
  permissions,
  onEdit,
  onToggle,
}: {
  sl: ServiceLine;
  permissions?: ServiceLinePermissions;
  onEdit: (sl: ServiceLine) => void;
  onToggle: (sl: ServiceLine) => void;
}) {
  const router = useRouter();
  return (
    <div
      className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors group cursor-pointer"
      onClick={() => router.push(`/service-lines/${sl.id}`)}
    >
      {/* icon */}
      <div
        className={cn(
          'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
          sl.isActive ? 'bg-primary/10' : 'bg-muted'
        )}
      >
        <GitBranch
          className={cn('h-4 w-4', sl.isActive ? 'text-primary' : 'text-muted-foreground')}
        />
      </div>

      {/* name + code */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{sl.name}</span>
          {sl.code && (
            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {sl.code}
            </span>
          )}
        </div>
      </div>

      {/* counts */}
      <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
        <span className="tabular-nums">
          <span className="font-medium text-foreground">{sl._count.requirements}</span> reqs
        </span>
        <span className="tabular-nums">
          <span className="font-medium text-foreground">{sl._count.clientSpocs}</span> SPOCs
        </span>
      </div>

      {/* status */}
      <Badge
        variant={sl.isActive ? 'default' : 'outline'}
        className="text-[10px] shrink-0 hidden sm:flex"
      >
        {sl.isActive ? 'Active' : 'Inactive'}
      </Badge>

      {/* actions */}
      {permissions?.canEdit && (
        <div
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={e => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onEdit(sl)}>Edit</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onToggle(sl)}
                className={sl.isActive ? 'text-destructive focus:text-destructive' : ''}
              >
                {sl.isActive ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

function ServiceLineSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="flex-1 flex flex-col gap-1.5">
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-4 w-20 hidden sm:block" />
          <Skeleton className="h-5 w-14 hidden sm:block" />
        </div>
      ))}
    </div>
  );
}

export function ServiceLineList({ serviceLines, isLoading, permissions, onEdit, onToggle }: Props) {
  if (isLoading) return <ServiceLineSkeleton />;

  if (serviceLines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
          <GitBranch className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <p className="text-sm font-medium">No service lines yet</p>
        <p className="text-xs text-muted-foreground">
          Create your first service line to get started
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {serviceLines.map(sl => (
        <ServiceLineRow
          key={sl.id}
          sl={sl}
          permissions={permissions}
          onEdit={onEdit}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
