import Examination from '../models/Examination.js';
import InternalAssessment from '../models/InternalAssessment.js';
import AssessmentMark from '../models/AssessmentMark.js';
import Result from '../models/Result.js';
import Course from '../models/Course.js';
import Semester from '../models/Semester.js';
import Subject from '../models/Subject.js';
import Enrollment from '../models/Enrollment.js';
import FacultyAssignment from '../models/FacultyAssignment.js';
import ApiError from '../utils/ApiError.js';
import {
  escapeRegex,
  buildPagination,
  formatPaginationMeta,
  buildSortSpec
} from '../utils/queryHelpers.js';

const EXAM_SORT_MAP = {
  examDate: 'examDate',
  startDate: 'startDate',
  title: 'title',
  maxMarks: 'maxMarks',
  status: 'status',
  createdAt: 'createdAt'
};

const populateExamQuery = (query) =>
  query
    .populate({
      path: 'course',
      select: 'code name department isActive',
      populate: { path: 'department', select: 'code name' }
    })
    .populate('semester', 'semesterNumber academicYear status isActive')
    .populate('subject', 'code name credits type isActive')
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

export const listExaminations = async (query = {}, user) => {
  const { page, limit, skip } = buildPagination(query.page, query.limit, 100);
  const sortSpec = buildSortSpec(query.sortBy, query.sortOrder, EXAM_SORT_MAP, { createdAt: -1 });
  const andConditions = [];

  if (user?.role === 'faculty') {
    if (!user.profileId) throw ApiError.forbidden('Faculty profile is not linked to this account');
    const assignments = await FacultyAssignment.find({ faculty: user.profileId, status: 'ACTIVE' })
      .select('subject semester academicYear')
      .lean();
    if (assignments.length === 0) {
      return { examinations: [], ...formatPaginationMeta(page, limit, 0) };
    }
    andConditions.push({
      $or: assignments.map((a) => ({
        subject: a.subject,
        semester: a.semester,
        academicYear: a.academicYear
      }))
    });
  } else if (user?.role === 'student') {
    if (!user.profileId) throw ApiError.forbidden('Student profile is not linked to this account');
    const enrollments = await Enrollment.find({ student: user.profileId, status: 'ACTIVE' })
      .select('subject semester academicYear')
      .lean();
    if (enrollments.length === 0) {
      return { examinations: [], ...formatPaginationMeta(page, limit, 0) };
    }
    andConditions.push({
      status: { $in: ['SCHEDULED', 'COMPLETED', 'PUBLISHED'] },
      $or: enrollments.map((e) => ({
        subject: e.subject,
        semester: e.semester,
        academicYear: e.academicYear
      }))
    });
  }

  if (query.course) andConditions.push({ course: query.course });
  if (query.semester) andConditions.push({ semester: query.semester });
  if (query.subject) andConditions.push({ subject: query.subject });
  if (query.examType) andConditions.push({ examType: query.examType });
  if (query.academicYear) andConditions.push({ academicYear: query.academicYear });
  if (query.status) andConditions.push({ status: query.status });

  if (query.department) {
    const courseIds = await Course.find({ department: query.department }).distinct('_id');
    andConditions.push({ course: { $in: courseIds } });
  }

  if (query.startDate || query.endDate) {
    const range = {};
    if (query.startDate) range.$gte = new Date(query.startDate);
    if (query.endDate) range.$lte = new Date(query.endDate);
    andConditions.push({ examDate: range });
  }

  if (query.search) {
    const safeRegex = new RegExp(escapeRegex(query.search), 'i');
    const [subIds, courseIds] = await Promise.all([
      Subject.find({ $or: [{ code: safeRegex }, { name: safeRegex }] }).distinct('_id'),
      Course.find({ $or: [{ code: safeRegex }, { name: safeRegex }] }).distinct('_id')
    ]);
    andConditions.push({
      $or: [
        { title: safeRegex },
        { description: safeRegex },
        { subject: { $in: subIds } },
        { course: { $in: courseIds } }
      ]
    });
  }

  const filter = andConditions.length > 0 ? { $and: andConditions } : {};

  const [examsRaw, totalRecords] = await Promise.all([
    populateExamQuery(Examination.find(filter).sort(sortSpec).skip(skip).limit(limit)).lean(),
    Examination.countDocuments(filter)
  ]);

  let examinations = examsRaw;
  if (examsRaw.length > 0) {
    const examIds = examsRaw.map((e) => e._id);
    const [assessCounts, markCounts] = await Promise.all([
      InternalAssessment.aggregate([
        { $match: { examination: { $in: examIds }, isCancelled: false } },
        { $group: { _id: '$examination', count: { $sum: 1 } } }
      ]),
      AssessmentMark.aggregate([
        { $match: { examination: { $in: examIds } } },
        { $group: { _id: '$examination', count: { $sum: 1 } } }
      ])
    ]);
    const assessMap = new Map(assessCounts.map((c) => [String(c._id), c.count]));
    const markMap = new Map(markCounts.map((c) => [String(c._id), c.count]));
    examinations = examsRaw.map((e) => ({
      ...e,
      linkedAssessmentsCount: assessMap.get(String(e._id)) || 0,
      linkedMarksCount: markMap.get(String(e._id)) || 0
    }));
  }

  return {
    examinations,
    ...formatPaginationMeta(page, limit, totalRecords)
  };
};

