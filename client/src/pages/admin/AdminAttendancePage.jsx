import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import PageHeader from '../../components/layout/PageHeader';
import Tabs from '../../components/common/Tabs';
import StatCard from '../../components/data/StatCard';
import ChartCard from '../../components/data/ChartCard';
import DataTable from '../../components/data/DataTable';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Textarea from '../../components/common/Textarea';
import LoadingSkeleton from '../../components/data/LoadingSkeleton';
import ErrorState from '../../components/data/ErrorState';
import EmptyState from '../../components/data/EmptyState';
import { useToast } from '../../context/ToastContext';
import { attendanceApi, academicLookupApi } from '../../services/managementService';
import {
  extractApiErrorMessage,
  formatDate,
  ATTENDANCE_STATUS_OPTIONS,
  SESSION_STATUS_OPTIONS,
  getStatusBadgeVariant
} from '../../utils/formSchemas';
import {
  BarChart3,
  ClipboardList,
  History,
  FileSpreadsheet,
  CalendarCheck,
  AlertTriangle,
  Users,
  Edit3,
  Lock,
  Unlock,
  Ban,
  CheckCircle2
} from 'lucide-react';

const correctSchema = z.object({
  status: z.enum(['PRESENT', 'ABSENT', 'LATE']),
  remarks: z.string().max(300).optional(),
  reason: z.string().trim().min(3, 'Audit reason is required (min 3 chars)').max(300)
});

