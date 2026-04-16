'use client';

import { useFieldArray, useFormContext } from 'react-hook-form';

export default function AccountsSection() {
  const { control, register } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'accounts',
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Accounts</h2>

        <button
          type="button"
          onClick={() =>
            append({
              contactPerson: '',
              mobileNumber: '',
              officeNumber: '',
              extension: '',
              email: '',
              designation: '',
            })
          }
          className="flex items-center gap-1 rounded bg-[#0066CC] px-3 py-1 text-xs text-white"
        >
          + Add
        </button>
      </div>

      {/* Accounts List */}
      {fields.map((field, index) => (
        <div key={field.id} className="rounded border bg-gray-50 p-4 space-y-3">
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <button type="button" className="text-xs text-blue-600">
              Create Account
            </button>

            <button type="button" onClick={() => remove(index)} className="text-red-500 text-sm">
              ✕
            </button>
          </div>

          {/* Row 1 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-600">Contact Person</label>
              <input
                {...register(`accounts.${index}.contactPerson`)}
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-gray-600">Mobile Number</label>
              <input
                {...register(`accounts.${index}.mobileNumber`)}
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-gray-600">Office Number</label>
              <div className="flex gap-2">
                <input
                  {...register(`accounts.${index}.officeNumber`)}
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                />
                {/* <input
                  placeholder="Ext"
                  {...register(`accounts.${index}.extension`)}
                  className="mt-1 w-20 rounded border px-2 py-1 text-sm"
                /> */}
              </div>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-600">Email ID</label>
              <input
                {...register(`accounts.${index}.email`)}
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-gray-600">Designation</label>
              <input
                {...register(`accounts.${index}.designation`)}
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
