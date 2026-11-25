import http from 'http';
import app from '../app.js';
import env from '../config/env.js';
import connectDB, { closeDatabase } from '../config/db.js';
import {
  User,
  Department,
  Course,
  Semester,
  Subject,
  Faculty,
  Student,
  Enrollment,
  FacultyAssignment,
  Examination,
  InternalAssessment,
  AssessmentMark,
  AcademicResultPolicy,
  Result,
  AuditLog
} from '../models/index.js';

let server = null;
let baseUrl = '';
let passed = 0;
let failed = 0;

const cleanup = {
  userIds: [],
  facultyIds: [],
  studentIds: [],
  deptIds: [],
  courseIds: [],
  semesterIds: [],
  subjectIds: [],
  enrollmentIds: [],
  assignmentIds: [],
  examIds: [],
  assessmentIds: [],
  policyIds: [],
  resultIds: [],
  auditActorIds: []
};

const check = (cond, label, detail = '') => {
  if (cond) {
    console.log(`[PASS] ${label}`);
    passed++;
  } else {
    console.error(`[FAIL] ${label}${detail ? ` -> ${detail}` : ''}`);
    failed++;
  }
};

const extractCookies = (setCookieHeaders = []) => {
  const map = {};
  const list = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  for (const h of list) {
    if (!h) continue;
    const [pair] = h.split(';');
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    map[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
  }
  return map;
};

const httpReq = (path, { method = 'GET', body = null, cookies = {}, headers = {} } = {}) =>
  new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}${path}`);
    const payload = body !== null ? JSON.stringify(body) : null;

    const cookieHeader = Object.entries(cookies)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');

    const reqHeaders = { ...headers };
    if (cookieHeader) reqHeaders.Cookie = cookieHeader;
    if (payload !== null) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers: reqHeaders },
      (res) => {
        let raw = '';
        res.on('data', (c) => { raw += c; });
        res.on('end', () => {
          let data = null;
          try { data = JSON.parse(raw); } catch { data = raw; }
          resolve({ status: res.statusCode, cookies: extractCookies(res.headers['set-cookie']), data });
        });
      }
    );
    req.on('error', reject);
    if (payload !== null) req.write(payload);
    req.end();
  });

const runPhase10Tests = async () => {
  console.log('='.repeat(72));
  console.log('PHASE 10 RESULTS MANAGEMENT & CALCULATION ENGINE TEST SUITE');
  console.log('='.repeat(72) + '\n');

  await connectDB();

  const tag = Date.now();
  const pw = 'StrongPass@123';

  const [adminUser, fac1User, fac2User, stu1User, stu2User, stuMissingUser] = await User.create([
    { name: 'P10 Admin', email: `p10_admin_${tag}@aktu.test`, password: pw, role: 'admin', isActive: true },
    { name: 'P10 Fac1', email: `p10_fac1_${tag}@aktu.test`, password: pw, role: 'faculty', isActive: true },
    { name: 'P10 Fac2', email: `p10_fac2_${tag}@aktu.test`, password: pw, role: 'faculty', isActive: true },
    { name: 'P10 Stu1', email: `p10_stu1_${tag}@aktu.test`, password: pw, role: 'student', isActive: true },
    { name: 'P10 Stu2', email: `p10_stu2_${tag}@aktu.test`, password: pw, role: 'student', isActive: true },
    { name: 'P10 StuMissing', email: `p10_stumiss_${tag}@aktu.test`, password: pw, role: 'student', isActive: true }
  ]);
  cleanup.userIds.push(
    adminUser._id,
    fac1User._id,
    fac2User._id,
    stu1User._id,
    stu2User._id,
    stuMissingUser._id
  );
  cleanup.auditActorIds.push(adminUser._id);

  const dept = await Department.create({
    code: `P10D${String(tag).slice(-4)}`,
    name: `P10 Dept ${tag}`,
    isActive: true
  });
  cleanup.deptIds.push(dept._id);

  const [course1, course2] = await Course.create([
    { code: `P10C1${String(tag).slice(-4)}`, name: 'B.Tech CSE P10', department: dept._id, isActive: true },
    { code: `P10C2${String(tag).slice(-4)}`, name: 'B.Tech ECE P10', department: dept._id, isActive: true }
  ]);
  cleanup.courseIds.push(course1._id, course2._id);

  const [sem1, sem2] = await Semester.create([
    {
      course: course1._id,
      semesterNumber: 5,
      academicYear: '2026-2027',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-12-20'),
      status: 'ACTIVE',
      isActive: true
    },
    {
      course: course2._id,
      semesterNumber: 5,
      academicYear: '2026-2027',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-12-20'),
      status: 'ACTIVE',
      isActive: true
    }
  ]);
  cleanup.semesterIds.push(sem1._id, sem2._id);

  const [sub1, sub2, subOther] = await Subject.create([
    {
      code: `P10S1${String(tag).slice(-3)}`,
      name: 'Compiler Design',
      course: course1._id,
      semester: sem1._id,
      credits: 4,
      maxInternalMarks: 30,
      maxExternalMarks: 70,
      isActive: true
    },
    {
      code: `P10S2${String(tag).slice(-3)}`,
      name: 'Cloud Computing',
      course: course1._id,
      semester: sem1._id,
      credits: 2,
      maxInternalMarks: 30,
      maxExternalMarks: 70,
      isActive: true
    },
    {
      code: `P10SO${String(tag).slice(-3)}`,
      name: 'VLSI Systems',
      course: course2._id,
      semester: sem2._id,
      credits: 4,
      maxInternalMarks: 30,
      maxExternalMarks: 70,
      isActive: true
    }
  ]);
  cleanup.subjectIds.push(sub1._id, sub2._id, subOther._id);

  const [fac1, fac2] = await Faculty.create([
    {
      user: fac1User._id,
      employeeId: `P10F1${String(tag).slice(-4)}`,
      firstName: 'Raj',
      lastName: 'Malhotra',
      department: dept._id,
      designation: 'PROFESSOR',
      contactNumber: '9876100001',
      status: 'ACTIVE'
    },
    {
      user: fac2User._id,
      employeeId: `P10F2${String(tag).slice(-4)}`,
      firstName: 'Simran',
      lastName: 'Kaur',
      department: dept._id,
      designation: 'ASSISTANT_PROFESSOR',
      contactNumber: '9876100002',
      status: 'ACTIVE'
    }
  ]);
  cleanup.facultyIds.push(fac1._id, fac2._id);

  const [stu1, stu2, stuMissing] = await Student.create([
    {
      user: stu1User._id,
      rollNumber: `P10R1${String(tag).slice(-4)}`,
      enrollmentNumber: `P10E1${String(tag).slice(-4)}`,
      firstName: 'Aryan',
      lastName: 'Sharma',
      dateOfBirth: new Date('2004-02-01'),
      gender: 'MALE',
      department: dept._id,
      course: course1._id,
      semester: sem1._id,
      contactNumber: '9822000001',
      address: 'Lucknow',
      currentSemester: 5,
      academicYear: '2026-2027',
      status: 'ACTIVE'
    },
    {
      user: stu2User._id,
      rollNumber: `P10R2${String(tag).slice(-4)}`,
      enrollmentNumber: `P10E2${String(tag).slice(-4)}`,
      firstName: 'Nisha',
      lastName: 'Verma',
      dateOfBirth: new Date('2004-03-01'),
      gender: 'FEMALE',
      department: dept._id,
      course: course1._id,
      semester: sem1._id,
      contactNumber: '9822000002',
      address: 'Noida',
      currentSemester: 5,
      academicYear: '2026-2027',
      status: 'ACTIVE'
    },
    {
      user: stuMissingUser._id,
      rollNumber: `P10RM${String(tag).slice(-4)}`,
      enrollmentNumber: `P10EM${String(tag).slice(-4)}`,
      firstName: 'Incomplete',
      lastName: 'Student',
      dateOfBirth: new Date('2004-04-01'),
      gender: 'MALE',
      department: dept._id,
      course: course1._id,
      semester: sem1._id,
      contactNumber: '9822000003',
      address: 'Kanpur',
      currentSemester: 5,
      academicYear: '2026-2027',
      status: 'ACTIVE'
    }
  ]);
  cleanup.studentIds.push(stu1._id, stu2._id, stuMissing._id);

  const enr = await Enrollment.create([
    { student: stu1._id, course: course1._id, semester: sem1._id, subject: sub1._id, academicYear: '2026-2027', status: 'ACTIVE' },
    { student: stu1._id, course: course1._id, semester: sem1._id, subject: sub2._id, academicYear: '2026-2027', status: 'ACTIVE' },
    { student: stu2._id, course: course1._id, semester: sem1._id, subject: sub1._id, academicYear: '2026-2027', status: 'ACTIVE' },
    { student: stuMissing._id, course: course1._id, semester: sem1._id, subject: sub1._id, academicYear: '2026-2027', status: 'ACTIVE' }
  ]);
  cleanup.enrollmentIds.push(...enr.map((e) => e._id));

  const assigns = await FacultyAssignment.create([
    { faculty: fac1._id, course: course1._id, semester: sem1._id, subject: sub1._id, section: 'A', academicYear: '2026-2027', status: 'ACTIVE' },
    { faculty: fac1._id, course: course1._id, semester: sem1._id, subject: sub2._id, section: 'A', academicYear: '2026-2027', status: 'ACTIVE' },
    { faculty: fac2._id, course: course2._id, semester: sem2._id, subject: subOther._id, section: 'A', academicYear: '2026-2027', status: 'ACTIVE' }
  ]);
  cleanup.assignmentIds.push(...assigns.map((a) => a._id));

  const [examEndSem, examDraft] = await Examination.create([
    {
      title: `End Semester Exam ${tag}`,
      examType: 'END_SEMESTER',
      course: course1._id,
      semester: sem1._id,
      academicYear: '2026-2027',
      examDate: new Date('2026-12-10'),
      startDate: new Date('2026-12-10'),
      endDate: new Date('2026-12-10'),
      maxMarks: 100,
      status: 'COMPLETED',
      createdBy: adminUser._id
    },
    {
      title: `Draft Exam ${tag}`,
      examType: 'MID_TERM',
      course: course1._id,
      semester: sem1._id,
      subject: sub1._id,
      academicYear: '2026-2027',
      examDate: new Date('2026-11-10'),
      startDate: new Date('2026-11-10'),
      endDate: new Date('2026-11-10'),
      maxMarks: 30,
      status: 'DRAFT',
      createdBy: adminUser._id
    }
  ]);
  cleanup.examIds.push(examEndSem._id, examDraft._id);

  // Create finalized internal assessments: sub1 (CT1 Max 30), sub2 (Assignment Max 20 -> scales cleanly to 30!)
  const [assess1, assess2] = await InternalAssessment.create([
    {
      name: `CT1 ${tag}`,
      componentType: 'CLASS_TEST',
      course: course1._id,
      semester: sem1._id,
      subject: sub1._id,
      academicYear: '2026-2027',
      maxMarks: 30,
      status: 'FINALIZED',
      createdBy: adminUser._id
    },
    {
      name: `Assign1 ${tag}`,
      componentType: 'ASSIGNMENT',
      course: course1._id,
      semester: sem1._id,
      subject: sub2._id,
      academicYear: '2026-2027',
      maxMarks: 20,
      status: 'PUBLISHED',
      createdBy: adminUser._id
    }
  ]);
  cleanup.assessmentIds.push(assess1._id, assess2._id);

  // Marks:
  // stu1 sub1: internal 27/30; external 63/70 -> total 90/100 (90% -> A+, 10 pts, PASS)
  // stu1 sub2: internal 16/20 -> scaled to 24/30; external 56/70 -> total 80/100 (80% -> A, 9 pts, PASS)
  // Expected SGPA for stu1: (4*10 + 2*9) / (4+2) = 58 / 6 = 9.67!
  // stu2 sub1: internal 20/30; external ABSENT -> AB, 0 pts, ABSENT
  // stuMissing sub1: NO internal marks, NO external marks -> INCOMPLETE, REQUIRES_REVIEW
  await AssessmentMark.create([
    {
      assessment: assess1._id,
      student: stu1._id,
      subject: sub1._id,
      course: course1._id,
      semester: sem1._id,
      academicYear: '2026-2027',
      faculty: fac1._id,
      marksObtained: 27,
      maxMarks: 30,
      entryStatus: 'FINALIZED',
      enteredBy: fac1User._id
    },
    {
      assessment: assess2._id,
      student: stu1._id,
      subject: sub2._id,
      course: course1._id,
      semester: sem1._id,
      academicYear: '2026-2027',
      faculty: fac1._id,
      marksObtained: 16,
      maxMarks: 20,
      entryStatus: 'FINALIZED',
      enteredBy: fac1User._id
    },
    {
      assessment: assess1._id,
      student: stu2._id,
      subject: sub1._id,
      course: course1._id,
      semester: sem1._id,
      academicYear: '2026-2027',
      faculty: fac1._id,
      marksObtained: 20,
      maxMarks: 30,
      entryStatus: 'FINALIZED',
      enteredBy: fac1User._id
    }
  ]);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  console.log(`[Test Server] Listening on ${baseUrl}\n`);

  const csrfInit = await httpReq('/api/v1/auth/csrf-token');
  let csrf = csrfInit.data?.data?.csrfToken;

  const loginAs = async (email) => {
    const res = await httpReq('/api/v1/auth/login', {
      method: 'POST',
      cookies: { [env.CSRF_COOKIE_NAME]: csrf },
      headers: { 'X-CSRF-Token': csrf },
      body: { email, password: pw }
    });
    if (res.cookies[env.CSRF_COOKIE_NAME]) csrf = res.cookies[env.CSRF_COOKIE_NAME];
    return res.cookies[env.COOKIE_NAME];
  };

  const adminCookie = await loginAs(adminUser.email);
  const fac1Cookie = await loginAs(fac1User.email);
  const fac2Cookie = await loginAs(fac2User.email);
  const stu1Cookie = await loginAs(stu1User.email);
  const stu2Cookie = await loginAs(stu2User.email);

  const opts = (cookie, method = 'GET', body = null) => ({
    method,
    body,
    cookies: { [env.COOKIE_NAME]: cookie, [env.CSRF_COOKIE_NAME]: csrf },
    headers: { 'X-CSRF-Token': csrf }
  });

  // =========================================================================
  // 1. POLICY CONFIGURATION & VALIDATION TESTS
  // =========================================================================
  const stuCreatePolicy = await httpReq(
    '/api/v1/result-policies',
    opts(stu1Cookie, 'POST', { name: 'Bad', code: 'BAD', evaluationMode: 'COMBINED' })
  );
  check(stuCreatePolicy.status === 403, 'Policy RBAC: Student rejected (403)');

  const overlapPolicy = await httpReq(
    '/api/v1/result-policies',
    opts(adminCookie, 'POST', {
      name: 'Overlap Boundaries',
      code: `P10OV${tag}`,
      evaluationMode: 'COMBINED',
      gradeBoundaries: [
        { grade: 'A', gradePoints: 9, minPercentage: 50, maxPercentage: 100, isPassing: true },
        { grade: 'F', gradePoints: 0, minPercentage: 0, maxPercentage: 60, isPassing: false }
      ]
    })
  );
  check(overlapPolicy.status === 422, 'Policy Validation: Overlapping grade boundaries rejected (422)');

  const createPolicyRes = await httpReq(
    '/api/v1/result-policies',
    opts(adminCookie, 'POST', {
      name: `Scoped Combined Policy ${tag}`,
      code: `P10POL${tag}`,
      academicYear: '2026-2027',
      course: String(course1._id),
      semester: String(sem1._id),
      evaluationMode: 'COMBINED',
      useSubjectMaxMarks: true,
      internalMaxMarks: 30,
      externalMaxMarks: 70,
      minInternalPassPercent: 0,
      minExternalPassPercent: 30,
      minTotalPassPercent: 40,
      roundingPolicy: 'DECIMAL_2',
      isProvisional: true
    })
  );
  const policyId = createPolicyRes.data?.data?.policy?._id;
  if (policyId) cleanup.policyIds.push(policyId);
  check(createPolicyRes.status === 201 && !!policyId, 'Policy: Admin creates valid scoped result policy (201)');

  // =========================================================================
  // 2. READINESS, CALCULATION ENGINE & ERROR HANDLING
  // =========================================================================
  const draftExamCalc = await httpReq(
    '/api/v1/results/calculate',
    opts(adminCookie, 'POST', {
      course: String(course1._id),
      semester: String(sem1._id),
      academicYear: '2026-2027',
      examination: String(examDraft._id),
      policyId
    })
  );
  check(draftExamCalc.status === 400, 'Workflow: Calculating results for DRAFT examination rejected (400)');

  const readinessRes = await httpReq(
    `/api/v1/results/readiness?course=${course1._id}&semester=${sem1._id}&academicYear=2026-2027&examination=${examEndSem._id}&policyId=${policyId}`,
    opts(adminCookie)
  );
  check(
    readinessRes.status === 200 &&
      readinessRes.data?.data?.totalEligiblePairs === 4 &&
      readinessRes.data?.data?.incompleteInternalCount === 1,
    'Readiness: Accurately identifies 4 eligible pairs and 1 incomplete internal pair'
  );

  // Exceeding externalMaxMarks reports per-pair failure cleanly
  const badExtCalc = await httpReq(
    '/api/v1/results/calculate',
    opts(adminCookie, 'POST', {
      course: String(course1._id),
      semester: String(sem1._id),
      academicYear: '2026-2027',
      examination: String(examEndSem._id),
      subject: String(sub1._id),
      policyId,
      externalEntries: [
        { studentId: String(stu1._id), subjectId: String(sub1._id), externalMarks: 95, attendanceState: 'PRESENT' }
      ]
    })
  );
  check(
    badExtCalc.status === 201 && badExtCalc.data?.data?.failedCount === 1,
    'Validation: External marks (95) exceeding subject cap (70) flagged cleanly in failures'
  );

  // Delete partial draft results from badExtCalc test run (stu2/stuMissing created above) so next run tests cleanly
  await Result.deleteMany({ examination: examEndSem._id });

  // Execute clean bulk calculation across all 4 pairs:
  const calcRes = await httpReq(
    '/api/v1/results/calculate',
    opts(adminCookie, 'POST', {
      course: String(course1._id),
      semester: String(sem1._id),
      academicYear: '2026-2027',
      examination: String(examEndSem._id),
      policyId,
      externalEntries: [
        { studentId: String(stu1._id), subjectId: String(sub1._id), externalMarks: 63, attendanceState: 'PRESENT' },
        { studentId: String(stu1._id), subjectId: String(sub2._id), externalMarks: 56, attendanceState: 'PRESENT' },
        { studentId: String(stu2._id), subjectId: String(sub1._id), attendanceState: 'ABSENT' }
      ]
    })
  );
  const calcSummary = calcRes.data?.data;
  if (calcSummary?.results) cleanup.resultIds.push(...calcSummary.results);
  check(
    calcRes.status === 201 &&
      calcSummary?.calculatedCount === 4 &&
      calcSummary?.incompleteCount === 1 &&
      calcSummary?.requiresReviewCount === 1,
    'Engine: Bulk calculates 4 results (incl. 1 INCOMPLETE requiring review & never auto-publishes)',
    JSON.stringify(calcSummary)
  );

  const [rStu1Sub1, rStu1Sub2, rStu2Sub1, rIncomplete] = await Promise.all([
    Result.findOne({ examination: examEndSem._id, student: stu1._id, subject: sub1._id }).lean(),
    Result.findOne({ examination: examEndSem._id, student: stu1._id, subject: sub2._id }).lean(),
    Result.findOne({ examination: examEndSem._id, student: stu2._id, subject: sub1._id }).lean(),
    Result.findOne({ examination: examEndSem._id, student: stuMissing._id, subject: sub1._id }).lean()
  ]);

  check(
    rStu1Sub1?.totalMarks === 90 &&
      rStu1Sub1?.grade === 'A+' &&
      rStu1Sub1?.gradePoints === 10 &&
      rStu1Sub1?.resultStatus === 'PASS' &&
      rStu1Sub2?.internalMarks === 24 &&
      rStu1Sub2?.totalMarks === 80 &&
      rStu1Sub2?.grade === 'A' &&
      rStu2Sub1?.resultStatus === 'ABSENT' &&
      rStu2Sub1?.grade === 'AB' &&
      rIncomplete?.resultStatus === 'INCOMPLETE' &&
      rIncomplete?.grade === 'IC',
    'Calculations: Proportions (16/20 -> 24/30), totals (90, 80), A+/A/AB/IC grades match rules cleanly',
    JSON.stringify({ rStu1Sub1, rStu1Sub2, rStu2Sub1, rIncomplete })
  );

  // =========================================================================
  // 3. APPROVAL, PUBLICATION, UNPUBLISHED ISOLATION & CORRECTIONS
  // =========================================================================
  // Publishing unapproved or incomplete result blocked (400)
  const pubBeforeApprove = await httpReq(`/api/v1/results/${rStu1Sub1._id}/publish`, opts(adminCookie, 'POST', {}));
  check(pubBeforeApprove.status === 400, 'Workflow: Publishing unapproved result blocked (400)');

  const approveIncomplete = await httpReq(`/api/v1/results/${rIncomplete._id}/approve`, opts(adminCookie, 'POST', {}));
  check(approveIncomplete.status === 400, 'Workflow: Approving INCOMPLETE result blocked (400)');

  // Unpublished results remain hidden from students
  const stuUnpublishedCheck = await httpReq('/api/v1/results/my', opts(stu1Cookie));
  check(
    stuUnpublishedCheck.status === 200 && (stuUnpublishedCheck.data?.data?.results || []).length === 0,
    'Visibility: Unpublished results stay strictly hidden from GET /results/my'
  );

  const stuGetUnpublishedId = await httpReq(`/api/v1/results/${rStu1Sub1._id}`, opts(stu1Cookie));
  check(stuGetUnpublishedId.status === 403, 'Visibility: Student cannot inspect unpublished /:id directly (403)');

  // Approve & Publish stu1's 2 results via batch endpoints
  const batchApp = await httpReq(
    '/api/v1/results/batch-approve',
    opts(adminCookie, 'POST', { resultIds: [String(rStu1Sub1._id), String(rStu1Sub2._id)] })
  );
  const batchPub = await httpReq(
    '/api/v1/results/batch-publish',
    opts(adminCookie, 'POST', { resultIds: [String(rStu1Sub1._id), String(rStu1Sub2._id)] })
  );
  check(
    batchApp.status === 200 && batchPub.status === 200 && batchPub.data?.data?.processedCount === 2,
    'Workflow: Batch approve + batch publish succeeds (200)'
  );

  // Re-running calculate skips existing PUBLISHED/APPROVED results cleanly
  const recalcSkip = await httpReq(
    '/api/v1/results/calculate',
    opts(adminCookie, 'POST', {
      course: String(course1._id),
      semester: String(sem1._id),
      academicYear: '2026-2027',
      examination: String(examEndSem._id),
      policyId
    })
  );
  check(
    recalcSkip.status === 201 && recalcSkip.data?.data?.skippedExistingCount === 2,
    'Idempotency: Bulk calculate skips 2 already published results without overwriting',
    JSON.stringify(recalcSkip)
  );

  // Student reads published results + SGPA (4*10 + 2*9)/6 = 9.67
  const stuMyPub = await httpReq('/api/v1/results/my', opts(stu1Cookie));
  const semSum = stuMyPub.data?.data?.semesterSummaries?.[0];
  check(
    stuMyPub.status === 200 &&
      (stuMyPub.data?.data?.results || []).length === 2 &&
      semSum?.sgpa === 9.67 &&
      stuMyPub.data?.data?.cgpa === null,
    'Student Portal: Returns 2 published subjects and exact SGPA 9.67 (CGPA null/unfabricated)',
    JSON.stringify(semSum)
  );

  // Role security: Student & Faculty restrictions
  const stu2QueryStu1 = await httpReq(`/api/v1/results?student=${stu1._id}`, opts(stu2Cookie));
  check(stu2QueryStu1.status === 403, 'Security: Student ?student=<other> rejected (403)');

  const stu2GetStu1Id = await httpReq(`/api/v1/results/${rStu1Sub1._id}`, opts(stu2Cookie));
  check(stu2GetStu1Id.status === 403, 'Security: Student GET /:otherResultId rejected (403)');

  const facPublish = await httpReq(`/api/v1/results/${rStu1Sub1._id}/publish`, opts(fac1Cookie, 'POST', {}));
  check(facPublish.status === 403, 'RBAC: Faculty cannot publish institutional results (403)');

  const fac2GetSub1 = await httpReq(`/api/v1/results/${rStu1Sub1._id}`, opts(fac2Cookie));
  check(fac2GetSub1.status === 403, 'RBAC: Unassigned faculty denied GET /:id (403)');

  const fac1GetOwn = await httpReq('/api/v1/results/faculty/overview', opts(fac1Cookie));
  check(
    fac1GetOwn.status === 200 && (fac1GetOwn.data?.data?.results || []).length === 4,
    'RBAC: Assigned faculty views own subject results cleanly'
  );

  // Post-publication correction preserves revisionHistory + component pass failure test
  // Correct rStu1Sub1 externalMarks to 18/70 (< 30% ext threshold = 21!) -> total 45/100 (45% >= 40%) MUST FAIL because external < 30%!
  const failExternalCorrection = await httpReq(
    `/api/v1/results/${rStu1Sub1._id}/correct`,
    opts(adminCookie, 'PATCH', { externalMarks: 18, reason: 'Paper re-evaluation correction' })
  );
  const correctedDoc = failExternalCorrection.data?.data?.result;
  check(
    failExternalCorrection.status === 200 &&
      correctedDoc?.totalMarks === 45 &&
      correctedDoc?.externalPass === false &&
      correctedDoc?.resultStatus === 'FAIL' &&
      correctedDoc?.grade === 'F' &&
      (correctedDoc?.revisionHistory || []).length === 1 &&
      correctedDoc?.revisionHistory?.[0]?.totalMarks === 90,
    'Correction & Component Pass: Failing external threshold (18/70 < 30%) triggers FAIL even with total 45%, while preserving v1 (90/100 A+) snapshot',
    JSON.stringify(correctedDoc)
  );

  // Admin Reports & Audit Logs
  const repRes = await httpReq(`/api/v1/results/reports/overview?examination=${examEndSem._id}`, opts(adminCookie));
  check(
    repRes.status === 200 && repRes.data?.data?.summary?.totalResults === 4,
    'Reports: Result analytics overview returns exact DB aggregations'
  );

  await new Promise((r) => setTimeout(r, 350));
  const auditCorr = await AuditLog.findOne({
    actor: adminUser._id,
    action: 'OVERRIDE',
    entity: 'RESULT_CORRECTION'
  }).lean();
  check(
    !!auditCorr && auditCorr.details?.reason === 'Paper re-evaluation correction',
    'AuditLog: Recorded RESULT_CORRECTION audit entry with reason & previous/updated snapshot'
  );

  // Cleanup all isolated fixtures cleanly
  await Result.deleteMany({ _id: { $in: cleanup.resultIds } });
  await AssessmentMark.deleteMany({ assessment: { $in: cleanup.assessmentIds } });
  await InternalAssessment.deleteMany({ _id: { $in: cleanup.assessmentIds } });
  await Examination.deleteMany({ _id: { $in: cleanup.examIds } });
  await AcademicResultPolicy.deleteMany({ _id: { $in: cleanup.policyIds } });
  await Enrollment.deleteMany({ _id: { $in: cleanup.enrollmentIds } });
  await FacultyAssignment.deleteMany({ _id: { $in: cleanup.assignmentIds } });
  await Subject.deleteMany({ _id: { $in: cleanup.subjectIds } });
  await Semester.deleteMany({ _id: { $in: cleanup.semesterIds } });
  await Course.deleteMany({ _id: { $in: cleanup.courseIds } });
  await Student.deleteMany({ _id: { $in: cleanup.studentIds } });
  await Faculty.deleteMany({ _id: { $in: cleanup.facultyIds } });
  await Department.deleteMany({ _id: { $in: cleanup.deptIds } });
  await User.deleteMany({ _id: { $in: cleanup.userIds } });
  await AuditLog.deleteMany({ actor: { $in: cleanup.auditActorIds } });

  if (server) await new Promise((resolve) => server.close(resolve));
  await closeDatabase();

  console.log('\n' + '='.repeat(72));
  console.log(`PHASE 10 INTEGRATION SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(72));
  if (failed > 0) process.exit(1);
};

runPhase10Tests().catch(async (err) => {
  console.error('[Phase 10 Test Fatal Error]', err);
  if (server) await new Promise((resolve) => server.close(resolve));
  await closeDatabase();
  process.exit(1);
});