export const AdminAttendancePage = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('overview');
  const [filterDept, setFilterDept] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterFaculty, setFilterFaculty] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Sessions state
  const [sessPage, setSessPage] = useState(1);
  const [sessStatus, setSessStatus] = useState('');
  const [sessSearch, setSessSearch] = useState('');
  const [viewRosterSessionId, setViewRosterSessionId] = useState('');
  const [statusModalTarget, setStatusModalTarget] = useState(null);
  const [nextSessionStatus, setNextSessionStatus] = useState('OPEN');
  const [statusReason, setStatusReason] = useState('');

  // History state
  const [histPage, setHistPage] = useState(1);
  const [histSearch, setHistSearch] = useState('');
  const [histStatus, setHistStatus] = useState('');
  const [correctTarget, setCorrectTarget] = useState(null);

  // Report subtab
  const [reportType, setReportType] = useState('students');
  const [belowThresholdOnly, setBelowThresholdOnly] = useState(false);
  const [reportPage, setReportPage] = useState(1);

  const extractArray = (res, key) => (Array.isArray(res?.data) ? res.data : res?.data?.[key]) || [];

  const deptLookup = useQuery({ queryKey: ['lookup-departments-active'], queryFn: () => academicLookupApi.getDepartments({ isActive: true }) });
  const courseLookup = useQuery({ queryKey: ['lookup-courses-active'], queryFn: () => academicLookupApi.getCourses({ isActive: true }) });
  const semesterLookup = useQuery({ queryKey: ['lookup-semesters-active'], queryFn: () => academicLookupApi.getSemesters({ isActive: true }) });
  const subjectLookup = useQuery({ queryKey: ['lookup-subjects-active'], queryFn: () => academicLookupApi.getSubjects({ isActive: true }) });
  const facultyLookup = useQuery({ queryKey: ['lookup-faculty-active'], queryFn: () => academicLookupApi.getActiveFaculty() });

  const departments = extractArray(deptLookup.data, 'departments');
  const courses = extractArray(courseLookup.data, 'courses');
  const semesters = extractArray(semesterLookup.data, 'semesters');
  const subjects = extractArray(subjectLookup.data, 'subjects');
  const facultyList = extractArray(facultyLookup.data, 'faculty');

  const sharedFilterParams = useMemo(
    () => ({
      department: filterDept,
      course: filterCourse,
      semester: filterSemester,
      subject: filterSubject,
      faculty: filterFaculty,
      startDate: filterStartDate,
      endDate: filterEndDate
    }),
    [filterDept, filterCourse, filterSemester, filterSubject, filterFaculty, filterStartDate, filterEndDate]
  );

  const overviewQuery = useQuery({
    queryKey: ['admin-attendance-overview', sharedFilterParams],
    queryFn: () => attendanceApi.getOverviewReport(sharedFilterParams)
  });

  const sessionsQuery = useQuery({
    queryKey: ['admin-attendance-sessions', { ...sharedFilterParams, sessPage, sessStatus, sessSearch }],
    queryFn: () =>
      attendanceApi.listSessions({
        ...sharedFilterParams,
        page: sessPage,
        limit: 10,
        status: sessStatus,
        search: sessSearch
      }),
    enabled: activeTab === 'sessions'
  });

  const sessionRosterQuery = useQuery({
    queryKey: ['admin-session-roster', viewRosterSessionId],
    queryFn: () => attendanceApi.getSessionById(viewRosterSessionId),
    enabled: Boolean(viewRosterSessionId)
  });

  const historyQuery = useQuery({
    queryKey: ['admin-attendance-history', { ...sharedFilterParams, histPage, histSearch, histStatus }],
    queryFn: () =>
      attendanceApi.listHistory({
        ...sharedFilterParams,
        page: histPage,
        limit: 12,
        search: histSearch,
        status: histStatus
      }),
    enabled: activeTab === 'history'
  });

  const studentReportQuery = useQuery({
    queryKey: ['admin-att-report-students', { ...sharedFilterParams, reportPage, belowThresholdOnly }],
    queryFn: () =>
      attendanceApi.getStudentsReport({
        ...sharedFilterParams,
        page: reportPage,
        limit: 12,
        belowThresholdOnly: belowThresholdOnly ? 'true' : undefined
      }),
    enabled: activeTab === 'reports' && reportType === 'students'
  });

  const subjectReportQuery = useQuery({
    queryKey: ['admin-att-report-subjects', { ...sharedFilterParams, reportPage }],
    queryFn: () =>
      attendanceApi.getSubjectsReport({
        ...sharedFilterParams,
        page: reportPage,
        limit: 12
      }),
    enabled: activeTab === 'reports' && reportType === 'subjects'
  });

  const facultyReportQuery = useQuery({
    queryKey: ['admin-att-report-faculty', { ...sharedFilterParams, reportPage }],
    queryFn: () =>
      attendanceApi.getFacultyReport({
        ...sharedFilterParams,
        page: reportPage,
        limit: 12
      }),
    enabled: activeTab === 'reports' && reportType === 'faculty'
  });

  const correctForm = useForm({
    resolver: zodResolver(correctSchema),
    defaultValues: { status: 'PRESENT', remarks: '', reason: '' }
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-attendance-overview'] });
    queryClient.invalidateQueries({ queryKey: ['admin-attendance-sessions'] });
    queryClient.invalidateQueries({ queryKey: ['admin-session-roster'] });
    queryClient.invalidateQueries({ queryKey: ['admin-attendance-history'] });
    queryClient.invalidateQueries({ queryKey: ['admin-att-report-students'] });
    queryClient.invalidateQueries({ queryKey: ['admin-att-report-subjects'] });
    queryClient.invalidateQueries({ queryKey: ['admin-att-report-faculty'] });
    queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
  };

  const sessionStatusMutation = useMutation({
    mutationFn: ({ id, status, reason }) => attendanceApi.updateSessionStatus(id, { status, reason }),
    onSuccess: (res) => {
      invalidateAll();
      setStatusModalTarget(null);
      setStatusReason('');
      showToast(res?.message || 'Session status updated', 'success');
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Failed to update session status'), 'error')
  });

  const correctMutation = useMutation({
    mutationFn: ({ id, payload }) => attendanceApi.correctRecord(id, payload),
    onSuccess: () => {
      invalidateAll();
      setCorrectTarget(null);
      showToast('Attendance overridden and logged in AuditLog', 'success');
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Correction failed'), 'error')
  });

  const overview = overviewQuery.data?.data || {};
  const sessions = sessionsQuery.data?.data?.sessions || [];
  const sessPagination = sessionsQuery.data?.meta?.pagination || { page: 1, totalPages: 1, totalRecords: 0 };
  const historyRecords = historyQuery.data?.data?.records || [];
  const histPagination = historyQuery.data?.meta?.pagination || { page: 1, totalPages: 1, totalRecords: 0 };

  const filterBar = (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-2.5 shadow-sm">
      <select
        value={filterDept}
        onChange={(e) => {
          setFilterDept(e.target.value);
          setFilterCourse('');
          setFilterSemester('');
          setFilterSubject('');
        }}
        className="rounded-lg border border-slate-300 bg-white py-1.5 px-2.5 text-xs"
      >
        <option value="">All Departments</option>
        {departments.map((d) => (
          <option key={d._id} value={d._id}>
            {d.code} - {d.name}
          </option>
        ))}
      </select>
      <select
        value={filterCourse}
        onChange={(e) => {
          setFilterCourse(e.target.value);
          setFilterSemester('');
          setFilterSubject('');
        }}
        className="rounded-lg border border-slate-300 bg-white py-1.5 px-2.5 text-xs"
      >
        <option value="">All Courses</option>
        {courses
          .filter((c) => !filterDept || String(c.department?._id || c.department) === filterDept)
          .map((c) => (
            <option key={c._id} value={c._id}>
              {c.code} - {c.name}
            </option>
          ))}
      </select>
      <select
        value={filterSemester}
        onChange={(e) => {
          setFilterSemester(e.target.value);
          setFilterSubject('');
        }}
        className="rounded-lg border border-slate-300 bg-white py-1.5 px-2.5 text-xs"
      >
        <option value="">All Semesters</option>
        {semesters
          .filter((s) => !filterCourse || String(s.course?._id || s.course) === filterCourse)
          .map((s) => (
            <option key={s._id} value={s._id}>
              Sem {s.semesterNumber} ({s.academicYear})
            </option>
          ))}
      </select>
      <select
        value={filterSubject}
        onChange={(e) => setFilterSubject(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white py-1.5 px-2.5 text-xs"
      >
        <option value="">All Subjects</option>
        {subjects
          .filter(
            (sub) =>
              (!filterCourse || String(sub.course?._id || sub.course) === filterCourse) &&
              (!filterSemester || String(sub.semester?._id || sub.semester) === filterSemester)
          )
          .map((sub) => (
            <option key={sub._id} value={sub._id}>
              {sub.code} - {sub.name}
            </option>
          ))}
      </select>
      <select
        value={filterFaculty}
        onChange={(e) => setFilterFaculty(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white py-1.5 px-2.5 text-xs"
      >
        <option value="">All Faculty</option>
        {facultyList.map((f) => (
          <option key={f._id} value={f._id}>
            {f.employeeId} - {f.firstName} {f.lastName}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={filterStartDate}
        onChange={(e) => setFilterStartDate(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white py-1.5 px-2 text-xs"
      />
      <input
        type="date"
        value={filterEndDate}
        onChange={(e) => setFilterEndDate(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white py-1.5 px-2 text-xs"
      />
      {(filterDept ||
        filterCourse ||
        filterSemester ||
        filterSubject ||
        filterFaculty ||
        filterStartDate ||
        filterEndDate) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setFilterDept('');
            setFilterCourse('');
            setFilterSemester('');
            setFilterSubject('');
            setFilterFaculty('');
            setFilterStartDate('');
            setFilterEndDate('');
          }}
        >
          Clear Filters
        </Button>
      )}
    </div>
  );

  const sessionColumns = [
    {
      key: 'sessionDate',
      label: 'Date & Session',
      render: (r) => (
        <div>
          <p className="font-semibold text-slate-900">
            {r.sessionDate} · #{r.sessionNumber}
          </p>
          <p className="text-xs text-slate-500">{r.topic || 'Regular Session'}</p>
        </div>
      )
    },
    {
      key: 'subject',
      label: 'Subject & Course',
      render: (r) => (
        <div>
          <p className="font-medium text-slate-900">
            <span className="font-mono text-xs text-brand-700 mr-1.5">{r.subject?.code}</span>
            {r.subject?.name}
          </p>
          <p className="text-xs text-slate-500">
            {r.course?.code} · Sem {r.semester?.semesterNumber} · Sec {r.section}
          </p>
        </div>
      )
    },
    {
      key: 'faculty',
      label: 'Faculty',
      render: (r) => (
        <div>
          <p className="text-sm font-medium text-slate-800">
            {r.faculty?.firstName} {r.faculty?.lastName}
          </p>
          <p className="text-xs font-mono text-slate-500">{r.faculty?.employeeId}</p>
        </div>
      )
    },
    {
      key: 'counts',
      label: 'Attendance',
      render: (r) => (
        <div className="text-xs">
          <p className="font-semibold text-slate-800">
            {r.markedCount ?? 0} / {r.enrolledCount ?? 0} Marked
          </p>
          <p className="text-slate-500">
            P:{r.presentCount ?? 0} A:{r.absentCount ?? 0} L:{r.lateCount ?? 0}
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
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex items-center space-x-1">
          <Button size="sm" variant="outline" onClick={() => setViewRosterSessionId(r._id)}>
            Roster
          </Button>
          {r.status !== 'CANCELLED' && (
            <button
              type="button"
              onClick={() => {
                setStatusModalTarget(r);
                setNextSessionStatus(r.status === 'OPEN' ? 'FINALIZED' : 'OPEN');
                setStatusReason('');
              }}
              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
              title="Manage session status"
            >
              {r.status === 'OPEN' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>
          )}
        </div>
      )
    }
  ];

  const historyColumns = [
    {
      key: 'date',
      label: 'Date & Session',
      render: (r) => (
        <div>
          <p className="font-semibold text-slate-900">{r.session?.sessionDate || formatDate(r.date)}</p>
          <p className="text-xs text-slate-500">
            #{r.session?.sessionNumber ?? 1} · {r.session?.status || '—'}
          </p>
        </div>
      )
    },
    {
      key: 'student',
      label: 'Student',
      render: (r) => (
        <div>
          <p className="font-semibold text-slate-900">
            {r.student?.firstName} {r.student?.lastName}
          </p>
          <p className="text-xs font-mono text-slate-500">{r.student?.rollNumber}</p>
        </div>
      )
    },
    {
      key: 'subject',
      label: 'Subject & Faculty',
      render: (r) => (
        <div>
          <p className="font-medium text-slate-900">
            {r.subject?.code} - {r.subject?.name}
          </p>
          <p className="text-xs text-slate-500">
            Marked by: {r.markedBy?.firstName} {r.markedBy?.lastName}
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
      key: 'actions',
      label: 'Override',
      render: (r) => (
        <button
          type="button"
          onClick={() => {
            setCorrectTarget(r);
            correctForm.reset({
              status: r.status === 'EXCUSED' ? 'PRESENT' : r.status,
              remarks: r.remarks || '',
              reason: ''
            });
          }}
          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
          title="Correct attendance record"
        >
          <Edit3 className="w-4 h-4" />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institutional Attendance Monitoring"
        description="Monitor live class sessions, attendance shortages, historical records, and analytical reports."
        breadcrumbs={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Attendance' }]}
      />

      {filterBar}

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'overview', label: 'Overview & Trends', icon: BarChart3 },
          { id: 'sessions', label: 'Attendance Sessions', icon: ClipboardList },
          { id: 'history', label: 'Records & Overrides', icon: History },
          { id: 'reports', label: 'Analytical Reports', icon: FileSpreadsheet }
        ]}
      />

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {overviewQuery.isLoading ? (
            <LoadingSkeleton variant="card" count={4} />
          ) : overviewQuery.error ? (
            <ErrorState
              title="Unable to load attendance overview"
              message={extractApiErrorMessage(overviewQuery.error)}
              onRetry={overviewQuery.refetch}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard
                  title="Total Sessions"
                  value={overview.sessions?.totalSessions ?? 0}
                  icon={CalendarCheck}
                  color="indigo"
                  subtitle={`${overview.sessions?.finalizedSessions ?? 0} finalized · ${overview.sessions?.openSessions ?? 0} open · ${overview.sessions?.cancelledSessions ?? 0} cancelled`}
                />
                <StatCard
                  title="Overall Attendance"
                  value={
                    overview.overall?.percentage !== null && overview.overall?.percentage !== undefined
                      ? `${overview.overall.percentage}%`
                      : 'No Data'
                  }
                  icon={CheckCircle2}
                  color={overview.overall?.isBelowThreshold ? 'rose' : 'emerald'}
                  subtitle={`Threshold: ${overview.policy?.threshold ?? 75}% (Late = Attended)`}
                />
                <StatCard
                  title="Finalized Records"
                  value={overview.overall?.totalSessions ?? 0}
                  icon={Users}
                  color="sky"
                  subtitle={`P: ${overview.overall?.presentCount ?? 0} · A: ${overview.overall?.absentCount ?? 0} · L: ${overview.overall?.lateCount ?? 0}`}
                />
                <StatCard
                  title="Below Threshold"
                  value={overview.studentsBelowThresholdCount ?? 0}
                  icon={AlertTriangle}
                  color="amber"
                  subtitle={`${overview.lowAttendanceSubjectsCount ?? 0} low-attendance subject(s)`}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard
                  title="Daily Attendance Trend"
                  subtitle="Computed strictly from finalized sessions"
                >
                  {(overview.dateTrend || []).length === 0 ? (
                    <div className="h-56 flex items-center justify-center text-sm text-slate-500">
                      No finalized attendance sessions in selected filters yet.
                    </div>
                  ) : (
                    <div className="h-60 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={overview.dateTrend}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 11 }} />
                          <YAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 11 }} />
                          <Tooltip />
                          <Area type="monotone" dataKey="rate" stroke="#10B981" fill="#10B98122" strokeWidth={2.5} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </ChartCard>

                <ChartCard
                  title="Active Student Enrollment by Department"
                  subtitle="Live department distribution"
                >
                  {(overview.departmentStudentDistribution || []).length === 0 ? (
                    <div className="h-56 flex items-center justify-center text-sm text-slate-500">
                      No department student data available.
                    </div>
                  ) : (
                    <div className="h-60 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={overview.departmentStudentDistribution}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="dept" tick={{ fill: '#64748B', fontSize: 11 }} />
                          <YAxis tick={{ fill: '#64748B', fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </ChartCard>
              </div>
            </>
          )}
        </div>
      )}

      {/* SESSIONS */}
      {activeTab === 'sessions' && (
        <DataTable
          columns={sessionColumns}
          data={sessions}
          isLoading={sessionsQuery.isLoading}
          error={sessionsQuery.error ? extractApiErrorMessage(sessionsQuery.error) : null}
          onRetry={sessionsQuery.refetch}
          serverSide
          searchValue={sessSearch}
          onSearchChange={(val) => {
            setSessSearch(val);
            setSessPage(1);
          }}
          searchPlaceholder="Search subject, course, faculty, topic..."
          currentPage={sessPagination.page}
          totalPages={sessPagination.totalPages}
          totalRecords={sessPagination.totalRecords}
          pageSize={10}
          onPageChange={setSessPage}
          toolbarExtras={
            <select
              value={sessStatus}
              onChange={(e) => {
                setSessStatus(e.target.value);
                setSessPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs"
            >
              <option value="">All Statuses</option>
              {SESSION_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          }
          emptyTitle="No attendance sessions recorded"
          emptyDescription="Attendance sessions created by faculty will appear here."
        />
      )}

      {/* HISTORY & OVERRIDES */}
      {activeTab === 'history' && (
        <DataTable
          columns={historyColumns}
          data={historyRecords}
          isLoading={historyQuery.isLoading}
          error={historyQuery.error ? extractApiErrorMessage(historyQuery.error) : null}
          onRetry={historyQuery.refetch}
          serverSide
          searchValue={histSearch}
          onSearchChange={(val) => {
            setHistSearch(val);
            setHistPage(1);
          }}
          searchPlaceholder="Search student roll no, name, subject..."
          currentPage={histPagination.page}
          totalPages={histPagination.totalPages}
          totalRecords={histPagination.totalRecords}
          pageSize={12}
          onPageChange={setHistPage}
          toolbarExtras={
            <select
              value={histStatus}
              onChange={(e) => {
                setHistStatus(e.target.value);
                setHistPage(1);
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
          }
          emptyTitle="No attendance records found"
          emptyDescription="Once attendance batches are submitted, every student record is traceable here."
        />
      )}

      {/* ANALYTICAL REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant={reportType === 'students' ? 'primary' : 'outline'}
                onClick={() => {
                  setReportType('students');
                  setReportPage(1);
                }}
              >
                Student-wise Report
              </Button>
              <Button
                size="sm"
                variant={reportType === 'subjects' ? 'primary' : 'outline'}
                onClick={() => {
                  setReportType('subjects');
                  setReportPage(1);
                }}
              >
                Subject-wise Report
              </Button>
              <Button
                size="sm"
                variant={reportType === 'faculty' ? 'primary' : 'outline'}
                onClick={() => {
                  setReportType('faculty');
                  setReportPage(1);
                }}
              >
                Faculty-wise Report
              </Button>
            </div>
            {reportType === 'students' && (
              <label className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={belowThresholdOnly}
                  onChange={(e) => {
                    setBelowThresholdOnly(e.target.checked);
                    setReportPage(1);
                  }}
                  className="rounded border-slate-300 text-brand-600"
                />
                <span>Show Below Threshold Only (&lt; {overview.policy?.threshold ?? 75}%)</span>
              </label>
            )}
          </div>

          {reportType === 'students' && (
            <DataTable
              columns={[
                {
                  key: 'student',
                  label: 'Student',
                  render: (r) => (
                    <div>
                      <p className="font-semibold text-slate-900">
                        {r.student?.firstName} {r.student?.lastName}
                      </p>
                      <p className="text-xs font-mono text-slate-500">
                        {r.student?.rollNumber} · {r.student?.department?.code}
                      </p>
                    </div>
                  )
                },
                {
                  key: 'counts',
                  label: 'Sessions (P / A / L)',
                  render: (r) => (
                    <span className="text-xs font-medium text-slate-700">
                      {r.totalSessions} total · P:{r.presentCount} A:{r.absentCount} L:{r.lateCount}
                    </span>
                  )
                },
                {
                  key: 'percentage',
                  label: 'Attendance %',
                  render: (r) => (
                    <Badge variant={r.isBelowThreshold ? 'danger' : 'success'}>
                      {r.percentage !== null ? `${r.percentage}%` : 'No Data'}
                    </Badge>
                  )
                }
              ]}
              data={studentReportQuery.data?.data?.students || []}
              isLoading={studentReportQuery.isLoading}
              searchable={false}
              serverSide
              currentPage={studentReportQuery.data?.meta?.pagination?.page || 1}
              totalPages={studentReportQuery.data?.meta?.pagination?.totalPages || 1}
              totalRecords={studentReportQuery.data?.meta?.pagination?.totalRecords || 0}
              pageSize={12}
              onPageChange={setReportPage}
              emptyTitle="No student report entries"
              emptyDescription="No finalized attendance records match the current filters."
            />
          )}

          {reportType === 'subjects' && (
            <DataTable
              columns={[
                {
                  key: 'subject',
                  label: 'Subject',
                  render: (r) => (
                    <div>
                      <p className="font-semibold text-slate-900">
                        {r.subject?.code} - {r.subject?.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {r.course?.code} · {r.academicYear}
                      </p>
                    </div>
                  )
                },
                {
                  key: 'conductedSessions',
                  label: 'Finalized Sessions',
                  render: (r) => <span className="font-semibold">{r.conductedSessions}</span>
                },
                {
                  key: 'percentage',
                  label: 'Aggregate Rate',
                  render: (r) => (
                    <Badge variant={r.isBelowThreshold ? 'danger' : 'success'}>
                      {r.percentage !== null ? `${r.percentage}%` : 'No Data'}
                    </Badge>
                  )
                }
              ]}
              data={subjectReportQuery.data?.data?.subjects || []}
              isLoading={subjectReportQuery.isLoading}
              searchable={false}
              serverSide
              currentPage={subjectReportQuery.data?.meta?.pagination?.page || 1}
              totalPages={subjectReportQuery.data?.meta?.pagination?.totalPages || 1}
              totalRecords={subjectReportQuery.data?.meta?.pagination?.totalRecords || 0}
              pageSize={12}
              onPageChange={setReportPage}
              emptyTitle="No subject report entries"
              emptyDescription="Finalize sessions to generate subject-level attendance reports."
            />
          )}

          {reportType === 'faculty' && (
            <DataTable
              columns={[
                {
                  key: 'faculty',
                  label: 'Faculty',
                  render: (r) => (
                    <div>
                      <p className="font-semibold text-slate-900">
                        {r.faculty?.firstName} {r.faculty?.lastName}
                      </p>
                      <p className="text-xs font-mono text-slate-500">{r.faculty?.employeeId}</p>
                    </div>
                  )
                },
                {
                  key: 'sessions',
                  label: 'Sessions (Fin / Open / Canc)',
                  render: (r) => (
                    <span className="text-xs font-medium text-slate-700">
                      {r.finalizedSessions} Fin · {r.openSessions} Open · {r.cancelledSessions} Canc
                    </span>
                  )
                },
                {
                  key: 'percentage',
                  label: 'Class Average',
                  render: (r) => (
                    <Badge variant={r.isBelowThreshold ? 'warning' : 'success'}>
                      {r.percentage !== null ? `${r.percentage}%` : 'No Data'}
                    </Badge>
                  )
                }
              ]}
              data={facultyReportQuery.data?.data?.faculty || []}
              isLoading={facultyReportQuery.isLoading}
              searchable={false}
              serverSide
              currentPage={facultyReportQuery.data?.meta?.pagination?.page || 1}
              totalPages={facultyReportQuery.data?.meta?.pagination?.totalPages || 1}
              totalRecords={facultyReportQuery.data?.meta?.pagination?.totalRecords || 0}
              pageSize={12}
              onPageChange={setReportPage}
              emptyTitle="No faculty attendance statistics"
              emptyDescription="No sessions created yet."
            />
          )}
        </div>
      )}

      {/* ROSTER MODAL */}
      <Modal
        isOpen={!!viewRosterSessionId}
        onClose={() => setViewRosterSessionId('')}
        title="Session Attendance Roster"
        maxWidth="max-w-2xl"
      >
        {sessionRosterQuery.isLoading ? (
          <LoadingSkeleton variant="table" count={4} />
        ) : (
          <div className="space-y-3 text-sm">
            {(sessionRosterQuery.data?.data?.roster || []).length === 0 ? (
              <p className="text-slate-500 py-4 text-center">No enrolled students in this session.</p>
            ) : (
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {(sessionRosterQuery.data?.data?.roster || []).map((stu) => (
                  <div key={stu.studentId} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{stu.fullName}</p>
                      <p className="text-xs font-mono text-slate-500">{stu.rollNumber}</p>
                    </div>
                    <Badge variant={stu.status ? getStatusBadgeVariant(stu.status) : 'neutral'}>
                      {stu.status || 'UNMARKED'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* SESSION STATUS MODAL */}
      <Modal
        isOpen={!!statusModalTarget}
        onClose={() => setStatusModalTarget(null)}
        title="Update Session Status"
        maxWidth="max-w-md"
      >
        {statusModalTarget && (
          <div className="space-y-4">
            <Select
              label="Target Status"
              value={nextSessionStatus}
              onChange={(e) => setNextSessionStatus(e.target.value)}
              options={SESSION_STATUS_OPTIONS}
            />
            {(nextSessionStatus === 'OPEN' || statusModalTarget.status === 'FINALIZED') && (
              <Textarea
                label="Audit Reason"
                required
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Required when reopening or cancelling finalized sessions..."
              />
            )}
            <div className="flex justify-end space-x-2.5">
              <Button variant="outline" onClick={() => setStatusModalTarget(null)}>
                Cancel
              </Button>
              <Button
                isLoading={sessionStatusMutation.isPending}
                onClick={() =>
                  sessionStatusMutation.mutate({
                    id: statusModalTarget._id,
                    status: nextSessionStatus,
                    reason: statusReason
                  })
                }
              >
                Update Status
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ADMIN OVERRIDE CORRECTION MODAL */}
      <Modal
        isOpen={!!correctTarget}
        onClose={() => setCorrectTarget(null)}
        title="Admin Attendance Correction"
        subtitle={
          correctTarget
            ? `${correctTarget.student?.firstName} ${correctTarget.student?.lastName} (${correctTarget.student?.rollNumber})`
            : ''
        }
        maxWidth="max-w-md"
      >
        <form
          onSubmit={correctForm.handleSubmit((vals) =>
            correctMutation.mutate({ id: correctTarget._id, payload: vals })
          )}
          className="space-y-4"
        >
          <Select
            label="Status"
            required
            value={correctForm.watch('status')}
            onChange={(e) => correctForm.setValue('status', e.target.value)}
            options={ATTENDANCE_STATUS_OPTIONS}
          />
          <Input label="Remarks" {...correctForm.register('remarks')} />
          <Textarea
            label="Audit Reason"
            required
            placeholder="Mandatory reason for administrative attendance correction..."
            {...correctForm.register('reason')}
            error={correctForm.formState.errors.reason?.message}
          />
          <div className="flex justify-end space-x-2.5 pt-2">
            <Button type="button" variant="outline" onClick={() => setCorrectTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={correctMutation.isPending}>
              Save Override
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminAttendancePage;
