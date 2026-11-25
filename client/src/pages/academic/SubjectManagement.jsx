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
import { subjectApi, academicLookupApi } from '../../services/managementService';
import {
  extractApiErrorMessage,
  SUBJECT_TYPE_OPTIONS,
  getStatusBadgeVariant
} from '../../utils/formSchemas';
import { Layers, Plus, Eye, Edit3, Power, ShieldAlert } from 'lucide-react';

const subjectFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(2, 'Subject code must be at least 2 characters')
      .max(25)
      .regex(/^[A-Z0-9_-]+$/, 'Only letters, numbers, hyphens, and underscores allowed'),
    name: z.string().trim().min(2, 'Subject name is required').max(150),
    department: z.string().optional().default(''),
    course: z.string().min(1, 'Course is required'),
    semester: z.string().min(1, 'Semester is required'),
    credits: z.coerce.number().int().min(1, 'Credits must be 1-6').max(6, 'Credits must be 1-6'),
    type: z.enum(['THEORY', 'PRACTICAL', 'ELECTIVE', 'PROJECT']),
    maxInternalMarks: z.coerce.number().min(0, 'Min 0').max(50, 'Max internal marks is 50'),
    maxExternalMarks: z.coerce.number().min(0, 'Min 0').max(100, 'Max external marks is 100'),
    description: z.string().trim().max(500).optional().default(''),
    isActive: z.enum(['true', 'false']).default('true')
  })
  .refine((d) => d.maxInternalMarks + d.maxExternalMarks > 0 && d.maxInternalMarks + d.maxExternalMarks <= 100, {
    message: 'Combined internal and external marks must be between 1 and 100',
    path: ['maxExternalMarks']
  });

