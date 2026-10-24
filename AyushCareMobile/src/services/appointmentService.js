import { getPortalVisits, getPortalDashboard } from "./portalService";

function normalizeAppointment(consultation = {}) {
  const isComplete = ["complete", "completed", "cancelled"].includes(String(consultation.status || "").toLowerCase());
  const createdDate = consultation.created_at || consultation.date || "";
  const time = createdDate ? new Date(createdDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Morning OPD";
  return {
    ...consultation,
    id: consultation.id,
    appointmentId: consultation.id,
    date: createdDate,
    appointmentDate: createdDate,
    time: time,
    appointmentTime: time,
    doctor: consultation.doctor_name || consultation.doctor || "AyushCare Medical Officer",
    doctorName: consultation.doctor_name || consultation.doctor || "AyushCare Medical Officer",
    department: consultation.department_name || consultation.department || "General Medicine",
    departmentName: consultation.department_name || consultation.department || "General Medicine",
    specialty: consultation.department_name || consultation.department || "General Medicine",
    facility: consultation.hospital_name || consultation.facility || "AyushCare Center",
    hospital: consultation.hospital_name || consultation.facility || "AyushCare Center",
    hospitalName: consultation.hospital_name || consultation.facility || "AyushCare Center",
    tokenNumber: consultation.token_number || null,
    token: consultation.token_number || null,
    status: isComplete ? "Completed" : "Scheduled",
  };
}

export async function fetchAppointments() {
  try {
    const raw = await getPortalVisits();
    const list = Array.isArray(raw) ? raw : [];
    return { success: true, appointments: list.map(normalizeAppointment) };
  } catch (error) {
    console.error("fetchAppointments error:", error);
    return { success: false, appointments: [] };
  }
}

export async function fetchTodayAppointment() {
  try {
    const dashboard = await getPortalDashboard().catch(() => null);
    if (dashboard?.appointment && dashboard.appointment.status !== "No active appointment") {
      return {
        success: true,
        appointment: normalizeAppointment({
          id: dashboard.latest_visit?.id || "today-opd",
          doctor_name: dashboard.latest_visit?.doctor_name,
          department_name: dashboard.appointment?.department,
          hospital_name: dashboard.appointment?.hospital,
          token_number: dashboard.appointment?.token,
          status: dashboard.appointment?.status || "Waiting Triage",
          created_at: dashboard.latest_visit?.created_at || new Date().toISOString(),
        }),
      };
    }
    const all = await fetchAppointments();
    const active = all.appointments.find((a) => a.status !== "Completed");
    return { success: true, appointment: active || null };
  } catch (error) {
    return { success: false, appointment: null };
  }
}

export async function fetchUpcomingAppointments() {
  try {
    const all = await fetchAppointments();
    const upcoming = all.appointments.filter((a) => a.status !== "Completed");
    return { success: true, appointments: upcoming };
  } catch (error) {
    return { success: false, appointments: [] };
  }
}

export async function fetchPastAppointments() {
  try {
    const all = await fetchAppointments();
    const past = all.appointments.filter((a) => a.status === "Completed");
    return { success: true, appointments: past };
  } catch (error) {
    return { success: false, appointments: [] };
  }
}

export async function fetchAppointmentDetails(id) {
  try {
    const all = await fetchAppointments();
    const match = all.appointments.find((a) => a.id === id);
    return { success: Boolean(match), appointment: match || null };
  } catch (error) {
    return { success: false, appointment: null, error: error.message };
  }
}

export async function fetchActiveAppointment() {
  return fetchTodayAppointment();
}

export default {
  fetchAppointments,
  fetchTodayAppointment,
  fetchUpcomingAppointments,
  fetchPastAppointments,
  fetchAppointmentDetails,
  fetchActiveAppointment,
};
