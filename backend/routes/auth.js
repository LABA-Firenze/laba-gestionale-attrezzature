// backend/routes/auth.js - PostgreSQL Version
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from '../utils/postgres.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { normalizeUser, normalizeRole } from '../utils/roles.js';
import { sendPasswordResetEmail } from '../utils/email.js';
import { setSealedAuthCookie } from '../utils/tokenCookieSeal.js';

const r = Router();

// Rate limit su login/register/forgot-password per mitigare brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Troppi tentativi. Riprova tra 15 minuti.' },
  standardHeaders: true,
  legacyHeaders: false,
});
// In produzione JWT_SECRET deve essere impostato (es. variabile d'ambiente su Railway).
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev-secret-change-me');
if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
  console.error('❌ JWT_SECRET mancante. Impostalo in produzione.');
}

// === Special admin (solo se configurato da env, niente credenziali in codice) ===
const SPECIAL_ADMIN_USERNAME = process.env.SPECIAL_ADMIN_USERNAME || null;
const SPECIAL_ADMIN_PASSWORD = process.env.SPECIAL_ADMIN_PASSWORD || null;
const specialAdminEnabledByEnv = process.env.ENABLE_SPECIAL_ADMIN === 'true';
const specialAdminEnabled =
  specialAdminEnabledByEnv &&
  process.env.NODE_ENV !== 'production' &&
  !!(SPECIAL_ADMIN_USERNAME && SPECIAL_ADMIN_PASSWORD);

function isSpecialAdminLogin(identifier, password) {
  if (!specialAdminEnabled) return false;
  const id = (identifier || '').trim().toLowerCase();
  const pw = (password ?? '').toString().normalize('NFKC').replace(/\u00A0/g, ' ').trim();
  return id === SPECIAL_ADMIN_USERNAME.toLowerCase() && pw === SPECIAL_ADMIN_PASSWORD;
}
function specialAdminUser() {
  return {
    id: -1,
    email: SPECIAL_ADMIN_USERNAME,
    ruolo: 'admin',
    name: 'LABA',
    surname: 'Admin',
    corso_accademico: null,
  };
}

