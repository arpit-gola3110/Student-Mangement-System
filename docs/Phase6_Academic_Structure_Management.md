# Student Management System (SMS)
## Phase 6: Department, Course, Semester & Subject Management

**Academic Context:** B.Tech CSE Mini Project  
**Course Code:** BCS 554 | **Academic Session:** 2026–27  
**University:** Dr. A.P.J. Abdul Kalam Technical University (AKTU)  

---

### 1. Modules Implemented

1. **Department Management (`/admin/departments`, `/api/v1/departments`)**: Academic divisions (`code`, `name`, `description`, `headOfDepartment`, `isActive`) with aggregated `courseCount`, `studentCount`, and `facultyCount`.
2. **Course Management (`/admin/courses`, `/api/v1/courses`)**: Degree programs (`code`, `name`, `department`, `durationYears`, `totalSemesters`, `description`, `isActive`) with aggregated `studentCount` and `semesterCount`.
3. **Semester Management (`/admin/semesters`, `/api/v1/semesters`)**: Academic-year-specific term cycles (`course`, `semesterNumber`, `academicYear`, `startDate`, `endDate`, `status`, `isActive`) with aggregated `subjectCount`.
4. **Subject Management (`/admin/subjects`, `/api/v1/subjects`)**: Curriculum subjects (`code`, `name`, `course`, `semester`, `credits`, `type`, `maxInternalMarks`, `maxExternalMarks`, `totalMaxMarks`, `description`, `isActive`) with cascading `Department → Course → Semester` validation.

---

### 2. Relational Integrity & Safe Governance Rules

- **Active Reference Enforcement:** Creating a Course requires an active Department; creating a Semester requires an active Course and `semesterNumber <= course.totalSemesters`; creating a Subject requires an active Course and active Semester belonging to that Course.
- **Structural Reassignment & Reduction Guards:**
  - Cannot reassign a Course to another Department if Semesters, Subjects, Students, or Enrollments depend on it (`409 Conflict`).
  - Cannot reduce `Course.totalSemesters` below existing `Semester.semesterNumber` or `Student.currentSemester` (`409 Conflict`).
  - Cannot reassign a Semester to a different Course, or change `semesterNumber` while Subjects, Students, Enrollments, Assignments, Exams, or Attendance depend on it (`409 Conflict`).
  - Cannot reassign a Subject to another Course/Semester if `FacultyAssignment`, `Attendance`, or `Result` records exist (`409 Conflict`).
  - Cannot reduce `Subject.maxInternalMarks` / `maxExternalMarks` below values already scored in `Result` (`409 Conflict`).
- **Soft Deactivation Preferred:** Hard deletions (`DELETE`) are blocked with `409 Conflict` whenever dependent academic or historical records exist.
