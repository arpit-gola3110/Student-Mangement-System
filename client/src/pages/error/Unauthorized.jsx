import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Unauthorized = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-16 text-center">
      <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-6 shadow-sm">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-3 py-1 rounded-full mb-3">
        Access Forbidden • 403
      </span>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
        Unauthorized Access
      </h1>
      <p className="text-sm text-slate-500 mt-2 max-w-md leading-relaxed">
        Your current session ({user?.role || 'Guest'}) lacks the necessary security clearance to view or modify this resource.
      </p>

      <div className="mt-8 flex items-center space-x-3">
        <Link to="/">
          <Button variant="primary" icon={Home}>
            Go to Your Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;
