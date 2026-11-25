import React, { useState, useEffect, useMemo } from 'react';
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
import { assignmentApi, academicLookupApi } from '../../services/managementService';
import {
  extractApiErrorMessage,
  formatDate,
  ASSIGNMENT_STATUS_OPTIONS,
  getStatusBadgeVariant
} from '../../utils/formSchemas';
import { UserCheck, Eye, Edit3, RefreshCw, Trash2, Users } from 'lucide-react';

const createAssignmentFormSchema = z.object({
  departmentFilter: z.string().optional(),
  faculty: z.string().min(1, 'Faculty member is required'),
  course: z.string().min(1, 'Course selection is required'),
  semester: z.string().min(1, 'Semester selection is required'),
  subject: z.string().min(1, 'Subject selection is required'),
  section: z.string().trim().min(1, 'Section is required').max(10),
  academicYear: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{4}$/, 'Academic year must use YYYY-YYYY format (e.g., 2026-2027)'),
  assignmentDate: z.string().optional()
});

const editAssignmentFormSchema = z.object({
  faculty: z.string().min(1, 'Faculty member is required'),
  section: z.string().trim().min(1, 'Section is required').max(10),
  academicYear: z.string().trim().regex(/^\d{4}-\d{4}$/, 'Academic year must use YYYY-YYYY format'),
  assignmentDate: z.string().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'REVOKED'])
});

