import React, { useEffect, useState } from "react";

import {
  ArrowLeft,
  CheckCircle2,
  Link2,
  QrCode,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

import useMobileStore, {
  SCREENS,
} from "../../store/useMobileStore";

import {
  connectMobileToKiosk,
  getMobileSessionStatus,
} from "../../services/mobileSessionService";

function KioskConnectScreen() {
  const {
    kioskSession,
    connectKioskSession,
    setScreen,
    isAuthenticated,
  } = useMobileStore();

  const [reference, setReference] =
    useState("");

  const [isConnecting, setIsConnecting] =
    useState(false);

  const [error, setError] =
    useState("");

  const existingStatus =
    getMobileSessionStatus(
      kioskSession
    );

  /* ---------------------------------------------------------------------- */
  /* AUTOMATIC QR CONNECTION                                                */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const token =
      params.get("pairing_token");

    if (
      !token ||
      existingStatus.connected ||
      isConnecting
    ) {
      return;
    }

    setReference(token);

    void connectUsingReference(token);
  }, []);

  /* ---------------------------------------------------------------------- */
  /* CONNECT                                                                */
  /* ---------------------------------------------------------------------- */

  async function connectUsingReference(
    token
  ) {
    if (!token) {
      return;
    }

    setIsConnecting(true);
    setError("");

    try {
      const result =
        await connectMobileToKiosk(
          token
        );

      if (!result?.success) {
        throw new Error(
          result?.message ||
            "Unable to connect to this kiosk."
        );
      }

      const store =
        useMobileStore.getState();

      /*
       * Store the temporary kiosk session.
       *
       * This does NOT authenticate the patient.
       */
      connectKioskSession(
        result.session,
        {
          id:
            store.patient?.id ||
            null,

          patientId:
            store.patient?.abhaNumber ||
            store.patient?.abha_number ||
            store.patient?.patientId ||
            null,

          name:
            result.session?.patient?.full_name ||
            result.kiosk?.full_name ||
            store.patient?.name ||
            null,

          abhaNumber:
            result.session?.patient?.abha_number ||
            result.kiosk?.abha_number ||
            store.patient?.abha_number ||
            store.patient?.abhaNumber ||
            null,
        }
      );

      /*
       * IMPORTANT:
       *
       * QR flow goes directly to the document
       * uploader. No Mobile Portal login.
       */
      setScreen(
        SCREENS.M2
      );

      /*
       * Remove the token from the address bar
       * only AFTER the session has been stored
       * and navigation has been requested.
       */
      window.history.replaceState(
        {},
        "",
        window.location.pathname
      );
    } catch (connectionError) {
      console.error(
        "Kiosk connection failed:",
        connectionError
      );

      setError(
        connectionError?.message ||
          "Unable to connect to this kiosk."
      );
    } finally {
      setIsConnecting(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* MANUAL CONNECTION                                                      */
  /* ---------------------------------------------------------------------- */

  const handleConnect =
    async () => {
      const value =
        reference.trim();

      if (!value) {
        setError(
          "Please scan the kiosk QR code or enter a session reference."
        );

        return;
      }

      await connectUsingReference(
        value
      );
    };

  /* ---------------------------------------------------------------------- */
  /* BACK                                                                   */
  /* ---------------------------------------------------------------------- */

  const handleBack =
    () => {
      if (isAuthenticated) {
        setScreen(
          SCREENS.M1
        );
      } else {
        setScreen(
          SCREENS.AUTH
        );
      }
    };

  /* ---------------------------------------------------------------------- */
  /* UI                                                                     */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md flex-col">

        <button
          type="button"
          onClick={handleBack}
          className="mb-6 flex w-fit items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-slate-600 hover:bg-white"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
              <QrCode
                size={42}
                strokeWidth={1.8}
              />
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">
              Connect to Kiosk
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Connecting your phone to the
              active P2Care kiosk session.
            </p>
          </div>

          {isConnecting && (
            <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-center">
              <p className="text-sm font-semibold text-blue-800">
                Connecting to kiosk...
              </p>

              <p className="mt-1 text-xs text-blue-600">
                Please wait.
              </p>
            </div>
          )}

          {existingStatus.connected && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2
                className="mt-0.5 shrink-0 text-emerald-600"
                size={20}
              />

              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Kiosk connected
                </p>

                <p className="mt-1 text-xs leading-5 text-emerald-700">
                  Opening medical document upload...
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 space-y-4">

            <div>
              <label
                htmlFor="kiosk-reference"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Kiosk session reference
              </label>

              <input
                id="kiosk-reference"
                value={reference}
                onChange={(event) =>
                  setReference(
                    event.target.value
                  )
                }
                placeholder="Scan or enter reference"
                autoComplete="off"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleConnect}
              disabled={isConnecting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Link2 size={18} />

              {isConnecting
                ? "Connecting..."
                : "Connect to Kiosk"}
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-blue-600">
                <ShieldCheck size={18} />

                <span className="text-xs font-semibold">
                  Session protected
                </span>
              </div>

              <p className="text-xs leading-5 text-slate-500">
                This temporary session is tied
                to the active kiosk visit.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-blue-600">
                <Smartphone size={18} />

                <span className="text-xs font-semibold">
                  Zero-login upload
                </span>
              </div>

              <p className="text-xs leading-5 text-slate-500">
                You can upload medical documents
                without signing into the patient portal.
              </p>
            </div>

          </div>
        </div>

        <p className="mt-5 text-center text-xs leading-5 text-slate-400">
          This connection is temporary and expires
          with the kiosk session.
        </p>

      </div>
    </div>
  );
}

export default KioskConnectScreen;