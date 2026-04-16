'use client';

import { Client } from '@/types/core.types';
import Link from 'next/link';

interface Props {
  client: Client;
  canEdit: boolean;
  canApprove: boolean;
  isApproving: boolean;
  onApprove: () => void;
}

const STATUS = {
  ACTIVE: {
    pill: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    dot: 'bg-emerald-500',
    label: 'Active',
  },
  INACTIVE: {
    pill: 'bg-gray-100 text-gray-500 ring-gray-200',
    dot: 'bg-gray-400',
    label: 'Inactive',
  },
  PENDING: {
    pill: 'bg-amber-100 text-amber-700 ring-amber-200',
    dot: 'bg-amber-400',
    label: 'Pending',
  },
};

function Avatar({ name }: { name: string }) {
  const letters = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#0F172A] text-xl font-black tracking-tight text-white shadow-lg ring-4 ring-white">
      {letters}
    </div>
  );
}

export default function ClientHeader({
  client,
  canEdit,
  canApprove,
  isApproving,
  onApprove,
}: Props) {
  const sc = STATUS[client.status] ?? STATUS.INACTIVE;

  return (
    <div className="relative overflow-hidden border-b border-slate-200 bg-white">
      {/* Subtle grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg,#000 0,#000 1px,transparent 0,transparent 40px),repeating-linear-gradient(90deg,#000 0,#000 1px,transparent 0,transparent 40px)',
        }}
      />

      <div className="relative px-6 py-5">
        {/* Breadcrumb */}
        <div className="mb-4 flex items-center gap-1.5 text-xs text-slate-400">
          <Link href="/clients" className="hover:text-[#0066CC] transition-colors">
            Clients
          </Link>
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="font-medium text-slate-600">{client.name}</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          {/* Left: avatar + identity */}
          <div className="flex items-start gap-4">
            <Avatar name={client.name} />
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">{client.name}</h1>

                {/* Status */}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${sc.pill}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                  {sc.label}
                </span>

                {/* Category */}
                {client.category && (
                  <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-bold tracking-wide text-white">
                    {client.category}
                  </span>
                )}
              </div>

              {/* Meta chips row */}
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {client.vmsName && <Chip icon="tag" text={client.vmsName} />}
                {client.industry && <Chip icon="briefcase" text={client.industry} />}
                {(client.state || client.country) && (
                  <Chip
                    icon="map-pin"
                    text={[client.state, client.country].filter(Boolean).join(', ')}
                  />
                )}
                {client.businessUnit && (
                  <Chip icon="layers" text={client.businessUnit.name} accent />
                )}
                {client.website && (
                  <a
                    href={client.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-[#0066CC] hover:underline"
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    {client.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="flex shrink-0 items-center gap-2">
            {client.status === 'PENDING' && canApprove && (
              <button
                onClick={onApprove}
                disabled={isApproving}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60 active:scale-95 transition-all"
              >
                {isApproving ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                Approve
              </button>
            )}
            {canEdit && (
              <Link
                href={`/clients/${client.id}/edit`}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ icon, text, accent }: { icon: string; text: string; accent?: boolean }) {
  const paths: Record<string, React.ReactNode> = {
    tag: (
      <>
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </>
    ),
    briefcase: (
      <>
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </>
    ),
    'map-pin': (
      <>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
    layers: (
      <>
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </>
    ),
  };
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${accent ? 'text-[#0066CC]' : 'text-slate-500'}`}
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        {paths[icon]}
      </svg>
      {text}
    </span>
  );
}
