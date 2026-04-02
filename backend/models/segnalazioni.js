// backend/models/segnalazioni.js
import db from "../utils/db.js";

db.exec(`
  CREATE TABLE IF NOT EXISTS segnalazioni (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    prestito_id INTEGER,
    inventario_id INTEGER,
    tipo TEXT NOT NULL, -- guasto | ritardo | assistenza
    messaggio TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    handled_by INTEGER,
    handled_at TEXT,
    stato TEXT DEFAULT 'aperta',
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(prestito_id) REFERENCES prestiti(id),
    FOREIGN KEY(inventario_id) REFERENCES inventario(id)
  );
  CREATE INDEX IF NOT EXISTS idx_segn_user ON segnalazioni (user_id);
  CREATE INDEX IF NOT EXISTS idx_segn_tipo ON segnalazioni (tipo);
  CREATE INDEX IF NOT EXISTS idx_segn_state ON segnalazioni (stato);
`);

export function addSegnalazione({ user_id, prestito_id=null, inventario_id=null, tipo, messaggio=null }) {
  const info = db.prepare(`
    INSERT INTO segnalazioni (user_id, prestito_id, inventario_id, tipo, messaggio)
    VALUES (?, ?, ?, ?, ?)
  `).run(user_id, prestito_id, inventario_id, tipo, messaggio);
  return getSegnalazione(info.lastInsertRowid);
}

export function getSegnalazione(id) {
  return db.prepare("SELECT * FROM segnalazioni WHERE id=?").get(id);
}

export function listSegnalazioni({ user_id=null, stato=null } = {}) {
  let sql = "SELECT * FROM segnalazioni WHERE 1=1";
  const params = [];
  if (user_id) { sql += " AND user_id=?"; params.push(user_id); }
  if (stato) { sql += " AND stato=?"; params.push(stato); }
  sql += " ORDER BY created_at DESC, id DESC";
  return db.prepare(sql).all(...params);
}

export function closeSegnalazione(id, { handled_by=null }) {
  db.prepare(`
    UPDATE segnalazioni SET stato='chiusa', handled_by=?, handled_at=CURRENT_TIMESTAMP WHERE id=?
  `).run(handled_by, id);
  return getSegnalazione(id);
}

export function deleteSegnalazione(id) {
  const info = db.prepare("DELETE FROM segnalazioni WHERE id=?").run(id);
  return { deleted: info.changes > 0 };
}