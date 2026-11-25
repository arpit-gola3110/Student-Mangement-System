import http from 'http';
import mongoose from 'mongoose';
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
  Examination,
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
  examIds: [],
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

const runPhase6Tests = async () => {
  console.log('='.repeat(72));
  console.log('PHASE 6 DEPARTMENT, COURSE, SEMESTER & SUBJECT INTEGRATION SUITE');
  console.log('='.repeat(72) + '\n');

  await connectDB();

  const tag = Date.now();
  const pw = 'StrongPass@123';

  const adminActor = await User.create({ name: 'P6 Admin', email: `p6_admin_${tag}@aktu.test`, password: pw, role: 'admin', isActive: true });
  const facultyUser = await User.create({ name: 'P6 Faculty', email: `p6_fac_${tag}@aktu.test`, password: pw, role: 'faculty', isActive: true });
  const studentUser = await User.create({ name: 'P6 Student', email: `p6_stu_${tag}@aktu.test`, password: pw, role: 'student', isActive: true });
  cleanup.userIds.push(adminActor._id, facultyUser._id, studentUser._id);
  cleanup.auditActorIds.push(adminActor._id);

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

  const adminCookie = await loginAs(adminActor.email);
  const facultyCookie = await loginAs(facultyUser.email);
  const studentCookie = await loginAs(studentUser.email);

  const adminOpts = (method = 'GET', body = null) => ({
    method,
    body,
    cookies: { [env.COOKIE_NAME]: adminCookie, [env.CSRF_COOKIE_NAME]: csrf },
    headers: { 'X-CSRF-Token': csrf }
  });

  // === AUTHORIZATION & CSRF CHECKS ===
  const unauthDept = await httpReq('/api/v1/departments');
  check(unauthDept.status === 401, 'Auth: Unauthenticated request rejected (401)');

  const noCsrfDept = await httpReq('/api/v1/departments', {
    method: 'POST',
    cookies: { [env.COOKIE_NAME]: adminCookie },
    body: { code: `NOCSRF${tag}`, name: 'No CSRF Dept' }
  });
  check(noCsrfDept.status === 403, 'Security: Missing CSRF rejected on academic write (403)');

  const facultyWriteDept = await httpReq('/api/v1/departments', {
    method: 'POST',
    cookies: { [env.COOKIE_NAME]: facultyCookie, [env.CSRF_COOKIE_NAME]: csrf },
    headers: { 'X-CSRF-Token': csrf },
    body: { code: `FW${tag}`, name: 'Faculty Write Dept' }
  });
  check(facultyWriteDept.status === 403, 'Auth: Faculty cannot create department (403)');

  const studentWriteSubj = await httpReq('/api/v1/subjects', {
    method: 'POST',
    cookies: { [env.COOKIE_NAME]: studentCookie, [env.CSRF_COOKIE_NAME]: csrf },
    headers: { 'X-CSRF-Token': csrf },
    body: { code: `SW${tag}`, name: 'Student Write Subj' }
  });
  check(studentWriteSubj.status === 403, 'Auth: Student cannot create subject (403)');

  // === 15.1 DEPARTMENT TESTS ===
  const createDept1 = await httpReq('/api/v1/departments', adminOpts('POST', {
    code: `P6D1_${tag}`,
    name: `P6 Department One ${tag}`,
    description: 'Primary test division'
  }));
  const dept1 = createDept1.data?.data;
  if (dept1?._id) cleanup.deptIds.push(dept1._id);
  check(createDept1.status === 201 && dept1?.code === `P6D1_${tag}`, 'Dept: Create department succeeds (201)');

  const createDept2 = await httpReq('/api/v1/departments', adminOpts('POST', {
    code: `P6D2_${tag}`,
    name: `P6 Department Two ${tag}`
  }));
  const dept2 = createDept2.data?.data;
  if (dept2?._id) cleanup.deptIds.push(dept2._id);

  // Create faculty under dept1 to test valid HOD and active Student
  const facDoc = await Faculty.create({
    user: facultyUser._id,
    employeeId: `P6FAC${tag}`,
    firstName: 'Dr. Test',
    lastName: 'Faculty',
    department: dept1._id,
    designation: 'PROFESSOR',
    specialization: 'AI',
    contactNumber: '9876543210',
    status: 'ACTIVE'
  });
  cleanup.facultyIds.push(facDoc._id);

  const missingDeptName = await httpReq('/api/v1/departments', adminOpts('POST', { code: `BAD${tag}` }));
  check(missingDeptName.status === 422, 'Dept: Missing name rejected (422)');

  const dupDeptCode = await httpReq('/api/v1/departments', adminOpts('POST', { code: `P6D1_${tag}`, name: 'Other Name' }));
  check(dupDeptCode.status === 409, 'Dept: Duplicate code rejected (409)');

  const dupDeptName = await httpReq('/api/v1/departments', adminOpts('POST', { code: `NEW${tag}`, name: `p6 department one ${tag}` }));
  check(dupDeptName.status === 409, 'Dept: Duplicate case-insensitive name rejected (409)');

  const invalidHod = await httpReq('/api/v1/departments', adminOpts('POST', {
    code: `BHOD${tag}`,
    name: 'Bad HOD Dept',
    headOfDepartment: new mongoose.Types.ObjectId().toString()
  }));
  check(invalidHod.status === 400, 'Dept: Invalid Head of Department rejected (400)');

  const badDeptId = await httpReq('/api/v1/departments/not-an-objectid', adminOpts('GET'));
  check(badDeptId.status === 422, 'Dept: Invalid ObjectId rejected (422)');

  const updateDept = await httpReq(`/api/v1/departments/${dept1._id}`, adminOpts('PATCH', {
    headOfDepartment: facDoc._id.toString(),
    description: 'Updated description'
  }));
  check(updateDept.status === 200 && updateDept.data?.data?.headOfDepartment?._id === facDoc._id.toString(), 'Dept: Update with valid HOD succeeds (200)');

  const deactDept2 = await httpReq(`/api/v1/departments/${dept2._id}/status`, adminOpts('PATCH', { isActive: false }));
  check(deactDept2.status === 200 && deactDept2.data?.data?.isActive === false, 'Dept: Deactivate department succeeds (200)');

  // === 15.2 COURSE TESTS ===
  const createCourse1 = await httpReq('/api/v1/courses', adminOpts('POST', {
    code: `P6C1_${tag}`,
    name: `P6 BTech CSE ${tag}`,
    department: dept1._id,
    durationYears: 4,
    totalSemesters: 8,
    description: 'Four year undergraduate degree'
  }));
  const course1 = createCourse1.data?.data;
  if (course1?._id) cleanup.courseIds.push(course1._id);
  check(createCourse1.status === 201 && course1?.totalSemesters === 8, 'Course: Create course succeeds (201)');

  const dupCourseCode = await httpReq('/api/v1/courses', adminOpts('POST', {
    code: `P6C1_${tag}`,
    name: 'Duplicate Code Course',
    department: dept1._id,
    durationYears: 4,
    totalSemesters: 8
  }));
  check(dupCourseCode.status === 409, 'Course: Duplicate code rejected (409)');

  const invalidDeptCourse = await httpReq('/api/v1/courses', adminOpts('POST', {
    code: `P6CINV_${tag}`,
    name: 'Invalid Dept Course',
    department: new mongoose.Types.ObjectId().toString(),
    durationYears: 4,
    totalSemesters: 8
  }));
  check(invalidDeptCourse.status === 400, 'Course: Non-existent department rejected (400)');

  const inactiveDeptCourse = await httpReq('/api/v1/courses', adminOpts('POST', {
    code: `P6CINACT_${tag}`,
    name: 'Inactive Dept Course',
    department: dept2._id,
    durationYears: 4,
    totalSemesters: 8
  }));
  check(inactiveDeptCourse.status === 400, 'Course: Inactive department rejected for new course (400)');

  const badDurationCourse = await httpReq('/api/v1/courses', adminOpts('POST', {
    code: `P6CDUR_${tag}`,
    name: 'Bad Duration Course',
    department: dept1._id,
    durationYears: 0,
    totalSemesters: 20
  }));
  check(badDurationCourse.status === 422, 'Course: Invalid duration/totalSemesters rejected (422)');

  const deleteDeptBlocked = await httpReq(`/api/v1/departments/${dept1._id}`, adminOpts('DELETE'));
  check(deleteDeptBlocked.status === 409, 'Dept: Unsafe deletion blocked when courses/faculty exist (409)');

  // === 15.3 SEMESTER TESTS ===
  const createSem5 = await httpReq('/api/v1/semesters', adminOpts('POST', {
    course: course1._id,
    semesterNumber: 5,
    academicYear: '2026-2027',
    startDate: '2026-08-01',
    endDate: '2026-12-20',
    status: 'ACTIVE'
  }));
  const sem5 = createSem5.data?.data;
  if (sem5?._id) cleanup.semesterIds.push(sem5._id);
  check(createSem5.status === 201 && sem5?.semesterNumber === 5, 'Semester: Create valid semester succeeds (201)');

  const createCourse2 = await httpReq('/api/v1/courses', adminOpts('POST', {
    code: `P6C2_${tag}`,
    name: `P6 MTech CSE ${tag}`,
    department: dept1._id,
    durationYears: 2,
    totalSemesters: 4
  }));
  const course2 = createCourse2.data?.data;
  if (course2?._id) cleanup.courseIds.push(course2._id);

  const createSem2OnC2 = await httpReq('/api/v1/semesters', adminOpts('POST', {
    course: course2._id,
    semesterNumber: 2,
    academicYear: '2026-2027',
    startDate: '2026-08-01',
    endDate: '2026-12-20',
    status: 'ACTIVE'
  }));
  const sem2C2 = createSem2OnC2.data?.data;
  if (sem2C2?._id) cleanup.semesterIds.push(sem2C2._id);

  const invalidCourseSem = await httpReq('/api/v1/semesters', adminOpts('POST', {
    course: new mongoose.Types.ObjectId().toString(),
    semesterNumber: 1,
    academicYear: '2026-2027',
    startDate: '2026-08-01',
    endDate: '2026-12-20'
  }));
  check(invalidCourseSem.status === 400, 'Semester: Invalid course rejected (400)');

  const exceedSemLimit = await httpReq('/api/v1/semesters', adminOpts('POST', {
    course: course2._id,
    semesterNumber: 6,
    academicYear: '2026-2027',
    startDate: '2026-08-01',
    endDate: '2026-12-20'
  }));
  check(exceedSemLimit.status === 400, 'Semester: Semester number exceeding course totalSemesters rejected (400)');

  const dupSem = await httpReq('/api/v1/semesters', adminOpts('POST', {
    course: course1._id,
    semesterNumber: 5,
    academicYear: '2026-2027',
    startDate: '2026-08-01',
    endDate: '2026-12-20'
  }));
  check(dupSem.status === 409, 'Semester: Duplicate { course, semesterNumber, academicYear } rejected (409)');

  const badDatesSem = await httpReq('/api/v1/semesters', adminOpts('POST', {
    course: course1._id,
    semesterNumber: 6,
    academicYear: '2026-2027',
    startDate: '2026-12-20',
    endDate: '2026-08-01'
  }));
  check(badDatesSem.status === 422, 'Semester: endDate earlier than startDate rejected (422)');

  const reduceCourseSemsBlocked = await httpReq(`/api/v1/courses/${course1._id}`, adminOpts('PATCH', { totalSemesters: 4 }));
  check(reduceCourseSemsBlocked.status === 409, 'Course: Reducing totalSemesters below existing Semester 5 blocked (409)');

  const reassignCourseDeptBlocked = await httpReq(`/api/v1/courses/${course1._id}`, adminOpts('PATCH', { department: dept2._id }));
  check(reassignCourseDeptBlocked.status === 409, 'Course: Reassigning department with existing semesters blocked (409)');

  const reassignSemCourseBlocked = await httpReq(`/api/v1/semesters/${sem5._id}`, adminOpts('PATCH', { course: course2._id }));
  check(reassignSemCourseBlocked.status === 422, 'Semester: Course reassignment rejected by strict schema (422)');

  // === 15.4 SUBJECT TESTS ===
  const createSubj1 = await httpReq('/api/v1/subjects', adminOpts('POST', {
    code: `P6S1_${tag}`,
    name: `Compiler Design ${tag}`,
    course: course1._id,
    semester: sem5._id,
    credits: 4,
    type: 'THEORY',
    maxInternalMarks: 30,
    maxExternalMarks: 70
  }));
  const subj1 = createSubj1.data?.data;
  if (subj1?._id) cleanup.subjectIds.push(subj1._id);
  check(createSubj1.status === 201 && subj1?.totalMaxMarks === 100, 'Subject: Create valid subject succeeds (201)');

  const dupSubjCode = await httpReq('/api/v1/subjects', adminOpts('POST', {
    code: `P6S1_${tag}`,
    name: 'Other Name',
    course: course1._id,
    semester: sem5._id,
    credits: 3,
    type: 'THEORY',
    maxInternalMarks: 30,
    maxExternalMarks: 70
  }));
  check(dupSubjCode.status === 409, 'Subject: Duplicate subject code rejected (409)');

  const mismatchSemSubj = await httpReq('/api/v1/subjects', adminOpts('POST', {
    code: `P6SMIS_${tag}`,
    name: 'Mismatched Sem Subject',
    course: course1._id,
    semester: sem2C2._id,
    credits: 3,
    type: 'THEORY',
    maxInternalMarks: 30,
    maxExternalMarks: 70
  }));
  check(mismatchSemSubj.status === 400, 'Subject: Semester belonging to another course rejected (400)');

  const badCreditsSubj = await httpReq('/api/v1/subjects', adminOpts('POST', {
    code: `P6SCR_${tag}`,
    name: 'Bad Credits',
    course: course1._id,
    semester: sem5._id,
    credits: 9,
    type: 'THEORY',
    maxInternalMarks: 30,
    maxExternalMarks: 70
  }));
  check(badCreditsSubj.status === 422, 'Subject: Credits outside 1-6 rejected (422)');

  const badMarksSubj = await httpReq('/api/v1/subjects', adminOpts('POST', {
    code: `P6SMK_${tag}`,
    name: 'Bad Marks',
    course: course1._id,
    semester: sem5._id,
    credits: 3,
    type: 'THEORY',
    maxInternalMarks: 50,
    maxExternalMarks: 80
  }));
  check(badMarksSubj.status === 422, 'Subject: Combined marks > 100 rejected (422)');

  const changeSemNumBlocked = await httpReq(`/api/v1/semesters/${sem5._id}`, adminOpts('PATCH', { semesterNumber: 7 }));
  check(changeSemNumBlocked.status === 409, 'Semester: Changing semesterNumber blocked while subjects exist (409)');

  // Create Student, Examination & Result referencing subj1 to verify marks-reduction & reassignment guards
  const stuDoc = await Student.create({
    user: studentUser._id,
    rollNumber: `P6R${tag}`,
    enrollmentNumber: `P6E${tag}`,
    firstName: 'Test',
    lastName: 'Student',
    dateOfBirth: new Date('2005-01-01'),
    gender: 'MALE',
    department: dept1._id,
    course: course1._id,
    semester: sem5._id,
    contactNumber: '9876543210',
    address: 'Lucknow',
    currentSemester: 5
  });
  cleanup.studentIds.push(stuDoc._id);

  const examDoc = await Examination.create({
    title: `P6 Exam ${tag}`,
    examType: 'END_SEMESTER',
    semester: sem5._id,
    academicYear: '2026-2027',
    startDate: new Date('2026-12-01'),
    endDate: new Date('2026-12-15')
  });
  cleanup.examIds.push(examDoc._id);

  const resDoc = await Result.create({
    examination: examDoc._id,
    student: stuDoc._id,
    subject: subj1._id,
    evaluatedBy: facDoc._id,
    internalMarks: 28,
    externalMarks: 62,
    totalMarks: 90,
    grade: 'A+',
    gradePoints: 10
  });
  cleanup.resultIds.push(resDoc._id);

  const unsafeMarksReduce = await httpReq(`/api/v1/subjects/${subj1._id}`, adminOpts('PATCH', {
    maxInternalMarks: 20,
    maxExternalMarks: 70
  }));
  check(unsafeMarksReduce.status === 409, 'Subject: Reducing maxInternalMarks below recorded result (28) blocked (409)');

  const unsafeSubjReassign = await httpReq(`/api/v1/subjects/${subj1._id}`, adminOpts('PATCH', {
    course: course2._id,
    semester: sem2C2._id
  }));
  check(unsafeSubjReassign.status === 409, 'Subject: Reassigning subject with existing results blocked (409)');

  const deleteSubjBlocked = await httpReq(`/api/v1/subjects/${subj1._id}`, adminOpts('DELETE'));
  check(deleteSubjBlocked.status === 409, 'Subject: Hard delete blocked when results exist (409)');

  const deactSubj = await httpReq(`/api/v1/subjects/${subj1._id}/status`, adminOpts('PATCH', { isActive: false }));
  check(deactSubj.status === 200 && deactSubj.data?.data?.isActive === false, 'Subject: Soft deactivation succeeds cleanly (200)');

  // === SEARCH, FILTER, PAGINATION & READ MATRIX ===
  const studentReadsDepts = await httpReq('/api/v1/departments', {
    cookies: { [env.COOKIE_NAME]: studentCookie }
  });
  check(studentReadsDepts.status === 200 && Boolean(studentReadsDepts.data?.meta?.pagination), 'RBAC/Pagination: Student can read paginated departments (200)');

  const filterSubjects = await httpReq(`/api/v1/subjects?search=Compiler&course=${course1._id}&semester=${sem5._id}&subjectType=THEORY&status=inactive&page=1&limit=5`, adminOpts('GET'));
  check(
    filterSubjects.status === 200 &&
      filterSubjects.data?.data?.length === 1 &&
      filterSubjects.data?.meta?.pagination?.total === 1,
    'Search/Filter/Pagination: Subject search and cascading filters return accurate result'
  );

  const filterSemesters = await httpReq(`/api/v1/semesters?course=${course1._id}&academicYear=2026-2027&semesterNumber=5`, adminOpts('GET'));
  check(filterSemesters.status === 200 && filterSemesters.data?.data?.length === 1, 'Filter: Semester filtering by course, academicYear, semesterNumber works');

  // === DASHBOARD STATS ===
  const dashStats = await httpReq('/api/v1/dashboards/admin', adminOpts('GET'));
  check(
    dashStats.status === 200 &&
      typeof dashStats.data?.data?.totalDepartments === 'number' &&
      typeof dashStats.data?.data?.totalCourses === 'number' &&
      typeof dashStats.data?.data?.totalSemesters === 'number' &&
      typeof dashStats.data?.data?.activeSubjects === 'number',
    'Dashboard: /api/v1/dashboards/admin returns real DB academic counts'
  );

  // === AUDIT LOGS ===
  await new Promise((r) => setTimeout(r, 400));
  const auditLogs = await AuditLog.find({ actor: adminActor._id }).lean();
  const entities = new Set(auditLogs.map((a) => a.entity));
  check(
    entities.has('Department') && entities.has('Course') && entities.has('Semester') && entities.has('Subject'),
    `AuditLog: Recorded audit events across all 4 academic entities (${auditLogs.length} entries)`
  );
};

