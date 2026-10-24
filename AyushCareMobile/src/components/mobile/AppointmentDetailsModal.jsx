import React from "react";
import {
  CalendarDays,
  Clock3,
  MapPin,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) {
    return "Not available";
  }

  if (
    typeof value === "string" &&
    /^\d{1,2}:\d{2}/.test(value)
  ) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function AppointmentDetailsModal({
  appointment,
  isOpen = true,
  onClose,
  isHindi = false,
}) {
  if (!isOpen || !appointment) {
    return null;
  }

  const doctor =
    appointment.doctorName ||
    appointment.doctor?.name ||
    appointment.providerName ||
    "Not assigned";

  const department =
    appointment.department ||
    appointment.specialty ||
    appointment.specialisation ||
    "Not specified";

  const facility =
    appointment.hospitalName ||
    appointment.facilityName ||
    appointment.hospital ||
    appointment.facility ||
    "Not specified";

  const location =
    appointment.location ||
    appointment.address ||
    "";

  const appointmentDate =
    appointment.date ||
    appointment.appointmentDate ||
    appointment.startAt;

  const appointmentTime =
    appointment.time ||
    appointment.appointmentTime ||
    appointment.startAt;

  const status =
    appointment.status ||
    "Scheduled";

  const queueNumber =
    appointment.queueNumber ||
    appointment.tokenNumber ||
    appointment.token ||
    null;

  const labels = isHindi
    ? {
        title: "अपॉइंटमेंट विवरण",
        doctor: "डॉक्टर",
        department: "विभाग",
        facility: "अस्पताल / केंद्र",
        date: "तारीख",
        time: "समय",
        location: "स्थान",
        status: "स्थिति",
        queue: "टोकन / कतार",
        close: "बंद करें",
        unavailable: "उपलब्ध नहीं",
      }
    : {
        title: "Appointment Details",
        doctor: "Doctor",
        department: "Department",
        facility: "Hospital / Centre",
        date: "Date",
        time: "Time",
        location: "Location",
        status: "Status",
        queue: "Token / Queue",
        close: "Close",
        unavailable: "Not available",
      };

  const detailItems = [
    {
      icon: UserRound,
      label: labels.doctor,
      value: doctor,
    },
    {
      icon: Stethoscope,
      label: labels.department,
      value: department,
    },
    {
      icon: MapPin,
      label: labels.facility,
      value: facility,
    },
    {
      icon: CalendarDays,
      label: labels.date,
      value: formatDate(appointmentDate),
    },
    {
      icon: Clock3,
      label: labels.time,
      value: formatTime(appointmentTime),
    },
  ];

  if (location) {
    detailItems.push({
      icon: MapPin,
      label: labels.location,
      value: location,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={labels.title}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {labels.title}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {appointment.id ||
                appointment.appointmentId ||
                labels.unavailable}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={labels.close}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-blue-50 p-4">
            <span className="text-sm font-medium text-blue-800">
              {labels.status}
            </span>

            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700">
              {status}
            </span>
          </div>

          {queueNumber && (
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
              <span className="text-sm text-slate-500">
                {labels.queue}
              </span>

              <span className="text-lg font-bold text-slate-900">
                {queueNumber}
              </span>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {detailItems.map(
              ({
                icon: Icon,
                label,
                value,
              }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      size={17}
                      className="text-blue-600"
                    />

                    <span className="text-xs font-medium text-slate-400">
                      {label}
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-semibold leading-5 text-slate-800">
                    {value || labels.unavailable}
                  </p>
                </div>
              )
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs leading-5 text-slate-500">
              {isHindi
                ? "अपॉइंटमेंट की जानकारी आपके उपलब्ध रिकॉर्ड से दिखाई जा रही है।"
                : "Appointment information is shown from the available appointment record."}
            </p>
          </div>
        </div>

        <div className="border-t border-slate-100 p-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {labels.close}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AppointmentDetailsModal;