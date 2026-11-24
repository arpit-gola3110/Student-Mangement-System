import mongoose from 'mongoose';
import models from '../models/index.js';
import app from '../app.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/apiResponse.js';
import { getDatabaseStatus } from '../config/db.js';

console.log('='.repeat(70));
console.log('STUDENT MANAGEMENT SYSTEM - PHASE 3 VERIFICATION SUITE');
console.log('AKTU B.Tech CSE Mini Project (BCS 554)');
console.log('='.repeat(70) + '\n');

let passCount = 0;
let failCount = 0;

const assert = (condition, description) => {
  if (condition) {
    console.log(`[PASS] ${description}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${description}`);
    failCount++;
  }
};

// 1. Verify Environment Module
console.log('--- 1. Environment Configuration ---');
assert(env.PORT !== undefined, 'env.PORT is configured');
assert(env.NODE_ENV !== undefined, 'env.NODE_ENV is configured');
assert(env.MONGODB_URI !== undefined, 'env.MONGODB_URI is configured');
assert(env.RATE_LIMIT_WINDOW_MS > 0, 'env.RATE_LIMIT_WINDOW_MS is valid');

// 2. Verify 14 Mongoose Models
console.log('\n--- 2. Mongoose ODM Models Compilation & Index Checks ---');
const expectedModels = [
  'User',
  'Student',
  'Faculty',
  'Department',
  'Course',
  'Semester',
  'Subject',
  'Enrollment',
  'FacultyAssignment',
  'Attendance',
  'Examination',
  'Result',
  'Announcement',
  'AuditLog'
];

expectedModels.forEach((modelName) => {
  const model = models[modelName];
  assert(Boolean(model && model.schema), `Model '${modelName}' compiles and registers schema`);
});

// Detailed Schema Checks
console.log('\n--- 3. Specific Model Schema & Index Integrity ---');

// User Model
const userSchema = models.User.schema;
assert(userSchema.paths.email !== undefined, 'User schema has email');
assert(userSchema.paths.password !== undefined, 'User schema has password');
assert(userSchema.paths.role !== undefined, 'User schema has role');
assert(typeof models.User.prototype.comparePassword === 'function', 'User model has comparePassword prototype method');

// Student Model
const studentSchema = models.Student.schema;
assert(studentSchema.paths.rollNumber !== undefined, 'Student schema has rollNumber');
assert(studentSchema.paths.enrollmentNumber !== undefined, 'Student schema has enrollmentNumber');
assert(studentSchema.paths.department !== undefined, 'Student schema has department reference');
assert(studentSchema.virtuals.fullName !== undefined, 'Student schema has fullName virtual getter');

// Faculty Model
const facultySchema = models.Faculty.schema;
assert(facultySchema.paths.employeeId !== undefined, 'Faculty schema has employeeId');
assert(facultySchema.paths.designation !== undefined, 'Faculty schema has designation');
assert(facultySchema.virtuals.fullName !== undefined, 'Faculty schema has fullName virtual getter');

// Department Model
const deptSchema = models.Department.schema;
assert(deptSchema.paths.code !== undefined, 'Department schema has code');
assert(deptSchema.paths.name !== undefined, 'Department schema has name');

// Course Model
const courseSchema = models.Course.schema;
assert(courseSchema.paths.code !== undefined, 'Course schema has code');
assert(courseSchema.paths.totalSemesters !== undefined, 'Course schema has totalSemesters');

// Semester Model
const semSchema = models.Semester.schema;
assert(semSchema.paths.semesterNumber !== undefined, 'Semester schema has semesterNumber');
assert(semSchema.paths.academicYear !== undefined, 'Semester schema has academicYear');

// Subject Model
const subSchema = models.Subject.schema;
assert(subSchema.paths.code !== undefined, 'Subject schema has code');
assert(subSchema.paths.credits !== undefined, 'Subject schema has credits');

// Enrollment Model
const enrollSchema = models.Enrollment.schema;
assert(enrollSchema.paths.student !== undefined, 'Enrollment schema has student ref');
assert(enrollSchema.paths.semester !== undefined, 'Enrollment schema has semester ref');

// FacultyAssignment Model
const faSchema = models.FacultyAssignment.schema;
assert(faSchema.paths.faculty !== undefined, 'FacultyAssignment has faculty ref');
assert(faSchema.paths.subject !== undefined, 'FacultyAssignment has subject ref');

// Attendance Model
const attSchema = models.Attendance.schema;
assert(attSchema.paths.status !== undefined, 'Attendance has status');
assert(attSchema.paths.date !== undefined, 'Attendance has date');

// Examination Model
const examSchema = models.Examination.schema;
assert(examSchema.paths.examType !== undefined, 'Examination has examType');

// Result Model
const resultSchema = models.Result.schema;
assert(resultSchema.paths.internalMarks !== undefined, 'Result has internalMarks');
assert(resultSchema.paths.externalMarks !== undefined, 'Result has externalMarks');
assert(resultSchema.paths.grade !== undefined, 'Result has grade');

// Announcement Model
const annSchema = models.Announcement.schema;
assert(annSchema.paths.targetAudience !== undefined, 'Announcement has targetAudience');

// AuditLog Model
const auditSchema = models.AuditLog.schema;
assert(auditSchema.paths.actor !== undefined, 'AuditLog has actor');
assert(auditSchema.paths.action !== undefined, 'AuditLog has action');

// 4. Verify Express Application and Routes
console.log('\n--- 4. Express App & Modular Routing ---');
assert(typeof app === 'function', 'Express application initialized');
assert(app._router !== undefined, 'Express router stack is configured');

// Check routes mounted in app
const routes = app._router.stack
  .filter((r) => r.route || r.name === 'router')
  .map((r) => (r.route ? r.route.path : r.regexp.toString()));

assert(routes.some((r) => r.includes('/api/v1') || r.includes('api')), 'Express mounts /api/v1 route group');

// 5. Verify Utility Classes
console.log('\n--- 5. Utility Classes (ApiError, ApiResponse) ---');
const badReq = ApiError.badRequest('Test Bad Request', ['detail 1']);
assert(badReq.statusCode === 400, 'ApiError.badRequest sets statusCode 400');
assert(badReq.isOperational === true, 'ApiError is marked operational');

const notFound = ApiError.notFound('Resource missing');
assert(notFound.statusCode === 404, 'ApiError.notFound sets statusCode 404');

const unauthorized = ApiError.unauthorized('No access');
assert(unauthorized.statusCode === 401, 'ApiError.unauthorized sets statusCode 401');

// 6. Verify Database Status Utility
console.log('\n--- 6. Database Health Status ---');
const dbStatus = getDatabaseStatus();
assert(dbStatus.state !== undefined, `getDatabaseStatus returns state: ${dbStatus.state}`);
assert(typeof dbStatus.isConnected === 'boolean', `getDatabaseStatus returns isConnected: ${dbStatus.isConnected}`);

// Summary
console.log('\n' + '='.repeat(70));
console.log(`TOTAL CHECKS: ${passCount + failCount}`);
console.log(`PASSED: ${passCount}`);
console.log(`FAILED: ${failCount}`);
console.log('='.repeat(70));

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('\n>>> ALL PHASE 3 ARCHITECTURAL VERIFICATIONS PASSED SUCCESSFULLY! <<<\n');
  process.exit(0);
}
