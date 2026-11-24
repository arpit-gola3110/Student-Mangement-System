import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
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
import { studentApi, academicLookupApi } from '../../services/managementService';
import {
  passwordPolicyField,
  phoneField,
  extractApiErrorMessage,
  formatDate,
  GENDER_OPTIONS,
  STUDENT_STATUS_OPTIONS,
  getStatusBadgeVariant
} from '../../utils/formSchemas';
import {
  UserPlus,
  Eye,
  Edit3,
  Power,
  Mail,
  Phone,
  MapPin,
  BookOpen,
  GraduationCap,
  ShieldAlert
} from 'lucide-react';

const createStudentFormSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: z.string().trim().min(1, 'Last name is required').max(60),
  email: z.string().trim().email('Valid institutional email is required'),
  password: passwordPolicyField,
  enrollmentNumber: z.string().trim().min(3, 'Enrollment number is required').max(40),
  rollNumber: z.string().trim().optional(),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  contactNumber: phoneField,
  address: z.string().trim().min(3, 'Address is required').max(300),
  department: z.string().min(1, 'Department is required'),
  course: z.string().min(1, 'Course is required'),
  semester: z.string().min(1, 'Semester is required'),
  admissionYear: z.coerce.number().int().min(2000).max(2100),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'GRADUATED'])
});

const editStudentFormSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: z.string().trim().min(1, 'Last name is required').max(60),
  enrollmentNumber: z.string().trim().min(3, 'Enrollment number is required').max(40),
  rollNumber: z.string().trim().optional(),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  contactNumber: phoneField,
  address: z.string().trim().min(3, 'Address is required').max(300),
  department: z.string().min(1, 'Department is required'),
  course: z.string().min(1, 'Course is required'),
  semester: z.string().min(1, 'Semester is required'),
  admissionYear: z.coerce.number().int().min(2000).max(2100),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'GRADUATED'])
});

