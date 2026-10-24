import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Loader2,
  MapPin,
  RefreshCw,
  Stethoscope,
} from "lucide-react";

import useMobileStore, {
  SCREENS,
} from "../../store/useMobileStore";
import { fetchTodayAppointment, fetchUpcomingAppointments, fetchPastAppointments } from "../../services/appointmentService";
import MobileHeader from "../../components/mobile/MobileHeader";
import { useLanguage, tr } from "../../i18n/translations";

function normalizeAppointmentList(value) {
  if (Array.isArray(value)) return value;

  if (Array.isArray(value?.appointments)) {
    return value.appointments;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  return [];
}

function unwrapAppointment(value) {
  if (!value) return null;

  if (value.appointment) {
    return value.appointment;
  }

  if (value.data && !Array.isArray(value.data)) {
    return value.data;
  }

  return value;
}

function getAppointmentId(appointment, index = 0) {
  return (
    appointment?.id ||
    appointment?.appointmentId ||
    appointment?.visitId ||
    `appointment-${index}`
  );
}

function getDateValue(appointment) {
  return (
    appointment?.date ||
    appointment?.appointmentDate ||
    appointment?.visitDate ||
    appointment?.scheduledDate ||
    ""
  );
}

function getTimeValue(appointment) {
  return (
    appointment?.time ||
    appointment?.appointmentTime ||
    appointment?.timeSlot ||
    appointment?.scheduledTime ||
    ""
  );
}

function formatDate(value, isHindi) {
  if (!value) {
    return isHindi ? 'तारीख उपलब्ध नहीं' : 'Date unavailable';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleDateString(
    isHindi ? 'hi-IN' : 'en-IN',
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

export default function AppointmentsScreen() {
  const {
    setScreen,
    setSelectedAppointment,
    setActiveNavTab,
    loadPortalData,
  } = useMobileStore();

  const { isHindi, tr } = useLanguage();

  const [today, setToday] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAppointments = async () => {
    setLoading(true);
    setError("");

    try {
      await loadPortalData?.();
      const [todayResult, upcomingResult, pastResult] =
        await Promise.all([
          fetchTodayAppointment(),
          fetchUpcomingAppointments(),
          fetchPastAppointments(),
        ]);

      setToday(
        unwrapAppointment(todayResult) || null
      );

      setUpcoming(
        normalizeAppointmentList(upcomingResult)
      );

      setPast(
        normalizeAppointmentList(pastResult)
      );
    } catch (loadError) {
      setError(
        loadError?.message ||
          (tr('Unable to load appointments.', 'अपॉइंटमेंट लोड नहीं हो सके।'))
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const sections = useMemo(
    () => [
      {
        id: "today",
        title: tr('Today', 'आज'),
        items: today ? [today] : [],
        highlighted: true,
      },
      {
        id: "upcoming",
        title: tr('Upcoming', 'आने वाले अपॉइंटमेंट'),
        items: upcoming,
        highlighted: false,
      },
      {
        id: "past",
        title: tr('Previous appointments', 'पिछले अपॉइंटमेंट'),
        items: past,
        highlighted: false,
      },
    ],
    [today, upcoming, past, isHindi]
  );

  const openAppointment = (appointment) => {
    if (!appointment) return;

    setSelectedAppointment({
      ...appointment,
      id:
        appointment.id ||
        appointment.appointmentId ||
        appointment.visitId,
    });

    setActiveNavTab("visits");
    setScreen(SCREENS.VISIT_DETAILS);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <MobileHeader
        title={tr('Appointments', 'अपॉइंटमेंट')}
        subtitle={
          tr('View your scheduled consultations', 'अपनी निर्धारित मुलाकातें देखें')
        }
      />

      <main className="mx-auto w-full max-w-md px-4 py-5 pb-24 sm:px-5">
        {loading ? (
          <LoadingState isHindi={isHindi} />
        ) : error ? (
          <ErrorState
            message={error}
            isHindi={isHindi}
            onRetry={loadAppointments}
          />
        ) : (
          <div className="space-y-7">
            {sections.map((section) => (
              <section key={section.id}>
                <div className="mb-3 flex items-center justify-between px-1">
                  <h2 className="text-sm font-black text-slate-800">
                    {section.title}
                  </h2>

                  <span className="text-[11px] font-semibold text-slate-400">
                    {section.items.length}
                  </span>
                </div>

                {section.items.length === 0 ? (
                  <EmptyState
                    isHindi={isHindi}
                    today={section.id === "today"}
                  />
                ) : (
                  <div className="space-y-3">
                    {section.items.map((appointment, index) => (
                      <AppointmentCard
                        key={getAppointmentId(
                          appointment,
                          index
                        )}
                        appointment={appointment}
                        highlighted={section.highlighted}
                        isHindi={isHindi}
                        onClick={() =>
                          openAppointment(appointment)
                        }
                      />
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function AppointmentCard({
  appointment,
  highlighted,
  isHindi,
  onClick,
}) {
  const doctor =
    appointment?.doctor ||
    appointment?.doctorName ||
    appointment?.physician ||
    (tr('Doctor', 'चिकित्सक'));

  const specialty =
    appointment?.specialty ||
    appointment?.department ||
    appointment?.departmentName ||
    (tr('General Medicine', 'सामान्य चिकित्सा'));

  const facility =
    appointment?.facility ||
    appointment?.hospital ||
    appointment?.hospitalName ||
    appointment?.location ||
    (tr('Healthcare facility', 'स्वास्थ्य केंद्र'));

  const date = formatDate(
    getDateValue(appointment),
    isHindi
  );

  const time =
    getTimeValue(appointment) ||
    (tr('Time unavailable', 'समय उपलब्ध नहीं'));

  const token =
    appointment?.tokenNumber ||
    appointment?.token ||
    appointment?.queueToken;

  const status =
    appointment?.status ||
    (tr('Scheduled', 'निर्धारित'));

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-3xl border bg-white p-5 text-left shadow-sm transition active:scale-[0.99] ${
        highlighted
          ? "border-teal-200 ring-2 ring-teal-50"
          : "border-slate-200"
      }`}
    >
      {highlighted && (
        <span className="mb-4 inline-flex rounded-full bg-teal-50 px-3 py-1 text-[11px] font-bold text-teal-800">
          {tr("Today's appointment", 'आज की मुलाकात')}
        </span>
      )}

      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <Stethoscope size={21} />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-black text-slate-900">
            {doctor}
          </h3>

          <p className="mt-1 truncate text-xs font-medium text-slate-500">
            {specialty}
          </p>
        </div>

        <ChevronRight
          size={19}
          className="mt-1 shrink-0 text-slate-400"
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <InfoTile
          icon={CalendarDays}
          label={tr('Date', 'तारीख')}
          value={date}
        />

        <InfoTile
          icon={Clock3}
          label={tr('Time', 'समय')}
          value={time}
        />
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <MapPin size={14} className="shrink-0" />
        <span className="truncate">{facility}</span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-[11px] font-semibold text-slate-500">
          {token
            ? `${tr('Token', 'टोकन')} #${token}`
            : status}
        </span>

        <span className="text-[11px] font-bold text-teal-800">
          {tr('View details', 'विवरण देखें')}
        </span>
      </div>
    </button>
  );
}

function InfoTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-slate-400">
        <Icon size={13} />
        <span className="text-[10px] font-semibold">
          {label}
        </span>
      </div>

      <p className="mt-1 truncate text-xs font-bold text-slate-700">
        {value}
      </p>
    </div>
  );
}

function LoadingState({ isHindi }) {
  return (
    <div className="rounded-3xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-slate-200">
      <Loader2
        size={30}
        className="mx-auto animate-spin text-teal-700"
      />

      <p className="mt-4 text-sm font-semibold text-slate-700">
        {tr('Loading appointments...', 'अपॉइंटमेंट लोड हो रहे हैं...')}
      </p>
    </div>
  );
}

function ErrorState({ message, isHindi, onRetry }) {
  return (
    <div className="rounded-3xl bg-white px-6 py-10 text-center shadow-sm ring-1 ring-red-100">
      <p className="text-sm font-semibold text-red-700">
        {message}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-bold text-white active:scale-95"
      >
        <RefreshCw size={14} />
        {tr('Try again', 'फिर प्रयास करें')}
      </button>
    </div>
  );
}

function EmptyState({ isHindi, today }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center">
      <CalendarDays
        size={28}
        className="mx-auto text-slate-300"
      />

      <p className="mt-3 text-sm font-semibold text-slate-600">
        {today
          ? tr('No appointment scheduled for today.', 'आज कोई अपॉइंटमेंट नहीं है।')
          : tr('No appointments found.', 'कोई अपॉइंटमेंट नहीं मिला।')}
      </p>
    </div>
  );
}