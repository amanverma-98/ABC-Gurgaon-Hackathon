import React from "react";
import {
  FileText,
  FileSpreadsheet,
  Building2,
  FolderHeart,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { useLanguage } from "../../i18n/translations";

const ICON_MAP = {
  FileText,
  FileSpreadsheet,
  Building2,
  FolderHeart,
};

const SUBTITLE_HI = {
  prescription: "पर्चे या ओपीडी स्लिप अपलोड करें",
  lab_report: "रक्त, मूत्र या नैदानिक जांच रिपोर्ट अपलोड करें",
  discharge_summary: "अस्पताल डिस्चार्ज सारांश अपलोड करें",
  other: "टीकाकरण या अन्य स्वास्थ्य दस्तावेज़ अपलोड करें",
};

/**
 * DocumentTypeCard
 * Large touch-friendly selection card with icon, title, and clear selection badge.
 * Shows strictly one language (English OR Hindi) based on active language setting.
 */
export const DocumentTypeCard = ({
  type,
  isSelected,
  onSelect,
}) => {
  const { isHindi, tr } = useLanguage();
  const IconComponent = ICON_MAP[type.iconName] || FileText;

  const displayTitle = isHindi ? (type.hi || type.title) : type.title;
  const displaySubtitle = isHindi ? (SUBTITLE_HI[type.id] || type.subtitle) : type.subtitle;

  return (
    <button
      type="button"
      onClick={() => onSelect(type.id)}
      className={`w-full min-h-[82px] p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer select-none active:scale-[0.99] flex items-center justify-between gap-3.5 ${
        isSelected
          ? "bg-teal-50/90 border-[#006666] shadow-sm ring-2 ring-[#006666]/10"
          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 shadow-xs"
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {/* Document Category Icon */}
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
            isSelected
              ? "bg-[#006666] text-white shadow-xs"
              : "bg-slate-100 text-teal-800"
          }`}
        >
          <IconComponent className="w-6 h-6" />
        </div>

        {/* Text Content */}
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-900 leading-tight">
            {displayTitle}
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-snug line-clamp-2">
            {displaySubtitle}
          </p>
        </div>
      </div>

      {/* Selection State Indicator */}
      <div className="shrink-0 pl-1">
        {isSelected ? (
          <div className="w-6 h-6 rounded-full bg-[#006666] text-white flex items-center justify-center shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
        ) : (
          <Circle className="w-6 h-6 text-slate-300 stroke-[1.5]" />
        )}
      </div>
    </button>
  );
};

export default DocumentTypeCard;
