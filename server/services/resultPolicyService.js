import AcademicResultPolicy, { DEFAULT_GRADE_BOUNDARIES } from '../models/AcademicResultPolicy.js';
import Course from '../models/Course.js';
import Semester from '../models/Semester.js';
import Result from '../models/Result.js';
import ApiError from '../utils/ApiError.js';
import { buildPagination, formatPaginationMeta, escapeRegex } from '../utils/queryHelpers.js';

export const listPolicies = async (query = {}) => {
  const { page, limit, skip } = buildPagination(query.page, query.limit, 100);
  const filter = {};
  if (query.academicYear) filter.academicYear = query.academicYear;
  if (query.course) filter.course = query.course;
  if (query.semester) filter.semester = query.semester;
  if (query.isActive !== undefined && query.isActive !== '') {
    filter.isActive = query.isActive === 'true' || query.isActive === true;
  }
  if (query.search) {
    const safeRegex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: safeRegex }, { code: safeRegex }];
  }

  const [policies, totalRecords] = await Promise.all([
    AcademicResultPolicy.find(filter)
      .populate('course', 'code name')
      .populate('semester', 'semesterNumber academicYear')
      .populate('createdBy', 'name email')
      .sort({ isActive: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AcademicResultPolicy.countDocuments(filter)
  ]);

  return { policies, ...formatPaginationMeta(page, limit, totalRecords) };
};

export const getPolicyById = async (id) => {
  const policy = await AcademicResultPolicy.findById(id)
    .populate('course', 'code name')
    .populate('semester', 'semesterNumber academicYear')
    .populate('createdBy', 'name email')
    .lean();
  if (!policy) throw ApiError.notFound('Academic result policy not found');
  return policy;
};

export const createPolicy = async (payload, actorUserId) => {
  if (payload.course) {
    const crs = await Course.findById(payload.course);
    if (!crs) throw ApiError.notFound('Selected course not found');
  }
  if (payload.semester) {
    const sem = await Semester.findById(payload.semester);
    if (!sem) throw ApiError.notFound('Selected semester not found');
    if (payload.course && String(sem.course) !== String(payload.course)) {
      throw ApiError.badRequest('Selected semester does not belong to selected course');
    }
  }

  const dup = await AcademicResultPolicy.findOne({ code: payload.code.toUpperCase() }).lean();
  if (dup) throw ApiError.conflict(`Policy code "${payload.code}" already exists`);

  const internalMax = payload.evaluationMode === 'EXTERNAL_ONLY' ? 0 : Number(payload.internalMaxMarks ?? 30);
  const externalMax = payload.evaluationMode === 'INTERNAL_ONLY' ? 0 : Number(payload.externalMaxMarks ?? 70);
  const totalMax = internalMax + externalMax;
  if (totalMax <= 0) {
    throw ApiError.badRequest('Total maximum marks across active components must be positive');
  }

  const created = await AcademicResultPolicy.create({
    name: payload.name.trim(),
    code: payload.code.trim().toUpperCase(),
    academicYear: payload.academicYear || undefined,
    course: payload.course || undefined,
    semester: payload.semester || undefined,
    evaluationMode: payload.evaluationMode || 'COMBINED',
    useSubjectMaxMarks: payload.useSubjectMaxMarks ?? true,
    internalMaxMarks: internalMax,
    externalMaxMarks: externalMax,
    internalWeightage: payload.internalWeightage ?? 1,
    externalWeightage: payload.externalWeightage ?? 1,
    totalMaxMarks: totalMax,
    minInternalPassPercent: payload.minInternalPassPercent ?? 0,
    minExternalPassPercent: payload.minExternalPassPercent ?? 30,
    minTotalPassPercent: payload.minTotalPassPercent ?? 40,
    roundingPolicy: payload.roundingPolicy || 'DECIMAL_2',
    requireAllInternalAssessments: payload.requireAllInternalAssessments ?? false,
    sgpaEnabled: payload.sgpaEnabled ?? true,
    cgpaEnabled: payload.cgpaEnabled ?? false,
    isProvisional: payload.isProvisional ?? true,
    gradeBoundaries: payload.gradeBoundaries || DEFAULT_GRADE_BOUNDARIES,
    policyVersion: 1,
    isActive: true,
    createdBy: actorUserId,
    updatedBy: actorUserId
  });

  return getPolicyById(created._id);
};

export const updatePolicy = async (id, payload, actorUserId) => {
  const existing = await AcademicResultPolicy.findById(id);
  if (!existing) throw ApiError.notFound('Academic result policy not found');

  const nextMode = payload.evaluationMode || existing.evaluationMode;
  const nextInternal =
    nextMode === 'EXTERNAL_ONLY'
      ? 0
      : payload.internalMaxMarks !== undefined
      ? Number(payload.internalMaxMarks)
      : existing.internalMaxMarks;
  const nextExternal =
    nextMode === 'INTERNAL_ONLY'
      ? 0
      : payload.externalMaxMarks !== undefined
      ? Number(payload.externalMaxMarks)
      : existing.externalMaxMarks;

  if (nextInternal + nextExternal <= 0) {
    throw ApiError.badRequest('Total maximum marks across active components must be positive');
  }

  if (payload.name !== undefined) existing.name = payload.name.trim();
  existing.evaluationMode = nextMode;
  if (payload.useSubjectMaxMarks !== undefined) existing.useSubjectMaxMarks = payload.useSubjectMaxMarks;
  existing.internalMaxMarks = nextInternal;
  existing.externalMaxMarks = nextExternal;
  existing.totalMaxMarks = nextInternal + nextExternal;
  if (payload.minInternalPassPercent !== undefined) existing.minInternalPassPercent = payload.minInternalPassPercent;
  if (payload.minExternalPassPercent !== undefined) existing.minExternalPassPercent = payload.minExternalPassPercent;
  if (payload.minTotalPassPercent !== undefined) existing.minTotalPassPercent = payload.minTotalPassPercent;
  if (payload.roundingPolicy !== undefined) existing.roundingPolicy = payload.roundingPolicy;
  if (payload.requireAllInternalAssessments !== undefined) {
    existing.requireAllInternalAssessments = payload.requireAllInternalAssessments;
  }
  if (payload.isProvisional !== undefined) existing.isProvisional = payload.isProvisional;
  if (payload.gradeBoundaries !== undefined) existing.gradeBoundaries = payload.gradeBoundaries;

  existing.policyVersion = (existing.policyVersion || 1) + 1;
  existing.updatedBy = actorUserId;
  await existing.save();

  return getPolicyById(existing._id);
};

export const updatePolicyStatus = async (id, isActive, actorUserId) => {
  const existing = await AcademicResultPolicy.findById(id);
  if (!existing) throw ApiError.notFound('Academic result policy not found');

  if (!isActive) {
    const otherActive = await AcademicResultPolicy.countDocuments({ _id: { $ne: existing._id }, isActive: true });
    const hasResults = await Result.exists({ policy: existing._id });
    if (otherActive === 0 && hasResults) {
      throw ApiError.badRequest('Cannot deactivate the only active academic result policy');
    }
  }

  existing.isActive = Boolean(isActive);
  existing.updatedBy = actorUserId;
  await existing.save();
  return getPolicyById(existing._id);
};

export const resolveEffectivePolicy = async ({ policyId, course, semester, academicYear } = {}) => {
  if (policyId) {
    const p = await AcademicResultPolicy.findById(policyId).lean();
    if (!p) throw ApiError.notFound('Selected academic result policy not found');
    if (!p.isActive) throw ApiError.badRequest('Selected academic result policy is inactive');
    return p;
  }

  const candidates = await AcademicResultPolicy.find({ isActive: true }).sort({ updatedAt: -1 }).lean();
  if (candidates.length === 0) {
    throw ApiError.badRequest('No active AcademicResultPolicy configured in system');
  }

  const exactMatch =
    candidates.find(
      (p) =>
        p.course &&
        String(p.course) === String(course) &&
        p.semester &&
        String(p.semester) === String(semester) &&
        (!p.academicYear || p.academicYear === academicYear)
    ) ||
    candidates.find((p) => p.course && String(p.course) === String(course) && !p.semester) ||
    candidates.find((p) => !p.course && !p.semester && p.academicYear === academicYear) ||
    candidates.find((p) => !p.course && !p.semester) ||
    candidates[0];

  return exactMatch;
};
