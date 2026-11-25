import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';
import PageHeader from '../../components/layout/PageHeader';
import StatCard from '../../components/data/StatCard';
import ChartCard from '../../components/data/ChartCard';
import DataTable from '../../components/data/DataTable';
import Badge from '../../components/common/Badge';
import LoadingSkeleton from '../../components/data/LoadingSkeleton';
import ErrorState from '../../components/data/ErrorState';
import EmptyState from '../../components/data/EmptyState';
import { attendanceApi } from '../../services/managementService';
import {
  extractApiErrorMessage,
  formatDate,
  ATTENDANCE_STATUS_OPTIONS,
  getStatusBadgeVariant
} from '../../utils/formSchemas';
import { CalendarCheck, CheckCircle2, XCircle, Clock, AlertTriangle, BookOpen } from 'lucide-react';

export const StudentAttendancePage = () => {
  const [page, setPage] = useState(1);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const summaryQuery = useQuery({
    queryKey: ['student-attendance-summary'],
    queryFn: () => attendanceApi.getMySummary()
  });

  const historyQuery = useQuery({
    queryKey: ['student-attendance-history', { page, subjectFilter, statusFilter, startDate, endDate }],
    queryFn: () =>
      attendanceApi.getMyAttendance({
        page,
        limit: 12,
        subject: subjectFilter,
        status: statusFilter,
        startDate,
        endDate
      })
  });

  const summaryData = summaryQuery.data?.data || {};
  const overall = summaryData.overall || {};
  const subjects = summaryData.subjects || [];
  const policy = summaryData.policy || { threshold: 75, lateCountsAsAttended: true };

  const historyRecords = historyQuery.data?.data?.records || [];
  const pagination = historyQuery.data?.meta?.pagination || { page: 1, totalPages: 1, totalRecords: 0 };

  const chartData = subjects
    .filter((s) => !s.hasNoData && s.percentage !== null)
    .map((s) => ({
      code: s.subject?.code || 'N/A',
      percentage: s.percentage
    }));

  const historyColumns = [
    {
      key: 'date',
      label: 'Date & Session',
      render: (r) => (
        <div>
          <p className="font-semibold text-slate-900">{r.session?.sessionDate || formatDate(r.date)}</p>
          <p className="text-xs text-slate-500">
            Session #{r.session?.sessionNumber ?? 1} · {r.session?.topic || 'Class Session'}
          </p>
        </div>
      )
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (r) => (
        <div>
          <p className="font-medium text-slate-900">
            <span className="font-mono text-xs text-brand-700 mr-1.5">{r.subject?.code}</span>
            {r.subject?.name}
          </p>
          <p className="text-xs text-slate-500">
            Faculty: {r.markedBy ? `${r.markedBy.firstName} ${r.markedBy.lastName}` : '—'}
          </p>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <Badge variant={getStatusBadgeVariant(r.status)}>{r.status}</Badge>
    },
    {
      key: 'remarks',
      label: 'Remarks',
      render: (r) => <span className="text-xs text-slate-600">{r.remarks || '—'}</span>
    }
  ];

  if (summaryQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Attendance" description="Loading your attendance records..." />
        <LoadingSkeleton variant="card" count={4} />
        <LoadingSkeleton variant="table" count={4} />
      </div>
    );
  }

  if (summaryQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Attendance" description="View your personal attendance summary and history." />
        <ErrorState
          title="Unable to load attendance summary"
          message={extractApiErrorMessage(summaryQuery.error)}
          onRetry={summaryQuery.refetch}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Attendance Record"
        description={`Authoritative attendance summary (Finalized sessions · Late ${
          policy.lateCountsAsAttended ? 'counted as attended' : 'not counted'
        } · Required threshold: ${policy.threshold}%).`}
        breadcrumbs={[{ label: 'Student Portal', path: '/student/dashboard' }, { label: 'Attendance' }]}
      />

      {!overall.hasNoData && overall.isBelowThreshold && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-rose-900">
              Attendance Shortage Warning ({overall.percentage}% &lt; {policy.threshold}%)
            </h4>
            <p className="text-xs text-rose-700 mt-0.5">
              Your cumulative finalized attendance is below the {policy.threshold}% institutional threshold. Please attend upcoming classes regularly.
            </p>
          </div>
        </div>
      )}

      {/* Overall KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Overall Attendance"
          value={overall.hasNoData || overall.percentage === null ? 'No Data' : `${overall.percentage}%`}
          icon={CalendarCheck}
          color={overall.isBelowThreshold ? 'rose' : 'indigo'}
          subtitle={
            overall.hasNoData
              ? 'No finalized sessions recorded yet'
              : `Threshold: ${policy.threshold}%`
          }
        />
        <StatCard
          title="Conducted Sessions"
          value={overall.totalSessions ?? 0}
          icon={BookOpen}
          color="sky"
          subtitle="Across finalized classes"
        />
        <StatCard
          title="Present & Late"
          value={(overall.presentCount ?? 0) + (overall.lateCount ?? 0)}
          icon={CheckCircle2}
          color="emerald"
          subtitle={`${overall.presentCount ?? 0} Present · ${overall.lateCount ?? 0} Late`}
        />
        <StatCard
          title="Absent Sessions"
          value={overall.absentCount ?? 0}
          icon={XCircle}
          color="amber"
          subtitle="Counted as missed classes"
        />
      </div>

      {/* Subject Breakdown Cards + Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">Subject-wise Attendance Breakdown</h3>
          {subjects.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No enrolled subjects found"
              description="Subject-wise attendance percentages will appear once you are enrolled and classes are finalized."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {subjects.map((sub) => (
                <div
                  key={`${sub.subject?._id}-${sub.academicYear}`}
                  className={`p-4 rounded-xl border ${
                    sub.isBelowThreshold ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-slate-50/60'
                  } space-y-2`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-brand-700">
                      {sub.subject?.code}
                    </span>
                    <Badge
                      variant={
                        sub.hasNoData
                          ? 'neutral'
                          : sub.isBelowThreshold
                          ? 'danger'
                          : 'success'
                      }
                    >
                      {sub.hasNoData ? 'No Sessions' : `${sub.percentage}%`}
                    </Badge>
                  </div>
                  <p className="text-sm font-bold text-slate-900 truncate">{sub.subject?.name}</p>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        sub.isBelowThreshold ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, sub.percentage || 0)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-600">
                    {sub.hasNoData
                      ? '0 finalized sessions conducted'
                      : `${sub.attendedCount}/${sub.totalSessions} attended · P:${sub.presentCount} L:${sub.lateCount} A:${sub.absentCount}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <ChartCard title="Subject Comparison" subtitle={`Target threshold: ${policy.threshold}%`}>
          {chartData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-slate-500 text-center">
              Chart renders once finalized attendance sessions exist.
            </div>
          ) : (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="code" tick={{ fill: '#64748B', fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 11 }} />
                  <Tooltip />
                  <ReferenceLine y={policy.threshold} stroke="#EF4444" strokeDasharray="4 4" />
                  <Bar dataKey="percentage" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Personal Attendance History */}
      <DataTable
        columns={historyColumns}
        data={historyRecords}
        isLoading={historyQuery.isLoading}
        error={historyQuery.error ? extractApiErrorMessage(historyQuery.error) : null}
        onRetry={historyQuery.refetch}
        serverSide
        searchable={false}
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalRecords={pagination.totalRecords}
        pageSize={12}
        onPageChange={setPage}
        toolbarExtras={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={subjectFilter}
              onChange={(e) => {
                setSubjectFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs"
            >
              <option value="">All My Subjects</option>
              {subjects.map((s) => (
                <option key={s.subject?._id} value={s.subject?._id}>
                  {s.subject?.code} - {s.subject?.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs"
            >
              <option value="">All Statuses</option>
              {ATTENDANCE_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white py-1.5 px-2.5 text-xs"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white py-1.5 px-2.5 text-xs"
            />
          </div>
        }
        emptyTitle="No attendance history yet"
        emptyDescription="Your individual class attendance entries will appear here once marked by faculty."
      />
    </div>
  );
};

export default StudentAttendancePage;
