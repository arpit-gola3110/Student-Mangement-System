import mongoose from 'mongoose';
import Result from '../models/Result.js';
import Examination from '../models/Examination.js';
import InternalAssessment from '../models/InternalAssessment.js';
import AssessmentMark from '../models/AssessmentMark.js';
import Enrollment from '../models/Enrollment.js';
import FacultyAssignment from '../models/FacultyAssignment.js';
import Course from '../models/Course.js';
import Semester from '../models/Semester.js';
import Subject from '../models/Subject.js';
import Student from '../models/Student.js';
import ApiError from '../utils/ApiError.js';
import { calculateSGPA } from '../utils/gradeCalculator.js';
import { resolveEffectivePolicy } from './resultPolicyService.js';
import {
  escapeRegex,
  buildPagination,
  formatPaginationMeta,
  buildSortSpec
} from '../utils/queryHelpers.js';

const RESULT_SORT_MAP = {
  totalMarks: 'totalMarks',
  percentage: 'percentage',
  gradePoints: 'gradePoints',
  updatedAt: 'updatedAt',
  createdAt: 'createdAt'
};

export const applyRounding = (val, roundingPolicy = 'DECIMAL_2') => {
  const num = Number(val) || 0;
  if (roundingPolicy === 'HALF_UP_INT') return Math.round(num);
  if (roundingPolicy === 'CEIL_INT') return Math.ceil(num);
  return Number(num.toFixed(2));
};

export const mapGradeFromBoundaries = (percentage, boundaries = []) => {
  if (!Array.isArray(boundaries) || boundaries.length === 0) {
    throw ApiError.badRequest('Academic policy contains no valid grade boundaries');
  }
  const sorted = [...boundaries].sort((a, b) => b.minPercentage - a.minPercentage);
  for (const b of sorted) {
    if (percentage >= b.minPercentage && percentage <= b.maxPercentage + 0.0001) {
      return {
        grade: b.grade,
        gradePoints: b.gradePoints,
        isPassing: b.isPassing !== false
      };
    }
  }
  throw ApiError.badRequest(`Score percentage ${percentage}% does not fall inside any configured policy grade boundary`);
};

const populateResultQuery = (query) =>
  query
    .populate({
      path: 'student',
      select: 'rollNumber enrollmentNumber firstName lastName status department',
      populate: { path: 'department', select: 'code name' }
    })
    .populate('examination', 'title examType examDate status maxMarks')
    .populate({
      path: 'course',
      select: 'code name department',
      populate: { path: 'department', select: 'code name' }
    })
    .populate('semester', 'semesterNumber academicYear')
    .populate('subject', 'code name credits type maxInternalMarks maxExternalMarks')
    .populate('policy', 'name code policyVersion isProvisional evaluationMode')
    .populate('evaluatedBy', 'employeeId firstName lastName')
    .populate('calculatedBy', 'name email')
    .populate('approvedBy', 'name email')
    .populate('publishedBy', 'name email');

const createPolicySnapshot = (policy) => ({
  policyId: String(policy._id),
  name: policy.name,
  code: policy.code,
  policyVersion: policy.policyVersion,
  evaluationMode: policy.evaluationMode,
  useSubjectMaxMarks: policy.useSubjectMaxMarks,
  internalMaxMarks: policy.internalMaxMarks,
  externalMaxMarks: policy.externalMaxMarks,
  minInternalPassPercent: policy.minInternalPassPercent,
  minExternalPassPercent: policy.minExternalPassPercent,
  minTotalPassPercent: policy.minTotalPassPercent,
  roundingPolicy: policy.roundingPolicy,
  isProvisional: policy.isProvisional,
  gradeBoundaries: policy.gradeBoundaries
});

const buildRevisionSnapshot = (existing, reason, actorUserId) => ({
  version: existing.calculationVersion || 1,
  internalMarks: existing.internalMarks,
  externalMarks: existing.externalMarks,
  totalMarks: existing.totalMarks,
  maxMarks: existing.maxMarks,
  percentage: existing.percentage,
  grade: existing.grade,
  gradePoints: existing.gradePoints,
  resultStatus: existing.resultStatus,
  calculationStatus: existing.calculationStatus,
  publicationStatus: existing.publicationStatus,
  reason,
  modifiedBy: actorUserId,
  modifiedAt: new Date()
});

/**
 * Resolves eligible student-subject pairs and Phase 9 assessment / exam readiness cleanly.
 */
