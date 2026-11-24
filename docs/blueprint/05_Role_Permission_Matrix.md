# Student Management System (SMS)
## Document 05: Role-Based Access Control (RBAC) & Permission Matrix

---

### 1. Introduction to the RBAC Architecture

The Student Management System implements a strict, multi-tiered **Role-Based Access Control (RBAC)** security architecture. System access, operational capabilities, data visibility, and API invocation rights are bounded by three canonical roles:
1. **`ADMIN` (System Administrator / Academic Registrar)**
2. **`FACULTY` (Academic Instructor / Professor)**
3. **`STUDENT` (Enrolled Undergraduate Scholar)**

Access control is enforced at two distinct boundaries:
1. **Client-Side Navigation Boundary (React Router):** UI guards prevent unauthorized page rendering, hiding navigational links and redirecting forbidden attempts to `/unauthorized` or `/login`.
2. **Server-Side REST API Boundary (Express Middleware):** The authoritative, unbypassable gatekeeper. Regardless of client-side manipulations, every protected API endpoint executes:
   - `authMiddleware.verifyToken`: Validates cryptographic signature and expiration of the JWT.
   - `rbacMiddleware.requireRoles([...])`: Verifies that the authenticated user possesses the authorized role.
   - `resourceGuardMiddleware`: Enforces domain-level data tenancy (e.g., verifying that a student can only query records matching their own `studentId`, or that a faculty member is assigned to the specific subject/section being altered).

---

### 2. Comprehensive Role Permission Matrix

The following matrix delineates operational permissions across all functional system domains. 
- **C:** Create / Add
- **R:** Read / View
- **U:** Update / Edit
- **D:** Delete / Deactivate
- **A:** All Records (System-wide)
- **O:** Own Records Only (Self-service scope)
- **S:** Scoped (Restricted to assigned subjects/courses/sections)
- **X:** Forbidden / No Access

| Domain / Entity | Operation | ADMIN | FACULTY | STUDENT | Notes & Business Constraints |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Authentication & Profile** | Login / Logout | Yes | Yes | Yes | All roles authenticate via `/api/auth/login`. |
| | View Own Profile | R (O) | R (O) | R (O) | Users inspect their authenticated account details. |
| | Change Own Password | U (O) | U (O) | U (O) | Requires verification of existing password. |
| | Reset Any User Password | U (A) | X | X | Admin administrative override capability. |
| **User Administration** | Create User Accounts | C (A) | X | X | Admin provisions faculty and student accounts. |
| | List All Users | R (A) | X | X | Filterable by role, department, status. |
| | Update User Accounts | U (A) | X | X | Admin can modify user status (Active/Suspended). |
| | Delete User Accounts | D (A) | X | X | Soft-delete / deactivation pattern preferred. |
| **Academic Master Data** | Departments CRUD | C R U D | R (A) | R (A) | Admin owns; Faculty and Students have read access. |
| | Courses (Programs) CRUD | C R U D | R (A) | R (A) | Admin owns; Faculty and Students read programs. |
| | Semesters CRUD | C R U D | R (A) | R (A) | Admin manages active semester states. |
| | Subjects / Syllabus CRUD | C R U D | R (A) | R (A) | Admin configures subject codes, credits, and syllabus. |
| **Enrollment & Allocation**| Enroll Students in Semester| C R U D | R (S) | R (O) | Admin enrolls; Faculty views enrolled; Student views own. |
| | Assign Faculty to Subjects | C R U D | R (S) | X | Admin allocates faculty to subjects & sections. |
| | View Assigned Subjects | R (A) | R (S) | R (O) | Faculty views teaching load; Student views timetable. |
| **Attendance Management** | Take / Submit Attendance | C (A) | C (S) | X | Faculty marks for assigned subjects; Admin can override. |
| | Edit Attendance (Within Window) | U (A) | U (S) | X | Faculty edits within 48-hour window; Admin anytime. |
| | View Attendance Records | R (A) | R (S) | R (O) | Student views personal attendance only. |
| | Delete Attendance Batch | D (A) | X | X | Destructive action restricted exclusively to Admin. |
| | Export Attendance Reports | Yes | Yes (S)| X | CSV/PDF generation for departmental filings. |
| **Internal Assessment (CIA)**| Create Assessment Scheme | C (A) | C (S) | X | Define Sessional 1, Sessional 2, Quizzes. |
| | Enter Student CIA Marks | C U (A) | C U (S)| X | Faculty inputs marks for assigned classes only. |
| | Lock / Finalize CIA Marks| U (A) | U (S) | X | Prevents further edits once submitted to exam cell. |
| | View CIA Marks | R (A) | R (S) | R (O) | Student views personal internal assessment marks. |
| **Examinations & Results** | Schedule Semester Exams | C R U D | R (A) | R (A) | Admin schedules exam dates and venues. |
| | Publish Semester Results | C U (A) | X | X | Exam cell / Admin finalizes and publishes results. |
| | View Student Result Tabulation| R (A) | R (S) | X | Master tabulation sheet restricted to staff. |
| | View Individual Scorecard | R (A) | R (S) | R (O) | Student views own semester grade sheet and SGPA. |
| **Announcements** | Post System-Wide Notice | C R U D | X | X | Admin posts to all college stakeholders. |
| | Post Department Notice | C R U D | C R (S)| X | Faculty can post notices to their assigned students. |
| | View Notices | R (A) | R (A) | R (A) | Filtered based on targeted audience. |
| **Reports & Analytics** | Executive Analytics KPI | R (A) | X | X | Institution-wide metrics, defaulter ratios. |
| | Class Performance Analytics | R (A) | R (S) | X | Faculty inspects assigned subject performance. |
| | Personal Academic Progress | X | X | R (O) | Student charts own attendance & grade trends. |
| **Audit Logs** | View System Audit Logs | R (A) | X | X | Admin reviews chronological system mutation trail. |

