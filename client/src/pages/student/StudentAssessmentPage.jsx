import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../../components/layout/PageHeader';
import Tabs from '../../components/common/Tabs';
import StatCard from '../../components/data/StatCard';
import DataTable from '../../components/data/DataTable';
import Badge from '../../components/common/Badge';
import LoadingSkeleton from '../../components/data/LoadingSkeleton';
import ErrorState from '../../components/data/ErrorState';
import EmptyState from '../../components/data/EmptyState';
import { assessmentApi, examinationApi } from '../../services/managementService';
import { extractApiErrorMessage, formatDate, getStatusBadgeVariant } from '../../utils/formSchemas';
import { Award, Calendar, BookOpen, CheckCircle2 } from 'lucide-react';

export const StudentAssessmentPage = () => {
  const [activeTab, setActiveTab] = useState('marks');

  const marksQuery = useQuery({
    queryKey: ['student-published-assessments'],
    queryFn: () => assessmentApi.getMyPublishedMarks()
  });

  const examsQuery = useQuery({
    queryKey: ['student-examinations'],
    queryFn: () => examinationApi.list({ limit: 50 }),
    enabled: activeTab === 'exams'
  });

  const data = marksQuery.data?.data || {};
  const marks = data.marks || [];
  const subjectSummaries = data.subjectSummaries || [];

  const totalObtainedAll = subjectSummaries.reduce((acc, s) => acc + s.totalObtained, 0);
  const totalMaxAll = subjectSummaries.reduce((acc, s) => acc + s.totalMax, 0);

  if (marksQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Examinations & Internal Assessment" description="Loading your published marks..." />
        <LoadingSkeleton variant="card" count={3} />
        <LoadingSkeleton variant="table" count={4} />
      </div>
    );
  }

  if (marksQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Examinations & Internal Assessment" description="View your published internal assessment marks." />
        <ErrorState
          title="Unable to load assessment records"
          message={extractApiErrorMessage(marksQuery.error)}
          onRetry={marksQuery.refetch}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Examinations & Internal Assessment"
        description="View published internal assessment scores and scheduled examinations for your enrolled subjects."
        breadcrumbs={[{ label: 'Student Portal', path: '/student/dashboard' }, { label: 'Assessments' }]}
      />

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'marks', label: 'Published Internal Marks', icon: Award },
          { id: 'exams', label: 'Examination Schedule', icon: Calendar }
        ]}
      />

      {activeTab === 'marks' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatCard
              title="Published Components"
              value={marks.length}
              icon={Award}
              color="indigo"
              subtitle="Released for student viewing"
            />
            <StatCard
              title="Subjects Assessed"
              value={subjectSummaries.length}
              icon={BookOpen}
              color="sky"
              subtitle="Subjects with published scores"
            />
            <StatCard
              title="Aggregate Internal Total"
              value={totalMaxAll > 0 ? `${totalObtainedAll} / ${totalMaxAll}` : 'No Data'}
              icon={CheckCircle2}
              color="emerald"
              subtitle="Sum across published components"
            />
          </div>

          {subjectSummaries.length === 0 ? (
            <EmptyState
              icon={Award}
              title="No published internal assessment marks yet"
              description="Assessment scores become visible here once your faculty and administration publish them."
            />
          ) : (
            <div className="space-y-4">
              {subjectSummaries.map((group) => (
                <div
                  key={group.subject?._id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700 mr-2">
                        {group.subject?.code}
                      </span>
                      <span className="text-base font-bold text-slate-900">{group.subject?.name}</span>
                    </div>
                    <Badge variant="success">
                      Total: {group.totalObtained} / {group.totalMax}
                    </Badge>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {group.components.map((comp) => (
                      <div key={comp._id} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                        <div>
                          <p className="font-semibold text-slate-800">{comp.assessment?.name}</p>
                          <p className="text-xs text-slate-500">
                            {comp.assessment?.componentType?.replace(/_/g, ' ')}
                            {comp.assessment?.assessmentDate ? ` · ${formatDate(comp.assessment.assessmentDate)}` : ''}
                            {comp.remarks ? ` · Note: ${comp.remarks}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="font-bold text-slate-900">
                            {comp.marksObtained} / {comp.maxMarks}
                          </span>
                          <Badge variant={getStatusBadgeVariant(comp.assessment?.status)}>
                            {comp.assessment?.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
              label: 'Date & Time',
              render: (r) => (
                <div className="text-xs">
                  <p className="font-semibold text-slate-800">{formatDate(r.examDate)}</p>
                  <p className="text-slate-500">
                    {r.startTime && r.endTime ? `${r.startTime} – ${r.endTime}` : 'Scheduled'}
                  </p>
                </div>
              )
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
          emptyTitle="No scheduled examinations yet"
          emptyDescription="Examinations scheduled for your enrolled subjects will appear here."
        />
      )}
    </div>
  );
};

export default StudentAssessmentPage;
