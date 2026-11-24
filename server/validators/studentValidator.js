import { z } from 'zod';
import { objectIdSchema } from '../middleware/validateRequest.js';
import { passwordPolicySchema } from './authValidator.js';

export const studentIdParamSchema = z.object({
  id: objectIdSchema
});

export const listStudentsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(100).optional(),
    department: objectIdSchema.optional(),
    course: objectIdSchema.optional(),
    semester: objectIdSchema.optional(),
    academicYear: z.string().trim().max(20).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'GRADUATED', 'active', 'inactive', 'suspended', 'graduated']).optional(),
    sortBy: z.enum(['enrollmentNumber', 'rollNumber', 'firstName', 'currentSemester', 'admissionYear', 'status', 'createdAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  })
  .strict();

export const createStudentSchema = z
  .object({
    name: z.string().trim().min(2, 'Student full name is required').max(100).optional(),
    firstName: z.string().trim().min(1, 'First name is required').max(60).optional(),
    lastName: z.string().trim().min(1, 'Last name is required').max(60).optional(),
    email: z.string().trim().toLowerCase().email('Valid email address is required').max(255),
    password: passwordPolicySchema,
    enrollmentNumber: z.string().trim().min(3, 'Enrollment number is required').max(40),
    rollNumber: z.string().trim().min(3).max(40).optional(),
    dateOfBirth: z.coerce.date({ required_error: 'Date of birth is required' }),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
    contactNumber: z.string().trim().regex(/^[0-9+\-\s]{7,15}$/, 'Valid phone number (7-15 digits) is required'),
    address: z.string().trim().min(3, 'Address is required').max(300),
    department: objectIdSchema,
    course: objectIdSchema,
    semester: objectIdSchema,
    admissionYear: z.coerce.number().int().min(2000).max(2100).default(new Date().getFullYear()),
    academicYear: z.string().trim().max(20).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'GRADUATED']).default('ACTIVE')
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.name && !data.firstName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['firstName'],
        message: 'Student name (or firstName) is required'
      });
    }
    if (data.dateOfBirth && data.dateOfBirth > new Date()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dateOfBirth'],
        message: 'Date of birth cannot be in the future'
      });
    }
  });

export const updateStudentSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    firstName: z.string().trim().min(1).max(60).optional(),
    lastName: z.string().trim().min(1).max(60).optional(),
    enrollmentNumber: z.string().trim().min(3).max(40).optional(),
    rollNumber: z.string().trim().min(3).max(40).optional(),
    dateOfBirth: z.coerce.date().optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    contactNumber: z.string().trim().regex(/^[0-9+\-\s]{7,15}$/, 'Valid phone number is required').optional(),
    address: z.string().trim().min(3).max(300).optional(),
    department: objectIdSchema.optional(),
    course: objectIdSchema.optional(),
    semester: objectIdSchema.optional(),
    admissionYear: z.coerce.number().int().min(2000).max(2100).optional(),
    academicYear: z.string().trim().max(20).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'GRADUATED']).optional()
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update'
  });

export const updateStudentStatusSchema = z
  .object({
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'GRADUATED'])
  })
  .strict();
