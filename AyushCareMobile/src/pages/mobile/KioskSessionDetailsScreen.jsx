import React, { useEffect } from "react";
import {
  ArrowLeft,
  Building2,
  Clock3,
  LogOut,
  MapPin,
  MonitorSmartphone,
  ShieldCheck,
} from "lucide-react";

import useMobileStore, {
  SCREENS,
} from "../../store/useMobileStore";

import {
  getMobileSessionStatus,
} from "../../services/mobileSessionService";

function formatRemainingTime(seconds) {
  const safeSeconds = Math.max(
    0,
    Number(seconds) || 0
  );

  const minutes = Math.floor(
    safeSeconds / 60
  );

  const remainingSeconds =
    safeSeconds % 60;

  return `${String(minutes).padStart(
    2,
    "0"
  )}:${String(remainingSeconds).padStart(
    2,
    "0"
  )}`;
}

function KioskSessionDetailsScreen() {
  const {
    kioskSession,
    timerSecondsRemaining,
    isSessionExpired,
    decrementTimer,
    endKioskSession,
    setScreen,
  } = useMobileStore();

  const storeRemaining =
    Number(timerSecondsRemaining);

  const serviceStatus =
    getMobileSessionStatus(
      kioskSession
    );

  const remainingSeconds =
    Number.isFinite(storeRemaining) &&
    storeRemaining >= 0
      ? storeRemaining
      : serviceStatus.remainingSeconds;

  const connected =
    kioskSession?.status ===
      "CONNECTED" &&
    !isSessionExpired &&
    serviceStatus.connected;

  useEffect(() => {
    if (!connected) {
      return undefined;
    }

    const interval = window.setInterval(
      () => {
        if (typeof decrementTimer === "function") {
          decrementTimer();
        }
      },
      1000
    );

    return () =>
      window.clearInterval(interval);
  }, [
    connected,
    decrementTimer,
  ]);

  const handleEndSession = () => {
    if (typeof endKioskSession === "function") {
      endKioskSession();
    }

    setScreen(SCREENS.M1);
  };

  const handleBack = () => {
    setScreen(SCREENS.M1);
  };

  const expired =
    isSessionExpired ||
    serviceStatus.expired ||
    kioskSession?.status === "EXPIRED" ||
    remainingSeconds <= 0;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-md">
        <button
          type="button"
          onClick={handleBack}
          className="mb-5 flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-slate-600 hover:bg-white"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <MonitorSmartphone
                    size={25}
                  />
                </div>

                <h1 className="text-xl font-bold text-slate-900">
                  Kiosk Session
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  {kioskSession?.kioskName ||
                    "Hospital OPD Kiosk"}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  expired
                    ? "bg-red-50 text-red-700"
                    : connected
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                }`}
              >
                {expired
                  ? "Expired"
                  : connected
                    ? "Connected"
                    : "Disconnected"}
              </span>
            </div>
          </div>

          <div className="space-y-3 p-6">
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
              <Building2
                className="shrink-0 text-blue-600"
                size={20}
              />

              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-400">
                  Hospital
                </p>

                <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                  {kioskSession?.hospitalName ||
                    "Civil Hospital OPD"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
              <MapPin
                className="shrink-0 text-blue-600"
                size={20}
              />

              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-400">
                  Location
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {kioskSession?.location ||
                    "Central Delhi OPD Terminal"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
              <MonitorSmartphone
                className="shrink-0 text-blue-600"
                size={20}
              />

              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-400">
                  Terminal
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {kioskSession?.terminalId ||
                    "KIOSK-DELHI-OPD-03"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
              <Building2
                className="shrink-0 text-blue-600"
                size={20}
              />

              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-400">
                  Department
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {kioskSession?.department ||
                    "General Medicine OPD"}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 p-6">
            <div
              className={`rounded-2xl p-5 ${
                expired
                  ? "bg-red-50"
                  : "bg-blue-50"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Clock3
                    className={
                      expired
                        ? "text-red-600"
                        : "text-blue-600"
                    }
                    size={22}
                  />

                  <div>
                    <p
                      className={`text-xs font-semibold ${
                        expired
                          ? "text-red-700"
                          : "text-blue-700"
                      }`}
                    >
                      {expired
                        ? "Session expired"
                        : "Session time remaining"}
                    </p>

                    <p
                      className={`mt-1 text-2xl font-bold tabular-nums ${
                        expired
                          ? "text-red-800"
                          : "text-blue-900"
                      }`}
                    >
                      {formatRemainingTime(
                        remainingSeconds
                      )}
                    </p>
                  </div>
                </div>

                <ShieldCheck
                  className={
                    expired
                      ? "text-red-400"
                      : "text-blue-400"
                  }
                  size={28}
                />
              </div>
            </div>
          </div>

          {!expired && (
            <div className="border-t border-slate-100 p-6">
              <button
                type="button"
                onClick={handleEndSession}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-5 py-3.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
              >
                <LogOut size={18} />
                End Kiosk Session
              </button>
            </div>
          )}

          {expired && (
            <div className="border-t border-slate-100 p-6">
              <button
                type="button"
                onClick={() =>
                  setScreen(SCREENS.M1)
                }
                className="w-full rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Return to Home
              </button>
            </div>
          )}
        </div>

        <p className="mt-5 text-center text-xs leading-5 text-slate-400">
          Only the temporary kiosk session reference
          is used for this connection.
        </p>
      </div>
    </div>
  );
}

export default KioskSessionDetailsScreen;