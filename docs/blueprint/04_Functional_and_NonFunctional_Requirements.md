# Student Management System (SMS)
## Document 04: Functional & Non-Functional Requirements Specification

---

### 1. Functional Requirements (FR)

The functional requirements detail the concrete behaviors, operational capabilities, inputs, processing rules, and expected outputs of the SMS. Requirements are grouped by functional domain and tagged with unique identifiers.

#### 1.1 Authentication & User Management (FR-AUTH)
- **FR-AUTH-01 (Secure Login):** The system shall authenticate users using institutional email and password, issuing a signed JSON Web Token (JWT) on success.
- **FR-AUTH-02 (Password Hashing):** The system shall hash all passwords using `bcrypt` with a minimum cost factor of 10 prior to database persistence; plaintext passwords shall never be stored or logged.
- **FR-AUTH-03 (Session Expiration):** The system shall invalidate client JWT tokens after 24 hours of issuance, requiring re-authentication.
- **FR-AUTH-04 (Role Extraction):** The system shall embed the user's role (`ADMIN`, `FACULTY`, `STUDENT`) and corresponding profile reference (`studentId` or `facultyId`) in the JWT claims payload.
- **FR-AUTH-05 (User Provisioning):** The Admin shall be able to register new Faculty members and Students, auto-generating user credentials and linking profile documents.
- **FR-AUTH-06 (Password Reset):** Users shall be able to change their password by supplying their current verified password and conforming new password.

#### 1.2 Academic Infrastructure Management (FR-ACAD)
- **FR-ACAD-01 (Department Management):** Admin shall perform full CRUD operations on Departments (Department Code, Name, Head of Department, Status).
- **FR-ACAD-02 (Course Management):** Admin shall perform full CRUD operations on Courses / Programs (Course Code, Name, Degree Type [B.Tech], Total Semesters, Department Reference).
- **FR-ACAD-03 (Semester Management):** Admin shall manage Semesters (Semester Number [1–8], Academic Year, Start Date, End Date, Status [Active/Archived]).
- **FR-ACAD-04 (Subject Management):** Admin shall perform full CRUD on Curricular Subjects (Subject Code, Name, Credits, Type [Theory/Practical/Elective], Department, Semester Reference).
- **FR-ACAD-05 (Referential Protection):** The system shall prohibit the deletion of any Department, Course, or Semester that contains active child records (e.g., enrolled students or active subjects).

#### 1.3 Enrollment & Allocation Management (FR-ENRL)
- **FR-ENRL-01 (Student Enrollment):** Admin shall enroll students into a designated Course and Semester for a given Academic Year.
- **FR-ENRL-02 (Duplicate Prevention):** The system shall enforce a unique constraint preventing a student from being actively enrolled more than once in the same semester.
- **FR-ENRL-03 (Faculty Allocation):** Admin shall allocate Faculty members to specific Subjects and Sections (e.g., Section A, Section B) for an active semester.
- **FR-ENRL-04 (Assignment Lookups):** Faculty shall be able to query all and only their active subject allocations; students shall be able to query all subjects corresponding to their active semester enrollment.

#### 1.4 Attendance Management (FR-ATTD)
- **FR-ATTD-01 (Roll-Call Interface):** Authorized Faculty shall view an active roster of all students enrolled in the assigned subject-section for marking daily attendance.
- **FR-ATTD-02 (Status Classification):** The system shall record attendance status as `Present`, `Absent`, `Late`, or `Excused`.
- **FR-ATTD-03 (Date & Record Uniqueness):** The system shall enforce uniqueness on `(studentId, subjectId, date, semesterId)` ensuring only one attendance entry exists per student per subject per date. Subsequent saves shall update existing entries.
- **FR-ATTD-04 (Percentage Computation):** The system shall dynamically compute cumulative attendance percentages per subject and overall aggregate:
  $$\text{Subject Attendance \%} = \left(\frac{\text{Classes Present + Excused}}{\text{Total Conducted Classes}}\right) \times 100$$
- **FR-ATTD-05 (Regulatory Shortage Flagging):** The system shall flag students with attendance $< 75\%$ in red/amber alerts across student, faculty, and administrative views in accordance with AKTU norms.
- **FR-ATTD-06 (Export & Reports):** Admin and Faculty shall be able to export attendance reports in CSV/Excel formats for official departmental filings.

#### 1.5 Examination & Result Management (FR-EXAM)
- **FR-EXAM-01 (Exam Scheduling):** Admin shall configure Examinations (Exam Name [e.g., Sessional 1, Sessional 2, End-Semester], Academic Year, Semester, Date Range).
- **FR-EXAM-02 (Internal Mark Entry):** Authorized Faculty shall input Continuous Internal Assessment (CIA) marks (out of defined maximum marks) for students in their assigned subjects.
- **FR-EXAM-03 (Marks Range Validation):** The system shall strictly prevent entry of marks below 0 or above the prescribed maximum marks for any assessment component.
- **FR-EXAM-04 (Grade Point Conversion):** The system shall automatically map raw percentages/scores to the official AKTU 10-point letter grading scale:
  - 90%–100% $\rightarrow$ Grade `A+` (Grade Point: 10)
  - 80%–89% $\rightarrow$ Grade `A` (Grade Point: 9)
  - 70%–79% $\rightarrow$ Grade `B+` (Grade Point: 8)
  - 65%–69% $\rightarrow$ Grade `B` (Grade Point: 7)
  - 55%–64% $\rightarrow$ Grade `C` (Grade Point: 6)
  - 50%–54% $\rightarrow$ Grade `D` (Grade Point: 5)
  - 40%–49% $\rightarrow$ Grade `P` (Grade Point: 4)
  - $< 40\%$ $\rightarrow$ Grade `F` (Grade Point: 0 - Fail)
