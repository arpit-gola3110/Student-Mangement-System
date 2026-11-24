# Student Management System (SMS)
## Document 13: Four-Week Phased Development Roadmap

---

### 1. Roadmap Overview & Academic Milestones

To satisfy the academic evaluation criteria of **AKTU BCS 554 (Mini Project / Internship Assessment)**, development is structured into a disciplined, four-week Agile sprint schedule. Each week represents a concrete deliverable milestone presented to the designated faculty guide.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   4-WEEK IMPLEMENTATION TIMELINE                       │
├───────────────────┬───────────────────┬──────────────────┬─────────────┤
│      WEEK 1       │      WEEK 2       │      WEEK 3      │   WEEK 4    │
│  Architecture &   │    Enrollment &   │  Examinations,   │ Hardening,  │
│  Academic Masters │ Daily Attendance  │ Results & Charts │ Deploy & Doc│
└───────────────────┴───────────────────┴──────────────────┴─────────────┘
```

---

### 2. Detailed Weekly Breakdown

#### Week 1: Foundation, Environment Setup, Auth & Core Academic Masters
- **Core Focus:** Establishing project scaffolding, database models, authentication, and fundamental institutional hierarchy.
- **Specific Tasks:**
  - Day 1: Initialize Vite React client and Express server folders; install approved dependencies; configure Tailwind CSS and ESLint.
  - Day 2: Establish MongoDB Atlas connection cluster; configure Mongoose connection pooling and error listeners.
  - Day 3: Implement User model, bcrypt password hashing pre-save hooks, JWT generation utility, and authentication routes (`/api/auth/login`, `/api/auth/me`).
  - Day 4: Construct Department, Course, Semester, and Subject models with compound indexes and referential integrity checks.
  - Day 5: Implement React Router architecture, `AuthContext`, login page, and role-based `ProtectedRoute` wrappers.
  - Day 6: Build Admin Master Data management UI (Department, Course, Semester, Subject CRUD forms and tables).
  - Day 7: Milestone Review 1: Verify Master Data CRUD and secure login flows with Faculty Guide.
- **Deliverables:** Working Auth system, Master Academic Data CRUD, Initial Database Schemas.
- **Dependencies:** Workspace initialization, MongoDB Atlas cluster provisioning.
- **Risks & Mitigation:** Network timeouts with cloud database; mitigated by configuring 10-second Mongoose connection timeouts and retry logic.

---

#### Week 2: User Profiling, Student Enrollment & Daily Attendance Engine
- **Core Focus:** Establishing human resource profiles, mapping academic cohorts, and implementing the high-speed attendance engine.
- **Specific Tasks:**
  - Day 8: Implement Student and Faculty models with unique Roll Number / Employee ID indexing.
  - Day 9: Build Admin User Management screens (Student Registration Drawer, Faculty Onboarding Modal).
  - Day 10: Implement Student Enrollment and Faculty Subject Assignment controllers and APIs.
  - Day 11: Construct Enrollment and Assignment UI tables with batch selection tools.
  - Day 12: Build Attendance collection schema with compound unique index `(student, subject, date, semester)`.
  - Day 13: Build high-efficiency Faculty Roll-Call attendance interface (`[P] [A] [L] [E]` toggles, "Mark All Present" shortcut).
  - Day 14: Implement dynamic attendance percentage calculator and $<75\%$ low-attendance warning triggers. Milestone Review 2.
- **Deliverables:** Student & Faculty Profiles, Cohort Enrollments, Functional Daily Attendance Module with Real-Time Percentage Math.
- **Dependencies:** Week 1 Master Data and Auth.
- **Risks & Mitigation:** Duplicate attendance entries; mitigated by MongoDB compound unique index and bulk upsert operations.

---

#### Week 3: Examinations, Internal Assessments, Results & Dashboards
- **Core Focus:** Implementing assessment workflows, AKTU grading algorithms, and role-specific analytical dashboards.
- **Specific Tasks:**
  - Day 15: Implement Examination schema and Exam Scheduling management endpoints.
  - Day 16: Build Faculty Continuous Internal Assessment (CIA) mark-entry grid for Sessional 1, Sessional 2, and Assignments.
  - Day 17: Program AKTU 10-Point Grade Engine and SGPA calculation utility:
    $$\text{SGPA} = \frac{\sum (\text{Credits} \times \text{Grade Point})}{\sum \text{Credits}}$$
  - Day 18: Implement Result Publication controller and student digital grade transcript generation.
  - Day 19: Build Student Dashboard (Attendance Gauge, registered subjects progress, internal marks view).
  - Day 20: Build Faculty Dashboard (Assigned classes overview, timetable, pending attendance pills).
  - Day 21: Build Admin Command Center Dashboard with Recharts visual distributions. Milestone Review 3.
- **Deliverables:** Sessional Marks Entry, AKTU Grade & SGPA Engine, Student Transcript View, 3 Interactive Role Dashboards.
- **Dependencies:** Week 2 Enrollments and Attendance.
- **Risks & Mitigation:** Inaccurate grade mappings; mitigated by unit tests validating AKTU official percentage-to-grade ranges.

---

#### Week 4: Announcements, Audit Logs, Hardening, Deployment & AKTU Documentation
- **Core Focus:** Campus broadcasts, security hardening, full deployment to Vercel/Render, and project report preparation.
- **Specific Tasks:**
  - Day 22: Implement Announcements module (targetable to All, Department, or Semester).
  - Day 23: Implement Audit Logging middleware capturing mutation events (`POST`, `PUT`, `DELETE`).
  - Day 24: Comprehensive security audit: verify Helmet headers, CORS restrictions, rate-limiters, and Zod input validation schemas.
  - Day 25: End-to-end integration testing and cross-browser responsive testing (Desktop, Tablet, Mobile).
  - Day 26: Production Deployment: Deploy client to **Vercel**; deploy API server to **Render**; connect production MongoDB Atlas cluster.
  - Day 27: Compilation of official AKTU BCS 554 Project Report (40+ pages, 7 chapters, verified plagiarism $<10\%$).
  - Day 28: Final Presentation Preparation: Slide deck, live demonstration rehearsals, and project viva preparation.
- **Deliverables:** Live Production System on Vercel & Render, Comprehensive 40+ Page AKTU Project Report, Presentation Deck.
- **Dependencies:** Weeks 1–3 completed features.
- **Risks & Mitigation:** Deployment delays; mitigated by testing continuous deployment pipelines early in Week 3.

---

### 3. Milestone Summary & Progress Review Schedule

| Week | Target Date | Milestone Focus | Faculty Guide Review Gate | Status |
| :---: | :--- | :--- | :--- | :---: |
| **W1** | End of Week 1 | Foundation, Auth & Masters | Review schema models, JWT auth, and department/course CRUD. | Planned |
| **W2** | End of Week 2 | Cohort Operations & Attendance | Review enrollment flows and live attendance percentage calculations. | Planned |
| **W3** | End of Week 3 | Grading, Results & Dashboards| Review AKTU SGPA engine and role-based interactive dashboards. | Planned |
| **W4** | End of Week 4 | Deployment & Final Report | Final viva demonstration on Vercel/Render and report submission. | Planned |
