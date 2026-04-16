'use client';

import { ClientContact } from '@/types/core.types';

interface Props {
  contacts: ClientContact[];
  canAdd: boolean;
  clientId: string;
}

function Avatar({ contact }: { contact: ClientContact }) {
  const letters = [contact.firstName, contact.lastName]
    .filter(Boolean)
    .map(n => n![0].toUpperCase())
    .join('');
  return (
    <div
      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-black text-white shadow-sm ${
        contact.isPrimary
          ? 'bg-gradient-to-br from-[#0066CC] to-[#003D7A]'
          : 'bg-gradient-to-br from-slate-500 to-slate-700'
      }`}
    >
      {letters || '?'}
    </div>
  );
}

export default function ContactsPanel({ contacts, canAdd, clientId }: Props) {
  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-14">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#94A3B8"
          strokeWidth="1.5"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="22" y1="11" x2="16" y2="11" />
        </svg>
        <p className="mt-2 text-sm font-medium text-slate-400">No contacts added yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {contacts.map(contact => (
        <div
          key={contact.id}
          className={`group flex items-center gap-4 rounded-xl border bg-white px-4 py-3.5 shadow-sm transition-shadow hover:shadow-md ${
            contact.isPrimary ? 'border-[#0066CC]/25' : 'border-slate-200'
          }`}
        >
          <Avatar contact={contact} />

          {/* Name + designation */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">
                {[contact.firstName, contact.lastName].filter(Boolean).join(' ')}
              </span>
              {contact.isPrimary && (
                <span className="rounded-full bg-[#0066CC] px-2 py-0.5 text-[10px] font-bold text-white">
                  PRIMARY
                </span>
              )}
              {!contact.isActive && (
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  INACTIVE
                </span>
              )}
            </div>
            <a
              href={`mailto:${contact.email}`}
              className="mt-0.5 block text-xs text-[#0066CC] hover:underline"
            >
              {contact.email}
            </a>
          </div>

          {/* Phone */}
          <div className="hidden text-right sm:block">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Phone
            </p>
            <p className="text-sm text-slate-700">
              {contact.phone ?? <span className="text-slate-300">—</span>}
            </p>
          </div>

          {/* Contact ID */}
          <div className="hidden text-right xl:block">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">ID</p>
            <p className="font-mono text-[11px] text-slate-400 max-w-[110px] truncate">
              {contact.id}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