const loadScopeData = async ({ courseId, semesterId, academicYear, examinationId, subjectId, policyId }) => {
  const [course, semester, examination] = await Promise.all([
    Course.findById(courseId).lean(),
    Semester.findById(semesterId).lean(),
    Examination.findById(examinationId).lean()
  ]);

  if (!course) throw ApiError.notFound('Selected course not found');
  if (!semester) throw ApiError.notFound('Selected semester not found');
  if (String(semester.course) !== String(course._id)) {
    throw ApiError.badRequest('Semester does not belong to selected course');
  }
  if (semester.academicYear !== academicYear) {
    throw ApiError.badRequest(`Academic year mismatch: semester belongs to ${semester.academicYear}`);
  }
  if (!examination) throw ApiError.notFound('Selected examination not found');
  if (examination.status === 'CANCELLED') {
    throw ApiError.badRequest('Cannot process results for a cancelled examination');
  }
  if (examination.status === 'DRAFT') {
    throw ApiError.badRequest('Cannot process results for a DRAFT examination. Schedule or complete it first.');
  }
  if (
    String(examination.semester) !== String(semester._id) ||
    (examination.course && String(examination.course) !== String(course._id))
  ) {
    throw ApiError.badRequest('Examination does not belong to the selected course and semester');
  }

  const policy = await resolveEffectivePolicy({
    policyId,
    course: course._id,
    semester: semester._id,
    academicYear
  });

  const targetSubjectId = subjectId || examination.subject || null;
  const enrollmentFilter = {
    course: course._id,
    semester: semester._id,
    academicYear,
    status: 'ACTIVE'
  };
  if (targetSubjectId) enrollmentFilter.subject = targetSubjectId;

  const enrollments = await Enrollment.find(enrollmentFilter)
    .populate({
      path: 'student',
      select: 'rollNumber enrollmentNumber firstName lastName status user',
      populate: { path: 'user', select: 'isActive' }
    })
    .populate('subject', 'code name credits type maxInternalMarks maxExternalMarks isActive')
    .lean();

  const pairMap = new Map();
  for (const enr of enrollments) {
    if (!enr.student || !enr.subject) continue;
    if (enr.student.status !== 'ACTIVE' || enr.student.user?.isActive === false) continue;
    const key = `${enr.student._id}|${enr.subject._id}`;
    if (!pairMap.has(key)) {
      pairMap.set(key, { student: enr.student, subject: enr.subject });
    }
  }

  const pairs = [...pairMap.values()];
  const subjectIds = [...new Set(pairs.map((p) => String(p.subject._id)))];

  const [assessments, assessmentMarks, existingResults, assignments] = await Promise.all([
    InternalAssessment.find({
      course: course._id,
      semester: semester._id,
      academicYear,
      subject: { $in: subjectIds },
      isCancelled: false
    }).lean(),
    AssessmentMark.find({
      course: course._id,
      semester: semester._id,
      academicYear,
      subject: { $in: subjectIds }
    }).lean(),
    Result.find({
      examination: examination._id,
      subject: { $in: subjectIds }
    }).lean(),
    FacultyAssignment.find({
      course: course._id,
      semester: semester._id,
      academicYear,
      subject: { $in: subjectIds },
      status: 'ACTIVE'
    }).lean()
  ]);

  return {
    course,
    semester,
    examination,
    policy,
    pairs,
    assessments,
    assessmentMarks,
    existingResults,
    assignments
  };
};

/**
 * Pure per-(student, subject) calculation engine following policy snapshot cleanly.
 */
