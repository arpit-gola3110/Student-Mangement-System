import env from '../config/env.js';

/**
 * Centralized Phase 8 Attendance Policy & Academic Calendar Utilities.
 * Keeps threshold, Late-attendance weight, and IST (+05:30) calendar date handling uniform
 * across sessions, bulk marking, corrections, reports, and dashboards.
 */
export const ATTENDANCE_POLICY = Object.freeze({
  lateCountsAsAttended: true,
  lateWeight: 1, // 1.0 = counts as attended class; lateCount is still tracked separately
  countedStatuses: ['PRESENT', 'LATE', 'EXCUSED'],
  eligibleSessionStatus: 'FINALIZED',
  timezone: 'Asia/Kolkata'
});

export const getAttendanceThreshold = () => {
  const raw = Number(env.ATTENDANCE_THRESHOLD_PERCENT ?? 75);
  if (Number.isFinite(raw) && raw >= 1 && raw <= 100) return raw;
  return 75;
};

/**
 * Returns today's calendar date string (YYYY-MM-DD) in Asia/Kolkata (IST).
 */
export const getAcademicTodayString = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ATTENDANCE_POLICY.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
};

/**
 * Validates YYYY-MM-DD or Date into canonical { sessionDate: 'YYYY-MM-DD', dateObj: Date (UTC midnight) }.
 */
export const normalizeAcademicDate = (input) => {
  let ymd = '';
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) {
      throw new Error('Invalid date');
    }
    const iso = input.toISOString().slice(0, 10);
    ymd = iso;
  } else {
    const raw = String(input || '').trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) {
      throw new Error('Session date must use YYYY-MM-DD format');
    }
    ymd = `${match[1]}-${match[2]}-${match[3]}`;
  }

  const [y, m, d] = ymd.split('-').map(Number);
  const utcDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  if (
    Number.isNaN(utcDate.getTime()) ||
    utcDate.getUTCFullYear() !== y ||
    utcDate.getUTCMonth() !== m - 1 ||
    utcDate.getUTCDate() !== d
  ) {
    throw new Error(`Calendar date "${ymd}" is invalid`);
  }

  return { sessionDate: ymd, dateObj: utcDate };
};

export const isFutureAcademicDate = (sessionDateStr) => {
  return sessionDateStr > getAcademicTodayString();
};

export const computeAttendanceMetrics = ({ presentCount = 0, lateCount = 0, excusedCount = 0, absentCount = 0 }) => {
  const present = Number(presentCount) || 0;
  const late = Number(lateCount) || 0;
  const excused = Number(excusedCount) || 0;
  const absent = Number(absentCount) || 0;

  const totalSessions = present + late + excused + absent;
  const attendedCount = ATTENDANCE_POLICY.lateCountsAsAttended
    ? present + late + excused
    : present + excused;

  const percentage =
    totalSessions > 0 ? Number(((attendedCount / totalSessions) * 100).toFixed(1)) : null;

  const threshold = getAttendanceThreshold();
  const isBelowThreshold = percentage !== null ? percentage < threshold : false;

  return {
    totalSessions,
    presentCount: present,
    lateCount: late,
    excusedCount: excused,
    absentCount: absent,
    attendedCount,
    percentage,
    threshold,
    isBelowThreshold,
    hasNoData: totalSessions === 0
  };
};
