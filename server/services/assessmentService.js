import InternalAssessment from '../models/InternalAssessment.js';
import AssessmentMark from '../models/AssessmentMark.js';
import Examination from '../models/Examination.js';
import Enrollment from '../models/Enrollment.js';
import FacultyAssignment from '../models/FacultyAssignment.js';
import Faculty from '../models/Faculty.js';
import Student from '../models/Student.js';
import Course from '../models/Course.js';
import Semester from '../models/Semester.js';
import Subject from '../models/Subject.js';
import ApiError from '../utils/ApiError.js';
import {
  escapeRegex,
  buildPagination,
  formatPaginationMeta,
  buildSortSpec
} from '../utils/queryHelpers.js';

const ASSESSMENT_SORT_MAP = {
  assessmentDate: 'assessmentDate',
  name: 'name',
  maxMarks: 'maxMarks',
  status: 'status',
  createdAt: 'createdAt'
};

const MARK_SORT_MAP = {
  marksObtained: 'marksObtained',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

const populateAssessmentQuery = (query) =>
  query
    .populate({
      path: 'course',
      select: 'code name department',
      populate: { path: 'department', select: 'code name' }
    })
    .populate('semester', 'semesterNumber academicYear status')
    .populate('subject', 'code name credits type')
    .populate('examination', 'title examType maxMarks status examDate')
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

const populateMarkQuery = (query) =>
  query
    .populate('assessment', 'name componentType maxMarks assessmentDate status')
    .populate('examination', 'title examType status')
    .populate('student', 'rollNumber enrollmentNumber firstName lastName status department')
    .populate('course', 'code name')
    .populate('semester', 'semesterNumber academicYear')
    .populate('subject', 'code name credits type')
    .populate('faculty', 'employeeId firstName lastName')
    .populate('enteredBy', 'name email')
    .populate('updatedBy', 'name email');

const fetchEligibleStudentsForAssessment = async (assessment) => {
  const enrollments = await Enrollment.find({
    subject: assessment.subject?._id || assessment.subject,
    semester: assessment.semester?._id || assessment.semester,
    course: assessment.course?._id || assessment.course,
    academicYear: assessment.academicYear,
    status: 'ACTIVE'
  })
    .populate({
      path: 'student',
      select: 'rollNumber enrollmentNumber firstName lastName status department user',
      populate: { path: 'user', select: 'isActive email' }
    })
    .lean();

  const deduped = new Map();
  for (const enr of enrollments) {
    const s = enr.student;
    if (s && s.status === 'ACTIVE' && s.user?.isActive !== false) {
      deduped.set(String(s._id), s);
    }
  }

  return [...deduped.values()].sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || ''));
};

