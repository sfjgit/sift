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

// export default function DashboardLayout({ children }: { children: ReactNode }) {
//   return (
//     <AuthGate>
//       <div className="h-screen flex flex-col bg-background overflow-hidden">
//         {/* Navbar */}
//         <div className="flex-shrink-0">
//           <DashboardNav />
//         </div>

//         {/* Page content */}
//         <main className="flex-1 min-h-0 px-6 pt-6 overflow-hidden">{children}</main>
//       </div>
//     </AuthGate>
//   );
// }
