import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Avatar from '../common/Avatar';
import Badge from '../common/Badge';
import {
  Menu,
  Bell,
  LogOut,
  User
} from 'lucide-react';

export const Topbar = ({ onOpenMobileMenu }) => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const role = (user?.role || 'student').toLowerCase();
  const roleLabel = role.toUpperCase();
  const displayName = user?.profile?.firstName
    ? `${user.profile.firstName} ${user.profile.lastName}`
    : user?.email || 'User';

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setProfileMenuOpen(false);
    try {
      await logout();
      showToast('Signed out successfully', 'info');
      navigate('/login', { replace: true });
    } finally {
      setIsSigningOut(false);
    }
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

      {/* Right: Notifications & User Avatar Menu */}
      <div className="flex items-center space-x-3 sm:space-x-4">
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
              <Badge variant={role === 'admin' ? 'primary' : role === 'faculty' ? 'success' : 'info'} size="sm" className="mt-0.5">
                {roleLabel}
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
                    showToast('Signed in as ' + roleLabel, 'info');
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center"
                >
                  <User className="w-4 h-4 mr-2.5 text-slate-400" /> My Profile
                </button>
              </div>

              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4 mr-2.5 text-rose-500" /> {isSigningOut ? 'Signing Out...' : 'Sign Out'}
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
