'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export default function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleLogout() {
    try {
      await logout();
      router.replace('/sign-in');
    } catch {
      toast.error('Logout failed');
    }
  }

  if (!user) return null;

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  const displayName = user.displayName ?? `${user.firstName} ${user.lastName}`;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-foreground/[0.06] transition-all duration-150"
      >
        {/* Avatar */}
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
          {initials}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-foreground/90 leading-none">{displayName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{user.role.name}</p>
        </div>
        {/* Chevron */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`text-foreground/40 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        >
          <path
            d="M2 4l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-card border border-border rounded-xl shadow-lg py-1 z-50">
          {/* User info */}
          <div className="px-3 py-2.5 border-b border-border">
            <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{user.employeeId}</p>
          </div>

          {/* Actions */}
          <div className="py-1">
            <button
              onClick={() => {
                setOpen(false);
                router.push('/settings');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground/70 hover:text-foreground hover:bg-foreground/[0.04] transition-all duration-100"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v2m0 16v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M2 12h2m16 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
              Settings
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive/80 hover:text-destructive hover:bg-destructive/[0.06] transition-all duration-100"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
