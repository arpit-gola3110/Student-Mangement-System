import { z } from 'zod';
import { objectIdSchema } from '../middleware/validateRequest.js';
import { passwordPolicySchema } from './authValidator.js';

export const userIdParamSchema = z.object({
  id: objectIdSchema
});

export const listUsersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(100).optional(),
    role: z.enum(['admin', 'faculty', 'student']).optional(),
    status: z.enum(['active', 'inactive']).optional(),
    sortBy: z.enum(['name', 'email', 'role', 'isActive', 'createdAt', 'lastLogin']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  })
  .strict();

const studentLinkSchema = z.object({
  enrollmentNumber: z.string().trim().min(3).max(40),
  rollNumber: z.string().trim().min(3).max(40).optional(),
  department: objectIdSchema,
  course: objectIdSchema,
  semester: objectIdSchema,
  dateOfBirth: z.coerce.date(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  contactNumber: z.string().trim().regex(/^[0-9+\-\s]{7,15}$/, 'Valid phone number is required'),
  address: z.string().trim().min(3).max(300),
  admissionYear: z.coerce.number().int().min(2000).max(2100).optional()
});

const facultyLinkSchema = z.object({
  employeeId: z.string().trim().min(3).max(40),
  department: objectIdSchema,
  designation: z.enum(['PROFESSOR', 'ASSOCIATE_PROFESSOR', 'ASSISTANT_PROFESSOR', 'LECTURER']),
  specialization: z.string().trim().min(2).max(120),
  qualification: z.string().trim().max(120).optional(),
  contactNumber: z.string().trim().regex(/^[0-9+\-\s]{7,15}$/, 'Valid phone number is required'),
  joiningDate: z.coerce.date().optional()
});

export const createUserSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().trim().toLowerCase().email('Please provide a valid email address').max(255),
    password: passwordPolicySchema,
    role: z.enum(['admin', 'faculty', 'student']),
    isActive: z.boolean().default(true),
    studentProfile: studentLinkSchema.optional(),
    facultyProfile: facultyLinkSchema.optional()
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.role === 'student' && !data.studentProfile) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['studentProfile'],
        message: 'Linked student profile details are required when creating a student user'
      });
    }
    if (data.role === 'faculty' && !data.facultyProfile) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['facultyProfile'],
        message: 'Linked faculty profile details are required when creating a faculty user'
      });
    }
  });

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    email: z.string().trim().toLowerCase().email('Please provide a valid email address').max(255).optional(),
    role: z.enum(['admin', 'faculty', 'student']).optional(),
    isActive: z.boolean().optional()
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one permitted field must be provided for update'
  });

export const updateUserStatusSchema = z
  .object({
    isActive: z.boolean({ required_error: 'isActive boolean status is required' })
  })
  .strict();
