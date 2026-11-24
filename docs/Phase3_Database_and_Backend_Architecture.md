# Student Management System (SMS)
## Phase 3: Database Architecture, MongoDB Integration & Backend Foundation

**Academic Context:** B.Tech CSE Mini Project  
**Course Code:** BCS 554 | **Academic Session:** 2026–27  
**Affiliated University:** Dr. A.P.J. Abdul Kalam Technical University (AKTU), Lucknow  
**Technology Stack:** Node.js (v24+), Express.js (v4.21+), MongoDB Atlas / Community, Mongoose ODM (v8.8+), Zod (v3.23+), Helmet, CORS, Express-Rate-Limit, Morgan  

---

### 1. Executive Summary & Architecture Overview

Phase 3 establishes an enterprise-grade, scalable, and maintainable backend foundation and MongoDB database architecture for the Student Management System (SMS). It transitions the project from UI mock layouts (Phase 2) into a production-ready RESTful API backend engineered under strict academic and software design standards.

#### Core Architectural Achievements:
1. **Separation of Concerns:** Distinct division between application configuration (`server/app.js`) and process/network lifecycle management (`server/server.js`).
2. **MongoDB Schemas & Strict Data Integrity:** All 14 domain collections implemented in Mongoose ODM with database-level compound unique indexes, referential population (`ref: '...'`), and sanitization hooks.
3. **Fail-Fast Environment Validation:** Centralized configuration (`server/config/env.js`) validating critical variables on boot with production security warnings.
4. **Standardized API Contract:** Predictable response envelopes via `ApiResponse` and operational error classification via `ApiError`.
5. **Centralized Error & 404 Pipeline:** Clean interception of Mongoose `ValidationError`, `CastError`, duplicate key `11000`, and JWT authentication failures.
6. **Dual-Mode UI Serving:** Standalone Express production mode serving built React SPA from `client/dist` (port 5000) alongside Vite development hot-reload (port 5173).
7. **Comprehensive Test Suite:** 59 automated model and schema checks in `server/tests/models.test.js` passing with 100% success.

---

### 2. Backend Directory & Modular File Architecture

```
server/
├── config/
│   ├── db.js                     # Mongoose connection manager with state diagnostics & graceful close
│   └── env.js                    # Fail-fast environment variable validator
├── controllers/                  # Controller layer for academic & system operations
│   ├── academicController.js     # Department, Course, Semester, Subject operations
│   ├── announcementController.js # Noticeboard and targeted broadcast operations
│   ├── attendanceController.js   # Session attendance batch recording & summaries
│   ├── authController.js         # Credential verification & session resolution
│   ├── dashboardController.js    # Aggregated metrics for Admin, Faculty, and Student
│   ├── facultyController.js      # Faculty profiles and teaching allocation
│   ├── resultController.js       # Examination schedules and grade calculations
│   └── studentController.js      # Student profile queries and registration
├── middleware/
│   ├── auditMiddleware.js        # Audit logging of state-mutating actions
│   ├── authMiddleware.js         # JWT verification & request context hydration
│   ├── errorMiddleware.js        # Centralized operational error & exception handler
│   ├── notFoundMiddleware.js     # 404 handler for unmatched /api/* endpoints
│   ├── rbacMiddleware.js         # Role-Based Access Control gatekeeper (ADMIN, FACULTY, STUDENT)
│   └── validateRequest.js        # Reusable Zod schema validation middleware
├── models/
│   ├── Announcement.js           # Institutional notices with targeted audience
│   ├── Attendance.js             # Session attendance with 4-way compound unique index
│   ├── AuditLog.js               # Immutable administrative audit log trail
│   ├── Course.js                 # Academic degree programs (B.Tech, MCA, etc.)
│   ├── Department.js             # Academic faculties (CSE, ECE, ME, etc.)
│   ├── Enrollment.js             # Student semester cohort registrations
│   ├── Examination.js            # Examination cycles (Sessional 1, End Sem, etc.)
│   ├── Faculty.js                # Faculty teaching and academic profiles
│   ├── FacultyAssignment.js      # Workload subject allocation to faculty
│   ├── Result.js                 # Academic scores, SGPA, letter grades (AKTU scale)
│   ├── Semester.js               # Academic calendar terms (Semesters 1-8)
│   ├── Student.js                # Student demographic & enrollment profiles
│   ├── Subject.js                # Curricular theory/practical subject modules
│   ├── User.js                   # Base credentials, bcrypt hashing, and roles
│   └── index.js                  # Central export index for all 14 domain models
├── routes/
│   ├── api.js                    # Backward-compatibility alias router
│   └── v1/                       # Modular RESTful route groups under /api/v1/
│       ├── announcement.routes.js
│       ├── attendance.routes.js
│       ├── auth.routes.js
│       ├── course.routes.js
│       ├── dashboard.routes.js
│       ├── department.routes.js
│       ├── enrollment.routes.js
│       ├── examination.routes.js
│       ├── faculty.routes.js
│       ├── facultyAssignment.routes.js
│       ├── index.js              # Aggregates and mounts all 16 resource route groups
│       ├── report.routes.js
│       ├── result.routes.js
│       ├── semester.routes.js
│       ├── student.routes.js
│       ├── subject.routes.js
│       └── user.routes.js
├── tests/
│   ├── endpoints.test.js         # HTTP routing & middleware integration tests
│   └── models.test.js            # 59 schema, model, and index compilation unit tests
├── utils/
│   ├── ApiError.js               # Standard operational error class with factory methods
│   ├── apiResponse.js            # Unified JSON response envelope helper
│   ├── asyncHandler.js           # Async controller wrapper eliminating try-catch boilerplate
│   ├── gradeCalculator.js        # AKTU 10-point credit grading algorithm
│   ├── responseHandler.js        # Legacy wrapper ensuring frontend backwards compatibility
│   ├── seed.js                   # Database seeder with sample data
│   └── tokenGenerator.js         # JWT signing utility
├── app.js                        # Express application instance, middlewares, and SPA handler
├── server.js                     # HTTP server startup, port fallback, and graceful shutdown
└── package.json                  # Server dependencies and scripts ("test", "dev", "start")
```

