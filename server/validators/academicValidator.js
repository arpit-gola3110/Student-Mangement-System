import { z } from 'zod';
import { objectIdSchema } from '../middleware/validateRequest.js';

export const academicIdParamSchema = z.object({
  id: objectIdSchema
});

const statusFilterEnum = z.enum(['active', 'inactive']);
const academicYearRegex = /^\d{4}-\d{4}$/;

// --- DEPARTMENT VALIDATORS ---
export const listDepartmentsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(100).optional(),
    status: statusFilterEnum.optional(),
    isActive: z.enum(['true', 'false']).optional(),
    sortBy: z.enum(['name', 'code', 'createdAt', 'isActive']).default('name'),
    sortOrder: z.enum(['asc', 'desc']).default('asc')
  })
  .strict();

export const createDepartmentSchema = z
  .object({
    code: z
      .string({ required_error: 'Department code is required' })
      .trim()
      .toUpperCase()
      .min(2, 'Department code must be at least 2 characters')
      .max(20, 'Department code cannot exceed 20 characters')
      .regex(/^[A-Z0-9_-]+$/, 'Code may only contain letters, numbers, hyphens, and underscores'),
    name: z
      .string({ required_error: 'Department name is required' })
      .trim()
      .min(3, 'Department name must be at least 3 characters')
      .max(120, 'Department name cannot exceed 120 characters'),
    description: z.string().trim().max(500).optional().default(''),
    headOfDepartment: z.union([objectIdSchema, z.literal(''), z.null()]).optional(),
    isActive: z.boolean().default(true)
  })
  .strict();

export const updateDepartmentSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(2)
      .max(20)
      .regex(/^[A-Z0-9_-]+$/, 'Code may only contain letters, numbers, hyphens, and underscores')
      .optional(),
    name: z.string().trim().min(3).max(120).optional(),
    description: z.string().trim().max(500).optional(),
    headOfDepartment: z.union([objectIdSchema, z.literal(''), z.null()]).optional(),
    isActive: z.boolean().optional()
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided for update' });

export const updateBooleanStatusSchema = z
  .object({
    isActive: z.boolean({ required_error: 'isActive boolean status is required' })
  })
  .strict();

// --- COURSE VALIDATORS ---
export const listCoursesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(100).optional(),
    department: objectIdSchema.optional(),
    status: statusFilterEnum.optional(),
    isActive: z.enum(['true', 'false']).optional(),
    sortBy: z.enum(['name', 'code', 'durationYears', 'totalSemesters', 'createdAt', 'isActive']).default('name'),
    sortOrder: z.enum(['asc', 'desc']).default('asc')
  })
  .strict();

export const createCourseSchema = z
  .object({
    code: z
      .string({ required_error: 'Course code is required' })
      .trim()
      .toUpperCase()
      .min(2, 'Course code must be at least 2 characters')
      .max(30)
      .regex(/^[A-Z0-9_-]+$/, 'Course code may only contain letters, numbers, hyphens, and underscores'),
    name: z.string({ required_error: 'Course name is required' }).trim().min(3).max(150),
    department: objectIdSchema,
    durationYears: z.coerce.number().int().min(1, 'Duration must be at least 1 year').max(8, 'Duration cannot exceed 8 years'),
    totalSemesters: z.coerce.number().int().min(1, 'At least 1 semester required').max(16, 'Total semesters cannot exceed 16'),
    description: z.string().trim().max(500).optional().default(''),
    isActive: z.boolean().default(true)
  })
  .strict();

export const updateCourseSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(2)
      .max(30)
      .regex(/^[A-Z0-9_-]+$/)
      .optional(),
    name: z.string().trim().min(3).max(150).optional(),
    department: objectIdSchema.optional(),
    durationYears: z.coerce.number().int().min(1).max(8).optional(),
    totalSemesters: z.coerce.number().int().min(1).max(16).optional(),
    description: z.string().trim().max(500).optional(),
    isActive: z.boolean().optional()
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided for update' });

// --- SEMESTER VALIDATORS ---
export const listSemestersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(100).optional(),
    department: objectIdSchema.optional(),
    course: objectIdSchema.optional(),
    semesterNumber: z.coerce.number().int().min(1).max(16).optional(),
    academicYear: z.string().trim().max(20).optional(),
    status: z.enum(['active', 'inactive', 'UPCOMING', 'ACTIVE', 'COMPLETED']).optional(),
    isActive: z.enum(['true', 'false']).optional(),
    sortBy: z.enum(['semesterNumber', 'academicYear', 'startDate', 'endDate', 'status', 'createdAt', 'isActive']).default('semesterNumber'),
    sortOrder: z.enum(['asc', 'desc']).default('asc')
  })
  .strict();

