import { z } from 'zod';
import { objectIdSchema } from '../middleware/validateRequest.js';

const academicYearRegex = /^\d{4}-\d{4}$/;

export const enrollmentIdParamSchema = z.object({
  id: objectIdSchema
});

export const listEnrollmentsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(100).optional(),
    student: objectIdSchema.optional(),
    department: objectIdSchema.optional(),
    course: objectIdSchema.optional(),
    semester: objectIdSchema.optional(),
    subject: objectIdSchema.optional(),
    academicYear: z.string().trim().max(20).optional(),
    status: z.enum(['ACTIVE', 'COMPLETED', 'DROPPED', 'CANCELLED', 'active', 'completed', 'dropped', 'cancelled']).optional(),
    sortBy: z.enum(['enrollmentDate', 'academicYear', 'status', 'section', 'createdAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  })
  .strict();

export const createEnrollmentSchema = z
  .object({
    student: objectIdSchema.optional(),
    students: z.array(objectIdSchema).min(1, 'Select at least one student').max(100).optional(),
    course: objectIdSchema,
    semester: objectIdSchema,
    subject: objectIdSchema.optional(),
    subjects: z.array(objectIdSchema).min(1, 'Select at least one subject').max(20).optional(),
    academicYear: z
      .string({ required_error: 'Academic year is required' })
      .trim()
      .regex(academicYearRegex, 'Academic year must use YYYY-YYYY format (e.g., 2026-2027)'),
    section: z
      .string()
      .trim()
      .toUpperCase()
      .min(1)
      .max(10)
      .default('A'),
    enrollmentDate: z.coerce.date().optional()
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.student && (!data.students || data.students.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['students'],
        message: 'At least one student must be specified'
      });
    }
    if (!data.subject && (!data.subjects || data.subjects.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['subjects'],
        message: 'At least one subject must be specified'
      });
    }
  });

export const updateEnrollmentSchema = z
  .object({
    section: z.string().trim().toUpperCase().min(1).max(10).optional(),
    academicYear: z.string().trim().regex(academicYearRegex, 'Academic year must use YYYY-YYYY format').optional(),
    enrollmentDate: z.coerce.date().optional(),
    status: z.enum(['ACTIVE', 'COMPLETED', 'DROPPED', 'CANCELLED']).optional()
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, {
    message: 'At least one permitted field must be provided for update'
  });

export const updateEnrollmentStatusSchema = z
  .object({
    status: z.enum(['ACTIVE', 'COMPLETED', 'DROPPED', 'CANCELLED'])
  })
  .strict();
