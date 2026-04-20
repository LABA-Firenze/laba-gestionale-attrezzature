const COMMON_WEAK_PASSWORDS = new Set([
  '123456',
  '123456789',
  '12345678',
  '12345',
  'password',
  'qwerty',
  'qwerty123',
  '111111',
  '123123',
  'abc123',
  'admin',
  'admin123',
  'letmein',
  'welcome',
  'password1',
  'iloveyou',
  '000000',
  '00000000',
  '987654321',
  '1q2w3e4r',
]);

export function validatePasswordStrength(password, context = {}) {
  const normalized = String(password || '');

  if (normalized.length < 10) {
    return {
      ok: false,
      message: 'La password deve contenere almeno 10 caratteri',
    };
  }

  const lowered = normalized.toLowerCase();
  if (COMMON_WEAK_PASSWORDS.has(lowered)) {
    return {
      ok: false,
      message: 'La password scelta è troppo comune',
    };
  }

  const email = String(context.email || '').toLowerCase();
  if (email && lowered.includes(email.split('@')[0])) {
    return {
      ok: false,
      message: 'La password non deve contenere parti dell’email',
    };
  }

  return { ok: true };
}
