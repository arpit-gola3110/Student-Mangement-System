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

const runPhase7Tests = async () => {
  console.log('='.repeat(72));
  console.log('PHASE 7 STUDENT ENROLLMENT & FACULTY ASSIGNMENT INTEGRATION SUITE');
  console.log('='.repeat(72) + '\n');

  await connectDB();

  const tag = Date.now();
  const pw = 'StrongPass@123';

  // Seed isolated fixtures directly for deterministic integration tests
  const [adminUser, fac1User, fac2User, facInactiveUser, stu1User, stu2User, stuInactiveUser, stuOtherUser] =
    await User.create([
      { name: 'P7 Admin', email: `p7_admin_${tag}@aktu.test`, password: pw, role: 'admin', isActive: true },
      { name: 'P7 Faculty One', email: `p7_fac1_${tag}@aktu.test`, password: pw, role: 'faculty', isActive: true },
      { name: 'P7 Faculty Two', email: `p7_fac2_${tag}@aktu.test`, password: pw, role: 'faculty', isActive: true },
      { name: 'P7 Faculty Inactive', email: `p7_fac_in_${tag}@aktu.test`, password: pw, role: 'faculty', isActive: false },
      { name: 'P7 Student One', email: `p7_stu1_${tag}@aktu.test`, password: pw, role: 'student', isActive: true },
      { name: 'P7 Student Two', email: `p7_stu2_${tag}@aktu.test`, password: pw, role: 'student', isActive: true },
      { name: 'P7 Student Inactive', email: `p7_stu_in_${tag}@aktu.test`, password: pw, role: 'student', isActive: true },
      { name: 'P7 Student Other', email: `p7_stu_other_${tag}@aktu.test`, password: pw, role: 'student', isActive: true }
    ]);
  cleanup.userIds.push(
    adminUser._id,
    fac1User._id,
    fac2User._id,
    facInactiveUser._id,
    stu1User._id,
    stu2User._id,
    stuInactiveUser._id,
    stuOtherUser._id
  );
  cleanup.auditActorIds.push(adminUser._id);

  const [deptA, deptB] = await Department.create([
    { code: `P7CS${String(tag).slice(-4)}`, name: `P7 Computer Science ${tag}`, isActive: true },
    { code: `P7ME${String(tag).slice(-4)}`, name: `P7 Mechanical ${tag}`, isActive: true }
  ]);
  cleanup.deptIds.push(deptA._id, deptB._id);

  const [courseA, courseB] = await Course.create([
    { code: `P7BTCS${String(tag).slice(-4)}`, name: 'B.Tech CSE P7', department: deptA._id, isActive: true },
    { code: `P7BTME${String(tag).slice(-4)}`, name: 'B.Tech ME P7', department: deptB._id, isActive: true }
  ]);
  cleanup.courseIds.push(courseA._id, courseB._id);

  const [semA1, semB1] = await Semester.create([
    {
      course: courseA._id,
      semesterNumber: 5,
      academicYear: '2026-2027',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-12-20'),
      status: 'ACTIVE',
      isActive: true
    },
    {
      course: courseB._id,
      semesterNumber: 5,
      academicYear: '2026-2027',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-12-20'),
      status: 'ACTIVE',
      isActive: true
    }
  ]);
  cleanup.semesterIds.push(semA1._id, semB1._id);

  const [sub1, sub2, subInactive, subOtherCourse] = await Subject.create([
    {
      code: `P7BCS501${String(tag).slice(-3)}`,
      name: 'Database Management Systems',
      course: courseA._id,
      semester: semA1._id,
      credits: 4,
      type: 'THEORY',
      isActive: true
    },
    {
      code: `P7BCS502${String(tag).slice(-3)}`,
      name: 'Compiler Design',
      course: courseA._id,
      semester: semA1._id,
      credits: 4,
      type: 'THEORY',
      isActive: true
    },
    {
      code: `P7BCS599${String(tag).slice(-3)}`,
      name: 'Archived Subject',
      course: courseA._id,
      semester: semA1._id,
      credits: 2,
      type: 'ELECTIVE',
      isActive: false
    },
    {
      code: `P7BME501${String(tag).slice(-3)}`,
      name: 'Thermodynamics',
      course: courseB._id,
      semester: semB1._id,
      credits: 4,
      type: 'THEORY',
      isActive: true
    }
  ]);
  cleanup.subjectIds.push(sub1._id, sub2._id, subInactive._id, subOtherCourse._id);

  const [fac1, fac2, facInactive] = await Faculty.create([
    {
      user: fac1User._id,
      employeeId: `P7FAC1${String(tag).slice(-4)}`,
      firstName: 'Aarav',
      lastName: 'Verma',
      department: deptA._id,
      designation: 'ASSOCIATE_PROFESSOR',
      contactNumber: '9876543210',
      status: 'ACTIVE'
    },
    {
      user: fac2User._id,
      employeeId: `P7FAC2${String(tag).slice(-4)}`,
      firstName: 'Neha',
      lastName: 'Kulkarni',
      department: deptA._id,
      designation: 'ASSISTANT_PROFESSOR',
      contactNumber: '9876543211',
      status: 'ACTIVE'
    },
    {
      user: facInactiveUser._id,
      employeeId: `P7FACI${String(tag).slice(-4)}`,
      firstName: 'Inactive',
      lastName: 'Teacher',
      department: deptA._id,
      designation: 'LECTURER',
      contactNumber: '9876543212',
      status: 'INACTIVE'
    }
  ]);
  cleanup.facultyIds.push(fac1._id, fac2._id, facInactive._id);

  const [stu1, stu2, stuInactive, stuOther] = await Student.create([
    {
      user: stu1User._id,
      rollNumber: `P7R1${String(tag).slice(-5)}`,
      enrollmentNumber: `P7E1${String(tag).slice(-5)}`,
      firstName: 'Rohan',
      lastName: 'Gupta',
      dateOfBirth: new Date('2004-05-10'),
      gender: 'MALE',
      department: deptA._id,
      course: courseA._id,
      semester: semA1._id,
      contactNumber: '9811111111',
      address: 'Lucknow',
      currentSemester: 5,
      academicYear: '2026-2027',
      status: 'ACTIVE'
    },
    {
      user: stu2User._id,
      rollNumber: `P7R2${String(tag).slice(-5)}`,
      enrollmentNumber: `P7E2${String(tag).slice(-5)}`,
      firstName: 'Priya',
      lastName: 'Nair',
      dateOfBirth: new Date('2004-07-12'),
      gender: 'FEMALE',
      department: deptA._id,
      course: courseA._id,
      semester: semA1._id,
      contactNumber: '9811111112',
      address: 'Noida',
      currentSemester: 5,
      academicYear: '2026-2027',
      status: 'ACTIVE'
    },
    {
      user: stuInactiveUser._id,
      rollNumber: `P7RI${String(tag).slice(-5)}`,
      enrollmentNumber: `P7EI${String(tag).slice(-5)}`,
      firstName: 'Suspended',
      lastName: 'Learner',
      dateOfBirth: new Date('2004-01-15'),
      gender: 'MALE',
      department: deptA._id,
      course: courseA._id,
      semester: semA1._id,
      contactNumber: '9811111113',
      address: 'Kanpur',
      currentSemester: 5,
      academicYear: '2026-2027',
      status: 'SUSPENDED'
    },
    {
      user: stuOtherUser._id,
      rollNumber: `P7RO${String(tag).slice(-5)}`,
      enrollmentNumber: `P7EO${String(tag).slice(-5)}`,
      firstName: 'Vikram',
      lastName: 'Mech',
      dateOfBirth: new Date('2004-09-20'),
      gender: 'MALE',
      department: deptB._id,
      course: courseB._id,
      semester: semB1._id,
      contactNumber: '9811111114',
      address: 'Ghaziabad',
      currentSemester: 5,
      academicYear: '2026-2027',
      status: 'ACTIVE'
    }
  ]);
  cleanup.studentIds.push(stu1._id, stu2._id, stuInactive._id, stuOther._id);

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
  const stu1Cookie = await loginAs(stu1User.email);
  const stu2Cookie = await loginAs(stu2User.email);

  const reqOpts = (cookie, method = 'GET', body = null) => ({
    method,
    body,
    cookies: { [env.COOKIE_NAME]: cookie, [env.CSRF_COOKIE_NAME]: csrf },
    headers: { 'X-CSRF-Token': csrf }
  });

  // =========================================================================
  // 1. AUTHENTICATION & ROLE-BASED ACCESS CONTROL TESTS
  // =========================================================================
  const unauthEnroll = await httpReq('/api/v1/enrollments');
  check(unauthEnroll.status === 401, 'RBAC: Unauthenticated GET /enrollments -> 401');

  const unauthMyEnroll = await httpReq('/api/v1/enrollments/my');
  check(unauthMyEnroll.status === 401, 'RBAC: Unauthenticated GET /enrollments/my -> 401');

  const unauthAssign = await httpReq('/api/v1/faculty-assignments');
  check(unauthAssign.status === 401, 'RBAC: Unauthenticated GET /faculty-assignments -> 401');

  const stuCreateEnroll = await httpReq(
    '/api/v1/enrollments',
    reqOpts(stu1Cookie, 'POST', {
      student: String(stu1._id),
      course: String(courseA._id),
      semester: String(semA1._id),
      subject: String(sub1._id),
      academicYear: '2026-2027'
    })
  );
  check(stuCreateEnroll.status === 403, 'RBAC: Student cannot POST /enrollments (403)');

  const facCreateEnroll = await httpReq(
    '/api/v1/enrollments',
    reqOpts(fac1Cookie, 'POST', {
      student: String(stu1._id),
      course: String(courseA._id),
      semester: String(semA1._id),
      subject: String(sub1._id),
      academicYear: '2026-2027'
    })
  );
  check(facCreateEnroll.status === 403, 'RBAC: Faculty cannot POST /enrollments (403)');

  const stuAccessAssignments = await httpReq('/api/v1/faculty-assignments', reqOpts(stu1Cookie));
  check(stuAccessAssignments.status === 403, 'RBAC: Student cannot access /faculty-assignments (403)');

  const stuAccessMyAssignments = await httpReq('/api/v1/faculty-assignments/my', reqOpts(stu1Cookie));
  check(stuAccessMyAssignments.status === 403, 'RBAC: Student cannot access /faculty-assignments/my (403)');

  const facAccessMyEnrollments = await httpReq('/api/v1/enrollments/my', reqOpts(fac1Cookie));
  check(facAccessMyEnrollments.status === 403, 'RBAC: Faculty cannot access /enrollments/my (403)');

  // =========================================================================
  // 2. ENROLLMENT VALIDATIONS, SINGLE/BULK CREATION, & STATUS LIFECYCLE
  // =========================================================================
  // Inactive student rejected
  const inactiveStuRes = await httpReq(
    '/api/v1/enrollments',
    reqOpts(adminCookie, 'POST', {
      student: String(stuInactive._id),
      course: String(courseA._id),
      semester: String(semA1._id),
      subject: String(sub1._id),
      academicYear: '2026-2027'
    })
  );
  check(inactiveStuRes.status === 400, 'Enrollment: Inactive/suspended student rejected (400)');

  // Inactive subject rejected
  const inactiveSubRes = await httpReq(
    '/api/v1/enrollments',
    reqOpts(adminCookie, 'POST', {
      student: String(stu1._id),
      course: String(courseA._id),
      semester: String(semA1._id),
      subject: String(subInactive._id),
      academicYear: '2026-2027'
    })
  );
  check(inactiveSubRes.status === 400, 'Enrollment: Inactive subject rejected (400)');

  // Subject belonging to wrong course rejected
  const wrongSubCourseRes = await httpReq(
    '/api/v1/enrollments',
    reqOpts(adminCookie, 'POST', {
      student: String(stu1._id),
      course: String(courseA._id),
      semester: String(semA1._id),
      subject: String(subOtherCourse._id),
      academicYear: '2026-2027'
    })
  );
  check(wrongSubCourseRes.status === 400, 'Enrollment: Subject from another course rejected (400)');

  // Student belonging to wrong course rejected
  const wrongStuCourseRes = await httpReq(
    '/api/v1/enrollments',
    reqOpts(adminCookie, 'POST', {
      student: String(stuOther._id),
      course: String(courseA._id),
      semester: String(semA1._id),
      subject: String(sub1._id),
      academicYear: '2026-2027'
    })
  );
  check(wrongStuCourseRes.status === 400, 'Enrollment: Student belonging to different course rejected (400)');

  // Valid single enrollment creation
  const createSingleEnroll = await httpReq(
    '/api/v1/enrollments',
    reqOpts(adminCookie, 'POST', {
      student: String(stu1._id),
      course: String(courseA._id),
      semester: String(semA1._id),
      subject: String(sub1._id),
      academicYear: '2026-2027',
      section: 'A'
    })
  );
  check(
    createSingleEnroll.status === 201 && createSingleEnroll.data?.data?.createdCount === 1,
    'Enrollment: Admin creates valid single student-subject enrollment (201)',
    JSON.stringify(createSingleEnroll.data)
  );
  const enroll1Id = createSingleEnroll.data?.data?.created?.[0]?._id;
  if (enroll1Id) cleanup.enrollmentIds.push(enroll1Id);

  // Duplicate active enrollment rejected (409)
  const dupEnrollRes = await httpReq(
    '/api/v1/enrollments',
    reqOpts(adminCookie, 'POST', {
      student: String(stu1._id),
      course: String(courseA._id),
      semester: String(semA1._id),
      subject: String(sub1._id),
      academicYear: '2026-2027'
    })
  );
  check(dupEnrollRes.status === 409, 'Enrollment: Duplicate active enrollment blocked (409)');

  // Bulk enrollment across [stu1, stu2] x [sub1, sub2] -> 3 succeed, 1 duplicate fails gracefully
  const bulkEnrollRes = await httpReq(
    '/api/v1/enrollments',
    reqOpts(adminCookie, 'POST', {
      students: [String(stu1._id), String(stu2._id)],
      course: String(courseA._id),
      semester: String(semA1._id),
      subjects: [String(sub1._id), String(sub2._id)],
      academicYear: '2026-2027',
      section: 'A'
    })
  );
  const bulkData = bulkEnrollRes.data?.data;
  check(
    bulkEnrollRes.status === 201 && bulkData?.createdCount === 3 && bulkData?.failedCount === 1,
    'Enrollment: Bulk enrollment reports exact 3 created and 1 conflict without silent failure',
    JSON.stringify(bulkData)
  );
  for (const c of bulkData?.created || []) cleanup.enrollmentIds.push(c._id);
  const stu2Sub1Enroll = (bulkData?.created || []).find(
    (e) => String(e.student?._id) === String(stu2._id) && String(e.subject?._id) === String(sub1._id)
  );

  // Update enrollment section & status lifecycle
  const patchEnrollRes = await httpReq(
    `/api/v1/enrollments/${enroll1Id}`,
    reqOpts(adminCookie, 'PATCH', { section: 'B' })
  );
  check(
    patchEnrollRes.status === 200 && patchEnrollRes.data?.data?.enrollment?.section === 'B',
    'Enrollment: Admin updates enrollment section cleanly'
  );

  const dropRes = await httpReq(
    `/api/v1/enrollments/${enroll1Id}/status`,
    reqOpts(adminCookie, 'PATCH', { status: 'DROPPED' })
  );
  check(
    dropRes.status === 200 && dropRes.data?.data?.enrollment?.status === 'DROPPED',
    'Enrollment: Status transition ACTIVE -> DROPPED succeeds'
  );

  // Re-enrolling same student/subject while historical DROPPED record exists (partial unique index!)
  const reEnrollAfterDrop = await httpReq(
    '/api/v1/enrollments',
    reqOpts(adminCookie, 'POST', {
      student: String(stu1._id),
      course: String(courseA._id),
      semester: String(semA1._id),
      subject: String(sub1._id),
      academicYear: '2026-2027',
      section: 'A'
    })
  );
  check(
    reEnrollAfterDrop.status === 201 && reEnrollAfterDrop.data?.data?.createdCount === 1,
    'Enrollment: Partial unique index allows new ACTIVE enrollment while keeping historical DROPPED record'
  );
  const enroll1NewId = reEnrollAfterDrop.data?.data?.created?.[0]?._id;
  if (enroll1NewId) cleanup.enrollmentIds.push(enroll1NewId);

  // Complete & block reopening COMPLETED enrollment
  const completeRes = await httpReq(
    `/api/v1/enrollments/${enroll1NewId}/status`,
    reqOpts(adminCookie, 'PATCH', { status: 'COMPLETED' })
  );
  check(completeRes.status === 200, 'Enrollment: Status transition ACTIVE -> COMPLETED succeeds');

  const reopenCompleteRes = await httpReq(
    `/api/v1/enrollments/${enroll1NewId}/status`,
    reqOpts(adminCookie, 'PATCH', { status: 'ACTIVE' })
  );
  check(reopenCompleteRes.status === 400, 'Enrollment: Reopening COMPLETED enrollment rejected (400)');

  // Reactivate enroll1Id back to ACTIVE so student1 has active enrollments in sub1 + sub2
  const reactivateDropped = await httpReq(
    `/api/v1/enrollments/${enroll1Id}/status`,
    reqOpts(adminCookie, 'PATCH', { status: 'ACTIVE' })
  );
  check(
    reactivateDropped.status === 200 && reactivateDropped.data?.data?.enrollment?.status === 'ACTIVE',
    'Enrollment: Reactivating DROPPED enrollment to ACTIVE succeeds when no active duplicate exists'
  );

  // =========================================================================
  // 3. STUDENT SELF-SCOPING & ID-MANIPULATION PREVENTION (ENROLLMENTS)
  // =========================================================================
  const myEnrollRes = await httpReq('/api/v1/enrollments/my', reqOpts(stu1Cookie));
  const myEnrollList = myEnrollRes.data?.data?.enrollments || [];
  check(
    myEnrollRes.status === 200 &&
      myEnrollList.length > 0 &&
      myEnrollList.every((e) => String(e.student?._id) === String(stu1._id)),
    'Enrollment: GET /enrollments/my returns strictly authenticated student own records'
  );

  const idManipEnrollQuery = await httpReq(
    `/api/v1/enrollments?student=${stu2._id}`,
    reqOpts(stu1Cookie)
  );
  check(
    idManipEnrollQuery.status === 403,
    'RBAC Security: Student passing another student ID to GET /enrollments?student=... rejected (403)'
  );

  const idManipEnrollById = await httpReq(
    `/api/v1/enrollments/${stu2Sub1Enroll?._id}`,
    reqOpts(stu1Cookie)
  );
  check(
    idManipEnrollById.status === 403,
    'RBAC Security: Student requesting another student enrollment /:id rejected (403)'
  );

  // Search, Filter, Pagination
  const searchEnrollRes = await httpReq(
    `/api/v1/enrollments?search=${stu1.rollNumber}&status=ACTIVE&course=${courseA._id}`,
    reqOpts(adminCookie)
  );
  check(
    searchEnrollRes.status === 200 &&
      (searchEnrollRes.data?.data?.enrollments || []).length === 2,
    'Enrollment: Search + Course + Status filter returns accurate subset'
  );

  // =========================================================================
  // 4. FACULTY ASSIGNMENT VALIDATIONS & LIFECYCLE
  // =========================================================================
  // Inactive faculty rejected
  const inactiveFacAssign = await httpReq(
    '/api/v1/faculty-assignments',
    reqOpts(adminCookie, 'POST', {
      faculty: String(facInactive._id),
      course: String(courseA._id),
      semester: String(semA1._id),
      subject: String(sub1._id),
      section: 'A',
      academicYear: '2026-2027'
    })
  );
  check(inactiveFacAssign.status === 400, 'Assignment: Inactive faculty rejected (400)');

  // Mismatched subject/course rejected
  const mismatchedAssign = await httpReq(
    '/api/v1/faculty-assignments',
    reqOpts(adminCookie, 'POST', {
      faculty: String(fac1._id),
      course: String(courseA._id),
      semester: String(semA1._id),
      subject: String(subOtherCourse._id),
      section: 'A',
      academicYear: '2026-2027'
    })
  );
  check(mismatchedAssign.status === 400, 'Assignment: Subject/course mismatch rejected (400)');

  // Create valid assignment for fac1 -> sub1 (section A has stu1 + stu2 enrolled in sub1!)
  const createAssign1 = await httpReq(
    '/api/v1/faculty-assignments',
    reqOpts(adminCookie, 'POST', {
      faculty: String(fac1._id),
      course: String(courseA._id),
      semester: String(semA1._id),
      subject: String(sub1._id),
      section: 'A',
      academicYear: '2026-2027'
    })
  );
  const assign1 = createAssign1.data?.data?.assignment;
  check(
    createAssign1.status === 201 && assign1?._id && assign1?.enrolledStudentCount >= 1,
    'Assignment: Admin assigns fac1 to active subject & reports live enrolledStudentCount (201)',
    JSON.stringify(createAssign1.data)
  );
  if (assign1?._id) cleanup.assignmentIds.push(assign1._id);

  // Create assignment for fac2 -> sub2
  const createAssign2 = await httpReq(
    '/api/v1/faculty-assignments',
    reqOpts(adminCookie, 'POST', {
      faculty: String(fac2._id),
      course: String(courseA._id),
      semester: String(semA1._id),
      subject: String(sub2._id),
      section: 'A',
      academicYear: '2026-2027'
    })
  );
  const assign2 = createAssign2.data?.data?.assignment;
  check(createAssign2.status === 201 && !!assign2?._id, 'Assignment: Admin assigns fac2 to sub2 (201)');
  if (assign2?._id) cleanup.assignmentIds.push(assign2._id);

  // Duplicate active assignment rejected (409)
  const dupAssign = await httpReq(
    '/api/v1/faculty-assignments',
    reqOpts(adminCookie, 'POST', {
      faculty: String(fac1._id),
      course: String(courseA._id),
      semester: String(semA1._id),
      subject: String(sub1._id),
      section: 'A',
      academicYear: '2026-2027'
    })
  );
  check(dupAssign.status === 409, 'Assignment: Duplicate active assignment blocked (409)');

  // Revoke & recreate with partial unique index preservation
  const revokeAssign2 = await httpReq(
    `/api/v1/faculty-assignments/${assign2._id}/status`,
    reqOpts(adminCookie, 'PATCH', { status: 'REVOKED' })
  );
  check(
    revokeAssign2.status === 200 && revokeAssign2.data?.data?.assignment?.status === 'REVOKED',
    'Assignment: Revoking active assignment succeeds (ACTIVE -> REVOKED)'
  );

  // Faculty self-scoping & ID manipulation checks
  const myAssignRes = await httpReq('/api/v1/faculty-assignments/my', reqOpts(fac1Cookie));
  const myAssignList = myAssignRes.data?.data?.assignments || [];
  check(
    myAssignRes.status === 200 &&
      myAssignList.length === 1 &&
      String(myAssignList[0].faculty?._id) === String(fac1._id),
    'Assignment: GET /faculty-assignments/my returns strictly authenticated faculty assignments'
  );

  const idManipAssignQuery = await httpReq(
    `/api/v1/faculty-assignments?faculty=${fac2._id}`,
    reqOpts(fac1Cookie)
  );
  check(
    idManipAssignQuery.status === 403,
    'RBAC Security: Faculty passing another faculty ID to GET /faculty-assignments?faculty=... rejected (403)'
  );

  const idManipAssignById = await httpReq(
    `/api/v1/faculty-assignments/${assign2._id}`,
    reqOpts(fac1Cookie)
  );
  check(
    idManipAssignById.status === 403,
    'RBAC Security: Faculty requesting another faculty assignment /:id rejected (403)'
  );

  // Faculty scoping on enrollments list
  const facScopedEnroll = await httpReq('/api/v1/enrollments', reqOpts(fac1Cookie));
  const facScopedRows = facScopedEnroll.data?.data?.enrollments || [];
  check(
    facScopedEnroll.status === 200 &&
      facScopedRows.length > 0 &&
      facScopedRows.every((e) => String(e.subject?._id) === String(sub1._id)),
    'RBAC Security: Faculty GET /enrollments scoped strictly to their actively assigned subjects'
  );

  // =========================================================================
  // 5. DEPENDENCY PROTECTION (ATTENDANCE) & DELETE WORKFLOWS
  // =========================================================================
  const attDoc = await Attendance.create({
    student: stu2._id,
    subject: sub1._id,
    semester: semA1._id,
    markedBy: fac1._id,
    date: new Date('2026-09-10'),
    status: 'PRESENT'
  });
  cleanup.attendanceIds.push(attDoc._id);

  // Deleting enrollment with dependent attendance blocked (409)
  const blockDelEnroll = await httpReq(
    `/api/v1/enrollments/${stu2Sub1Enroll._id}`,
    reqOpts(adminCookie, 'DELETE')
  );
  check(
    blockDelEnroll.status === 409,
    'Dependency Protection: Deleting enrollment with dependent attendance blocked (409)'
  );

  // Reassigning faculty on assignment with dependent attendance blocked (409)
  const blockReassign = await httpReq(
    `/api/v1/faculty-assignments/${assign1._id}`,
    reqOpts(adminCookie, 'PATCH', { faculty: String(fac2._id) })
  );
  check(
    blockReassign.status === 409,
    'Dependency Protection: Reassigning faculty after attendance recorded blocked (409)'
  );

  // Deleting assignment with dependent attendance blocked (409)
  const blockDelAssign = await httpReq(
    `/api/v1/faculty-assignments/${assign1._id}`,
    reqOpts(adminCookie, 'DELETE')
  );
  check(
    blockDelAssign.status === 409,
    'Dependency Protection: Deleting assignment with dependent attendance blocked (409)'
  );

  // Clean deletes without dependent records succeed (200)
  const cleanDelAssign = await httpReq(
    `/api/v1/faculty-assignments/${assign2._id}`,
    reqOpts(adminCookie, 'DELETE')
  );
  check(cleanDelAssign.status === 200, 'Assignment: Clean DELETE without dependencies succeeds (200)');

  const cleanDelEnroll = await httpReq(
    `/api/v1/enrollments/${enroll1Id}`,
    reqOpts(adminCookie, 'DELETE')
  );
  check(cleanDelEnroll.status === 200, 'Enrollment: Clean DELETE without dependencies succeeds (200)');

  // =========================================================================
  // 6. STUDENT & FACULTY DASHBOARD APIs + AUDIT LOG VERIFICATION
  // =========================================================================
  const stuDashRes = await httpReq('/api/v1/dashboards/student', reqOpts(stu2Cookie));
  check(
    stuDashRes.status === 200 && stuDashRes.data?.data?.enrolledCount === 2,
    'Dashboard: GET /dashboards/student returns live Enrollment counts and subjects',
    JSON.stringify(stuDashRes.data?.data)
  );

  const facDashRes = await httpReq('/api/v1/dashboards/faculty', reqOpts(fac1Cookie));
  check(
    facDashRes.status === 200 && facDashRes.data?.data?.assignedCount === 1,
    'Dashboard: GET /dashboards/faculty returns live active FacultyAssignment list & counts',
    JSON.stringify(facDashRes.data?.data)
  );

  await new Promise((r) => setTimeout(r, 350));
  const auditCount = await AuditLog.countDocuments({
    actor: adminUser._id,
    entity: { $in: ['ENROLLMENT', 'FACULTY_ASSIGNMENT'] }
  });
  check(
    auditCount >= 6,
    `Audit Log: Recorded ${auditCount} ENROLLMENT & FACULTY_ASSIGNMENT audit trail entries`
  );

  // Teardown all test fixtures
  await Attendance.deleteMany({ _id: { $in: cleanup.attendanceIds } });
  await FacultyAssignment.deleteMany({ _id: { $in: cleanup.assignmentIds } });
  await Enrollment.deleteMany({ _id: { $in: cleanup.enrollmentIds } });
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
  console.log(`PHASE 7 INTEGRATION SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(72));
  if (failed > 0) process.exit(1);
};

runPhase7Tests().catch(async (err) => {
  console.error('[Phase 7 Test Fatal Error]', err);
  if (server) await new Promise((resolve) => server.close(resolve));
  await closeDatabase();
  process.exit(1);
});
