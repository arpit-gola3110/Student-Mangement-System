import { z } from 'zod';
import { objectIdSchema } from '../middleware/validateRequest.js';

const academicYearRegex = /^\d{4}-\d{4}$/;

export const idParamSchema = z.object({
  id: objectIdSchema
});

const gradeBoundaryItemSchema = z
  .object({
    grade: z.string().trim().min(1).max(5).toUpperCase(),
    gradePoints: z.coerce.number().min(0).max(10),
    minPercentage: z.coerce.number().min(0).max(100),
    maxPercentage: z.coerce.number().min(0).max(100),
    description: z.string().trim().max(80).optional().default(''),
    isPassing: z.boolean().default(true)
  })
  .refine((g) => g.maxPercentage >= g.minPercentage, {
    message: 'Grade maxPercentage must be >= minPercentage'
  });

const validateBoundariesNonOverlapping = (boundaries, ctx) => {
  const sorted = [...boundaries].sort((a, b) => a.minPercentage - b.minPercentage);
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0 && sorted[i].minPercentage > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['gradeBoundaries'],
        message: 'Grade boundaries must cover starting from 0%'
      });
      return;
    }
    if (i > 0) {
      if (sorted[i].minPercentage <= sorted[i - 1].maxPercentage && sorted[i].minPercentage < sorted[i - 1].maxPercentage) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['gradeBoundaries'],
          message: `Overlapping grade boundaries between ${sorted[i - 1].grade} and ${sorted[i].grade}`
        });
        return;
      }
      if (sorted[i].minPercentage - sorted[i - 1].maxPercentage > 0.01) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['gradeBoundaries'],
          message: `Gap in grade boundaries between ${sorted[i - 1].maxPercentage}% and ${sorted[i].minPercentage}%`
        });
        return;
      }
    }
    if (i === sorted.length - 1 && sorted[i].maxPercentage < 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['gradeBoundaries'],
        message: 'Grade boundaries must cover up to 100%'
      });
    }
  }
};

// === RESULT POLICY SCHEMAS ===
export const createPolicySchema = z
  .object({
    name: z.string().trim().min(3).max(140),
    code: z.string().trim().min(2).max(50).toUpperCase(),
    academicYear: z.string().trim().regex(academicYearRegex).optional().or(z.literal('')),
    course: objectIdSchema.optional().or(z.literal('')),
    semester: objectIdSchema.optional().or(z.literal('')),
    evaluationMode: z.enum(['COMBINED', 'INTERNAL_ONLY', 'EXTERNAL_ONLY']).default('COMBINED'),
    useSubjectMaxMarks: z.boolean().default(true),
    internalMaxMarks: z.coerce.number().min(0).max(500).default(30),
    externalMaxMarks: z.coerce.number().min(0).max(500).default(70),
    internalWeightage: z.coerce.number().min(0).max(10).default(1),
    externalWeightage: z.coerce.number().min(0).max(10).default(1),
    minInternalPassPercent: z.coerce.number().min(0).max(100).default(0),
    minExternalPassPercent: z.coerce.number().min(0).max(100).default(30),
    minTotalPassPercent: z.coerce.number().min(0).max(100).default(40),
    roundingPolicy: z.enum(['DECIMAL_2', 'HALF_UP_INT', 'CEIL_INT']).default('DECIMAL_2'),
    requireAllInternalAssessments: z.boolean().default(false),
    sgpaEnabled: z.boolean().default(true),
    cgpaEnabled: z.boolean().default(false),
    isProvisional: z.boolean().default(true),
    gradeBoundaries: z.array(gradeBoundaryItemSchema).min(2).optional()
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.evaluationMode === 'COMBINED' && data.internalMaxMarks <= 0 && data.externalMaxMarks <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['internalMaxMarks'],
        message: 'Combined policy must define positive internal/external max marks'
      });
    }
    if (data.evaluationMode === 'INTERNAL_ONLY' && data.internalMaxMarks <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['internalMaxMarks'],
        message: 'Internal-only policy must have positive internalMaxMarks'
      });
    }
    if (data.evaluationMode === 'EXTERNAL_ONLY' && data.externalMaxMarks <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['externalMaxMarks'],
        message: 'External-only policy must have positive externalMaxMarks'
      });
    }
    if (data.gradeBoundaries) {
      validateBoundariesNonOverlapping(data.gradeBoundaries, ctx);
    }
  });

