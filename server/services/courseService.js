import { Course, Department, Semester, Subject, Student, Enrollment } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import {
  escapeRegex,
  buildPagination,
  formatPaginationMeta,
  buildSortSpec
} from '../utils/queryHelpers.js';

const COURSE_SORT_FIELDS = {
  name: 'name',
  code: 'code',
  durationYears: 'durationYears',
  totalSemesters: 'totalSemesters',
  createdAt: 'createdAt',
  isActive: 'isActive'
};

const attachCourseCounts = async (courses) => {
  if (!courses.length) return [];
  const courseIds = courses.map((c) => c._id);

  const [studentCounts, semesterCounts] = await Promise.all([
    Student.aggregate([
      { $match: { course: { $in: courseIds } } },
      { $group: { _id: '$course', count: { $sum: 1 } } }
    ]),
    Semester.aggregate([
      { $match: { course: { $in: courseIds } } },
      { $group: { _id: '$course', count: { $sum: 1 } } }
    ])
  ]);

  const toMap = (arr) => new Map(arr.map((x) => [x._id.toString(), x.count]));
  const stuMap = toMap(studentCounts);
  const semMap = toMap(semesterCounts);

  return courses.map((c) => {
    const id = c._id.toString();
    return {
      ...c,
      isActive: c.isActive !== false,
      studentCount: stuMap.get(id) || 0,
      semesterCount: semMap.get(id) || 0
    };
  });
};

export const listCourses = async (queryParams = {}) => {
  const { page, limit, skip } = buildPagination(queryParams.page, queryParams.limit);
  const filter = {};

  if (queryParams.department) filter.department = queryParams.department;

  if (queryParams.status === 'active' || queryParams.isActive === 'true') {
    filter.isActive = { $ne: false };
  } else if (queryParams.status === 'inactive' || queryParams.isActive === 'false') {
    filter.isActive = false;
  }

  if (queryParams.search) {
    const rx = new RegExp(escapeRegex(queryParams.search), 'i');
    filter.$or = [{ code: rx }, { name: rx }, { description: rx }];
  }

  const sort = buildSortSpec(queryParams.sortBy, queryParams.sortOrder, COURSE_SORT_FIELDS, { name: 1 });

  const [totalRecords, rawCourses] = await Promise.all([
    Course.countDocuments(filter),
    Course.find(filter)
      .populate('department', 'code name isActive')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  const courses = await attachCourseCounts(rawCourses);

  return {
    courses,
    meta: formatPaginationMeta(page, limit, totalRecords)
  };
};

export const getCourseById = async (id) => {
  const course = await Course.findById(id)
    .populate('department', 'code name isActive')
    .lean();

  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  const [enriched] = await attachCourseCounts([course]);
  const semesters = await Semester.find({ course: id })
    .select('semesterNumber academicYear startDate endDate status isActive')
    .sort({ academicYear: -1, semesterNumber: 1 })
    .lean();

  return {
    ...enriched,
    semesters
  };
};

export const createCourse = async (payload) => {
  const code = payload.code.trim().toUpperCase();
  const name = payload.name.trim();

  const [dupCode, dept] = await Promise.all([
    Course.findOne({ code }).lean(),
    Department.findById(payload.department).lean()
  ]);

  if (dupCode) {
    throw ApiError.conflict(`Course code '${code}' already exists`);
  }
  if (!dept || dept.isActive === false) {
    throw ApiError.badRequest('Selected department does not exist or is inactive');
  }

  const dupInDept = await Course.findOne({
    department: dept._id,
    name: new RegExp(`^${escapeRegex(name)}$`, 'i')
  }).lean();
  if (dupInDept) {
    throw ApiError.conflict(`Course '${dupInDept.name}' already exists in this department`);
  }

  const created = await Course.create({
    code,
    name,
    department: dept._id,
    durationYears: payload.durationYears,
    totalSemesters: payload.totalSemesters,
    description: payload.description || '',
    isActive: payload.isActive ?? true
  });

  return getCourseById(created._id);
};

export const updateCourse = async (id, payload) => {
  const existing = await Course.findById(id);
  if (!existing) {
    throw ApiError.notFound('Course not found');
  }

  const updates = {};

  if (payload.code !== undefined) {
    const nextCode = payload.code.trim().toUpperCase();
    if (nextCode !== existing.code) {
      const dup = await Course.findOne({ code: nextCode, _id: { $ne: id } }).lean();
      if (dup) {
        throw ApiError.conflict(`Course code '${nextCode}' is already in use`);
      }
      updates.code = nextCode;
    }
  }

  if (payload.department !== undefined && payload.department !== existing.department.toString()) {
    const [semCount, stuCount, subCount, enrCount] = await Promise.all([
      Semester.countDocuments({ course: id }),
      Student.countDocuments({ course: id }),
      Subject.countDocuments({ course: id }),
      Enrollment.countDocuments({ course: id })
    ]);
    if (semCount + stuCount + subCount + enrCount > 0) {
      throw ApiError.conflict(
        'Cannot reassign course to another department while semesters, subjects, enrollments, or students depend on it'
      );
    }

    const newDept = await Department.findById(payload.department).lean();
    if (!newDept || newDept.isActive === false) {
      throw ApiError.badRequest('Target department does not exist or is inactive');
    }
    updates.department = newDept._id;
  }

  if (payload.totalSemesters !== undefined && payload.totalSemesters < existing.totalSemesters) {
    const [highestSem, highestStu] = await Promise.all([
      Semester.findOne({ course: id }).sort({ semesterNumber: -1 }).select('semesterNumber').lean(),
      Student.findOne({ course: id }).sort({ currentSemester: -1 }).select('currentSemester').lean()
    ]);

    const maxRequired = Math.max(highestSem?.semesterNumber || 0, highestStu?.currentSemester || 0);
    if (payload.totalSemesters < maxRequired) {
      throw ApiError.conflict(
        `Cannot reduce total semesters below ${maxRequired} because existing semesters or student cohorts reference semester ${maxRequired}`
      );
    }
  }

  if (payload.name !== undefined) updates.name = payload.name.trim();
  if (payload.durationYears !== undefined) updates.durationYears = payload.durationYears;
  if (payload.totalSemesters !== undefined) updates.totalSemesters = payload.totalSemesters;
  if (payload.description !== undefined) updates.description = payload.description;
  if (payload.isActive !== undefined) updates.isActive = payload.isActive;

  await Course.updateOne({ _id: id }, { $set: updates });
  return getCourseById(id);
};

export const updateCourseStatus = async (id, isActive) => {
  const existing = await Course.findById(id);
  if (!existing) {
    throw ApiError.notFound('Course not found');
  }

  await Course.updateOne({ _id: id }, { $set: { isActive } });
  return getCourseById(id);
};

export const deleteCourse = async (id) => {
  const existing = await Course.findById(id).lean();
  if (!existing) {
    throw ApiError.notFound('Course not found');
  }

  const [semCount, subCount, stuCount, enrCount] = await Promise.all([
    Semester.countDocuments({ course: id }),
    Subject.countDocuments({ course: id }),
    Student.countDocuments({ course: id }),
    Enrollment.countDocuments({ course: id })
  ]);

  if (semCount + subCount + stuCount + enrCount > 0) {
    throw ApiError.conflict(
      'Cannot delete course with associated semesters, subjects, students, or enrollments. Please deactivate it instead.'
    );
  }

  await Course.deleteOne({ _id: id });
  return { deletedId: id };
};