export const listAssessments = async (query = {}, user) => {
  const { page, limit, skip } = buildPagination(query.page, query.limit, 100);
  const sortSpec = buildSortSpec(query.sortBy, query.sortOrder, ASSESSMENT_SORT_MAP, { createdAt: -1 });
  const andConditions = [];

  if (user?.role === 'faculty') {
    if (!user.profileId) throw ApiError.forbidden('Faculty profile is not linked to this account');
    const assignments = await FacultyAssignment.find({ faculty: user.profileId, status: 'ACTIVE' })
      .select('subject semester academicYear')
      .lean();
    if (assignments.length === 0) {
      return { assessments: [], ...formatPaginationMeta(page, limit, 0) };
    }
    andConditions.push({
      $or: assignments.map((a) => ({
        subject: a.subject,
        semester: a.semester,
        academicYear: a.academicYear
      }))
    });
  }

  if (query.course) andConditions.push({ course: query.course });
  if (query.semester) andConditions.push({ semester: query.semester });
  if (query.subject) andConditions.push({ subject: query.subject });
  if (query.examination) andConditions.push({ examination: query.examination });
  if (query.componentType) andConditions.push({ componentType: query.componentType });
  if (query.academicYear) andConditions.push({ academicYear: query.academicYear });
  if (query.status) andConditions.push({ status: query.status });

  if (query.department) {
    const courseIds = await Course.find({ department: query.department }).distinct('_id');
    andConditions.push({ course: { $in: courseIds } });
  }

  if (query.search) {
    const safeRegex = new RegExp(escapeRegex(query.search), 'i');
    const subIds = await Subject.find({ $or: [{ code: safeRegex }, { name: safeRegex }] }).distinct('_id');
    andConditions.push({
      $or: [{ name: safeRegex }, { description: safeRegex }, { subject: { $in: subIds } }]
    });
  }

  const filter = andConditions.length > 0 ? { $and: andConditions } : {};

  const [rawList, totalRecords] = await Promise.all([
    populateAssessmentQuery(InternalAssessment.find(filter).sort(sortSpec).skip(skip).limit(limit)).lean(),
    InternalAssessment.countDocuments(filter)
  ]);

  let assessments = rawList;
  if (rawList.length > 0) {
    const assessmentIds = rawList.map((a) => a._id);
    const enrMatchOr = rawList.map((a) => ({
      subject: a.subject?._id || a.subject,
      semester: a.semester?._id || a.semester,
      academicYear: a.academicYear,
      status: 'ACTIVE'
    }));

    const [markAgg, enrAgg] = await Promise.all([
      AssessmentMark.aggregate([
        { $match: { assessment: { $in: assessmentIds } } },
        {
          $group: {
            _id: '$assessment',
            enteredCount: { $sum: 1 },
            finalizedCount: { $sum: { $cond: [{ $eq: ['$entryStatus', 'FINALIZED'] }, 1, 0] } },
            draftCount: { $sum: { $cond: [{ $eq: ['$entryStatus', 'DRAFT'] }, 1, 0] } },
            averageMarks: { $avg: '$marksObtained' }
          }
        }
      ]),
      Enrollment.aggregate([
        { $match: { $or: enrMatchOr } },
        {
          $group: {
            _id: {
              subject: '$subject',
              semester: '$semester',
              academicYear: '$academicYear'
            },
            students: { $addToSet: '$student' }
          }
        },
        {
          $project: {
            _id: 1,
            count: { $size: '$students' }
          }
        }
      ])
    ]);

    const markMap = new Map(markAgg.map((m) => [String(m._id), m]));
    const enrMap = new Map(
      enrAgg.map((e) => [`${e._id.subject}|${e._id.semester}|${e._id.academicYear}`, e.count])
    );

    assessments = rawList.map((a) => {
      const m = markMap.get(String(a._id));
      const key = `${a.subject?._id || a.subject}|${a.semester?._id || a.semester}|${a.academicYear}`;
      return {
        ...a,
        enrolledCount: enrMap.get(key) || 0,
        enteredCount: m?.enteredCount || 0,
        finalizedMarksCount: m?.finalizedCount || 0,
        draftMarksCount: m?.draftCount || 0,
        averageMarks: m?.averageMarks !== undefined ? Number(m.averageMarks.toFixed(2)) : null
      };
    });
  }

  return {
    assessments,
    ...formatPaginationMeta(page, limit, totalRecords)
  };
};

