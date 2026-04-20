'use client';

import { FieldConfig } from '@/app/dashboard/clients/add/config/Bufieldconfig';
import { ClientFormSchema } from '@/hooks/useNewClientForm';
import { type UseFormReturn, Controller } from 'react-hook-form';

// ── shared input classes ─────────────────
const inputCls =
  'w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 placeholder-gray-400 shadow-sm transition focus:border-[#0066CC] focus:outline-none focus:ring-1 focus:ring-[#0066CC] disabled:bg-gray-50 disabled:text-gray-400';

const selectCls =
  'w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 shadow-sm transition focus:border-[#0066CC] focus:outline-none focus:ring-1 focus:ring-[#0066CC]';

const labelCls = 'mb-1 block text-xs font-medium text-gray-600';

const INDUSTRY_OPTIONS = [
  'IT Services',
  'IT Services and IT Consulting',
  'Healthcare - Health Services',
  'Banking & Finance',
  'Manufacturing',
  'Retail',
  'Education',
  'Government',
  'Logistics',
  'Consulting',
  'Telecom',
];

const CATEGORY_OPTIONS = ['KaaS', 'TaaS', 'OEM', 'CSR', 'B2G', 'B2I', 'B2C'];

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const PAYMENT_TERMS = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on Receipt'];
const PRACTICE_OPTIONS = ['Engineering', 'Finance', 'Healthcare', 'Legal', 'Operations', 'Sales'];

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

const COUNTRIES = ['India', 'United States', 'United Kingdom', 'UAE', 'Singapore', 'Australia'];

const REQ_DOCS = [
  'Resume',
  'Cover Letter',
  'ID Proof',
  'Offer Letter',
  'Bank Details',
  'PAN Card',
  'Aadhaar',
];

interface Props {
  config: FieldConfig;
  form: UseFormReturn<ClientFormSchema>;
  // For selects that need API data
  users?: Array<{ id: string; name: string }>;
  clients?: Array<{ id: string; name: string }>;
}

