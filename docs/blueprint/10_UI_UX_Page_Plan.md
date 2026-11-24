# Student Management System (SMS)
## Document 10: UI/UX Architecture, Design System & Page Inventory

---

### 1. Enterprise SaaS Design System Specification

The Student Management System UI is designed following modern, clean enterprise software principles (comparable to Linear, Stripe, and Tailwind UI). It balances dense academic information display with visual clarity, intuitive feedback, and accessible contrast ratios.

#### 1.1 Color Architecture & Palette (Tailwind CSS Tokens)

| Token Category | Tailwind Utility Class | Hex Code | Visual & Semantic Role |
| :--- | :--- | :--- | :--- |
| **Primary Brand (600)** | `bg-indigo-600`, `text-indigo-600` | `#4F46E5` | Primary buttons, active navigation, key focal actions. |
| **Primary Dark (900)** | `bg-indigo-950`, `text-slate-900` | `#1E1B4B` | Sidebar backgrounds, dark mode surfaces, high-contrast headings. |
| **Neutral Surface** | `bg-slate-50`, `bg-white` | `#F8FAFC` / `#FFFFFF` | Main page background, card surfaces, table rows. |
| **Neutral Borders** | `border-slate-200`, `divide-slate-200` | `#E2E8F0` | Subtle hairline dividers, input field borders, table boundaries. |
| **Typography Base** | `text-slate-900` | `#0F172A` | Primary headers, data table cell text, strong titles. |
| **Typography Muted** | `text-slate-500` | `#64748B` | Subtitles, timestamps, metadata labels, form hints. |
| **Success / Present** | `bg-emerald-50`, `text-emerald-700` | `#10B981` | Present attendance, passed exams, successful operations. |
| **Warning / Alert** | `bg-amber-50`, `text-amber-700` | `#F59E0B` | Attendance between 60%–74%, draft status, pending approvals. |
| **Danger / Absent** | `bg-rose-50`, `text-rose-700` | `#EF4444` | Absent status, attendance $<60\%$, failed exams, destructive actions. |

