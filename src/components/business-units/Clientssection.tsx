// import Link from 'next/link';
// import { statusBadge } from './Badges';

// interface Client {
//   id: string;
//   name: string;
//   vmsName: string;
//   category: string;
//   industry: string;
//   country: string;
//   state: string;
//   city: string;
//   status: string;
// }

// interface ClientsSectionProps {
//   clients: Client[];
//   buId: string;
// }

// function ClientInitials({ name }: { name: string }) {
//   const initials = name
//     .split(' ')
//     .slice(0, 2)
//     .map(w => w[0])
//     .join('')
//     .toUpperCase();

//   return (
//     <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0">
//       {initials}
//     </div>
//   );
// }

// function ClientCard({ client, buId }: { client: Client; buId: string }) {
//   return (
//     <Link
//       href={`/dashboard/clients/${client.id}`}
//       className="flex items-start gap-3 bg-card border border-border rounded-xl p-4 hover:border-border/80 hover:shadow-sm transition-all"
//     >
//       <ClientInitials name={client.name} />

//       <div className="flex-1 min-w-0">
//         <div className="flex items-center justify-between gap-2">
//           <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
//           {statusBadge(client.status)}
//         </div>
//         <p className="text-xs text-muted-foreground mt-0.5">{client.vmsName}</p>

//         <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
//           <span>{client.industry}</span>
//           <span>·</span>
//           <span>
//             {client.city}, {client.state}
//           </span>
//           {client.category && (
//             <>
//               <span>·</span>
//               <span className="bg-muted px-1.5 py-0.5 rounded-full">{client.category}</span>
//             </>
//           )}
//         </div>
//       </div>
//     </Link>
//   );
// }

// export function ClientsSection({ clients, buId }: ClientsSectionProps) {
//   return (
//     <section>
//       <div className="flex items-center justify-between mb-3">
//         <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
//           Clients
//         </h2>
//         <Link
//           href={`/dashboard/clients`}
//           className="text-xs text-muted-foreground hover:text-foreground transition-colors"
//         >
//           View all →
//         </Link>
//       </div>

//       {clients.length === 0 ? (
//         <div className="border border-dashed border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
//           No clients assigned yet.
//         </div>
//       ) : (
//         <div className="flex flex-col gap-3">
//           {clients.map(client => (
//             <ClientCard key={client.id} client={client} buId={buId} />
//           ))}
//         </div>
//       )}
//     </section>
//   );
// }

import Link from 'next/link';
import { statusBadge } from './Badges';
import { CompactTable } from './Compacttable';
import { SectionHeader } from './Sectionheader';

interface Client {
  id: string;
  name: string;
  vmsName: string;
  category: string;
  industry: string;
  country: string;
  state: string;
  city: string;
  status: string;
}

interface ClientsSectionProps {
  clients: Client[];
  buId: string;
}

export function ClientsSection({ clients, buId }: ClientsSectionProps) {
  const columns = [
    {
      key: 'name',
      label: 'Client Name',
      width: '160px',
      render: (row: Client) => (
        <Link
          href={`/business-units/${buId}/clients/${row.id}`}
          className="font-medium text-foreground hover:underline underline-offset-2"
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: 'vmsName',
      label: 'VMS Name',
      width: '180px',
      render: (row: Client) => <span className="text-muted-foreground">{row.vmsName}</span>,
    },
    {
      key: 'industry',
      label: 'Industry',
      width: '120px',
      render: (row: Client) => <span>{row.industry}</span>,
    },
    {
      key: 'category',
      label: 'Category',
      width: '90px',
      render: (row: Client) => <span>{row.category || '—'}</span>,
    },
    {
      key: 'location',
      label: 'Location',
      width: '160px',
      render: (row: Client) => (
        <span className="text-muted-foreground">
          {row.city}, {row.state}, {row.country}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '80px',
      render: (row: Client) => statusBadge(row.status),
    },
  ];

  return (
    <section>
      <SectionHeader title="Clients" count={clients.length} />
      <CompactTable
        columns={columns}
        rows={clients}
        maxHeight="200px"
        emptyMessage="No clients assigned."
      />
    </section>
  );
}
