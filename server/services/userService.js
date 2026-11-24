import { User, Student, Faculty, Department, Course, Semester } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { runWithTransactionOrCompensation } from '../utils/dbTransaction.js';
import {
  escapeRegex,
  splitFullName,
  buildPagination,
  formatPaginationMeta,
  buildSortSpec
} from '../utils/queryHelpers.js';

const USER_SORT_FIELDS = {
  name: 'name',
  email: 'email',
  role: 'role',
  isActive: 'isActive',
  createdAt: 'createdAt',
  lastLogin: 'lastLogin'
};

/**
 * Attaches linked Student or Faculty metadata to a list of sanitized User objects.
 */
const enrichUsersWithProfiles = async (users) => {
  if (!users.length) return [];

  const userIds = users.map((u) => u._id);
  const [students, faculties] = await Promise.all([
    Student.find({ user: { $in: userIds } })
      .select('user enrollmentNumber rollNumber firstName lastName status department currentSemester')
      .populate('department', 'code name')
      .lean(),
    Faculty.find({ user: { $in: userIds } })
      .select('user employeeId firstName lastName designation status department')
      .populate('department', 'code name')
      .lean()
  ]);

  const studentByUser = new Map(students.map((s) => [s.user.toString(), s]));
  const facultyByUser = new Map(faculties.map((f) => [f.user.toString(), f]));

  return users.map((u) => {
    const uid = u._id.toString();
    const stu = studentByUser.get(uid);
    const fac = facultyByUser.get(uid);

    let linkedProfile = null;
    if (stu) {
      linkedProfile = {
        type: 'student',
        profileId: stu._id.toString(),
        identifier: stu.enrollmentNumber,
        rollNumber: stu.rollNumber,
        department: stu.department || null,
        status: stu.status
      };
    } else if (fac) {
      linkedProfile = {
        type: 'faculty',
        profileId: fac._id.toString(),
        identifier: fac.employeeId,
        designation: fac.designation,
        department: fac.department || null,
        status: fac.status
      };
    }

    const displayName =
      u.name ||
      (stu ? `${stu.firstName} ${stu.lastName}`.trim() : fac ? `${fac.firstName} ${fac.lastName}`.trim() : u.email.split('@')[0]);

    return {
      id: uid,
      _id: uid,
      name: displayName,
      email: u.email,
      role: (u.role || 'student').toLowerCase(),
      isActive: u.isActive,
      lastLogin: u.lastLogin || null,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      linkedProfile
    };
  });
};

export const listUsers = async (queryParams) => {
  const { page, limit, skip } = buildPagination(queryParams.page, queryParams.limit);
  const filter = {};

  if (queryParams.role) {
    filter.role = queryParams.role.toLowerCase();
  }
  if (queryParams.status === 'active') {
    filter.isActive = true;
  } else if (queryParams.status === 'inactive') {
    filter.isActive = false;
  }

  if (queryParams.search) {
    const rx = new RegExp(escapeRegex(queryParams.search), 'i');
    const [matchingStudents, matchingFaculty] = await Promise.all([
      Student.find({ $or: [{ enrollmentNumber: rx }, { rollNumber: rx }, { firstName: rx }, { lastName: rx }] })
        .select('user')
        .lean(),
      Faculty.find({ $or: [{ employeeId: rx }, { firstName: rx }, { lastName: rx }] })
        .select('user')
        .lean()
    ]);
    const linkedUserIds = [
      ...matchingStudents.map((s) => s.user),
      ...matchingFaculty.map((f) => f.user)
    ];

    filter.$or = [
      { name: rx },
      { email: rx },
      ...(linkedUserIds.length > 0 ? [{ _id: { $in: linkedUserIds } }] : [])
    ];
  }

  const sort = buildSortSpec(queryParams.sortBy, queryParams.sortOrder, USER_SORT_FIELDS, { createdAt: -1 });

  const [totalRecords, rawUsers] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter).sort(sort).skip(skip).limit(limit).lean()
  ]);

  const users = await enrichUsersWithProfiles(rawUsers);

  return {
    users,
    meta: formatPaginationMeta(page, limit, totalRecords)
  };
};

export const getUserById = async (id) => {
  const user = await User.findById(id).lean();
  if (!user) {
    throw ApiError.notFound('User account not found');
  }

  const [enriched] = await enrichUsersWithProfiles([user]);
  let profileDetails = null;
  if (enriched.linkedProfile?.type === 'student') {
    profileDetails = await Student.findById(enriched.linkedProfile.profileId)
      .populate('department', 'code name')
      .populate('course', 'code name')
      .populate('semester', 'semesterNumber academicYear')
      .lean();
  } else if (enriched.linkedProfile?.type === 'faculty') {
    profileDetails = await Faculty.findById(enriched.linkedProfile.profileId)
      .populate('department', 'code name')
      .lean();
  }

  return {
    ...enriched,
    profileDetails
  };
};

