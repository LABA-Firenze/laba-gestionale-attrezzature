// backend/middleware/auth.js
import jwt from 'jsonwebtoken';
import { query } from '../utils/postgres.js';
import { normalizeUser, normalizeRole } from '../utils/roles.js';
import { openSessionToken } from '../utils/tokenCookieSeal.js';

// Stessa logica di auth.js: in produzione deve essere impostato da env.
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-secret-change-me');

const COOKIE_NAME = 'laba_token';

export async function requireAuth(req, res, next) {
  try {
    // Cookie httpOnly (priorità) oppure header Authorization per compatibilità
    let token = req.cookies?.[COOKIE_NAME] ?? (() => {
      const auth = req.headers.authorization || '';
      return auth.startsWith('Bearer ') ? auth.slice(7) : null;
    })();
    
    if (!token) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }
    
    if (!JWT_SECRET) {
      return res.status(503).json({ error: 'Server non configurato (JWT_SECRET)' });
    }

    try {
      token = openSessionToken(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Non autorizzato' });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    
    if (payload?.id === -1 || (payload?.email || '').toLowerCase() === 'admin') {
      req.user = { id: -1, email: 'admin', ruolo: 'admin', name: 'LABA', surname: 'Admin' };
      return next();
    }
    
    const users = await query('SELECT * FROM users WHERE id = $1', [payload.id]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }
    
    req.user = normalizeUser(users[0]);
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Non autorizzato' });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Non autorizzato' });
    if (req.user.id === -1) return next(); // special admin bypass
    const requestedRole = String(role).toLowerCase();
    const userRole = normalizeRole(req.user.ruolo, req.user.id, req.user.email);

    let ok = userRole === requestedRole;
    if (!ok && requestedRole === 'admin') {
      ok = userRole === 'supervisor';
    }

    if (!ok) return res.status(403).json({ error: 'Solo ' + role });
    next();
  };
}