const evaluatePairResult = ({
  student,
  subject,
  examination,
  policy,
  subjectAssessments,
  studentSubjectMarks,
  externalEntry
}) => {
  const mode = policy.evaluationMode || 'COMBINED';
  const internalMax =
    mode === 'EXTERNAL_ONLY'
      ? 0
      : policy.useSubjectMaxMarks
      ? Number(subject.maxInternalMarks ?? policy.internalMaxMarks)
      : Number(policy.internalMaxMarks);
  const externalMax =
    mode === 'INTERNAL_ONLY'
      ? 0
      : policy.useSubjectMaxMarks
      ? Number(subject.maxExternalMarks ?? policy.externalMaxMarks)
      : Number(policy.externalMaxMarks);

  const totalMaxMarks = internalMax + externalMax;
  if (totalMaxMarks <= 0) {
    throw ApiError.badRequest(`Invalid subject/policy maximum marks configuration for ${subject.code}`);
  }

  const warnings = [];
  const attendanceState = externalEntry?.attendanceState || 'PRESENT';

  // Separate finalized/published internal assessments vs unfinalized draft/active components
  const eligibleAssessments = subjectAssessments.filter((a) =>
    ['FINALIZED', 'PUBLISHED'].includes(a.status)
  );
  const pendingAssessments = subjectAssessments.filter((a) =>
    ['DRAFT', 'ACTIVE'].includes(a.status)
  );

  if (pendingAssessments.length > 0) {
    warnings.push(
      `${pendingAssessments.length} internal assessment component(s) are not yet finalized (${pendingAssessments
        .map((p) => p.name)
        .join(', ')})`
    );
  }

  const eligibleAssessIds = new Set(eligibleAssessments.map((a) => String(a._id)));
  const eligibleMarks = studentSubjectMarks.filter(
    (m) => eligibleAssessIds.has(String(m.assessment)) && m.entryStatus !== 'DRAFT'
  );

  let internalMarks = 0;
  let internalMissing = false;
  const sourceAssessmentMarks = [];

  if (mode !== 'EXTERNAL_ONLY') {
    if (eligibleAssessments.length === 0 || eligibleMarks.length === 0) {
      internalMissing = true;
      warnings.push('No finalized/published internal assessment marks available');
    } else {
      if (policy.requireAllInternalAssessments && eligibleMarks.length < eligibleAssessments.length) {
        internalMissing = true;
        warnings.push('Missing marks for one or more finalized internal assessment components');
      }
      let rawObtained = 0;
      let rawMax = 0;
      const assessMap = new Map(eligibleAssessments.map((a) => [String(a._id), a]));
      for (const m of eligibleMarks) {
        const comp = assessMap.get(String(m.assessment));
        rawObtained += Number(m.marksObtained) || 0;
        rawMax += Number(m.maxMarks || comp?.maxMarks || 0);
        sourceAssessmentMarks.push({
          assessment: m.assessment,
          markId: m._id,
          name: comp?.name || 'Internal Component',
          obtained: m.marksObtained,
          maxMarks: m.maxMarks
        });
      }
      if (rawMax <= 0) {
        internalMissing = true;
        warnings.push('Invalid internal assessment maximum marks sum');
      } else {
        const scaledInternal = (rawObtained / rawMax) * internalMax * (policy.internalWeightage ?? 1);
        internalMarks = applyRounding(Math.min(internalMax, scaledInternal), policy.roundingPolicy);
      }
    }
  }

  let externalMarks = 0;
  let externalMissing = false;

  if (mode !== 'INTERNAL_ONLY') {
    if (attendanceState === 'ABSENT' || attendanceState === 'WITHHELD') {
      externalMarks = 0;
    } else if (externalEntry?.externalMarks !== undefined && externalEntry?.externalMarks !== null) {
      const extVal = Number(externalEntry.externalMarks);
      if (Number.isNaN(extVal) || extVal < 0) {
        throw ApiError.badRequest(`Negative external marks rejected for ${student.rollNumber}`);
      }
      if (extVal > externalMax) {
        throw ApiError.badRequest(
          `External marks (${extVal}) exceed configured maximum (${externalMax}) for ${student.rollNumber} in ${subject.code}`
        );
      }
      externalMarks = applyRounding(extVal * (policy.externalWeightage ?? 1), policy.roundingPolicy);
    } else {
      externalMissing = true;
      warnings.push('External examination marks not entered');
    }
  }

  if (attendanceState === 'ABSENT') {
    return {
      internalMarks,
      externalMarks: 0,
      totalMarks: internalMarks,
      internalMaxMarks: internalMax,
      externalMaxMarks: externalMax,
      maxMarks: totalMaxMarks,
      percentage: applyRounding((internalMarks / totalMaxMarks) * 100, 'DECIMAL_2'),
      grade: 'AB',
      gradePoints: 0,
      internalPass: internalMax > 0 ? (internalMarks / internalMax) * 100 >= policy.minInternalPassPercent : true,
      externalPass: false,
      attendanceState: 'ABSENT',
      resultStatus: 'ABSENT',
      calculationStatus: 'CALCULATED',
      validationWarnings: warnings,
      sourceAssessmentMarks,
      policySnapshot: createPolicySnapshot(policy)
    };
  }

  if (attendanceState === 'WITHHELD') {
    return {
      internalMarks,
      externalMarks: 0,
      totalMarks: 0,
      internalMaxMarks: internalMax,
      externalMaxMarks: externalMax,
      maxMarks: totalMaxMarks,
      percentage: 0,
      grade: 'WH',
      gradePoints: 0,
      internalPass: false,
      externalPass: false,
      attendanceState: 'WITHHELD',
      resultStatus: 'WITHHELD',
      calculationStatus: 'REQUIRES_REVIEW',
      validationWarnings: [...warnings, 'Result marks withheld for administrative review'],
      sourceAssessmentMarks,
      policySnapshot: createPolicySnapshot(policy)
    };
  }

  if (internalMissing || externalMissing) {
    return {
      internalMarks,
      externalMarks,
      totalMarks: applyRounding(internalMarks + externalMarks, policy.roundingPolicy),
      internalMaxMarks: internalMax,
      externalMaxMarks: externalMax,
      maxMarks: totalMaxMarks,
      percentage: 0,
      grade: 'IC',
      gradePoints: 0,
      internalPass: !internalMissing,
      externalPass: !externalMissing,
      attendanceState: 'PRESENT',
      resultStatus: 'INCOMPLETE',
      calculationStatus: 'REQUIRES_REVIEW',
      validationWarnings: warnings,
      sourceAssessmentMarks,
      policySnapshot: createPolicySnapshot(policy)
    };
  }

  const totalMarks = applyRounding(internalMarks + externalMarks, policy.roundingPolicy);
  const clampedTotal = Math.min(totalMaxMarks, totalMarks);
  const percentage = applyRounding((clampedTotal / totalMaxMarks) * 100, 'DECIMAL_2');

  const internalPct = internalMax > 0 ? (internalMarks / internalMax) * 100 : 100;
  const externalPct = externalMax > 0 ? (externalMarks / externalMax) * 100 : 100;

  const internalPass = internalPct >= (policy.minInternalPassPercent ?? 0);
  const externalPass = externalPct >= (policy.minExternalPassPercent ?? 0);
  const totalPass = percentage >= (policy.minTotalPassPercent ?? 40);

  const mapped = mapGradeFromBoundaries(percentage, policy.gradeBoundaries);
  const overallSubjectPass = internalPass && externalPass && totalPass && mapped.isPassing;

  if (!overallSubjectPass && mapped.isPassing) {
    warnings.push('Failed component minimum passing threshold despite aggregate percentage');
  }

  return {
    internalMarks,
    externalMarks,
    totalMarks: clampedTotal,
    internalMaxMarks: internalMax,
    externalMaxMarks: externalMax,
    maxMarks: totalMaxMarks,
    percentage,
    grade: overallSubjectPass ? mapped.grade : 'F',
    gradePoints: overallSubjectPass ? mapped.gradePoints : 0,
    internalPass,
    externalPass,
    attendanceState: 'PRESENT',
    resultStatus: overallSubjectPass ? 'PASS' : 'FAIL',
    calculationStatus: warnings.length > 0 ? 'REQUIRES_REVIEW' : 'CALCULATED',
    validationWarnings: warnings,
    sourceAssessmentMarks,
    policySnapshot: createPolicySnapshot(policy)
  };
};

