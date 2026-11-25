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
import { enrollmentApi, academicLookupApi } from '../../services/managementService';
import {
  extractApiErrorMessage,
  formatDate,
  ENROLLMENT_STATUS_OPTIONS,
  getStatusBadgeVariant
} from '../../utils/formSchemas';
import {
  UserPlus,
  Eye,
  Edit3,
  Trash2,
  CheckSquare,
  Square,
  RefreshCw,
  BookOpen,
  GraduationCap,
  AlertTriangle
} from 'lucide-react';

const createEnrollmentFormSchema = z.object({
  departmentFilter: z.string().optional(),
  course: z.string().min(1, 'Course selection is required'),
  semester: z.string().min(1, 'Semester selection is required'),
  academicYear: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{4}$/, 'Academic year must use YYYY-YYYY format (e.g., 2026-2027)'),
  section: z.string().trim().min(1, 'Section is required').max(10),
  enrollmentDate: z.string().optional()
});

const editEnrollmentFormSchema = z.object({
  section: z.string().trim().min(1, 'Section is required').max(10),
  academicYear: z.string().trim().regex(/^\d{4}-\d{4}$/, 'Academic year must use YYYY-YYYY format'),
  enrollmentDate: z.string().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'DROPPED', 'CANCELLED'])
});

export const EnrollmentManagement = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Table state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortColumn, setSortColumn] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');

  // Filter state
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAcademicYear, setFilterAcademicYear] = useState('');

  // Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);
  const [nextStatusValue, setNextStatusValue] = useState('DROPPED');
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Bulk selection state inside Create Modal
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [studentPickerSearch, setStudentPickerSearch] = useState('');
  const [bulkReport, setBulkReport] = useState(null);
  const [formSubmitError, setFormSubmitError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Lookups for filters & forms
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
  const { data: activeStudentsLookup } = useQuery({
    queryKey: ['lookup-students-active'],
    queryFn: () => academicLookupApi.getActiveStudents(),
    enabled: isCreateOpen
  });

  const extractArray = (res, key) => (Array.isArray(res?.data) ? res.data : res?.data?.[key]) || [];
  const departments = extractArray(deptLookup, 'departments');
  const courses = extractArray(courseLookup, 'courses');
  const semesters = extractArray(semesterLookup, 'semesters');
  const subjects = extractArray(subjectLookup, 'subjects');
  const activeStudents = extractArray(activeStudentsLookup, 'students');

  // Filter-bar cascading options
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

  // Main enrollments list query
  const {
    data: enrollmentsResponse,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: [
      'enrollments',
      {
        page,
        search: debouncedSearch,
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
      enrollmentApi.list({
        page,
        limit: 10,
        search: debouncedSearch,
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

  const enrollments = enrollmentsResponse?.data?.enrollments || [];
  const pagination = enrollmentsResponse?.meta?.pagination || { page: 1, totalPages: 1, totalRecords: 0 };

  // Create form
  const createForm = useForm({
    resolver: zodResolver(createEnrollmentFormSchema),
    defaultValues: {
      departmentFilter: '',
      course: '',
      semester: '',
      academicYear: '',
      section: 'A',
      enrollmentDate: new Date().toISOString().slice(0, 10)
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

  const eligibleSubjects = useMemo(() => {
    if (!watchedCreateCourse || !watchedCreateSemester) return [];
    return subjects.filter(
      (sub) =>
        String(sub.course?._id || sub.course) === watchedCreateCourse &&
        String(sub.semester?._id || sub.semester) === watchedCreateSemester
    );
  }, [subjects, watchedCreateCourse, watchedCreateSemester]);

  const selectedCourseObj = useMemo(
    () => courses.find((c) => c._id === watchedCreateCourse) || null,
    [courses, watchedCreateCourse]
  );

  const eligibleStudents = useMemo(() => {
    const courseDeptId = String(selectedCourseObj?.department?._id || selectedCourseObj?.department || '');
    const term = studentPickerSearch.trim().toLowerCase();

    return activeStudents.filter((stu) => {
      if (watchedCreateCourse) {
        if (stu.course) {
          if (String(stu.course?._id || stu.course) !== watchedCreateCourse) return false;
        } else if (courseDeptId && String(stu.department?._id || stu.department) !== courseDeptId) {
          return false;
        }
      } else if (watchedCreateDept) {
        if (String(stu.department?._id || stu.department) !== watchedCreateDept) return false;
      }

      if (!term) return true;
      const fullName = `${stu.firstName || ''} ${stu.lastName || ''}`.toLowerCase();
      return (
        fullName.includes(term) ||
        (stu.rollNumber || '').toLowerCase().includes(term) ||
        (stu.enrollmentNumber || '').toLowerCase().includes(term)
      );
    });
  }, [activeStudents, watchedCreateCourse, watchedCreateDept, selectedCourseObj, studentPickerSearch]);

  // Edit form
  const editForm = useForm({
    resolver: zodResolver(editEnrollmentFormSchema),
    defaultValues: {
      section: 'A',
      academicYear: '2026-2027',
      enrollmentDate: '',
      status: 'ACTIVE'
    }
  });

  const invalidateEnrollmentQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    queryClient.invalidateQueries({ queryKey: ['faculty-assignments'] });
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
  };

  const createMutation = useMutation({
    mutationFn: (payload) => enrollmentApi.create(payload),
    onSuccess: (res) => {
      const data = res?.data || {};
      invalidateEnrollmentQueries();
      if (data.failedCount > 0) {
        setBulkReport(data);
        showToast(
          `Created ${data.createdCount} enrollment(s); ${data.failedCount} skipped/conflicted`,
          'warning'
        );
      } else {
        showToast(res?.message || 'Student enrollment(s) created successfully', 'success');
        setIsCreateOpen(false);
        setBulkReport(null);
      }
    },
    onError: (err) => {
      const msg = extractApiErrorMessage(err, 'Failed to enroll student(s)');
      setFormSubmitError(msg);
      if (Array.isArray(err?.errors) && err.errors.length > 0 && err.errors[0]?.reason) {
        setBulkReport({ createdCount: 0, failedCount: err.errors.length, failures: err.errors });
      }
      showToast(msg, 'error');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => enrollmentApi.update(id, payload),
    onSuccess: () => {
      invalidateEnrollmentQueries();
      showToast('Enrollment updated successfully', 'success');
      setIsEditOpen(false);
    },
    onError: (err) => {
      const msg = extractApiErrorMessage(err, 'Failed to update enrollment');
      setFormSubmitError(msg);
      showToast(msg, 'error');
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => enrollmentApi.updateStatus(id, status),
    onSuccess: (res) => {
      invalidateEnrollmentQueries();
      showToast(res?.message || 'Enrollment status updated', 'success');
      setStatusTarget(null);
    },
    onError: (err) => {
      showToast(extractApiErrorMessage(err, 'Failed to update enrollment status'), 'error');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => enrollmentApi.remove(id),
    onSuccess: () => {
      invalidateEnrollmentQueries();
      showToast('Enrollment deleted successfully', 'success');
      setDeleteTarget(null);
    },
    onError: (err) => {
      showToast(extractApiErrorMessage(err, 'Failed to delete enrollment'), 'error');
    }
  });

  const openCreateModal = () => {
    setFormSubmitError('');
    setBulkReport(null);
    setSelectedStudentIds([]);
    setSelectedSubjectIds([]);
    setStudentPickerSearch('');
    createForm.reset({
      departmentFilter: '',
      course: '',
      semester: '',
      academicYear: '',
      section: 'A',
      enrollmentDate: new Date().toISOString().slice(0, 10)
    });
    setIsCreateOpen(true);
  };

  const openEditModal = (row) => {
    setFormSubmitError('');
    setSelectedEnrollment(row);
    editForm.reset({
      section: row.section || 'A',
      academicYear: row.academicYear || '2026-2027',
      enrollmentDate: row.enrollmentDate ? new Date(row.enrollmentDate).toISOString().slice(0, 10) : '',
      status: row.status || 'ACTIVE'
    });
    setIsEditOpen(true);
  };

  const toggleStudentSelection = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSubjectSelection = (id) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const onCreateSubmit = (values) => {
    setFormSubmitError('');
    setBulkReport(null);

    if (selectedSubjectIds.length === 0) {
      setFormSubmitError('Please select at least one subject for enrollment');
      return;
    }
    if (selectedStudentIds.length === 0) {
      setFormSubmitError('Please select at least one active student');
      return;
    }

    const payload = {
      students: selectedStudentIds,
      course: values.course,
      semester: values.semester,
      subjects: selectedSubjectIds,
      academicYear: values.academicYear,
      section: values.section.toUpperCase()
    };
    if (values.enrollmentDate) payload.enrollmentDate = values.enrollmentDate;
    createMutation.mutate(payload);
  };

  const onEditSubmit = (values) => {
    setFormSubmitError('');
    const payload = {
      section: values.section.toUpperCase(),
      academicYear: values.academicYear,
      status: values.status
    };
    if (values.enrollmentDate) payload.enrollmentDate = values.enrollmentDate;
    updateMutation.mutate({ id: selectedEnrollment._id, payload });
  };

  const columns = [
    {
      key: 'student',
      label: 'Student',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">
            {row.student ? `${row.student.firstName} ${row.student.lastName}` : '—'}
          </p>
          <p className="text-xs text-slate-500 font-mono">
            {row.student?.rollNumber || 'N/A'} · {row.student?.department?.code || '—'}
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
      label: 'Subject',
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
      key: 'academicYear',
      label: 'Session',
      sortable: true,
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-slate-800">{row.academicYear}</p>
          <p className="text-xs text-slate-500">{formatDate(row.enrollmentDate || row.createdAt)}</p>
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
              setSelectedEnrollment(row);
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
            title="Edit enrollment"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          {row.status !== 'COMPLETED' && (
            <button
              type="button"
              onClick={() => {
                setStatusTarget(row);
                setNextStatusValue(row.status === 'ACTIVE' ? 'DROPPED' : 'ACTIVE');
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
            title="Delete enrollment"
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
        {ENROLLMENT_STATUS_OPTIONS.map((opt) => (
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

      {(filterDepartment ||
        filterCourse ||
        filterSemester ||
        filterSubject ||
        filterStatus ||
        filterAcademicYear) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
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
        title="Student Enrollment Management"
        description="Enroll active students individually or in batches into course semesters and subjects."
        breadcrumbs={[
          { label: 'Admin', path: '/admin/dashboard' },
          { label: 'Enrollments' }
        ]}
        actions={
          <Button icon={UserPlus} onClick={openCreateModal}>
            Enroll Students
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={enrollments}
        isLoading={isLoading}
        error={error ? extractApiErrorMessage(error, 'Failed to load enrollments') : null}
        onRetry={refetch}
        serverSide
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search student roll no, name, subject, course..."
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
        emptyTitle="No student enrollments found"
        emptyDescription="Start by enrolling active students into an academic semester and subject."
      />

      {/* CREATE / BULK ENROLL MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Enroll Students into Subjects"
        subtitle="Select course, semester, subjects, and eligible active students."
        maxWidth="max-w-4xl"
      >
        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-5">
          {formSubmitError && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
              {formSubmitError}
            </div>
          )}

          {bulkReport && bulkReport.failures?.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-900 space-y-1.5">
              <div className="flex items-center font-semibold">
                <AlertTriangle className="w-4 h-4 mr-1.5 text-amber-600" />
                Partial Result: {bulkReport.createdCount} created, {bulkReport.failedCount} skipped/conflicted
              </div>
              <ul className="list-disc pl-5 space-y-0.5 max-h-28 overflow-y-auto">
                {bulkReport.failures.map((f, idx) => (
                  <li key={idx}>{f.reason}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Step 1: Academic Structure */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    createForm.setValue('academicYear', '');
                    setSelectedSubjectIds([]);
                    setSelectedStudentIds([]);
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
                    createForm.setValue('academicYear', '');
                    setSelectedSubjectIds([]);
                    setSelectedStudentIds([]);
                  }}
                  options={createCourseOptions}
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
                  disabled={!watchedCreateCourse}
                  placeholder={watchedCreateCourse ? 'Select Semester' : 'Choose course first'}
                  value={field.value || ''}
                  onChange={(e) => {
                    const semId = e.target.value;
                    field.onChange(semId);
                    const semObj = semesters.find((s) => s._id === semId);
                    if (semObj?.academicYear) {
                      createForm.setValue('academicYear', semObj.academicYear, { shouldValidate: true });
                    }
                    setSelectedSubjectIds([]);
                  }}
                  options={createSemesterOptions}
                  error={createForm.formState.errors.semester?.message}
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
              label="Enrollment Date"
              type="date"
              {...createForm.register('enrollmentDate')}
              error={createForm.formState.errors.enrollmentDate?.message}
            />
          </div>

          {/* Step 2 & 3: Subjects + Students Checklists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Subjects Selector */}
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <BookOpen className="w-4 h-4 text-brand-700" />
                  <span>Subjects ({selectedSubjectIds.length}/{eligibleSubjects.length})</span>
                </div>
                {eligibleSubjects.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedSubjectIds(
                        selectedSubjectIds.length === eligibleSubjects.length
                          ? []
                          : eligibleSubjects.map((s) => s._id)
                      )
                    }
                    className="text-xs font-semibold text-brand-700 hover:underline"
                  >
                    {selectedSubjectIds.length === eligibleSubjects.length ? 'Clear All' : 'Select All'}
                  </button>
                )}
              </div>

              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                {!watchedCreateSemester ? (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    Select a course and semester to load active subjects.
                  </p>
                ) : eligibleSubjects.length === 0 ? (
                  <p className="text-xs text-amber-700 py-6 text-center">
                    No active subjects found for this semester.
                  </p>
                ) : (
                  eligibleSubjects.map((sub) => {
                    const checked = selectedSubjectIds.includes(sub._id);
                    return (
                      <button
                        key={sub._id}
                        type="button"
                        onClick={() => toggleSubjectSelection(sub._id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left text-xs transition ${
                          checked
                            ? 'bg-brand-50 border-brand-300 text-brand-900'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          {checked ? (
                            <CheckSquare className="w-4 h-4 text-brand-700 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span className="truncate font-medium">
                            <span className="font-mono mr-1">{sub.code}</span> {sub.name}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 shrink-0 ml-2">{sub.credits} Cr</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Eligible Students Selector */}
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <GraduationCap className="w-4 h-4 text-brand-700" />
                  <span>Active Students ({selectedStudentIds.length}/{eligibleStudents.length})</span>
                </div>
                {eligibleStudents.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedStudentIds(
                        selectedStudentIds.length === eligibleStudents.length
                          ? []
                          : eligibleStudents.map((st) => st._id)
                      )
                    }
                    className="text-xs font-semibold text-brand-700 hover:underline"
                  >
                    {selectedStudentIds.length === eligibleStudents.length ? 'Clear All' : 'Select All'}
                  </button>
                )}
              </div>

              <input
                type="text"
                value={studentPickerSearch}
                onChange={(e) => setStudentPickerSearch(e.target.value)}
                placeholder="Filter eligible students by name or roll no..."
                className="mb-2 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
              />

              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                {eligibleStudents.length === 0 ? (
                  <p className="text-xs text-slate-500 py-5 text-center">
                    No eligible active students match this filter.
                  </p>
                ) : (
                  eligibleStudents.map((stu) => {
                    const checked = selectedStudentIds.includes(stu._id);
                    return (
                      <button
                        key={stu._id}
                        type="button"
                        onClick={() => toggleStudentSelection(stu._id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left text-xs transition ${
                          checked
                            ? 'bg-brand-50 border-brand-300 text-brand-900'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          {checked ? (
                            <CheckSquare className="w-4 h-4 text-brand-700 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span className="truncate font-medium">
                            {stu.firstName} {stu.lastName}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-500 shrink-0 ml-2">
                          {stu.rollNumber}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Review Summary */}
          <div className="rounded-xl bg-slate-100 border border-slate-200 px-4 py-2.5 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
            <span>
              Enrollment Batch Preview:{' '}
              <strong className="text-slate-900">
                {selectedStudentIds.length} student(s) x {selectedSubjectIds.length} subject(s) ={' '}
                {selectedStudentIds.length * selectedSubjectIds.length} record(s)
              </strong>
            </span>
            <span className="text-slate-500">Duplicate active enrollments are automatically rejected.</span>
          </div>

          <div className="flex justify-end space-x-3 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Confirm Enrollment
            </Button>
          </div>
        </form>
      </Modal>

      {/* VIEW MODAL */}
      <Modal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        title="Enrollment Details"
        maxWidth="max-w-xl"
      >
        {selectedEnrollment && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <p className="text-xs text-slate-500">Student</p>
                <p className="font-semibold text-slate-900">
                  {selectedEnrollment.student?.firstName} {selectedEnrollment.student?.lastName}
                </p>
                <p className="text-xs font-mono text-slate-500">{selectedEnrollment.student?.rollNumber}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <div className="mt-1">
                  <Badge variant={getStatusBadgeVariant(selectedEnrollment.status)}>
                    {selectedEnrollment.status}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500">Course & Semester</p>
                <p className="font-medium text-slate-900">{selectedEnrollment.course?.name}</p>
                <p className="text-xs text-slate-600">
                  Semester {selectedEnrollment.semester?.semesterNumber} · Section {selectedEnrollment.section}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Subject</p>
                <p className="font-medium text-slate-900">{selectedEnrollment.subject?.name}</p>
                <p className="text-xs font-mono text-slate-500">
                  {selectedEnrollment.subject?.code} ({selectedEnrollment.subject?.credits} Credits)
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Academic Year</p>
                <p className="font-medium text-slate-900">{selectedEnrollment.academicYear}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Enrollment Date</p>
                <p className="font-medium text-slate-900">
                  {formatDate(selectedEnrollment.enrollmentDate || selectedEnrollment.createdAt)}
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
        title="Update Enrollment"
        subtitle={
          selectedEnrollment
            ? `${selectedEnrollment.student?.rollNumber} · ${selectedEnrollment.subject?.code}`
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
              label="Enrollment Date"
              type="date"
              {...editForm.register('enrollmentDate')}
              error={editForm.formState.errors.enrollmentDate?.message}
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
                  options={ENROLLMENT_STATUS_OPTIONS}
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

      {/* STATUS TRANSITION MODAL */}
      <Modal
        isOpen={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        title="Update Enrollment Status"
        maxWidth="max-w-md"
      >
        {statusTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Update enrollment status for{' '}
              <strong className="text-slate-900">
                {statusTarget.student?.firstName} {statusTarget.student?.lastName}
              </strong>{' '}
              in <strong>{statusTarget.subject?.code}</strong>:
            </p>
            <Select
              label="New Status"
              value={nextStatusValue}
              onChange={(e) => setNextStatusValue(e.target.value)}
              options={ENROLLMENT_STATUS_OPTIONS}
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
        title="Delete Enrollment Record"
        message={
          deleteTarget
            ? `Permanently delete enrollment for ${deleteTarget.student?.rollNumber} in ${deleteTarget.subject?.code}? Records with attendance or examination history cannot be deleted.`
            : ''
        }
        confirmText="Delete Enrollment"
        variant="danger"
      />
    </div>
  );
};

export default EnrollmentManagement;
