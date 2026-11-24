import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import MetricCard from '../../components/common/MetricCard';
import { CalendarCheck, Award, BookOpen, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const StudentDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const res = await api.get('/dashboards/student');
        setData(res.data);
      } catch (err) {
        setData({
          attendancePercentage: 82.5,
          isDefaulter: false,
          totalClasses: 40,
          classesAttended: 33,
          student: {
            rollNumber: '2200270100045',
            currentSemester: 5,
            department: { name: 'Computer Science & Engineering' }
          }
        });
      } finally {
        setLoading(false);
      }
    };
    fetchStudentData();
  }, []);

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-32 bg-slate-200 rounded-xl"></div></div>;
  }

  const attendancePct = data?.attendancePercentage || 82.5;
  const isDefaulter = attendancePct < 75;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Academic Hub</h1>
        <p className="text-sm text-slate-500">
          Roll No: <span className="font-semibold text-slate-700">{data?.student?.rollNumber || '2200270100045'}</span> •{' '}
          {data?.student?.department?.name || 'Computer Science & Engineering'} • Semester {data?.student?.currentSemester || 5}
        </p>
      </div>

      {isDefaulter && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center space-x-3">
          <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
          <div className="text-sm">
            <span className="font-bold">AKTU 75% Attendance Shortage Alert:</span> Your aggregate attendance is {attendancePct}%, below the required 75% threshold. Please meet your faculty advisor.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <MetricCard
          title="Attendance Percentage"
          value={`${attendancePct}%`}
          icon={CalendarCheck}
          change={`${data?.classesAttended || 33} of ${data?.totalClasses || 40} classes`}
          color={isDefaulter ? 'rose' : 'emerald'}
          trend={isDefaulter ? 'down' : 'up'}
        />
        <MetricCard
          title="Current Semester SGPA"
          value="8.42"
          icon={Award}
          change="Grade: A (Excellent)"
          color="indigo"
          trend="up"
        />
        <MetricCard
          title="Enrolled Subjects"
          value="6 Courses"
          icon={BookOpen}
          change="22 AKTU Credits"
          color="amber"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Subject-Wise Attendance Snapshot</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm font-medium mb-1.5">
              <span>BCS 554 • Mini Project / Internship Assessment</span>
              <span className="text-emerald-600 font-bold">90.0% (Present)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5">
              <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '90%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm font-medium mb-1.5">
              <span>BCS 501 • Database Management Systems</span>
              <span className="text-indigo-600 font-bold">81.5% (Present)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5">
              <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: '81.5%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
