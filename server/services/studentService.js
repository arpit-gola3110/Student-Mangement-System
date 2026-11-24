import {
  User,
  Student,
  Department,
  Course,
  Semester,
  Enrollment,
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

const STUDENT_SORT_FIELDS = {
  enrollmentNumber: 'enrollmentNumber',
  rollNumber: 'rollNumber',
  firstName: 'firstName',
  currentSemester: 'currentSemester',
  admissionYear: 'admissionYear',
  status: 'status',
  createdAt: 'createdAt'
};

/**
 * Validates Department -> Course -> Semester referential hierarchy.
 */
export const validateAcademicHierarchy = async ({ departmentId, courseId, semesterId }) => {
  const dept = await Department.findById(departmentId).lean();
  if (!dept || dept.isActive === false) {
    throw ApiError.badRequest('Selected department does not exist or is inactive');
  }

  const course = await Course.findById(courseId).lean();
  if (!course || course.isActive === false) {
    throw ApiError.badRequest('Selected course does not exist or is inactive');
  }
  if (course.department.toString() !== dept._id.toString()) {
    throw ApiError.badRequest('Selected course does not belong to the selected department');
  }

  const semester = await Semester.findById(semesterId).lean();
  if (!semester) {
    throw ApiError.badRequest('Selected semester does not exist');
  }
  if (semester.course.toString() !== course._id.toString()) {
    throw ApiError.badRequest('Selected semester does not belong to the selected course');
  }

  return { dept, course, semester };
};

export const listStudents = async (queryParams) => {
  const { page, limit, skip } = buildPagination(queryParams.page, queryParams.limit);
  const filter = {};

  if (queryParams.department) filter.department = queryParams.department;
  if (queryParams.course) filter.course = queryParams.course;
  if (queryParams.semester) filter.semester = queryParams.semester;
  if (queryParams.academicYear) filter.academicYear = queryParams.academicYear;
  if (queryParams.status) filter.status = queryParams.status.toUpperCase();

  if (queryParams.search) {
    const rx = new RegExp(escapeRegex(queryParams.search), 'i');
    const matchingUsers = await User.find({
      role: 'student',
      $or: [{ email: rx }, { name: rx }]
    })
      .select('_id')
      .lean();
    const matchedUserIds = matchingUsers.map((u) => u._id);

    filter.$or = [
      { enrollmentNumber: rx },
      { rollNumber: rx },
      { firstName: rx },
      { lastName: rx },
      ...(matchedUserIds.length > 0 ? [{ user: { $in: matchedUserIds } }] : [])
    ];
  }

  const sort = buildSortSpec(queryParams.sortBy, queryParams.sortOrder, STUDENT_SORT_FIELDS, { createdAt: -1 });

  const [totalRecords, students] = await Promise.all([
    Student.countDocuments(filter),
    Student.find(filter)
      .populate('user', 'name email isActive lastLogin')
      .populate('department', 'code name')
      .populate('course', 'code name')
      .populate('semester', 'semesterNumber academicYear status')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true })
  ]);

  return {
    students,
    meta: formatPaginationMeta(page, limit, totalRecords)
  };
};

export const getStudentById = async (id) => {
  const student = await Student.findById(id)
    .populate('user', 'name email role isActive lastLogin createdAt updatedAt')
    .populate('department', 'code name')
    .populate('course', 'code name durationYears totalSemesters')
    .populate('semester', 'semesterNumber academicYear startDate endDate status')
    .lean({ virtuals: true });

  if (!student) {
    throw ApiError.notFound('Student record not found');
  }

  return student;
};

export const createStudent = async (payload) => {
  const normalizedEmail = payload.email.trim().toLowerCase();
  const enrollmentNumber = payload.enrollmentNumber.trim().toUpperCase();
  const rollNumber = (payload.rollNumber || enrollmentNumber).trim().toUpperCase();

  const [existingEmail, existingStudent] = await Promise.all([
    User.findOne({ email: normalizedEmail }).lean(),
    Student.findOne({ $or: [{ enrollmentNumber }, { rollNumber }] }).lean()
  ]);

  if (existingEmail) {
    throw ApiError.conflict(`Email '${normalizedEmail}' is already registered`);
  }
  if (existingStudent) {
    throw ApiError.conflict('Enrollment number or roll number already exists');
  }

  const { dept, course, semester } = await validateAcademicHierarchy({
    departmentId: payload.department,
    courseId: payload.course,
    semesterId: payload.semester
  });

  const derivedNames = payload.firstName
    ? {
        firstName: payload.firstName.trim(),
        lastName: (payload.lastName || '-').trim()
      }
    : splitFullName(payload.name);

  const fullName = payload.name?.trim() || `${derivedNames.firstName} ${derivedNames.lastName}`.trim();
  const isUserActive = payload.status === 'ACTIVE';

  let createdUserId = null;

  const { result: createdStudent } = await runWithTransactionOrCompensation(
    async (session) => {
      const opts = session ? { session } : {};
      const [createdUser] = await User.create(
        [
          {
            name: fullName,
            email: normalizedEmail,
            password: payload.password,
            role: 'student',
            isActive: isUserActive
          }
        ],
        opts
      );
      createdUserId = createdUser._id;

      const [studentDoc] = await Student.create(
        [
          {
            user: createdUser._id,
            enrollmentNumber,
            rollNumber,
            firstName: derivedNames.firstName,
            lastName: derivedNames.lastName,
            dateOfBirth: payload.dateOfBirth,
            gender: payload.gender,
            contactNumber: payload.contactNumber,
            address: payload.address,
            department: dept._id,
            course: course._id,
            semester: semester._id,
            currentSemester: semester.semesterNumber,
            admissionYear: payload.admissionYear,
            academicYear: payload.academicYear || semester.academicYear,
            status: payload.status
          }
        ],
        opts
      );

      return studentDoc;
    },
    async () => {
      if (createdUserId) {
        await User.deleteOne({ _id: createdUserId });
      }
    }
  );

  return getStudentById(createdStudent._id);
};