export const createUser = async (payload) => {
  const normalizedEmail = payload.email.trim().toLowerCase();
  const role = payload.role.toLowerCase();

  const existingEmail = await User.findOne({ email: normalizedEmail }).lean();
  if (existingEmail) {
    throw ApiError.conflict(`A user with email '${normalizedEmail}' already exists`);
  }

  // Validate linked references before starting transaction/creation
  let deptDoc = null;
  let courseDoc = null;
  let semesterDoc = null;

  if (role === 'student') {
    const sp = payload.studentProfile;
    const dupEnrollment = await Student.findOne({
      $or: [
        { enrollmentNumber: sp.enrollmentNumber.toUpperCase() },
        ...(sp.rollNumber ? [{ rollNumber: sp.rollNumber.toUpperCase() }] : [])
      ]
    }).lean();
    if (dupEnrollment) {
      throw ApiError.conflict('Enrollment number or roll number already exists');
    }

    deptDoc = await Department.findById(sp.department).lean();
    if (!deptDoc || deptDoc.isActive === false) {
      throw ApiError.badRequest('Selected department does not exist or is inactive');
    }
    courseDoc = await Course.findById(sp.course).lean();
    if (!courseDoc || courseDoc.isActive === false || courseDoc.department.toString() !== deptDoc._id.toString()) {
      throw ApiError.badRequest('Selected course is invalid or does not belong to the chosen department');
    }
    semesterDoc = await Semester.findById(sp.semester).lean();
    if (!semesterDoc || semesterDoc.course.toString() !== courseDoc._id.toString()) {
      throw ApiError.badRequest('Selected semester does not belong to the chosen course');
    }
  } else if (role === 'faculty') {
    const fp = payload.facultyProfile;
    const dupEmp = await Faculty.findOne({ employeeId: fp.employeeId.toUpperCase() }).lean();
    if (dupEmp) {
      throw ApiError.conflict(`Employee ID '${fp.employeeId.toUpperCase()}' already exists`);
    }
    deptDoc = await Department.findById(fp.department).lean();
    if (!deptDoc || deptDoc.isActive === false) {
      throw ApiError.badRequest('Selected department does not exist or is inactive');
    }
  }

  let createdUserId = null;

  const { result } = await runWithTransactionOrCompensation(
    async (session) => {
      const sessionOpts = session ? { session } : {};
      const [createdUser] = await User.create(
        [
          {
            name: payload.name,
            email: normalizedEmail,
            password: payload.password,
            role,
            isActive: payload.isActive
          }
        ],
        sessionOpts
      );
      createdUserId = createdUser._id;

      const { firstName, lastName } = splitFullName(payload.name);

      if (role === 'student') {
        const sp = payload.studentProfile;
        await Student.create(
          [
            {
              user: createdUser._id,
              enrollmentNumber: sp.enrollmentNumber.toUpperCase(),
              rollNumber: (sp.rollNumber || sp.enrollmentNumber).toUpperCase(),
              firstName,
              lastName,
              dateOfBirth: sp.dateOfBirth,
              gender: sp.gender,
              department: deptDoc._id,
              course: courseDoc._id,
              semester: semesterDoc._id,
              currentSemester: semesterDoc.semesterNumber,
              admissionYear: sp.admissionYear || new Date().getFullYear(),
              academicYear: semesterDoc.academicYear,
              contactNumber: sp.contactNumber,
              address: sp.address,
              status: payload.isActive ? 'ACTIVE' : 'INACTIVE'
            }
          ],
          sessionOpts
        );
      } else if (role === 'faculty') {
        const fp = payload.facultyProfile;
        await Faculty.create(
          [
            {
              user: createdUser._id,
              employeeId: fp.employeeId.toUpperCase(),
              firstName,
              lastName,
              department: deptDoc._id,
              designation: fp.designation,
              specialization: fp.specialization,
              qualification: fp.qualification || fp.specialization,
              contactNumber: fp.contactNumber,
              joiningDate: fp.joiningDate || new Date(),
              status: payload.isActive ? 'ACTIVE' : 'INACTIVE'
            }
          ],
          sessionOpts
        );
      }

      return createdUser;
    },
    async () => {
      if (createdUserId) {
        await User.deleteOne({ _id: createdUserId });
      }
    }
  );

  return getUserById(result._id);
};

