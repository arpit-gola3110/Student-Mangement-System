import express from 'express';

import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import studentRoutes from './student.routes.js';
import facultyRoutes from './faculty.routes.js';
import departmentRoutes from './department.routes.js';
import courseRoutes from './course.routes.js';
import semesterRoutes from './semester.routes.js';
import subjectRoutes from './subject.routes.js';
import enrollmentRoutes from './enrollment.routes.js';
import facultyAssignmentRoutes from './facultyAssignment.routes.js';
import attendanceRoutes from './attendance.routes.js';
import examinationRoutes from './examination.routes.js';
import assessmentRoutes from './assessment.routes.js';
import resultRoutes from './result.routes.js';
import resultPolicyRoutes from './resultPolicy.routes.js';
import announcementRoutes from './announcement.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import reportRoutes from './report.routes.js';

const router = express.Router();

// Mount all 16 modular route groups
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/students', studentRoutes);
router.use('/faculty', facultyRoutes);
router.use('/departments', departmentRoutes);
router.use('/courses', courseRoutes);
router.use('/semesters', semesterRoutes);
router.use('/subjects', subjectRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/faculty-assignments', facultyAssignmentRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/examinations', examinationRoutes);
router.use('/assessments', assessmentRoutes);
router.use('/results', resultRoutes);
router.use('/result-policies', resultPolicyRoutes);
router.use('/announcements', announcementRoutes);
router.use('/dashboards', dashboardRoutes);
router.use('/reports', reportRoutes);

export default router;