export const updateStudent = async (id, payload) => {
  const existing = await Student.findById(id);
  if (!existing) {
    throw ApiError.notFound('Student record not found');
  }

  // Uniqueness checks if enrollment or roll number changed
  const nextEnrollment = payload.enrollmentNumber ? payload.enrollmentNumber.trim().toUpperCase() : existing.enrollmentNumber;
  const nextRoll = payload.rollNumber ? payload.rollNumber.trim().toUpperCase() : existing.rollNumber;

  if (nextEnrollment !== existing.enrollmentNumber || nextRoll !== existing.rollNumber) {
    const dup = await Student.findOne({
      _id: { $ne: id },
      $or: [{ enrollmentNumber: nextEnrollment }, { rollNumber: nextRoll }]
    }).lean();
    if (dup) {
      throw ApiError.conflict('Enrollment number or roll number is already assigned to another student');
    }
  }

  // Validate academic hierarchy if any academic field changes
  const nextDeptId = payload.department || existing.department?.toString();
  const nextCourseId = payload.course || existing.course?.toString();
  const nextSemesterId = payload.semester || existing.semester?.toString();

  let syncedSemester = null;
  if (payload.department || payload.course || payload.semester) {
    if (!nextDeptId || !nextCourseId || !nextSemesterId) {
      throw ApiError.badRequest('Department, course, and semester must all be specified when updating academic program');
    }

    // Check historical academic dependency before permitting a course switch
    if (payload.course && existing.course && payload.course !== existing.course.toString()) {
      const [attCount, resCount, enrCount] = await Promise.all([
        Attendance.countDocuments({ student: id }),
        Result.countDocuments({ student: id }),
        Enrollment.countDocuments({ student: id })
      ]);
      if (attCount + resCount + enrCount > 0) {
        throw ApiError.conflict(
          'Cannot change student course because historical attendance, enrollment, or result records exist'
        );
      }
    }

    const validated = await validateAcademicHierarchy({
      departmentId: nextDeptId,
      courseId: nextCourseId,
      semesterId: nextSemesterId
    });
    syncedSemester = validated.semester;
  }

  const updates = {};
  if (payload.enrollmentNumber !== undefined) updates.enrollmentNumber = nextEnrollment;
  if (payload.rollNumber !== undefined) updates.rollNumber = nextRoll;
  if (payload.dateOfBirth !== undefined) updates.dateOfBirth = payload.dateOfBirth;
  if (payload.gender !== undefined) updates.gender = payload.gender;
  if (payload.contactNumber !== undefined) updates.contactNumber = payload.contactNumber;
  if (payload.address !== undefined) updates.address = payload.address;
  if (payload.admissionYear !== undefined) updates.admissionYear = payload.admissionYear;
  if (payload.department !== undefined) updates.department = payload.department;
  if (payload.course !== undefined) updates.course = payload.course;
  if (payload.semester !== undefined) updates.semester = payload.semester;
  if (syncedSemester) {
    updates.currentSemester = syncedSemester.semesterNumber;
    if (payload.academicYear === undefined) {
      updates.academicYear = syncedSemester.academicYear;
    }
  }
  if (payload.academicYear !== undefined) updates.academicYear = payload.academicYear;
  if (payload.status !== undefined) updates.status = payload.status;

  if (payload.name !== undefined) {
    const split = splitFullName(payload.name);
    updates.firstName = payload.firstName || split.firstName;
    updates.lastName = payload.lastName || split.lastName;
  } else {
    if (payload.firstName !== undefined) updates.firstName = payload.firstName;
    if (payload.lastName !== undefined) updates.lastName = payload.lastName;
  }

  await Student.updateOne({ _id: id }, { $set: updates });

  // Safely sync linked User display name & active state if updated
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
      return getStudentById(id);
    }
  }

  if (Object.keys(userUpdates).length > 0) {
    await User.updateOne({ _id: existing.user }, { $set: userUpdates });
  }

  return getStudentById(id);
};

export const updateStudentStatus = async (id, status) => {
  const existing = await Student.findById(id);
  if (!existing) {
    throw ApiError.notFound('Student record not found');
  }

  await Student.updateOne({ _id: id }, { $set: { status } });

  const isActive = status === 'ACTIVE';
  const userUpdate = isActive
    ? { $set: { isActive: true } }
    : { $set: { isActive: false }, $inc: { tokenVersion: 1 } };

  await User.updateOne({ _id: existing.user }, userUpdate);

  return getStudentById(id);
};

export const deleteStudent = async (id) => {
  const existing = await Student.findById(id).lean();
  if (!existing) {
    throw ApiError.notFound('Student record not found');
  }

  const [attCount, resCount, enrCount] = await Promise.all([
    Attendance.countDocuments({ student: id }),
    Result.countDocuments({ student: id }),
    Enrollment.countDocuments({ student: id })
  ]);

  if (attCount + resCount + enrCount > 0) {
    throw ApiError.conflict(
      'Cannot delete student with existing enrollment, attendance, or result records. Please deactivate the student instead.'
    );
  }

  await Student.deleteOne({ _id: id });
  await User.deleteOne({ _id: existing.user });
  return { deletedId: id };
};
