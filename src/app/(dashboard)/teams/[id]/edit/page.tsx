'use client';
import { TeamForm } from '@/components/teams/TeamForm';
import { useParams } from 'next/navigation';

export default function EditTeamPage() {
  const { id } = useParams<{ id: string }>();
  return <TeamForm mode="edit" teamId={id} />;
}
