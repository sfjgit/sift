'use client';

import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OrgZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export function OrgZoomControls({ zoom, onZoomIn, onZoomOut, onReset }: OrgZoomControlsProps) {
  return (
    <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/30 shrink-0">
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onZoomOut}>
        <ZoomOut className="h-3.5 w-3.5" />
      </Button>
      <button
        onClick={onReset}
        className="text-[11px] tabular-nums font-semibold w-12 text-center text-muted-foreground hover:text-foreground transition-colors"
      >
        {Math.round(zoom * 100)}%
      </button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onZoomIn}>
        <ZoomIn className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onReset}>
        <Maximize2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