export const createSemesterSchema = z
  .object({
    course: objectIdSchema,
    semesterNumber: z.coerce.number().int().min(1).max(16),
    academicYear: z
      .string({ required_error: 'Academic year is required' })
      .trim()
      .regex(academicYearRegex, 'Academic year must use YYYY-YYYY format (e.g., 2026-2027)'),
    startDate: z.coerce.date({ required_error: 'Start date is required' }),
    endDate: z.coerce.date({ required_error: 'End date is required' }),
    status: z.enum(['UPCOMING', 'ACTIVE', 'COMPLETED']).default('UPCOMING'),
    isActive: z.boolean().default(true)
  })
  .strict()
  .refine((d) => d.endDate > d.startDate, {
    message: 'End date must be later than start date',
    path: ['endDate']
  });

export const updateSemesterSchema = z
  .object({
    semesterNumber: z.coerce.number().int().min(1).max(16).optional(),
    academicYear: z.string().trim().regex(academicYearRegex, 'Academic year must use YYYY-YYYY format').optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    status: z.enum(['UPCOMING', 'ACTIVE', 'COMPLETED']).optional(),
    isActive: z.boolean().optional()
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided for update' })
  .refine((d) => !(d.startDate && d.endDate && d.endDate <= d.startDate), {
    message: 'End date must be later than start date',
    path: ['endDate']
  });

export const updateSemesterStatusSchema = z
  .object({
    isActive: z.boolean().optional(),
    status: z.enum(['UPCOMING', 'ACTIVE', 'COMPLETED']).optional()
  })
  .strict()
  .refine((d) => d.isActive !== undefined || d.status !== undefined, {
    message: 'Either isActive or status must be provided'
  });

// --- SUBJECT VALIDATORS ---
export const listSubjectsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(100).optional(),
    department: objectIdSchema.optional(),
    course: objectIdSchema.optional(),
    semester: objectIdSchema.optional(),
    subjectType: z.enum(['THEORY', 'PRACTICAL', 'ELECTIVE', 'PROJECT']).optional(),
    status: statusFilterEnum.optional(),
    isActive: z.enum(['true', 'false']).optional(),
    sortBy: z.enum(['code', 'name', 'credits', 'type', 'maxInternalMarks', 'maxExternalMarks', 'createdAt', 'isActive']).default('code'),
    sortOrder: z.enum(['asc', 'desc']).default('asc')
  })
  .strict();

export const createSubjectSchema = z
  .object({
    code: z
      .string({ required_error: 'Subject code is required' })
      .trim()
      .toUpperCase()
      .min(2, 'Subject code must be at least 2 characters')
      .max(25)
      .regex(/^[A-Z0-9_-]+$/, 'Subject code may only contain letters, numbers, hyphens, and underscores'),
    name: z.string({ required_error: 'Subject name is required' }).trim().min(2).max(150),
    course: objectIdSchema,
    semester: objectIdSchema,
    credits: z.coerce.number().int().min(1, 'Credits must be between 1 and 6').max(6, 'Credits must be between 1 and 6'),
    type: z.enum(['THEORY', 'PRACTICAL', 'ELECTIVE', 'PROJECT']).default('THEORY'),
    maxInternalMarks: z.coerce.number().min(0, 'Internal marks cannot be negative').max(50, 'Max internal marks is 50').default(30),
    maxExternalMarks: z.coerce.number().min(0, 'External marks cannot be negative').max(100, 'Max external marks is 100').default(70),
    description: z.string().trim().max(500).optional().default(''),
    isActive: z.boolean().default(true)
  })
  .strict()
  .refine((d) => d.maxInternalMarks + d.maxExternalMarks > 0 && d.maxInternalMarks + d.maxExternalMarks <= 100, {
    message: 'Combined internal and external maximum marks must be between 1 and 100',
    path: ['maxExternalMarks']
  });

export const updateSubjectSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(2)
      .max(25)
      .regex(/^[A-Z0-9_-]+$/)
      .optional(),
    name: z.string().trim().min(2).max(150).optional(),
    course: objectIdSchema.optional(),
    semester: objectIdSchema.optional(),
    credits: z.coerce.number().int().min(1).max(6).optional(),
    type: z.enum(['THEORY', 'PRACTICAL', 'ELECTIVE', 'PROJECT']).optional(),
    maxInternalMarks: z.coerce.number().min(0).max(50).optional(),
    maxExternalMarks: z.coerce.number().min(0).max(100).optional(),
    description: z.string().trim().max(500).optional(),
    isActive: z.boolean().optional()
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided for update' });
