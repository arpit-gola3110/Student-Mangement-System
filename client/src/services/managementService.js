import api from './api';

const cleanParams = (params = {}) => {
  const cleaned = {};
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      cleaned[key] = val;
    }
  });
  return cleaned;
};

// --- USER MANAGEMENT ---
export const userApi = {
  list: (params) => api.get('/users', { params: cleanParams(params) }),
  getById: (id) => api.get(`/users/${id}`),
  create: (payload) => api.post('/users', payload),
  update: (id, payload) => api.patch(`/users/${id}`, payload),
  updateStatus: (id, isActive) => api.patch(`/users/${id}/status`, { isActive })
};

// --- STUDENT MANAGEMENT ---
export const studentApi = {
  list: (params) => api.get('/students', { params: cleanParams(params) }),
  getById: (id) => api.get(`/students/${id}`),
  create: (payload) => api.post('/students', payload),
  update: (id, payload) => api.patch(`/students/${id}`, payload),
  updateStatus: (id, status) => api.patch(`/students/${id}/status`, { status }),
  remove: (id) => api.delete(`/students/${id}`)
};

// --- FACULTY MANAGEMENT ---
export const facultyApi = {
  list: (params) => api.get('/faculty', { params: cleanParams(params) }),
  getById: (id) => api.get(`/faculty/${id}`),
  create: (payload) => api.post('/faculty', payload),
  update: (id, payload) => api.patch(`/faculty/${id}`, payload),
  updateStatus: (id, status) => api.patch(`/faculty/${id}/status`, { status }),
  remove: (id) => api.delete(`/faculty/${id}`)
};

// --- DEPARTMENT MANAGEMENT ---
export const departmentApi = {
  list: (params) => api.get('/departments', { params: cleanParams(params) }),
  getById: (id) => api.get(`/departments/${id}`),
  create: (payload) => api.post('/departments', payload),
  update: (id, payload) => api.patch(`/departments/${id}`, payload),
  updateStatus: (id, isActive) => api.patch(`/departments/${id}/status`, { isActive }),
  remove: (id) => api.delete(`/departments/${id}`)
};

// --- COURSE MANAGEMENT ---
export const courseApi = {
  list: (params) => api.get('/courses', { params: cleanParams(params) }),
  getById: (id) => api.get(`/courses/${id}`),
  create: (payload) => api.post('/courses', payload),
  update: (id, payload) => api.patch(`/courses/${id}`, payload),
  updateStatus: (id, isActive) => api.patch(`/courses/${id}/status`, { isActive }),
  remove: (id) => api.delete(`/courses/${id}`)
};

// --- SEMESTER MANAGEMENT ---
export const semesterApi = {
  list: (params) => api.get('/semesters', { params: cleanParams(params) }),
  getById: (id) => api.get(`/semesters/${id}`),
  create: (payload) => api.post('/semesters', payload),
  update: (id, payload) => api.patch(`/semesters/${id}`, payload),
  updateStatus: (id, payload) => api.patch(`/semesters/${id}/status`, payload),
  remove: (id) => api.delete(`/semesters/${id}`)
};

// --- SUBJECT MANAGEMENT ---
export const subjectApi = {
  list: (params) => api.get('/subjects', { params: cleanParams(params) }),
  getById: (id) => api.get(`/subjects/${id}`),
  create: (payload) => api.post('/subjects', payload),
  update: (id, payload) => api.patch(`/subjects/${id}`, payload),
  updateStatus: (id, isActive) => api.patch(`/subjects/${id}/status`, { isActive }),
  remove: (id) => api.delete(`/subjects/${id}`)
};

// --- STUDENT ENROLLMENT MANAGEMENT ---
export const enrollmentApi = {
  list: (params) => api.get('/enrollments', { params: cleanParams(params) }),
  getMy: (params) => api.get('/enrollments/my', { params: cleanParams(params) }),
  getById: (id) => api.get(`/enrollments/${id}`),
  create: (payload) => api.post('/enrollments', payload),
  update: (id, payload) => api.patch(`/enrollments/${id}`, payload),
  updateStatus: (id, status) => api.patch(`/enrollments/${id}/status`, { status }),
  remove: (id) => api.delete(`/enrollments/${id}`)
};

// --- FACULTY ASSIGNMENT MANAGEMENT ---
export const assignmentApi = {
  list: (params) => api.get('/faculty-assignments', { params: cleanParams(params) }),
  getMy: (params) => api.get('/faculty-assignments/my', { params: cleanParams(params) }),
  getById: (id) => api.get(`/faculty-assignments/${id}`),
  create: (payload) => api.post('/faculty-assignments', payload),
  update: (id, payload) => api.patch(`/faculty-assignments/${id}`, payload),
  updateStatus: (id, status) => api.patch(`/faculty-assignments/${id}/status`, { status }),
  remove: (id) => api.delete(`/faculty-assignments/${id}`)
};

// --- DASHBOARD STATS ---
export const dashboardApi = {
  getAdminStats: () => api.get('/dashboards/admin'),
  getFacultyStats: () => api.get('/dashboards/faculty'),
  getStudentStats: () => api.get('/dashboards/student')
};

