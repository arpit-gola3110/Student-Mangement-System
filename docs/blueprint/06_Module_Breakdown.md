# Student Management System (SMS)
## Document 06: Comprehensive 20-Module System Breakdown

---

### 1. Overview & Module Interdependency Graph

The Student Management System (SMS) is architected into **20 discrete, loosely coupled yet cohesive functional modules**. To ensure architectural stability, modules must be implemented strictly following their topological dependency order.

```
                  ┌─────────────────────────────────────────┐
                  │ 1. Authentication & Authorization (AUTH)│
                  └────────────────────┬────────────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
┌───────────────────────────────┐             ┌───────────────────────────────┐
│ 5. Department Management (DEPT)│             │ 20. Audit Logging (AUDT)      │
└───────────────┬───────────────┘             └───────────────────────────────┘
                ▼
┌───────────────────────────────┐
│ 6. Course Management (CRSE)   │
└───────────────┬───────────────┘
                ▼
┌───────────────────────────────┐
│ 7. Semester Management (SEMS) │
└───────────────┬───────────────┘
                ▼
┌───────────────────────────────┐
│ 8. Subject Management (SUBJ)  │
└───────┬───────────────┬───────┘
        │               │
        ▼               ▼
┌───────────────┐  ┌───────────────┐
│3. Student Mgmt│  │4. Faculty Mgmt│
└───────┬───────┘  └───────┬───────┘
        │                  │
        ▼                  ▼
┌──────────────────┐ ┌──────────────────┐
│9. Student Enroll │ │10. Faculty Assign│
└───────┬──────────┘ └─────┬────────────┘
        │                  │
        └────────┬─────────┘
                 │
        ┌────────┴───────────────────────────┐
        ▼                                    ▼
┌──────────────────────────────┐   ┌──────────────────────────────┐
│ 11. Attendance Management    │   │ 12. Examination Management   │
└──────────────────────────────┘   └──────────────┬───────────────┘
                                                  ▼
                                   ┌──────────────────────────────┐
                                   │ 13. Internal Assessment (CIA)│
                                   └──────────────┬───────────────┘
                                                  ▼
                                   ┌──────────────────────────────┐
                                   │ 14. Results Management (RES) │
                                   └──────────────┬───────────────┘
                                                  │
                 ┌────────────────────────────────┴──────────────────┐
                 ▼                                                   ▼
┌──────────────────────────────┐                   ┌──────────────────────────────┐
│ 15. Student Dashboard (SDASH)│                   │ 16. Faculty Dashboard (FDASH)│
└──────────────────────────────┘                   └──────────────────────────────┘
                 │                                                   │
                 └────────────────┬──────────────────────────────────┘
                                  ▼
                   ┌──────────────────────────────┐
                   │ 2. Admin Dashboard (ADASH)   │
                   ├──────────────────────────────┤
                   │ 17. Announcements (ANNC)     │
                   ├──────────────────────────────┤
                   │ 18. Reports & Analytics (REP)│
                   ├──────────────────────────────┤
                   │ 19. Search/Filter/Page (UTIL)│
                   └──────────────────────────────┘
```

---

### 2. Detailed Technical Breakdown for All 20 Modules

#### Module 01: Authentication and Authorization
- **Purpose:** Secure identity verification, token lifecycle management, and session governance.
- **Main Features:** Email/password login, JWT generation with embedded role/profile claims, password hashing with bcrypt, session timeout, profile viewing, and self-service password update.
- **User Roles:** `ADMIN`, `FACULTY`, `STUDENT`.
- **Required Frontend Pages:** `/login`, `/change-password`, `/profile`, `/unauthorized`.
- **Main Components:** `LoginForm`, `PasswordChangeModal`, `ProtectedRoute`, `RoleGuard`, `UserAvatarMenu`.
- **Backend API Endpoints:** `POST /api/auth/login`, `POST /api/auth/change-password`, `GET /api/auth/me`, `POST /api/auth/logout`.
- **Database Collections:** `Users`.
- **Validation Requirements:** Email RFC 5322 regex format, minimum 8 characters password with alphanumeric and symbol rules.
- **Authorization Requirements:** Public access to login; token bearer required for profile and password change.
- **Dependencies:** None (Fundamental system foundation).
- **Edge Cases:** Brute force login attempts, expired tokens, account suspended after token issuance, concurrent logins.

