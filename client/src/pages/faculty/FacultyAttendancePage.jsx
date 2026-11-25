import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import PageHeader from '../../components/layout/PageHeader';
import Tabs from '../../components/common/Tabs';
import StatCard from '../../components/data/StatCard';
import DataTable from '../../components/data/DataTable';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Textarea from '../../components/common/Textarea';
import EmptyState from '../../components/data/EmptyState';
import ErrorState from '../../components/data/ErrorState';
import LoadingSkeleton from '../../components/data/LoadingSkeleton';
import { useToast } from '../../context/ToastContext';
import { attendanceApi } from '../../services/managementService';
import {
  extractApiErrorMessage,
  formatDate,
  ATTENDANCE_STATUS_OPTIONS,
  SESSION_STATUS_OPTIONS,
  getStatusBadgeVariant
} from '../../utils/formSchemas';
import {
  CalendarCheck,
  ClipboardList,
  History,
  BarChart3,
  Plus,
  Check,
  X,
  Clock,
  CheckCheck,
  RotateCcw,
  Lock,
  Unlock,
  Ban,
  Edit3,
  AlertTriangle
} from 'lucide-react';

const createSessionFormSchema = z.object({
  facultyAssignment: z.string().min(1, 'Subject assignment is required'),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD date format'),
  sessionNumber: z.coerce.number().int().min(1).max(20),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  topic: z.string().max(200).optional()
});

const correctSchema = z.object({
  status: z.enum(['PRESENT', 'ABSENT', 'LATE']),
  remarks: z.string().max(300).optional(),
  reason: z.string().trim().min(3, 'Correction reason is required (min 3 chars)').max(300)
});

const getLocalTodayYmd = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
};