---

### 3. Server-Side Enforcement Rules & Guard Algorithms

To prevent privilege escalation and unauthorized horizontal access (e.g., Student A reading Student B's grades) or vertical access (e.g., Faculty modifying master departments), the backend implements the following programmatic enforcement chain:

```
[Incoming HTTP Request with Header: "Authorization: Bearer <JWT>"]
                             │
                             ▼
              ┌──────────────────────────────┐
              │     authMiddleware.verify    │
              └──────────────┬───────────────┘
                             │  Valid Token?
               ┌─────────────┴─────────────┐
               ▼ NO                        ▼ YES
       [401 Unauthorized]       Attach `req.user` = { id, role, profileId }
                                           │
                                           ▼
                              ┌──────────────────────────────┐
                              │     rbacMiddleware.hasRole   │
                              └──────────────┬───────────────┘
                                             │  Role in Allowed List?
                               ┌─────────────┴─────────────┐
                               ▼ NO                        ▼ YES
                       [403 Forbidden]           Pass to Controller
                                                           │
                                                           ▼
                                              ┌──────────────────────────────┐
                                              │    Resource Ownership Check  │
                                              └──────────────┬───────────────┘
                                                             │  Is Scoped / Own Record?
                                               ┌─────────────┴─────────────┐
                                               ▼ NO                        ▼ YES
                                       [403 Forbidden]            Execute DB Operation
```

#### 3.1 Strict Data Isolation Invariants
1. **The Student Invariant:**
   - Any endpoint with route pattern `/api/students/me/*` or query parameters involving `studentId` enforces:
     $$\text{if } (\text{req.user.role} == \text{'STUDENT'} \land \text{req.user.studentId} \neq \text{requestedStudentId}) \implies \mathbf{HTTP\ 403\ Forbidden}$$
   - Students cannot pass a foreign `studentId` in the request body or URL parameter to inspect or mutate records.

2. **The Faculty Assignment Invariant:**
   - When a Faculty member attempts to record attendance (`POST /api/attendance`) or enter internal marks (`POST /api/assessments/marks`), the backend executes an authorization query:
     $$\exists\ \text{FacultyAssignment } \{\text{faculty: req.user.facultyId}, \text{subject: body.subjectId}, \text{section: body.section}, \text{status: 'Active'}\}$$
   - If no active assignment is found, the transaction is immediately rejected with `403 Forbidden: You are not authorized to evaluate this subject/section`.

3. **The Admin Invariant:**
   - Destructive operations (`DELETE /api/departments/:id`, `POST /api/examinations/publish`) verify that `req.user.role === 'ADMIN'`.

---

### 4. Privilege Escalation Prevention Checklist

- [x] **No Role Tampering in Client Payloads:** Role is never accepted from client form bodies during profile updates; role is strictly derived from the verified JWT claims signed by the server's secret key.
- [x] **Zero Reliance on Client Route Guards Alone:** Hiding a button in React or redirecting in React Router is treated solely as a UX convenience. Every underlying API endpoint carries independent server-side middleware verification.
- [x] **Token Blacklisting & Revocation:** In the event of account suspension, the user's `isActive` flag in MongoDB is checked during critical queries, revoking access immediately even if the JWT has not reached its 24-hour expiration.
