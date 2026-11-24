import {
  User,
  Faculty,
  Department,
  FacultyAssignment,
  Attendance,
  Result
} from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { runWithTransactionOrCompensation } from '../utils/dbTransaction.js';
import {
  escapeRegex,
  splitFullName,
  buildPagination,
  formatPaginationMeta,
  buildSortSpec
} from '../utils/queryHelpers.js';

const FACULTY_SORT_FIELDS = {
  employeeId: 'employeeId',
  firstName: 'firstName',
  designation: 'designation',
  joiningDate: 'joiningDate',
  status: 'status',
  createdAt: 'createdAt'
};

export const validateActiveDepartment = async (departmentId) => {
  const dept = await Department.findById(departmentId).lean();
  if (!dept || dept.isActive === false) {
    throw ApiError.badRequest('Selected department does not exist or is inactive');
  }
  return dept;
};

export const listFaculty = async (queryParams) => {
  const { page, limit, skip } = buildPagination(queryParams.page, queryParams.limit);
  const filter = {};

  if (queryParams.department) filter.department = queryParams.department;
  if (queryParams.designation) filter.designation = queryParams.designation;
  if (queryParams.status) filter.status = queryParams.status.toUpperCase();

  if (queryParams.search) {
    const rx = new RegExp(escapeRegex(queryParams.search), 'i');
    const matchingUsers = await User.find({
      role: 'faculty',
      $or: [{ email: rx }, { name: rx }]
    })
      .select('_id')
      .lean();
    const matchedUserIds = matchingUsers.map((u) => u._id);

    filter.$or = [
      { employeeId: rx },
      { firstName: rx },
      { lastName: rx },
      { specialization: rx },
      ...(matchedUserIds.length > 0 ? [{ user: { $in: matchedUserIds } }] : [])
    ];
  }

  const sort = buildSortSpec(queryParams.sortBy, queryParams.sortOrder, FACULTY_SORT_FIELDS, { createdAt: -1 });

  const [totalRecords, rawFaculty] = await Promise.all([
    Faculty.countDocuments(filter),
    Faculty.find(filter)
      .populate('user', 'name email isActive lastLogin')
      .populate('department', 'code name')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true })
  ]);

  const faculty = rawFaculty.map((f) => ({
    ...f,
    status: f.status || (f.user?.isActive === false ? 'INACTIVE' : 'ACTIVE')
  }));

  return {
    faculty,
    meta: formatPaginationMeta(page, limit, totalRecords)
  };
};

export const getFacultyById = async (id) => {
  const faculty = await Faculty.findById(id)
    .populate('user', 'name email role isActive lastLogin createdAt updatedAt')
    .populate('department', 'code name')
    .lean({ virtuals: true });

  if (!faculty) {
    throw ApiError.notFound('Faculty profile not found');
  }

  // Fetch actual real assignments from database (never fabricated)
  const assignments = await FacultyAssignment.find({ faculty: id })
    .populate('subject', 'code name credits type')
    .populate('semester', 'semesterNumber academicYear')
    .sort({ createdAt: -1 })
    .lean();

  return {
    ...faculty,
    status: faculty.status || (faculty.user?.isActive === false ? 'INACTIVE' : 'ACTIVE'),
    assignments
  };
};

export const createFaculty = async (payload) => {
  const normalizedEmail = payload.email.trim().toLowerCase();
  const employeeId = payload.employeeId.trim().toUpperCase();

  const [existingEmail, existingFaculty] = await Promise.all([
    User.findOne({ email: normalizedEmail }).lean(),
    Faculty.findOne({ employeeId }).lean()
  ]);

  if (existingEmail) {
    throw ApiError.conflict(`Email '${normalizedEmail}' is already registered`);
  }
  if (existingFaculty) {
    throw ApiError.conflict(`Employee ID '${employeeId}' already exists`);
  }

  const dept = await validateActiveDepartment(payload.department);

  const derivedNames = payload.firstName
    ? {
        firstName: payload.firstName.trim(),
        lastName: (payload.lastName || '-').trim()
      }
    : splitFullName(payload.name);

  const fullName = payload.name?.trim() || `${derivedNames.firstName} ${derivedNames.lastName}`.trim();
  const isUserActive = payload.status === 'ACTIVE';

  let createdUserId = null;

  const { result: createdFaculty } = await runWithTransactionOrCompensation(
    async (session) => {
      const opts = session ? { session } : {};
      const [createdUser] = await User.create(
        [
          {
            name: fullName,
            email: normalizedEmail,
            password: payload.password,
            role: 'faculty',
            isActive: isUserActive
          }
        ],
        opts
      );
      createdUserId = createdUser._id;

      const [facultyDoc] = await Faculty.create(
        [
          {
            user: createdUser._id,
            employeeId,
            firstName: derivedNames.firstName,
            lastName: derivedNames.lastName,
            department: dept._id,
            designation: payload.designation,
            specialization: payload.specialization,
            qualification: payload.qualification || payload.specialization,
            contactNumber: payload.contactNumber,
            joiningDate: payload.joiningDate || new Date(),
            status: payload.status
          }
        ],
        opts
      );

      return facultyDoc;
    },
    async () => {
      if (createdUserId) {
        await User.deleteOne({ _id: createdUserId });
      }
    }
  );

  return getFacultyById(createdFaculty._id);
};

