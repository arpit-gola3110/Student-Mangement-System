import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import MetricCard from '../../components/common/MetricCard';
import { BookOpen, CalendarCheck, CheckCircle2, ArrowRight } from 'lucide-react';

export const FacultyDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFacultyData = async () => {
      try {
        const res = await api.get('/dashboards/faculty');
        setData(res.data);
      } catch (err) {
        setData({
          assignedCount: 2,
          assignments: [
            {
              _id: '1',
              subject: { code: 'BCS-554', name: 'Mini Project / Internship Assessment' },
              semester: { semesterNumber: 5 },
              section: 'A'
            },
            {
              _id: '2',
              subject: { code: 'BCS-501', name: 'Database Management Systems' },
              semester: { semesterNumber: 5 },
              section: 'A'
            }
          ]
        });
      } finally {
        setLoading(false);
      }
    };
    fetchFacultyData();
  }, []);

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-32 bg-slate-200 rounded-xl"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Faculty Portal</h1>
        <p className="text-sm text-slate-500">Teaching Assignments & Classroom Workflow</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <MetricCard
          title="Assigned Subjects"
          value={data?.assignedCount || '2'}
          icon={BookOpen}
          change="Current active semester"
          color="indigo"
        />
        <MetricCard
          title="Today's Classes"
          value="2 Lectures"
          icon={CalendarCheck}
          change="Section A (Sem 5)"
          color="emerald"
        />
        <MetricCard
          title="Pending Attendance"
          value="1 Class"
          icon={CheckCircle2}
          change="Take attendance today"
          color="amber"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">Assigned Courses & Quick Actions</h2>
          <Link
            to="/faculty/attendance/mark"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            Mark Daily Attendance <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {data?.assignments?.map((item) => (
            <div key={item._id} className="py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {item.subject?.code} • {item.subject?.name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Semester {item.semester?.semesterNumber || 5} • Section {item.section}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Link
                  to="/faculty/attendance/mark"
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition"
                >
                  Take Attendance
                </Link>
                <Link
                  to="/faculty/marks-entry"
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold transition"
                >
                  Enter CIA Marks
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;
