'use client';

const NAV_ITEMS = [
  { label: 'Business Information', icon: 'building', href: '#business-information', active: true },
  // { label: 'Accounts', icon: 'user', href: '#accounts' },
  // { label: 'Notes', icon: 'file-text', href: '#notes' },
  { label: 'Documents', icon: 'folder', href: '#documents' },
  // { label: 'Guidelines', icon: 'clipboard', href: '#guidelines' },
  { label: 'Contacts', icon: 'users', href: '#contacts' },
  { label: 'Assignment', icon: 'check-square', href: '#assignment' },
  // { label: 'Client Submission Format', icon: 'layout', href: '#submission' },
];

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    building: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 3v18M15 3v18M3 9h6M3 15h6M15 9h6M15 15h6" />
      </>
    ),
    user: (
      <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    'file-text': (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </>
    ),
    folder: (
      <>
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </>
    ),
    clipboard: (
      <>
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      </>
    ),
    users: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    'check-square': (
      <>
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </>
    ),
    layout: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </>
    ),
  };
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="flex-shrink-0"
    >
      {paths[name]}
    </svg>
  );
}

export default function NewClientSidebar() {
  return (
    <aside className="flex h-full w-[220px] flex-shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex-1 overflow-y-auto py-1">
        {NAV_ITEMS.map(item => (
          <a
            key={item.label}
            href={item.href}
            className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
              item.active
                ? 'border-r-2 border-[#0066CC] bg-blue-50 font-semibold text-[#0066CC]'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            <Icon name={item.icon} />
            <span className="leading-tight">{item.label}</span>
            {item.active && (
              <svg
                className="ml-auto"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            )}
          </a>
        ))}
      </div>
    </aside>
  );
}
