# Student Management System (SMS)
## Phase 5: User Management, Student Management & Faculty Management

**Academic Context:** B.Tech CSE Mini Project  
**Course Code:** BCS 554 | **Academic Session:** 2026–27  
**University:** Dr. A.P.J. Abdul Kalam Technical University (AKTU)  

---

### 1. Overview

Phase 5 delivers end-to-end administrative management for all three institutional identity & personnel modules integrated with MongoDB Atlas, Mongoose ODM, Zod validation, HttpOnly cookie/CSRF security, Audit Logging, TanStack Query, and React Hook Form:

1. **User Management (`/admin/users` & `/api/v1/users`)**
2. **Student Management (`/admin/students` & `/api/v1/students`)**
3. **Faculty Management (`/admin/faculty` & `/api/v1/faculty`)**

---

### 2. Schema Enhancements & Relational Integrity

- **`User` (`server/models/User.js`):** Added `name` (String, trimmed, max 100) while preserving `email` (unique, lowercase), `password` (`select: false`, bcrypt), `role` (`['admin', 'faculty', 'student']`), `isActive`, and `tokenVersion`.
- **`Student` (`server/models/Student.js`):** Added `course` (ObjectId ref `'Course'`), `semester` (ObjectId ref `'Semester'`), `admissionYear` (Number), and `academicYear` (String) alongside `user` (unique ObjectId), `enrollmentNumber` (unique), `rollNumber` (unique), `department`, `currentSemester`, and `status`.
- **`Faculty` (`server/models/Faculty.js`):** Added `specialization` (String) and `status` (`['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'RETIRED']`) alongside `user` (unique ObjectId), `employeeId` (unique), `department`, `designation`, `qualification`, `contactNumber`, and `joiningDate`.

#### Atomic Linked Creation & Rollback Strategy
Implemented `runWithTransactionOrCompensation` in `server/utils/dbTransaction.js`:
- On replica-set deployments (such as MongoDB Atlas), User and linked Student/Faculty documents are created inside a Mongoose ACID transaction (`session.withTransaction()`).
- On standalone `mongod` instances where multi-document transactions are unsupported (`code 20`), execution falls back safely to explicit compensation (removing the newly created `User` if profile insertion fails).

---

### 3. Academic & Security Guards Enforced

- **Department → Course → Semester Validation:** Creating or updating a Student verifies that `Department` exists and is active, `Course` exists, is active, and belongs to the selected `Department`, and `Semester` exists and belongs to the selected `Course`.
- **Self & Last-Admin Lockout Protection:** Admins cannot deactivate themselves, demote their own role, or deactivate/demote the last active `admin` account.
- **Role-Profile Linkage Consistency:** Cannot change the `role` of a `User` linked to a `Student` or `Faculty` profile, and cannot create disconnected `student`/`faculty` users without profile details.
- **Session Invalidation:** Deactivating a User, Student, or Faculty member (or changing a User's email/role) increments `User.tokenVersion`, immediately terminating active JWT sessions.
- **Safe Deletion Protection:** Hard deletion of Students or Faculty is rejected (`409 Conflict`) whenever historical `Attendance`, `Result`, `Enrollment`, `FacultyAssignment`, or `Department.headOfDepartment` records exist; soft deactivation preserves all academic history.
- **Regex & Sort Safety:** Search queries escape special regex metacharacters via `escapeRegex()`, sort keys are strictly whitelisted, and pagination enforces `1 <= limit <= 100`.
