import React, { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  FileText,
  History,
  Info,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  XCircle,
} from "lucide-react";

import useMobileStore, {
  SCREENS,
} from "../../store/useMobileStore";
import MobileHeader from "../../components/mobile/MobileHeader";
import { useLanguage } from "../../i18n/translations";

function formatDate(value, isHindi) {
  if (!value) {
    return isHindi ? 'उपलब्ध नहीं' : 'Unavailable';
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

export default function ConsentDetailsScreen() {
  const {
    privacyData,
    consentHistory,
    accessHistory,
    setScreen,
    withdrawConsent,
    regrantConsent,
    toggleConsent,
  } = useMobileStore();

  const { isHindi, tr } = useLanguage();

  const [expandedConsent, setExpandedConsent] =
    useState(null);

  const activeConsents = Array.isArray(
    privacyData?.activeConsents
  )
    ? privacyData.activeConsents
    : [];

  const history = Array.isArray(consentHistory)
    ? consentHistory
    : Array.isArray(privacyData?.consentHistory)
      ? privacyData.consentHistory
      : [];

  const accesses = Array.isArray(accessHistory)
    ? accessHistory
    : Array.isArray(privacyData?.accessHistory)
      ? privacyData.accessHistory
      : [];

  const handleWithdraw = (consent) => {
    const id =
      consent?.id ||
      consent?.consentId ||
      consent?.key;

    if (!id) return;

    if (typeof withdrawConsent === "function") {
      withdrawConsent(id);
      return;
    }

    if (typeof toggleConsent === "function") {
      toggleConsent(id);
    }
  };

  const handleRegrant = (consent) => {
    const id =
      consent?.id ||
      consent?.consentId ||
      consent?.key;

    if (!id) return;

    if (typeof regrantConsent === "function") {
      regrantConsent(id);
      return;
    }

    if (typeof toggleConsent === "function") {
      toggleConsent(id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <MobileHeader
        title={
          tr('Consent Details', 'सहमति विवरण')
        }
        subtitle={
          tr('Manage permissions for data use', 'डेटा उपयोग की अनुमतियां प्रबंधित करें')
        }
      />

      <main className="mx-auto w-full max-w-md px-4 py-5 pb-24">
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <ShieldCheck size={21} />
            </div>

            <div>
              <h1 className="text-base font-black text-slate-900">
                {tr('Your consent stays under your control', 'आपकी सहमति आपके नियंत्रण में है')}
              </h1>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                {tr('Withdrawing a permission may restrict the related data-sharing feature.', 'किसी अनुमति को वापस लेने पर संबंधित डेटा-साझाकरण सुविधा प्रतिबंधित हो सकती है।')}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <SectionTitle
            icon={UserCheck}
            title={
              tr('Active consents', 'सक्रिय सहमतियां')
            }
          />

          {activeConsents.length === 0 ? (
            <EmptyCard
              icon={UserCheck}
              text={
                tr('There are no active consents.', 'कोई सक्रिय सहमति नहीं है।')
              }
            />
          ) : (
            <div className="space-y-3">
              {activeConsents.map(
                (consent, index) => {
                  const id =
                    consent?.id ||
                    consent?.consentId ||
                    consent?.key ||
                    `consent-${index}`;

                  const expanded =
                    expandedConsent === id;

                  const withdrawn =
                    String(
                      consent?.status || ""
                    ).toUpperCase() ===
                    "WITHDRAWN";

                  return (
                    <ConsentCard
                      key={id}
                      consent={consent}
                      expanded={expanded}
                      withdrawn={withdrawn}
                      isHindi={isHindi}
                      onToggle={() =>
                        setExpandedConsent(
                          expanded ? null : id
                        )
                      }
                      onWithdraw={() =>
                        handleWithdraw(consent)
                      }
                      onRegrant={() =>
                        handleRegrant(consent)
                      }
                    />
                  );
                }
              )}
            </div>
          )}
        </section>

        <section className="mt-7">
          <SectionTitle
            icon={History}
            title={
              tr('Consent history', 'सहमति इतिहास')
            }
          />

          {history.length === 0 ? (
            <EmptyCard
              icon={History}
              text={
                tr('No consent history available.', 'सहमति इतिहास उपलब्ध नहीं है।')
              }
            />
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
              {history.map((item, index) => {
                const status = String(
                  item?.status ||
                    item?.action ||
                    ""
                ).toUpperCase();

                const withdrawn =
                  status.includes("WITHDRAW") ||
                  status.includes("REVOK");

                return (
                  <div
                    key={
                      item?.id ||
                      item?.consentId ||
                      `history-${index}`
                    }
                    className={`p-4 ${
                      index < history.length - 1
                        ? "border-b border-slate-100"
                        : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {withdrawn ? (
                        <XCircle
                          size={18}
                          className="mt-0.5 shrink-0 text-rose-600"
                        />
                      ) : (
                        <CheckCircle2
                          size={18}
                          className="mt-0.5 shrink-0 text-teal-700"
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800">
                          {item?.purpose ||
                            item?.title ||
                            item?.scope ||
                            (tr('Data permission', 'डेटा अनुमति'))}
                        </p>

                        <p className="mt-1 text-[11px] text-slate-500">
                          {item?.action ||
                            item?.status ||
                            (tr('Status unavailable', 'स्थिति उपलब्ध नहीं'))}
                        </p>

                        <p className="mt-1 text-[10px] text-slate-400">
                          {formatDate(
                            item?.timestamp ||
                              item?.createdAt ||
                              item?.updatedAt ||
                              item?.grantedAt ||
                              item?.withdrawnAt,
                            isHindi
                          )}
                        </p>
                      </div>
                    </div>

                    {withdrawn ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleRegrant(item)
                        }
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-teal-50 px-3 py-2 text-[10px] font-bold text-teal-800"
                      >
                        <RotateCcw size={13} />
                        {tr('Re-grant', 'फिर अनुमति दें')}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-7">
          <SectionTitle
            icon={Clock3}
            title={
              tr('Data access history', 'डेटा एक्सेस इतिहास')
            }
          />

          {accesses.length === 0 ? (
            <EmptyCard
              icon={Clock3}
              text={
                tr('No access activity available.', 'अभी कोई एक्सेस गतिविधि नहीं है।')
              }
            />
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
              {accesses.map((item, index) => (
                <div
                  key={
                    item?.id ||
                    item?.accessId ||
                    `access-${index}`
                  }
                  className={`p-4 ${
                    index < accesses.length - 1
                      ? "border-b border-slate-100"
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <FileText
                      size={17}
                      className="mt-0.5 shrink-0 text-slate-500"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800">
                        {item?.actor ||
                          item?.service ||
                          item?.accessedBy ||
                          (tr('Service', 'सेवा'))}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {item?.purpose ||
                          item?.action ||
                          (tr('Data access', 'डेटा एक्सेस'))}
                      </p>

                      <p className="mt-1 text-[10px] text-slate-400">
                        {formatDate(
                          item?.timestamp ||
                            item?.createdAt ||
                            item?.accessedAt,
                          isHindi
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <button
          type="button"
          onClick={() =>
            setScreen(SCREENS.PRIVACY)
          }
          className="mt-6 flex h-12 w-full items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold text-white"
        >
          {tr('Back to privacy', 'गोपनीयता पर वापस जाएं')}
        </button>
      </main>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}) {
  return (
    <div className="mb-3 flex items-center gap-2 px-1">
      <Icon size={15} className="text-slate-500" />

      <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
        {title}
      </h2>
    </div>
  );
}

function ConsentCard({
  consent,
  expanded,
  withdrawn,
  isHindi,
  onToggle,
  onWithdraw,
  onRegrant,
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
          <UserCheck size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-slate-800">
            {consent?.title ||
              consent?.purpose ||
              consent?.scope ||
              (tr('Data-use permission', 'डेटा उपयोग की अनुमति'))}
          </p>

          <p className="mt-1 text-[11px] text-slate-500">
            {consent?.status ||
              (tr('Active', 'सक्रिय'))}
          </p>
        </div>

        {expanded ? (
          <ChevronUp
            size={18}
            className="shrink-0 text-slate-400"
          />
        ) : (
          <ChevronDown
            size={18}
            className="shrink-0 text-slate-400"
          />
        )}
      </button>

      {expanded ? (
        <div className="border-t border-slate-100 p-4">
          <div className="rounded-2xl bg-slate-50 p-3.5">
            <div className="flex items-start gap-2">
              <Info
                size={15}
                className="mt-0.5 shrink-0 text-slate-500"
              />

              <p className="text-xs leading-5 text-slate-600">
                {consent?.description ||
                  consent?.details ||
                  (tr('This permission allows the stated use of your health information.', 'यह अनुमति स्वास्थ्य जानकारी के निर्धारित उपयोग की अनुमति देती है।'))}
              </p>
            </div>
          </div>

          {withdrawn ? (
            <button
              type="button"
              onClick={onRegrant}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-50 text-xs font-bold text-teal-800"
            >
              <RotateCcw size={15} />
              {tr('Re-grant consent', 'फिर अनुमति दें')}
            </button>
          ) : (
            <button
              type="button"
              onClick={onWithdraw}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-rose-50 text-xs font-bold text-rose-700"
            >
              <XCircle size={15} />
              {tr('Withdraw consent', 'सहमति वापस लें')}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function EmptyCard({
  icon: Icon,
  text,
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-7 text-center">
      <Icon
        size={28}
        className="mx-auto text-slate-300"
      />

      <p className="mt-3 text-xs font-semibold text-slate-500">
        {text}
      </p>
    </div>
  );
}