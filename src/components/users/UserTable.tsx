'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import { usePermission } from '@/hooks/usePermission';

type UserTableProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  users: any[];
  refresh: () => void;
};

export default function UserTable({ users }: UserTableProps) {
  const router = useRouter();
  const canEdit = usePermission('USER', 'canEdit');

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              User
            </TableHead>
            <TableHead className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Role
            </TableHead>
            <TableHead className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Location
            </TableHead>
            <TableHead className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">
              Status
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {users.length ? (
            users.map(user => (
              <TableRow
                key={user.id}
                className={`hover:bg-muted/30 transition-colors duration-100 ${canEdit ? 'cursor-pointer' : ''}`}
                onClick={() => canEdit && router.push(`/dashboard/users/${user.id}`)}
              >
                {/* User cell with avatar */}
                <TableCell className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <span className="text-xs font-medium text-muted-foreground">
                        {(user.firstName?.[0] ?? '').toUpperCase()}
                        {(user.lastName?.[0] ?? '').toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                </TableCell>

                {/* Role */}
                <TableCell className="px-4 py-3.5 text-sm text-muted-foreground">
                  {user.role?.name ?? '—'}
                </TableCell>

                {/* Location */}
                <TableCell className="px-4 py-3.5 text-sm text-muted-foreground">
                  {user.workingLocation ?? '—'}
                </TableCell>

                {/* Status */}
                <TableCell className="px-4 py-3.5 text-right">
                  <span
                    className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${
                      user.isActive
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={4}
                className="px-4 py-10 text-center text-sm text-muted-foreground"
              >
                No users found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
