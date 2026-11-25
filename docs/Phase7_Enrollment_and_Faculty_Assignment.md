# Phase 7: Student Enrollment & Faculty Assignment Management

**Project:** Student Management System (SMS) — AKTU B.Tech CSE Mini Project (`BCS 554`, Session 2026–27)

## 1. Overview
Phase 7 connects student records, faculty profiles, and the Phase 6 academic hierarchy (`Department -> Course -> Semester -> Subject`) through two operational modules:
1. **Student Enrollment Management** (`Enrollment` model, `/api/v1/enrollments`, `/admin/enrollments`)
2. **Faculty Assignment Management** (`FacultyAssignment` model, `/api/v1/faculty-assignments`, `/admin/faculty-assignments`)
3. **Role-Scoped Portal Integration** (`StudentDashboard.jsx`, `FacultyDashboard.jsx`, `/api/v1/dashboards/student`, `/api/v1/dashboards/faculty`)

## 2. Database Schema & Indexing

### `server/models/Enrollment.js`
- Core references: `student` (`Student`), `course` (`Course`), `semester` (`Semester`), `subject` (`Subject`).
- Academic metadata: `academicYear` (`YYYY-YYYY`), `section` (uppercase, default `'A'`), `enrollmentDate`, `status` (`'ACTIVE' | 'COMPLETED' | 'DROPPED' | 'CANCELLED'`), `createdBy`, `updatedBy`, `statusUpdatedAt`.
- Partial unique index: `{ student: 1, subject: 1, semester: 1, academicYear: 1 }` with `partialFilterExpression: { status: 'ACTIVE' }` — prevents duplicate active subject enrollments while preserving historical `DROPPED`, `CANCELLED`, or `COMPLETED` records.

### `server/models/FacultyAssignment.js`
- Core references: `faculty` (`Faculty`), `course` (`Course`), `semester` (`Semester`), `subject` (`Subject`).
- Academic metadata: `section` (uppercase, default `'A'`), `academicYear`, `assignmentDate`, `status` (`'ACTIVE' | 'COMPLETED' | 'REVOKED'`), `assignedBy`, `updatedBy`, `statusUpdatedAt`.
- Partial unique index: `{ faculty: 1, subject: 1, semester: 1, section: 1, academicYear: 1 }` with `partialFilterExpression: { status: 'ACTIVE' }`.
- `pre('validate')` hook automatically resolves `course` from `Subject` when omitted by legacy internal callers.

### Migration (`server/utils/migratePhase7.js`)
- Backfilled existing `FacultyAssignment` documents missing `course` (`assignmentBackfills: 1`).
- Dropped legacy non-partial unique indexes and synchronized partial unique and query indexes via `syncIndexes()`.

## 3. REST APIs & Authorization

### Student Enrollments (`/api/v1/enrollments`)
- `GET /my` (`student` only): Returns authenticated student's own profile, paginated enrollments, and active credits summary (`req.user.profileId`).
- `GET /` (`admin`, `faculty`, `student`):
  - `student`: forced self-scope (`student === req.user.profileId`); rejects mismatched `query.student` with `403`.
  - `faculty`: restricted to subjects/semesters where the faculty holds an `ACTIVE` `FacultyAssignment`.
  - `admin`: full search/filter/sort/pagination (`search`, `student`, `department`, `course`, `semester`, `subject`, `academicYear`, `status`).
- `GET /:id` (`admin`, `faculty`, `student`): Enforces record-level ownership/assignment check (`403` otherwise).
- `POST /` (`admin`): Single or bulk (`students[] x subjects[]`) creation with strict academic eligibility, inactive entity blocking, course/semester alignment, duplicate detection (`409`), and per-pair partial reporting `{ createdCount, failedCount, created, failures }`.
- `PATCH /:id` & `PATCH /:id/status` (`admin`): Updates editable metadata or status transitions; blocks reopening `COMPLETED` enrollments (`400`).
- `DELETE /:id` (`admin`): Blocked (`409`) when dependent `Attendance` or `Result` records exist.

### Faculty Assignments (`/api/v1/faculty-assignments`)
- `GET /my` (`faculty` only): Returns authenticated faculty's assignments enriched with live `enrolledStudentCount`.
- `GET /` & `GET /:id` (`admin`, `faculty`): Faculty access strictly self-scoped (`faculty === req.user.profileId`, `403` on ID manipulation).
- `POST /` (`admin`): Validates active faculty/course/semester/subject, hierarchy alignment, academic year match, and active uniqueness (`409`).
- `PATCH /:id` & `PATCH /:id/status` (`admin`): Blocks faculty reassignment (`409`) if dependent `Attendance` or `Result` records exist for the current faculty.
- `DELETE /:id` (`admin`): Blocked (`409`) when dependent `Attendance` or `Result` records exist.

## 4. Frontend Implementation
- `client/src/pages/admin/EnrollmentManagement.jsx`: Cascading Department → Course → Semester → Subjects + Active Students bulk enrollment wizard, server-side search/filter/sort/pagination, View/Edit/Status modals, and Delete confirmation.
- `client/src/pages/admin/FacultyAssignmentManagement.jsx`: Active Faculty + cascading Course → Semester → Subject assignment modal, live `enrolledStudentCount` column, filters, View/Edit/Status/Delete flows.
- `client/src/pages/student/StudentDashboard.jsx`: Replaced Phase 2 static placeholders with live `/api/v1/enrollments/my` and `/api/v1/dashboards/student` queries (real KPIs, subject filter/search, empty/error states).
- `client/src/pages/faculty/FacultyDashboard.jsx`: Replaced Phase 2 static placeholders with live `/api/v1/faculty-assignments/my` and `/api/v1/dashboards/faculty` queries (real active assignments, enrolled student badge counts, notices).
