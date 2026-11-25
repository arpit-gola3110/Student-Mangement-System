import { z } from 'zod';
import { objectIdSchema } from '../middleware/validateRequest.js';

const academicYearRegex = /^\d{4}-\d{4}$/;
const timeHhMmRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const idParamSchema = z.object({
  id: objectIdSchema
});

export const markIdParamSchema = z.object({
  markId: objectIdSchema
});

const validateMarksPrecision = (val) => {
  if (typeof val !== 'number' || !Number.isFinite(val)) return false;
  return Number((val * 100).toFixed(4)) % 1 === 0;
};

// === EXAMINATION SCHEMAS ===
export const listExaminationsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(100).optional(),
    department: objectIdSchema.optional(),
    course: objectIdSchema.optional(),
    semester: objectIdSchema.optional(),
    subject: objectIdSchema.optional(),
    examType: z
      .enum([
        'INTERNAL_ASSESSMENT',
        'MID_TERM',
        'PRACTICAL',
        'EXTERNAL',
        'END_SEMESTER',
        'SESSIONAL_1',
        'SESSIONAL_2',
        'PRE_UNIVERSITY'
      ])
      .optional(),
    academicYear: z.string().trim().max(20).optional(),
    status: z
      .enum(['DRAFT', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'PUBLISHED', 'UPCOMING', 'ONGOING'])
      .optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    sortBy: z.enum(['examDate', 'startDate', 'title', 'maxMarks', 'status', 'createdAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  })
  .strict();

export const createExaminationSchema = z
  .object({
    title: z.string({ required_error: 'Examination title is required' }).trim().min(3, 'Title must be at least 3 characters').max(150),
    examType: z.enum(['INTERNAL_ASSESSMENT', 'MID_TERM', 'PRACTICAL', 'EXTERNAL', 'END_SEMESTER', 'SESSIONAL_1', 'SESSIONAL_2', 'PRE_UNIVERSITY']),
    course: objectIdSchema,
    semester: objectIdSchema,
    subject: objectIdSchema,
    academicYear: z.string().trim().regex(academicYearRegex, 'Academic year must use YYYY-YYYY format (e.g., 2026-2027)'),
    examDate: z.coerce.date({ required_error: 'Examination date is required' }),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    startTime: z.string().trim().regex(timeHhMmRegex, 'Start time must use HH:MM 24h format').optional().or(z.literal('')),
    endTime: z.string().trim().regex(timeHhMmRegex, 'End time must use HH:MM 24h format').optional().or(z.literal('')),
    maxMarks: z.coerce.number().min(1, 'Maximum marks must be positive').max(500).default(100),
    description: z.string().trim().max(1000).optional().default(''),
    status: z.enum(['DRAFT', 'SCHEDULED']).optional().default('SCHEDULED')
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
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date cannot precede start date'
      });
    }
  });

export const updateExaminationSchema = z
  .object({
    title: z.string().trim().min(3).max(150).optional(),
    examType: z
      .enum(['INTERNAL_ASSESSMENT', 'MID_TERM', 'PRACTICAL', 'EXTERNAL', 'END_SEMESTER', 'SESSIONAL_1', 'SESSIONAL_2', 'PRE_UNIVERSITY'])
      .optional(),
    examDate: z.coerce.date().optional(),
    startTime: z.string().trim().regex(timeHhMmRegex, 'Start time must use HH:MM 24h format').optional().or(z.literal('')),
    endTime: z.string().trim().regex(timeHhMmRegex, 'End time must use HH:MM 24h format').optional().or(z.literal('')),
    maxMarks: z.coerce.number().min(1).max(500).optional(),
    description: z.string().trim().max(1000).optional()
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, {
    message: 'At least one examination field must be provided for update'
  })
  .superRefine((data, ctx) => {
    if (data.startTime && data.endTime && data.endTime <= data.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'End time must be after start time'
      });
    }
  });

export const updateExaminationStatusSchema = z
  .object({
    status: z.enum(['DRAFT', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'PUBLISHED']),
    reason: z.string().trim().max(300).optional()
  })
  .strict();