export default function FormField({ config, form, users = [], clients = [] }: Props) {
  const {
    register,
    control,
    formState: { errors },
  } = form;
  const error = errors[config.key as keyof ClientFormSchema];
  const errorMsg = error?.message as string | undefined;

  const labelEl = (
    <label htmlFor={config.key} className={labelCls}>
      {config.label}
      {config.required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );

  // ── CHECKBOX ────────────────────────────
  if (config.type === 'checkbox') {
    return (
      <div className="flex items-start gap-2 pt-1">
        <input
          type="checkbox"
          id={config.key}
          {...register(config.key as keyof ClientFormSchema)}
          className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 accent-[#0066CC]"
        />
        <label htmlFor={config.key} className="text-xs text-gray-600 leading-snug">
          {config.label}
        </label>
      </div>
    );
  }

  // ── TOGGLE ──────────────────────────────
  if (config.type === 'toggle') {
    return (
      <div>
        {labelEl}
        <Controller
          control={control}
          name="displayOnJob"
          render={({ field }) => (
            <button
              type="button"
              onClick={() => field.onChange(!field.value)}
              className={`relative inline-flex h-6 w-12 items-center rounded-full border transition-colors ${
                field.value ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  field.value ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
              <span
                className={`absolute text-[9px] font-bold ${
                  field.value ? 'left-1.5 text-white' : 'right-1 text-gray-400'
                }`}
              >
                {field.value ? 'ON' : 'OFF'}
              </span>
            </button>
          )}
        />
      </div>
    );
  }

  // ── RADIO (clientVisibility) ─────────────
  if (config.type === 'radio') {
    return (
      <div>
        {labelEl}
        <div className="flex items-center gap-4 pt-1">
          {(['ORGANIZATION', 'BUSINESS_UNIT'] as const).map(val => (
            <label
              key={val}
              className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer"
            >
              <input
                type="radio"
                value={val}
                {...register('clientVisibility')}
                className="accent-[#0066CC]"
              />
              {val === 'ORGANIZATION' ? 'Organization Level' : 'Business Unit'}
            </label>
          ))}
        </div>
      </div>
    );
  }

  // ── TEXTAREA ─────────────────────────────
  if (config.type === 'textarea') {
    return (
      <div>
        {labelEl}
        <textarea
          id={config.key}
          {...register(config.key as keyof ClientFormSchema)}
          rows={5}
          className={`${inputCls} resize-none`}
          placeholder={config.placeholder}
        />
        {errorMsg && <p className="mt-0.5 text-xs text-red-500">{errorMsg}</p>}
      </div>
    );
  }

  // ── MULTISELECT (requiredDocs) ───────────
  if (config.type === 'multiselect') {
    return (
      <div>
        {labelEl}
        <Controller
          control={control}
          name="requiredDocs"
          render={({ field }) => {
            const selected: string[] = field.value || [];
            const count = selected.length;
            return (
              <details className="relative">
                <summary className={`${selectCls} cursor-pointer list-none`}>
                  {count === 0 ? 'Select documents' : `${count} of ${REQ_DOCS.length} selected`}
                </summary>
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                  {REQ_DOCS.map(doc => (
                    <label
                      key={doc}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(doc)}
                        onChange={e => {
                          if (e.target.checked) field.onChange([...selected, doc]);
                          else field.onChange(selected.filter(d => d !== doc));
                        }}
                        className="accent-[#0066CC]"
                      />
                      {doc}
                    </label>
                  ))}
                </div>
              </details>
            );
          }}
        />
      </div>
    );
  }

  // ── SELECT ───────────────────────────────
  if (config.type === 'select') {
    let options: Array<{ value: string; label: string }> = [];

    switch (config.key) {
      case 'industry':
        options = INDUSTRY_OPTIONS.map(o => ({ value: o, label: o }));
        break;
      case 'category':
        options = CATEGORY_OPTIONS.map(o => ({ value: o, label: o }));
        break;
      case 'status':
        options = STATUS_OPTIONS;
        break;
      case 'state':
        options = INDIA_STATES.map(s => ({ value: s, label: s }));
        break;
      case 'country':
        options = COUNTRIES.map(c => ({ value: c, label: c }));
        break;
      case 'paymentTerms':
        options = PAYMENT_TERMS.map(p => ({ value: p, label: p }));
        break;
      case 'practice':
        options = PRACTICE_OPTIONS.map(p => ({ value: p, label: p }));
        break;
      case 'primaryOwner':
      case 'ownership':
      case 'clientLead':
        options = users.map(u => ({ value: u.id, label: u.name }));
        break;
      case 'childClients':
        options = clients.map(c => ({ value: c.id, label: c.name }));
        break;
    }

    const registerKey = (() => {
      switch (config.key) {
        case 'primaryOwner':
          return 'primaryOwnerId';
        case 'ownership':
          return 'ownershipId';
        case 'clientLead':
          return 'clientLeadId';
        case 'childClients':
          return 'childClientId';
        case 'country':
          return 'country';
        case 'state':
          return 'state';
        default:
          return config.key;
      }
    })() as keyof ClientFormSchema;

    return (
      <div>
        {labelEl}
        <select id={config.key} {...register(registerKey)} className={selectCls}>
          <option value="">{config.placeholder ?? 'Select'}</option>
          {options.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {errorMsg && <p className="mt-0.5 text-xs text-red-500">{errorMsg}</p>}
      </div>
    );
  }

  // ── TEXT (default) ────────────────────────
  const textKey = (() => {
    switch (config.key) {
      case 'vmsName':
        return 'vmsName';
      case 'federalId':
        return 'federalId';
      case 'contactNumber':
        return 'contactNumber';
      case 'emailId':
        return 'emailId';
      case 'address':
        return 'address';
      case 'fax':
        return 'fax';
      default:
        return config.key;
    }
  })() as keyof ClientFormSchema;

  return (
    <div>
      {labelEl}
      <input
        type="text"
        id={config.key}
        {...register(textKey)}
        placeholder={config.placeholder}
        className={inputCls}
      />
      {errorMsg && <p className="mt-0.5 text-xs text-red-500">{errorMsg}</p>}
    </div>
  );
}
