// File: page.tsx
// Path: src/app/(dashboard)/settings/requirement-categories/page.tsx

'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Power, PowerOff, Check, X, LayoutList, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAxios } from '@/hooks/useAxios';
import { useAllRequirementCategories, RequirementCategory } from '@/hooks/useRequirementCategories';

// ── Row ────────────────────────────────────────────────────────────────────
function CategoryRow({
  cat,
  onSave,
  onToggle,
  saving,
}: {
  cat: RequirementCategory;
  onSave: (
    id: string,
    data: { name: string; slug: string; description: string; order: string }
  ) => void;
  onToggle: (id: string, isActive: boolean) => void;
  saving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cat.name);
  const [slug, setSlug] = useState(cat.slug);
  const [description, setDescription] = useState(cat.description ?? '');
  const [order, setOrder] = useState(String(cat.order ?? ''));

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(cat.id, {
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim(),
      order,
    });
    setEditing(false);
  };
  const handleCancel = () => {
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description ?? '');
    setOrder(String(cat.order ?? ''));
    setEditing(false);
  };

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 border-b border-slate-100 last:border-0 transition-opacity ${!cat.isActive ? 'opacity-50' : ''}`}
    >
      <div className="text-slate-300 mt-2 cursor-grab shrink-0">
        <GripVertical size={14} />
      </div>

      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
        <LayoutList size={14} className="text-blue-500" />
      </div>

      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 font-medium">Name</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-7 text-[12px]"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 font-medium">Slug</label>
              <Input
                value={slug}
                onChange={e => setSlug(e.target.value)}
                className="h-7 text-[12px] font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 font-medium">Description</label>
              <Input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional"
                className="h-7 text-[12px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 font-medium">Order</label>
              <Input
                value={order}
                onChange={e => setOrder(e.target.value)}
                type="number"
                placeholder="1"
                className="h-7 text-[12px] w-20"
              />
            </div>
            <div className="col-span-2 flex gap-1.5 mt-1">
              <button
                onClick={handleSave}
                disabled={!name.trim() || saving}
                className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white text-[12px] rounded-lg disabled:opacity-50"
              >
                <Check size={11} /> Save
              </button>
              <button
                onClick={handleCancel}
                className="px-2.5 py-1 text-[12px] text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                <X size={11} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[13px] font-semibold text-slate-800">{cat.name}</p>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                /{cat.slug}
              </span>
              {cat.order != null && (
                <span className="text-[10px] text-slate-400">order: {cat.order}</span>
              )}
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cat.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
              >
                {cat.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            {cat.description && (
              <p className="text-[12px] text-slate-400 mt-0.5">{cat.description}</p>
            )}
            <p className="text-[11px] text-slate-400 mt-0.5">
              {cat._count?.requirements ?? 0} requirement{cat._count?.requirements !== 1 ? 's' : ''}
            </p>
          </>
        )}
      </div>

      {!editing && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
            title="Edit"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => onToggle(cat.id, !cat.isActive)}
            className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${cat.isActive ? 'text-slate-400 hover:text-orange-600 hover:bg-orange-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
            title={cat.isActive ? 'Deactivate' : 'Activate'}
          >
            {cat.isActive ? <PowerOff size={13} /> : <Power size={13} />}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Add form ───────────────────────────────────────────────────────────────
function AddCategoryForm({
  onAdd,
}: {
  onAdd: (data: { name: string; slug: string; description: string; order: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [order, setOrder] = useState('');

  // Auto-generate slug from name
  const handleNameChange = (v: string) => {
    setName(v);
    setSlug(
      v
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), slug: slug.trim(), description: description.trim(), order });
    setName('');
    setSlug('');
    setDescription('');
    setOrder('');
    setOpen(false);
  };

  if (!open) {
    return (
      <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Plus size={14} /> Add Category
      </Button>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
      <p className="text-[12px] font-semibold text-slate-600 uppercase tracking-wider">
        New Category
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-slate-500 font-medium">Name *</label>
          <Input
            value={name}
            onChange={e => handleNameChange(e.target.value)}
            placeholder="e.g. Engineering"
            className="h-8 text-sm"
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-slate-500 font-medium">Slug *</label>
          <Input
            value={slug}
            onChange={e => setSlug(e.target.value)}
            placeholder="e.g. engineering"
            className="h-8 text-sm font-mono"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-slate-500 font-medium">Description</label>
          <Input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional"
            className="h-8 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-slate-500 font-medium">Display order</label>
          <Input
            value={order}
            onChange={e => setOrder(e.target.value)}
            type="number"
            placeholder="1"
            className="h-8 text-sm w-24"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || !slug.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[12px] rounded-lg disabled:opacity-50"
        >
          <Check size={12} /> Create
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-[12px] text-slate-500 hover:bg-slate-100 rounded-lg"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function RequirementCategoriesPage() {
  const axios = useAxios();
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading } = useAllRequirementCategories();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['requirement-categories'] });

  const { mutate: create } = useMutation({
    mutationFn: (d: { name: string; slug: string; description: string; order: string }) =>
      axios.post('/requirementCategories', { ...d, order: d.order ? Number(d.order) : null }),
    onSuccess: invalidate,
  });

  const { mutate: update, isPending: updating } = useMutation({
    mutationFn: ({
      id,
      ...d
    }: {
      id: string;
      name: string;
      slug: string;
      description: string;
      order: string;
    }) =>
      axios.patch(`/requirementCategories/${id}`, {
        ...d,
        order: d.order ? Number(d.order) : null,
      }),
    onSuccess: invalidate,
  });

  const { mutate: toggle } = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      axios.patch(`/requirementCategories/${id}`, { isActive }),
    onSuccess: invalidate,
  });

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-slate-900">Requirement Categories</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">
            Master list — users pick from these when creating a requirement. Slug is used for
            website URL filters.
          </p>
        </div>
      </div>

      <AddCategoryForm onAdd={d => create(d)} />

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3 px-4 py-3 border-b border-slate-100">
              <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <LayoutList size={32} className="mb-2 opacity-30" />
            <p className="text-sm">No categories yet — add one above</p>
          </div>
        ) : (
          categories.map(cat => (
            <CategoryRow
              key={cat.id}
              cat={cat}
              saving={updating}
              onSave={(id, data) => update({ id, ...data })}
              onToggle={(id, isActive) => toggle({ id, isActive })}
            />
          ))
        )}
      </div>
    </div>
  );
}