#### Module 02: Admin Dashboard
- **Purpose:** Executive command center providing high-level operational metrics and system status.
- **Main Features:** Aggregate KPI cards (Total Students, Faculty, Departments, Courses), low-attendance alerts summary, recent audit activity feed, and graphical charts.
- **User Roles:** `ADMIN`.
- **Required Frontend Pages:** `/admin/dashboard`.
- **Main Components:** `MetricCard`, `DepartmentBarChart`, `AttendanceDonutChart`, `RecentAuditFeed`, `QuickActionToolbar`.
- **Backend API Endpoints:** `GET /api/admin/dashboard-stats`, `GET /api/admin/recent-activity`.
- **Database Collections:** Aggregations across `Users`, `Students`, `Faculty`, `Departments`, `Attendance`, `AuditLogs`.
- **Validation Requirements:** Date range filters must validate `startDate <= endDate`.
- **Authorization Requirements:** Strictly restricted to `ADMIN`.
- **Dependencies:** Modules 1, 3, 4, 5, 11, 20.
- **Edge Cases:** Zero records state on newly provisioned system, slow aggregation queries on large historical datasets.

#### Module 03: Student Management
- **Purpose:** Full lifecycle administration of student demographic and academic profile records.
- **Main Features:** Student enrollment registration, profile updates, semester promotion, student status management (Active, Suspended, Graduated), document/photo metadata.
- **User Roles:** `ADMIN` (Full CRUD), `FACULTY` (Read assigned cohorts), `STUDENT` (Read own profile).
- **Required Frontend Pages:** `/admin/students`, `/admin/students/new`, `/admin/students/:id`, `/student/profile`.
- **Main Components:** `StudentTable`, `StudentForm`, `StudentFilterBar`, `StudentDetailCard`, `StudentStatusBadge`.
- **Backend API Endpoints:** `GET /api/students`, `POST /api/students`, `GET /api/students/:id`, `PUT /api/students/:id`, `DELETE /api/students/:id`.
- **Database Collections:** `Students`, `Users`.
- **Validation Requirements:** AKTU 10/13-digit university Roll Number uniqueness, valid phone number, valid postal address, non-empty date of birth.
- **Authorization Requirements:** Admin: CRUD; Faculty: Read scoped; Student: Read own.
- **Dependencies:** Modules 1, 5 (Department).
- **Edge Cases:** Duplicate roll numbers across admissions, soft-deletion when historical attendance records exist.

#### Module 04: Faculty Management
- **Purpose:** Administration of academic instructional staff records.
- **Main Features:** Faculty registration, designation allocation (Professor, Associate Prof, Assistant Prof), department linkage, qualifications, status tracking.
- **User Roles:** `ADMIN` (Full CRUD), `FACULTY` (Read/Update own profile), `STUDENT` (Read faculty directory).
- **Required Frontend Pages:** `/admin/faculty`, `/admin/faculty/new`, `/admin/faculty/:id`, `/faculty/profile`.
- **Main Components:** `FacultyTable`, `FacultyForm`, `FacultyFilterBar`, `FacultyProfileCard`.
- **Backend API Endpoints:** `GET /api/faculty`, `POST /api/faculty`, `GET /api/faculty/:id`, `PUT /api/faculty/:id`, `DELETE /api/faculty/:id`.
- **Database Collections:** `Faculty`, `Users`.
- **Validation Requirements:** Unique Employee ID, unique institutional email, valid mobile number, designated academic department.
- **Authorization Requirements:** Admin: CRUD; Faculty: Self profile edit; Student: View public faculty list.
- **Dependencies:** Modules 1, 5 (Department).
- **Edge Cases:** Faculty leaving mid-semester while assigned to active subjects; preventing orphaned subject allocations.

#### Module 05: Department Management
- **Purpose:** Institutional organizational hierarchy governance.
- **Main Features:** Department creation (e.g., Computer Science & Engineering, Information Technology), department code assignment, Head of Department (HOD) assignment.
- **User Roles:** `ADMIN` (CRUD), `FACULTY` & `STUDENT` (Read).
- **Required Frontend Pages:** `/admin/departments`, `/admin/departments/new`.
- **Main Components:** `DepartmentList`, `DepartmentModal`, `HODSelectDropdown`.
- **Backend API Endpoints:** `GET /api/departments`, `POST /api/departments`, `PUT /api/departments/:id`, `DELETE /api/departments/:id`.
- **Database Collections:** `Departments`.
- **Validation Requirements:** Department code must be unique 2–5 uppercase characters (e.g., `CSE`, `ECE`).
- **Authorization Requirements:** Admin: CRUD; others: Read only.
- **Dependencies:** Module 1.
- **Edge Cases:** Deletion attempt of a department with registered students or courses (must be blocked).

