import {
  Semester,
  Course,
  Subject,
  Student,
  Enrollment,
  FacultyAssignment,
  Examination,
  Attendance
} from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import {
  escapeRegex,
  buildPagination,
  formatPaginationMeta,
  buildSortSpec
} from '../utils/queryHelpers.js';

const SEMESTER_SORT_FIELDS = {
  semesterNumber: 'semesterNumber',
  academicYear: 'academicYear',
  startDate: 'startDate',
  endDate: 'endDate',
  status: 'status',
  createdAt: 'createdAt',
  isActive: 'isActive'
};

const attachSemesterCounts = async (semesters) => {
  if (!semesters.length) return [];
  const semIds = semesters.map((s) => s._id);

  const subjectCounts = await Subject.aggregate([
    { $match: { semester: { $in: semIds } } },
    { $group: { _id: '$semester', count: { $sum: 1 } } }
  ]);
  const subMap = new Map(subjectCounts.map((x) => [x._id.toString(), x.count]));

  return semesters.map((s) => ({
    ...s,
    isActive: s.isActive !== false,
    subjectCount: subMap.get(s._id.toString()) || 0
  }));
};

export const listSemesters = async (queryParams = {}) => {
  const { page, limit, skip } = buildPagination(queryParams.page, queryParams.limit);
  const filter = {};

  if (queryParams.course) {
    filter.course = queryParams.course;
  } else if (queryParams.department) {
    const deptCourses = await Course.find({ department: queryParams.department }).select('_id').lean();
    filter.course = { $in: deptCourses.map((c) => c._id) };
  }

  if (queryParams.semesterNumber) filter.semesterNumber = Number(queryParams.semesterNumber);
  if (queryParams.academicYear) filter.academicYear = queryParams.academicYear.trim();

  if (queryParams.isActive === 'true' || queryParams.status === 'active') {
    filter.isActive = { $ne: false };
  } else if (queryParams.isActive === 'false' || queryParams.status === 'inactive') {
    filter.isActive = false;
  } else if (['UPCOMING', 'ACTIVE', 'COMPLETED'].includes(queryParams.status)) {
    filter.status = queryParams.status;
  }

  if (queryParams.search) {
    const rx = new RegExp(escapeRegex(queryParams.search), 'i');
    const matchedCourses = await Course.find({ $or: [{ code: rx }, { name: rx }] })
      .select('_id')
      .lean();
    const courseIds = matchedCourses.map((c) => c._id);

    filter.$or = [
      { academicYear: rx },
      ...(courseIds.length > 0 ? [{ course: { $in: courseIds } }] : [])
    ];
  }

  const sort = buildSortSpec(queryParams.sortBy, queryParams.sortOrder, SEMESTER_SORT_FIELDS, {
    academicYear: -1,
    semesterNumber: 1
  });

  const [totalRecords, rawSemesters] = await Promise.all([
    Semester.countDocuments(filter),
    Semester.find(filter)
      .populate({
        path: 'course',
        select: 'code name totalSemesters department isActive',
        populate: { path: 'department', select: 'code name' }
      })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  const semesters = await attachSemesterCounts(rawSemesters);

  return {
    semesters,
    meta: formatPaginationMeta(page, limit, totalRecords)
  };
};

export const getSemesterById = async (id) => {
  const semester = await Semester.findById(id)
    .populate({
      path: 'course',
      select: 'code name totalSemesters department isActive',
      populate: { path: 'department', select: 'code name' }
    })
    .lean();

  if (!semester) {
    throw ApiError.notFound('Semester not found');
  }

  const [enriched] = await attachSemesterCounts([semester]);
  const [studentCount, examinationCount] = await Promise.all([
    Student.countDocuments({ semester: id }),
    Examination.countDocuments({ semester: id })
  ]);

  return {
    ...enriched,
    studentCount,
    examinationCount
  };
};

export const createSemester = async (payload) => {
  const course = await Course.findById(payload.course).lean();
  if (!course || course.isActive === false) {
    throw ApiError.badRequest('Selected course does not exist or is inactive');
  }

  if (payload.semesterNumber > course.totalSemesters) {
    throw ApiError.badRequest(
      `Semester number (${payload.semesterNumber}) cannot exceed ${course.code}'s total semesters (${course.totalSemesters})`
    );
  }

  const dup = await Semester.findOne({
    course: course._id,
    semesterNumber: payload.semesterNumber,
    academicYear: payload.academicYear.trim()
  }).lean();

  if (dup) {
    throw ApiError.conflict(
      `Semester ${payload.semesterNumber} for ${course.code} (${payload.academicYear}) already exists`
    );
  }

  const created = await Semester.create({
    course: course._id,
    semesterNumber: payload.semesterNumber,
    academicYear: payload.academicYear.trim(),
    startDate: payload.startDate,
    endDate: payload.endDate,
    status: payload.status || 'UPCOMING',
    isActive: payload.isActive ?? true
  });

  return getSemesterById(created._id);
};

export const updateSemester = async (id, payload) => {
  const existing = await Semester.findById(id);
  if (!existing) {
    throw ApiError.notFound('Semester not found');
  }

  const course = await Course.findById(existing.course).lean();
  if (!course) {
    throw ApiError.badRequest('Parent course record not found');
  }

  const nextStart = payload.startDate ? new Date(payload.startDate) : new Date(existing.startDate);
  const nextEnd = payload.endDate ? new Date(payload.endDate) : new Date(existing.endDate);
  if (nextEnd <= nextStart) {
    throw ApiError.badRequest('End date must be later than start date');
  }

  const nextSemNum = payload.semesterNumber ?? existing.semesterNumber;
  const nextYear = payload.academicYear ? payload.academicYear.trim() : existing.academicYear;

  if (nextSemNum > course.totalSemesters) {
    throw ApiError.badRequest(
      `Semester number (${nextSemNum}) cannot exceed ${course.code}'s total semesters (${course.totalSemesters})`
    );
  }

  if (payload.semesterNumber !== undefined && payload.semesterNumber !== existing.semesterNumber) {
    const [subCount, stuCount, enrCount, faCount, examCount, attCount] = await Promise.all([
      Subject.countDocuments({ semester: id }),
      Student.countDocuments({ semester: id }),
      Enrollment.countDocuments({ semester: id }),
      FacultyAssignment.countDocuments({ semester: id }),
      Examination.countDocuments({ semester: id }),
      Attendance.countDocuments({ semester: id })
    ]);

    if (subCount + stuCount + enrCount + faCount + examCount + attCount > 0) {
      throw ApiError.conflict(
        'Cannot change semester number while subjects, students, enrollments, assignments, exams, or attendance records depend on it'
      );
    }
  }

  if (nextSemNum !== existing.semesterNumber || nextYear !== existing.academicYear) {
    const dup = await Semester.findOne({
      _id: { $ne: id },
      course: existing.course,
      semesterNumber: nextSemNum,
      academicYear: nextYear
    }).lean();

    if (dup) {
      throw ApiError.conflict(
        `Semester ${nextSemNum} for ${course.code} (${nextYear}) already exists`
      );
    }
  }

  const updates = {};
  if (payload.semesterNumber !== undefined) updates.semesterNumber = nextSemNum;
  if (payload.academicYear !== undefined) updates.academicYear = nextYear;
  if (payload.startDate !== undefined) updates.startDate = payload.startDate;
  if (payload.endDate !== undefined) updates.endDate = payload.endDate;
  if (payload.status !== undefined) updates.status = payload.status;
  if (payload.isActive !== undefined) updates.isActive = payload.isActive;

  await Semester.updateOne({ _id: id }, { $set: updates });
  return getSemesterById(id);
};

export const updateSemesterStatus = async (id, payload) => {
  const existing = await Semester.findById(id);
  if (!existing) {
    throw ApiError.notFound('Semester not found');
  }

  const updates = {};
  if (payload.isActive !== undefined) updates.isActive = payload.isActive;
  if (payload.status !== undefined) updates.status = payload.status;

  await Semester.updateOne({ _id: id }, { $set: updates });
  return getSemesterById(id);
};

export const deleteSemester = async (id) => {
  const existing = await Semester.findById(id).lean();
  if (!existing) {
    throw ApiError.notFound('Semester not found');
  }

  const [subCount, stuCount, enrCount, faCount, examCount, attCount] = await Promise.all([
    Subject.countDocuments({ semester: id }),
    Student.countDocuments({ semester: id }),
    Enrollment.countDocuments({ semester: id }),
    FacultyAssignment.countDocuments({ semester: id }),
    Examination.countDocuments({ semester: id }),
    Attendance.countDocuments({ semester: id })
  ]);

  if (subCount + stuCount + enrCount + faCount + examCount + attCount > 0) {
    throw ApiError.conflict(
      'Cannot delete semester with linked subjects, students, enrollments, assignments, exams, or attendance logs. Deactivate it instead.'
    );
  }

  await Semester.deleteOne({ _id: id });
  return { deletedId: id };
};
