// File: ColumnsMenu.tsx
// Path: src/components/data-table/ColumnsMenu.tsx
//
// Show / hide and drag-to-reorder columns, plus row density.

'use client';

import type { Table } from '@tanstack/react-table';
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Columns3, GripVertical, Rows2, Rows4 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Segmented } from '@/components/ui/segmented';
import { tourTarget } from '@/features/tour/tour.constants';
import type { TableController } from './useTableState';
import type { Density } from './types';

function SortableRow({
  id,
  label,
  checked,
  locked,
  onToggle,
}: {
  id: string;
  label: string;
  checked: boolean;
  locked?: boolean;
  onToggle: (v: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: locked });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted ${isDragging ? 'z-10 bg-muted shadow-sm' : ''}`}
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground disabled:cursor-default disabled:opacity-30"
        disabled={locked}
        aria-label={`Reorder ${label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>
      <Checkbox checked={checked} disabled={locked} onCheckedChange={v => onToggle(!!v)} id={`col-${id}`} />
      <label htmlFor={`col-${id}`} className="flex-1 cursor-pointer truncate text-[13px]">
        {label}
      </label>
    </div>
  );
}

export function ColumnsMenu<T>({ table, controller }: { table: Table<T>; controller: TableController }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const cols = table.getAllLeafColumns().filter(c => c.id !== '__select' && c.id !== '__actions');
  const ids = cols.map(c => c.id);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    controller.actions.setColumnOrder(next);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" {...tourTarget('table-columns')}>
          <Columns3 />
          <span className="hidden sm:inline">Columns</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 gap-0 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-xs font-semibold">Row density</span>
          <Segmented<Density>
            size="xs"
            value={controller.state.density}
            onChange={controller.actions.setDensity}
            options={[
              { value: 'compact', icon: Rows4, title: 'Compact' },
              { value: 'comfortable', icon: Rows2, title: 'Comfortable' },
            ]}
          />
        </div>
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <span className="text-xs font-semibold">Columns</span>
          <button type="button" className="text-xs text-primary hover:underline" onClick={controller.actions.resetColumns}>
            Reset
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto px-1.5 pb-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              {cols.map(c => (
                <SortableRow
                  key={c.id}
                  id={c.id}
                  label={c.columnDef.meta?.label ?? c.id}
                  checked={c.getIsVisible()}
                  locked={c.columnDef.meta?.locked}
                  onToggle={v => c.toggleVisibility(v)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </PopoverContent>
    </Popover>
  );
}
