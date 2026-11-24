import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import {
  GraduationCap,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  School,
  AlertCircle
} from 'lucide-react';

const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Institutional email is required')
    .email('Please provide a valid email format'),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password exceeds maximum length')
});

const getRoleDashboardPath = (role) => {
  const normalized = (role || '').toLowerCase();
  if (normalized === 'admin') return '/admin/dashboard';
  if (normalized === 'faculty') return '/faculty/dashboard';
  return '/student/dashboard';
};

const isPathAllowedForRole = (pathname, role) => {
  if (!pathname || typeof pathname !== 'string') return false;
  const normalizedRole = (role || '').toLowerCase();
  if (pathname === '/announcements') return true;
  if (normalizedRole === 'admin') return pathname.startsWith('/admin') || pathname.startsWith('/faculty') || pathname.startsWith('/student');
  if (normalizedRole === 'faculty') return pathname.startsWith('/faculty');
  if (normalizedRole === 'student') return pathname.startsWith('/student');
  return false;
};

export const Login = () => {
  const [serverError, setServerError] = useState('');
  const { user, loading, login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  // Redirect already authenticated users to their role-appropriate dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate(getRoleDashboardPath(user.role), { replace: true });
    }
  }, [loading, user, navigate]);

  const onSubmit = async (values) => {
    if (isSubmitting) return;
    setServerError('');

    try {
      const loggedInUser = await login(values.email, values.password);
      showToast(`Welcome, ${loggedInUser.profile?.firstName || loggedInUser.email}!`, 'success');

      const requestedPath = location.state?.from?.pathname;
      const targetPath = isPathAllowedForRole(requestedPath, loggedInUser.role)
        ? requestedPath
        : getRoleDashboardPath(loggedInUser.role);

      navigate(targetPath, { replace: true });
    } catch (err) {
      const message = err?.message || 'Authentication failed. Please check your credentials.';
      setServerError(message);
      showToast(message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Left Column: Visual Academic Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-brand-950 via-slate-900 to-indigo-950 p-12 flex-col justify-between overflow-hidden border-r border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(79,70,229,0.15),transparent_50%)] pointer-events-none" />

        <div className="relative z-10 flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">AKTU SMS</h2>
            <p className="text-xs text-brand-300 font-semibold uppercase tracking-wider">
              Student Management System
            </p>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-brand-900/60 text-brand-300 border border-brand-700/50">
            <School className="w-3.5 h-3.5 mr-1.5" /> AKTU BCS 554 • 2026–27
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Comprehensive Digital Academic Administration.
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Centralized platform for managing student lifecycle records, faculty allocations, classroom attendance, continuous internal assessments, and semester transcripts.
          </p>

          <div className="pt-4 grid grid-cols-2 gap-3 text-xs text-slate-300">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>AKTU 75% Attendance Tracking</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>10-Point Credit SGPA Engine</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Role-Based Access Control</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Audit Logging & Analytics</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-500 flex items-center justify-between border-t border-slate-800/80 pt-4">
          <span>Dr. A.P.J. Abdul Kalam Technical University</span>
          <span>B.Tech CSE Mini Project</span>
        </div>
      </div>

      {/* Right Column: Authentication Form Card */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 py-12 bg-slate-950">
        <div className="mx-auto w-full max-w-sm">
          {/* Mobile branding header */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-12 h-12 bg-brand-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg text-white mb-3">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-extrabold text-white">Student Management System</h2>
            <p className="text-xs text-slate-400 mt-1">AKTU BCS 554 • Academic Session 2026–27</p>
          </div>

          <div className="bg-white rounded-3xl p-7 sm:p-8 shadow-2xl border border-slate-200/80">
            <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Portal Sign In</h3>
              <p className="text-xs text-slate-500 mt-1">Enter your institutional credentials to continue</p>
            </div>

            {serverError && (
              <div
                role="alert"
                className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-xs text-rose-700"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
              <Input
                label="Institutional Email"
                type="email"
                autoComplete="email"
                placeholder="name@aktu.ac.in"
                error={errors.email?.message}
                icon={Mail}
                disabled={isSubmitting}
                {...register('email')}
              />

              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••••••"
                error={errors.password?.message}
                icon={Lock}
                disabled={isSubmitting}
                {...register('password')}
              />

              <div className="flex items-center justify-end text-xs pt-1">
                <a
                  href="#forgot-password"
                  onClick={(e) => {
                    e.preventDefault();
                    showToast('Please contact your department administrator for credential resets', 'info');
                  }}
                  className="font-semibold text-brand-600 hover:text-brand-800 transition"
                >
                  Forgot password?
                </a>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                  icon={ArrowRight}
                  iconPosition="right"
                  className="w-full font-semibold shadow-md"
                >
                  {isSubmitting ? 'Signing In...' : 'Sign In to Dashboard'}
                </Button>
              </div>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-500">
                Access is restricted to provisioned institutional accounts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