function signUser(user) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET non configurato');
  const u = normalizeUser(user);
  const payload = {
    id: u.id,
    email: u.email,
    ruolo: u.ruolo,
    corso_accademico: u.corso_accademico
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

const COOKIE_NAME = 'laba_token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 giorni

function setAuthCookie(res, token) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET non configurato');
  setSealedAuthCookie(res, COOKIE_NAME, token, JWT_SECRET, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/'
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

// POST /api/auth/login — imposta cookie httpOnly, risponde solo con { user }
r.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password richiesti' });
    }

    let userPayload;
    let token;
    if (isSpecialAdminLogin(email, password)) {
      token = signUser(specialAdminUser());
      setAuthCookie(res, token);
      userPayload = specialAdminUser();
    } else {
      const result = await query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.length === 0) {
        return res.status(401).json({ error: 'Credenziali non valide' });
      }
      const user = normalizeUser(result[0]);
      const isValid = bcrypt.compareSync(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Credenziali non valide' });
      }
      token = signUser(user);
      setAuthCookie(res, token);
      userPayload = {
        id: user.id,
        email: user.email,
        name: user.name,
        surname: user.surname,
        ruolo: user.ruolo,
        corso_accademico: user.corso_accademico
      };
    }
    // Security hardening: il JWT resta solo nel cookie httpOnly.
    res.json({ user: userPayload });
  } catch (error) {
    console.error('Errore login:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// POST /api/auth/logout — rimuove il cookie
r.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

// POST /api/auth/register (pubblico o con admin: se non autenticato, ruolo sempre 'user')
r.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, name, surname, phone, matricola, corso_accademico, ruolo } = req.body || {};
    
    if (!email || !password || !name || !surname) {
      return res.status(400).json({ error: 'Email, password, nome e cognome richiesti' });
    }

    // Check if user already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Utente già esistente' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    
    // Solo un admin autenticato può assegnare un ruolo diverso da 'user'. Registrazione pubblica = sempre 'user'.
    let storedRole = 'user';
    if (JWT_SECRET) {
      try {
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        if (token) {
          const payload = jwt.verify(token, JWT_SECRET);
          const isAdmin = payload?.id === -1 || (payload?.ruolo || '').toLowerCase() === 'admin' || (payload?.ruolo || '').toLowerCase() === 'supervisor';
          if (isAdmin && ruolo != null && ruolo !== '') {
            const userRole = normalizeRole(ruolo, null, email);
            storedRole = userRole === 'admin' ? 'supervisor' : userRole;
          }
        }
      } catch (_) { /* token assente/invalido: resta 'user' */ }
    }

    const result = await query(`
      INSERT INTO users (email, password_hash, name, surname, phone, matricola, corso_accademico, ruolo)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, email, name, surname, ruolo, corso_accademico
    `, [email, hashedPassword, name, surname, phone || null, matricola || null, corso_accademico || null, storedRole]);

    const user = normalizeUser(result[0]);
    const token = signUser(user);
    setAuthCookie(res, token);
    // Security hardening: il JWT resta solo nel cookie httpOnly.
    res.status(201).json({ user });
  } catch (error) {
    console.error('Errore registrazione:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// GET /api/auth/me
r.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

// POST /api/auth/forgot-password - Self-service: invia email con link per reset
r.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Email richiesta' });
    }

    const result = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (result.length === 0) {
      // Non rivelare se l'email esiste (sicurezza)
      return res.json({ message: 'Se l\'email è registrata, riceverai un link per il reset della password' });
    }

    // Token random: in DB salviamo SOLO hash SHA-256 (best practice)
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await query(`
      INSERT INTO password_reset_requests (email, token, expires_at, status)
      VALUES ($1, $2, $3, 'pending')
    `, [email, tokenHash, expiresAt]);

    const frontendUrl = (process.env.FRONTEND_URL || process.env.APP_URL || 'https://attrezzatura.laba.biz').replace(/\/$/, '');
    const resetLink = `${frontendUrl}/?resetToken=${encodeURIComponent(token)}`;

    const emailResult = await sendPasswordResetEmail({ to: email, resetLink });

    if (!emailResult.success) {
      console.error('Errore invio email reset:', emailResult.error);
      return res.status(500).json({ error: 'Impossibile inviare l\'email. Riprova più tardi o contatta l\'assistenza.' });
    }

    res.json({ message: 'Se l\'email è registrata, riceverai un link per il reset della password' });
  } catch (error) {
    console.error('Errore forgot password:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// POST /api/auth/reset-password
r.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ error: 'Token e password richiesti' });
    }

    const normalizedToken = String(token).trim();
    const tokenHash = crypto.createHash('sha256').update(normalizedToken).digest('hex');

    // Cerca il token anche fuori da "pending" per distinguere meglio i casi:
    // - non trovato
    // - già usato/completato/cancellato
    // - scaduto
    // Compatibilità retroattiva: accetta token hashato (nuovo) e raw (vecchi link).
    const result = await query(`
      SELECT * FROM password_reset_requests
      WHERE token IN ($1, $2)
      ORDER BY created_at DESC
      LIMIT 1
    `, [tokenHash, normalizedToken]);

    if (result.length === 0) {
      return res.status(400).json({ error: 'Token non valido o scaduto' });
    }

    const resetRequest = result[0];
    const requestStatus = (resetRequest.status || '').trim().toLowerCase();
    const normalizedStatus = requestStatus === '' ? 'pending' : requestStatus;
    const isExpired = new Date(resetRequest.expires_at).getTime() <= Date.now();

    if (normalizedStatus !== 'pending') {
      return res.status(400).json({ error: 'Questo link di reset non e piu valido. Richiedi un nuovo link.' });
    }
    if (isExpired) {
      return res.status(400).json({ error: 'Token non valido o scaduto' });
    }

    const email = resetRequest.email;

    // Update password
    const hashedPassword = bcrypt.hashSync(password, 10);
    await query('UPDATE users SET password_hash = $1 WHERE email = $2', [hashedPassword, email]);

    // Mark reset request as used
    await query('UPDATE password_reset_requests SET status = $1 WHERE id = $2', ['used', resetRequest.id]);

    res.json({ message: 'Password aggiornata con successo' });
  } catch (error) {
    console.error('Errore reset password:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// GET /api/auth/password-reset-requests (admin only)
r.get('/password-reset-requests', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        prr.email, 
        prr.token, 
        prr.status, 
        prr.created_at as requested_at, 
        prr.expires_at,
        u.name as user_name,
        u.surname as user_surname,
        u.email as user_email
      FROM password_reset_requests prr
      LEFT JOIN users u ON prr.email = u.email
      WHERE prr.status = 'pending'
      ORDER BY prr.created_at DESC
    `);
    
    res.json(result);
  } catch (error) {
    console.error('Errore GET password reset requests:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// POST /api/auth/admin-reset-password (admin only)
r.post('/admin-reset-password', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email e nuova password sono obbligatorie' });
    }
    
    // Verifica che l'utente esista
    const user = await query('SELECT id, email FROM users WHERE email = $1', [email]);
    if (user.length === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    
    // Hash della nuova password
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    
    // Aggiorna la password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2',
      [hashedPassword, email]
    );
    
    // Marca la richiesta come completata
    await query(
      'UPDATE password_reset_requests SET status = $1 WHERE email = $2',
      ['completed', email]
    );
    
    res.json({ message: 'Password aggiornata con successo' });
  } catch (error) {
    console.error('Errore admin reset password:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// DELETE /api/auth/password-reset-requests/:email (admin only) - Annulla richiesta
r.delete('/password-reset-requests/:email', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { email } = req.params;
    
    // Verifica che la richiesta esista
    const request = await query(
      'SELECT * FROM password_reset_requests WHERE email = $1 AND status = $2',
      [email, 'pending']
    );
    
    if (request.length === 0) {
      return res.status(404).json({ error: 'Richiesta non trovata o già gestita' });
    }
    
    // Marca la richiesta come annullata
    await query(
      'UPDATE password_reset_requests SET status = $1 WHERE email = $2 AND status = $3',
      ['cancelled', email, 'pending']
    );
    
    console.log(`✅ Richiesta reset password annullata per ${email}`);
    
    res.json({ message: 'Richiesta di reset password annullata' });
  } catch (error) {
    console.error('Errore annullamento richiesta reset password:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// GET /api/auth/me/export - Export dati personali (GDPR portabilità)
r.get('/me/export', requireAuth, async (req, res) => {
  try {
    if (req.user.id === -1) {
      return res.status(400).json({ error: 'Account speciale non esportabile' });
    }
    const [userRow, loans, requests, reports] = await Promise.all([
      query('SELECT id, email, name, surname, phone, matricola, corso_accademico, ruolo, created_at FROM users WHERE id = $1', [req.user.id]),
      query(`
        SELECT p.id, p.data_uscita, p.data_rientro, p.stato, i.nome as articolo_nome
        FROM prestiti p
        LEFT JOIN inventario i ON i.id = p.inventario_id
        LEFT JOIN richieste r ON r.id = p.richiesta_id
        WHERE r.utente_id = $1 OR p.chi LIKE $2 OR p.chi = $3 OR p.chi LIKE $4
        ORDER BY p.id DESC
      `, [req.user.id, `%${req.user.email}%`, req.user.email, `%${req.user.name || ''} ${req.user.surname || ''}%`]),
      query('SELECT r.id, r.dal, r.al, r.stato, i.nome as oggetto_nome FROM richieste r LEFT JOIN inventario i ON i.id = r.inventario_id WHERE r.utente_id = $1 ORDER BY r.id DESC', [req.user.id]),
      query('SELECT id, tipo, messaggio, urgenza, stato, created_at FROM segnalazioni WHERE user_id = $1 ORDER BY id DESC', [req.user.id])
    ]);
    const userData = userRow[0] ? { ...userRow[0], password_hash: undefined } : null;
    res.json({
      esportato_il: new Date().toISOString(),
      utente: userData,
      prestiti: loans || [],
      richieste: requests || [],
      segnalazioni: reports || []
    });
  } catch (error) {
    console.error('Errore export dati:', error);
    res.status(500).json({ error: 'Errore nell\'esportazione dati' });
  }
});

// POST /api/auth/me/delete-account - Elimina account (diritto all'oblio GDPR)
r.post('/me/delete-account', requireAuth, async (req, res) => {
  try {
    if (req.user.id === -1) {
      return res.status(403).json({ error: 'Impossibile eliminare l\'account amministratore' });
    }
    const userId = req.user.id;

    // Verifica prestiti attivi
    const activeLoans = await query(
      'SELECT COUNT(*) as n FROM prestiti p LEFT JOIN richieste r ON r.id = p.richiesta_id WHERE (r.utente_id = $1 OR p.chi LIKE $2) AND LOWER(COALESCE(p.stato,\'\')) = \'attivo\'',
      [userId, `%${req.user.email}%`]
    );
    if (activeLoans[0]?.n > 0) {
      return res.status(400).json({ error: 'Hai prestiti ancora attivi. Restituisci tutti gli articoli prima di eliminare l\'account.' });
    }

    // Ordine: libera FK prestiti->richieste, poi elimina
    const userRichieste = await query('SELECT id FROM richieste WHERE utente_id = $1', [userId]);
    const richiestaIds = (userRichieste || []).map((r) => r.id);
    if (richiestaIds.length > 0) {
      await query('UPDATE prestiti SET richiesta_id = NULL WHERE richiesta_id = ANY($1)', [richiestaIds]);
    }
    await query('DELETE FROM segnalazioni WHERE user_id = $1', [userId]);
    await query('DELETE FROM richieste WHERE utente_id = $1', [userId]);
    await query('UPDATE prestiti SET chi = \'[account eliminato]\' WHERE chi LIKE $1 OR chi = $2', [`%${req.user.email}%`, req.user.email]);
    await query('DELETE FROM password_reset_requests WHERE email = $1', [req.user.email]);
    await query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({ message: 'Account eliminato con successo' });
  } catch (error) {
    console.error('Errore eliminazione account:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione dell\'account' });
  }
});

// GET /api/auth/users - Reindirizza a /api/users (admin only)
r.get('/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id, email, name, surname, phone, matricola, 
        ruolo, corso_accademico, created_at, updated_at,
        penalty_strikes, is_blocked, blocked_reason, blocked_at
      FROM users 
      ORDER BY created_at DESC
    `);
    
    const normalized = (result || []).map(normalizeUser);
    res.json(normalized);
  } catch (error) {
    console.error('Errore GET auth users:', error);
    res.status(500).json({ error: 'Errore nel caricamento utenti' });
  }
});

export default r;