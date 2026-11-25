import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import PageHeader from '../../components/layout/PageHeader';
import Tabs from '../../components/common/Tabs';
import DataTable from '../../components/data/DataTable';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Textarea from '../../components/common/Textarea';
import { useToast } from '../../context/ToastContext';
import {
  examinationApi,
  assessmentApi,
  academicLookupApi
} from '../../services/managementService';
import {
  extractApiErrorMessage,
  formatDate,
  EXAM_TYPE_OPTIONS,
  EXAM_STATUS_OPTIONS,
  ASSESSMENT_COMPONENT_TYPE_OPTIONS,
  ASSESSMENT_STATUS_OPTIONS,
  getStatusBadgeVariant
} from '../../utils/formSchemas';
import {
  Award,
  Layers,
  FileCheck2,
  Plus,
  Eye,
  Edit3,
  RefreshCw,
  Trash2
} from 'lucide-react';

const examSchema = z
  .object({
    departmentFilter: z.string().optional(),
    title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150),
    examType: z.enum(['INTERNAL_ASSESSMENT', 'MID_TERM', 'PRACTICAL', 'EXTERNAL', 'END_SEMESTER']),
    course: z.string().min(1, 'Course is required'),
    semester: z.string().min(1, 'Semester is required'),
    subject: z.string().min(1, 'Subject is required'),
    academicYear: z.string().trim().regex(/^\d{4}-\d{4}$/, 'Use YYYY-YYYY format'),
    examDate: z.string().min(1, 'Examination date is required'),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    maxMarks: z.coerce.number().min(1, 'Must be positive').max(500),
    description: z.string().max(1000).optional(),
    status: z.enum(['DRAFT', 'SCHEDULED']).optional()
  })
  .refine((d) => !d.startTime || !d.endTime || d.endTime > d.startTime, {
    message: 'End time must be after start time',
    path: ['endTime']
  });

const assessmentSchema = z.object({
  departmentFilter: z.string().optional(),
  name: z.string().trim().min(2, 'Component name is required').max(120),
  componentType: z.enum(['CLASS_TEST', 'ASSIGNMENT', 'QUIZ', 'PRACTICAL', 'VIVA', 'PROJECT', 'OTHER']),
  examination: z.string().optional(),
  course: z.string().min(1, 'Course is required'),
  semester: z.string().min(1, 'Semester is required'),
  subject: z.string().min(1, 'Subject is required'),
  academicYear: z.string().trim().regex(/^\d{4}-\d{4}$/, 'Use YYYY-YYYY format'),
  maxMarks: z.coerce.number().min(1, 'Must be positive').max(500),
  assessmentDate: z.string().optional(),
  description: z.string().max(600).optional(),
  status: z.enum(['DRAFT', 'ACTIVE']).optional()
});

const correctMarkSchema = z.object({
  marksObtained: z.coerce.number().min(0, 'Marks cannot be negative'),
  remarks: z.string().max(300).optional(),
  reason: z.string().trim().min(3, 'Audit reason is required (min 3 chars)').max(300)
});

