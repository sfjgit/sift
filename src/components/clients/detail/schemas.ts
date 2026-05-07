// components/clients/detail/schemas.ts
import { z } from 'zod';

export const addSpocSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100).trim(),
  lastName: z.string().min(1, 'Last name is required').max(100).trim(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  designation: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  handlerId: z.string().min(1, 'Handler is required'),
  serviceLineId: z.string().min(1, 'Service line is required'),
  businessUnitId: z.string().min(1, 'Business unit is required'),
  isPrimary: z.boolean().default(false),
  notes: z.string().max(500).optional(),
});

export const editSpocSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100).trim(),
  lastName: z.string().min(1, 'Last name is required').max(100).trim(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  designation: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  handlerId: z.string().min(1, 'Handler is required'),
  isPrimary: z.boolean(),
  notes: z.string().max(500).optional(),
});

export const addNoteSchema = z.object({
  content: z.string().min(1, 'Content is required').max(2000).trim(),
});

export type AddSpocValues = z.infer<typeof addSpocSchema>;
export type EditSpocValues = z.infer<typeof editSpocSchema>;
export type AddNoteValues = z.infer<typeof addNoteSchema>;
