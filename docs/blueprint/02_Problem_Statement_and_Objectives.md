# Student Management System (SMS)
## Document 02: Problem Statement, Solution Architecture & Objectives

---

### 1. Problem Statement & Analysis of Manual Systems

In many higher educational institutions operating under AKTU and comparable university systems, academic administration has historically relied upon traditional, semi-manual, or heavily fragmented processes. These legacy workflows involve paper-based registers, standalone desktop spreadsheets (such as isolated Excel workbooks), physical notice boards, and disconnected software tools operated by individual departments.

This manual paradigm creates systemic vulnerabilities and operational inefficiencies:

#### 1.1 Critical Vulnerabilities of Legacy Systems
1. **Severe Data Redundancy & Inconsistency:**
   - Student demographic and enrollment details are duplicated across department registers, library records, accounts desks, and examination cells.
   - When student details change (e.g., contact information, residential address, elective subject allocation), updates are inconsistently applied, resulting in conflicting institutional records.

2. **Computational Errors in Attendance & Internal Assessments:**
   - Faculty manually tally daily attendance from physical registers into monthly sheets. Human calculation errors in cumulative attendance percentages frequently lead to wrongful debarment or erroneous eligibility approvals for semester examinations under AKTU 75% attendance regulations.
   - Internal assessment calculations (quizzes, sessional exams, assignments) require tedious manual weightage computations, increasing grading turnaround time and transcription mistakes.

3. **Information Asymmetry & Lack of Real-Time Accessibility:**
   - Students have zero real-time visibility into their daily attendance trends or interim continuous internal assessment (CIA) marks.
   - Attendance shortages are typically discovered only days before university examination admit cards are issued, precluding timely academic intervention or parental notification.

4. **Administrative Latency & High Resource Burden:**
   - Administrative staff dedicate hundreds of man-hours per semester manually cross-referencing subject allocations, generating roll-sheets, verifying eligibility, and tabulating performance reports.
   - Physical paper storage incurs ongoing physical archive costs, is susceptible to physical deterioration, fire/water hazards, and unauthorized physical access.

5. **Absence of Governance & Audit Trails:**
   - In manual and unvetted spreadsheet workflows, retroactive alteration of marks or attendance records cannot be reliably tracked or attributed to a specific authorized actor, compromising institutional academic integrity.

---

### 2. Proposed Solution: The Modern Web-Based SMS

The proposed **Student Management System (SMS)** introduces a centralized, cloud-native, role-governed web application built on the modern MERN (MongoDB, Express, React, Node.js) architecture.

The system replaces manual and disjointed tools with an integrated ecosystem that provides:
- **Single Source of Truth:** A unified MongoDB cloud database storing all institutional master data (departments, courses, semesters, subjects) and transactional data (enrollments, attendance, assessments, results).
- **Automated Business Rules:** Algorithmic calculation of real-time attendance percentages, automatic AKTU grade point and SGPA computations, and dynamic eligibility flagging.
- **Role-Based Access Governance:** Strict three-tier access control separating Administrative oversight, Faculty teaching and assessment workflows, and Student self-service portals.
- **Continuous Transparency:** Instantaneous, responsive web dashboards accessible from desktops, tablets, or smartphones, enabling students to track their academic trajectory from Day 1 of the semester.
- **Accountability & Integrity:** Immutable audit logs capturing every critical administrative and assessment action with actor metadata, timestamps, and IP addresses.

---

### 3. Project Objectives (SMART Criteria)

The objectives of this B.Tech CSE mini project (BCS 554) are structured following the SMART (Specific, Measurable, Achievable, Relevant, Time-bound) framework:

1. **Centralize Academic Master Records:**
   - Establish a relational-like normalized document schema in MongoDB Atlas managing departments, degree programs, semesters, and subjects with zero data duplication.
2. **Implement Secure Multi-Persona Authentication & RBAC:**
   - Construct robust JWT authentication with salted bcrypt hashing, enforcing absolute authorization barriers between Admin, Faculty, and Student roles at both client route and REST API middleware layers.
3. **Automate Attendance Tracking & Percentage Metrics:**
   - Deliver a high-speed faculty attendance marking interface capable of logging batch attendance for 60+ students in under 30 seconds, with immediate mathematical recomputation of student cumulative attendance percentages.
