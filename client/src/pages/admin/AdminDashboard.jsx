import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../../components/layout/PageHeader';
import StatCard from '../../components/data/StatCard';
import ChartCard from '../../components/data/ChartCard';
import DataTable from '../../components/data/DataTable';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { useToast } from '../../context/ToastContext';
import { dashboardApi } from '../../services/managementService';
import {
  GraduationCap,
  Users,
  BookOpen,
  Layers,
  Building2,
  Calendar,
  UserPlus,
  BookPlus,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

export const AdminDashboard = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const statsQuery = useQuery({
    queryKey: ['adminDashboardStats'],
    queryFn: dashboardApi.getAdminStats
  });

  const live = statsQuery.data?.data || {};
  const isStatsLoading = statsQuery.isLoading;

  const stats = [
    {
      title: 'Total Students',
      value: isStatsLoading ? '—' : String(live.totalStudents ?? 0),
      icon: GraduationCap,
      color: 'indigo',
      subtitle: 'Active enrolled scholars'
    },
    {
      title: 'Faculty Members',
      value: isStatsLoading ? '—' : String(live.totalFaculty ?? 0),
      icon: Users,
      color: 'emerald',
      subtitle: 'Active instructional staff'
    },
    {
      title: 'Departments',
      value: isStatsLoading ? '—' : String(live.totalDepartments ?? 0),
      icon: Building2,
      color: 'sky',
      subtitle: `${live.activeDepartments ?? 0} active divisions`
    },
    {
      title: 'Degree Courses',
      value: isStatsLoading ? '—' : String(live.totalCourses ?? 0),
      icon: BookOpen,
      color: 'amber',
      subtitle: `${live.activeCourses ?? 0} active programs`
    },
    {
      title: 'Semesters',
      value: isStatsLoading ? '—' : String(live.totalSemesters ?? 0),
      icon: Calendar,
      color: 'indigo',
      subtitle: `${live.activeSemesters ?? 0} active terms`
    },
    {
      title: 'Active Subjects',
      value: isStatsLoading ? '—' : String(live.activeSubjects ?? 0),
      icon: Layers,
      color: 'emerald',
      subtitle: `${live.totalSubjects ?? 0} total catalogued`
    }
  ];

  const studentDistribution = [
    { dept: 'CSE', count: 480 },
    { dept: 'ECE', count: 280 },
    { dept: 'ME', count: 210 },
    { dept: 'CE', count: 160 },
    { dept: 'IT', count: 118 }
  ];

  const attendanceTrends = [
    { week: 'Week 1', rate: 92 },
    { week: 'Week 2', rate: 89 },
    { week: 'Week 3', rate: 85 },
    { week: 'Week 4', rate: 87 },
    { week: 'Week 5', rate: 84 },
    { week: 'Week 6', rate: 88 }
  ];

  const recentActivities = [
    { id: '1', action: 'BATCH_ENROLLMENT', detail: '60 students enrolled in B.Tech CSE Sem 5 Sec A', actor: 'Registrar Office', time: '10 mins ago', status: 'COMPLETED' },
    { id: '2', action: 'ATTENDANCE_LOG', detail: 'Daily roll-call recorded for BCS-554 Mini Project', actor: 'Dr. Rajesh Sharma', time: '45 mins ago', status: 'COMPLETED' },
    { id: '3', action: 'INTERNAL_MARKS', detail: 'Sessional 1 marks entered for BCS-501 DBMS', actor: 'Prof. Alok Gupta', time: '2 hours ago', status: 'PENDING' },
    { id: '4', action: 'NOTICE_BROADCAST', detail: 'AKTU Mini Project Guidelines Circular Published', actor: 'Dean Academics', time: '1 day ago', status: 'PUBLISHED' }
  ];

  const activityColumns = [
    {
      header: 'Event Category',
      accessor: 'action',
      render: (r) => (
        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md">
          {r.action}
        </span>
      )
    },
    {
      header: 'Details',
      accessor: 'detail',
      render: (r) => <span className="font-medium text-slate-700">{r.detail}</span>
    },
    {
      header: 'Actor',
      accessor: 'actor',
      render: (r) => <span className="text-xs text-slate-500">{r.actor}</span>
    },
    {
      header: 'Timestamp',
      accessor: 'time',
      render: (r) => <span className="text-xs text-slate-400 font-mono">{r.time}</span>
    },
    {
      header: 'Status',
      accessor: 'status',
      align: 'right',
      render: (r) => (
        <Badge
          variant={r.status === 'COMPLETED' || r.status === 'PUBLISHED' ? 'success' : 'warning'}
          size="sm"
          dot
        >
          {r.status}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page Header with Action Toolbar */}
      <PageHeader
        title="Institutional Executive Dashboard"
        subtitle="Real-time academic administration, institutional metrics, and governance oversight"
        actions={
          <div className="flex items-center space-x-2.5">
            <Button
              variant="outline"
              size="sm"
              icon={UserPlus}
              onClick={() => navigate('/admin/students')}
            >
              Manage Students
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={BookPlus}
              onClick={() => navigate('/admin/courses')}
            >
              Manage Courses
            </Button>
          </div>
        }
      />

      {/* KPI Statistic Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-5">
        {stats.map((s, idx) => (
          <StatCard key={idx} {...s} />
        ))}
      </div>

      {/* Analytical Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Student Distribution by Department"
          subtitle="Total enrolled scholars across major engineering faculties"
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={studentDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="dept" tickLine={false} axisLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: '#F1F5F9' }}
                  contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', border: 'none', color: '#FFF' }}
                />
                <Bar dataKey="count" fill="#4F46E5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Campus-Wide Attendance Trend"
          subtitle="Weekly aggregate percentage against 75% regulatory threshold"
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAttd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                <YAxis domain={[60, 100]} tickLine={false} axisLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', border: 'none', color: '#FFF' }}
                />
                <Area type="monotone" dataKey="rate" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAttd)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Recent Activity Data Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Recent Administrative Activity</h3>
            <p className="text-xs text-slate-500 font-medium">Audit events across academic departments and cohorts</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowRight}
            iconPosition="right"
            onClick={() => showToast('Opening system audit logs', 'info')}
          >
            View Full Audit Log
          </Button>
        </div>

        <DataTable
          columns={activityColumns}
          data={recentActivities}
          searchable={false}
          pagination={false}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
