import { Client } from '@/types/clients.types';

interface Props {
  client: Client;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <div className="text-sm font-medium text-slate-700">
        {children ?? <span className="font-normal text-slate-300">—</span>}
      </div>
    </div>
  );
}

export default function OverviewPanel({ client }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Section title */}
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
          Business Information
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-x-6 gap-y-5 px-5 py-5">
        <Field label="Client Name">{client.name}</Field>
        <Field label="VMS Name">{client.vmsName}</Field>
        <Field label="Category">{client.category}</Field>
        <Field label="Industry">{client.industry}</Field>
        <Field label="Status">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${
              client.status === 'ACTIVE'
                ? 'bg-emerald-100 text-emerald-700'
                : client.status === 'PENDING'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-600'
            }`}
          >
            {client.status}
          </span>
        </Field>
        <Field label="Business Unit">{client.businessUnit?.name}</Field>
        <Field label="Website">
          {client.website ? (
            <a
              href={client.website}
              target="_blank"
              rel="noreferrer"
              className="text-[#0066CC] hover:underline break-all"
            >
              {client.website}
            </a>
          ) : null}
        </Field>
        <Field label="State">{client.state}</Field>
        <Field label="Country">{client.country}</Field>
      </div>

      {/* System IDs */}
      <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          System Identifiers
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Client ID', value: client.id },
            { label: 'Business Unit ID', value: client.businessUnit?.id ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-slate-100 bg-white px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {label}
              </p>
              <p className="mt-0.5 font-mono text-xs text-slate-500 break-all">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
