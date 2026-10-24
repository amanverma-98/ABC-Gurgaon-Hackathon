import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  ArrowLeft,
  Home,
  ShieldCheck,
  FileText,
  Clock3,
  AlertCircle,
} from "lucide-react";
import { useMobileStore } from "../../store/useMobileStore";

export default function M9_InformationSent() {
  const {
    session,
    patient,
    extractedData,
    healthSummary,
    medicalRecords,
    setScreen,
    submitToDoctor,
    sendInformationToDoctor,
    isSendingToDoctor,
  } = useMobileStore();

  const [localSending, setLocalSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const sending = Boolean(isSendingToDoctor || localSending);

  const patientName =
    patient?.name ||
    patient?.fullName ||
    session?.patientName ||
    "Patient";

  const recordCount = Array.isArray(medicalRecords)
    ? medicalRecords.length
    : extractedData
      ? 1
      : 0;

  useEffect(() => {
    if (sent) return;

    // M9 is intentionally a confirmation screen.
    // Sending is triggered explicitly by the patient below.
  }, [sent]);

  const handleSend = async () => {
    setError("");
    setLocalSending(true);

    try {
      const sender =
        typeof sendInformationToDoctor === "function"
          ? sendInformationToDoctor
          : submitToDoctor;

      if (typeof sender === "function") {
        await sender();
      }

      setSent(true);
    } catch (sendError) {
      console.error("Unable to send information:", sendError);
      setError(
        "We could not complete the handoff right now. Your uploaded information remains on this device."
      );
    } finally {
      setLocalSending(false);
    }
  };

  const handleHome = () => {
    setScreen("M1");
  };

  if (!sent) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
            <button
              type="button"
              onClick={() => setScreen("M8")}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                Final step
              </p>
              <h1 className="text-lg font-bold text-slate-900">
                Send information
              </h1>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-8">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-700">
              <ShieldCheck size={31} />
            </div>

            <div className="mt-5 text-center">
              <h2 className="text-2xl font-bold text-slate-900">
                Ready to share with your doctor?
              </h2>

              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
                Your uploaded document information is now saved to your P2Care account. You can review it and control what is shared with your healthcare team.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-700">
                  <FileText size={18} />
                  <span className="text-sm font-semibold">
                    Uploaded information
                  </span>
                </div>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  {recordCount} record{recordCount === 1 ? "" : "s"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-700">
                  <Clock3 size={18} />
                  <span className="text-sm font-semibold">
                    Visit connection
                  </span>
                </div>
                <p className="mt-2 font-bold text-slate-900">Saved to your account</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">
                Patient
              </p>
              <p className="mt-1 text-sm text-slate-600">{patientName}</p>
            </div>

            {error && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle
                    size={19}
                    className="mt-0.5 shrink-0 text-red-600"
                  />
                  <p className="text-sm leading-5 text-red-800">{error}</p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Sending securely...
                </>
              ) : (
                <>
                  <ShieldCheck size={20} />
                  Finish & Sync with Doctor
                </>
              )}
            </button>

            <p className="mt-3 text-center text-xs leading-5 text-slate-500">
              Only the information permitted by your current privacy settings
              should be made available to the healthcare team.
            </p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto flex min-h-screen max-w-2xl items-center px-4 py-10">
        <section className="w-full rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={42} />
          </div>

          <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Successfully shared
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Information sent
          </h1>

          <p className="mx-auto mt-4 max-w-lg text-[15px] leading-7 text-slate-600">
            Your uploaded medical information has been prepared for the
            healthcare team at {facilityName}.
          </p>

          <div className="mt-7 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-left">
            <div className="flex items-start gap-3">
              <ShieldCheck
                size={20}
                className="mt-0.5 shrink-0 text-emerald-700"
              />

              <div>
                <p className="font-semibold text-emerald-900">
                  Privacy reminder
                </p>
                <p className="mt-1 text-sm leading-6 text-emerald-800">
                  Your information is shared according to the visit and
                  privacy settings available in the app.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleHome}
            className="mt-7 flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white"
          >
            <Home size={19} />
            Return to Home
          </button>
        </section>
      </main>
    </div>
  );
}