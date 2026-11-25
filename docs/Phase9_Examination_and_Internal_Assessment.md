# Phase 9: Examination Management & Internal Assessment

**Project:** Student Management System (SMS) — AKTU B.Tech CSE Mini Project (`BCS 554`, Session 2026–27)

## 1. Architecture & Data Model Design
- **Reused & Extended `Examination` (`server/models/Examination.js`):** Added `course`, `subject`, `examDate`, `startTime`, `endTime`, `maxMarks`, `description`, `status` (`DRAFT`, `SCHEDULED`, `COMPLETED`, `CANCELLED`, `PUBLISHED`, plus legacy `UPCOMING`, `ONGOING`), `createdBy`, `updatedBy`, `publishedAt`, `cancelledAt`, and partial unique index `{ semester: 1, subject: 1, examType: 1, academicYear: 1, title: 1 }` (`isCancelled: false`).
- **Created `InternalAssessment` (`server/models/InternalAssessment.js`):** Configurable assessment components (`CLASS_TEST`, `ASSIGNMENT`, `QUIZ`, `PRACTICAL`, `VIVA`, `PROJECT`, `OTHER`) linked to `course`, `semester`, `subject`, `academicYear`, optional parent `examination`, `maxMarks`, `assessmentDate`, and workflow status (`DRAFT`, `ACTIVE`, `FINALIZED`, `PUBLISHED`, `CANCELLED`).
- **Created `AssessmentMark` (`server/models/AssessmentMark.js`):** Kept separate from final `Result` so Phase 10 final grading and SGPA stay clean. Stores `assessment`, optional `examination`, `student`, `subject`, `course`, `semester`, `academicYear`, `faculty`, `marksObtained`, `maxMarks`, `remarks`, `entryStatus` (`DRAFT`, `SUBMITTED`, `FINALIZED`), `enteredBy`, `updatedBy`, and `lastCorrectionReason`, with unique index `{ assessment: 1, student: 1 }`.
- **Migration (`server/utils/migratePhase9.js`):** Dropped legacy `{ semester: 1, examType: 1, academicYear: 1 }` index (`0` rows affected) and synchronized indexes across `Examination`, `InternalAssessment`, and `AssessmentMark`.

## 2. Backend APIs
- **`/api/v1/examinations`:** `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `PATCH /:id/status`, `DELETE /:id`
- **`/api/v1/assessments`:** `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `PATCH /:id/status`, `POST /:id/marks/bulk`, `GET /marks`, `GET /marks/:markId`, `PATCH /marks/:markId`, `GET /my-marks`

## 3. Security, Corrections & Audit Logging
- **Admin:** Configures examinations and internal assessment components, views institutional marks progress, transitions statuses (`PUBLISHED`, `COMPLETED`, `CANCELLED`), and performs audited overrides (`AuditLog` action `OVERRIDE` saving `{ previousMarks, newMarks, reason }`).
- **Faculty:** Scoped strictly to active `FacultyAssignment` subjects (`403` otherwise); saves Draft or Finalized marks only for enrolled active students (`0..maxMarks`, 2 decimal precision); locked from casual edits once an assessment is `FINALIZED` or `PUBLISHED` (`409`).
- **Student:** Strictly read-only access to own `PUBLISHED` internal assessment marks (`/assessments/my-marks`) and own visible examinations (`SCHEDULED`, `COMPLETED`, `PUBLISHED`). Draft/active/finalized unpublished marks and other students' IDs are strictly blocked (`403`).

## 4. Frontend Implementation
- `client/src/pages/admin/AdminExaminationsPage.jsx` (`/admin/examinations`)
- `client/src/pages/faculty/FacultyAssessmentPage.jsx` (`/faculty/internal-assessment`, `/faculty/examinations`)
- `client/src/pages/student/StudentAssessmentPage.jsx` (`/student/internal-assessment`, `/student/examinations`)
- Integrated live exam and assessment summary metrics into Admin, Faculty, and Student dashboards.
