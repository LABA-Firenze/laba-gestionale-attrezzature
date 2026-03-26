/**
 * Date calendario in timezone locale (mai toISOString per YYYY-MM-DD: bug CET/UTC).
 * Prestito esterno max 3 giorni inclusi: lun→mer, mar→gio, …, gio→sab, ven→lun
 * (ven+2 = dom → prima restituzione utile lunedì).
 */

export function toLocalYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseLocalYmd(s) {
  if (!s) return null;
  const raw = String(s).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const [y, m, d] = raw.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Data massima "al" per prestito esterno a 3 giorni inclusi (se il 3° giorno è domenica → lunedì). */
export function maxEndDateExternalThreeDay(dalStr) {
  const start = parseLocalYmd(dalStr);
  if (!start) return '';
  const max = new Date(start);
  max.setDate(max.getDate() + 2);
  if (max.getDay() === 0) {
    max.setDate(max.getDate() + 1);
  }
  return toLocalYmd(max);
}

/** Valida durata esterna come NewRequestModal (max 3 giorni inclusi, eccezione dom→lun). */
export function isValidExternalThreeDayRange(dalStr, alStr) {
  const dataInizio = parseLocalYmd(dalStr);
  const dataFine = parseLocalYmd(alStr);
  if (!dataInizio || !dataFine) return false;
  const diffTime = dataFine.getTime() - dataInizio.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const fineDayOfWeek = dataFine.getDay();
  let isValidDuration = diffDays <= 3;

  if (fineDayOfWeek === 1) {
    const previousDay = new Date(dataFine);
    previousDay.setDate(previousDay.getDate() - 1);
    if (previousDay.getDay() === 0) {
      const durataOriginale =
        Math.floor((previousDay.getTime() - dataInizio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (durataOriginale === 3 && diffDays === 4) {
        isValidDuration = true;
      }
    }
  }

  const maxStr = maxEndDateExternalThreeDay(dalStr);
  if (!maxStr || alStr > maxStr) return false;
  return isValidDuration;
}

/**
 * Primo giorno feriale (lun–ven) a partire da baseYmd che non è in disabled (occupazioni).
 * Evita minDate ∈ disabledDates nel date picker lato utente.
 */
export function firstWeekdaySelectableNotInDisabled(baseYmd, disabledDates) {
  const set = new Set(disabledDates || []);
  let d = parseLocalYmd(baseYmd);
  if (!d) return baseYmd;
  for (let i = 0; i < 366; i++) {
    const ymd = toLocalYmd(d);
    const w = d.getDay();
    if (w !== 0 && w !== 6 && !set.has(ymd)) return ymd;
    d.setDate(d.getDate() + 1);
  }
  return toLocalYmd(d);
}
