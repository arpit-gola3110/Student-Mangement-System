# Student Management System (SMS)
## Document 01: Project Overview & Workspace Specification

---

### 1. Academic & Institutional Context
- **Institution:** Dr. A.P.J. Abdul Kalam Technical University (AKTU), Lucknow, Uttar Pradesh.
- **Degree Program:** Bachelor of Technology (B.Tech) in Computer Science & Engineering (CSE).
- **Course Code:** BCS 554 – Internship Assessment / Mini Project.
- **Academic Session:** 2026–2027.
- **Project Title:** Student Management System (SMS).
- **Project Nature:** Full-Stack Enterprise Web Application (MERN Stack).
- **Target Timeline:** 4-Week Rapid Academic Development Lifecycle.

---

### 2. Executive Summary
The **Student Management System (SMS)** is an enterprise-grade, web-based institutional management platform engineered to digitize, streamline, and centralize academic administration for higher educational institutions affiliated with AKTU. 

Traditional institutions often struggle with fragmented record-keeping—relying on manual registers, siloed spreadsheets, and disconnected notice boards. This archaic operational paradigm breeds data redundancy, computational errors in attendance and internal assessments, lack of real-time visibility for students and parents, and severe administrative latency.

The SMS addresses these fundamental bottlenecks by implementing a multi-tenant-ready, Role-Based Access Control (RBAC) architecture supporting three core institutional personas:
1. **Administrators:** Comprehensive governance over academic infrastructure (departments, courses, semesters, subjects), human resources (faculty, students), institutional assignments, and analytical oversight.
2. **Faculty Members:** Granular control over assigned academic domains, authorized subject-wise attendance logging, internal assessment evaluations, and section-specific announcements.
3. **Students:** Self-service academic portal offering real-time visibility into attendance percentages, subject-wise internal assessment performance, examination results, academic notifications, and personal profile management.

The system is designed with a strict client-server decoupling philosophy, utilizing high-performance RESTful APIs, declarative frontend state management, robust database indexing, and strict cryptographic security standards.

---

### 3. Prescribed Technology Stack

The project adheres strictly to the approved enterprise modern full-stack web development ecosystem:

#### 3.1 Frontend Architecture
| Technology | Version / Tooling | Architectural Purpose |
| :--- | :--- | :--- |
| **React.js** | v18.x (Functional Components + Hooks) | Component-driven, declarative user interface layer. |
| **Vite** | Latest | High-speed frontend build tooling, HMR, and optimized bundling. |
| **JavaScript** | ES6+ (ECMAScript 2022) | Modern client runtime syntax (async/await, destructuring, modules). |
| **Tailwind CSS** | v3.x | Utility-first CSS framework for responsive SaaS-style design system. |
| **React Router** | v6.x | Client-side declarative routing, protected routes, and RBAC guards. |
| **Axios** | Latest | Promise-based HTTP client with request/response interceptors. |
| **React Hook Form** | Latest | Performant, uncontrolled form management with zero unnecessary re-renders. |
| **Zod** | Latest | TypeScript-first schema declaration and runtime client validation. |
| **TanStack Query** | v5.x (React Query) | Server-state caching, automatic refetching, and query synchronization. |
| **Recharts** | Latest | Composable SVG-based charting library for academic analytics. |
| **Lucide React** | Latest | Consistent, clean iconographic design language. |

#### 3.2 Backend Architecture
| Technology | Tooling / Library | Architectural Purpose |
| :--- | :--- | :--- |
| **Node.js** | LTS (v20.x+) | Asynchronous, event-driven JavaScript server runtime. |
| **Express.js** | v4.x | Fast, unopinionated minimalist web framework for REST API routing. |
| **REST APIs** | JSON / HTTP 1.1 / HTTP 2 | Standardized stateless client-server communication endpoints. |
| **JWT** | `jsonwebtoken` | Stateless authentication tokens (access tokens) for session security. |
| **bcrypt** | `bcryptjs` (Cost factor 10–12) | Irreversible salted hashing of sensitive user credentials. |
| **Express Middleware** | Helmet, CORS, Rate-Limit, Morgan | Enterprise HTTP security headers, throttling, and request logging. |

