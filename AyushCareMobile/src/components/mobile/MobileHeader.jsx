import React from "react";
import {
  ArrowLeft,
  CircleUserRound,
  Menu,
} from "lucide-react";

import useMobileStore, {
  SCREENS,
} from "../../store/useMobileStore";
import LanguageSwitcher from "./LanguageSwitcher";

function MobileHeader({
  title,
  subtitle,
  showBack = true,
  showProfile = false,
  showMenu = false,
  onBack,
  onProfile,
  onMenu,
  rightContent,
}) {
  const {
    patient,
    prevScreen,
    setScreen,
  } = useMobileStore();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    if (typeof prevScreen === "function") {
      prevScreen();
    }
  };

  const handleProfile = () => {
    if (onProfile) {
      onProfile();
      return;
    }

    if (typeof setScreen === "function") {
      setScreen(SCREENS.PROFILE);
    }
  };

  const handleMenu = () => {
    if (onMenu) {
      onMenu();
      return;
    }

    if (typeof setScreen === "function") {
      setScreen(SCREENS.MORE);
    }
  };

  const patientName =
    patient?.name ||
    patient?.fullName ||
    "Patient";

  return (
    <header className="sticky top-0 z-40 border-b border-[#dce8e7] bg-white/98 shadow-[0_2px_12px_rgba(18,56,56,0.04)] backdrop-blur">
      <div className="mx-auto flex min-h-[66px] max-w-5xl items-center justify-between gap-3 px-3.5 py-2.5">
        {/* Left: Back Button + P2Care Brand Identity */}
        <div className="flex min-w-0 items-center gap-2.5">
          {showBack && (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Go back"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <ArrowLeft size={20} />
            </button>
          )}

          {/* P2Care Logo */}
          <div className="w-10 h-10 shrink-0 flex items-center justify-center">
            <img
              src="/ayushCareLogo.png"
              alt="P2Care Logo"
              className="w-10 h-10 object-contain"
            />
          </div>

          {/* P2Care Brand & Screen Title */}
          <div className="min-w-0">
            <strong className="block text-base sm:text-lg font-extrabold tracking-tight leading-tight">
              <span className="text-[#12383b]">P2</span>
              <span className="text-[#438b34]">Care</span>
            </strong>
            <small className="block text-[11px] font-semibold text-slate-500 truncate leading-tight mt-0.5">
              {title || subtitle || "Digital Patient Care Portal"}
            </small>
          </div>

          {/* Traditional Wisdom / Modern Care divider on tablet+ */}
          <div className="hidden md:block w-px h-7 bg-slate-200 mx-1.5 shrink-0" aria-hidden="true" />
          <div className="hidden md:flex flex-col text-[11px] font-semibold text-slate-500 leading-tight shrink-0">
            <span>Traditional Wisdom</span>
            <span>Modern Care</span>
          </div>
        </div>

        {/* Right: Language Switcher, Ayushman Bharat Badge & Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {rightContent}

          <LanguageSwitcher />

          {/* Ayushman Bharat Logo + Text */}
          <div className="flex items-center gap-1.5 pl-1 shrink-0">
            <img
              src="/ayushman-bharat-icon.png"
              alt="Ayushman Bharat"
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0"
            />
            <div className="hidden lg:flex flex-col leading-tight">
              <strong className="text-[12px] font-bold text-slate-800 leading-none">Ayushman Bharat</strong>
              <small className="text-[9.5px] font-semibold text-slate-500 mt-0.5 leading-none">Swasth Bharat</small>
            </div>
          </div>

          {(patient?.abha_number || patient?.abhaNumber || patient?.patientId) ? (
            <span className="hidden rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-800 border border-teal-200 sm:inline">
              ABHA {patient.abha_number || patient.abhaNumber || patient.patientId}
            </span>
          ) : null}

          {showProfile && (
            <button
              type="button"
              onClick={handleProfile}
              aria-label={`Open profile for ${patientName}`}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <CircleUserRound size={20} />
            </button>
          )}

          {showMenu && (
            <button
              type="button"
              onClick={handleMenu}
              aria-label="Open menu"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <Menu size={20} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default MobileHeader;