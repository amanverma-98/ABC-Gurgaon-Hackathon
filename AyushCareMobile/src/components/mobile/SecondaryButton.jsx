import React from "react";

/**
 * SecondaryButton
 * Subtle outline or muted background button for secondary actions (Retake, Cancel, View Original).
 */
export const SecondaryButton = ({
  children,
  onClick,
  disabled = false,
  icon: Icon,
  variant = "outline", // 'outline' | 'ghost' | 'light'
  className = "",
  type = "button",
}) => {
  const variantStyles = {
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100",
    ghost: "border-transparent bg-transparent text-slate-600 hover:bg-slate-100 active:bg-slate-200",
    light: "border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 active:bg-teal-200",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[50px] px-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer select-none active:scale-[0.98] ${
        disabled
          ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
          : variantStyles[variant] || variantStyles.outline
      } ${className}`}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      <span className="truncate">{children}</span>
    </button>
  );
};

export default SecondaryButton;