#### 3.3 Database & ODM Layer
| Technology | Tooling / Configuration | Architectural Purpose |
| :--- | :--- | :--- |
| **MongoDB Atlas** | Cloud Replica Set (M0/Shared) | Document-oriented NoSQL database providing flexible JSON-like storage. |
| **Mongoose ODM** | v8.x | Schema validation, business logic middleware, population, and indexing. |

#### 3.4 Production Deployment Target
| Layer | Platform | Configuration & Justification |
| :--- | :--- | :--- |
| **Frontend Application** | **Vercel** | Edge-accelerated global CDN, automated CI/CD deployments from Git. |
| **Backend REST API** | **Render** | Managed container/Node.js web service with environment variables and health checks. |
| **Database Instance** | **MongoDB Atlas** | Managed cloud database with automatic failover, daily snapshots, and IP allowlists. |

---

### 4. Workspace Inspection & Proposed Directory Structure

#### 4.1 Workspace Inspection Findings
- **Inspection Timestamp:** November 2026.
- **Workspace Location:** `d:\Program\PROJECTS\student mdc`
- **Initial Workspace State:** Completely empty directory (0 files, 0 subdirectories).
- **Existing Code Status:** No pre-existing application code, configurations, or conflicting libraries.
- **Opportunity:** A clean-slate, professionally structured monorepo or separated client/server architecture can be established following enterprise standard conventions.

#### 4.2 Proposed Directory Architecture
To maintain clear separation of concerns, high maintainability, and seamless cloud deployments to Vercel and Render, the workspace is organized into a clean **two-tier root structure**:

