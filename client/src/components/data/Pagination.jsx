import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalRecords,
  pageSize = 10,
  onPageChange,
  className = ''
}) => {
  if (totalPages <= 1 && !totalRecords) return null;

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-white ${className}`}>
      <div className="text-xs text-slate-500 font-medium">
        {totalRecords ? (
          <span>
            Showing <strong className="text-slate-700">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-slate-700">{Math.min(currentPage * pageSize, totalRecords)}</strong> of{' '}
            <strong className="text-slate-700">{totalRecords}</strong> results
          </span>
        ) : (
          <span>
            Page <strong className="text-slate-700">{currentPage}</strong> of{' '}
            <strong className="text-slate-700">{totalPages}</strong>
          </span>
        )}
      </div>

      <div className="inline-flex rounded-lg border border-slate-200 shadow-sm">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex items-center px-3 py-1.5 rounded-l-lg border-r border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex items-center px-3 py-1.5 rounded-r-lg bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
