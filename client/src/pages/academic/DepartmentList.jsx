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
import { departmentApi, facultyApi } from '../../services/managementService';
import { extractApiErrorMessage, formatDate, getStatusBadgeVariant } from '../../utils/formSchemas';
import { Building2, Plus, Eye, Edit3, Power, BookOpen, Users, GraduationCap, ShieldAlert } from 'lucide-react';

const departmentFormSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'Department code must be at least 2 characters')
    .max(20, 'Department code cannot exceed 20 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Only letters, numbers, hyphens, and underscores allowed'),
  name: z
    .string()
    .trim()
    .min(3, 'Department name must be at least 3 characters')
    .max(120),
  description: z.string().trim().max(500).optional().default(''),
  headOfDepartment: z.string().optional().default(''),
  isActive: z.enum(['true', 'false']).default('true')
});

export const DepartmentList = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [viewingDeptId, setViewingDeptId] = useState(null);
  const [statusConfirmDept, setStatusConfirmDept] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const departmentsQuery = useQuery({
    queryKey: ['departments', 'list', { page, limit: 10, search: debouncedSearch, status: statusFilter, sortBy, sortOrder }],
    queryFn: () =>
      departmentApi.list({
        page,
        limit: 10,
        search: debouncedSearch,
        status: statusFilter,
        sortBy,
        sortOrder
      })
  });

  const deptDetailQuery = useQuery({
    queryKey: ['department', viewingDeptId],
    queryFn: () => departmentApi.getById(viewingDeptId),
    enabled: Boolean(viewingDeptId)
  });

  const facultyLookupQuery = useQuery({
    queryKey: ['faculty', 'hod-lookup'],
    queryFn: () => facultyApi.list({ limit: 100, status: 'ACTIVE' }),
    enabled: isCreateOpen || Boolean(editingDept)
  });

  const createForm = useForm({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: { code: '', name: '', description: '', headOfDepartment: '', isActive: 'true' }
  });

  const editForm = useForm({
    resolver: zodResolver(departmentFormSchema)
  });

  useEffect(() => {
    if (editingDept) {
      editForm.reset({
        code: editingDept.code || '',
        name: editingDept.name || '',
        description: editingDept.description || '',
        headOfDepartment: editingDept.headOfDepartment?._id || editingDept.headOfDepartment || '',
        isActive: editingDept.isActive !== false ? 'true' : 'false'
      });
    }
  }, [editingDept, editForm]);

  const createMutation = useMutation({
    mutationFn: (payload) => departmentApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
      showToast('Department created successfully', 'success');
      createForm.reset();
      setIsCreateOpen(false);
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Failed to create department'), 'error')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => departmentApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['department'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      showToast('Department updated successfully', 'success');
      setEditingDept(null);
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Failed to update department'), 'error')
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }) => departmentApi.updateStatus(id, isActive),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['department'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
      showToast(res?.message || 'Department status updated', 'success');
      setStatusConfirmDept(null);
    },
    onError: (err) => {
      showToast(extractApiErrorMessage(err, 'Failed to update department status'), 'error');
      setStatusConfirmDept(null);
    }
  });

  const handleCreateSubmit = (values) => {
    createMutation.mutate({
      code: values.code,
      name: values.name,
      description: values.description || '',
      headOfDepartment: values.headOfDepartment || null,
      isActive: values.isActive === 'true'
    });
  };

  const handleEditSubmit = (values) => {
    if (!editingDept) return;
    updateMutation.mutate({
      id: editingDept._id,
      payload: {
        code: values.code,
        name: values.name,
        description: values.description || '',
        headOfDepartment: values.headOfDepartment || null,
        isActive: values.isActive === 'true'
      }
    });
  };

  const departments = departmentsQuery.data?.data || [];
  const pagination = departmentsQuery.data?.meta?.pagination || { page: 1, totalPages: 1, totalRecords: 0 };
  const hodOptions = (facultyLookupQuery.data?.data || []).map((f) => ({
    value: f._id,
    label: `${f.firstName} ${f.lastName} (${f.employeeId})`
  }));

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
      header: 'Department',
      accessor: 'name',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900 text-sm">{row.name}</p>
          <p className="text-xs text-slate-500 line-clamp-1 max-w-xs">{row.description || 'No description provided'}</p>
        </div>
      )
    },
    {
      header: 'Head of Dept',
      accessor: 'headOfDepartment',
      sortable: false,
      render: (row) =>
        row.headOfDepartment ? (
          <div className="text-xs">
            <p className="font-semibold text-slate-800">
              {row.headOfDepartment.firstName} {row.headOfDepartment.lastName}
            </p>
            <p className="text-slate-400 font-mono">{row.headOfDepartment.employeeId}</p>
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">Not assigned</span>
        )
    },
    {
      header: 'Courses / Students',
      accessor: 'courseCount',
      sortable: false,
      render: (row) => (
        <div className="flex items-center space-x-3 text-xs text-slate-600">
          <span className="inline-flex items-center" title="Associated Courses">
            <BookOpen className="w-3.5 h-3.5 mr-1 text-slate-400" /> {row.courseCount ?? 0}
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
      header: 'Created',
      accessor: 'createdAt',
      render: (row) => <span className="text-xs text-slate-500">{formatDate(row.createdAt)}</span>
    },
    {
      header: 'Actions',
      accessor: 'actions',
      sortable: false,
      align: 'right',
      render: (row) => (
        <div className="inline-flex items-center space-x-1">
          <Button variant="ghost" size="sm" onClick={() => setViewingDeptId(row._id)} title="View details">
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditingDept(row)} title="Edit department">
            <Edit3 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatusConfirmDept(row)}
            title={row.isActive ? 'Deactivate department' : 'Activate department'}
            className={row.isActive ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}
          >
            <Power className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  const toolbarExtras = (
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
  );

  const viewedDept = deptDetailQuery.data?.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department Management"
        subtitle="Manage institutional academic divisions, heads of department, and status governance."
        actions={
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => {
              createForm.reset();
              setIsCreateOpen(true);
            }}
          >
            Add Department
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={departments}
        isLoading={departmentsQuery.isLoading}
        error={departmentsQuery.error}
        onRetry={departmentsQuery.refetch}
        serverSide
        searchPlaceholder="Search by department name or code..."
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
        emptyTitle="No departments found"
        emptyDescription="Create an academic department or refine your search and status filters."
      />

      {/* CREATE MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => !createMutation.isPending && setIsCreateOpen(false)}
        title="Add Academic Department"
        subtitle="Establish a new institutional division."
      >
        <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Department Code"
              placeholder="e.g., CSE"
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
            label="Department Name"
            placeholder="e.g., Computer Science & Engineering"
            required
            error={createForm.formState.errors.name?.message}
            {...createForm.register('name')}
          />
          <Select
            label="Head of Department (Optional)"
            placeholder="Unassigned"
            options={hodOptions}
            {...createForm.register('headOfDepartment')}
          />
          <Textarea
            label="Description"
            rows={3}
            placeholder="Brief academic overview of this department..."
            error={createForm.formState.errors.description?.message}
            {...createForm.register('description')}
          />

          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2.5">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={createMutation.isPending} disabled={createMutation.isPending}>
              Create Department
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={Boolean(editingDept)}
        onClose={() => !updateMutation.isPending && setEditingDept(null)}
        title="Edit Department"
        subtitle={editingDept ? `${editingDept.code} — ${editingDept.name}` : ''}
      >
        <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Department Code"
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
            label="Department Name"
            required
            error={editForm.formState.errors.name?.message}
            {...editForm.register('name')}
          />
          <Controller
            name="headOfDepartment"
            control={editForm.control}
            render={({ field }) => (
              <Select
                label="Head of Department (Optional)"
                placeholder="Unassigned"
                options={hodOptions}
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value)}
              />
            )}
          />
          <Textarea
            label="Description"
            rows={3}
            error={editForm.formState.errors.description?.message}
            {...editForm.register('description')}
          />

          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2.5">
            <Button variant="outline" onClick={() => setEditingDept(null)} disabled={updateMutation.isPending}>
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
        isOpen={Boolean(viewingDeptId)}
        onClose={() => setViewingDeptId(null)}
        title="Department Details"
        subtitle="Organizational metrics and associated degree programs."
        maxWidth="max-w-xl"
      >
        {deptDetailQuery.isLoading ? (
          <div className="py-8 text-center text-sm text-slate-500">Loading department details...</div>
        ) : viewedDept ? (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-brand-700 bg-brand-100 px-2 py-0.5 rounded">
                    {viewedDept.code}
                  </span>
                  <Badge variant={getStatusBadgeVariant(viewedDept.isActive)} dot size="sm">
                    {viewedDept.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </div>
                <h4 className="text-base font-bold text-slate-900 mt-2">{viewedDept.name}</h4>
                <p className="text-xs text-slate-600 mt-1">{viewedDept.description || 'No description provided.'}</p>
              </div>
              <Building2 className="w-6 h-6 text-slate-400 shrink-0" />
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl border border-slate-200">
                <p className="text-lg font-extrabold text-slate-900">{viewedDept.courseCount ?? 0}</p>
                <p className="text-[11px] text-slate-500 uppercase font-semibold">Courses</p>
              </div>
              <div className="p-3 rounded-xl border border-slate-200">
                <p className="text-lg font-extrabold text-slate-900">{viewedDept.studentCount ?? 0}</p>
                <p className="text-[11px] text-slate-500 uppercase font-semibold">Students</p>
              </div>
              <div className="p-3 rounded-xl border border-slate-200">
                <p className="text-lg font-extrabold text-slate-900">{viewedDept.facultyCount ?? 0}</p>
                <p className="text-[11px] text-slate-500 uppercase font-semibold">Faculty</p>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 text-xs">
              <p className="text-slate-400 font-semibold uppercase mb-1 flex items-center">
                <Users className="w-3.5 h-3.5 mr-1" /> Head of Department
              </p>
              <p className="font-semibold text-slate-800">
                {viewedDept.headOfDepartment
                  ? `${viewedDept.headOfDepartment.firstName} ${viewedDept.headOfDepartment.lastName} (${viewedDept.headOfDepartment.employeeId})`
                  : 'Not Assigned'}
              </p>
            </div>

            {Array.isArray(viewedDept.courses) && viewedDept.courses.length > 0 && (
              <div className="p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                <p className="text-slate-700 font-bold uppercase">Associated Courses</p>
                <div className="space-y-1.5">
                  {viewedDept.courses.map((c) => (
                    <div key={c._id} className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-lg">
                      <span className="font-medium text-slate-800">
                        <span className="font-mono font-bold mr-1.5">{c.code}</span>
                        {c.name}
                      </span>
                      <Badge variant={getStatusBadgeVariant(c.isActive !== false)} size="sm">
                        {c.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start space-x-2 text-xs text-amber-800">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Departments linked to courses, students, or faculty cannot be hard-deleted; use soft deactivation to prevent new assignments while keeping historical records intact.
              </span>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* STATUS CONFIRMATION */}
      <ConfirmDialog
        isOpen={Boolean(statusConfirmDept)}
        onClose={() => !statusMutation.isPending && setStatusConfirmDept(null)}
        onConfirm={() =>
          statusMutation.mutate({
            id: statusConfirmDept._id,
            isActive: !statusConfirmDept.isActive
          })
        }
        title={statusConfirmDept?.isActive ? 'Deactivate Department' : 'Activate Department'}
        message={
          statusConfirmDept?.isActive
            ? `Deactivating ${statusConfirmDept?.code} (${statusConfirmDept?.name}) prevents assigning new courses, students, or faculty to it while preserving all existing records.`
            : `Restore active status for ${statusConfirmDept?.code} (${statusConfirmDept?.name})?`
        }
        confirmText={statusConfirmDept?.isActive ? 'Deactivate' : 'Activate'}
        variant={statusConfirmDept?.isActive ? 'danger' : 'warning'}
        isLoading={statusMutation.isPending}
      />
    </div>
  );
};

export default DepartmentList;
