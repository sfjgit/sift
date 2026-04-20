// 'use client';

// import { useEffect, useState } from 'react';
// import { useParams, useRouter } from 'next/navigation';
// import Link from 'next/link';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { ArrowLeft, Loader2, Save, ShieldCheck } from 'lucide-react';

// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { Checkbox } from '@/components/ui/checkbox';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from '@/components/ui/table';

// import { useRolesApi } from '@/lib/roles.api';

// // ── Constants ─────────────────────────────────────────────────────────────────
// const MODULES = [
//   'USERS',
//   'ROLES',
//   'TEAMS',
//   'BUSINESS_UNITS',
//   'CLIENTS',
//   'REQUIREMENTS',
//   'CANDIDATES',
//   'PIPELINE',
//   'INTERVIEWS',
//   'OFFERS',
// ];

// // ── Types ─────────────────────────────────────────────────────────────────────
// type PermissionRow = {
//   module: string;
//   canView: boolean;
//   canAdd: boolean;
//   canEdit: boolean;
//   canDelete: boolean;
// };

// type Role = {
//   id: string;
//   name: string;
//   description?: string;
//   isSystem: boolean;
//   permissions?: PermissionRow[];
// };

// // ── Helpers ───────────────────────────────────────────────────────────────────
// const defaultRow = (module: string): PermissionRow => ({
//   module,
//   canView: false,
//   canAdd: false,
//   canEdit: false,
//   canDelete: false,
// });

// const ACTIONS = [
//   { key: 'canView', label: 'View' },
//   { key: 'canAdd', label: 'Add' },
//   { key: 'canEdit', label: 'Edit' },
//   { key: 'canDelete', label: 'Delete' },
// ] as const;

// // ── Page ──────────────────────────────────────────────────────────────────────
// export default function RolePage() {
//   const { id } = useParams<{ id: string }>();
//   const router = useRouter();
//   const queryClient = useQueryClient();
//   const rolesApi = useRolesApi();

//   const [rows, setRows] = useState<PermissionRow[]>([]);
//   const [dirty, setDirty] = useState(false);

//   // ── Fetch role ──────────────────────────────────────────────────────────
//   const {
//     data: role,
//     isLoading,
//     isError,
//   } = useQuery<Role | null>({
//     queryKey: ['role', id],
//     queryFn: async () => {
//       const res = await rolesApi.getAll();
//       const all: Role[] = res.data.data ?? [];
//       return all.find(r => r.id === id) ?? null;
//     },
//     enabled: !!id,
//   });

//   // Hydrate rows whenever role loads
//   useEffect(() => {
//     if (!role) return;
//     const existingMap: Record<string, PermissionRow> = {};
//     (role.permissions ?? []).forEach(p => {
//       existingMap[p.module] = p;
//     });
//     setRows(MODULES.map(mod => existingMap[mod] ?? defaultRow(mod)));
//     setDirty(false);
//   }, [role]);

//   // ── Save mutation ───────────────────────────────────────────────────────
//   const saveMutation = useMutation({
//     mutationFn: () => rolesApi.setPermissions(id, { permissions: rows }),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['role', id] });
//       queryClient.invalidateQueries({ queryKey: ['roles'] });
//       setDirty(false);
//     },
//   });

//   // ── Row update helpers ──────────────────────────────────────────────────
//   const updateRow = (module: string, patch: Partial<PermissionRow>) => {
//     setRows(prev =>
//       prev.map(r => {
//         if (r.module !== module) return r;
//         const next = { ...r, ...patch };
//         // turning off view clears all write flags
//         if (patch.canView === false) {
//           next.canAdd = false;
//           next.canEdit = false;
//           next.canDelete = false;
//         }
//         // turning on any write flag implies view
//         if (patch.canAdd || patch.canEdit || patch.canDelete) {
//           next.canView = true;
//         }
//         return next;
//       })
//     );
//     setDirty(true);
//   };

//   const toggleColumn = (field: keyof Omit<PermissionRow, 'module'>, value: boolean) => {
//     setRows(prev =>
//       prev.map(r => {
//         const next = { ...r, [field]: value };
//         if (field === 'canView' && !value) {
//           next.canAdd = false;
//           next.canEdit = false;
//           next.canDelete = false;
//         }
//         if ((field === 'canAdd' || field === 'canEdit' || field === 'canDelete') && value) {
//           next.canView = true;
//         }
//         return next;
//       })
//     );
//     setDirty(true);
//   };