export const checkCalculationReadiness = async (query) => {
  const scope = await loadScopeData({
    courseId: query.course,
    semesterId: query.semester,
    academicYear: query.academicYear,
    examinationId: query.examination,
    subjectId: query.subject,
    policyId: query.policyId
  });

  const existingMap = new Map(
    scope.existingResults.map((r) => [`${r.student}|${r.subject}`, r])
  );

  let readyPairsCount = 0;
  let incompleteInternalCount = 0;
  let alreadyPublishedCount = 0;
  let draftExistingCount = 0;

  const subjectIds = new Set();
  const studentIds = new Set();

  for (const pair of scope.pairs) {
    studentIds.add(String(pair.student._id));
    subjectIds.add(String(pair.subject._id));

    const ex = existingMap.get(`${pair.student._id}|${pair.subject._id}`);
    if (ex) {
      if (ex.publicationStatus === 'PUBLISHED') alreadyPublishedCount += 1;
      else draftExistingCount += 1;
    }

    const subAssessments = scope.assessments.filter(
      (a) => String(a.subject) === String(pair.subject._id) && ['FINALIZED', 'PUBLISHED'].includes(a.status)
    );
    const subMarks = scope.assessmentMarks.filter(
      (m) =>
        String(m.student) === String(pair.student._id) &&
        String(m.subject) === String(pair.subject._id) &&
        m.entryStatus !== 'DRAFT'
    );

    if (
      scope.policy.evaluationMode === 'EXTERNAL_ONLY' ||
      (subAssessments.length > 0 && subMarks.length > 0)
    ) {
      readyPairsCount += 1;
    } else {
      incompleteInternalCount += 1;
    }
  }

  return {
    examination: scope.examination,
    policy: scope.policy,
    totalEligiblePairs: scope.pairs.length,
    totalEligibleStudents: studentIds.size,
    totalSubjects: subjectIds.size,
    internalReadyCount: readyPairsCount,
    incompleteInternalCount,
    alreadyPublishedCount,
    draftExistingCount,
    rosterPreview: scope.pairs.slice(0, 50).map((p) => {
      const ex = existingMap.get(`${p.student._id}|${p.subject._id}`);
      return {
        studentId: p.student._id,
        rollNumber: p.student.rollNumber,
        studentName: `${p.student.firstName} ${p.student.lastName}`.trim(),
        subjectId: p.subject._id,
        subjectCode: p.subject.code,
        subjectName: p.subject.name,
        externalMaxMarks: p.subject.maxExternalMarks ?? scope.policy.externalMaxMarks,
        existingExternalMarks: ex ? ex.externalMarks : null,
        existingStatus: ex ? `${ex.calculationStatus} / ${ex.publicationStatus}` : null
      };
    })
  };
};

export const calculateResultsBulk = async (payload, actorUserId) => {
  const scope = await loadScopeData({
    courseId: payload.course,
    semesterId: payload.semester,
    academicYear: payload.academicYear,
    examinationId: payload.examination,
    subjectId: payload.subject,
    policyId: payload.policyId
  });

  if (scope.pairs.length === 0) {
    throw ApiError.badRequest('No active student enrollments found for the selected academic scope');
  }

  const externalMap = new Map();
  for (const item of payload.externalEntries || []) {
    externalMap.set(`${item.studentId}|${item.subjectId}`, item);
  }

  const existingMap = new Map(
    scope.existingResults.map((r) => [`${r.student}|${r.subject}`, r])
  );
  const assignFacultyMap = new Map(
    scope.assignments.map((a) => [String(a.subject), a.faculty])
  );

  const summary = {
    totalEligiblePairs: scope.pairs.length,
    calculatedCount: 0,
    requiresReviewCount: 0,
    incompleteCount: 0,
    skippedExistingCount: 0,
    failedCount: 0,
    results: [],
    failures: []
  };

  for (const { student, subject } of scope.pairs) {
    const pairKey = `${student._id}|${subject._id}`;
    const existing = existingMap.get(pairKey);

    if (
      existing &&
      (existing.publicationStatus === 'PUBLISHED' || existing.calculationStatus === 'APPROVED')
    ) {
      summary.skippedExistingCount += 1;
      continue;
    }

    const subjectAssessments = scope.assessments.filter((a) => String(a.subject) === String(subject._id));
    const studentSubjectMarks = scope.assessmentMarks.filter(
      (m) => String(m.student) === String(student._id) && String(m.subject) === String(subject._id)
    );
    const externalEntry = externalMap.get(pairKey) || null;

    let computed;
    try {
      computed = evaluatePairResult({
        student,
        subject,
        examination: scope.examination,
        policy: scope.policy,
        subjectAssessments,
        studentSubjectMarks,
        externalEntry
      });
    } catch (err) {
      summary.failedCount += 1;
      summary.failures.push({
        studentId: String(student._id),
        rollNumber: student.rollNumber,
        subjectCode: subject.code,
        reason: err.message
      });
      continue;
    }

    const evaluatedByFaculty =
      assignFacultyMap.get(String(subject._id)) ||
      studentSubjectMarks[0]?.faculty ||
      undefined;

    let savedDoc;
    if (existing) {
      const existingDoc = await Result.findById(existing._id);
      existingDoc.internalMarks = computed.internalMarks;
      existingDoc.externalMarks = computed.externalMarks;
      existingDoc.totalMarks = computed.totalMarks;
      existingDoc.internalMaxMarks = computed.internalMaxMarks;
      existingDoc.externalMaxMarks = computed.externalMaxMarks;
      existingDoc.maxMarks = computed.maxMarks;
      existingDoc.percentage = computed.percentage;
      existingDoc.grade = computed.grade;
      existingDoc.gradePoints = computed.gradePoints;
      existingDoc.internalPass = computed.internalPass;
      existingDoc.externalPass = computed.externalPass;
      existingDoc.attendanceState = computed.attendanceState;
      existingDoc.resultStatus = computed.resultStatus;
      existingDoc.calculationStatus = computed.calculationStatus;
      existingDoc.publicationStatus = 'UNPUBLISHED';
      existingDoc.validationWarnings = computed.validationWarnings;
      existingDoc.sourceAssessmentMarks = computed.sourceAssessmentMarks;
      existingDoc.policy = scope.policy._id;
      existingDoc.policySnapshot = computed.policySnapshot;
      existingDoc.calculationVersion = (existingDoc.calculationVersion || 1) + 1;
      existingDoc.calculatedBy = actorUserId;
      if (evaluatedByFaculty) existingDoc.evaluatedBy = evaluatedByFaculty;
      await existingDoc.save();
      savedDoc = existingDoc;
    } else {
      savedDoc = await Result.create({
        examination: scope.examination._id,
        student: student._id,
        course: scope.course._id,
        semester: scope.semester._id,
        academicYear: scope.semester.academicYear,
        subject: subject._id,
        evaluatedBy: evaluatedByFaculty,
        ...computed,
        policy: scope.policy._id,
        calculationVersion: 1,
        publicationStatus: 'UNPUBLISHED',
        calculatedBy: actorUserId
      });
    }

    summary.calculatedCount += 1;
    if (computed.calculationStatus === 'REQUIRES_REVIEW') summary.requiresReviewCount += 1;
    if (computed.resultStatus === 'INCOMPLETE') summary.incompleteCount += 1;
    summary.results.push(savedDoc._id);
  }

  if (summary.calculatedCount === 0 && summary.failedCount > 0 && summary.skippedExistingCount === 0) {
    throw ApiError.badRequest(summary.failures[0].reason, summary.failures);
  }

  return summary;
};

