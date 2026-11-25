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
import { assignmentApi, dashboardApi } from '../../services/managementService';
import {
  extractApiErrorMessage,
  formatDate,
  ASSIGNMENT_STATUS_OPTIONS,
  getStatusBadgeVariant
} from '../../utils/formSchemas';
import {
  BookOpen,
  Users,
  Calendar,
  Bell,
  Search,
  CheckCircle2
} from 'lucide-react';

export const FacultyDashboard = () => {
  const { user } = useAuth();
  const isFacultyRole = (user?.role || '').toLowerCase() === 'faculty';

  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const {
    data: myAssignmentsRes,
    isLoading: isLoadingAssignments,
    error: assignmentsError,
    refetch: refetchAssignments
  } = useQuery({
    queryKey: ['my-assignments', user?.userId],
    queryFn: () => assignmentApi.getMy({ limit: 100 }),
    enabled: isFacultyRole
  });

  const {
    data: statsRes,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['faculty-dashboard-stats', user?.userId],
    queryFn: () => dashboardApi.getFacultyStats()
  });

  const isLoading = (isFacultyRole && isLoadingAssignments) || isLoadingStats;
  const combinedError = assignmentsError || statsError;

  const facultyProfile = myAssignmentsRes?.data?.faculty || statsRes?.data?.faculty || user?.profile || null;
  const allAssignments = myAssignmentsRes?.data?.assignments || statsRes?.data?.assignments || [];
  const summary = myAssignmentsRes?.data?.summary || {
    activeCount: statsRes?.data?.assignedCount ?? allAssignments.filter((a) => a.status === 'ACTIVE').length,
    totalAssignments: allAssignments.length,
    totalEnrolledStudents: statsRes?.data?.totalEnrolledStudents ?? 0
  };
  const notices = statsRes?.data?.notices || [];

  const filteredAssignments = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return allAssignments.filter((item) => {
      if (statusFilter && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (item.subject?.code || '').toLowerCase().includes(q) ||
        (item.subject?.name || '').toLowerCase().includes(q) ||
        (item.course?.code || '').toLowerCase().includes(q) ||
        (item.section || '').toLowerCase().includes(q) ||
        (item.academicYear || '').toLowerCase().includes(q)
      );
    });
  }, [allAssignments, statusFilter, searchTerm]);

  const activeYearsLabel = useMemo(() => {
    const years = [...new Set(allAssignments.map((a) => a.academicYear).filter(Boolean))];
    return years.length > 0 ? years.join(', ') : '—';
  }, [allAssignments]);

  const facultyDisplayName = facultyProfile
    ? `${facultyProfile.firstName || ''} ${facultyProfile.lastName || ''}`.trim() || user?.name
    : user?.name || 'Faculty Member';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Faculty Teaching Workspace"
          description="Loading your assigned subjects, class sections, and student rosters..."
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
          title="Faculty Teaching Workspace"
          description="View your subject assignments and enrolled class sizes."
        />
        <ErrorState
          title="Unable to load faculty assignments"
          message={extractApiErrorMessage(combinedError, 'Failed to retrieve assigned subjects from server')}
          onRetry={() => {
            if (isFacultyRole) refetchAssignments();
            refetchStats();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${facultyDisplayName}`}
        description={
          facultyProfile?.employeeId
            ? `Employee ID: ${facultyProfile.employeeId} · ${
                facultyProfile.designation?.replace(/_/g, ' ') || 'Faculty'
              } · Dept: ${facultyProfile.department?.name || facultyProfile.department?.code || 'N/A'}`
            : 'Assigned subjects, class sections, and teaching workload'
        }
        breadcrumbs={[{ label: 'Faculty Portal' }, { label: 'Dashboard & Assigned Subjects' }]}
        actions={
          <div className="flex items-center space-x-2">
            <Link to="/faculty/attendance">
              <Button variant="outline" size="sm">
                Mark Attendance
              </Button>
            </Link>
            <Link to="/faculty/internal-assessment">
              <Button variant="primary" size="sm">
                Internal Marks
              </Button>
            </Link>
          </div>
        }
      />

      {/* Real KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Assignments"
          value={summary.activeCount ?? 0}
          icon={BookOpen}
          color="indigo"
          subtitle={`${summary.totalAssignments ?? 0} total teaching record(s)`}
        />
        <StatCard
          title="Assigned Students"
          value={summary.totalEnrolledStudents ?? 0}
          icon={Users}
          color="emerald"
          subtitle="Active enrollments across assigned sections"
        />
        <StatCard
          title="Academic Session"
          value={activeYearsLabel}
          icon={Calendar}
          color="sky"
          subtitle="Active assignment year(s)"
        />
        <StatCard
          title="Department Notices"
          value={notices.length}
          icon={CheckCircle2}
          color="amber"
          subtitle="Recent faculty circulars"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assigned Subjects List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">My Assigned Subjects & Sections</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Live teaching allocations from Faculty Assignment Management
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter assignments..."
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white w-40"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white py-1.5 px-2.5 text-xs text-slate-700"
                aria-label="Filter assignments by status"
              >
                <option value="">All Statuses</option>
                {ASSIGNMENT_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredAssignments.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No teaching assignments found"
              description={
                allAssignments.length === 0
                  ? 'No subjects are currently assigned to your profile. Contact the Academic Administrator.'
                  : 'No assignments match your current filter.'
              }
            />
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {filteredAssignments.map((item) => (
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
                      Course: <strong className="text-slate-700">{item.course?.code || '—'}</strong> ·
                      Semester {item.semester?.semesterNumber ?? '—'} · Section{' '}
                      <strong>{item.section || 'A'}</strong> · Session {item.academicYear}
                    </p>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                      <Users className="w-3.5 h-3.5 mr-1" />
                      {item.enrolledStudentCount ?? 0} Enrolled
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Assigned {formatDate(item.assignmentDate || item.createdAt)}
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
            <h3 className="text-base font-bold text-slate-900">Faculty Notices</h3>
            <Bell className="w-4 h-4 text-slate-400" />
          </div>

          {notices.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
              No active faculty circulars posted.
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

export default FacultyDashboard;