export const FacultyAssignmentManagement = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortColumn, setSortColumn] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');

  // Filter states
  const [filterFaculty, setFilterFaculty] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAcademicYear, setFilterAcademicYear] = useState('');

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);
  const [nextStatusValue, setNextStatusValue] = useState('REVOKED');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formSubmitError, setFormSubmitError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Lookups
  const { data: deptLookup } = useQuery({
    queryKey: ['lookup-departments-active'],
    queryFn: () => academicLookupApi.getDepartments({ isActive: true })
  });
  const { data: courseLookup } = useQuery({
    queryKey: ['lookup-courses-active'],
    queryFn: () => academicLookupApi.getCourses({ isActive: true })
  });
  const { data: semesterLookup } = useQuery({
    queryKey: ['lookup-semesters-active'],
    queryFn: () => academicLookupApi.getSemesters({ isActive: true })
  });
  const { data: subjectLookup } = useQuery({
    queryKey: ['lookup-subjects-active'],
    queryFn: () => academicLookupApi.getSubjects({ isActive: true })
  });
  const { data: facultyLookup } = useQuery({
    queryKey: ['lookup-faculty-active'],
    queryFn: () => academicLookupApi.getActiveFaculty()
  });

  const extractArray = (res, key) => (Array.isArray(res?.data) ? res.data : res?.data?.[key]) || [];
  const departments = extractArray(deptLookup, 'departments');
  const courses = extractArray(courseLookup, 'courses');
  const semesters = extractArray(semesterLookup, 'semesters');
  const subjects = extractArray(subjectLookup, 'subjects');
  const activeFaculty = extractArray(facultyLookup, 'faculty');

  const facultyOptions = useMemo(
    () =>
      activeFaculty.map((f) => ({
        value: f._id,
        label: `${f.employeeId} - ${f.firstName} ${f.lastName} (${f.department?.code || 'N/A'})`
      })),
    [activeFaculty]
  );

  // Filter dropdown cascading options
  const filterCourseOptions = useMemo(() => {
    const list = filterDepartment
      ? courses.filter((c) => String(c.department?._id || c.department) === filterDepartment)
      : courses;
    return list.map((c) => ({ value: c._id, label: `${c.code} - ${c.name}` }));
  }, [courses, filterDepartment]);

  const filterSemesterOptions = useMemo(() => {
    const list = filterCourse
      ? semesters.filter((s) => String(s.course?._id || s.course) === filterCourse)
      : semesters;
    return list.map((s) => ({
      value: s._id,
      label: `Sem ${s.semesterNumber} (${s.academicYear})${s.course?.code ? ` · ${s.course.code}` : ''}`
    }));
  }, [semesters, filterCourse]);

  const filterSubjectOptions = useMemo(() => {
    let list = subjects;
    if (filterCourse) {
      list = list.filter((sub) => String(sub.course?._id || sub.course) === filterCourse);
    }
    if (filterSemester) {
      list = list.filter((sub) => String(sub.semester?._id || sub.semester) === filterSemester);
    }
    return list.map((sub) => ({ value: sub._id, label: `${sub.code} - ${sub.name}` }));
  }, [subjects, filterCourse, filterSemester]);

  const {
    data: assignmentsResponse,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: [
      'faculty-assignments',
      {
        page,
        search: debouncedSearch,
        faculty: filterFaculty,
        department: filterDepartment,
        course: filterCourse,
        semester: filterSemester,
        subject: filterSubject,
        status: filterStatus,
        academicYear: filterAcademicYear,
        sortBy: sortColumn,
        sortOrder: sortDirection
      }
    ],
    queryFn: () =>
      assignmentApi.list({
        page,
        limit: 10,
        search: debouncedSearch,
        faculty: filterFaculty,
        department: filterDepartment,
        course: filterCourse,
        semester: filterSemester,
        subject: filterSubject,
        status: filterStatus,
        academicYear: filterAcademicYear,
        sortBy: sortColumn,
        sortOrder: sortDirection
      })
  });

  const assignments = assignmentsResponse?.data?.assignments || [];
  const pagination = assignmentsResponse?.meta?.pagination || { page: 1, totalPages: 1, totalRecords: 0 };

  const createForm = useForm({
    resolver: zodResolver(createAssignmentFormSchema),
    defaultValues: {
      departmentFilter: '',
      faculty: '',
      course: '',
      semester: '',
      subject: '',
      section: 'A',
      academicYear: '',
      assignmentDate: new Date().toISOString().slice(0, 10)
    }
  });

  const watchedCreateDept = createForm.watch('departmentFilter');
  const watchedCreateCourse = createForm.watch('course');
  const watchedCreateSemester = createForm.watch('semester');

  const createCourseOptions = useMemo(() => {
    const list = watchedCreateDept
      ? courses.filter((c) => String(c.department?._id || c.department) === watchedCreateDept)
      : courses;
    return list.map((c) => ({ value: c._id, label: `${c.code} - ${c.name}` }));
  }, [courses, watchedCreateDept]);

  const createSemesterOptions = useMemo(() => {
    if (!watchedCreateCourse) return [];
    return semesters
      .filter((s) => String(s.course?._id || s.course) === watchedCreateCourse)
      .map((s) => ({
        value: s._id,
        label: `Semester ${s.semesterNumber} (${s.academicYear}) - ${s.status}`
      }));
  }, [semesters, watchedCreateCourse]);

  const createSubjectOptions = useMemo(() => {
    if (!watchedCreateCourse || !watchedCreateSemester) return [];
    return subjects
      .filter(
        (sub) =>
          String(sub.course?._id || sub.course) === watchedCreateCourse &&
          String(sub.semester?._id || sub.semester) === watchedCreateSemester
      )
      .map((sub) => ({ value: sub._id, label: `${sub.code} - ${sub.name} (${sub.type})` }));
  }, [subjects, watchedCreateCourse, watchedCreateSemester]);

  const editForm = useForm({
    resolver: zodResolver(editAssignmentFormSchema),
    defaultValues: {
      faculty: '',
      section: 'A',
      academicYear: '2026-2027',
      assignmentDate: '',
      status: 'ACTIVE'
    }
  });

  const invalidateAssignmentQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['faculty-assignments'] });
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
  };

  const createMutation = useMutation({
    mutationFn: (payload) => assignmentApi.create(payload),
    onSuccess: (res) => {
      invalidateAssignmentQueries();
      showToast(res?.message || 'Faculty assigned successfully', 'success');
      setIsCreateOpen(false);
    },
    onError: (err) => {
      const msg = extractApiErrorMessage(err, 'Failed to create faculty assignment');
      setFormSubmitError(msg);
      showToast(msg, 'error');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => assignmentApi.update(id, payload),
    onSuccess: () => {
      invalidateAssignmentQueries();
      showToast('Faculty assignment updated successfully', 'success');
      setIsEditOpen(false);
    },
    onError: (err) => {
      const msg = extractApiErrorMessage(err, 'Failed to update faculty assignment');
      setFormSubmitError(msg);
      showToast(msg, 'error');
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => assignmentApi.updateStatus(id, status),
    onSuccess: (res) => {
      invalidateAssignmentQueries();
      showToast(res?.message || 'Faculty assignment status updated', 'success');
      setStatusTarget(null);
    },
    onError: (err) => {
      showToast(extractApiErrorMessage(err, 'Failed to update status'), 'error');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => assignmentApi.remove(id),
    onSuccess: () => {
      invalidateAssignmentQueries();
      showToast('Faculty assignment deleted successfully', 'success');
      setDeleteTarget(null);
    },
    onError: (err) => {
      showToast(extractApiErrorMessage(err, 'Failed to delete assignment'), 'error');
    }
  });

  const openCreateModal = () => {
    setFormSubmitError('');
    createForm.reset({
      departmentFilter: '',
      faculty: '',
      course: '',
      semester: '',
      subject: '',
      section: 'A',
      academicYear: '',
      assignmentDate: new Date().toISOString().slice(0, 10)
    });
    setIsCreateOpen(true);
  };

  const openEditModal = (row) => {
    setFormSubmitError('');
    setSelectedAssignment(row);
    editForm.reset({
      faculty: row.faculty?._id || '',
      section: row.section || 'A',
      academicYear: row.academicYear || '2026-2027',
      assignmentDate: row.assignmentDate ? new Date(row.assignmentDate).toISOString().slice(0, 10) : '',
      status: row.status || 'ACTIVE'
    });
    setIsEditOpen(true);
  };

  const onCreateSubmit = (values) => {
    setFormSubmitError('');
    const payload = {
      faculty: values.faculty,
      course: values.course,
      semester: values.semester,
      subject: values.subject,
      section: values.section.toUpperCase(),
      academicYear: values.academicYear
    };
    if (values.assignmentDate) payload.assignmentDate = values.assignmentDate;
    createMutation.mutate(payload);
  };

  const onEditSubmit = (values) => {
    setFormSubmitError('');
    const payload = {
      faculty: values.faculty,
      section: values.section.toUpperCase(),
      academicYear: values.academicYear,
      status: values.status
    };
    if (values.assignmentDate) payload.assignmentDate = values.assignmentDate;
    updateMutation.mutate({ id: selectedAssignment._id, payload });
  };

  const columns = [
    {
      key: 'faculty',
      label: 'Faculty Member',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">
            {row.faculty ? `${row.faculty.firstName} ${row.faculty.lastName}` : '—'}
          </p>
          <p className="text-xs text-slate-500 font-mono">
            {row.faculty?.employeeId || 'N/A'} · {row.faculty?.department?.code || '—'}
          </p>
        </div>
      )
    },
    {
      key: 'course',
      label: 'Course & Semester',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-800">{row.course?.code || '—'}</p>
          <p className="text-xs text-slate-500">
            Sem {row.semester?.semesterNumber ?? '—'} · Sec {row.section || 'A'}
          </p>
        </div>
      )
    },
    {
      key: 'subject',
      label: 'Assigned Subject',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">
            <span className="font-mono text-xs text-brand-700 mr-1.5">{row.subject?.code}</span>
            {row.subject?.name || '—'}
          </p>
          <p className="text-xs text-slate-500">
            {row.subject?.type || 'THEORY'} · {row.subject?.credits ?? 0} Credits
          </p>
        </div>
      )
    },
    {
      key: 'enrolledStudentCount',
      label: 'Students',
      render: (row) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
          <Users className="w-3.5 h-3.5 mr-1 text-slate-500" />
          {row.enrolledStudentCount ?? 0}
        </span>
      )
    },
    {
      key: 'academicYear',
      label: 'Session',
      sortable: true,
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-slate-800">{row.academicYear}</p>
          <p className="text-xs text-slate-500">{formatDate(row.assignmentDate || row.createdAt)}</p>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row) => <Badge variant={getStatusBadgeVariant(row.status)}>{row.status}</Badge>
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => {
              setSelectedAssignment(row);
              setIsViewOpen(true);
            }}
            className="p-1.5 text-slate-500 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition"
            title="View details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => openEditModal(row)}
            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
            title="Edit assignment"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          {row.status !== 'COMPLETED' && (
            <button
              type="button"
              onClick={() => {
                setStatusTarget(row);
                setNextStatusValue(row.status === 'ACTIVE' ? 'REVOKED' : 'ACTIVE');
              }}
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
              title="Change status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            title="Delete assignment"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  const toolbarExtras = (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={filterFaculty}
        onChange={(e) => {
          setFilterFaculty(e.target.value);
          setPage(1);
        }}
        className="rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-medium text-slate-700"
        aria-label="Filter by faculty"
      >
        <option value="">All Faculty</option>
        {facultyOptions.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      <select
        value={filterDepartment}
        onChange={(e) => {
          setFilterDepartment(e.target.value);
          setFilterCourse('');
          setFilterSemester('');
          setFilterSubject('');
          setPage(1);
        }}
        className="rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-medium text-slate-700"
        aria-label="Filter by department"
      >
        <option value="">All Departments</option>
        {departments.map((d) => (
          <option key={d._id} value={d._id}>
            {d.code} - {d.name}
          </option>
        ))}
      </select>

      <select
        value={filterCourse}
        onChange={(e) => {
          setFilterCourse(e.target.value);
          setFilterSemester('');
          setFilterSubject('');
          setPage(1);
        }}
        className="rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-medium text-slate-700"
        aria-label="Filter by course"
      >
        <option value="">All Courses</option>
        {filterCourseOptions.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>

      <select
        value={filterSemester}
        onChange={(e) => {
          setFilterSemester(e.target.value);
          setFilterSubject('');
          setPage(1);
        }}
        className="rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-medium text-slate-700"
        aria-label="Filter by semester"
      >
        <option value="">All Semesters</option>
        {filterSemesterOptions.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <select
        value={filterSubject}
        onChange={(e) => {
          setFilterSubject(e.target.value);
          setPage(1);
        }}
        className="rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-medium text-slate-700"
        aria-label="Filter by subject"
      >
        <option value="">All Subjects</option>
        {filterSubjectOptions.map((sub) => (
          <option key={sub.value} value={sub.value}>
            {sub.label}
          </option>
        ))}
      </select>

      <select
        value={filterStatus}
        onChange={(e) => {
          setFilterStatus(e.target.value);
          setPage(1);
        }}
        className="rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-medium text-slate-700"
        aria-label="Filter by status"
      >
        <option value="">All Statuses</option>
        {ASSIGNMENT_STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <input
        type="text"
        value={filterAcademicYear}
        onChange={(e) => {
          setFilterAcademicYear(e.target.value);
          setPage(1);
        }}
        placeholder="Session e.g. 2026-2027"
        className="w-36 rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-medium text-slate-700"
      />

      {(filterFaculty ||
        filterDepartment ||
        filterCourse ||
        filterSemester ||
        filterSubject ||
        filterStatus ||
        filterAcademicYear) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setFilterFaculty('');
            setFilterDepartment('');
            setFilterCourse('');
            setFilterSemester('');
            setFilterSubject('');
            setFilterStatus('');
            setFilterAcademicYear('');
            setPage(1);
          }}
        >
          Clear
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty Assignment Management"
        description="Assign active faculty members to course semesters, subjects, and class sections."
        breadcrumbs={[
          { label: 'Admin', path: '/admin/dashboard' },
          { label: 'Faculty Assignments' }
        ]}
        actions={
          <Button icon={UserCheck} onClick={openCreateModal}>
            Assign Faculty
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={assignments}
        isLoading={isLoading}
        error={error ? extractApiErrorMessage(error, 'Failed to load faculty assignments') : null}
        onRetry={refetch}
        serverSide
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search faculty name, employee ID, subject, course..."
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSortChange={(col, dir) => {
          setSortColumn(col);
          setSortDirection(dir);
          setPage(1);
        }}
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalRecords={pagination.totalRecords}
        pageSize={10}
        onPageChange={setPage}
        toolbarExtras={toolbarExtras}
        emptyTitle="No faculty assignments found"
        emptyDescription="Assign an active faculty member to a subject and semester to get started."
      />

      {/* CREATE MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Assign Faculty to Subject"
        subtitle="Select an active faculty member and academic teaching allocation."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
          {formSubmitError && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
              {formSubmitError}
            </div>
          )}

          <Controller
            name="faculty"
            control={createForm.control}
            render={({ field }) => (
              <Select
                label="Faculty Member"
                required
                placeholder="Select Active Faculty"
                value={field.value || ''}
                onChange={field.onChange}
                options={facultyOptions}
                error={createForm.formState.errors.faculty?.message}
              />
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              name="departmentFilter"
              control={createForm.control}
              render={({ field }) => (
                <Select
                  label="Department Filter"
                  placeholder="All Active Departments"
                  value={field.value || ''}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                    createForm.setValue('course', '');
                    createForm.setValue('semester', '');
                    createForm.setValue('subject', '');
                    createForm.setValue('academicYear', '');
                  }}
                  options={departments.map((d) => ({ value: d._id, label: `${d.code} - ${d.name}` }))}
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
                  placeholder="Select Course"
                  value={field.value || ''}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                    createForm.setValue('semester', '');
                    createForm.setValue('subject', '');
                    createForm.setValue('academicYear', '');
                  }}
                  options={createCourseOptions}
                  error={createForm.formState.errors.course?.message}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              name="semester"
              control={createForm.control}
              render={({ field }) => (
                <Select
                  label="Semester"
                  required
                  disabled={!watchedCreateCourse}
                  placeholder={watchedCreateCourse ? 'Select Semester' : 'Choose course first'}
                  value={field.value || ''}
                  onChange={(e) => {
                    const semId = e.target.value;
                    field.onChange(semId);
                    createForm.setValue('subject', '');
                    const semObj = semesters.find((s) => s._id === semId);
                    if (semObj?.academicYear) {
                      createForm.setValue('academicYear', semObj.academicYear, { shouldValidate: true });
                    }
                  }}
                  options={createSemesterOptions}
                  error={createForm.formState.errors.semester?.message}
                />
              )}
            />

            <Controller
              name="subject"
              control={createForm.control}
              render={({ field }) => (
                <Select
                  label="Subject"
                  required
                  disabled={!watchedCreateSemester}
                  placeholder={watchedCreateSemester ? 'Select Subject' : 'Choose semester first'}
                  value={field.value || ''}
                  onChange={field.onChange}
                  options={createSubjectOptions}
                  error={createForm.formState.errors.subject?.message}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Academic Year"
              required
              placeholder="2026-2027"
              {...createForm.register('academicYear')}
              error={createForm.formState.errors.academicYear?.message}
            />
            <Input
              label="Section"
              required
              placeholder="A"
              {...createForm.register('section')}
              error={createForm.formState.errors.section?.message}
            />
            <Input
              label="Assignment Date"
              type="date"
              {...createForm.register('assignmentDate')}
              error={createForm.formState.errors.assignmentDate?.message}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Confirm Assignment
            </Button>
          </div>
        </form>
      </Modal>

      {/* VIEW MODAL */}
      <Modal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        title="Faculty Assignment Details"
        maxWidth="max-w-xl"
      >
        {selectedAssignment && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <p className="text-xs text-slate-500">Faculty</p>
                <p className="font-semibold text-slate-900">
                  {selectedAssignment.faculty?.firstName} {selectedAssignment.faculty?.lastName}
                </p>
                <p className="text-xs font-mono text-slate-500">
                  {selectedAssignment.faculty?.employeeId} · {selectedAssignment.faculty?.department?.code}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <div className="mt-1">
                  <Badge variant={getStatusBadgeVariant(selectedAssignment.status)}>
                    {selectedAssignment.status}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500">Course & Semester</p>
                <p className="font-medium text-slate-900">{selectedAssignment.course?.name || '—'}</p>
                <p className="text-xs text-slate-600">
                  Semester {selectedAssignment.semester?.semesterNumber} · Section {selectedAssignment.section}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Subject</p>
                <p className="font-medium text-slate-900">{selectedAssignment.subject?.name}</p>
                <p className="text-xs font-mono text-slate-500">{selectedAssignment.subject?.code}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Enrolled Students</p>
                <p className="font-semibold text-slate-900">{selectedAssignment.enrolledStudentCount ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Academic Year & Date</p>
                <p className="font-medium text-slate-900">
                  {selectedAssignment.academicYear} ({formatDate(selectedAssignment.assignmentDate)})
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Update Faculty Assignment"
        subtitle={
          selectedAssignment
            ? `${selectedAssignment.subject?.code} · Sem ${selectedAssignment.semester?.semesterNumber}`
            : ''
        }
        maxWidth="max-w-lg"
      >
        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
          {formSubmitError && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
              {formSubmitError}
            </div>
          )}

          <Controller
            name="faculty"
            control={editForm.control}
            render={({ field }) => (
              <Select
                label="Assigned Faculty"
                required
                value={field.value || ''}
                onChange={field.onChange}
                options={facultyOptions}
                error={editForm.formState.errors.faculty?.message}
              />
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Section"
              required
              {...editForm.register('section')}
              error={editForm.formState.errors.section?.message}
            />
            <Input
              label="Academic Year"
              required
              {...editForm.register('academicYear')}
              error={editForm.formState.errors.academicYear?.message}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Assignment Date"
              type="date"
              {...editForm.register('assignmentDate')}
              error={editForm.formState.errors.assignmentDate?.message}
            />
            <Controller
              name="status"
              control={editForm.control}
              render={({ field }) => (
                <Select
                  label="Status"
                  required
                  value={field.value || 'ACTIVE'}
                  onChange={field.onChange}
                  options={ASSIGNMENT_STATUS_OPTIONS}
                  error={editForm.formState.errors.status?.message}
                />
              )}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* STATUS MODAL */}
      <Modal
        isOpen={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        title="Update Assignment Status"
        maxWidth="max-w-md"
      >
        {statusTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Update teaching assignment status for{' '}
              <strong className="text-slate-900">
                {statusTarget.faculty?.firstName} {statusTarget.faculty?.lastName}
              </strong>{' '}
              ({statusTarget.subject?.code}, Sec {statusTarget.section}):
            </p>
            <Select
              label="New Status"
              value={nextStatusValue}
              onChange={(e) => setNextStatusValue(e.target.value)}
              options={ASSIGNMENT_STATUS_OPTIONS}
            />
            <div className="flex justify-end space-x-2.5 pt-2">
              <Button variant="outline" onClick={() => setStatusTarget(null)}>
                Cancel
              </Button>
              <Button
                isLoading={statusMutation.isPending}
                onClick={() =>
                  statusMutation.mutate({ id: statusTarget._id, status: nextStatusValue })
                }
              >
                Update Status
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* DELETE CONFIRM */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
        isLoading={deleteMutation.isPending}
        title="Delete Faculty Assignment"
        message={
          deleteTarget
            ? `Permanently remove assignment of ${deleteTarget.faculty?.firstName} ${deleteTarget.faculty?.lastName} from ${deleteTarget.subject?.code} (Sec ${deleteTarget.section})? Assignments with attendance or marks records cannot be deleted.`
            : ''
        }
        confirmText="Delete Assignment"
        variant="danger"
      />
    </div>
  );
};

export default FacultyAssignmentManagement;
