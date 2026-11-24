import http from 'http';
import app from '../app.js';
import env from '../config/env.js';
import connectDB, { closeDatabase } from '../config/db.js';
import {
  User,
  Student,
  Faculty,
  Department,
  Course,
  Semester,
  Subject,
  FacultyAssignment,
  Attendance,
  AuditLog
} from '../models/index.js';

let server = null;
let baseUrl = '';
let passed = 0;
let failed = 0;

const cleanupTracker = {
  userIds: [],
  studentIds: [],
  facultyIds: [],
  deptIds: [],
  courseIds: [],
  semesterIds: [],
  subjectIds: [],
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

const httpReq = (path, { method = 'GET', body = null, cookies = {}, headers = {} } = {}) => {
  return new Promise((resolve, reject) => {
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
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: reqHeaders
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => { raw += c; });
        res.on('end', () => {
          let data = null;
          try { data = JSON.parse(raw); } catch { data = raw; }
          resolve({
            status: res.statusCode,
            cookies: extractCookies(res.headers['set-cookie']),
            data
          });
        });
      }
    );
    req.on('error', reject);
    if (payload !== null) req.write(payload);
    req.end();
  });
};

const runPhase5Tests = async () => {
  console.log('='.repeat(72));
  console.log('PHASE 5 USER, STUDENT & FACULTY MANAGEMENT INTEGRATION SUITE');
  console.log('='.repeat(72) + '\n');

  await connectDB();

  const tag = Date.now();
  const pw = 'StrongPass@123';

  // Setup isolated test actors & academic hierarchy
  const adminActor = await User.create({ name: 'P5 Admin', email: `p5_admin_${tag}@aktu.test`, password: pw, role: 'admin', isActive: true });
  const facultyActorUser = await User.create({ name: 'P5 FacActor', email: `p5_fac_actor_${tag}@aktu.test`, password: pw, role: 'faculty', isActive: true });
  const studentActorUser = await User.create({ name: 'P5 StuActor', email: `p5_stu_actor_${tag}@aktu.test`, password: pw, role: 'student', isActive: true });
  cleanupTracker.userIds.push(adminActor._id, facultyActorUser._id, studentActorUser._id);
  cleanupTracker.auditActorIds.push(adminActor._id);

  const deptA = await Department.create({ code: `P5DA${tag}`, name: 'P5 Dept A', isActive: true });
  const deptB = await Department.create({ code: `P5DB${tag}`, name: 'P5 Dept B', isActive: true });
  const deptInactive = await Department.create({ code: `P5DI${tag}`, name: 'P5 Inactive Dept', isActive: false });
  cleanupTracker.deptIds.push(deptA._id, deptB._id, deptInactive._id);

  const courseA = await Course.create({ code: `P5CA${tag}`, name: 'P5 Course A', department: deptA._id, isActive: true });
  const courseB = await Course.create({ code: `P5CB${tag}`, name: 'P5 Course B', department: deptB._id, isActive: true });
  cleanupTracker.courseIds.push(courseA._id, courseB._id);

  const semA1 = await Semester.create({
    course: courseA._id,
    semesterNumber: 1,
    academicYear: '2026-2027',
    startDate: new Date('2026-08-01'),
    endDate: new Date('2026-12-20'),
    status: 'ACTIVE'
  });
  const semB1 = await Semester.create({
    course: courseB._id,
    semesterNumber: 1,
    academicYear: '2026-2027',
    startDate: new Date('2026-08-01'),
    endDate: new Date('2026-12-20'),
    status: 'ACTIVE'
  });
  cleanupTracker.semesterIds.push(semA1._id, semB1._id);

  const subjA = await Subject.create({
    code: `P5SA${tag}`,
    name: 'P5 Subject A',
    course: courseA._id,
    semester: semA1._id,
    credits: 4
  });
  cleanupTracker.subjectIds.push(subjA._id);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  console.log(`[Test Server] Listening on ${baseUrl}\n`);

  // Initialize CSRF and sign in as Admin, Faculty, Student
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

  const adminCookie = await loginAs(adminActor.email);
  const facultyCookie = await loginAs(facultyActorUser.email);
  const studentCookie = await loginAs(studentActorUser.email);

  const adminOpts = (method = 'GET', body = null) => ({
    method,
    body,
    cookies: { [env.COOKIE_NAME]: adminCookie, [env.CSRF_COOKIE_NAME]: csrf },
    headers: { 'X-CSRF-Token': csrf }
  });

  // === AUTHORIZATION CHECKS ===
  const unauthUsers = await httpReq('/api/v1/users');
  check(unauthUsers.status === 401, 'Auth: Unauthenticated request rejected (401)');

  const studentCreateUser = await httpReq('/api/v1/users', {
    method: 'POST',
    cookies: { [env.COOKIE_NAME]: studentCookie, [env.CSRF_COOKIE_NAME]: csrf },
    headers: { 'X-CSRF-Token': csrf },
    body: { name: 'Hacker', email: `hack_${tag}@aktu.test`, password: pw, role: 'admin' }
  });
  check(studentCreateUser.status === 403, 'Auth: Student creating user rejected (403)');

  const facultyCreateStudent = await httpReq('/api/v1/students', {
    method: 'POST',
    cookies: { [env.COOKIE_NAME]: facultyCookie, [env.CSRF_COOKIE_NAME]: csrf },
    headers: { 'X-CSRF-Token': csrf },
    body: { firstName: 'X', lastName: 'Y', email: `x_${tag}@aktu.test`, password: pw }
  });
  check(facultyCreateStudent.status === 403, 'Auth: Faculty creating student rejected (403)');

  // === USER MANAGEMENT TESTS ===
  const createAdminRes = await httpReq('/api/v1/users', adminOpts('POST', {
    name: 'Second Admin',
    email: `p5_admin2_${tag}@aktu.test`,
    password: pw,
    role: 'admin',
    isActive: true
  }));
  const secondAdmin = createAdminRes.data?.data;
  if (secondAdmin?.id) cleanupTracker.userIds.push(secondAdmin.id);
  check(
    createAdminRes.status === 201 && secondAdmin?.role === 'admin' && !secondAdmin?.password,
    'User: Create admin user returns 201 without passwordHash'
  );

  const dupEmailUser = await httpReq('/api/v1/users', adminOpts('POST', {
    name: 'Dup Admin',
    email: `p5_admin2_${tag}@aktu.test`,
    password: pw,
    role: 'admin'
  }));
  check(dupEmailUser.status === 409, 'User: Duplicate email rejected (409)');

  const badRoleUser = await httpReq('/api/v1/users', adminOpts('POST', {
    name: 'Bad Role',
    email: `badrole_${tag}@aktu.test`,
    password: pw,
    role: 'superuser'
  }));
  check(badRoleUser.status === 422, 'User: Invalid role rejected (422)');

  const badIdUser = await httpReq('/api/v1/users/invalid-object-id', adminOpts('GET'));
  check(badIdUser.status === 422, 'User: Invalid ObjectId rejected (422)');

  const getUserRes = await httpReq(`/api/v1/users/${secondAdmin.id}`, adminOpts('GET'));
  check(getUserRes.status === 200 && getUserRes.data?.data?.email === secondAdmin.email, 'User: Retrieve user by ID (200)');

  const editUserRes = await httpReq(`/api/v1/users/${secondAdmin.id}`, adminOpts('PATCH', {
    name: 'Second Admin Updated'
  }));
  check(editUserRes.status === 200 && editUserRes.data?.data?.name === 'Second Admin Updated', 'User: Update permitted fields (200)');

  const selfDeactivate = await httpReq(`/api/v1/users/${adminActor._id}/status`, adminOpts('PATCH', { isActive: false }));
  check(selfDeactivate.status === 400, 'User: Admin cannot deactivate self (400)');

  const secondAdminCookie = await loginAs(secondAdmin.email);
  const deactSecond = await httpReq(`/api/v1/users/${secondAdmin.id}/status`, adminOpts('PATCH', { isActive: false }));
  const secondSessionCheck = await httpReq('/api/v1/auth/me', {
    cookies: { [env.COOKIE_NAME]: secondAdminCookie }
  });
  check(
    deactSecond.status === 200 && deactSecond.data?.data?.isActive === false && secondSessionCheck.status === 401,
    'User: Deactivated user session immediately invalidated (401)'
  );

  // === STUDENT MANAGEMENT TESTS ===
  const createStuRes = await httpReq('/api/v1/students', adminOpts('POST', {
    firstName: 'Aarav',
    lastName: 'Sharma',
    email: `p5_stu1_${tag}@aktu.test`,
    password: pw,
    enrollmentNumber: `ENP5${tag}`,
    dateOfBirth: '2005-03-10',
    gender: 'MALE',
    contactNumber: '9876543210',
    address: 'Lucknow UP',
    department: deptA._id.toString(),
    course: courseA._id.toString(),
    semester: semA1._id.toString(),
    admissionYear: 2026,
    status: 'ACTIVE'
  }));
  const stu1 = createStuRes.data?.data;
  if (stu1?._id) cleanupTracker.studentIds.push(stu1._id);
  if (stu1?.user?._id) cleanupTracker.userIds.push(stu1.user._id);
  check(
    createStuRes.status === 201 && stu1?.course?._id === courseA._id.toString() && stu1?.semester?._id === semA1._id.toString(),
    'Student: Created with linked User and valid Department -> Course -> Semester (201)'
  );

  // Reject duplicate enrollment number
  const dupEnrollStu = await httpReq('/api/v1/students', adminOpts('POST', {
    firstName: 'Dup',
    lastName: 'Enroll',
    email: `p5_stu_dup_${tag}@aktu.test`,
    password: pw,
    enrollmentNumber: `ENP5${tag}`,
    dateOfBirth: '2005-03-10',
    gender: 'MALE',
    contactNumber: '9876543211',
    address: 'Lucknow',
    department: deptA._id.toString(),
    course: courseA._id.toString(),
    semester: semA1._id.toString(),
    admissionYear: 2026
  }));
  check(dupEnrollStu.status === 409, 'Student: Duplicate enrollment number rejected (409)');

  // Reject inactive department
  const inactiveDeptStu = await httpReq('/api/v1/students', adminOpts('POST', {
    firstName: 'Bad',
    lastName: 'Dept',
    email: `p5_stu_baddept_${tag}@aktu.test`,
    password: pw,
    enrollmentNumber: `ENBAD1${tag}`,
    dateOfBirth: '2005-03-10',
    gender: 'MALE',
    contactNumber: '9876543211',
    address: 'Lucknow',
    department: deptInactive._id.toString(),
    course: courseA._id.toString(),
    semester: semA1._id.toString(),
    admissionYear: 2026
  }));
  check(inactiveDeptStu.status === 400, 'Student: Inactive department rejected (400)');

  // Reject course from another department
  const wrongCourseDept = await httpReq('/api/v1/students', adminOpts('POST', {
    firstName: 'Wrong',
    lastName: 'Course',
    email: `p5_stu_wrongc_${tag}@aktu.test`,
    password: pw,
    enrollmentNumber: `ENBAD2${tag}`,
    dateOfBirth: '2005-03-10',
    gender: 'MALE',
    contactNumber: '9876543211',
    address: 'Lucknow',
    department: deptA._id.toString(),
    course: courseB._id.toString(),
    semester: semB1._id.toString(),
    admissionYear: 2026
  }));
  check(wrongCourseDept.status === 400, 'Student: Course from another department rejected (400)');

  // Reject semester from another course
  const wrongSemCourse = await httpReq('/api/v1/students', adminOpts('POST', {
    firstName: 'Wrong',
    lastName: 'Sem',
    email: `p5_stu_wrongs_${tag}@aktu.test`,
    password: pw,
    enrollmentNumber: `ENBAD3${tag}`,
    dateOfBirth: '2005-03-10',
    gender: 'MALE',
    contactNumber: '9876543211',
    address: 'Lucknow',
    department: deptA._id.toString(),
    course: courseA._id.toString(),
    semester: semB1._id.toString(),
    admissionYear: 2026
  }));
  check(wrongSemCourse.status === 400, 'Student: Semester from another course rejected (400)');

  // Prevent changing role of User linked to Student
  const linkedRoleChange = await httpReq(`/api/v1/users/${stu1.user._id}`, adminOpts('PATCH', { role: 'admin' }));
  check(linkedRoleChange.status === 409, 'User: Changing role of user linked to Student rejected (409)');

  // === FACULTY MANAGEMENT TESTS ===
  const createFacRes = await httpReq('/api/v1/faculty', adminOpts('POST', {
    firstName: 'Dr. Meera',
    lastName: 'Nair',
    email: `p5_fac1_${tag}@aktu.test`,
    password: pw,
    employeeId: `FACP5${tag}`,
    department: deptA._id.toString(),
    designation: 'PROFESSOR',
    specialization: 'Distributed Systems',
    contactNumber: '9811223344',
    joiningDate: '2025-07-01',
    status: 'ACTIVE'
  }));
  const fac1 = createFacRes.data?.data;
  if (fac1?._id) cleanupTracker.facultyIds.push(fac1._id);
  if (fac1?.user?._id) cleanupTracker.userIds.push(fac1.user._id);
  check(createFacRes.status === 201 && fac1?.employeeId === `FACP5${tag}`, 'Faculty: Created with linked User and active Department (201)');

  const dupEmpRes = await httpReq('/api/v1/faculty', adminOpts('POST', {
    firstName: 'Dup',
    lastName: 'Fac',
    email: `p5_fac2_${tag}@aktu.test`,
    password: pw,
    employeeId: `FACP5${tag}`,
    department: deptA._id.toString(),
    designation: 'LECTURER',
    specialization: 'Algorithms',
    contactNumber: '9811223345',
    joiningDate: '2025-07-01'
  }));
  check(dupEmpRes.status === 409, 'Faculty: Duplicate employee ID rejected (409)');

  // Create real historical Attendance & FacultyAssignment to verify deletion protection & course-switch guard
  const fa = await FacultyAssignment.create({
    faculty: fac1._id,
    subject: subjA._id,
    semester: semA1._id,
    section: 'A',
    academicYear: '2026-2027'
  });
  cleanupTracker.assignmentIds.push(fa._id);

  const att = await Attendance.create({
    student: stu1._id,
    subject: subjA._id,
    semester: semA1._id,
    markedBy: fac1._id,
    date: new Date('2026-09-01'),
    status: 'PRESENT'
  });
  cleanupTracker.attendanceIds.push(att._id);

  const unsafeCourseUpdate = await httpReq(`/api/v1/students/${stu1._id}`, adminOpts('PATCH', {
    department: deptB._id.toString(),
    course: courseB._id.toString(),
    semester: semB1._id.toString()
  }));
  check(unsafeCourseUpdate.status === 409, 'Student: Unsafe course switch blocked when historical attendance exists (409)');

  const deleteStuBlocked = await httpReq(`/api/v1/students/${stu1._id}`, adminOpts('DELETE'));
  check(deleteStuBlocked.status === 409, 'Student: Hard delete blocked when historical attendance exists (409)');

  const deleteFacBlocked = await httpReq(`/api/v1/faculty/${fac1._id}`, adminOpts('DELETE'));
  check(deleteFacBlocked.status === 409, 'Faculty: Hard delete blocked when teaching assignments/attendance exist (409)');

  // Deactivate Student & Faculty -> preserves historical records and disables login
  const deactStu = await httpReq(`/api/v1/students/${stu1._id}/status`, adminOpts('PATCH', { status: 'INACTIVE' }));
  const stuLoginAfterDeact = await httpReq('/api/v1/auth/login', {
    method: 'POST',
    cookies: { [env.CSRF_COOKIE_NAME]: csrf },
    headers: { 'X-CSRF-Token': csrf },
    body: { email: stu1.user.email, password: pw }
  });
  const attStillExists = await Attendance.countDocuments({ student: stu1._id });
  check(
    deactStu.status === 200 && stuLoginAfterDeact.status === 401 && attStillExists === 1,
    'Student: Deactivation disables login while preserving historical attendance'
  );

  const deactFac = await httpReq(`/api/v1/faculty/${fac1._id}/status`, adminOpts('PATCH', { status: 'INACTIVE' }));
  const facDetail = await httpReq(`/api/v1/faculty/${fac1._id}`, adminOpts('GET'));
  check(
    deactFac.status === 200 && facDetail.data?.data?.assignments?.length === 1,
    'Faculty: Deactivation preserves assignments and detail endpoint returns real DB assignments'
  );

  // === PAGINATION, SEARCH, FILTER & SORTING ===
  const searchStu = await httpReq(`/api/v1/students?search=ENP5${tag}&department=${deptA._id}&status=inactive&page=1&limit=5`, adminOpts('GET'));
  check(
    searchStu.status === 200 &&
      searchStu.data?.data?.length === 1 &&
      searchStu.data?.meta?.pagination?.limit === 5 &&
      searchStu.data?.meta?.pagination?.totalRecords === 1,
    'Search/Filter/Pagination: Student query returns accurate match & pagination meta'
  );

  const searchFac = await httpReq(`/api/v1/faculty?search=Distributed&department=${deptA._id}&designation=PROFESSOR`, adminOpts('GET'));
  check(searchFac.status === 200 && searchFac.data?.data?.length === 1, 'Search/Filter: Faculty search & designation filter work');

  const regexEscapeTest = await httpReq('/api/v1/users?search=p5_admin2.*[test]', adminOpts('GET'));
  check(regexEscapeTest.status === 200, 'Security: Regex metacharacters in search query handled safely without error');

  const invalidLimit = await httpReq('/api/v1/students?limit=500', adminOpts('GET'));
  check(invalidLimit.status === 422, 'Pagination: Exceeding max page size rejected (422)');

  const invalidSort = await httpReq('/api/v1/users?sortBy=__proto__', adminOpts('GET'));
  check(invalidSort.status === 422, 'Sorting: Non-whitelisted sortBy rejected (422)');

  // === AUDIT LOG VERIFICATION ===
  // Brief delay for async res.send audit hook write
  await new Promise((r) => setTimeout(r, 400));
  const auditRecords = await AuditLog.find({ actor: adminActor._id }).lean();
  const auditHasSensitive = auditRecords.some((log) => {
    const str = JSON.stringify(log);
    return str.includes(pw) || str.includes('passwordHash');
  });
  check(
    auditRecords.length >= 6 && !auditHasSensitive,
    `AuditLog: Recorded ${auditRecords.length} admin audit entries with zero password/token leakage`
  );
};

