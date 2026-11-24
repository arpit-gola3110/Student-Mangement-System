# Student Management System (SMS)
## Document 08: RESTful API Architecture & Endpoint Specification

---

### 1. API Design Standards & Protocol Conventions

The backend REST API adheres to modern architectural principles:
- **Stateless Communication:** No server-side session cookies; all requests authenticate via `Authorization: Bearer <JWT>`.
- **JSON Standard:** Payloads and responses use standard `application/json; charset=utf-8`.
- **Idempotency:** `GET`, `PUT`, and `DELETE` requests are inherently idempotent; `POST` creates new resources.
- **Unified Response Envelope:** Every response adheres strictly to the following contracts:

#### 1.1 Success Response Envelope
```json
{
  "success": true,
  "message": "Resource retrieved successfully",
  "data": {},
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 25,
      "totalRecords": 142,
      "totalPages": 6
    }
  }
}
```

#### 1.2 Error Response Envelope
```json
{
  "success": false,
  "message": "Validation failed on submitted payload",
  "errors": [
    {
      "field": "rollNumber",
      "message": "Roll number must be exactly 13 digits for AKTU format"
    }
  ],
  "statusCode": 422
}
```

#### 1.3 Standard HTTP Status Codes
- `200 OK`: Successful read or update.
- `201 Created`: Successful resource creation.
- `400 Bad Request`: Malformed JSON or business logic rejection.
- `401 Unauthorized`: Missing, expired, or cryptographically invalid JWT.
- `403 Forbidden`: Authenticated, but user role lacks authorization for this resource.
- `404 Not Found`: Resource ID does not exist in MongoDB.
- `409 Conflict`: Unique constraint violation (e.g., duplicate roll number or attendance entry).
- `422 Unprocessable Entity`: Schema validation error (Zod/express-validator).
- `500 Internal Server Error`: Unhandled server exception (logged, safe error message).

---

### 2. Complete Module-Wise Endpoint Specification

#### 2.1 Authentication & Profile Endpoints (`/api/auth`)

| Method | Endpoint URL | Purpose | Required Role | Request Body / Params | Expected 200/201 Response Data | Errors |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate user & issue JWT | Public | `{ "email": "...", "password": "..." }` | `{ "token": "...", "user": { "id", "email", "role", "profile" } }` | 400, 401 |
| `GET` | `/api/auth/me` | Fetch active user session context | Any Authed | None (Bearer Token) | `{ "user": { "id", "email", "role", "profile" } }` | 401 |
| `POST` | `/api/auth/change-password` | Update personal account password | Any Authed | `{ "currentPassword": "...", "newPassword": "..." }` | `{ "message": "Password updated successfully" }` | 400, 401 |
| `POST` | `/api/auth/logout` | Client session termination | Any Authed | None | `{ "message": "Logged out successfully" }` | 401 |

#### 2.2 Department Endpoints (`/api/departments`)

| Method | Endpoint URL | Purpose | Required Role | Request Body / Params | Expected 200/201 Response Data | Errors |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/departments` | List all departments | Authed | `?search=...` | `[ { "_id", "code", "name", "headOfDepartment" } ]` | 401 |
| `POST` | `/api/departments` | Create new department | `ADMIN` | `{ "code": "CSE", "name": "...", "description": "..." }` | `{ "department": { ... } }` | 400, 403, 409 |
| `GET` | `/api/departments/:id` | Fetch single department detail | Authed | Params: `id` | `{ "department": { ... } }` | 401, 404 |
| `PUT` | `/api/departments/:id` | Update department details | `ADMIN` | `{ "name": "...", "headOfDepartment": "..." }` | `{ "department": { ... } }` | 400, 403, 404 |
| `DELETE`| `/api/departments/:id` | Remove department (if empty) | `ADMIN` | Params: `id` | `{ "message": "Department deleted" }` | 400, 403, 404 |

#### 2.3 Course & Degree Endpoints (`/api/courses`)

| Method | Endpoint URL | Purpose | Required Role | Request Body / Params | Expected 200/201 Response Data | Errors |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/courses` | List degree courses | Authed | `?department=...` | `[ { "_id", "code", "name", "totalSemesters" } ]` | 401 |
| `POST` | `/api/courses` | Create new degree program | `ADMIN` | `{ "code", "name", "department", "durationYears", "totalSemesters" }` | `{ "course": { ... } }` | 400, 403, 409 |
| `GET` | `/api/courses/:id` | Fetch course details | Authed | Params: `id` | `{ "course": { ... } }` | 401, 404 |
| `PUT` | `/api/courses/:id` | Update degree course | `ADMIN` | `{ "name", "totalSemesters" }` | `{ "course": { ... } }` | 400, 403, 404 |
| `DELETE`| `/api/courses/:id` | Delete course | `ADMIN` | Params: `id` | `{ "message": "Course deleted" }` | 400, 403, 404 |

#### 2.4 Semester Endpoints (`/api/semesters`)

