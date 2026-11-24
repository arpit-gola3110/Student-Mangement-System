import React from 'react';
import Breadcrumbs from './Breadcrumbs';

export const PageHeader = ({
  title,
  subtitle,
  actions,
  breadcrumbs = true,
  className = ''
}) => {
  return (
    <div className={`mb-6 sm:mb-8 ${className}`}>
      {breadcrumbs && <Breadcrumbs className="mb-2" />}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-1 font-medium">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center space-x-3 shrink-0">{actions}</div>}
      </div>
    </div>
  );
};

export default PageHeader;
