import React from "react";

/**
 * BottomActionBar
 * Fixed or sticky bottom bar container designed for one-handed mobile reach.
 * Applies pb-safe so it respects iPhone Home Indicator and Android navigation bars.
 */
export const BottomActionBar = ({
  children,
  className = "",
  dark = false,
  bordered = true,
}) => {
  return (
    <div
      className={`shrink-0 w-full px-4 pt-3 pb-safe transition-colors z-20 ${
        dark
          ? "bg-slate-950/95 backdrop-blur-md"
          : "bg-white/95 backdrop-blur-md"
      } ${
        bordered
          ? dark
            ? "border-t border-slate-800"
            : "border-t border-slate-200/80 shadow-[0_-4px_16px_rgba(0,0,0,0.03)]"
          : ""
      } ${className}`}
    >
      <div className="w-full max-w-md md:max-w-2xl lg:max-w-4xl mx-auto flex flex-col gap-2.5">
        {children}
      </div>
    </div>
  );
};

export default BottomActionBar;
