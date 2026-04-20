'use client';

import { useFieldArray, FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import ContactCard from './Contactcard';
import { DEFAULT_CONTACT } from '@/types/clients.types';
import { useEffect } from 'react';

// ── Zod schema for a single contact ────────────────────────
const contactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  designation: z.string().optional(),
  officeNumber: z.string().optional(),
  officeExtension: z.string().optional(),
  mobileNumber: z.string().optional(),
  pocEmailId: z.string().email('Invalid email').min(1, 'Email is required'),
  secondaryEmailId: z.string().email('Invalid email').optional().or(z.literal('')),
  primaryOwnerId: z.string().min(1, 'Primary owner is required'),
  ownership: z.string().optional(),
  allowAccessAll: z.boolean(),
  address1: z.string().optional(),
  address2: z.string().optional(),
  country: z.string(),
  state: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  linkedinUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE', '']),
  clientGroup: z.string().optional(),
  aboutContact: z.string().optional(),
  isPrimary: z.boolean(),
});

const contactsFormSchema = z.object({
  contacts: z.array(contactSchema).min(1),
});

export type ContactsFormValues = z.infer<typeof contactsFormSchema>;

interface Props {
  users: Array<{ id: string; name: string }>;
  // Called by the parent page to get final contact values on submit
  onSubmitRef?: React.MutableRefObject<(() => Promise<ContactsFormValues | null>) | null>;
}

export default function ContactsSection({ users, onSubmitRef }: Props) {
  const methods = useForm<ContactsFormValues>({
    resolver: zodResolver(contactsFormSchema),
    defaultValues: { contacts: [DEFAULT_CONTACT] },
    mode: 'onBlur',
  });

  const { fields, append, remove } = useFieldArray({
    control: methods.control,
    name: 'contacts',
  });

  // Expose submit trigger to parent if needed
  // if (onSubmitRef) {
  //   onSubmitRef.current = () =>
  //     new Promise(resolve => {
  //       methods.handleSubmit(
  //         data => resolve(data),
  //         () => resolve(null)
  //       )();
  //     });
  // }
  const { handleSubmit } = methods;
  useEffect(() => {
    if (!onSubmitRef) return;

    onSubmitRef.current = () =>
      new Promise(resolve => {
        handleSubmit(
          data => resolve(data),
          () => resolve(null)
        )();
      });
  }, [onSubmitRef, handleSubmit]);

  const handleAddMore = () => {
    append({ ...DEFAULT_CONTACT });
  };

  const handleRemove = (index: number) => {
    if (fields.length > 1) remove(index);
  };

  return (
    <FormProvider {...methods}>
      <div className="flex min-h-0 flex-col">
        {/* ── Section header ────────────────────────────── */}
        <div className="mb-4 flex items-center justify-between mt-7">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF4FF]">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0066CC"
                strokeWidth="2"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-800">Contacts</h2>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
              {fields.length}
            </span>
          </div>

          <button
            type="button"
            onClick={handleAddMore}
            className="flex items-center gap-1.5 rounded-lg bg-[#0066CC] px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0052A3] active:scale-95"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add More
          </button>
        </div>

        {/* ── Contact cards ─────────────────────────────── */}
        <div className="space-y-4">
          {fields.map((field, index) => (
            <ContactCard
              key={field.id}
              index={index}
              onRemove={handleRemove}
              users={users}
              isOnly={fields.length === 1}
            />
          ))}
        </div>

        {/* Empty state (shouldn't normally show due to min 1 rule) */}
        {fields.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-12">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9CA3AF"
              strokeWidth="1.5"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            <p className="mt-2 text-sm font-medium text-gray-400">No contacts added yet</p>
            <button
              type="button"
              onClick={handleAddMore}
              className="mt-3 text-xs font-semibold text-[#0066CC] hover:underline"
            >
              Add first contact
            </button>
          </div>
        )}
      </div>
    </FormProvider>
  );
}
