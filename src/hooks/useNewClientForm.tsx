'use client';

import { Resolver, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// ── Zod schema ──────────────────────────────────────────────
const schema = z.object({
  primaryBusinessUnitId: z.string().min(1, 'Required'),
  clientVisibility: z.enum(['ORGANIZATION', 'BUSINESS_UNIT']),
  businessUnitId: z.string(),
  name: z.string().min(1, 'Client name is required'),
  vmsName: z.string().optional(),
  federalId: z.string().optional(),
  contactNumber: z.string().optional(),
  emailId: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  childClientId: z.string().optional(),
  notifyLocation: z.boolean(),
  country: z.string().min(1, 'Country is required'),
  state: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  website: z.string().min(1, 'Website is required'),
  sendRequirement: z.boolean(),
  sendHotlist: z.boolean(),
  fax: z.string().optional(),
  industry: z.string().optional(),
  status: z.preprocess(
    val => (val === '' ? undefined : val),
    z.enum(['PENDING', 'ACTIVE', 'INACTIVE'])
  ),
  category: z.string().optional(),
  primaryOwnerId: z.string().optional(),
  ownershipId: z.string().min(1, 'Ownership is required'),
  allowAccessAll: z.boolean(),
  clientLeadId: z.string().optional(),
  requiredDocs: z.array(z.string()),
  displayOnJob: z.boolean(),
  paymentTerms: z.string().optional(),
  practice: z.string().optional(),
  aboutCompany: z.string().optional(),
});

export type ClientFormSchema = z.infer<typeof schema>;

export function useNewClientForm() {
  // const form = useForm<Client>({
  //   resolver: zodResolver(schema),
  //   mode: 'onBlur',
  // });
  const form = useForm<ClientFormSchema>({
    resolver: zodResolver(schema) as Resolver<ClientFormSchema>,
  });

  // Watch only the fields that drive conditional behaviour
  // All other derived state comes from form.getValues() on submit
  const primaryBUId = useWatch({ control: form.control, name: 'primaryBusinessUnitId' });
  const clientVisibility = useWatch({ control: form.control, name: 'clientVisibility' });
  const displayOnJob = useWatch({ control: form.control, name: 'displayOnJob' });

  // Sync primaryBUId → businessUnitId automatically
  const syncBusinessUnit = (buId: string) => {
    form.setValue('businessUnitId', buId);
  };

  return {
    form,
    primaryBUId,
    clientVisibility,
    displayOnJob,
    syncBusinessUnit,
  };
}
