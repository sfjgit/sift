'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAxios } from '@/hooks/useAxios';
import { useAuth } from '@/context/AuthContext';
import { ChevronRight, ChevronDown, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface OrgNode {
  id: string;
  firstName: string;
  lastName: string;
  employeeId?: string | null;
  reportingToId?: string | null;
  teamLeadId?: string | null;
  depth: number;
  role?: { name: string } | null;
  department?: { name: string } | null;
  children?: OrgNode[];
}

function OrgNodeRow({ node, depth = 0 }: { node: OrgNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = (node.children?.length ?? 0) > 0;

  return (
    <div className={cn(depth > 0 && 'ml-4 border-l border-border/40 pl-3')}>
      <div
        className={cn(
          'flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors select-none',
          hasChildren && 'cursor-pointer hover:bg-muted/40'
        )}
        onClick={() => hasChildren && setExpanded(e => !e)}
      >
        <span className="w-3 shrink-0">
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )
          ) : null}
        </span>

        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-[9px] font-bold text-primary">
            {node.firstName?.[0]?.toUpperCase()}
            {node.lastName?.[0]?.toUpperCase()}
          </span>
        </div>

        <span className="text-xs font-medium truncate flex-1">
          {node.firstName} {node.lastName}
        </span>

        {node.role?.name && (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0 hidden sm:flex">
            {node.role.name}
          </Badge>
        )}

        {hasChildren && !expanded && (
          <span className="text-[10px] text-muted-foreground shrink-0">
            +{node.children!.length}
          </span>
        )}
      </div>

      {expanded &&
        node.children?.map(child => <OrgNodeRow key={child.id} node={child} depth={depth + 1} />)}
    </div>
  );
}

export function OrgTreePanel() {
  const { user } = useAuth();
  const axios = useAxios();

  const {
    data: tree,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['org-tree', user?.id],
    queryFn: async () => {
      const res = await axios.get(`/users/${user!.id}/tree`);
      // API returns { success: true, data: OrgNode } — already nested tree
      return res.data.data as OrgNode;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="px-4 py-3 flex flex-col gap-2.5">
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="flex items-center gap-2"
            style={{ paddingLeft: Math.min(i, 3) * 16 }}
          >
            <div className="h-6 w-6 rounded-full bg-muted animate-pulse shrink-0" />
            <div
              className="h-3 rounded bg-muted animate-pulse"
              style={{ width: `${120 - i * 10}px` }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (error || !tree) {
    return (
      <div className="flex flex-col items-center py-8 gap-2 text-muted-foreground">
        <User className="h-8 w-8 opacity-30" />
        <p className="text-xs">{error ? 'Failed to load org tree' : 'No org tree available'}</p>
      </div>
    );
  }

  return (
    <div className="px-2 py-2 overflow-auto max-h-80">
      <OrgNodeRow node={tree} depth={0} />
    </div>
  );
}