runPhase5Tests()
  .catch((err) => {
    console.error('[Phase 5 Test Fatal Error]', err);
    failed++;
  })
  .finally(async () => {
    try {
      if (cleanupTracker.attendanceIds.length) await Attendance.deleteMany({ _id: { $in: cleanupTracker.attendanceIds } });
      if (cleanupTracker.assignmentIds.length) await FacultyAssignment.deleteMany({ _id: { $in: cleanupTracker.assignmentIds } });
      if (cleanupTracker.subjectIds.length) await Subject.deleteMany({ _id: { $in: cleanupTracker.subjectIds } });
      if (cleanupTracker.semesterIds.length) await Semester.deleteMany({ _id: { $in: cleanupTracker.semesterIds } });
      if (cleanupTracker.courseIds.length) await Course.deleteMany({ _id: { $in: cleanupTracker.courseIds } });
      if (cleanupTracker.deptIds.length) await Department.deleteMany({ _id: { $in: cleanupTracker.deptIds } });
      if (cleanupTracker.studentIds.length) await Student.deleteMany({ _id: { $in: cleanupTracker.studentIds } });
      if (cleanupTracker.facultyIds.length) await Faculty.deleteMany({ _id: { $in: cleanupTracker.facultyIds } });
      if (cleanupTracker.userIds.length) await User.deleteMany({ _id: { $in: cleanupTracker.userIds } });
      if (cleanupTracker.auditActorIds.length) await AuditLog.deleteMany({ actor: { $in: cleanupTracker.auditActorIds } });
      console.log('\n[Cleanup] Removed all isolated Phase 5 test records cleanly.');
      if (server) await new Promise((resolve) => server.close(resolve));
      await closeDatabase();
    } catch (cleanupErr) {
      console.error('[Cleanup Error]', cleanupErr.message);
    }

    console.log('\n' + '='.repeat(72));
    console.log(`PHASE 5 INTEGRATION TESTS -> TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('='.repeat(72) + '\n');
    process.exit(failed > 0 ? 1 : 0);
  });