export const getAssessmentWithRoster = async (id, user) => {
  const assessment = await populateAssessmentQuery(InternalAssessment.findById(id)).lean();
  if (!assessment) throw ApiError.notFound('Internal assessment component not found');

  if (user?.role === 'faculty') {
    const hasAssign = await FacultyAssignment.exists({
      faculty: user.profileId,
      subject: assessment.subject?._id || assessment.subject,
      semester: assessment.semester?._id || assessment.semester,
      academicYear: assessment.academicYear,
      status: 'ACTIVE'
    });
    if (!hasAssign) {
      throw ApiError.forbidden('You do not have active teaching assignment access to this assessment');
    }
  }

  const [eligibleStudents, existingMarks] = await Promise.all([
    fetchEligibleStudentsForAssessment(assessment),
    AssessmentMark.find({ assessment: assessment._id })
      .populate('updatedBy', 'name email')
      .lean()
  ]);

  const markMap = new Map(existingMarks.map((m) => [String(m.student), m]));

  const roster = eligibleStudents.map((stu) => {
    const mark = markMap.get(String(stu._id));
    return {
      studentId: stu._id,
      rollNumber: stu.rollNumber,
      enrollmentNumber: stu.enrollmentNumber,
      firstName: stu.firstName,
      lastName: stu.lastName,
      fullName: `${stu.firstName} ${stu.lastName}`.trim(),
      markId: mark?._id || null,
      marksObtained: mark ? mark.marksObtained : '',
      entryStatus: mark?.entryStatus || null,
      remarks: mark?.remarks || '',
      lastCorrectionReason: mark?.lastCorrectionReason || '',
      updatedAt: mark?.updatedAt || null
    };
  });

  return {
    assessment,
    eligibleCount: roster.length,
    enteredCount: existingMarks.length,
    roster
  };
};

export const createAssessment = async (payload, actorUserId) => {
  const [course, semester, subject] = await Promise.all([
    Course.findById(payload.course).populate('department', 'isActive'),
    Semester.findById(payload.semester),
    Subject.findById(payload.subject)
  ]);

  if (!course) throw ApiError.notFound('Selected course not found');
  if (course.isActive === false || course.department?.isActive === false) {
    throw ApiError.badRequest('Selected course or department is inactive');
  }

  if (!semester) throw ApiError.notFound('Selected semester not found');
  if (semester.isActive === false) throw ApiError.badRequest('Selected semester is inactive');
  if (String(semester.course) !== String(course._id)) {
    throw ApiError.badRequest('Selected semester does not belong to the chosen course');
  }
  if (semester.academicYear !== payload.academicYear) {
    throw ApiError.badRequest(`Academic year mismatch: semester belongs to ${semester.academicYear}`);
  }

  if (!subject) throw ApiError.notFound('Selected subject not found');
  if (subject.isActive === false) throw ApiError.badRequest('Selected subject is inactive');
  if (String(subject.course) !== String(course._id) || String(subject.semester) !== String(semester._id)) {
    throw ApiError.badRequest('Selected subject does not belong to the chosen course and semester');
  }

  let examRef = null;
  if (payload.examination) {
    examRef = await Examination.findById(payload.examination);
    if (!examRef) throw ApiError.notFound('Linked examination not found');
    if (examRef.status === 'CANCELLED') throw ApiError.badRequest('Cannot link to a cancelled examination');
    if (
      String(examRef.course) !== String(course._id) ||
      String(examRef.semester) !== String(semester._id) ||
      (examRef.subject && String(examRef.subject) !== String(subject._id))
    ) {
      throw ApiError.badRequest('Examination does not match selected course, semester, or subject');
    }
    if (payload.maxMarks > examRef.maxMarks) {
      throw ApiError.badRequest(`Component maxMarks (${payload.maxMarks}) cannot exceed examination maxMarks (${examRef.maxMarks})`);
    }
  }

  const duplicate = await InternalAssessment.findOne({
    subject: subject._id,
    semester: semester._id,
    academicYear: payload.academicYear,
    name: payload.name.trim(),
    isCancelled: false
  }).lean();

  if (duplicate) {
    throw ApiError.conflict(`Assessment component "${payload.name}" already exists for ${subject.code}`);
  }

  let created;
  try {
    created = await InternalAssessment.create({
      name: payload.name.trim(),
      componentType: payload.componentType,
      examination: examRef?._id || undefined,
      course: course._id,
      semester: semester._id,
      subject: subject._id,
      academicYear: payload.academicYear,
      maxMarks: payload.maxMarks,
      assessmentDate: payload.assessmentDate || undefined,
      description: payload.description || '',
      status: payload.status || 'ACTIVE',
      isCancelled: false,
      createdBy: actorUserId,
      updatedBy: actorUserId
    });
  } catch (err) {
    if (err?.code === 11000) {
      throw ApiError.conflict('Duplicate assessment component for this subject and semester');
    }
    throw err;
  }

  return populateAssessmentQuery(InternalAssessment.findById(created._id)).lean();
};

