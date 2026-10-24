'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/useAuthStore';
import { LiveClock } from './LiveClock';
import {
  LogOut,
  Users,
  ChevronDown,
  User,
  ShieldCheck,
  Building2,
  Mail,
  CircleDot,
  AlertTriangle,
} from 'lucide-react';

interface TopNavbarProps {
  doctorName?: string;
  doctorReg?: string;
  onToggleQueue?: () => void;
  onToggleEvidence?: () => void;
  queueCount?: number;
  evidenceCount?: number;
  isEvidenceOpen?: boolean;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  doctorName,
  doctorReg,
  onToggleQueue,
  queueCount = 0,
}) => {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeName = user?.name || doctorName || 'Attending Physician';
  const activeReg = user?.specialization
    ? `${user.specialization} · OPD Clinician`
    : doctorReg || 'Medical Officer · OPD Console';

  const initials =
    activeName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'MD';

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  const handleConfirmSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      if (typeof window !== 'undefined') {
        window.location.replace('/login');
      } else {
        router.replace('/login');
      }
    } finally {
      setIsSigningOut(false);
      setShowSignOutModal(false);
    }
  };

  return (
    <>
      <header className="h-[64px] bg-white/98 text-slate-800 px-3 sm:px-5 flex items-center justify-between shadow-[0_2px_12px_rgba(18,56,56,0.04)] shrink-0 select-none border-b border-[#dce8e7] gap-2 relative z-50">
        {/* Left Branding & Mobile Queue Toggle */}
        <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0">
          {/* Mobile/Tablet Queue Toggle Button */}
          {onToggleQueue && (
            <button
              onClick={onToggleQueue}
              className="lg:hidden p-1.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1.5 text-xs font-semibold hover:bg-teal-100 transition-colors cursor-pointer shrink-0"
              title="Toggle Patient Queue"
            >
              <Users className="w-4 h-4" />
              <span className="text-[11px] font-bold">{queueCount}</span>
            </button>
          )}

          {/* P2Care Brand Identity */}
          <div className="w-10 h-10 shrink-0 flex items-center justify-center">
            <img
              src="/ayushCareLogo.png"
              alt="P2Care Logo"
              className="w-10 h-10 object-contain"
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <strong className="text-base sm:text-lg font-extrabold tracking-tight leading-tight">
                <span className="text-[#12383b]">P2</span>
                <span className="text-[#438b34]">Care</span>
              </strong>
              <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                OPD
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-500 leading-tight hidden sm:block truncate mt-0.5">
              Doctor Clinical Workspace
            </p>
          </div>

          {/* Divider & Tagline */}
          <div className="hidden md:block w-px h-7 bg-slate-200 mx-1.5 shrink-0" aria-hidden="true" />
          <div className="hidden md:flex flex-col text-[11px] font-semibold text-slate-500 leading-tight shrink-0">
            <span>Patient to Care</span>
            <span>Without Delay</span>
          </div>
        </div>

        {/* Center Branding / Status Badge */}
        <div className="hidden xl:flex items-center px-3 py-1 bg-[#f0f9f8] border border-[#cfe3e1] rounded-full text-xs font-semibold text-teal-900 gap-1.5 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold tracking-wide">P2Care Doctor Console · Active Session</span>
        </div>

        {/* Right: Live Time, Ayushman Bharat Badge & Doctor Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Ayushman Bharat Logo + Text */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-[#f4f8f7] border border-[#dce8e7] rounded-xl shrink-0">
            <img
              src="/ayushman-bharat-icon.png"
              alt="Ayushman Bharat"
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0"
            />
            <div className="flex flex-col leading-tight">
              <strong className="text-[11.5px] font-bold text-slate-800 leading-none">Ayushman Bharat</strong>
              <small className="text-[9.5px] font-semibold text-slate-500 mt-0.5 leading-none">Swasth Bharat, Samriddh Bharat</small>
            </div>
          </div>

          {/* Live Clock Widget */}
          <LiveClock variant="light" />

          {/* Doctor Profile Dropdown Trigger */}
          <div className="relative shrink-0 z-50" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex items-center space-x-2 sm:space-x-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-100 transition-all cursor-pointer border border-[#cfe3e1] bg-[#f8fbfa] focus:outline-none focus:ring-1 focus:ring-teal-400 group"
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
            >
              {/* Circular Avatar Badge */}
              <div className="w-8 h-8 rounded-full bg-[#075e59] text-white font-bold text-xs flex items-center justify-center border border-teal-700 shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                {initials}
              </div>

              {/* Doctor Identity */}
              <div className="text-left hidden lg:block min-w-0 max-w-[170px]">
                <p className="text-xs font-bold text-slate-800 leading-none truncate">{activeName}</p>
                <p className="text-[10px] font-medium text-slate-500 leading-tight mt-0.5 truncate">{activeReg}</p>
              </div>

              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                  isDropdownOpen ? 'rotate-180 text-teal-700' : 'group-hover:text-slate-800'
                }`}
              />
            </button>

            {/* Dropdown Menu Modal */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 text-slate-800 z-[100] animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                {/* User Profile Header */}
                <div className="px-4 py-3 border-b border-slate-100 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#054444] text-[#99f6e4] font-bold text-sm flex items-center justify-center shrink-0 border border-teal-700">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{activeName}</p>
                    <p className="text-[11px] text-teal-800 font-medium truncate">{activeReg}</p>
                    {user?.email && (
                      <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span>{user.email}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Account Details & Status */}
                <div className="px-4 py-2.5 space-y-2 text-[11px] text-slate-600 bg-slate-50/70 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                      <span>Role:</span>
                    </span>
                    <span className="font-semibold text-slate-800 uppercase tracking-wide text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200">
                      {user?.role === 'doctor' ? 'OPD Physician' : user?.role || 'Clinician'}
                    </span>
                  </div>

                  {user?.hospital_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>Facility ID:</span>
                      </span>
                      <span className="font-mono font-medium text-slate-700 text-[10px]">
                        {user.hospital_id.slice(0, 12)}...
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-slate-400 flex items-center gap-1">
                      <CircleDot className="w-3 h-3 text-emerald-500" />
                      <span>Status:</span>
                    </span>
                    <span className="text-emerald-700 font-semibold text-[10px]">Online & Active</span>
                  </div>
                </div>

                {/* Logout Action Item */}
                <div className="p-1.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setShowSignOutModal(true);
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Logout from Workspace</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Doctor Sign Out Confirmation Modal Dialog */}
      {showSignOutModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 text-slate-800 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Sign Out of Workspace</h3>
                <p className="text-[11px] text-slate-500">Doctor Clinical Console</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              Are you sure you want to sign out? Your active clinical session will be securely ended and credentials cleared.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSignOutModal(false)}
                disabled={isSigningOut}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSignOut}
                disabled={isSigningOut}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSigningOut ? (
                  <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                ) : (
                  <LogOut className="w-3.5 h-3.5" />
                )}
                <span>{isSigningOut ? 'Signing out...' : 'Yes, Sign Out'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
