// Script per aggiornare password utente (solo da env, niente credenziali in codice).
// Uso: USER_EMAIL=user@example.com NEW_PASSWORD=nuovapassword node backend/scripts/update_user_password.js
import bcrypt from 'bcryptjs';
import { query } from '../utils/postgres.js';

async function updateUserPassword() {
  const email = process.env.USER_EMAIL;
  const newPassword = process.env.NEW_PASSWORD;
  if (!email || !newPassword) {
    console.error('Imposta USER_EMAIL e NEW_PASSWORD (es. USER_EMAIL=user@example.com NEW_PASSWORD=xxx node backend/scripts/update_user_password.js)');
    process.exit(1);
  }

  console.log('🔑 Aggiornamento password utente...');
  try {
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    const result = await query(`
      UPDATE users 
      SET password_hash = $1 
      WHERE email = $2
      RETURNING id, email, name, surname
    `, [hashedPassword, email]);

    if (result.length > 0) {
      console.log('✅ Password aggiornata per:', result[0].email);
    } else {
      console.log('❌ Utente non trovato:', email);
    }
  } catch (error) {
    console.error('❌ Errore aggiornamento password:', error);
    throw error;
  }
}

// Esegui se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  updateUserPassword()
    .then(() => {
      console.log('🎉 Password aggiornata!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Errore:', error);
      process.exit(1);
    });
}

export default updateUserPassword;