4. **Digitize Continuous Internal Assessment & University Results:**
   - Implement structured mark-entry modules for sessional exams and assignments, automatically tabulating weighted internal scores and presenting semester grade sheets according to AKTU 10-point grading standards.
5. **Provide Role-Tailored Interactive Dashboards:**
   - Build three distinct dashboard experiences powered by Recharts and Lucide React, featuring key performance indicators (KPIs), visual trend lines, and quick-action toolbars.
6. **Ensure 100% Student Data Isolation:**
   - Strictly guarantee that authenticated students can read only their own profile, attendance records, and examination grades, eliminating any cross-student data leakage.
7. **Complete Production-Ready Deployment within 4 Weeks:**
   - Successfully build, test, and deploy the decoupled application onto Vercel (Frontend) and Render (Backend) with live MongoDB Atlas cloud database connectivity.

---

### 4. Project Scope & Boundaries

To ensure feasibility within the intensive **four-week development timeline** of the AKTU BCS 554 course, project boundaries are explicitly defined:

#### 4.1 In-Scope Capabilities
- Complete Master Data Management (Departments, Courses, Semesters, Subjects).
- User Management: Student registration, Faculty provisioning, Admin account management.
- Semester-wise Student Enrollment & Faculty Subject Allocation.
- Date-wise, subject-wise attendance marking, editing (by authorized faculty within a time window), and percentage calculation.
- Internal assessment mark entry and calculation of weighted continuous evaluation scores.
- Semester examination result recording, grade calculation (Letter Grade & Grade Points), and unofficial transcript view.
- Real-time role-based Dashboards (Admin, Faculty, Student) with metrics and visual charts.
- Institutional Announcement broadcasting (targetable to all, specific departments, or specific semesters).
- Administrative Audit Logging for record-level accountability.
- Search, multi-field filtering, sorting, and pagination across all large data tables.

#### 4.2 Out-of-Scope (Deliberate Boundary Exclusions)
- Real-time payment gateway integration (fees management is limited to recorded status or excluded in this mini-project).
- Live biometric/RFID hardware sensor integration (attendance is digitized via the Faculty web interface).
- Automated SMS/WhatsApp telecommunication gateway integration (in-app notifications and announcements are used instead).
- Multi-institutional university-wide hosting (the system is configured as a single-institution/campus SMS instance).

---

### 5. Target Users & Stakeholder Personas

| User Persona | Institutional Role | Primary Objectives | System Interactions |
| :--- | :--- | :--- | :--- |
| **System Administrator** | Registrar / Academic Dean / IT Cell | Complete operational governance, academic configuration, system health monitoring. | Full CRUD on all academic entities, user provisioning, system-wide analytics, audit logs. |
| **Faculty Member** | Professor / Assistant Professor / Lecturer | Delivery of curriculum, tracking student progress, assessment. | Viewing assigned classes, marking daily attendance, entering sessional marks, posting notices. |
| **Student** | Enrolled Undergraduate Student | Tracking academic compliance, viewing evaluations, accessing notices. | Viewing attendance percentages, checking internal marks and results, viewing timetable and announcements. |

---

### 6. Expected Institutional Benefits

1. **100% Elimination of Manual Attendance Tabulation Errors:**
   Automated mathematical evaluation of attendance eliminates rounding discrepancies and human tallying mistakes.
2. **85% Reduction in Administrative Turnaround Time:**
   Generation of student eligibility lists, sessional score sheets, and departmental performance summaries takes seconds rather than weeks.
3. **Proactive Academic Remediation:**
   Students with attendance falling below the AKTU 75% threshold are visually alerted in amber/red on their daily dashboard, enabling timely remediation before end-semester debarment.
4. **Enhanced Data Security & Compliance:**
   Role-enforced API routes and encrypted credentials safeguard student privacy and align with university record governance standards.
5. **Zero Paper Waste:**
   Replaces thousands of sheets of attendance registers and mark tabulation sheets per semester, supporting green campus initiatives.

---

### 7. Project Limitations & Risk Assumptions

1. **Time Horizon:** The four-week development limit mandates disciplined agile execution and prevents the inclusion of non-core ancillary modules (such as hostel or transportation management).
2. **Network Dependency:** As a cloud-hosted web application (Vercel/Render/Atlas), continuous Internet connectivity is required for data synchronization.
3. **Academic Grading Baseline:** The grading logic conforms specifically to AKTU B.Tech regulations; customization for other university grading scales would require configuration adjustments.