export const updateAssessment = async (id, payload, actorUserId) => {
  const existing = await InternalAssessment.findById(id);
  if (!existing) throw ApiError.notFound('Internal assessment component not found');

  if (['FINALIZED', 'PUBLISHED', 'CANCELLED'].includes(existing.status)) {
    throw ApiError.badRequest(`Cannot edit assessment component while status is ${existing.status}`);
  }

  if (payload.maxMarks !== undefined && payload.maxMarks < existing.maxMarks) {
    const higherMark = await AssessmentMark.exists({
      assessment: existing._id,
      marksObtained: { $gt: payload.maxMarks }
    });
    if (higherMark) {
      throw ApiError.conflict(
        `Cannot reduce maximum marks to ${payload.maxMarks} below existing student marks`
      );
    }
  }

  if (payload.examination) {
    const exam = await Examination.findById(payload.examination);
    if (!exam) throw ApiError.notFound('Linked examination not found');
    const targetMax = payload.maxMarks !== undefined ? payload.maxMarks : existing.maxMarks;
    if (targetMax > exam.maxMarks) {
      throw ApiError.badRequest(`Max marks (${targetMax}) cannot exceed examination max marks (${exam.maxMarks})`);
    }
  }

  if (payload.name !== undefined) existing.name = payload.name.trim();
  if (payload.componentType !== undefined) existing.componentType = payload.componentType;
  if (payload.examination !== undefined) existing.examination = payload.examination || undefined;
  if (payload.maxMarks !== undefined) existing.maxMarks = payload.maxMarks;
  if (payload.assessmentDate !== undefined) existing.assessmentDate = payload.assessmentDate || undefined;
  if (payload.description !== undefined) existing.description = payload.description;
  existing.updatedBy = actorUserId;

  try {
    await existing.save();
  } catch (err) {
    if (err?.code === 11000) {
      throw ApiError.conflict('Another assessment component with that name exists for this subject');
    }
    throw err;
  }

  return populateAssessmentQuery(InternalAssessment.findById(existing._id)).lean();
};

export const updateAssessmentStatus = async (id, { status, reason }, actorUserId) => {
  const existing = await InternalAssessment.findById(id);
  if (!existing) throw ApiError.notFound('Internal assessment component not found');

  const prev = existing.status;
  if (prev === status) {
    return {
      assessment: await populateAssessmentQuery(InternalAssessment.findById(existing._id)).lean(),
      previousStatus: prev
    };
  }

  if (prev === 'CANCELLED') {
    throw ApiError.badRequest('Cancelled assessments cannot be reopened or modified');
  }

  const allowed = {
    DRAFT: ['ACTIVE', 'CANCELLED'],
    ACTIVE: ['FINALIZED', 'PUBLISHED', 'CANCELLED', 'DRAFT'],
    FINALIZED: ['PUBLISHED', 'ACTIVE'],
    PUBLISHED: ['FINALIZED', 'ACTIVE']
  };

  if (!(allowed[prev] || []).includes(status)) {
    throw ApiError.badRequest(`Invalid assessment transition from ${prev} to ${status}`);
  }

  if (status === 'FINALIZED' || status === 'PUBLISHED') {
    const marksCount = await AssessmentMark.countDocuments({ assessment: existing._id });
    if (marksCount === 0) {
      throw ApiError.badRequest('At least one student marks record must be entered before finalizing or publishing');
    }
    if (status === 'FINALIZED') {
      existing.finalizedAt = new Date();
      existing.finalizedBy = actorUserId;
    }
    if (status === 'PUBLISHED') {
      if (!existing.finalizedAt) {
        existing.finalizedAt = new Date();
        existing.finalizedBy = actorUserId;
      }
      existing.publishedAt = new Date();
      existing.publishedBy = actorUserId;
      await AssessmentMark.updateMany(
        { assessment: existing._id },
        { $set: { entryStatus: 'FINALIZED', updatedBy: actorUserId } }
      );
    }
  }

  if ((prev === 'FINALIZED' || prev === 'PUBLISHED') && status === 'ACTIVE') {
    if (!reason || reason.trim().length < 3) {
      throw ApiError.badRequest('Reopening a finalized or published assessment requires an explicit reason (min 3 characters)');
    }
    existing.reopenedAt = new Date();
    existing.reopenReason = reason.trim();
  }

  existing.status = status;
  existing.isCancelled = status === 'CANCELLED';
  existing.updatedBy = actorUserId;
  await existing.save();

  const updated = await populateAssessmentQuery(InternalAssessment.findById(existing._id)).lean();
  return { assessment: updated, previousStatus: prev };
};

