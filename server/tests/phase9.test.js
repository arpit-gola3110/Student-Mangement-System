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

const runPhase9Tests = async () => {
  console.log('='.repeat(72));
  console.log('PHASE 9 EXAMINATION & INTERNAL ASSESSMENT INTEGRATION SUITE');
  console.log('='.repeat(72) + '\n');

  await connectDB();

  const tag = Date.now();
  const pw = 'StrongPass@123';

  const [adminUser, fac1User, fac2User, stu1User, stu2User, stuUnenrolledUser] = await User.create([
    { name: 'P9 Admin', email: `p9_admin_${tag}@aktu.test`, password: pw, role: 'admin', isActive: true },
    { name: 'P9 Fac1', email: `p9_fac1_${tag}@aktu.test`, password: pw, role: 'faculty', isActive: true },
    { name: 'P9 Fac2', email: `p9_fac2_${tag}@aktu.test`, password: pw, role: 'faculty', isActive: true },
    { name: 'P9 Stu1', email: `p9_stu1_${tag}@aktu.test`, password: pw, role: 'student', isActive: true },
    { name: 'P9 Stu2', email: `p9_stu2_${tag}@aktu.test`, password: pw, role: 'student', isActive: true },
    { name: 'P9 StuUn', email: `p9_stu_un_${tag}@aktu.test`, password: pw, role: 'student', isActive: true }
  ]);
  cleanup.userIds.push(
    adminUser._id,
    fac1User._id,
    fac2User._id,
    stu1User._id,
    stu2User._id,
    stuUnenrolledUser._id
  );
  cleanup.auditActorIds.push(adminUser._id, fac1User._id);

  const dept = await Department.create({
    code: `P9D${String(tag).slice(-5)}`,
    name: `P9 Dept ${tag}`,
    isActive: true
  });
  cleanup.deptIds.push(dept._id);

  const [course1, course2] = await Course.create([
    { code: `P9C1${String(tag).slice(-4)}`, name: 'B.Tech CSE P9', department: dept._id, isActive: true },
    { code: `P9C2${String(tag).slice(-4)}`, name: 'B.Tech IT P9', department: dept._id, isActive: true }
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

  const [sub1, sub2] = await Subject.create([
    { code: `P9S1${String(tag).slice(-4)}`, name: 'Algorithms', course: course1._id, semester: sem1._id, credits: 4, isActive: true },
    { code: `P9S2${String(tag).slice(-4)}`, name: 'Data Science', course: course2._id, semester: sem2._id, credits: 4, isActive: true }
  ]);
  cleanup.subjectIds.push(sub1._id, sub2._id);

  const [fac1, fac2] = await Faculty.create([
    {
      user: fac1User._id,
      employeeId: `P9F1${String(tag).slice(-5)}`,
      firstName: 'Arvind',
      lastName: 'Trivedi',
      department: dept._id,
      designation: 'PROFESSOR',
      contactNumber: '9876500001',
      status: 'ACTIVE'
    },
    {
      user: fac2User._id,
      employeeId: `P9F2${String(tag).slice(-5)}`,
      firstName: 'Kavita',
      lastName: 'Rao',
      department: dept._id,
      designation: 'ASSISTANT_PROFESSOR',
      contactNumber: '9876500002',
      status: 'ACTIVE'
    }
  ]);
  cleanup.facultyIds.push(fac1._id, fac2._id);

  const [stu1, stu2, stuUnenrolled] = await Student.create([
    {
      user: stu1User._id,
      rollNumber: `P9R1${String(tag).slice(-5)}`,
      enrollmentNumber: `P9E1${String(tag).slice(-5)}`,
      firstName: 'Dev',
      lastName: 'Kapoor',
      dateOfBirth: new Date('2004-03-10'),
      gender: 'MALE',
      department: dept._id,
      course: course1._id,
      semester: sem1._id,
      contactNumber: '9811000001',
      address: 'Lucknow',
      currentSemester: 5,
      academicYear: '2026-2027',
      status: 'ACTIVE'
    },
    {
      user: stu2User._id,
      rollNumber: `P9R2${String(tag).slice(-5)}`,
      enrollmentNumber: `P9E2${String(tag).slice(-5)}`,
      firstName: 'Ananya',
      lastName: 'Bose',
      dateOfBirth: new Date('2004-05-12'),
      gender: 'FEMALE',
      department: dept._id,
      course: course1._id,
      semester: sem1._id,
      contactNumber: '9811000002',
      address: 'Noida',
      currentSemester: 5,
      academicYear: '2026-2027',
      status: 'ACTIVE'
    },
    {
      user: stuUnenrolledUser._id,
      rollNumber: `P9RU${String(tag).slice(-5)}`,
      enrollmentNumber: `P9EU${String(tag).slice(-5)}`,
      firstName: 'Non',
      lastName: 'Enrolled',
      dateOfBirth: new Date('2004-06-20'),
      gender: 'MALE',
      department: dept._id,
      course: course2._id,
      semester: sem2._id,
      contactNumber: '9811000003',
      address: 'Kanpur',
      currentSemester: 5,
      academicYear: '2026-2027',
      status: 'ACTIVE'
    }
  ]);
  cleanup.studentIds.push(stu1._id, stu2._id, stuUnenrolled._id);

  const enr = await Enrollment.create([
    { student: stu1._id, course: course1._id, semester: sem1._id, subject: sub1._id, academicYear: '2026-2027', status: 'ACTIVE' },
    { student: stu2._id, course: course1._id, semester: sem1._id, subject: sub1._id, academicYear: '2026-2027', status: 'ACTIVE' }
  ]);
  cleanup.enrollmentIds.push(...enr.map((e) => e._id));

  const assign = await FacultyAssignment.create([
    { faculty: fac1._id, course: course1._id, semester: sem1._id, subject: sub1._id, section: 'A', academicYear: '2026-2027', status: 'ACTIVE' },
    { faculty: fac2._id, course: course2._id, semester: sem2._id, subject: sub2._id, section: 'A', academicYear: '2026-2027', status: 'ACTIVE' }
  ]);
  cleanup.assignmentIds.push(...assign.map((a) => a._id));

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
  // 1. EXAMINATION MANAGEMENT TESTS
  // =========================================================================
  const stuCreateExam = await httpReq(
    '/api/v1/examinations',
    opts(stu1Cookie, 'POST', {
      title: 'Unauthorized Exam',
      examType: 'MID_TERM',
      course: String(course1._id),
      semester: String(sem1._id),
      subject: String(sub1._id),
      academicYear: '2026-2027',
      examDate: '2026-10-15',
      maxMarks: 30
    })
  );
  check(stuCreateExam.status === 403, 'Exam RBAC: Student cannot create examination (403)');

  const facCreateExam = await httpReq(
    '/api/v1/examinations',
    opts(fac1Cookie, 'POST', {
      title: 'Faculty Exam Attempt',
      examType: 'MID_TERM',
      course: String(course1._id),
      semester: String(sem1._id),
      subject: String(sub1._id),
      academicYear: '2026-2027',
      examDate: '2026-10-15',
      maxMarks: 30
    })
  );
  check(facCreateExam.status === 403, 'Exam RBAC: Faculty cannot create admin examination config (403)');

  const invalidTimeExam = await httpReq(
    '/api/v1/examinations',
    opts(adminCookie, 'POST', {
      title: 'Invalid Time Exam',
      examType: 'MID_TERM',
      course: String(course1._id),
      semester: String(sem1._id),
      subject: String(sub1._id),
      academicYear: '2026-2027',
      examDate: '2026-10-15',
      startTime: '12:00',
      endTime: '10:00',
      maxMarks: 30
    })
  );
  check(invalidTimeExam.status === 422, 'Exam Validation: endTime earlier than startTime rejected (422)');

  const mismatchSubExam = await httpReq(
    '/api/v1/examinations',
    opts(adminCookie, 'POST', {
      title: 'Mismatched Subject Exam',
      examType: 'MID_TERM',
      course: String(course1._id),
      semester: String(sem1._id),
      subject: String(sub2._id),
      academicYear: '2026-2027',
      examDate: '2026-10-15',
      maxMarks: 30
    })
  );
  check(mismatchSubExam.status === 400, 'Exam Validation: Subject from another course rejected (400)');

  // Create valid examination as DRAFT
  const createExamRes = await httpReq(
    '/api/v1/examinations',
    opts(adminCookie, 'POST', {
      title: `Mid-Term Algorithms ${tag}`,
      examType: 'MID_TERM',
      course: String(course1._id),
      semester: String(sem1._id),
      subject: String(sub1._id),
      academicYear: '2026-2027',
      examDate: '2026-10-15',
      startTime: '10:00',
      endTime: '12:00',
      maxMarks: 30,
      status: 'DRAFT'
    })
  );
  const examId = createExamRes.data?.data?.examination?._id;
  if (examId) cleanup.examIds.push(examId);
  check(createExamRes.status === 201 && !!examId, 'Exam: Admin creates valid examination (201)');

  // Duplicate active examination blocked (409)
  const dupExam = await httpReq(
    '/api/v1/examinations',
    opts(adminCookie, 'POST', {
      title: `Mid-Term Algorithms ${tag}`,
      examType: 'MID_TERM',
      course: String(course1._id),
      semester: String(sem1._id),
      subject: String(sub1._id),
      academicYear: '2026-2027',
      examDate: '2026-10-15',
      maxMarks: 30
    })
  );
  check(dupExam.status === 409, 'Exam: Duplicate active examination prevented (409)');

  // DRAFT exam hidden from Student (403)
  const stuDraftExam = await httpReq(`/api/v1/examinations/${examId}`, opts(stu1Cookie));
  check(stuDraftExam.status === 403, 'Exam Visibility: DRAFT examination hidden from student (403)');

  // Invalid transition DRAFT -> PUBLISHED rejected (400)
  const invalidExamTrans = await httpReq(
    `/api/v1/examinations/${examId}/status`,
    opts(adminCookie, 'PATCH', { status: 'PUBLISHED' })
  );
  check(invalidExamTrans.status === 400, 'Exam Lifecycle: Direct DRAFT -> PUBLISHED rejected (400)');

  // Valid transition DRAFT -> SCHEDULED makes exam visible to enrolled student
  const schedExam = await httpReq(
    `/api/v1/examinations/${examId}/status`,
    opts(adminCookie, 'PATCH', { status: 'SCHEDULED' })
  );
  const stuViewSched = await httpReq('/api/v1/examinations', opts(stu1Cookie));
  check(
    schedExam.status === 200 &&
      (stuViewSched.data?.data?.examinations || []).some((e) => String(e._id) === String(examId)),
    'Exam Lifecycle: Transition DRAFT -> SCHEDULED succeeds & exposes exam to enrolled student'
  );

  // =========================================================================
  // 2. INTERNAL ASSESSMENT CONFIGURATION & VALIDATIONS
  // =========================================================================
  const overMaxAssess = await httpReq(
    '/api/v1/assessments',
    opts(adminCookie, 'POST', {
      name: `Too Big CT ${tag}`,
      componentType: 'CLASS_TEST',
      examination: examId,
      course: String(course1._id),
      semester: String(sem1._id),
      subject: String(sub1._id),
      academicYear: '2026-2027',
      maxMarks: 50
    })
  );
  check(overMaxAssess.status === 400, 'Assessment: Max marks exceeding parent exam maxMarks rejected (400)');

  const createAssessRes = await httpReq(
    '/api/v1/assessments',
    opts(adminCookie, 'POST', {
      name: `Class Test 1 ${tag}`,
      componentType: 'CLASS_TEST',
      examination: examId,
      course: String(course1._id),
      semester: String(sem1._id),
      subject: String(sub1._id),
      academicYear: '2026-2027',
      maxMarks: 20,
      assessmentDate: '2026-10-16',
      status: 'ACTIVE'
    })
  );
  const assessId = createAssessRes.data?.data?.assessment?._id;
  if (assessId) cleanup.assessmentIds.push(assessId);
  check(createAssessRes.status === 201 && !!assessId, 'Assessment: Admin creates valid component (201)');

  const dupAssess = await httpReq(
    '/api/v1/assessments',
    opts(adminCookie, 'POST', {
      name: `Class Test 1 ${tag}`,
      componentType: 'CLASS_TEST',
      course: String(course1._id),
      semester: String(sem1._id),
      subject: String(sub1._id),
      academicYear: '2026-2027',
      maxMarks: 20
    })
  );
  check(dupAssess.status === 409, 'Assessment: Duplicate component name prevented (409)');

  // Examination delete blocked once assessment linked (409)
  const delExamBlocked = await httpReq(`/api/v1/examinations/${examId}`, opts(adminCookie, 'DELETE'));
  check(delExamBlocked.status === 409, 'Exam Integrity: Delete blocked when assessment linked (409)');

  // =========================================================================
  // 3. FACULTY ACCESS SCOPING & MARKS VALIDATION
  // =========================================================================
  const fac2Roster = await httpReq(`/api/v1/assessments/${assessId}`, opts(fac2Cookie));
  check(fac2Roster.status === 403, 'Faculty RBAC: Unassigned faculty denied roster access (403)');

  const fac1Roster = await httpReq(`/api/v1/assessments/${assessId}`, opts(fac1Cookie));
  check(
    fac1Roster.status === 200 && fac1Roster.data?.data?.eligibleCount === 2,
    'Faculty RBAC: Assigned faculty loads 2 eligible enrolled students cleanly'
  );

  const negMarks = await httpReq(
    `/api/v1/assessments/${assessId}/marks/bulk`,
    opts(fac1Cookie, 'POST', {
      records: [{ studentId: String(stu1._id), marksObtained: -2 }]
    })
  );
  check(negMarks.status === 422, 'Marks Validation: Negative marks rejected (422)');

  const exceedMaxMarks = await httpReq(
    `/api/v1/assessments/${assessId}/marks/bulk`,
    opts(fac1Cookie, 'POST', {
      records: [{ studentId: String(stu1._id), marksObtained: 25 }]
    })
  );
  check(exceedMaxMarks.status === 400, 'Marks Validation: Marks exceeding component maxMarks (20) rejected (400)');

  const unenrolledMarks = await httpReq(
    `/api/v1/assessments/${assessId}/marks/bulk`,
    opts(fac1Cookie, 'POST', {
      records: [{ studentId: String(stuUnenrolled._id), marksObtained: 15 }]
    })
  );
  check(unenrolledMarks.status === 400, 'Marks Validation: Un-enrolled student rejected (400)');

  const dupStuBulk = await httpReq(
    `/api/v1/assessments/${assessId}/marks/bulk`,
    opts(fac1Cookie, 'POST', {
      records: [
        { studentId: String(stu1._id), marksObtained: 15 },
        { studentId: String(stu1._id), marksObtained: 16 }
      ]
    })
  );
  check(dupStuBulk.status === 400, 'Marks Validation: Duplicate student IDs in bulk request rejected (400)');

  const fac2SubmitMarks = await httpReq(
    `/api/v1/assessments/${assessId}/marks/bulk`,
    opts(fac2Cookie, 'POST', {
      records: [{ studentId: String(stu1._id), marksObtained: 15 }]
    })
  );
  check(fac2SubmitMarks.status === 403, 'Marks RBAC: Unassigned faculty cannot submit marks (403)');

  const stuSubmitMarks = await httpReq(
    `/api/v1/assessments/${assessId}/marks/bulk`,
    opts(stu1Cookie, 'POST', {
      records: [{ studentId: String(stu1._id), marksObtained: 20 }]
    })
  );
  check(stuSubmitMarks.status === 403, 'Marks RBAC: Student cannot submit marks (403)');

  // =========================================================================
  // 4. DRAFT, SUBMIT, DUPLICATE PREVENTION, FINALIZE, CORRECTION & AUDIT
  // =========================================================================
  // Save Draft first with decimal precision (16.5)
  const draftSave = await httpReq(
    `/api/v1/assessments/${assessId}/marks/bulk`,
    opts(fac1Cookie, 'POST', {
      entryStatus: 'DRAFT',
      records: [
        { studentId: String(stu1._id), marksObtained: 16.5, remarks: 'Good analysis' },
        { studentId: String(stu2._id), marksObtained: 18 }
      ]
    })
  );
  check(draftSave.status === 201 && draftSave.data?.data?.entryStatus === 'DRAFT', 'Marks: Draft save succeeds with decimal precision (201)');

  // Submit & Finalize from Draft
  const finalizeBulk = await httpReq(
    `/api/v1/assessments/${assessId}/marks/bulk`,
    opts(fac1Cookie, 'POST', {
      finalize: true,
      records: [
        { studentId: String(stu1._id), marksObtained: 17.5, remarks: 'Good analysis' },
        { studentId: String(stu2._id), marksObtained: 18 }
      ]
    })
  );
  check(
    finalizeBulk.status === 201 &&
      finalizeBulk.data?.data?.entryStatus === 'FINALIZED' &&
      finalizeBulk.data?.data?.assessmentStatus === 'FINALIZED',
    'Marks: Bulk submit & finalize succeeds (201)'
  );

  // Duplicate submission after finalization rejected (409)
  const dupSubmitAfterFin = await httpReq(
    `/api/v1/assessments/${assessId}/marks/bulk`,
    opts(fac1Cookie, 'POST', {
      records: [{ studentId: String(stu1._id), marksObtained: 19 }]
    })
  );
  check(dupSubmitAfterFin.status === 409, 'Marks: Duplicate / post-finalization bulk submission rejected (409)');

  // Reduce Exam maxMarks below recorded mark (18) blocked (409)
  const reduceExamMax = await httpReq(
    `/api/v1/examinations/${examId}`,
    opts(adminCookie, 'PATCH', { maxMarks: 15 })
  );
  check(reduceExamMax.status === 409, 'Exam Integrity: Reducing maxMarks below entered marks blocked (409)');

  // Unpublished FINALIZED marks hidden from Student!
  const unpublishedMyMarks = await httpReq('/api/v1/assessments/my-marks', opts(stu1Cookie));
  check(
    unpublishedMyMarks.status === 200 && (unpublishedMyMarks.data?.data?.marks || []).length === 0,
    'Student Visibility: Unpublished FINALIZED marks stay hidden from GET /my-marks'
  );

  // Controlled Correction Policy: Faculty blocked from editing FINALIZED mark directly (409)
  const stu1MarkDoc = await AssessmentMark.findOne({ assessment: assessId, student: stu1._id }).lean();
  const facEditFinalized = await httpReq(
    `/api/v1/assessments/marks/${stu1MarkDoc._id}`,
    opts(fac1Cookie, 'PATCH', { marksObtained: 19, reason: 'Trying without reopen' })
  );
  check(facEditFinalized.status === 409, 'Marks Correction: Faculty blocked on FINALIZED assessment (409)');

  // Admin publishes assessment -> Students see own published marks!
  const publishRes = await httpReq(
    `/api/v1/assessments/${assessId}/status`,
    opts(adminCookie, 'PATCH', { status: 'PUBLISHED' })
  );
  check(publishRes.status === 200 && publishRes.data?.data?.assessment?.status === 'PUBLISHED', 'Assessment: Admin publishes component');

  const stu1Published = await httpReq('/api/v1/assessments/my-marks', opts(stu1Cookie));
  const stu1MarkReturned = (stu1Published.data?.data?.marks || [])[0];
  check(
    stu1Published.status === 200 &&
      (stu1Published.data?.data?.marks || []).length === 1 &&
      stu1MarkReturned?.marksObtained === 17.5,
    'Student Visibility: Published marks visible to student with exact decimal (17.5)'
  );

  // Student ID manipulation rejected
  const stu2MarkDoc = await AssessmentMark.findOne({ assessment: assessId, student: stu2._id }).lean();
  const stuManipList = await httpReq(`/api/v1/assessments/marks?student=${stu2._id}`, opts(stu1Cookie));
  check(stuManipList.status === 403, 'Security: Student ?student=<other> rejected (403)');

  const stuManipGetId = await httpReq(`/api/v1/assessments/marks/${stu2MarkDoc._id}`, opts(stu1Cookie));
  check(stuManipGetId.status === 403, 'Security: Student GET /marks/:otherMarkId rejected (403)');

  const stuModifyMark = await httpReq(
    `/api/v1/assessments/marks/${stu1MarkDoc._id}`,
    opts(stu1Cookie, 'PATCH', { marksObtained: 20, reason: 'Self hack' })
  );
  check(stuModifyMark.status === 403, 'Security: Student cannot modify marks (403)');

  // Admin overrides published mark cleanly and preserves audit trail
  const adminOverride = await httpReq(
    `/api/v1/assessments/marks/${stu1MarkDoc._id}`,
    opts(adminCookie, 'PATCH', { marksObtained: 19, remarks: 'Re-totalling approved', reason: 'Q3 totalling discrepancy fixed' })
  );
  check(adminOverride.status === 200 && adminOverride.data?.data?.mark?.marksObtained === 19, 'Marks Correction: Admin override succeeds cleanly (200)');

  // Dashboard verification
  const [adminDash, facDash, stuDash] = await Promise.all([
    httpReq('/api/v1/dashboards/admin', opts(adminCookie)),
    httpReq('/api/v1/dashboards/faculty', opts(fac1Cookie)),
    httpReq('/api/v1/dashboards/student', opts(stu1Cookie))
  ]);
  check(
    adminDash.status === 200 &&
      adminDash.data?.data?.examinationSummary?.total >= 1 &&
      facDash.status === 200 &&
      facDash.data?.data?.assessmentOverview?.completedSubmissions >= 1 &&
      stuDash.status === 200 &&
      stuDash.data?.data?.publishedAssessmentsCount === 1,
    'Dashboards: Admin, Faculty, and Student dashboard stats include real Phase 9 exam & assessment counts'
  );

  await new Promise((r) => setTimeout(r, 350));
  const auditOverride = await AuditLog.findOne({
    actor: adminUser._id,
    action: 'OVERRIDE',
    entity: 'ASSESSMENT_MARK'
  }).lean();
  check(
    !!auditOverride &&
      auditOverride.details?.previousMarks === 17.5 &&
      auditOverride.details?.newMarks === 19 &&
      auditOverride.details?.reason === 'Q3 totalling discrepancy fixed',
    'AuditLog: Marks correction records previousMarks, newMarks, and reason without leakage'
  );

  // Teardown all test fixtures
  await AssessmentMark.deleteMany({ assessment: { $in: cleanup.assessmentIds } });
  await InternalAssessment.deleteMany({ _id: { $in: cleanup.assessmentIds } });
  await Examination.deleteMany({ _id: { $in: cleanup.examIds } });
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
  console.log(`PHASE 9 INTEGRATION SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(72));
  if (failed > 0) process.exit(1);
};

runPhase9Tests().catch(async (err) => {
  console.error('[Phase 9 Test Fatal Error]', err);
  if (server) await new Promise((resolve) => server.close(resolve));
  await closeDatabase();
  process.exit(1);
});
