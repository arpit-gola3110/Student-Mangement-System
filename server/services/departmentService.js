import { Department, Course, Student, Faculty } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import {
  escapeRegex,
  buildPagination,
  formatPaginationMeta,
  buildSortSpec
} from '../utils/queryHelpers.js';

const DEPT_SORT_FIELDS = {
  name: 'name',
  code: 'code',
  createdAt: 'createdAt',
  isActive: 'isActive'
};

/**
 * Aggregates live course, student, and faculty counts for a list of department IDs.
 */
const attachDepartmentCounts = async (departments) => {
  if (!departments.length) return [];
  const deptIds = departments.map((d) => d._id);

  const [courseCounts, studentCounts, facultyCounts] = await Promise.all([
    Course.aggregate([
      { $match: { department: { $in: deptIds } } },
      { $group: { _id: '$department', count: { $sum: 1 } } }
    ]),
    Student.aggregate([
      { $match: { department: { $in: deptIds } } },
      { $group: { _id: '$department', count: { $sum: 1 } } }
    ]),
    Faculty.aggregate([
      { $match: { department: { $in: deptIds } } },
      { $group: { _id: '$department', count: { $sum: 1 } } }
    ])
  ]);

  const toMap = (arr) => new Map(arr.map((x) => [x._id.toString(), x.count]));
  const cMap = toMap(courseCounts);
  const sMap = toMap(studentCounts);
  const fMap = toMap(facultyCounts);

  return departments.map((d) => {
    const id = d._id.toString();
    return {
      ...d,
      isActive: d.isActive !== false,
      courseCount: cMap.get(id) || 0,
      studentCount: sMap.get(id) || 0,
      facultyCount: fMap.get(id) || 0
    };
  });
};

export const listDepartments = async (queryParams = {}) => {
  const { page, limit, skip } = buildPagination(queryParams.page, queryParams.limit);
  const filter = {};

  if (queryParams.status === 'active' || queryParams.isActive === 'true') {
    filter.isActive = { $ne: false };
  } else if (queryParams.status === 'inactive' || queryParams.isActive === 'false') {
    filter.isActive = false;
  }

  if (queryParams.search) {
    const rx = new RegExp(escapeRegex(queryParams.search), 'i');
    filter.$or = [{ code: rx }, { name: rx }, { description: rx }];
  }

  const sort = buildSortSpec(queryParams.sortBy, queryParams.sortOrder, DEPT_SORT_FIELDS, { name: 1 });

  const [totalRecords, rawDepartments] = await Promise.all([
    Department.countDocuments(filter),
    Department.find(filter)
      .populate('headOfDepartment', 'employeeId firstName lastName designation status')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  const departments = await attachDepartmentCounts(rawDepartments);

  return {
    departments,
    meta: formatPaginationMeta(page, limit, totalRecords)
  };
};

export const getDepartmentById = async (id) => {
  const dept = await Department.findById(id)
    .populate('headOfDepartment', 'employeeId firstName lastName designation status')
    .lean();

  if (!dept) {
    throw ApiError.notFound('Department not found');
  }

  const [enriched] = await attachDepartmentCounts([dept]);
  const courses = await Course.find({ department: id })
    .select('code name durationYears totalSemesters isActive')
    .sort({ name: 1 })
    .lean();

  return {
    ...enriched,
    courses
  };
};

export const createDepartment = async (payload) => {
  const code = payload.code.trim().toUpperCase();
  const name = payload.name.trim();

  const [dupCode, dupName] = await Promise.all([
    Department.findOne({ code }).lean(),
    Department.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') }).lean()
  ]);

  if (dupCode) {
    throw ApiError.conflict(`Department code '${code}' already exists`);
  }
  if (dupName) {
    throw ApiError.conflict(`Department '${dupName.name}' already exists`);
  }

  let hodId = null;
  if (payload.headOfDepartment) {
    const hod = await Faculty.findById(payload.headOfDepartment).lean();
    if (!hod || hod.status === 'INACTIVE' || hod.status === 'RETIRED') {
      throw ApiError.badRequest('Selected Head of Department does not exist or is inactive');
    }
    hodId = hod._id;
  }

  const created = await Department.create({
    code,
    name,
    description: payload.description || '',
    headOfDepartment: hodId,
    isActive: payload.isActive ?? true
  });

  return getDepartmentById(created._id);
};

export const updateDepartment = async (id, payload) => {
  const existing = await Department.findById(id);
  if (!existing) {
    throw ApiError.notFound('Department not found');
  }

  const updates = {};

  if (payload.code !== undefined) {
    const nextCode = payload.code.trim().toUpperCase();
    if (nextCode !== existing.code) {
      const dupCode = await Department.findOne({ code: nextCode, _id: { $ne: id } }).lean();
      if (dupCode) {
        throw ApiError.conflict(`Department code '${nextCode}' is already in use`);
      }
      updates.code = nextCode;
    }
  }

  if (payload.name !== undefined) {
    const nextName = payload.name.trim();
    if (nextName.toLowerCase() !== existing.name.toLowerCase()) {
      const dupName = await Department.findOne({
        name: new RegExp(`^${escapeRegex(nextName)}$`, 'i'),
        _id: { $ne: id }
      }).lean();
      if (dupName) {
        throw ApiError.conflict(`Department name '${dupName.name}' already exists`);
      }
    }
    updates.name = nextName;
  }

  if (payload.description !== undefined) updates.description = payload.description;
  if (payload.isActive !== undefined) updates.isActive = payload.isActive;

  if (payload.headOfDepartment !== undefined) {
    if (!payload.headOfDepartment) {
      updates.headOfDepartment = null;
    } else {
      const hod = await Faculty.findById(payload.headOfDepartment).lean();
      if (!hod || hod.status === 'INACTIVE' || hod.status === 'RETIRED') {
        throw ApiError.badRequest('Selected Head of Department does not exist or is inactive');
      }
      updates.headOfDepartment = hod._id;
    }
  }

  await Department.updateOne({ _id: id }, { $set: updates });
  return getDepartmentById(id);
};

export const updateDepartmentStatus = async (id, isActive) => {
  const existing = await Department.findById(id);
  if (!existing) {
    throw ApiError.notFound('Department not found');
  }

  await Department.updateOne({ _id: id }, { $set: { isActive } });
  return getDepartmentById(id);
};

export const deleteDepartment = async (id) => {
  const existing = await Department.findById(id).lean();
  if (!existing) {
    throw ApiError.notFound('Department not found');
  }

  const [courseCount, studentCount, facultyCount] = await Promise.all([
    Course.countDocuments({ department: id }),
    Student.countDocuments({ department: id }),
    Faculty.countDocuments({ department: id })
  ]);

  if (courseCount + studentCount + facultyCount > 0) {
    throw ApiError.conflict(
      'Cannot delete department with existing courses, students, or faculty members. Please deactivate it instead.'
    );
  }

  await Department.deleteOne({ _id: id });
  return { deletedId: id };
};