/**
 * Bulk & Individual Marks Submission with strict enrollment, faculty assignment, and precision checks.
 */
export const submitAssessmentMarksBulk = async (assessmentId, payload, user) => {
  const assessment = await InternalAssessment.findById(assessmentId);
  if (!assessment) throw ApiError.notFound('Internal assessment component not found');

  if (['FINALIZED', 'PUBLISHED', 'CANCELLED'].includes(assessment.status)) {
    throw ApiError.conflict(
      `Cannot submit marks because assessment is locked (status: ${assessment.status}). Use controlled correction or reopen first.`
    );
  }

  let facultyId = null;
  if (user.role === 'faculty') {
    if (!user.profileId) throw ApiError.forbidden('Faculty profile is not linked to your account');
    const [facultyDoc, activeAssign] = await Promise.all([
      Faculty.findById(user.profileId).populate('user', 'isActive'),
      FacultyAssignment.findOne({
        faculty: user.profileId,
        subject: assessment.subject,
        semester: assessment.semester,
        academicYear: assessment.academicYear,
        status: 'ACTIVE'
      }).lean()
    ]);

    if (!facultyDoc || facultyDoc.status !== 'ACTIVE' || facultyDoc.user?.isActive === false) {
      throw ApiError.forbidden('Faculty account is inactive');
    }
    if (!activeAssign) {
      throw ApiError.forbidden('You do not hold an active teaching assignment for this assessment subject');
    }
    facultyId = facultyDoc._id;
  } else {
    const activeAssign = await FacultyAssignment.findOne({
      subject: assessment.subject,
      semester: assessment.semester,
      academicYear: assessment.academicYear,
      status: 'ACTIVE'
    }).lean();
    if (!activeAssign) {
      throw ApiError.badRequest('No active faculty assignment found for this subject and semester');
    }
    facultyId = activeAssign.faculty;
  }

  // Detect duplicate student IDs inside payload
  const seenIds = new Set();
  const duplicateIds = [];
  const outOfRange = [];

  for (const r of payload.records) {
    const sid = String(r.studentId);
    if (seenIds.has(sid)) duplicateIds.push(sid);
    seenIds.add(sid);

    if (typeof r.marksObtained !== 'number' || Number.isNaN(r.marksObtained)) {
      outOfRange.push({ studentId: sid, reason: 'Marks must be numeric' });
    } else if (r.marksObtained < 0) {
      outOfRange.push({ studentId: sid, reason: 'Marks cannot be negative' });
    } else if (r.marksObtained > assessment.maxMarks) {
      outOfRange.push({
        studentId: sid,
        reason: `Marks (${r.marksObtained}) exceed configured maximum (${assessment.maxMarks})`
      });
    }
  }

  if (duplicateIds.length > 0) {
    throw ApiError.badRequest(`Duplicate student entries detected in payload: ${duplicateIds.join(', ')}`);
  }
  if (outOfRange.length > 0) {
    throw ApiError.badRequest(outOfRange[0].reason, outOfRange);
  }

  // Authoritative eligible enrolled students check
  const eligibleStudents = await fetchEligibleStudentsForAssessment(assessment);
  const eligibleSet = new Set(eligibleStudents.map((s) => String(s._id)));
  const ineligibleIds = [...seenIds].filter((sid) => !eligibleSet.has(sid));

  if (ineligibleIds.length > 0) {
    throw ApiError.badRequest(
      `Rejected un-enrolled, inactive, or ineligible student ID(s): ${ineligibleIds.join(', ')}`
    );
  }

  // Check existing marks for duplicate submission guard (only DRAFT entries may be overwritten cleanly via bulk)
  const existingMarks = await AssessmentMark.find({
    assessment: assessment._id,
    student: { $in: [...seenIds] }
  }).lean();

  const lockedSubmitted = existingMarks.filter((m) => m.entryStatus !== 'DRAFT');
  if (lockedSubmitted.length > 0) {
    throw ApiError.conflict(
      'Marks have already been submitted for one or more selected students. Use the audited correction endpoint to update submitted marks.'
    );
  }

  const targetEntryStatus = payload.finalize ? 'FINALIZED' : payload.entryStatus || 'SUBMITTED';
  const existingMap = new Map(existingMarks.map((m) => [String(m.student), m]));

  const bulkOps = payload.records.map((r) => {
    const existingDraft = existingMap.get(String(r.studentId));
    if (existingDraft) {
      return {
        updateOne: {
          filter: { _id: existingDraft._id },
          update: {
            $set: {
              marksObtained: r.marksObtained,
              maxMarks: assessment.maxMarks,
              remarks: r.remarks || '',
              entryStatus: targetEntryStatus,
              faculty: facultyId,
              updatedBy: user.userId
            }
          }
        }
      };
    }
    return {
      insertOne: {
        document: {
          assessment: assessment._id,
          examination: assessment.examination || undefined,
          student: r.studentId,
          subject: assessment.subject,
          course: assessment.course,
          semester: assessment.semester,
          academicYear: assessment.academicYear,
          faculty: facultyId,
          marksObtained: r.marksObtained,
          maxMarks: assessment.maxMarks,
          remarks: r.remarks || '',
          entryStatus: targetEntryStatus,
          enteredBy: user.userId,
          updatedBy: user.userId
        }
      }
    };
  });

  try {
    await AssessmentMark.bulkWrite(bulkOps, { ordered: true });
  } catch (err) {
    if (err?.code === 11000) {
      throw ApiError.conflict('Duplicate student marks detected for this assessment');
    }
    throw err;
  }

  if (payload.finalize) {
    assessment.status = 'FINALIZED';
    assessment.finalizedAt = new Date();
    assessment.finalizedBy = user.userId;
    assessment.updatedBy = user.userId;
    await assessment.save();
  } else if (assessment.status === 'DRAFT') {
    assessment.status = 'ACTIVE';
    assessment.updatedBy = user.userId;
    await assessment.save();
  }

  return {
    assessmentId: String(assessment._id),
    assessmentStatus: assessment.status,
    entryStatus: targetEntryStatus,
    processedCount: payload.records.length
  };
};

