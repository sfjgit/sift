// import Link from 'next/link';
// import { jobTypeBadge, priorityBadge, remoteTypeBadge, statusBadge } from './Badges';

// interface Requirement {
//   id: string;
//   reqCode: string;
//   title: string;
//   description: string;
//   jobType: string;
//   remoteType: string;
//   priority: string;
//   totalOpenings: number;
//   filledOpenings: number;
//   location: string;
//   country: string;
//   salaryMin: number;
//   salaryMax: number;
//   salaryType: string;
//   status: string;
// }

// interface RequirementsSectionProps {
//   requirements: Requirement[];
//   buId: string;
// }

// function formatSalary(amount: number) {
//   if (amount >= 100000) {
//     return `₹${(amount / 100000).toFixed(1)}L`;
//   }
//   return `₹${amount.toLocaleString('en-IN')}`;
// }

// function RequirementCard({ req, buId }: { req: Requirement; buId: string }) {
//   const fillPercent = req.totalOpenings > 0 ? (req.filledOpenings / req.totalOpenings) * 100 : 0;

//   return (
//     <Link
//       href={`/dashboard/requirements/${req.id}`}
//       className="block bg-card border border-border rounded-xl p-4 hover:border-border/80 hover:shadow-sm transition-all"
//     >
//       {/* Top row */}
//       <div className="flex items-start justify-between gap-3 mb-3">
//         <div className="min-w-0">
//           <p className="text-[11px] font-mono text-muted-foreground mb-1">{req.reqCode}</p>
//           <p className="text-sm font-medium text-foreground leading-snug">{req.title}</p>
//           <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{req.description}</p>
//         </div>
//         {statusBadge(req.status)}
//       </div>

//       {/* Badge row */}
//       <div className="flex flex-wrap gap-1.5 mb-3">
//         {priorityBadge(req.priority)}
//         {jobTypeBadge(req.jobType)}
//         {remoteTypeBadge(req.remoteType)}
//         <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border bg-gray-50 text-gray-600 border-gray-200">
//           {req.location}, {req.country}
//         </span>
//       </div>

//       {/* Openings progress */}
//       <div className="mb-3">
//         <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
//           <span>Openings filled</span>
//           <span className="font-medium text-foreground">
//             {req.filledOpenings} / {req.totalOpenings}
//           </span>
//         </div>
//         <div className="h-1.5 bg-muted rounded-full overflow-hidden">
//           <div
//             className="h-full bg-green-500 rounded-full transition-all"
//             style={{ width: `${fillPercent}%` }}
//           />
//         </div>
//       </div>

//       {/* Salary */}
//       <div className="flex items-center justify-between text-xs">
//         <span className="text-muted-foreground">Salary range</span>
//         <span className="font-medium text-foreground">
//           {formatSalary(req.salaryMin)} – {formatSalary(req.salaryMax)}{' '}
//           <span className="text-muted-foreground font-normal">{req.salaryType}</span>
//         </span>
//       </div>
//     </Link>
//   );
// }

// export function RequirementsSection({ requirements, buId }: RequirementsSectionProps) {
//   return (
//     <section>
//       <div className="flex items-center justify-between mb-3">
//         <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
//           Requirements
//         </h2>
//         <Link
//           href={`/dashboard/requirements`}
//           className="text-xs text-muted-foreground hover:text-foreground transition-colors"
//         >
//           View all →
//         </Link>
//       </div>

//       {requirements.length === 0 ? (
//         <div className="border border-dashed border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
//           No requirements yet.{' '}
//           {/* <Link
//             href={`/business-units/${buId}/requirements/new`}
//             className="underline underline-offset-2"
//           >
//             Create one
//           </Link> */}
//         </div>
//       ) : (
//         <div className="flex flex-col gap-3">
//           {requirements.map(req => (
//             <RequirementCard key={req.id} req={req} buId={buId} />
//           ))}
//         </div>
//       )}
//     </section>
//   );
// }

import Link from 'next/link';
import { priorityBadge, jobTypeBadge, remoteTypeBadge, statusBadge } from './Badges';
import { CompactTable } from './Compacttable';
import { SectionHeader } from './Sectionheader';

interface Requirement {
  id: string;
  reqCode: string;
  title: string;
  description: string;
  jobType: string;
  remoteType: string;
  priority: string;
  totalOpenings: number;
  filledOpenings: number;
  location: string;
  country: string;
  salaryMin: number;
  salaryMax: number;
  salaryType: string;
  status: string;
}

interface RequirementsSectionProps {
  requirements: Requirement[];
  buId: string;
}

function formatSalary(amount: number) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function RequirementsSection({ requirements, buId }: RequirementsSectionProps) {
  const columns = [
    {
      key: 'reqCode',
      label: 'Req Code',
      width: '110px',
      render: (row: Requirement) => (
        <Link
          href={`/business-units/${buId}/requirements/${row.id}`}
          className="font-mono text-[11px] text-blue-600 hover:underline underline-offset-2"
        >
          {row.reqCode}
        </Link>
      ),
    },
    {
      key: 'title',
      label: 'Title',
      width: '200px',
      render: (row: Requirement) => (
        <span className="font-medium text-foreground">{row.title}</span>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      width: '80px',
      render: (row: Requirement) => priorityBadge(row.priority),
    },
    {
      key: 'jobType',
      label: 'Job Type',
      width: '90px',
      render: (row: Requirement) => jobTypeBadge(row.jobType),
    },
    {
      key: 'remoteType',
      label: 'Work Mode',
      width: '90px',
      render: (row: Requirement) => remoteTypeBadge(row.remoteType),
    },
    {
      key: 'openings',
      label: 'Openings',
      width: '90px',
      render: (row: Requirement) => (
        <span>
          <span className="font-medium text-foreground">{row.filledOpenings}</span>
          <span className="text-muted-foreground"> / {row.totalOpenings}</span>
        </span>
      ),
    },
    {
      key: 'salary',
      label: 'Salary Range',
      width: '140px',
      render: (row: Requirement) => (
        <span className="text-muted-foreground">
          {formatSalary(row.salaryMin)} – {formatSalary(row.salaryMax)}
          <span className="text-[10px] ml-1">{row.salaryType}</span>
        </span>
      ),
    },
    {
      key: 'location',
      label: 'Location',
      width: '120px',
      render: (row: Requirement) => (
        <span className="text-muted-foreground">
          {row.location}, {row.country}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '80px',
      render: (row: Requirement) => statusBadge(row.status),
    },
  ];

  return (
    <section>
      <SectionHeader title="Requirements" count={requirements.length} />
      <CompactTable
        columns={columns}
        rows={requirements}
        maxHeight="220px"
        emptyMessage="No requirements found."
      />
    </section>
  );
}
