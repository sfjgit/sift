'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useBusinessUnitsApi } from '@/lib/business-units.api';
import { useQuery } from '@tanstack/react-query';
import { BusinessUnit } from '@/types/core.types';

interface Props {
  canAdd: boolean;
}

// const VIEW_TABS = ['Client', 'KaaS_38Cr', 'TaaS_16Cr', 'CSR_18Cr', 'B2I_12 Cr'];

export default function ClientsToolbar({ canAdd }: Props) {
  const [activeTab, setActiveTab] = useState('Client');
  const businessUnitsApi = useBusinessUnitsApi();
  const { data: allBusinessUnits, isLoading } = useQuery({
    queryKey: ['business-units'],
    queryFn: () => businessUnitsApi.getAll(),
  });

  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-1.5">
      <div className="flex items-center gap-0.5">
        {allBusinessUnits?.data?.data?.map((unit: BusinessUnit) => (
          <button
            key={unit.id}
            onClick={() => setActiveTab(unit.name)}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === unit.name
                ? 'bg-[#0066CC] text-white'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            {unit.name}
          </button>
        ))}
        {/* <button className="ml-1 flex items-center gap-1 rounded px-2 py-1.5 text-xs font-medium text-[#0066CC] hover:bg-blue-50">
          + Add View
        </button> */}
      </div>

      <div className="flex items-center gap-1">
        {canAdd && (
          <Link
            href="/dashboard/clients/add"
            className="ml-1 flex items-center gap-1 rounded bg-[#0066CC] px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0052A3] active:scale-95 transition-all"
          >
            New
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </Link>
        )}
      </div>
    </div>
  );
}
