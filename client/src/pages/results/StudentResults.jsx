import React from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../../components/layout/PageHeader';
import StatCard from '../../components/data/StatCard';
import Badge from '../../components/common/Badge';
import LoadingSkeleton from '../../components/data/LoadingSkeleton';
import ErrorState from '../../components/data/ErrorState';
import EmptyState from '../../components/data/EmptyState';
import { resultApi } from '../../services/managementService';
import { extractApiErrorMessage, getStatusBadgeVariant } from '../../utils/formSchemas';
import { Award, BookOpen, CheckCircle2, FileCheck2 } from 'lucide-react';

export const StudentResults = () => {
  const resultsQuery = useQuery({
    queryKey: ['student-published-results'],
    queryFn: () => resultApi.getMyResults()
  });

  if (resultsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Semester Academic Results" description="Loading your published results..." />
        <LoadingSkeleton variant="card" count={3} />
        <LoadingSkeleton variant="table" count={4} />
      </div>
    );
  }

  if (resultsQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Semester Academic Results" description="Published examination results and grade summary." />
        <ErrorState
          title="Unable to load results"
          message={extractApiErrorMessage(resultsQuery.error)}
          onRetry={resultsQuery.refetch}
        />
      </div>
    );
  }

  const data = resultsQuery.data?.data || {};
  const student = data.student || null;
  const results = data.results || [];
  const semesterSummaries = data.semesterSummaries || [];
  const latestSem = semesterSummaries[0] || null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Published Academic Results"
        description="Official published semester results generated under approved institutional grading policy."
        breadcrumbs={[{ label: 'Student Portal', path: '/student/dashboard' }, { label: 'My Results' }]}
      />

      {student && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Candidate Particulars</p>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              {student.firstName} {student.lastName} · Roll No: {student.rollNumber}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {student.department?.name || 'Department'} {student.course?.code ? `· ${student.course.code}` : ''}
            </p>
          </div>
          {latestSem && latestSem.sgpa !== null && (
            <div className="flex items-center space-x-3 bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-3">
              <Award className="w-7 h-7 text-indigo-600 shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-indigo-900 uppercase">
                  Sem {latestSem.semester?.semesterNumber ?? ''} SGPA
                </p>
                <p className="text-2xl font-extrabold text-indigo-700">{latestSem.sgpa}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Published Subjects"
          value={results.length}
          icon={BookOpen}
          color="indigo"
          subtitle="Subjects with released grades"
        />
        <StatCard
          title="Latest Term Score"
          value={latestSem ? `${latestSem.totalMarksObtained} / ${latestSem.totalMaxMarks}` : 'No Data'}
          icon={FileCheck2}
          color="sky"
          subtitle={latestSem ? `${latestSem.percentage}% overall` : 'Awaiting publication'}
        />
        <StatCard
          title="Term Status"
          value={latestSem?.overallStatus || 'Unpublished'}
          icon={CheckCircle2}
          color={latestSem?.failedCount > 0 ? 'rose' : 'emerald'}
          subtitle={data.cgpaNote || 'SGPA reflects published credits'}
        />
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No published results available yet"
          description="Your official subject marks and grades will appear here once approved and published by administration."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase">Code & Subject</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Credits</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Internal</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">External</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Total / Max</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Grade</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-900">
                        <span className="font-mono text-xs text-brand-700 mr-1.5">{r.subject?.code}</span>
                        {r.subject?.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {r.examination?.title} · Sem {r.semester?.semesterNumber} ({r.academicYear})
                      </p>
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-slate-700">{r.subject?.credits ?? '—'}</td>
                    <td className="px-4 py-4 text-center text-sm text-slate-700">
                      {r.internalMarks} / {r.internalMaxMarks}
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-slate-700">
                      {r.externalMarks} / {r.externalMaxMarks}
                    </td>
                    <td className="px-4 py-4 text-center text-sm font-bold text-slate-900">
                      {r.totalMarks} / {r.maxMarks} ({r.percentage}%)
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {r.grade} ({r.gradePoints})
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Badge variant={getStatusBadgeVariant(r.resultStatus)}>{r.resultStatus}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentResults;
