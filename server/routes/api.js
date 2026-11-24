import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { requireRoles } from '../middleware/rbacMiddleware.js';
import { logAuditEvent } from '../middleware/auditMiddleware.js';

import * as authCtrl from '../controllers/authController.js';
import * as acadCtrl from '../controllers/academicController.js';
import * as studentCtrl from '../controllers/studentController.js';
import * as facultyCtrl from '../controllers/facultyController.js';
import * as attdCtrl from '../controllers/attendanceController.js';
import * as resultCtrl from '../controllers/resultController.js';
import * as dashCtrl from '../controllers/dashboardController.js';
import * as noticeCtrl from '../controllers/announcementController.js';

const router = express.Router();

// --- AUTH ---
router.post('/auth/login', authCtrl.login);
router.get('/auth/me', verifyToken, authCtrl.getMe);
router.post('/auth/change-password', verifyToken, authCtrl.changePassword);

// --- DEPARTMENTS ---
router.get('/departments', verifyToken, acadCtrl.getDepartments);
router.post('/departments', verifyToken, requireRoles(['ADMIN']), logAuditEvent('CREATE', 'Department'), acadCtrl.createDepartment);
router.put('/departments/:id', verifyToken, requireRoles(['ADMIN']), logAuditEvent('UPDATE', 'Department'), acadCtrl.updateDepartment);

// --- COURSES ---
router.get('/courses', verifyToken, acadCtrl.getCourses);
router.post('/courses', verifyToken, requireRoles(['ADMIN']), logAuditEvent('CREATE', 'Course'), acadCtrl.createCourse);

// --- SEMESTERS ---
router.get('/semesters', verifyToken, acadCtrl.getSemesters);
router.post('/semesters', verifyToken, requireRoles(['ADMIN']), logAuditEvent('CREATE', 'Semester'), acadCtrl.createSemester);

// --- SUBJECTS ---
router.get('/subjects', verifyToken, acadCtrl.getSubjects);
router.post('/subjects', verifyToken, requireRoles(['ADMIN']), logAuditEvent('CREATE', 'Subject'), acadCtrl.createSubject);

// --- STUDENTS ---
router.get('/students', verifyToken, requireRoles(['ADMIN', 'FACULTY']), studentCtrl.getStudents);
router.post('/students', verifyToken, requireRoles(['ADMIN']), logAuditEvent('CREATE', 'Student'), studentCtrl.createStudent);
router.get('/students/:id', verifyToken, studentCtrl.getStudentById);

// --- FACULTY ---
router.get('/faculty', verifyToken, facultyCtrl.getFacultyList);
router.post('/faculty', verifyToken, requireRoles(['ADMIN']), logAuditEvent('CREATE', 'Faculty'), facultyCtrl.createFaculty);
router.get('/faculty-assignments', verifyToken, facultyCtrl.getFacultyAssignments);
router.post('/faculty-assignments', verifyToken, requireRoles(['ADMIN']), facultyCtrl.createFacultyAssignment);

// --- ATTENDANCE ---
router.post('/attendance', verifyToken, requireRoles(['FACULTY', 'ADMIN']), logAuditEvent('CREATE', 'Attendance'), attdCtrl.submitAttendanceBatch);
router.get('/attendance/student/:studentId', verifyToken, attdCtrl.getStudentAttendanceSummary);
router.get('/attendance/my-summary', verifyToken, requireRoles(['STUDENT']), attdCtrl.getStudentAttendanceSummary);

// --- EXAMS & RESULTS ---
router.get('/examinations', verifyToken, resultCtrl.getExaminations);
router.post('/examinations', verifyToken, requireRoles(['ADMIN']), resultCtrl.createExamination);
router.post('/results/marks', verifyToken, requireRoles(['FACULTY', 'ADMIN']), logAuditEvent('UPDATE', 'Result'), resultCtrl.submitMarksBatch);
router.get('/results/student/:studentId', verifyToken, resultCtrl.getStudentResults);
router.get('/results/my-results', verifyToken, requireRoles(['STUDENT']), resultCtrl.getStudentResults);

// --- DASHBOARDS ---
router.get('/dashboards/admin', verifyToken, requireRoles(['ADMIN']), dashCtrl.getAdminDashboardStats);
router.get('/dashboards/faculty', verifyToken, requireRoles(['FACULTY']), dashCtrl.getFacultyDashboardStats);
router.get('/dashboards/student', verifyToken, requireRoles(['STUDENT']), dashCtrl.getStudentDashboardStats);

// --- ANNOUNCEMENTS ---
router.get('/announcements', verifyToken, noticeCtrl.getAnnouncements);
router.post('/announcements', verifyToken, requireRoles(['ADMIN', 'FACULTY']), logAuditEvent('CREATE', 'Announcement'), noticeCtrl.createAnnouncement);
router.delete('/announcements/:id', verifyToken, requireRoles(['ADMIN']), noticeCtrl.deleteAnnouncement);

export default router;
