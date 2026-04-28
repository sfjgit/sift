import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Create / Update Requirement
// ─────────────────────────────────────────────────────────────────────────────

const salaryCheck = (d: { salaryMin?: number | null; salaryMax?: number | null }) =>
  !d.salaryMin || !d.salaryMax || d.salaryMax >= d.salaryMin;

const salaryError = { message: 'Max salary must be ≥ min salary', path: ['salaryMax'] as const };

// Base object — no refinement so .omit() / .partial() work cleanly
const requirementBaseObject = z.object({
  title: z.string().min(1, 'Title is required').max(200).trim(),
  description: z.string().max(2000).optional().nullable(),
  clientId: z.string().min(1, 'Client is required'),
  clientContactId: z.string().optional().nullable(),
  businessUnitId: z.string().optional().nullable(),
  jobType: z.enum(['CONTRACT', 'PERMANENT', 'CONTRACT_TO_HIRE', 'FREELANCE']),
  remoteType: z.enum(['ONSITE', 'REMOTE', 'HYBRID']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  totalOpenings: z.number().int().min(1).default(1),
  location: z.string().max(200).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  salaryMin: z.number().positive().optional().nullable(),
  salaryMax: z.number().positive().optional().nullable(),
  salaryType: z.enum(['MONTHLY', 'ANNUAL', 'HOURLY', 'DAILY']).optional().nullable(),
  experienceMin: z.number().min(0).optional().nullable(),
  experienceMax: z.number().min(0).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  respondBy: z.string().optional().nullable(),
  turnaroundDays: z.number().int().min(1).optional().nullable(),
  skillIds: z
    .array(
      z.object({
        skillId: z.string().min(1),
        isMandatory: z.boolean().default(true),
        experience: z.number().min(0).optional().nullable(),
      })
    )
    .default([]),
});

// Refinement applied separately to each schema after structural transforms
// @ts-expect-error err
export const createRequirementSchema = requirementBaseObject.refine(salaryCheck, salaryError);

export const updateRequirementSchema = requirementBaseObject
  .omit({ clientId: true })
  .partial()
  // @ts-expect-error err
  .refine(salaryCheck, salaryError);

export type CreateRequirementInput = z.infer<typeof createRequirementSchema>;
export type UpdateRequirementInput = z.infer<typeof updateRequirementSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Status Update
// ─────────────────────────────────────────────────────────────────────────────

export const updateStatusSchema = z.object({
  toStatus: z.enum(['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'ON_HOLD', 'CLOSED', 'CANCELLED']),
  reason: z.string().max(500).optional(),
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Note
// ─────────────────────────────────────────────────────────────────────────────

export const addNoteSchema = z.object({
  content: z.string().min(1, 'Note cannot be empty').max(2000).trim(),
});

export type AddNoteInput = z.infer<typeof addNoteSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Assignment
// ─────────────────────────────────────────────────────────────────────────────

export const createAssignmentSchema = z
  .object({
    type: z.enum(['MANAGER', 'TEAM', 'INDIVIDUAL']),
    recruiterId: z.string().optional().nullable(),
    teamId: z.string().optional().nullable(),
    teamMemberId: z.string().optional().nullable(),
    parentAssignmentId: z.string().optional().nullable(),
    allocatedOpenings: z.number().int().min(1).optional(),
    deadline: z.string().optional().nullable(),
  })
  .refine(
    d => {
      if (d.type === 'MANAGER' && !d.recruiterId) return false;
      if (d.type === 'TEAM' && !d.teamId) return false;
      if (d.type === 'INDIVIDUAL' && !d.recruiterId) return false;
      return true;
    },
    {
      message: 'recruiterId required for MANAGER/INDIVIDUAL; teamId required for TEAM',
    }
  );

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