runPhase6Tests()
  .catch((err) => {
    console.error('[Phase 6 Test Fatal Error]', err);
    failed++;
  })
  .finally(async () => {
    try {
      if (cleanup.resultIds.length) await Result.deleteMany({ _id: { $in: cleanup.resultIds } });
      if (cleanup.examIds.length) await Examination.deleteMany({ _id: { $in: cleanup.examIds } });
      if (cleanup.subjectIds.length) await Subject.deleteMany({ _id: { $in: cleanup.subjectIds } });
      if (cleanup.semesterIds.length) await Semester.deleteMany({ _id: { $in: cleanup.semesterIds } });
      if (cleanup.courseIds.length) await Course.deleteMany({ _id: { $in: cleanup.courseIds } });
      if (cleanup.studentIds.length) await Student.deleteMany({ _id: { $in: cleanup.studentIds } });
      if (cleanup.facultyIds.length) await Faculty.deleteMany({ _id: { $in: cleanup.facultyIds } });
      if (cleanup.deptIds.length) await Department.deleteMany({ _id: { $in: cleanup.deptIds } });
      if (cleanup.userIds.length) await User.deleteMany({ _id: { $in: cleanup.userIds } });
      if (cleanup.auditActorIds.length) await AuditLog.deleteMany({ actor: { $in: cleanup.auditActorIds } });
      console.log('\n[Cleanup] Removed all isolated Phase 6 test records cleanly.');
      if (server) await new Promise((resolve) => server.close(resolve));
      await closeDatabase();
    } catch (e) {
      console.error('[Cleanup Error]', e.message);
    }

    console.log('\n' + '='.repeat(72));
    console.log(`PHASE 6 INTEGRATION TESTS -> TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('='.repeat(72) + '\n');
    process.exit(failed > 0 ? 1 : 0);
  });
