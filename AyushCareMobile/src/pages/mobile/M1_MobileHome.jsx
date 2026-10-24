import React, {
  useEffect,
} from "react";

import {
  UploadCloud,
  FileHeart,
  ShieldCheck,
  ChevronRight,
  CalendarDays,
  Stethoscope,
  FileText,
  Activity,
  Heart,
  Droplets,
  Thermometer,
  Clock3,
  Building2,
} from "lucide-react";

import useMobileStore, {
  SCREENS,
} from "../../store/useMobileStore";


import MobileHeader from "../../components/mobile/MobileHeader";
import AppointmentDetailsModal from "../../components/mobile/AppointmentDetailsModal";

import { useLanguage } from "../../i18n/translations";

/* ========================================================================== */
/* HELPERS                                                                    */
/* ========================================================================== */

const getLatestItem = (
  items
) => {
  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return null;
  }

  return items[0];
};

const formatDateTimeCaption = (rawTimestamp, isHindi) => {
  if (!rawTimestamp) return null;
  try {
    const d = new Date(rawTimestamp);
    if (isNaN(d.getTime())) return null;
    const datePart = d.toLocaleDateString(isHindi ? 'hi-IN' : 'en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timePart = d.toLocaleTimeString(isHindi ? 'hi-IN' : 'en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return { datePart, timePart, full: `${datePart}, ${timePart}` };
  } catch {
    return null;
  }
};

const formatTimer = (
  seconds
) => {
  const safeSeconds =
    Math.max(
      0,
      Number(seconds) || 0
    );

  const mins =
    Math.floor(
      safeSeconds / 60
    );

  const secs =
    safeSeconds % 60;

  return `${String(
    mins
  ).padStart(
    2,
    "0"
  )}:${String(
    secs
  ).padStart(
    2,
    "0"
  )}`;
};

/* ========================================================================== */
/* HOME                                                                       */
/* ========================================================================== */

export const M1_MobileHome =
  () => {
    const {
      patient,
      session,

      appointments,
      visits,
      latestVisit: storeLatestVisit,
      medicalRecords,
      vitals,
      loadPortalData,

      setScreen,
      setActiveNavTab,

      setSelectedAppointment,
      setSelectedVisit,
      setSelectedMedicalRecord,
    } = useMobileStore();

    const {
      t,
      tr,
      isHindi,
    } = useLanguage();

    // Ensure latest portal data (vitals, visits, documents) is loaded on mount
    useEffect(() => {
      loadPortalData?.();
    }, [loadPortalData]);

    /* ---------------------------------------------------------------------- */
    /* PATIENT                                                                 */
    /* ---------------------------------------------------------------------- */

    const resolvedPatient =
      patient ||
      session?.patient ||
      {};

    const displayName =
      isHindi
        ? resolvedPatient.hindiName ||
          resolvedPatient.name ||
          "मरीज़"
        : resolvedPatient.name ||
          "Patient";

    /* ---------------------------------------------------------------------- */
    /* APPOINTMENT                                                             */
    /* ---------------------------------------------------------------------- */

    const todayAppointment =
      getLatestItem(
        appointments
      ) ||
      null ||
      null;

    const openAppointment =
      () => {
        if (
          !todayAppointment
        ) {
          setScreen(
            SCREENS.APPOINTMENTS
          );
          return;
        }

        setSelectedAppointment(
          todayAppointment
        );
      };

    /* ---------------------------------------------------------------------- */
    /* VISIT                                                                   */
    /* ---------------------------------------------------------------------- */

    const latestVisit =
      (Array.isArray(visits) && visits.length > 0)
        ? visits[0]
        : (storeLatestVisit || null);

    const visitRawDate =
      latestVisit?.created_at ||
      latestVisit?.createdAt ||
      latestVisit?.date ||
      null;
    const visitDateTime = formatDateTimeCaption(visitRawDate, isHindi);
    const visitDoctor =
      latestVisit?.doctor_name ||
      latestVisit?.doctorName ||
      latestVisit?.doctor ||
      latestVisit?.physician ||
      (isHindi ? "चिकित्सक" : "General OPD Doctor");
    const visitDepartment =
      latestVisit?.department_name ||
      latestVisit?.departmentName ||
      latestVisit?.department ||
      latestVisit?.specialty ||
      (isHindi ? "सामान्य चिकित्सा" : "General Medicine");
    const visitHospital =
      latestVisit?.hospital_name ||
      latestVisit?.hospitalName ||
      latestVisit?.hospital ||
      latestVisit?.facility ||
      (isHindi ? "आयुषकेयर अस्पताल" : "P2Care Hospital");
    const visitToken =
      latestVisit?.token_number ||
      latestVisit?.tokenNumber ||
      null;
    const visitStatus =
      latestVisit?.status ||
      "completed";

    const activeVitals =
      vitals ||
      latestVisit?.vitals ||
      appointments?.[0]?.vitals ||
      null;

    const vitalsTimestamp =
      activeVitals?.recorded_at ||
      activeVitals?.recordedAt ||
      activeVitals?.created_at ||
      activeVitals?.timestamp ||
      null;
    const vitalsDateTime = formatDateTimeCaption(vitalsTimestamp, isHindi);

    const openVisit =
      () => {
        if (!latestVisit) {
          setScreen(
            SCREENS.VISITS
          );
          return;
        }

        setSelectedVisit(
          latestVisit
        );

        setScreen(
          SCREENS.VISIT_DETAILS
        );
      };

    /* ---------------------------------------------------------------------- */
    /* RECORDS / DOCUMENTS                                                     */
    /* ---------------------------------------------------------------------- */

    const recentDocs =
      Array.isArray(medicalRecords)
        ? medicalRecords.slice(0, 3)
        : [];

    const latestRecord =
      recentDocs[0] ||
      getLatestItem(medicalRecords);

    const openRecord =
      (docToOpen) => {
        const target = docToOpen || latestRecord;
        if (!target) {
          setScreen(
            SCREENS.RECORDS
          );
          return;
        }

        setSelectedMedicalRecord(
          target
        );

        setScreen(
          SCREENS.DOCUMENT_DETAILS
        );
      };

    /* ---------------------------------------------------------------------- */
    /* NAVIGATION HELPERS                                                      */
    /* ---------------------------------------------------------------------- */

    const goHome =
      () => {
        setActiveNavTab(
          "home"
        );

        setScreen(
          SCREENS.M1
        );
      };

    const goVisits =
      () => {
        setActiveNavTab(
          "visits"
        );

        setScreen(
          SCREENS.VISITS
        );
      };

    const goRecords =
      () => {
        setActiveNavTab(
          "records"
        );

        setScreen(
          SCREENS.RECORDS
        );
      };

    const goAppointments =
      () => {
        setActiveNavTab(
          "visits"
        );

        setScreen(
          SCREENS.APPOINTMENTS
        );
      };

    const startUpload =
      () => {
        /*
         * M2 starts a NEW upload document.
         *
         * The store's documentDraft is
         * cleared/created by the document
         * workflow itself.
         */
        setScreen(
          SCREENS.M2
        );
      };

    /* ---------------------------------------------------------------------- */
    /* RENDER                                                                  */
    /* ---------------------------------------------------------------------- */

    return (
      <div className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <MobileHeader
          showBack={false}
        />

        <main
          className="
            flex-1
            w-full
            max-w-md
            md:max-w-3xl
            lg:max-w-4xl
            mx-auto
            px-4
            sm:px-6
            py-4
            sm:py-6
            space-y-5
          "
        >
          {/* ================================================================ */
          /* PATIENT GREETING                                                  */
          /* ================================================================ */}

          <section
            aria-label={
              tr('Patient information', 'रोगी जानकारी')
            }
            className="
              flex
              items-center
              justify-between
              gap-3
              px-1
            "
          >
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">
                {t(
                  "home_welcome_back"
                )}
              </p>

              <h1
                className="
                  text-xl
                  sm:text-2xl
                  font-black
                  text-slate-900
                  leading-tight
                  truncate
                "
              >
                {displayName}
              </h1>
            </div>

            <div className="shrink-0 text-right">
              <span
                className="
                  text-[11px]
                  font-bold
                  text-teal-800
                  bg-teal-50
                  px-2.5
                  py-1
                  rounded-full
                  border
                  border-teal-200
                  inline-block
                "
              >
                {tr('ABHA:', 'आभा:')}{" "}
                {resolvedPatient.abhaNumber ||
                  (
                    tr('Not Linked', 'उपलब्ध नहीं')
                  )}
              </span>
            </div>
          </section>
          {/* ================================================================ */}
          {/* TODAY'S APPOINTMENT                                               */}
          {/* ================================================================ */}

          {todayAppointment && (
            <section
              aria-label={
                tr("Today's appointment", 'आज की अपॉइंटमेंट')
              }
              className="
                p-4
                sm:p-5
                rounded-3xl
                bg-teal-900
                text-white
                shadow-md
                space-y-4
              "
            >
              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-2
                  border-b
                  border-white/15
                  pb-3
                "
              >
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-teal-300" />

                  <span className="text-xs font-bold uppercase tracking-wider text-teal-200">
                    {t(
                      "home_today_consultation"
                    )}
                  </span>
                </div>

                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 px-2.5 py-0.5 rounded-full">
                  {t(
                    "home_in_queue"
                  )}
                </span>
              </div>

              <div
                className="
                  flex
                  items-start
                  justify-between
                  gap-3
                "
              >
                <div>
                  <p className="text-[10px] font-bold text-teal-200 uppercase tracking-wide">
                    {t(
                      "home_your_opd_token"
                    )}
                  </p>

                  <p className="text-3xl font-black font-mono tracking-tight">
                    {todayAppointment.tokenNumber ||
                      "—"}
                  </p>

                  <p className="text-sm font-bold text-teal-100 mt-1">
                    {isHindi
                      ? todayAppointment.hindiDoctorName ||
                        todayAppointment.doctorName ||
                        "डॉक्टर"
                      : todayAppointment.doctorName ||
                        "Doctor"}
                  </p>

                  <p className="text-xs text-teal-200/80">
                    {isHindi
                      ? todayAppointment.hindiSpecialty ||
                        todayAppointment.specialty ||
                        "चिकित्सा"
                      : todayAppointment.specialty ||
                        "General Medicine"}
                  </p>
                </div>

                <div className="text-right shrink-0 bg-white/10 p-3 rounded-2xl border border-white/10">
                  <p className="text-[10px] font-bold text-teal-200 uppercase">
                    {t(
                      "home_room_no"
                    )}
                  </p>

                  <p className="text-base font-black">
                    {todayAppointment.room ||
                      "—"}
                  </p>

                  <p className="text-[10px] text-teal-200 mt-0.5">
                    {todayAppointment.timeSlot ||
                      "Today"}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-amber-300" />

                  <span className="font-semibold">
                    {todayAppointment.queuePosition ||
                      0}{" "}
                    {t(
                      "home_patients_ahead"
                    )}
                  </span>
                </div>

                <span className="text-teal-200 font-bold">
                  {t(
                    "home_estimated_wait"
                  )}{" "}
                  ~
                  {todayAppointment.estimatedWaitTime ||
                    "—"}
                </span>
              </div>

              <button
                type="button"
                onClick={
                  openAppointment
                }
                className="
                  w-full
                  h-11
                  rounded-2xl
                  bg-white
                  text-teal-950
                  font-bold
                  text-xs
                  flex
                  items-center
                  justify-center
                  gap-1.5
                  hover:bg-teal-50
                  active:scale-[0.99]
                "
              >
                {t(
                  "home_btn_view_apt_details"
                )}

                <ChevronRight className="w-4 h-4" />
              </button>
            </section>
          )}

          {/* ================================================================ */}
          {/* RECORDED VITALS (KIOSK INTAKE & CLINICAL READINGS)               */}
          {/* ================================================================ */}
          <section
            aria-label={tr("Recorded Vitals", "दर्ज वाइटल्स (शारीरिक माप)")}
            className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-3.5"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 leading-tight">
                    {tr("Vital Signs", "शारीरिक माप (वाइटल्स)")}
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {activeVitals?.source === "manual" || activeVitals?.recorded_at
                      ? tr("Recorded at Hospital Kiosk", "कियोस्क जांच में दर्ज")
                      : tr("Intake Readings", "प्रवेश के समय दर्ज माप")}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                {activeVitals ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {tr("Verified", "सत्यापित")}
                  </span>
                ) : null}
                {vitalsDateTime ? (
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center justify-end gap-1">
                    <Clock3 className="w-3 h-3 text-slate-400" />
                    <span>{vitalsDateTime.full}</span>
                  </p>
                ) : null}
              </div>
            </div>

            {activeVitals ? (
              <div className="space-y-3">
                {/* Vitals Feed Date & Time Banner / Caption */}
                {vitalsDateTime && (
                  <div className="flex items-center justify-between rounded-xl bg-slate-50/90 px-3 py-1.5 border border-slate-150 text-[11px] text-slate-600">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock3 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                      <span>{tr("Feed recorded on:", "माप दर्ज समय:")}</span>
                      <span className="font-bold text-slate-800">{vitalsDateTime.full}</span>
                    </span>
                    {activeVitals?.source && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {activeVitals.source === "manual" ? tr("Kiosk Sensor", "कियोस्क सेंसर") : activeVitals.source}
                      </span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Pulse / Heart Rate */}
                  <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-100 flex flex-col justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                        <Heart className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-rose-800 truncate">
                          {tr("Pulse / Heart Rate", "नाड़ी / पल्स")}
                        </p>
                        <p className="text-base font-black text-slate-900 leading-tight">
                          {activeVitals.pulse ? `${activeVitals.pulse} bpm` : "—"}
                        </p>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 pt-1 border-t border-rose-100/60 flex items-center justify-between">
                      <span>{tr("Range: 60-100", "सीमा: 60-100")}</span>
                      {vitalsDateTime && <span className="text-slate-400 font-medium">{vitalsDateTime.timePart}</span>}
                    </p>
                  </div>

                  {/* Oxygen Saturation (SpO2) */}
                  <div className="p-3 rounded-2xl bg-sky-50/60 border border-sky-100 flex flex-col justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                        <Droplets className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-sky-800 truncate">
                          {tr("SpO₂ Oxygen", "ऑक्सीजन SpO₂")}
                        </p>
                        <p className="text-base font-black text-slate-900 leading-tight">
                          {activeVitals.spo2 ? `${activeVitals.spo2}%` : "—"}
                        </p>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 pt-1 border-t border-sky-100/60 flex items-center justify-between">
                      <span>{tr("Normal: ≥95%", "सामान्य: ≥95%")}</span>
                      {vitalsDateTime && <span className="text-slate-400 font-medium">{vitalsDateTime.timePart}</span>}
                    </p>
                  </div>

                  {/* Blood Pressure */}
                  <div className="p-3 rounded-2xl bg-teal-50/60 border border-teal-100 flex flex-col justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800 truncate">
                          {tr("Blood Pressure", "रक्तचाप (BP)")}
                        </p>
                        <p className="text-base font-black text-slate-900 leading-tight">
                          {activeVitals.systolic && activeVitals.diastolic
                            ? `${activeVitals.systolic}/${activeVitals.diastolic}`
                            : activeVitals.systolic || activeVitals.diastolic || "—"}{" "}
                          <span className="text-[10px] font-medium text-slate-500">mmHg</span>
                        </p>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 pt-1 border-t border-teal-100/60 flex items-center justify-between">
                      <span>{tr("Standard: 120/80", "मानक: 120/80")}</span>
                      {vitalsDateTime && <span className="text-slate-400 font-medium">{vitalsDateTime.timePart}</span>}
                    </p>
                  </div>

                  {/* Temperature */}
                  <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-100 flex flex-col justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                        <Thermometer className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 truncate">
                          {tr("Temperature", "तापमान")}
                        </p>
                        <p className="text-base font-black text-slate-900 leading-tight">
                          {activeVitals.temperature ? `${activeVitals.temperature} °F` : "—"}
                        </p>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 pt-1 border-t border-amber-100/60 flex items-center justify-between">
                      <span>{tr("Normal: 98.6 °F", "सामान्य: 98.6 °F")}</span>
                      {vitalsDateTime && <span className="text-slate-400 font-medium">{vitalsDateTime.timePart}</span>}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center">
                <p className="text-xs font-semibold text-slate-600">
                  {tr("No vitals recorded yet", "अभी कोई वाइटल्स दर्ज नहीं हैं")}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {tr("When you take vitals at the hospital kiosk, your pulse & SpO₂ will appear here.", "अस्पताल कियोस्क पर ली गई पल्स और SpO₂ रीडिंग यहां दिखाई देगी।")}
                </p>
              </div>
            )}
          </section>

          {/* ================================================================ */}
          {/* RECENT VISIT                                                      */}
          {/* ================================================================ */}

          <section
            aria-label={
              tr('Recent visit', 'हाल की मुलाकात')
            }
            className="
              p-4
              sm:p-5
              rounded-3xl
              bg-white
              border
              border-slate-200
              shadow-sm
              space-y-3
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                border-b
                border-slate-100
                pb-2.5
              "
            >
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-teal-800" />

                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  {t(
                    "home_recent_visit"
                  )}
                </h2>
              </div>

              <button
                type="button"
                onClick={
                  goVisits
                }
                className="text-xs font-bold text-teal-800 hover:text-teal-950"
              >
                {t(
                  "home_all_visits"
                )}
              </button>
            </div>

            {latestVisit ? (
              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-100/70 text-teal-900 px-2 py-0.5 rounded-md">
                      {visitDepartment}
                    </span>
                    {visitToken && (
                      <span className="text-[10px] font-black uppercase tracking-wider bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-md">
                        {tr("Token", "टोकन")} #{visitToken}
                      </span>
                    )}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 uppercase">
                      {visitStatus === 'complete' || visitStatus === 'completed'
                        ? tr("Completed", "पूर्ण")
                        : visitStatus}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 truncate">
                    {visitDoctor}
                  </h3>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium flex-wrap">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[200px]">{visitHospital}</span>
                    </span>

                    {visitDateTime && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <Clock3 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{visitDateTime.full}</span>
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    openVisit
                  }
                  className="
                    px-3.5
                    py-2.5
                    rounded-xl
                    bg-teal-50
                    hover:bg-teal-100
                    text-teal-800
                    font-bold
                    text-xs
                    flex
                    items-center
                    justify-center
                    gap-1.5
                    border
                    border-teal-200
                    shrink-0
                    transition
                  "
                >
                  {t(
                    "view_details"
                  )}

                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={
                  goVisits
                }
                className="
                  w-full
                  p-3.5
                  rounded-2xl
                  bg-slate-50
                  text-left
                  text-sm
                  text-slate-600
                  font-medium
                  hover:bg-slate-100
                  transition
                "
              >
                {tr('View your previous visits', 'अपनी पिछली मुलाकातें देखें')}
              </button>
            )}
          </section>

          {/* ================================================================ */}
          {/* RECENT DOCUMENTS (LAST 3 UPLOADED DOCUMENTS)                      */}
          {/* ================================================================ */}

          <section
            aria-label={
              tr('Recent documents', 'हालिया दस्तावेज़')
            }
            className="
              p-4
              sm:p-5
              rounded-3xl
              bg-white
              border
              border-slate-200
              shadow-sm
              space-y-3
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                border-b
                border-slate-100
                pb-2.5
              "
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-800" />

                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  {tr('Recent Documents', 'हालिया दस्तावेज़')}
                </h2>
              </div>

              <button
                type="button"
                onClick={
                  goRecords
                }
                className="text-xs font-bold text-teal-800 hover:text-teal-950"
              >
                {tr('All Records →', 'सभी रिकॉर्ड्स →')}
              </button>
            </div>

            {recentDocs.length > 0 ? (
              <div className="space-y-2.5">
                {recentDocs.map((record, index) => {
                  const docDate = formatDateTimeCaption(
                    record.uploadedAt || record.createdAt || record.created_at || record.date,
                    isHindi
                  );
                  const docType = record.typeLabel || (
                    record.document_type
                      ? record.document_type.replace(/_/g, ' ')
                      : tr('Medical Record', 'चिकित्सीय रिकॉर्ड')
                  );
                  const status = String(record.status || 'PROCESSED').toUpperCase();

                  return (
                    <div
                      key={record.id || record.documentId || `doc-${index}`}
                      onClick={() => openRecord(record)}
                      className="p-3 rounded-2xl bg-slate-50/70 hover:bg-teal-50/50 border border-slate-200/80 transition flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 border border-teal-100 text-teal-700 group-hover:bg-teal-100 transition">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wide bg-teal-100/60 text-teal-800 px-2 py-0.5 rounded-md">
                              {docType}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              status === 'PROCESSED' || status === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                                : 'bg-amber-50 text-amber-700 border-amber-200/60'
                            }`}>
                              {status}
                            </span>
                          </div>
                          <h3 className="text-xs sm:text-sm font-black text-slate-800 truncate mt-1 group-hover:text-teal-900 transition">
                            {record.title || record.fileName || (tr('Medical document', 'चिकित्सीय दस्तावेज़'))}
                          </h3>
                          {docDate && (
                            <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                              <Clock3 className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{docDate.full}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openRecord(record);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-teal-100 text-teal-800 font-bold text-xs flex items-center gap-1 border border-teal-200 shrink-0 shadow-2xs transition"
                      >
                        {t("view_details")}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}

                {medicalRecords.length > 3 && (
                  <button
                    type="button"
                    onClick={goRecords}
                    className="w-full py-2 text-center text-xs font-bold text-teal-800 hover:text-teal-950 flex items-center justify-center gap-1 transition"
                  >
                    {tr(`View all ${medicalRecords.length} documents`, `सभी ${medicalRecords.length} दस्तावेज़ देखें`)}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center space-y-2">
                <p className="text-xs font-semibold text-slate-600">
                  {tr("No medical documents uploaded yet", "अभी तक कोई मेडिकल दस्तावेज़ अपलोड नहीं किया गया")}
                </p>
                <p className="text-[11px] text-slate-400">
                  {tr("Upload your prescriptions, lab reports, or discharge summaries.", "अपने पर्चे, लैब रिपोर्ट या डिस्चार्ज सारांश अपलोड करें।")}
                </p>
                <button
                  type="button"
                  onClick={startUpload}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-800 text-white font-bold text-xs shadow-sm hover:bg-teal-900 transition"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  {tr("Upload Document", "दस्तावेज़ अपलोड करें")}
                </button>
              </div>
            )}
          </section>

          {/* ================================================================ */
          /* QUICK ACTIONS                                                     */
          /* ================================================================ */}

          <section
            aria-label={
              tr('Quick actions', 'त्वरित कार्य')
            }
            className="space-y-3"
          >
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {t(
                  "home_quick_actions"
                )}
              </h2>

              <button
                type="button"
                onClick={
                  goAppointments
                }
                className="text-xs font-bold text-teal-800 hover:text-teal-950"
              >
                {tr('Appointments →', 'अपॉइंटमेंट →')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Upload */}
              <button
                type="button"
                onClick={
                  startUpload
                }
                className="
                  w-full
                  p-4
                  sm:p-5
                  rounded-3xl
                  border-2
                  border-teal-700
                  bg-white
                  hover:bg-teal-50
                  shadow-sm
                  text-left
                  flex
                  items-start
                  justify-between
                  gap-3
                  group
                  active:scale-[0.99]
                "
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className="
                      w-12
                      h-12
                      rounded-2xl
                      bg-teal-50
                      text-teal-800
                      flex
                      items-center
                      justify-center
                      shrink-0
                      group-hover:bg-teal-800
                      group-hover:text-white
                    "
                  >
                    <UploadCloud className="w-6 h-6" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900">
                      {t(
                        "home_upload_docs"
                      )}
                    </h3>

                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {t(
                        "home_upload_docs_sub"
                      )}
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 mt-3" />
              </button>

              {/* Health Summary */}
              <button
                type="button"
                onClick={() =>
                  setScreen(
                    SCREENS.M8
                  )
                }
                className="
                  w-full
                  p-4
                  sm:p-5
                  rounded-3xl
                  border
                  border-slate-200
                  bg-white
                  hover:bg-slate-50
                  shadow-sm
                  text-left
                  flex
                  items-start
                  justify-between
                  gap-3
                  active:scale-[0.99]
                "
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <FileHeart className="w-6 h-6" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900">
                      {t(
                        "home_health_summary"
                      )}
                    </h3>

                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {t(
                        "home_health_summary_sub"
                      )}
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 mt-3" />
              </button>
            </div>
          </section>

          {/* ================================================================ */
          /* PRIVACY / SAFETY                                                  */
          /* ================================================================ */}

          <div
            className="
              p-3
              rounded-2xl
              bg-slate-100
              border
              border-slate-200
              flex
              items-start
              gap-2.5
              text-xs
              text-slate-600
            "
          >
            <ShieldCheck className="w-4 h-4 text-teal-800 shrink-0 mt-0.5" />

            <p className="leading-snug">
              {tr('Your documents and health information remain under your control. Check your privacy settings before sharing.', 'आपके दस्तावेज़ और स्वास्थ्य जानकारी आपके नियंत्रण में हैं। साझा करने से पहले अपनी गोपनीयता सेटिंग जांचें।')}
            </p>
          </div>
        </main>



        {/* ================================================================== */
        /* APPOINTMENT MODAL                                                    */
        /* ================================================================== */}

        <AppointmentDetailsModal />
      </div>
    );
  };

export default M1_MobileHome;