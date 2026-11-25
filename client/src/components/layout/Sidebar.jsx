import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Building2,
  BookOpen,
  Calendar,
  Layers,
  UserCheck,
  ClipboardList,
  CalendarCheck,
  Award,
  FileCheck2,
  Bell,
  BarChart3,
  ShieldCheck,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  BookMarked,
  UserCheck2,
  X
} from 'lucide-react';

export const Sidebar = ({ isCollapsed, onToggleCollapse, isMobileOpen, onCloseMobile }) => {
  const { user } = useAuth();
  const role = (user?.role || 'student').toLowerCase();

  // Complete, official menu configurations for all 3 roles from Phase 2 Section 5
  const adminSections = [
    {
      title: 'Overview',
      links: [{ to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' }]
    },
    {
      title: 'Human Resources',
      links: [
        { to: '/admin/students', icon: GraduationCap, label: 'Students' },
        { to: '/admin/faculty', icon: Users, label: 'Faculty Directory' },
        { to: '/admin/enrollments', icon: ClipboardList, label: 'Student Enrollments' },
        { to: '/admin/faculty-assignments', icon: UserCheck, label: 'Faculty Assignments' }
      ]
    },
    {
      title: 'Academic Structure',
      links: [
        { to: '/admin/departments', icon: Building2, label: 'Departments' },
        { to: '/admin/courses', icon: BookOpen, label: 'Courses' },
        { to: '/admin/semesters', icon: Calendar, label: 'Semesters' },
        { to: '/admin/subjects', icon: Layers, label: 'Subjects Catalog' }
      ]
    },
    {
      title: 'Academic Operations',
      links: [
        { to: '/admin/attendance', icon: CalendarCheck, label: 'Attendance' },
        { to: '/admin/examinations', icon: Award, label: 'Examinations' },
        { to: '/admin/results', icon: FileCheck2, label: 'Results' }
      ]
    },
    {
      title: 'System & Governance',
      links: [
        { to: '/admin/announcements', icon: Bell, label: 'Announcements' },
        { to: '/admin/reports', icon: BarChart3, label: 'Reports & Analytics' },
        { to: '/admin/users', icon: ShieldCheck, label: 'User Management' },
        { to: '/admin/audit-logs', icon: History, label: 'Audit Logs' },
        { to: '/admin/settings', icon: Settings, label: 'Settings' }
      ]
    }
  ];

  const facultySections = [
    {
      title: 'Instructional Portal',
      links: [
        { to: '/faculty/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/faculty/subjects', icon: BookMarked, label: 'My Subjects' },
        { to: '/faculty/students', icon: GraduationCap, label: 'My Students' },
        { to: '/faculty/attendance', icon: CalendarCheck, label: 'Attendance' },
        { to: '/faculty/internal-assessment', icon: Award, label: 'Internal Assessment' },
        { to: '/faculty/results', icon: FileCheck2, label: 'Results' },
        { to: '/faculty/announcements', icon: Bell, label: 'Announcements' },
        { to: '/faculty/profile', icon: UserCheck2, label: 'My Profile' }
      ]
    }
  ];

  const studentSections = [
    {
      title: 'Student Self-Service',
      links: [
        { to: '/student/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/student/profile', icon: UserCheck2, label: 'My Profile' },
        { to: '/student/courses', icon: BookOpen, label: 'My Courses' },
        { to: '/student/subjects', icon: Layers, label: 'My Subjects' },
        { to: '/student/attendance', icon: CalendarCheck, label: 'My Attendance' },
        { to: '/student/internal-assessment', icon: Award, label: 'Exams & Assessments' },
        { to: '/student/results', icon: FileCheck2, label: 'My Results' },
        { to: '/student/announcements', icon: Bell, label: 'Announcements' }
      ]
    }
  ];

  const sections = role === 'admin' ? adminSections : role === 'faculty' ? facultySections : studentSections;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-white select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-brand-500/20">
            <GraduationCap className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div className="truncate">
              <span className="font-extrabold text-sm tracking-tight text-white block leading-tight">
                AKTU SMS
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                {role.toUpperCase()} PORTAL
              </span>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto overflow-x-hidden">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {!isCollapsed && section.title && (
              <h4 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                {section.title}
              </h4>
            )}
            {section.links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={onCloseMobile}
                  title={isCollapsed ? link.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    } ${isCollapsed ? 'justify-center px-2' : ''}`
                  }
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-transform ${isCollapsed ? '' : 'mr-3'}`} />
                  {!isCollapsed && <span className="truncate">{link.label}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer & Collapse Toggle */}
      <div className="p-3 border-t border-slate-800 flex items-center justify-between">
        {!isCollapsed && (
          <div className="text-[11px] text-slate-400 truncate">
            <p className="font-medium text-slate-300">AKTU BCS 554</p>
            <p className="text-[10px] text-slate-500">Session 2026–27</p>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition mx-auto"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className={`fixed top-0 bottom-0 left-0 z-30 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}>
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Sliding Drawer */}
      <div
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
};

export default Sidebar;