#### Module 06: Course Management
- **Purpose:** Governance of degree programs offered by departments.
- **Main Features:** Degree program definition (e.g., B.Tech in CSE, M.Tech in Software Engineering), duration in years, total semesters (e.g., 8).
- **User Roles:** `ADMIN` (CRUD), `FACULTY` & `STUDENT` (Read).
- **Required Frontend Pages:** `/admin/courses`.
- **Main Components:** `CourseTable`, `CourseFormModal`.
- **Backend API Endpoints:** `GET /api/courses`, `POST /api/courses`, `PUT /api/courses/:id`, `DELETE /api/courses/:id`.
- **Database Collections:** `Courses`.
- **Validation Requirements:** Course code uniqueness, total semesters must be an even integer between 2 and 10.
- **Authorization Requirements:** Admin: CRUD; others: Read only.
- **Dependencies:** Modules 1, 5.
- **Edge Cases:** Renaming a course while students have historical degree transcripts.

#### Module 07: Semester Management
- **Purpose:** Academic term temporal boundary configuration.
- **Main Features:** Definition of active semesters (Sem 1 to Sem 8), academic year mapping (e.g., 2026–27 Odd/Even), start date, end date, status (Upcoming, Active, Completed).
- **User Roles:** `ADMIN` (CRUD), `FACULTY` & `STUDENT` (Read).
- **Required Frontend Pages:** `/admin/semesters`.
- **Main Components:** `SemesterList`, `SemesterFormModal`, `ActiveSemesterBadge`.
- **Backend API Endpoints:** `GET /api/semesters`, `POST /api/semesters`, `PUT /api/semesters/:id`.
- **Database Collections:** `Semesters`.
- **Validation Requirements:** `startDate < endDate`, semester number between 1 and 8.
- **Authorization Requirements:** Admin: CRUD; others: Read only.
- **Dependencies:** Modules 1, 6.
- **Edge Cases:** Multiple semesters marked "Active" simultaneously for the same course cohort.

#### Module 08: Subject Management
- **Purpose:** Curricular syllabus unit governance.
- **Main Features:** Subject code (e.g., `BCS-501`), subject title, credit weighting (1 to 5 credits), course category (Theory, Practical, Project), semester assignment.
- **User Roles:** `ADMIN` (CRUD), `FACULTY` & `STUDENT` (Read).
- **Required Frontend Pages:** `/admin/subjects`, `/admin/subjects/new`.
- **Main Components:** `SubjectTable`, `SubjectForm`, `CreditBadge`, `CategoryFilter`.
- **Backend API Endpoints:** `GET /api/subjects`, `POST /api/subjects`, `PUT /api/subjects/:id`, `DELETE /api/subjects/:id`.
- **Database Collections:** `Subjects`.
- **Validation Requirements:** Unique subject code, credits between 1 and 6, valid reference to course and semester.
- **Authorization Requirements:** Admin: CRUD; others: Read only.
- **Dependencies:** Modules 1, 6, 7.
- **Edge Cases:** Modifying subject credits after grades have been computed for that term.

#### Module 09: Student Enrollment
- **Purpose:** Binding students to specific academic semesters and sections for a term.
- **Main Features:** Semester-wise enrollment, section allocation (e.g., Section A, B), roll-sheet generation, batch enrollment import.
- **User Roles:** `ADMIN` (CRUD), `FACULTY` (Read assigned sections), `STUDENT` (Read own enrollment).
- **Required Frontend Pages:** `/admin/enrollments`, `/admin/enrollments/batch`.
- **Main Components:** `EnrollmentTable`, `EnrollmentFormModal`, `SectionSelect`.
- **Backend API Endpoints:** `GET /api/enrollments`, `POST /api/enrollments`, `POST /api/enrollments/bulk`, `PUT /api/enrollments/:id`.
- **Database Collections:** `Enrollments`.
- **Validation Requirements:** Unique compound key `(student, course, semester, academicYear)`.
- **Authorization Requirements:** Admin: CRUD; others: Read scoped.
- **Dependencies:** Modules 3, 6, 7.
- **Edge Cases:** Enrolling a student into Semester 5 who hasn't cleared prerequisite registrations.

