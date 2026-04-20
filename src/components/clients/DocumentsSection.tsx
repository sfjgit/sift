'use client';

import { useFieldArray, useFormContext } from 'react-hook-form';

export default function DocumentsSection() {
  const { control, register, setValue } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'documents' as const,
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Documents</h2>

        <button
          type="button"
          onClick={() =>
            append({
              documentType: '',
              title: '',
              file: null,
              description: '',
            })
          }
          className="flex items-center gap-1 rounded bg-[#0066CC] px-3 py-1 text-xs text-white"
        >
          + Add
        </button>
      </div>

      {/* Documents List */}
      {fields.map((field, index) => (
        <div key={field.id} className="rounded border bg-gray-50 p-4 space-y-4">
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <button type="button" className="text-xs text-blue-600">
              Upload Documents
            </button>

            <button type="button" onClick={() => remove(index)} className="text-red-500 text-sm">
              ✕
            </button>
          </div>

          {/* Row 1 */}
          <div className="grid grid-cols-3 gap-4">
            {/* Document Type */}
            <div>
              <label className="text-xs text-gray-600">Document Type</label>
              <select
                {...register(`documents.${index}.documentType`)}
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
              >
                <option value="">Select</option>
                <option value="MSA">MSA</option>
                <option value="NDA">NDA</option>
                <option value="SOW">SOW</option>
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="text-xs text-gray-600">Document Title</label>
              <input
                {...register(`documents.${index}.title`)}
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="text-xs text-gray-600">Upload Document</label>
              <input
                type="file"
                className="mt-1 w-full text-sm"
                onChange={e => {
                  const file = e.target.files?.[0];
                  setValue(`documents.${index}.file`, file);
                }}
              />
            </div>
          </div>

          {/* Validation note */}
          <p className="text-xs text-red-500">Documents are required to create the Client.</p>

          {/* Description */}
          <div>
            <label className="text-xs text-gray-600">Description</label>
            <textarea
              {...register(`documents.${index}.description`)}
              rows={3}
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
