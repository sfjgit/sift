// File: HeaderDnd.tsx
// Path: src/components/data-table/HeaderDnd.tsx
//
// Drag a column header left / right to move that column, right in the table.
// The first (locked) column, the select box and the ⋯ column stay put. A plain
// click still sorts (dragging starts only after the pointer moves 6px).

'use client';

import type { CSSProperties, ReactNode } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

// headers only slide sideways
const sideways: Modifier = ({ transform }) => ({ ...transform, y: 0 });

export function HeaderDnd({
  ids,
  fixed,
  onMove,
  children,
}: {
  /** every header in the row, in order */
  ids: string[];
  /** headers that can't move and can't be dropped on */
  fixed: Set<string>;
  onMove: (activeId: string, overId: string) => void;
  children: ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || fixed.has(String(over.id))) return;
    onMove(String(active.id), String(over.id));
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[sideways]}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

export function DragTh({
  id,
  draggable,
  className,
  style,
  children,
}: {
  id: string;
  draggable: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !draggable,
  });
  return (
    <th
      ref={setNodeRef}
      style={{ ...style, transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        className,
        draggable && 'cursor-grab active:cursor-grabbing',
        isDragging && 'relative z-30 opacity-90 shadow-lg ring-2 ring-primary/40'
      )}
      title={draggable ? 'Drag to move this column' : undefined}
      {...(draggable ? { ...attributes, ...listeners, role: 'columnheader' } : {})}
    >
      {children}
    </th>
  );
}