#### Module 10: Faculty Assignment
- **Purpose:** Allocating instructors to specific subjects, semesters, and sections.
- **Main Features:** Subject-to-faculty mapping, primary instructor designation, workload tracking.
- **User Roles:** `ADMIN` (CRUD), `FACULTY` (Read own assignments).
- **Required Frontend Pages:** `/admin/faculty-assignments`.
- **Main Components:** `AssignmentTable`, `AssignmentModal`, `FacultyWorkloadSummary`.
- **Backend API Endpoints:** `GET /api/faculty-assignments`, `POST /api/faculty-assignments`, `DELETE /api/faculty-assignments/:id`.
- **Database Collections:** `FacultyAssignments`.
- **Validation Requirements:** Unique compound key `(faculty, subject, semester, section, academicYear)`.
- **Authorization Requirements:** Admin: CRUD; Faculty: Read own.
- **Dependencies:** Modules 4, 7, 8.
- **Edge Cases:** Assigning faculty on academic leave or overlapping timetable slots.

#### Module 11: Attendance Management
- **Purpose:** Daily classroom attendance tracking and regulatory percentage computations.
- **Main Features:** Fast batch roll-call interface, status marking (Present, Absent, Late, Excused), date-wise logs, automated percentage calculations, low-attendance alerts ($< 75\%$).
- **User Roles:** `FACULTY` (Mark/Edit assigned), `ADMIN` (Override/Inspect all), `STUDENT` (View personal).
- **Required Frontend Pages:** `/faculty/attendance`, `/faculty/attendance/mark`, `/student/attendance`, `/admin/attendance-reports`.
- **Main Components:** `AttendanceSheet`, `AttendanceToggleGroup`, `AttendanceGauge`, `DefaulterTable`.
- **Backend API Endpoints:** `POST /api/attendance`, `GET /api/attendance/sheet`, `GET /api/attendance/student/:id`, `GET /api/attendance/summary`.
- **Database Collections:** `Attendance`.
- **Validation Requirements:** Unique `(student, subject, date, semester)`. Date cannot be in the future.
- **Authorization Requirements:** Faculty can only mark attendance for assigned subjects/sections.
- **Dependencies:** Modules 3, 8, 9, 10.
- **Edge Cases:** Marking attendance on institutional holidays; modifying attendance after 48-hour lock window.

#### Module 12: Examination Management
- **Purpose:** Scheduling and structural configuration of assessment events.
- **Main Features:** Exam definition (Sessional 1, Sessional 2, Pre-University, End-Semester), date schedule, maximum marks, passing threshold.
- **User Roles:** `ADMIN` (CRUD), `FACULTY` & `STUDENT` (Read).
- **Required Frontend Pages:** `/admin/examinations`.
- **Main Components:** `ExamTable`, `ExamScheduleModal`, `ExamStatusBadge`.
- **Backend API Endpoints:** `GET /api/examinations`, `POST /api/examinations`, `PUT /api/examinations/:id`.
- **Database Collections:** `Examinations`.
- **Validation Requirements:** `startDate <= endDate`, maximum marks $> 0$.
- **Authorization Requirements:** Admin: CRUD; others: Read only.
- **Dependencies:** Modules 6, 7, 8.
- **Edge Cases:** Deleting an examination after marks have already been recorded.

#### Module 13: Internal Assessment (CIA)
- **Purpose:** Continuous evaluation of student academic performance across sessional tests and assignments.
- **Main Features:** Batch mark entry grid, component weighting, total internal mark consolidation.
- **User Roles:** `FACULTY` (Enter/Lock marks), `ADMIN` (Review/Override), `STUDENT` (View personal).
- **Required Frontend Pages:** `/faculty/marks-entry`, `/student/internal-marks`.
- **Main Components:** `MarksEntryGrid`, `MarksInputCell`, `ScoreSummaryCard`.
- **Backend API Endpoints:** `POST /api/assessments/marks`, `GET /api/assessments/subject/:subjectId`, `GET /api/assessments/student/:studentId`.
- **Database Collections:** `Results` (internal assessment components).
- **Validation Requirements:** $0 \le \text{Marks Obtained} \le \text{Max Marks}$.
- **Authorization Requirements:** Faculty: restricted to assigned subject-sections; Student: own marks.
- **Dependencies:** Modules 9, 10, 12.
- **Edge Cases:** Rounding of fractional assessment marks; faculty entering marks for un-enrolled students.

