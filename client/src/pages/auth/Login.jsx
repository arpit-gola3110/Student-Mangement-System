import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import {
  GraduationCap,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  School
} from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('admin@aktu.ac.in');
  const [password, setPassword] = useState('AdminPassword@123');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const validate = () => {
    const errs = {};
    if (!email) errs.email = 'Institutional email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Please provide a valid email format';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const user = await login(email, password);
      showToast(`Welcome, ${user.profile?.firstName || user.email}!`, 'success');
      if (user.role === 'ADMIN') navigate('/admin/dashboard');
      else if (user.role === 'FACULTY') navigate('/faculty/dashboard');
      else navigate('/student/dashboard');
    } catch (err) {
      showToast('Authentication failed. Please check credentials.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSelect = (roleEmail, rolePass) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Left Column: Visual Academic Branding (Visible on Desktop/Laptop) */}
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

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <Input
                label="Institutional Email"
                type="email"
                placeholder="name@aktu.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                icon={Mail}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                icon={Lock}
                required
              />

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 mr-2"
                  />
                  Remember session
                </label>
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
                  isLoading={isLoading}
                  icon={ArrowRight}
                  iconPosition="right"
                  className="w-full font-semibold shadow-md"
                >
                  Sign In to Dashboard
                </Button>
              </div>
            </form>

            {/* Development Quick Role Switcher (Clearly marked as Dev Preview as per Phase 2 Section 9) */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 mr-1" /> Quick Preview Personas
                </span>
                <span className="text-[10px] text-slate-400 italic">Phase 2 Preview</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickSelect('admin@aktu.ac.in', 'AdminPassword@123')}
                  className="py-1.5 px-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-700 transition text-center border border-slate-200/80"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSelect('faculty@aktu.ac.in', 'FacultyPassword@123')}
                  className="py-1.5 px-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 transition text-center border border-slate-200/80"
                >
                  Faculty
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSelect('student@aktu.ac.in', 'StudentPassword@123')}
                  className="py-1.5 px-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 transition text-center border border-slate-200/80"
                >
                  Student
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
