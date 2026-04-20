// import Link from 'next/link';

import { statusBadge } from './Badges';
import { CompactTable } from './Compacttable';
import { SectionHeader } from './Sectionheader';

// interface User {
//   id: string;
//   firstName: string;
//   lastName: string;
//   email: string;
//   employeeId: string;
//   isActive: boolean;
//   reportingToId: string | null;
// }

// interface PeopleSectionProps {
//   users: User[];
//   buId: string;
// }

// const avatarColors = [
//   'bg-blue-50 text-blue-700',
//   'bg-purple-50 text-purple-700',
//   'bg-teal-50 text-teal-700',
//   'bg-amber-50 text-amber-700',
//   'bg-rose-50 text-rose-700',
//   'bg-green-50 text-green-700',
// ];

// function UserRow({ user, index, allUsers }: { user: User; index: number; allUsers: User[] }) {
//   const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
//   const colorClass = avatarColors[index % avatarColors.length];

//   const reportsTo = user.reportingToId ? allUsers.find(u => u.id === user.reportingToId) : null;

//   return (
//     <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
//       <div
//         className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${colorClass}`}
//       >
//         {initials}
//       </div>

//       <div className="flex-1 min-w-0">
//         <p className="text-sm font-medium text-foreground leading-none">
//           {user.firstName} {user.lastName}
//         </p>
//         <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
//       </div>

//       <div className="text-right shrink-0">
//         <p className="text-[11px] font-mono text-muted-foreground">{user.employeeId}</p>
//         {reportsTo && (
//           <p className="text-[11px] text-muted-foreground mt-0.5">
//             → {reportsTo.firstName} {reportsTo.lastName}
//           </p>
//         )}
//       </div>
//     </div>
//   );
// }

// export function PeopleSection({ users, buId }: PeopleSectionProps) {
//   return (
//     <section>
//       <div className="flex items-center justify-between mb-3">
//         <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
//           People
//         </h2>
//         <Link
//           href={`/business-units/${buId}/users`}
//           className="text-xs text-muted-foreground hover:text-foreground transition-colors"
//         >
//           View all →
//         </Link>
//       </div>

//       <div className="bg-card border border-border rounded-xl px-4">
//         {users.length === 0 ? (
//           <p className="py-6 text-center text-sm text-muted-foreground">No members yet.</p>
//         ) : (
//           users.map((user, i) => <UserRow key={user.id} user={user} index={i} allUsers={users} />)
//         )}
//       </div>
//     </section>
//   );
// }

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  isActive: boolean;
  reportingToId: string | null;
}

interface PeopleSectionProps {
  users: User[];
  buId: string;
}

export function PeopleSection({ users }: PeopleSectionProps) {
  const columns = [
    {
      key: 'employeeId',
      label: 'Emp ID',
      width: '90px',
      render: (row: User) => (
        <span className="font-mono text-[11px] text-muted-foreground">{row.employeeId}</span>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      width: '150px',
      render: (row: User) => (
        <span className="font-medium text-foreground">
          {row.firstName} {row.lastName}
        </span>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      width: '200px',
      render: (row: User) => <span className="text-muted-foreground">{row.email}</span>,
    },
    {
      key: 'reportsTo',
      label: 'Reports To',
      width: '150px',
      render: (row: User) => {
        if (!row.reportingToId) return <span className="text-muted-foreground">—</span>;
        const manager = users.find(u => u.id === row.reportingToId);
        return manager ? (
          <span>
            {manager.firstName} {manager.lastName}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: '80px',
      render: (row: User) => statusBadge(row.isActive ? 'active' : 'inactive'),
    },
  ];

  return (
    <section>
      <SectionHeader title="People" count={users.length} />
      <CompactTable
        columns={columns}
        rows={users}
        maxHeight="220px"
        emptyMessage="No members found."
      />
    </section>
  );
}
