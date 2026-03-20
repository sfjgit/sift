import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

const NAV_ITEMS = ['Pipeline', 'Candidates', 'Jobs', 'Analytics', 'Settings'] as const;

export default function HomeNav() {
  return (
    <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-border">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-linear-to-br from-primary to-accent">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 12L8 4L13 12"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M5 9H11" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <span
          className="text-[15px] font-semibold tracking-tight text-foreground/90"
          style={{ letterSpacing: '-0.02em' }}
        >
          TalentOS
        </span>
      </div>

      {/* Dummy nav links */}
      <div className="hidden md:flex items-center gap-1">
        {NAV_ITEMS.map(item => (
          <button
            key={item}
            className="px-3.5 py-1.5 rounded-md text-sm text-foreground/40 hover:text-foreground/80 hover:bg-foreground/5 transition-all duration-150"
          >
            {item}
          </button>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <DocLink href="/org-service-doc" label="Org Service" />
        <DocLink href="/ats-doc" label="ATS Docs" />

        <div className="w-px h-4 bg-border mx-1" />

        {/* Theme toggle lives here */}
        <ThemeToggle />

        <div className="w-px h-4 bg-border mx-1" />

        <Link
          href="/sign-in"
          className="px-4 py-1.5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-150"
        >
          Sign in
        </Link>
      </div>
    </nav>
  );
}

function DocLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm text-foreground/50 hover:text-foreground/90 hover:bg-foreground/6 border border-transparent hover:border-border transition-all duration-150"
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 14 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2 2h6l3 3v7H2V2z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path d="M8 2v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
      {label}
    </Link>
  );
}