#### Module 14: Results Management
- **Purpose:** Semester result processing, letter grade assignment, and SGPA tabulation.
- **Main Features:** Automatic AKTU 10-point grade calculation, SGPA calculation, publication status toggle (Draft/Published), digital gradecard generation.
- **User Roles:** `ADMIN` (Publish), `FACULTY` (View class result), `STUDENT` (View own transcript).
- **Required Frontend Pages:** `/admin/results/publish`, `/faculty/results`, `/student/results`.
- **Main Components:** `ResultTabulationSheet`, `GradeCard`, `SGPABadge`, `ResultPublishModal`.
- **Backend API Endpoints:** `POST /api/results/publish`, `GET /api/results/semester/:semesterId`, `GET /api/results/student/:studentId`.
- **Database Collections:** `Results`.
- **Validation Requirements:** Unique `(examination, student, subject)`. Total marks must be non-negative.
- **Authorization Requirements:** Admin publishes; Student reads only their own published grades.
- **Dependencies:** Modules 8, 9, 12, 13.
- **Edge Cases:** Result withheld due to disciplinary/attendance debarment; retroactive result corrections.

#### Module 15: Student Dashboard
- **Purpose:** Student self-service home portal summarizing academic health.
- **Main Features:** Real-time attendance percentage meter, low-attendance alert, enrolled subject cards, upcoming exams countdown, recent announcement feed.
- **User Roles:** `STUDENT`.
- **Required Frontend Pages:** `/student/dashboard`.
- **Main Components:** `AttendanceGaugeChart`, `SubjectProgressGrid`, `RecentNoticeCarousel`, `UpcomingExamTimeline`.
- **Backend API Endpoints:** `GET /api/student/dashboard-overview`.
- **Database Collections:** Aggregations of `Attendance`, `Enrollments`, `Results`, `Announcements`.
- **Validation Requirements:** Authenticated student context.
- **Authorization Requirements:** Scoped exclusively to authenticated student.
- **Dependencies:** Modules 1, 9, 11, 14, 17.
- **Edge Cases:** Newly enrolled student with zero attendance and zero exam data.

#### Module 16: Faculty Dashboard
- **Purpose:** Academic workflow workspace for instructors.
- **Main Features:** Today's lecture schedule, assigned subjects quick links, pending attendance reminder pill, class attendance distribution chart.
- **User Roles:** `FACULTY`.
- **Required Frontend Pages:** `/faculty/dashboard`.
- **Main Components:** `AssignedSubjectCards`, `TodayScheduleList`, `AttendanceStatusAlert`, `QuickMarkAttendanceButton`.
- **Backend API Endpoints:** `GET /api/faculty/dashboard-overview`.
- **Database Collections:** Aggregations of `FacultyAssignments`, `Attendance`, `Announcements`.
- **Validation Requirements:** Authenticated faculty context.
- **Authorization Requirements:** Scoped exclusively to authenticated faculty.
- **Dependencies:** Modules 1, 10, 11, 17.
- **Edge Cases:** Faculty with zero active assignments in the current semester.

#### Module 17: Announcements
- **Purpose:** Campus-wide and departmental notification dissemination.
- **Main Features:** Rich text notice creation, target audience selection (All, Department, Semester), active/pinned status, expiration dates.
- **User Roles:** `ADMIN` & `FACULTY` (Create/Manage), `STUDENT` (Read).
- **Required Frontend Pages:** `/announcements`, `/admin/announcements/manage`.
- **Main Components:** `NoticeCard`, `NoticeModal`, `AudienceTag`, `NoticeComposer`.
- **Backend API Endpoints:** `GET /api/announcements`, `POST /api/announcements`, `DELETE /api/announcements/:id`.
- **Database Collections:** `Announcements`.
- **Validation Requirements:** Non-empty title and content, valid target audience enum.
- **Authorization Requirements:** Admin: All; Faculty: Scoped; Student: Read matching.
- **Dependencies:** Modules 1, 5.
- **Edge Cases:** Expired announcements continuing to display; malformed HTML injection in notice body.

