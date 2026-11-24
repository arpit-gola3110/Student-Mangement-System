import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Avatar from '../common/Avatar';
import Badge from '../common/Badge';
import {
  Menu,
  Bell,
  Search,
  LogOut,
  User,
  CheckCircle2,
  Sparkles,
  ChevronDown
} from 'lucide-react';

export const Topbar = ({ onOpenMobileMenu }) => {
  const { user, logout, switchPreviewRole } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);

  const role = user?.role || 'ADMIN';
  const displayName = user?.profile?.firstName
    ? `${user.profile.firstName} ${user.profile.lastName}`
    : user?.email || 'User';

  const handleRoleSwitch = (newRole) => {
    switchPreviewRole(newRole);
    setRoleSwitcherOpen(false);
    showToast(`Switched active UI preview to ${newRole} mode`, 'info');
    if (newRole === 'ADMIN') navigate('/admin/dashboard');
    else if (newRole === 'FACULTY') navigate('/faculty/dashboard');
    else navigate('/student/dashboard');
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
    showToast('Signed out successfully', 'info');
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shadow-subtle">
      {/* Left: Mobile hamburger & Institutional branding */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center space-x-2">
          <span className="text-xs font-semibold px-2.5 py-1 bg-brand-50 text-brand-700 border border-brand-200 rounded-full">
            AKTU BCS 554 • 2026–27
          </span>
        </div>
      </div>

      {/* Right: Quick Role Preview Switcher, Notifications & User Avatar Menu */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Development Role Preview Switcher (As required by Phase 2 Prompt Section 9) */}
        <div className="relative">
          <button
            onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition border border-slate-200"
            title="Development UI Role Switcher"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden md:inline text-slate-500">Preview:</span>
            <span className="text-brand-700 uppercase font-bold">{role}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {roleSwitcherOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white shadow-dropdown border border-slate-200 py-1.5 z-50 animate-in fade-in-50">
              <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Dev UI Role Switcher
              </div>
              {['ADMIN', 'FACULTY', 'STUDENT'].map((r) => (
                <button
                  key={r}
                  onClick={() => handleRoleSwitch(r)}
                  className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between hover:bg-slate-50 transition ${
                    role === r ? 'text-brand-600 bg-brand-50/50' : 'text-slate-700'
                  }`}
                >
                  <span>{r} Dashboard</span>
                  {role === r && <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <button
          onClick={() => showToast('No new academic notifications at this time', 'info')}
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition relative"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-600 rounded-full ring-2 ring-white" />
        </button>

        <div className="h-6 w-px bg-slate-200" />

        {/* Profile Avatar & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="flex items-center space-x-2.5 p-1 rounded-xl hover:bg-slate-100 transition focus:outline-none"
          >
            <Avatar name={displayName} size="md" status="online" />
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[140px]">
                {displayName}
              </p>
              <Badge variant={role === 'ADMIN' ? 'primary' : role === 'FACULTY' ? 'success' : 'info'} size="sm" className="mt-0.5">
                {role}
              </Badge>
            </div>
          </button>

          {profileMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-modal border border-slate-200 py-2 z-50 animate-in fade-in-50">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{displayName}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setProfileMenuOpen(false);
                    showToast('Opening user profile drawer', 'info');
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center"
                >
                  <User className="w-4 h-4 mr-2.5 text-slate-400" /> My Profile
                </button>
              </div>

              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center"
                >
                  <LogOut className="w-4 h-4 mr-2.5 text-rose-500" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
