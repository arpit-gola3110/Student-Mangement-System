import FacultyAssignment from '../models/FacultyAssignment.js';
import Faculty from '../models/Faculty.js';
import Course from '../models/Course.js';
import Semester from '../models/Semester.js';
import Subject from '../models/Subject.js';
import Enrollment from '../models/Enrollment.js';
import Attendance from '../models/Attendance.js';
import Result from '../models/Result.js';
import ApiError from '../utils/ApiError.js';
import {
  escapeRegex,
  buildPagination,
  formatPaginationMeta,
  buildSortSpec
} from '../utils/queryHelpers.js';

const ASSIGNMENT_SORT_MAP = {
  assignmentDate: 'assignmentDate',
  academicYear: 'academicYear',
  status: 'status',
  section: 'section',
  createdAt: 'createdAt'
};

const populateAssignmentQuery = (query) =>
  query
    .populate({
      path: 'faculty',
      select: 'employeeId firstName lastName designation status department',
      populate: [
        { path: 'user', select: 'name email isActive' },
        { path: 'department', select: 'code name' }
      ]
    })
    .populate({
      path: 'course',
      select: 'code name department isActive',
      populate: { path: 'department', select: 'code name isActive' }
    })
    .populate({
      path: 'semester',
      select: 'semesterNumber academicYear status isActive course'
    })
    .populate({
      path: 'subject',
      select: 'code name credits type course semester isActive'
    })
    .populate({ path: 'assignedBy', select: 'name email' })
    .populate({ path: 'updatedBy', select: 'name email' });

const enrichWithEnrolledCounts = async (assignments = []) => {
  if (!assignments.length) return [];

  const matchOr = assignments.map((a) => ({
    subject: a.subject?._id || a.subject,
    semester: a.semester?._id || a.semester,
    academicYear: a.academicYear,
    section: a.section || 'A',
    status: 'ACTIVE'
  }));

  const counts = await Enrollment.aggregate([
    { $match: { $or: matchOr } },
    {
      $group: {
        _id: {
          subject: '$subject',
          semester: '$semester',
          academicYear: '$academicYear',
          section: '$section'
        },
        count: { $sum: 1 }
      }
    }
  ]);

  const countMap = new Map(
    counts.map((c) => [
      `${c._id.subject}|${c._id.semester}|${c._id.academicYear}|${c._id.section}`,
      c.count
    ])
  );

  return assignments.map((a) => {
    const key = `${a.subject?._id || a.subject}|${a.semester?._id || a.semester}|${a.academicYear}|${a.section || 'A'}`;
    return {
      ...a,
      enrolledStudentCount: countMap.get(key) || 0
    };
  });
};

export const listAssignments = async (query = {}, user) => {
  const { page, limit, skip } = buildPagination(query.page, query.limit, 100);
  const sortSpec = buildSortSpec(query.sortBy, query.sortOrder, ASSIGNMENT_SORT_MAP, { createdAt: -1 });
  const andConditions = [];

  if (user.role === 'faculty') {
    if (!user.profileId) {
      throw ApiError.forbidden('Faculty profile is not linked to this account');
    }
    if (query.faculty && String(query.faculty) !== String(user.profileId)) {
      throw ApiError.forbidden('Faculty members cannot inspect another faculty member assignments');
    }
    andConditions.push({ faculty: user.profileId });
  } else if (query.faculty) {
    andConditions.push({ faculty: query.faculty });
  }

  if (query.course) andConditions.push({ course: query.course });
  if (query.semester) andConditions.push({ semester: query.semester });
  if (query.subject) andConditions.push({ subject: query.subject });
  if (query.academicYear) andConditions.push({ academicYear: query.academicYear });
  if (query.status) andConditions.push({ status: String(query.status).toUpperCase() });

  if (query.department) {
    const courseIds = await Course.find({ department: query.department }).distinct('_id');
    andConditions.push({ course: { $in: courseIds } });
  }

  if (query.search) {
    const safeRegex = new RegExp(escapeRegex(query.search), 'i');
    const [matchingFaculty, matchingSubjects, matchingCourses] = await Promise.all([
      Faculty.find({
        $or: [
          { employeeId: safeRegex },
          { firstName: safeRegex },
          { lastName: safeRegex }
        ]
      }).distinct('_id'),
      Subject.find({ $or: [{ code: safeRegex }, { name: safeRegex }] }).distinct('_id'),
      Course.find({ $or: [{ code: safeRegex }, { name: safeRegex }] }).distinct('_id')
    ]);

    andConditions.push({
      $or: [
        { faculty: { $in: matchingFaculty } },
        { subject: { $in: matchingSubjects } },
        { course: { $in: matchingCourses } },
        { academicYear: safeRegex },
        { section: safeRegex }
      ]
    });
  }

  const filter = andConditions.length > 0 ? { $and: andConditions } : {};

  const [rawAssignments, totalRecords] = await Promise.all([
    populateAssignmentQuery(FacultyAssignment.find(filter).sort(sortSpec).skip(skip).limit(limit)).lean(),
    FacultyAssignment.countDocuments(filter)
  ]);

  const assignments = await enrichWithEnrolledCounts(rawAssignments);

  return {
    assignments,
    ...formatPaginationMeta(page, limit, totalRecords)
  };
};

