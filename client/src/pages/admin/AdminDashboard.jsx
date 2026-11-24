import React from 'react';
import PageHeader from '../../components/layout/PageHeader';
import StatCard from '../../components/data/StatCard';
import ChartCard from '../../components/data/ChartCard';
import DataTable from '../../components/data/DataTable';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { useToast } from '../../context/ToastContext';
import {
  GraduationCap,
  Users,
  BookOpen,
  Layers,
  CalendarCheck,
  UserPlus,
  BookPlus,
  Bell,
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

  // Illustrative demo data for layout preview (clearly identified as UI preview data)
  const stats = [
    { title: 'Total Students', value: '1,248', icon: GraduationCap, trend: 'up', trendValue: '+6.2%', color: 'indigo', subtitle: 'Enrolled in 2026–27' },
    { title: 'Faculty Members', value: '84', icon: Users, trend: 'up', trendValue: '+2', color: 'emerald', subtitle: 'Active instructional staff' },
    { title: 'Degree Programs', value: '14', icon: BookOpen, color: 'sky', subtitle: 'Across 6 departments' },
    { title: 'Curricular Subjects', value: '96', icon: Layers, color: 'amber', subtitle: 'Current active semester' },
    { title: 'Average Attendance', value: '86.4%', icon: CalendarCheck, trend: 'up', trendValue: '+1.4%', color: 'emerald', subtitle: 'AKTU 75% threshold compliant' }
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
              onClick={() => showToast('Student enrollment drawer ready for Phase 6', 'info')}
            >
              Enroll Student
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={BookPlus}
              onClick={() => showToast('Course allocation modal ready for Phase 6', 'info')}
            >
              Add Course
            </Button>
          </div>
        }
      />

      {/* KPI Statistic Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
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
