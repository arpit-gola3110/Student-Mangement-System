# Student Management System (SMS)
## Document 03: Software Requirements Specification (SRS)
*(Structured according to IEEE Std 830-1998 Guidelines)*

---

### 1. Introduction

#### 1.1 Purpose
The purpose of this Software Requirements Specification (SRS) is to establish a rigorous, comprehensive, and definitive contractual description of the functional, non-functional, and interface requirements for the **Student Management System (SMS)**. This specification serves as the primary technical foundation for software engineers, database architects, academic evaluators (under AKTU course BCS 554), and quality assurance personnel.

#### 1.2 Scope of the Software
The Student Management System (SMS) is an enterprise-class, three-tier web application developed for academic institutions affiliated with Dr. A.P.J. Abdul Kalam Technical University (AKTU). The system delivers a centralized digital platform to manage student academic life cycles from enrollment through graduation. Key operational areas covered include:
- Centralized academic structural management (Departments, Degrees, Semesters, Subjects).
- Institutional actor management (Admin, Faculty, Student) with Role-Based Access Control (RBAC).
- Dynamic student semester enrollment and faculty course allocation.
- Granular attendance tracking with automated calculation of regulatory attendance percentages.
- Continuous Internal Assessment (CIA) management and semester examination result publishing based on AKTU 10-point credit scales.
- Multi-channel academic notice broadcasting.
- High-resolution analytical dashboards and tamper-evident audit logging.

#### 1.3 Definitions, Acronyms, and Abbreviations
- **AKTU:** Dr. A.P.J. Abdul Kalam Technical University, Lucknow.
- **BCS 554:** Course code for B.Tech CSE Internship Assessment / Mini Project.
- **SMS:** Student Management System.
- **RBAC:** Role-Based Access Control.
- **JWT:** JSON Web Token (RFC 7519).
- **MERN:** Technology stack comprising MongoDB, Express.js, React.js, and Node.js.
- **ODM:** Object Data Modeling (Mongoose).
- **REST:** Representational State Transfer.
- **CIA:** Continuous Internal Assessment (Sessional Exams, Assignments, Quizzes).
- **SGPA / CGPA:** Semester Grade Point Average / Cumulative Grade Point Average.
- **PII:** Personally Identifiable Information.
- **CRUD:** Create, Read, Update, Delete.

#### 1.4 References
1. IEEE Std 830-1998: *IEEE Recommended Practice for Software Requirements Specifications*.
2. AKTU Ordinance for Bachelor of Technology (B.Tech) Four-Year Degree Course (Credit System).
3. AKTU BCS 554 Mini Project / Internship Assessment Guidelines (Session 2026–27).
4. MongoDB Database Manual (v7.0/8.0).
5. React 18 & Express.js Technical Standards.

#### 1.5 Document Overview
This document is organized into:
- **Section 2:** Overall Description (perspective, user classes, operating environment, constraints).
- **Section 3:** External Interface Requirements (UI, hardware, software, communications).
- **Section 4:** System Features & Functional Requirements.
- **Section 5:** Non-Functional Quality Requirements.

---

### 2. Overall Description

#### 2.1 Product Perspective
The SMS is a greenfield, self-contained, cloud-hosted web system replacing disparate paper registers and desktop spreadsheets. It operates as a decoupled client-server architecture:
- **Client Tier:** Single Page Application (SPA) compiled via Vite, rendered by React.js, styled with Tailwind CSS, and hosted on Vercel CDN.
- **Application Tier:** Stateless RESTful service executed by Node.js and Express.js, hosted on Render.
- **Data Tier:** Managed cloud database cluster hosted on MongoDB Atlas.

```
+----------------------------------------------------------------+
|                        Client Layer                            |
|             React 18 + Vite + Tailwind CSS (SPA)               |
|                       Hosted on Vercel                         |
+-------------------------------+--------------------------------+
                                |  HTTPS (REST / JSON)
                                |  JWT in Authorization Header
+-------------------------------v--------------------------------+
|                      Application Layer                         |
|                 Node.js + Express.js REST API                  |
|                 Hosted on Render Web Service                   |
+-------------------------------+--------------------------------+
                                |  Mongoose Driver
                                |  Encrypted Connection Pool
+-------------------------------v--------------------------------+
|                        Database Layer                          |
|                     MongoDB Atlas Cluster                      |
|                  Document Stores with Indexes                  |
+----------------------------------------------------------------+
```

#### 2.2 User Classes and Characteristics
The system defines three distinct primary user classes:

1. **System Administrator (Admin):**
   - *Technical Proficiency:* Moderate to High.
   - *Operational Context:* Responsible for setup, institutional configurations, user provisioning, global overrides, and system auditing.
   - *Security Level:* Complete read and write privileges across all entities.

2. **Faculty Member:**
   - *Technical Proficiency:* Basic to Moderate.
   - *Operational Context:* Responsible for executing academic delivery, taking daily attendance for assigned subject-sections, entering internal marks, and viewing assigned student cohorts.
   - *Security Level:* Restricted access scoped strictly to assigned subjects, sections, and semesters.

3. **Student:**
   - *Technical Proficiency:* Everyday web/mobile consumer.
   - *Operational Context:* Inspects personal academic standing, daily attendance records, internal marks, semester results, and departmental announcements.
   - *Security Level:* Strictly read-only access restricted solely to their personal profile and academic records.

#### 2.3 Operating Environment
- **Client Platforms:** Modern evergreen web browsers supporting ES6+ (Google Chrome 110+, Mozilla Firefox 110+, Apple Safari 16+, Microsoft Edge 110+). Fully responsive across Desktop (1280px+), Laptop (1024px+), Tablet (768px–1023px), and Mobile devices (360px–767px).
- **Server Platform:** Node.js v20 LTS running on Linux (Alpine / Ubuntu 22.04 LTS containerized container on Render).
- **Database Engine:** MongoDB Atlas v7.0+ with WiredTiger storage engine, TLS 1.3 encrypted connections.

