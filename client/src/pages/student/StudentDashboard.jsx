import React from 'react';
import PageHeader from '../../components/layout/PageHeader';
import StatCard from '../../components/data/StatCard';
import ChartCard from '../../components/data/ChartCard';
import DataTable from '../../components/data/DataTable';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { useToast } from '../../context/ToastContext';
import {
  CalendarCheck,
  Award,
  BookOpen,
  AlertTriangle,
  Download,
  Calendar,
  CheckCircle2
} from 'lucide-react';

export const StudentDashboard = () => {
  const { showToast } = useToast();

  const attendanceRate = 83.4;
  const isDefaulter = attendanceRate < 75;

  const stats = [
    {
      title: 'Cumulative Attendance',
      value: `${attendanceRate}%`,
      icon: CalendarCheck,
      trend: isDefaulter ? 'down' : 'up',
      trendValue: isDefaulter ? 'Shortage Warning' : 'Eligible',
      color: isDefaulter ? 'rose' : 'emerald',
      subtitle: '45 of 54 classes attended'
    },
    {
      title: 'Current SGPA',
      value: '8.42',
      icon: Award,
      trend: 'up',
      trendValue: 'A Grade',
      color: 'indigo',
      subtitle: 'AKTU 10-Point Credit System'
    },
    {
      title: 'Enrolled Courses',
      value: '5 Subjects',
      icon: BookOpen,
      color: 'sky',
      subtitle: '21 Total Credits this term'
    }
  ];

  const subjectProgress = [
    { code: 'BCS-554', name: 'Mini Project / Internship Assessment', credits: 2, attended: 18, total: 20, pct: 90.0, status: 'NORMAL' },
    { code: 'BCS-501', name: 'Database Management Systems', credits: 4, attended: 26, total: 32, pct: 81.25, status: 'NORMAL' },
    { code: 'BCS-502', name: 'Compiler Design', credits: 4, attended: 22, total: 28, pct: 78.57, status: 'BORDERLINE' },
    { code: 'BCS-503', name: 'Design and Analysis of Algorithms', credits: 4, attended: 28, total: 30, pct: 93.33, status: 'NORMAL' },
    { code: 'BCS-551', name: 'DBMS Laboratory', credits: 1, attended: 14, total: 14, pct: 100.0, status: 'NORMAL' }
  ];

  const announcements = [
    {
      id: '1',
      title: 'BCS 554 Mini Project Weekly Review Schedule',
      date: 'Nov 24, 2026',
      author: 'Dept of Computer Science',
      content: 'Scholars are instructed to demonstrate their Phase 2 UI/UX design system and frontend prototypes to the guide on Friday.'
    },
    {
      id: '2',
      title: 'AKTU 75% Attendance Regulatory Compliance Warning',
      date: 'Nov 20, 2026',
      author: 'Office of the Dean',
      content: 'Any student falling below 75% aggregate attendance will be debarred from writing semester theory examinations.'
    }
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Student Self-Service Portal"
        subtitle="Arpit Gola • Roll No: 2200270100045 • B.Tech CSE Semester 5 (2026–27)"
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={() => showToast('Downloading unofficial academic grade sheet', 'info')}
          >
            Download Grade Sheet
          </Button>
        }
      />

      {/* Debarment Warning Banner if attendance < 75% */}
      {isDefaulter && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start space-x-3.5 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <h4 className="font-bold">AKTU 75% Attendance Shortage Alert</h4>
            <p className="mt-0.5 leading-relaxed">
              Your cumulative attendance is currently at {attendanceRate}%, which falls below the mandatory 75% threshold required by AKTU ordinance. Please meet your faculty advisor immediately.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {stats.map((s, idx) => (
          <StatCard key={idx} {...s} />
        ))}
      </div>

      {/* Subject-Wise Attendance Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Subject-Wise Attendance Progress</h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Classroom attendance tracking across registered curriculum</p>
          </div>
          <Badge variant="success" size="sm" dot>
            Overall: {attendanceRate}%
          </Badge>
        </div>

        <div className="space-y-5">
          {subjectProgress.map((sub) => (
            <div key={sub.code} className="space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs">
                <div className="font-bold text-slate-800">
                  <span className="font-mono text-brand-700 mr-2">{sub.code}</span>
                  <span>{sub.name}</span>
                  <span className="text-slate-400 font-normal ml-2">({sub.credits} Credits)</span>
                </div>
                <div className="text-slate-600 font-medium">
                  {sub.attended}/{sub.total} classes •{' '}
                  <strong className={sub.pct >= 75 ? 'text-emerald-600' : 'text-rose-600'}>
                    {sub.pct}%
                  </strong>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    sub.pct >= 85 ? 'bg-emerald-500' : sub.pct >= 75 ? 'bg-brand-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${sub.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Announcements Feed */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 tracking-tight">Official Campus Notices</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {announcements.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-semibold text-brand-600">{a.author}</span>
                <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1" /> {a.date}</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">{a.title}</h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">{a.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
