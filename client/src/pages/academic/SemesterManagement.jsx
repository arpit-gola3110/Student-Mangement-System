import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import PageHeader from '../../components/layout/PageHeader';
import DataTable from '../../components/data/DataTable';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { useToast } from '../../context/ToastContext';
import { semesterApi, academicLookupApi } from '../../services/managementService';
import {
  extractApiErrorMessage,
  formatDate,
  SEMESTER_STATUS_OPTIONS,
  getStatusBadgeVariant
} from '../../utils/formSchemas';
import { Calendar, Plus, Eye, Edit3, Power, Layers, ShieldAlert } from 'lucide-react';

const createSemesterFormSchema = z
  .object({
    course: z.string().min(1, 'Course is required'),
    semesterNumber: z.coerce.number().int().min(1, 'Min semester is 1').max(16, 'Max semester is 16'),
    academicYear: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{4}$/, 'Academic year must use YYYY-YYYY format (e.g., 2026-2027)'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    status: z.enum(['UPCOMING', 'ACTIVE', 'COMPLETED']).default('UPCOMING'),
    isActive: z.enum(['true', 'false']).default('true')
  })
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: 'End date must be later than start date',
    path: ['endDate']
  });

const editSemesterFormSchema = z
  .object({
    semesterNumber: z.coerce.number().int().min(1).max(16),
    academicYear: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{4}$/, 'Academic year must use YYYY-YYYY format'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    status: z.enum(['UPCOMING', 'ACTIVE', 'COMPLETED']),
    isActive: z.enum(['true', 'false'])
  })
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: 'End date must be later than start date',
    path: ['endDate']
  });

