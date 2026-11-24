# Student Management System (SMS)
## Document 09: System Architecture, Workflows & Application Data Flow

---

### 1. High-Level 3-Tier System Architecture

The Student Management System is constructed upon a high-performance, decoupled three-tier architecture:
- **Presentation Tier (Client):** Single Page Application (SPA) built with React 18 and Vite, styled with Tailwind CSS, utilizing React Router for declarative navigation and TanStack Query for cache synchronization. Hosted on **Vercel's Global Edge Network**.
- **Application Tier (Server):** Asynchronous, event-driven RESTful API server executed by Node.js and Express.js. Implements Helmet, CORS, Rate-Limiting, JWT verification, RBAC authorization, and Zod validation middleware. Hosted on **Render Container Services**.
- **Data Tier (Database):** Fully managed, geo-replicated document database on **MongoDB Atlas** utilizing Mongoose ODM connection pooling with strict schema definitions and B-tree compound indexes.

```mermaid
graph TD
    subgraph Client_Tier["Presentation Tier (Vercel CDN)"]
        UI["React 18 SPA (Vite)"]
        State["TanStack Query + React Context"]
        Router["React Router v6 (RBAC Protected)"]
        UI --> State
        UI --> Router
    end

    subgraph Transport_Layer["Secure Transport (TLS 1.3 / HTTPS)"]
        HTTP["RESTful JSON Payloads / Bearer JWT"]
    end

    subgraph Application_Tier["Application Tier (Render Node.js Service)"]
        Gateway["Express HTTP Gateway"]
        Security["Security Middleware (Helmet / CORS / Rate-Limit)"]
        AuthMiddleware["Auth & RBAC Middleware (JWT Verification)"]
        Controllers["Domain Controllers (20 Modules)"]
        ServiceLogic["Business Logic & AKTU Grade Calculator"]
        AuditInterceptor["Audit Log Interceptor"]
        MongooseODM["Mongoose ODM (Schema & Index Engine)"]

        Gateway --> Security
        Security --> AuthMiddleware
        AuthMiddleware --> Controllers
        Controllers --> ServiceLogic
        Controllers --> AuditInterceptor
        ServiceLogic --> MongooseODM
        AuditInterceptor --> MongooseODM
    end

    subgraph Data_Tier["Data Tier (MongoDB Atlas Cloud Cluster)"]
        DB[(MongoDB Atlas)]
        Collections["Users, Students, Faculty, Academic Collections, Attendance, Results, AuditLogs"]
        MongooseODM --> DB
        DB --- Collections
    end

    Client_Tier --> HTTP
    HTTP --> Application_Tier
```

---

### 2. Frontend-Backend-Database Request Lifecycle

Every client interaction follows a disciplined, predictable execution path through the technical stack:

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Browser)
    participant React as React UI Component
    participant Axios as Axios API Client
    participant Express as Express.js Router
    participant Middleware as Auth & RBAC Middleware
    participant Controller as Domain Controller
    participant Mongoose as Mongoose ODM
    participant MongoDB as MongoDB Atlas Cluster

    User->>React: Performs User Action (e.g. Submits Attendance)
    React->>React: Validates Client Form via Zod Schema
    React->>Axios: Dispatches HTTP POST with Bearer JWT
    Axios->>Express: Transmits JSON request over HTTPS
    Express->>Middleware: Intercepts request
    Middleware->>Middleware: 1. Verifies JWT signature & expiry
    Middleware->>Middleware: 2. Validates user role & assignment permissions
    alt Authorization Failed
        Middleware-->>Axios: HTTP 401 Unauthorized / 403 Forbidden
        Axios-->>React: Triggers UI Error Toast
    else Authorization Succeeded
        Middleware->>Controller: Invokes Controller Handler
        Controller->>Controller: Executes Business Rules & Calculations
        Controller->>Mongoose: Invokes Model Operations (e.g. bulkWrite)
        Mongoose->>MongoDB: Executes Indexed Write Operation
        MongoDB-->>Mongoose: Confirms Persistence & Returns Document
        Mongoose-->>Controller: Returns Plain JavaScript Object (lean)
        Controller-->>Express: Formats Standard JSON Response Envelope
        Express-->>Axios: HTTP 200 OK / 201 Created
        Axios-->>React: Updates TanStack Query Cache
        React-->>User: Renders Success Toast & Updates View
    end