#### Module 18: Reports and Analytics
- **Purpose:** Institutional intelligence and administrative export generation.
- **Main Features:** Department-wise attendance comparison charts, pass/fail distribution per subject, defaulter list generation, CSV/Excel table exports.
- **User Roles:** `ADMIN`, `FACULTY` (Scoped).
- **Required Frontend Pages:** `/admin/reports`, `/faculty/reports`.
- **Main Components:** `AttendanceTrendChart`, `GradeDistributionBarChart`, `DefaulterExportButton`.
- **Backend API Endpoints:** `GET /api/reports/attendance-trends`, `GET /api/reports/defaulters`, `GET /api/reports/grade-distribution`.
- **Database Collections:** Aggregations across `Attendance`, `Results`, `Enrollments`.
- **Validation Requirements:** Valid date filters, valid department/semester selection.
- **Authorization Requirements:** Admin: full; Faculty: assigned subjects.
- **Dependencies:** Modules 9, 11, 14.
- **Edge Cases:** Heavy aggregation query timeouts (mitigated by optimized index pipelines).

#### Module 19: Search, Sorting, Filtering and Pagination
- **Purpose:** High-performance, standardized data navigation across all table views.
- **Main Features:** Full-text debounce search, multi-column sorting (asc/desc), faceted dropdown filters, server-side pagination with configurable page sizes (10, 25, 50).
- **User Roles:** `ADMIN`, `FACULTY`, `STUDENT`.
- **Required Frontend Pages:** Shared utility across all data listing screens.
- **Main Components:** `DataTable`, `SearchBar`, `FilterDropdown`, `PaginationBar`, `PageSizeSelector`.
- **Backend API Endpoints:** Integrated via standardized query parameters: `?page=1&limit=25&search=abc&sort=rollNumber&order=asc`.
- **Database Collections:** All collections.
- **Validation Requirements:** `page >= 1`, `1 <= limit <= 100`.
- **Authorization Requirements:** Inherited from respective domain endpoints.
- **Dependencies:** Reusable utility across all modules.
- **Edge Cases:** Regex injection in search input, pagination out-of-range bounds.

#### Module 20: Audit Logging
- **Purpose:** Regulatory accountability and tamper-evident tracking of system actions.
- **Main Features:** Automatic interception of state-altering requests (`POST`, `PUT`, `DELETE`), capturing actor ID, timestamp, target entity, old/new diff summary, and client IP.
- **User Roles:** `ADMIN` (Inspect only).
- **Required Frontend Pages:** `/admin/audit-logs`.
- **Main Components:** `AuditLogTable`, `AuditDetailModal`, `ActionBadge`, `DateRangeFilter`.
- **Backend API Endpoints:** `GET /api/audit-logs`, `GET /api/audit-logs/:id`.
- **Database Collections:** `AuditLogs`.
- **Validation Requirements:** Read-only API; logs are written programmatically via backend middleware.
- **Authorization Requirements:** Strictly restricted to `ADMIN`.
- **Dependencies:** Modules 1 and all mutation routes.
- **Edge Cases:** Rapid log volume growth; ensuring logging failure does not break primary user transaction.

---

### 3. Systematic Development Order (Phased Schedule)

Based on topological dependency analysis, the 20 modules must be constructed in **6 distinct phases**:
1. **Tier 1 (Core Identity & Master Data):**
   - Module 1 (Auth) $\rightarrow$ Module 20 (Audit Logging) $\rightarrow$ Module 5 (Departments) $\rightarrow$ Module 6 (Courses) $\rightarrow$ Module 7 (Semesters) $\rightarrow$ Module 8 (Subjects).
2. **Tier 2 (User Profiles & Allocations):**
   - Module 3 (Students) $\rightarrow$ Module 4 (Faculty) $\rightarrow$ Module 9 (Enrollments) $\rightarrow$ Module 10 (Faculty Assignments).
3. **Tier 3 (Academic Operations):**
   - Module 11 (Attendance Management) $\rightarrow$ Module 12 (Examination Management).
4. **Tier 4 (Evaluation & Grading):**
   - Module 13 (Internal Assessment) $\rightarrow$ Module 14 (Results Management).
5. **Tier 5 (Dashboards & Engagement):**
   - Module 15 (Student Dashboard) $\rightarrow$ Module 16 (Faculty Dashboard) $\rightarrow$ Module 2 (Admin Dashboard) $\rightarrow$ Module 17 (Announcements).
6. **Tier 6 (Intelligence & Optimization):**
   - Module 18 (Reports & Analytics) $\rightarrow$ Module 19 (Search, Sorting, Filtering & Pagination Polish).