export const getMyAssignments = async (user, query = {}) => {
  if (user.role !== 'faculty') {
    throw ApiError.forbidden('Only faculty members can access personal teaching assignments here');
  }
  if (!user.profileId) {
    throw ApiError.notFound('Faculty profile not found for this account');
  }

  const faculty = await Faculty.findById(user.profileId)
    .populate('department', 'code name')
    .lean();

  if (!faculty) {
    throw ApiError.notFound('Faculty profile record not found');
  }

  const { page, limit, skip } = buildPagination(query.page, query.limit, 100);
  const sortSpec = buildSortSpec(query.sortBy, query.sortOrder, ASSIGNMENT_SORT_MAP, { createdAt: -1 });
  const filter = { faculty: faculty._id };

  if (query.status) filter.status = String(query.status).toUpperCase();
  if (query.semester) filter.semester = query.semester;
  if (query.academicYear) filter.academicYear = query.academicYear;

  if (query.search) {
    const safeRegex = new RegExp(escapeRegex(query.search), 'i');
    const [matchingSubjects, matchingCourses] = await Promise.all([
      Subject.find({ $or: [{ code: safeRegex }, { name: safeRegex }] }).distinct('_id'),
      Course.find({ $or: [{ code: safeRegex }, { name: safeRegex }] }).distinct('_id')
    ]);
    filter.$or = [
      { subject: { $in: matchingSubjects } },
      { course: { $in: matchingCourses } },
      { academicYear: safeRegex },
      { section: safeRegex }
    ];
  }

  const [rawAssignments, totalRecords, activeAssignmentsRaw] = await Promise.all([
    populateAssignmentQuery(FacultyAssignment.find(filter).sort(sortSpec).skip(skip).limit(limit)).lean(),
    FacultyAssignment.countDocuments(filter),
    FacultyAssignment.find({ faculty: faculty._id, status: 'ACTIVE' })
      .select('subject semester academicYear section')
      .lean()
  ]);

  const assignments = await enrichWithEnrolledCounts(rawAssignments);
  const activeWithCounts = await enrichWithEnrolledCounts(activeAssignmentsRaw);
  const totalEnrolledStudents = activeWithCounts.reduce((acc, a) => acc + (a.enrolledStudentCount || 0), 0);

  return {
    faculty,
    assignments,
    summary: {
      activeCount: activeAssignmentsRaw.length,
      totalAssignments: totalRecords,
      totalEnrolledStudents
    },
    ...formatPaginationMeta(page, limit, totalRecords)
  };
};

export const getAssignmentById = async (id, user) => {
  const assignment = await populateAssignmentQuery(FacultyAssignment.findById(id)).lean();
  if (!assignment) {
    throw ApiError.notFound('Faculty assignment record not found');
  }

  const ownerFacultyId = String(assignment.faculty?._id || assignment.faculty);
  if (user.role === 'faculty' && ownerFacultyId !== String(user.profileId)) {
    throw ApiError.forbidden('You do not have permission to view another faculty member assignment');
  }

  const [enriched] = await enrichWithEnrolledCounts([assignment]);
  return enriched;
};

