import { z } from 'zod';

export const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).trim(),
  vmsName: z.string().max(200).optional().nullable(),
  category: z
    .enum(['PRODUCT', 'SERVICE', 'CONSULTING', 'STAFFING', 'GOVERNMENT', 'NGO', 'OTHER'])
    .optional()
    .nullable(),
  industry: z.string().max(100).optional().nullable(),
  website: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
  country: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  businessUnitId: z.string().optional().nullable(),
  parentClientId: z.string().optional().nullable(),
});

export const updateClientSchema = createClientSchema.partial();

export const addHandlerSchema = z.object({
  userId: z.string().min(1, 'User is required'),
  role: z.enum(['PRIMARY', 'SECONDARY', 'BACKUP']).default('PRIMARY'),
});

export const addContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100).trim(),
  lastName: z.string().max(100).optional().nullable(),
  designation: z.string().max(100).optional().nullable(),
  email: z.string().email('Invalid email'),
  phone: z.string().max(20).optional().nullable(),
  linkedinUrl: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
  isPrimary: z.boolean().default(false),
  ownerId: z.string().optional().nullable(),
});

export const updateContactSchema = addContactSchema.partial();

export const addNoteSchema = z.object({
  content: z.string().min(1, 'Note cannot be empty').max(2000).trim(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type AddHandlerInput = z.infer<typeof addHandlerSchema>;
export type AddContactInput = z.infer<typeof addContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type AddNoteInput = z.infer<typeof addNoteSchema>;
