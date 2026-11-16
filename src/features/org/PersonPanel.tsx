// File: PersonPanel.tsx
// Path: src/features/org/PersonPanel.tsx
//
// The side panel of the org chart: one person — role, who they report to,
// their team, what they carry — with links to their clients and SPOCs.

'use client';

import Link from 'next/link';
import { Building2, ContactRound, ListTodo, Sparkles, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { openAiDock } from '@/features/ai/speech';
import { fullNameOf, initialsOf, roleTheme } from './OrgChart';
import type { OrgNode } from './types';

export function PersonPanel({ node, boss, onClose, onPick }: { node: OrgNode; boss: OrgNode | null; onClose: () => void; onPick: (n: OrgNode) => void }) {
  const t = roleTheme(node.role.name);
  const name = fullNameOf(node);
  const stat = (label: string, value: number, icon: typeof Users, href?: string, warn?: boolean) => {
    const Icon = icon;
    const body = (
      <span className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 transition-colors hover:border-primary/40">
        <Icon className="size-4 text-muted-foreground" />
        <span className="flex-1 text-[13px]">{label}</span>
        <span className={`text-base font-semibold tabular-nums ${warn && value ? 'text-destructive' : ''}`}>{value}</span>
      </span>
    );
    return href ? (
      <Link key={label} href={href}>
        {body}
      </Link>
    ) : (
      <span key={label}>{body}</span>
    );
  };
  return (
    <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-11 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: t.strip }}>
          {initialsOf(node)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{name}</p>
          <span className="mt-0.5 inline-block rounded px-1.5 py-px text-[11px] font-semibold" style={{ background: t.badge, color: t.text }}>
            {node.role.name}
          </span>
          {(node.designation || node.department) && (
            <p className="mt-1 text-xs text-muted-foreground">{[node.designation, node.department?.name].filter(Boolean).join(' · ')}</p>
          )}
        </div>
        <button type="button" aria-label="Close" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>

      {boss && !boss.virtual && (
        <button type="button" onClick={() => onPick(boss)} className="rounded-lg border bg-card px-3 py-2 text-left text-[13px] hover:border-primary/40">
          <span className="text-xs text-muted-foreground">Reports to</span>
          <span className="block font-medium">{fullNameOf(boss)}</span>
        </button>
      )}

      <div className="space-y-1.5">
        {stat('People below', node.teamSize, Users)}
        {stat('Clients assigned', node.stats.clients, Building2, node.virtual ? undefined : `/clients?assignedToId=${node.id}`)}
        {stat('SPOCs handled', node.stats.spocs, ContactRound, node.virtual ? undefined : `/spocs?handlerId=${node.id}`)}
        {stat('Open tasks', node.stats.openTasks, ListTodo)}
        {stat('Overdue', node.stats.overdue, ListTodo, undefined, true)}
      </div>

      {node.children.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Reports directly ({node.children.length})</p>
          <ul className="space-y-1">
            {node.children.slice(0, 30).map(c => (
              <li key={c.id}>
                <button type="button" onClick={() => onPick(c)} className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-[13px] hover:bg-muted">
                  <span className="truncate">{fullNameOf(c)}</span>
                  <span className="text-xs text-muted-foreground">{c.role.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!node.virtual && (
        <Button variant="outline" size="sm" onClick={() => openAiDock(`Workload of ${name}'s team`)}>
          <Sparkles /> Ask AI about {node.firstName}&apos;s team
        </Button>
      )}
    </aside>
  );
}
