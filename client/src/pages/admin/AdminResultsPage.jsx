import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ResponsiveContainer,
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
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Textarea from '../../components/common/Textarea';
import LoadingSkeleton from '../../components/data/LoadingSkeleton';
import ErrorState from '../../components/data/ErrorState';
import { useToast } from '../../context/ToastContext';
import {
  resultApi,
  resultPolicyApi,
  examinationApi,
  academicLookupApi
} from '../../services/managementService';
import {
  extractApiErrorMessage,
  formatDate,
  RESULT_STATUS_OPTIONS,
  RESULT_CALC_STATUS_OPTIONS,
  RESULT_PUB_STATUS_OPTIONS,
  EVALUATION_MODE_OPTIONS,
  getStatusBadgeVariant
} from '../../utils/formSchemas';
import {
  BarChart3,
  Calculator,
  FileCheck2,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Edit3,
  Send,
  RotateCcw,
  Plus,
  History,
  XCircle
} from 'lucide-react';

const createPolicyFormSchema = z.object({
  name: z.string().trim().min(3, 'Policy name required').max(140),
  code: z.string().trim().min(2, 'Policy code required').max(50),
  evaluationMode: z.enum(['COMBINED', 'INTERNAL_ONLY', 'EXTERNAL_ONLY']),
  useSubjectMaxMarks: z.boolean(),
  internalMaxMarks: z.coerce.number().min(0).max(500),
  externalMaxMarks: z.coerce.number().min(0).max(500),
  minInternalPassPercent: z.coerce.number().min(0).max(100),
  minExternalPassPercent: z.coerce.number().min(0).max(100),
  minTotalPassPercent: z.coerce.number().min(0).max(100),
  roundingPolicy: z.enum(['DECIMAL_2', 'HALF_UP_INT', 'CEIL_INT']),
  isProvisional: z.boolean()
});

const correctResultFormSchema = z.object({
  internalMarks: z.coerce.number().min(0),
  externalMarks: z.coerce.number().min(0),
  attendanceState: z.enum(['PRESENT', 'ABSENT', 'WITHHELD']),
  remarks: z.string().max(300).optional(),
  reason: z.string().trim().min(3, 'Audit reason is required (min 3 chars)').max(300)
});

