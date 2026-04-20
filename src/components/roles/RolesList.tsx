'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Eye, Trash2, Loader2, ShieldCheck } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { useRolesApi } from '@/lib/roles.api';

// ── Types ─────────────────────────────────────────────────────────────────────
type Role = {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  createdAt: string;
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function RolesList() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const rolesApi = useRolesApi();
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
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading roles…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive py-8 text-center">
        Failed to load roles. Please try again.
      </p>
    );
  }

  if (roles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
        <ShieldCheck className="w-8 h-8 opacity-30" />
        <p className="text-sm">No roles created yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map(role => (
            <TableRow key={role.id}>
              <TableCell className="font-medium">{role.name}</TableCell>
              <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                {role.description ?? '—'}
              </TableCell>
              <TableCell>
                {role.isSystem ? (
                  <Badge variant="secondary">System</Badge>
                ) : (
                  <Badge variant="outline">Custom</Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {new Date(role.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {/* View */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/dashboard/roles/${role.id}`)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>

                  {/* Delete — disabled for system roles */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={role.isSystem || deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete role &quot;{role.name}&quot;?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. Users assigned to this role will lose their
                          permissions.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => deleteMutation.mutate(role.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
