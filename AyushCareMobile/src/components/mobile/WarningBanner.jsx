import React from "react";
import { AlertCircle, ShieldAlert, Info } from "lucide-react";
import { useLanguage } from "../../i18n/translations";

/**
 * WarningBanner
 * Prominently presents clinical disclaimers and verification guidance.
 * Adheres strictly to healthcare safety guidelines:
 * - "Not a diagnosis"
 * - "Please verify highlighted information"
 * - "We are only correcting document reading. This is not a clinical decision."
 */
export const WarningBanner = ({
  variant = "warning", // 'warning' | 'info' | 'caution'
  title,
  children,
  className = "",
}) => {
  const { isHindi } = useLanguage();

  const defaultTitle =
    title ||
    (variant === "caution"
      ? isHindi
        ? "संभावित चेतावनी संकेत पाया गया"
        : "Possible warning sign detected"
      : isHindi
      ? "दस्तावेज़ से निकाली गई जानकारी — कृपया सत्यापित करें"
      : "Extracted from document — Please verify");

  const defaultMessage =
    variant === "caution"
      ? isHindi
        ? "कृपया तुरंत चिकित्सीय सहायता लें।"
        : "Please seek immediate medical attention."
      : isHindi
      ? "जानकारी में पठन त्रुटियां हो सकती हैं। यह कोई चिकित्सीय निदान नहीं है।"
      : "Information may contain reading errors. This is not a clinical diagnosis.";

  const styles = {
    warning: {
      container: "bg-amber-50/90 border-amber-300 text-amber-900",
      icon: <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />,
      titleColor: "text-amber-950 font-bold",
    },
    caution: {
      container: "bg-rose-50/90 border-rose-300 text-rose-900",
      icon: <ShieldAlert className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />,
      titleColor: "text-rose-950 font-bold",
    },
    info: {
      container: "bg-teal-50/90 border-teal-300 text-teal-900",
      icon: <Info className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />,
      titleColor: "text-teal-950 font-bold",
    },
  };

  const current = styles[variant] || styles.warning;

  return (
    <div
      role="alert"
      className={`w-full rounded-2xl border p-3.5 flex items-start gap-3 shadow-xs ${current.container} ${className}`}
    >
      {current.icon}
      <div className="text-xs leading-relaxed min-w-0">
        {defaultTitle && <p className={`${current.titleColor} text-sm mb-0.5`}>{defaultTitle}</p>}
        {children ? (
          <div className="space-y-1">{children}</div>
        ) : (
          <p className="opacity-90">
            {defaultMessage}
          </p>
        )}
      </div>
    </div>
  );
};

export default WarningBanner;