| Method | Endpoint URL | Purpose | Required Role | Request Body / Params | Expected 200/201 Response Data | Errors |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/semesters` | List semesters | Authed | `?course=...&academicYear=...` | `[ { "_id", "course", "semesterNumber", "academicYear", "status" } ]` | 401 |
| `POST` | `/api/semesters` | Create academic term | `ADMIN` | `{ "course", "semesterNumber", "academicYear", "startDate", "endDate" }` | `{ "semester": { ... } }` | 400, 403, 409 |
| `PUT` | `/api/semesters/:id` | Update semester status | `ADMIN` | `{ "status": "ACTIVE" | "COMPLETED" }` | `{ "semester": { ... } }` | 400, 403, 404 |

#### 2.5 Subject Endpoints (`/api/subjects`)

| Method | Endpoint URL | Purpose | Required Role | Request Body / Params | Expected 200/201 Response Data | Errors |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/subjects` | List subjects | Authed | `?semester=...&course=...` | `[ { "_id", "code", "name", "credits", "type" } ]` | 401 |
| `POST` | `/api/subjects` | Create subject syllabus | `ADMIN` | `{ "code", "name", "course", "semester", "credits", "type" }` | `{ "subject": { ... } }` | 400, 403, 409 |
| `GET` | `/api/subjects/:id` | Fetch single subject | Authed | Params: `id` | `{ "subject": { ... } }` | 401, 404 |
| `PUT` | `/api/subjects/:id` | Update subject details | `ADMIN` | `{ "name", "credits", "type" }` | `{ "subject": { ... } }` | 400, 403, 404 |
| `DELETE`| `/api/subjects/:id` | Delete subject | `ADMIN` | Params: `id` | `{ "message": "Subject removed" }` | 400, 403, 404 |

#### 2.6 Student Management Endpoints (`/api/students`)

| Method | Endpoint URL | Purpose | Required Role | Request Body / Params | Expected 200/201 Response Data | Errors |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/students` | Search & paginate students | `ADMIN`, `FACULTY` | `?page=1&limit=25&search=...&dept=...` | `{ "students": [ ... ], "pagination": { ... } }` | 401, 403 |
| `POST` | `/api/students` | Register student & user | `ADMIN` | `{ "rollNumber", "email", "password", "firstName", "lastName", "department", ... }` | `{ "student": { ... }, "userId": "..." }` | 400, 403, 409 |
| `GET` | `/api/students/:id` | Get student profile | Authed (Scoped) | Params: `id` | `{ "student": { ... } }` | 401, 403, 404 |
| `PUT` | `/api/students/:id` | Update student profile | `ADMIN` (or Self) | `{ "contactNumber", "address", "currentSemester", "status" }` | `{ "student": { ... } }` | 400, 403, 404 |
| `DELETE`| `/api/students/:id` | Deactivate/delete student | `ADMIN` | Params: `id` | `{ "message": "Student deactivated" }` | 400, 403, 404 |

#### 2.7 Faculty Management Endpoints (`/api/faculty`)

| Method | Endpoint URL | Purpose | Required Role | Request Body / Params | Expected 200/201 Response Data | Errors |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/faculty` | List faculty members | Authed | `?dept=...&search=...` | `{ "faculty": [ ... ] }` | 401 |
| `POST` | `/api/faculty` | Provision faculty member | `ADMIN` | `{ "employeeId", "email", "password", "firstName", "lastName", "department", "designation" }` | `{ "faculty": { ... } }` | 400, 403, 409 |
| `GET` | `/api/faculty/:id` | Fetch faculty profile | Authed | Params: `id` | `{ "faculty": { ... } }` | 401, 404 |
| `PUT` | `/api/faculty/:id` | Update faculty details | `ADMIN` (or Self) | `{ "designation", "contactNumber", "qualification" }` | `{ "faculty": { ... } }` | 400, 403, 404 |

#### 2.8 Student Enrollment Endpoints (`/api/enrollments`)

| Method | Endpoint URL | Purpose | Required Role | Request Body / Params | Expected 200/201 Response Data | Errors |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/enrollments` | List enrollments | `ADMIN`, `FACULTY` | `?semester=...&section=...` | `{ "enrollments": [ ... ] }` | 401, 403 |
| `POST` | `/api/enrollments` | Enroll student in semester | `ADMIN` | `{ "student", "course", "semester", "academicYear", "section" }` | `{ "enrollment": { ... } }` | 400, 403, 409 |
| `POST` | `/api/enrollments/bulk` | Bulk enroll cohort | `ADMIN` | `{ "studentIds": [ ... ], "semester", "course", "section", "academicYear" }` | `{ "enrolledCount": 60 }` | 400, 403 |

#### 2.9 Faculty Subject Assignment Endpoints (`/api/faculty-assignments`)

| Method | Endpoint URL | Purpose | Required Role | Request Body / Params | Expected 200/201 Response Data | Errors |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/faculty-assignments`| List subject allocations | Authed | `?faculty=...&semester=...` | `[ { "_id", "faculty", "subject", "section" } ]` | 401 |
| `POST` | `/api/faculty-assignments`| Allocate faculty to class | `ADMIN` | `{ "faculty", "subject", "semester", "section", "academicYear" }` | `{ "assignment": { ... } }` | 400, 403, 409 |
| `DELETE`| `/api/faculty-assignments/:id`| Revoke allocation | `ADMIN` | Params: `id` | `{ "message": "Assignment revoked" }` | 400, 403, 404 |

