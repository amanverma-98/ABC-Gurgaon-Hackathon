import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  FileText,
  Hospital,
  Languages,
  Loader2,
  MapPin,
  RefreshCw,
  Stethoscope,
} from "lucide-react";

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
  as: 'অসমীয়া (Assamese)',
};

import useMobileStore, {
  SCREENS,
} from "../../store/useMobileStore";
import { fetchVisitDetails } from "../../services/visitService";
import MobileHeader from "../../components/mobile/MobileHeader";
import { useLanguage } from "../../i18n/translations";

function getVisitId(visit) {
  return (
    visit?.id ||
    visit?.visitId ||
    visit?.appointmentId ||
    null
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
      month: "long",
      year: "numeric",
    }
  );
}

function normalizeDocuments(result) {
  if (Array.isArray(result)) return result;

  if (Array.isArray(result?.documents)) {
    return result.documents;
  }

  if (Array.isArray(result?.records)) {
    return result.records;
  }

  if (Array.isArray(result?.data)) {
    return result.data;
  }

  return [];
}

export default function VisitDetailsScreen() {
  const {
    selectedVisit,
    medicalRecords,
    setSelectedMedicalRecord,
    setScreen,
    vitals: storeVitals,
  } = useMobileStore();

  const { isHindi, tr } = useLanguage();

  const [visitDetails, setVisitDetails] =
    useState(selectedVisit || null);

  const [linkedDocuments, setLinkedDocuments] = useState([]);
  const [visitSummary, setVisitSummary] = useState(null);
  const [visitVitals, setVisitVitals] = useState(null);

  const [loading, setLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] =
    useState(true);
  const [error, setError] = useState("");

  const visitId = getVisitId(selectedVisit);

  useEffect(() => {
    let cancelled = false;

    const loadDetails = async () => {
      if (!visitId) {
        setVisitDetails(selectedVisit || null);
        setLoading(false);
        setDocumentsLoading(false);
        return;
      }

      setLoading(true);
      setDocumentsLoading(true);
      setError("");

      try {
        const detailsResult = await fetchVisitDetails(visitId);

        if (cancelled) return;

        setVisitDetails(
          detailsResult?.visit ||
            detailsResult?.data ||
            detailsResult ||
            selectedVisit
        );

        setLinkedDocuments(normalizeDocuments(detailsResult?.documents));
        setVisitSummary(detailsResult?.summary || null);
        setVisitVitals(detailsResult?.vitals || null);
      } catch (loadError) {
        if (cancelled) return;

        setError(
          loadError?.message ||
            (tr('Unable to load visit details.', 'विज़िट विवरण लोड नहीं हो सका।'))
        );

        setVisitDetails(selectedVisit || null);
        setLinkedDocuments([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setDocumentsLoading(false);
        }
      }
    };

    loadDetails();

    return () => {
      cancelled = true;
    };
  }, [visitId]);

  const fallbackDocuments = useMemo(() => {
    if (!visitId || !Array.isArray(medicalRecords)) {
      return [];
    }

    return medicalRecords.filter((record) => {
      const recordVisitId =
        record?.visitId ||
        record?.associatedVisitId ||
        record?.appointmentId;

      return (
        String(recordVisitId || "") ===
        String(visitId)
      );
    });
  }, [medicalRecords, visitId]);

  const documents =
    linkedDocuments.length > 0
      ? linkedDocuments
      : fallbackDocuments;

  const visit = visitDetails || {};

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

  const location =
    visit?.location ||
    visit?.address ||
    "";

  const date =
    visit?.date ||
    visit?.visitDate ||
    visit?.appointmentDate ||
    "";

  const summary = visitSummary || visit?.summary || visit?.reason || visit?.chiefComplaint || visit?.notes || '';
  let parsedPayload = null;
  try {
    parsedPayload = typeof summary?.ai_payload === 'string' ? JSON.parse(summary.ai_payload) : (summary?.ai_payload || (summary?.sections ? summary : null));
  } catch {}

  const chiefComplaint = summary?.chief_complaint || parsedPayload?.chief_complaint || '';
  const historyOfIllness = summary?.history_of_present_illness || parsedPayload?.history_of_present_illness || '';
  const aiSections = Array.isArray(parsedPayload?.sections)
    ? parsedPayload.sections.filter((s) => !/complaint/i.test(s.heading_en || s.heading || ''))
    : [];

  const summaryText = typeof summary === 'string'
    ? summary
    : (!chiefComplaint && !historyOfIllness ? (summary?.summary || '') : '');

  const visitLang = visit?.language || summary?.language || parsedPayload?.language;

  let aiInsights = [];
  try {
    aiInsights = Array.isArray(parsedPayload?.insights)
      ? parsedPayload.insights
      : Array.isArray(parsedPayload?.health_insights)
      ? parsedPayload.health_insights
      : [];
  } catch {}

  const diagnosis =
    visit?.diagnosis ||
    visit?.diagnoses ||
    "";

  const openDocument = (record) => {
    if (!record) return;

    setSelectedMedicalRecord(record);
    setScreen(SCREENS.DOCUMENT_DETAILS);
  };

  if (!selectedVisit) {
    return (
      <div className="min-h-screen bg-slate-50">
        <MobileHeader
          title={tr('Visit Details', 'विज़िट विवरण')}
        />

        <main className="mx-auto max-w-md px-5 py-10">
          <div className="rounded-3xl bg-white p-7 text-center shadow-sm ring-1 ring-slate-200">
            <Stethoscope
              size={32}
              className="mx-auto text-slate-300"
            />

            <h2 className="mt-4 text-base font-bold text-slate-800">
              {tr('Visit not selected', 'विज़िट उपलब्ध नहीं है')}
            </h2>

            <button
              type="button"
              onClick={() => setScreen(SCREENS.VISITS)}
              className="mt-5 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-bold text-white"
            >
              {tr('View visits', 'विज़िट देखें')}
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <MobileHeader
        title={tr('Visit Details', 'विज़िट विवरण')}
        subtitle={
          tr('Healthcare encounter', 'स्वास्थ्य मुलाकात')
        }
      />

      <main className="mx-auto w-full max-w-md px-4 py-5 pb-24 sm:px-5">
        {error ? (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl bg-amber-50 p-4 text-xs text-amber-900 ring-1 ring-amber-200">
            <span>{error}</span>

            <RefreshCw
              size={15}
              className="shrink-0"
            />
          </div>
        ) : null}

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <Stethoscope size={23} />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-base font-black text-slate-900">
                {department}
              </h1>

              <p className="mt-1 text-sm font-medium text-slate-500">
                {doctor}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <InfoTile
              icon={CalendarDays}
              label={tr('Date', 'तारीख')}
              value={formatDate(date, isHindi)}
            />

            <InfoTile
              icon={Hospital}
              label={tr('Facility', 'केंद्र')}
              value={facility}
            />
          </div>

          {location ? (
            <div className="mt-3 flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-3">
              <MapPin
                size={16}
                className="shrink-0 text-slate-400"
              />

              <span className="truncate text-xs font-medium text-slate-600">
                {location}
              </span>
            </div>
          ) : null}
        </section>

        {loading ? (
          <div className="mt-4 rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
            <Loader2
              size={25}
              className="mx-auto animate-spin text-teal-700"
            />

            <p className="mt-3 text-xs font-semibold text-slate-500">
              {tr('Loading details...', 'विवरण लोड हो रहा है...')}
            </p>
          </div>
        ) : (
          <>
            {chiefComplaint || historyOfIllness || summaryText || diagnosis || aiInsights.length || aiSections.length ? (
              <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-slate-800">
                    {tr('Visit summary', 'मुलाकात का सार')}
                  </h2>
                  {visitLang && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
                      <Languages size={12} />
                      {LANGUAGE_NAMES[visitLang] || visitLang.toUpperCase()}
                    </span>
                  )}
                </div>

                {chiefComplaint ? (
                  <div className="mt-3 rounded-2xl bg-teal-50/50 border border-teal-100 p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                      {tr('Chief Complaint', 'मुख्य लक्षण / शिकायत')}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 leading-relaxed">
                      {chiefComplaint}
                    </p>
                  </div>
                ) : null}

                {historyOfIllness ? (
                  <div className="mt-3 rounded-2xl bg-slate-50 border border-slate-200 p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {tr('Clinical Summary', 'क्लिनिकल सारांश')}
                    </p>
                    <p className="mt-1 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {historyOfIllness}
                    </p>
                  </div>
                ) : null}

                {summaryText ? (
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {summaryText}
                  </p>
                ) : null}

                {aiSections.map((sec, idx) => (
                  <div key={idx} className="mt-3 rounded-2xl bg-slate-50 border border-slate-200 p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {sec.heading_local || sec.heading_en || sec.heading || "Assessment"}
                    </p>
                    <p className="mt-1 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {sec.body_local || sec.body}
                    </p>
                  </div>
                ))}

                {diagnosis ? (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      {tr('Diagnosis', 'निदान')}
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {typeof diagnosis === "object"
                        ? diagnosis?.label ||
                          diagnosis?.name ||
                          JSON.stringify(diagnosis)
                        : diagnosis}
                    </p>
                  </div>
                ) : null}
                {aiInsights.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-teal-100 bg-teal-50 p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-teal-700">{tr('Health insights', 'स्वास्थ्य जानकारी')}</p>
                    <ul className="mt-2 space-y-1 text-sm text-teal-950">{aiInsights.slice(0,8).map((item,i)=><li key={i}>• {typeof item === 'string' ? item : item?.text || item?.insight || item?.title || JSON.stringify(item)}</li>)}</ul>
                  </div>
                )}
              </section>
            ) : null}

            <section className="mt-4">
              <div className="mb-3 flex items-center justify-between px-1">
                <div>
                  <h2 className="text-sm font-black text-slate-800">
                    {tr('Documents from this visit', 'इस विज़िट के दस्तावेज़')}
                  </h2>

                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {documents.length}{" "}
                    {isHindi
                      ? "दस्तावेज़"
                      : documents.length === 1
                        ? "document"
                        : "documents"}
                  </p>
                </div>
              </div>

              {(() => {
                const activeVitals = visitVitals || selectedVisit?.vitals || storeVitals;
                if (!activeVitals || (!activeVitals.pulse && !activeVitals.spo2 && !activeVitals.systolic && !activeVitals.temperature)) {
                  return null;
                }
                return (
                  <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-900">{tr('Recorded Vitals', 'महत्वपूर्ण संकेत (वाइटल्स)')}</h3>
                      <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                        {tr('Kiosk Intake', 'कियोस्क जांच')}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {activeVitals.pulse && (
                        <div className="rounded-2xl bg-rose-50/70 border border-rose-100 p-3">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-rose-800">{tr('Pulse / Heart Rate', 'पल्स')}</span>
                          <strong className="text-base text-slate-900">{activeVitals.pulse} <span className="text-xs font-medium text-slate-500">bpm</span></strong>
                        </div>
                      )}
                      {activeVitals.spo2 && (
                        <div className="rounded-2xl bg-sky-50/70 border border-sky-100 p-3">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-sky-800">{tr('SpO₂ Oxygen', 'ऑक्सीजन')}</span>
                          <strong className="text-base text-slate-900">{activeVitals.spo2}%</strong>
                        </div>
                      )}
                      {(activeVitals.systolic || activeVitals.diastolic) && (
                        <div className="rounded-2xl bg-teal-50/70 border border-teal-100 p-3">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-teal-800">{tr('Blood Pressure', 'रक्तचाप')}</span>
                          <strong className="text-base text-slate-900">
                            {activeVitals.systolic && activeVitals.diastolic ? `${activeVitals.systolic}/${activeVitals.diastolic}` : activeVitals.systolic || activeVitals.diastolic}{" "}
                            <span className="text-xs font-medium text-slate-500">mmHg</span>
                          </strong>
                        </div>
                      )}
                      {activeVitals.temperature && (
                        <div className="rounded-2xl bg-amber-50/70 border border-amber-100 p-3">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-800">{tr('Temperature', 'तापमान')}</span>
                          <strong className="text-base text-slate-900">{activeVitals.temperature} <span className="text-xs font-medium text-slate-500">°F</span></strong>
                        </div>
                      )}
                    </div>
                  </section>
                );
              })()}

        {documentsLoading ? (
                <div className="rounded-3xl bg-white p-7 text-center ring-1 ring-slate-200">
                  <Loader2
                    size={23}
                    className="mx-auto animate-spin text-teal-700"
                  />
                </div>
              ) : documents.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-7 text-center">
                  <FileText
                    size={29}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 text-xs font-medium text-slate-500">
                    {tr('No documents are linked to this visit.', 'इस विज़िट से कोई दस्तावेज़ जुड़ा नहीं है।')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {documents.map((record, index) => (
                    <button
                      key={
                        record?.id ||
                        record?.documentId ||
                        `document-${index}`
                      }
                      type="button"
                      onClick={() =>
                        openDocument(record)
                      }
                      className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition active:scale-[0.99]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <FileText size={19} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-800">
                          {record?.title ||
                            record?.fileName ||
                            (tr('Medical document', 'चिकित्सीय दस्तावेज़'))}
                        </p>

                        <p className="mt-1 truncate text-[11px] text-slate-500">
                          {record?.typeLabel ||
                            record?.type ||
                            (tr('Document', 'दस्तावेज़'))}
                        </p>
                      </div>

                      <ChevronRight
                        size={18}
                        className="shrink-0 text-slate-400"
                      />
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-3">
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