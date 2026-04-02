// backend/models/prestiti.js
import db from "../utils/db.js";

// utils ---------------------------------------------------------------
const none = (v) => (v == null || String(v).trim() === "" ? null : String(v).trim());

function parseUnita(u) {
  try { const a = Array.isArray(u) ? u : JSON.parse(u ?? "[]"); return Array.isArray(a) ? a.map(String) : []; }
  catch { return []; }
}
const jsonUnita = (u) => JSON.stringify(parseUnita(u));

function parseDateAny(s) {
  const v = none(s); if (!v) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}`);
  const iso = v.length > 10 ? v.slice(0, 10) : v;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}
const beginOfDay = (d) => { d = new Date(d); d.setHours(0,0,0,0); return d; };
const today = () => beginOfDay(new Date());
const daysDiff = (a, b) => !a || !b ? null : Math.max(0, Math.round((beginOfDay(b)-beginOfDay(a))/86400000));

// core availability ---------------------------------------------------
function getInventarioRow(id) {
  const r = db.prepare(`SELECT id, quantita_totale, unita FROM inventario WHERE id=?`).get(id);
  if (!r) throw new Error("Inventario non trovato");
  r.unita = parseUnita(r.unita);
  return r;
}

/** Prestiti che si sovrappongono al periodo richiesto (escluso un id se presente) */
function overlappingLoans({ inventario_id, dal, al, exclude_id=null }) {
  return db.prepare(`
    SELECT id, quantita, data_uscita, data_rientro, unita
    FROM prestiti
    WHERE inventario_id = @inventario_id
      AND (@al IS NULL OR date(data_uscita) <= date(@al))
      AND (data_rientro IS NULL OR date(data_rientro) >= date(@dal))
      AND (@exclude_id IS NULL OR id <> @exclude_id)
  `).all({ inventario_id, dal, al, exclude_id })
   .map(r => ({ ...r, unita: parseUnita(r.unita) }));
}

/** Calcola occupazione e conflitti */
function computeOccupation({ inv, loans }) {
  // unità occupate -> data rientro max (serve per "disponibile da")
  const occByUnit = new Map(); // name -> rientro (Date|null)
  let generic = 0;
  for (const p of loans) {
    if (p.unita.length > 0) {
      const back = p.data_rientro ? parseDateAny(p.data_rientro) : null;
      for (const name of p.unita) {
        const prev = occByUnit.get(name);
        if (!prev || (back && (!prev || back > prev))) occByUnit.set(name, back);
        if (!occByUnit.has(name)) occByUnit.set(name, back);
      }
    } else {
      generic += Number(p.quantita || 0);
    }
  }
  return { occByUnit, genericUsed: generic, used: generic + occByUnit.size, cap: Math.max(0, (inv.quantita_totale || 0) - (generic + occByUnit.size)) };
}

/** Riparazioni attive per un inventario (tutte le righe sono considerate attive, senza stato/tempo) */
function listRepairs(inventario_id) {
  try {
    const rows = db.prepare(`
      SELECT quantita, unit_ids_json
      FROM riparazioni
      WHERE inventario_id = ?
    `).all(inventario_id);
    return rows.map(r => ({
      quantita: Number(r?.quantita || 0),
      units: parseUnita(r?.unit_ids_json),
    }));
  } catch {
    // se la tabella non esiste o manca la colonna, consideriamo 0 riparazioni
    return [];
  }
}

/** Verifica disponibilità e lancia con errore 400 in caso di conflitti */
function assertAvailability({ inventario_id, dal, al, quantita=1, unita=[], exclude_id=null, chi }) {
  if (!none(chi)) throw new Error("Parametri mancanti: prestato a (chi)");
  const inv = getInventarioRow(inventario_id);
  const reqUnits = parseUnita(unita);
  // date sane
  const D = parseDateAny(dal); if (!D) throw new Error("Data di uscita non valida");
  const A = none(al) ? null : parseDateAny(al);
  if (A && A < D) throw new Error("La data di riconsegna è precedente all'uscita");

  // overlapping
  const loans = overlappingLoans({ inventario_id, dal: dal, al: al ?? null, exclude_id });
  let { occByUnit, genericUsed } = computeOccupation({ inv, loans });

  // --- integra riparazioni: unità e quantità in riparazione non sono prenotabili ---
  const repairs = listRepairs(inventario_id);
  let repGeneric = 0;
  for (const r of repairs) {
    const units = Array.isArray(r.units) ? r.units : [];
    if (units.length > 0) {
      for (const name of units) {
        if (!occByUnit.has(name)) occByUnit.set(name, null); // occupata senza data di rientro
      }
    } else {
      repGeneric += Number(r.quantita || 0);
    }
  }
  // aggiorna i conteggi con le riparazioni
  genericUsed += repGeneric;
  used = genericUsed + occByUnit.size;
  cap = Math.max(0, (inv.quantita_totale || 0) - used);

  // 1) unità richieste devono esistere e non essere già occupate
  const conflicts = [];
  const invalid = [];
  for (const name of reqUnits) {
    if (name && !inv.unita.includes(name)) invalid.push(name);
    const busyUntil = occByUnit.get(name);
    if (busyUntil !== undefined) {
      conflicts.push({ name, available_from: busyUntil ? busyUntil.toISOString().slice(0,10) : null });
    }
  }
  if (invalid.length) {
    throw new Error(`Unità inesistenti: ${invalid.join(", ")}`);
  }
  if (conflicts.length) {
    const msg = conflicts.map(c => `“${c.name}” non disponibile${c.available_from ? ` (disponibile da ${c.available_from})` : ""}`).join("; ");
    const e = new Error(msg); e.code = 400; throw e;
  }

  // 2) capacità residua per quota non nominativa
  const reqQty = Math.max(1, Number(quantita) || 1);
  const named = reqUnits.length;
  const extra = Math.max(0, reqQty - named);
  const availableForExtra = Math.max(0, (inv.quantita_totale || 0) - (genericUsed + occByUnit.size + named));
  if (extra > availableForExtra) {
    const msg = `Capienza insufficiente: richiesti ${reqQty}, disponibili ${availableForExtra + named} nel periodo`;
    const e = new Error(msg); e.code = 400; throw e;
  }
  // ok
  return { ok:true, availableForExtra, total: inv.quantita_totale, usedNow: used };
}

// public API ----------------------------------------------------------
export function unitAvailability({ inventario_id, dal, al, exclude_id=null }) {
  const inv = getInventarioRow(inventario_id);
  const loans = overlappingLoans({ inventario_id, dal, al, exclude_id });
  const { occByUnit, used, cap } = computeOccupation({ inv, loans });

  // integra riparazioni: queste unità non sono selezionabili
  const repairs = listRepairs(inventario_id);
  const repairSet = new Set();
  for (const r of repairs) {
    const units = Array.isArray(r?.units) ? r.units : [];
    for (const name of units) repairSet.add(name);
  }

  return {
    inventario_id,
    total: inv.quantita_totale,
    used_now: used,
    available_generic: cap,
    units: inv.unita.map(name => {
      const inLoan = occByUnit.has(name);
      const inRepair = repairSet.has(name);
      const available = !(inLoan || inRepair);
      const available_from = inLoan
        ? (occByUnit.get(name) ? occByUnit.get(name).toISOString().slice(0,10) : null)
        : null;
      const reason = inRepair ? "riparazione" : (inLoan ? "prestito" : null);
      return { name, available, available_from, reason };
    }),
  };
}

// list/get ------------------------------------------------------------
export function listPrestiti() {
  const rows = db.prepare(`
    SELECT p.id, p.inventario_id, p.quantita, p.chi,
           p.data_uscita, p.data_rientro, p.note,
           p.created_at, p.updated_at, p.unita,
           p.prestato_nome, p.prestato_cognome, p.prestato_telefono, p.prestato_email, p.prestato_matricola,
           COALESCE(i.nome, (SELECT nome FROM inventario WHERE id=p.inventario_id)) AS inventario_nome
    FROM prestiti p
    LEFT JOIN inventario i ON i.id = p.inventario_id
    ORDER BY COALESCE(p.updated_at, p.created_at, p.data_uscita) DESC, p.id DESC
  `).all();

  return rows.map(r => {
    const dOut = parseDateAny(r.data_uscita);
    const dBack = parseDateAny(r.data_rientro);
    return {
      ...r,
      unita: parseUnita(r.unita),
      giorni_totali: dOut && dBack ? daysDiff(dOut, dBack) : null,
      giorni_rimanenti: dBack ? (daysDiff(today(), dBack) ?? 0) : null,
    };
  });
}

export function getPrestito(id) {
  const r = db.prepare(`
    SELECT p.id, p.inventario_id, p.quantita, p.chi,
           p.data_uscita, p.data_rientro, p.note,
           p.created_at, p.updated_at, p.unita,
           p.prestato_nome, p.prestato_cognome, p.prestato_telefono, p.prestato_email, p.prestato_matricola,
           COALESCE(i.nome, (SELECT nome FROM inventario WHERE id=p.inventario_id)) AS inventario_nome
    FROM prestiti p
    LEFT JOIN inventario i ON i.id = p.inventario_id
    WHERE p.id = ?
  `).get(id);
  if (!r) return null;
  const dOut = parseDateAny(r.data_uscita);
  const dBack = parseDateAny(r.data_rientro);
  return {
    ...r,
    unita: parseUnita(r.unita),
    giorni_totali: dOut && dBack ? daysDiff(dOut, dBack) : null,
    giorni_rimanenti: dBack ? (daysDiff(today(), dBack) ?? 0) : null,
  };
}

// create/update/delete ------------------------------------------------
export function addPrestito({
  inventario_id, quantita = 1, chi, data_uscita, note, unita = [], data_rientro, riconsegna,
  prestato_nome, prestato_cognome, prestato_telefono, prestato_email, prestato_matricola
}) {
  const out = none(data_uscita);
  const back = none(data_rientro ?? riconsegna);

  // calcola chi per retrocompatibilità (preferisce chi, altrimenti Nome+Cognome)
  const chiValue = none(chi) ?? `${(prestato_nome || "").trim()} ${(prestato_cognome || "").trim()}`.trim();

  // validazione: accetta o i 3 campi (nome/cognome/telefono) oppure un chi non vuoto (legacy)
  const hasTrio = !!(none(prestato_nome) && none(prestato_cognome) && none(prestato_telefono));
  if (!chiValue && !hasTrio) {
    throw new Error("Parametri mancanti: nome, cognome, telefono dello studente (oppure 'chi')");
  }

  assertAvailability({ inventario_id, dal: out, al: back, quantita, unita, chi: chiValue });

  const info = db.prepare(`
    INSERT INTO prestiti (inventario_id, quantita, chi, data_uscita, data_rientro, note, unita,
                          prestato_nome, prestato_cognome, prestato_telefono, prestato_email, prestato_matricola)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    Number(inventario_id),
    Number(quantita) || 1,
    chiValue,
    out,
    back,
    none(note),
    jsonUnita(unita),
    none(prestato_nome),
    none(prestato_cognome),
    none(prestato_telefono),
    none(prestato_email),
    none(prestato_matricola)
  );
  return getPrestito(info.lastInsertRowid);
}

