// import Link from 'next/link';
// import { dataPolicyBadge, statusBadge } from './Badges';

// interface Team {
//   id: string;
//   name: string;
//   description: string | null;
//   isActive: boolean;
//   category: string | null;
//   dataPolicy: string;
//   createdAt: string;
// }

// interface TeamsSectionProps {
//   teams: Team[];
//   buId: string;
// }

// function TeamCard({ team, buId }: { team: Team; buId: string }) {
//   return (
//     <Link
//       href={`/dashboard/teams/${team.id}`}
//       className="block bg-card border border-border rounded-xl p-4 hover:border-border/80 hover:shadow-sm transition-all"
//     >
//       <div className="flex items-start justify-between mb-3">
//         <div>
//           <p className="text-sm font-medium text-foreground">{team.name}</p>
//           {team.description && (
//             <p className="text-xs text-muted-foreground mt-0.5">{team.description}</p>
//           )}
//         </div>
//         {statusBadge(team.isActive ? 'active' : 'inactive')}
//       </div>

//       <div className="flex items-center gap-2 flex-wrap">
//         {team.category && (
//           <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
//             {team.category}
//           </span>
//         )}
//         {dataPolicyBadge(team.dataPolicy)}
//       </div>

//       <p className="text-[11px] text-muted-foreground mt-3">
//         Created{' '}
//         {new Date(team.createdAt).toLocaleDateString('en-IN', {
//           day: 'numeric',
//           month: 'short',
//           year: 'numeric',
//         })}
//       </p>
//     </Link>
//   );
// }

// export function TeamsSection({ teams, buId }: TeamsSectionProps) {
//   return (
//     <section>
//       <div className="flex items-center justify-between mb-3">
//         <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
//           Teams
//         </h2>
//         <Link
//           href={`/dashboard/teams`}
//           className="text-xs text-muted-foreground hover:text-foreground transition-colors"
//         >
//           View all →
//         </Link>
//       </div>

//       {teams.length === 0 ? (
//         <div className="border border-dashed border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
//           No teams yet.{' '}
//           {/* <Link href={`/business-units/${buId}/teams/new`} className="underline underline-offset-2">
//             Create one
//           </Link> */}
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//           {teams.map(team => (
//             <TeamCard key={team.id} team={team} buId={buId} />
//           ))}
//         </div>
//       )}
//     </section>
//   );
// }

import Link from 'next/link';
import { dataPolicyBadge, statusBadge } from './Badges';
import { CompactTable } from './Compacttable';
import { SectionHeader } from './Sectionheader';

interface Team {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  category: string | null;
  dataPolicy: string;
  createdAt: string;
}

interface TeamsSectionProps {
  teams: Team[];
  buId: string;
}

export function TeamsSection({ teams, buId }: TeamsSectionProps) {
  const columns = [
    {
      key: 'name',
      label: 'Team Name',
      width: '180px',
      render: (row: Team) => (
        <Link
          href={`/business-units/${buId}/teams/${row.id}`}
          className="font-medium text-foreground hover:underline underline-offset-2"
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      width: '200px',
      render: (row: Team) => (
        <span className="text-muted-foreground">{row.description ?? '—'}</span>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      width: '100px',
      render: (row: Team) => <span>{row.category ?? '—'}</span>,
    },
    {
      key: 'dataPolicy',
      label: 'Data Policy',
      width: '100px',
      render: (row: Team) => dataPolicyBadge(row.dataPolicy),
    },
    {
      key: 'status',
      label: 'Status',
      width: '80px',
      render: (row: Team) => statusBadge(row.isActive ? 'active' : 'inactive'),
    },
    {
      key: 'createdAt',
      label: 'Created On',
      width: '110px',
      render: (row: Team) =>
        new Date(row.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
    },
  ];

  return (
    <section>
      <SectionHeader title="Teams" count={teams.length} />
      <CompactTable
        columns={columns}
        rows={teams}
        maxHeight="200px"
        emptyMessage="No teams found."
      />
    </section>
  );
}
