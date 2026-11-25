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
