// File: page.tsx
// Path: src/app/(dashboard)/my-tickets/page.tsx

'use client';

import { useAuth } from '@/context/AuthContext';
import TicketWorkspace from '@/components/tickets/TicketWorkspace';

export default function MyTicketsPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <TicketWorkspace
      currentUserId={user.id}
      heading="My Tickets"
      subheading="Your queries and their latest status"
    />
  );
}
