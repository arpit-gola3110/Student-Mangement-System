# Phase 10: Results Management & Academic Result Processing

**Project:** Student Management System (SMS) — AKTU B.Tech CSE Mini Project (`BCS 554`, Session 2026–27)

## 1. Documented vs Provisional Academic Rules
- **Documented Rules Implemented Directly:**
  - Subject score composition: `Subject.maxInternalMarks` (default `30`) + `Subject.maxExternalMarks` (default `70`) = `totalMaxMarks` (`100`).
  - Letter Grade & 10-point Grade Points (`server/utils/gradeCalculator.js`): `>=90 A+ (10)`, `>=80 A (9)`, `>=70 B+ (8)`, `>=65 B (7)`, `>=55 C (6)`, `>=50 D (5)`, `>=40 P (4)`, `<40 F (0)`.
  - Semester SGPA formula: $\text{SGPA} = \frac{\sum (C_i \times G_i)}{\sum C_i}$ rounded to 2 decimals.
- **Provisional Rules Stored as Configurable Policy (`AcademicResultPolicy`):**
  - Default seeded policy `PROV-BTECH-10PT-2026` (`isProvisional: true`) defines configurable `evaluationMode` (`COMBINED | INTERNAL_ONLY | EXTERNAL_ONLY`), `useSubjectMaxMarks: true`, `minInternalPassPercent: 0%`, `minExternalPassPercent: 30%`, `minTotalPassPercent: 40%`, and `roundingPolicy: DECIMAL_2`.
  - Multi-semester **CGPA** returns `null` with an explicit note until institutional cumulative backlog/carry-over ordinances are confirmed.
  - Every `Result` stores an immutable `policySnapshot` at calculation time so subsequent policy updates never retroactively mutate historical published results.

## 2. Models & Schema Design
- `server/models/AcademicResultPolicy.js`: Stores configurable policies with validated non-overlapping `0–100%` grade boundaries and version tracking.
- `server/models/Result.js`: Reused and extended with `course`, `semester`, `academicYear`, `internalMaxMarks`, `externalMaxMarks`, `maxMarks`, `percentage`, `internalPass`, `externalPass`, `attendanceState` (`PRESENT | ABSENT | WITHHELD`), `resultStatus` (`PASS | FAIL | ABSENT | INCOMPLETE | WITHHELD`), `calculationStatus` (`PENDING | CALCULATED | REQUIRES_REVIEW | APPROVED | REJECTED`), `publicationStatus` (`UNPUBLISHED | PUBLISHED | WITHDRAWN`), `sourceAssessmentMarks[]`, `policySnapshot`, `calculationVersion`, and `revisionHistory[]`. Preserves full Phase 6 backward compatibility via `pre('validate')` auto-backfill.

## 3. Workflow, RBAC & Audit Logging
- **Workflow:** `Readiness Check` → `Calculate` (`UNPUBLISHED`, flags missing marks cleanly as `INCOMPLETE` / `REQUIRES_REVIEW`) → `Approve` (`APPROVED`) → `Publish` (`PUBLISHED`) → optional `Withdraw` / `Correct` / `Recalculate` (each archiving a complete version snapshot into `revisionHistory[]`).
- **RBAC:**
  - `ADMIN`: Policy management, calculation, review, approval, publication, withdrawal, correction, reports (`/api/v1/result-policies`, `/api/v1/results/*`).
  - `FACULTY`: Scoped read-only access for assigned subjects (`/api/v1/results/faculty/*`, `/api/v1/results`).
  - `STUDENT`: Strict read-only self-scoped access to `PUBLISHED` results only (`/api/v1/results/my`, `/my/semester-summary`, `/my/subject-summary`).
- **Audit Logging:** Reuses `AuditLog` for `RESULT_POLICY`, `RESULT_BATCH`, `RESULT_APPROVE`, `RESULT_REJECT`, `RESULT_PUBLISH`, `RESULT_WITHDRAW`, `RESULT_CORRECTION`, and `RESULT_RECALCULATION`.

## 4. Frontend Views
- `client/src/pages/admin/AdminResultsPage.jsx` (`/admin/results`): Overview & Analytics (`Recharts`), Readiness & Bulk Calculation + External Marks entry, Review/Approve/Publish/Override workbench with Revision History inspector, and Academic Policies manager.
- `client/src/pages/faculty/FacultyResultsPage.jsx` (`/faculty/results`): Scoped read-only table of student results for assigned subjects.
- `client/src/pages/results/StudentResults.jsx` (`/student/results`): Live published academic transcript cards, SGPA display, and subject-wise marks table.