```

---

### 3. Authentication & Session Workflow

```mermaid
flowchart TD
    Start([User Navigates to /login]) --> InputCreds[Enters Email & Password]
    InputCreds --> ClientVal{Client-side Zod Validation}
    ClientVal -- Invalid --> ShowErr[Display Field Validation Error]
    ClientVal -- Valid --> SendPost[POST /api/auth/login]

    SendPost --> CheckRate{Rate Limit OK? <5 req/min}
    CheckRate -- No --> Err429[Return 429 Too Many Requests]
    CheckRate -- Yes --> FindUser[Find User by Email in MongoDB]

    FindUser --> UserExists{User Exists & isActive?}
    UserExists -- No --> Err401[Return 401 Invalid Credentials]
    UserExists -- Yes --> ComparePwd[bcrypt.compare passwordHash]

    ComparePwd --> PwdMatch{Password Matches?}
    PwdMatch -- No --> Err401
    PwdMatch -- Yes --> GenJWT[Sign JWT with userId, role, profileId - Expiry 24h]

    GenJWT --> LogAudit[Log LOGIN event in AuditLogs]
    LogAudit --> ReturnResp[Return 200 OK with JWT & User Info]

    ReturnResp --> StoreToken[React stores JWT in memory/localStorage]
    StoreToken --> DecodeRole{Inspect Role Claim}

    DecodeRole -- ADMIN --> NavAdmin[Redirect to /admin/dashboard]
    DecodeRole -- FACULTY --> NavFac[Redirect to /faculty/dashboard]
    DecodeRole -- STUDENT --> NavStud[Redirect to /student/dashboard]
```

---

### 4. Role-Based Dashboard Navigation Flow

```mermaid
flowchart LR
    Root([App Navigation]) --> CheckAuth{Is Authenticated?}
    CheckAuth -- No --> LoginPage["/login"]
    CheckAuth -- Yes --> RoleSwitch{Evaluate JWT Role}

    subgraph Admin_Portal["Admin Navigation Tree"]
        RoleSwitch -- ADMIN --> AdminRoot["/admin/dashboard"]
        AdminRoot --> Depts["/admin/departments"]
        AdminRoot --> Courses["/admin/courses"]
        AdminRoot --> Semesters["/admin/semesters"]
        AdminRoot --> Subjects["/admin/subjects"]
        AdminRoot --> Students["/admin/students"]
        AdminRoot --> Faculty["/admin/faculty"]
        AdminRoot --> Enroll["/admin/enrollments"]
        AdminRoot --> Alloc["/admin/faculty-assignments"]
        AdminRoot --> ExamAdmin["/admin/examinations"]
        AdminRoot --> Audit["/admin/audit-logs"]
        AdminRoot --> Reports["/admin/reports"]
    end

    subgraph Faculty_Portal["Faculty Navigation Tree"]
        RoleSwitch -- FACULTY --> FacRoot["/faculty/dashboard"]
        FacRoot --> MySubjects["/faculty/subjects"]
        FacRoot --> MarkAttd["/faculty/attendance/mark"]
        FacRoot --> MarkCIA["/faculty/marks-entry"]
        FacRoot --> FacNotices["/faculty/announcements"]
        FacRoot --> FacProfile["/faculty/profile"]
    end

    subgraph Student_Portal["Student Navigation Tree"]
        RoleSwitch -- STUDENT --> StudRoot["/student/dashboard"]
        StudRoot --> StudProfile["/student/profile"]
        StudRoot --> StudAttd["/student/attendance"]
        StudRoot --> StudInternal["/student/internal-marks"]
        StudRoot --> StudResult["/student/results"]
        StudRoot --> StudNotices["/student/announcements"]
    end
```

---

### 5. Student Enrollment Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin Officer
    participant UI as Enrollment Form
    participant API as /api/enrollments
    participant DB as MongoDB (Enrollments Collection)

    Admin->>UI: Selects Course, Semester, Academic Year & Section
    Admin->>UI: Selects Student(s) from Un-enrolled Roster
    Admin->>UI: Submits Enrollment Batch
    UI->>API: POST /api/enrollments/bulk
    API->>API: Validates Student IDs & Semester Status (Must be ACTIVE)
    API->>DB: Checks Compound Uniqueness {student, semester, academicYear}
    alt Existing Duplicate Found
        DB-->>API: Conflict on Duplicate Key
        API-->>UI: 409 Conflict: Student already enrolled in this term
    else All Enrollments Valid
        API->>DB: Inserts Enrollment Documents with status: 'ENROLLED'
        DB-->>API: Confirmation of Insert
        API->>DB: Logs AUDIT_LOG (BULK_ENROLLMENT)
        API-->>UI: 201 Created: Students successfully enrolled
        UI-->>Admin: Displays Updated Semester Roster
    end
```

---

### 6. Attendance Management Workflow

