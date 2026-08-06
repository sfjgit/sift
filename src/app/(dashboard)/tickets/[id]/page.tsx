// File: page.tsx
// Path: src/app/(dashboard)/tickets/[id]/page.tsx

'use client';

import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { TicketDetailView } from '@/components/tickets/TicketWorkspace';

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  if (!user) return null;

  return (
    <TicketDetailView ticketId={id} currentUserId={user.id} isAdmin={user.isSuperAdmin === true} />
  );
}