- **FR-EXAM-05 (SGPA Computation):** The system shall calculate Semester Grade Point Average (SGPA):
  $$\text{SGPA} = \frac{\sum (\text{Subject Credits} \times \text{Subject Grade Point})}{\sum \text{Subject Credits}}$$
- **FR-EXAM-06 (Transcript View):** Students shall be able to view their semester result scorecard displaying subject codes, names, credits, internal marks, external marks, grades earned, and final SGPA.

#### 1.6 Institutional Announcements (FR-ANNC)
- **FR-ANNC-01 (Notice Creation):** Admin and authorized Faculty shall create and publish announcements with title, content, target audience (`ALL`, `FACULTY`, `STUDENT`, or specific `DEPARTMENT`), and expiration date.
- **FR-ANNC-02 (Notice Feed):** Students and Faculty shall view a prioritized, reverse-chronological notification feed on their respective dashboard landing pages.

#### 1.7 Dashboards & Analytics (FR-DASH)
- **FR-DASH-01 (Admin Dashboard):** Display aggregate statistics (Total Students, Total Faculty, Active Departments, Overall Average Attendance, Defaulter Count) and Recharts visual distributions.
- **FR-DASH-02 (Faculty Dashboard):** Display assigned subjects count, today's schedule, pending attendance submissions, and student performance summaries.
- **FR-DASH-03 (Student Dashboard):** Display real-time attendance percentage gauge, upcoming examinations, recent internal assessment grades, and institutional notices.

#### 1.8 Audit Logging (FR-AUDT)
- **FR-AUDT-01 (Event Capture):** The system shall automatically record an immutable audit log for all non-safe HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`) on core entities.
- **FR-AUDT-02 (Metadata Fields):** Each audit record shall capture `timestamp`, `actorId`, `actorRole`, `actionType`, `targetEntity`, `targetId`, and `ipAddress`.
- **FR-AUDT-03 (Admin Inspection):** Admin shall be able to filter and review audit trails by date, actor, or entity type.

---

### 2. Non-Functional Requirements (NFR)

#### 2.1 Performance & Scalability (NFR-PERF)
- **NFR-PERF-01 (API Response Time):** 95% of standard read API requests shall respond within $< 300\text{ ms}$ under nominal network conditions.
- **NFR-PERF-02 (Database Indexing):** All foreign keys, unique combinations, and high-frequency filter fields (`studentId`, `facultyId`, `subjectId`, `semesterId`, `date`, `rollNumber`) must possess active MongoDB B-tree indexes.
- **NFR-PERF-03 (Client Bundle Optimization):** Vite production build shall implement code splitting and lazy loading per route, keeping initial client bundle size below $350\text{ KB}$ gzipped.
- **NFR-PERF-04 (Caching):** TanStack Query on the frontend shall cache read queries with a stale-time of 2 to 5 minutes to eliminate redundant HTTP round-trips.

#### 2.2 Security & Privacy (NFR-SEC)
- **NFR-SEC-01 (Transport Encryption):** All communications across client, server, and database must enforce TLS 1.3 / HTTPS.
- **NFR-SEC-02 (NoSQL Injection Prevention):** Mongoose schemas and strict validation middleware must sanitize query parameters and strip operators like `$gt`, `$ne`, and `$where` from user inputs.
- **NFR-SEC-03 (Rate Limiting):** Authentication endpoints (`/api/auth/login`) shall be rate-limited to 5 requests per minute per IP address to thwart brute-force password guessing attacks.
- **NFR-SEC-04 (CORS Security):** Cross-Origin Resource Sharing (CORS) shall be restricted strictly to the designated Vercel frontend origin in production.
- **NFR-SEC-05 (Data Isolation):** Multi-tenant authorization middleware must verify that a student user token can never access another student's profile, attendance, or result records.

#### 2.3 Reliability & Availability (NFR-REL)
- **NFR-REL-01 (Availability Target):** The deployed application on Vercel and Render shall achieve 99.5% uptime during academic evaluation windows.
- **NFR-REL-02 (Graceful Degradation):** In the event of a database connectivity issue, the API shall return structured HTTP 503 Service Unavailable responses rather than unhandled process termination.
- **NFR-REL-03 (Data Consistency):** Database operations involving multi-document modifications (e.g., student enrollment or result tabulations) must use atomic operations to prevent partial or corrupted state.

#### 2.4 Usability & Accessibility (NFR-USE)
- **NFR-USE-01 (Responsive Design):** The user interface shall adapt smoothly across screen viewports from 360px (mobile) to 1920px (ultra-wide desktop) without text clipping or horizontal layout breaking.
- **NFR-USE-02 (Accessibility Standards):** UI components shall adhere to WCAG 2.1 Level AA color contrast ratios (minimum 4.5:1 for body text) and provide semantic ARIA labels for interactive elements.
- **NFR-USE-03 (Intuitive Feedback):** Form submissions and asynchronous actions must indicate immediate progress (spinners, disabled buttons) and present unambiguous error or success notifications.

#### 2.5 Maintainability & Extensibility (NFR-MNT)
- **NFR-MNT-01 (Modular Architecture):** Backend routes, controllers, and models must be strictly organized by domain modules.
- **NFR-MNT-02 (Schema Strictness):** All Mongoose models shall enforce `strict: true` and `timestamps: true` to guarantee uniform audit timestamps (`createdAt`, `updatedAt`).
- **NFR-MNT-03 (Code Consistency):** ESLint and Prettier configurations must ensure unified coding style across the full codebase.