#### 2.10 Attendance Endpoints (`/api/attendance`)

| Method | Endpoint URL | Purpose | Required Role | Request Body / Params | Expected 200/201 Response Data | Errors |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/attendance` | Submit batch roll-call | `FACULTY`, `ADMIN` | `{ "subjectId", "semesterId", "date": "YYYY-MM-DD", "records": [ { "studentId", "status" } ] }` | `{ "submittedCount": 55, "message": "Attendance saved" }` | 400, 403 |
| `GET` | `/api/attendance/sheet` | Fetch attendance sheet for class | `FACULTY`, `ADMIN` | `?subjectId=...&date=...&section=...` | `{ "records": [ { "student", "status" } ] }` | 400, 403 |
| `GET` | `/api/attendance/student/:id`| Student attendance record | Authed (Scoped) | Params: `id`, `?semester=...` | `{ "summary": { "totalClasses", "attended", "percentage" }, "details": [ ... ] }` | 401, 403, 404 |
| `GET` | `/api/attendance/defaulters` | List students with $<75\%$ att | `ADMIN`, `FACULTY` | `?subjectId=...&semesterId=...` | `[ { "student", "percentage", "shortageCount" } ]` | 401, 403 |

#### 2.11 Examination Endpoints (`/api/examinations`)

| Method | Endpoint URL | Purpose | Required Role | Request Body / Params | Expected 200/201 Response Data | Errors |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/examinations` | List exams | Authed | `?semester=...&status=...` | `[ { "_id", "title", "examType", "startDate", "endDate" } ]` | 401 |
| `POST` | `/api/examinations` | Create new exam | `ADMIN` | `{ "title", "examType", "semester", "academicYear", "startDate", "endDate" }` | `{ "examination": { ... } }` | 400, 403 |
| `PUT` | `/api/examinations/:id`| Update exam status | `ADMIN` | `{ "status": "PUBLISHED" }` | `{ "examination": { ... } }` | 400, 403, 404 |

#### 2.12 Results & Assessment Endpoints (`/api/results`)

| Method | Endpoint URL | Purpose | Required Role | Request Body / Params | Expected 200/201 Response Data | Errors |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/results/marks` | Batch submit marks | `FACULTY`, `ADMIN` | `{ "examinationId", "subjectId", "records": [ { "studentId", "internalMarks", "externalMarks" } ] }` | `{ "processedCount": 55 }` | 400, 403 |
| `GET` | `/api/results/student/:id`| Get student grade transcript| Authed (Scoped) | Params: `id`, `?semesterId=...` | `{ "semester": "...", "sgpa": 8.42, "results": [ { "subject", "totalMarks", "grade", "gradePoints" } ] }` | 401, 403, 404 |
| `GET` | `/api/results/class-summary`| Class result tabulation | `FACULTY`, `ADMIN` | `?examinationId=...&subjectId=...` | `{ "averageScore", "highestScore", "passPercentage", "results": [ ... ] }` | 401, 403 |

#### 2.13 Dashboard & Analytics Endpoints (`/api/dashboards`)

| Method | Endpoint URL | Purpose | Required Role | Request Body / Params | Expected 200/201 Response Data | Errors |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboards/admin` | Admin KPI stats & charts | `ADMIN` | None | `{ "stats": { "totalStudents", "totalFaculty", "avgAttendance" }, "charts": { ... } }` | 401, 403 |
| `GET` | `/api/dashboards/faculty` | Faculty overview & schedule| `FACULTY` | None | `{ "assignedSubjects": [ ... ], "todayClasses": [ ... ], "pendingAttendance": 1 }` | 401, 403 |
| `GET` | `/api/dashboards/student` | Student academic overview | `STUDENT` | None | `{ "attendancePercentage": 82.5, "registeredSubjects": [ ... ], "recentNotices": [ ... ] }` | 401, 403 |

#### 2.14 Announcements Endpoints (`/api/announcements`)

| Method | Endpoint URL | Purpose | Required Role | Request Body / Params | Expected 200/201 Response Data | Errors |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/announcements` | List audience-matched notices| Authed | `?limit=10` | `[ { "_id", "title", "content", "author", "createdAt", "isPinned" } ]` | 401 |
| `POST` | `/api/announcements` | Publish new notice | `ADMIN`, `FACULTY` | `{ "title", "content", "targetAudience", "targetDepartment", "isPinned" }` | `{ "announcement": { ... } }` | 400, 403 |
| `DELETE`| `/api/announcements/:id`| Remove notice | `ADMIN` | Params: `id` | `{ "message": "Notice deleted" }` | 401, 403, 404 |

#### 2.15 Audit Log Endpoints (`/api/audit-logs`)

| Method | Endpoint URL | Purpose | Required Role | Request Body / Params | Expected 200/201 Response Data | Errors |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/audit-logs` | Query system audit trail | `ADMIN` | `?page=1&limit=50&action=...&entity=...` | `{ "logs": [ ... ], "pagination": { ... } }` | 401, 403 |
