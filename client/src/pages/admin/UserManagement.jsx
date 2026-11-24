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
import Textarea from '../../components/common/Textarea';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { userApi, academicLookupApi } from '../../services/managementService';
import {
  passwordPolicyField,
  phoneField,
  extractApiErrorMessage,
  formatDate,
  DESIGNATION_OPTIONS,
  GENDER_OPTIONS,
  getStatusBadgeVariant
} from '../../utils/formSchemas';
import {
  UserPlus,
  Eye,
  Edit3,
  Power,
  ShieldCheck,
  Mail,
  Calendar,
  Clock,
  GraduationCap,
  Users
} from 'lucide-react';

const createUserFormSchema = z
  .object({
    name: z.string().trim().min(2, 'Full name is required').max(100),
    email: z.string().trim().email('Valid institutional email is required'),
    password: passwordPolicyField,
    role: z.enum(['admin', 'faculty', 'student']),
    isActive: z.enum(['true', 'false']).default('true'),
    // Student profile fields (used when role === 'student')
    enrollmentNumber: z.string().trim().optional(),
    rollNumber: z.string().trim().optional(),
    studentDepartment: z.string().optional(),
    course: z.string().optional(),
    semester: z.string().optional(),
    dateOfBirth: z.string().optional(),
    gender: z.string().optional(),
    studentPhone: z.string().optional(),
    address: z.string().optional(),
    admissionYear: z.string().optional(),
    // Faculty profile fields (used when role === 'faculty')
    employeeId: z.string().trim().optional(),
    facultyDepartment: z.string().optional(),
    designation: z.string().optional(),
    specialization: z.string().optional(),
    facultyPhone: z.string().optional()
  })
  .superRefine((val, ctx) => {
    if (val.role === 'student') {
      if (!val.enrollmentNumber || val.enrollmentNumber.length < 3) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['enrollmentNumber'], message: 'Enrollment number is required' });
      }
      if (!val.studentDepartment) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['studentDepartment'], message: 'Department is required' });
      }
      if (!val.course) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['course'], message: 'Course is required' });
      }
      if (!val.semester) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['semester'], message: 'Semester is required' });
      }
      if (!val.dateOfBirth) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dateOfBirth'], message: 'Date of birth is required' });
      }
      if (!val.gender) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['gender'], message: 'Gender is required' });
      }
      const phoneCheck = phoneField.safeParse(val.studentPhone || '');
      if (!phoneCheck.success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['studentPhone'], message: 'Valid phone number is required' });
      }
      if (!val.address || val.address.trim().length < 3) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['address'], message: 'Address is required' });
      }
    }
    if (val.role === 'faculty') {
      if (!val.employeeId || val.employeeId.length < 3) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['employeeId'], message: 'Employee ID is required' });
      }
      if (!val.facultyDepartment) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['facultyDepartment'], message: 'Department is required' });
      }
      if (!val.designation) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['designation'], message: 'Designation is required' });
      }
      if (!val.specialization || val.specialization.trim().length < 2) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['specialization'], message: 'Specialization is required' });
      }
      const phoneCheck = phoneField.safeParse(val.facultyPhone || '');
      if (!phoneCheck.success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['facultyPhone'], message: 'Valid phone number is required' });
      }
    }
  });

const editUserFormSchema = z.object({
  name: z.string().trim().min(2, 'Full name is required').max(100),
  email: z.string().trim().email('Valid email is required'),
  role: z.enum(['admin', 'faculty', 'student']),
  isActive: z.enum(['true', 'false'])
});

