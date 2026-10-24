import React, {
  useMemo,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  FileText,
  FlaskConical,
  Pill,
  Stethoscope,
} from "lucide-react";

import useMobileStore, { SCREENS } from "../../store/useMobileStore";

export default function M7_MedicalTimeline() {
  const {
    timeline,
    medicalTimeline,
    medicalRecords,
    extractedData,
    visits,
    setScreen,
  } = useMobileStore();

  const events = useMemo(() => {
    const source =
      Array.isArray(timeline)
        ? timeline
        : Array.isArray(
              medicalTimeline,
            )
          ? medicalTimeline
          : [];

    const normalized =
      source.map(
        (item, index) =>
          normalizeEvent(
            item,
            index,
          ),
      );

    /*
     * If the current upload is not yet represented in the
     * backend/mock timeline, show a local "reviewed" event.
     * This makes the document journey visually continuous
     * without claiming that a doctor has verified it.
     */
    if (
      extractedData &&
      !normalized.some(
        (event) =>
          event.source ===
          "current-upload",
      )
    ) {
      normalized.unshift({
        id: "current-upload",
        date: new Date(),
        title:
          "Document information reviewed",
        description:
          "Information extracted from your uploaded document is ready for your review.",
        type: "document",
        source: "current-upload",
        current: true,
      });
    }

    /*
     * Add existing records when the timeline itself is empty.
     */
    if (
      normalized.length === 0 &&
      Array.isArray(
        medicalRecords,
      )
    ) {
      medicalRecords.forEach(
        (record, index) => {
          normalized.push(
            normalizeEvent(
              record,
              `record-${index}`,
            ),
          );
        },
      );
    }

    /*
     * Finally use visits as another fallback source.
     */
    if (
      normalized.length === 0 &&
      Array.isArray(visits)
    ) {
      visits.forEach(
        (visit, index) => {
          normalized.push(
            normalizeEvent(
              visit,
              `visit-${index}`,
            ),
          );
        },
      );
    }

    return normalized.sort(
      (a, b) =>
        b.date.getTime() -
        a.date.getTime(),
    );
  }, [
    timeline,
    medicalTimeline,
    medicalRecords,
    extractedData,
    visits,
  ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto min-h-screen w-full max-w-md">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <button
            type="button"
            onClick={() =>
              setScreen("M6")
            }
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft size={22} />
          </button>

          <div>
            <h1 className="text-lg font-bold">
              Medical Timeline
            </h1>

            <p className="text-xs text-slate-500">
              Your health information over time
            </p>
          </div>
        </header>

        <main className="px-5 py-6">
          <section className="mb-6 rounded-3xl border border-blue-100 bg-blue-50 p-5">
            <h2 className="text-sm font-bold text-blue-950">
              Your health journey
            </h2>

            <p className="mt-1 text-xs leading-5 text-blue-800">
              This timeline organizes information from your
              visits and uploaded documents. It is not a
              diagnosis.
            </p>
          </section>

          {events.length > 0 ? (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute bottom-5 left-[21px] top-5 w-px bg-slate-200" />

              <div className="space-y-5">
                {events.map(
                  (event) => (
                    <TimelineEvent
                      key={event.id}
                      event={event}
                      onOpen={() => {
                        if (
                          event.recordId
                        ) {
                          setScreen(
                            "DOCUMENT_DETAILS",
                          );
                        }
                      }}
                    />
                  ),
                )}
              </div>
            </div>
          ) : (
            <EmptyTimeline />
          )}

          <div className="mt-8 space-y-3 pb-28">
            <button
              type="button"
              onClick={() => setScreen(SCREENS.M8)}
              className="flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 px-5 py-3.5 font-semibold text-white shadow-sm transition hover:bg-teal-800 active:scale-[0.99]"
            >
              View AI Health Summary
              <ArrowRight size={18} />
            </button>

            <button
              type="button"
              onClick={() => setScreen(SCREENS.RECORDS)}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.99]"
            >
              Finish & View Medical Records
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

function TimelineEvent({
  event,
  onOpen,
}) {
  const Icon =
    event.type ===
    "prescription"
      ? Pill
      : event.type ===
          "lab_report"
        ? FlaskConical
        : event.type ===
            "visit"
          ? Stethoscope
          : FileText;

  return (
    <div className="relative flex gap-4">
      <div
        className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-4 border-slate-50 ${
          event.current
            ? "bg-blue-600 text-white"
            : "bg-white text-slate-600 shadow-sm"
        }`}
      >
        <Icon size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <div
          className={`rounded-3xl border bg-white p-4 shadow-sm ${
            event.current
              ? "border-blue-200"
              : "border-slate-100"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {formatDate(
                  event.date,
                )}
              </p>

              <h2 className="mt-1 text-sm font-bold">
                {event.title}
              </h2>
            </div>

            {event.recordId && (
              <button
                type="button"
                onClick={onOpen}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 active:scale-95"
                aria-label="Open record"
              >
                <ChevronRight
                  size={17}
                />
              </button>
            )}
          </div>

          {event.facility && (
            <p className="mt-2 text-xs font-medium text-slate-500">
              {event.facility}
            </p>
          )}

          {event.description && (
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {event.description}
            </p>
          )}

          {event.current && (
            <div className="mt-3 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
              Current upload
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function normalizeEvent(
  item,
  index,
) {
  const dateValue =
    item?.date ||
    item?.visitDate ||
    item?.recordDate ||
    item?.createdAt ||
    item?.appointmentDate;

  const parsedDate =
    dateValue
      ? new Date(dateValue)
      : new Date();

  const date =
    Number.isNaN(
      parsedDate.getTime(),
    )
      ? new Date()
      : parsedDate;

  const type =
    normalizeType(
      item?.type ||
        item?.documentType ||
        item?.category,
    );

  return {
    id:
      item?.id ||
      item?.visitId ||
      item?.documentId ||
      `timeline-${index}`,

    recordId:
      item?.documentId ||
      item?.recordId ||
      (
        type !== "visit"
          ? item?.id
          : null
      ),

    date,

    title:
      item?.title ||
      item?.name ||
      item?.event ||
      item?.documentTitle ||
      item?.doctorName ||
      (
        type ===
        "visit"
          ? "Healthcare visit"
          : "Medical record"
      ),

    description:
      item?.description ||
      item?.summary ||
      item?.reason ||
      item?.notes ||
      item?.diagnosis ||
      "",

    facility:
      item?.facility ||
      item?.hospital ||
      item?.location ||
      "",

    type,
    source: "state",
    current: false,
  };
}

function normalizeType(
  type,
) {
  const value = String(
    type || "",
  ).toLowerCase();

  if (
    value.includes(
      "prescription",
    ) ||
    value.includes(
      "medicine",
    )
  ) {
    return "prescription";
  }

  if (
    value.includes("lab") ||
    value.includes(
      "test",
    )
  ) {
    return "lab_report";
  }

  if (
    value.includes(
      "visit",
    ) ||
    value.includes(
      "consult",
    )
  ) {
    return "visit";
  }

  return "document";
}

function formatDate(
  date,
) {
  return date.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );
}

function EmptyTimeline() {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
      <CalendarDays
        size={32}
        className="mx-auto mb-3 text-slate-300"
      />

      <h2 className="text-sm font-bold">
        Timeline is empty
      </h2>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        Your visits and medical records will appear here
        as information becomes available.
      </p>
    </div>
  );
}