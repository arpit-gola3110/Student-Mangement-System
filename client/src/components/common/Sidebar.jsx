import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  GraduationCap,
  CalendarCheck,
  FileCheck2,
  Users,
  UserCheck,
  Bell,
  BookOpen
} from 'lucide-react';

export const Sidebar = () => {
  const { user } = useAuth();
  const role = user?.role;

  const adminLinks = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/departments', icon: Building2, label: 'Departments' },
    { to: '/admin/courses', icon: BookOpen, label: 'Courses & Syllabus' },
    { to: '/admin/students', icon: GraduationCap, label: 'Students' },
    { to: '/admin/faculty', icon: Users, label: 'Faculty Directory' },
    { to: '/admin/attendance', icon: CalendarCheck, label: 'Attendance Tracking' },
    { to: '/admin/results', icon: FileCheck2, label: 'Examinations & Results' },
    { to: '/announcements', icon: Bell, label: 'Announcements' }
  ];

  const facultyLinks = [
    { to: '/faculty/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/faculty/attendance/mark', icon: CalendarCheck, label: 'Mark Attendance' },
    { to: '/faculty/marks-entry', icon: FileCheck2, label: 'Internal Marks (CIA)' },
    { to: '/announcements', icon: Bell, label: 'Announcements' }
  ];

  const studentLinks = [
    { to: '/student/dashboard', icon: LayoutDashboard, label: 'My Dashboard' },
    { to: '/student/attendance', icon: CalendarCheck, label: 'My Attendance' },
    { to: '/student/results', icon: FileCheck2, label: 'My Grade Sheet' },
    { to: '/announcements', icon: Bell, label: 'Notice Board' }
  ];

  const links = role === 'ADMIN' ? adminLinks : role === 'FACULTY' ? facultyLinks : studentLinks;

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0 min-h-screen">
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <GraduationCap className="w-7 h-7 text-indigo-400 mr-2.5" />
        <div>
          <span className="font-bold text-base tracking-tight text-white block leading-tight">AKTU SMS</span>
          <span className="text-[10px] text-slate-400 font-medium tracking-wide">STUDENT MANAGEMENT</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 mr-3 shrink-0" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 text-xs text-slate-400">
        <p className="font-medium text-slate-300">AKTU B.Tech Mini Project</p>
        <p className="text-[11px] text-slate-500 mt-0.5">BCS 554 • Session 2026–27</p>
      </div>
    </aside>
  );
};

export default Sidebar;