export const UserManagement = () => {
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Server query filters & pagination state
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals & selected records
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUserId, setViewingUserId] = useState(null);
  const [statusConfirmUser, setStatusConfirmUser] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Queries
  const usersQuery = useQuery({
    queryKey: ['users', { page, limit: 10, search: debouncedSearch, role: roleFilter, status: statusFilter, sortBy, sortOrder }],
    queryFn: () =>
      userApi.list({
        page,
        limit: 10,
        search: debouncedSearch,
        role: roleFilter,
        status: statusFilter,
        sortBy,
        sortOrder
      })
  });

  const userDetailQuery = useQuery({
    queryKey: ['user', viewingUserId],
    queryFn: () => userApi.getById(viewingUserId),
    enabled: Boolean(viewingUserId)
  });

  // Create form
  const createForm = useForm({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'admin',
      isActive: 'true',
      enrollmentNumber: '',
      rollNumber: '',
      studentDepartment: '',
      course: '',
      semester: '',
      dateOfBirth: '',
      gender: 'MALE',
      studentPhone: '',
      address: '',
      admissionYear: String(new Date().getFullYear()),
      employeeId: '',
      facultyDepartment: '',
      designation: 'ASSISTANT_PROFESSOR',
      specialization: '',
      facultyPhone: ''
    }
  });

  const watchedCreateRole = createForm.watch('role');
  const watchedStudentDept = createForm.watch('studentDepartment');
  const watchedCourse = createForm.watch('course');

  // Academic dropdown lookups when creating linked profiles
  const departmentsQuery = useQuery({
    queryKey: ['departments', 'active'],
    queryFn: () => academicLookupApi.getDepartments({ isActive: true }),
    enabled: isCreateOpen && (watchedCreateRole === 'student' || watchedCreateRole === 'faculty')
  });

  const coursesQuery = useQuery({
    queryKey: ['courses', watchedStudentDept],
    queryFn: () => academicLookupApi.getCourses({ department: watchedStudentDept, isActive: true }),
    enabled: isCreateOpen && watchedCreateRole === 'student' && Boolean(watchedStudentDept)
  });

  const semestersQuery = useQuery({
    queryKey: ['semesters', watchedCourse],
    queryFn: () => academicLookupApi.getSemesters({ course: watchedCourse }),
    enabled: isCreateOpen && watchedCreateRole === 'student' && Boolean(watchedCourse)
  });

  // Edit form
  const editForm = useForm({
    resolver: zodResolver(editUserFormSchema)
  });

  useEffect(() => {
    if (editingUser) {
      editForm.reset({
        name: editingUser.name || '',
        email: editingUser.email || '',
        role: editingUser.role || 'student',
        isActive: editingUser.isActive ? 'true' : 'false'
      });
    }
  }, [editingUser, editForm]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload) => userApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['faculty'] });
      showToast('User account created successfully', 'success');
      createForm.reset();
      setIsCreateOpen(false);
    },
    onError: (err) => {
      showToast(extractApiErrorMessage(err, 'Failed to create user account'), 'error');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => userApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      showToast('User account updated successfully', 'success');
      setEditingUser(null);
    },
    onError: (err) => {
      showToast(extractApiErrorMessage(err, 'Failed to update user account'), 'error');
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }) => userApi.updateStatus(id, isActive),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['faculty'] });
      showToast(res?.message || 'Account status updated', 'success');
      setStatusConfirmUser(null);
    },
    onError: (err) => {
      showToast(extractApiErrorMessage(err, 'Failed to update account status'), 'error');
      setStatusConfirmUser(null);
    }
  });

  const onCreateSubmit = (values) => {
    const payload = {
      name: values.name,
      email: values.email,
      password: values.password,
      role: values.role,
      isActive: values.isActive === 'true'
    };

    if (values.role === 'student') {
      payload.studentProfile = {
        enrollmentNumber: values.enrollmentNumber,
        ...(values.rollNumber ? { rollNumber: values.rollNumber } : {}),
        department: values.studentDepartment,
        course: values.course,
        semester: values.semester,
        dateOfBirth: values.dateOfBirth,
        gender: values.gender,
        contactNumber: values.studentPhone,
        address: values.address,
        admissionYear: Number(values.admissionYear) || new Date().getFullYear()
      };
    } else if (values.role === 'faculty') {
      payload.facultyProfile = {
        employeeId: values.employeeId,
        department: values.facultyDepartment,
        designation: values.designation,
        specialization: values.specialization,
        contactNumber: values.facultyPhone
      };
    }

    createMutation.mutate(payload);
  };

  const onEditSubmit = (values) => {
    if (!editingUser) return;
    const payload = {
      name: values.name,
      email: values.email,
      isActive: values.isActive === 'true'
    };
    if (!editingUser.linkedProfile && values.role !== editingUser.role) {
      payload.role = values.role;
    }
    updateMutation.mutate({ id: editingUser.id, payload });
  };

  const users = usersQuery.data?.data || [];
  const pagination = usersQuery.data?.meta?.pagination || { page: 1, totalPages: 1, totalRecords: 0 };
  const departmentOptions = (departmentsQuery.data?.data || []).map((d) => ({ value: d._id, label: `${d.code} — ${d.name}` }));
  const courseOptions = (coursesQuery.data?.data || []).map((c) => ({ value: c._id, label: `${c.code} — ${c.name}` }));
  const semesterOptions = (semestersQuery.data?.data || []).map((s) => ({
    value: s._id,
    label: `Semester ${s.semesterNumber} (${s.academicYear})`
  }));

  const columns = [
    {
      header: 'User',
      accessor: 'name',
      render: (row) => (
        <div className="flex items-center space-x-3">
          <Avatar name={row.name} size="sm" status={row.isActive ? 'online' : 'offline'} />
          <div>
            <p className="font-semibold text-slate-900 text-sm leading-tight">{row.name}</p>
            <p className="text-xs text-slate-500">{row.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Role',
      accessor: 'role',
      render: (row) => (
        <Badge
          variant={row.role === 'admin' ? 'primary' : row.role === 'faculty' ? 'success' : 'info'}
          size="sm"
        >
          {row.role.toUpperCase()}
        </Badge>
      )
    },
    {
      header: 'Linked Identifier',
      accessor: 'linkedProfile',
      sortable: false,
      render: (row) =>
        row.linkedProfile ? (
          <div>
            <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
              {row.linkedProfile.identifier}
            </span>
            {row.linkedProfile.department?.code && (
              <span className="ml-1.5 text-[11px] text-slate-500">({row.linkedProfile.department.code})</span>
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">System Account</span>
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
      header: 'Last Login',
      accessor: 'lastLogin',
      render: (row) => <span className="text-xs text-slate-500">{formatDate(row.lastLogin)}</span>
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
      render: (row) => {
        const isSelf = currentUser?.id === row.id;
        return (
          <div className="inline-flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewingUserId(row.id)}
              title="View user details"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingUser(row)}
              title="Edit user"
            >
              <Edit3 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={isSelf}
              onClick={() => setStatusConfirmUser(row)}
              title={isSelf ? 'Cannot deactivate your own account' : row.isActive ? 'Deactivate user' : 'Activate user'}
              className={row.isActive ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}
            >
              <Power className="w-4 h-4" />
            </Button>
          </div>
        );
      }
    }
  ];

  const toolbarExtras = (
    <>
      <select
        aria-label="Filter by role"
        value={roleFilter}
        onChange={(e) => {
          setRoleFilter(e.target.value);
          setPage(1);
        }}
        className="text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      >
        <option value="">All Roles</option>
        <option value="admin">Admin</option>
        <option value="faculty">Faculty</option>
        <option value="student">Student</option>
      </select>

      <select
        aria-label="Filter by status"
        value={statusFilter}
        onChange={(e) => {
          setStatusFilter(e.target.value);
          setPage(1);
        }}
        className="text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      >
        <option value="">All Statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </>
  );

  const viewedUser = userDetailQuery.data?.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Manage institutional authentication identities, role assignments, and account access states."
        actions={
          <Button
            variant="primary"
            icon={UserPlus}
            onClick={() => {
              createForm.reset();
              setIsCreateOpen(true);
            }}
          >
            Create User
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={users}
        isLoading={usersQuery.isLoading}
        error={usersQuery.error}
        onRetry={usersQuery.refetch}
        serverSide
        searchPlaceholder="Search by name, email, enrollment or employee ID..."
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
        emptyTitle="No user accounts found"
        emptyDescription="Try adjusting your search criteria or role/status filters."
      />

      {/* CREATE USER MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => !createMutation.isPending && setIsCreateOpen(false)}
        title="Create User Account"
        subtitle="Provision an institutional user with role-consistent profile linkage."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              placeholder="e.g., Dr. Amitabh Verma"
              required
              error={createForm.formState.errors.name?.message}
              {...createForm.register('name')}
            />
            <Input
              label="Institutional Email"
              type="email"
              placeholder="user@aktu.ac.in"
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
            <Select
              label="System Role"
              required
              placeholder={null}
              options={[
                { value: 'admin', label: 'Administrator (admin)' },
                { value: 'faculty', label: 'Faculty Member (faculty)' },
                { value: 'student', label: 'Student Scholar (student)' }
              ]}
              error={createForm.formState.errors.role?.message}
              {...createForm.register('role')}
            />
            <Select
              label="Account Status"
              required
              placeholder={null}
              options={[
                { value: 'true', label: 'Active (Login Enabled)' },
                { value: 'false', label: 'Inactive (Login Disabled)' }
              ]}
              {...createForm.register('isActive')}
            />
          </div>

          {/* Linked Student Profile Fields */}
          {watchedCreateRole === 'student' && (
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-brand-700">
                <GraduationCap className="w-4 h-4" />
                <span>Linked Student Profile Details</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Enrollment Number"
                  placeholder="EN2200270100099"
                  required
                  error={createForm.formState.errors.enrollmentNumber?.message}
                  {...createForm.register('enrollmentNumber')}
                />
                <Input
                  label="Roll Number (Optional)"
                  placeholder="2200270100099"
                  error={createForm.formState.errors.rollNumber?.message}
                  {...createForm.register('rollNumber')}
                />
                <Select
                  label="Department"
                  required
                  placeholder="Select department"
                  options={departmentOptions}
                  error={createForm.formState.errors.studentDepartment?.message}
                  {...createForm.register('studentDepartment', {
                    onChange: () => {
                      createForm.setValue('course', '');
                      createForm.setValue('semester', '');
                    }
                  })}
                />
                <Select
                  label="Course"
                  required
                  disabled={!watchedStudentDept}
                  placeholder={watchedStudentDept ? 'Select course' : 'Select department first'}
                  options={courseOptions}
                  error={createForm.formState.errors.course?.message}
                  {...createForm.register('course', {
                    onChange: () => {
                      createForm.setValue('semester', '');
                    }
                  })}
                />
                <Select
                  label="Current Semester"
                  required
                  disabled={!watchedCourse}
                  placeholder={watchedCourse ? 'Select semester' : 'Select course first'}
                  options={semesterOptions}
                  error={createForm.formState.errors.semester?.message}
                  {...createForm.register('semester')}
                />
                <Input
                  label="Admission Year"
                  type="number"
                  error={createForm.formState.errors.admissionYear?.message}
                  {...createForm.register('admissionYear')}
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  required
                  error={createForm.formState.errors.dateOfBirth?.message}
                  {...createForm.register('dateOfBirth')}
                />
                <Select
                  label="Gender"
                  required
                  placeholder={null}
                  options={GENDER_OPTIONS}
                  error={createForm.formState.errors.gender?.message}
                  {...createForm.register('gender')}
                />
                <Input
                  label="Phone Number"
                  placeholder="9876543210"
                  required
                  error={createForm.formState.errors.studentPhone?.message}
                  {...createForm.register('studentPhone')}
                />
              </div>
              <Textarea
                label="Address"
                rows={2}
                placeholder="Residential address"
                required
                error={createForm.formState.errors.address?.message}
                {...createForm.register('address')}
              />
            </div>
          )}

          {/* Linked Faculty Profile Fields */}
          {watchedCreateRole === 'faculty' && (
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                <Users className="w-4 h-4" />
                <span>Linked Faculty Profile Details</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Employee ID"
                  placeholder="FAC-CSE-010"
                  required
                  error={createForm.formState.errors.employeeId?.message}
                  {...createForm.register('employeeId')}
                />
                <Select
                  label="Department"
                  required
                  placeholder="Select department"
                  options={departmentOptions}
                  error={createForm.formState.errors.facultyDepartment?.message}
                  {...createForm.register('facultyDepartment')}
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
                  placeholder="e.g., Machine Learning & Cloud Systems"
                  required
                  error={createForm.formState.errors.specialization?.message}
                  {...createForm.register('specialization')}
                />
                <Input
                  label="Phone Number"
                  placeholder="9876543210"
                  required
                  error={createForm.formState.errors.facultyPhone?.message}
                  {...createForm.register('facultyPhone')}
                />
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2.5">
            <Button
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={createMutation.isPending} disabled={createMutation.isPending}>
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT USER MODAL */}
      <Modal
        isOpen={Boolean(editingUser)}
        onClose={() => !updateMutation.isPending && setEditingUser(null)}
        title="Edit User Account"
        subtitle={editingUser ? `Updating account ${editingUser.email}` : ''}
      >
        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
          <Input
            label="Full Name"
            required
            error={editForm.formState.errors.name?.message}
            {...editForm.register('name')}
          />
          <Input
            label="Email Address"
            type="email"
            required
            error={editForm.formState.errors.email?.message}
            {...editForm.register('email')}
          />
          <Select
            label="Role"
            placeholder={null}
            disabled={Boolean(editingUser?.linkedProfile) || editingUser?.id === currentUser?.id}
            helperText={
              editingUser?.linkedProfile
                ? `Role is locked because this account is linked to a ${editingUser.linkedProfile.type} profile.`
                : editingUser?.id === currentUser?.id
                ? 'You cannot change your own role.'
                : 'Changing role invalidates active sessions.'
            }
            options={[
              { value: 'admin', label: 'Administrator (admin)' },
              { value: 'faculty', label: 'Faculty Member (faculty)' },
              { value: 'student', label: 'Student Scholar (student)' }
            ]}
            {...editForm.register('role')}
          />
          <Select
            label="Account Status"
            placeholder={null}
            disabled={editingUser?.id === currentUser?.id}
            options={[
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' }
            ]}
            {...editForm.register('isActive')}
          />

          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2.5">
            <Button variant="outline" onClick={() => setEditingUser(null)} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={updateMutation.isPending} disabled={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* USER DETAIL MODAL */}
      <Modal
        isOpen={Boolean(viewingUserId)}
        onClose={() => setViewingUserId(null)}
        title="User Identity Details"
        subtitle="Verified account record and linked institutional profile."
      >
        {userDetailQuery.isLoading ? (
          <div className="py-8 text-center text-sm text-slate-500">Loading user details...</div>
        ) : viewedUser ? (
          <div className="space-y-5">
            <div className="flex items-center space-x-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <Avatar name={viewedUser.name} size="lg" status={viewedUser.isActive ? 'online' : 'offline'} />
              <div className="min-w-0 flex-1">
                <h4 className="text-base font-bold text-slate-900 truncate">{viewedUser.name}</h4>
                <p className="text-xs text-slate-500 flex items-center mt-0.5">
                  <Mail className="w-3.5 h-3.5 mr-1.5" /> {viewedUser.email}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant={viewedUser.role === 'admin' ? 'primary' : viewedUser.role === 'faculty' ? 'success' : 'info'} size="sm">
                    {viewedUser.role.toUpperCase()}
                  </Badge>
                  <Badge variant={getStatusBadgeVariant(viewedUser.isActive)} dot size="sm">
                    {viewedUser.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-200">
                <p className="text-slate-400 font-semibold uppercase flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1" /> Created On
                </p>
                <p className="text-slate-800 font-semibold mt-1">{formatDate(viewedUser.createdAt)}</p>
              </div>
              <div className="p-3 rounded-xl border border-slate-200">
                <p className="text-slate-400 font-semibold uppercase flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1" /> Last Login
                </p>
                <p className="text-slate-800 font-semibold mt-1">{formatDate(viewedUser.lastLogin)}</p>
              </div>
            </div>

            {viewedUser.profileDetails && (
              <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 uppercase">
                  <ShieldCheck className="w-4 h-4 text-brand-600" />
                  <span>Linked {viewedUser.linkedProfile?.type} Profile</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-slate-500">Identifier: </span>
                    <span className="font-mono font-semibold text-slate-900">{viewedUser.linkedProfile?.identifier}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Department: </span>
                    <span className="font-semibold text-slate-900">
                      {viewedUser.profileDetails.department?.name || '—'}
                    </span>
                  </div>
                  {viewedUser.profileDetails.course && (
                    <div>
                      <span className="text-slate-500">Course: </span>
                      <span className="font-semibold text-slate-900">{viewedUser.profileDetails.course.code}</span>
                    </div>
                  )}
                  {viewedUser.profileDetails.designation && (
                    <div>
                      <span className="text-slate-500">Designation: </span>
                      <span className="font-semibold text-slate-900">{viewedUser.profileDetails.designation}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* ACTIVATE / DEACTIVATE CONFIRMATION */}
      <ConfirmDialog
        isOpen={Boolean(statusConfirmUser)}
        onClose={() => !statusMutation.isPending && setStatusConfirmUser(null)}
        onConfirm={() =>
          statusMutation.mutate({
            id: statusConfirmUser.id,
            isActive: !statusConfirmUser.isActive
          })
        }
        title={statusConfirmUser?.isActive ? 'Deactivate User Account' : 'Activate User Account'}
        message={
          statusConfirmUser?.isActive
            ? `Are you sure you want to deactivate ${statusConfirmUser?.email}? They will immediately lose session access and will not be able to sign in. Historical academic records will be preserved.`
            : `Restore authentication access for ${statusConfirmUser?.email}?`
        }
        confirmText={statusConfirmUser?.isActive ? 'Deactivate Account' : 'Activate Account'}
        variant={statusConfirmUser?.isActive ? 'danger' : 'warning'}
        isLoading={statusMutation.isPending}
      />
    </div>
  );
};

export default UserManagement;
