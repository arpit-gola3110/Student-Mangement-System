import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../../components/layout/PageHeader';
import DataTable from '../../components/data/DataTable';
import Badge from '../../components/common/Badge';
import { resultApi } from '../../services/managementService';
import { extractApiErrorMessage, getStatusBadgeVariant } from '../../utils/formSchemas';

export const FacultyResultsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const resultsQuery = useQuery({
    queryKey: ['faculty-results-overview'],
    queryFn: () => resultApi.getFacultyOverview()
  });

  const rows = (resultsQuery.data?.data?.results || []).filter((r) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (r.student?.rollNumber || '').toLowerCase().includes(q) ||
      `${r.student?.firstName || ''} ${r.student?.lastName || ''}`.toLowerCase().includes(q) ||
      (r.subject?.code || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subject Results Overview"
        description="Read-only academic result summary for your actively assigned subjects."
        breadcrumbs={[{ label: 'Faculty Portal', path: '/faculty/dashboard' }, { label: 'Results' }]}
      />

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
            label: 'Subject',
            render: (r) => (
              <span className="font-medium text-slate-800">
                {r.subject?.code} - {r.subject?.name}
              </span>
            )
          },
          {
            key: 'marks',
            label: 'Int / Ext / Total',
            render: (r) => (
              <span className="font-semibold text-slate-900">
                {r.internalMarks} + {r.externalMarks} = {r.totalMarks}/{r.maxMarks} ({r.percentage}%)
              </span>
            )
          },
          {
            key: 'grade',
            label: 'Grade',
            render: (r) => (
              <div className="flex items-center space-x-1.5">
                <span className="font-mono text-xs font-bold">{r.grade}</span>
                <Badge variant={getStatusBadgeVariant(r.resultStatus)}>{r.resultStatus}</Badge>
              </div>
            )
          },
          {
            key: 'publicationStatus',
            label: 'Publication',
            render: (r) => <Badge variant={getStatusBadgeVariant(r.publicationStatus)}>{r.publicationStatus}</Badge>
          }
        ]}
        data={rows}
        isLoading={resultsQuery.isLoading}
        error={resultsQuery.error ? extractApiErrorMessage(resultsQuery.error) : null}
        onRetry={resultsQuery.refetch}
        searchable
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Filter by student roll no or subject code..."
        emptyTitle="No calculated results for your subjects yet"
        emptyDescription="Calculated and published results for your assigned subjects will appear here."
      />
    </div>
  );
};

export default FacultyResultsPage;
