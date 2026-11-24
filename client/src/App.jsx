import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

import Login from './pages/auth/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import StudentDashboard from './pages/student/StudentDashboard';
import AttendanceMarking from './pages/attendance/AttendanceMarking';
import StudentResults from './pages/results/StudentResults';
import DepartmentList from './pages/academic/DepartmentList';
import AnnouncementList from './pages/announcements/AnnouncementList';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                {/* Admin Routes */}
                <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/departments" element={<DepartmentList />} />
                  <Route path="/admin/courses" element={<DepartmentList />} />
                  <Route path="/admin/students" element={<StudentDashboard />} />
                  <Route path="/admin/faculty" element={<FacultyDashboard />} />
                  <Route path="/admin/attendance" element={<AttendanceMarking />} />
                  <Route path="/admin/results" element={<StudentResults />} />
                </Route>

                {/* Faculty Routes */}
                <Route element={<ProtectedRoute allowedRoles={['FACULTY', 'ADMIN']} />}>
                  <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
                  <Route path="/faculty/attendance/mark" element={<AttendanceMarking />} />
                  <Route path="/faculty/marks-entry" element={<StudentResults />} />
                </Route>

                {/* Student Routes */}
                <Route element={<ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']} />}>
                  <Route path="/student/dashboard" element={<StudentDashboard />} />
                  <Route path="/student/attendance" element={<AttendanceMarking />} />
                  <Route path="/student/results" element={<StudentResults />} />
                </Route>

                {/* Shared Routes */}
                <Route path="/announcements" element={<AnnouncementList />} />
              </Route>
            </Route>

            <Route
              path="/unauthorized"
              element={
                <div className="min-h-screen flex items-center justify-center bg-slate-50">
                  <div className="text-center">
                    <h1 className="text-3xl font-bold text-rose-600">403 Forbidden</h1>
                    <p className="text-slate-600 mt-2">You lack authorized permissions for this academic resource.</p>
                  </div>
                </div>
              }
            />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