export const recalculateResults = async (payload, actorUserId) => {
  const updatedIds = [];
  for (const resultId of payload.resultIds) {
    const existing = await Result.findById(resultId);
    if (!existing) throw ApiError.notFound(`Result record ${resultId} not found`);

    const policy = payload.policyId
      ? await resolveEffectivePolicy({ policyId: payload.policyId })
      : await resolveEffectivePolicy({
          policyId: existing.policy,
          course: existing.course,
          semester: existing.semester,
          academicYear: existing.academicYear
        });

    const [student, subject, examination, subjectAssessments, studentSubjectMarks] = await Promise.all([
      Student.findById(existing.student).lean(),
      Subject.findById(existing.subject).lean(),
      Examination.findById(existing.examination).lean(),
      InternalAssessment.find({
        subject: existing.subject,
        semester: existing.semester,
        academicYear: existing.academicYear,
        isCancelled: false
      }).lean(),
      AssessmentMark.find({
        student: existing.student,
        subject: existing.subject,
        semester: existing.semester,
        academicYear: existing.academicYear
      }).lean()
    ]);

    const computed = evaluatePairResult({
      student,
      subject,
      examination,
      policy,
      subjectAssessments,
      studentSubjectMarks,
      externalEntry:
        policy.evaluationMode === 'INTERNAL_ONLY'
          ? { attendanceState: existing.attendanceState }
          : {
              externalMarks: existing.externalMarks,
              attendanceState: existing.attendanceState
            }
    });

    existing.revisionHistory.push(buildRevisionSnapshot(existing, payload.reason, actorUserId));
    existing.internalMarks = computed.internalMarks;
    existing.externalMarks = computed.externalMarks;
    existing.totalMarks = computed.totalMarks;
    existing.internalMaxMarks = computed.internalMaxMarks;
    existing.externalMaxMarks = computed.externalMaxMarks;
    existing.maxMarks = computed.maxMarks;
    existing.percentage = computed.percentage;
    existing.grade = computed.grade;
    existing.gradePoints = computed.gradePoints;
    existing.internalPass = computed.internalPass;
    existing.externalPass = computed.externalPass;
    existing.resultStatus = computed.resultStatus;
    existing.calculationStatus = computed.calculationStatus;
    existing.publicationStatus = 'UNPUBLISHED';
    existing.validationWarnings = computed.validationWarnings;
    existing.sourceAssessmentMarks = computed.sourceAssessmentMarks;
    existing.policy = policy._id;
    existing.policySnapshot = computed.policySnapshot;
    existing.calculationVersion = (existing.calculationVersion || 1) + 1;
    existing.calculatedBy = actorUserId;
    await existing.save();
    updatedIds.push(existing._id);
  }

  return { recalculatedCount: updatedIds.length, resultIds: updatedIds };
};

