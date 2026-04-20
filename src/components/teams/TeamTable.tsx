/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { usePermission } from '@/hooks/usePermission';
import TeamDialog from './TeamDialog';
import { useRouter } from 'next/navigation';
import { Team, useTeamsApi } from '@/lib/teams.api';
import { Trash2, Pencil, Eye } from 'lucide-react';
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
import { toast } from 'sonner';

type EnrichedTeam = Team & {
  businessUnit?: { id: string; name: string } | null;
  members?: {
    id: string;
    teamRole: 'LEAD' | 'CO_LEAD' | 'MEMBER';
    user: { id: string; firstName: string; lastName: string };
  }[];
};

type TeamTableProps = {
  teams: EnrichedTeam[];
  refresh: () => void | Promise<any>;
};

export default function TeamTable({ teams, refresh }: TeamTableProps) {
  const [editTeam, setEditTeam] = useState<EnrichedTeam | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedTeam | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const canEdit = usePermission('TEAM', 'canEdit');
  const canDelete = usePermission('TEAM', 'canDelete');
  const { remove } = useTeamsApi();

  const getTeamLead = (team: EnrichedTeam) => {
    const lead = team.members?.find(m => m.teamRole === 'LEAD');
    return lead ? `${lead.user.firstName} ${lead.user.lastName}` : '—';
  };

  const getMemberCount = (team: EnrichedTeam) => team.members?.length ?? 0;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await remove(deleteTarget.id);
      toast.success('Team deleted successfully');
      refresh();
      setDeleteTarget(null);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? err?.response?.data?.error ?? 'Failed to delete team';
      toast.warning(msg, {
        description: 'Please remove all members from this team before deleting it.',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Team Name
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Business Unit
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Team Lead
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Members
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Status
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {teams?.length ? (
              teams.map(team => (
                <TableRow
                  key={team.id}
                  className="hover:bg-muted/30 transition-colors duration-100"
                >
                  <TableCell className="px-4 py-3.5 text-sm font-medium text-foreground">
                    {team.name}
                  </TableCell>

                  <TableCell className="px-4 py-3.5 text-sm text-muted-foreground">
                    {team.businessUnit?.name ?? '—'}
                  </TableCell>

                  <TableCell className="px-4 py-3.5 text-sm text-muted-foreground">
                    {getTeamLead(team)}
                  </TableCell>

                  <TableCell className="px-4 py-3.5 text-sm text-muted-foreground">
                    {getMemberCount(team)}
                  </TableCell>

                  <TableCell className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${
                        team.isActive
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {team.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>

                  <TableCell className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* View */}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => router.push(`/dashboard/teams/${team.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      {/* Edit */}
                      {canEdit && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => setEditTeam(team)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}

                      {/* Delete — always visible, backend blocks if members exist */}
                      {canDelete && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(team)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  No teams found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      {editTeam && (
        <TeamDialog
          open={!!editTeam}
          setOpen={() => setEditTeam(null)}
          team={editTeam}
          refresh={refresh}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete team?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> will be permanently deleted. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// 'use client';

// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from '@/components/ui/table';

// import { Button } from '@/components/ui/button';

// import { useState } from 'react';
// import { usePermission } from '@/hooks/usePermission';
// import TeamDialog from './TeamDialog';
// import { useRouter } from 'next/navigation';
// import { Team } from '@/lib/teams.api';

// type TeamTableProps = {
//   teams: Team[];
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   refresh: () => void | Promise<any>;
// };

// export default function TeamTable({ teams, refresh }: TeamTableProps) {
//   const [editTeam, setEditTeam] = useState<Team | null>(null);
//   const router = useRouter();
//   const canEdit = usePermission('TEAM', 'canEdit');

//   return (
//     <div className="border border-border rounded-lg overflow-hidden">
//       <Table>
//         <TableHeader>
//           <TableRow className="bg-muted/40 hover:bg-muted/40">
//             <TableHead className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
//               Name
//             </TableHead>
//             <TableHead className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
//               Category
//             </TableHead>
//             <TableHead className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
//               Status
//             </TableHead>
//             {canEdit && (
//               <TableHead className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">
//                 Actions
//               </TableHead>
//             )}
//           </TableRow>
//         </TableHeader>

//         <TableBody>
//           {teams?.length ? (
//             teams.map(team => (
//               <TableRow
//                 key={team.id}
//                 className="cursor-pointer hover:bg-muted/30 transition-colors duration-100"
//                 onClick={() => router.push(`/dashboard/teams/${team.id}`)}
//               >
//                 <TableCell className="px-4 py-3.5 text-sm font-medium text-foreground">
//                   {team.name}
//                 </TableCell>

//                 <TableCell className="px-4 py-3.5 text-sm text-muted-foreground">
//                   {team.category || '—'}
//                 </TableCell>

//                 <TableCell className="px-4 py-3.5">
//                   <span
//                     className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${
//                       team.isActive
//                         ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
//                         : 'bg-muted text-muted-foreground'
//                     }`}
//                   >
//                     {team.isActive ? 'Active' : 'Inactive'}
//                   </span>
//                 </TableCell>

//                 {canEdit && (
//                   <TableCell className="px-4 py-3.5 text-right">
//                     <Button
//                       size="sm"
//                       variant="outline"
//                       onClick={e => {
//                         e.stopPropagation(); // ✅ IMPORTANT
//                         setEditTeam(team);
//                       }}
//                     >
//                       Edit
//                     </Button>
//                   </TableCell>
//                 )}
//               </TableRow>
//             ))
//           ) : (
//             <TableRow>
//               <TableCell
//                 colSpan={canEdit ? 4 : 3}
//                 className="px-4 py-10 text-center text-sm text-muted-foreground"
//               >
//                 No teams found
//               </TableCell>
//             </TableRow>
//           )}
//         </TableBody>
//       </Table>

//       {/* Edit Dialog */}
//       <TeamDialog
//         open={!!editTeam}
//         setOpen={() => setEditTeam(null)}
//         team={editTeam}
//         refresh={refresh}
//       />
//     </div>
//   );
// }
