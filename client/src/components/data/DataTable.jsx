import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';
import LoadingSkeleton from './LoadingSkeleton';
import Pagination from './Pagination';

export const DataTable = ({
  columns = [],
  data = [],
  isLoading = false,
  error = null,
  onRetry,
  searchable = true,
  searchPlaceholder = 'Search records...',
  searchField = 'name',
  pagination = true,
  pageSize = 10,
  emptyTitle,
  emptyDescription,
  onRowClick,
  toolbarExtras = null,
  // Optional Server-Side Control Props
  serverSide = false,
  searchValue = '',
  onSearchChange,
  sortColumn: controlledSortColumn = null,
  sortDirection: controlledSortDirection = 'asc',
  onSortChange,
  currentPage: controlledPage = 1,
  totalPages: controlledTotalPages = 1,
  totalRecords: controlledTotalRecords = 0,
  onPageChange,
  className = ''
}) => {
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [localSortColumn, setLocalSortColumn] = useState(null);
  const [localSortDirection, setLocalSortDirection] = useState('asc');
  const [localPage, setLocalPage] = useState(1);

  const activeSearchTerm = serverSide ? searchValue : localSearchTerm;
  const activeSortColumn = serverSide ? controlledSortColumn : localSortColumn;
  const activeSortDirection = serverSide ? controlledSortDirection : localSortDirection;
  const activePage = serverSide ? controlledPage : localPage;

  // Client-side Filter
  const filteredData = useMemo(() => {
    if (serverSide || !localSearchTerm.trim()) return data;
    const term = localSearchTerm.toLowerCase();
    return data.filter((item) => {
      if (searchField && item[searchField]) {
        return String(item[searchField]).toLowerCase().includes(term);
      }
      return Object.values(item).some((val) => String(val).toLowerCase().includes(term));
    });
  }, [serverSide, data, localSearchTerm, searchField]);

  // Client-side Sort
  const sortedData = useMemo(() => {
    if (serverSide || !localSortColumn) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[localSortColumn];
      const bVal = b[localSortColumn];
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const res = aVal > bVal ? 1 : -1;
      return localSortDirection === 'asc' ? res : -res;
    });
  }, [serverSide, filteredData, localSortColumn, localSortDirection]);

  // Client-side Paginate
  const totalRecords = serverSide ? controlledTotalRecords : sortedData.length;
  const totalPages = serverSide ? controlledTotalPages : Math.ceil(totalRecords / pageSize) || 1;
  const displayData = useMemo(() => {
    if (serverSide || !pagination) return sortedData;
    const start = (localPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [serverSide, sortedData, localPage, pageSize, pagination]);

  const handleSort = (key) => {
    if (serverSide && onSortChange) {
      if (activeSortColumn === key) {
        const nextDir = activeSortDirection === 'asc' ? 'desc' : 'asc';
        onSortChange(key, nextDir);
      } else {
        onSortChange(key, 'asc');
      }
      return;
    }

    if (localSortColumn === key) {
      if (localSortDirection === 'asc') setLocalSortDirection('desc');
      else {
        setLocalSortColumn(null);
        setLocalSortDirection('asc');
      }
    } else {
      setLocalSortColumn(key);
      setLocalSortDirection('asc');
    }
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col ${className}`}>
      {(searchable || toolbarExtras) && (
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/50">
          {searchable && (
            <div className="relative w-full lg:max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={activeSearchTerm}
                onChange={(e) => {
                  const val = e.target.value;
                  if (serverSide && onSearchChange) {
                    onSearchChange(val);
                  } else {
                    setLocalSearchTerm(val);
                    setLocalPage(1);
                  }
                }}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
              />
            </div>
          )}
          {toolbarExtras && <div className="flex flex-wrap items-center gap-2.5">{toolbarExtras}</div>}
        </div>
      )}

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/70 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
              {columns.map((col) => {
                const sortKey = col.sortKey || col.accessor;
                const isSortable = col.sortable !== false && Boolean(sortKey);
                return (
                  <th
                    key={col.header || col.accessor}
                    onClick={() => isSortable && handleSort(sortKey)}
                    className={`py-3 px-4 whitespace-nowrap ${
                      isSortable ? 'cursor-pointer select-none hover:text-slate-900 transition-colors' : ''
                    } ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                  >
                    <div
                      className={`inline-flex items-center space-x-1 ${
                        col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''
                      }`}
                    >
                      <span>{col.header}</span>
                      {isSortable && (
                        <span className="text-slate-400">
                          {activeSortColumn === sortKey ? (
                            activeSortDirection === 'asc' ? (
                              <ChevronUp className="w-3.5 h-3.5 text-brand-600" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-brand-600" />
                            )
                          ) : (
                            <ChevronsUpDown className="w-3.5 h-3.5 opacity-60" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-sm">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center">
                  <LoadingSkeleton variant="table" count={4} />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={columns.length} className="p-6">
                  <ErrorState
                    title="Failed to load records"
                    message={typeof error === 'string' ? error : error?.message || 'Unable to fetch data from server.'}
                    onRetry={onRetry}
                  />
                </td>
              </tr>
            ) : displayData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              displayData.map((row, idx) => (
                <tr
                  key={row.id || row._id || idx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`hover:bg-slate-50/80 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.header || col.accessor}
                      className={`py-3.5 px-4 text-slate-700 ${
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && !isLoading && !error && totalRecords > 0 && (
        <Pagination
          currentPage={activePage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          pageSize={pageSize}
          onPageChange={(p) => {
            if (serverSide && onPageChange) onPageChange(p);
            else setLocalPage(p);
          }}
        />
      )}
    </div>
  );
};

export default DataTable;
