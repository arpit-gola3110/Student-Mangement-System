import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import Button from '../common/Button';

export const ErrorState = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this section.',
  onRetry,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center bg-rose-50/50 rounded-2xl border border-rose-200 ${className}`}>
      <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h4 className="text-base font-bold text-slate-900">{title}</h4>
      <p className="text-sm text-slate-600 mt-1 max-w-sm">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={onRetry} icon={RotateCcw}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
};

export default ErrorState;