#### 2.4 Design and Implementation Constraints
1. **Academic Schedule Constraint:** Total development, testing, and deployment cycle must be completed within 4 calendar weeks.
2. **Technology Lock:** Architecture must strictly use the approved stack (React, Vite, Tailwind, Express, Node.js, MongoDB Atlas).
3. **Stateless Authentication:** Server memory must not maintain sessions; all requests must carry standard bearer JWTs.
4. **Data Isolation:** Zero cross-student data leakage; multi-tenant isolation enforced at the API route layer.
5. **Regulatory Standard:** Attendance criteria (75% threshold) and grading calculations must adhere to official AKTU guidelines.

#### 2.5 Assumptions and Dependencies
- Stable Internet connectivity is available at the client side.
- Institutional administrators are responsible for accurately initializing departments, courses, and subject lists before student enrollment begins.
- Email addresses and university Roll Numbers are globally unique across the institution.

---

### 3. External Interface Requirements

#### 3.1 User Interfaces
- **Design Philosophy:** Clean, distraction-free, professional SaaS aesthetic (inspired by Tailwind UI / Shadcn UI).
- **Visual Typography:** Inter font family with strict typographic scale (Display, H1, H2, H3, Body, Caption).
- **Color Palette:**
  - *Primary:* Deep Indigo / Navy (`#4338CA` / `#1E1B4B`) symbolizing academic authority.
  - *Secondary / Accent:* Slate Neutral (`#64748B`) and Crisp Blue (`#2563EB`).
  - *Status Indicators:* Emerald (`#10B981` - Success / Pass / Present), Amber (`#F59E0B` - Warning / Borderline Attendance), Rose (`#EF4444` - Danger / Absent / Fail).
- **Feedback Mechanisms:** Instant visual feedback on interactions via toast notifications, loading skeletons, disabled button states during network flights, and inline Zod validation error labels.

#### 3.2 Hardware Interfaces
- No direct physical hardware interfacing is required for this phase. Attendance is marked via browser-based UI rather than proprietary biometric/RFID sensors.

#### 3.3 Software Interfaces
- **Database:** MongoDB Atlas via Mongoose ODM over Node.js TCP socket with SSL/TLS encryption.
- **REST Interface:** Standard HTTP/1.1 and HTTP/2 transport delivering and receiving `application/json` payloads.
- **Third-Party Libraries:** Axios for HTTP client operations, Zod for data contract enforcement, Recharts for dynamic SVG rendering.

#### 3.4 Communications Interfaces
- All client-to-server traffic must be encrypted using HTTPS / TLS 1.3.
- Standard HTTP status codes (200, 201, 400, 401, 403, 404, 409, 422, 500) must be utilized consistently across all API communications.

---

### 4. System Features & Behavioral Requirements

#### 4.1 Authentication & Session Management
- **Description:** System grants entry based on validated email/password credentials and issues a cryptographically signed JWT containing `userId`, `role`, and expiration timestamp.
- **Inputs:** Valid institutional email address, plaintext password.
- **Processing:** Server queries `User` collection, matches record, executes `bcrypt.compare()` against stored salted hash. If valid, generates JWT signed with 256-bit HMAC secret (valid for 24 hours).
- **Outputs:** HTTP 200 with JWT token, user profile metadata, and active role; or HTTP 401 with standard error message.

#### 4.2 Master Academic Data Management
- **Description:** Admin creates, reads, updates, and deletes Departments, Courses (Degree Programs), Semesters, and Subjects.
- **Integrity Rule:** Course must belong to a Department; Semester must belong to a Course; Subject must link to a Semester and Course. Deletion of parent entities must reject if child relationships exist (referential integrity).

#### 4.3 Student Enrollment & Faculty Allocation
- **Description:** Admin enrolls registered students into specific Courses and Semesters for an Academic Year; assigns Faculty members to teach specific Subjects and Sections.
- **Integrity Rule:** Compound uniqueness prevents duplicate active enrollments or assigning multiple primary faculty to the exact same subject-section in the same semester.

#### 4.4 Attendance Management Workflow
- **Description:** Authorized faculty opens date-wise roll-call sheet for assigned subject, toggles status (Present, Absent, Late, Excused), and commits record.
- **Integrity Rule:** System enforces compound uniqueness on `(studentId, subjectId, date, semesterId)` so duplicate entries cannot be submitted. Re-submitting updates the existing record.
- **Calculation Rule:** System dynamically calculates:
  $$\text{Attendance Percentage} = \left(\frac{\text{Classes Attended}}{\text{Total Classes Held}}\right) \times 100$$
  If attendance $< 75\%$, visual warning is flagged on student and faculty views.

#### 4.5 Internal Assessment & Result Management
- **Description:** Faculty enters continuous evaluation marks (Sessional 1, Sessional 2, Assignments). Admin or Examination Cell publishes end-semester results.
- **Calculation Rule:** System converts raw scores into AKTU Letter Grades (A+, A, B+, B, C, P, F) and calculates Semester Grade Point Average (SGPA) based on course credits:
  $$\text{SGPA} = \frac{\sum (\text{Subject Credits} \times \text{Grade Point})}{\sum \text{Subject Credits}}$$

---

### 5. Other Requirements & Operational Protocols
- **Audit Logging:** Every administrative mutation (creating users, changing marks, altering attendance) automatically records an entry in `AuditLogs` containing timestamp, actor ID, action category, target entity, and client IP address.
- **Fault Tolerance:** Server errors must return safe error messages without exposing backend stack traces or database schema internals to the client.