export const updatePolicySchema = z
  .object({
    name: z.string().trim().min(3).max(140).optional(),
    evaluationMode: z.enum(['COMBINED', 'INTERNAL_ONLY', 'EXTERNAL_ONLY']).optional(),
    useSubjectMaxMarks: z.boolean().optional(),
    internalMaxMarks: z.coerce.number().min(0).max(500).optional(),
    externalMaxMarks: z.coerce.number().min(0).max(500).optional(),
    minInternalPassPercent: z.coerce.number().min(0).max(100).optional(),
    minExternalPassPercent: z.coerce.number().min(0).max(100).optional(),
    minTotalPassPercent: z.coerce.number().min(0).max(100).optional(),
    roundingPolicy: z.enum(['DECIMAL_2', 'HALF_UP_INT', 'CEIL_INT']).optional(),
    requireAllInternalAssessments: z.boolean().optional(),
    isProvisional: z.boolean().optional(),
    gradeBoundaries: z.array(gradeBoundaryItemSchema).min(2).optional()
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one policy field is required' })
  .superRefine((data, ctx) => {
    if (data.gradeBoundaries) validateBoundariesNonOverlapping(data.gradeBoundaries, ctx);
  });

export const updatePolicyStatusSchema = z
  .object({
    isActive: z.boolean()
  })
  .strict();

// === RESULT GENERATION & EXTERNAL MARKS ===
export const readinessQuerySchema = z
  .object({
    course: objectIdSchema,
    semester: objectIdSchema,
    academicYear: z.string().trim().regex(academicYearRegex),
    examination: objectIdSchema,
    subject: objectIdSchema.optional(),
    policyId: objectIdSchema.optional()
  })
  .strict();

export const externalEntryItemSchema = z.object({
  studentId: objectIdSchema,
  subjectId: objectIdSchema,
  externalMarks: z.coerce.number().min(0).max(500).optional(),
  attendanceState: z.enum(['PRESENT', 'ABSENT', 'WITHHELD']).default('PRESENT')
});

export const calculateResultsSchema = z
  .object({
    course: objectIdSchema,
    semester: objectIdSchema,
    academicYear: z.string().trim().regex(academicYearRegex),
    examination: objectIdSchema,
    subject: objectIdSchema.optional(),
    policyId: objectIdSchema.optional(),
    externalEntries: z.array(externalEntryItemSchema).max(500).optional()
  })
  .strict();

export const recalculateResultSchema = z
  .object({
    resultIds: z.array(objectIdSchema).min(1).max(200),
    policyId: objectIdSchema.optional(),
    reason: z.string().trim().min(3, 'Recalculation reason is required (min 3 characters)').max(300)
  })
  .strict();

export const listResultsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(15),
    search: z.string().trim().max(100).optional(),
    department: objectIdSchema.optional(),
    course: objectIdSchema.optional(),
    semester: objectIdSchema.optional(),
    subject: objectIdSchema.optional(),
    examination: objectIdSchema.optional(),
    student: objectIdSchema.optional(),
    academicYear: z.string().trim().max(20).optional(),
    resultStatus: z.enum(['PASS', 'FAIL', 'ABSENT', 'INCOMPLETE', 'WITHHELD']).optional(),
    calculationStatus: z.enum(['PENDING', 'CALCULATED', 'REQUIRES_REVIEW', 'APPROVED', 'REJECTED']).optional(),
    publicationStatus: z.enum(['UNPUBLISHED', 'PUBLISHED', 'WITHDRAWN']).optional(),
    grade: z.string().trim().max(5).optional(),
    sortBy: z.enum(['totalMarks', 'percentage', 'gradePoints', 'updatedAt', 'createdAt']).default('updatedAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  })
  .strict();

export const reasonOptionalSchema = z
  .object({
    reason: z.string().trim().max(300).optional()
  })
  .strict();

export const reasonRequiredSchema = z
  .object({
    reason: z.string().trim().min(3, 'Reason is required (min 3 characters)').max(300)
  })
  .strict();

export const batchResultIdsSchema = z
  .object({
    resultIds: z.array(objectIdSchema).min(1).max(300),
    reason: z.string().trim().max(300).optional()
  })
  .strict();

export const correctResultSchema = z
  .object({
    internalMarks: z.coerce.number().min(0).max(500).optional(),
    externalMarks: z.coerce.number().min(0).max(500).optional(),
    attendanceState: z.enum(['PRESENT', 'ABSENT', 'WITHHELD']).optional(),
    remarks: z.string().trim().max(300).optional(),
    reason: z.string().trim().min(3, 'Correction reason is required (min 3 characters)').max(300)
  })
  .strict();
