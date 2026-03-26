/**
 * Debug date picker (solo browser). Railway non vede maxDate/disabledDates.
 *
 * Attivazione — nella console DevTools (F12):
 *   localStorage.setItem('LABA_DEBUG_DATES', '1')
 * poi ricarica la pagina. Disattiva:
 *   localStorage.removeItem('LABA_DEBUG_DATES')
 *
 * Oppure senza reload (stessa sessione):
 *   window.__LABA_DEBUG_DATES__ = true
 * e riapri il calendario.
 */
export function isLoanDateDebugEnabled() {
  try {
    return (
      typeof window !== 'undefined' &&
      (window.__LABA_DEBUG_DATES__ === true || localStorage.getItem('LABA_DEBUG_DATES') === '1')
    );
  } catch {
    return false;
  }
}