//   const allChecked = (field: keyof Omit<PermissionRow, 'module'>) =>
//     rows.length > 0 && rows.every(r => r[field]);

//   // ── Loading / error states ──────────────────────────────────────────────
//   if (isLoading) {
//     return (
//       <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
//         <Loader2 className="w-4 h-4 animate-spin" />
//         <span className="text-sm">Loading role…</span>
//       </div>
//     );
//   }

//   if (isError || !role) {
//     return (
//       <div className="max-w-5xl mx-auto px-6 py-10 space-y-3">
//         <p className="text-sm text-destructive">Role not found.</p>
//         <Button variant="ghost" size="sm" asChild>
//           <Link href="/dashboard/roles">
//             <ArrowLeft className="w-4 h-4 mr-1" /> Back to Roles
//           </Link>
//         </Button>
//       </div>
//     );
//   }

//   // ── Render ──────────────────────────────────────────────────────────────
//   return (
//     <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
//       {/* ── Header ── */}
//       <div className="space-y-3">
//         <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2" asChild>
//           <Link href="/dashboard/roles">
//             <ArrowLeft className="w-4 h-4 mr-1" />
//             Roles
//           </Link>
//         </Button>

//         <div className="flex items-start justify-between gap-4">
//           <div className="flex items-center gap-3">
//             <ShieldCheck className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
//             <div className="space-y-0.5">
//               <div className="flex items-center gap-2">
//                 <h1 className="text-xl font-semibold tracking-tight">{role.name}</h1>
//                 {role.isSystem ? (
//                   <Badge variant="secondary">System</Badge>
//                 ) : (
//                   <Badge variant="outline">Custom</Badge>
//                 )}
//               </div>
//               {role.description && (
//                 <p className="text-sm text-muted-foreground">{role.description}</p>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* ── Permissions card ── */}
//       <Card>
//         <CardHeader className="pb-4">
//           <div className="flex items-center justify-between">
//             <div className="space-y-0.5">
//               <CardTitle className="text-base">Module Permissions</CardTitle>
//               <CardDescription className="text-xs">
//                 Add, Edit and Delete require View. Use column headers to toggle all at once.
//               </CardDescription>
//             </div>

//             {/* Save bar */}
//             <div className="flex items-center gap-3 shrink-0">
//               {dirty && <span className="text-xs text-amber-500 font-medium">Unsaved changes</span>}
//               <Button
//                 size="sm"
//                 disabled={!dirty || saveMutation.isPending}
//                 onClick={() => saveMutation.mutate()}
//               >
//                 {saveMutation.isPending ? (
//                   <Loader2 className="w-4 h-4 mr-2 animate-spin" />
//                 ) : (
//                   <Save className="w-4 h-4 mr-2" />
//                 )}
//                 Save
//               </Button>
//             </div>
//           </div>

//           {saveMutation.isError && (
//             <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 mt-2">
//               Failed to save permissions. Please try again.
//             </p>
//           )}
//           {saveMutation.isSuccess && !dirty && (
//             <p className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 rounded-md px-3 py-2 mt-2">
//               Permissions saved successfully.
//             </p>
//           )}
//         </CardHeader>

//         <CardContent className="p-0">
//           <div className="overflow-x-auto">
//             <Table>
//               <TableHeader>
//                 <TableRow>
//                   <TableHead className="pl-6 w-52">Module</TableHead>
//                   {ACTIONS.map(({ key, label }) => (
//                     <TableHead key={key} className="text-center w-28">
//                       <div className="flex flex-col items-center gap-2">
//                         <span>{label}</span>
//                         <Checkbox
//                           checked={allChecked(key)}
//                           onCheckedChange={v => toggleColumn(key, !!v)}
//                           aria-label={`Toggle all ${label}`}
//                         />
//                       </div>
//                     </TableHead>
//                   ))}
//                 </TableRow>
//               </TableHeader>

//               <TableBody>
//                 {rows.map(row => (
//                   <TableRow key={row.module}>
//                     <TableCell className="pl-6 font-medium text-sm">
//                       {row.module.replace(/_/g, ' ')}
//                     </TableCell>

//                     {ACTIONS.map(({ key }) => (
//                       <TableCell key={key} className="text-center">
//                         <Checkbox
//                           checked={row[key]}
//                           disabled={key !== 'canView' && !row.canView}
//                           onCheckedChange={v => updateRow(row.module, { [key]: !!v })}
//                         />
//                       </TableCell>
//                     ))}
//                   </TableRow>
//                 ))}
//               </TableBody>
//             </Table>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }
