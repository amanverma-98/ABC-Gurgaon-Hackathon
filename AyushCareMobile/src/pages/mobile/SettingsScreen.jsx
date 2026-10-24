import React, { useEffect } from "react";
import {
  Check,
  ChevronRight,
  Languages,
  LogOut,
  RotateCcw,
  ShieldCheck,
  Type,
  Volume2,
  Building2,
  FileText,
  CalendarDays,
} from "lucide-react";

import useMobileStore, {
  SCREENS,
} from "../../store/useMobileStore";
import MobileHeader from "../../components/mobile/MobileHeader";
import LanguageSwitcher from "../../components/mobile/LanguageSwitcher";
import { useLanguage } from "../../i18n/translations";

const TEXT_SIZES = [
  {
    id: "default",
    label: "Default",
    hindi: "सामान्य",
  },
  {
    id: "large",
    label: "Large",
    hindi: "बड़ा",
  },
];

export default function SettingsScreen() {
  const {
    selectedLanguage,
    setSelectedLanguage,
    accessibilitySettings,
    updateAccessibilitySettings,
    privacyData,
    updatePrivacySetting,
    loadPrivacySettings,
    logout,
    prevScreen,
    setScreen,
  } = useMobileStore();

  const { isHindi, tr } = useLanguage();

  useEffect(() => {
    void loadPrivacySettings?.();
  }, [loadPrivacySettings]);

  const accessibility = accessibilitySettings || {};
  const serverPrivacy = privacyData?.serverSettings || {};

  const updateAccessibility = (
    partialSettings
  ) => {
    if (
      typeof updateAccessibilitySettings ===
      "function"
    ) {
      updateAccessibilitySettings(
        partialSettings
      );
    }
  };



  const resetAccessibility = () => {
    updateAccessibility({
      textSize: "default",
      highContrast: false,
      reduceMotion: false,
      audioAssist: true,
    });
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
        title={
          tr('Settings', 'सेटिंग्स')
        }
        subtitle={
          tr('Language, accessibility and preferences', 'भाषा, पहुंच और ऐप प्राथमिकताएं')
        }
        onBack={prevScreen}
      />

      <main className="mx-auto w-full max-w-md px-4 py-5 pb-24">
        <section>
          <SectionTitle
            title={
              tr('Language', 'भाषा')
            }
          />

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => {}}
              className="flex w-full items-center gap-3 p-4 text-left"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <Languages size={18} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800">
                  {tr('App language', 'ऐप भाषा')}
                </p>

                <p className="mt-1 text-[11px] text-slate-500">
                  {selectedLanguage}
                </p>
              </div>

              <span className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-black text-slate-600">
                {selectedLanguage.toUpperCase()}
              </span>
            </button>
          </div>
          <div className="mt-3"><LanguageSwitcher /></div>
        </section>

        <section className="mt-7">
          <SectionTitle
            title={
              tr('Accessibility', 'पहुंच')
            }
          />

          <div className="space-y-3">
            <SettingToggle
              icon={Type}
              title={
                tr('Larger text', 'बड़ा टेक्स्ट')
              }
              description={
                tr('Increase the text size across the app.', 'स्क्रीन पर टेक्स्ट का आकार बढ़ाएं।')
              }
              enabled={
                accessibility.textSize ===
                "large"
              }
              onChange={(enabled) =>
                updateAccessibility({
                  textSize: enabled
                    ? "large"
                    : "default",
                })
              }
            />

            <SettingToggle
              icon={ShieldCheck}
              title={
                tr('High contrast', 'उच्च कंट्रास्ट')
              }
              description={
                tr('Increase contrast between interface elements and text.', 'टेक्स्ट और इंटरफेस के बीच कंट्रास्ट बढ़ाएं।')
              }
              enabled={Boolean(
                accessibility.highContrast
              )}
              onChange={(enabled) =>
                updateAccessibility({
                  highContrast: enabled,
                })
              }
            />

            <SettingToggle
              icon={Volume2}
              title={
                tr('Audio assistance', 'ऑडियो सहायता')
              }
              description={
                tr('Enable audio assistance where available.', 'जहां उपलब्ध हो वहां ऑडियो सहायता का उपयोग करें।')
              }
              enabled={
                accessibility.audioAssist !==
                false
              }
              onChange={(enabled) =>
                updateAccessibility({
                  audioAssist: enabled,
                })
              }
            />
          </div>
        </section>

        <section className="mt-7">
          <SectionTitle
            title={
              tr('Text size', 'टेक्स्ट आकार')
            }
          />

          <div className="rounded-3xl border border-slate-200 bg-white p-2">
            {TEXT_SIZES.map((size) => {
              const active =
                (accessibility.textSize ||
                  "default") === size.id;

              return (
                <button
                  key={size.id}
                  type="button"
                  onClick={() =>
                    updateAccessibility({
                      textSize: size.id,
                    })
                  }
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left ${
                    active
                      ? "bg-teal-50 text-teal-950"
                      : "text-slate-700"
                  }`}
                >
                  <span className="text-sm font-bold">
                    {isHindi
                      ? size.hindi
                      : size.label}
                  </span>

                  {active ? (
                    <Check
                      size={17}
                      className="text-teal-700"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-7">
          <SectionTitle
            title={
              tr('Data Sharing Controls (Doctor Portal)', 'डेटा साझाकरण नियंत्रण (डॉक्टर पोर्टल)')
            }
          />
          <div className="space-y-3">
            <SettingToggle
              icon={Building2}
              title={
                tr('Share previous departments', 'पिछले विभाग साझा करें')
              }
              description={
                tr('Allow doctors to view departments visited previously.', 'डॉक्टर पोर्टल पर पिछले विभागों की जानकारी देखने की अनुमति दें।')
              }
              enabled={serverPrivacy.share_previous_departments !== false}
              onChange={(val) => updatePrivacySetting("share_previous_departments", val)}
            />

            <SettingToggle
              icon={FileText}
              title={
                tr('Share previous reports', 'पिछली रिपोर्ट और पर्चे साझा करें')
              }
              description={
                tr('Allow doctors to view previously uploaded prescriptions and lab reports.', 'डॉक्टर पोर्टल पर पूर्व रिपोर्ट और नुस्खे देखने की अनुमति दें।')
              }
              enabled={serverPrivacy.share_previous_reports !== false}
              onChange={(val) => updatePrivacySetting("share_previous_reports", val)}
            />

            <SettingToggle
              icon={CalendarDays}
              title={
                tr('Share previous appointments', 'पिछली अपॉइंटमेंट साझा करें')
              }
              description={
                tr('Allow doctors to view past consultations and appointment history.', 'डॉक्टर पोर्टल पर परामर्श और अपॉइंटमेंट इतिहास देखने की अनुमति दें।')
              }
              enabled={serverPrivacy.share_previous_appointments !== false}
              onChange={(val) => updatePrivacySetting("share_previous_appointments", val)}
            />
          </div>
        </section>

        <section className="mt-7">
          <SectionTitle
            title={
              tr('Privacy', 'गोपनीयता')
            }
          />

          <button
            type="button"
            onClick={() =>
              setScreen(SCREENS.PRIVACY)
            }
            className="flex w-full items-center gap-3 rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <ShieldCheck size={18} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800">
                {tr('Privacy & data control', 'गोपनीयता और डेटा नियंत्रण')}
              </p>

              <p className="mt-1 text-[11px] text-slate-500">
                {tr('Manage consent and data access.', 'सहमति और डेटा एक्सेस प्रबंधित करें।')}
              </p>
            </div>

            <ChevronRight
              size={18}
              className="text-slate-400"
            />
          </button>
        </section>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3.5 text-sm font-bold text-rose-700 shadow-sm"
        >
          <LogOut size={17} />
          {tr('Log out', 'लॉग आउट')}
        </button>

        <button
          type="button"
          onClick={resetAccessibility}
          className="mx-auto mt-4 flex items-center gap-1.5 text-[11px] font-bold text-slate-500"
        >
          <RotateCcw size={13} />
          {tr('Reset accessibility', 'पहुंच सेटिंग रीसेट करें')}
        </button>
      </main>
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

function SettingToggle({
  icon: Icon,
  title,
  description,
  enabled,
  onChange,
}) {
  const handleToggle = () => {
    onChange(!enabled);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleToggle();
        }
      }}
      className={`group flex items-center justify-between gap-3.5 rounded-3xl border p-4 shadow-sm transition-all duration-200 cursor-pointer select-none active:scale-[0.98] ${
        enabled
          ? "border-teal-300 bg-teal-50/25 ring-1 ring-teal-200/60"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors duration-200 ${
            enabled
              ? "bg-teal-700 text-white shadow-sm"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          <Icon size={20} strokeWidth={enabled ? 2.3 : 1.9} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 group-hover:text-teal-950">
            {title}
          </p>

          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <div
        role="switch"
        aria-checked={enabled}
        className={`pointer-events-none relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full p-[2px] transition-colors duration-300 ease-in-out ${
          enabled ? "bg-[#34C759]" : "bg-[#E9E9EB]"
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-[27px] w-[27px] transform rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.06)] transition-transform duration-300 ease-in-out ${
            enabled ? "translate-x-[20px]" : "translate-x-0"
          }`}
        />
      </div>
    </div>
  );
}