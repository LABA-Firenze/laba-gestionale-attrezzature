// Cifratura del JWT nel cookie httpOnly (mitiga CodeQL js/clear-text-storage-of-sensitive-data).
// Formato: v1.<base64url(iv||tag||ciphertext)>. I token legacy (solo JWT) restano accettati fino al prossimo login.
import crypto from 'node:crypto';

const PREFIX = 'v1.';
const IV_LEN = 12;
const AUTH_TAG_LEN = 16;
const ALGO = 'aes-256-gcm';

function deriveKey(secret) {
  return crypto.createHash('sha256').update(String(secret), 'utf8').digest();
}

export function sealSessionToken(jwtString, secret) {
  if (!secret) throw new Error('Secret required for cookie sealing');
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv, { authTagLength: AUTH_TAG_LEN });
  const enc = Buffer.concat([cipher.update(jwtString, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString('base64url');
}

/** Restituisce il JWT in chiaro: decifra se prefisso v1., altrimenti ritorna il valore com’è (legacy). */
export function openSessionToken(cookieValue, secret) {
  if (!cookieValue || !secret) return cookieValue || null;
  if (!cookieValue.startsWith(PREFIX)) return cookieValue;
  const raw = Buffer.from(cookieValue.slice(PREFIX.length), 'base64url');
  const iv = raw.subarray(0, IV_LEN);
  const tag = raw.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN);
  const enc = raw.subarray(IV_LEN + AUTH_TAG_LEN);
  const key = deriveKey(secret);
  const decipher = crypto.createDecipheriv(ALGO, key, iv, { authTagLength: AUTH_TAG_LEN });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
