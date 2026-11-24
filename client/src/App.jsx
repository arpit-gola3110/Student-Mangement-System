import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import Login from './pages/auth/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import StudentDashboard from './pages/student/StudentDashboard';
import AttendanceMarking from './pages/attendance/AttendanceMarking';
import StudentResults from './pages/results/StudentResults';
import DepartmentList from './pages/academic/DepartmentList';
import AnnouncementList from './pages/announcements/AnnouncementList';
import NotFound from './pages/error/NotFound';
import Unauthorized from './pages/error/Unauthorized';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

// Root Redirector based on authenticated role
const RootRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'FACULTY') return <Navigate to="/faculty/dashboard" replace />;
  return <Navigate to="/student/dashboard" replace />;
};

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Authentication Route */}
              <Route path="/login" element={<Login />} />

              {/* Protected Application Routes Shell */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<RootRedirect />} />

                  {/* ADMIN ROUTE GROUP */}
                  <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/admin/students" element={<StudentDashboard />} />
                    <Route path="/admin/faculty" element={<FacultyDashboard />} />
                    <Route path="/admin/departments" element={<DepartmentList />} />
                    <Route path="/admin/courses" element={<DepartmentList />} />
                    <Route path="/admin/semesters" element={<DepartmentList />} />
                    <Route path="/admin/subjects" element={<DepartmentList />} />
                    <Route path="/admin/enrollments" element={<DepartmentList />} />
                    <Route path="/admin/faculty-assignments" element={<DepartmentList />} />
                    <Route path="/admin/attendance" element={<AttendanceMarking />} />
                    <Route path="/admin/examinations" element={<StudentResults />} />
                    <Route path="/admin/results" element={<StudentResults />} />
                    <Route path="/admin/announcements" element={<AnnouncementList />} />
                    <Route path="/admin/reports" element={<AdminDashboard />} />
                    <Route path="/admin/users" element={<AdminDashboard />} />
                    <Route path="/admin/audit-logs" element={<AdminDashboard />} />
                    <Route path="/admin/settings" element={<AdminDashboard />} />
                  </Route>

                  {/* FACULTY ROUTE GROUP */}
                  <Route element={<ProtectedRoute allowedRoles={['FACULTY', 'ADMIN']} />}>
                    <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
                    <Route path="/faculty/subjects" element={<FacultyDashboard />} />
                    <Route path="/faculty/students" element={<FacultyDashboard />} />
                    <Route path="/faculty/attendance" element={<AttendanceMarking />} />
                    <Route path="/faculty/internal-assessment" element={<StudentResults />} />
                    <Route path="/faculty/results" element={<StudentResults />} />
                    <Route path="/faculty/announcements" element={<AnnouncementList />} />
                    <Route path="/faculty/profile" element={<FacultyDashboard />} />
                  </Route>

                  {/* STUDENT ROUTE GROUP */}
                  <Route element={<ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']} />}>
                    <Route path="/student/dashboard" element={<StudentDashboard />} />
                    <Route path="/student/profile" element={<StudentDashboard />} />
                    <Route path="/student/courses" element={<StudentDashboard />} />
                    <Route path="/student/subjects" element={<StudentDashboard />} />
                    <Route path="/student/attendance" element={<AttendanceMarking />} />
                    <Route path="/student/results" element={<StudentResults />} />
                    <Route path="/student/announcements" element={<AnnouncementList />} />
                  </Route>

                  {/* Shared Module Routes */}
                  <Route path="/announcements" element={<AnnouncementList />} />
                </Route>
              </Route>

              {/* Error and Fallback Routes */}
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
