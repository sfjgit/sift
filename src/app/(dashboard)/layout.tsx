//\src\app\(dashboard)\layout.tsx

// import AuthGate from '@/components/AuthGate';
import ChatWidget from '@/components/dashboard/ChatWidget';
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner';
import NaukriDailyCheckin from '@/components/layout/NaukriDailyCheckin';
// import ScrollingGreetingBar from '@/components/layout/ScrollingGreetingBar';
import { Sidebar } from '@/components/layout/Sidebar';
// import { Topbar } from '@/components/layout/Topbar';
import { TopbarWrapper } from '@/components/layout/TopbarWrapper';
import AuthGate from '@/components/ui/AuthGate';
import { TourEngine } from '@/features/tour/TourEngine';
import type { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <NaukriDailyCheckin />
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <ImpersonationBanner />
          <TopbarWrapper />
          <main className="flex-1 overflow-y-auto">
            {children}

            <ChatWidget />
            <TourEngine />
          </main>
        </div>
      </div>
    </AuthGate>
  );
}
