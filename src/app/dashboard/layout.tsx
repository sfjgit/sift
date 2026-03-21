import DashboardNav from '@/components/dashboard/DashboardNav';
import AuthGate from '@/components/ui/AuthGate';
import type { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <main className="px-6 py-6">{children}</main>
      </div>
    </AuthGate>
  );
}