#### 1.2 Typography Standards
- **Font Family:** `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.
- **Scale:**
  - `Display / KPI`: `text-3xl font-bold tracking-tight text-slate-900` (30px / 36px)
  - `Page Heading (H1)`: `text-2xl font-semibold text-slate-900` (24px / 32px)
  - `Section Title (H2)`: `text-lg font-medium text-slate-800` (18px / 28px)
  - `Card Title (H3)`: `text-base font-medium text-slate-700` (16px / 24px)
  - `Body / Cell Text`: `text-sm font-normal text-slate-600` (14px / 20px)
  - `Caption / Microcopy`: `text-xs font-medium text-slate-400` (12px / 16px)

#### 1.3 Spacing & Layout Grid
- Strict 4px/8px incremental rhythm: `p-2` (8px), `p-4` (16px), `p-6` (24px), `gap-4` (16px), `gap-6` (24px).
- Container Width: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.

#### 1.4 Responsive Breakpoints
- **Mobile (`< 640px`):** Off-canvas drawer navigation, stacked single-column cards, horizontally scrollable data tables.
- **Tablet (`640px - 1023px`):** Collapsed icon-only sidebar option, 2-column dashboard grids.
- **Desktop (`>= 1024px`):** Persistent 260px fixed sidebar, multi-column KPI grids (3–4 columns), expanded master-detail views.

---

### 2. Comprehensive Role-Based Page Inventory

#### 2.1 Common Layout & Top Navigation Structure
- **Persistent Header (All Roles):**
  - Left: Hamburger toggle (mobile), institutional crest, active module breadcrumbs.
  - Right: Quick academic year / term selector, notification bell with unread badge counter, user avatar dropdown (showing Name, Role, Email, "My Profile", "Change Password", and "Sign Out").

---

#### 2.2 System Administrator (`ADMIN`) View Hierarchy

| Page Route | Page Title | Primary Components | Actions / Modals |
| :--- | :--- | :--- | :--- |
| `/admin/dashboard` | Executive Command Center | 4 KPI Cards, Enrollment Chart, Defaulter Donut, Recent Audit Feed | Quick enrollment button, export campus report. |
| `/admin/departments` | Department Directory | Filterable Data Table, HOD Column, Total Courses Count | `AddDepartmentModal`, `EditDepartmentModal`, Delete confirmation. |
| `/admin/courses` | Degree Programs | Program Table, Duration, Total Semesters, Department Link | `CourseFormModal`, Course curriculum view drawer. |
| `/admin/semesters` | Academic Terms | Term timeline cards, Active/Upcoming toggle, Dates | `CreateSemesterModal`, Term activation switch. |
| `/admin/subjects` | Syllabus & Subject Catalog| Subject Data Table, Credits Badge, Category Filter (Theory/Lab)| `SubjectFormModal`, Bulk syllabus CSV import. |
| `/admin/students` | Student Information System | Master Student Table, Roll No search, Dept filter, Status Badge| `StudentRegistrationDrawer`, Bulk promotion modal. |
| `/admin/faculty` | Faculty Directory | Faculty Table, Designation filter, Employee ID search | `FacultyOnboardingModal`, Status toggle. |
| `/admin/enrollments` | Semester Cohort Enrollment| Enrollment Table by Term & Section, Student Picker | `BatchEnrollmentModal`, Section transfer modal. |
| `/admin/faculty-assignments` | Teaching Workloads | Matrix table of Faculty vs Subject & Section | `AssignFacultyModal`, Revoke assignment modal. |
| `/admin/examinations` | Examination Schedules | Scheduled Exams Table, Exam Type filter, Status | `CreateExamModal`, Publish grades confirmation. |
| `/admin/attendance-reports` | Attendance Analytics | Institution-wide Defaulter Table, Date Range Filter | CSV Export, PDF Roll-sheet generator. |
| `/admin/announcements` | Institutional Broadcasts | Notice Board Table, Audience Tag, Expiration Date | `RichNoticeComposerModal`, Pin/Unpin action. |
| `/admin/audit-logs` | System Security Audit | Chronological log table, Actor filter, IP address, Payload diff | `AuditDetailInspectorModal`. |

---

#### 2.3 Faculty Member (`FACULTY`) View Hierarchy

| Page Route | Page Title | Primary Components | Actions / Modals |
| :--- | :--- | :--- | :--- |
| `/faculty/dashboard` | Academic Instructor Portal | Assigned Subjects Summary Cards, Today's Timetable, Pending Attendance Pill | One-click "Take Attendance Now" launcher. |
| `/faculty/subjects` | My Teaching Load | Grid cards of assigned subjects with student cohort counts | Link to roll-call, link to continuous assessment. |
| `/faculty/attendance/mark` | Roll-Call Attendance Sheet | Student roster with one-click toggles: Present, Absent, Late, Excused | "Mark All Present", Date selector, "Submit Attendance" CTA. |
| `/faculty/marks-entry` | Continuous Assessment Entry | Matrix spreadsheet grid for Sessional 1, Sessional 2, Assignments | Auto-save marks, "Finalize & Submit to Exam Cell". |
| `/faculty/announcements` | Class Announcements | List of active departmental notices | `CreateClassNoticeModal`. |
| `/faculty/profile` | Instructor Profile | Personal details, designations, assigned history | Password change tab. |

---

#### 2.4 Student (`STUDENT`) View Hierarchy

| Page Route | Page Title | Primary Components | Actions / Modals |
| :--- | :--- | :--- | :--- |
| `/student/dashboard` | Scholar Academic Hub | Real-time Attendance Gauge ($<75\%$ warning), Enrolled Subjects, Notices Feed | Download monthly summary. |
| `/student/profile` | Student Academic Profile | Personal particulars, AKTU Roll No, Department, Current Term | Edit contact details (restricted fields). |
| `/student/attendance` | Subject-Wise Attendance | Detailed subject breakdown table (Conducted, Attended, %), Calendar view | Filter by subject, inspect absentee dates. |
| `/student/internal-marks` | Continuous Assessments | Sessional score breakdown, assignment marks, faculty remarks | Print unofficial score sheet. |
| `/student/results` | Semester Grade Sheet | Official digital transcript format, Grades (A+ to F), Credits, SGPA Badge | Download official-format PDF gradecard. |
| `/student/announcements` | Campus Notice Board | Chronological feed of institutional and departmental notices | Search notices, view attachments. |

---

### 3. Reusable Component Blueprint

1. **`DataTable` Component:**
   - Client/Server-side sorting on table headers with visual arrow indicators.
   - Integrated debounce search bar (`300ms` typing buffer).
   - Faceted dropdown filters (Department, Status, Semester).
   - Sticky table header on vertical scroll.
   - Pagination footer displaying "Showing X to Y of Z results" with previous/next page pills.

2. **`MetricCard` (KPI) Component:**
   - Title label, metric value in bold display typography, subtext trend indicator (+5% vs last term), icon badge with semantic background.

3. **`StatusBadge` Component:**
   - Pill design (`rounded-full px-2.5 py-0.5 text-xs font-semibold`).
   - Dynamic variant mapping: `ACTIVE`/`PRESENT` (Emerald), `PENDING`/`BORDERLINE` (Amber), `INACTIVE`/`ABSENT` (Rose), `UPCOMING` (Slate).

4. **`AttendanceToggleGroup` Component:**
   - Segmented button control for fast roll-call marking: `[P] [A] [L] [E]` with keyboard accessibility shortcuts.

---

### 4. User Experience (UX) States: Loading, Error & Empty

- **Loading State:** 
  - Zero jarring full-screen whiteouts.
  - Page routes render skeleton placeholders matching the exact geometry of tables, cards, and metric boxes using Tailwind `animate-pulse`.
- **Empty State:**
  - Friendly illustrative iconography (Lucide React) accompanied by clear guidance: e.g., *"No subjects assigned for this semester yet"* with an administrative contact action.
- **Error State:**
  - Non-intrusive red alert banners for network failures with a "Retry Request" button, preserving form input state without wiping user data.