export const listMarks = async (query = {}, user) => {
  const { page, limit, skip } = buildPagination(query.page, query.limit, 100);
  const sortSpec = buildSortSpec(query.sortBy, query.sortOrder, MARK_SORT_MAP, { updatedAt: -1 });
  const andConditions = [];

  if (user.role === 'student') {
    if (!user.profileId) throw ApiError.forbidden('Student profile is not linked to this account');
    if (query.student && String(query.student) !== String(user.profileId)) {
      throw ApiError.forbidden('Students cannot access another student marks records');
    }
    const publishedIds = await InternalAssessment.find({ status: 'PUBLISHED' }).distinct('_id');
    andConditions.push({ student: user.profileId, assessment: { $in: publishedIds } });
  } else if (user.role === 'faculty') {
    if (!user.profileId) throw ApiError.forbidden('Faculty profile is not linked to this account');
    if (query.faculty && String(query.faculty) !== String(user.profileId)) {
      throw ApiError.forbidden('Faculty cannot view marks filtered for another faculty member');
    }
    const assignments = await FacultyAssignment.find({ faculty: user.profileId, status: 'ACTIVE' })
      .select('subject semester academicYear')
      .lean();
    if (assignments.length === 0) {
      return { marks: [], ...formatPaginationMeta(page, limit, 0) };
    }
    andConditions.push({
      $or: assignments.map((a) => ({
        subject: a.subject,
        semester: a.semester,
        academicYear: a.academicYear
      }))
    });
    if (query.student) andConditions.push({ student: query.student });
  } else {
    if (query.student) andConditions.push({ student: query.student });
    if (query.faculty) andConditions.push({ faculty: query.faculty });
  }

  if (query.assessment) andConditions.push({ assessment: query.assessment });
  if (query.examination) andConditions.push({ examination: query.examination });
  if (query.course) andConditions.push({ course: query.course });
  if (query.semester) andConditions.push({ semester: query.semester });
  if (query.subject) andConditions.push({ subject: query.subject });
  if (query.academicYear) andConditions.push({ academicYear: query.academicYear });
  if (query.entryStatus) andConditions.push({ entryStatus: query.entryStatus });

  if (query.search) {
    const safeRegex = new RegExp(escapeRegex(query.search), 'i');
    const [stuIds, subIds, assessIds] = await Promise.all([
      Student.find({
        $or: [
          { rollNumber: safeRegex },
          { enrollmentNumber: safeRegex },
          { firstName: safeRegex },
          { lastName: safeRegex }
        ]
      }).distinct('_id'),
      Subject.find({ $or: [{ code: safeRegex }, { name: safeRegex }] }).distinct('_id'),
      InternalAssessment.find({ name: safeRegex }).distinct('_id')
    ]);
    andConditions.push({
      $or: [
        { student: { $in: stuIds } },
        { subject: { $in: subIds } },
        { assessment: { $in: assessIds } }
      ]
    });
  }

  const filter = andConditions.length > 0 ? { $and: andConditions } : {};

  const [marks, totalRecords] = await Promise.all([
    populateMarkQuery(AssessmentMark.find(filter).sort(sortSpec).skip(skip).limit(limit)).lean(),
    AssessmentMark.countDocuments(filter)
  ]);

  return {
    marks,
    ...formatPaginationMeta(page, limit, totalRecords)
  };
};

