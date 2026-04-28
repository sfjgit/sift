'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Page exports
// ─────────────────────────────────────────────────────────────────────────────

import { TeamForm } from '@/components/teams/TeamForm';

export default function CreateTeamPage() {
  return <TeamForm mode="create" />;
}
