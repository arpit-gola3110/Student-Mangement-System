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

// --- ACADEMIC LOOKUPS (Read-only references for selectors) ---
export const academicLookupApi = {
  getDepartments: (params = { isActive: true }) => api.get('/departments', { params: cleanParams(params) }),
  getCourses: (params = {}) => api.get('/courses', { params: cleanParams({ isActive: true, ...params }) }),
  getSemesters: (params = {}) => api.get('/semesters', { params: cleanParams(params) })
};