export const listResults = async (query = {}, user) => {
  const { page, limit, skip } = buildPagination(query.page, query.limit, 100);
  const sortSpec = buildSortSpec(query.sortBy, query.sortOrder, RESULT_SORT_MAP, { updatedAt: -1 });
  const andConditions = [];

  if (user.role === 'student') {
    if (!user.profileId) throw ApiError.forbidden('Student profile is not linked to this account');
    if (query.student && String(query.student) !== String(user.profileId)) {
      throw ApiError.forbidden('Students cannot inspect another student result records');
    }
    andConditions.push({ student: user.profileId, publicationStatus: 'PUBLISHED' });
  } else if (user.role === 'faculty') {
    if (!user.profileId) throw ApiError.forbidden('Faculty profile is not linked to this account');
    const assignments = await FacultyAssignment.find({ faculty: user.profileId, status: 'ACTIVE' })
      .select('subject semester academicYear')
      .lean();
    if (assignments.length === 0) {
      return { results: [], ...formatPaginationMeta(page, limit, 0) };
    }
    andConditions.push({
      $or: assignments.map((a) => ({
        subject: a.subject,
        semester: a.semester,
        academicYear: a.academicYear
      }))
    });
    if (query.student) andConditions.push({ student: query.student });
  } else if (query.student) {
    andConditions.push({ student: query.student });
  }

  if (query.course) andConditions.push({ course: query.course });
  if (query.semester) andConditions.push({ semester: query.semester });
  if (query.subject) andConditions.push({ subject: query.subject });
  if (query.examination) andConditions.push({ examination: query.examination });
  if (query.academicYear) andConditions.push({ academicYear: query.academicYear });
  if (query.resultStatus) andConditions.push({ resultStatus: query.resultStatus });
  if (query.calculationStatus) andConditions.push({ calculationStatus: query.calculationStatus });
  if (query.publicationStatus && user.role !== 'student') {
    andConditions.push({ publicationStatus: query.publicationStatus });
  }
  if (query.grade) andConditions.push({ grade: query.grade.toUpperCase() });

  if (query.department) {
    const courseIds = await Course.find({ department: query.department }).distinct('_id');
    andConditions.push({ course: { $in: courseIds } });
  }

  if (query.search) {
    const safeRegex = new RegExp(escapeRegex(query.search), 'i');
    const [stuIds, subIds] = await Promise.all([
      Student.find({
        $or: [
          { rollNumber: safeRegex },
          { enrollmentNumber: safeRegex },
          { firstName: safeRegex },
          { lastName: safeRegex }
        ]
      }).distinct('_id'),
      Subject.find({ $or: [{ code: safeRegex }, { name: safeRegex }] }).distinct('_id')
    ]);
    andConditions.push({
      $or: [{ student: { $in: stuIds } }, { subject: { $in: subIds } }]
    });
  }

  const filter = andConditions.length > 0 ? { $and: andConditions } : {};

  const [results, totalRecords] = await Promise.all([
    populateResultQuery(Result.find(filter).sort(sortSpec).skip(skip).limit(limit)).lean(),
    Result.countDocuments(filter)
  ]);

  return { results, ...formatPaginationMeta(page, limit, totalRecords) };
};

export const getResultById = async (id, user) => {
  const result = await populateResultQuery(Result.findById(id)).lean();
  if (!result) throw ApiError.notFound('Result record not found');

  if (user.role === 'student') {
    if (String(result.student?._id || result.student) !== String(user.profileId)) {
      throw ApiError.forbidden('You do not have permission to view another student result');
    }
    if (result.publicationStatus !== 'PUBLISHED') {
      throw ApiError.forbidden('This result has not been published yet');
    }
  } else if (user.role === 'faculty') {
    const hasAssign = await FacultyAssignment.exists({
      faculty: user.profileId,
      subject: result.subject?._id || result.subject,
      semester: result.semester?._id || result.semester,
      academicYear: result.academicYear,
      status: 'ACTIVE'
    });
    if (!hasAssign) {
      throw ApiError.forbidden('You do not have teaching assignment access to this result');
    }
  }

  return result;
};

export const approveResult = async (id, actorUserId) => {
  const resDoc = await Result.findById(id);
  if (!resDoc) throw ApiError.notFound('Result record not found');

  if (resDoc.resultStatus === 'INCOMPLETE' || resDoc.resultStatus === 'WITHHELD') {
    throw ApiError.badRequest(
      `Cannot approve result with status ${resDoc.resultStatus}. Resolve missing marks or withheld flags first.`
    );
  }
  if (!['CALCULATED', 'REQUIRES_REVIEW', 'REJECTED'].includes(resDoc.calculationStatus)) {
    throw ApiError.badRequest(`Result is already ${resDoc.calculationStatus}`);
  }

  resDoc.calculationStatus = 'APPROVED';
  resDoc.approvedBy = actorUserId;
  resDoc.approvedAt = new Date();
  await resDoc.save();
  return populateResultQuery(Result.findById(resDoc._id)).lean();
};

export const rejectResult = async (id, reason, actorUserId) => {
  const resDoc = await Result.findById(id);
  if (!resDoc) throw ApiError.notFound('Result record not found');
  if (resDoc.publicationStatus === 'PUBLISHED') {
    throw ApiError.badRequest('Withdraw published result before rejecting');
  }

  resDoc.calculationStatus = 'REJECTED';
  resDoc.rejectedBy = actorUserId;
  resDoc.rejectedAt = new Date();
  resDoc.rejectionReason = reason;
  await resDoc.save();
  return populateResultQuery(Result.findById(resDoc._id)).lean();
};

export const publishResult = async (id, actorUserId) => {
  const resDoc = await Result.findById(id);
  if (!resDoc) throw ApiError.notFound('Result record not found');

  if (resDoc.calculationStatus !== 'APPROVED') {
    throw ApiError.badRequest(
      `Result must be APPROVED before publication (current status: ${resDoc.calculationStatus})`
    );
  }
  if (resDoc.resultStatus === 'INCOMPLETE' || resDoc.resultStatus === 'WITHHELD') {
    throw ApiError.badRequest(`Cannot publish ${resDoc.resultStatus} result`);
  }

  resDoc.publicationStatus = 'PUBLISHED';
  resDoc.publishedBy = actorUserId;
  resDoc.publishedAt = new Date();
  await resDoc.save();
  return populateResultQuery(Result.findById(resDoc._id)).lean();
};

export const withdrawResult = async (id, reason, actorUserId) => {
  const resDoc = await Result.findById(id);
  if (!resDoc) throw ApiError.notFound('Result record not found');
  if (resDoc.publicationStatus !== 'PUBLISHED') {
    throw ApiError.badRequest('Only PUBLISHED results can be withdrawn');
  }

  resDoc.revisionHistory.push(buildRevisionSnapshot(resDoc, `Withdrawn: ${reason}`, actorUserId));
  resDoc.publicationStatus = 'WITHDRAWN';
  resDoc.withdrawnBy = actorUserId;
  resDoc.withdrawnAt = new Date();
  resDoc.withdrawalReason = reason;
  await resDoc.save();
  return populateResultQuery(Result.findById(resDoc._id)).lean();
};

