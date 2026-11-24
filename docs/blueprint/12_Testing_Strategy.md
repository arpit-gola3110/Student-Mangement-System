# Student Management System (SMS)
## Document 12: Quality Assurance & Comprehensive Testing Strategy

---

### 1. Testing Philosophy & Verification Framework

To guarantee enterprise reliability, academic compliance with AKTU standards, and zero data leakage, testing is organized across **four distinct verification levels**:

1. **Unit Testing:** Validates pure business logic functions in isolation (e.g., AKTU grade point calculation, SGPA weighted averages, attendance percentage arithmetic, date normalization).
2. **API Integration Testing:** Exercises Express.js REST API routes end-to-end against a test MongoDB instance using tools like Supertest or Postman, verifying status codes, schema validation, and RBAC middleware barriers.
3. **Frontend Integration & Component Testing:** Tests React components, form submissions, Zod client-side validation, error banners, and role-based route redirects.
4. **End-to-End (E2E) & Deployment Sanity:** Validates complete end-to-end user workflows (e.g., Admin creates semester $\rightarrow$ Faculty marks attendance $\rightarrow$ Student inspects updated attendance percentage on dashboard) on production-like Vercel and Render deployments.

---

### 2. Concrete Test Case Matrix

The following test case matrix defines key operational test scenarios categorized by test ID, functional domain, scenario, test input, expected result, and priority level:
- **P0 (Critical / Blocker):** Must pass for basic system safety, data integrity, and compliance.
- **P1 (High):** Core academic operations and calculation accuracy.
- **P2 (Medium):** UI enhancements, filtering, sorting, and edge ergonomics.

| Test ID | Module / Domain | Test Scenario | Test Input / Action | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-AUTH-01** | Authentication | Valid credentials login | Valid email and password for active user | HTTP 200 OK, returns signed JWT with correct role and profile ID. | **P0** |
| **TC-AUTH-02** | Authentication | Invalid password login | Registered email with incorrect password | HTTP 401 Unauthorized, generic "Invalid credentials" error. | **P0** |
| **TC-AUTH-03** | Authentication | Expired or malformed JWT | HTTP request with corrupted Bearer token | HTTP 401 Unauthorized, token verification rejection. | **P0** |
| **TC-AUTH-04** | Authentication | Brute force throttling | 6 rapid login attempts with bad password | HTTP 429 Too Many Requests on the 6th attempt. | **P1** |
| **TC-RBAC-01** | RBAC Enforcement | Student accessing Admin route | Student token calls `POST /api/departments` | HTTP 403 Forbidden, request blocked before controller execution. | **P0** |
| **TC-RBAC-02** | RBAC Enforcement | Student cross-data access | Student A requests `GET /api/results/student/:idB` | HTTP 403 Forbidden, student isolation invariant enforced. | **P0** |
| **TC-RBAC-03** | RBAC Enforcement | Unauthorized Faculty marking | Faculty marks attendance for unassigned class | HTTP 403 Forbidden: "Not authorized for this subject/section". | **P0** |
| **TC-ACAD-01** | Academic Master | Create Department | Unique code `'CSE'`, Name `'Computer Science'` | HTTP 201 Created, department persisted in MongoDB. | **P1** |
| **TC-ACAD-02** | Academic Master | Duplicate Department Code | Attempt to create department with existing code | HTTP 409 Conflict: "Department code already exists". | **P1** |
| **TC-ACAD-03** | Academic Master | Referential Delete Block | Delete department containing active courses | HTTP 400 Bad Request, deletion aborted with dependency warning. | **P1** |
| **TC-ENRL-01** | Enrollment | Student Semester Enrollment | Valid student ID, course ID, semester ID | HTTP 201 Created, enrollment record generated. | **P1** |
| **TC-ENRL-02** | Enrollment | Duplicate Enrollment Block | Re-enroll same student into same term & year | HTTP 409 Conflict, compound index violation prevented. | **P0** |
| **TC-ATTD-01** | Attendance | Batch Attendance Submission | 50 students: 45 Present, 3 Absent, 2 Late | HTTP 200 OK, 50 attendance records created/updated. | **P0** |
| **TC-ATTD-02** | Attendance | Duplicate Attendance Update | Re-submit attendance for same date & subject | HTTP 200 OK, updates existing records; total count unchanged. | **P0** |
| **TC-ATTD-03** | Attendance | Future Date Block | Submit attendance with date = tomorrow | HTTP 400 Bad Request: "Attendance date cannot be in the future". | **P1** |
| **TC-ATTD-04** | Attendance | Calculation & 75% Alert | 15 attended out of 25 conducted classes | Percentage computes to 60.0%; triggers low-attendance warning. | **P0** |
| **TC-EXAM-01** | Assessment & Grade| Internal Marks Range Check | Enter marks = 55 for exam with max marks = 50 | HTTP 422 Unprocessable Entity: "Marks exceed max marks". | **P1** |
| **TC-EXAM-02** | Assessment & Grade| AKTU Grade Conversion | Raw score = 85% in 4-credit course | Awarded Grade `'A'`, Grade Point = 9, Weighted Points = 36. | **P0** |
| **TC-EXAM-03** | Assessment & Grade| SGPA Calculation | Multiple subjects with varying credits/grades | Correct weighted average calculated: $\text{SGPA} = \frac{\sum (C_i \times G_i)}{\sum C_i}$. | **P0** |
| **TC-RESP-01** | UI / Responsive | Mobile Viewport Navigation | Viewport resized to 375px width | Off-canvas mobile drawer opens; data tables scroll horizontally. | **P2** |
| **TC-DEPL-01** | Deployment Sanity | Production Health Check | `GET https://sms-api.onrender.com/health` | HTTP 200 OK: `{ "status": "UP", "database": "CONNECTED" }`. | **P0** |

---

### 3. Automated & Manual Testing Protocol

1. **Continuous Integration (CI) Checks:**
   - Pre-commit linting via ESLint and Prettier.
   - Automated schema validation checks running Zod test fixtures.
2. **Manual Regression Protocol:**
   - Execute the 21 test scenarios before each weekly academic demonstration.
   - Record actual screenshots of passing API tests and UI states to compile into Chapter 5 of the official AKTU BCS 554 project report.
