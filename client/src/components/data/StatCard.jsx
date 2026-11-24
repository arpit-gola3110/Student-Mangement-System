import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  subtitle,
  color = 'indigo',
  className = ''
}) => {
  const colorSchemes = {
    indigo: {
      bg: 'bg-brand-50',
      icon: 'text-brand-600',
      border: 'hover:border-brand-300'
    },
    emerald: {
      bg: 'bg-emerald-50',
      icon: 'text-emerald-600',
      border: 'hover:border-emerald-300'
    },
    amber: {
      bg: 'bg-amber-50',
      icon: 'text-amber-600',
      border: 'hover:border-amber-300'
    },
    rose: {
      bg: 'bg-rose-50',
      icon: 'text-rose-600',
      border: 'hover:border-rose-300'
    },
    sky: {
      bg: 'bg-sky-50',
      icon: 'text-sky-600',
      border: 'hover:border-sky-300'
    }
  };

  const scheme = colorSchemes[color] || colorSchemes.indigo;

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm transition-all duration-200 ${scheme.border} ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${scheme.bg} ${scheme.icon}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <h3 className="text-2xl font-bold tracking-tight text-slate-900">{value}</h3>

        {trend && (
          <span
            className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
              trend === 'up'
                ? 'bg-emerald-50 text-emerald-700'
                : trend === 'down'
                ? 'bg-rose-50 text-rose-700'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {trend === 'up' ? (
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
            ) : trend === 'down' ? (
              <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
            ) : null}
            {trendValue}
          </span>
        )}
      </div>

      {subtitle && <p className="text-xs text-slate-400 mt-2 font-medium">{subtitle}</p>}
    </div>
  );
};

export default StatCard;
