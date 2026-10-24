import { Delete, RotateCcw, Check } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

export const VirtualKeypad = ({ onKeyPress, onBackspace, onClear, onSubmit, submitLabel }) => {
  const { t } = useTranslation();
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="bg-slate-100/90 p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-inner max-w-70 sm:max-w-77.5 w-full mx-auto select-none">
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {keys.map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onKeyPress && onKeyPress(num)}
            className="h-10 sm:h-11 text-lg sm:text-xl font-black bg-white text-slate-800 rounded-xl border border-slate-200 shadow-xs active:scale-95 active:bg-teal-50 transition-all flex items-center justify-center cursor-pointer hover:border-teal-400 hover:text-teal-900"
          >
            {num}
          </button>
        ))}
        
        {/* Clear Button */}
        <button
          type="button"
          onClick={onClear}
          className="h-10 sm:h-11 text-xs font-bold bg-rose-50 text-rose-700 rounded-xl border border-rose-200 active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer hover:bg-rose-100"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t('keypad.clear', 'Clr')}</span>
        </button>

        {/* Zero */}
        <button
          type="button"
          onClick={() => onKeyPress && onKeyPress('0')}
          className="h-10 sm:h-11 text-lg sm:text-xl font-black bg-white text-slate-800 rounded-xl border border-slate-200 shadow-xs active:scale-95 active:bg-teal-50 transition-all flex items-center justify-center cursor-pointer hover:border-teal-400 hover:text-teal-900"
        >
          0
        </button>

        {/* Backspace Button */}
        <button
          type="button"
          onClick={onBackspace}
          className="h-10 sm:h-11 text-xs font-bold bg-amber-50 text-amber-800 rounded-xl border border-amber-200 active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer hover:bg-amber-100"
        >
          <Delete className="w-3.5 h-3.5" />
          <span>{t('keypad.delete', 'Del')}</span>
        </button>
      </div>

      {onSubmit && (
        <button
          type="button"
          onClick={onSubmit}
          className="w-full mt-2 h-10 sm:h-11 bg-teal-800 hover:bg-teal-700 text-white font-black rounded-xl flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all cursor-pointer text-sm"
        >
          <Check className="w-4 h-4 text-amber-300" />
          <span>{submitLabel || t('nav.continue', 'Continue')}</span>
        </button>
      )}
    </div>
  );
};

export default VirtualKeypad;