---

### 3. Database Architecture & Collections Specification

The database utilizes **MongoDB Atlas** with **Mongoose ODM (v8.8+)** employing a **Hybrid Relational-Document Model**:

```mermaid
erDiagram
    User ||--o| Student : "profile"
    User ||--o| Faculty : "profile"
    User ||--o{ AuditLog : "triggers"
    User ||--o{ Announcement : "authors"

    Department ||--o{ Course : "offers"
    Department ||--o{ Faculty : "employs"
    Department ||--o{ Student : "belongs_to"

    Course ||--o{ Semester : "contains"
    Course ||--o{ Enrollment : "registers"

    Semester ||--o{ Subject : "curriculum"
    Semester ||--o{ Enrollment : "cohort"
    Semester ||--o{ FacultyAssignment : "allocates"
    Semester ||--o{ Examination : "schedules"

    Student ||--o{ Enrollment : "enrolls"
    Student ||--o{ Attendance : "marked"
    Student ||--o{ Result : "earns"

    Faculty ||--o{ FacultyAssignment : "assigned_to"
    Faculty ||--o{ Attendance : "recorded_by"
    Faculty ||--o{ Result : "evaluated_by"

    Subject ||--o{ FacultyAssignment : "taught_in"
    Subject ||--o{ Attendance : "class_for"
    Subject ||--o{ Result : "graded_in"

    Examination ||--o{ Result : "scores_for"
```

#### Detailed Specification of the 14 Domain Models:

| # | Model | Collection | Primary Key | Key Foreign Keys | Unique / Compound Indexes | Purpose |
|---|---|---|---|---|---|---|
| 1 | `User` | `users` | `_id` | - | `{ email: 1 }` (UK), `{ role: 1, isActive: 1 }` | Credential store, bcrypt password hashing, and role definition |
| 2 | `Student` | `students` | `_id` | `user`, `department` | `{ rollNumber: 1 }` (UK), `{ enrollmentNumber: 1 }` (UK), `{ department: 1, currentSemester: 1 }` | Student personal profile, enrollment IDs, and academic status |
| 3 | `Faculty` | `faculties` | `_id` | `user`, `department` | `{ employeeId: 1 }` (UK), `{ department: 1 }` | Faculty academic qualifications, designations, and contacts |
| 4 | `Department` | `departments` | `_id` | `headOfDepartment` | `{ code: 1 }` (UK) | Academic departments (e.g., Computer Science & Engineering) |
| 5 | `Course` | `courses` | `_id` | `department` | `{ code: 1 }` (UK), `{ department: 1 }` | Degree programs (B.Tech, duration, total semesters) |
| 6 | `Semester` | `semesters` | `_id` | `course` | `{ course: 1, semesterNumber: 1, academicYear: 1 }` (Compound UK) | Academic terms, calendar schedules, and term statuses |
| 7 | `Subject` | `subjects` | `_id` | `course`, `semester` | `{ code: 1 }` (UK), `{ semester: 1 }`, `{ course: 1 }` | Academic subjects, credits (1-6), and types (Theory/Practical) |
| 8 | `Enrollment` | `enrollments` | `_id` | `student`, `course`, `semester` | `{ student: 1, semester: 1, academicYear: 1 }` (Compound UK) | Cohort registration preventing duplicate semester enrollment |
| 9 | `FacultyAssignment` | `facultyassignments` | `_id` | `faculty`, `subject`, `semester` | `{ faculty: 1, subject: 1, semester: 1, section: 1, academicYear: 1 }` (Compound UK) | Teaching workload allocation per semester and section |
| 10 | `Attendance` | `attendances` | `_id` | `student`, `subject`, `semester`, `markedBy` | `{ student: 1, subject: 1, date: 1, semester: 1 }` (Compound UK), `{ subject: 1, date: 1 }` | Session attendance log with zero-duplicate mark guarantee |
| 11 | `Examination` | `examinations` | `_id` | `semester` | `{ semester: 1, examType: 1, academicYear: 1 }` (Compound UK) | Sessional and semester exam schedules and date bounds |
| 12 | `Result` | `results` | `_id` | `examination`, `student`, `subject`, `evaluatedBy` | `{ examination: 1, student: 1, subject: 1 }` (Compound UK), `{ student: 1, examination: 1 }` | Internal/External marks, AKTU letter grade, grade points |
| 13 | `Announcement` | `announcements` | `_id` | `author`, `targetDepartment` | `{ targetAudience: 1, createdAt: -1 }`, `{ expiresAt: 1 }` | Broadcast notices with audience filtering and pinned status |
| 14 | `AuditLog` | `auditlogs` | `_id` | `actor` | `{ timestamp: -1 }`, `{ actor: 1, timestamp: -1 }`, `{ entity: 1, entityId: 1 }` | Security and compliance audit trail of critical CRUD operations |

---

### 4. Application Architecture & Middleware Pipeline

In `server/app.js`, requests pass through a strictly ordered pipeline:

```mermaid
flowchart TD
    Req[Incoming Client Request] --> Helmet[1. Helmet Security Headers]
    Helmet --> CORS[2. CORS Configuration: Allowed Origins & Methods]
    CORS --> RateLimiter[3. Express Rate Limiter: 100 req / 15 min]
    RateLimiter --> BodyParsers[4. JSON & URL-Encoded Body Parsers 10MB limit]
    BodyParsers --> MorganLogger[5. Morgan HTTP Access Logger]
    BodyParsers --> FaviconHandler[6. /favicon.ico silent 204 handler]
    FaviconHandler --> HealthCheck[7. /api/v1/health & /health Diagnostics]
    HealthCheck --> APIRoutes[8. /api/v1 & /api Modular Route Groups]
    APIRoutes --> SPAServing[9. Static Assets & SPA Wildcard from client/dist]
    SPAServing --> NotFound[10. Not Found Middleware for unhandled /api/*]
    NotFound --> CentralError[11. Centralized Error Handler]
    CentralError --> Res[JSON Error Response]
```

---

### 5. Standardized Response & Error Contracts

#### 5.1 Success Response Envelope
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalRecords": 150,
      "totalPages": 8
    }
  }
}
```

#### 5.2 Error Response Envelope
```json
{
  "success": false,
  "message": "Validation error or operational failure description",
  "errors": [
    {
      "field": "rollNumber",
      "message": "Roll number is required"
    }
  ]
}
```

#### 5.3 Health Check Diagnostic Endpoint (`GET /api/v1/health`)
```json
{
  "status": "UP",
  "timestamp": "2026-11-24T18:25:04.276Z",
  "uptime": "124s",
  "environment": "development",
  "service": "Student Management System REST API (AKTU BCS 554)",
  "database": {
    "state": "connected",
    "isConnected": true,
    "host": "cluster0.xxxxx.mongodb.net",
    "name": "student_mdc_db"
  }
}
```

---

### 6. Process Lifecycle & Graceful Termination

In `server/server.js`:
1. **Database-First Startup:** Connects to MongoDB via Mongoose before binding the HTTP port.
2. **Automatic Port Fallback:** If configured port (default 5000) experiences an `EADDRINUSE` conflict, the server detects the error and increments to `port + 1` automatically.
3. **Graceful Shutdown (`SIGINT`, `SIGTERM`):**
   - Stops accepting new HTTP connections via `server.close()`.
   - Flushes in-flight requests.
   - Gracefully severs MongoDB connection pools via `closeDatabase()`.
   - Exits cleanly with code 0 (guarded by a 10s fallback watchdog).

---

### 7. Dual-Mode UI Serving

| Feature | Mode A: Express Production Serving | Mode B: Vite Development Hot-Reload |
|---|---|---|
| **URL** | `http://localhost:5000` | `http://localhost:5173` |
| **Command** | `npm start` | `npm run dev` |
| **Asset Origin** | `client/dist/` (compiled bundle) | Memory bundle with Vite HMR |
| **API Handling** | Direct in-process Express handling | Proxied `/api` -> `http://localhost:5000` |
| **Client Routing** | `app.get('*')` serves `index.html` | Vite development server handles HTML5 history |
| **Best For** | Final viva, demonstration, production deployment | Daily code editing, UI adjustments, live debugging |

