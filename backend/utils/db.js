// backend/utils/db.js
// Centralized SQLite connection (better-sqlite3) + base schema bootstrap
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const DATA_DIR = process.env.DB_DIR || path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'app.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Funzione per inizializzare il database
export async function initDatabase() {
  console.log('Inizializzazione database...');
  
  // Crea schema unificato completo
  db.exec(`
    -- Tabella users (schema originale)
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      surname TEXT NOT NULL,
      phone TEXT,
      matricola TEXT,
      ruolo TEXT DEFAULT 'user',
      corso_accademico TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Tabella categorie (schema originale)
    CREATE TABLE IF NOT EXISTS categorie (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      madre TEXT NOT NULL,
      figlia TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_categorie_unique
      ON categorie (madre COLLATE NOCASE, figlia COLLATE NOCASE);

    -- Tabella inventario (schema originale)
    CREATE TABLE IF NOT EXISTS inventario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      quantita_totale INTEGER NOT NULL DEFAULT 0,
      categoria_madre TEXT NOT NULL,
      categoria_figlia TEXT,
      posizione TEXT,
      fornitore TEXT,
      note TEXT,
      in_manutenzione INTEGER NOT NULL DEFAULT 0,
      unita TEXT DEFAULT '[]',
      quantita INTEGER DEFAULT 0,
      soglia_minima INTEGER DEFAULT 1,
      tipo_prestito TEXT DEFAULT 'solo_esterno',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Tabella prestiti (schema originale)
    CREATE TABLE IF NOT EXISTS prestiti (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inventario_id INTEGER NOT NULL REFERENCES inventario(id) ON DELETE CASCADE,
      quantita INTEGER NOT NULL DEFAULT 1,
      chi TEXT,
      data_uscita TEXT NOT NULL,
      data_rientro TEXT,
      note TEXT,
      unita TEXT DEFAULT '[]',
      unit_ids_json TEXT DEFAULT '[]',
      stato TEXT DEFAULT 'attivo',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_prestiti_inv ON prestiti(inventario_id);

    -- Tabella riparazioni (schema originale)
    CREATE TABLE IF NOT EXISTS riparazioni (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inventario_id INTEGER NOT NULL REFERENCES inventario(id) ON DELETE CASCADE,
      quantita INTEGER NOT NULL DEFAULT 0,
      stato TEXT,
      note TEXT,
      unit_ids_json TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_riparazioni_inv ON riparazioni(inventario_id);

    -- Tabella richieste (unificata)
    CREATE TABLE IF NOT EXISTS richieste (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      utente_id INTEGER NOT NULL,
      inventario_id INTEGER NOT NULL,
      dal TEXT NOT NULL,
      al TEXT NOT NULL,
      stato TEXT DEFAULT 'in_attesa',
      motivo TEXT,
      note TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(utente_id) REFERENCES users(id),
      FOREIGN KEY(inventario_id) REFERENCES inventario(id)
    );
    CREATE INDEX IF NOT EXISTS idx_rich_user ON richieste (utente_id);
    CREATE INDEX IF NOT EXISTS idx_rich_inv ON richieste (inventario_id);
    CREATE INDEX IF NOT EXISTS idx_rich_state ON richieste (stato);

    -- Tabella segnalazioni (unificata)
    CREATE TABLE IF NOT EXISTS segnalazioni (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      prestito_id INTEGER,
      inventario_id INTEGER,
      tipo TEXT NOT NULL,
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

    -- Tabella corsi (unificata)
    CREATE TABLE IF NOT EXISTS corsi (
      corso TEXT PRIMARY KEY
    );

    -- Tabella inventario_corsi (unificata)
    CREATE TABLE IF NOT EXISTS inventario_corsi (
      inventario_id INTEGER NOT NULL,
      corso TEXT NOT NULL,
      PRIMARY KEY (inventario_id, corso),
      FOREIGN KEY (inventario_id) REFERENCES inventario(id) ON DELETE CASCADE
    );

    -- Tabella inventario_unita (nuova per gestione unità)
    CREATE TABLE IF NOT EXISTS inventario_unita (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inventario_id INTEGER NOT NULL,
      codice_univoco TEXT UNIQUE NOT NULL,
      stato TEXT DEFAULT 'disponibile',
      prestito_corrente_id INTEGER,
      note TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (inventario_id) REFERENCES inventario(id),
      FOREIGN KEY (prestito_corrente_id) REFERENCES prestiti(id)
    );
    CREATE INDEX IF NOT EXISTS idx_inv_unita_inv ON inventario_unita (inventario_id);
    CREATE INDEX IF NOT EXISTS idx_inv_unita_codice ON inventario_unita (codice_univoco);

    -- Tabella password_reset_requests (unificata)
    CREATE TABLE IF NOT EXISTS password_reset_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL
    );
  `);

  // Inserisci admin user solo se configurato da env (niente password in codice)
  const initAdminEmail = process.env.INIT_ADMIN_EMAIL || null;
  const initAdminPassword = process.env.INIT_ADMIN_PASSWORD || null;
  if (initAdminEmail && initAdminPassword) {
    const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get(initAdminEmail);
    if (!adminExists) {
      const hashedPassword = bcrypt.hashSync(initAdminPassword, 10);
      db.prepare(`
        INSERT INTO users (email, password_hash, name, surname, ruolo, corso_accademico)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(initAdminEmail, hashedPassword, 'Admin', 'Sistema', 'admin', 'Tutti');
      console.log('Admin user creato (da INIT_ADMIN_EMAIL)');
    }
  }

  // Inserisci corsi accademici LABA
  const corsiLABA = [
    'Regia e Videomaking',
    'Graphic Design & Multimedia', 
    'Fashion Design',
    'Pittura',
    'Fotografia',
    'Interior Design',
    'Cinema e Audiovisivi',
    'Design'
  ];

  const insertCorso = db.prepare('INSERT OR IGNORE INTO corsi (corso) VALUES (?)');
  corsiLABA.forEach((nome) => {
    try {
      insertCorso.run(nome);
    } catch (e) {
      // Ignora se già esiste
    }
  });

  // Inserisci categorie di esempio
  const categorie = [
    ['Regia e Videomaking', 'Attrezzature Video'],
    ['Graphic Design & Multimedia', 'Computer e Software'],
    ['Fashion Design', 'Macchine da Cucire'],
    ['Pittura', 'Pennelli e Colori'],
    ['Fotografia', 'Macchine Fotografiche']
  ];

  const insertCategoria = db.prepare('INSERT OR IGNORE INTO categorie (madre, figlia) VALUES (?, ?)');
  categorie.forEach(([madre, figlia]) => {
    try {
      insertCategoria.run(madre, figlia);
    } catch (e) {
      // Ignora se già esiste
    }
  });

  console.log('Database inizializzato con successo!');
  console.log('Schema unificato creato con tutte le tabelle');
  console.log('Corsi inseriti:', corsiLABA.length);
  console.log('Categorie inserite:', categorie.length);
}

export default db;
