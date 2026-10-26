// File: ViewsMenu.tsx
// Path: src/components/data-table/ViewsMenu.tsx
//
// Saved views backed by /views. A view stores search, filters, sort, columns,
// density and page size. Your default view opens automatically (unless the
// URL already carries filters). Shared views are read-only for others.

'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bookmark, Check, ChevronDown, Globe2, Plus, Save, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { viewsApi } from '@/lib/api/endpoints';
import { usePermissions } from '@/features/auth/usePermissions';
import { tourTarget } from '@/features/tour/tour.constants';
import type { ApiError } from '@/lib/api/client';
import type { SavedView } from '@/types/org';
import type { TableViewConfig } from './types';
import type { TableController } from './useTableState';

export const viewKeys = (module: string) => ['views', module] as const;

export function ViewsMenu({ module, controller }: { module: string; controller: TableController }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dialog, setDialog] = useState(false);
  const autoApplied = useRef(false);

  const { data: views = [] } = useQuery({
    queryKey: viewKeys(module),
    queryFn: () => viewsApi.list<TableViewConfig>(module),
    staleTime: 60_000,
  });

  // open the user's default view once, unless the link already has filters
  useEffect(() => {
    if (autoApplied.current || controller.fromUrl || !views.length) return;
    autoApplied.current = true;
    const def = views.find(v => v.isOwner && v.isDefault);
    if (def) {
      // one-time sync once the user's views arrive from the server
      /* eslint-disable react-hooks/set-state-in-effect */
      controller.actions.applyView(def.config);
      setActiveId(def.id);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [views, controller]);

  const refresh = () => qc.invalidateQueries({ queryKey: viewKeys(module) });
  const active = views.find(v => v.id === activeId);
  const mine = views.filter(v => v.isOwner);
  const shared = views.filter(v => !v.isOwner);

  const apply = (v: SavedView<TableViewConfig>) => {
    controller.actions.applyView(v.config);
    setActiveId(v.id);
  };

  const updateActive = async () => {
    if (!active?.isOwner) return;
    try {
      await viewsApi.update(active.id, { config: controller.captureView() });
      toast.success(`“${active.name}” updated`);
      refresh();
    } catch (e) {
      toast.error((e as ApiError).message);
    }
  };

  const toggleDefault = async (v: SavedView<TableViewConfig>) => {
    try {
      await viewsApi.update(v.id, { isDefault: !v.isDefault });
      refresh();
    } catch (e) {
      toast.error((e as ApiError).message);
    }
  };

  const remove = async (v: SavedView<TableViewConfig>) => {
    if (
      !(await confirm({
        title: `Delete view “${v.name}”?`,
        destructive: true,
        confirmLabel: 'Delete',
      }))
    )
      return;
    try {
      await viewsApi.remove(v.id);
      if (activeId === v.id) setActiveId(null);
      toast.success('View deleted');
      refresh();
    } catch (e) {
      toast.error((e as ApiError).message);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="max-w-52" {...tourTarget('table-views')}>
            <Bookmark />
            <span className="truncate">{active?.name ?? 'Views'}</span>
            <ChevronDown className="opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          {mine.length > 0 && <DropdownMenuLabel>My views</DropdownMenuLabel>}
          {mine.map(v => (
            <DropdownMenuItem key={v.id} onSelect={() => apply(v)} className="group">
              <Check className={v.id === activeId ? 'opacity-100' : 'opacity-0'} />
              <span className="flex-1 truncate">{v.name}</span>
              {v.isShared && <Globe2 className="size-3.5 text-muted-foreground" />}
              <button
                type="button"
                title={v.isDefault ? 'Default view' : 'Make default'}
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  void toggleDefault(v);
                }}
                className="rounded p-0.5 hover:bg-background"
              >
                <Star
                  className={
                    v.isDefault
                      ? 'size-3.5 fill-warning text-warning'
                      : 'size-3.5 text-muted-foreground'
                  }
                />
              </button>
              <button
                type="button"
                title="Delete view"
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  void remove(v);
                }}
                className="rounded p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-background hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </DropdownMenuItem>
          ))}
          {shared.length > 0 && (
            <>
              {mine.length > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel>Shared with everyone</DropdownMenuLabel>
              {shared.map(v => (
                <DropdownMenuItem key={v.id} onSelect={() => apply(v)}>
                  <Check className={v.id === activeId ? 'opacity-100' : 'opacity-0'} />
                  <span className="flex-1 truncate">{v.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{v.user.firstName}</span>
                </DropdownMenuItem>
              ))}
            </>
          )}
          {views.length === 0 && (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              Save filters, sort and columns as a view to get back to them in one click.
            </p>
          )}
          <DropdownMenuSeparator />
          {active?.isOwner && (
            <DropdownMenuItem onSelect={() => void updateActive()}>
              <Save /> Update “{active.name}”
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setDialog(true)}>
            <Plus /> Save current as new view
          </DropdownMenuItem>
          {activeId && (
            <DropdownMenuItem
              onSelect={() => {
                setActiveId(null);
                controller.actions.clearFilters();
              }}
            >
              Clear view
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <SaveViewDialog
        open={dialog}
        onOpenChange={setDialog}
        onSave={async ({ name, isDefault, isShared }) => {
          const v = await viewsApi.create({
            module,
            name,
            isDefault,
            isShared,
            config: controller.captureView(),
          });
          setActiveId(v.id);
          toast.success(`View “${name}” saved`);
          refresh();
        }}
      />
    </>
  );
}

function SaveViewDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (v: { name: string; isDefault: boolean; isShared: boolean }) => Promise<void>;
}) {
  const canShare = usePermissions().can('views.share');
  const [name, setName] = useState('');
  const [isDefault, setDefault] = useState(false);
  const [isShared, setShared] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onSave({ name: name.trim(), isDefault, isShared });
      onOpenChange(false);
      setName('');
      setDefault(false);
      setShared(false);
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save view</DialogTitle>
          <DialogDescription>
            Saves the current search, filters, sort, columns and density.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="view-name">Name</Label>
            <Input
              id="view-name"
              autoFocus
              maxLength={100}
              value={name}
              placeholder="e.g. My hot leads in Bengaluru"
              onChange={e => setName(e.target.value)}
            />
          </div>
          <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <span>
              <span className="block text-sm font-medium">Open by default</span>
              <span className="block text-xs text-muted-foreground">
                Load this view every time you open the page.
              </span>
            </span>
            <Switch checked={isDefault} onCheckedChange={setDefault} />
          </label>
          {canShare && (
            <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <span>
                <span className="block text-sm font-medium">Share with everyone</span>
                <span className="block text-xs text-muted-foreground">
                  Others can apply it — they still only see records in their own scope.
                </span>
              </span>
              <Switch checked={isShared} onCheckedChange={setShared} />
            </label>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || busy}>
              Save view
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
