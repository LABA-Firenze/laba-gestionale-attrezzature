import React, { useState, useRef, useEffect } from 'react';

/**
 * Calendario custom per date.
 * disabledDays: array di giorni da disabilitare (0=domenica, 6=sabato).
 * Es: [0, 6] = solo lun-ven | [0] = lun-sab (domenica disabilitata)
 */
const WeekdayDateInput = ({ value, onChange, minDate, maxDate, disabledDays = [0, 6], disabled, id, name, required, className = '', placeholder = 'Seleziona data' }) => {
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

  useEffect(() => {
    if (value) {
      const [y, m] = value.split('-').map(Number);
      setViewMonth(new Date(y, m - 1, 1));
    }
  }, [value]);
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

  const canSelect = (d) => {
    if (isDisabledDay(d)) return false;
    if (minD && d < minD) return false;
    if (maxD && d > maxD) return false;
    return true;
  };

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
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[280px]">
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
      )}
    </div>
  );
};

export default WeekdayDateInput;
