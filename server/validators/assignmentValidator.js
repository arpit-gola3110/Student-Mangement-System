import { z } from 'zod';
import { objectIdSchema } from '../middleware/validateRequest.js';

const academicYearRegex = /^\d{4}-\d{4}$/;

export const assignmentIdParamSchema = z.object({
  id: objectIdSchema
});

export const listAssignmentsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(100).optional(),
    faculty: objectIdSchema.optional(),
    department: objectIdSchema.optional(),
    course: objectIdSchema.optional(),
    semester: objectIdSchema.optional(),
    subject: objectIdSchema.optional(),
    academicYear: z.string().trim().max(20).optional(),
    status: z.enum(['ACTIVE', 'COMPLETED', 'REVOKED', 'active', 'completed', 'revoked']).optional(),
    sortBy: z.enum(['assignmentDate', 'academicYear', 'status', 'section', 'createdAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  })
  .strict();

export const createAssignmentSchema = z
  .object({
    faculty: objectIdSchema,
    course: objectIdSchema,
    semester: objectIdSchema,
    subject: objectIdSchema,
    section: z
      .string()
      .trim()
      .toUpperCase()
      .min(1)
      .max(10)
      .default('A'),
    academicYear: z
      .string({ required_error: 'Academic year is required' })
      .trim()
      .regex(academicYearRegex, 'Academic year must use YYYY-YYYY format (e.g., 2026-2027)'),
    assignmentDate: z.coerce.date().optional()
  })
  .strict();

export const updateAssignmentSchema = z
  .object({
    faculty: objectIdSchema.optional(),
    section: z.string().trim().toUpperCase().min(1).max(10).optional(),
    academicYear: z.string().trim().regex(academicYearRegex, 'Academic year must use YYYY-YYYY format').optional(),
    assignmentDate: z.coerce.date().optional(),
    status: z.enum(['ACTIVE', 'COMPLETED', 'REVOKED']).optional()
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, {
    message: 'At least one permitted field must be provided for update'
  });

export const updateAssignmentStatusSchema = z
  .object({
    status: z.enum(['ACTIVE', 'COMPLETED', 'REVOKED'])
  })
  .strict();