export const SubjectManagement = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('code');
  const [sortOrder, setSortOrder] = useState('asc');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [viewingSubjectId, setViewingSubjectId] = useState(null);
  const [statusConfirmSubject, setStatusConfirmSubject] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const subjectsQuery = useQuery({
    queryKey: [
      'subjects',
      'list',
      {
        page,
        limit: 10,
        search: debouncedSearch,
        department: deptFilter,
        course: courseFilter,
        semester: semesterFilter,
        subjectType: typeFilter,
        status: statusFilter,
        sortBy,
        sortOrder
      }
    ],
    queryFn: () =>
      subjectApi.list({
        page,
        limit: 10,
        search: debouncedSearch,
        department: deptFilter,
        course: courseFilter,
        semester: semesterFilter,
        subjectType: typeFilter,
        status: statusFilter,
        sortBy,
        sortOrder
      })
  });

  const subjectDetailQuery = useQuery({
    queryKey: ['subject', viewingSubjectId],
    queryFn: () => subjectApi.getById(viewingSubjectId),
    enabled: Boolean(viewingSubjectId)
  });

  const deptsQuery = useQuery({
    queryKey: ['departments', 'active'],
    queryFn: () => academicLookupApi.getDepartments({ isActive: true })
  });

  // Toolbar filter cascade
  const filterCoursesQuery = useQuery({
    queryKey: ['courses', 'subject-filter', deptFilter],
    queryFn: () => academicLookupApi.getCourses({ department: deptFilter, isActive: '' }),
    enabled: Boolean(deptFilter) || true
  });

  const filterSemestersQuery = useQuery({
    queryKey: ['semesters', 'subject-filter', courseFilter],
    queryFn: () => academicLookupApi.getSemesters({ course: courseFilter, isActive: '' }),
    enabled: Boolean(courseFilter)
  });

  // Create form & dependent dropdowns
  const createForm = useForm({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: {
      code: '',
      name: '',
      department: '',
      course: '',
      semester: '',
      credits: 4,
      type: 'THEORY',
      maxInternalMarks: 30,
      maxExternalMarks: 70,
      description: '',
      isActive: 'true'
    }
  });

  const createDept = createForm.watch('department');
  const createCourse = createForm.watch('course');

  const createCoursesQuery = useQuery({
    queryKey: ['courses', 'subject-create', createDept],
    queryFn: () => academicLookupApi.getCourses({ department: createDept, isActive: true }),
    enabled: isCreateOpen
  });

  const createSemestersQuery = useQuery({
    queryKey: ['semesters', 'subject-create', createCourse],
    queryFn: () => academicLookupApi.getSemesters({ course: createCourse, isActive: true }),
    enabled: isCreateOpen && Boolean(createCourse)
  });

  // Edit form & dependent dropdowns
  const editForm = useForm({
    resolver: zodResolver(subjectFormSchema)
  });

  const editDept = editForm.watch('department');
  const editCourse = editForm.watch('course');

  const editCoursesQuery = useQuery({
    queryKey: ['courses', 'subject-edit', editDept],
    queryFn: () => academicLookupApi.getCourses({ department: editDept, isActive: true }),
    enabled: Boolean(editingSubject)
  });

  const editSemestersQuery = useQuery({
    queryKey: ['semesters', 'subject-edit', editCourse],
    queryFn: () => academicLookupApi.getSemesters({ course: editCourse, isActive: true }),
    enabled: Boolean(editingSubject) && Boolean(editCourse)
  });

  useEffect(() => {
    if (editingSubject) {
      editForm.reset({
        code: editingSubject.code || '',
        name: editingSubject.name || '',
        department: editingSubject.course?.department?._id || editingSubject.course?.department || '',
        course: editingSubject.course?._id || editingSubject.course || '',
        semester: editingSubject.semester?._id || editingSubject.semester || '',
        credits: editingSubject.credits ?? 3,
        type: editingSubject.type || 'THEORY',
        maxInternalMarks: editingSubject.maxInternalMarks ?? 30,
        maxExternalMarks: editingSubject.maxExternalMarks ?? 70,
        description: editingSubject.description || '',
        isActive: editingSubject.isActive !== false ? 'true' : 'false'
      });
    }
  }, [editingSubject, editForm]);

  const createMutation = useMutation({
    mutationFn: (payload) => subjectApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
      showToast('Subject created successfully', 'success');
      createForm.reset();
      setIsCreateOpen(false);
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Failed to create subject'), 'error')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => subjectApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['subject'] });
      showToast('Subject updated successfully', 'success');
      setEditingSubject(null);
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Failed to update subject'), 'error')
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }) => subjectApi.updateStatus(id, isActive),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['subject'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
      showToast(res?.message || 'Subject status updated', 'success');
      setStatusConfirmSubject(null);
    },
    onError: (err) => {
      showToast(extractApiErrorMessage(err, 'Failed to update subject status'), 'error');
      setStatusConfirmSubject(null);
    }
  });

  const buildSubjectPayload = (vals) => ({
    code: vals.code,
    name: vals.name,
    course: vals.course,
    semester: vals.semester,
    credits: Number(vals.credits),
    type: vals.type,
    maxInternalMarks: Number(vals.maxInternalMarks),
    maxExternalMarks: Number(vals.maxExternalMarks),
    description: vals.description || '',
    isActive: vals.isActive === 'true'
  });

  const subjects = subjectsQuery.data?.data || [];
  const pagination = subjectsQuery.data?.meta?.pagination || { page: 1, totalPages: 1, totalRecords: 0 };

  const toDeptOpts = (list = []) => list.map((d) => ({ value: d._id, label: `${d.code} — ${d.name}` }));
  const toCourseOpts = (list = []) => list.map((c) => ({ value: c._id, label: `${c.code} — ${c.name}` }));
  const toSemOpts = (list = []) => list.map((s) => ({ value: s._id, label: `Sem ${s.semesterNumber} (${s.academicYear})` }));

  const deptOpts = toDeptOpts(deptsQuery.data?.data);
  const filterCourseOpts = toCourseOpts(filterCoursesQuery.data?.data);
  const filterSemOpts = toSemOpts(filterSemestersQuery.data?.data);
  const createCourseOpts = toCourseOpts(createCoursesQuery.data?.data);
  const createSemOpts = toSemOpts(createSemestersQuery.data?.data);
  const editCourseOpts = toCourseOpts(editCoursesQuery.data?.data);
  const editSemOpts = toSemOpts(editSemestersQuery.data?.data);

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
      header: 'Subject',
      accessor: 'name',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900 text-sm">{row.name}</p>
          <p className="text-xs text-slate-500">
            {row.course?.code || '—'} • Sem {row.semester?.semesterNumber || '—'} ({row.semester?.academicYear || '—'})
          </p>
        </div>
      )
    },
    {
      header: 'Type & Credits',
      accessor: 'credits',
      render: (row) => (
        <div className="flex items-center space-x-2 text-xs">
          <Badge variant="neutral" size="sm">
            {row.type}
          </Badge>
          <span className="font-semibold text-slate-700">{row.credits} Cr</span>
        </div>
      )
    },
    {
      header: 'Max Marks (Int / Ext / Total)',
      accessor: 'maxInternalMarks',
      render: (row) => (
        <span className="text-xs font-mono text-slate-700">
          {row.maxInternalMarks} + {row.maxExternalMarks} = <strong>{row.totalMaxMarks}</strong>
        </span>
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
          <Button variant="ghost" size="sm" onClick={() => setViewingSubjectId(row._id)} title="View details">
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditingSubject(row)} title="Edit subject">
            <Edit3 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatusConfirmSubject(row)}
            title={row.isActive ? 'Deactivate subject' : 'Activate subject'}
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
          setCourseFilter('');
          setSemesterFilter('');
          setPage(1);
        }}
        className="text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700"
      >
        <option value="">All Departments</option>
        {deptOpts.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by course"
        value={courseFilter}
        onChange={(e) => {
          setCourseFilter(e.target.value);
          setSemesterFilter('');
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
        aria-label="Filter by semester"
        value={semesterFilter}
        disabled={!courseFilter}
        onChange={(e) => {
          setSemesterFilter(e.target.value);
          setPage(1);
        }}
        className="text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 disabled:opacity-50"
      >
        <option value="">{courseFilter ? 'All Semesters' : 'Select Course First'}</option>
        {filterSemOpts.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by subject type"
        value={typeFilter}
        onChange={(e) => {
          setTypeFilter(e.target.value);
          setPage(1);
        }}
        className="text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700"
      >
        <option value="">All Types</option>
        {SUBJECT_TYPE_OPTIONS.map((opt) => (
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

  const viewedSubject = subjectDetailQuery.data?.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subject Management"
        subtitle="Manage curriculum subjects, credit weights, examination marks limits, and semester mappings."
        actions={
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => {
              createForm.reset();
              setIsCreateOpen(true);
            }}
          >
            Add Subject
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={subjects}
        isLoading={subjectsQuery.isLoading}
        error={subjectsQuery.error}
        onRetry={subjectsQuery.refetch}
        serverSide
        searchPlaceholder="Search by subject code or name..."
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
        emptyTitle="No subjects found"
        emptyDescription="Add a subject or adjust your course, semester, type, or search filters."
      />

      {/* ADD SUBJECT MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => !createMutation.isPending && setIsCreateOpen(false)}
        title="Add Curriculum Subject"
        subtitle="Bind a new subject to a valid course and semester term."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={createForm.handleSubmit((vals) => createMutation.mutate(buildSubjectPayload(vals)))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Subject Code"
              placeholder="e.g., BCS-502"
              required
              error={createForm.formState.errors.code?.message}
              {...createForm.register('code')}
            />
            <Input
              label="Subject Name"
              placeholder="e.g., Compiler Design"
              required
              error={createForm.formState.errors.name?.message}
              {...createForm.register('name')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-200">
            <Controller
              name="department"
              control={createForm.control}
              render={({ field }) => (
                <Select
                  label="Department (Optional Filter)"
                  placeholder="All departments"
                  options={deptOpts}
                  value={field.value || ''}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                    createForm.setValue('course', '');
                    createForm.setValue('semester', '');
                  }}
                />
              )}
            />
            <Controller
              name="course"
              control={createForm.control}
              render={({ field }) => (
                <Select
                  label="Course"
                  required
                  placeholder="Select active course"
                  options={createCourseOpts}
                  value={field.value || ''}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                    createForm.setValue('semester', '');
                  }}
                  error={createForm.formState.errors.course?.message}
                />
              )}
            />
            <Controller
              name="semester"
              control={createForm.control}
              render={({ field }) => (
                <Select
                  label="Semester"
                  required
                  disabled={!createCourse}
                  placeholder={createCourse ? 'Select semester' : 'Select course first'}
                  options={createSemOpts}
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  error={createForm.formState.errors.semester?.message}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Select
              label="Type"
              required
              placeholder={null}
              options={SUBJECT_TYPE_OPTIONS}
              {...createForm.register('type')}
            />
            <Input
              label="Credits"
              type="number"
              required
              error={createForm.formState.errors.credits?.message}
              {...createForm.register('credits')}
            />
            <Input
              label="Max Internal"
              type="number"
              required
              error={createForm.formState.errors.maxInternalMarks?.message}
              {...createForm.register('maxInternalMarks')}
            />
            <Input
              label="Max External"
              type="number"
              required
              error={createForm.formState.errors.maxExternalMarks?.message}
              {...createForm.register('maxExternalMarks')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="flex items-end pb-2 text-xs text-slate-600">
              Total Max Marks:{' '}
              <strong className="ml-1 text-slate-900">
                {(Number(createForm.watch('maxInternalMarks')) || 0) + (Number(createForm.watch('maxExternalMarks')) || 0)}
              </strong>{' '}
              / 100
            </div>
          </div>

          <Textarea
            label="Description"
            rows={2}
            placeholder="Syllabus overview..."
            error={createForm.formState.errors.description?.message}
            {...createForm.register('description')}
          />

          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2.5">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={createMutation.isPending} disabled={createMutation.isPending}>
              Create Subject
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT SUBJECT MODAL */}
      <Modal
        isOpen={Boolean(editingSubject)}
        onClose={() => !updateMutation.isPending && setEditingSubject(null)}
        title="Edit Subject"
        subtitle={editingSubject ? `${editingSubject.code} — ${editingSubject.name}` : ''}
        maxWidth="max-w-2xl"
      >
        <form
          onSubmit={editForm.handleSubmit((vals) =>
            updateMutation.mutate({ id: editingSubject._id, payload: buildSubjectPayload(vals) })
          )}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Subject Code"
              required
              error={editForm.formState.errors.code?.message}
              {...editForm.register('code')}
            />
            <Input
              label="Subject Name"
              required
              error={editForm.formState.errors.name?.message}
              {...editForm.register('name')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-200">
            <Controller
              name="department"
              control={editForm.control}
              render={({ field }) => (
                <Select
                  label="Department Filter"
                  placeholder="All departments"
                  options={deptOpts}
                  value={field.value || ''}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                    editForm.setValue('course', '');
                    editForm.setValue('semester', '');
                  }}
                />
              )}
            />
            <Controller
              name="course"
              control={editForm.control}
              render={({ field }) => (
                <Select
                  label="Course"
                  required
                  placeholder="Select course"
                  options={editCourseOpts}
                  value={field.value || ''}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                    editForm.setValue('semester', '');
                  }}
                  error={editForm.formState.errors.course?.message}
                />
              )}
            />
            <Controller
              name="semester"
              control={editForm.control}
              render={({ field }) => (
                <Select
                  label="Semester"
                  required
                  disabled={!editCourse}
                  placeholder={editCourse ? 'Select semester' : 'Select course first'}
                  options={editSemOpts}
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  error={editForm.formState.errors.semester?.message}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Select
              label="Type"
              required
              placeholder={null}
              options={SUBJECT_TYPE_OPTIONS}
              {...editForm.register('type')}
            />
            <Input
              label="Credits"
              type="number"
              required
              error={editForm.formState.errors.credits?.message}
              {...editForm.register('credits')}
            />
            <Input
              label="Max Internal"
              type="number"
              required
              error={editForm.formState.errors.maxInternalMarks?.message}
              {...editForm.register('maxInternalMarks')}
            />
            <Input
              label="Max External"
              type="number"
              required
              error={editForm.formState.errors.maxExternalMarks?.message}
              {...editForm.register('maxExternalMarks')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="flex items-end pb-2 text-xs text-slate-600">
              Total Max Marks:{' '}
              <strong className="ml-1 text-slate-900">
                {(Number(editForm.watch('maxInternalMarks')) || 0) + (Number(editForm.watch('maxExternalMarks')) || 0)}
              </strong>{' '}
              / 100
            </div>
          </div>

          <Textarea
            label="Description"
            rows={2}
            error={editForm.formState.errors.description?.message}
            {...editForm.register('description')}
          />

          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2.5">
            <Button variant="outline" onClick={() => setEditingSubject(null)} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={updateMutation.isPending} disabled={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* SUBJECT DETAIL MODAL */}
      <Modal
        isOpen={Boolean(viewingSubjectId)}
        onClose={() => setViewingSubjectId(null)}
        title="Subject Details"
        subtitle="Curriculum configuration, marks allocation, and usage checks."
      >
        {subjectDetailQuery.isLoading ? (
          <div className="py-8 text-center text-sm text-slate-500">Loading subject details...</div>
        ) : viewedSubject ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-brand-700 bg-brand-100 px-2 py-0.5 rounded">
                    {viewedSubject.code}
                  </span>
                  <Badge variant="neutral" size="sm">
                    {viewedSubject.type}
                  </Badge>
                  <Badge variant={getStatusBadgeVariant(viewedSubject.isActive)} dot size="sm">
                    {viewedSubject.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </div>
                <h4 className="text-base font-bold text-slate-900 mt-2">{viewedSubject.name}</h4>
                <p className="text-xs text-slate-600 mt-1">
                  {viewedSubject.course?.name} • Semester {viewedSubject.semester?.semesterNumber} (
                  {viewedSubject.semester?.academicYear})
                </p>
                {viewedSubject.description && <p className="text-xs text-slate-500 mt-1">{viewedSubject.description}</p>}
              </div>
              <Layers className="w-6 h-6 text-slate-400 shrink-0" />
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-xl border border-slate-200">
                <p className="text-base font-extrabold text-slate-900">{viewedSubject.credits}</p>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Credits</p>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200">
                <p className="text-base font-extrabold text-slate-900">{viewedSubject.maxInternalMarks}</p>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Internal</p>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200">
                <p className="text-base font-extrabold text-slate-900">{viewedSubject.maxExternalMarks}</p>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">External</p>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200">
                <p className="text-base font-extrabold text-brand-700">{viewedSubject.totalMaxMarks}</p>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Total</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start space-x-2 text-xs text-amber-800">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Subjects with faculty allocations ({viewedSubject.dependencyCounts?.assignments ?? 0}), attendance logs (
                {viewedSubject.dependencyCounts?.attendance ?? 0}), or results ({viewedSubject.dependencyCounts?.results ?? 0}) cannot be deleted or reassigned.
              </span>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* STATUS CONFIRMATION */}
      <ConfirmDialog
        isOpen={Boolean(statusConfirmSubject)}
        onClose={() => !statusMutation.isPending && setStatusConfirmSubject(null)}
        onConfirm={() =>
          statusMutation.mutate({
            id: statusConfirmSubject._id,
            isActive: !statusConfirmSubject.isActive
          })
        }
        title={statusConfirmSubject?.isActive ? 'Deactivate Subject' : 'Activate Subject'}
        message={
          statusConfirmSubject?.isActive
            ? `Deactivating ${statusConfirmSubject?.code} (${statusConfirmSubject?.name}) removes it from new assignments while preserving existing attendance and results.`
            : `Restore active status for ${statusConfirmSubject?.code} (${statusConfirmSubject?.name})?`
        }
        confirmText={statusConfirmSubject?.isActive ? 'Deactivate' : 'Activate'}
        variant={statusConfirmSubject?.isActive ? 'danger' : 'warning'}
        isLoading={statusMutation.isPending}
      />
    </div>
  );
};

export default SubjectManagement;
