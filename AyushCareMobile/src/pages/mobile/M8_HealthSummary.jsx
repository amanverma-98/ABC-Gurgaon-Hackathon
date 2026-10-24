import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Volume2,
  VolumeX,
  AlertTriangle,
  CheckCircle2,
  CalendarDays,
  FileText,
  Pill,
  FlaskConical,
  Activity,
  ShieldCheck,
  Heart,
  Thermometer,
  Stethoscope,
  Building2,
  Ticket,
  Languages,
} from "lucide-react";

const BCP47_MAP = {
  hi: 'hi-IN',
  en: 'en-IN',
  bn: 'bn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
  ur: 'ur-IN',
  or: 'or-IN',
  as: 'as-IN',
};

const getLocaleTag = (lang) => {
  if (!lang) return 'en-IN';
  const clean = String(lang).toLowerCase().trim();
  if (BCP47_MAP[clean]) return BCP47_MAP[clean];
  if (clean.includes('-')) return clean;
  return `${clean}-IN`;
};

const LANGUAGE_NAMES = {
  hi: 'हिन्दी (Hindi)',
  en: 'English',
  bn: 'বাংলা (Bengali)',
  ta: 'தமிழ் (Tamil)',
  te: 'తెలుగు (Telugu)',
  mr: 'मराठी (Marathi)',
  gu: 'ગુજરાતી (Gujarati)',
  kn: 'ಕನ್ನಡ (Kannada)',
  ml: 'മലയാളം (Malayalam)',
  pa: 'ਪੰਜਾਬੀ (Punjabi)',
  or: 'ଓଡ଼ିଆ (Odia)',
  ur: 'اردو (Urdu)',
  as: 'অसमীয়া (Assamese)',
};
import useMobileStore, { SCREENS } from "../../store/useMobileStore";
import { useLanguage } from "../../i18n/translations";

const safeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
};

const firstNonEmpty = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
};

const normalizeSummary = (summary, extractedData) => {
  const source = summary || {};
  const extraction = extractedData || {};

  const medicines = safeArray(
    firstNonEmpty(
      source.medicines,
      source.medications,
      extraction.medicines,
      extraction.medications,
      extraction.detected_entities?.medicines
    )
  );

  const diagnoses = safeArray(
    firstNonEmpty(
      source.diagnoses,
      source.conditions,
      extraction.diagnoses,
      extraction.detected_entities?.diagnoses
    )
  );

  const investigations = safeArray(
    firstNonEmpty(
      source.investigations,
      source.tests,
      extraction.investigations,
      extraction.labResults,
      extraction.detected_entities?.lab_results,
      extraction.detected_entities?.tests
    )
  );

  const symptoms = safeArray(
    firstNonEmpty(
      source.symptoms,
      source.complaints,
      extraction.symptoms,
      extraction.chiefComplaint,
      extraction.chief_complaint,
      extraction.detected_entities?.symptoms
    )
  );

  const date = firstNonEmpty(
    source.date,
    source.visitDate,
    source.documentDate,
    extraction.date,
    extraction.parsed_date,
    extraction.documentDate
  );

  const plainLanguage = firstNonEmpty(
    source.plainLanguage,
    source.patientSummary,
    source.summary,
    source.description
  );

  return {
    title: firstNonEmpty(source.title, "Your health information"),
    plainLanguage:
      plainLanguage ||
      "Your health information has been organized and synthesized by P2Care AI.",
    date,
    medicines,
    diagnoses,
    investigations,
    symptoms,
    warning: firstNonEmpty(source.warning, source.alert),
    source: source.source || "Clinical Consultation & Records",
  };
};

const getItemLabel = (item) => {
  if (typeof item === "string") return item;

  if (!item || typeof item !== "object") {
    return String(item ?? "");
  }

  return firstNonEmpty(
    item.name,
    item.test,
    item.testName,
    item.medicine,
    item.medication,
    item.diagnosis,
    item.label,
    item.value,
    "Information"
  );
};

const getItemSecondary = (item) => {
  if (!item || typeof item !== "object") return "";

  const frequency = firstNonEmpty(item.frequency, item.dosage, item.dose);
  const duration = firstNonEmpty(item.duration, item.days);

  return [frequency, duration].filter(Boolean).join(" • ");
};