export const getMarkById = async (markId, user) => {
  const mark = await populateMarkQuery(AssessmentMark.findById(markId)).lean();
  if (!mark) throw ApiError.notFound('Assessment mark record not found');

  if (user.role === 'student') {
    if (String(mark.student?._id || mark.student) !== String(user.profileId)) {
      throw ApiError.forbidden('You do not have permission to access another student marks');
    }
    if (mark.assessment?.status !== 'PUBLISHED') {
      throw ApiError.forbidden('These assessment marks have not been published yet');
    }
  } else if (user.role === 'faculty') {
    const hasAssign = await FacultyAssignment.exists({
      faculty: user.profileId,
      subject: mark.subject?._id || mark.subject,
      semester: mark.semester?._id || mark.semester,
      academicYear: mark.academicYear,
      status: 'ACTIVE'
    });
    if (!hasAssign) {
      throw ApiError.forbidden('You do not hold an active assignment for this subject mark record');
    }
  }

  return mark;
};

export const getMyPublishedMarks = async (user, query = {}) => {
  if (user.role !== 'student') {
    throw ApiError.forbidden('Only students can access personal published assessment marks here');
  }
  if (!user.profileId) {
    throw ApiError.notFound('Student profile not found for this account');
  }

  const student = await Student.findById(user.profileId)
    .populate('department', 'code name')
    .populate('course', 'code name')
    .populate('semester', 'semesterNumber academicYear')
    .lean();

  if (!student) throw ApiError.notFound('Student record not found');

  const assessFilter = { status: 'PUBLISHED' };
  if (query.subject) assessFilter.subject = query.subject;
  if (query.semester) assessFilter.semester = query.semester;
  if (query.academicYear) assessFilter.academicYear = query.academicYear;

  const publishedIds = await InternalAssessment.find(assessFilter).distinct('_id');

  const marks = await populateMarkQuery(
    AssessmentMark.find({
      student: student._id,
      assessment: { $in: publishedIds }
    }).sort({ createdAt: -1 })
  ).lean();

  // Group into subject-wise internal assessment summaries (marks only, no final GPA/grades)
  const subjectMap = new Map();
  for (const m of marks) {
    const subId = String(m.subject?._id || m.subject);
    if (!subjectMap.has(subId)) {
      subjectMap.set(subId, {
        subject: m.subject,
        totalObtained: 0,
        totalMax: 0,
        componentsCount: 0,
        components: []
      });
    }
    const entry = subjectMap.get(subId);
    entry.totalObtained = Number((entry.totalObtained + m.marksObtained).toFixed(2));
    entry.totalMax = Number((entry.totalMax + m.maxMarks).toFixed(2));
    entry.componentsCount += 1;
    entry.components.push(m);
  }

  return {
    student,
    marks,
    subjectSummaries: [...subjectMap.values()]
  };
};

