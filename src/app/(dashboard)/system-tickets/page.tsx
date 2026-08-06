// File: page.tsx
// Path: src/app/(dashboard)/system-tickets/page.tsx

'use client';

import { useAuth } from '@/context/AuthContext';
import TicketWorkspace from '@/components/tickets/TicketWorkspace';

export default function SystemTicketsPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <TicketWorkspace
      currentUserId={user.id}
      isAdmin
      showCategoryTab
      heading="System Tickets"
      subheading="Everything across the platform"
    />
  );
}
