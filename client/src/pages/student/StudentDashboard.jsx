import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import StatCard from '../../components/data/StatCard';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import LoadingSkeleton from '../../components/data/LoadingSkeleton';
import ErrorState from '../../components/data/ErrorState';
import EmptyState from '../../components/data/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { enrollmentApi, dashboardApi } from '../../services/managementService';
import {
  extractApiErrorMessage,
  formatDate,
  ENROLLMENT_STATUS_OPTIONS,
  getStatusBadgeVariant
} from '../../utils/formSchemas';
import {
  BookOpen,
  GraduationCap,
  Calendar,
  Award,
  Bell,
  Search
} from 'lucide-react';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const isStudentRole = (user?.role || '').toLowerCase() === 'student';

  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const {
    data: myEnrollmentsRes,
    isLoading: isLoadingEnrollments,
    error: enrollmentsError,
    refetch: refetchEnrollments
  } = useQuery({
    queryKey: ['my-enrollments', user?.userId],
    queryFn: () => enrollmentApi.getMy({ limit: 100 }),
    enabled: isStudentRole
  });

  const {
    data: statsRes,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['student-dashboard-stats', user?.userId],
    queryFn: () => dashboardApi.getStudentStats()
  });

  const isLoading = (isStudentRole && isLoadingEnrollments) || isLoadingStats;
  const combinedError = enrollmentsError || statsError;

  const studentProfile = myEnrollmentsRes?.data?.student || statsRes?.data?.student || user?.profile || null;
  const allEnrollments = myEnrollmentsRes?.data?.enrollments || statsRes?.data?.enrollments || [];
  const summary = myEnrollmentsRes?.data?.summary || {
    totalEnrollments: allEnrollments.length,
    activeCount: statsRes?.data?.enrolledCount ?? allEnrollments.filter((e) => e.status === 'ACTIVE').length,
    totalActiveCredits:
      statsRes?.data?.totalActiveCredits ??
      allEnrollments.filter((e) => e.status === 'ACTIVE').reduce((a, b) => a + (b.subject?.credits || 0), 0)
  };
  const dashData = statsRes?.data || {};
  const notices = dashData.notices || [];

  const filteredEnrollments = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return allEnrollments.filter((item) => {
      if (statusFilter && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (item.subject?.code || '').toLowerCase().includes(q) ||
        (item.subject?.name || '').toLowerCase().includes(q) ||
        (item.course?.code || '').toLowerCase().includes(q) ||
        (item.academicYear || '').toLowerCase().includes(q)
      );
    });
  }, [allEnrollments, statusFilter, searchTerm]);

  const studentDisplayName = studentProfile
    ? `${studentProfile.firstName || ''} ${studentProfile.lastName || ''}`.trim() || user?.name
    : user?.name || 'Student Scholar';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Student Academic Portal"
          description="Loading your institutional profile and enrolled subjects..."
        />
        <LoadingSkeleton variant="card" count={4} />
        <LoadingSkeleton variant="table" count={4} />
      </div>
    );
  }

  if (combinedError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Student Academic Portal"
          description="View your enrolled subjects, academic credits, and attendance summary."
        />
        <ErrorState
          title="Unable to load student academic records"
          message={extractApiErrorMessage(combinedError, 'Failed to retrieve enrollments from server')}
          onRetry={() => {
            if (isStudentRole) refetchEnrollments();
            refetchStats();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${studentDisplayName}`}
        description={
          studentProfile?.rollNumber
            ? `Roll No: ${studentProfile.rollNumber} · Department: ${
                studentProfile.department?.name || studentProfile.department?.code || 'N/A'
              }${studentProfile.course?.code ? ` · ${studentProfile.course.code}` : ''}`
            : 'Academic enrollments, enrolled subjects, and semester progress'
        }
        breadcrumbs={[{ label: 'Student Portal' }, { label: 'Dashboard & Enrolled Subjects' }]}
        actions={
          <div className="flex items-center space-x-2">
            <Link to="/student/attendance">
              <Button variant="outline" size="sm">
                Attendance
              </Button>
            </Link>
            <Link to="/student/internal-assessment">
              <Button variant="primary" size="sm">
                Internal Marks ({dashData.publishedAssessmentsCount ?? 0})
              </Button>
            </Link>
          </div>
        }
      />

      {/* Real KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Enrolled Subjects"
          value={summary.activeCount ?? 0}
          icon={BookOpen}
          color="indigo"
          subtitle={`${summary.totalEnrollments ?? 0} total enrollment record(s)`}
        />
        <StatCard
          title="Active Credits"
          value={summary.totalActiveCredits ?? 0}
          icon={Award}
          color="emerald"
          subtitle="Across active subject enrollments"
        />
        <StatCard
          title="Current Attendance"
          value={
            dashData.attendancePercentage !== null && dashData.attendancePercentage !== undefined
              ? `${dashData.attendancePercentage}%`
              : 'No Records'
          }
          icon={Calendar}
          color={dashData.isDefaulter ? 'rose' : 'sky'}
          subtitle={
            dashData.totalClasses > 0
              ? `${dashData.classesAttended} of ${dashData.totalClasses} classes attended`
              : 'Attendance not marked yet'
          }
        />
        <StatCard
          title="Semester Level"
          value={studentProfile?.currentSemester ? `Sem ${studentProfile.currentSemester}` : '—'}
          icon={GraduationCap}
          color="amber"
          subtitle={studentProfile?.academicYear || 'Current Academic Session'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enrolled Courses & Subjects */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">My Enrolled Subjects</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Live enrollment records assigned by Academic Administration
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter subjects..."
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white w-40"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white py-1.5 px-2.5 text-xs text-slate-700"
                aria-label="Filter enrollments by status"
              >
                <option value="">All Statuses</option>
                {ENROLLMENT_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredEnrollments.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No enrolled subjects found"
              description={
                allEnrollments.length === 0
                  ? 'You have not been enrolled into any subjects yet. Contact your academic administrator.'
                  : 'No enrollments match the current search or status filter.'
              }
            />
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {filteredEnrollments.map((item) => (
                <div
                  key={item._id}
                  className="p-4 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700">
                        {item.subject?.code || 'N/A'}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-900">
                        {item.subject?.name || 'Subject'}
                      </h4>
                      <Badge variant={getStatusBadgeVariant(item.status)}>{item.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Course: <strong className="text-slate-700">{item.course?.code}</strong> · Semester{' '}
                      {item.semester?.semesterNumber ?? '—'} · Section {item.section || 'A'} · Session{' '}
                      {item.academicYear}
                    </p>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <p className="text-xs font-semibold text-slate-700">
                      {item.subject?.credits ?? 0} Credits · {item.subject?.type || 'THEORY'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Enrolled {formatDate(item.enrollmentDate || item.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notices Column */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Institutional Notices</h3>
            <Bell className="w-4 h-4 text-slate-400" />
          </div>

          {notices.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
              No active student announcements at the moment.
            </div>
          ) : (
            <div className="space-y-3">
              {notices.map((notice) => (
                <div key={notice._id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
                  <p className="text-xs font-bold text-slate-900">{notice.title}</p>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-3">{notice.content}</p>
                  <p className="text-[11px] text-slate-400 mt-1.5">{formatDate(notice.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
