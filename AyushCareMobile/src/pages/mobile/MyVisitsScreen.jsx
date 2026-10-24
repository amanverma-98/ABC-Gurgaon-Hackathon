import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  Hospital,
  Loader2,
  RefreshCw,
  Stethoscope,
} from "lucide-react";

import useMobileStore, {
  SCREENS,
} from "../../store/useMobileStore";
import { fetchVisits } from "../../services/visitService";
import MobileHeader from "../../components/mobile/MobileHeader";
import { useLanguage, tr } from "../../i18n/translations";

function normalizeVisits(result) {
  if (Array.isArray(result)) return result;

  if (Array.isArray(result?.visits)) {
    return result.visits;
  }

  if (Array.isArray(result?.all)) {
    return result.all;
  }

  if (Array.isArray(result?.data)) {
    return result.data;
  }

  return [
    ...(Array.isArray(result?.past) ? result.past : []),
    ...(Array.isArray(result?.upcoming)
      ? result.upcoming
      : []),
  ];
}

function getDateValue(visit) {
  return (
    visit?.date ||
    visit?.visitDate ||
    visit?.appointmentDate ||
    visit?.scheduledDate ||
    ""
  );
}

function dateTimestamp(visit) {
  const value = getDateValue(visit);

  if (!value) return 0;

  const parsed = new Date(value).getTime();

  return Number.isNaN(parsed) ? 0 : parsed;
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

export default function MyVisitsScreen() {
  const {
    patient,
    session,
    visitFilter,
    setVisitFilter,
    setSelectedVisit,
    setScreen,
    setActiveNavTab,
    loadPortalData,
  } = useMobileStore();

  const { isHindi, tr } = useLanguage();

  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const activePatient =
    patient || session?.patient || {};

  const patientId =
    activePatient?.patientId ||
    activePatient?.id ||
    null;

  const loadVisits = async () => {
    setLoading(true);
    setError("");

    try {
      await loadPortalData?.();
      const result = await fetchVisits({
        patientId,
      });

      setVisits(normalizeVisits(result));
    } catch (loadError) {
      setError(
        loadError?.message ||
          (tr('Unable to load visit history.', 'विज़िट इतिहास लोड नहीं हो सका।'))
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVisits();
  }, [patientId]);

  const filteredVisits = useMemo(() => {
    const result = [...visits].sort(
      (a, b) => dateTimestamp(b) - dateTimestamp(a)
    );

    if (visitFilter === "PAST") {
      return result.filter((visit) =>
        isPastVisit(visit)
      );
    }

    if (visitFilter === "UPCOMING") {
      return result.filter(
        (visit) => !isPastVisit(visit)
      );
    }

    return result;
  }, [visits, visitFilter]);

  const openVisit = (visit) => {
    setSelectedVisit(visit);
    setActiveNavTab("visits");
    setScreen(SCREENS.VISIT_DETAILS);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <MobileHeader
        title={tr('My Visits', 'मेरी विज़िट')}
        subtitle={
          tr('Your healthcare encounter history', 'आपकी स्वास्थ्य मुलाकातों का इतिहास')
        }
      />

      <main className="mx-auto w-full max-w-md px-4 py-5 pb-24 sm:px-5">
        <div className="mb-5 grid grid-cols-3 gap-1.5 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200">
          <FilterButton
            active={visitFilter === "ALL"}
            onClick={() => setVisitFilter("ALL")}
          >
            {tr('All', 'सभी')}
          </FilterButton>

          <FilterButton
            active={visitFilter === "UPCOMING"}
            onClick={() =>
              setVisitFilter("UPCOMING")
            }
          >
            {tr('Upcoming', 'आने वाली')}
          </FilterButton>

          <FilterButton
            active={visitFilter === "PAST"}
            onClick={() => setVisitFilter("PAST")}
          >
            {tr('Past', 'पिछली')}
          </FilterButton>
        </div>

        {loading ? (
          <LoadingState isHindi={isHindi} />
        ) : error ? (
          <ErrorState
            message={error}
            isHindi={isHindi}
            onRetry={loadVisits}
          />
        ) : filteredVisits.length === 0 ? (
          <EmptyState
            filter={visitFilter}
            isHindi={isHindi}
          />
        ) : (
          <div className="space-y-3">
            {filteredVisits.map((visit, index) => (
              <VisitCard
                key={
                  visit?.id ||
                  visit?.visitId ||
                  `visit-${index}`
                }
                visit={visit}
                isHindi={isHindi}
                onClick={() => openVisit(visit)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function FilterButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-2 py-2.5 text-xs font-bold transition ${
        active
          ? "bg-teal-700 text-white shadow-sm"
          : "text-slate-500 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function VisitCard({ visit, isHindi, onClick }) {
  const doctor =
    visit?.doctor ||
    visit?.doctorName ||
    visit?.physician ||
    (tr('Doctor', 'चिकित्सक'));

  const department =
    visit?.department ||
    visit?.specialty ||
    visit?.departmentName ||
    (tr('General Medicine', 'सामान्य चिकित्सा'));

  const facility =
    visit?.facility ||
    visit?.hospital ||
    visit?.hospitalName ||
    (tr('Healthcare facility', 'स्वास्थ्य केंद्र'));

  const date = formatDate(
    getDateValue(visit),
    isHindi
  );

  const status =
    visit?.status ||
    (isPastVisit(visit)
      ? tr('Completed', 'पूर्ण')
      : tr('Upcoming', 'आने वाली'));

  const summary =
    visit?.summary ||
    visit?.reason ||
    visit?.chiefComplaint ||
    visit?.notes ||
    "";

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
          <Hospital size={21} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-black text-slate-900">
                {department}
              </h2>

              <p className="mt-1 truncate text-xs font-medium text-slate-500">
                {doctor}
              </p>
            </div>

            <ChevronRight
              size={18}
              className="mt-1 shrink-0 text-slate-400"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <CalendarDays
          size={15}
          className="text-slate-400"
        />

        <span className="text-xs font-semibold text-slate-600">
          {date}
        </span>

        <span
          className={`ml-auto rounded-full px-2.5 py-1 text-[10px] font-bold ${
            isPastVisit(visit)
              ? "bg-slate-100 text-slate-600"
              : "bg-teal-50 text-teal-800"
          }`}
        >
          {status}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Stethoscope
          size={14}
          className="shrink-0 text-slate-400"
        />

        <span className="truncate text-xs text-slate-500">
          {facility}
        </span>
      </div>

      {summary ? (
        <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">
          {summary}
        </p>
      ) : null}
    </button>
  );
}

function isPastVisit(visit) {
  const status = String(
    visit?.status || ""
  ).toLowerCase();

  if (
    [
      "completed",
      "closed",
      "finished",
      "past",
      "cancelled",
      "canceled",
    ].includes(status)
  ) {
    return true;
  }

  const timestamp = dateTimestamp(visit);

  return timestamp > 0 && timestamp < Date.now();
}

function LoadingState({ isHindi }) {
  return (
    <div className="rounded-3xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-slate-200">
      <Loader2
        size={30}
        className="mx-auto animate-spin text-teal-700"
      />

      <p className="mt-4 text-sm font-semibold text-slate-700">
        {tr('Loading visits...', 'विज़िट लोड हो रही हैं...')}
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

function EmptyState({ filter, isHindi }) {
  const message =
    filter === "UPCOMING"
      ? tr('No upcoming visits.', 'कोई आने वाली विज़िट नहीं है।')
      : filter === "PAST"
        ? tr('No past visits found.', 'कोई पिछली विज़िट नहीं मिली।')
        : tr('No visits found.', 'अभी कोई विज़िट नहीं मिली।');

  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center">
      <CalendarDays
        size={30}
        className="mx-auto text-slate-300"
      />

      <p className="mt-3 text-sm font-semibold text-slate-600">
        {message}
      </p>
    </div>
  );
}