export const correctAssessmentMark = async (markId, payload, user) => {
  if (user.role === 'student') {
    throw ApiError.forbidden('Students cannot modify assessment marks');
  }

  const existing = await AssessmentMark.findById(markId);
  if (!existing) throw ApiError.notFound('Assessment mark record not found');

  const assessment = await InternalAssessment.findById(existing.assessment);
  if (!assessment) throw ApiError.notFound('Parent internal assessment not found');

  if (assessment.status === 'CANCELLED') {
    throw ApiError.badRequest('Cannot modify marks belonging to a cancelled assessment');
  }

  if (user.role === 'faculty') {
    const hasAssign = await FacultyAssignment.exists({
      faculty: user.profileId,
      subject: assessment.subject,
      semester: assessment.semester,
      academicYear: assessment.academicYear,
      status: 'ACTIVE'
    });
    if (!hasAssign) {
      throw ApiError.forbidden('You do not have active teaching access to correct this subject mark');
    }
    if (assessment.status === 'FINALIZED' || assessment.status === 'PUBLISHED') {
      throw ApiError.conflict(
        `Assessment is ${assessment.status} and locked from faculty edits. Request admin reopening or override.`
      );
    }
  }

  if (typeof payload.marksObtained !== 'number' || payload.marksObtained < 0) {
    throw ApiError.badRequest('Marks must be a non-negative numeric value');
  }
  if (payload.marksObtained > assessment.maxMarks) {
    throw ApiError.badRequest(
      `Updated marks (${payload.marksObtained}) cannot exceed configured maximum (${assessment.maxMarks})`
    );
  }

  const previousMarks = existing.marksObtained;
  const newMarks = payload.marksObtained;
  const previousRemarks = existing.remarks || '';

  existing.marksObtained = newMarks;
  existing.maxMarks = assessment.maxMarks;
  if (payload.remarks !== undefined) existing.remarks = payload.remarks;
  existing.lastCorrectionReason = payload.reason.trim();
  existing.updatedBy = user.userId;

  await existing.save();
  const updated = await populateMarkQuery(AssessmentMark.findById(existing._id)).lean();

  return {
    mark: updated,
    auditDetails: {
      previousMarks,
      newMarks,
      maxMarks: assessment.maxMarks,
      previousRemarks,
      newRemarks: existing.remarks || '',
      reason: payload.reason.trim(),
      assessmentId: String(assessment._id),
      studentId: String(existing.student)
    }
  };
};
