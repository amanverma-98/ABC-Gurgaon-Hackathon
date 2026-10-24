import React from "react";
import { Lock, Unlock, ShieldAlert, X, AlertCircle } from "lucide-react";
import { useLanguage } from "../../i18n/translations";

/**
 * PrivacyConfirmModal
 * Reusable, patient-friendly confirmation modal for sensitive privacy actions:
 * - Locking / Unlocking Health History
 * - Withdrawing Active Consent
 * - Terminating Active Connected Sessions
 */
export const PrivacyConfirmModal = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  variant = "warning", // "warning" | "danger" | "primary"
  icon: CustomIcon,
}) => {
  const { isHindi, tr } = useLanguage();
  if (!isOpen) return null;

  const defaultCancel = cancelText || (tr('Cancel', 'रद्द करें'));

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          iconBg: "bg-rose-100 text-rose-700 border border-rose-200",
          confirmBtn: "bg-rose-700 hover:bg-rose-800 text-white focus:ring-rose-500",
          badge: "bg-rose-50 text-rose-800 border-rose-200",
          Icon: CustomIcon || ShieldAlert,
        };
      case "primary":
        return {
          iconBg: "bg-teal-100 text-teal-800 border border-teal-200",
          confirmBtn: "bg-teal-800 hover:bg-teal-900 text-white focus:ring-teal-600",
          badge: "bg-teal-50 text-teal-800 border-teal-200",
          Icon: CustomIcon || Unlock,
        };
      case "warning":
      default:
        return {
          iconBg: "bg-amber-100 text-amber-800 border border-amber-200",
          confirmBtn: "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500",
          badge: "bg-amber-50 text-amber-900 border-amber-200",
          Icon: CustomIcon || Lock,
        };
    }
  };

  const { iconBg, confirmBtn, Icon } = getVariantStyles();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200/90 text-slate-900 space-y-4 animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar: Icon & Close */}
        <div className="flex items-start justify-between gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${iconBg}`}>
            <Icon className="w-6 h-6" />
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Close dialog"
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title and Message */}
        <div className="space-y-1.5">
          <h3
            id="privacy-modal-title"
            className="text-lg sm:text-xl font-black text-slate-900 leading-snug"
          >
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Non-destructive reminder note */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 leading-snug flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            {tr('This product setting does not delete any of your saved records.', 'यह सेटिंग आपके किसी भी सहेजे गए रिकॉर्ड को नष्ट या डिलीट नहीं करती है।')}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[48px] px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm transition active:scale-[0.98] cursor-pointer"
          >
            {defaultCancel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`min-h-[48px] px-4 rounded-2xl font-black text-xs sm:text-sm transition active:scale-[0.98] cursor-pointer shadow-sm ${confirmBtn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyConfirmModal;
