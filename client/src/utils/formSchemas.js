import { z } from 'zod';

export const passwordPolicyField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password cannot exceed 128 characters')
  .regex(/[A-Z]/, 'Must include at least one uppercase letter')
  .regex(/[a-z]/, 'Must include at least one lowercase letter')
  .regex(/[0-9]/, 'Must include at least one digit')
  .regex(/[^A-Za-z0-9]/, 'Must include at least one special character');

export const phoneField = z
  .string()
  .trim()
  .regex(/^[0-9+\-\s]{7,15}$/, 'Enter a valid phone number (7-15 digits)');

export const extractApiErrorMessage = (err, fallback = 'An unexpected error occurred') => {
  if (!err) return fallback;
  if (Array.isArray(err.errors) && err.errors.length > 0) {
    const first = err.errors[0];
    if (typeof first === 'string') return first;
    if (first?.message) return `${first.field ? `${first.field}: ` : ''}${first.message}`;
  }
  return err.message || fallback;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const DESIGNATION_OPTIONS = [
  { value: 'PROFESSOR', label: 'Professor' },
  { value: 'ASSOCIATE_PROFESSOR', label: 'Associate Professor' },
  { value: 'ASSISTANT_PROFESSOR', label: 'Assistant Professor' },
  { value: 'LECTURER', label: 'Lecturer' }
];

export const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' }
];

export const STUDENT_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'GRADUATED', label: 'Graduated' }
];

export const FACULTY_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'ON_LEAVE', label: 'On Leave' },
  { value: 'RETIRED', label: 'Retired' }
];

export const SEMESTER_STATUS_OPTIONS = [
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' }
];

export const SUBJECT_TYPE_OPTIONS = [
  { value: 'THEORY', label: 'Theory' },
  { value: 'PRACTICAL', label: 'Practical' },
  { value: 'ELECTIVE', label: 'Elective' },
  { value: 'PROJECT', label: 'Project' }
];

export const ENROLLMENT_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'DROPPED', label: 'Dropped' },
  { value: 'CANCELLED', label: 'Cancelled' }
];

export const ASSIGNMENT_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'REVOKED', label: 'Revoked' }
];

export const getStatusBadgeVariant = (statusOrBool) => {
  if (statusOrBool === true || statusOrBool === 'ACTIVE') return 'success';
  if (statusOrBool === 'ON_LEAVE' || statusOrBool === 'GRADUATED' || statusOrBool === 'UPCOMING') return 'info';
  if (statusOrBool === 'SUSPENDED' || statusOrBool === 'COMPLETED' || statusOrBool === 'DROPPED') return 'warning';
  return 'danger';
};
