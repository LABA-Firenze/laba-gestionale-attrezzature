// backend/scripts/test_credentials.js
// Usage: node backend/scripts/test_credentials.js <email> <password>
import { verifyCredentials } from '../models/users.js';
import '../utils/db.js'; // side effect: inizializza DB con lo stesso path dei modelli

const [,, email, password] = process.argv;
if (!email || !password) {
  console.error('Usage: node backend/scripts/test_credentials.js <email> <password>');
  process.exit(1);
}

const u = verifyCredentials(email, password);
if (u) {
  console.log('OK ✅  id=%s email=%s ruolo=%s', u.id, u.email, u.ruolo);
  process.exit(0);
} else {
  console.error('FAIL ❌  credenziali non valide per', email);
  process.exit(2);
}