export const AdminExaminationsPage = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('examinations');

  // Shared cascading filter state
  const [filterDept, setFilterDept] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterAcademicYear, setFilterAcademicYear] = useState('');

  // Exam table states
  const [examSearch, setExamSearch] = useState('');
  const [debouncedExamSearch, setDebouncedExamSearch] = useState('');
  const [examPage, setExamPage] = useState(1);
  const [examTypeFilter, setExamTypeFilter] = useState('');
  const [examStatusFilter, setExamStatusFilter] = useState('');
  const [isExamCreateOpen, setIsExamCreateOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [viewingExamId, setViewingExamId] = useState('');
  const [examStatusTarget, setExamStatusTarget] = useState(null);
  const [nextExamStatus, setNextExamStatus] = useState('SCHEDULED');
  const [examStatusReason, setExamStatusReason] = useState('');
  const [deleteExamTarget, setDeleteExamTarget] = useState(null);

  // Assessment component table states
  const [assessSearch, setAssessSearch] = useState('');
  const [debouncedAssessSearch, setDebouncedAssessSearch] = useState('');
  const [assessPage, setAssessPage] = useState(1);
  const [assessTypeFilter, setAssessTypeFilter] = useState('');
  const [assessStatusFilter, setAssessStatusFilter] = useState('');
  const [isAssessCreateOpen, setIsAssessCreateOpen] = useState(false);
  const [editingAssess, setEditingAssess] = useState(null);
  const [assessStatusTarget, setAssessStatusTarget] = useState(null);
  const [nextAssessStatus, setNextAssessStatus] = useState('FINALIZED');
  const [assessStatusReason, setAssessStatusReason] = useState('');

  // Marks monitoring & override state
  const [marksSearch, setMarksSearch] = useState('');
  const [debouncedMarksSearch, setDebouncedMarksSearch] = useState('');
  const [marksPage, setMarksPage] = useState(1);
  const [marksStatusFilter, setMarksStatusFilter] = useState('');
  const [correctMarkTarget, setCorrectMarkTarget] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedExamSearch(examSearch);
      setExamPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [examSearch]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedAssessSearch(assessSearch);
      setAssessPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [assessSearch]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedMarksSearch(marksSearch);
      setMarksPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [marksSearch]);

  const extractArray = (res, key) => (Array.isArray(res?.data) ? res.data : res?.data?.[key]) || [];

  const deptLookup = useQuery({ queryKey: ['lookup-departments-active'], queryFn: () => academicLookupApi.getDepartments({ isActive: true }) });
  const courseLookup = useQuery({ queryKey: ['lookup-courses-active'], queryFn: () => academicLookupApi.getCourses({ isActive: true }) });
  const semesterLookup = useQuery({ queryKey: ['lookup-semesters-active'], queryFn: () => academicLookupApi.getSemesters({ isActive: true }) });
  const subjectLookup = useQuery({ queryKey: ['lookup-subjects-active'], queryFn: () => academicLookupApi.getSubjects({ isActive: true }) });

  const departments = extractArray(deptLookup.data, 'departments');
  const courses = extractArray(courseLookup.data, 'courses');
  const semesters = extractArray(semesterLookup.data, 'semesters');
  const subjects = extractArray(subjectLookup.data, 'subjects');

  const examsQuery = useQuery({
    queryKey: [
      'admin-examinations',
      {
        examPage,
        search: debouncedExamSearch,
        department: filterDept,
        course: filterCourse,
        semester: filterSemester,
        subject: filterSubject,
        academicYear: filterAcademicYear,
        examType: examTypeFilter,
        status: examStatusFilter
      }
    ],
    queryFn: () =>
      examinationApi.list({
        page: examPage,
        limit: 10,
        search: debouncedExamSearch,
        department: filterDept,
        course: filterCourse,
        semester: filterSemester,
        subject: filterSubject,
        academicYear: filterAcademicYear,
        examType: examTypeFilter,
        status: examStatusFilter
      })
  });

  const examDetailQuery = useQuery({
    queryKey: ['examination-detail', viewingExamId],
    queryFn: () => examinationApi.getById(viewingExamId),
    enabled: Boolean(viewingExamId)
  });

  const assessmentsQuery = useQuery({
    queryKey: [
      'admin-assessments',
      {
        assessPage,
        search: debouncedAssessSearch,
        department: filterDept,
        course: filterCourse,
        semester: filterSemester,
        subject: filterSubject,
        academicYear: filterAcademicYear,
        componentType: assessTypeFilter,
        status: assessStatusFilter
      }
    ],
    queryFn: () =>
      assessmentApi.list({
        page: assessPage,
        limit: 10,
        search: debouncedAssessSearch,
        department: filterDept,
        course: filterCourse,
        semester: filterSemester,
        subject: filterSubject,
        academicYear: filterAcademicYear,
        componentType: assessTypeFilter,
        status: assessStatusFilter
      })
  });

  const marksQuery = useQuery({
    queryKey: [
      'admin-assessment-marks',
      {
        marksPage,
        search: debouncedMarksSearch,
        course: filterCourse,
        semester: filterSemester,
        subject: filterSubject,
        academicYear: filterAcademicYear,
        entryStatus: marksStatusFilter
      }
    ],
    queryFn: () =>
      assessmentApi.listMarks({
        page: marksPage,
        limit: 12,
        search: debouncedMarksSearch,
        course: filterCourse,
        semester: filterSemester,
        subject: filterSubject,
        academicYear: filterAcademicYear,
        entryStatus: marksStatusFilter
      }),
    enabled: activeTab === 'marks'
  });

  // Forms
  const examForm = useForm({
    resolver: zodResolver(examSchema),
    defaultValues: {
      departmentFilter: '',
      title: '',
      examType: 'MID_TERM',
      course: '',
      semester: '',
      subject: '',
      academicYear: '',
      examDate: new Date().toISOString().slice(0, 10),
      startTime: '10:00',
      endTime: '12:00',
      maxMarks: 30,
      description: '',
      status: 'SCHEDULED'
    }
  });

  const assessForm = useForm({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      departmentFilter: '',
      name: '',
      componentType: 'CLASS_TEST',
      examination: '',
      course: '',
      semester: '',
      subject: '',
      academicYear: '',
      maxMarks: 20,
      assessmentDate: new Date().toISOString().slice(0, 10),
      description: '',
      status: 'ACTIVE'
    }
  });

  const correctForm = useForm({
    resolver: zodResolver(correctMarkSchema),
    defaultValues: { marksObtained: 0, remarks: '', reason: '' }
  });

  const watchedExamDept = examForm.watch('departmentFilter');
  const watchedExamCourse = examForm.watch('course');
  const watchedExamSemester = examForm.watch('semester');

  const watchedAssessDept = assessForm.watch('departmentFilter');
  const watchedAssessCourse = assessForm.watch('course');
  const watchedAssessSemester = assessForm.watch('semester');
  const watchedAssessSubject = assessForm.watch('subject');

  const examList = examsQuery.data?.data?.examinations || [];
  const examPagination = examsQuery.data?.meta?.pagination || { page: 1, totalPages: 1, totalRecords: 0 };
  const assessList = assessmentsQuery.data?.data?.assessments || [];
  const assessPagination = assessmentsQuery.data?.meta?.pagination || { page: 1, totalPages: 1, totalRecords: 0 };
  const marksList = marksQuery.data?.data?.marks || [];
  const marksPagination = marksQuery.data?.meta?.pagination || { page: 1, totalPages: 1, totalRecords: 0 };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-examinations'] });
    queryClient.invalidateQueries({ queryKey: ['examination-detail'] });
    queryClient.invalidateQueries({ queryKey: ['admin-assessments'] });
    queryClient.invalidateQueries({ queryKey: ['admin-assessment-marks'] });
    queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
  };

  const createExamMut = useMutation({
    mutationFn: examinationApi.create,
    onSuccess: () => {
      invalidateAll();
      showToast('Examination scheduled successfully', 'success');
      setIsExamCreateOpen(false);
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Failed to create examination'), 'error')
  });

  const updateExamMut = useMutation({
    mutationFn: ({ id, payload }) => examinationApi.update(id, payload),
    onSuccess: () => {
      invalidateAll();
      showToast('Examination updated successfully', 'success');
      setEditingExam(null);
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Failed to update examination'), 'error')
  });

  const updateExamStatusMut = useMutation({
    mutationFn: ({ id, status, reason }) => examinationApi.updateStatus(id, { status, reason }),
    onSuccess: (res) => {
      invalidateAll();
      showToast(res?.message || 'Examination status updated', 'success');
      setExamStatusTarget(null);
      setExamStatusReason('');
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Failed to update status'), 'error')
  });

  const deleteExamMut = useMutation({
    mutationFn: examinationApi.remove,
    onSuccess: () => {
      invalidateAll();
      showToast('Examination deleted cleanly', 'success');
      setDeleteExamTarget(null);
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Cannot delete examination'), 'error')
  });

  const createAssessMut = useMutation({
    mutationFn: assessmentApi.create,
    onSuccess: () => {
      invalidateAll();
      showToast('Internal assessment component created', 'success');
      setIsAssessCreateOpen(false);
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Failed to create component'), 'error')
  });

  const updateAssessMut = useMutation({
    mutationFn: ({ id, payload }) => assessmentApi.update(id, payload),
    onSuccess: () => {
      invalidateAll();
      showToast('Assessment component updated', 'success');
      setEditingAssess(null);
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Failed to update component'), 'error')
  });

  const updateAssessStatusMut = useMutation({
    mutationFn: ({ id, status, reason }) => assessmentApi.updateStatus(id, { status, reason }),
    onSuccess: (res) => {
      invalidateAll();
      showToast(res?.message || 'Assessment status updated', 'success');
      setAssessStatusTarget(null);
      setAssessStatusReason('');
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Failed to update assessment status'), 'error')
  });

  const correctMarkMut = useMutation({
    mutationFn: ({ markId, payload }) => assessmentApi.correctMark(markId, payload),
    onSuccess: () => {
      invalidateAll();
      showToast('Marks overridden and logged in audit trail', 'success');
      setCorrectMarkTarget(null);
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Failed to override marks'), 'error')
  });

  const openCreateExamModal = () => {
    setEditingExam(null);
    examForm.reset({
      departmentFilter: '',
      title: '',
      examType: 'MID_TERM',
      course: '',
      semester: '',
      subject: '',
      academicYear: '',
      examDate: new Date().toISOString().slice(0, 10),
      startTime: '10:00',
      endTime: '12:00',
      maxMarks: 30,
      description: '',
      status: 'SCHEDULED'
    });
    setIsExamCreateOpen(true);
  };

  const openEditExamModal = (row) => {
    setEditingExam(row);
    examForm.reset({
      departmentFilter: '',
      title: row.title || '',
      examType: row.examType || 'MID_TERM',
      course: row.course?._id || '',
      semester: row.semester?._id || '',
      subject: row.subject?._id || '',
      academicYear: row.academicYear || '',
      examDate: row.examDate ? new Date(row.examDate).toISOString().slice(0, 10) : '',
      startTime: row.startTime || '',
      endTime: row.endTime || '',
      maxMarks: row.maxMarks ?? 30,
      description: row.description || '',
      status: row.status === 'DRAFT' ? 'DRAFT' : 'SCHEDULED'
    });
    setIsExamCreateOpen(true);
  };

  const openCreateAssessModal = () => {
    setEditingAssess(null);
    assessForm.reset({
      departmentFilter: '',
      name: '',
      componentType: 'CLASS_TEST',
      examination: '',
      course: '',
      semester: '',
      subject: '',
      academicYear: '',
      maxMarks: 20,
      assessmentDate: new Date().toISOString().slice(0, 10),
      description: '',
      status: 'ACTIVE'
    });
    setIsAssessCreateOpen(true);
  };

  const openEditAssessModal = (row) => {
    setEditingAssess(row);
    assessForm.reset({
      departmentFilter: '',
      name: row.name || '',
      componentType: row.componentType || 'CLASS_TEST',
      examination: row.examination?._id || '',
      course: row.course?._id || '',
      semester: row.semester?._id || '',
      subject: row.subject?._id || '',
      academicYear: row.academicYear || '',
      maxMarks: row.maxMarks ?? 20,
      assessmentDate: row.assessmentDate ? new Date(row.assessmentDate).toISOString().slice(0, 10) : '',
      description: row.description || '',
      status: row.status === 'DRAFT' ? 'DRAFT' : 'ACTIVE'
    });
    setIsAssessCreateOpen(true);
  };

  const handleExamSubmit = (vals) => {
    if (editingExam) {
      updateExamMut.mutate({
        id: editingExam._id,
        payload: {
          title: vals.title,
          examType: vals.examType,
          examDate: vals.examDate,
          startTime: vals.startTime || '',
          endTime: vals.endTime || '',
          maxMarks: Number(vals.maxMarks),
          description: vals.description || ''
        }
      });
      return;
    }

    createExamMut.mutate({
      title: vals.title,
      examType: vals.examType,
      course: vals.course,
      semester: vals.semester,
      subject: vals.subject,
      academicYear: vals.academicYear,
      examDate: vals.examDate,
      startTime: vals.startTime || '',
      endTime: vals.endTime || '',
      maxMarks: Number(vals.maxMarks),
      description: vals.description || '',
      status: vals.status || 'SCHEDULED'
    });
  };

  const handleAssessSubmit = (vals) => {
    if (editingAssess) {
      updateAssessMut.mutate({
        id: editingAssess._id,
        payload: {
          name: vals.name,
          componentType: vals.componentType,
          examination: vals.examination || '',
          maxMarks: Number(vals.maxMarks),
          assessmentDate: vals.assessmentDate || null,
          description: vals.description || ''
        }
      });
      return;
    }

    createAssessMut.mutate({
      name: vals.name,
      componentType: vals.componentType,
      examination: vals.examination || '',
      course: vals.course,
      semester: vals.semester,
      subject: vals.subject,
      academicYear: vals.academicYear,
      maxMarks: Number(vals.maxMarks),
      assessmentDate: vals.assessmentDate || undefined,
      description: vals.description || '',
      status: vals.status || 'ACTIVE'
    });
  };

  const filterBar = (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-2.5 shadow-sm">
      <select
        value={filterDept}
        onChange={(e) => {
          setFilterDept(e.target.value);
          setFilterCourse('');
          setFilterSemester('');
          setFilterSubject('');
        }}
        className="rounded-lg border border-slate-300 bg-white py-1.5 px-2.5 text-xs"
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
        }}
        className="rounded-lg border border-slate-300 bg-white py-1.5 px-2.5 text-xs"
      >
        <option value="">All Courses</option>
        {courses
          .filter((c) => !filterDept || String(c.department?._id || c.department) === filterDept)
          .map((c) => (
            <option key={c._id} value={c._id}>
              {c.code} - {c.name}
            </option>
          ))}
      </select>
      <select
        value={filterSemester}
        onChange={(e) => {
          setFilterSemester(e.target.value);
          setFilterSubject('');
        }}
        className="rounded-lg border border-slate-300 bg-white py-1.5 px-2.5 text-xs"
      >
        <option value="">All Semesters</option>
        {semesters
          .filter((s) => !filterCourse || String(s.course?._id || s.course) === filterCourse)
          .map((s) => (
            <option key={s._id} value={s._id}>
              Sem {s.semesterNumber} ({s.academicYear})
            </option>
          ))}
      </select>
      <select
        value={filterSubject}
        onChange={(e) => setFilterSubject(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white py-1.5 px-2.5 text-xs"
      >
        <option value="">All Subjects</option>
        {subjects
          .filter(
            (sub) =>
              (!filterCourse || String(sub.course?._id || sub.course) === filterCourse) &&
              (!filterSemester || String(sub.semester?._id || sub.semester) === filterSemester)
          )
          .map((sub) => (
            <option key={sub._id} value={sub._id}>
              {sub.code} - {sub.name}
            </option>
          ))}
      </select>
      <input
        type="text"
        value={filterAcademicYear}
        onChange={(e) => setFilterAcademicYear(e.target.value)}
        placeholder="Session e.g. 2026-2027"
        className="w-36 rounded-lg border border-slate-300 bg-white py-1.5 px-2.5 text-xs"
      />
      {(filterDept || filterCourse || filterSemester || filterSubject || filterAcademicYear) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setFilterDept('');
            setFilterCourse('');
            setFilterSemester('');
            setFilterSubject('');
            setFilterAcademicYear('');
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
        title="Examinations & Internal Assessment"
        description="Configure institutional examinations, internal assessment components, and monitor faculty marks entry."
        breadcrumbs={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Examinations' }]}
        actions={
          <div className="flex items-center space-x-2">
            <Button variant="outline" icon={Plus} onClick={openCreateAssessModal}>
              Add Assessment Component
            </Button>
            <Button icon={Plus} onClick={openCreateExamModal}>
              Create Examination
            </Button>
          </div>
        }
      />

      {filterBar}

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'examinations', label: 'Examinations', icon: Award },
          { id: 'assessments', label: 'Internal Assessments', icon: Layers },
          { id: 'marks', label: 'Marks Progress & Overrides', icon: FileCheck2 }
        ]}
      />

      {/* TAB 1: EXAMINATIONS */}
      {activeTab === 'examinations' && (
        <DataTable
          columns={[
            {
              key: 'title',
              label: 'Examination',
              render: (r) => (
                <div>
                  <p className="font-semibold text-slate-900">{r.title}</p>
                  <p className="text-xs text-slate-500">
                    {r.examType?.replace(/_/g, ' ')} · Max {r.maxMarks} Marks
                  </p>
                </div>
              )
            },
            {
              key: 'subject',
              label: 'Subject & Course',
              render: (r) => (
                <div>
                  <p className="font-medium text-slate-900">
                    <span className="font-mono text-xs text-brand-700 mr-1">{r.subject?.code || 'ALL'}</span>
                    {r.subject?.name || 'Semester-wide'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {r.course?.code} · Sem {r.semester?.semesterNumber} ({r.academicYear})
                  </p>
                </div>
              )
            },
            {
              key: 'examDate',
              label: 'Schedule',
              render: (r) => (
                <div className="text-xs">
                  <p className="font-medium text-slate-800">{formatDate(r.examDate || r.startDate)}</p>
                  <p className="text-slate-500">
                    {r.startTime && r.endTime ? `${r.startTime} – ${r.endTime}` : 'Full Day / TBD'}
                  </p>
                </div>
              )
            },
            {
              key: 'status',
              label: 'Status',
              render: (r) => <Badge variant={getStatusBadgeVariant(r.status)}>{r.status}</Badge>
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (r) => (
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setViewingExamId(r._id)}
                    className="p-1.5 text-slate-500 hover:text-brand-700 hover:bg-brand-50 rounded-lg"
                    title="View examination"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {r.status !== 'CANCELLED' && r.status !== 'PUBLISHED' && (
                    <button
                      type="button"
                      onClick={() => openEditExamModal(r)}
                      className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                      title="Edit examination"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                  {r.status !== 'CANCELLED' && (
                    <button
                      type="button"
                      onClick={() => {
                        setExamStatusTarget(r);
                        setNextExamStatus(
                          r.status === 'DRAFT'
                            ? 'SCHEDULED'
                            : r.status === 'SCHEDULED'
                            ? 'COMPLETED'
                            : r.status === 'COMPLETED'
                            ? 'PUBLISHED'
                            : 'COMPLETED'
                        );
                        setExamStatusReason('');
                      }}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      title="Change status"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDeleteExamTarget(r)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                    title="Delete examination"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            }
          ]}
          data={examList}
          isLoading={examsQuery.isLoading}
          error={examsQuery.error ? extractApiErrorMessage(examsQuery.error) : null}
          onRetry={examsQuery.refetch}
          serverSide
          searchValue={examSearch}
          onSearchChange={setExamSearch}
          searchPlaceholder="Search examination title, subject..."
          currentPage={examPagination.page}
          totalPages={examPagination.totalPages}
          totalRecords={examPagination.totalRecords}
          pageSize={10}
          onPageChange={setExamPage}
          toolbarExtras={
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={examTypeFilter}
                onChange={(e) => {
                  setExamTypeFilter(e.target.value);
                  setExamPage(1);
                }}
                className="rounded-lg border border-slate-300 bg-white py-2 px-2.5 text-xs"
              >
                <option value="">All Types</option>
                {EXAM_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                value={examStatusFilter}
                onChange={(e) => {
                  setExamStatusFilter(e.target.value);
                  setExamPage(1);
                }}
                className="rounded-lg border border-slate-300 bg-white py-2 px-2.5 text-xs"
              >
                <option value="">All Statuses</option>
                {EXAM_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          }
          emptyTitle="No examinations configured"
          emptyDescription="Click 'Create Examination' to schedule an exam for a subject and semester."
        />
      )}

      {/* TAB 2: INTERNAL ASSESSMENT COMPONENTS */}
      {activeTab === 'assessments' && (
        <DataTable
          columns={[
            {
              key: 'name',
              label: 'Assessment Component',
              render: (r) => (
                <div>
                  <p className="font-semibold text-slate-900">{r.name}</p>
                  <p className="text-xs text-slate-500">
                    {r.componentType?.replace(/_/g, ' ')} · Max {r.maxMarks} Marks
                  </p>
                </div>
              )
            },
            {
              key: 'subject',
              label: 'Subject & Course',
              render: (r) => (
                <div>
                  <p className="font-medium text-slate-900">
                    <span className="font-mono text-xs text-brand-700 mr-1">{r.subject?.code}</span>
                    {r.subject?.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {r.course?.code} · Sem {r.semester?.semesterNumber} ({r.academicYear})
                  </p>
                </div>
              )
            },
            {
              key: 'progress',
              label: 'Marks Entry Progress',
              render: (r) => (
                <div className="text-xs">
                  <p className="font-semibold text-slate-800">
                    {r.enteredCount ?? 0} / {r.enrolledCount ?? 0} Students
                  </p>
                  <p className="text-slate-500">
                    {r.averageMarks !== null ? `Avg: ${r.averageMarks}/${r.maxMarks}` : 'No marks yet'}
                  </p>
                </div>
              )
            },
            {
              key: 'status',
              label: 'Status',
              render: (r) => <Badge variant={getStatusBadgeVariant(r.status)}>{r.status}</Badge>
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (r) => (
                <div className="flex items-center space-x-1">
                  {!['FINALIZED', 'PUBLISHED', 'CANCELLED'].includes(r.status) && (
                    <button
                      type="button"
                      onClick={() => openEditAssessModal(r)}
                      className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                      title="Edit component"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                  {r.status !== 'CANCELLED' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAssessStatusTarget(r);
                        setNextAssessStatus(
                          r.status === 'DRAFT'
                            ? 'ACTIVE'
                            : r.status === 'ACTIVE'
                            ? 'FINALIZED'
                            : r.status === 'FINALIZED'
                            ? 'PUBLISHED'
                            : 'ACTIVE'
                        );
                        setAssessStatusReason('');
                      }}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      title="Transition status (Publish / Finalize / Reopen)"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )
            }
          ]}
          data={assessList}
          isLoading={assessmentsQuery.isLoading}
          error={assessmentsQuery.error ? extractApiErrorMessage(assessmentsQuery.error) : null}
          onRetry={assessmentsQuery.refetch}
          serverSide
          searchValue={assessSearch}
          onSearchChange={setAssessSearch}
          searchPlaceholder="Search component name or subject..."
          currentPage={assessPagination.page}
          totalPages={assessPagination.totalPages}
          totalRecords={assessPagination.totalRecords}
          pageSize={10}
          onPageChange={setAssessPage}
          toolbarExtras={
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={assessTypeFilter}
                onChange={(e) => {
                  setAssessTypeFilter(e.target.value);
                  setAssessPage(1);
                }}
                className="rounded-lg border border-slate-300 bg-white py-2 px-2.5 text-xs"
              >
                <option value="">All Component Types</option>
                {ASSESSMENT_COMPONENT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                value={assessStatusFilter}
                onChange={(e) => {
                  setAssessStatusFilter(e.target.value);
                  setAssessPage(1);
                }}
                className="rounded-lg border border-slate-300 bg-white py-2 px-2.5 text-xs"
              >
                <option value="">All Statuses</option>
                {ASSESSMENT_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          }
          emptyTitle="No internal assessment components"
          emptyDescription="Click 'Add Assessment Component' to configure Class Tests, Quizzes, Labs, or Assignments."
        />
      )}

      {/* TAB 3: MARKS MONITORING & OVERRIDES */}
      {activeTab === 'marks' && (
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
              key: 'assessment',
              label: 'Component & Subject',
              render: (r) => (
                <div>
                  <p className="font-medium text-slate-900">{r.assessment?.name}</p>
                  <p className="text-xs text-slate-500">
                    {r.subject?.code} · Assessment Status: {r.assessment?.status}
                  </p>
                </div>
              )
            },
            {
              key: 'marksObtained',
              label: 'Score',
              render: (r) => (
                <span className="font-bold text-slate-900">
                  {r.marksObtained} / {r.maxMarks}
                </span>
              )
            },
            {
              key: 'entryStatus',
              label: 'Entry State',
              render: (r) => <Badge variant={getStatusBadgeVariant(r.entryStatus)}>{r.entryStatus}</Badge>
            },
            {
              key: 'actions',
              label: 'Override',
              render: (r) => (
                <button
                  type="button"
                  onClick={() => {
                    setCorrectMarkTarget(r);
                    correctForm.reset({
                      marksObtained: r.marksObtained,
                      remarks: r.remarks || '',
                      reason: ''
                    });
                  }}
                  className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                  title="Override / correct marks"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )
            }
          ]}
          data={marksList}
          isLoading={marksQuery.isLoading}
          error={marksQuery.error ? extractApiErrorMessage(marksQuery.error) : null}
          onRetry={marksQuery.refetch}
          serverSide
          searchValue={marksSearch}
          onSearchChange={setMarksSearch}
          searchPlaceholder="Search student, subject, assessment..."
          currentPage={marksPagination.page}
          totalPages={marksPagination.totalPages}
          totalRecords={marksPagination.totalRecords}
          pageSize={12}
          onPageChange={setMarksPage}
          toolbarExtras={
            <select
              value={marksStatusFilter}
              onChange={(e) => {
                setMarksStatusFilter(e.target.value);
                setMarksPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs"
            >
              <option value="">All Entry States</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="FINALIZED">Finalized</option>
            </select>
          }
          emptyTitle="No internal assessment marks entered yet"
          emptyDescription="Faculty marks entries will appear here for institutional monitoring and audited corrections."
        />
      )}

      {/* CREATE / EDIT EXAMINATION MODAL */}
      <Modal
        isOpen={isExamCreateOpen}
        onClose={() => setIsExamCreateOpen(false)}
        title={editingExam ? 'Update Examination' : 'Schedule Examination'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={examForm.handleSubmit(handleExamSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Examination Title"
              required
              placeholder="e.g. Mid-Term Examination - DBMS"
              {...examForm.register('title')}
              error={examForm.formState.errors.title?.message}
            />
            <Controller
              name="examType"
              control={examForm.control}
              render={({ field }) => (
                <Select
                  label="Examination Type"
                  required
                  value={field.value || 'MID_TERM'}
                  onChange={field.onChange}
                  options={EXAM_TYPE_OPTIONS}
                />
              )}
            />
          </div>

          {!editingExam && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Controller
                  name="departmentFilter"
                  control={examForm.control}
                  render={({ field }) => (
                    <Select
                      label="Department Filter"
                      placeholder="All Departments"
                      value={field.value || ''}
                      onChange={(e) => {
                        field.onChange(e.target.value);
                        examForm.setValue('course', '');
                        examForm.setValue('semester', '');
                        examForm.setValue('subject', '');
                        examForm.setValue('academicYear', '');
                      }}
                      options={departments.map((d) => ({ value: d._id, label: `${d.code} - ${d.name}` }))}
                    />
                  )}
                />
                <Controller
                  name="course"
                  control={examForm.control}
                  render={({ field }) => (
                    <Select
                      label="Course"
                      required
                      placeholder="Select Course"
                      value={field.value || ''}
                      onChange={(e) => {
                        field.onChange(e.target.value);
                        examForm.setValue('semester', '');
                        examForm.setValue('subject', '');
                        examForm.setValue('academicYear', '');
                      }}
                      options={courses
                        .filter((c) => !watchedExamDept || String(c.department?._id || c.department) === watchedExamDept)
                        .map((c) => ({ value: c._id, label: `${c.code} - ${c.name}` }))}
                      error={examForm.formState.errors.course?.message}
                    />
                  )}
                />
                <Controller
                  name="semester"
                  control={examForm.control}
                  render={({ field }) => (
                    <Select
                      label="Semester"
                      required
                      disabled={!watchedExamCourse}
                      placeholder={watchedExamCourse ? 'Select Semester' : 'Choose course first'}
                      value={field.value || ''}
                      onChange={(e) => {
                        const semId = e.target.value;
                        field.onChange(semId);
                        examForm.setValue('subject', '');
                        const semObj = semesters.find((s) => s._id === semId);
                        if (semObj?.academicYear) {
                          examForm.setValue('academicYear', semObj.academicYear, { shouldValidate: true });
                        }
                      }}
                      options={semesters
                        .filter((s) => String(s.course?._id || s.course) === watchedExamCourse)
                        .map((s) => ({
                          value: s._id,
                          label: `Semester ${s.semesterNumber} (${s.academicYear})`
                        }))}
                      error={examForm.formState.errors.semester?.message}
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                  name="subject"
                  control={examForm.control}
                  render={({ field }) => (
                    <Select
                      label="Subject"
                      required
                      disabled={!watchedExamSemester}
                      placeholder={watchedExamSemester ? 'Select Subject' : 'Choose semester first'}
                      value={field.value || ''}
                      onChange={field.onChange}
                      options={subjects
                        .filter(
                          (sub) =>
                            String(sub.course?._id || sub.course) === watchedExamCourse &&
                            String(sub.semester?._id || sub.semester) === watchedExamSemester
                        )
                        .map((sub) => ({ value: sub._id, label: `${sub.code} - ${sub.name}` }))}
                      error={examForm.formState.errors.subject?.message}
                    />
                  )}
                />
                <Input
                  label="Academic Year"
                  required
                  {...examForm.register('academicYear')}
                  error={examForm.formState.errors.academicYear?.message}
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input
              label="Exam Date"
              type="date"
              required
              {...examForm.register('examDate')}
              error={examForm.formState.errors.examDate?.message}
            />
            <Input label="Start Time" type="time" {...examForm.register('startTime')} />
            <Input
              label="End Time"
              type="time"
              {...examForm.register('endTime')}
              error={examForm.formState.errors.endTime?.message}
            />
            <Input
              label="Max Marks"
              type="number"
              min={1}
              max={500}
              required
              {...examForm.register('maxMarks')}
              error={examForm.formState.errors.maxMarks?.message}
            />
          </div>

          <Textarea label="Description / Instructions" {...examForm.register('description')} />

          <div className="flex justify-end space-x-2.5 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsExamCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createExamMut.isPending || updateExamMut.isPending}>
              {editingExam ? 'Save Changes' : 'Schedule Examination'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CREATE / EDIT ASSESSMENT COMPONENT MODAL */}
      <Modal
        isOpen={isAssessCreateOpen}
        onClose={() => setIsAssessCreateOpen(false)}
        title={editingAssess ? 'Update Internal Assessment' : 'Configure Internal Assessment'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={assessForm.handleSubmit(handleAssessSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Component Name"
              required
              placeholder="e.g. Class Test 1 / Assignment 1"
              {...assessForm.register('name')}
              error={assessForm.formState.errors.name?.message}
            />
            <Controller
              name="componentType"
              control={assessForm.control}
              render={({ field }) => (
                <Select
                  label="Component Type"
                  required
                  value={field.value || 'CLASS_TEST'}
                  onChange={field.onChange}
                  options={ASSESSMENT_COMPONENT_TYPE_OPTIONS}
                />
              )}
            />
          </div>

          {!editingAssess && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Controller
                  name="departmentFilter"
                  control={assessForm.control}
                  render={({ field }) => (
                    <Select
                      label="Department Filter"
                      placeholder="All Departments"
                      value={field.value || ''}
                      onChange={(e) => {
                        field.onChange(e.target.value);
                        assessForm.setValue('course', '');
                        assessForm.setValue('semester', '');
                        assessForm.setValue('subject', '');
                        assessForm.setValue('academicYear', '');
                      }}
                      options={departments.map((d) => ({ value: d._id, label: `${d.code} - ${d.name}` }))}
                    />
                  )}
                />
                <Controller
                  name="course"
                  control={assessForm.control}
                  render={({ field }) => (
                    <Select
                      label="Course"
                      required
                      placeholder="Select Course"
                      value={field.value || ''}
                      onChange={(e) => {
                        field.onChange(e.target.value);
                        assessForm.setValue('semester', '');
                        assessForm.setValue('subject', '');
                        assessForm.setValue('academicYear', '');
                      }}
                      options={courses
                        .filter((c) => !watchedAssessDept || String(c.department?._id || c.department) === watchedAssessDept)
                        .map((c) => ({ value: c._id, label: `${c.code} - ${c.name}` }))}
                      error={assessForm.formState.errors.course?.message}
                    />
                  )}
                />
                <Controller
                  name="semester"
                  control={assessForm.control}
                  render={({ field }) => (
                    <Select
                      label="Semester"
                      required
                      disabled={!watchedAssessCourse}
                      placeholder={watchedAssessCourse ? 'Select Semester' : 'Choose course first'}
                      value={field.value || ''}
                      onChange={(e) => {
                        const semId = e.target.value;
                        field.onChange(semId);
                        assessForm.setValue('subject', '');
                        const semObj = semesters.find((s) => s._id === semId);
                        if (semObj?.academicYear) {
                          assessForm.setValue('academicYear', semObj.academicYear, { shouldValidate: true });
                        }
                      }}
                      options={semesters
                        .filter((s) => String(s.course?._id || s.course) === watchedAssessCourse)
                        .map((s) => ({
                          value: s._id,
                          label: `Semester ${s.semesterNumber} (${s.academicYear})`
                        }))}
                      error={assessForm.formState.errors.semester?.message}
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                  name="subject"
                  control={assessForm.control}
                  render={({ field }) => (
                    <Select
                      label="Subject"
                      required
                      disabled={!watchedAssessSemester}
                      placeholder={watchedAssessSemester ? 'Select Subject' : 'Choose semester first'}
                      value={field.value || ''}
                      onChange={field.onChange}
                      options={subjects
                        .filter(
                          (sub) =>
                            String(sub.course?._id || sub.course) === watchedAssessCourse &&
                            String(sub.semester?._id || sub.semester) === watchedAssessSemester
                        )
                        .map((sub) => ({ value: sub._id, label: `${sub.code} - ${sub.name}` }))}
                      error={assessForm.formState.errors.subject?.message}
                    />
                  )}
                />
                <Controller
                  name="examination"
                  control={assessForm.control}
                  render={({ field }) => (
                    <Select
                      label="Parent Examination (Optional)"
                      placeholder="Standalone Assessment"
                      value={field.value || ''}
                      onChange={field.onChange}
                      options={examList
                        .filter(
                          (ex) =>
                            ex.status !== 'CANCELLED' &&
                            (!watchedAssessSubject || String(ex.subject?._id || ex.subject) === watchedAssessSubject)
                        )
                        .map((ex) => ({ value: ex._id, label: `${ex.title} (Max ${ex.maxMarks})` }))}
                    />
                  )}
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {!editingAssess && (
              <Input
                label="Academic Year"
                required
                {...assessForm.register('academicYear')}
                error={assessForm.formState.errors.academicYear?.message}
              />
            )}
            <Input
              label="Maximum Marks"
              type="number"
              min={1}
              max={500}
              required
              {...assessForm.register('maxMarks')}
              error={assessForm.formState.errors.maxMarks?.message}
            />
            <Input label="Assessment Date" type="date" {...assessForm.register('assessmentDate')} />
          </div>

          <Textarea label="Description / Syllabus Scope" {...assessForm.register('description')} />

          <div className="flex justify-end space-x-2.5 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAssessCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createAssessMut.isPending || updateAssessMut.isPending}>
              {editingAssess ? 'Save Component' : 'Create Component'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* EXAMINATION DETAILS MODAL */}
      <Modal
        isOpen={!!viewingExamId}
        onClose={() => setViewingExamId('')}
        title="Examination Particulars"
        maxWidth="max-w-lg"
      >
        {examDetailQuery.data?.data?.examination && (
          <div className="space-y-4 text-sm">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500">Title</p>
                <p className="font-semibold text-slate-900">{examDetailQuery.data.data.examination.title}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <Badge variant={getStatusBadgeVariant(examDetailQuery.data.data.examination.status)}>
                  {examDetailQuery.data.data.examination.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-slate-500">Subject</p>
                <p className="font-medium text-slate-900">
                  {examDetailQuery.data.data.examination.subject?.code} - {examDetailQuery.data.data.examination.subject?.name}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Max Marks</p>
                <p className="font-semibold text-slate-900">{examDetailQuery.data.data.examination.maxMarks}</p>
              </div>
            </div>
            {(examDetailQuery.data.data.linkedAssessments || []).length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase text-slate-500 mb-2">Linked Assessment Components</p>
                <ul className="space-y-1.5">
                  {examDetailQuery.data.data.linkedAssessments.map((a) => (
                    <li key={a._id} className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex justify-between">
                      <span>{a.name} ({a.componentType})</span>
                      <span className="font-semibold">{a.maxMarks} Marks · {a.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* EXAMINATION STATUS MODAL */}
      <Modal
        isOpen={!!examStatusTarget}
        onClose={() => setExamStatusTarget(null)}
        title="Update Examination Status"
        maxWidth="max-w-md"
      >
        {examStatusTarget && (
          <div className="space-y-4">
            <Select
              label="Target Status"
              value={nextExamStatus}
              onChange={(e) => setNextExamStatus(e.target.value)}
              options={EXAM_STATUS_OPTIONS}
            />
            <Textarea
              label="Audit Note / Reason"
              value={examStatusReason}
              onChange={(e) => setExamStatusReason(e.target.value)}
              placeholder="Required when reverting completed or published status..."
            />
            <div className="flex justify-end space-x-2.5">
              <Button variant="outline" onClick={() => setExamStatusTarget(null)}>
                Cancel
              </Button>
              <Button
                isLoading={updateExamStatusMut.isPending}
                onClick={() =>
                  updateExamStatusMut.mutate({
                    id: examStatusTarget._id,
                    status: nextExamStatus,
                    reason: examStatusReason
                  })
                }
              >
                Update Status
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ASSESSMENT STATUS MODAL */}
      <Modal
        isOpen={!!assessStatusTarget}
        onClose={() => setAssessStatusTarget(null)}
        title="Update Assessment Component Status"
        maxWidth="max-w-md"
      >
        {assessStatusTarget && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Publish makes entered marks visible on Student portals. Finalize locks faculty edits cleanly.
            </p>
            <Select
              label="Target Status"
              value={nextAssessStatus}
              onChange={(e) => setNextAssessStatus(e.target.value)}
              options={ASSESSMENT_STATUS_OPTIONS}
            />
            <Textarea
              label="Reason (Required for Reopening)"
              value={assessStatusReason}
              onChange={(e) => setAssessStatusReason(e.target.value)}
              placeholder="Provide reason if reopening finalized or published marks..."
            />
            <div className="flex justify-end space-x-2.5">
              <Button variant="outline" onClick={() => setAssessStatusTarget(null)}>
                Cancel
              </Button>
              <Button
                isLoading={updateAssessStatusMut.isPending}
                onClick={() =>
                  updateAssessStatusMut.mutate({
                    id: assessStatusTarget._id,
                    status: nextAssessStatus,
                    reason: assessStatusReason
                  })
                }
              >
                Update Status
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MARK OVERRIDE MODAL */}
      <Modal
        isOpen={!!correctMarkTarget}
        onClose={() => setCorrectMarkTarget(null)}
        title="Admin Marks Correction"
        subtitle={
          correctMarkTarget
            ? `${correctMarkTarget.student?.firstName} ${correctMarkTarget.student?.lastName} · ${correctMarkTarget.assessment?.name} (Max ${correctMarkTarget.maxMarks})`
            : ''
        }
        maxWidth="max-w-md"
      >
        <form
          onSubmit={correctForm.handleSubmit((vals) =>
            correctMarkMut.mutate({
              markId: correctMarkTarget._id,
              payload: {
                marksObtained: Number(vals.marksObtained),
                remarks: vals.remarks || '',
                reason: vals.reason
              }
            })
          )}
          className="space-y-4"
        >
          <Input
            label={`Updated Marks (0 – ${correctMarkTarget?.maxMarks ?? 100})`}
            type="number"
            step="0.01"
            min={0}
            max={correctMarkTarget?.maxMarks ?? 500}
            required
            {...correctForm.register('marksObtained')}
            error={correctForm.formState.errors.marksObtained?.message}
          />
          <Input label="Remarks" {...correctForm.register('remarks')} />
          <Textarea
            label="Audit Reason"
            required
            placeholder="Explain reason for marks override..."
            {...correctForm.register('reason')}
            error={correctForm.formState.errors.reason?.message}
          />
          <div className="flex justify-end space-x-2.5">
            <Button type="button" variant="outline" onClick={() => setCorrectMarkTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={correctMarkMut.isPending}>
              Save Override
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE EXAMINATION CONFIRM */}
      <ConfirmDialog
        isOpen={!!deleteExamTarget}
        onClose={() => setDeleteExamTarget(null)}
        onConfirm={() => deleteExamMut.mutate(deleteExamTarget._id)}
        isLoading={deleteExamMut.isPending}
        title="Delete Examination"
        message={
          deleteExamTarget
            ? `Delete "${deleteExamTarget.title}"? Examinations with linked assessments or marks records cannot be deleted.`
            : ''
        }
        confirmText="Delete Examination"
        variant="danger"
      />
    </div>
  );
};

export default AdminExaminationsPage;
