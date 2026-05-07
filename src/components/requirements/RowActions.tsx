// components/requirements/RowActions.tsx
'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { STATUS_OPTIONS, VALID_TRANSITIONS } from './constants';
import type { RequirementStatus } from './types';
import { RequirementListItem } from '@/types/requirements.types';

interface Props {
  req: RequirementListItem;
  canEdit: boolean;
  onStatusChange: (req: RequirementListItem, to: RequirementStatus) => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
}

export function RowActions({ req, canEdit, onStatusChange, onView, onEdit }: Props) {
  const transitions = VALID_TRANSITIONS[req.status];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onView(req.id)}>View detail</DropdownMenuItem>
        {canEdit && <DropdownMenuItem onClick={() => onEdit(req.id)}>Edit</DropdownMenuItem>}
        {canEdit && transitions.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {transitions.map(to => (
              <DropdownMenuItem key={to} onClick={() => onStatusChange(req, to)}>
                Move to {STATUS_OPTIONS.find(s => s.value === to)?.label ?? to}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