export const getExaminationById = async (id, user) => {
  const exam = await populateExamQuery(Examination.findById(id)).lean();
  if (!exam) throw ApiError.notFound('Examination record not found');

  if (user?.role === 'faculty') {
    const hasAssign = await FacultyAssignment.exists({
      faculty: user.profileId,
      subject: exam.subject?._id || exam.subject,
      semester: exam.semester?._id || exam.semester,
      academicYear: exam.academicYear,
      status: 'ACTIVE'
    });
    if (!hasAssign) {
      throw ApiError.forbidden('You do not have access to this examination record');
    }
  } else if (user?.role === 'student') {
    if (!['SCHEDULED', 'COMPLETED', 'PUBLISHED'].includes(exam.status)) {
      throw ApiError.forbidden('This examination is not currently accessible to students');
    }
    const isEnrolled = await Enrollment.exists({
      student: user.profileId,
      subject: exam.subject?._id || exam.subject,
      semester: exam.semester?._id || exam.semester,
      academicYear: exam.academicYear,
      status: 'ACTIVE'
    });
    if (!isEnrolled) {
      throw ApiError.forbidden('You are not enrolled in this examination subject');
    }
  }

  const linkedAssessments = await InternalAssessment.find({ examination: exam._id, isCancelled: false })
    .select('name componentType maxMarks assessmentDate status')
    .lean();

  return { examination: exam, linkedAssessments };
};

export const createExamination = async (payload, actorUserId) => {
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

  const duplicate = await Examination.findOne({
    semester: semester._id,
    subject: subject._id,
    examType: payload.examType,
    academicYear: payload.academicYear,
    title: payload.title.trim(),
    isCancelled: false
  }).lean();

  if (duplicate) {
    throw ApiError.conflict(
      `An active ${payload.examType} examination titled "${payload.title}" already exists for ${subject.code}`
    );
  }

  const examDate = new Date(payload.examDate);
  let created;
  try {
    created = await Examination.create({
      title: payload.title.trim(),
      examType: payload.examType,
      course: course._id,
      semester: semester._id,
      subject: subject._id,
      academicYear: payload.academicYear,
      examDate,
      startDate: payload.startDate ? new Date(payload.startDate) : examDate,
      endDate: payload.endDate ? new Date(payload.endDate) : examDate,
      startTime: payload.startTime || '',
      endTime: payload.endTime || '',
      maxMarks: payload.maxMarks,
      description: payload.description || '',
      status: payload.status || 'SCHEDULED',
      isCancelled: false,
      createdBy: actorUserId,
      updatedBy: actorUserId
    });
  } catch (err) {
    if (err?.code === 11000) {
      throw ApiError.conflict('Duplicate examination configuration exists for this subject and semester');
    }
    throw err;
  }

  return populateExamQuery(Examination.findById(created._id)).lean();
};

