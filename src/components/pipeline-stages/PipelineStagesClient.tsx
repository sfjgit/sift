'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Globe } from 'lucide-react';
import { usePipelineStages, PipelineStage, useUpdateStage } from './usePipelineStages';
import { StageFormDialog } from './StageFormDialog';
import { DeleteStageDialog } from './DeleteStageDialog';
import { cn } from '@/lib/utils';

const ORDER_COLORS: Record<number, string> = {
  1: 'bg-slate-100 text-slate-700 border-slate-300',
  2: 'bg-blue-50 text-blue-700 border-blue-200',
  3: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  4: 'bg-violet-50 text-violet-700 border-violet-200',
  5: 'bg-purple-50 text-purple-700 border-purple-200',
  6: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  7: 'bg-pink-50 text-pink-700 border-pink-200',
  8: 'bg-rose-50 text-rose-700 border-rose-200',
  9: 'bg-orange-50 text-orange-700 border-orange-200',
  10: 'bg-green-50 text-green-700 border-green-200',
};

export default function PipelineStagesClient() {
  const { data: stages = [], isLoading } = usePipelineStages();
  const updateStage = useUpdateStage();

  const [formOpen, setFormOpen] = useState(false);
  const [editStage, setEditStage] = useState<PipelineStage | null>(null);
  const [deleteStage, setDeleteStage] = useState<PipelineStage | null>(null);

  const grouped = stages.reduce<Record<number, PipelineStage[]>>((acc, s) => {
    if (!acc[s.order]) acc[s.order] = [];
    acc[s.order].push(s);
    return acc;
  }, {});

  const sortedOrders = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b);

  const openCreate = () => {
    setEditStage(null);
    setFormOpen(true);
  };
  const openEdit = (stage: PipelineStage) => {
    setEditStage(stage);
    setFormOpen(true);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden">
      {/* Header */}
      <div className="flex-none px-6 pt-5 pb-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Pipeline Stages</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage the recruitment funnel sequence.
            </p>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" /> New Stage
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-none flex items-center gap-4 px-6 py-2.5 border-b bg-muted/20 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Globe className="h-3 w-3" />
          <span>No service line = applies to all</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
          <span>Same order = service-line variants (e.g. 07A / 07B)</span>
        </div>
      </div>

      {/* Stages list */}
      <div className="flex-1 min-h-0 overflow-auto px-6 py-5">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-2 max-w-3xl">
            {sortedOrders.map(order => {
              const group = grouped[order];
              const isVariantGroup = group.length > 1;

              return (
                <div
                  key={order}
                  className={cn(
                    'rounded-lg border overflow-hidden',
                    isVariantGroup && 'border-amber-200'
                  )}
                >
                  {isVariantGroup && (
                    <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-200">
                      <p className="text-[10px] text-amber-700 font-medium uppercase tracking-wide">
                        Order {order} — Service-line variants
                      </p>
                    </div>
                  )}

                  {group.map((stage, idx) => {
                    const stageColor = ORDER_COLORS[stage.order] ?? 'bg-slate-100 text-slate-600';

                    return (
                      <div
                        key={stage.id}
                        className={cn(
                          'flex items-center gap-4 px-4 py-3',
                          !stage.isActive && 'opacity-50',
                          idx > 0 && 'border-t border-amber-100'
                        )}
                      >
                        {/* Code badge */}
                        <div className="shrink-0 w-10 text-center">
                          <span
                            className={cn(
                              'text-xs font-mono font-bold px-1.5 py-0.5 rounded border',
                              stageColor
                            )}
                          >
                            {stage.code}
                          </span>
                        </div>

                        {/* Label + meta badges */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={cn(
                                'text-sm font-medium',
                                !stage.isActive && 'line-through text-muted-foreground'
                              )}
                            >
                              {stage.label}
                            </span>
                            {stage.isTerminal && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-200"
                              >
                                Terminal
                              </Badge>
                            )}
                            {!stage.isMandatory && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 text-muted-foreground"
                              >
                                Optional
                              </Badge>
                            )}
                            {stage.serviceLine ? (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {stage.serviceLine.name}
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Globe className="h-2.5 w-2.5" /> All service lines
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Active toggle */}
                        <div className="shrink-0 flex items-center gap-2">
                          <Switch
                            checked={stage.isActive}
                            onCheckedChange={v => updateStage.mutate({ id: stage.id, isActive: v })}
                            className="data-[state=checked]:bg-emerald-500"
                          />
                          <span className="text-xs text-muted-foreground w-14">
                            {stage.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="shrink-0 flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(stage)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteStage(stage)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {stages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center py-20 border rounded-lg border-dashed">
                <p className="text-sm text-muted-foreground">No pipeline stages found</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Run the seed script to create the default 01–10 stages
                </p>
                <Button variant="link" size="sm" className="mt-2" onClick={openCreate}>
                  Or create manually
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <StageFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditStage(null);
        }}
        stage={editStage}
      />
      <DeleteStageDialog stage={deleteStage} onClose={() => setDeleteStage(null)} />
    </div>
  );
}
