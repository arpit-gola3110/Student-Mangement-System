import React from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import StatCard from '../../components/data/StatCard';
import ChartCard from '../../components/data/ChartCard';
import DataTable from '../../components/data/DataTable';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { useToast } from '../../context/ToastContext';
import {
  BookOpen,
  GraduationCap,
  CalendarCheck,
  Award,
  Clock,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export const FacultyDashboard = () => {
  const { showToast } = useToast();

  const stats = [
    { title: 'Assigned Subjects', value: '3 Courses', icon: BookOpen, color: 'indigo', subtitle: 'Semester 5 (2026–27)' },
    { title: 'Enrolled Students', value: '180 Scholars', icon: GraduationCap, color: 'emerald', subtitle: 'Sections A & B' },
    { title: "Today's Attendance", value: '1 Pending', icon: CalendarCheck, color: 'amber', subtitle: 'BCS 554 Lecture at 2:00 PM' },
    { title: 'Pending CIA Marks', value: 'Sessional 1', icon: Award, color: 'sky', subtitle: 'Due in 4 days' }
  ];

  const assignedSubjects = [
    {
      code: 'BCS-554',
      name: 'Internship Assessment / Mini Project',
      semester: 'Sem 5 • Sec A',
      students: 60,
      attendanceRate: '92.4%',
      status: 'ACTIVE'
    },
    {
      code: 'BCS-501',
      name: 'Database Management Systems',
      semester: 'Sem 5 • Sec A',
      students: 60,
      attendanceRate: '85.2%',
      status: 'ACTIVE'
    },
    {
      code: 'BCS-551',
      name: 'DBMS Lab',
      semester: 'Sem 5 • Sec B',
      students: 60,
      attendanceRate: '89.0%',
      status: 'ACTIVE'
    }
  ];

  const todaySchedule = [
    { time: '09:00 AM - 10:00 AM', code: 'BCS-501', subject: 'Database Management Systems', room: 'Lecture Hall 204', status: 'CONDUCTED' },
    { time: '11:00 AM - 01:00 PM', code: 'BCS-551', subject: 'DBMS Laboratory', room: 'Computer Lab 3', status: 'CONDUCTED' },
    { time: '02:00 PM - 03:00 PM', code: 'BCS-554', subject: 'Mini Project Guide Review', room: 'Project Room 102', status: 'UPCOMING' }
  ];

  const scheduleColumns = [
    { header: 'Time Slot', accessor: 'time', render: (r) => <span className="font-mono text-xs font-semibold text-slate-800">{r.time}</span> },
    { header: 'Course Code', accessor: 'code', render: (r) => <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">{r.code}</span> },
    { header: 'Subject Title', accessor: 'subject', render: (r) => <span className="font-medium text-slate-900">{r.subject}</span> },
    { header: 'Venue', accessor: 'room', render: (r) => <span className="text-xs text-slate-500">{r.room}</span> },
    {
      header: 'Status',
      accessor: 'status',
      align: 'right',
      render: (r) => (
        <Badge variant={r.status === 'CONDUCTED' ? 'success' : 'warning'} size="sm" dot>
          {r.status}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Instructor Academic Dashboard"
        subtitle="Dr. Rajesh Sharma • Professor, Department of Computer Science & Engineering"
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={CalendarCheck}
            onClick={() => showToast('Opening classroom roll-call sheet', 'info')}
          >
            Mark Daily Attendance
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((s, idx) => (
          <StatCard key={idx} {...s} />
        ))}
      </div>

      {/* Teaching Load Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">Active Assigned Subjects</h3>
          <span className="text-xs font-semibold text-slate-500">Academic Session 2026–27</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {assignedSubjects.map((sub) => (
            <div key={sub.code} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-200">
                  {sub.code}
                </span>
                <Badge variant="success" size="sm" dot>
                  {sub.status}
                </Badge>
              </div>

              <h4 className="text-base font-bold text-slate-900 mt-3 truncate">{sub.name}</h4>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">{sub.semester}</p>

              <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>{sub.students} Enrolled</span>
                <span className="font-semibold text-emerald-700">{sub.attendanceRate} Attd</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => showToast(`Opening roll-call for ${sub.code}`, 'info')}
                >
                  Roll Call
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => showToast(`Opening marks entry for ${sub.code}`, 'info')}
                >
                  CIA Marks
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Today's Schedule Table */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center">
          <Clock className="w-5 h-5 text-brand-600 mr-2" /> Today's Lecture Timetable
        </h3>
        <DataTable
          columns={scheduleColumns}
          data={todaySchedule}
          searchable={false}
          pagination={false}
        />
      </div>
    </div>
  );
};

export default FacultyDashboard;
