import React from 'react';

export const LoadingSkeleton = ({
  variant = 'card',
  count = 1,
  className = ''
}) => {
  const items = Array.from({ length: count });

  if (variant === 'card') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
        {items.map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm animate-pulse space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-3 w-20 bg-slate-200 rounded"></div>
              <div className="h-8 w-8 bg-slate-200 rounded-lg"></div>
            </div>
            <div className="h-7 w-28 bg-slate-200 rounded"></div>
            <div className="h-3 w-36 bg-slate-100 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-pulse ${className}`}>
        <div className="h-12 bg-slate-100 border-b border-slate-200"></div>
        <div className="divide-y divide-slate-100 p-4 space-y-3">
          {items.map((_, i) => (
            <div key={i} className="flex justify-between items-center py-2">
              <div className="h-4 w-1/4 bg-slate-200 rounded"></div>
              <div className="h-4 w-1/3 bg-slate-100 rounded"></div>
              <div className="h-4 w-1/6 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 animate-pulse ${className}`}>
      {items.map((_, i) => (
        <div key={i} className="h-4 bg-slate-200 rounded w-full"></div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;
