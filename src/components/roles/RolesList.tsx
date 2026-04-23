'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Search,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useRolesApi } from '@/lib/roles.api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Role = {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  createdAt: string;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function RolesPage() {
  const router = useRouter();
  const rolesApi = useRolesApi();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  // const [showCreate, setShowCreate] = useState(false);

  const {
    data: roles = [],
    isLoading,
    isError,
  } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await rolesApi.getAll();
      return res.data.data ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rolesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setDeleteTarget(null);
    },
  });

  // client-side filter + search
  const filtered = useMemo(() => {
    return roles.filter(r => {
      const matchType =
        typeFilter === 'ALL' ||
        (typeFilter === 'SYSTEM' && r.isSystem) ||
        (typeFilter === 'CUSTOM' && !r.isSystem);
      const q = search.toLowerCase();
      const matchSearch =
        !q || r.name.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [roles, typeFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const allChecked = paginated.length > 0 && paginated.every(r => selectedRows.has(r.id));

  const toggleRow = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (allChecked) setSelectedRows(new Set());
    else setSelectedRows(new Set(paginated.map(r => r.id)));
  };

  // const colTemplate = '40px 50px 1fr 1.5fr 100px 120px 100px';
  const colTemplate = '1fr 1.5fr 120px 120px 120px';

  return (
    <div
      style={{
        fontFamily: "'DM Sans', system-ui, sans-serif",
        color: '#0f172a',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── Type Tabs + Create Button ──────────────────────────────────── */}
      {/* <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex' }}>
          {[
            { label: 'All Roles', value: 'ALL' },
            { label: 'System', value: 'SYSTEM' },
            { label: 'Custom', value: 'CUSTOM' },
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => {
                setTypeFilter(tab.value);
                setPage(1);
              }}
              style={{
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 500,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderBottom:
                  typeFilter === tab.value ? '2px solid #3b82f6' : '2px solid transparent',
                color: typeFilter === tab.value ? '#3b82f6' : '#64748b',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => router.push('/dashboard/roles/create')}
          style={{
            height: 34,
            padding: '0 14px',
            fontSize: 13,
            fontWeight: 600,
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1, marginTop: -1 }}>+</span> Create Role
        </button>
      </div> */}

      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ position: 'relative' }}>
          <Search
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 14,
              height: 14,
              color: '#94a3b8',
            }}
          />
          <input
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search roles..."
            style={{
              height: 34,
              paddingLeft: 32,
              paddingRight: 12,
              fontSize: 13,
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              outline: 'none',
              width: 220,
              background: '#fff',
              color: '#0f172a',
            }}
          />
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: colTemplate,
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '0 12px',
            flexShrink: 0,
          }}
        >
          {/* <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0' }}>
            <input
              type="checkbox"
              checked={allChecked}
              onChange={toggleAll}
              style={{ cursor: 'pointer' }}
            />
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              display: 'flex',
              alignItems: 'center',
              padding: '10px 0',
            }}
          >
            #
          </div> */}
          {[
            ['Name', true],
            ['Description', false],
            ['Type', false],
            ['Created', false],
            ['Actions', false],
          ].map(([label]) => (
            <div
              key={label as string}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                display: 'flex',
                alignItems: 'center',
                padding: '10px 8px',
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: colTemplate,
                  padding: '0 12px',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                {[...Array(7)].map((_, j) => (
                  <div key={j} style={{ padding: '14px 8px' }}>
                    <div
                      style={{ height: 14, borderRadius: 3, background: '#f1f5f9', width: '70%' }}
                    />
                  </div>
                ))}
              </div>
            ))
          ) : isError ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#ef4444', fontSize: 14 }}>
              Failed to load roles. Please try again.
            </div>
          ) : paginated.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8', fontSize: 14 }}>
              No roles found
            </div>
          ) : (
            paginated.map((role, idx) => {
              const rowNum = (page - 1) * pageSize + idx + 1;
              const checked = selectedRows.has(role.id);
              return (
                <div
                  key={role.id}
                  onClick={() => router.push(`/dashboard/roles/${role.id}`)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: colTemplate,
                    padding: '0 12px',
                    borderBottom: '1px solid #f1f5f9',
                    background: checked ? '#eff6ff' : idx % 2 === 0 ? '#fff' : '#fafafa',
                    transition: 'background 0.1s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    if (!checked) (e.currentTarget as HTMLElement).style.background = '#f8fafc';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = checked
                      ? '#eff6ff'
                      : idx % 2 === 0
                        ? '#fff'
                        : '#fafafa';
                  }}
                >
                  {/* Checkbox */}
                  {/* <div
                    style={{ display: 'flex', alignItems: 'center', padding: '12px 0' }}
                    onClick={e => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRow(role.id)}
                      style={{ cursor: 'pointer' }}
                    />
                  </div> */}

                  {/* Row # */}
                  {/* <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0' }}>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 4,
                        background: '#eff6ff',
                        color: '#3b82f6',
                        fontSize: 11,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {rowNum}
                    </span>
                  </div> */}

                  {/* Name */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 8px',
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: '#3b82f6',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {role.name}
                    </span>
                  </div>

                  {/* Description */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 8px',
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: '#64748b',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {role.description ?? <span style={{ color: '#cbd5e1' }}>—</span>}
                    </span>
                  </div>

                  {/* Type badge */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '12px 8px' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        padding: '2px 8px',
                        borderRadius: 20,
                        ...(role.isSystem
                          ? { background: 'rgba(59,130,246,0.08)', color: '#2563eb' }
                          : { background: 'rgba(148,163,184,0.12)', color: '#475569' }),
                      }}
                    >
                      {role.isSystem ? 'System' : 'Custom'}
                    </span>
                  </div>

                  {/* Created */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '12px 8px' }}>
                    <span style={{ fontSize: 13, color: '#64748b' }}>
                      {new Date(role.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Actions */}
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '12px 8px' }}
                    onClick={e => e.stopPropagation()}
                  >
                    {/* View */}
                    <button
                      title="View"
                      onClick={() => router.push(`/dashboard/roles/${role.id}`)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 5,
                        border: '1px solid #e2e8f0',
                        background: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#3b82f6',
                      }}
                    >
                      <Eye style={{ width: 13, height: 13 }} />
                    </button>

                    {/* Delete */}
                    <button
                      title={role.isSystem ? 'System roles cannot be deleted' : 'Delete'}
                      disabled={role.isSystem}
                      onClick={() => !role.isSystem && setDeleteTarget(role)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 5,
                        border: role.isSystem ? '1px solid #e2e8f0' : '1px solid #fecaca',
                        background: '#fff',
                        cursor: role.isSystem ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: role.isSystem ? '#cbd5e1' : '#ef4444',
                        opacity: role.isSystem ? 0.5 : 1,
                      }}
                    >
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 4px',
          fontSize: 13,
          color: '#64748b',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <span>
          {filtered.length === 0
            ? '0'
            : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filtered.length)}`}{' '}
          of {filtered.length}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <PagBtn onClick={() => setPage(1)} disabled={page === 1}>
            <ChevronsLeft style={{ width: 13, height: 13 }} />
          </PagBtn>
          <PagBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft style={{ width: 13, height: 13 }} />
          </PagBtn>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let p: number;
            if (totalPages <= 5) p = i + 1;
            else if (page <= 3) p = i + 1;
            else if (page >= totalPages - 2) p = totalPages - 4 + i;
            else p = page - 2 + i;
            return (
              <PagBtn key={p} onClick={() => setPage(p)} active={page === p}>
                {p}
              </PagBtn>
            );
          })}
          <PagBtn
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight style={{ width: 13, height: 13 }} />
          </PagBtn>
          <PagBtn onClick={() => setPage(totalPages)} disabled={page === totalPages}>
            <ChevronsRight style={{ width: 13, height: 13 }} />
          </PagBtn>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={pageSize}
            onChange={e => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            style={{
              height: 30,
              padding: '0 24px 0 8px',
              fontSize: 13,
              border: '1px solid #e2e8f0',
              borderRadius: 5,
              outline: 'none',
              background: '#fff',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 6px center',
            }}
          >
            {PAGE_SIZE_OPTIONS.map(n => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span style={{ color: '#94a3b8' }}>per page</span>
        </div>
      </div>

      {/* ── Delete Confirmation ─────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Users assigned to this role will lose their permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PagBtn({
  children,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 30,
        height: 30,
        padding: '0 6px',
        borderRadius: 5,
        border: '1px solid',
        borderColor: active ? '#3b82f6' : '#e2e8f0',
        background: active ? '#3b82f6' : disabled ? '#f8fafc' : '#fff',
        color: active ? '#fff' : disabled ? '#cbd5e1' : '#374151',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.12s',
      }}
    >
      {children}
    </button>
  );
}

// 'use client';

// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { useRouter } from 'next/navigation';
// import { Eye, Trash2, Loader2, ShieldCheck } from 'lucide-react';

// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from '@/components/ui/table';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
//   AlertDialogTrigger,
// } from '@/components/ui/alert-dialog';

// import { useRolesApi } from '@/lib/roles.api';

// // ── Types ─────────────────────────────────────────────────────────────────────
// type Role = {
//   id: string;
//   name: string;
//   description?: string;
//   isSystem: boolean;
//   createdAt: string;
// };

// // ── Component ─────────────────────────────────────────────────────────────────
// export default function RolesList() {
//   const router = useRouter();
//   const queryClient = useQueryClient();

//   const rolesApi = useRolesApi();
//   const {
//     data: roles = [],
//     isLoading,
//     isError,
//   } = useQuery<Role[]>({
//     queryKey: ['roles'],
//     queryFn: async () => {
//       const res = await rolesApi.getAll();
//       return res.data.data ?? [];
//     },
//   });

//   const deleteMutation = useMutation({
//     mutationFn: (id: string) => rolesApi.delete(id),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['roles'] });
//     },
//   });

//   if (isLoading) {
//     return (
//       <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
//         <Loader2 className="w-4 h-4 animate-spin" />
//         <span className="text-sm">Loading roles…</span>
//       </div>
//     );
//   }

//   if (isError) {
//     return (
//       <p className="text-sm text-destructive py-8 text-center">
//         Failed to load roles. Please try again.
//       </p>
//     );
//   }

//   if (roles.length === 0) {
//     return (
//       <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
//         <ShieldCheck className="w-8 h-8 opacity-30" />
//         <p className="text-sm">No roles created yet.</p>
//       </div>
//     );
//   }

//   return (
//     <div className="rounded-lg border overflow-hidden">
//       <Table>
//         <TableHeader>
//           <TableRow>
//             <TableHead>Name</TableHead>
//             <TableHead>Description</TableHead>
//             <TableHead>Type</TableHead>
//             <TableHead>Created</TableHead>
//             <TableHead className="text-right">Actions</TableHead>
//           </TableRow>
//         </TableHeader>
//         <TableBody>
//           {roles.map(role => (
//             <TableRow key={role.id}>
//               <TableCell className="font-medium">{role.name}</TableCell>
//               <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
//                 {role.description ?? '—'}
//               </TableCell>
//               <TableCell>
//                 {role.isSystem ? (
//                   <Badge variant="secondary">System</Badge>
//                 ) : (
//                   <Badge variant="outline">Custom</Badge>
//                 )}
//               </TableCell>
//               <TableCell className="text-muted-foreground text-sm">
//                 {new Date(role.createdAt).toLocaleDateString()}
//               </TableCell>
//               <TableCell className="text-right">
//                 <div className="flex items-center justify-end gap-2">
//                   {/* View */}
//                   <Button
//                     variant="ghost"
//                     size="sm"
//                     onClick={() => router.push(`/dashboard/roles/${role.id}`)}
//                   >
//                     <Eye className="w-4 h-4 mr-1" />
//                     View
//                   </Button>

//                   {/* Delete — disabled for system roles */}
//                   <AlertDialog>
//                     <AlertDialogTrigger asChild>
//                       <Button
//                         variant="ghost"
//                         size="sm"
//                         className="text-destructive hover:text-destructive hover:bg-destructive/10"
//                         disabled={role.isSystem || deleteMutation.isPending}
//                       >
//                         <Trash2 className="w-4 h-4 mr-1" />
//                         Delete
//                       </Button>
//                     </AlertDialogTrigger>
//                     <AlertDialogContent>
//                       <AlertDialogHeader>
//                         <AlertDialogTitle>Delete role &quot;{role.name}&quot;?</AlertDialogTitle>
//                         <AlertDialogDescription>
//                           This action cannot be undone. Users assigned to this role will lose their
//                           permissions.
//                         </AlertDialogDescription>
//                       </AlertDialogHeader>
//                       <AlertDialogFooter>
//                         <AlertDialogCancel>Cancel</AlertDialogCancel>
//                         <AlertDialogAction
//                           className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
//                           onClick={() => deleteMutation.mutate(role.id)}
//                         >
//                           Delete
//                         </AlertDialogAction>
//                       </AlertDialogFooter>
//                     </AlertDialogContent>
//                   </AlertDialog>
//                 </div>
//               </TableCell>
//             </TableRow>
//           ))}
//         </TableBody>
//       </Table>
//     </div>
//   );
// }