export const updateFaculty = async (id, payload) => {
  const existing = await Faculty.findById(id);
  if (!existing) {
    throw ApiError.notFound('Faculty profile not found');
  }

  const nextEmpId = payload.employeeId ? payload.employeeId.trim().toUpperCase() : existing.employeeId;
  if (nextEmpId !== existing.employeeId) {
    const dup = await Faculty.findOne({ employeeId: nextEmpId, _id: { $ne: id } }).lean();
    if (dup) {
      throw ApiError.conflict(`Employee ID '${nextEmpId}' is already assigned to another faculty member`);
    }
  }

  if (payload.department) {
    await validateActiveDepartment(payload.department);
  }

  const updates = {};
  if (payload.employeeId !== undefined) updates.employeeId = nextEmpId;
  if (payload.department !== undefined) updates.department = payload.department;
  if (payload.designation !== undefined) updates.designation = payload.designation;
  if (payload.specialization !== undefined) updates.specialization = payload.specialization;
  if (payload.qualification !== undefined) updates.qualification = payload.qualification;
  if (payload.contactNumber !== undefined) updates.contactNumber = payload.contactNumber;
  if (payload.joiningDate !== undefined) updates.joiningDate = payload.joiningDate;
  if (payload.status !== undefined) updates.status = payload.status;

  if (payload.name !== undefined) {
    const split = splitFullName(payload.name);
    updates.firstName = payload.firstName || split.firstName;
    updates.lastName = payload.lastName || split.lastName;
  } else {
    if (payload.firstName !== undefined) updates.firstName = payload.firstName;
    if (payload.lastName !== undefined) updates.lastName = payload.lastName;
  }

  await Faculty.updateOne({ _id: id }, { $set: updates });

  const userUpdates = {};
  if (updates.firstName !== undefined || updates.lastName !== undefined) {
    const fn = updates.firstName ?? existing.firstName;
    const ln = updates.lastName ?? existing.lastName;
    userUpdates.name = `${fn} ${ln}`.trim();
  }
  if (payload.status !== undefined) {
    const shouldActivate = payload.status === 'ACTIVE';
    userUpdates.isActive = shouldActivate;
    if (!shouldActivate) {
      await User.updateOne({ _id: existing.user }, { $set: userUpdates, $inc: { tokenVersion: 1 } });
      return getFacultyById(id);
    }
  }

  if (Object.keys(userUpdates).length > 0) {
    await User.updateOne({ _id: existing.user }, { $set: userUpdates });
  }

  return getFacultyById(id);
};

export const updateFacultyStatus = async (id, status) => {
  const existing = await Faculty.findById(id);
  if (!existing) {
    throw ApiError.notFound('Faculty profile not found');
  }

  await Faculty.updateOne({ _id: id }, { $set: { status } });

  const isActive = status === 'ACTIVE';
  const userUpdate = isActive
    ? { $set: { isActive: true } }
    : { $set: { isActive: false }, $inc: { tokenVersion: 1 } };

  await User.updateOne({ _id: existing.user }, userUpdate);

  return getFacultyById(id);
};

export const deleteFaculty = async (id) => {
  const existing = await Faculty.findById(id).lean();
  if (!existing) {
    throw ApiError.notFound('Faculty profile not found');
  }

  const [assignCount, attCount, resCount, hodCount] = await Promise.all([
    FacultyAssignment.countDocuments({ faculty: id }),
    Attendance.countDocuments({ markedBy: id }),
    Result.countDocuments({ evaluatedBy: id }),
    Department.countDocuments({ headOfDepartment: id })
  ]);

  if (assignCount + attCount + resCount + hodCount > 0) {
    throw ApiError.conflict(
      'Cannot delete faculty with existing teaching assignments, HOD status, attendance logs, or evaluations. Please deactivate instead.'
    );
  }

  await Faculty.deleteOne({ _id: id });
  await User.deleteOne({ _id: existing.user });
  return { deletedId: id };
};