export const StudentManagement = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Server table filters & pagination
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [viewingStudentId, setViewingStudentId] = useState(null);
  const [statusConfirmStudent, setStatusConfirmStudent] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Queries
  const studentsQuery = useQuery({
    queryKey: [
      'students',
      {
        page,
        limit: 10,
        search: debouncedSearch,
        department: deptFilter,
        course: courseFilter,
        semester: semesterFilter,
        status: statusFilter,
        sortBy,
        sortOrder
      }
    ],
    queryFn: () =>
      studentApi.list({
        page,
        limit: 10,
        search: debouncedSearch,
        department: deptFilter,
        course: courseFilter,
        semester: semesterFilter,
        status: statusFilter,
        sortBy,
        sortOrder
      })
  });

  const studentDetailQuery = useQuery({
    queryKey: ['student', viewingStudentId],
    queryFn: () => studentApi.getById(viewingStudentId),
    enabled: Boolean(viewingStudentId)
  });

  const departmentsQuery = useQuery({
    queryKey: ['departments', 'active'],
    queryFn: () => academicLookupApi.getDepartments({ isActive: true })
  });

  // Toolbar cascade lookups
  const filterCoursesQuery = useQuery({
    queryKey: ['courses', 'filter', deptFilter],
    queryFn: () => academicLookupApi.getCourses({ department: deptFilter, isActive: true }),
    enabled: Boolean(deptFilter)
  });

  const filterSemestersQuery = useQuery({
    queryKey: ['semesters', 'filter', courseFilter],
    queryFn: () => academicLookupApi.getSemesters({ course: courseFilter }),
    enabled: Boolean(courseFilter)
  });

  // Create Form & Dependent Selectors
  const createForm = useForm({
    resolver: zodResolver(createStudentFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      enrollmentNumber: '',
      rollNumber: '',
      dateOfBirth: '',
      gender: 'MALE',
      contactNumber: '',
      address: '',
      department: '',
      course: '',
      semester: '',
      admissionYear: new Date().getFullYear(),
      status: 'ACTIVE'
    }
  });

  const createDept = createForm.watch('department');
  const createCourse = createForm.watch('course');

  const createCoursesQuery = useQuery({
    queryKey: ['courses', 'create', createDept],
    queryFn: () => academicLookupApi.getCourses({ department: createDept, isActive: true }),
    enabled: isCreateOpen && Boolean(createDept)
  });

  const createSemestersQuery = useQuery({
    queryKey: ['semesters', 'create', createCourse],
    queryFn: () => academicLookupApi.getSemesters({ course: createCourse }),
    enabled: isCreateOpen && Boolean(createCourse)
  });

  // Edit Form & Dependent Selectors
  const editForm = useForm({
    resolver: zodResolver(editStudentFormSchema)
  });

  const editDept = editForm.watch('department');
  const editCourse = editForm.watch('course');

  const editCoursesQuery = useQuery({
    queryKey: ['courses', 'edit', editDept],
    queryFn: () => academicLookupApi.getCourses({ department: editDept, isActive: true }),
    enabled: Boolean(editingStudent) && Boolean(editDept)
  });

  const editSemestersQuery = useQuery({
    queryKey: ['semesters', 'edit', editCourse],
    queryFn: () => academicLookupApi.getSemesters({ course: editCourse }),
    enabled: Boolean(editingStudent) && Boolean(editCourse)
  });

  useEffect(() => {
    if (editingStudent) {
      const dob = editingStudent.dateOfBirth
        ? new Date(editingStudent.dateOfBirth).toISOString().split('T')[0]
        : '';
      editForm.reset({
        firstName: editingStudent.firstName || '',
        lastName: editingStudent.lastName || '',
        enrollmentNumber: editingStudent.enrollmentNumber || '',
        rollNumber: editingStudent.rollNumber || '',
        dateOfBirth: dob,
        gender: editingStudent.gender || 'MALE',
        contactNumber: editingStudent.contactNumber || '',
        address: editingStudent.address || '',
        department: editingStudent.department?._id || editingStudent.department || '',
        course: editingStudent.course?._id || editingStudent.course || '',
        semester: editingStudent.semester?._id || editingStudent.semester || '',
        admissionYear: editingStudent.admissionYear || new Date().getFullYear(),
        status: editingStudent.status || 'ACTIVE'
      });
    }
  }, [editingStudent, editForm]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload) => studentApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast('Student registered and linked user provisioned successfully', 'success');
      createForm.reset();
      setIsCreateOpen(false);
    },
    onError: (err) => {
      showToast(extractApiErrorMessage(err, 'Failed to register student'), 'error');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => studentApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast('Student profile updated successfully', 'success');
      setEditingStudent(null);
    },
    onError: (err) => {
      showToast(extractApiErrorMessage(err, 'Failed to update student profile'), 'error');
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => studentApi.updateStatus(id, status),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast(res?.message || 'Student status updated', 'success');
      setStatusConfirmStudent(null);
    },
    onError: (err) => {
      showToast(extractApiErrorMessage(err, 'Failed to update student status'), 'error');
      setStatusConfirmStudent(null);
    }
  });

  const onCreateSubmit = (values) => {
    const payload = {
      ...values,
      rollNumber: values.rollNumber || values.enrollmentNumber
    };
    createMutation.mutate(payload);
  };

  const onEditSubmit = (values) => {
    if (!editingStudent) return;
    updateMutation.mutate({
      id: editingStudent._id,
      payload: {
        ...values,
        rollNumber: values.rollNumber || values.enrollmentNumber
      }
    });
  };

  const students = studentsQuery.data?.data || [];
  const pagination = studentsQuery.data?.meta?.pagination || { page: 1, totalPages: 1, totalRecords: 0 };

  const toDeptOpts = (list = []) => list.map((d) => ({ value: d._id, label: `${d.code} — ${d.name}` }));
  const toCourseOpts = (list = []) => list.map((c) => ({ value: c._id, label: `${c.code} — ${c.name}` }));
  const toSemOpts = (list = []) => list.map((s) => ({ value: s._id, label: `Sem ${s.semesterNumber} (${s.academicYear})` }));

  const departmentOptions = toDeptOpts(departmentsQuery.data?.data);
  const filterCourseOptions = toCourseOpts(filterCoursesQuery.data?.data);
  const filterSemesterOptions = toSemOpts(filterSemestersQuery.data?.data);
  const createCourseOptions = toCourseOpts(createCoursesQuery.data?.data);
  const createSemesterOptions = toSemOpts(createSemestersQuery.data?.data);
  const editCourseOptions = toCourseOpts(editCoursesQuery.data?.data);
  const editSemesterOptions = toSemOpts(editSemestersQuery.data?.data);

  const columns = [
    {
      header: 'Enrollment',
      accessor: 'enrollmentNumber',
      render: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
            {row.enrollmentNumber}
          </span>
          {row.rollNumber && row.rollNumber !== row.enrollmentNumber && (
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Roll: {row.rollNumber}</p>
          )}
        </div>
      )
    },
    {
      header: 'Student',
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
      header: 'Academic Program',
      accessor: 'department',
      sortable: false,
      render: (row) => (
        <div className="text-xs">
          <p className="font-semibold text-slate-800">{row.course?.code || row.department?.code || '—'}</p>
          <p className="text-slate-500">
            {row.department?.code || '—'} • Sem {row.semester?.semesterNumber || row.currentSemester}
          </p>
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
      header: 'Admission',
      accessor: 'admissionYear',
      render: (row) => <span className="text-xs text-slate-600">{row.admissionYear || '—'}</span>
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
          <Button variant="ghost" size="sm" onClick={() => setViewingStudentId(row._id)} title="View details">
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditingStudent(row)} title="Edit student">
            <Edit3 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatusConfirmStudent(row)}
            title={row.status === 'ACTIVE' ? 'Deactivate student' : 'Activate student'}
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
          setCourseFilter('');
          setSemesterFilter('');
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
        aria-label="Filter by course"
        value={courseFilter}
        disabled={!deptFilter}
        onChange={(e) => {
          setCourseFilter(e.target.value);
          setSemesterFilter('');
          setPage(1);
        }}
        className="text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 disabled:opacity-50"
      >
        <option value="">{deptFilter ? 'All Courses' : 'Select Dept First'}</option>
        {filterCourseOptions.map((opt) => (
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
        {filterSemesterOptions.map((opt) => (
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
        {STUDENT_STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </>
  );

  const viewedStudent = studentDetailQuery.data?.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Management"
        subtitle="Manage student enrollments, academic cohort placement, and linked authentication profiles."
        actions={
          <Button
            variant="primary"
            icon={UserPlus}
            onClick={() => {
              createForm.reset();
              setIsCreateOpen(true);
            }}
          >
            Add Student
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={students}
        isLoading={studentsQuery.isLoading}
        error={studentsQuery.error}
        onRetry={studentsQuery.refetch}
        serverSide
        searchPlaceholder="Search by name, enrollment, roll number or email..."
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
        emptyTitle="No student records found"
        emptyDescription="Add a student or adjust your department, course, semester, or search filters."
      />

      {/* ADD STUDENT MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => !createMutation.isPending && setIsCreateOpen(false)}
        title="Register New Student"
        subtitle="Creates both the Student academic profile and linked User authentication account."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              placeholder="e.g., Rahul"
              required
              error={createForm.formState.errors.firstName?.message}
              {...createForm.register('firstName')}
            />
            <Input
              label="Last Name"
              placeholder="e.g., Verma"
              required
              error={createForm.formState.errors.lastName?.message}
              {...createForm.register('lastName')}
            />
            <Input
              label="Institutional Email"
              type="email"
              placeholder="student@aktu.ac.in"
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
              label="Enrollment Number"
              placeholder="EN2600270100001"
              required
              error={createForm.formState.errors.enrollmentNumber?.message}
              {...createForm.register('enrollmentNumber')}
            />
            <Input
              label="Roll Number (Optional)"
              placeholder="2600270100001"
              error={createForm.formState.errors.rollNumber?.message}
              {...createForm.register('rollNumber')}
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
              error={createForm.formState.errors.contactNumber?.message}
              {...createForm.register('contactNumber')}
            />
            <Input
              label="Admission Year"
              type="number"
              required
              error={createForm.formState.errors.admissionYear?.message}
              {...createForm.register('admissionYear')}
            />
          </div>

          <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Department"
              required
              placeholder="Select department"
              options={departmentOptions}
              error={createForm.formState.errors.department?.message}
              {...createForm.register('department', {
                onChange: () => {
                  createForm.setValue('course', '');
                  createForm.setValue('semester', '');
                }
              })}
            />
            <Select
              label="Course"
              required
              disabled={!createDept}
              placeholder={createDept ? 'Select course' : 'Select department first'}
              options={createCourseOptions}
              error={createForm.formState.errors.course?.message}
              {...createForm.register('course', {
                onChange: () => {
                  createForm.setValue('semester', '');
                }
              })}
            />
            <Select
              label="Semester"
              required
              disabled={!createCourse}
              placeholder={createCourse ? 'Select semester' : 'Select course first'}
              options={createSemesterOptions}
              error={createForm.formState.errors.semester?.message}
              {...createForm.register('semester')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Initial Status"
              required
              placeholder={null}
              options={STUDENT_STATUS_OPTIONS}
              {...createForm.register('status')}
            />
          </div>

          <Textarea
            label="Residential Address"
            rows={2}
            placeholder="City, State"
            required
            error={createForm.formState.errors.address?.message}
            {...createForm.register('address')}
          />

          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2.5">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={createMutation.isPending} disabled={createMutation.isPending}>
              Register Student
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT STUDENT MODAL */}
      <Modal
        isOpen={Boolean(editingStudent)}
        onClose={() => !updateMutation.isPending && setEditingStudent(null)}
        title="Edit Student Profile"
        subtitle={editingStudent ? `${editingStudent.enrollmentNumber} • ${editingStudent.user?.email || ''}` : ''}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
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
              label="Enrollment Number"
              required
              error={editForm.formState.errors.enrollmentNumber?.message}
              {...editForm.register('enrollmentNumber')}
            />
            <Input
              label="Roll Number"
              error={editForm.formState.errors.rollNumber?.message}
              {...editForm.register('rollNumber')}
            />
            <Input
              label="Date of Birth"
              type="date"
              required
              error={editForm.formState.errors.dateOfBirth?.message}
              {...editForm.register('dateOfBirth')}
            />
            <Select
              label="Gender"
              required
              placeholder={null}
              options={GENDER_OPTIONS}
              error={editForm.formState.errors.gender?.message}
              {...editForm.register('gender')}
            />
            <Input
              label="Phone Number"
              required
              error={editForm.formState.errors.contactNumber?.message}
              {...editForm.register('contactNumber')}
            />
            <Input
              label="Admission Year"
              type="number"
              required
              error={editForm.formState.errors.admissionYear?.message}
              {...editForm.register('admissionYear')}
            />
          </div>

          <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Controller
              name="department"
              control={editForm.control}
              render={({ field }) => (
                <Select
                  label="Department"
                  required
                  placeholder="Select department"
                  options={departmentOptions}
                  value={field.value || ''}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                    editForm.setValue('course', '');
                    editForm.setValue('semester', '');
                  }}
                  error={editForm.formState.errors.department?.message}
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
                  disabled={!editDept}
                  placeholder={editDept ? 'Select course' : 'Select department first'}
                  options={editCourseOptions}
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
                  options={editSemesterOptions}
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  error={editForm.formState.errors.semester?.message}
                />
              )}
            />
          </div>

          <Select
            label="Student Status"
            required
            placeholder={null}
            options={STUDENT_STATUS_OPTIONS}
            {...editForm.register('status')}
          />

          <Textarea
            label="Residential Address"
            rows={2}
            required
            error={editForm.formState.errors.address?.message}
            {...editForm.register('address')}
          />

          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2.5">
            <Button variant="outline" onClick={() => setEditingStudent(null)} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={updateMutation.isPending} disabled={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* VIEW STUDENT DETAIL MODAL */}
      <Modal
        isOpen={Boolean(viewingStudentId)}
        onClose={() => setViewingStudentId(null)}
        title="Student Academic Profile"
        subtitle="Complete student identity, enrollment, and program placement."
        maxWidth="max-w-xl"
      >
        {studentDetailQuery.isLoading ? (
          <div className="py-8 text-center text-sm text-slate-500">Loading student record...</div>
        ) : viewedStudent ? (
          <div className="space-y-5">
            <div className="flex items-center space-x-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <Avatar name={`${viewedStudent.firstName} ${viewedStudent.lastName}`} size="lg" />
              <div className="min-w-0 flex-1">
                <h4 className="text-base font-bold text-slate-900">
                  {viewedStudent.firstName} {viewedStudent.lastName}
                </h4>
                <p className="text-xs font-mono text-slate-600 mt-0.5">
                  Enrollment: {viewedStudent.enrollmentNumber} • Roll: {viewedStudent.rollNumber}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant={getStatusBadgeVariant(viewedStudent.status)} dot size="sm">
                    {viewedStudent.status}
                  </Badge>
                  <Badge variant={getStatusBadgeVariant(viewedStudent.user?.isActive)} size="sm">
                    Login: {viewedStudent.user?.isActive ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 space-y-1">
                <p className="text-slate-400 font-semibold uppercase flex items-center">
                  <Mail className="w-3.5 h-3.5 mr-1" /> Email & Contact
                </p>
                <p className="text-slate-900 font-semibold">{viewedStudent.user?.email || '—'}</p>
                <p className="text-slate-600 flex items-center">
                  <Phone className="w-3 h-3 mr-1" /> {viewedStudent.contactNumber}
                </p>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 space-y-1">
                <p className="text-slate-400 font-semibold uppercase flex items-center">
                  <GraduationCap className="w-3.5 h-3.5 mr-1" /> Personal Info
                </p>
                <p className="text-slate-900 font-semibold">
                  DOB: {formatDate(viewedStudent.dateOfBirth)} ({viewedStudent.gender})
                </p>
                <p className="text-slate-600 flex items-start">
                  <MapPin className="w-3 h-3 mr-1 mt-0.5 shrink-0" /> {viewedStudent.address}
                </p>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 space-y-1 sm:col-span-2">
                <p className="text-slate-400 font-semibold uppercase flex items-center">
                  <BookOpen className="w-3.5 h-3.5 mr-1" /> Program & Term Placement
                </p>
                <p className="text-slate-900 font-semibold">
                  {viewedStudent.department?.name || '—'} — {viewedStudent.course?.name || '—'}
                </p>
                <p className="text-slate-600">
                  Semester {viewedStudent.semester?.semesterNumber || viewedStudent.currentSemester} (
                  {viewedStudent.academicYear || viewedStudent.semester?.academicYear || '—'}) • Admission{' '}
                  {viewedStudent.admissionYear || '—'}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start space-x-2 text-xs text-amber-800">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Soft deactivation is enforced for students to preserve historical attendance, examination results, and academic transcripts.
              </span>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* DEACTIVATE / ACTIVATE CONFIRMATION */}
      <ConfirmDialog
        isOpen={Boolean(statusConfirmStudent)}
        onClose={() => !statusMutation.isPending && setStatusConfirmStudent(null)}
        onConfirm={() =>
          statusMutation.mutate({
            id: statusConfirmStudent._id,
            status: statusConfirmStudent.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
          })
        }
        title={statusConfirmStudent?.status === 'ACTIVE' ? 'Deactivate Student Account' : 'Activate Student Account'}
        message={
          statusConfirmStudent?.status === 'ACTIVE'
            ? `Deactivating ${statusConfirmStudent?.firstName} ${statusConfirmStudent?.lastName} (${statusConfirmStudent?.enrollmentNumber}) will disable their portal login while preserving all attendance and result history.`
            : `Re-activate ${statusConfirmStudent?.firstName} ${statusConfirmStudent?.lastName} and restore portal sign-in access?`
        }
        confirmText={statusConfirmStudent?.status === 'ACTIVE' ? 'Deactivate Student' : 'Activate Student'}
        variant={statusConfirmStudent?.status === 'ACTIVE' ? 'danger' : 'warning'}
        isLoading={statusMutation.isPending}
      />
    </div>
  );
};

export default StudentManagement;
