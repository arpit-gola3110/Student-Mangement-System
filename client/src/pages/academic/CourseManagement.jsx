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
import Textarea from '../../components/common/Textarea';
import { useToast } from '../../context/ToastContext';
import { courseApi, academicLookupApi } from '../../services/managementService';
import { extractApiErrorMessage, formatDate, getStatusBadgeVariant } from '../../utils/formSchemas';
import { BookOpen, Plus, Eye, Edit3, Power, GraduationCap, Calendar, ShieldAlert } from 'lucide-react';

const courseFormSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'Course code must be at least 2 characters')
    .max(30)
    .regex(/^[A-Z0-9_-]+$/, 'Only letters, numbers, hyphens, and underscores allowed'),
  name: z.string().trim().min(3, 'Course name must be at least 3 characters').max(150),
  department: z.string().min(1, 'Department is required'),
  durationYears: z.coerce.number().int().min(1, 'Min 1 year').max(8, 'Max 8 years'),
  totalSemesters: z.coerce.number().int().min(1, 'Min 1 semester').max(16, 'Max 16 semesters'),
  description: z.string().trim().max(500).optional().default(''),
  isActive: z.enum(['true', 'false']).default('true')
});

export const CourseManagement = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [viewingCourseId, setViewingCourseId] = useState(null);
  const [statusConfirmCourse, setStatusConfirmCourse] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const coursesQuery = useQuery({
    queryKey: ['courses', 'list', { page, limit: 10, search: debouncedSearch, department: deptFilter, status: statusFilter, sortBy, sortOrder }],
    queryFn: () =>
      courseApi.list({
        page,
        limit: 10,
        search: debouncedSearch,
        department: deptFilter,
        status: statusFilter,
        sortBy,
        sortOrder
      })
  });

  const courseDetailQuery = useQuery({
    queryKey: ['course', viewingCourseId],
    queryFn: () => courseApi.getById(viewingCourseId),
    enabled: Boolean(viewingCourseId)
  });

  const activeDeptsQuery = useQuery({
    queryKey: ['departments', 'active'],
    queryFn: () => academicLookupApi.getDepartments({ isActive: true })
  });

  const allDeptsQuery = useQuery({
    queryKey: ['departments', 'all-filter'],
    queryFn: () => academicLookupApi.getDepartments({})
  });

  const createForm = useForm({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      code: '',
      name: '',
      department: '',
      durationYears: 4,
      totalSemesters: 8,
      description: '',
      isActive: 'true'
    }
  });

  const editForm = useForm({
    resolver: zodResolver(courseFormSchema)
  });

  useEffect(() => {
    if (editingCourse) {
      editForm.reset({
        code: editingCourse.code || '',
        name: editingCourse.name || '',
        department: editingCourse.department?._id || editingCourse.department || '',
        durationYears: editingCourse.durationYears || 4,
        totalSemesters: editingCourse.totalSemesters || 8,
        description: editingCourse.description || '',
        isActive: editingCourse.isActive !== false ? 'true' : 'false'
      });
    }
  }, [editingCourse, editForm]);

  const createMutation = useMutation({
    mutationFn: (payload) => courseApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
      showToast('Course created successfully', 'success');
      createForm.reset();
      setIsCreateOpen(false);
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Failed to create course'), 'error')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => courseApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['course'] });
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
      showToast('Course updated successfully', 'success');
      setEditingCourse(null);
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Failed to update course'), 'error')
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }) => courseApi.updateStatus(id, isActive),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['course'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
      showToast(res?.message || 'Course status updated', 'success');
      setStatusConfirmCourse(null);
    },
    onError: (err) => {
      showToast(extractApiErrorMessage(err, 'Failed to update course status'), 'error');
      setStatusConfirmCourse(null);
    }
  });

  const courses = coursesQuery.data?.data || [];
  const pagination = coursesQuery.data?.meta?.pagination || { page: 1, totalPages: 1, totalRecords: 0 };
  const activeDeptOpts = (activeDeptsQuery.data?.data || []).map((d) => ({ value: d._id, label: `${d.code} — ${d.name}` }));
  const filterDeptOpts = (allDeptsQuery.data?.data || []).map((d) => ({ value: d._id, label: `${d.code} — ${d.name}` }));

  const columns = [
    {
      header: 'Code',
      accessor: 'code',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-md">
          {row.code}
        </span>
      )
    },
    {
      header: 'Course Name',
      accessor: 'name',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900 text-sm">{row.name}</p>
          <p className="text-xs text-slate-500">{row.department?.name || '—'}</p>
        </div>
      )
    },
    {
      header: 'Duration',
      accessor: 'durationYears',
      render: (row) => (
        <span className="text-xs text-slate-700 font-medium">
          {row.durationYears} Yrs / {row.totalSemesters} Sems
        </span>
      )
    },
    {
      header: 'Semesters / Students',
      accessor: 'studentCount',
      sortable: false,
      render: (row) => (
        <div className="flex items-center space-x-3 text-xs text-slate-600">
          <span className="inline-flex items-center" title="Configured Semesters">
            <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" /> {row.semesterCount ?? 0}
          </span>
          <span className="inline-flex items-center" title="Enrolled Students">
            <GraduationCap className="w-3.5 h-3.5 mr-1 text-slate-400" /> {row.studentCount ?? 0}
          </span>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'isActive',
      render: (row) => (
        <Badge variant={getStatusBadgeVariant(row.isActive)} dot size="sm">
          {row.isActive ? 'ACTIVE' : 'INACTIVE'}
        </Badge>
      )
    },
    {
      header: 'Actions',
      accessor: 'actions',
      sortable: false,
      align: 'right',
      render: (row) => (
        <div className="inline-flex items-center space-x-1">
          <Button variant="ghost" size="sm" onClick={() => setViewingCourseId(row._id)} title="View details">
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditingCourse(row)} title="Edit course">
            <Edit3 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatusConfirmCourse(row)}
            title={row.isActive ? 'Deactivate course' : 'Activate course'}
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
        aria-label="Filter by department"
        value={deptFilter}
        onChange={(e) => {
          setDeptFilter(e.target.value);
          setPage(1);
        }}
        className="text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700"
      >
        <option value="">All Departments</option>
        {filterDeptOpts.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

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
      </select>
    </>
  );

  const viewedCourse = courseDetailQuery.data?.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Course Management"
        subtitle="Configure degree programs, departmental ownership, duration, and semester capacities."
        actions={
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => {
              createForm.reset();
              setIsCreateOpen(true);
            }}
          >
            Add Course
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={courses}
        isLoading={coursesQuery.isLoading}
        error={coursesQuery.error}
        onRetry={coursesQuery.refetch}
        serverSide
        searchPlaceholder="Search by course name or code..."
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
        emptyTitle="No courses found"
        emptyDescription="Add a degree course or adjust department and status filters."
      />

      {/* ADD COURSE MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => !createMutation.isPending && setIsCreateOpen(false)}
        title="Add Degree Course"
        subtitle="Assign a new program to an active academic department."
      >
        <form
          onSubmit={createForm.handleSubmit((vals) =>
            createMutation.mutate({ ...vals, isActive: vals.isActive === 'true' })
          )}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Course Code"
              placeholder="e.g., BTECH-CSE"
              required
              error={createForm.formState.errors.code?.message}
              {...createForm.register('code')}
            />
            <Select
              label="Status"
              required
              placeholder={null}
              options={[
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' }
              ]}
              {...createForm.register('isActive')}
            />
          </div>
          <Input
            label="Course Name"
            placeholder="e.g., Bachelor of Technology in CSE"
            required
            error={createForm.formState.errors.name?.message}
            {...createForm.register('name')}
          />
          <Select
            label="Department"
            required
            placeholder="Select active department"
            options={activeDeptOpts}
            error={createForm.formState.errors.department?.message}
            {...createForm.register('department')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Duration (Years)"
              type="number"
              required
              error={createForm.formState.errors.durationYears?.message}
              {...createForm.register('durationYears')}
            />
            <Input
              label="Total Semesters"
              type="number"
              required
              error={createForm.formState.errors.totalSemesters?.message}
              {...createForm.register('totalSemesters')}
            />
          </div>
          <Textarea
            label="Description"
            rows={2}
            placeholder="Program overview..."
            error={createForm.formState.errors.description?.message}
            {...createForm.register('description')}
          />

          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2.5">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={createMutation.isPending} disabled={createMutation.isPending}>
              Create Course
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT COURSE MODAL */}
      <Modal
        isOpen={Boolean(editingCourse)}
        onClose={() => !updateMutation.isPending && setEditingCourse(null)}
        title="Edit Course"
        subtitle={editingCourse ? `${editingCourse.code} — ${editingCourse.name}` : ''}
      >
        <form
          onSubmit={editForm.handleSubmit((vals) =>
            updateMutation.mutate({
              id: editingCourse._id,
              payload: { ...vals, isActive: vals.isActive === 'true' }
            })
          )}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Course Code"
              required
              error={editForm.formState.errors.code?.message}
              {...editForm.register('code')}
            />
            <Select
              label="Status"
              required
              placeholder={null}
              options={[
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' }
              ]}
              {...editForm.register('isActive')}
            />
          </div>
          <Input
            label="Course Name"
            required
            error={editForm.formState.errors.name?.message}
            {...editForm.register('name')}
          />
          <Controller
            name="department"
            control={editForm.control}
            render={({ field }) => (
              <Select
                label="Department"
                required
                placeholder="Select department"
                options={filterDeptOpts}
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value)}
                helperText="Reassigning department is blocked if semesters, subjects, or students exist."
                error={editForm.formState.errors.department?.message}
              />
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Duration (Years)"
              type="number"
              required
              error={editForm.formState.errors.durationYears?.message}
              {...editForm.register('durationYears')}
            />
            <Input
              label="Total Semesters"
              type="number"
              required
              error={editForm.formState.errors.totalSemesters?.message}
              {...editForm.register('totalSemesters')}
            />
          </div>
          <Textarea
            label="Description"
            rows={2}
            error={editForm.formState.errors.description?.message}
            {...editForm.register('description')}
          />

          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2.5">
            <Button variant="outline" onClick={() => setEditingCourse(null)} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={updateMutation.isPending} disabled={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* COURSE DETAIL MODAL */}
      <Modal
        isOpen={Boolean(viewingCourseId)}
        onClose={() => setViewingCourseId(null)}
        title="Course Program Details"
        subtitle="Program structure, department ownership, and active terms."
        maxWidth="max-w-xl"
      >
        {courseDetailQuery.isLoading ? (
          <div className="py-8 text-center text-sm text-slate-500">Loading course details...</div>
        ) : viewedCourse ? (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-brand-700 bg-brand-100 px-2 py-0.5 rounded">
                    {viewedCourse.code}
                  </span>
                  <Badge variant={getStatusBadgeVariant(viewedCourse.isActive)} dot size="sm">
                    {viewedCourse.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </div>
                <h4 className="text-base font-bold text-slate-900 mt-2">{viewedCourse.name}</h4>
                <p className="text-xs text-slate-600 mt-1">Department: {viewedCourse.department?.name || '—'}</p>
                {viewedCourse.description && <p className="text-xs text-slate-500 mt-1">{viewedCourse.description}</p>}
              </div>
              <BookOpen className="w-6 h-6 text-slate-400 shrink-0" />
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl border border-slate-200">
                <p className="text-lg font-extrabold text-slate-900">{viewedCourse.durationYears} Yrs</p>
                <p className="text-[11px] text-slate-500 uppercase font-semibold">Duration</p>
              </div>
              <div className="p-3 rounded-xl border border-slate-200">
                <p className="text-lg font-extrabold text-slate-900">{viewedCourse.totalSemesters}</p>
                <p className="text-[11px] text-slate-500 uppercase font-semibold">Max Semesters</p>
              </div>
              <div className="p-3 rounded-xl border border-slate-200">
                <p className="text-lg font-extrabold text-slate-900">{viewedCourse.studentCount ?? 0}</p>
                <p className="text-[11px] text-slate-500 uppercase font-semibold">Students</p>
              </div>
            </div>

            {Array.isArray(viewedCourse.semesters) && viewedCourse.semesters.length > 0 && (
              <div className="p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                <p className="text-slate-700 font-bold uppercase">Configured Semesters</p>
                <div className="space-y-1.5">
                  {viewedCourse.semesters.map((s) => (
                    <div key={s._id} className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-lg">
                      <span className="font-medium text-slate-800">
                        Semester {s.semesterNumber} ({s.academicYear})
                      </span>
                      <span className="text-slate-500">
                        {formatDate(s.startDate)} – {formatDate(s.endDate)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start space-x-2 text-xs text-amber-800">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Courses with enrolled students, semesters, or subjects cannot be deleted or reduced below active semester counts.
              </span>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* STATUS CONFIRMATION */}
      <ConfirmDialog
        isOpen={Boolean(statusConfirmCourse)}
        onClose={() => !statusMutation.isPending && setStatusConfirmCourse(null)}
        onConfirm={() =>
          statusMutation.mutate({
            id: statusConfirmCourse._id,
            isActive: !statusConfirmCourse.isActive
          })
        }
        title={statusConfirmCourse?.isActive ? 'Deactivate Course' : 'Activate Course'}
        message={
          statusConfirmCourse?.isActive
            ? `Deactivating ${statusConfirmCourse?.code} (${statusConfirmCourse?.name}) blocks creating new semesters or student enrollments in this course while preserving existing records.`
            : `Restore active status for ${statusConfirmCourse?.code}?`
        }
        confirmText={statusConfirmCourse?.isActive ? 'Deactivate' : 'Activate'}
        variant={statusConfirmCourse?.isActive ? 'danger' : 'warning'}
        isLoading={statusMutation.isPending}
      />
    </div>
  );
};

export default CourseManagement;
