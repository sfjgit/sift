'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { usePermissions } from '@/hooks/usePermission';
import { MODULES } from '@/constants/modules';
import { getLayoutForBU } from './config/Bufieldconfig';
import ClientFormGrid from '@/components/clients/Clientformgrid';
import { BusinessUnit } from '@/types/core.types';
import { useClients } from '@/lib/clients.api';
import { useNewClientForm } from '@/hooks/useNewClientForm';
import { useBusinessUnitsApi } from '@/lib/business-units.api';
import { useUsersApi } from '@/lib/users.api';
import ContactsSection from '@/components/clients/Contactssection';

export default function NewClientPage() {
  const router = useRouter();
  const { canAdd, canView } = usePermissions(MODULES.CLIENTS);
  const clientsApi = useClients();
  const businessUnitsApi = useBusinessUnitsApi();
  const { form } = useNewClientForm();

  // Minimal state: only the selected BU object (drives layout)
  const [selectedBU, setSelectedBU] = useState<BusinessUnit | null>(null);
  // const [activeSection, setActiveSection] = useState('business-information');

  // ── Data fetching ────────────────────────────────────────────
  const { data: businessUnits = [], isLoading: buLoading } = useQuery<BusinessUnit[]>({
    queryKey: ['business-units'],
    queryFn: async () => {
      const res = await businessUnitsApi.getAll();

      console.log('API RAW:', res.data); // debug
      console.log('ARRAY:', res.data.data); // debug

      return res.data.data; // ✅ ALWAYS return array
    },
  });
  const usersApi = useUsersApi();

  const { data: users = [] } = useQuery({
    queryKey: ['users-slim'],
    queryFn: async () => {
      const res = await usersApi.getAll({ limit: 100 });
      return res.data.data;
    },
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (data: any) => clientsApi.create(data),
    onSuccess: res => {
      const clientId = res?.data?.data?.id; // ⚠️ Axios response structure
      //   router.push(`dashboard/clients/${clientId}`);
    },
  });

  // ── Layout derived from selected BU category (no useState needed) ──
  const layout = getLayoutForBU(selectedBU?.category);

  // ── Permission guards ─────────────────────────────────────────
  if (canView === undefined || canAdd === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F0F4F8]">
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-[#0066CC] border-t-transparent" />
      </div>
    );
  }

  if (!canAdd) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 bg-[#F0F4F8]">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#EF4444"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-700">
          You don&apos;t have permission to create clients.
        </p>
      </div>
    );
  }

  const onSubmit = form.handleSubmit(values => {
    createMutation.mutate({
      name: values.name,
      vmsName: values.vmsName || null,
      category: values.category || null,
      industry: values.industry || null,
      website: values.website || null,
      country: values.country,
      state: values.state || null,
      city: values.city || null,
      address: values.address || null,
      businessUnitId: values.businessUnitId || null,
    });
  });

  return (
    <div
      className="flex h-screen flex-col overflow-hidden bg-[#F0F4F8]"
      style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}
    >
      {/* ── Top bar ───────────────────────────────────────────── */}

      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5 py-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          {/* Breadcrumb back */}
          <button
            type="button"
            onClick={() => router.push('/dashboard/clients')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0066CC] transition-colors"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Clients
          </button>
          <span className="text-gray-300">/</span>
          <h1 className="text-sm font-semibold text-gray-800">New Client</h1>
        </div>

        <div className="flex items-center gap-2">
          {createMutation.isError && (
            <span className="text-xs text-red-500">{(createMutation.error as Error).message}</span>
          )}
          <button
            type="button"
            onClick={() => router.push('/clients')}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={createMutation.isPending}
            className="flex items-center gap-1.5 rounded bg-[#0066CC] px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0052A3] disabled:opacity-60 active:scale-95 transition-all"
          >
            {createMutation.isPending ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving…
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        {/* <NewClientSidebar /> */}

        {/* Form content — scrolls independently */}
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="mx-auto w-full max-w-300 px-8 py-6">
            {/* Section header */}
            <div className="mb-6 flex items-center gap-4">
              {/* Building icon */}
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-gray-200 bg-linear-to-br from-[#EEF4FF] to-[#E0EEFF] shadow-sm">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0066CC"
                  strokeWidth="1.5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18M15 3v18M3 9h6M3 15h6M15 9h6M15 15h6" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-800">Business Information</h2>
              </div>
            </div>

            {/* Dynamic form grid */}
            <form onSubmit={onSubmit} className="pb-10">
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md p-6">
                <ClientFormGrid
                  form={form}
                  layout={layout}
                  businessUnits={businessUnits}
                  buLoading={buLoading}
                  onBUChange={setSelectedBU}
                  users={users}
                />
              </div>

              <ContactsSection users={users} />
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
