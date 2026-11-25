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
  Attendance,
  AttendanceSession,
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
  sessionIds: [],
  attendanceIds: [],
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

const runPhase8Tests = async () => {
  console.log('='.repeat(72));
  console.log('PHASE 8 ATTENDANCE MANAGEMENT INTEGRATION & POLICY SUITE');
  console.log('='.repeat(72) + '\n');

  await connectDB();

  const tag = Date.now();
  const pw = 'StrongPass@123';

  const [adminUser, fac1User, fac2User, stu1User, stu2User, stuUnenrolledUser, stuNoAttUser] = await User.create([
    { name: 'P8 Admin', email: `p8_admin_${tag}@aktu.test`, password: pw, role: 'admin', isActive: true },
    { name: 'P8 Faculty One', email: `p8_fac1_${tag}@aktu.test`, password: pw, role: 'faculty', isActive: true },
    { name: 'P8 Faculty Two', email: `p8_fac2_${tag}@aktu.test`, password: pw, role: 'faculty', isActive: true },
    { name: 'P8 Student One', email: `p8_stu1_${tag}@aktu.test`, password: pw, role: 'student', isActive: true },
    { name: 'P8 Student Two', email: `p8_stu2_${tag}@aktu.test`, password: pw, role: 'student', isActive: true },
    { name: 'P8 Student Unenrolled', email: `p8_stu_un_${tag}@aktu.test`, password: pw, role: 'student', isActive: true },
    { name: 'P8 Student ZeroData', email: `p8_stu_zero_${tag}@aktu.test`, password: pw, role: 'student', isActive: true }
  ]);
  cleanup.userIds.push(
    adminUser._id,
    fac1User._id,
    fac2User._id,
    stu1User._id,
    stu2User._id,
    stuUnenrolledUser._id,
    stuNoAttUser._id
  );
  cleanup.auditActorIds.push(adminUser._id, fac1User._id);

  const dept = await Department.create({
    code: `P8D${String(tag).slice(-5)}`,
    name: `P8 Department ${tag}`,
    isActive: true
  });
  cleanup.deptIds.push(dept._id);

  const course = await Course.create({
    code: `P8C${String(tag).slice(-5)}`,
    name: 'B.Tech CSE P8',
    department: dept._id,
    isActive: true
  });
  cleanup.courseIds.push(course._id);

  const sem = await Semester.create({
    course: course._id,
    semesterNumber: 5,
    academicYear: '2026-2027',
    startDate: new Date('2026-08-01'),
    endDate: new Date('2026-12-20'),
    status: 'ACTIVE',
    isActive: true
  });
  cleanup.semesterIds.push(sem._id);

  const [sub1, sub2, subInactive] = await Subject.create([
    { code: `P8S1${String(tag).slice(-4)}`, name: 'Operating Systems', course: course._id, semester: sem._id, credits: 4, isActive: true },
    { code: `P8S2${String(tag).slice(-4)}`, name: 'Computer Networks', course: course._id, semester: sem._id, credits: 4, isActive: true },
    { code: `P8SI${String(tag).slice(-4)}`, name: 'Inactive Subject', course: course._id, semester: sem._id, credits: 2, isActive: false }
  ]);
  cleanup.subjectIds.push(sub1._id, sub2._id, subInactive._id);

  const [fac1, fac2] = await Faculty.create([
    {
      user: fac1User._id,
      employeeId: `P8F1${String(tag).slice(-5)}`,
      firstName: 'Anil',
      lastName: 'Kapoor',
      department: dept._id,
      designation: 'PROFESSOR',
      contactNumber: '9876543001',
      status: 'ACTIVE'
    },
    {
      user: fac2User._id,
      employeeId: `P8F2${String(tag).slice(-5)}`,
      firstName: 'Meera',
      lastName: 'Joshi',
      department: dept._id,
      designation: 'ASSISTANT_PROFESSOR',
      contactNumber: '9876543002',
      status: 'ACTIVE'
    }
  ]);
  cleanup.facultyIds.push(fac1._id, fac2._id);

  const [stu1, stu2, stuUnenrolled, stuNoAtt] = await Student.create([
    {
      user: stu1User._id,
      rollNumber: `P8R1${String(tag).slice(-5)}`,
      enrollmentNumber: `P8E1${String(tag).slice(-5)}`,
      firstName: 'Kabir',
      lastName: 'Sen',
      dateOfBirth: new Date('2004-04-01'),
      gender: 'MALE',
      department: dept._id,
      course: course._id,
      semester: sem._id,
      contactNumber: '9811100001',
      address: 'Lucknow',
      currentSemester: 5,
      academicYear: '2026-2027',
      status: 'ACTIVE'
    },
    {
      user: stu2User._id,
      rollNumber: `P8R2${String(tag).slice(-5)}`,
      enrollmentNumber: `P8E2${String(tag).slice(-5)}`,
      firstName: 'Sneha',
      lastName: 'Rao',
      dateOfBirth: new Date('2004-06-15'),
      gender: 'FEMALE',
      department: dept._id,
      course: course._id,
      semester: sem._id,
      contactNumber: '9811100002',
      address: 'Noida',
      currentSemester: 5,
      academicYear: '2026-2027',
      status: 'ACTIVE'
    },
    {
      user: stuUnenrolledUser._id,
      rollNumber: `P8RU${String(tag).slice(-5)}`,
      enrollmentNumber: `P8EU${String(tag).slice(-5)}`,
      firstName: 'Outside',
      lastName: 'Learner',
      dateOfBirth: new Date('2004-08-20'),
      gender: 'MALE',
      department: dept._id,
      course: course._id,
      semester: sem._id,
      contactNumber: '9811100003',
      address: 'Kanpur',
      currentSemester: 5,
      academicYear: '2026-2027',
      status: 'ACTIVE'
    },
    {
      user: stuNoAttUser._id,
      rollNumber: `P8RZ${String(tag).slice(-5)}`,
      enrollmentNumber: `P8EZ${String(tag).slice(-5)}`,
      firstName: 'Zero',
      lastName: 'Sessions',
      dateOfBirth: new Date('2004-09-10'),
      gender: 'FEMALE',
      department: dept._id,
      course: course._id,
      semester: sem._id,
      contactNumber: '9811100004',
      address: 'Varanasi',
      currentSemester: 5,
      academicYear: '2026-2027',
      status: 'ACTIVE'
    }
  ]);
  cleanup.studentIds.push(stu1._id, stu2._id, stuUnenrolled._id, stuNoAtt._id);

  const enrollments = await Enrollment.create([
    { student: stu1._id, course: course._id, semester: sem._id, subject: sub1._id, academicYear: '2026-2027', section: 'A', status: 'ACTIVE' },
    { student: stu1._id, course: course._id, semester: sem._id, subject: sub2._id, academicYear: '2026-2027', section: 'A', status: 'ACTIVE' },
    { student: stu2._id, course: course._id, semester: sem._id, subject: sub1._id, academicYear: '2026-2027', section: 'A', status: 'ACTIVE' },
    { student: stu2._id, course: course._id, semester: sem._id, subject: sub2._id, academicYear: '2026-2027', section: 'A', status: 'ACTIVE' },
    { student: stuNoAtt._id, course: course._id, semester: sem._id, subject: sub2._id, academicYear: '2026-2027', section: 'A', status: 'ACTIVE' }
  ]);
  cleanup.enrollmentIds.push(...enrollments.map((e) => e._id));

  const [assign1, assign2, assignRevoked] = await FacultyAssignment.create([
    { faculty: fac1._id, course: course._id, semester: sem._id, subject: sub1._id, section: 'A', academicYear: '2026-2027', status: 'ACTIVE' },
    { faculty: fac1._id, course: course._id, semester: sem._id, subject: sub2._id, section: 'A', academicYear: '2026-2027', status: 'ACTIVE' },
    { faculty: fac2._id, course: course._id, semester: sem._id, subject: sub1._id, section: 'A', academicYear: '2026-2027', status: 'REVOKED' }
  ]);
  cleanup.assignmentIds.push(assign1._id, assign2._id, assignRevoked._id);

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
  const stuNoAttCookie = await loginAs(stuNoAttUser.email);

  const opts = (cookie, method = 'GET', body = null) => ({
    method,
    body,
    cookies: { [env.COOKIE_NAME]: cookie, [env.CSRF_COOKIE_NAME]: csrf },
    headers: { 'X-CSRF-Token': csrf }
  });

  // =========================================================================
  // 1. AUTHENTICATION & AUTHORIZATION CHECKS
  // =========================================================================
  const unauthRes = await httpReq('/api/v1/attendance/sessions');
  check(unauthRes.status === 401, 'Auth: Unauthenticated request rejected (401)');

  const stuCreateSess = await httpReq(
    '/api/v1/attendance/sessions',
    opts(stu1Cookie, 'POST', { facultyAssignment: String(assign1._id), sessionDate: '2026-09-01', sessionNumber: 1 })
  );
  check(stuCreateSess.status === 403, 'RBAC: Student cannot create attendance session (403)');

  const fac2CreateForFac1 = await httpReq(
    '/api/v1/attendance/sessions',
    opts(fac2Cookie, 'POST', { facultyAssignment: String(assign1._id), sessionDate: '2026-09-01', sessionNumber: 1 })
  );
  check(fac2CreateForFac1.status === 403, 'RBAC: Faculty cannot create session for another faculty assignment (403)');

  const revokedAssignSess = await httpReq(
    '/api/v1/attendance/sessions',
    opts(fac2Cookie, 'POST', { facultyAssignment: String(assignRevoked._id), sessionDate: '2026-09-01', sessionNumber: 1 })
  );
  check(revokedAssignSess.status === 400, 'Session: Inactive/revoked faculty assignment rejected (400)');

  const futureSess = await httpReq(
    '/api/v1/attendance/sessions',
    opts(fac1Cookie, 'POST', { facultyAssignment: String(assign1._id), sessionDate: '2099-01-15', sessionNumber: 1 })
  );
  check(futureSess.status === 400, 'Session: Future session date rejected (400)');

  // =========================================================================
  // 2. SESSION CREATION, SAME-DAY MULTIPLE SESSIONS, DUPLICATE GUARD
  // =========================================================================
  const createS1 = await httpReq(
    '/api/v1/attendance/sessions',
    opts(fac1Cookie, 'POST', {
      facultyAssignment: String(assign1._id),
      sessionDate: '2026-09-10',
      sessionNumber: 1,
      startTime: '09:00',
      endTime: '10:00',
      topic: 'Process Scheduling'
    })
  );
  const s1Id = createS1.data?.data?.session?._id;
  if (s1Id) cleanup.sessionIds.push(s1Id);
  check(
    createS1.status === 201 && createS1.data?.data?.eligibleCount === 2,
    'Session: Faculty creates session #1 & loads 2 authoritative enrolled students (201)',
    JSON.stringify(createS1.data)
  );

  // Duplicate same date + sessionNumber rejected (409)
  const dupS1 = await httpReq(
    '/api/v1/attendance/sessions',
    opts(fac1Cookie, 'POST', { facultyAssignment: String(assign1._id), sessionDate: '2026-09-10', sessionNumber: 1 })
  );
  check(dupS1.status === 409, 'Session: Duplicate date + sessionNumber rejected (409)');

  // Multiple sessions on same date allowed with sessionNumber: 2
  const createS2 = await httpReq(
    '/api/v1/attendance/sessions',
    opts(fac1Cookie, 'POST', {
      facultyAssignment: String(assign1._id),
      sessionDate: '2026-09-10',
      sessionNumber: 2,
      startTime: '14:00',
      endTime: '15:00',
      topic: 'Lab Tutorial'
    })
  );
  const s2Id = createS2.data?.data?.session?._id;
  if (s2Id) cleanup.sessionIds.push(s2Id);
  check(createS2.status === 201, 'Session: Second session #2 on same calendar date succeeds (201)');

  // Finalizing empty OPEN session with 0 marked records rejected
  const emptyFinalize = await httpReq(
    `/api/v1/attendance/sessions/${s1Id}/status`,
    opts(fac1Cookie, 'PATCH', { status: 'FINALIZED' })
  );
  check(emptyFinalize.status === 400, 'Session: Finalizing session without attendance records rejected (400)');

  // =========================================================================
  // 3. BULK ATTENDANCE MARKING, VALIDATIONS & FINALIZATION
  // =========================================================================
  // Reject un-enrolled student ID
  const unenrolledBulk = await httpReq(
    '/api/v1/attendance/bulk',
    opts(fac1Cookie, 'POST', {
      sessionId: s1Id,
      finalize: false,
      records: [
        { studentId: String(stu1._id), status: 'PRESENT' },
        { studentId: String(stuUnenrolled._id), status: 'PRESENT' }
      ]
    })
  );
  check(unenrolledBulk.status === 400, 'Marking: Un-enrolled student ID rejected strictly (400)');

  // Reject duplicate studentId in payload
  const dupStudentPayload = await httpReq(
    '/api/v1/attendance/bulk',
    opts(fac1Cookie, 'POST', {
      sessionId: s1Id,
      finalize: false,
      records: [
        { studentId: String(stu1._id), status: 'PRESENT' },
        { studentId: String(stu1._id), status: 'ABSENT' }
      ]
    })
  );
  check(dupStudentPayload.status === 400, 'Marking: Duplicate studentId in bulk payload rejected (400)');

  // Faculty 2 cannot submit bulk for Faculty 1 session
  const fac2Bulk = await httpReq(
    '/api/v1/attendance/bulk',
    opts(fac2Cookie, 'POST', {
      sessionId: s1Id,
      records: [{ studentId: String(stu1._id), status: 'PRESENT' }]
    })
  );
  check(fac2Bulk.status === 403, 'RBAC: Unrelated faculty cannot mark another faculty session (403)');

  // Valid bulk submission & finalize for Session #1: stu1=PRESENT, stu2=ABSENT
  const bulkS1 = await httpReq(
    '/api/v1/attendance/bulk',
    opts(fac1Cookie, 'POST', {
      sessionId: s1Id,
      finalize: true,
      records: [
        { studentId: String(stu1._id), status: 'PRESENT', remarks: 'On time' },
        { studentId: String(stu2._id), status: 'ABSENT' }
      ]
    })
  );
  check(
    bulkS1.status === 201 && bulkS1.data?.data?.submittedCount === 2 && bulkS1.data?.data?.sessionStatus === 'FINALIZED',
    'Marking: Valid bulk submission saved & finalized (201)'
  );

  // Duplicate submission prevented (409)
  const dupBulkS1 = await httpReq(
    '/api/v1/attendance/bulk',
    opts(fac1Cookie, 'POST', {
      sessionId: s1Id,
      records: [{ studentId: String(stu1._id), status: 'PRESENT' }]
    })
  );
  check(dupBulkS1.status === 409, 'Marking: Duplicate bulk submission rejected (409)');

  // Session #2 on same date: stu1=LATE, stu2=PRESENT (finalized)
  const bulkS2 = await httpReq(
    '/api/v1/attendance/bulk',
    opts(fac1Cookie, 'POST', {
      sessionId: s2Id,
      finalize: true,
      records: [
        { studentId: String(stu1._id), status: 'LATE' },
        { studentId: String(stu2._id), status: 'PRESENT' }
      ]
    })
  );
  check(bulkS2.status === 201, 'Marking: Session #2 on same date marks LATE and PRESENT cleanly (201)');

  // Create Session #3 (sub1 finalized: stu1=PRESENT, stu2=ABSENT) -> sub1 has 3 finalized sessions (stu1: 3/3 = 100%, stu2: 1/3 = 33.3%)
  const createS3 = await httpReq(
    '/api/v1/attendance/sessions',
    opts(fac1Cookie, 'POST', { facultyAssignment: String(assign1._id), sessionDate: '2026-09-11', sessionNumber: 1 })
  );
  const s3Id = createS3.data?.data?.session?._id;
  if (s3Id) cleanup.sessionIds.push(s3Id);
  await httpReq(
    '/api/v1/attendance/bulk',
    opts(fac1Cookie, 'POST', {
      sessionId: s3Id,
      finalize: true,
      records: [
        { studentId: String(stu1._id), status: 'PRESENT' },
        { studentId: String(stu2._id), status: 'ABSENT' }
      ]
    })
  );

  // Create Session #4 on sub2 (1 finalized session: stu1=ABSENT, stu2=PRESENT)
  // For stu1: sub1 = 3/3 (100%), sub2 = 0/1 (0%). Overall = (3+0)/(3+1) = 3/4 = 75.0% (NOT avg (100+0)/2 = 50%!)
  const createS4 = await httpReq(
    '/api/v1/attendance/sessions',
    opts(fac1Cookie, 'POST', { facultyAssignment: String(assign2._id), sessionDate: '2026-09-12', sessionNumber: 1 })
  );
  const s4Id = createS4.data?.data?.session?._id;
  if (s4Id) cleanup.sessionIds.push(s4Id);
  await httpReq(
    '/api/v1/attendance/bulk',
    opts(fac1Cookie, 'POST', {
      sessionId: s4Id,
      finalize: true,
      records: [
        { studentId: String(stu1._id), status: 'ABSENT' },
        { studentId: String(stu2._id), status: 'PRESENT' }
      ]
    })
  );

  // Create Session #5 DRAFT (OPEN, unfinalized) & Session #6 CANCELLED on sub2 — both MUST be excluded from percentages!
  const createS5Open = await httpReq(
    '/api/v1/attendance/sessions',
    opts(fac1Cookie, 'POST', { facultyAssignment: String(assign2._id), sessionDate: '2026-09-13', sessionNumber: 1 })
  );
  const s5Id = createS5Open.data?.data?.session?._id;
  if (s5Id) cleanup.sessionIds.push(s5Id);
  await httpReq(
    '/api/v1/attendance/bulk',
    opts(fac1Cookie, 'POST', {
      sessionId: s5Id,
      finalize: false, // stays OPEN
      records: [
        { studentId: String(stu1._id), status: 'ABSENT' },
        { studentId: String(stu2._id), status: 'ABSENT' }
      ]
    })
  );

  const createS6Cancel = await httpReq(
    '/api/v1/attendance/sessions',
    opts(fac1Cookie, 'POST', { facultyAssignment: String(assign2._id), sessionDate: '2026-09-14', sessionNumber: 1 })
  );
  const s6Id = createS6Cancel.data?.data?.session?._id;
  if (s6Id) cleanup.sessionIds.push(s6Id);
  await httpReq(
    '/api/v1/attendance/bulk',
    opts(fac1Cookie, 'POST', {
      sessionId: s6Id,
      finalize: false,
      records: [
        { studentId: String(stu1._id), status: 'ABSENT' },
        { studentId: String(stu2._id), status: 'ABSENT' }
      ]
    })
  );
  const cancelRes = await httpReq(
    `/api/v1/attendance/sessions/${s6Id}/status`,
    opts(fac1Cookie, 'PATCH', { status: 'CANCELLED', reason: 'Holiday declared' })
  );
  check(cancelRes.status === 200 && cancelRes.data?.data?.session?.status === 'CANCELLED', 'Session: Cancel session succeeds');

  // =========================================================================
  // 4. ATTENDANCE PERCENTAGES & POLICY VERIFICATION
  // =========================================================================
  const stu1SummaryRes = await httpReq('/api/v1/attendance/my/summary', opts(stu1Cookie));
  const s1Overall = stu1SummaryRes.data?.data?.overall;
  const s1Sub1 = (stu1SummaryRes.data?.data?.subjects || []).find((s) => String(s.subject?._id) === String(sub1._id));
  const s1Sub2 = (stu1SummaryRes.data?.data?.subjects || []).find((s) => String(s.subject?._id) === String(sub2._id));
  check(
    stu1SummaryRes.status === 200 &&
      s1Sub1?.percentage === 100 &&
      s1Sub1?.lateCount === 1 &&
      s1Sub2?.percentage === 0 &&
      s1Overall?.totalSessions === 4 &&
      s1Overall?.attendedCount === 3 &&
      s1Overall?.percentage === 75,
    'Calculation: Overall 75.0% weighted accurately across unequal finalized sessions; OPEN & CANCELLED excluded',
    JSON.stringify({ s1Overall, s1Sub1, s1Sub2 })
  );

  // Student with 0 finalized sessions returns hasNoData: true and percentage: null
  const zeroSummaryRes = await httpReq('/api/v1/attendance/my/summary', opts(stuNoAttCookie));
  const zeroOverall = zeroSummaryRes.data?.data?.overall;
  check(
    zeroSummaryRes.status === 200 && zeroOverall?.totalSessions === 0 && zeroOverall?.percentage === null && zeroOverall?.hasNoData === true,
    'Calculation: Zero finalized sessions returns null percentage & hasNoData=true (no division by zero)'
  );

  // =========================================================================
  // 5. CORRECTIONS, FINALIZED SESSION POLICY & AUDIT LOGGING
  // =========================================================================
  const s4AttDoc = await Attendance.findOne({ session: s4Id, student: stu1._id }).lean();
  const cancelledAttDoc = await Attendance.findOne({ session: s6Id, student: stu1._id }).lean();

  // Student cannot correct
  const stuCorrect = await httpReq(
    `/api/v1/attendance/${s4AttDoc._id}`,
    opts(stu1Cookie, 'PATCH', { status: 'PRESENT', reason: 'Self edit attempt' })
  );
  check(stuCorrect.status === 403, 'Correction: Student edit rejected (403)');

  // Faculty cannot directly correct locked FINALIZED session without reopening
  const lockedCorrect = await httpReq(
    `/api/v1/attendance/${s4AttDoc._id}`,
    opts(fac1Cookie, 'PATCH', { status: 'PRESENT', reason: 'Trying without reopen' })
  );
  check(lockedCorrect.status === 409, 'Correction: Faculty blocked from editing finalized session until reopened (409)');

  // Reopen requires reason (400 if empty)
  const reopenNoReason = await httpReq(
    `/api/v1/attendance/sessions/${s4Id}/status`,
    opts(fac1Cookie, 'PATCH', { status: 'OPEN', reason: '' })
  );
  check(reopenNoReason.status === 400, 'Session Policy: Reopening finalized session without reason rejected (400)');

  // Cancelled session blocks attendance edit even for admin (400)
  const editCancelled = await httpReq(
    `/api/v1/attendance/${cancelledAttDoc._id}`,
    opts(adminCookie, 'PATCH', { status: 'PRESENT', reason: 'Override test' })
  );
  check(editCancelled.status === 400, 'Correction: Cancelled session record locked from modification (400)');

  // Admin overrides finalized s4AttDoc from ABSENT -> LATE cleanly and logs previous/new status
  const adminCorrect = await httpReq(
    `/api/v1/attendance/${s4AttDoc._id}`,
    opts(adminCookie, 'PATCH', { status: 'LATE', reason: 'Medical excuse approved by Dean' })
  );
  check(
    adminCorrect.status === 200 && adminCorrect.data?.data?.record?.status === 'LATE',
    'Correction: Admin override on finalized record succeeds cleanly (200)'
  );

  // Verify stu1 overall recalculated cleanly after override (4/4 = 100%)
  const stu1AfterOverride = await httpReq('/api/v1/attendance/my/summary', opts(stu1Cookie));
  check(
    stu1AfterOverride.data?.data?.overall?.percentage === 100,
    'Calculation: Updated record reflected immediately in authoritative student summary (100%)'
  );

  // =========================================================================
  // 6. RECORD ISOLATION & ID MANIPULATION SECURITY
  // =========================================================================
  const stu2AttDoc = await Attendance.findOne({ session: s1Id, student: stu2._id }).lean();

  const stuQueryOther = await httpReq(`/api/v1/attendance?student=${stu2._id}`, opts(stu1Cookie));
  check(stuQueryOther.status === 403, 'Security: Student ID manipulation on GET /attendance?student=... rejected (403)');

  const stuGetOtherId = await httpReq(`/api/v1/attendance/${stu2AttDoc._id}`, opts(stu1Cookie));
  check(stuGetOtherId.status === 403, 'Security: Student accessing other student /:id rejected (403)');

  const stuOtherSummary = await httpReq(`/api/v1/attendance/student/${stu2._id}`, opts(stu1Cookie));
  check(stuOtherSummary.status === 403, 'Security: Student accessing other /student/:id summary rejected (403)');

  const facQueryOther = await httpReq(`/api/v1/attendance/sessions?faculty=${fac2._id}`, opts(fac1Cookie));
  check(facQueryOther.status === 403, 'Security: Faculty ID manipulation on GET /sessions?faculty=... rejected (403)');

  // =========================================================================
  // 7. REPORTS, DASHBOARDS & AUDIT TRAIL VERIFICATION
  // =========================================================================
  const [ovRes, subjRepRes, stuDefaulterRes, facRepRes, adminDashRes, facDashRes, stuDashRes] = await Promise.all([
    httpReq(`/api/v1/attendance/reports/overview?course=${course._id}`, opts(adminCookie)),
    httpReq(`/api/v1/attendance/reports/subjects?course=${course._id}`, opts(adminCookie)),
    httpReq(`/api/v1/attendance/reports/students?course=${course._id}&belowThresholdOnly=true`, opts(adminCookie)),
    httpReq(`/api/v1/attendance/reports/faculty?academicYear=2026-2027`, opts(adminCookie)),
    httpReq('/api/v1/dashboards/admin', opts(adminCookie)),
    httpReq('/api/v1/dashboards/faculty', opts(fac1Cookie)),
    httpReq('/api/v1/dashboards/student', opts(stu1Cookie))
  ]);

  check(
    ovRes.status === 200 && ovRes.data?.data?.sessions?.finalizedSessions === 4,
    'Reports: Overview accurately counts 4 finalized sessions',
    JSON.stringify(ovRes.data?.data?.sessions)
  );
  check(
    subjRepRes.status === 200 && (subjRepRes.data?.data?.subjects || []).length === 2,
    'Reports: Subject-wise report returns 2 subject breakdowns'
  );
  check(
    stuDefaulterRes.status === 200 &&
      (stuDefaulterRes.data?.data?.students || []).some((s) => String(s.student?._id) === String(stu2._id)),
    'Reports: Shortage report correctly detects stu2 (50% < 75%)'
  );
  check(facRepRes.status === 200 && (facRepRes.data?.data?.faculty || []).length >= 1, 'Reports: Faculty-wise report works');
  check(
    adminDashRes.status === 200 &&
      facDashRes.status === 200 &&
      stuDashRes.status === 200 &&
      stuDashRes.data?.data?.attendancePercentage === 100,
    'Dashboards: Admin, Faculty, and Student dashboard stats integrate live attendance metrics'
  );

  await new Promise((r) => setTimeout(r, 350));
  const auditOverride = await AuditLog.findOne({
    actor: adminUser._id,
    action: 'OVERRIDE',
    entity: 'ATTENDANCE_RECORD'
  }).lean();
  check(
    !!auditOverride &&
      auditOverride.details?.previousStatus === 'ABSENT' &&
      auditOverride.details?.newStatus === 'LATE' &&
      auditOverride.details?.reason === 'Medical excuse approved by Dean',
    'AuditLog: Attendance correction preserves previousStatus, newStatus, and reason'
  );

  // Cleanup all isolated fixtures cleanly
  await Attendance.deleteMany({ session: { $in: cleanup.sessionIds } });
  await AttendanceSession.deleteMany({ _id: { $in: cleanup.sessionIds } });
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
  console.log(`PHASE 8 INTEGRATION SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(72));
  if (failed > 0) process.exit(1);
};

runPhase8Tests().catch(async (err) => {
  console.error('[Phase 8 Test Fatal Error]', err);
  if (server) await new Promise((resolve) => server.close(resolve));
  await closeDatabase();
  process.exit(1);
});