export const SemesterManagement = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [semNumFilter, setSemNumFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('semesterNumber');
  const [sortOrder, setSortOrder] = useState('asc');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSemester, setEditingSemester] = useState(null);
  const [viewingSemesterId, setViewingSemesterId] = useState(null);
  const [statusConfirmSemester, setStatusConfirmSemester] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const semestersQuery = useQuery({
    queryKey: [
      'semesters',
      'list',
      {
        page,
        limit: 10,
        search: debouncedSearch,
        course: courseFilter,
        semesterNumber: semNumFilter,
        academicYear: yearFilter,
        status: statusFilter,
        sortBy,
        sortOrder
      }
    ],
    queryFn: () =>
      semesterApi.list({
        page,
        limit: 10,
        search: debouncedSearch,
        course: courseFilter,
        semesterNumber: semNumFilter,
        academicYear: yearFilter,
        status: statusFilter,
        sortBy,
        sortOrder
      })
  });

  const semesterDetailQuery = useQuery({
    queryKey: ['semester', viewingSemesterId],
    queryFn: () => semesterApi.getById(viewingSemesterId),
    enabled: Boolean(viewingSemesterId)
  });

  const activeCoursesQuery = useQuery({
    queryKey: ['courses', 'active-all'],
    queryFn: () => academicLookupApi.getCourses({ isActive: true })
  });

  const allCoursesQuery = useQuery({
    queryKey: ['courses', 'all-filter'],
    queryFn: () => academicLookupApi.getCourses({ isActive: '' })
  });

  const createForm = useForm({
    resolver: zodResolver(createSemesterFormSchema),
    defaultValues: {
      course: '',
      semesterNumber: 1,
      academicYear: '2026-2027',
      startDate: '',
      endDate: '',
      status: 'UPCOMING',
      isActive: 'true'
    }
  });

  const editForm = useForm({
    resolver: zodResolver(editSemesterFormSchema)
  });

  useEffect(() => {
    if (editingSemester) {
      editForm.reset({
        semesterNumber: editingSemester.semesterNumber || 1,
        academicYear: editingSemester.academicYear || '2026-2027',
        startDate: editingSemester.startDate ? new Date(editingSemester.startDate).toISOString().split('T')[0] : '',
        endDate: editingSemester.endDate ? new Date(editingSemester.endDate).toISOString().split('T')[0] : '',
        status: editingSemester.status || 'UPCOMING',
        isActive: editingSemester.isActive !== false ? 'true' : 'false'
      });
    }
  }, [editingSemester, editForm]);

  const createMutation = useMutation({
    mutationFn: (payload) => semesterApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
      showToast('Semester created successfully', 'success');
      createForm.reset();
      setIsCreateOpen(false);
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Failed to create semester'), 'error')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => semesterApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
      queryClient.invalidateQueries({ queryKey: ['semester'] });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      showToast('Semester updated successfully', 'success');
      setEditingSemester(null);
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Failed to update semester'), 'error')
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }) => semesterApi.updateStatus(id, { isActive }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
      queryClient.invalidateQueries({ queryKey: ['semester'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
      showToast(res?.message || 'Semester status updated', 'success');
      setStatusConfirmSemester(null);
    },
    onError: (err) => {
      showToast(extractApiErrorMessage(err, 'Failed to update semester status'), 'error');
      setStatusConfirmSemester(null);
    }
  });

  const semesters = semestersQuery.data?.data || [];
  const pagination = semestersQuery.data?.meta?.pagination || { page: 1, totalPages: 1, totalRecords: 0 };

  const activeCourseOpts = (activeCoursesQuery.data?.data || []).map((c) => ({
    value: c._id,
    label: `${c.code} — ${c.name} (Max ${c.totalSemesters} Sems)`
  }));
  const filterCourseOpts = (allCoursesQuery.data?.data || []).map((c) => ({
    value: c._id,
    label: `${c.code} — ${c.name}`
  }));

  const columns = [
    {
      header: 'Semester',
      accessor: 'semesterNumber',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-md">
          SEM {row.semesterNumber}
        </span>
      )
    },
    {
      header: 'Course',
      accessor: 'course',
      sortable: false,
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900 text-sm">{row.course?.name || '—'}</p>
          <p className="text-xs text-slate-500 font-mono">{row.course?.code || '—'}</p>
        </div>
      )
    },
    {
      header: 'Academic Year',
      accessor: 'academicYear',
      render: (row) => <span className="text-xs font-mono font-semibold text-slate-700">{row.academicYear}</span>
    },
    {
      header: 'Term Window',
      accessor: 'startDate',
      render: (row) => (
        <span className="text-xs text-slate-600">
          {formatDate(row.startDate)} – {formatDate(row.endDate)}
        </span>
      )
    },
    {
      header: 'Subjects',
      accessor: 'subjectCount',
      sortable: false,
      render: (row) => (
        <span className="inline-flex items-center text-xs text-slate-600">
          <Layers className="w-3.5 h-3.5 mr-1 text-slate-400" /> {row.subjectCount ?? 0}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'isActive',
      render: (row) => (
        <div className="flex items-center space-x-1.5">
          <Badge variant={getStatusBadgeVariant(row.isActive)} dot size="sm">
            {row.isActive ? 'ACTIVE' : 'INACTIVE'}
          </Badge>
          <Badge variant={getStatusBadgeVariant(row.status)} size="sm">
            {row.status}
          </Badge>
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: 'actions',
      sortable: false,
      align: 'right',
      render: (row) => (
        <div className="inline-flex items-center space-x-1">
          <Button variant="ghost" size="sm" onClick={() => setViewingSemesterId(row._id)} title="View details">
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditingSemester(row)} title="Edit semester">
            <Edit3 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatusConfirmSemester(row)}
            title={row.isActive ? 'Deactivate semester' : 'Activate semester'}
            className={row.isActive ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}
          >
            <Power className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  const toolbarExtras = (
    <>
      <select
        aria-label="Filter by course"
        value={courseFilter}
        onChange={(e) => {
          setCourseFilter(e.target.value);
          setPage(1);
        }}
        className="text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700"
      >
        <option value="">All Courses</option>
        {filterCourseOpts.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by semester number"
        value={semNumFilter}
        onChange={(e) => {
          setSemNumFilter(e.target.value);
          setPage(1);
        }}
        className="text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700"
      >
        <option value="">All Numbers</option>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
          <option key={n} value={n}>
            Sem {n}
          </option>
        ))}
      </select>

      <input
        type="text"
        aria-label="Filter by academic year"
        value={yearFilter}
        onChange={(e) => {
          setYearFilter(e.target.value);
          setPage(1);
        }}
        placeholder="Year (e.g. 2026-2027)"
        className="w-36 text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700"
      />

      <select
        aria-label="Filter by status"
        value={statusFilter}
        onChange={(e) => {
          setStatusFilter(e.target.value);
          setPage(1);
        }}
        className="text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700"
      >
        <option value="">All Statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="UPCOMING">Upcoming</option>
        <option value="ACTIVE">In Progress</option>
        <option value="COMPLETED">Completed</option>
      </select>
    </>
  );

  const viewedSemester = semesterDetailQuery.data?.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Semester Management"
        subtitle="Configure academic calendar cycles, term dates, and course-specific semester cohorts."
        actions={
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => {
              createForm.reset();
              setIsCreateOpen(true);
            }}
          >
            Add Semester
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={semesters}
        isLoading={semestersQuery.isLoading}
        error={semestersQuery.error}
        onRetry={semestersQuery.refetch}
        serverSide
        searchPlaceholder="Search by course name, code or academic year..."
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        sortColumn={sortBy}
        sortDirection={sortOrder}
        onSortChange={(col, dir) => {
          setSortBy(col);
          setSortOrder(dir);
          setPage(1);
        }}
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalRecords={pagination.totalRecords ?? pagination.total}
        pageSize={10}
        onPageChange={setPage}
        toolbarExtras={toolbarExtras}
        emptyTitle="No semesters configured"
        emptyDescription="Create a semester term for an active course or adjust your filters."
      />

      {/* ADD SEMESTER MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => !createMutation.isPending && setIsCreateOpen(false)}
        title="Add Academic Semester"
        subtitle="Define a semester term bounded to an active degree course."
      >
        <form
          onSubmit={createForm.handleSubmit((vals) =>
            createMutation.mutate({ ...vals, isActive: vals.isActive === 'true' })
          )}
          className="space-y-4"
        >
          <Select
            label="Course"
            required
            placeholder="Select active course"
            options={activeCourseOpts}
            error={createForm.formState.errors.course?.message}
            {...createForm.register('course')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Semester Number"
              type="number"
              required
              error={createForm.formState.errors.semesterNumber?.message}
              {...createForm.register('semesterNumber')}
            />
            <Input
              label="Academic Year"
              placeholder="2026-2027"
              required
              error={createForm.formState.errors.academicYear?.message}
              {...createForm.register('academicYear')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              required
              error={createForm.formState.errors.startDate?.message}
              {...createForm.register('startDate')}
            />
            <Input
              label="End Date"
              type="date"
              required
              error={createForm.formState.errors.endDate?.message}
              {...createForm.register('endDate')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Term Lifecycle"
              required
              placeholder={null}
              options={SEMESTER_STATUS_OPTIONS}
              {...createForm.register('status')}
            />
            <Select
              label="Availability"
              required
              placeholder={null}
              options={[
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' }
              ]}
              {...createForm.register('isActive')}
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2.5">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={createMutation.isPending} disabled={createMutation.isPending}>
              Create Semester
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT SEMESTER MODAL */}
      <Modal
        isOpen={Boolean(editingSemester)}
        onClose={() => !updateMutation.isPending && setEditingSemester(null)}
        title="Edit Semester"
        subtitle={
          editingSemester
            ? `${editingSemester.course?.code || ''} • Semester ${editingSemester.semesterNumber} (${editingSemester.academicYear})`
            : ''
        }
      >
        <form
          onSubmit={editForm.handleSubmit((vals) =>
            updateMutation.mutate({
              id: editingSemester._id,
              payload: { ...vals, isActive: vals.isActive === 'true' }
            })
          )}
          className="space-y-4"
        >
          <Input
            label="Course (Locked)"
            value={editingSemester ? `${editingSemester.course?.code || ''} — ${editingSemester.course?.name || ''}` : ''}
            disabled
            helperText="Semesters cannot be reassigned to a different course."
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Semester Number"
              type="number"
              required
              error={editForm.formState.errors.semesterNumber?.message}
              {...editForm.register('semesterNumber')}
            />
            <Input
              label="Academic Year"
              required
              error={editForm.formState.errors.academicYear?.message}
              {...editForm.register('academicYear')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              required
              error={editForm.formState.errors.startDate?.message}
              {...editForm.register('startDate')}
            />
            <Input
              label="End Date"
              type="date"
              required
              error={editForm.formState.errors.endDate?.message}
              {...editForm.register('endDate')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Term Lifecycle"
              required
              placeholder={null}
              options={SEMESTER_STATUS_OPTIONS}
              {...editForm.register('status')}
            />
            <Select
              label="Availability"
              required
              placeholder={null}
              options={[
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' }
              ]}
              {...editForm.register('isActive')}
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2.5">
            <Button variant="outline" onClick={() => setEditingSemester(null)} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={updateMutation.isPending} disabled={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal
        isOpen={Boolean(viewingSemesterId)}
        onClose={() => setViewingSemesterId(null)}
        title="Semester Details"
        subtitle="Term calendar dates and linked curriculum summary."
      >
        {semesterDetailQuery.isLoading ? (
          <div className="py-8 text-center text-sm text-slate-500">Loading semester details...</div>
        ) : viewedSemester ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-brand-700 bg-brand-100 px-2 py-0.5 rounded">
                    SEM {viewedSemester.semesterNumber}
                  </span>
                  <Badge variant={getStatusBadgeVariant(viewedSemester.isActive)} dot size="sm">
                    {viewedSemester.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                  <Badge variant={getStatusBadgeVariant(viewedSemester.status)} size="sm">
                    {viewedSemester.status}
                  </Badge>
                </div>
                <h4 className="text-base font-bold text-slate-900 mt-2">{viewedSemester.course?.name || '—'}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Academic Year: {viewedSemester.academicYear} • {formatDate(viewedSemester.startDate)} to{' '}
                  {formatDate(viewedSemester.endDate)}
                </p>
              </div>
              <Calendar className="w-6 h-6 text-slate-400 shrink-0" />
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl border border-slate-200">
                <p className="text-lg font-extrabold text-slate-900">{viewedSemester.subjectCount ?? 0}</p>
                <p className="text-[11px] text-slate-500 uppercase font-semibold">Subjects</p>
              </div>
              <div className="p-3 rounded-xl border border-slate-200">
                <p className="text-lg font-extrabold text-slate-900">{viewedSemester.studentCount ?? 0}</p>
                <p className="text-[11px] text-slate-500 uppercase font-semibold">Students</p>
              </div>
              <div className="p-3 rounded-xl border border-slate-200">
                <p className="text-lg font-extrabold text-slate-900">{viewedSemester.examinationCount ?? 0}</p>
                <p className="text-[11px] text-slate-500 uppercase font-semibold">Exams</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start space-x-2 text-xs text-amber-800">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Deactivating a semester hides it from new enrollments and subject assignments while preserving all historical data.
              </span>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* STATUS CONFIRMATION */}
      <ConfirmDialog
        isOpen={Boolean(statusConfirmSemester)}
        onClose={() => !statusMutation.isPending && setStatusConfirmSemester(null)}
        onConfirm={() =>
          statusMutation.mutate({
            id: statusConfirmSemester._id,
            isActive: !statusConfirmSemester.isActive
          })
        }
        title={statusConfirmSemester?.isActive ? 'Deactivate Semester' : 'Activate Semester'}
        message={
          statusConfirmSemester?.isActive
            ? `Deactivate Semester ${statusConfirmSemester?.semesterNumber} (${statusConfirmSemester?.academicYear})? Historical subjects and enrollments will remain preserved.`
            : `Restore active status for Semester ${statusConfirmSemester?.semesterNumber} (${statusConfirmSemester?.academicYear})?`
        }
        confirmText={statusConfirmSemester?.isActive ? 'Deactivate' : 'Activate'}
        variant={statusConfirmSemester?.isActive ? 'danger' : 'warning'}
        isLoading={statusMutation.isPending}
      />
    </div>
  );
};

export default SemesterManagement;