export const createAssignment = async (payload, actorUserId) => {
  const [faculty, course, semester, subject] = await Promise.all([
    Faculty.findById(payload.faculty).populate('user', 'name email isActive'),
    Course.findById(payload.course).populate('department', 'code name isActive'),
    Semester.findById(payload.semester),
    Subject.findById(payload.subject)
  ]);

  if (!faculty) throw ApiError.notFound('Selected faculty member not found');
  if (faculty.status !== 'ACTIVE' || faculty.user?.isActive === false) {
    throw ApiError.badRequest(`Faculty member is not active (status: ${faculty.status})`);
  }

  if (!course) throw ApiError.notFound('Selected course not found');
  if (course.isActive === false) throw ApiError.badRequest('Cannot assign faculty to an inactive course');
  if (course.department && course.department.isActive === false) {
    throw ApiError.badRequest('Cannot assign faculty to a course in an inactive department');
  }

  if (!semester) throw ApiError.notFound('Selected semester not found');
  if (semester.isActive === false) throw ApiError.badRequest('Cannot assign faculty to an inactive semester');
  if (String(semester.course) !== String(course._id)) {
    throw ApiError.badRequest('Selected semester does not belong to the chosen course');
  }
  if (semester.academicYear !== payload.academicYear) {
    throw ApiError.badRequest(
      `Academic year mismatch: selected semester belongs to academic year ${semester.academicYear}`
    );
  }

  if (!subject) throw ApiError.notFound('Selected subject not found');
  if (subject.isActive === false) throw ApiError.badRequest('Cannot assign faculty to an inactive subject');
  if (String(subject.course) !== String(course._id)) {
    throw ApiError.badRequest('Selected subject does not belong to the chosen course');
  }
  if (String(subject.semester) !== String(semester._id)) {
    throw ApiError.badRequest('Selected subject does not belong to the chosen semester');
  }

  const section = payload.section || 'A';
  const duplicate = await FacultyAssignment.findOne({
    faculty: faculty._id,
    subject: subject._id,
    semester: semester._id,
    section,
    academicYear: payload.academicYear,
    status: 'ACTIVE'
  }).lean();

  if (duplicate) {
    throw ApiError.conflict(
      'An active assignment already exists for this faculty, subject, semester, section, and academic year'
    );
  }

  let created;
  try {
    created = await FacultyAssignment.create({
      faculty: faculty._id,
      course: course._id,
      semester: semester._id,
      subject: subject._id,
      section,
      academicYear: payload.academicYear,
      assignmentDate: payload.assignmentDate || new Date(),
      status: 'ACTIVE',
      assignedBy: actorUserId,
      updatedBy: actorUserId,
      statusUpdatedAt: new Date()
    });
  } catch (err) {
    if (err?.code === 11000) {
      throw ApiError.conflict('Duplicate active faculty assignment exists');
    }
    throw err;
  }

  const populated = await populateAssignmentQuery(FacultyAssignment.findById(created._id)).lean();
  const [enriched] = await enrichWithEnrolledCounts([populated]);
  return enriched;
};

const validateAssignmentStatusTransition = async (existing, nextStatus) => {
  if (!nextStatus || existing.status === nextStatus) return;

  if (existing.status === 'COMPLETED' && nextStatus !== 'COMPLETED') {
    throw ApiError.badRequest('Completed faculty assignment status cannot be reverted or modified');
  }

  if (nextStatus === 'ACTIVE') {
    const [faculty, course, semester, subject, activeDuplicate] = await Promise.all([
      Faculty.findById(existing.faculty).populate('user', 'isActive'),
      Course.findById(existing.course),
      Semester.findById(existing.semester),
      Subject.findById(existing.subject),
      FacultyAssignment.findOne({
        _id: { $ne: existing._id },
        faculty: existing.faculty,
        subject: existing.subject,
        semester: existing.semester,
        section: existing.section,
        academicYear: existing.academicYear,
        status: 'ACTIVE'
      })
    ]);

    if (!faculty || faculty.status !== 'ACTIVE' || faculty.user?.isActive === false) {
      throw ApiError.badRequest('Cannot reactivate assignment because faculty member is not active');
    }
    if ((course && course.isActive === false) || !semester || semester.isActive === false || !subject || subject.isActive === false) {
      throw ApiError.badRequest('Cannot reactivate assignment because linked academic records are inactive');
    }
    if (activeDuplicate) {
      throw ApiError.conflict('Another active assignment already exists for this faculty, subject, semester, section, and academic year');
    }
  }
};

