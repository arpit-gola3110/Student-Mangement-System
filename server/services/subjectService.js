import {
  Subject,
  Course,
  Semester,
  FacultyAssignment,
  Attendance,
  Result
} from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import {
  escapeRegex,
  buildPagination,
  formatPaginationMeta,
  buildSortSpec
} from '../utils/queryHelpers.js';

const SUBJECT_SORT_FIELDS = {
  code: 'code',
  name: 'name',
  credits: 'credits',
  type: 'type',
  maxInternalMarks: 'maxInternalMarks',
  maxExternalMarks: 'maxExternalMarks',
  createdAt: 'createdAt',
  isActive: 'isActive'
};

const normalizeSubject = (sub) => {
  const maxInternalMarks = sub.maxInternalMarks ?? 30;
  const maxExternalMarks = sub.maxExternalMarks ?? 70;
  return {
    ...sub,
    maxInternalMarks,
    maxExternalMarks,
    totalMaxMarks: maxInternalMarks + maxExternalMarks,
    isActive: sub.isActive !== false
  };
};

export const listSubjects = async (queryParams = {}) => {
  const { page, limit, skip } = buildPagination(queryParams.page, queryParams.limit);
  const filter = {};

  if (queryParams.course) {
    filter.course = queryParams.course;
  } else if (queryParams.department) {
    const deptCourses = await Course.find({ department: queryParams.department }).select('_id').lean();
    filter.course = { $in: deptCourses.map((c) => c._id) };
  }

  if (queryParams.semester) filter.semester = queryParams.semester;
  if (queryParams.subjectType) filter.type = queryParams.subjectType;

  if (queryParams.status === 'active' || queryParams.isActive === 'true') {
    filter.isActive = { $ne: false };
  } else if (queryParams.status === 'inactive' || queryParams.isActive === 'false') {
    filter.isActive = false;
  }

  if (queryParams.search) {
    const rx = new RegExp(escapeRegex(queryParams.search), 'i');
    filter.$or = [{ code: rx }, { name: rx }, { description: rx }];
  }

  const sort = buildSortSpec(queryParams.sortBy, queryParams.sortOrder, SUBJECT_SORT_FIELDS, { code: 1 });

  const [totalRecords, rawSubjects] = await Promise.all([
    Subject.countDocuments(filter),
    Subject.find(filter)
      .populate({
        path: 'course',
        select: 'code name department isActive',
        populate: { path: 'department', select: 'code name' }
      })
      .populate('semester', 'semesterNumber academicYear status isActive')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true })
  ]);

  const subjects = rawSubjects.map(normalizeSubject);

  return {
    subjects,
    meta: formatPaginationMeta(page, limit, totalRecords)
  };
};

export const getSubjectById = async (id) => {
  const subject = await Subject.findById(id)
    .populate({
      path: 'course',
      select: 'code name department isActive',
      populate: { path: 'department', select: 'code name' }
    })
    .populate('semester', 'semesterNumber academicYear status isActive')
    .lean({ virtuals: true });

  if (!subject) {
    throw ApiError.notFound('Subject not found');
  }

  const [assignmentCount, attendanceCount, resultCount] = await Promise.all([
    FacultyAssignment.countDocuments({ subject: id }),
    Attendance.countDocuments({ subject: id }),
    Result.countDocuments({ subject: id })
  ]);

  return {
    ...normalizeSubject(subject),
    dependencyCounts: {
      assignments: assignmentCount,
      attendance: attendanceCount,
      results: resultCount
    }
  };
};

export const createSubject = async (payload) => {
  const code = payload.code.trim().toUpperCase();

  const [dupCode, course, semester] = await Promise.all([
    Subject.findOne({ code }).lean(),
    Course.findById(payload.course).lean(),
    Semester.findById(payload.semester).lean()
  ]);

  if (dupCode) {
    throw ApiError.conflict(`Subject code '${code}' already exists`);
  }
  if (!course || course.isActive === false) {
    throw ApiError.badRequest('Selected course does not exist or is inactive');
  }
  if (!semester || semester.isActive === false) {
    throw ApiError.badRequest('Selected semester does not exist or is inactive');
  }
  if (semester.course.toString() !== course._id.toString()) {
    throw ApiError.badRequest('Selected semester does not belong to the selected course');
  }

  const dupInTerm = await Subject.findOne({
    course: course._id,
    semester: semester._id,
    name: new RegExp(`^${escapeRegex(payload.name.trim())}$`, 'i')
  }).lean();
  if (dupInTerm) {
    throw ApiError.conflict(`Subject '${dupInTerm.name}' already exists in this course and semester`);
  }

  const created = await Subject.create({
    code,
    name: payload.name.trim(),
    course: course._id,
    semester: semester._id,
    credits: payload.credits,
    type: payload.type,
    maxInternalMarks: payload.maxInternalMarks,
    maxExternalMarks: payload.maxExternalMarks,
    description: payload.description || '',
    isActive: payload.isActive ?? true
  });

  return getSubjectById(created._id);
};

