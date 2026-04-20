export function normalizeRole(role, id, email) {
  const rawRole = (role || '').toString().trim().toLowerCase();
  const normalizedEmail = (email || '').toString().trim().toLowerCase();

  if (normalizedEmail === 'admin') {
    return 'admin';
  }

  if (rawRole === 'admin' || rawRole === 'amministratore') {
    return 'supervisor';
  }

  if (!rawRole || rawRole === 'utente') {
    return 'user';
  }

  return rawRole;
}

export function normalizeUser(user) {
  if (!user) return user;
  const ruolo = normalizeRole(user.ruolo, user.id, user.email);
  return { ...user, ruolo };
}

export function sanitizeUser(user) {
  if (!user) return user;
  const { password_hash, ...safeUser } = user;
  return safeUser;
}



