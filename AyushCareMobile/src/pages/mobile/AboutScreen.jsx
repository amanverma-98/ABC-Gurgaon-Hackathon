import React from "react";
import {
  HeartPulse,
  Smartphone,
  MonitorSmartphone,
  FileText,
  ShieldCheck,
  Languages,
  Accessibility,
  ArrowLeft,
  ExternalLink,
  Info,
} from "lucide-react";

import useMobileStore from "../../store/useMobileStore";
import MobileHeader from "../../components/mobile/MobileHeader";
import useLanguage from "../../i18n/translations";

const Feature = ({
  icon: Icon,
  title,
  description,
}) => (
  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-teal-800 flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4" />
    </div>

    <div className="min-w-0">
      <h3 className="text-xs font-black text-slate-900">
        {title}
      </h3>

      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
        {description}
      </p>
    </div>
  </div>
);

export const AboutScreen = () => {
  const { prevScreen } = useMobileStore();
  const { t, tr, isHindi } = useLanguage();

  return (
    <div className="min-h-full flex flex-col bg-slate-50 text-slate-900 select-none">
      <MobileHeader
        title={t("about_title")}
        showBack={true}
        onBack={prevScreen}
      />

      <main className="flex-1 px-4 sm:px-6 py-4 sm:py-6 max-w-md md:max-w-2xl lg:max-w-3xl mx-auto w-full space-y-5">
        {/* Brand */}
        <section className="p-6 rounded-3xl bg-gradient-to-br from-teal-800 to-teal-950 text-white text-center shadow-md">
          <div className="w-16 h-16 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto">
            <HeartPulse className="w-8 h-8 text-teal-100" />
          </div>

          <h1 className="mt-4 text-2xl font-black tracking-tight">
            P2Care
          </h1>

          <p className="text-xs text-teal-100 mt-1">
            {isHindi
              ? "रोगी का मोबाइल स्वास्थ्य साथी"
              : "Patient Mobile Health Companion"}
          </p>

          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold text-teal-100">
            <Info className="w-3 h-3" />
            {isHindi
              ? "प्रोटोटाइप"
              : "Prototype"}
          </div>
        </section>

        {/* Purpose */}
        <section className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-teal-800" />

            <h2 className="text-sm font-black">
              {isHindi
                ? "P2Care क्या करता है?"
                : "What does P2Care do?"}
            </h2>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {isHindi
              ? "P2Care मोबाइल ऐप मरीज को अस्पताल कियोस्क के साथ जुड़ने, चिकित्सीय दस्तावेज़ जोड़ने, निकाली गई जानकारी की समीक्षा करने और अपनी स्वास्थ्य जानकारी के साझाकरण को नियंत्रित करने में मदद करता है।"
              : "The P2Care mobile app helps patients connect with a hospital kiosk, add medical documents, review information extracted from those documents, and control how their health information is shared."}
          </p>

          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
            <p className="text-[11px] text-amber-900 leading-relaxed">
              <strong>
                {isHindi
                  ? "महत्वपूर्ण:"
                  : "Important:"}
              </strong>{" "}
              {isHindi
                ? "ऐप में दिखाई गई निकाली गई जानकारी नैदानिक सलाह या निदान का विकल्प नहीं है। महत्वपूर्ण जानकारी को मूल दस्तावेज़ और स्वास्थ्यकर्मी से सत्यापित करें।"
                : "Information extracted from documents is not a substitute for clinical advice or diagnosis. Verify important information against the original document and with a healthcare professional."}
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="space-y-3">
          <div className="px-1">
            <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              {isHindi
                ? "मुख्य सुविधाएं"
                : "Key Features"}
            </h2>
          </div>

          <Feature
            icon={MonitorSmartphone}
            title={
              isHindi
                ? "कियोस्क कनेक्शन"
                : "Kiosk Connection"
            }
            description={
              isHindi
                ? "कियोस्क पर दिखाए गए सत्र QR के माध्यम से मोबाइल ऐप को वर्तमान अस्पताल सत्र से जोड़ा जा सकता है।"
                : "Connect the mobile app to the current hospital session using the session QR shown at the kiosk."
            }
          />

          <Feature
            icon={FileText}
            title={
              isHindi
                ? "दस्तावेज़ डिजिटाइज़ेशन"
                : "Document Digitization"
            }
            description={
              isHindi
                ? "पर्चे और अन्य चिकित्सीय दस्तावेज़ जोड़ें, समीक्षा करें और उनसे निकली जानकारी देखें।"
                : "Add prescriptions and other medical documents, review them, and inspect extracted information."
            }
          />

          <Feature
            icon={ShieldCheck}
            title={
              isHindi
                ? "गोपनीयता नियंत्रण"
                : "Privacy Controls"
            }
            description={
              isHindi
                ? "स्वास्थ्य इतिहास साझाकरण, सक्रिय सहमति और कनेक्टेड सत्रों को एक स्थान से प्रबंधित करें।"
                : "Manage health-history sharing, active consent and connected sessions from one place."
            }
          />

          <Feature
            icon={Languages}
            title={
              isHindi
                ? "हिंदी और अंग्रेज़ी"
                : "Hindi & English"
            }
            description={
              isHindi
                ? "ऐप का इंटरफ़ेस हिंदी या अंग्रेज़ी में उपयोग किया जा सकता है।"
                : "Use the interface in either Hindi or English."
            }
          />

          <Feature
            icon={Accessibility}
            title={
              isHindi
                ? "पहुंच सुविधाएं"
                : "Accessibility"
            }
            description={
              isHindi
                ? "बड़ा टेक्स्ट, उच्च कंट्रास्ट, कम एनिमेशन और उपलब्ध हिंदी ऑडियो जैसी सुविधाएं।"
                : "Accessibility options include larger text, higher contrast, reduced motion and available Hindi audio."
            }
          />
        </section>

        {/* Kiosk relationship */}
        <section className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <MonitorSmartphone className="w-4 h-4 text-teal-800" />

            <h2 className="text-sm font-black">
              {isHindi
                ? "मोबाइल + कियोस्क"
                : "Mobile + Kiosk"}
            </h2>
          </div>

          <div className="space-y-2.5">
            {[
              isHindi
                ? "कियोस्क मरीज के दस्तावेज़ और केस-टेकिंग वर्कफ़्लो को शुरू करता है।"
                : "The kiosk starts the patient document and case-taking workflow.",

              isHindi
                ? "मोबाइल ऐप मरीज के लिए निजी समीक्षा और नियंत्रण का स्थान है।"
                : "The mobile app provides the patient's private review and control surface.",

              isHindi
                ? "दोनों के बीच कनेक्शन वर्तमान सत्र के संदर्भ में रखा जाता है।"
                : "The connection is scoped to the current session context.",
            ].map((text, index) => (
              <div
                key={index}
                className="flex items-start gap-2"
              >
                <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-800 flex items-center justify-center text-[9px] font-black shrink-0">
                  {index + 1}
                </span>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Prototype note */}
        <section className="p-4 rounded-2xl bg-slate-100 border border-slate-200">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />

            <div>
              <p className="text-xs font-black text-slate-700">
                {isHindi
                  ? "प्रोटोटाइप नोट"
                  : "Prototype note"}
              </p>

              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                {isHindi
                  ? "यह डेमो/प्रोटोटाइप अनुभव है। वास्तविक अस्पताल इंटीग्रेशन, पहचान सत्यापन, OCR/AI सेवाएं और बैकएंड सुरक्षा वास्तविक तैनाती में अलग सिस्टम के माध्यम से जुड़ेंगे।"
                  : "This is a demo/prototype experience. Real hospital integrations, identity verification, OCR/AI services and backend security would be provided by production systems."}
              </p>
            </div>
          </div>
        </section>

        {/* Version */}
        <div className="text-center pb-6 pt-1">
          <p className="text-[10px] font-bold text-slate-400">
            P2Care Mobile
          </p>

          <p className="text-[9px] text-slate-400 mt-0.5">
            {isHindi
              ? "SIH 2026 प्रोटोटाइप"
              : "SIH 2026 Prototype"}
          </p>
        </div>
      </main>
    </div>
  );
};

export default AboutScreen;