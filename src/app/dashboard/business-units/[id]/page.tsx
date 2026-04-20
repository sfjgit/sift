/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useParams } from 'next/navigation';

import { BUHeader } from '@/components/business-units/Buheader';
import { BUStats } from '@/components/business-units/Bustats';
import { ClientsSection } from '@/components/business-units/Clientssection';
import { PeopleSection } from '@/components/business-units/Peoplesection';
import { RequirementsSection } from '@/components/business-units/Requirementssection';
import { TeamsSection } from '@/components/business-units/Teamssection';
import useSWR from 'swr';
import { useBusinessUnitsApi } from '@/lib/business-units.api';

// ─── Page ───────────────────────────────────────────────

export default function BusinessUnitPage() {
  const { id } = useParams<{ id: string }>();

  const api = useBusinessUnitsApi();

  const { data: bu, isLoading } = useSWR(id ? `business-unit:${id}` : null, async () => {
    const res = await api.getOne(id);
    return res.data.data;
  });

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  // Derived stats
  const openingsTotal = bu.requirements.reduce((sum: number, r: any) => sum + r.totalOpenings, 0);

  const filledTotal = bu.requirements.reduce((sum: number, r: any) => sum + r.filledOpenings, 0);

  return (
    <div className="max-w-8xl mx-auto px-4 py-6">
      <BUHeader
        id={bu.id}
        name={bu.name}
        isActive={bu.isActive}
        parentBU={bu.parentBU}
        createdAt={bu.createdAt}
      />

      <BUStats
        teamsCount={bu.teams.length}
        usersCount={bu.users.length}
        clientsCount={bu.clients.length}
        requirementsCount={bu.requirements.length}
        openingsTotal={openingsTotal}
        filledTotal={filledTotal}
      />

      {/* <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">
        <div className="flex flex-col gap-6">
          <ClientsSection clients={bu.clients} buId={bu.id} />
          <RequirementsSection requirements={bu.requirements} buId={bu.id} />
          <TeamsSection teams={bu.teams} buId={bu.id} />
        </div>

        <div className="flex flex-col gap-6">
          <PeopleSection users={bu.users} buId={bu.id} />

          {bu.childBUs.length > 0 && (
            <section>
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Sub-units
              </h2>

              <div className="flex flex-col gap-2">
                {bu.childBUs.map((child: any) => (
                  <a
                    key={child.id}
                    href={`/business-units/${child.id}`}
                    className="flex items-center justify-between bg-card border rounded-xl px-4 py-3 hover:shadow-sm text-sm"
                  >
                    <span>{child.name}</span>
                    <span className="text-xs">→</span>
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
      </div> */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ClientsSection clients={bu.clients} buId={bu.id} />

        <RequirementsSection requirements={bu.requirements} buId={bu.id} />

        <TeamsSection teams={bu.teams} buId={bu.id} />

        <PeopleSection users={bu.users} buId={bu.id} />

        {bu.childBUs.length > 0 && (
          <section className="md:col-span-2">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
              Sub-units
            </h2>

            <div className="flex flex-col gap-2">
              {bu.childBUs.map((child: any) => (
                <a
                  key={child.id}
                  href={`/business-units/${child.id}`}
                  className="flex items-center justify-between bg-card border rounded-xl px-4 py-3 hover:shadow-sm text-sm"
                >
                  <span>{child.name}</span>
                  <span className="text-xs">→</span>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