export const updateAssignment = async (id, payload, actorUserId) => {
  const existing = await FacultyAssignment.findById(id);
  if (!existing) {
    throw ApiError.notFound('Faculty assignment record not found');
  }

  if (payload.faculty && String(payload.faculty) !== String(existing.faculty)) {
    const newFaculty = await Faculty.findById(payload.faculty).populate('user', 'isActive');
    if (!newFaculty) throw ApiError.notFound('Replacement faculty member not found');
    if (newFaculty.status !== 'ACTIVE' || newFaculty.user?.isActive === false) {
      throw ApiError.badRequest('Replacement faculty member must be active');
    }

    const [hasAttendance, hasResult] = await Promise.all([
      Attendance.exists({
        subject: existing.subject,
        semester: existing.semester,
        markedBy: existing.faculty
      }),
      Result.exists({
        subject: existing.subject,
        evaluatedBy: existing.faculty
      })
    ]);

    if (hasAttendance || hasResult) {
      throw ApiError.conflict(
        'Cannot reassign faculty after attendance or result records were submitted by the current faculty. Revoke this assignment and create a new one.'
      );
    }
  }

  const targetFaculty = payload.faculty || existing.faculty;
  const targetSection = payload.section || existing.section;
  const targetAcademicYear = payload.academicYear || existing.academicYear;
  const targetStatus = payload.status || existing.status;

  if (targetStatus === 'ACTIVE') {
    const duplicate = await FacultyAssignment.findOne({
      _id: { $ne: existing._id },
      faculty: targetFaculty,
      subject: existing.subject,
      semester: existing.semester,
      section: targetSection,
      academicYear: targetAcademicYear,
      status: 'ACTIVE'
    });
    if (duplicate) {
      throw ApiError.conflict('Conflicting active faculty assignment already exists');
    }
  }

  await validateAssignmentStatusTransition(existing, targetStatus);

  if (payload.faculty !== undefined) existing.faculty = payload.faculty;
  if (payload.section !== undefined) existing.section = payload.section;
  if (payload.academicYear !== undefined) existing.academicYear = payload.academicYear;
  if (payload.assignmentDate !== undefined) existing.assignmentDate = payload.assignmentDate;
  if (payload.status !== undefined && payload.status !== existing.status) {
    existing.status = payload.status;
    existing.statusUpdatedAt = new Date();
  }
  existing.updatedBy = actorUserId;

  try {
    await existing.save();
  } catch (err) {
    if (err?.code === 11000) {
      throw ApiError.conflict('Conflicting active faculty assignment already exists');
    }
    throw err;
  }

  const populated = await populateAssignmentQuery(FacultyAssignment.findById(existing._id)).lean();
  const [enriched] = await enrichWithEnrolledCounts([populated]);
  return enriched;
};

export const updateAssignmentStatus = async (id, status, actorUserId) => {
  const existing = await FacultyAssignment.findById(id);
  if (!existing) {
    throw ApiError.notFound('Faculty assignment record not found');
  }

  await validateAssignmentStatusTransition(existing, status);

  existing.status = status;
  existing.statusUpdatedAt = new Date();
  existing.updatedBy = actorUserId;
  await existing.save();

  const populated = await populateAssignmentQuery(FacultyAssignment.findById(existing._id)).lean();
  const [enriched] = await enrichWithEnrolledCounts([populated]);
  return enriched;
};

export const deleteAssignment = async (id) => {
  const existing = await FacultyAssignment.findById(id);
  if (!existing) {
    throw ApiError.notFound('Faculty assignment record not found');
  }

  const [hasAttendance, hasResult] = await Promise.all([
    Attendance.exists({
      subject: existing.subject,
      semester: existing.semester,
      markedBy: existing.faculty
    }),
    Result.exists({
      subject: existing.subject,
      evaluatedBy: existing.faculty
    })
  ]);

  if (hasAttendance || hasResult) {
    throw ApiError.conflict(
      'Cannot delete faculty assignment because dependent attendance or result records exist. Change status to REVOKED or COMPLETED instead.'
    );
  }

  await FacultyAssignment.deleteOne({ _id: existing._id });
  return { deletedId: String(existing._id) };
};
