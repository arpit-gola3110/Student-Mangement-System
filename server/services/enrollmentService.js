import Enrollment from '../models/Enrollment.js';
import Student from '../models/Student.js';
import Course from '../models/Course.js';
import Semester from '../models/Semester.js';
import Subject from '../models/Subject.js';
import FacultyAssignment from '../models/FacultyAssignment.js';
import Attendance from '../models/Attendance.js';
import Result from '../models/Result.js';
import ApiError from '../utils/ApiError.js';
import {
  escapeRegex,
  buildPagination,
  formatPaginationMeta,
  buildSortSpec
} from '../utils/queryHelpers.js';

const ENROLLMENT_SORT_MAP = {
  enrollmentDate: 'enrollmentDate',
  academicYear: 'academicYear',
  status: 'status',
  section: 'section',
  createdAt: 'createdAt'
};

const populateEnrollmentQuery = (query) =>
  query
    .populate({
      path: 'student',
      select: 'rollNumber enrollmentNumber firstName lastName status department course semester',
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
    .populate({ path: 'createdBy', select: 'name email' })
    .populate({ path: 'updatedBy', select: 'name email' });

export const listEnrollments = async (query = {}, user) => {
  const { page, limit, skip } = buildPagination(query.page, query.limit, 100);
  const sortSpec = buildSortSpec(query.sortBy, query.sortOrder, ENROLLMENT_SORT_MAP, { createdAt: -1 });
  const andConditions = [];

  if (user.role === 'student') {
    if (!user.profileId) {
      throw ApiError.forbidden('Student profile is not linked to this account');
    }
    if (query.student && String(query.student) !== String(user.profileId)) {
      throw ApiError.forbidden('Students cannot inspect another student enrollment records');
    }
    andConditions.push({ student: user.profileId });
  } else if (user.role === 'faculty') {
    if (!user.profileId) {
      throw ApiError.forbidden('Faculty profile is not linked to this account');
    }
    const assignments = await FacultyAssignment.find({
      faculty: user.profileId,
      status: 'ACTIVE'
    })
      .select('subject semester academicYear')
      .lean();

    if (assignments.length === 0) {
      return {
        enrollments: [],
        ...formatPaginationMeta(page, limit, 0)
      };
    }

    andConditions.push({
      $or: assignments.map((a) => ({
        subject: a.subject,
        semester: a.semester,
        academicYear: a.academicYear
      }))
    });

    if (query.student) {
      andConditions.push({ student: query.student });
    }
  } else if (query.student) {
    andConditions.push({ student: query.student });
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
    const [matchingStudents, matchingSubjects, matchingCourses] = await Promise.all([
      Student.find({
        $or: [
          { rollNumber: safeRegex },
          { enrollmentNumber: safeRegex },
          { firstName: safeRegex },
          { lastName: safeRegex }
        ]
      }).distinct('_id'),
      Subject.find({ $or: [{ code: safeRegex }, { name: safeRegex }] }).distinct('_id'),
      Course.find({ $or: [{ code: safeRegex }, { name: safeRegex }] }).distinct('_id')
    ]);

    andConditions.push({
      $or: [
        { student: { $in: matchingStudents } },
        { subject: { $in: matchingSubjects } },
        { course: { $in: matchingCourses } },
        { academicYear: safeRegex },
        { section: safeRegex }
      ]
    });
  }

  const filter = andConditions.length > 0 ? { $and: andConditions } : {};

  const [enrollments, totalRecords] = await Promise.all([
    populateEnrollmentQuery(Enrollment.find(filter).sort(sortSpec).skip(skip).limit(limit)).lean(),
    Enrollment.countDocuments(filter)
  ]);

  return {
    enrollments,
    ...formatPaginationMeta(page, limit, totalRecords)
  };
};

export const getMyEnrollments = async (user, query = {}) => {
  if (user.role !== 'student') {
    throw ApiError.forbidden('Only students can access personal enrollment records here');
  }
  if (!user.profileId) {
    throw ApiError.notFound('Student profile not found for this account');
  }

  const student = await Student.findById(user.profileId)
    .populate('department', 'code name')
    .populate('course', 'code name')
    .populate('semester', 'semesterNumber academicYear')
    .lean();

  if (!student) {
    throw ApiError.notFound('Student profile record not found');
  }

  const { page, limit, skip } = buildPagination(query.page, query.limit, 100);
  const sortSpec = buildSortSpec(query.sortBy, query.sortOrder, ENROLLMENT_SORT_MAP, { createdAt: -1 });
  const filter = { student: student._id };

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

  const [enrollments, totalRecords, allStudentEnrollments] = await Promise.all([
    populateEnrollmentQuery(Enrollment.find(filter).sort(sortSpec).skip(skip).limit(limit)).lean(),
    Enrollment.countDocuments(filter),
    Enrollment.find({ student: student._id })
      .populate('subject', 'credits')
      .select('status subject')
      .lean()
  ]);

  const activeItems = allStudentEnrollments.filter((e) => e.status === 'ACTIVE');
  const completedCount = allStudentEnrollments.filter((e) => e.status === 'COMPLETED').length;
  const totalActiveCredits = activeItems.reduce((acc, item) => acc + (item.subject?.credits || 0), 0);

  return {
    student,
    enrollments,
    summary: {
      totalEnrollments: allStudentEnrollments.length,
      activeCount: activeItems.length,
      completedCount,
      totalActiveCredits
    },
    ...formatPaginationMeta(page, limit, totalRecords)
  };
};

export const getEnrollmentById = async (id, user) => {
  const enrollment = await populateEnrollmentQuery(Enrollment.findById(id)).lean();
  if (!enrollment) {
    throw ApiError.notFound('Enrollment record not found');
  }

  const ownerStudentId = String(enrollment.student?._id || enrollment.student);
  if (user.role === 'student' && ownerStudentId !== String(user.profileId)) {
    throw ApiError.forbidden('You do not have permission to view another student enrollment record');
  }

  if (user.role === 'faculty') {
    const hasAssignment = await FacultyAssignment.exists({
      faculty: user.profileId,
      subject: enrollment.subject?._id || enrollment.subject,
      semester: enrollment.semester?._id || enrollment.semester,
      academicYear: enrollment.academicYear,
      status: 'ACTIVE'
    });
    if (!hasAssignment) {
      throw ApiError.forbidden('You are not actively assigned to this subject enrollment');
    }
  }

  return enrollment;
};

export const createEnrollments = async (payload, actorUserId) => {
  const course = await Course.findById(payload.course).populate('department', 'code name isActive');
  if (!course) {
    throw ApiError.notFound('Selected course not found');
  }
  if (course.isActive === false) {
    throw ApiError.badRequest('Cannot enroll students in an inactive course');
  }
  if (course.department && course.department.isActive === false) {
    throw ApiError.badRequest('Cannot enroll students in a course belonging to an inactive department');
  }

  const semester = await Semester.findById(payload.semester);
  if (!semester) {
    throw ApiError.notFound('Selected semester not found');
  }
  if (semester.isActive === false) {
    throw ApiError.badRequest('Cannot enroll students in an inactive semester');
  }
  if (String(semester.course) !== String(course._id)) {
    throw ApiError.badRequest('Selected semester does not belong to the chosen course');
  }
  if (semester.academicYear !== payload.academicYear) {
    throw ApiError.badRequest(
      `Academic year mismatch: selected semester belongs to academic year ${semester.academicYear}`
    );
  }

  const studentIds = [
    ...new Set((payload.students && payload.students.length > 0 ? payload.students : [payload.student]).map(String))
  ];
  const subjectIds = [
    ...new Set((payload.subjects && payload.subjects.length > 0 ? payload.subjects : [payload.subject]).map(String))
  ];

  const [students, subjects] = await Promise.all([
    Student.find({ _id: { $in: studentIds } }).populate('user', 'name email isActive'),
    Subject.find({ _id: { $in: subjectIds } })
  ]);

  const studentMap = new Map(students.map((s) => [String(s._id), s]));
  const subjectMap = new Map(subjects.map((sub) => [String(sub._id), sub]));

  const createdDocs = [];
  const failures = [];
  const isSinglePair = studentIds.length === 1 && subjectIds.length === 1;

  for (const sId of studentIds) {
    const studentDoc = studentMap.get(sId);

    for (const subId of subjectIds) {
      const subjectDoc = subjectMap.get(subId);
      const studentLabel = studentDoc
        ? `${studentDoc.rollNumber} (${studentDoc.firstName} ${studentDoc.lastName})`
        : sId;
      const subjectLabel = subjectDoc ? `${subjectDoc.code} (${subjectDoc.name})` : subId;

      if (!studentDoc) {
        failures.push({ student: sId, subject: subId, statusCode: 404, reason: 'Student record not found' });
        continue;
      }
      if (studentDoc.status !== 'ACTIVE' || studentDoc.user?.isActive === false) {
        failures.push({
          student: sId,
          studentLabel,
          subject: subId,
          subjectLabel,
          statusCode: 400,
          reason: `Student ${studentLabel} is not active (status: ${studentDoc.status})`
        });
        continue;
      }
      if (studentDoc.course && String(studentDoc.course) !== String(course._id)) {
        failures.push({
          student: sId,
          studentLabel,
          subject: subId,
          subjectLabel,
          statusCode: 400,
          reason: `Student ${studentLabel} belongs to a different course`
        });
        continue;
      }
      if (
        !studentDoc.course &&
        studentDoc.department &&
        String(studentDoc.department) !== String(course.department?._id || course.department)
      ) {
        failures.push({
          student: sId,
          studentLabel,
          subject: subId,
          subjectLabel,
          statusCode: 400,
          reason: `Student ${studentLabel} belongs to a different department than the selected course`
        });
        continue;
      }

      if (!subjectDoc) {
        failures.push({
          student: sId,
          studentLabel,
          subject: subId,
          statusCode: 404,
          reason: 'Subject record not found'
        });
        continue;
      }
      if (subjectDoc.isActive === false) {
        failures.push({
          student: sId,
          studentLabel,
          subject: subId,
          subjectLabel,
          statusCode: 400,
          reason: `Subject ${subjectLabel} is inactive`
        });
        continue;
      }
      if (String(subjectDoc.course) !== String(course._id)) {
        failures.push({
          student: sId,
          studentLabel,
          subject: subId,
          subjectLabel,
          statusCode: 400,
          reason: `Subject ${subjectLabel} does not belong to the selected course`
        });
        continue;
      }
      if (String(subjectDoc.semester) !== String(semester._id)) {
        failures.push({
          student: sId,
          studentLabel,
          subject: subId,
          subjectLabel,
          statusCode: 400,
          reason: `Subject ${subjectLabel} does not belong to the selected semester`
        });
        continue;
      }

      const duplicate = await Enrollment.findOne({
        student: sId,
        subject: subId,
        semester: semester._id,
        academicYear: payload.academicYear,
        status: 'ACTIVE'
      }).lean();

      if (duplicate) {
        failures.push({
          student: sId,
          studentLabel,
          subject: subId,
          subjectLabel,
          statusCode: 409,
          reason: `${studentLabel} is already actively enrolled in ${subjectLabel} for ${payload.academicYear}`
        });
        continue;
      }

      try {
        const created = await Enrollment.create({
          student: sId,
          course: course._id,
          semester: semester._id,
          subject: subId,
          academicYear: payload.academicYear,
          section: payload.section || 'A',
          enrollmentDate: payload.enrollmentDate || new Date(),
          status: 'ACTIVE',
          createdBy: actorUserId,
          updatedBy: actorUserId,
          statusUpdatedAt: new Date()
        });
        createdDocs.push(created);
      } catch (err) {
        if (err?.code === 11000) {
          failures.push({
            student: sId,
            studentLabel,
            subject: subId,
            subjectLabel,
            statusCode: 409,
            reason: `Duplicate active enrollment detected for ${studentLabel} in ${subjectLabel}`
          });
        } else {
          failures.push({
            student: sId,
            studentLabel,
            subject: subId,
            subjectLabel,
            statusCode: 400,
            reason: err.message || 'Enrollment creation failed'
          });
        }
      }
    }
  }

  if (isSinglePair && failures.length === 1) {
    const f = failures[0];
    if (f.statusCode === 409) throw ApiError.conflict(f.reason);
    if (f.statusCode === 404) throw ApiError.notFound(f.reason);
    throw ApiError.badRequest(f.reason);
  }

  if (createdDocs.length === 0 && failures.length > 0) {
    const allConflicts = failures.every((f) => f.statusCode === 409);
    const firstMsg = failures[0].reason;
    if (allConflicts) {
      throw ApiError.conflict(firstMsg, failures);
    }
    throw ApiError.badRequest(firstMsg, failures);
  }

  const populatedCreated = await populateEnrollmentQuery(
    Enrollment.find({ _id: { $in: createdDocs.map((d) => d._id) } }).sort({ createdAt: -1 })
  ).lean();

  return {
    createdCount: populatedCreated.length,
    failedCount: failures.length,
    created: populatedCreated,
    failures
  };
};

const validateEnrollmentStatusTransition = async (existing, nextStatus) => {
  if (!nextStatus || existing.status === nextStatus) return;

  if (existing.status === 'COMPLETED' && nextStatus !== 'COMPLETED') {
    throw ApiError.badRequest('Completed enrollment status cannot be reverted or modified');
  }

  if (nextStatus === 'ACTIVE') {
    const [student, course, semester, subject, activeDuplicate] = await Promise.all([
      Student.findById(existing.student).populate('user', 'isActive'),
      Course.findById(existing.course),
      Semester.findById(existing.semester),
      Subject.findById(existing.subject),
      Enrollment.findOne({
        _id: { $ne: existing._id },
        student: existing.student,
        subject: existing.subject,
        semester: existing.semester,
        academicYear: existing.academicYear,
        status: 'ACTIVE'
      })
    ]);

    if (!student || student.status !== 'ACTIVE' || student.user?.isActive === false) {
      throw ApiError.badRequest('Cannot reactivate enrollment because student is not active');
    }
    if (!course || course.isActive === false || !semester || semester.isActive === false || !subject || subject.isActive === false) {
      throw ApiError.badRequest('Cannot reactivate enrollment because linked academic records are inactive');
    }
    if (activeDuplicate) {
      throw ApiError.conflict('Another active enrollment already exists for this student, subject, semester, and academic year');
    }
  }
};

export const updateEnrollment = async (id, payload, actorUserId) => {
  const existing = await Enrollment.findById(id);
  if (!existing) {
    throw ApiError.notFound('Enrollment record not found');
  }

  const targetAcademicYear = payload.academicYear || existing.academicYear;
  const targetStatus = payload.status || existing.status;

  if (payload.academicYear && payload.academicYear !== existing.academicYear && targetStatus === 'ACTIVE') {
    const duplicate = await Enrollment.findOne({
      _id: { $ne: existing._id },
      student: existing.student,
      subject: existing.subject,
      semester: existing.semester,
      academicYear: targetAcademicYear,
      status: 'ACTIVE'
    });
    if (duplicate) {
      throw ApiError.conflict('Active enrollment already exists for that academic year');
    }
  }

  await validateEnrollmentStatusTransition(existing, targetStatus);

  if (payload.section !== undefined) existing.section = payload.section;
  if (payload.academicYear !== undefined) existing.academicYear = payload.academicYear;
  if (payload.enrollmentDate !== undefined) existing.enrollmentDate = payload.enrollmentDate;
  if (payload.status !== undefined && payload.status !== existing.status) {
    existing.status = payload.status;
    existing.statusUpdatedAt = new Date();
  }
  existing.updatedBy = actorUserId;

  try {
    await existing.save();
  } catch (err) {
    if (err?.code === 11000) {
      throw ApiError.conflict('Conflicting active enrollment already exists');
    }
    throw err;
  }

  return populateEnrollmentQuery(Enrollment.findById(existing._id)).lean();
};

export const updateEnrollmentStatus = async (id, status, actorUserId) => {
  const existing = await Enrollment.findById(id);
  if (!existing) {
    throw ApiError.notFound('Enrollment record not found');
  }

  await validateEnrollmentStatusTransition(existing, status);

  existing.status = status;
  existing.statusUpdatedAt = new Date();
  existing.updatedBy = actorUserId;
  await existing.save();

  return populateEnrollmentQuery(Enrollment.findById(existing._id)).lean();
};

export const deleteEnrollment = async (id) => {
  const existing = await Enrollment.findById(id);
  if (!existing) {
    throw ApiError.notFound('Enrollment record not found');
  }

  const [hasAttendance, hasResult] = await Promise.all([
    Attendance.exists({
      student: existing.student,
      subject: existing.subject,
      semester: existing.semester
    }),
    Result.exists({
      student: existing.student,
      subject: existing.subject
    })
  ]);

  if (hasAttendance || hasResult) {
    throw ApiError.conflict(
      'Cannot delete enrollment because dependent attendance or result records exist. Change status to DROPPED or CANCELLED instead.'
    );
  }

  await Enrollment.deleteOne({ _id: existing._id });
  return { deletedId: String(existing._id) };
};