```
student-management-system/
├── client/                               # Frontend React + Vite Application
│   ├── public/                           # Static assets, favicon, manifest
│   ├── src/
│   │   ├── assets/                       # Images, illustrations, logos
│   │   ├── components/                   # Reusable UI components
│   │   │   ├── common/                   # Buttons, Inputs, Modals, Badges, Tables
│   │   │   ├── feedback/                 # Loaders, Skeletons, Alert banners, EmptyStates
│   │   │   ├── layout/                   # Navbar, Sidebar, PageHeader, DashboardLayout
│   │   │   └── charts/                   # AttendanceChart, PerformanceBarChart
│   │   ├── context/                      # React Contexts (AuthContext, ThemeContext)
│   │   ├── hooks/                        # Custom React hooks (useAuth, usePagination, useDebounce)
│   │   ├── layouts/                      # App layouts (AdminLayout, FacultyLayout, StudentLayout)
│   │   ├── pages/                        # Page-level view components
│   │   │   ├── admin/                    # Admin dashboard and management screens
│   │   │   ├── faculty/                  # Faculty dashboard, attendance, grading screens
│   │   │   ├── student/                  # Student profile, attendance, results screens
│   │   │   ├── auth/                     # Login, Forgot Password, Reset Password
│   │   │   └── error/                    # 404, 403, 500 error pages
│   │   ├── routes/                       # React Router configuration & RBAC ProtectedRoute
│   │   ├── services/                     # Axios API client instances & endpoint call abstractions
│   │   ├── utils/                        # Utility functions, date formatters, validators
│   │   ├── validations/                  # Zod validation schemas for forms
│   │   ├── App.jsx                       # Root application component
│   │   ├── index.css                     # Tailwind CSS entry directives & global styles
│   │   └── main.jsx                      # Vite React entry point
│   ├── .env.example                      # Client environment variable template
│   ├── index.html                        # HTML5 template
│   ├── package.json                      # Frontend dependencies and scripts
│   ├── tailwind.config.js                # Tailwind design system configuration
│   └── vite.config.js                    # Vite bundler configuration
│
├── server/                               # Backend Node.js + Express REST API
│   ├── config/                           # Database connection & third-party configs
│   │   └── db.js                         # Mongoose MongoDB connection pooling logic
│   ├── controllers/                      # Request-response business handlers
│   │   ├── authController.js             # Authentication, token generation, profile
│   │   ├── adminController.js            # Admin system analytics & management
│   │   ├── studentController.js          # Student CRUD & academic lookups
│   │   ├── facultyController.js          # Faculty CRUD & subject assignment lookups
│   │   ├── departmentController.js       # Department management
│   │   ├── courseController.js           # Course/Degree management
│   │   ├── semesterController.js         # Semester management
│   │   ├── subjectController.js          # Subject/Course-unit management
│   │   ├── enrollmentController.js       # Student semester enrollment handlers
│   │   ├── facultyAssignmentController.js# Faculty-subject allocation handlers
│   │   ├── attendanceController.js       # Daily attendance logging & percentage logic
│   │   ├── examinationController.js      # Exam creation & scheduling
│   │   ├── assessmentController.js       # Sessional/Internal marks management
│   │   ├── resultController.js           # Semester result processing & tabulation
│   │   ├── announcementController.js     # Institutional broadcast notices
│   │   └── auditLogController.js         # Administrative audit trail handlers
│   ├── middleware/                       # Express interceptors & security filters
│   │   ├── authMiddleware.js             # JWT verification & token parsing
│   │   ├── rbacMiddleware.js             # Role-based permission verification
│   │   ├── errorMiddleware.js            # Global centralized error handler
│   │   ├── validationMiddleware.js       # Request schema validation interceptor
│   │   └── auditMiddleware.js            # Automatic audit logging for mutation endpoints
│   ├── models/                           # Mongoose data models & schemas
│   │   ├── User.js                       # Base user identity and credentials
│   │   ├── Student.js                    # Student profile & academic metadata
│   │   ├── Faculty.js                    # Faculty profile & departmental metadata
│   │   ├── Department.js                 # Academic departments (e.g., CSE, ECE)
│   │   ├── Course.js                     # Degree programs (e.g., B.Tech, M.Tech)
│   │   ├── Semester.js                   # Academic semesters (Sem 1 to Sem 8)
│   │   ├── Subject.js                    # Curricular subjects with credits & codes
│   │   ├── Enrollment.js                 # Student-to-Semester enrollment link
│   │   ├── FacultyAssignment.js          # Faculty-to-Subject allocation link
│   │   ├── Attendance.js                 # Session-wise student attendance records
│   │   ├── Examination.js                # Assessment schedules & types (Sessional/End-Sem)
│   │   ├── Result.js                     # Student exam scores, grades, and remarks
│   │   ├── Announcement.js               # Notice board announcements
│   │   └── AuditLog.js                   # Administrative action audit records
│   ├── routes/                           # Modular Express route definitions
│   │   ├── authRoutes.js
│   │   ├── studentRoutes.js
│   │   ├── facultyRoutes.js
│   │   ├── academicRoutes.js             # Dept, Course, Semester, Subject routes
│   │   ├── enrollmentRoutes.js
│   │   ├── attendanceRoutes.js
│   │   ├── examinationRoutes.js
│   │   ├── resultRoutes.js
│   │   ├── announcementRoutes.js
│   │   └── auditLogRoutes.js
│   ├── utils/                            # Helper utilities, logger, grade calculators
│   │   ├── gradeCalculator.js            # AKTU grading scale conversion algorithm
│   │   ├── tokenGenerator.js             # JWT signing helper
│   │   └── responseHandler.js            # Standardized API response formatters
│   ├── .env.example                      # Server environment variable template
│   ├── package.json                      # Backend dependencies and scripts
│   └── server.js                         # Express application entry point & listener
│
└── docs/                                 # Academic & Technical Documentation
    ├── blueprint/                        # Complete 14 Phase-1 Technical Blueprint Documents
    └── aktu-report/                      # AKTU BCS 554 Project Report Chapters & Figures
```

---

### 5. Architectural Quality Attributes & Design Principles
1. **Separation of Concerns:** Client UI handles rendering and validation feedback; Server handles business rules, transaction authorization, and data consistency.
2. **Stateless Scalability:** Authentication utilizes self-contained JSON Web Tokens; backend nodes do not maintain sticky sessions, enabling horizontal scaling on Render.
3. **Data Integrity First:** Unique compound indexes at the database level prevent data corruption (e.g., duplicate attendance for the same student on the same date/subject, duplicate subject allocations).
4. **Security by Default:** Zero plaintext passwords, strict CORS restrictions, role-based route gating at both client and server boundaries, and sanitized query projections to prevent sensitive data leaks.