export const AdminResultsPage = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('overview');

  // Result Generation selector state
  const [genCourse, setGenCourse] = useState('');
  const [genSemester, setGenSemester] = useState('');
  const [genAcademicYear, setGenAcademicYear] = useState('');
  const [genExam, setGenExam] = useState('');
  const [genSubject, setGenSubject] = useState('');
  const [genPolicy, setGenPolicy] = useState('');
  const [readinessRequested, setReadinessRequested] = useState(false);
  const [externalInputs, setExternalInputs] = useState({});
  const [attendanceInputs, setAttendanceInputs] = useState({});
  const [isCalcConfirmOpen, setIsCalcConfirmOpen] = useState(false);

  // Review table filters & modals
  const [resPage, setResPage] = useState(1);
  const [resSearch, setResSearch] = useState('');
  const [debouncedResSearch, setDebouncedResSearch] = useState('');
  const [filterResultStatus, setFilterResultStatus] = useState('');
  const [filterCalcStatus, setFilterCalcStatus] = useState('');
  const [filterPubStatus, setFilterPubStatus] = useState('');
  const [detailTargetId, setDetailTargetId] = useState('');
  const [correctTarget, setCorrectTarget] = useState(null);
  const [reasonActionTarget, setReasonActionTarget] = useState(null); // { mode: 'REJECT' | 'WITHDRAW' | 'RECALC', row }
  const [actionReasonText, setActionReasonText] = useState('');

  // Policy modal
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedResSearch(resSearch);
      setResPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [resSearch]);

  const extractArray = (res, key) => (Array.isArray(res?.data) ? res.data : res?.data?.[key]) || [];

  const courseLookup = useQuery({ queryKey: ['lookup-courses-active'], queryFn: () => academicLookupApi.getCourses({ isActive: true }) });
  const semesterLookup = useQuery({ queryKey: ['lookup-semesters-active'], queryFn: () => academicLookupApi.getSemesters({ isActive: true }) });
  const subjectLookup = useQuery({ queryKey: ['lookup-subjects-active'], queryFn: () => academicLookupApi.getSubjects({ isActive: true }) });
  const examsLookup = useQuery({ queryKey: ['lookup-exams-all'], queryFn: () => examinationApi.list({ limit: 100 }) });
  const policiesQuery = useQuery({ queryKey: ['result-policies'], queryFn: () => resultPolicyApi.list({ limit: 50 }) });

  const courses = extractArray(courseLookup.data, 'courses');
  const semesters = extractArray(semesterLookup.data, 'semesters');
  const subjects = extractArray(subjectLookup.data, 'subjects');
  const examinations = examsLookup.data?.data?.examinations || [];
  const policies = policiesQuery.data?.data?.policies || [];

  const overviewQuery = useQuery({
    queryKey: ['admin-result-overview'],
    queryFn: () => resultApi.getReportsOverview({})
  });

  const readinessQuery = useQuery({
    queryKey: ['result-readiness', { genCourse, genSemester, genAcademicYear, genExam, genSubject, genPolicy }],
    queryFn: () =>
      resultApi.checkReadiness({
        course: genCourse,
        semester: genSemester,
        academicYear: genAcademicYear,
        examination: genExam,
        subject: genSubject,
        policyId: genPolicy
      }),
    enabled: Boolean(readinessRequested && genCourse && genSemester && genAcademicYear && genExam)
  });

  const resultsQuery = useQuery({
    queryKey: [
      'admin-results-list',
      { resPage, debouncedResSearch, filterResultStatus, filterCalcStatus, filterPubStatus }
    ],
    queryFn: () =>
      resultApi.list({
        page: resPage,
        limit: 12,
        search: debouncedResSearch,
        resultStatus: filterResultStatus,
        calculationStatus: filterCalcStatus,
        publicationStatus: filterPubStatus
      }),
    enabled: activeTab === 'review'
  });

  const detailQuery = useQuery({
    queryKey: ['admin-result-detail', detailTargetId],
    queryFn: () => resultApi.getById(detailTargetId),
    enabled: Boolean(detailTargetId)
  });

  // Pre-fill existing external marks when readiness roster loads
  const readinessData = readinessQuery.data?.data || null;
  useEffect(() => {
    if (!readinessData?.rosterPreview) return;
    const nextExt = {};
    const nextAtt = {};
    for (const row of readinessData.rosterPreview) {
      const k = `${row.studentId}|${row.subjectId}`;
      if (row.existingExternalMarks !== null && row.existingExternalMarks !== undefined) {
        nextExt[k] = String(row.existingExternalMarks);
      }
      nextAtt[k] = 'PRESENT';
    }
    setExternalInputs(nextExt);
    setAttendanceInputs(nextAtt);
  }, [readinessData?.examination?._id, readinessData?.totalEligiblePairs]);

  const policyForm = useForm({
    resolver: zodResolver(createPolicyFormSchema),
    defaultValues: {
      name: '',
      code: '',
      evaluationMode: 'COMBINED',
      useSubjectMaxMarks: true,
      internalMaxMarks: 30,
      externalMaxMarks: 70,
      minInternalPassPercent: 0,
      minExternalPassPercent: 30,
      minTotalPassPercent: 40,
      roundingPolicy: 'DECIMAL_2',
      isProvisional: true
    }
  });

  const correctForm = useForm({
    resolver: zodResolver(correctResultFormSchema),
    defaultValues: { internalMarks: 0, externalMarks: 0, attendanceState: 'PRESENT', remarks: '', reason: '' }
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-result-overview'] });
    queryClient.invalidateQueries({ queryKey: ['admin-results-list'] });
    queryClient.invalidateQueries({ queryKey: ['admin-result-detail'] });
    queryClient.invalidateQueries({ queryKey: ['result-readiness'] });
    queryClient.invalidateQueries({ queryKey: ['result-policies'] });
  };

  const calculateMut = useMutation({
    mutationFn: resultApi.calculate,
    onSuccess: (res) => {
      const d = res?.data || {};
      invalidateAll();
      setIsCalcConfirmOpen(false);
      showToast(
        `Calculated ${d.calculatedCount} result(s) (${d.incompleteCount} incomplete, ${d.skippedExistingCount} skipped)`,
        d.incompleteCount > 0 ? 'warning' : 'success'
      );
      setActiveTab('review');
    },
    onError: (err) => {
      setIsCalcConfirmOpen(false);
      showToast(extractApiErrorMessage(err, 'Result calculation failed'), 'error');
    }
  });

  const approveMut = useMutation({
    mutationFn: (id) => resultApi.approve(id),
    onSuccess: () => {
      invalidateAll();
      showToast('Result approved cleanly', 'success');
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Approval failed'), 'error')
  });

  const publishMut = useMutation({
    mutationFn: (id) => resultApi.publish(id),
    onSuccess: () => {
      invalidateAll();
      showToast('Result published to Student Portal', 'success');
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Publication failed'), 'error')
  });

  const batchApproveMut = useMutation({
    mutationFn: resultApi.batchApprove,
    onSuccess: (res) => {
      invalidateAll();
      showToast(`Approved ${res?.data?.processedCount || 0} result(s)`, 'success');
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Batch approve failed'), 'error')
  });

  const batchPublishMut = useMutation({
    mutationFn: resultApi.batchPublish,
    onSuccess: (res) => {
      invalidateAll();
      showToast(`Published ${res?.data?.processedCount || 0} result(s)`, 'success');
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Batch publish failed'), 'error')
  });

  const reasonActionMut = useMutation({
    mutationFn: ({ mode, id, reason }) => {
      if (mode === 'REJECT') return resultApi.reject(id, reason);
      if (mode === 'WITHDRAW') return resultApi.withdraw(id, reason);
      return resultApi.recalculate({ resultIds: [id], reason });
    },
    onSuccess: (res) => {
      invalidateAll();
      setReasonActionTarget(null);
      setActionReasonText('');
      showToast(res?.message || 'Action completed', 'success');
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Action failed'), 'error')
  });

  const correctMut = useMutation({
    mutationFn: ({ id, payload }) => resultApi.correct(id, payload),
    onSuccess: () => {
      invalidateAll();
      setCorrectTarget(null);
      showToast('Result corrected and historical version archived', 'success');
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Correction failed'), 'error')
  });

  const createPolicyMut = useMutation({
    mutationFn: resultPolicyApi.create,
    onSuccess: () => {
      invalidateAll();
      setIsPolicyModalOpen(false);
      showToast('Academic result policy created', 'success');
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Failed to create policy'), 'error')
  });

  const togglePolicyMut = useMutation({
    mutationFn: ({ id, isActive }) => resultPolicyApi.updateStatus(id, isActive),
    onSuccess: (res) => {
      invalidateAll();
      showToast(res?.message || 'Policy status updated', 'success');
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Cannot toggle policy status'), 'error')
  });

  const handleConfirmCalculate = () => {
    const externalEntries = (readinessData?.rosterPreview || [])
      .map((row) => {
        const k = `${row.studentId}|${row.subjectId}`;
        const rawExt = externalInputs[k];
        const attState = attendanceInputs[k] || 'PRESENT';
        if (attState === 'PRESENT' && (rawExt === undefined || rawExt === '')) {
          return null;
        }
        return {
          studentId: row.studentId,
          subjectId: row.subjectId,
          externalMarks: rawExt !== undefined && rawExt !== '' ? Number(rawExt) : 0,
          attendanceState: attState
        };
      })
      .filter(Boolean);

    calculateMut.mutate({
      course: genCourse,
      semester: genSemester,
      academicYear: genAcademicYear,
      examination: genExam,
      subject: genSubject || undefined,
      policyId: genPolicy || undefined,
      externalEntries
    });
  };

  const overview = overviewQuery.data?.data || {};
  const ovSummary = overview.summary || {};
  const resultsList = resultsQuery.data?.data?.results || [];
  const resPagination = resultsQuery.data?.meta?.pagination || { page: 1, totalPages: 1, totalRecords: 0 };

  const approvableIds = useMemo(
    () => resultsList.filter((r) => ['CALCULATED', 'REQUIRES_REVIEW', 'REJECTED'].includes(r.calculationStatus) && r.resultStatus !== 'INCOMPLETE').map((r) => r._id),
    [resultsList]
  );
  const publishableIds = useMemo(
    () => resultsList.filter((r) => r.calculationStatus === 'APPROVED' && r.publicationStatus !== 'PUBLISHED').map((r) => r._id),
    [resultsList]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Results Management & Processing"
        description="Configure academic grading policies, calculate semester results from Phase 9 assessments, approve, and publish."
        breadcrumbs={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Results' }]}
        actions={
          <Button icon={Calculator} onClick={() => setActiveTab('generate')}>
            Generate Results
          </Button>
        }
      />

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'overview', label: 'Overview & Analytics', icon: BarChart3 },
          { id: 'generate', label: 'Generate Results', icon: Calculator },
          { id: 'review', label: 'Review, Approve & Publish', icon: FileCheck2 },
          { id: 'policies', label: 'Academic Policies', icon: SlidersHorizontal }
        ]}
      />

      {/* TAB 1: OVERVIEW & REPORTS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {overviewQuery.isLoading ? (
            <LoadingSkeleton variant="card" count={4} />
          ) : overviewQuery.error ? (
            <ErrorState
              title="Unable to load result overview"
              message={extractApiErrorMessage(overviewQuery.error)}
              onRetry={overviewQuery.refetch}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard
                  title="Total Generated"
                  value={ovSummary.totalResults ?? 0}
                  icon={FileCheck2}
                  color="indigo"
                  subtitle={`${ovSummary.published ?? 0} published · ${ovSummary.unpublished ?? 0} unpublished`}
                />
                <StatCard
                  title="Pending Review / Approved"
                  value={`${(ovSummary.calculated ?? 0) + (ovSummary.requiresReview ?? 0)} / ${ovSummary.approved ?? 0}`}
                  icon={CheckCircle2}
                  color="sky"
                  subtitle="Calculated+Review / Approved"
                />
                <StatCard
                  title="Pass vs Fail"
                  value={`${ovSummary.passed ?? 0} / ${ovSummary.failed ?? 0}`}
                  icon={BarChart3}
                  color="emerald"
                  subtitle={`Mean score: ${ovSummary.averagePercentage ?? 0}%`}
                />
                <StatCard
                  title="Incomplete / Withheld"
                  value={(ovSummary.incomplete ?? 0) + (ovSummary.withheld ?? 0)}
                  icon={AlertTriangle}
                  color="amber"
                  subtitle={`${ovSummary.absent ?? 0} marked Absent`}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Grade Distribution" subtitle="Live breakdown across calculated results">
                  {(overview.gradeDistribution || []).length === 0 ? (
                    <div className="h-56 flex items-center justify-center text-sm text-slate-500">
                      Generate results to visualize grade distribution.
                    </div>
                  ) : (
                    <div className="h-60 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={overview.gradeDistribution}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="grade" tick={{ fill: '#64748B', fontSize: 12 }} />
                          <YAxis allowDecimals={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </ChartCard>

                <ChartCard title="Subject-wise Pass Summary" subtitle="Calculated from persisted DB results">
                  {(overview.subjectSummaries || []).length === 0 ? (
                    <div className="h-56 flex items-center justify-center text-sm text-slate-500">
                      No subject result summaries available yet.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-60 overflow-y-auto">
                      {overview.subjectSummaries.map((sub) => (
                        <div
                          key={sub.subject?._id}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-bold text-slate-900">
                              {sub.subject?.code} - {sub.subject?.name}
                            </p>
                            <p className="text-slate-500">
                              {sub.total} total · Pass: {sub.passed} · Fail: {sub.failed}
                            </p>
                          </div>
                          <Badge variant={sub.passRate >= 50 ? 'success' : 'warning'}>
                            {sub.passRate}% Pass
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </ChartCard>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: GENERATE RESULTS */}
      {activeTab === 'generate' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              1. Select Academic Scope & Policy
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Course"
                required
                placeholder="Select Course"
                value={genCourse}
                onChange={(e) => {
                  setGenCourse(e.target.value);
                  setGenSemester('');
                  setGenSubject('');
                  setGenExam('');
                  setReadinessRequested(false);
                }}
                options={courses.map((c) => ({ value: c._id, label: `${c.code} - ${c.name}` }))}
              />
              <Select
                label="Semester"
                required
                disabled={!genCourse}
                placeholder={genCourse ? 'Select Semester' : 'Choose course first'}
                value={genSemester}
                onChange={(e) => {
                  const sid = e.target.value;
                  setGenSemester(sid);
                  setGenSubject('');
                  setGenExam('');
                  setReadinessRequested(false);
                  const semObj = semesters.find((s) => s._id === sid);
                  if (semObj?.academicYear) setGenAcademicYear(semObj.academicYear);
                }}
                options={semesters
                  .filter((s) => String(s.course?._id || s.course) === genCourse)
                  .map((s) => ({ value: s._id, label: `Semester ${s.semesterNumber} (${s.academicYear})` }))}
              />
              <Select
                label="Examination"
                required
                disabled={!genSemester}
                placeholder={genSemester ? 'Select Examination' : 'Choose semester first'}
                value={genExam}
                onChange={(e) => {
                  setGenExam(e.target.value);
                  setReadinessRequested(false);
                }}
                options={examinations
                  .filter(
                    (ex) =>
                      ex.status !== 'CANCELLED' &&
                      ex.status !== 'DRAFT' &&
                      String(ex.semester?._id || ex.semester) === genSemester
                  )
                  .map((ex) => ({ value: ex._id, label: `${ex.title} (${ex.examType})` }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <Select
                label="Subject Filter (Optional)"
                placeholder="All Subjects in Examination Scope"
                value={genSubject}
                onChange={(e) => {
                  setGenSubject(e.target.value);
                  setReadinessRequested(false);
                }}
                options={subjects
                  .filter((sub) => String(sub.semester?._id || sub.semester) === genSemester)
                  .map((sub) => ({ value: sub._id, label: `${sub.code} - ${sub.name}` }))}
              />
              <Select
                label="Academic Result Policy"
                placeholder="Auto-resolve Active Default Policy"
                value={genPolicy}
                onChange={(e) => {
                  setGenPolicy(e.target.value);
                  setReadinessRequested(false);
                }}
                options={policies
                  .filter((p) => p.isActive)
                  .map((p) => ({
                    value: p._id,
                    label: `${p.code} (${p.evaluationMode}${p.isProvisional ? ' · Provisional' : ''})`
                  }))}
              />
              <Button
                disabled={!genCourse || !genSemester || !genExam}
                isLoading={readinessQuery.isFetching}
                onClick={() => setReadinessRequested(true)}
              >
                Check Calculation Readiness
              </Button>
            </div>
          </div>

          {readinessQuery.error && (
            <ErrorState
              title="Readiness check failed"
              message={extractApiErrorMessage(readinessQuery.error)}
              onRetry={readinessQuery.refetch}
            />
          )}

          {readinessData && (
            <div className="space-y-4">
              {readinessData.policy?.isProvisional && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-900 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Using policy <strong>{readinessData.policy.name} ({readinessData.policy.code})</strong>{' '}
                    [Mode: <strong>{readinessData.policy.evaluationMode}</strong>, Min Total Pass:{' '}
                    <strong>{readinessData.policy.minTotalPassPercent}%</strong>, Provisional:{' '}
                    <strong>Yes</strong> — institutional confirmation recommended prior to official publication].
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-slate-200 p-3.5">
                  <p className="text-[11px] font-bold uppercase text-slate-500">Eligible Pairs</p>
                  <p className="text-xl font-extrabold text-slate-900">{readinessData.totalEligiblePairs}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3.5">
                  <p className="text-[11px] font-bold uppercase text-emerald-700">Internal Ready</p>
                  <p className="text-xl font-extrabold text-emerald-800">{readinessData.internalReadyCount}</p>
                </div>
                <div className="bg-amber-50 rounded-xl border border-amber-200 p-3.5">
                  <p className="text-[11px] font-bold uppercase text-amber-700">Incomplete Internal</p>
                  <p className="text-xl font-extrabold text-amber-800">{readinessData.incompleteInternalCount}</p>
                </div>
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5">
                  <p className="text-[11px] font-bold uppercase text-slate-600">Already Published</p>
                  <p className="text-xl font-extrabold text-slate-800">{readinessData.alreadyPublishedCount}</p>
                </div>
              </div>

              {/* Roster + External Exam Score Entry */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      2. External Examination Marks Entry & Calculation Preview
                    </h4>
                    <p className="text-xs text-slate-500">
                      {readinessData.policy?.evaluationMode === 'INTERNAL_ONLY'
                        ? 'Selected policy is INTERNAL_ONLY; external marks are skipped cleanly.'
                        : 'Enter verified external examination marks per student or mark Absent / Withheld before calculating.'}
                    </p>
                  </div>
                  <Button
                    icon={Calculator}
                    onClick={() => setIsCalcConfirmOpen(true)}
                    disabled={readinessData.totalEligiblePairs === 0}
                  >
                    Calculate Results
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Student</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Subject</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                        {readinessData.policy?.evaluationMode !== 'INTERNAL_ONLY' && (
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                            External Marks
                          </th>
                        )}
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Existing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(readinessData.rosterPreview || []).map((row) => {
                        const k = `${row.studentId}|${row.subjectId}`;
                        const att = attendanceInputs[k] || 'PRESENT';
                        return (
                          <tr key={k}>
                            <td className="px-4 py-3">
                              <p className="text-sm font-semibold text-slate-900">{row.studentName}</p>
                              <p className="text-xs font-mono text-slate-500">{row.rollNumber}</p>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-slate-800">
                              {row.subjectCode} - {row.subjectName}
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={att}
                                onChange={(e) =>
                                  setAttendanceInputs((p) => ({ ...p, [k]: e.target.value }))
                                }
                                className="rounded-lg border border-slate-300 bg-white py-1.5 px-2 text-xs"
                              >
                                <option value="PRESENT">Present</option>
                                <option value="ABSENT">Absent</option>
                                <option value="WITHHELD">Withheld</option>
                              </select>
                            </td>
                            {readinessData.policy?.evaluationMode !== 'INTERNAL_ONLY' && (
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  step="0.01"
                                  min={0}
                                  max={row.externalMaxMarks}
                                  disabled={att !== 'PRESENT'}
                                  value={externalInputs[k] ?? ''}
                                  onChange={(e) =>
                                    setExternalInputs((p) => ({ ...p, [k]: e.target.value }))
                                  }
                                  placeholder={`0 - ${row.externalMaxMarks}`}
                                  className="w-28 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-semibold disabled:bg-slate-100"
                                />
                              </td>
                            )}
                            <td className="px-4 py-3 text-xs text-slate-500">
                              {row.existingStatus || 'Not calculated'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REVIEW, APPROVE & PUBLISH */}
      {activeTab === 'review' && (
        <div className="space-y-4">
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
                    <p className="text-xs font-mono text-slate-500">{r.student?.rollNumber}</p>
                  </div>
                )
              },
              {
                key: 'subject',
                label: 'Subject & Exam',
                render: (r) => (
                  <div>
                    <p className="font-medium text-slate-900">
                      {r.subject?.code} - {r.subject?.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {r.examination?.title} · v{r.calculationVersion || 1}
                    </p>
                  </div>
                )
              },
              {
                key: 'scores',
                label: 'Scores (Int / Ext / Total)',
                render: (r) => (
                  <div>
                    <p className="font-bold text-slate-900">
                      {r.totalMarks} / {r.maxMarks} ({r.percentage}%)
                    </p>
                    <p className="text-xs text-slate-500">
                      Int: {r.internalMarks}/{r.internalMaxMarks} · Ext: {r.externalMarks}/{r.externalMaxMarks}
                    </p>
                  </div>
                )
              },
              {
                key: 'grade',
                label: 'Grade & Result',
                render: (r) => (
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-900">
                      {r.grade} ({r.gradePoints})
                    </span>
                    <Badge variant={getStatusBadgeVariant(r.resultStatus)}>{r.resultStatus}</Badge>
                  </div>
                )
              },
              {
                key: 'workflow',
                label: 'Approval & Publication',
                render: (r) => (
                  <div className="space-y-1">
                    <div>
                      <Badge variant={getStatusBadgeVariant(r.calculationStatus)}>{r.calculationStatus}</Badge>
                    </div>
                    <div>
                      <Badge variant={getStatusBadgeVariant(r.publicationStatus)}>{r.publicationStatus}</Badge>
                    </div>
                  </div>
                )
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (r) => (
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setDetailTargetId(r._id)}
                      className="p-1.5 text-slate-500 hover:text-brand-700 hover:bg-brand-50 rounded-lg"
                      title="Inspect breakdown & revision history"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {['CALCULATED', 'REQUIRES_REVIEW', 'REJECTED'].includes(r.calculationStatus) &&
                      r.resultStatus !== 'INCOMPLETE' && (
                        <button
                          type="button"
                          onClick={() => approveMut.mutate(r._id)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          title="Approve result"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                    {r.calculationStatus === 'APPROVED' && r.publicationStatus !== 'PUBLISHED' && (
                      <button
                        type="button"
                        onClick={() => publishMut.mutate(r._id)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                        title="Publish to Student Portal"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                    {r.publicationStatus === 'PUBLISHED' && (
                      <button
                        type="button"
                        onClick={() => {
                          setReasonActionTarget({ mode: 'WITHDRAW', row: r });
                          setActionReasonText('');
                        }}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="Withdraw published result"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setCorrectTarget(r);
                        correctForm.reset({
                          internalMarks: r.internalMarks,
                          externalMarks: r.externalMarks,
                          attendanceState: r.attendanceState || 'PRESENT',
                          remarks: r.remarks || '',
                          reason: ''
                        });
                      }}
                      className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"
                      title="Correct / revise result"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReasonActionTarget({ mode: 'RECALC', row: r });
                        setActionReasonText('');
                      }}
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                      title="Recalculate from current Phase 9 marks"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                )
              }
            ]}
            data={resultsList}
            isLoading={resultsQuery.isLoading}
            error={resultsQuery.error ? extractApiErrorMessage(resultsQuery.error) : null}
            onRetry={resultsQuery.refetch}
            serverSide
            searchValue={resSearch}
            onSearchChange={setResSearch}
            searchPlaceholder="Search student roll no, name, subject..."
            currentPage={resPagination.page}
            totalPages={resPagination.totalPages}
            totalRecords={resPagination.totalRecords}
            pageSize={12}
            onPageChange={setResPage}
            toolbarExtras={
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filterResultStatus}
                  onChange={(e) => {
                    setFilterResultStatus(e.target.value);
                    setResPage(1);
                  }}
                  className="rounded-lg border border-slate-300 bg-white py-1.5 px-2.5 text-xs"
                >
                  <option value="">All Result Statuses</option>
                  {RESULT_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <select
                  value={filterCalcStatus}
                  onChange={(e) => {
                    setFilterCalcStatus(e.target.value);
                    setResPage(1);
                  }}
                  className="rounded-lg border border-slate-300 bg-white py-1.5 px-2.5 text-xs"
                >
                  <option value="">All Calc Statuses</option>
                  {RESULT_CALC_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <select
                  value={filterPubStatus}
                  onChange={(e) => {
                    setFilterPubStatus(e.target.value);
                    setResPage(1);
                  }}
                  className="rounded-lg border border-slate-300 bg-white py-1.5 px-2.5 text-xs"
                >
                  <option value="">All Pub Statuses</option>
                  {RESULT_PUB_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {approvableIds.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    isLoading={batchApproveMut.isPending}
                    onClick={() => batchApproveMut.mutate(approvableIds)}
                  >
                    Approve Visible ({approvableIds.length})
                  </Button>
                )}
                {publishableIds.length > 0 && (
                  <Button
                    size="sm"
                    isLoading={batchPublishMut.isPending}
                    onClick={() => batchPublishMut.mutate(publishableIds)}
                  >
                    Publish Approved ({publishableIds.length})
                  </Button>
                )}
              </div>
            }
            emptyTitle="No generated results found"
            emptyDescription="Use the 'Generate Results' tab to calculate results from Phase 9 marks and examinations."
          />
        </div>
      )}

      {/* TAB 4: ACADEMIC POLICIES */}
      {activeTab === 'policies' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button icon={Plus} onClick={() => setIsPolicyModalOpen(true)}>
              New Academic Policy
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {policies.map((p) => (
              <div key={p._id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-slate-900">{p.name}</h4>
                      {p.isProvisional && <Badge variant="warning">Provisional</Badge>}
                    </div>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">
                      {p.code} · v{p.policyVersion} · {p.evaluationMode}
                    </p>
                  </div>
                  <Badge variant={p.isActive ? 'success' : 'danger'}>
                    {p.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </div>
                <div className="text-xs text-slate-600 grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl">
                  <span>Max Internal/Ext: {p.internalMaxMarks}/{p.externalMaxMarks}</span>
                  <span>Use Subject Caps: {p.useSubjectMaxMarks ? 'Yes' : 'No'}</span>
                  <span>Min Pass Int/Ext: {p.minInternalPassPercent}% / {p.minExternalPassPercent}%</span>
                  <span>Min Total Pass: {p.minTotalPassPercent}%</span>
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => togglePolicyMut.mutate({ id: p._id, isActive: !p.isActive })}
                  >
                    {p.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RESULT DETAILS & REVISION HISTORY MODAL */}
      <Modal
        isOpen={!!detailTargetId}
        onClose={() => setDetailTargetId('')}
        title="Result Breakdown & Revision History"
        maxWidth="max-w-2xl"
      >
        {detailQuery.data?.data?.result && (
          <div className="space-y-4 text-sm">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500">Student</p>
                <p className="font-semibold text-slate-900">
                  {detailQuery.data.data.result.student?.firstName}{' '}
                  {detailQuery.data.data.result.student?.lastName} (
                  {detailQuery.data.data.result.student?.rollNumber})
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Subject & Score</p>
                <p className="font-semibold text-slate-900">
                  {detailQuery.data.data.result.subject?.code} · {detailQuery.data.data.result.totalMarks}/
                  {detailQuery.data.data.result.maxMarks} ({detailQuery.data.data.result.grade})
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Applied Policy Snapshot</p>
                <p className="text-xs font-medium text-slate-800">
                  {detailQuery.data.data.result.policySnapshot?.name || '—'} (v
                  {detailQuery.data.data.result.policySnapshot?.policyVersion || 1})
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Workflow States</p>
                <p className="text-xs font-semibold text-slate-800">
                  {detailQuery.data.data.result.calculationStatus} /{' '}
                  {detailQuery.data.data.result.publicationStatus}
                </p>
              </div>
            </div>

            {(detailQuery.data.data.result.sourceAssessmentMarks || []).length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase text-slate-500 mb-1.5">Source Internal Components</p>
                <div className="space-y-1">
                  {detailQuery.data.data.result.sourceAssessmentMarks.map((s, idx) => (
                    <div key={idx} className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex justify-between">
                      <span>{s.name}</span>
                      <span className="font-semibold">{s.obtained} / {s.maxMarks}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center space-x-1.5 text-xs font-bold uppercase text-slate-500 mb-1.5">
                <History className="w-3.5 h-3.5" />
                <span>Revision History ({(detailQuery.data.data.result.revisionHistory || []).length})</span>
              </div>
              {(detailQuery.data.data.result.revisionHistory || []).length === 0 ? (
                <p className="text-xs text-slate-500">No post-calculation revisions yet (Version {detailQuery.data.data.result.calculationVersion}).</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {detailQuery.data.data.result.revisionHistory.map((rev, idx) => (
                    <div key={idx} className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <p className="font-semibold text-amber-900">
                        v{rev.version}: Int {rev.internalMarks} + Ext {rev.externalMarks} = {rev.totalMarks} ({rev.grade}, {rev.resultStatus})
                      </p>
                      <p className="text-amber-800">Reason: {rev.reason} · {formatDate(rev.modifiedAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* CORRECT RESULT MODAL */}
      <Modal
        isOpen={!!correctTarget}
        onClose={() => setCorrectTarget(null)}
        title="Correct / Revise Result"
        subtitle={
          correctTarget
            ? `${correctTarget.student?.rollNumber} · ${correctTarget.subject?.code} (Internal Max ${correctTarget.internalMaxMarks}, External Max ${correctTarget.externalMaxMarks})`
            : ''
        }
        maxWidth="max-w-md"
      >
        <form
          onSubmit={correctForm.handleSubmit((vals) =>
            correctMut.mutate({ id: correctTarget._id, payload: vals })
          )}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={`Internal (0–${correctTarget?.internalMaxMarks ?? 30})`}
              type="number"
              step="0.01"
              {...correctForm.register('internalMarks')}
            />
            <Input
              label={`External (0–${correctTarget?.externalMaxMarks ?? 70})`}
              type="number"
              step="0.01"
              {...correctForm.register('externalMarks')}
            />
          </div>
          <Select
            label="Attendance State"
            value={correctForm.watch('attendanceState')}
            onChange={(e) => correctForm.setValue('attendanceState', e.target.value)}
            options={[
              { value: 'PRESENT', label: 'Present' },
              { value: 'ABSENT', label: 'Absent' },
              { value: 'WITHHELD', label: 'Withheld' }
            ]}
          />
          <Textarea
            label="Mandatory Audit Reason"
            required
            placeholder="Reason for revision (original snapshot will be archived)..."
            {...correctForm.register('reason')}
            error={correctForm.formState.errors.reason?.message}
          />
          <div className="flex justify-end space-x-2.5">
            <Button type="button" variant="outline" onClick={() => setCorrectTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={correctMut.isPending}>
              Save Revision
            </Button>
          </div>
        </form>
      </Modal>

      {/* REASON ACTION MODAL (WITHDRAW / REJECT / RECALCULATE) */}
      <Modal
        isOpen={!!reasonActionTarget}
        onClose={() => setReasonActionTarget(null)}
        title={
          reasonActionTarget?.mode === 'WITHDRAW'
            ? 'Withdraw Published Result'
            : reasonActionTarget?.mode === 'REJECT'
            ? 'Reject Calculated Result'
            : 'Recalculate Result'
        }
        maxWidth="max-w-md"
      >
        {reasonActionTarget && (
          <div className="space-y-4">
            <Textarea
              label="Mandatory Reason"
              required
              value={actionReasonText}
              onChange={(e) => setActionReasonText(e.target.value)}
              placeholder="Provide explicit audit reason (min 3 characters)..."
            />
            <div className="flex justify-end space-x-2.5">
              <Button variant="outline" onClick={() => setReasonActionTarget(null)}>
                Cancel
              </Button>
              <Button
                isLoading={reasonActionMut.isPending}
                onClick={() =>
                  reasonActionMut.mutate({
                    mode: reasonActionTarget.mode,
                    id: reasonActionTarget.row._id,
                    reason: actionReasonText
                  })
                }
              >
                Confirm Action
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* CREATE POLICY MODAL */}
      <Modal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        title="Create Academic Result Policy"
        maxWidth="max-w-lg"
      >
        <form
          onSubmit={policyForm.handleSubmit((vals) => createPolicyMut.mutate(vals))}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Policy Name"
              required
              {...policyForm.register('name')}
              error={policyForm.formState.errors.name?.message}
            />
            <Input
              label="Policy Code"
              required
              placeholder="BTECH-INT-2026"
              {...policyForm.register('code')}
              error={policyForm.formState.errors.code?.message}
            />
          </div>
          <Select
            label="Evaluation Mode"
            value={policyForm.watch('evaluationMode')}
            onChange={(e) => policyForm.setValue('evaluationMode', e.target.value)}
            options={EVALUATION_MODE_OPTIONS}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Default Internal Max" type="number" {...policyForm.register('internalMaxMarks')} />
            <Input label="Default External Max" type="number" {...policyForm.register('externalMaxMarks')} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Min Int Pass %" type="number" {...policyForm.register('minInternalPassPercent')} />
            <Input label="Min Ext Pass %" type="number" {...policyForm.register('minExternalPassPercent')} />
            <Input label="Min Total Pass %" type="number" {...policyForm.register('minTotalPassPercent')} />
          </div>
          <div className="flex justify-end space-x-2.5 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsPolicyModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createPolicyMut.isPending}>
              Create Policy
            </Button>
          </div>
        </form>
      </Modal>

      {/* BULK CALCULATE CONFIRMATION */}
      <ConfirmDialog
        isOpen={isCalcConfirmOpen}
        onClose={() => setIsCalcConfirmOpen(false)}
        onConfirm={handleConfirmCalculate}
        isLoading={calculateMut.isPending}
        title="Confirm Result Calculation"
        message={`Calculate subject-wise results for ${readinessData?.totalEligiblePairs ?? 0} eligible enrollment(s)? Existing published or approved records will be safely preserved without automatic publication.`}
        confirmText="Run Result Calculation"
        variant="primary"
      />
    </div>
  );
};

export default AdminResultsPage;
