import { z } from 'zod';
import { objectIdSchema } from '../middleware/validateRequest.js';
import { passwordPolicySchema } from './authValidator.js';

export const facultyIdParamSchema = z.object({
  id: objectIdSchema
});

export const listFacultyQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(100).optional(),
    department: objectIdSchema.optional(),
    designation: z.enum(['PROFESSOR', 'ASSOCIATE_PROFESSOR', 'ASSISTANT_PROFESSOR', 'LECTURER']).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'RETIRED', 'active', 'inactive', 'on_leave', 'retired']).optional(),
    sortBy: z.enum(['employeeId', 'firstName', 'designation', 'joiningDate', 'status', 'createdAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  })
  .strict();

export const createFacultySchema = z
  .object({
    name: z.string().trim().min(2, 'Faculty full name is required').max(100).optional(),
    firstName: z.string().trim().min(1, 'First name is required').max(60).optional(),
    lastName: z.string().trim().min(1, 'Last name is required').max(60).optional(),
    email: z.string().trim().toLowerCase().email('Valid email address is required').max(255),
    password: passwordPolicySchema,
    employeeId: z.string().trim().min(3, 'Employee ID is required').max(40),
    department: objectIdSchema,
    designation: z.enum(['PROFESSOR', 'ASSOCIATE_PROFESSOR', 'ASSISTANT_PROFESSOR', 'LECTURER']),
    specialization: z.string().trim().min(2, 'Specialization is required').max(120),
    qualification: z.string().trim().max(120).optional(),
    contactNumber: z.string().trim().regex(/^[0-9+\-\s]{7,15}$/, 'Valid phone number (7-15 digits) is required'),
    joiningDate: z.coerce.date().default(() => new Date()),
    status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'RETIRED']).default('ACTIVE')
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.name && !data.firstName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['firstName'],
        message: 'Faculty name (or firstName) is required'
      });
    }
  });

export const updateFacultySchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    firstName: z.string().trim().min(1).max(60).optional(),
    lastName: z.string().trim().min(1).max(60).optional(),
    employeeId: z.string().trim().min(3).max(40).optional(),
    department: objectIdSchema.optional(),
    designation: z.enum(['PROFESSOR', 'ASSOCIATE_PROFESSOR', 'ASSISTANT_PROFESSOR', 'LECTURER']).optional(),
    specialization: z.string().trim().min(2).max(120).optional(),
    qualification: z.string().trim().max(120).optional(),
    contactNumber: z.string().trim().regex(/^[0-9+\-\s]{7,15}$/, 'Valid phone number is required').optional(),
    joiningDate: z.coerce.date().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'RETIRED']).optional()
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update'
  });

export const updateFacultyStatusSchema = z
  .object({
    status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'RETIRED'])
  })
  .strict();
