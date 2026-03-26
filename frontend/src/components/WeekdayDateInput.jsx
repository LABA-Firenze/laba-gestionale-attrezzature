import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { isLoanDateDebugEnabled } from '../utils/loanDateDebug';

/**
 * Calendario custom per date.
 * disabledDays: array di giorni da disabilitare (0=domenica, 6=sabato).
 * Es: [0, 6] = solo lun-ven | [0] = lun-sab (domenica disabilitata)
 * disabledDates: array di stringhe YYYY-MM-DD da disabilitare (es. date occupate da prestiti)
 */
const WeekdayDateInput = ({ value, onChange, minDate, maxDate, disabledDays = [0, 6], disabledDates = [], disabled, id, name, required, className = '', placeholder = 'Seleziona data' }) => {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    if (value) {
      const [y, m] = value.split('-').map(Number);
      return new Date(y, m - 1, 1);
    }
    const base = minDate ? (() => { const [y, m, day] = minDate.split('-').map(Number); return new Date(y, m - 1, day); })() : new Date();
    base.setDate(1);
    return base;
  });

  // Con value vuoto (es. "data fine"), il mese mostrato deve seguire minDate quando cambia
  // (es. utente imposta "dal" in aprile ma il calendario era ancora su marzo → tutti i giorni grigi).
  useEffect(() => {
    if (value) {
      const [y, m] = value.split('-').map(Number);
      setViewMonth(new Date(y, m - 1, 1));
      return;
    }
    if (minDate && /^\d{4}-\d{2}-\d{2}$/.test(minDate)) {
      const [y, m] = minDate.split('-').map(Number);
      setViewMonth(new Date(y, m - 1, 1));
    }
  }, [value, minDate]);
  const containerRef = useRef(null);

  const parseDate = (str) => {
    if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const toStr = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const isDisabledDay = (d) => disabledDays.includes(d.getDay());
  const isSameDay = (a, b) => a && b && a.getTime() === b.getTime();

  const minD = minDate ? parseDate(minDate) : null;
  const maxD = maxDate ? parseDate(maxDate) : null;

  const disabledSet = new Set(disabledDates || []);

  const canSelect = (d) => {
    if (isDisabledDay(d)) return false;
    if (minD && d < minD) return false;
    if (maxD && d > maxD) return false;
    if (disabledSet.size && disabledSet.has(toStr(d))) return false;
    return true;
  };

  const wasOpenRef = useRef(false);
  useEffect(() => {
    const becameOpen = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!becameOpen || !isLoanDateDebugEnabled()) return;

    const label = name || placeholder || 'WeekdayDateInput';
    const trace = (y, mo, day) => {
      const dt = new Date(y, mo - 1, day);
      const s = toStr(dt);
      const reasons = [];
      if (isDisabledDay(dt)) reasons.push(`giorno settimana disabilitato: getDay()=${dt.getDay()} (0=dom … 6=sab), disabledDays=${JSON.stringify(disabledDays)}`);
      if (minD && dt < minD) reasons.push(`prima di minDate (${minDate})`);
      if (maxD && dt > maxD) reasons.push(`dopo maxDate (${maxDate})`);
      if (disabledSet.has(s)) reasons.push(`in disabledDates`);
      return { ymd: s, ok: reasons.length === 0, blocchi: reasons.length ? reasons : ['—'] };
    };

    const samples = [
      [2026, 3, 28],
      [2026, 3, 29],
      [2026, 3, 30],
      [2026, 3, 31]
    ];
    const righe = {};
    for (const [y, mo, day] of samples) {
      const key = `${y}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      righe[key] = trace(y, mo, day);
    }

    // eslint-disable-next-line no-console
    console.info(`[LABA datePicker] ${label}`, {
      minDate,
      maxDate,
      disabledDays,
      nota: 'getDay() JS: 0=dom, 1=lun, … 6=sab; disabledDays [0] = solo domenica',
      disabledDatesCount: disabledDates?.length ?? 0,
      disabledDatesPrime15: (disabledDates || []).slice(0, 15),
      campioneMarzo2026: righe
    });
  }, [open, minDate, maxDate, disabledDays, disabledDates, name, placeholder]);

  const buildCalendar = () => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startPad = (first.getDay() + 6) % 7;
    const days = [];
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const selectedDate = parseDate(value);
  const days = buildCalendar();

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        readOnly
        value={value ? new Date(value + 'T12:00:00').toLocaleDateString('it-IT') : ''}
        onClick={() => !disabled && setOpen(!open)}
        placeholder={placeholder}
        id={id}
        name={name}
        required={required}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      />
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/40"
            role="dialog"
            aria-modal="true"
            aria-label="Seleziona data"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div
              className="bg-white border border-gray-200 rounded-xl shadow-2xl p-4 w-[min(320px,calc(100vw-2rem))]"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1))}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  ‹
                </button>
                <span className="text-sm font-medium capitalize">
                  {viewMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  type="button"
                  onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1))}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  ›
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
                {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((l) => (
                  <div key={l}>{l}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((d, i) => {
                  if (!d) return <div key={`e-${i}`} />;
                  const disabled = !canSelect(d);
                  const selected = isSameDay(d, selectedDate);
                  return (
                    <button
                      key={d.getTime()}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        if (!disabled) {
                          onChange(toStr(d));
                          setOpen(false);
                        }
                      }}
                      className={`w-8 h-8 rounded text-sm ${
                        disabled
                          ? 'text-gray-300 cursor-not-allowed'
                          : selected
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-blue-100 text-gray-900'
                      }`}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default WeekdayDateInput;