export function updatePrestito(id, {
  quantita, chi, data_uscita, data_rientro, riconsegna, uscita, note, unita,
  prestato_nome, prestato_cognome, prestato_telefono, prestato_email, prestato_matricola
}) {
  const out = none(data_uscita ?? uscita);
  const back = none(data_rientro ?? riconsegna);
  const q = quantita == null ? undefined : (Number(quantita) || 1);
  const u = unita === undefined ? undefined : parseUnita(unita);

  // rileggo record per avere valori correnti se alcuni campi non vengono passati
  const curr = getPrestito(id);
  if (!curr) throw new Error("Prestito non trovato");

  const newOut = out ?? curr.data_uscita;
  const newBack = (back === undefined ? curr.data_rientro : back);
  const newQty = q ?? curr.quantita;
  const newUnita = u ?? curr.unita;

  // calcola nuovi valori anagrafica (fallback ai correnti)
  const newNome      = prestato_nome      === undefined ? curr.prestato_nome      : prestato_nome;
  const newCognome   = prestato_cognome   === undefined ? curr.prestato_cognome   : prestato_cognome;
  const newTelefono  = prestato_telefono  === undefined ? curr.prestato_telefono  : prestato_telefono;
  const newEmail     = prestato_email     === undefined ? curr.prestato_email     : prestato_email;
  const newMatricola = prestato_matricola === undefined ? curr.prestato_matricola : prestato_matricola;

  // chi calcolato se non fornito
  const chiValue = none(chi) ?? `${(newNome || "").trim()} ${(newCognome || "").trim()}`.trim();

  // validazione: accetta o i 3 campi (nome/cognome/telefono) oppure un chi non vuoto (legacy)
  const hasTrio = !!(none(newNome) && none(newCognome) && none(newTelefono));
  if (!chiValue && !hasTrio) {
    throw new Error("Parametri mancanti: nome, cognome, telefono dello studente (oppure 'chi')");
  }

  assertAvailability({
    inventario_id: curr.inventario_id,
    dal: newOut,
    al: newBack,
    quantita: newQty,
    unita: newUnita,
    exclude_id: id,
    chi: chiValue,
  });

  db.prepare(`
    UPDATE prestiti SET
      quantita     = COALESCE(?, quantita),
      chi          = COALESCE(?, chi),
      data_uscita  = COALESCE(?, data_uscita),
      data_rientro = COALESCE(?, data_rientro),
      note         = COALESCE(?, note),
      unita        = COALESCE(?, unita),
      prestato_nome      = COALESCE(?, prestato_nome),
      prestato_cognome   = COALESCE(?, prestato_cognome),
      prestato_telefono  = COALESCE(?, prestato_telefono),
      prestato_email     = COALESCE(?, prestato_email),
      prestato_matricola = COALESCE(?, prestato_matricola),
      updated_at   = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    q ?? null,
    chiValue,
    out ?? null,
    back ?? null,
    none(note),
    (unita === undefined ? null : jsonUnita(unita)),
    none(newNome),
    none(newCognome),
    none(newTelefono),
    none(newEmail),
    none(newMatricola),
    id
  );

  return getPrestito(id);
}

export function chiudiPrestito(id, { data_rientro, riconsegna }) {
  const back = none(data_rientro ?? riconsegna);
  if (!back) throw new Error("Parametri mancanti: data_rientro");
  db.prepare(`UPDATE prestiti SET data_rientro=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(back, id);
  return getPrestito(id);
}

export function deletePrestito(id) {
  const info = db.prepare(`DELETE FROM prestiti WHERE id=?`).run(id);
  return { deleted: info.changes > 0 };
}