export const FacultyAttendancePage = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('mark');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
  const [rosterMarks, setRosterMarks] = useState({});
  const [rosterRemarks, setRosterRemarks] = useState({});
  const [rosterSearch, setRosterSearch] = useState('');
  const [finalizeOnSubmit, setFinalizeOnSubmit] = useState(true);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Sessions table state
  const [sessPage, setSessPage] = useState(1);
  const [sessSubject, setSessSubject] = useState('');
  const [sessStatus, setSessStatus] = useState('');
  const [sessStartDate, setSessStartDate] = useState('');
  const [sessEndDate, setSessEndDate] = useState('');
  const [statusModalTarget, setStatusModalTarget] = useState(null);
  const [targetSessionStatus, setTargetSessionStatus] = useState('FINALIZED');
  const [sessionStatusReason, setSessionStatusReason] = useState('');
  const [cancelConfirmTarget, setCancelConfirmTarget] = useState(null);

  // History table state
  const [histPage, setHistPage] = useState(1);
  const [histSearch, setHistSearch] = useState('');
  const [histSubject, setHistSubject] = useState('');
  const [histStatus, setHistStatus] = useState('');
  const [histStartDate, setHistStartDate] = useState('');
  const [histEndDate, setHistEndDate] = useState('');
  const [correctTarget, setCorrectTarget] = useState(null);

  // Queries
  const subjectsQuery = useQuery({
    queryKey: ['faculty-attendance-subjects'],
    queryFn: attendanceApi.getMySubjects
  });

  const authorizedSubjects = subjectsQuery.data?.data?.subjects || [];

  const assignmentSessionsQuery = useQuery({
    queryKey: ['faculty-assignment-sessions', selectedAssignmentId],
    queryFn: () => attendanceApi.getMySessions({ facultyAssignment: selectedAssignmentId, limit: 50 }),
    enabled: Boolean(selectedAssignmentId)
  });

  const sessionDetailQuery = useQuery({
    queryKey: ['attendance-session-detail', selectedSessionId],
    queryFn: () => attendanceApi.getSessionById(selectedSessionId),
    enabled: Boolean(selectedSessionId)
  });

  const mySessionsQuery = useQuery({
    queryKey: ['faculty-sessions', { sessPage, sessSubject, sessStatus, sessStartDate, sessEndDate }],
    queryFn: () =>
      attendanceApi.getMySessions({
        page: sessPage,
        limit: 10,
        subject: sessSubject,
        status: sessStatus,
        startDate: sessStartDate,
        endDate: sessEndDate
      }),
    enabled: activeTab === 'sessions'
  });

  const myHistoryQuery = useQuery({
    queryKey: ['faculty-history', { histPage, histSearch, histSubject, histStatus, histStartDate, histEndDate }],
    queryFn: () =>
      attendanceApi.getMyHistory({
        page: histPage,
        limit: 12,
        search: histSearch,
        subject: histSubject,
        status: histStatus,
        startDate: histStartDate,
        endDate: histEndDate
      }),
    enabled: activeTab === 'history'
  });

  const subjectReportQuery = useQuery({
    queryKey: ['faculty-subject-reports'],
    queryFn: () => attendanceApi.getSubjectsReport({ limit: 50 }),
    enabled: activeTab === 'reports'
  });

  const studentReportQuery = useQuery({
    queryKey: ['faculty-student-shortages'],
    queryFn: () => attendanceApi.getStudentsReport({ belowThresholdOnly: 'true', limit: 50 }),
    enabled: activeTab === 'reports'
  });

  // Auto-select first authorized subject when loaded
  useEffect(() => {
    if (!selectedAssignmentId && authorizedSubjects.length > 0) {
      setSelectedAssignmentId(authorizedSubjects[0]._id);
    }
  }, [authorizedSubjects, selectedAssignmentId]);

  const assignmentSessions = assignmentSessionsQuery.data?.data?.sessions || [];
  const sessionData = sessionDetailQuery.data?.data || null;
  const activeSession = sessionData?.session || null;
  const roster = sessionData?.roster || [];

  // Initialize roster state cleanly whenever a new session loads
  useEffect(() => {
    if (!activeSession?._id) return;
    const nextMarks = {};
    const nextRemarks = {};
    for (const item of roster) {
      if (item.status) nextMarks[item.studentId] = item.status;
      if (item.remarks) nextRemarks[item.studentId] = item.remarks;
    }
    setRosterMarks(nextMarks);
    setRosterRemarks(nextRemarks);
  }, [activeSession?._id, sessionData?.markedCount]);

  // Forms
  const createSessionForm = useForm({
    resolver: zodResolver(createSessionFormSchema),
    defaultValues: {
      facultyAssignment: '',
      sessionDate: getLocalTodayYmd(),
      sessionNumber: 1,
      startTime: '',
      endTime: '',
      topic: ''
    }
  });

  const correctForm = useForm({
    resolver: zodResolver(correctSchema),
    defaultValues: { status: 'PRESENT', remarks: '', reason: '' }
  });

  const invalidateAttendanceCaches = () => {
    queryClient.invalidateQueries({ queryKey: ['faculty-assignment-sessions'] });
    queryClient.invalidateQueries({ queryKey: ['attendance-session-detail'] });
    queryClient.invalidateQueries({ queryKey: ['faculty-sessions'] });
    queryClient.invalidateQueries({ queryKey: ['faculty-history'] });
    queryClient.invalidateQueries({ queryKey: ['faculty-subject-reports'] });
    queryClient.invalidateQueries({ queryKey: ['faculty-student-shortages'] });
    queryClient.invalidateQueries({ queryKey: ['faculty-dashboard-stats'] });
  };

  const createSessionMutation = useMutation({
    mutationFn: attendanceApi.createSession,
    onSuccess: (res) => {
      const created = res?.data?.session;
      invalidateAttendanceCaches();
      showToast('Attendance session created', 'success');
      setIsNewSessionOpen(false);
      if (created?._id) setSelectedSessionId(created._id);
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Failed to create session'), 'error')
  });

  const bulkSubmitMutation = useMutation({
    mutationFn: attendanceApi.submitBulk,
    onSuccess: (res) => {
      const d = res?.data || {};
      invalidateAttendanceCaches();
      setIsReviewOpen(false);
      showToast(
        `Saved ${d.submittedCount} record(s): ${d.presentCount} Present, ${d.absentCount} Absent, ${d.lateCount} Late`,
        'success'
      );
    },
    onError: (err) => {
      setIsReviewOpen(false);
      showToast(extractApiErrorMessage(err, 'Failed to submit attendance batch'), 'error');
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, reason }) => attendanceApi.updateSessionStatus(id, { status, reason }),
    onSuccess: (res) => {
      invalidateAttendanceCaches();
      setStatusModalTarget(null);
      setCancelConfirmTarget(null);
      setSessionStatusReason('');
      showToast(res?.message || 'Session status updated', 'success');
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Failed to update session status'), 'error')
  });

  const correctMutation = useMutation({
    mutationFn: ({ id, payload }) => attendanceApi.correctRecord(id, payload),
    onSuccess: () => {
      invalidateAttendanceCaches();
      setCorrectTarget(null);
      showToast('Attendance record corrected and audit logged', 'success');
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Failed to correct attendance'), 'error')
  });

  // Live counters derived directly from state
  const markingStats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    for (const s of roster) {
      const st = rosterMarks[s.studentId];
      if (st === 'PRESENT') present += 1;
      else if (st === 'ABSENT') absent += 1;
      else if (st === 'LATE') late += 1;
    }
    const unmarked = roster.length - (present + absent + late);
    return { total: roster.length, present, absent, late, unmarked };
  }, [roster, rosterMarks]);

  const filteredRoster = useMemo(() => {
    const q = rosterSearch.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(
      (s) =>
        (s.fullName || '').toLowerCase().includes(q) ||
        (s.rollNumber || '').toLowerCase().includes(q) ||
        (s.enrollmentNumber || '').toLowerCase().includes(q)
    );
  }, [roster, rosterSearch]);

  const openNewSessionModal = () => {
    createSessionForm.reset({
      facultyAssignment: selectedAssignmentId || (authorizedSubjects[0]?._id || ''),
      sessionDate: getLocalTodayYmd(),
      sessionNumber: 1,
      startTime: '',
      endTime: '',
      topic: ''
    });
    setIsNewSessionOpen(true);
  };

  const handleMarkAllPresent = () => {
    const next = {};
    roster.forEach((s) => {
      next[s.studentId] = 'PRESENT';
    });
    setRosterMarks(next);
  };

  const handleClearSelections = () => {
    setRosterMarks({});
    setRosterRemarks({});
  };

  const handleConfirmSubmitBulk = () => {
    const records = roster
      .filter((s) => rosterMarks[s.studentId])
      .map((s) => ({
        studentId: s.studentId,
        status: rosterMarks[s.studentId],
        remarks: rosterRemarks[s.studentId] || ''
      }));

    if (records.length === 0) {
      showToast('Select status for at least one student before submitting', 'warning');
      return;
    }
    bulkSubmitMutation.mutate({
      sessionId: activeSession._id,
      finalize: finalizeOnSubmit,
      records
    });
  };

  const uniqueSubjectOptions = useMemo(() => {
    const seen = new Map();
    for (const a of authorizedSubjects) {
      if (a.subject?._id && !seen.has(a.subject._id)) {
        seen.set(a.subject._id, `${a.subject.code} - ${a.subject.name}`);
      }
    }
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  }, [authorizedSubjects]);

  const sessionColumns = [
    {
      key: 'sessionDate',
      label: 'Date & Session',
      render: (r) => (
        <div>
          <p className="font-semibold text-slate-900">
            {r.sessionDate} · Session #{r.sessionNumber}
          </p>
          <p className="text-xs text-slate-500">
            {r.startTime && r.endTime ? `${r.startTime}–${r.endTime}` : r.topic || 'Regular Class'}
          </p>
        </div>
      )
    },
    {
      key: 'subject',
      label: 'Subject & Class',
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
      key: 'counts',
      label: 'Marked Summary',
      render: (r) => (
        <div className="text-xs space-y-0.5">
          <p className="font-semibold text-slate-800">
            {r.markedCount ?? 0} / {r.enrolledCount ?? 0} Students
          </p>
          <p className="text-slate-500">
            P: {r.presentCount ?? 0} · A: {r.absentCount ?? 0} · L: {r.lateCount ?? 0}
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
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedAssignmentId(r.facultyAssignment?._id || r.facultyAssignment || '');
              setSelectedSessionId(r._id);
              setActiveTab('mark');
            }}
          >
            Open Sheet
          </Button>
          {r.status === 'OPEN' && (
            <>
              <button
                type="button"
                onClick={() => statusMutation.mutate({ id: r._id, status: 'FINALIZED', reason: '' })}
                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                title="Finalize session"
              >
                <Lock className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCancelConfirmTarget(r)}
                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                title="Cancel session"
              >
                <Ban className="w-4 h-4" />
              </button>
            </>
          )}
          {r.status === 'FINALIZED' && (
            <button
              type="button"
              onClick={() => {
                setStatusModalTarget(r);
                setTargetSessionStatus('OPEN');
                setSessionStatusReason('');
              }}
              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition"
              title="Reopen finalized session"
            >
              <Unlock className="w-4 h-4" />
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
          <p className="font-semibold text-slate-900">
            {r.session?.sessionDate || formatDate(r.date)}
          </p>
          <p className="text-xs text-slate-500">
            Session #{r.session?.sessionNumber ?? 1} · {r.session?.status || 'RECORDED'}
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
            {r.student ? `${r.student.firstName} ${r.student.lastName}` : '—'}
          </p>
          <p className="text-xs font-mono text-slate-500">
            {r.student?.rollNumber} · {r.student?.enrollmentNumber}
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
            {r.course?.code} · Sem {r.semester?.semesterNumber} · Sec {r.section || 'A'}
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
      label: 'Remarks / Audit',
      render: (r) => (
        <div className="text-xs max-w-[200px]">
          <p className="text-slate-700 truncate">{r.remarks || '—'}</p>
          {r.lastCorrectionReason && (
            <p className="text-amber-700 truncate">Reason: {r.lastCorrectionReason}</p>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
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
          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
          title="Correct attendance"
        >
          <Edit3 className="w-4 h-4" />
        </button>
      )
    }
  ];

  const mySessions = mySessionsQuery.data?.data?.sessions || [];
  const sessPagination = mySessionsQuery.data?.meta?.pagination || { page: 1, totalPages: 1, totalRecords: 0 };
  const myHistory = myHistoryQuery.data?.data?.records || [];
  const histPagination = myHistoryQuery.data?.meta?.pagination || { page: 1, totalPages: 1, totalRecords: 0 };

  const subjectReports = subjectReportQuery.data?.data?.subjects || [];
  const shortageStudents = studentReportQuery.data?.data?.students || [];
  const threshold = studentReportQuery.data?.data?.threshold ?? 75;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty Attendance Workspace"
        description="Manage class sessions, submit daily classroom roll-call, and review subject attendance trends."
        breadcrumbs={[{ label: 'Faculty', path: '/faculty/dashboard' }, { label: 'Attendance' }]}
        actions={
          <Button icon={Plus} onClick={openNewSessionModal} disabled={authorizedSubjects.length === 0}>
            New Attendance Session
          </Button>
        }
      />

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'mark', label: 'Mark Attendance', icon: CalendarCheck },
          { id: 'sessions', label: 'Sessions', icon: ClipboardList },
          { id: 'history', label: 'History & Corrections', icon: History },
          { id: 'reports', label: 'Subject Summaries', icon: BarChart3 }
        ]}
      />

      {/* TAB 1: MARK ATTENDANCE */}
      {activeTab === 'mark' && (
        <div className="space-y-5">
          {subjectsQuery.isLoading ? (
            <LoadingSkeleton variant="card" count={2} />
          ) : subjectsQuery.error ? (
            <ErrorState
              title="Unable to load authorized subjects"
              message={extractApiErrorMessage(subjectsQuery.error)}
              onRetry={subjectsQuery.refetch}
            />
          ) : authorizedSubjects.length === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              title="No active subject assignments"
              description="You do not have active teaching assignments yet. Ask your Academic Administrator to assign your subjects."
            />
          ) : (
            <>
              {/* Subject & Session Selection Bar */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <Select
                  label="1. Authorized Subject Assignment"
                  placeholder={null}
                  value={selectedAssignmentId}
                  onChange={(e) => {
                    setSelectedAssignmentId(e.target.value);
                    setSelectedSessionId('');
                  }}
                  options={authorizedSubjects.map((a) => ({
                    value: a._id,
                    label: `${a.subject?.code} - ${a.subject?.name} (${a.course?.code} Sem ${a.semester?.semesterNumber} Sec ${a.section} · ${a.enrolledStudentCount} Enrolled)`
                  }))}
                />

                <div className="flex items-end space-x-2">
                  <div className="flex-1">
                    <Select
                      label="2. Class Session"
                      placeholder={
                        assignmentSessionsQuery.isLoading
                          ? 'Loading sessions...'
                          : assignmentSessions.length === 0
                          ? 'No sessions yet — click New'
                          : 'Select an existing session'
                      }
                      value={selectedSessionId}
                      onChange={(e) => setSelectedSessionId(e.target.value)}
                      options={assignmentSessions.map((s) => ({
                        value: s._id,
                        label: `${s.sessionDate} · Session #${s.sessionNumber} (${s.status}) · ${s.markedCount}/${s.enrolledCount} marked`
                      }))}
                    />
                  </div>
                  <Button variant="outline" icon={Plus} onClick={openNewSessionModal}>
                    New
                  </Button>
                </div>
              </div>

              {/* Roll Call Panel */}
              {!selectedSessionId ? (
                <EmptyState
                  icon={ClipboardList}
                  title="Select or create a session"
                  description="Choose an existing session above or click 'New' to initiate a roll-call sheet for enrolled students."
                  actionLabel="Create Attendance Session"
                  onAction={openNewSessionModal}
                />
              ) : sessionDetailQuery.isLoading ? (
                <LoadingSkeleton variant="table" count={5} />
              ) : sessionDetailQuery.error ? (
                <ErrorState
                  title="Failed to load session sheet"
                  message={extractApiErrorMessage(sessionDetailQuery.error)}
                  onRetry={sessionDetailQuery.refetch}
                />
              ) : (
                <div className="space-y-4">
                  {/* Live Roll-call Status & Counters */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="bg-white rounded-xl border border-slate-200 p-3.5">
                      <p className="text-[11px] font-bold uppercase text-slate-500">Eligible Enrolled</p>
                      <p className="text-xl font-extrabold text-slate-900 mt-0.5">{markingStats.total}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3.5">
                      <p className="text-[11px] font-bold uppercase text-emerald-700">Present</p>
                      <p className="text-xl font-extrabold text-emerald-800 mt-0.5">{markingStats.present}</p>
                    </div>
                    <div className="bg-rose-50 rounded-xl border border-rose-200 p-3.5">
                      <p className="text-[11px] font-bold uppercase text-rose-700">Absent</p>
                      <p className="text-xl font-extrabold text-rose-800 mt-0.5">{markingStats.absent}</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl border border-amber-200 p-3.5">
                      <p className="text-[11px] font-bold uppercase text-amber-700">Late</p>
                      <p className="text-xl font-extrabold text-amber-800 mt-0.5">{markingStats.late}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5">
                      <p className="text-[11px] font-bold uppercase text-slate-500">Unmarked</p>
                      <p className="text-xl font-extrabold text-slate-700 mt-0.5">{markingStats.unmarked}</p>
                    </div>
                  </div>

                  {/* Session Banner */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700">
                          {activeSession?.subject?.code}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900">
                          {activeSession?.sessionDate} · Session #{activeSession?.sessionNumber}
                        </h3>
                        <Badge variant={getStatusBadgeVariant(activeSession?.status)}>
                          {activeSession?.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        Course {activeSession?.course?.code} · Sem {activeSession?.semester?.semesterNumber} · Sec{' '}
                        {activeSession?.section}
                        {activeSession?.topic ? ` · Topic: ${activeSession.topic}` : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={rosterSearch}
                        onChange={(e) => setRosterSearch(e.target.value)}
                        placeholder="Search student..."
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                      />
                      {!sessionData?.isSubmitted && activeSession?.status === 'OPEN' && (
                        <>
                          <Button variant="outline" size="sm" icon={CheckCheck} onClick={handleMarkAllPresent}>
                            Mark All Present
                          </Button>
                          <Button variant="ghost" size="sm" icon={RotateCcw} onClick={handleClearSelections}>
                            Clear
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {sessionData?.isSubmitted && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
                      <span>
                        Attendance has already been submitted for this session ({activeSession?.status}). To edit individual
                        student marks, use the <strong>History & Corrections</strong> tab.
                      </span>
                      <Button size="sm" variant="outline" onClick={() => setActiveTab('history')}>
                        Go to Corrections
                      </Button>
                    </div>
                  )}

                  {roster.length === 0 ? (
                    <EmptyState
                      icon={ClipboardList}
                      title="No eligible active students enrolled"
                      description="Enroll active students in this subject, semester, section, and academic year before marking attendance."
                    />
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                                Student & Roll No
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                                Status Selection
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                                Remarks
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredRoster.map((stu) => {
                              const currentStatus = rosterMarks[stu.studentId] || '';
                              const readOnly = sessionData?.isSubmitted || activeSession?.status !== 'OPEN';
                              return (
                                <tr key={stu.studentId} className="hover:bg-slate-50/70">
                                  <td className="px-4 py-3.5">
                                    <p className="text-sm font-semibold text-slate-900">{stu.fullName}</p>
                                    <p className="text-xs font-mono text-slate-500">
                                      {stu.rollNumber} · {stu.enrollmentNumber}
                                    </p>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 space-x-1">
                                      <button
                                        type="button"
                                        disabled={readOnly}
                                        onClick={() =>
                                          setRosterMarks((p) => ({ ...p, [stu.studentId]: 'PRESENT' }))
                                        }
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center transition ${
                                          currentStatus === 'PRESENT'
                                            ? 'bg-emerald-600 text-white shadow-sm'
                                            : 'text-slate-600 hover:text-emerald-700 disabled:opacity-50'
                                        }`}
                                      >
                                        <Check className="w-3.5 h-3.5 mr-1" /> Present
                                      </button>
                                      <button
                                        type="button"
                                        disabled={readOnly}
                                        onClick={() =>
                                          setRosterMarks((p) => ({ ...p, [stu.studentId]: 'ABSENT' }))
                                        }
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center transition ${
                                          currentStatus === 'ABSENT'
                                            ? 'bg-rose-600 text-white shadow-sm'
                                            : 'text-slate-600 hover:text-rose-700 disabled:opacity-50'
                                        }`}
                                      >
                                        <X className="w-3.5 h-3.5 mr-1" /> Absent
                                      </button>
                                      <button
                                        type="button"
                                        disabled={readOnly}
                                        onClick={() =>
                                          setRosterMarks((p) => ({ ...p, [stu.studentId]: 'LATE' }))
                                        }
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center transition ${
                                          currentStatus === 'LATE'
                                            ? 'bg-amber-500 text-white shadow-sm'
                                            : 'text-slate-600 hover:text-amber-700 disabled:opacity-50'
                                        }`}
                                      >
                                        <Clock className="w-3.5 h-3.5 mr-1" /> Late
                                      </button>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <input
                                      type="text"
                                      disabled={readOnly}
                                      value={rosterRemarks[stu.studentId] || ''}
                                      onChange={(e) =>
                                        setRosterRemarks((p) => ({ ...p, [stu.studentId]: e.target.value }))
                                      }
                                      placeholder="Optional note..."
                                      className="w-full max-w-xs rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs disabled:bg-slate-50"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {!sessionData?.isSubmitted && activeSession?.status === 'OPEN' && (
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <label className="inline-flex items-center space-x-2 text-xs text-slate-700 font-medium cursor-pointer">
                            <input
                              type="checkbox"
                              checked={finalizeOnSubmit}
                              onChange={(e) => setFinalizeOnSubmit(e.target.checked)}
                              className="rounded border-slate-300 text-brand-600"
                            />
                            <span>Finalize session immediately upon submission (publishes to student reports)</span>
                          </label>

                          <Button
                            onClick={() => setIsReviewOpen(true)}
                            disabled={markingStats.present + markingStats.absent + markingStats.late === 0}
                          >
                            Review & Submit Attendance
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 2: SESSIONS LIST */}
      {activeTab === 'sessions' && (
        <DataTable
          columns={sessionColumns}
          data={mySessions}
          isLoading={mySessionsQuery.isLoading}
          error={mySessionsQuery.error ? extractApiErrorMessage(mySessionsQuery.error) : null}
          onRetry={mySessionsQuery.refetch}
          serverSide
          searchable={false}
          currentPage={sessPagination.page}
          totalPages={sessPagination.totalPages}
          totalRecords={sessPagination.totalRecords}
          pageSize={10}
          onPageChange={setSessPage}
          toolbarExtras={
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={sessSubject}
                onChange={(e) => {
                  setSessSubject(e.target.value);
                  setSessPage(1);
                }}
                className="rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs"
              >
                <option value="">All My Subjects</option>
                {uniqueSubjectOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
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
              <input
                type="date"
                value={sessStartDate}
                onChange={(e) => {
                  setSessStartDate(e.target.value);
                  setSessPage(1);
                }}
                className="rounded-lg border border-slate-300 bg-white py-1.5 px-2.5 text-xs"
              />
              <input
                type="date"
                value={sessEndDate}
                onChange={(e) => {
                  setSessEndDate(e.target.value);
                  setSessPage(1);
                }}
                className="rounded-lg border border-slate-300 bg-white py-1.5 px-2.5 text-xs"
              />
            </div>
          }
          emptyTitle="No attendance sessions found"
          emptyDescription="Create a session from the 'New Attendance Session' button to begin tracking roll call."
        />
      )}

      {/* TAB 3: HISTORY & CORRECTIONS */}
      {activeTab === 'history' && (
        <DataTable
          columns={historyColumns}
          data={myHistory}
          isLoading={myHistoryQuery.isLoading}
          error={myHistoryQuery.error ? extractApiErrorMessage(myHistoryQuery.error) : null}
          onRetry={myHistoryQuery.refetch}
          serverSide
          searchValue={histSearch}
          onSearchChange={(val) => {
            setHistSearch(val);
            setHistPage(1);
          }}
          searchPlaceholder="Search student name, roll no, enrollment no..."
          currentPage={histPagination.page}
          totalPages={histPagination.totalPages}
          totalRecords={histPagination.totalRecords}
          pageSize={12}
          onPageChange={setHistPage}
          toolbarExtras={
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={histSubject}
                onChange={(e) => {
                  setHistSubject(e.target.value);
                  setHistPage(1);
                }}
                className="rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs"
              >
                <option value="">All My Subjects</option>
                {uniqueSubjectOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
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
              <input
                type="date"
                value={histStartDate}
                onChange={(e) => {
                  setHistStartDate(e.target.value);
                  setHistPage(1);
                }}
                className="rounded-lg border border-slate-300 bg-white py-1.5 px-2.5 text-xs"
              />
              <input
                type="date"
                value={histEndDate}
                onChange={(e) => {
                  setHistEndDate(e.target.value);
                  setHistPage(1);
                }}
                className="rounded-lg border border-slate-300 bg-white py-1.5 px-2.5 text-xs"
              />
            </div>
          }
          emptyTitle="No attendance records yet"
          emptyDescription="Submitted roll-call records will appear here for auditing and authorized corrections."
        />
      )}

      {/* TAB 4: SUBJECT SUMMARIES & SHORTAGES */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Subject-wise Attendance Summary (Finalized Sessions Only)
            </h3>
            {subjectReportQuery.isLoading ? (
              <LoadingSkeleton variant="table" count={3} />
            ) : subjectReports.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="No finalized session statistics yet"
                description="Finalize attendance sessions to compute authoritative subject-wise attendance rates."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjectReports.map((item) => (
                  <div
                    key={`${item.subject?._id}-${item.academicYear}`}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700">
                        {item.subject?.code}
                      </span>
                      <Badge variant={item.isBelowThreshold ? 'danger' : 'success'}>
                        {item.percentage !== null ? `${item.percentage}%` : 'No Data'}
                      </Badge>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{item.subject?.name}</p>
                    <p className="text-xs text-slate-500">
                      {item.conductedSessions} finalized session(s) · P: {item.presentCount} · L:{' '}
                      {item.lateCount} · A: {item.absentCount}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Students Below {threshold}% Threshold (My Assigned Subjects)
              </h3>
              <Badge variant={shortageStudents.length > 0 ? 'warning' : 'success'}>
                {shortageStudents.length} Flagged
              </Badge>
            </div>
            {shortageStudents.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">
                No students in your finalized sessions are currently below {threshold}%.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {shortageStudents.map((row) => (
                  <div key={row.student?._id} className="p-3.5 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {row.student?.firstName} {row.student?.lastName}
                      </p>
                      <p className="text-xs font-mono text-slate-500">
                        {row.student?.rollNumber} · Attended {row.attendedCount}/{row.totalSessions}
                      </p>
                    </div>
                    <Badge variant="danger">{row.percentage}%</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE SESSION MODAL */}
      <Modal
        isOpen={isNewSessionOpen}
        onClose={() => setIsNewSessionOpen(false)}
        title="Create Attendance Session"
        subtitle="Initiate a distinct academic class session for an authorized subject."
        maxWidth="max-w-lg"
      >
        <form
          onSubmit={createSessionForm.handleSubmit((vals) => createSessionMutation.mutate(vals))}
          className="space-y-4"
        >
          <Select
            label="Authorized Subject Assignment"
            required
            value={createSessionForm.watch('facultyAssignment')}
            onChange={(e) => createSessionForm.setValue('facultyAssignment', e.target.value)}
            options={authorizedSubjects.map((a) => ({
              value: a._id,
              label: `${a.subject?.code} - ${a.subject?.name} (Sem ${a.semester?.semesterNumber} Sec ${a.section})`
            }))}
            error={createSessionForm.formState.errors.facultyAssignment?.message}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Session Date (IST)"
              type="date"
              required
              {...createSessionForm.register('sessionDate')}
              error={createSessionForm.formState.errors.sessionDate?.message}
            />
            <Input
              label="Session Number (Same-Day)"
              type="number"
              min={1}
              max={20}
              required
              {...createSessionForm.register('sessionNumber')}
              error={createSessionForm.formState.errors.sessionNumber?.message}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Time (Optional)" type="time" {...createSessionForm.register('startTime')} />
            <Input label="End Time (Optional)" type="time" {...createSessionForm.register('endTime')} />
          </div>
          <Input
            label="Lecture / Lab Topic (Optional)"
            placeholder="e.g. Unit 3 Normalization & BCNF"
            {...createSessionForm.register('topic')}
          />
          <div className="flex justify-end space-x-2.5 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsNewSessionOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createSessionMutation.isPending}>
              Create Session
            </Button>
          </div>
        </form>
      </Modal>

      {/* REVIEW & SUBMIT MODAL */}
      <Modal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        title="Review & Submit Attendance Batch"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-sm">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
            <p className="font-semibold text-slate-900">
              {activeSession?.subject?.code} · {activeSession?.sessionDate} (Session #
              {activeSession?.sessionNumber})
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <span className="text-emerald-700 font-semibold">Present: {markingStats.present}</span>
              <span className="text-rose-700 font-semibold">Absent: {markingStats.absent}</span>
              <span className="text-amber-700 font-semibold">Late: {markingStats.late}</span>
              <span className="text-slate-600 font-semibold">Unmarked: {markingStats.unmarked}</span>
            </div>
          </div>
          {markingStats.unmarked > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>{markingStats.unmarked} eligible student(s) have no status selected and will not be saved.</span>
            </div>
          )}
          <div className="flex justify-end space-x-2.5">
            <Button variant="outline" onClick={() => setIsReviewOpen(false)}>
              Back to Edit
            </Button>
            <Button isLoading={bulkSubmitMutation.isPending} onClick={handleConfirmSubmitBulk}>
              {finalizeOnSubmit ? 'Submit & Finalize' : 'Save Draft Batch'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* REOPEN SESSION REASON MODAL */}
      <Modal
        isOpen={!!statusModalTarget}
        onClose={() => setStatusModalTarget(null)}
        title="Reopen Finalized Session"
        maxWidth="max-w-md"
      >
        {statusModalTarget && (
          <div className="space-y-4 text-sm">
            <p className="text-slate-600">
              Reopening finalized session <strong>{statusModalTarget.sessionDate}</strong> (#
              {statusModalTarget.sessionNumber}) is recorded in the audit log. Provide an explicit reason:
            </p>
            <Textarea
              label="Reopen Reason"
              required
              value={sessionStatusReason}
              onChange={(e) => setSessionStatusReason(e.target.value)}
              placeholder="e.g. Correcting late entry for student roll call..."
            />
            <div className="flex justify-end space-x-2.5">
              <Button variant="outline" onClick={() => setStatusModalTarget(null)}>
                Cancel
              </Button>
              <Button
                isLoading={statusMutation.isPending}
                onClick={() =>
                  statusMutation.mutate({
                    id: statusModalTarget._id,
                    status: targetSessionStatus,
                    reason: sessionStatusReason
                  })
                }
              >
                Reopen Session
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* CORRECTION MODAL */}
      <Modal
        isOpen={!!correctTarget}
        onClose={() => setCorrectTarget(null)}
        title="Correct Attendance Entry"
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
            label="Updated Status"
            required
            value={correctForm.watch('status')}
            onChange={(e) => correctForm.setValue('status', e.target.value)}
            options={ATTENDANCE_STATUS_OPTIONS}
          />
          <Input label="Remarks" {...correctForm.register('remarks')} />
          <Textarea
            label="Audit Reason for Correction"
            required
            placeholder="Explain why attendance status is being modified..."
            {...correctForm.register('reason')}
            error={correctForm.formState.errors.reason?.message}
          />
          <div className="flex justify-end space-x-2.5 pt-2">
            <Button type="button" variant="outline" onClick={() => setCorrectTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={correctMutation.isPending}>
              Save Correction
            </Button>
          </div>
        </form>
      </Modal>

      {/* CANCEL SESSION CONFIRM */}
      <ConfirmDialog
        isOpen={!!cancelConfirmTarget}
        onClose={() => setCancelConfirmTarget(null)}
        onConfirm={() =>
          statusMutation.mutate({ id: cancelConfirmTarget._id, status: 'CANCELLED', reason: 'Cancelled by faculty' })
        }
        isLoading={statusMutation.isPending}
        title="Cancel Attendance Session"
        message={
          cancelConfirmTarget
            ? `Cancel ${cancelConfirmTarget.subject?.code} on ${cancelConfirmTarget.sessionDate}? Cancelled sessions are permanently excluded from attendance percentage calculations.`
            : ''
        }
        confirmText="Cancel Session"
        variant="danger"
      />
    </div>
  );
};

export default FacultyAttendancePage;
