'use client';

import type { OrgNode } from './types';
import { flattenTree } from './org.utils';

export function OrgStatsBar({ tree }: { tree: OrgNode }) {
  const all = flattenTree(tree);
  const active = all.filter(n => n.isActive).length;
  const maxDepth = Math.max(...all.map(n => n.depth));

  const roleCount = new Map<string, number>();
  all.forEach(n => roleCount.set(n.role.name, (roleCount.get(n.role.name) ?? 0) + 1));
  const topRole = [...roleCount.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {[
        { label: 'Total', value: all.length },
        { label: 'Active', value: active },
        { label: 'Levels', value: maxDepth + 1 },
        ...(topRole ? [{ label: topRole[0], value: topRole[1] }] : []),
      ].map(s => (
        <div key={s.label} className="flex items-center gap-1.5">
          <span className="text-lg font-bold tabular-nums">{s.value}</span>
          <span className="text-xs text-muted-foreground">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
