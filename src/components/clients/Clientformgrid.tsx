'use client';

import {
  BUFieldLayout,
  FieldKey,
  ALL_FIELD_DEFS,
} from '@/app/(dashboard)/clients/add/config/Bufieldconfig';

import { type UseFormReturn } from 'react-hook-form';
import FormField from './Formfield';
import { ClientFormSchema } from '@/hooks/useNewClientForm';
import { BusinessUnit } from '@/types/core.types';

interface Props {
  form: UseFormReturn<ClientFormSchema>;
  layout: BUFieldLayout;
  businessUnits: BusinessUnit[];
  buLoading: boolean;
  onBUChange: (bu: BusinessUnit | null) => void;
  users?: Array<{ id: string; name: string }>;
  clients?: Array<{ id: string; name: string }>;
}

// Special keys that are handled by BUSelector, not generic FormField
const BU_SELECTOR_KEYS: FieldKey[] = ['primaryBusinessUnit', 'businessUnits'];

// clientVisibility is always col 2 in the first row
function isClientVisibility(key: FieldKey) {
  return key === 'clientVisibility';
}

export default function ClientFormGrid({
  form,
  layout,
  businessUnits,
  buLoading,
  onBUChange,
  users = [],
  clients = [],
}: Props) {
  return (
    <div className="space-y-4">
      {layout.rows.map((row, rowIdx) => {
        // First row always = [primaryBU, clientVisibility, businessUnits]
        if (rowIdx === 0) {
          return (
            <div key="row-0" className="grid grid-cols-3 gap-4">
              {/* col 1: Primary BU select */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Primary Business Unit
                </label>
                <BUSelectorInline
                  form={form}
                  businessUnits={businessUnits}
                  buLoading={buLoading}
                  onBUChange={onBUChange}
                  field="primaryBusinessUnitId"
                />
              </div>

              {/* col 2: Client Visibility radio */}
              <div>
                <FormField config={ALL_FIELD_DEFS['clientVisibility']} form={form} />
              </div>

              {/* col 3: Business Units (mirrors primary) */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Business Units
                </label>
                <BUSelectorInline
                  form={form}
                  businessUnits={businessUnits}
                  buLoading={buLoading}
                  onBUChange={onBUChange}
                  field="businessUnitId"
                />
              </div>
            </div>
          );
        }

        const cells = row;
        return (
          <div key={rowIdx} className="grid grid-cols-3 gap-4">
            {cells.map((key, colIdx) => {
              if (!key) {
                return <div key={`empty-${rowIdx}-${colIdx}`} />;
              }

              const config = ALL_FIELD_DEFS[key];
              if (!config) return <div key={key} />;

              // Full-width (colSpan 3) fields
              if (config.colSpan === 3) {
                return (
                  <div key={key} className="col-span-3">
                    <FormField config={config} form={form} users={users} clients={clients} />
                  </div>
                );
              }

              // Skip BU selector keys (handled in row 0)
              if (BU_SELECTOR_KEYS.includes(key)) return <div key={key} />;

              return (
                <div key={key}>
                  <FormField config={config} form={form} users={users} clients={clients} />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Inline BU select (used directly in the grid) ─────────────
function BUSelectorInline({
  form,
  businessUnits,
  buLoading,
  onBUChange,
  field,
}: {
  form: UseFormReturn<ClientFormSchema>;
  businessUnits: BusinessUnit[];
  buLoading: boolean;
  onBUChange: (bu: BusinessUnit | null) => void;
  field: 'primaryBusinessUnitId' | 'businessUnitId';
}) {
  const { register, watch, setValue } = form;
  const cls =
    'w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 shadow-sm transition focus:border-[#0066CC] focus:outline-none focus:ring-1 focus:ring-[#0066CC]';

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (field === 'primaryBusinessUnitId') {
      setValue('primaryBusinessUnitId', id);
      setValue('businessUnitId', id);
      const bu = businessUnits.find(b => b.id === id) ?? null;
      onBUChange(bu);
    } else {
      setValue('businessUnitId', id);
    }
  };

  return (
    <select value={watch(field) ?? ''} onChange={handleChange} disabled={buLoading} className={cls}>
      <option value="">{buLoading ? 'Loading…' : 'Select'}</option>
      {/* {businessUnits.map((bu: BusinessUnit) => (
        <option key={bu.id} value={bu.id}>
          {bu.name}
        </option>
      ))} */}
      {Array.isArray(businessUnits) &&
        businessUnits.map(bu => (
          <option key={bu.id} value={bu.id}>
            {bu.name}
          </option>
        ))}
    </select>
  );
}
