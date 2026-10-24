import React from "react";

/**
 * PrimaryButton
 * Large, accessible touch target button (52-56px height) tailored for one-handed mobile use.
 */
export const PrimaryButton = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  icon: Icon,
  className = "",
  type = "button",
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full min-h-[54px] px-5 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 transition-all cursor-pointer select-none active:scale-[0.98] ${
        disabled
          ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200"
          : "bg-[#006666] hover:bg-[#005454] active:bg-[#004747] text-white shadow-sm hover:shadow-md border border-teal-800"
      } ${className}`}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : Icon ? (
        <Icon className="w-5 h-5 shrink-0" />
      ) : null}
      <span className="truncate">{children}</span>
    </button>
  );
};

export default PrimaryButton;