const speakText = (text, lang = 'en-IN') => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return false;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.9;
  utterance.pitch = 1;

  window.speechSynthesis.speak(utterance);
  return true;
};

function InfoSection({ icon, title, items, emptyText }) {
  if (!items || !items.length) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-xl bg-slate-100 p-2 text-teal-700">{icon}</div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={`${title}-${index}`}
            className="rounded-xl bg-slate-50 px-3 py-3"
          >
            <p className="font-medium text-slate-800">{getItemLabel(item)}</p>

            {getItemSecondary(item) && (
              <p className="mt-1 text-sm text-slate-500">
                {getItemSecondary(item)}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function M8_HealthSummary() {
  const {
    extractedData,
    healthSummary,
    vitals,
    latestVisit,
    timeline,
    medicalTimeline,
    patient,
    session,
    setScreen,
    prevScreen,
  } = useMobileStore();

  const { isHindi, tr } = useLanguage();
  const [isSpeaking, setIsSpeaking] = useState(false);

  const summary = useMemo(
    () => normalizeSummary(healthSummary || {}, extractedData),
    [healthSummary, extractedData]
  );

  const facilityName =
    latestVisit?.hospital_name ||
    session?.facilityName ||
    "P2Care Center";

  // Parse AI clinical summary payload from kiosk/db
  const parsedAiPayload = useMemo(() => {
    if (!healthSummary) return null;
    let payload = healthSummary.ai_payload;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch {
        payload = null;
      }
    }
    return payload || (healthSummary.sections ? healthSummary : null);
  }, [healthSummary]);

  const summaryLang =
    healthSummary?.language ||
    parsedAiPayload?.language ||
    latestVisit?.language ||
    (isHindi ? 'hi' : 'en');

  const chiefComplaint =
    healthSummary?.chief_complaint ||
    parsedAiPayload?.chief_complaint ||
    parsedAiPayload?.sections?.find((s) => /complaint/i.test(s.heading_en || s.heading || ""))?.body_local ||
    parsedAiPayload?.sections?.find((s) => /complaint/i.test(s.heading_en || s.heading || ""))?.body ||
    null;

  const historyOfIllness =
    healthSummary?.history_of_present_illness ||
    parsedAiPayload?.history_of_present_illness ||
    parsedAiPayload?.sections?.find((s) => /history|illness/i.test(s.heading_en || s.heading || ""))?.body_local ||
    parsedAiPayload?.sections?.find((s) => /history|illness/i.test(s.heading_en || s.heading || ""))?.body ||
    null;

  const aiSections = useMemo(() => {
    if (!parsedAiPayload?.sections || !Array.isArray(parsedAiPayload.sections)) return [];
    return parsedAiPayload.sections.filter(
      (s) => !/complaint/i.test(s.heading_en || s.heading || "")
    );
  }, [parsedAiPayload]);

  const activeVitals = vitals || null;
  const activeVisit = latestVisit || null;

  const patientName =
    patient?.name ||
    patient?.full_name ||
    patient?.fullName ||
    session?.patient?.name ||
    "Patient";

  const summaryText = [
    chiefComplaint ? `Chief complaint: ${chiefComplaint}.` : "",
    historyOfIllness ? `Clinical history: ${historyOfIllness}.` : "",
    summary.plainLanguage,
    summary.symptoms.length
      ? `Reported symptoms: ${summary.symptoms.map(getItemLabel).join(", ")}.`
      : "",
    summary.diagnoses.length
      ? `Reported diagnoses: ${summary.diagnoses.map(getItemLabel).join(", ")}.`
      : "",
    summary.medicines.length
      ? `Medicines: ${summary.medicines.map(getItemLabel).join(", ")}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const handleAudio = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const started = speakText(summaryText || "Health summary is ready.", getLocaleTag(summaryLang));

    if (started) {
      setIsSpeaking(true);
      const checkSpeaking = () => {
        if (!window.speechSynthesis.speaking) {
          setIsSpeaking(false);
          return;
        }
        window.setTimeout(checkSpeaking, 250);
      };
      window.setTimeout(checkSpeaking, 250);
    }
  };

  const handleBack = () => {
    setScreen(SCREENS.M1);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                {tr('AI Health Summary', 'एआई स्वास्थ्य सारांश')}
              </p>
              {summaryLang && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-800 bg-teal-100/70 border border-teal-200 px-2 py-0.5 rounded-full">
                  <Languages size={11} />
                  {LANGUAGE_NAMES[summaryLang] || summaryLang.toUpperCase()}
                </span>
              )}
            </div>
            <h1 className="truncate text-lg font-bold text-slate-900">
              {tr('Health Summary & Vitals', 'स्वास्थ्य सारांश एवं विज़िट')}
            </h1>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-700">
            <Activity size={19} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        {/* Banner */}
        <section className="rounded-3xl bg-teal-700 p-5 text-white shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-teal-100">
                {tr('Hello, ${patientName}', 'नमस्ते, ${patientName}')}
              </p>
              <h2 className="mt-1 text-2xl font-bold">
                {tr('Your Health Summary', 'आपका स्वास्थ्य सारांश तैयार है')}
              </h2>
              <p className="mt-2 text-sm leading-6 text-teal-50">
                {tr('Clinical insights, recorded vitals, and consultation details synthesized by P2Care AI.', 'कियोस्क और रिकॉर्ड से प्राप्त आपका क्लिनिकल सारांश और वाइटल्स यहाँ संकलित हैं।')}
              </p>
            </div>

            <div className="rounded-2xl bg-white/15 p-3">
              <CheckCircle2 size={25} />
            </div>
          </div>

          <button
            type="button"
            onClick={handleAudio}
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-semibold text-teal-800 transition hover:bg-teal-50"
          >
            {isSpeaking ? <VolumeX size={19} /> : <Volume2 size={19} />}
            {isSpeaking ? (tr('Stop listening', 'सुनना बंद करें')) : (tr('Listen to summary', 'सारांश सुनें'))}
          </button>
        </section>

        {/* Visit Details Card */}
        {activeVisit && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-teal-800 mb-3">
              <Ticket size={20} />
              <h2 className="font-bold text-slate-900">
                {tr('Visit & Queue Details', 'विज़िट एवं टोकन विवरण')}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-teal-50/60 p-3 border border-teal-100">
                <p className="text-[11px] font-semibold text-teal-700 uppercase tracking-wide">
                  {tr('Token No', 'टोकन नंबर')}
                </p>
                <p className="mt-1 text-lg font-black text-teal-900">
                  {activeVisit.token_number || "Active"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  {tr('Department', 'विभाग')}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-800 truncate">
                  {activeVisit.department_name || "General OPD"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  {tr('Doctor', 'चिकित्सक')}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-800 truncate">
                  {activeVisit.doctor_name || "Assigned Doctor"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  {tr('Hospital', 'अस्पताल')}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-800 truncate">
                  {activeVisit.hospital_name || facilityName}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Recorded Vitals */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-rose-600 mb-3">
            <Heart size={20} />
            <h2 className="font-bold text-slate-900">
              {tr('Recorded Vitals', 'दर्ज वाइटल्स (शारीरिक माप)')}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-rose-50/50 p-3 border border-rose-100">
              <div className="flex items-center gap-1.5 text-rose-700 text-xs font-semibold">
                <Activity size={14} />
                <span>BP (रक्तचाप)</span>
              </div>
              <p className="mt-1 text-lg font-black text-slate-900">
                {activeVitals?.systolic && activeVitals?.diastolic
                  ? `${activeVitals.systolic}/${activeVitals.diastolic}`
                  : "-- / --"}{" "}
                <span className="text-xs font-normal text-slate-500">mmHg</span>
              </p>
            </div>

            <div className="rounded-2xl bg-blue-50/50 p-3 border border-blue-100">
              <div className="flex items-center gap-1.5 text-blue-700 text-xs font-semibold">
                <Heart size={14} />
                <span>{tr('Pulse', 'पल्स (नाड़ी)')}</span>
              </div>
              <p className="mt-1 text-lg font-black text-slate-900">
                {activeVitals?.pulse || "--"}{" "}
                <span className="text-xs font-normal text-slate-500">bpm</span>
              </p>
            </div>

            <div className="rounded-2xl bg-amber-50/50 p-3 border border-amber-100">
              <div className="flex items-center gap-1.5 text-amber-700 text-xs font-semibold">
                <Thermometer size={14} />
                <span>{tr('Temperature', 'तापमान')}</span>
              </div>
              <p className="mt-1 text-lg font-black text-slate-900">
                {activeVitals?.temperature || "--"}{" "}
                <span className="text-xs font-normal text-slate-500">°F</span>
              </p>
            </div>

            <div className="rounded-2xl bg-teal-50/50 p-3 border border-teal-100">
              <div className="flex items-center gap-1.5 text-teal-700 text-xs font-semibold">
                <Activity size={14} />
                <span>{tr('SpO₂', 'ऑक्सीजन')}</span>
              </div>
              <p className="mt-1 text-lg font-black text-slate-900">
                {activeVitals?.spo2 || "--"}{" "}
                <span className="text-xs font-normal text-slate-500">%</span>
              </p>
            </div>
          </div>
        </section>

        {/* AI Health Summary (Chief Complaint & Clinical Illness) */}
        {(chiefComplaint || historyOfIllness) && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-teal-800">
              <Stethoscope size={20} />
              <h2 className="font-bold text-slate-900">
                {tr('Clinical Intake & Symptoms', 'क्लिनिकल इंटेक एवं लक्षण')}
              </h2>
            </div>

            {chiefComplaint && (
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {tr('Chief Complaint', 'मुख्य शिकायत (Chief Complaint)')}
                </p>
                <p className="mt-1.5 text-base font-semibold text-slate-900 leading-relaxed">
                  {chiefComplaint}
                </p>
              </div>
            )}

            {historyOfIllness && (
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {tr('History & Ayush Assessment', 'इतिहास एवं आयुष विश्लेषण')}
                </p>
                <p className="mt-1.5 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {historyOfIllness}
                </p>
              </div>
            )}
          </section>
        )}

        {/* AI Additional Sections (from summary generator) */}
        {aiSections.map((sec, idx) => (
          <section key={idx} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-slate-900">
              {sec.heading_local || sec.heading_en || sec.heading || "Assessment"}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
              {sec.body_local || sec.body}
            </p>
          </section>
        ))}

        {/* Extracted Document Entities */}
        <InfoSection
          icon={<Activity size={18} />}
          title={tr('Symptoms or complaints', 'लक्षण या समस्याएं')}
          items={summary.symptoms}
          emptyText="No symptoms reported."
        />

        <InfoSection
          icon={<Pill size={18} />}
          title={tr('Medicines mentioned', 'दवाइयाँ')}
          items={summary.medicines}
          emptyText="No medicines mentioned."
        />

        <InfoSection
          icon={<FlaskConical size={18} />}
          title={tr('Tests or investigations', 'जाँच व परीक्षण')}
          items={summary.investigations}
          emptyText="No investigations mentioned."
        />

        <InfoSection
          icon={<ShieldCheck size={18} />}
          title={tr('Diagnoses or conditions', 'निदान / स्थितियां')}
          items={summary.diagnoses}
          emptyText="No diagnoses mentioned."
        />

        {/* Medical disclaimer */}
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={20}
              className="mt-0.5 shrink-0 text-amber-700"
            />
            <div>
              <p className="font-semibold text-amber-900">
                {tr('Clinical Disclaimer', 'यह चिकित्सीय परामर्श का विकल्प नहीं है')}
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-800">
                {tr('This summary is based on the information provided during the AI interview and your uploaded records. Final diagnosis and care will be provided by your doctor.', 'यह सारांश आपके द्वारा दी गई जानकारी और कियोस्क साक्षात्कार पर आधारित है। अंतिम निदान चिकित्सक द्वारा किया जाएगा।')}
              </p>
            </div>
          </div>
        </section>

        <div className="pt-3 pb-8">
          <button
            type="button"
            onClick={handleBack}
            className="flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 px-5 py-3.5 font-semibold text-white shadow-sm transition hover:bg-teal-800 active:scale-[0.99]"
          >
            <ArrowLeft size={18} />
            {tr('Back to Home', 'मुख्य पृष्ठ पर वापस जाएं')}
          </button>
        </div>
      </main>
    </div>
  );
}