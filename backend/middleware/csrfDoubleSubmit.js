// Double-submit cookie CSRF (mitiga CodeQL js/missing-token-validation con cookie di sessione).
import crypto from 'node:crypto';

export const CSRF_COOKIE = 'laba_csrf';
export const CSRF_HEADER = 'x-csrf-token';

/** Path esatti senza verifica CSRF (login senza cookie; reset da link email; health). */
const SKIP_EXACT = new Set([
  '/api/csrf-token',
  '/api/health',
  '/api/keepalive',
]);

/** Prefissi POST senza CSRF (autenticazione / reset self-service). */
const SKIP_PREFIX = [
  '/api/auth/login',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

function requestPath(req) {
  return req.path || req.url?.split('?')[0] || '';
}

/** GET: emette cookie leggibile da JS + stesso valore nel JSON per header X-CSRF-Token. */
export function csrfTokenHandler(req, res) {
  const token = crypto.randomBytes(32).toString('hex');
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  });
  res.json({ csrfToken: token });
}

/** Verifica header === cookie per metodi che modificano stato. */
export function csrfProtection(req, res, next) {
  const method = req.method || 'GET';
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next();
  }

  const path = requestPath(req);
  if (SKIP_EXACT.has(path)) return next();
  for (const p of SKIP_PREFIX) {
    if (path === p) return next();
  }
  if (path.startsWith('/api/cron')) return next();

  const cookieTok = req.cookies?.[CSRF_COOKIE];
  const headerTok = req.get(CSRF_HEADER);
  if (!cookieTok || !headerTok || cookieTok !== headerTok) {
    return res.status(403).json({ error: 'Token CSRF mancante o non valido' });
  }
  next();
}