// === INTERNAL ASSESSMENT COMPONENT SCHEMAS ===
export const listAssessmentsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(100).optional(),
    department: objectIdSchema.optional(),
    course: objectIdSchema.optional(),
    semester: objectIdSchema.optional(),
    subject: objectIdSchema.optional(),
    examination: objectIdSchema.optional(),
    componentType: z.enum(['CLASS_TEST', 'ASSIGNMENT', 'QUIZ', 'PRACTICAL', 'VIVA', 'PROJECT', 'OTHER']).optional(),
    academicYear: z.string().trim().max(20).optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'FINALIZED', 'PUBLISHED', 'CANCELLED']).optional(),
    sortBy: z.enum(['assessmentDate', 'name', 'maxMarks', 'status', 'createdAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  })
  .strict();

export const createAssessmentSchema = z
  .object({
    name: z.string({ required_error: 'Component name is required' }).trim().min(2).max(120),
    componentType: z.enum(['CLASS_TEST', 'ASSIGNMENT', 'QUIZ', 'PRACTICAL', 'VIVA', 'PROJECT', 'OTHER']),
    examination: objectIdSchema.optional().or(z.literal('')),
    course: objectIdSchema,
    semester: objectIdSchema,
    subject: objectIdSchema,
    academicYear: z.string().trim().regex(academicYearRegex, 'Academic year must use YYYY-YYYY format'),
    maxMarks: z.coerce.number().min(1, 'Maximum marks must be positive').max(500),
    assessmentDate: z.coerce.date().optional(),
    description: z.string().trim().max(600).optional().default(''),
    status: z.enum(['DRAFT', 'ACTIVE']).optional().default('ACTIVE')
  })
  .strict();

export const updateAssessmentSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    componentType: z.enum(['CLASS_TEST', 'ASSIGNMENT', 'QUIZ', 'PRACTICAL', 'VIVA', 'PROJECT', 'OTHER']).optional(),
    examination: objectIdSchema.optional().or(z.literal('')).or(z.null()),
    maxMarks: z.coerce.number().min(1).max(500).optional(),
    assessmentDate: z.coerce.date().optional().or(z.null()),
    description: z.string().trim().max(600).optional()
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, {
    message: 'At least one assessment field must be provided for update'
  });

export const updateAssessmentStatusSchema = z
  .object({
    status: z.enum(['DRAFT', 'ACTIVE', 'FINALIZED', 'PUBLISHED', 'CANCELLED']),
    reason: z.string().trim().max(300).optional()
  })
  .strict();

// === ASSESSMENT MARKS SCHEMAS ===
export const bulkMarksSchema = z
  .object({
    finalize: z.boolean().optional().default(false),
    entryStatus: z.enum(['DRAFT', 'SUBMITTED', 'FINALIZED']).optional(),
    records: z
      .array(
        z.object({
          studentId: objectIdSchema,
          marksObtained: z
            .number({ invalid_type_error: 'Marks must be numeric' })
            .min(0, 'Marks cannot be negative')
            .refine(validateMarksPrecision, 'Marks support up to 2 decimal places'),
          remarks: z.string().trim().max(300).optional().default('')
        })
      )
      .min(1, 'At least one student marks entry is required')
      .max(200)
  })
  .strict();

export const listMarksQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(15),
    search: z.string().trim().max(100).optional(),
    assessment: objectIdSchema.optional(),
    examination: objectIdSchema.optional(),
    student: objectIdSchema.optional(),
    course: objectIdSchema.optional(),
    semester: objectIdSchema.optional(),
    subject: objectIdSchema.optional(),
    faculty: objectIdSchema.optional(),
    academicYear: z.string().trim().max(20).optional(),
    entryStatus: z.enum(['DRAFT', 'SUBMITTED', 'FINALIZED']).optional(),
    sortBy: z.enum(['marksObtained', 'createdAt', 'updatedAt']).default('updatedAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  })
  .strict();

export const correctMarkSchema = z
  .object({
    marksObtained: z
      .number({ invalid_type_error: 'Marks must be numeric' })
      .min(0, 'Marks cannot be negative')
      .refine(validateMarksPrecision, 'Marks support up to 2 decimal places'),
    remarks: z.string().trim().max(300).optional(),
    reason: z.string().trim().min(3, 'Correction reason is required (min 3 characters)').max(300)
  })
  .strict();
