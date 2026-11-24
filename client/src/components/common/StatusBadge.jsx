import React from 'react';

export const StatusBadge = ({ status }) => {
  const norm = String(status || '').toUpperCase();

  const styles = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PRESENT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PUBLISHED: 'bg-emerald-50 text-emerald-700 border-emerald-200',

    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    LATE: 'bg-amber-50 text-amber-700 border-amber-200',
    UPCOMING: 'bg-slate-100 text-slate-700 border-slate-200',

    ABSENT: 'bg-rose-50 text-rose-700 border-rose-200',
    SUSPENDED: 'bg-rose-50 text-rose-700 border-rose-200',
    FAIL: 'bg-rose-50 text-rose-700 border-rose-200'
  };

  const currentStyle = styles[norm] || 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentStyle}`}>
      {norm}
    </span>
  );
};

export default StatusBadge;
