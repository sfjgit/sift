'use client';

import { ClientFormSchema } from '@/hooks/useNewClientForm';
import { BusinessUnit } from '@/types/clients.types';
import { useEffect } from 'react';
import { type UseFormReturn } from 'react-hook-form';

const inputCls =
  'w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 shadow-sm transition focus:border-[#0066CC] focus:outline-none focus:ring-1 focus:ring-[#0066CC]';
const labelCls = 'mb-1 block text-xs font-medium text-gray-600';

interface Props {
  form: UseFormReturn<ClientFormSchema>;
  businessUnits: BusinessUnit[];
  isLoading: boolean;
  onBUChange: (bu: BusinessUnit | null) => void;
}

export default function BUSelector({ form, businessUnits, isLoading, onBUChange }: Props) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const primaryBUId = watch('primaryBusinessUnitId');

  // Sync businessUnitId = primaryBusinessUnitId and fire onBUChange
  useEffect(() => {
    if (!primaryBUId) {
      onBUChange(null);
      return;
    }
    const bu = businessUnits.find(b => b.id === primaryBUId) ?? null;
    setValue('businessUnitId', primaryBUId);
    onBUChange(bu);
  }, [primaryBUId]); // eslint-disable-line

  return (
    <>
      {/* Primary Business Unit */}
      <div>
        <label className={labelCls}>Primary Business Unit</label>
        <select {...register('primaryBusinessUnitId')} disabled={isLoading} className={inputCls}>
          <option value="">{isLoading ? 'Loading…' : 'Select'}</option>
          {businessUnits.map(bu => (
            <option key={bu.id} value={bu.id}>
              {bu.name}
            </option>
          ))}
        </select>
        {errors.primaryBusinessUnitId && (
          <p className="mt-0.5 text-xs text-red-500">{errors.primaryBusinessUnitId.message}</p>
        )}
      </div>

      {/* Business Units (mirrors primary) */}
      <div>
        <label className={labelCls}>Business Units</label>
        <select {...register('businessUnitId')} className={inputCls}>
          <option value="">{isLoading ? 'Loading…' : 'Select'}</option>
          {businessUnits.map(bu => (
            <option key={bu.id} value={bu.id}>
              {bu.name}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