export const updateSubject = async (id, payload) => {
  const existing = await Subject.findById(id);
  if (!existing) {
    throw ApiError.notFound('Subject not found');
  }

  const updates = {};

  if (payload.code !== undefined) {
    const nextCode = payload.code.trim().toUpperCase();
    if (nextCode !== existing.code) {
      const dup = await Subject.findOne({ code: nextCode, _id: { $ne: id } }).lean();
      if (dup) {
        throw ApiError.conflict(`Subject code '${nextCode}' is already in use`);
      }
      updates.code = nextCode;
    }
  }

  const nextCourseId = payload.course || existing.course.toString();
  const nextSemesterId = payload.semester || existing.semester.toString();
  const isReassigning =
    nextCourseId !== existing.course.toString() || nextSemesterId !== existing.semester.toString();

  if (isReassigning) {
    const [assignCount, attCount, resCount] = await Promise.all([
      FacultyAssignment.countDocuments({ subject: id }),
      Attendance.countDocuments({ subject: id }),
      Result.countDocuments({ subject: id })
    ]);

    if (assignCount + attCount + resCount > 0) {
      throw ApiError.conflict(
        'Cannot reassign subject to a different course or semester while assignments, attendance, or results exist'
      );
    }

    const [course, semester] = await Promise.all([
      Course.findById(nextCourseId).lean(),
      Semester.findById(nextSemesterId).lean()
    ]);

    if (!course || course.isActive === false) {
      throw ApiError.badRequest('Selected course does not exist or is inactive');
    }
    if (!semester || semester.isActive === false) {
      throw ApiError.badRequest('Selected semester does not exist or is inactive');
    }
    if (semester.course.toString() !== course._id.toString()) {
      throw ApiError.badRequest('Selected semester does not belong to the selected course');
    }

    updates.course = course._id;
    updates.semester = semester._id;
  }

  // Validate marks bounds and prevent reducing below already-recorded student results
  const nextInternal = payload.maxInternalMarks ?? existing.maxInternalMarks ?? 30;
  const nextExternal = payload.maxExternalMarks ?? existing.maxExternalMarks ?? 70;
  const nextTotal = nextInternal + nextExternal;

  if (nextTotal <= 0 || nextTotal > 100) {
    throw ApiError.badRequest('Combined internal and external maximum marks must be between 1 and 100');
  }

  if (payload.maxInternalMarks !== undefined || payload.maxExternalMarks !== undefined) {
    const [resultExtremes] = await Result.aggregate([
      { $match: { subject: existing._id } },
      {
        $group: {
          _id: null,
          maxInt: { $max: '$internalMarks' },
          maxExt: { $max: '$externalMarks' },
          maxTot: { $max: '$totalMarks' }
        }
      }
    ]);

    if (resultExtremes) {
      if (nextInternal < (resultExtremes.maxInt || 0)) {
        throw ApiError.conflict(
          `Cannot reduce max internal marks to ${nextInternal} because existing results record up to ${resultExtremes.maxInt}`
        );
      }
      if (nextExternal < (resultExtremes.maxExt || 0)) {
        throw ApiError.conflict(
          `Cannot reduce max external marks to ${nextExternal} because existing results record up to ${resultExtremes.maxExt}`
        );
      }
      if (nextTotal < (resultExtremes.maxTot || 0)) {
        throw ApiError.conflict(
          `Cannot reduce total maximum marks to ${nextTotal} because existing results record up to ${resultExtremes.maxTot}`
        );
      }
    }

    if (payload.maxInternalMarks !== undefined) updates.maxInternalMarks = nextInternal;
    if (payload.maxExternalMarks !== undefined) updates.maxExternalMarks = nextExternal;
  }

  if (payload.name !== undefined) updates.name = payload.name.trim();
  if (payload.credits !== undefined) updates.credits = payload.credits;
  if (payload.type !== undefined) updates.type = payload.type;
  if (payload.description !== undefined) updates.description = payload.description;
  if (payload.isActive !== undefined) updates.isActive = payload.isActive;

  await Subject.updateOne({ _id: id }, { $set: updates });
  return getSubjectById(id);
};

export const updateSubjectStatus = async (id, isActive) => {
  const existing = await Subject.findById(id);
  if (!existing) {
    throw ApiError.notFound('Subject not found');
  }

  await Subject.updateOne({ _id: id }, { $set: { isActive } });
  return getSubjectById(id);
};

export const deleteSubject = async (id) => {
  const existing = await Subject.findById(id).lean();
  if (!existing) {
    throw ApiError.notFound('Subject not found');
  }

  const [assignCount, attCount, resCount] = await Promise.all([
    FacultyAssignment.countDocuments({ subject: id }),
    Attendance.countDocuments({ subject: id }),
    Result.countDocuments({ subject: id })
  ]);

  if (assignCount + attCount + resCount > 0) {
    throw ApiError.conflict(
      'Cannot delete subject with existing faculty assignments, attendance records, or results. Please deactivate it instead.'
    );
  }

  await Subject.deleteOne({ _id: id });
  return { deletedId: id };
};
