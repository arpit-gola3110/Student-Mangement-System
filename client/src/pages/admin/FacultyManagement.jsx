import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import PageHeader from '../../components/layout/PageHeader';
import DataTable from '../../components/data/DataTable';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Avatar from '../../components/common/Avatar';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { useToast } from '../../context/ToastContext';
import { facultyApi, academicLookupApi } from '../../services/managementService';
import {
  passwordPolicyField,
  phoneField,
  extractApiErrorMessage,
  formatDate,
  DESIGNATION_OPTIONS,
  FACULTY_STATUS_OPTIONS,
  getStatusBadgeVariant
} from '../../utils/formSchemas';
import {
  UserPlus,
  Eye,
  Edit3,
  Power,
  Mail,
  Phone,
  Building2,
  BookMarked,
  ShieldAlert
} from 'lucide-react';

const createFacultyFormSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: z.string().trim().min(1, 'Last name is required').max(60),
  email: z.string().trim().email('Valid institutional email is required'),
  password: passwordPolicyField,
  employeeId: z.string().trim().min(3, 'Employee ID is required').max(40),
  department: z.string().min(1, 'Department is required'),
  designation: z.enum(['PROFESSOR', 'ASSOCIATE_PROFESSOR', 'ASSISTANT_PROFESSOR', 'LECTURER']),
  specialization: z.string().trim().min(2, 'Specialization is required').max(120),
  qualification: z.string().trim().max(120).optional(),
  contactNumber: phoneField,
  joiningDate: z.string().min(1, 'Joining date is required'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'RETIRED'])
});

const editFacultyFormSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: z.string().trim().min(1, 'Last name is required').max(60),
  employeeId: z.string().trim().min(3, 'Employee ID is required').max(40),
  department: z.string().min(1, 'Department is required'),
  designation: z.enum(['PROFESSOR', 'ASSOCIATE_PROFESSOR', 'ASSISTANT_PROFESSOR', 'LECTURER']),
  specialization: z.string().trim().min(2, 'Specialization is required').max(120),
  qualification: z.string().trim().max(120).optional(),
  contactNumber: phoneField,
  joiningDate: z.string().min(1, 'Joining date is required'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'RETIRED'])
});

