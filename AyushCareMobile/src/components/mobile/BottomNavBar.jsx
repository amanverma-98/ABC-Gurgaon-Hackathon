import React from "react";
import {
  FileText,
  Home,
  MoreHorizontal,
  Stethoscope,
} from "lucide-react";

import useMobileStore, {
  SCREENS,
} from "../../store/useMobileStore";

const NAV_ITEMS = [
  {
    id: "home",
    label: "Home",
    icon: Home,
    screens: [
      SCREENS.M1,
      SCREENS.M8,
    ],
  },
  {
    id: "visits",
    label: "Visits",
    icon: Stethoscope,
    screens: [
      SCREENS.VISITS,
      SCREENS.VISIT_DETAILS,
      SCREENS.APPOINTMENTS,
    ],
  },
  {
    id: "records",
    label: "Records",
    icon: FileText,
    screens: [
      SCREENS.RECORDS,
      SCREENS.DOCUMENT_DETAILS,
      SCREENS.M2,
      SCREENS.M3,
      SCREENS.M4,
      SCREENS.M5,
      SCREENS.M6,
      SCREENS.M7,
      SCREENS.M9,
    ],
  },
  {
    id: "more",
    label: "More",
    icon: MoreHorizontal,
    screens: [
      SCREENS.MORE,
      SCREENS.PRIVACY,
      SCREENS.CONSENT_DETAILS,
      SCREENS.PROFILE,
      SCREENS.SETTINGS,
      SCREENS.ABOUT,
    ],
  },
];

function getActiveSection(currentScreen) {
  const match = NAV_ITEMS.find((item) =>
    item.screens.includes(currentScreen)
  );

  return match?.id || "home";
}

function BottomNavBar() {
  const { currentScreen, setScreen } = useMobileStore();

  const activeSection = getActiveSection(currentScreen);

  const handleNavigation = (item) => {
    if (!item) return;

    const destination =
      item.id === "home"
        ? SCREENS.M1
        : item.id === "visits"
          ? SCREENS.VISITS
          : item.id === "records"
            ? SCREENS.RECORDS
            : SCREENS.MORE;

    setScreen(destination);
  };

  return (
    <nav
      aria-label="Primary navigation"
      className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-xl"
    >
      <div className="mx-auto grid max-w-5xl grid-cols-4 px-2 pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavigation(item)}
              aria-current={active ? "page" : undefined}
              className={`mobile-bottom-nav-item flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                active
                  ? "text-teal-700 font-bold"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                  active
                    ? "bg-teal-50 text-teal-700 font-bold"
                    : "bg-transparent text-slate-500"
                }`}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.4 : 1.9}
                />
              </span>

              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNavBar;