import React, { useMemo, useState, useEffect } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Edit3,
  Hash,
  Loader2,
  LogOut,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  X,
} from "lucide-react";

import useMobileStore, {
  SCREENS,
} from "../../store/useMobileStore";
import MobileHeader from "../../components/mobile/MobileHeader";
import { useLanguage, tr } from "../../i18n/translations";
import { getPortalProfile } from "../../services/portalService";

function formatDate(value, isHindi) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString(isHindi ? "hi-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function maskAadhaar(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length >= 4) {
    return `•••• •••• ${digits.slice(-4)}`;
  }
  return digits || null;
}

export default function ProfileScreen() {
  const {
    patient,
    session,
    loadPortalData,
    updatePatientProfile,
    logout,
    setScreen,
  } = useMobileStore();

  const { isHindi } = useLanguage();

  const activePatient = patient || session?.patient || {};

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    // Fetch fresh patient profile directly from DB on profile screen mount
    getPortalProfile()
      .then((fresh) => {
        if (fresh) {
          useMobileStore.setState((state) => {
            const merged = { ...(state.patient || {}), ...fresh };
            try { localStorage.setItem("P2Care_patient", JSON.stringify(merged)); } catch {}
            return {
              patient: merged,
              session: {
                ...state.session,
                patient: merged,
              },
            };
          });
        }
      })
      .catch(() => {
        loadPortalData?.();
      });
  }, [loadPortalData]);

  const getInitialForm = () => {
    const rawDob = activePatient?.dateOfBirth || activePatient?.date_of_birth || activePatient?.dob;
    let formattedDob = "";
    if (rawDob) {
      try {
        formattedDob = new Date(rawDob).toISOString().split("T")[0];
      } catch {
        formattedDob = String(rawDob).slice(0, 10);
      }
    }

    return {
      name: activePatient?.name || activePatient?.full_name || "",
      gender: activePatient?.gender || "Male",
      mobile: activePatient?.mobile || activePatient?.mobile_number || activePatient?.phone || "",
      dateOfBirth: formattedDob,
      address: activePatient?.address || "",
      aadhaarNumber: activePatient?.aadhaarNumber || activePatient?.aadhaar_number || "",
      abhaAddress: activePatient?.abhaAddress || activePatient?.abha_address || "",
    };
  };

  const [form, setForm] = useState(getInitialForm());

  useEffect(() => {
    if (!editing) {
      setForm(getInitialForm());
    }
  }, [activePatient, editing]);

  const displayName =
    activePatient?.full_name ||
    activePatient?.name ||
    tr("Patient", "मरीज़");

  const patientId =
    activePatient?.abhaNumber ||
    activePatient?.abha_number ||
    activePatient?.patientId ||
    "—";

  const authMethod =
    activePatient?.authMethod ||
    activePatient?.authType ||
    "ABHA";

  const initials = useMemo(() => {
    const parts = String(displayName)
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 0) return "P";
    return parts
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }, [displayName]);

  const handleOpenEdit = () => {
    setForm(getInitialForm());
    setSaveError("");
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      if (typeof updatePatientProfile === "function") {
        await updatePatientProfile({
          full_name: form.name.trim(),
          name: form.name.trim(),
          gender: form.gender,
          mobile_number: form.mobile.trim(),
          mobile: form.mobile.trim(),
          phone: form.mobile.trim(),
          date_of_birth: form.dateOfBirth || null,
          dateOfBirth: form.dateOfBirth || null,
          address: form.address.trim(),
          aadhaar_number: form.aadhaarNumber.trim(),
          aadhaarNumber: form.aadhaarNumber.trim(),
          abha_address: form.abhaAddress.trim(),
          abhaAddress: form.abhaAddress.trim(),
        });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
      setEditing(false);
    } catch (err) {
      setSaveError(
        err?.message ||
        tr("Failed to save profile updates to database.", "डेटाबेस में प्रोफ़ाइल सहेजने में विफल।")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (typeof logout === "function") {
      await logout();
      return;
    }
    setScreen(SCREENS.AUTH);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <MobileHeader
        title={tr("Profile", "प्रोफ़ाइल")}
        subtitle={tr("Manage your personal information", "अपनी जानकारी और खाता विवरण प्रबंधित करें")}
      />

      <main className="mx-auto w-full max-w-md px-4 py-5 pb-24">
        {saveSuccess && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 shadow-sm animate-in fade-in">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            {tr("Profile updated and synced with hospital records successfully!", "प्रोफ़ाइल सफलतापूर्वक अपडेट हो गई और डेटाबेस में सहेजी गई!")}
          </div>
        )}

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-teal-800 text-lg font-black text-white shadow-sm">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-black text-slate-900">
                {displayName}
              </h1>

              <p className="mt-1 truncate text-xs font-medium text-slate-500">
                ABHA · {patientId}
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenEdit}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-800 border border-teal-200/80 shadow-sm active:scale-95 transition"
              aria-label={tr("Edit profile", "प्रोफ़ाइल संपादित करें")}
            >
              <Edit3 size={17} />
            </button>
          </div>

          <div className="mt-5 flex items-center gap-2 rounded-2xl bg-teal-50/80 border border-teal-100 p-3">
            <ShieldCheck size={17} className="shrink-0 text-teal-700" />
            <p className="text-xs font-medium leading-5 text-teal-950">
              {tr("ABHA & Aadhaar identity verified", "आभा और आधार पहचान सत्यापित")} · {authMethod}
            </p>
          </div>
        </section>

        {/* PERSONAL DETAILS SECTION */}
        <section className="mt-6">
          <SectionTitle title={tr("Personal information", "व्यक्तिगत जानकारी")} />

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <InfoRow
              icon={User}
              label={tr("Full name", "पूरा नाम")}
              value={displayName}
            />

            <InfoRow
              icon={User}
              label={tr("Gender", "लिंग")}
              value={activePatient?.gender || tr("Not specified", "निर्दिष्ट नहीं")}
            />

            <InfoRow
              icon={Phone}
              label={tr("Mobile number", "मोबाइल नंबर")}
              value={activePatient?.mobile || activePatient?.mobile_number || activePatient?.phone || "—"}
            />

            <InfoRow
              icon={CalendarDays}
              label={tr("Date of birth", "जन्म तिथि")}
              value={formatDate(activePatient?.dateOfBirth || activePatient?.date_of_birth || activePatient?.dob, isHindi) || "—"}
            />

            <InfoRow
              icon={MapPin}
              label={tr("Residential Address", "आवासीय पता")}
              value={activePatient?.address}
              onAction={handleOpenEdit}
              actionLabel={tr("Add address", "पता जोड़ें")}
              last
            />
          </div>
        </section>

        {/* HEALTH IDENTIFIERS SECTION */}
        <section className="mt-6">
          <SectionTitle title={tr("ABDM & Official Identity", "आभा एवं आधिकारिक पहचान")} />

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <InfoRow
              icon={ShieldCheck}
              label={tr("ABHA Number", "आभा संख्या")}
              value={patientId}
            />

            <InfoRow
              icon={User}
              label={tr("ABHA Address (PHR)", "आभा पता (PHR)")}
              value={activePatient?.abhaAddress || activePatient?.abha_address}
              onAction={handleOpenEdit}
              actionLabel={tr("Add ABHA address", "आभा पता जोड़ें")}
            />

            <InfoRow
              icon={Hash}
              label={tr("Aadhaar Number", "आधार संख्या")}
              value={maskAadhaar(activePatient?.aadhaarNumber || activePatient?.aadhaar_number)}
              onAction={handleOpenEdit}
              actionLabel={tr("Add Aadhaar", "आधार जोड़ें")}
              last
            />
          </div>
        </section>

        {/* ACCOUNT & SECURITY */}
        <section className="mt-6">
          <SectionTitle title={tr("Account & security", "खाता और सुरक्षा")} />

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <ActionRow
              title={tr("Privacy controls", "गोपनीयता नियंत्रण")}
              subtitle={tr("Manage consent and granular doctor access", "सहमति और डॉक्टर पहुंच स्तर प्रबंधित करें")}
              onClick={() => setScreen(SCREENS.PRIVACY)}
            />

            <ActionRow
              title={tr("Settings", "सेटिंग्स")}
              subtitle={tr("Language and accessibility preferences", "भाषा और पहुंच विकल्प")}
              onClick={() => setScreen(SCREENS.SETTINGS)}
              last
            />
          </div>
        </section>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3.5 text-sm font-bold text-rose-700 shadow-sm active:scale-[0.99] transition"
        >
          <LogOut size={17} />
          {tr("Log out", "लॉग आउट")}
        </button>

        <p className="mt-4 px-3 text-center text-[10px] leading-5 text-slate-400">
          {tr("All profile updates are securely synchronized with your hospital P2Care database.", "सभी प्रोफ़ाइल अपडेट आपके अस्पताल के डेटाबेस के साथ सुरक्षित रूप से समन्वयित होते हैं।")}
        </p>
      </main>

      {editing && (
        <EditProfileModal
          form={form}
          setForm={setForm}
          saving={saving}
          saveError={saveError}
          isHindi={isHindi}
          onClose={() => setEditing(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function SectionTitle({ title }) {
  return (
    <h2 className="mb-3 px-1 text-xs font-black uppercase tracking-wider text-slate-500">
      {title}
    </h2>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  onAction,
  actionLabel,
  last = false,
}) {
  return (
    <div
      className={`flex items-center gap-3.5 px-4 py-4 ${
        last ? "" : "border-b border-slate-100"
      }`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
        <Icon size={17} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>

        {value && value !== "—" ? (
          <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">
            {value}
          </p>
        ) : onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800 active:scale-95"
          >
            + {actionLabel || tr("Add", "जोड़ें")}
          </button>
        ) : (
          <p className="mt-0.5 text-xs text-slate-400 italic">
            {tr("Not provided", "उपलब्ध नहीं")}
          </p>
        )}
      </div>
    </div>
  );
}

function ActionRow({
  title,
  subtitle,
  onClick,
  last = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-4 text-left active:bg-slate-50 transition ${
        last ? "" : "border-b border-slate-100"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-800">
          {title}
        </p>

        <p className="mt-0.5 text-[11px] text-slate-500">
          {subtitle}
        </p>
      </div>

      <ChevronRight
        size={18}
        className="shrink-0 text-slate-400"
      />
    </button>
  );
}

function EditProfileModal({
  form,
  setForm,
  saving,
  saveError,
  isHindi,
  onClose,
  onSave,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-sm p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl animate-in slide-in-from-bottom-5">
        <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              {tr("Edit profile", "प्रोफ़ाइल संपादित करें")}
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              {tr("Update your personal details & health IDs", "अपनी व्यक्तिगत जानकारी और पहचान अपडेट करें")}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
          >
            <X size={17} />
          </button>
        </div>

        {saveError && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
            {saveError}
          </div>
        )}

        <div className="space-y-3.5">
          <Field
            label={tr("Full name", "पूरा नाम")}
            value={form.name}
            placeholder={tr("Enter your full name", "पूरा नाम दर्ज करें")}
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                name: value,
              }))
            }
          />

          {/* GENDER SELECTION */}
          <div>
            <span className="mb-1.5 block text-xs font-bold text-slate-700">
              {tr("Gender", "लिंग")}
            </span>
            <div className="grid grid-cols-3 gap-2">
              {["Male", "Female", "Other"].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setForm((c) => ({ ...c, gender: g }))}
                  className={`h-11 rounded-2xl text-xs font-bold border transition ${
                    form.gender?.toLowerCase() === g.toLowerCase()
                      ? "bg-teal-700 text-white border-teal-700 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {g === "Male" ? tr("Male", "पुरुष") : g === "Female" ? tr("Female", "महिला") : tr("Other", "अन्य")}
                </button>
              ))}
            </div>
          </div>

          <Field
            label={tr("Date of birth", "जन्म तिथि")}
            type="date"
            value={form.dateOfBirth}
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                dateOfBirth: value,
              }))
            }
          />

          <Field
            label={tr("Mobile number", "मोबाइल नंबर")}
            type="tel"
            value={form.mobile}
            placeholder="9876543210"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                mobile: value,
              }))
            }
          />

          {/* RESIDENTIAL ADDRESS */}
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-700">
              {tr("Residential Address", "आवासीय पता")}
            </span>
            <textarea
              rows={2}
              value={form.address}
              placeholder={tr("Flat / Street / Village, District, State", "मकान नं. / सड़क / गांव, ज़िला, राज्य")}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  address: e.target.value,
                }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-900 outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-100 transition"
            />
          </label>

          <Field
            label={tr("Aadhaar Number (12 digits)", "आधार संख्या (12 अंक)")}
            type="text"
            maxLength={12}
            value={form.aadhaarNumber}
            placeholder="123456789012"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                aadhaarNumber: value.replace(/\D/g, "").slice(0, 12),
              }))
            }
          />

          <Field
            label={tr("ABHA Address / PHR", "आभा पता / PHR")}
            type="text"
            value={form.abhaAddress}
            placeholder="yourname@abdm"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                abhaAddress: value.trim(),
              }))
            }
          />
        </div>

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 h-12 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            {tr("Cancel", "रद्द करें")}
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex-[2] h-12 inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-800 text-sm font-bold text-white shadow-sm hover:bg-teal-900 active:scale-[0.99] transition disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {tr("Saving to DB...", "डेटाबेस में सहेज रहे हैं...")}
              </>
            ) : (
              tr("Save changes", "परिवर्तन सहेजें")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  type = "text",
  value,
  placeholder,
  maxLength,
  onChange,
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-700">
        {label}
      </span>

      <input
        type={type}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-100 transition"
      />
    </label>
  );
}