/**
 * Ensures we never deactivate or demote self or the final active admin account.
 */
const assertAdminSafetyGuards = async ({ targetUser, actorId, nextRole, nextIsActive }) => {
  const targetId = targetUser._id.toString();
  const isTargetAdmin = targetUser.role === 'admin';

  if (actorId && actorId.toString() === targetId) {
    if (nextIsActive === false) {
      throw ApiError.badRequest('Administrators cannot deactivate their own active account');
    }
    if (nextRole && nextRole !== 'admin') {
      throw ApiError.badRequest('Administrators cannot demote their own role');
    }
  }

  const disablingLastAdmin = isTargetAdmin && targetUser.isActive && nextIsActive === false;
  const demotingLastAdmin = isTargetAdmin && targetUser.isActive && nextRole && nextRole !== 'admin';

  if (disablingLastAdmin || demotingLastAdmin) {
    const activeAdminCount = await User.countDocuments({ role: 'admin', isActive: true });
    if (activeAdminCount <= 1) {
      throw ApiError.conflict('Cannot deactivate or demote the last active administrator account');
    }
  }
};

export const updateUser = async (id, payload, actorId) => {
  const targetUser = await User.findById(id);
  if (!targetUser) {
    throw ApiError.notFound('User account not found');
  }

  const nextRole = payload.role ? payload.role.toLowerCase() : undefined;
  const nextIsActive = typeof payload.isActive === 'boolean' ? payload.isActive : undefined;

  await assertAdminSafetyGuards({ targetUser, actorId, nextRole, nextIsActive });

  if (payload.email && payload.email !== targetUser.email) {
    const dup = await User.findOne({ email: payload.email, _id: { $ne: id } }).lean();
    if (dup) {
      throw ApiError.conflict(`Email '${payload.email}' is already registered to another user`);
    }
  }

  // Enforce linked Student / Faculty role consistency
  if (nextRole && nextRole !== targetUser.role) {
    const [linkedStudent, linkedFaculty] = await Promise.all([
      Student.findOne({ user: targetUser._id }).lean(),
      Faculty.findOne({ user: targetUser._id }).lean()
    ]);

    if (linkedStudent || linkedFaculty) {
      throw ApiError.conflict(
        'Cannot change role of a user linked to an existing Student or Faculty profile'
      );
    }
    if (nextRole === 'student' || nextRole === 'faculty') {
      throw ApiError.conflict(
        `Cannot switch user role to '${nextRole}' without creating a linked ${nextRole} profile`
      );
    }
  }

  const updates = {};
  let invalidateSession = false;

  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.email !== undefined && payload.email !== targetUser.email) {
    updates.email = payload.email;
    invalidateSession = true;
  }
  if (nextRole !== undefined && nextRole !== targetUser.role) {
    updates.role = nextRole;
    invalidateSession = true;
  }
  if (nextIsActive !== undefined && nextIsActive !== targetUser.isActive) {
    updates.isActive = nextIsActive;
    if (!nextIsActive) invalidateSession = true;
  }

  if (invalidateSession) {
    updates.tokenVersion = (targetUser.tokenVersion || 0) + 1;
  }

  await User.updateOne({ _id: id }, { $set: updates });

  // Sync name to linked Student / Faculty profile if updated
  if (payload.name !== undefined) {
    const { firstName, lastName } = splitFullName(payload.name);
    if (targetUser.role === 'student') {
      await Student.updateOne({ user: id }, { $set: { firstName, lastName } });
    } else if (targetUser.role === 'faculty') {
      await Faculty.updateOne({ user: id }, { $set: { firstName, lastName } });
    }
  }

  return getUserById(id);
};

export const updateUserStatus = async (id, isActive, actorId) => {
  const targetUser = await User.findById(id);
  if (!targetUser) {
    throw ApiError.notFound('User account not found');
  }

  await assertAdminSafetyGuards({ targetUser, actorId, nextIsActive: isActive });

  const updates = { isActive };
  if (!isActive) {
    updates.tokenVersion = (targetUser.tokenVersion || 0) + 1;
  }

  await User.updateOne({ _id: id }, { $set: updates });

  // Sync linked profile status when user status toggles between active/inactive
  if (targetUser.role === 'student') {
    await Student.updateOne(
      { user: id },
      { $set: { status: isActive ? 'ACTIVE' : 'INACTIVE' } }
    );
  } else if (targetUser.role === 'faculty') {
    await Faculty.updateOne(
      { user: id },
      { $set: { status: isActive ? 'ACTIVE' : 'INACTIVE' } }
    );
  }

  return getUserById(id);
};
