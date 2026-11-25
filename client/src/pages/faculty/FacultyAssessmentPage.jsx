import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import PageHeader from '../../components/layout/PageHeader';
import Tabs from '../../components/common/Tabs';
import DataTable from '../../components/data/DataTable';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Textarea from '../../components/common/Textarea';
import EmptyState from '../../components/data/EmptyState';
import ErrorState from '../../components/data/ErrorState';
import LoadingSkeleton from '../../components/data/LoadingSkeleton';
import { useToast } from '../../context/ToastContext';
import { assessmentApi, examinationApi } from '../../services/managementService';
import { extractApiErrorMessage, formatDate, getStatusBadgeVariant } from '../../utils/formSchemas';
import { Award, Calendar, History, Save, CheckCircle2, Edit3 } from 'lucide-react';

const correctSchema = z.object({
  marksObtained: z.coerce.number().min(0, 'Marks cannot be negative'),
  remarks: z.string().max(300).optional(),
  reason: z.string().trim().min(3, 'Audit reason is required (min 3 chars)').max(300)
});

export const FacultyAssessmentPage = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('entry');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [marksInputs, setMarksInputs] = useState({});
  const [remarksInputs, setRemarksInputs] = useState({});
  const [rosterSearch, setRosterSearch] = useState('');

  // History state
  const [histPage, setHistPage] = useState(1);
  const [histSearch, setHistSearch] = useState('');
  const [correctTarget, setCorrectTarget] = useState(null);

  const assessmentsQuery = useQuery({
    queryKey: ['faculty-assessments-list'],
    queryFn: () => assessmentApi.list({ limit: 100 })
  });

  const assessments = assessmentsQuery.data?.data?.assessments || [];

  useEffect(() => {
    if (!selectedAssessmentId && assessments.length > 0) {
      setSelectedAssessmentId(assessments[0]._id);
    }
  }, [assessments, selectedAssessmentId]);

  const rosterQuery = useQuery({
    queryKey: ['faculty-assessment-roster', selectedAssessmentId],
    queryFn: () => assessmentApi.getWithRoster(selectedAssessmentId),
    enabled: Boolean(selectedAssessmentId)
  });

  const examsQuery = useQuery({
    queryKey: ['faculty-examinations'],
    queryFn: () => examinationApi.list({ limit: 50 }),
    enabled: activeTab === 'exams'
  });

  const marksHistoryQuery = useQuery({
    queryKey: ['faculty-marks-ledger', { histPage, histSearch }],
    queryFn: () => assessmentApi.listMarks({ page: histPage, limit: 12, search: histSearch }),
    enabled: activeTab === 'history'
  });

  const rosterData = rosterQuery.data?.data || null;
  const activeAssessment = rosterData?.assessment || null;
  const roster = rosterData?.roster || [];

  useEffect(() => {
    if (!activeAssessment?._id) return;
    const nextMarks = {};
    const nextRemarks = {};
    for (const r of roster) {
      if (r.marksObtained !== '' && r.marksObtained !== undefined && r.marksObtained !== null) {
        nextMarks[r.studentId] = String(r.marksObtained);
      }
      if (r.remarks) nextRemarks[r.studentId] = r.remarks;
    }
    setMarksInputs(nextMarks);
    setRemarksInputs(nextRemarks);
  }, [activeAssessment?._id, rosterData?.enteredCount]);

  const correctForm = useForm({
    resolver: zodResolver(correctSchema),
    defaultValues: { marksObtained: 0, remarks: '', reason: '' }
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['faculty-assessments-list'] });
    queryClient.invalidateQueries({ queryKey: ['faculty-assessment-roster'] });
    queryClient.invalidateQueries({ queryKey: ['faculty-marks-ledger'] });
    queryClient.invalidateQueries({ queryKey: ['faculty-dashboard-stats'] });
  };

  const bulkSubmitMut = useMutation({
    mutationFn: ({ assessmentId, payload }) => assessmentApi.submitBulkMarks(assessmentId, payload),
    onSuccess: (res) => {
      const d = res?.data || {};
      invalidateAll();
      showToast(
        `Saved ${d.processedCount} student mark(s) (${d.entryStatus})`,
        'success'
      );
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Marks submission failed'), 'error')
  });

  const correctMut = useMutation({
    mutationFn: ({ markId, payload }) => assessmentApi.correctMark(markId, payload),
    onSuccess: () => {
      invalidateAll();
      showToast('Marks corrected and logged in AuditLog', 'success');
      setCorrectTarget(null);
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Correction failed'), 'error')
  });

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

  const validationErrors = useMemo(() => {
    const errs = {};
    const max = activeAssessment?.maxMarks ?? 100;
    for (const stu of roster) {
      const raw = marksInputs[stu.studentId];
      if (raw === undefined || raw === '') continue;
      const num = Number(raw);
      if (Number.isNaN(num) || num < 0) errs[stu.studentId] = 'Must be >= 0';
      else if (num > max) errs[stu.studentId] = `Exceeds max (${max})`;
    }
    return errs;
  }, [roster, marksInputs, activeAssessment?.maxMarks]);

  const isAssessmentLocked =
    activeAssessment && ['FINALIZED', 'PUBLISHED', 'CANCELLED'].includes(activeAssessment.status);

  const editableUnsavedRows = roster.filter(
    (s) => (!s.entryStatus || s.entryStatus === 'DRAFT') && marksInputs[s.studentId] !== undefined && marksInputs[s.studentId] !== ''
  );

  const handleBulkSave = (mode) => {
    if (Object.keys(validationErrors).length > 0) {
      showToast('Fix invalid marks values before saving', 'error');
      return;
    }

    const records = editableUnsavedRows.map((s) => ({
      studentId: s.studentId,
      marksObtained: Number(marksInputs[s.studentId]),
      remarks: remarksInputs[s.studentId] || ''
    }));

    if (records.length === 0) {
      showToast('No editable or newly entered marks to submit. Use Correct button on existing submitted rows.', 'warning');
      return;
    }

    bulkSubmitMut.mutate({
      assessmentId: activeAssessment._id,
      payload: {
        finalize: mode === 'FINALIZE',
        entryStatus: mode === 'DRAFT' ? 'DRAFT' : 'SUBMITTED',
        records
      }
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Internal Assessment & Marks Entry"
        description="Enter, review, and finalize student assessment marks for your assigned subjects."
        breadcrumbs={[{ label: 'Faculty', path: '/faculty/dashboard' }, { label: 'Internal Assessment' }]}
      />

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'entry', label: 'Marks Entry', icon: Award },
          { id: 'exams', label: 'Subject Examinations', icon: Calendar },
          { id: 'history', label: 'Entered Marks Ledger', icon: History }
        ]}
      />

      {/* TAB 1: MARKS ENTRY */}
      {activeTab === 'entry' && (
        <div className="space-y-5">
          {assessmentsQuery.isLoading ? (
            <LoadingSkeleton variant="card" count={2} />
          ) : assessmentsQuery.error ? (
            <ErrorState
              title="Unable to load assessments"
              message={extractApiErrorMessage(assessmentsQuery.error)}
              onRetry={assessmentsQuery.refetch}
            />
          ) : assessments.length === 0 ? (
            <EmptyState
              icon={Award}
              title="No internal assessment components available"
              description="No internal assessment components are configured for your assigned subjects yet."
            />
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <Select
                  label="Select Assessment Component (Authorized Subjects Only)"
                  placeholder={null}
                  value={selectedAssessmentId}
                  onChange={(e) => setSelectedAssessmentId(e.target.value)}
                  options={assessments.map((a) => ({
                    value: a._id,
                    label: `${a.subject?.code} · ${a.name} (${a.componentType} · Max ${a.maxMarks} · ${a.status})`
                  }))}
                />
                <input
                  type="text"
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  placeholder="Filter enrolled students by name or roll no..."
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
                />
              </div>

              {rosterQuery.isLoading ? (
                <LoadingSkeleton variant="table" count={4} />
              ) : rosterQuery.error ? (
                <ErrorState
                  title="Failed to load enrolled students"
                  message={extractApiErrorMessage(rosterQuery.error)}
                  onRetry={rosterQuery.refetch}
                />
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-slate-900">
                          {activeAssessment?.subject?.code} · {activeAssessment?.name}
                        </h3>
                        <Badge variant={getStatusBadgeVariant(activeAssessment?.status)}>
                          {activeAssessment?.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Max Marks: <strong>{activeAssessment?.maxMarks}</strong> · Enrolled Students:{' '}
                        <strong>{roster.length}</strong> · Entered:{' '}
                        <strong>{rosterData?.enteredCount ?? 0}</strong>
                      </p>
                    </div>
                  </div>

                  {roster.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">
                      No active students are enrolled in this subject and academic period.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                              Student & Enrollment
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                              Max
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                              Marks Obtained
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                              Remarks
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                              Status & Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {filteredRoster.map((stu) => {
                            const hasSubmitted = stu.entryStatus && stu.entryStatus !== 'DRAFT';
                            const inputDisabled = isAssessmentLocked || hasSubmitted;
                            const errMsg = validationErrors[stu.studentId];
                            return (
                              <tr key={stu.studentId} className="hover:bg-slate-50/70">
                                <td className="px-4 py-3">
                                  <p className="text-sm font-semibold text-slate-900">{stu.fullName}</p>
                                  <p className="text-xs font-mono text-slate-500">
                                    {stu.rollNumber} · {stu.enrollmentNumber}
                                  </p>
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                                  {activeAssessment?.maxMarks}
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    max={activeAssessment?.maxMarks}
                                    disabled={inputDisabled}
                                    value={marksInputs[stu.studentId] ?? ''}
                                    onChange={(e) =>
                                      setMarksInputs((p) => ({ ...p, [stu.studentId]: e.target.value }))
                                    }
                                    placeholder="0.00"
                                    className={`w-28 rounded-lg border px-2.5 py-1.5 text-sm font-semibold ${
                                      errMsg
                                        ? 'border-rose-400 bg-rose-50 text-rose-900'
                                        : 'border-slate-300 bg-white text-slate-900'
                                    } disabled:bg-slate-100`}
                                  />
                                  {errMsg && <p className="text-[11px] text-rose-600 mt-0.5">{errMsg}</p>}
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="text"
                                    disabled={inputDisabled}
                                    value={remarksInputs[stu.studentId] ?? ''}
                                    onChange={(e) =>
                                      setRemarksInputs((p) => ({ ...p, [stu.studentId]: e.target.value }))
                                    }
                                    placeholder="Optional remarks"
                                    className="w-full max-w-[180px] rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs disabled:bg-slate-100"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center space-x-2">
                                    <Badge variant={stu.entryStatus ? getStatusBadgeVariant(stu.entryStatus) : 'neutral'}>
                                      {stu.entryStatus || 'NOT ENTERED'}
                                    </Badge>
                                    {hasSubmitted && !isAssessmentLocked && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCorrectTarget(stu);
                                          correctForm.reset({
                                            marksObtained: Number(stu.marksObtained || 0),
                                            remarks: stu.remarks || '',
                                            reason: ''
                                          });
                                        }}
                                        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"
                                        title="Controlled marks correction"
                                      >
                                        <Edit3 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {!isAssessmentLocked && roster.length > 0 && (
                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-end gap-2.5">
                      <Button
                        variant="outline"
                        icon={Save}
                        isLoading={bulkSubmitMut.isPending}
                        onClick={() => handleBulkSave('DRAFT')}
                      >
                        Save Draft
                      </Button>
                      <Button
                        variant="secondary"
                        isLoading={bulkSubmitMut.isPending}
                        onClick={() => handleBulkSave('SUBMIT')}
                      >
                        Submit Marks
                      </Button>
                      <Button
                        icon={CheckCircle2}
                        isLoading={bulkSubmitMut.isPending}
                        onClick={() => handleBulkSave('FINALIZE')}
                      >
                        Submit & Finalize
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 2: ASSIGNED EXAMINATIONS */}
      {activeTab === 'exams' && (
        <DataTable
          columns={[
            {
              key: 'title',
              label: 'Examination',
              render: (r) => (
                <div>
                  <p className="font-semibold text-slate-900">{r.title}</p>
                  <p className="text-xs text-slate-500">
                    {r.examType?.replace(/_/g, ' ')} · Max {r.maxMarks} Marks
                  </p>
                </div>
              )
            },
            {
              key: 'subject',
              label: 'Subject',
              render: (r) => (
                <span className="font-medium text-slate-800">
                  {r.subject?.code} - {r.subject?.name}
                </span>
              )
            },
            {
              key: 'examDate',
              label: 'Date',
              render: (r) => <span className="text-xs font-medium">{formatDate(r.examDate)}</span>
            },
            {
              key: 'status',
              label: 'Status',
              render: (r) => <Badge variant={getStatusBadgeVariant(r.status)}>{r.status}</Badge>
            }
          ]}
          data={examsQuery.data?.data?.examinations || []}
          isLoading={examsQuery.isLoading}
          searchable={false}
          pagination={false}
          emptyTitle="No examinations for your subjects"
          emptyDescription="Scheduled examinations for your assigned subjects will appear here."
        />
      )}

      {/* TAB 3: ENTERED MARKS LEDGER */}
      {activeTab === 'history' && (
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
              key: 'assessment',
              label: 'Component & Subject',
              render: (r) => (
                <div>
                  <p className="font-medium text-slate-900">{r.assessment?.name}</p>
                  <p className="text-xs text-slate-500">{r.subject?.code}</p>
                </div>
              )
            },
            {
              key: 'marks',
              label: 'Score',
              render: (r) => (
                <span className="font-bold text-slate-900">
                  {r.marksObtained} / {r.maxMarks}
                </span>
              )
            },
            {
              key: 'entryStatus',
              label: 'Status',
              render: (r) => <Badge variant={getStatusBadgeVariant(r.entryStatus)}>{r.entryStatus}</Badge>
            },
            {
              key: 'audit',
              label: 'Correction Note',
              render: (r) => <span className="text-xs text-slate-500">{r.lastCorrectionReason || r.remarks || '—'}</span>
            }
          ]}
          data={marksHistoryQuery.data?.data?.marks || []}
          isLoading={marksHistoryQuery.isLoading}
          serverSide
          searchValue={histSearch}
          onSearchChange={(val) => {
            setHistSearch(val);
            setHistPage(1);
          }}
          searchPlaceholder="Search student or subject..."
          currentPage={marksHistoryQuery.data?.meta?.pagination?.page || 1}
          totalPages={marksHistoryQuery.data?.meta?.pagination?.totalPages || 1}
          totalRecords={marksHistoryQuery.data?.meta?.pagination?.totalRecords || 0}
          pageSize={12}
          onPageChange={setHistPage}
          emptyTitle="No marks entered yet"
          emptyDescription="Use the Marks Entry tab to enter and submit assessment scores."
        />
      )}

      {/* CORRECTION MODAL */}
      <Modal
        isOpen={!!correctTarget}
        onClose={() => setCorrectTarget(null)}
        title="Correct Assessment Marks"
        subtitle={
          correctTarget
            ? `${correctTarget.fullName} (${correctTarget.rollNumber}) · Max ${activeAssessment?.maxMarks}`
            : ''
        }
        maxWidth="max-w-md"
      >
        <form
          onSubmit={correctForm.handleSubmit((vals) =>
            correctMut.mutate({
              markId: correctTarget.markId,
              payload: {
                marksObtained: Number(vals.marksObtained),
                remarks: vals.remarks || '',
                reason: vals.reason
              }
            })
          )}
          className="space-y-4"
        >
          <Input
            label={`Marks Obtained (0 – ${activeAssessment?.maxMarks ?? 100})`}
            type="number"
            step="0.01"
            min={0}
            max={activeAssessment?.maxMarks ?? 500}
            required
            {...correctForm.register('marksObtained')}
            error={correctForm.formState.errors.marksObtained?.message}
          />
          <Input label="Remarks" {...correctForm.register('remarks')} />
          <Textarea
            label="Audit Reason for Correction"
            required
            placeholder="Mandatory explanation recorded in audit trail..."
            {...correctForm.register('reason')}
            error={correctForm.formState.errors.reason?.message}
          />
          <div className="flex justify-end space-x-2.5">
            <Button type="button" variant="outline" onClick={() => setCorrectTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={correctMut.isPending}>
              Save Correction
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FacultyAssessmentPage;
