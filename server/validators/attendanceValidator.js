import { z } from 'zod';
import { objectIdSchema } from '../middleware/validateRequest.js';

const dateYmdRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeHhMmRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const attendanceIdParamSchema = z.object({
  id: objectIdSchema
});

export const listSessionsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(100).optional(),
    faculty: objectIdSchema.optional(),
    facultyAssignment: objectIdSchema.optional(),
    department: objectIdSchema.optional(),
    course: objectIdSchema.optional(),
    semester: objectIdSchema.optional(),
    subject: objectIdSchema.optional(),
    academicYear: z.string().trim().max(20).optional(),
    section: z.string().trim().max(10).optional(),
    status: z.enum(['OPEN', 'FINALIZED', 'CANCELLED', 'open', 'finalized', 'cancelled']).optional(),
    startDate: z.string().trim().regex(dateYmdRegex, 'startDate must be YYYY-MM-DD').optional(),
    endDate: z.string().trim().regex(dateYmdRegex, 'endDate must be YYYY-MM-DD').optional(),
    sessionDate: z.string().trim().regex(dateYmdRegex, 'sessionDate must be YYYY-MM-DD').optional(),
    sortBy: z.enum(['sessionDate', 'dateObj', 'sessionNumber', 'status', 'createdAt']).default('sessionDate'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  })
  .strict();

export const createSessionSchema = z
  .object({
    facultyAssignment: objectIdSchema,
    sessionDate: z.string({ required_error: 'Session date is required' }).trim().regex(dateYmdRegex, 'Session date must use YYYY-MM-DD format'),
    sessionNumber: z.coerce.number().int().min(1).max(20).default(1),
    startTime: z.string().trim().regex(timeHhMmRegex, 'Start time must use HH:MM 24h format').optional().or(z.literal('')),
    endTime: z.string().trim().regex(timeHhMmRegex, 'End time must use HH:MM 24h format').optional().or(z.literal('')),
    topic: z.string().trim().max(200).optional().default('')
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.startTime && data.endTime && data.endTime <= data.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'End time must be after start time'
      });
    }
  });

export const updateSessionSchema = z
  .object({
    startTime: z.string().trim().regex(timeHhMmRegex, 'Start time must use HH:MM 24h format').optional().or(z.literal('')),
    endTime: z.string().trim().regex(timeHhMmRegex, 'End time must use HH:MM 24h format').optional().or(z.literal('')),
    topic: z.string().trim().max(200).optional()
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, {
    message: 'At least one field must be provided for session update'
  });

export const updateSessionStatusSchema = z
  .object({
    status: z.enum(['OPEN', 'FINALIZED', 'CANCELLED']),
    reason: z.string().trim().max(300).optional()
  })
  .strict();

export const bulkAttendanceSchema = z
  .object({
    sessionId: objectIdSchema,
    finalize: z.boolean().optional().default(false),
    records: z
      .array(
        z.object({
          studentId: objectIdSchema,
          status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'present', 'absent', 'late']),
          remarks: z.string().trim().max(300).optional().default('')
        })
      )
      .min(1, 'At least one student attendance entry is required')
      .max(200)
  })
  .strict();

export const listAttendanceQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(15),
    search: z.string().trim().max(100).optional(),
    sessionId: objectIdSchema.optional(),
    student: objectIdSchema.optional(),
    enrollmentNumber: z.string().trim().max(50).optional(),
    faculty: objectIdSchema.optional(),
    department: objectIdSchema.optional(),
    course: objectIdSchema.optional(),
    semester: objectIdSchema.optional(),
    subject: objectIdSchema.optional(),
    academicYear: z.string().trim().max(20).optional(),
    status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'present', 'absent', 'late', 'excused']).optional(),
    startDate: z.string().trim().regex(dateYmdRegex, 'startDate must be YYYY-MM-DD').optional(),
    endDate: z.string().trim().regex(dateYmdRegex, 'endDate must be YYYY-MM-DD').optional(),
    sortBy: z.enum(['date', 'status', 'createdAt', 'updatedAt']).default('date'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  })
  .strict();

export const correctAttendanceSchema = z
  .object({
    status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'present', 'absent', 'late']),
    remarks: z.string().trim().max(300).optional(),
    reason: z.string().trim().min(3, 'Correction reason is required (min 3 characters)').max(300)
  })
  .strict();

export const reportQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(100).optional(),
    department: objectIdSchema.optional(),
    course: objectIdSchema.optional(),
    semester: objectIdSchema.optional(),
    subject: objectIdSchema.optional(),
    faculty: objectIdSchema.optional(),
    student: objectIdSchema.optional(),
    academicYear: z.string().trim().max(20).optional(),
    startDate: z.string().trim().regex(dateYmdRegex).optional(),
    endDate: z.string().trim().regex(dateYmdRegex).optional(),
    minPercentage: z.coerce.number().min(0).max(100).optional(),
    maxPercentage: z.coerce.number().min(0).max(100).optional(),
    belowThresholdOnly: z.enum(['true', 'false']).optional()
  })
  .strict();
