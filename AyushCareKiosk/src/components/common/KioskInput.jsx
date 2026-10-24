import React from 'react';
import { Keyboard } from 'lucide-react';
import { useKeyboard } from '../../context/KeyboardContext';

export const KioskInput = ({
  id,
  value = '',
  onChange = () => {},
  type = 'text',
  placeholder = '',
  label = '',
  className = '',
  inputClassName = '',
  maxLength,
  allowDecimal = false,
  multiline = false,
  disabled = false,
  onEnter,
  prefixIcon: PrefixIcon = null,
  ...rest
}) => {
  const { openKeyboard, isOpen, activeInput } = useKeyboard();

  const handleOpenKeyboard = (e) => {
    e.stopPropagation();
    openKeyboard({
      id: id || label || 'kiosk-input',
      value,
      onChange,
      type,
      placeholder,
      label,
      onEnter,
      maxLength,
      allowDecimal,
    });
  };

  const isCurrentActive = isOpen && activeInput?.id === (id || label || 'kiosk-input');

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      {PrefixIcon && (
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <PrefixIcon className="w-5 h-5" />
        </div>
      )}

      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          className={`w-full min-h-24 resize-none ${PrefixIcon ? 'pl-11' : 'pl-4'} pr-12 py-3 bg-white border-2 rounded-2xl text-slate-900 font-semibold text-base transition-all focus:outline-none ${
            isCurrentActive ? 'border-teal-700 ring-2 ring-teal-700/20 bg-teal-50/20' : 'border-slate-200 hover:border-teal-400'
          } ${inputClassName}`}
          {...rest}
        />
      ) : (
        <input
          id={id}
          type={type === 'number' || type === 'tel' ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          className={`w-full ${PrefixIcon ? 'pl-11' : 'pl-4'} pr-12 py-3 bg-white border-2 rounded-2xl text-slate-900 font-semibold text-base transition-all focus:outline-none ${
            isCurrentActive ? 'border-teal-700 ring-2 ring-teal-700/20 bg-teal-50/20' : 'border-slate-200 hover:border-teal-400'
          } ${inputClassName}`}
          {...rest}
        />
      )}

      {/* Interactive Keyboard Icon Button */}
      <button
        type="button"
        onClick={handleOpenKeyboard}
        title="Open On-Screen Touch Keyboard"
        aria-label="Open On-Screen Touch Keyboard"
        className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
          isCurrentActive
            ? 'bg-teal-700 text-white shadow-xs'
            : 'bg-slate-100 hover:bg-teal-50 text-slate-500 hover:text-teal-700 border border-slate-200 hover:border-teal-300'
        }`}
      >
        <Keyboard className="w-4 h-4" />
      </button>
    </div>
  );
};

export default KioskInput;