// --- ATTENDANCE MANAGEMENT (PHASE 8) ---
export const attendanceApi = {
  // Sessions
  listSessions: (params) => api.get('/attendance/sessions', { params: cleanParams(params) }),
  getSessionById: (id) => api.get(`/attendance/sessions/${id}`),
  createSession: (payload) => api.post('/attendance/sessions', payload),
  updateSession: (id, payload) => api.patch(`/attendance/sessions/${id}`, payload),
  updateSessionStatus: (id, payload) => api.patch(`/attendance/sessions/${id}/status`, payload),

  // Bulk marking, history & correction
  submitBulk: (payload) => api.post('/attendance/bulk', payload),
  listHistory: (params) => api.get('/attendance', { params: cleanParams(params) }),
  getRecordById: (id) => api.get(`/attendance/${id}`),
  correctRecord: (id, payload) => api.patch(`/attendance/${id}`, payload),

  // Faculty personal
  getMySubjects: () => api.get('/attendance/my-subjects'),
  getMySessions: (params) => api.get('/attendance/my-sessions', { params: cleanParams(params) }),
  getMyHistory: (params) => api.get('/attendance/my-history', { params: cleanParams(params) }),

  // Student personal
  getMyAttendance: (params) => api.get('/attendance/my', { params: cleanParams(params) }),
  getMySummary: (params) => api.get('/attendance/my/summary', { params: cleanParams(params) }),
  getMySubjectBreakdown: (params) => api.get('/attendance/my/subjects', { params: cleanParams(params) }),

  // Reports
  getOverviewReport: (params) => api.get('/attendance/reports/overview', { params: cleanParams(params) }),
  getSubjectsReport: (params) => api.get('/attendance/reports/subjects', { params: cleanParams(params) }),
  getStudentsReport: (params) => api.get('/attendance/reports/students', { params: cleanParams(params) }),
  getFacultyReport: (params) => api.get('/attendance/reports/faculty', { params: cleanParams(params) })
};

// --- EXAMINATION MANAGEMENT (PHASE 9) ---
export const examinationApi = {
  list: (params) => api.get('/examinations', { params: cleanParams(params) }),
  getById: (id) => api.get(`/examinations/${id}`),
  create: (payload) => api.post('/examinations', payload),
  update: (id, payload) => api.patch(`/examinations/${id}`, payload),
  updateStatus: (id, payload) => api.patch(`/examinations/${id}/status`, payload),
  remove: (id) => api.delete(`/examinations/${id}`)
};

// --- INTERNAL ASSESSMENT & MARKS MANAGEMENT (PHASE 9) ---
export const assessmentApi = {
  list: (params) => api.get('/assessments', { params: cleanParams(params) }),
  getWithRoster: (id) => api.get(`/assessments/${id}`),
  create: (payload) => api.post('/assessments', payload),
  update: (id, payload) => api.patch(`/assessments/${id}`, payload),
  updateStatus: (id, payload) => api.patch(`/assessments/${id}/status`, payload),
  submitBulkMarks: (assessmentId, payload) => api.post(`/assessments/${assessmentId}/marks/bulk`, payload),
  listMarks: (params) => api.get('/assessments/marks', { params: cleanParams(params) }),
  getMarkById: (markId) => api.get(`/assessments/marks/${markId}`),
  correctMark: (markId, payload) => api.patch(`/assessments/marks/${markId}`, payload),
  getMyPublishedMarks: (params) => api.get('/assessments/my-marks', { params: cleanParams(params) })
};

// --- ACADEMIC RESULT POLICIES (PHASE 10) ---
export const resultPolicyApi = {
  list: (params) => api.get('/result-policies', { params: cleanParams(params) }),
  getById: (id) => api.get(`/result-policies/${id}`),
  create: (payload) => api.post('/result-policies', payload),
  update: (id, payload) => api.patch(`/result-policies/${id}`, payload),
  updateStatus: (id, isActive) => api.patch(`/result-policies/${id}/status`, { isActive })
};

// --- RESULTS MANAGEMENT (PHASE 10) ---
export const resultApi = {
  checkReadiness: (params) => api.get('/results/readiness', { params: cleanParams(params) }),
  calculate: (payload) => api.post('/results/calculate', payload),
  recalculate: (payload) => api.post('/results/recalculate', payload),
  list: (params) => api.get('/results', { params: cleanParams(params) }),
  getById: (id) => api.get(`/results/${id}`),
  getHistory: (id) => api.get(`/results/${id}/history`),
  approve: (id, reason = '') => api.post(`/results/${id}/approve`, { reason }),
  reject: (id, reason) => api.post(`/results/${id}/reject`, { reason }),
  publish: (id, reason = '') => api.post(`/results/${id}/publish`, { reason }),
  withdraw: (id, reason) => api.post(`/results/${id}/withdraw`, { reason }),
  batchApprove: (resultIds) => api.post('/results/batch-approve', { resultIds }),
  batchPublish: (resultIds) => api.post('/results/batch-publish', { resultIds }),
  correct: (id, payload) => api.patch(`/results/${id}/correct`, payload),
  getMyResults: (params) => api.get('/results/my', { params: cleanParams(params) }),
  getFacultyOverview: (params) => api.get('/results/faculty/overview', { params: cleanParams(params) }),
  getReportsOverview: (params) => api.get('/results/reports/overview', { params: cleanParams(params) })
};

// --- ACADEMIC LOOKUPS (Dropdown selectors up to 100 items) ---
export const academicLookupApi = {
  getDepartments: (params = { isActive: true }) =>
    api.get('/departments', { params: cleanParams({ limit: 100, ...params }) }),
  getCourses: (params = {}) =>
    api.get('/courses', { params: cleanParams({ isActive: true, limit: 100, ...params }) }),
  getSemesters: (params = {}) =>
    api.get('/semesters', { params: cleanParams({ isActive: true, limit: 100, ...params }) }),
  getSubjects: (params = {}) =>
    api.get('/subjects', { params: cleanParams({ isActive: true, limit: 100, ...params }) }),
  getActiveStudents: (params = {}) =>
    api.get('/students', { params: cleanParams({ status: 'ACTIVE', limit: 100, ...params }) }),
  getActiveFaculty: (params = {}) =>
    api.get('/faculty', { params: cleanParams({ status: 'ACTIVE', limit: 100, ...params }) })
};