export const batchApproveOrPublish = async (resultIds, mode, actorUserId) => {
  let processed = 0;
  const failures = [];
  for (const id of resultIds) {
    try {
      if (mode === 'APPROVE') await approveResult(id, actorUserId);
      else await publishResult(id, actorUserId);
      processed += 1;
    } catch (err) {
      failures.push({ id, reason: err.message });
    }
  }
  if (processed === 0 && failures.length > 0) {
    throw ApiError.badRequest(failures[0].reason, failures);
  }
  return { processedCount: processed, failedCount: failures.length, failures };
};

export const correctResult = async (id, payload, actorUserId) => {
  const existing = await Result.findById(id);
  if (!existing) throw ApiError.notFound('Result record not found');

  const snapshot = existing.policySnapshot || (await resolveEffectivePolicy({ policyId: existing.policy }));
  const nextInternal =
    payload.internalMarks !== undefined ? Number(payload.internalMarks) : existing.internalMarks;
  const nextExternal =
    payload.externalMarks !== undefined ? Number(payload.externalMarks) : existing.externalMarks;
  const nextAttendance = payload.attendanceState || existing.attendanceState || 'PRESENT';

  if (nextInternal > existing.internalMaxMarks) {
    throw ApiError.badRequest(`Internal marks (${nextInternal}) exceed subject cap (${existing.internalMaxMarks})`);
  }
  if (nextExternal > existing.externalMaxMarks) {
    throw ApiError.badRequest(`External marks (${nextExternal}) exceed subject cap (${existing.externalMaxMarks})`);
  }

  existing.revisionHistory.push(buildRevisionSnapshot(existing, payload.reason, actorUserId));

  const previous = {
    internalMarks: existing.internalMarks,
    externalMarks: existing.externalMarks,
    totalMarks: existing.totalMarks,
    grade: existing.grade,
    resultStatus: existing.resultStatus
  };

  existing.internalMarks = nextInternal;
  existing.externalMarks = nextAttendance === 'PRESENT' ? nextExternal : 0;
  existing.attendanceState = nextAttendance;
  if (payload.remarks !== undefined) existing.remarks = payload.remarks;

  if (nextAttendance === 'ABSENT') {
    existing.totalMarks = nextInternal;
    existing.percentage = applyRounding((nextInternal / existing.maxMarks) * 100, 'DECIMAL_2');
    existing.grade = 'AB';
    existing.gradePoints = 0;
    existing.resultStatus = 'ABSENT';
  } else if (nextAttendance === 'WITHHELD') {
    existing.totalMarks = 0;
    existing.percentage = 0;
    existing.grade = 'WH';
    existing.gradePoints = 0;
    existing.resultStatus = 'WITHHELD';
  } else {
    const total = applyRounding(nextInternal + nextExternal, snapshot.roundingPolicy || 'DECIMAL_2');
    const pct = applyRounding((total / existing.maxMarks) * 100, 'DECIMAL_2');
    const mapped = mapGradeFromBoundaries(pct, snapshot.gradeBoundaries);
    const intPass =
      existing.internalMaxMarks > 0
        ? (nextInternal / existing.internalMaxMarks) * 100 >= (snapshot.minInternalPassPercent ?? 0)
        : true;
    const extPass =
      existing.externalMaxMarks > 0
        ? (nextExternal / existing.externalMaxMarks) * 100 >= (snapshot.minExternalPassPercent ?? 0)
        : true;
    const totPass = pct >= (snapshot.minTotalPassPercent ?? 40);
    const pass = intPass && extPass && totPass && mapped.isPassing;

    existing.totalMarks = total;
    existing.percentage = pct;
    existing.internalPass = intPass;
    existing.externalPass = extPass;
    existing.grade = pass ? mapped.grade : 'F';
    existing.gradePoints = pass ? mapped.gradePoints : 0;
    existing.resultStatus = pass ? 'PASS' : 'FAIL';
  }

  existing.calculationVersion = (existing.calculationVersion || 1) + 1;
  existing.calculatedBy = actorUserId;
  await existing.save();

  const updated = await populateResultQuery(Result.findById(existing._id)).lean();
  return {
    result: updated,
    auditDetails: {
      previous,
      updated: {
        internalMarks: updated.internalMarks,
        externalMarks: updated.externalMarks,
        totalMarks: updated.totalMarks,
        grade: updated.grade,
        resultStatus: updated.resultStatus
      },
      reason: payload.reason
    }
  };
};

