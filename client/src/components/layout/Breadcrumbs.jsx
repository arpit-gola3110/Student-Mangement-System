import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumbs = ({ customCrumbs, className = '' }) => {
  const location = useLocation();

  const getCrumbs = () => {
    if (customCrumbs) return customCrumbs;

    const pathnames = location.pathname.split('/').filter((x) => x);
    return pathnames.map((val, idx) => {
      const url = `/${pathnames.slice(0, idx + 1).join('/')}`;
      const label = val.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      return { label, url, isLast: idx === pathnames.length - 1 };
    });
  };

  const crumbs = getCrumbs();

  if (crumbs.length === 0) return null;

  return (
    <nav className={`flex items-center text-xs font-medium text-slate-500 ${className}`} aria-label="Breadcrumb">
      <Link to="/" className="text-slate-400 hover:text-slate-700 transition-colors flex items-center">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {crumbs.map((crumb, idx) => (
        <React.Fragment key={crumb.url || idx}>
          <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-slate-300 shrink-0" />
          {crumb.isLast ? (
            <span className="text-slate-800 font-semibold truncate max-w-[200px]">{crumb.label}</span>
          ) : (
            <Link to={crumb.url} className="hover:text-slate-800 transition-colors truncate max-w-[150px]">
              {crumb.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
