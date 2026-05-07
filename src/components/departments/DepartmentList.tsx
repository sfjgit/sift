// components/departments/DepartmentList.tsx
'use client';

import { useRouter } from 'next/navigation';
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
import { MoreHorizontal, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Department } from './types';

interface Props {
  departments: Department[];
  isLoading: boolean;
  canEdit: boolean;
  onEdit: (d: Department) => void;
  onToggle: (d: Department) => void;
}

function Row({
  dept,
  canEdit,
  onEdit,
  onToggle,
}: {
  dept: Department;
  canEdit: boolean;
  onEdit: (d: Department) => void;
  onToggle: (d: Department) => void;
}) {
  const router = useRouter();

  return (
    <div
      className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors group cursor-pointer"
      onClick={() => router.push(`/departments/${dept.id}`)}
    >
      <div
        className={cn(
          'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
          dept.isActive ? 'bg-primary/10' : 'bg-muted'
        )}
      >
        <Layers
          className={cn('h-4 w-4', dept.isActive ? 'text-primary' : 'text-muted-foreground')}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{dept.name}</span>
          {dept.code && (
            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {dept.code}
            </span>
          )}
        </div>
      </div>

      <span className="hidden sm:block text-xs text-muted-foreground tabular-nums">
        <span className="font-medium text-foreground">{dept._count.users}</span> users
      </span>

      <Badge
        variant={dept.isActive ? 'default' : 'outline'}
        className="text-[10px] shrink-0 hidden sm:flex"
      >
        {dept.isActive ? 'Active' : 'Inactive'}
      </Badge>

      {canEdit && (
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
              <DropdownMenuItem onClick={() => onEdit(dept)}>Edit</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onToggle(dept)}
                className={dept.isActive ? 'text-destructive focus:text-destructive' : ''}
              >
                {dept.isActive ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

function Skeleton_() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-4 w-16 hidden sm:block" />
          <Skeleton className="h-5 w-14 hidden sm:block" />
        </div>
      ))}
    </div>
  );
}

export function DepartmentList({ departments, isLoading, canEdit, onEdit, onToggle }: Props) {
  if (isLoading) return <Skeleton_ />;

  if (departments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
          <Layers className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <p className="text-sm font-medium">No departments yet</p>
        <p className="text-xs text-muted-foreground">Create your first department to get started</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {departments.map(d => (
        <Row key={d.id} dept={d} canEdit={canEdit} onEdit={onEdit} onToggle={onToggle} />
      ))}
    </div>
  );
}
