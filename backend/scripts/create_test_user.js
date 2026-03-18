// Script per creare utente di test (solo in sviluppo; credenziali da env).
// Uso: TEST_USER_EMAIL=test@laba.it TEST_USER_PASSWORD=test123 [TEST_USER_NAME=Mario ...] node backend/scripts/create_test_user.js
import { query } from '../utils/postgres.js';
import bcrypt from 'bcryptjs';

async function createTestUser() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ create_test_user non va eseguito in produzione. Usa registrazione o ensure_admin con env.');
    process.exit(1);
  }
  const email = process.env.TEST_USER_EMAIL || 'test@laba.it';
  const password = process.env.TEST_USER_PASSWORD || 'test123';
  const name = process.env.TEST_USER_NAME || 'Mario';
  const surname = process.env.TEST_USER_SURNAME || 'Rossi';

  console.log('👤 Creazione utente di test...');
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    await query(`
      INSERT INTO users (email, password_hash, name, surname, phone, matricola, ruolo, corso_accademico)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (email) DO NOTHING
    `, [
      email,
      hashedPassword,
      name,
      surname,
      process.env.TEST_USER_PHONE || '1234567890',
      process.env.TEST_USER_MATRICOLA || 'MAT001',
      'user',
      process.env.TEST_USER_CORSO || 'Fotografia'
    ]);
    console.log('✅ Utente di test creato (email:', email, ')');
  } catch (error) {
    console.error('❌ Errore creazione utente:', error);
    throw error;
  }
}

// Esegui se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  createTestUser()
    .then(() => {
      console.log('🎉 Utente creato!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Errore:', error);
      process.exit(1);
    });
}

export default createTestUser;
