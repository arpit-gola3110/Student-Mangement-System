# Phase 8: Attendance Management Module

**Project:** Student Management System (SMS) — AKTU B.Tech CSE Mini Project (`BCS 554`, Session 2026–27)

## 1. Module Architecture & Data Design

### Attendance Session Model (`server/models/AttendanceSession.js`)
Supports multiple distinct class sessions on the same calendar date while preventing duplicate sessions:
- References: `facultyAssignment`, `faculty`, `course`, `semester`, `subject`, `createdBy`, `updatedBy`, `finalizedBy`, `cancelledBy`.
- Calendar fields: canonical `sessionDate` (`YYYY-MM-DD` in `Asia/Kolkata`), `dateObj` (UTC midnight), `sessionNumber` (`1..20`), `startTime`, `endTime`, `topic`.
- Workflow status: `'OPEN' | 'FINALIZED' | 'CANCELLED'`.
- Unique index: `{ subject: 1, semester: 1, section: 1, academicYear: 1, sessionDate: 1, sessionNumber: 1 }`.

### Attendance Record Model (`server/models/Attendance.js`)
Enhanced safely without breaking legacy direct-model compatibility:
- Added `session`, `course`, `section`, `academicYear`, `faculty`, `updatedBy`, and `lastCorrectionReason`.
- Partial unique index `{ session: 1, student: 1 }` (`partialFilterExpression: { session: { $type: 'objectId' } }`) prevents duplicate marks per student per session while permitting multiple sessions per day.

## 2. Attendance Calculation & Workflow Policies (`server/utils/attendancePolicy.js`)
- **Threshold:** `ATTENDANCE_THRESHOLD_PERCENT` (`75%` default via `server/config/env.js`, validated `[1..100]`).
- **Late Policy:** `LATE` counts as attended (`lateWeight = 1.0`, while `lateCount` is tracked separately alongside `presentCount` and `absentCount`).
- **Eligible Sessions Rule:** Only `'FINALIZED'` sessions are counted in attendance percentages and shortage reports; `'OPEN'` draft sessions and `'CANCELLED'` sessions are excluded.
- **Overall Formula:** Aggregated from raw finalized session totals `(sum(present + late + excused) / sum(finalizedTotal)) * 100` rather than unweighted averages of subject percentages. Subjects with `0` finalized sessions report `percentage: null` (`hasNoData: true`).
- **Correction & Reopening Policy:**
  - `OPEN` sessions accept bulk attendance (`POST /api/v1/attendance/bulk`) and edits.
  - `FINALIZED` sessions reject casual edits from faculty (`409`); faculty must reopen the session (`PATCH /sessions/:id/status` with mandatory `reason`), or an `admin` may perform an authorized correction (`PATCH /attendance/:id` with mandatory `reason`), both logged via `AuditLog` (`action: 'OVERRIDE'`).
  - `CANCELLED` sessions block all modifications (`400`).

## 3. REST API Endpoints (`/api/v1/attendance`)
- **Sessions:** `GET /sessions`, `GET /sessions/:id`, `POST /sessions`, `PATCH /sessions/:id`, `PATCH /sessions/:id/status`
- **Marking & History:** `POST /bulk`, `GET /`, `GET /:id`, `PATCH /:id`
- **Faculty Personal:** `GET /my-subjects`, `GET /my-sessions`, `GET /my-history`
- **Student Read-Only:** `GET /my`, `GET /my/summary`, `GET /my/subjects`, `GET /student/:studentId`
- **Reports:** `GET /reports/overview`, `GET /reports/subjects`, `GET /reports/students`, `GET /reports/faculty`

## 4. Frontend Views
- `client/src/pages/faculty/FacultyAttendancePage.jsx` (`/faculty/attendance`): Authorized subject selector, session creation modal, live roll-call sheet (`Present / Absent / Late`, `Mark All Present`, `Clear Selection`, live counts, review dialog, bulk submit + finalize), session status management, history/corrections, and subject reports.
- `client/src/pages/admin/AdminAttendancePage.jsx` (`/admin/attendance`): Institutional overview KPIs & Recharts trend visualizations, session monitor, record overrides with mandatory reasons, and student/subject/faculty/shortage reports.
- `client/src/pages/student/StudentAttendancePage.jsx` (`/student/attendance`): Read-only overall %, threshold warning banner, Recharts comparison chart, subject-wise progress cards, and paginated attendance history.
- Updated `client/src/pages/admin/AdminDashboard.jsx`, `server/controllers/dashboardController.js`, and `client/src/App.jsx` to serve live MongoDB attendance analytics cleanly.