export const updateExamination = async (id, payload, actorUserId) => {
  const existing = await Examination.findById(id);
  if (!existing) throw ApiError.notFound('Examination record not found');

  if (existing.status === 'CANCELLED' || existing.status === 'PUBLISHED') {
    throw ApiError.badRequest(`Cannot edit an examination with status ${existing.status}`);
  }

  const [hasLinkedMarks, hasLinkedAssessments] = await Promise.all([
    AssessmentMark.exists({ examination: existing._id }),
    InternalAssessment.exists({ examination: existing._id, isCancelled: false })
  ]);

  if (payload.examType && payload.examType !== existing.examType && (hasLinkedMarks || hasLinkedAssessments)) {
    throw ApiError.conflict('Cannot change examination type after internal assessments or marks are linked');
  }

  if (payload.maxMarks !== undefined && payload.maxMarks < existing.maxMarks) {
    const [higherMark, higherAssessment] = await Promise.all([
      AssessmentMark.exists({ examination: existing._id, marksObtained: { $gt: payload.maxMarks } }),
      InternalAssessment.exists({ examination: existing._id, maxMarks: { $gt: payload.maxMarks }, isCancelled: false })
    ]);
    if (higherMark || higherAssessment) {
      throw ApiError.conflict(
        `Cannot reduce maximum marks to ${payload.maxMarks} below existing assessment components or entered marks`
      );
    }
  }

  const effectiveStartTime = payload.startTime !== undefined ? payload.startTime : existing.startTime;
  const effectiveEndTime = payload.endTime !== undefined ? payload.endTime : existing.endTime;
  if (effectiveStartTime && effectiveEndTime && effectiveEndTime <= effectiveStartTime) {
    throw ApiError.badRequest('End time must be after start time');
  }

  if (payload.title !== undefined) existing.title = payload.title.trim();
  if (payload.examType !== undefined) existing.examType = payload.examType;
  if (payload.examDate !== undefined) {
    const dt = new Date(payload.examDate);
    existing.examDate = dt;
    existing.startDate = dt;
    existing.endDate = dt;
  }
  if (payload.startTime !== undefined) existing.startTime = payload.startTime;
  if (payload.endTime !== undefined) existing.endTime = payload.endTime;
  if (payload.maxMarks !== undefined) existing.maxMarks = payload.maxMarks;
  if (payload.description !== undefined) existing.description = payload.description;
  existing.updatedBy = actorUserId;

  try {
    await existing.save();
  } catch (err) {
    if (err?.code === 11000) {
      throw ApiError.conflict('Another examination with that title and type already exists for this subject');
    }
    throw err;
  }

  return populateExamQuery(Examination.findById(existing._id)).lean();
};

export const updateExaminationStatus = async (id, { status, reason }, actorUserId) => {
  const existing = await Examination.findById(id);
  if (!existing) throw ApiError.notFound('Examination record not found');

  const prev = existing.status;
  if (prev === status) {
    return { examination: await populateExamQuery(Examination.findById(existing._id)).lean(), previousStatus: prev };
  }

  if (prev === 'CANCELLED') {
    throw ApiError.badRequest('Cancelled examinations cannot be reopened or modified');
  }

  const allowedTransitions = {
    DRAFT: ['SCHEDULED', 'CANCELLED'],
    UPCOMING: ['SCHEDULED', 'COMPLETED', 'CANCELLED'],
    ONGOING: ['COMPLETED', 'CANCELLED'],
    SCHEDULED: ['COMPLETED', 'CANCELLED', 'DRAFT'],
    COMPLETED: ['PUBLISHED', 'SCHEDULED'],
    PUBLISHED: ['COMPLETED']
  };

  if (!(allowedTransitions[prev] || []).includes(status)) {
    throw ApiError.badRequest(`Invalid examination status transition from ${prev} to ${status}`);
  }

  if (status === 'COMPLETED' || status === 'PUBLISHED') {
    if (!existing.title || !existing.examDate || !existing.maxMarks) {
      throw ApiError.badRequest('Cannot complete or publish an incomplete examination configuration');
    }
  }

  if ((prev === 'COMPLETED' && status === 'SCHEDULED') || (prev === 'PUBLISHED' && status === 'COMPLETED')) {
    if (!reason || reason.trim().length < 3) {
      throw ApiError.badRequest('Reverting examination status requires an explicit audit reason (min 3 characters)');
    }
  }

  existing.status = status;
  existing.isCancelled = status === 'CANCELLED';
  if (status === 'PUBLISHED') existing.publishedAt = new Date();
  if (status === 'CANCELLED') existing.cancelledAt = new Date();
  existing.updatedBy = actorUserId;

  await existing.save();
  const updated = await populateExamQuery(Examination.findById(existing._id)).lean();
  return { examination: updated, previousStatus: prev };
};

export const deleteExamination = async (id) => {
  const existing = await Examination.findById(id);
  if (!existing) throw ApiError.notFound('Examination record not found');

  const [hasAssessments, hasMarks, hasResults] = await Promise.all([
    InternalAssessment.exists({ examination: existing._id }),
    AssessmentMark.exists({ examination: existing._id }),
    Result.exists({ examination: existing._id })
  ]);

  if (hasAssessments || hasMarks || hasResults) {
    throw ApiError.conflict(
      'Cannot delete examination because dependent internal assessment or result records exist. Cancel it instead.'
    );
  }

  await Examination.deleteOne({ _id: existing._id });
  return { deletedId: String(existing._id) };
};
