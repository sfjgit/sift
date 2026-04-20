'use client';

import { useFormContext, Controller, useWatch } from 'react-hook-form';

// ── shared style tokens ───────────────────────────────────────
const inputCls =
  'w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 placeholder-gray-400 shadow-sm transition focus:border-[#0066CC] focus:outline-none focus:ring-1 focus:ring-[#0066CC]';
const selectCls =
  'w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 shadow-sm transition focus:border-[#0066CC] focus:outline-none focus:ring-1 focus:ring-[#0066CC] cursor-pointer';
const labelCls = 'mb-1 block text-xs font-medium text-gray-600';

const INDIA_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Jammu & Kashmir',
  'Ladakh',
];
const COUNTRIES = [
  'India',
  'United States',
  'United Kingdom',
  'UAE',
  'Singapore',
  'Australia',
  'Canada',
];
const CLIENT_GROUPS = ['Strategic', 'Enterprise', 'SMB', 'Government', 'Partner'];

interface ContactCardProps {
  index: number;
  onRemove: (index: number) => void;
  users: Array<{ id: string; name: string }>;
  isOnly: boolean;
}

export default function ContactCard({ index, onRemove, users, isOnly }: ContactCardProps) {
  // useFormContext: no prop-drilling needed since ContactsSection wraps in FormProvider
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext();

  const prefix = `contacts.${index}` as const;
  const err = (field: string) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (errors as any)?.contacts?.[index]?.[field]?.message as string | undefined;

  const isPrimary = useWatch({ control, name: `${prefix}.isPrimary` });
  const firstName = useWatch({ control, name: `${prefix}.firstName` }) || '';
  const lastName = useWatch({ control, name: `${prefix}.lastName` }) || '';
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || `Contact ${index + 1}`;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* ── Card header ─────────────────────────────────── */}
      <div
        className={`flex items-center gap-3 border-b px-4 py-2.5 ${
          isPrimary ? 'border-[#0066CC]/20 bg-[#EEF4FF]' : 'border-gray-100 bg-gray-50'
        }`}
      >
        {/* Avatar */}
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
            isPrimary ? 'bg-[#0066CC] text-white' : 'bg-gray-200 text-gray-600'
          }`}
        >
          {firstName ? firstName[0].toUpperCase() : index + 1}
        </div>

        {/* Name + primary badge */}
        <div className="flex flex-1 items-center gap-2">
          <span
            className={`text-sm font-semibold ${isPrimary ? 'text-[#0066CC]' : 'text-gray-700'}`}
          >
            {displayName}
          </span>
          {isPrimary && (
            <span className="rounded-full bg-[#0066CC] px-2 py-0.5 text-[10px] font-bold text-white">
              PRIMARY
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Mark as primary toggle */}
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500">
            <Controller
              control={control}
              name={`${prefix}.isPrimary`}
              render={({ field }) => (
                <input
                  type="checkbox"
                  checked={!!field.value}
                  onChange={field.onChange}
                  className="h-3.5 w-3.5 rounded border-gray-300 accent-[#0066CC]"
                />
              )}
            />
            Primary
          </label>

          {/* Remove — disabled if only one card */}
          {!isOnly && (
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
              title="Remove contact"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Form fields ─────────────────────────────────── */}
      <div className="px-5 py-5">
        {/* Row 1: First Name | Last Name | Designation */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register(`${prefix}.firstName`)}
              className={inputCls}
              placeholder="Required"
            />
            {err('firstName') && <p className="mt-0.5 text-xs text-red-500">{err('firstName')}</p>}
          </div>
          <div>
            <label className={labelCls}>Last Name</label>
            <input {...register(`${prefix}.lastName`)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Designation</label>
            <input {...register(`${prefix}.designation`)} className={inputCls} />
          </div>
        </div>

        {/* Row 2: Office Number (with ext) | POC Mobile | POC Email */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Office Number</label>
            <div className="flex gap-1.5">
              <input
                {...register(`${prefix}.officeNumber`)}
                className={inputCls}
                placeholder="Number"
              />
              <input
                {...register(`${prefix}.officeExtension`)}
                className="w-24 shrink-0 rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 placeholder-gray-400 shadow-sm focus:border-[#0066CC] focus:outline-none focus:ring-1 focus:ring-[#0066CC]"
                placeholder="Ext."
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>
              POC Mobile number
              <span
                className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-300 text-[9px] text-white"
                title="Point of Contact mobile"
              >
                ?
              </span>
            </label>
            <input {...register(`${prefix}.mobileNumber`)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>
              POC Email ID <span className="text-red-500">*</span>
              <span
                className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-300 text-[9px] text-white"
                title="Point of Contact email"
              >
                ?
              </span>
            </label>
            <input {...register(`${prefix}.pocEmailId`)} type="email" className={inputCls} />
            {err('pocEmailId') && (
              <p className="mt-0.5 text-xs text-red-500">{err('pocEmailId')}</p>
            )}
          </div>
        </div>

        {/* Row 3: Secondary Email | Primary Owner | Ownership */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Secondary Email ID</label>
            <input {...register(`${prefix}.secondaryEmailId`)} type="email" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>
              Primary Owner <span className="text-red-500">*</span>
            </label>
            <select {...register(`${prefix}.primaryOwnerId`)} className={selectCls}>
              <option value="">Select</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Ownership</label>
            <select {...register(`${prefix}.ownership`)} className={selectCls}>
              <option value="">Select</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            {/* Allow Access checkbox sits below Ownership */}
            <label className="mt-2 flex cursor-pointer items-center gap-1.5 text-xs text-gray-600">
              <input
                type="checkbox"
                {...register(`${prefix}.allowAccessAll`)}
                className="h-3.5 w-3.5 rounded border-gray-300 accent-[#0066CC]"
              />
              Allow Access to All Users
            </label>
          </div>
        </div>

        {/* Row 4: Address 1 | Address 2 | Country */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Address 1</label>
            <input {...register(`${prefix}.address1`)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Address 2</label>
            <input {...register(`${prefix}.address2`)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Country</label>
            <select {...register(`${prefix}.country`)} className={selectCls}>
              {COUNTRIES.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 5: State | City | Zip Code */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>State</label>
            <select {...register(`${prefix}.state`)} className={selectCls}>
              <option value="">Select</option>
              {INDIA_STATES.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>City</label>
            <input {...register(`${prefix}.city`)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Zip Code</label>
            <input {...register(`${prefix}.zipCode`)} className={inputCls} />
          </div>
        </div>

        {/* Row 6: LinkedIn | Status | Client Group */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Linkedin Profile URL</label>
            <input
              {...register(`${prefix}.linkedinUrl`)}
              className={inputCls}
              placeholder="https://linkedin.com/in/…"
            />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select {...register(`${prefix}.status`)} className={selectCls}>
              <option value="">Select</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Client Group</label>
            <select {...register(`${prefix}.clientGroup`)} className={selectCls}>
              <option value="">Select</option>
              {CLIENT_GROUPS.map(g => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 7: About the Contact — full width */}
        <div className="mt-4">
          <label className={labelCls}>About the Contact</label>
          <textarea
            {...register(`${prefix}.aboutContact`)}
            rows={3}
            className={`${inputCls} resize-none`}
          />
        </div>
      </div>
    </div>
  );
}
