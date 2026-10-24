import React, { useEffect, useState } from 'react';
import { Check, Delete, RotateCcw, X, Maximize2, Minimize2, Move } from 'lucide-react';
import { useKeyboard } from '../../context/KeyboardContext';

const NUMBERS = ['1','2','3','4','5','6','7','8','9','0'];
const ROWS = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['z','x','c','v','b','n','m'],
];

export default function OnscreenKeyboard() {
  const { isOpen, activeInput, closeKeyboard, handleKeyPress } = useKeyboard();
  const [shift, setShift] = useState(false);
  const [compact, setCompact] = useState(false);
  const [position, setPosition] = useState({ left: null, top: null, bottom: 22 });
  const dragRef = React.useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setPosition({ left: null, top: null, bottom: 22 });
    const onEscape = (e) => e.key === 'Escape' && closeKeyboard();
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [isOpen, closeKeyboard]);

  if (!isOpen || !activeInput) return null;
  const numeric = activeInput.type === 'number' || activeInput.type === 'tel';
  const add = (key) => handleKeyPress(key);

  const startDrag = (event) => {
    event.preventDefault();
    const node = event.currentTarget.closest('.osk-window');
    if (!node) return;
    const rect = node.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const moveDrag = (event) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    const node = event.currentTarget.closest('.osk-window');
    if (!node) return;
    const width = node.offsetWidth;
    const height = node.offsetHeight;
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, event.clientX - dragRef.current.offsetX));
    const top = Math.max(8, Math.min(window.innerHeight - height - 8, event.clientY - dragRef.current.offsetY));
    setPosition({ left, top, bottom: 'auto' });
  };

  const stopDrag = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  };

  return (
    <div className="osk-layer" aria-label="On-screen keyboard">
      <button className="osk-backdrop" aria-label="Close keyboard" onClick={closeKeyboard} />
      <div
        className={`osk-window ${compact ? 'osk-compact' : ''}`}
        style={{
          ...(position.left !== null
            ? { left: position.left, top: position.top, bottom: 'auto', transform: 'none' }
            : {}),
        }}
      >
        <div className="osk-titlebar">
          <button
            type="button"
            className="osk-drag-handle"
            title="Drag keyboard"
            aria-label="Move keyboard"
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={stopDrag}
            onPointerCancel={stopDrag}
          >
            <Move size={18} />
            <span>Move</span>
          </button>
          <div className="osk-field-info">
            <strong>{activeInput.label || 'Touch keyboard'}</strong>
            <span>{activeInput.maxLength ? `${String(activeInput.value || '').length}/${activeInput.maxLength}` : 'Touch to type'}</span>
          </div>
          <div className="osk-actions">
            <button onClick={() => setCompact((v) => !v)} title="Resize keyboard">{compact ? <Maximize2 size={17}/> : <Minimize2 size={17}/>}</button>
            <button onClick={() => add('CLEAR')} title="Clear"><RotateCcw size={17}/></button>
            <button className="osk-done" onClick={closeKeyboard}><Check size={17}/> Done</button>
            <button onClick={closeKeyboard} title="Close"><X size={17}/></button>
          </div>
        </div>
        <div className="osk-display">{activeInput.value || <span>{activeInput.placeholder || 'Type here…'}</span>}<i /></div>

        {numeric ? (
          <>
            <div className="osk-num-grid">
              {NUMBERS.map((key) => <button key={key} onClick={() => add(key)}>{key}</button>)}
              {activeInput.allowDecimal && <button onClick={() => add('.')}>.</button>}
              <button className="osk-wide-key" onClick={() => add('BACKSPACE')}><Delete size={22}/></button>
            </div>
          </>
        ) : (
          <>
            <div className="osk-row osk-number-row">{NUMBERS.map((key) => <button key={key} onClick={() => add(key)}>{key}</button>)}</div>
            {ROWS.map((row, idx) => <div className="osk-row" key={idx}>{row.map((key) => <button key={key} onClick={() => add(shift ? key.toUpperCase() : key)}>{shift ? key.toUpperCase() : key}</button>)}</div>)}
            <div className="osk-row osk-bottom-row">
              <button className={shift ? 'osk-active' : ''} onClick={() => setShift((v) => !v)}>⇧ Shift</button>
              <button className="osk-space" onClick={() => add('SPACE')}>Space</button>
              <button onClick={() => add('BACKSPACE')}><Delete size={22}/></button>
            </div>
          </>
        )}
        <div className="osk-resize-hint">Drag the lower-right corner to resize</div>
      </div>
    </div>
  );
}