export const FacultyManagement = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [viewingFacultyId, setViewingFacultyId] = useState(null);
  const [statusConfirmFaculty, setStatusConfirmFaculty] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const facultyQuery = useQuery({
    queryKey: [
      'faculty',
      {
        page,
        limit: 10,
        search: debouncedSearch,
        department: deptFilter,
        designation: designationFilter,
        status: statusFilter,
        sortBy,
        sortOrder
      }
    ],
    queryFn: () =>
      facultyApi.list({
        page,
        limit: 10,
        search: debouncedSearch,
        department: deptFilter,
        designation: designationFilter,
        status: statusFilter,
        sortBy,
        sortOrder
      })
  });

  const facultyDetailQuery = useQuery({
    queryKey: ['facultyMember', viewingFacultyId],
    queryFn: () => facultyApi.getById(viewingFacultyId),
    enabled: Boolean(viewingFacultyId)
  });

  const departmentsQuery = useQuery({
    queryKey: ['departments', 'active'],
    queryFn: () => academicLookupApi.getDepartments({ isActive: true })
  });

  const createForm = useForm({
    resolver: zodResolver(createFacultyFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      employeeId: '',
      department: '',
      designation: 'ASSISTANT_PROFESSOR',
      specialization: '',
      qualification: '',
      contactNumber: '',
      joiningDate: new Date().toISOString().split('T')[0],
      status: 'ACTIVE'
    }
  });

  const editForm = useForm({
    resolver: zodResolver(editFacultyFormSchema)
  });

  useEffect(() => {
    if (editingFaculty) {
      const joining = editingFaculty.joiningDate
        ? new Date(editingFaculty.joiningDate).toISOString().split('T')[0]
        : '';
      editForm.reset({
        firstName: editingFaculty.firstName || '',
        lastName: editingFaculty.lastName || '',
        employeeId: editingFaculty.employeeId || '',
        department: editingFaculty.department?._id || editingFaculty.department || '',
        designation: editingFaculty.designation || 'ASSISTANT_PROFESSOR',
        specialization: editingFaculty.specialization || editingFaculty.qualification || '',
        qualification: editingFaculty.qualification || '',
        contactNumber: editingFaculty.contactNumber || '',
        joiningDate: joining,
        status: editingFaculty.status || 'ACTIVE'
      });
    }
  }, [editingFaculty, editForm]);

  const createMutation = useMutation({
    mutationFn: (payload) => facultyApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast('Faculty profile and linked user account created successfully', 'success');
      createForm.reset();
      setIsCreateOpen(false);
    },
    onError: (err) => {
      showToast(extractApiErrorMessage(err, 'Failed to register faculty member'), 'error');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => facultyApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty'] });
      queryClient.invalidateQueries({ queryKey: ['facultyMember'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast('Faculty profile updated successfully', 'success');
      setEditingFaculty(null);
    },
    onError: (err) => {
      showToast(extractApiErrorMessage(err, 'Failed to update faculty profile'), 'error');
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => facultyApi.updateStatus(id, status),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['faculty'] });
      queryClient.invalidateQueries({ queryKey: ['facultyMember'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast(res?.message || 'Faculty status updated', 'success');
      setStatusConfirmFaculty(null);
    },
    onError: (err) => {
      showToast(extractApiErrorMessage(err, 'Failed to update faculty status'), 'error');
      setStatusConfirmFaculty(null);
    }
  });

  const facultyList = facultyQuery.data?.data || [];
  const pagination = facultyQuery.data?.meta?.pagination || { page: 1, totalPages: 1, totalRecords: 0 };
  const departmentOptions = (departmentsQuery.data?.data || []).map((d) => ({ value: d._id, label: `${d.code} — ${d.name}` }));

  const columns = [
    {
      header: 'Employee ID',
      accessor: 'employeeId',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
          {row.employeeId}
        </span>
      )
    },
    {
      header: 'Faculty Member',
      accessor: 'firstName',
      render: (row) => {
        const name = `${row.firstName} ${row.lastName}`.trim();
        return (
          <div className="flex items-center space-x-3">
            <Avatar name={name} size="sm" status={row.status === 'ACTIVE' ? 'online' : 'offline'} />
            <div>
              <p className="font-semibold text-slate-900 text-sm leading-tight">{name}</p>
              <p className="text-xs text-slate-500">{row.user?.email || '—'}</p>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Department',
      accessor: 'department',
      sortable: false,
      render: (row) => (
        <span className="text-xs font-semibold text-slate-800">{row.department?.code || row.department?.name || '—'}</span>
      )
    },
    {
      header: 'Designation & Specialization',
      accessor: 'designation',
      render: (row) => (
        <div className="text-xs">
          <p className="font-semibold text-slate-800">{row.designation?.replace(/_/g, ' ')}</p>
          <p className="text-slate-500 truncate max-w-[180px]">{row.specialization || row.qualification || '—'}</p>
        </div>
      )
    },
    {
      header: 'Contact',
      accessor: 'contactNumber',
      sortable: false,
      render: (row) => <span className="text-xs text-slate-600 font-mono">{row.contactNumber}</span>
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <Badge variant={getStatusBadgeVariant(row.status)} dot size="sm">
          {row.status}
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
          <Button variant="ghost" size="sm" onClick={() => setViewingFacultyId(row._id)} title="View details">
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditingFaculty(row)} title="Edit faculty">
            <Edit3 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatusConfirmFaculty(row)}
            title={row.status === 'ACTIVE' ? 'Deactivate faculty' : 'Activate faculty'}
            className={row.status === 'ACTIVE' ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}
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
        {departmentOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by designation"
        value={designationFilter}
        onChange={(e) => {
          setDesignationFilter(e.target.value);
          setPage(1);
        }}
        className="text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700"
      >
        <option value="">All Designations</option>
        {DESIGNATION_OPTIONS.map((opt) => (
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
        {FACULTY_STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </>
  );

  const viewedFaculty = facultyDetailQuery.data?.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty Management"
        subtitle="Manage teaching faculty profiles, departmental allocations, and linked user access."
        actions={
          <Button
            variant="primary"
            icon={UserPlus}
            onClick={() => {
              createForm.reset();
              setIsCreateOpen(true);
            }}
          >
            Add Faculty
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={facultyList}
        isLoading={facultyQuery.isLoading}
        error={facultyQuery.error}
        onRetry={facultyQuery.refetch}
        serverSide
        searchPlaceholder="Search by name, employee ID, specialization or email..."
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
        totalRecords={pagination.totalRecords}
        pageSize={10}
        onPageChange={setPage}
        toolbarExtras={toolbarExtras}
        emptyTitle="No faculty profiles found"
        emptyDescription="Add a faculty member or adjust your department, designation, or search filters."
      />

      {/* ADD FACULTY MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => !createMutation.isPending && setIsCreateOpen(false)}
        title="Register Faculty Member"
        subtitle="Creates both the Faculty academic profile and linked User authentication identity."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={createForm.handleSubmit((vals) => createMutation.mutate(vals))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              placeholder="e.g., Dr. Anita"
              required
              error={createForm.formState.errors.firstName?.message}
              {...createForm.register('firstName')}
            />
            <Input
              label="Last Name"
              placeholder="e.g., Singh"
              required
              error={createForm.formState.errors.lastName?.message}
              {...createForm.register('lastName')}
            />
            <Input
              label="Institutional Email"
              type="email"
              placeholder="faculty@aktu.ac.in"
              required
              error={createForm.formState.errors.email?.message}
              {...createForm.register('email')}
            />
            <Input
              label="Initial Password"
              type="password"
              placeholder="Min 8 chars, mixed case, digit & symbol"
              required
              error={createForm.formState.errors.password?.message}
              {...createForm.register('password')}
            />
            <Input
              label="Employee ID"
              placeholder="FAC-CSE-002"
              required
              error={createForm.formState.errors.employeeId?.message}
              {...createForm.register('employeeId')}
            />
            <Select
              label="Department"
              required
              placeholder="Select department"
              options={departmentOptions}
              error={createForm.formState.errors.department?.message}
              {...createForm.register('department')}
            />
            <Select
              label="Designation"
              required
              placeholder={null}
              options={DESIGNATION_OPTIONS}
              error={createForm.formState.errors.designation?.message}
              {...createForm.register('designation')}
            />
            <Input
              label="Specialization"
              placeholder="e.g., Artificial Intelligence"
              required
              error={createForm.formState.errors.specialization?.message}
              {...createForm.register('specialization')}
            />
            <Input
              label="Qualification (Optional)"
              placeholder="e.g., Ph.D., M.Tech"
              error={createForm.formState.errors.qualification?.message}
              {...createForm.register('qualification')}
            />
            <Input
              label="Phone Number"
              placeholder="9876543210"
              required
              error={createForm.formState.errors.contactNumber?.message}
              {...createForm.register('contactNumber')}
            />
            <Input
              label="Joining Date"
              type="date"
              required
              error={createForm.formState.errors.joiningDate?.message}
              {...createForm.register('joiningDate')}
            />
            <Select
              label="Status"
              required
              placeholder={null}
              options={FACULTY_STATUS_OPTIONS}
              {...createForm.register('status')}
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2.5">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={createMutation.isPending} disabled={createMutation.isPending}>
              Register Faculty
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT FACULTY MODAL */}
      <Modal
        isOpen={Boolean(editingFaculty)}
        onClose={() => !updateMutation.isPending && setEditingFaculty(null)}
        title="Edit Faculty Profile"
        subtitle={editingFaculty ? `${editingFaculty.employeeId} • ${editingFaculty.user?.email || ''}` : ''}
        maxWidth="max-w-2xl"
      >
        <form
          onSubmit={editForm.handleSubmit((vals) => updateMutation.mutate({ id: editingFaculty._id, payload: vals }))}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              required
              error={editForm.formState.errors.firstName?.message}
              {...editForm.register('firstName')}
            />
            <Input
              label="Last Name"
              required
              error={editForm.formState.errors.lastName?.message}
              {...editForm.register('lastName')}
            />
            <Input
              label="Employee ID"
              required
              error={editForm.formState.errors.employeeId?.message}
              {...editForm.register('employeeId')}
            />
            <Select
              label="Department"
              required
              placeholder="Select department"
              options={departmentOptions}
              error={editForm.formState.errors.department?.message}
              {...editForm.register('department')}
            />
            <Select
              label="Designation"
              required
              placeholder={null}
              options={DESIGNATION_OPTIONS}
              error={editForm.formState.errors.designation?.message}
              {...editForm.register('designation')}
            />
            <Input
              label="Specialization"
              required
              error={editForm.formState.errors.specialization?.message}
              {...editForm.register('specialization')}
            />
            <Input
              label="Qualification"
              error={editForm.formState.errors.qualification?.message}
              {...editForm.register('qualification')}
            />
            <Input
              label="Phone Number"
              required
              error={editForm.formState.errors.contactNumber?.message}
              {...editForm.register('contactNumber')}
            />
            <Input
              label="Joining Date"
              type="date"
              required
              error={editForm.formState.errors.joiningDate?.message}
              {...editForm.register('joiningDate')}
            />
            <Select
              label="Status"
              required
              placeholder={null}
              options={FACULTY_STATUS_OPTIONS}
              {...editForm.register('status')}
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2.5">
            <Button variant="outline" onClick={() => setEditingFaculty(null)} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={updateMutation.isPending} disabled={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* VIEW FACULTY DETAIL MODAL */}
      <Modal
        isOpen={Boolean(viewingFacultyId)}
        onClose={() => setViewingFacultyId(null)}
        title="Faculty Profile Details"
        subtitle="Academic credentials, department affiliation, and assigned workloads."
        maxWidth="max-w-xl"
      >
        {facultyDetailQuery.isLoading ? (
          <div className="py-8 text-center text-sm text-slate-500">Loading faculty details...</div>
        ) : viewedFaculty ? (
          <div className="space-y-5">
            <div className="flex items-center space-x-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <Avatar name={`${viewedFaculty.firstName} ${viewedFaculty.lastName}`} size="lg" />
              <div className="min-w-0 flex-1">
                <h4 className="text-base font-bold text-slate-900">
                  {viewedFaculty.firstName} {viewedFaculty.lastName}
                </h4>
                <p className="text-xs font-mono text-slate-600 mt-0.5">
                  Employee ID: {viewedFaculty.employeeId} • {viewedFaculty.designation?.replace(/_/g, ' ')}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant={getStatusBadgeVariant(viewedFaculty.status)} dot size="sm">
                    {viewedFaculty.status}
                  </Badge>
                  <Badge variant={getStatusBadgeVariant(viewedFaculty.user?.isActive)} size="sm">
                    Login: {viewedFaculty.user?.isActive ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 space-y-1">
                <p className="text-slate-400 font-semibold uppercase flex items-center">
                  <Mail className="w-3.5 h-3.5 mr-1" /> Contact Details
                </p>
                <p className="text-slate-900 font-semibold">{viewedFaculty.user?.email || '—'}</p>
                <p className="text-slate-600 flex items-center">
                  <Phone className="w-3 h-3 mr-1" /> {viewedFaculty.contactNumber}
                </p>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 space-y-1">
                <p className="text-slate-400 font-semibold uppercase flex items-center">
                  <Building2 className="w-3.5 h-3.5 mr-1" /> Department & Tenure
                </p>
                <p className="text-slate-900 font-semibold">{viewedFaculty.department?.name || '—'}</p>
                <p className="text-slate-600">Joined: {formatDate(viewedFaculty.joiningDate)}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <p className="text-slate-400 font-semibold uppercase">Specialization & Qualification</p>
              <p className="text-slate-900 font-semibold">{viewedFaculty.specialization || '—'}</p>
              {viewedFaculty.qualification && <p className="text-slate-600">{viewedFaculty.qualification}</p>}
            </div>

            {Array.isArray(viewedFaculty.assignments) && viewedFaculty.assignments.length > 0 && (
              <div className="p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                <p className="text-slate-700 font-bold uppercase flex items-center">
                  <BookMarked className="w-3.5 h-3.5 mr-1.5 text-brand-600" /> Current Teaching Assignments
                </p>
                <div className="space-y-1.5">
                  {viewedFaculty.assignments.map((a) => (
                    <div key={a._id} className="flex items-center justify-between bg-slate-50 px-2.5 py-1.5 rounded-lg">
                      <span className="font-medium text-slate-800">
                        {a.subject?.code} — {a.subject?.name}
                      </span>
                      <span className="text-slate-500">
                        Sec {a.section} ({a.academicYear})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start space-x-2 text-xs text-amber-800">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Soft deactivation preserves historical teaching allocations, attendance logs, and student evaluations.
              </span>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* DEACTIVATE / ACTIVATE CONFIRMATION */}
      <ConfirmDialog
        isOpen={Boolean(statusConfirmFaculty)}
        onClose={() => !statusMutation.isPending && setStatusConfirmFaculty(null)}
        onConfirm={() =>
          statusMutation.mutate({
            id: statusConfirmFaculty._id,
            status: statusConfirmFaculty.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
          })
        }
        title={statusConfirmFaculty?.status === 'ACTIVE' ? 'Deactivate Faculty Account' : 'Activate Faculty Account'}
        message={
          statusConfirmFaculty?.status === 'ACTIVE'
            ? `Deactivating ${statusConfirmFaculty?.firstName} ${statusConfirmFaculty?.lastName} (${statusConfirmFaculty?.employeeId}) disables their sign-in access while preserving all academic assignments and evaluation records.`
            : `Restore active faculty status and portal login for ${statusConfirmFaculty?.firstName} ${statusConfirmFaculty?.lastName}?`
        }
        confirmText={statusConfirmFaculty?.status === 'ACTIVE' ? 'Deactivate Faculty' : 'Activate Faculty'}
        variant={statusConfirmFaculty?.status === 'ACTIVE' ? 'danger' : 'warning'}
        isLoading={statusMutation.isPending}
      />
    </div>
  );
};

export default FacultyManagement;