```mermaid
flowchart TD
    FacLogin([Faculty Opens Attendance Module]) --> SelectAssign[Selects Assigned Subject & Section]
    SelectAssign --> FetchRoster[GET /api/attendance/sheet?subjectId&section&date]
    FetchRoster --> CheckAssign{Is Faculty Assigned to Subject?}
    CheckAssign -- No --> Deny[403 Forbidden]
    CheckAssign -- Yes --> LoadRoster[Render Roll-Call Table with Default 'PRESENT']

    LoadRoster --> ToggleStatus[Faculty Toggles Absentees / Late Students]
    ToggleStatus --> SubmitAttd[Clicks 'Save Attendance Batch']
    SubmitAttd --> SendAPI[POST /api/attendance]

    SendAPI --> ValDate{Is Date <= Today?}
    ValDate -- No --> ErrFuture[400 Bad Request: Future dates not allowed]
    ValDate -- Yes --> ProcessRecords[Loop through Student Records]

    ProcessRecords --> UpsertDB[MongoDB bulkWrite with upsert: true on compound index]
    UpsertDB --> Recompute[Trigger Real-Time Attendance Aggregate Calculation]
    Recompute --> Check75{Aggregate < 75%?}
    Check75 -- Yes --> FlagDefaulter[Flag Low Attendance Warning Status]
    Check75 -- No --> SaveOK[Attendance Logged]

    FlagDefaulter --> Complete([Return 200 OK with Batch Summary])
    SaveOK --> Complete
```

---

### 7. Internal Assessment & Result Processing Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Faculty as Subject Faculty
    actor Admin as Examination Officer
    actor Student as Student
    participant API as Results API
    participant Engine as AKTU Grade Engine
    participant DB as MongoDB (Results & Exams)

    Faculty->>API: POST /api/results/marks (Inputs Sessional & CIA Scores)
    API->>API: Validates Marks Range (0 <= Score <= MaxMarks)
    API->>DB: Persists Internal Marks in Draft State
    Note over Faculty,Admin: End of Semester Examination Concluded

    Admin->>API: POST /api/results/publish (Triggers Semester Result Tabulation)
    API->>DB: Fetches all Subject Scores (Internal + External)
    API->>Engine: Passes Raw Marks & Subject Credits
    Engine->>Engine: 1. Sums Component Scores (Max 100)
    Engine->>Engine: 2. Maps Percentage to AKTU Letter Grade (A+ to F)
    Engine->>Engine: 3. Multiplies Credits * Grade Points
    Engine->>Engine: 4. Computes SGPA = Total Weighted Points / Total Credits
    Engine-->>API: Returns Tabulated Results & SGPA
    API->>DB: Updates Results to status: 'PUBLISHED'
    API->>DB: Logs AUDIT_LOG (EXAM_RESULTS_PUBLISHED)
    Admin-->>Student: Official Notification Broadcasted
    Student->>API: GET /api/results/student/me
    API->>DB: Queries Published Results for Authenticated Student
    DB-->>API: Returns Gradecard Data
    API-->>Student: Renders Digital Semester Transcript & SGPA Badge
```

---

### 8. End-to-End Application Data Flow Architecture

```mermaid
graph TD
    subgraph Browser_Client["React Frontend Application"]
        Forms["Input Forms (Zod Validated)"]
        Tables["Data Tables (Filter / Sort / Page)"]
        Charts["Analytical Visualizations (Recharts)"]
    end

    subgraph API_Gateway["Express API Gateway"]
        CORS["CORS & Security Headers"]
        RateLimit["Rate Limiter"]
        AuthFilter["JWT Authenticator"]
        RBACFilter["Role Permissions Guard"]
    end

    subgraph Service_Domain["Application Domain Services"]
        UserSvc["User & Profile Service"]
        AcadSvc["Academic Master Service"]
        EnrollSvc["Enrollment & Assignment Service"]
        AttdSvc["Attendance Calculation Service"]
        GradeSvc["AKTU Grading & SGPA Service"]
        AuditSvc["Audit Logging Service"]
    end

    subgraph Database_Cluster["MongoDB Atlas Database"]
        UserCol[("Users & Profiles")]
        AcadCol[("Academic Hierarchy")]
        AttdCol[("Attendance Records")]
        ResCol[("Examinations & Results")]
        AuditCol[("Immutable Audit Trail")]
    end

    Browser_Client -->|HTTP REST Requests| API_Gateway
    API_Gateway --> CORS
    CORS --> RateLimit
    RateLimit --> AuthFilter
    AuthFilter --> RBACFilter
    RBACFilter --> Service_Domain

    UserSvc <--> UserCol
    AcadSvc <--> AcadCol
    EnrollSvc <--> AcadCol
    AttdSvc <--> AttdCol
    GradeSvc <--> ResCol
    AuditSvc --> AuditCol

    Service_Domain -->|Standard JSON Envelope| Browser_Client
```