export const getStudentMyResults = async (user, query = {}) => {
  if (user.role !== 'student') {
    throw ApiError.forbidden('Only students can access personal published results here');
  }
  if (!user.profileId) {
    throw ApiError.notFound('Student profile not found');
  }

  const student = await Student.findById(user.profileId)
    .populate('department', 'code name')
    .populate('course', 'code name')
    .populate('semester', 'semesterNumber academicYear')
    .lean();
  if (!student) throw ApiError.notFound('Student record not found');

  const filter = { student: student._id, publicationStatus: 'PUBLISHED' };
  if (query.semester) filter.semester = query.semester;
  if (query.academicYear) filter.academicYear = query.academicYear;
  if (query.examination) filter.examination = query.examination;

  const results = await populateResultQuery(Result.find(filter).sort({ createdAt: -1 })).lean();

  // Group semester summaries cleanly; SGPA calculated only from documented formula when policy allows
  const semesterMap = new Map();
  for (const r of results) {
    const semKey = String(r.semester?._id || r.semester || 'unknown');
    if (!semesterMap.has(semKey)) {
      semesterMap.set(semKey, {
        semester: r.semester,
        academicYear: r.academicYear,
        subjectsCount: 0,
        passedCount: 0,
        failedCount: 0,
        totalMarksObtained: 0,
        totalMaxMarks: 0,
        sgpaItems: [],
        sgpaEligible: true,
        results: []
      });
    }
    const g = semesterMap.get(semKey);
    g.subjectsCount += 1;
    if (r.resultStatus === 'PASS') g.passedCount += 1;
    else if (r.resultStatus === 'FAIL' || r.resultStatus === 'ABSENT') g.failedCount += 1;
    g.totalMarksObtained += Number(r.totalMarks) || 0;
    g.totalMaxMarks += Number(r.maxMarks) || 100;
    if (r.policySnapshot?.sgpaEnabled === false) g.sgpaEligible = false;
    g.sgpaItems.push({ credits: r.subject?.credits || 0, gradePoints: r.gradePoints || 0 });
    g.results.push(r);
  }

  const semesterSummaries = [...semesterMap.values()].map((g) => ({
    semester: g.semester,
    academicYear: g.academicYear,
    subjectsCount: g.subjectsCount,
    passedCount: g.passedCount,
    failedCount: g.failedCount,
    totalMarksObtained: Number(g.totalMarksObtained.toFixed(2)),
    totalMaxMarks: Number(g.totalMaxMarks.toFixed(2)),
    percentage:
      g.totalMaxMarks > 0 ? Number(((g.totalMarksObtained / g.totalMaxMarks) * 100).toFixed(2)) : 0,
    sgpa: g.sgpaEligible && g.sgpaItems.length > 0 ? calculateSGPA(g.sgpaItems) : null,
    overallStatus: g.failedCount > 0 ? 'FAIL / REAPPEAR' : g.passedCount > 0 ? 'PASS' : 'PENDING'
  }));

  return {
    student,
    results,
    semesterSummaries,
    cgpa: null,
    cgpaNote: 'Multi-semester CGPA policy requires institutional cumulative backlog configuration.'
  };
};

export const getResultReportsOverview = async (query = {}) => {
  const match = {};
  if (query.course) match.course = new mongoose.Types.ObjectId(String(query.course));
  if (query.semester) match.semester = new mongoose.Types.ObjectId(String(query.semester));
  if (query.subject) match.subject = new mongoose.Types.ObjectId(String(query.subject));
  if (query.examination) match.examination = new mongoose.Types.ObjectId(String(query.examination));
  if (query.academicYear) match.academicYear = query.academicYear;

  const [countsAgg, gradeAgg, subjectAgg] = await Promise.all([
    Result.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalResults: { $sum: 1 },
          calculated: { $sum: { $cond: [{ $eq: ['$calculationStatus', 'CALCULATED'] }, 1, 0] } },
          requiresReview: { $sum: { $cond: [{ $eq: ['$calculationStatus', 'REQUIRES_REVIEW'] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ['$calculationStatus', 'APPROVED'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$calculationStatus', 'REJECTED'] }, 1, 0] } },
          published: { $sum: { $cond: [{ $eq: ['$publicationStatus', 'PUBLISHED'] }, 1, 0] } },
          unpublished: { $sum: { $cond: [{ $eq: ['$publicationStatus', 'UNPUBLISHED'] }, 1, 0] } },
          withdrawn: { $sum: { $cond: [{ $eq: ['$publicationStatus', 'WITHDRAWN'] }, 1, 0] } },
          passed: { $sum: { $cond: [{ $eq: ['$resultStatus', 'PASS'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$resultStatus', 'FAIL'] }, 1, 0] } },
          incomplete: { $sum: { $cond: [{ $eq: ['$resultStatus', 'INCOMPLETE'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$resultStatus', 'ABSENT'] }, 1, 0] } },
          withheld: { $sum: { $cond: [{ $eq: ['$resultStatus', 'WITHHELD'] }, 1, 0] } },
          averagePercentage: { $avg: '$percentage' }
        }
      }
    ]),
    Result.aggregate([
      { $match: match },
      { $group: { _id: '$grade', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),
    Result.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$subject',
          total: { $sum: 1 },
          passed: { $sum: { $cond: [{ $eq: ['$resultStatus', 'PASS'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$resultStatus', 'FAIL'] }, 1, 0] } },
          avgPercentage: { $avg: '$percentage' }
        }
      }
    ])
  ]);

  const subIds = subjectAgg.map((s) => s._id);
  const subjectsDocs = await Subject.find({ _id: { $in: subIds } }).select('code name').lean();
  const subMap = new Map(subjectsDocs.map((s) => [String(s._id), s]));

  const subjectSummaries = subjectAgg.map((s) => {
    const doc = subMap.get(String(s._id));
    return {
      subject: doc || { _id: s._id, code: '—', name: 'Unknown' },
      total: s.total,
      passed: s.passed,
      failed: s.failed,
      passRate: s.total > 0 ? Number(((s.passed / s.total) * 100).toFixed(1)) : 0,
      avgPercentage: s.avgPercentage ? Number(s.avgPercentage.toFixed(1)) : 0
    };
  });

  const summary = countsAgg[0] || {
    totalResults: 0,
    calculated: 0,
    requiresReview: 0,
    approved: 0,
    rejected: 0,
    published: 0,
    unpublished: 0,
    withdrawn: 0,
    passed: 0,
    failed: 0,
    incomplete: 0,
    absent: 0,
    withheld: 0,
    averagePercentage: 0
  };

  return {
    summary: {
      ...summary,
      averagePercentage: summary.averagePercentage ? Number(summary.averagePercentage.toFixed(1)) : 0
    },
    gradeDistribution: gradeAgg.map((g) => ({ grade: g._id, count: g.count })),
    subjectSummaries
  };
};
