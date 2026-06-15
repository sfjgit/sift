// File: ManageAssignableDMs.tsx
// Path: src/components/users/ManageAssignableDMs.tsx

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, X, Plus, Trash2, Loader2, Users, UserPlus, Check } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAxios } from '@/hooks/useAxios';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaggedUser {
  id: string;
  target: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string | null;
    isActive: boolean;
    role: { id: string; name: string };
    department: { id: string; name: string } | null;
  };
  addedBy: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

interface CandidateUser {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string | null;
  isActive: boolean;
  role: { id: string; name: string };
  department: { id: string; name: string } | null;
}

interface Props {
  open: boolean;
  userId: string;
  userName: string;
  onClose: () => void;
}

// ─── Utils ────────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-indigo-100 text-indigo-700',
  'bg-orange-100 text-orange-700',
];
const avatarColor = (id: string) => AVATAR_PALETTE[id.charCodeAt(0) % AVATAR_PALETTE.length];
const initials = (first = '', last = '') => `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();

// ─── Main Component ───────────────────────────────────────────────────────────

export function ManageAssignableDMs({ open, userId, userName, onClose }: Props) {
  const axios = useAxios();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'current' | 'add'>('current');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);

  // ── Fetch current tags ─────────────────────────────────────────────────────
  // GET /users/:id/assignable-to
  const tagsQuery = useQuery<{ success: boolean; data: TaggedUser[] }>({
    queryKey: ['user-assignable-to', userId],
    queryFn: async () => (await axios.get(`/users/${userId}/assignable-to`)).data,
    enabled: open,
  });

  // ── Fetch candidates to add ────────────────────────────────────────────────
  // GET /users/:id/assignable-to/candidates?search=
  const candidatesQuery = useQuery<{ success: boolean; data: CandidateUser[] }>({
    queryKey: ['user-assignable-candidates', userId, search],
    queryFn: async () =>
      (
        await axios.get(
          `/users/${userId}/assignable-to/candidates${search ? `?search=${encodeURIComponent(search)}` : ''}`
        )
      ).data,
    enabled: open && tab === 'add',
    staleTime: 10_000,
  });

  // ── Remove tag ─────────────────────────────────────────────────────────────
  // DELETE /users/:id/assignable-to/:targetId
  const removeMutation = useMutation({
    mutationFn: async (targetId: string) =>
      (await axios.delete(`/users/${userId}/assignable-to/${targetId}`)).data,
    onSuccess: () => {
      toast.success('Removed');
      qc.invalidateQueries({ queryKey: ['user-assignable-to', userId] });
      qc.invalidateQueries({ queryKey: ['user-assignable-candidates', userId] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to remove'),
  });

  // ── Add tags ───────────────────────────────────────────────────────────────
  // POST /users/:id/assignable-to  { targetIds: string[] }
  async function handleAdd() {
    if (selectedIds.size === 0) return;
    setIsAdding(true);
    try {
      const res = await axios.post(`/users/${userId}/assignable-to`, {
        targetIds: Array.from(selectedIds),
      });
      const { created = [], skipped = [] } = res.data?.data ?? {};
      if (created.length)
        toast.success(`${created.length} DM${created.length !== 1 ? 's' : ''} tagged`);
      if (skipped.length) toast.warning(`${skipped.length} already tagged`);
      setSelectedIds(new Set());
      setTab('current');
      qc.invalidateQueries({ queryKey: ['user-assignable-to', userId] });
      qc.invalidateQueries({ queryKey: ['user-assignable-candidates', userId] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to add');
    } finally {
      setIsAdding(false);
    }
  }

  function toggleCandidate(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleClose() {
    onClose();
    setSearch('');
    setTab('current');
    setSelectedIds(new Set());
  }

  const tags = tagsQuery.data?.data ?? [];
  const candidates = candidatesQuery.data?.data ?? [];

  // Filter current tags by search in 'current' tab
  const filteredTags = useMemo(() => {
    if (!search.trim() || tab !== 'current') return tags;
    const q = search.toLowerCase();
    return tags.filter(
      t =>
        `${t.target.firstName} ${t.target.lastName}`.toLowerCase().includes(q) ||
        t.target.role.name.toLowerCase().includes(q) ||
        (t.target.employeeId ?? '').toLowerCase().includes(q)
    );
  }, [tags, search, tab]);

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className="p-0 gap-0 max-w-xl w-[92vw] h-[80vh] flex flex-col overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <UserPlus className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900">Extended Assignable</h2>
              <p className="text-xs text-slate-400 truncate">
                {userName} can assign to these people outside their chain
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-0 border-b border-slate-100 shrink-0 px-5">
          {(['current', 'add'] as const).map(t => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setSearch('');
                setSelectedIds(new Set());
              }}
              className={cn(
                'px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors',
                tab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              )}
            >
              {t === 'current'
                ? `Current Tags${tags.length > 0 ? ` (${tags.length})` : ''}`
                : 'Add People'}
            </button>
          ))}
        </div>

        {/* ── Search ── */}
        <div className="px-5 pt-3 pb-1 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={tab === 'current' ? 'Filter tagged users…' : 'Search by name, role, ID…'}
              className="pl-9 h-8 text-xs"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-2">
          {/* ── Current tab ── */}
          {tab === 'current' && (
            <>
              {tagsQuery.isLoading && (
                <div className="space-y-2 py-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-14 rounded-lg bg-slate-100 animate-pulse" />
                  ))}
                </div>
              )}

              {!tagsQuery.isLoading && filteredTags.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                  <Users className="w-10 h-10 opacity-20" />
                  <p className="text-sm">
                    {tags.length === 0 ? 'No extended DMs tagged yet' : 'No match'}
                  </p>
                  {tags.length === 0 && (
                    <button
                      onClick={() => setTab('add')}
                      className="text-xs text-blue-600 hover:underline mt-1"
                    >
                      + Add people
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                {filteredTags.map(tag => {
                  const u = tag.target;
                  const ac = avatarColor(u.id);
                  return (
                    <div
                      key={tag.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 transition-colors group"
                    >
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
                          ac
                        )}
                      >
                        {initials(u.firstName, u.lastName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800 truncate">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {u.role.name}
                          {u.department ? ` · ${u.department.name}` : ''}
                          {u.employeeId && <span className="ml-1.5 font-mono">{u.employeeId}</span>}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-300 shrink-0 hidden group-hover:block">
                        by {tag.addedBy.firstName}
                      </span>
                      <button
                        onClick={() => removeMutation.mutate(u.id)}
                        disabled={removeMutation.isPending}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-slate-200 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0"
                        title="Remove"
                      >
                        {removeMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── Add tab ── */}
          {tab === 'add' && (
            <>
              {candidatesQuery.isLoading && (
                <div className="space-y-2 py-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-14 rounded-lg bg-slate-100 animate-pulse" />
                  ))}
                </div>
              )}

              {!candidatesQuery.isLoading && candidates.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                  <Users className="w-10 h-10 opacity-20" />
                  <p className="text-sm">No more users to add</p>
                </div>
              )}

              <div className="space-y-1.5">
                {candidates.map(u => {
                  const isSelected = selectedIds.has(u.id);
                  const ac = avatarColor(u.id);
                  return (
                    <button
                      key={u.id}
                      onClick={() => toggleCandidate(u.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors',
                        isSelected
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-slate-100 bg-white hover:bg-slate-50'
                      )}
                    >
                      {/* Checkbox */}
                      <div
                        className={cn(
                          'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all',
                          isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                        )}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                      </div>

                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
                          isSelected ? 'bg-blue-100 text-blue-700' : ac
                        )}
                      >
                        {initials(u.firstName, u.lastName)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            'text-[13px] font-semibold truncate',
                            isSelected ? 'text-blue-700' : 'text-slate-800'
                          )}
                        >
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {u.role.name}
                          {u.department ? ` · ${u.department.name}` : ''}
                          {u.employeeId && <span className="ml-1.5 font-mono">{u.employeeId}</span>}
                        </p>
                      </div>

                      {isSelected && (
                        <span className="text-[10px] font-bold text-blue-600 shrink-0">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        {tab === 'add' && (
          <div className="shrink-0 px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select people to tag'}
            </p>
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs min-w-[100px]"
              disabled={selectedIds.size === 0 || isAdding}
              onClick={handleAdd}
            >
              {isAdding ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" /> Adding…
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3" /> Add {selectedIds.size > 0 ? selectedIds.size : ''}
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