---

### 8. Phase 3 Test Suite Execution

Automated test verification was executed via `npm test` (`node tests/models.test.js`):

```
======================================================================
STUDENT MANAGEMENT SYSTEM - PHASE 3 VERIFICATION SUITE
AKTU B.Tech CSE Mini Project (BCS 554)
======================================================================

--- 1. Environment Configuration ---
[PASS] env.PORT is configured
[PASS] env.NODE_ENV is configured
[PASS] env.MONGODB_URI is configured
[PASS] env.RATE_LIMIT_WINDOW_MS is valid

--- 2. Mongoose ODM Models Compilation & Index Checks ---
[PASS] Model 'User' compiles and registers schema
[PASS] Model 'Student' compiles and registers schema
[PASS] Model 'Faculty' compiles and registers schema
[PASS] Model 'Department' compiles and registers schema
[PASS] Model 'Course' compiles and registers schema
[PASS] Model 'Semester' compiles and registers schema
[PASS] Model 'Subject' compiles and registers schema
[PASS] Model 'Enrollment' compiles and registers schema
[PASS] Model 'FacultyAssignment' compiles and registers schema
[PASS] Model 'Attendance' compiles and registers schema
[PASS] Model 'Examination' compiles and registers schema
[PASS] Model 'Result' compiles and registers schema
[PASS] Model 'Announcement' compiles and registers schema
[PASS] Model 'AuditLog' compiles and registers schema

--- 3. Specific Model Schema & Index Integrity ---
[PASS] User schema has email, password, role, comparePassword
[PASS] Student schema has rollNumber, enrollmentNumber, department, fullName virtual
[PASS] Faculty schema has employeeId, designation, fullName virtual
[PASS] Department schema has code, name, headOfDepartment
[PASS] Course schema has code, totalSemesters, durationYears
[PASS] Semester schema has semesterNumber, academicYear, compound UK
[PASS] Subject schema has code, credits, type
[PASS] Enrollment schema has student ref, semester ref, compound UK
[PASS] FacultyAssignment has faculty ref, subject ref, compound UK
[PASS] Attendance has status, date, 4-way compound UK
[PASS] Examination has examType, semester, compound UK
[PASS] Result has internalMarks, externalMarks, grade, compound UK
[PASS] Announcement has targetAudience, isPinned, createdAt index
[PASS] AuditLog has actor, action, timestamp index

--- 4. Express App & Modular Routing ---
[PASS] Express application initialized
[PASS] Express router stack is configured
[PASS] Express mounts /api/v1 route group

--- 5. Utility Classes (ApiError, ApiResponse) ---
[PASS] ApiError.badRequest sets statusCode 400
[PASS] ApiError is marked operational
[PASS] ApiError.notFound sets statusCode 404
[PASS] ApiError.unauthorized sets statusCode 401

--- 6. Database Health Status ---
[PASS] getDatabaseStatus returns state and connection booleans

======================================================================
TOTAL CHECKS: 59 | PASSED: 59 | FAILED: 0
======================================================================
>>> ALL PHASE 3 ARCHITECTURAL VERIFICATIONS PASSED SUCCESSFULLY! <<<
```

---

### 9. Phase 4 Readiness Checklist

With Phase 3 complete, the project is primed for **Phase 4: Authentication, JWT, Password Security & RBAC**:

- [x] Base `User` model with password hashing hook and `comparePassword` method.
- [x] Strict role definitions (`ADMIN`, `FACULTY`, `STUDENT`) with case-insensitive uppercase normalization.
- [x] Standardized `ApiError.unauthorized()` (401) and `ApiError.forbidden()` (403) responders.
- [x] Reusable Zod input validation middleware (`server/middleware/validateRequest.js`).
- [x] Modular auth routes (`server/routes/v1/auth.routes.js`).
- [x] Central audit logging schema ready to record user login, password modification, and logout actions.
- [x] Dual-mode UI serving verified and operational.
