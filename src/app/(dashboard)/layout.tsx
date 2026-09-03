// import AuthGate from '@/components/AuthGate';
import NaukriDailyCheckin from '@/components/layout/NaukriDailyCheckin';
import ScrollingGreetingBar from '@/components/layout/ScrollingGreetingBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import AuthGate from '@/components/ui/AuthGate';
import type { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <NaukriDailyCheckin />
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </AuthGate>
  );
}
