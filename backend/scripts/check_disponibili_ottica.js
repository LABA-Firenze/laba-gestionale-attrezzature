#!/usr/bin/env node
/**
 * Diagnostica: perché "OTTICA SONY FE 105MM 4/18" non compare tra i disponibili?
 * Esegui dalla root del progetto con DATABASE_URL impostata:
 *   DATABASE_URL="postgresql://..." node backend/scripts/check_disponibili_ottica.js
 * Oppure dalla cartella backend con un file .env che contiene DATABASE_URL.
 */
import { query } from '../utils/postgres.js';

const NOME_CERCATO = 'OTTICA SONY FE 105MM 4/18';

async function main() {
  console.log('Articolo di riferimento:', NOME_CERCATO);
  console.log('--- 1) CURRENT_DATE (come la vede il DB) ---');
  const dateRow = await query('SELECT CURRENT_DATE as oggi, CURRENT_TIMESTAMP as now_rome');
  console.log(dateRow[0]);

  console.log('\n--- 2) Inventario che contiene "105MM" o "OTTICA SONY" ---');
  const inv = await query(
    `SELECT id, nome, quantita_totale, in_manutenzione
     FROM inventario
     WHERE nome ILIKE $1 OR nome ILIKE $2`,
    ['%105MM%', '%OTTICA SONY%']
  );
  if (inv.length === 0) {
    console.log('Nessun inventario trovato. Prova a cercare per nome esatto.');
    const all = await query('SELECT id, nome FROM inventario WHERE nome ILIKE $1', ['%ottica%']);
    console.log('Inventari con "ottica":', all);
    process.exit(1);
  }
  console.log(inv);
  const match105 = inv.find((r) => String(r.nome).includes('105MM'));
  const inventarioId = match105 ? match105.id : inv[0].id;
  console.log('Articolo usato per diagnostica:', inv.find((r) => r.id === inventarioId)?.nome, '(id=', inventarioId, ')');

  console.log('\n--- 3) Corsi assegnati a questo articolo (se nessuno → utenti non admin non lo vedono in /disponibili) ---');
  const corsi = await query(
    'SELECT inventario_id, corso FROM inventario_corsi WHERE inventario_id = $1',
    [inventarioId]
  );
  console.log(corsi.length ? corsi : 'NESSUN CORSO assegnato → visibile solo ad admin/supervisor');

  console.log('\n--- 4) Unità di questo inventario ---');
  const unita = await query(
    `SELECT iu.id, iu.codice_univoco, iu.stato, iu.prestito_corrente_id, iu.richiesta_riservata_id
     FROM inventario_unita iu
     WHERE iu.inventario_id = $1
     ORDER BY iu.codice_univoco`,
    [inventarioId]
  );
  console.log(unita);

  const prestitoIds = [...new Set(unita.map((u) => u.prestito_corrente_id).filter(Boolean))];
  if (prestitoIds.length === 0) {
    console.log('Nessuna unità ha prestito_corrente_id. Controllare approvazione prestito.');
  } else {
    console.log('\n--- 5) Prestiti collegati (stato raw per vedere spazi/case) ---');
    const placeholders = prestitoIds.map((_, i) => `$${i + 1}`).join(',');
    const prestiti = await query(
      `SELECT id, inventario_id, chi, data_uscita, data_rientro, stato,
              length(stato) as len_stato, stato = 'attivo' as match_attivo,
              LOWER(TRIM(COALESCE(stato,''))) as stato_normalized
       FROM prestiti
       WHERE id IN (${placeholders})`,
      prestitoIds
    );
    console.log(prestiti);
    const oggi = dateRow[0].oggi;
    console.log('\nConfronto data_uscita > CURRENT_DATE:');
    prestiti.forEach((p) => {
      const ok = p.data_uscita > oggi;
      console.log(`  prestito ${p.id}: data_uscita=${p.data_uscita} > ${oggi} => ${ok}`);
    });
  }

  console.log('\n--- 6) Conteggio "disponibili oggi" (stessa logica dell\'app) ---');
  const countResult = await query(
    `SELECT
      (SELECT COUNT(*) FROM inventario_unita iu
       LEFT JOIN prestiti p ON p.id = iu.prestito_corrente_id AND LOWER(TRIM(COALESCE(p.stato,''))) = 'attivo'
       WHERE iu.inventario_id = $1
       AND (
         (iu.stato = 'disponibile' AND iu.prestito_corrente_id IS NULL AND iu.richiesta_riservata_id IS NULL)
         OR (iu.stato = 'prestato' AND p.id IS NOT NULL AND p.data_uscita > CURRENT_DATE)
       )) AS unita_disponibili_oggi`,
    [inventarioId]
  );
  console.log('unita_disponibili_oggi:', countResult[0].unita_disponibili_oggi);

  console.log('\n--- 7) Dettaglio unità che entrano/non entrano nel conteggio ---');
  const dettaglio = await query(
    `SELECT
       iu.id, iu.codice_univoco, iu.stato, iu.prestito_corrente_id, iu.richiesta_riservata_id,
       p.id as p_id, p.chi, p.data_uscita, p.stato as p_stato,
       LOWER(TRIM(COALESCE(p.stato,''))) as p_stato_norm,
       (p.id IS NOT NULL AND p.data_uscita > CURRENT_DATE) as prestito_futuro,
       CASE
         WHEN iu.stato = 'disponibile' AND iu.prestito_corrente_id IS NULL AND iu.richiesta_riservata_id IS NULL THEN true
         WHEN iu.stato = 'prestato' AND LOWER(TRIM(COALESCE(p.stato,''))) = 'attivo' AND p.data_uscita > CURRENT_DATE THEN true
         ELSE false
       END as conta_come_disponibile
     FROM inventario_unita iu
     LEFT JOIN prestiti p ON p.id = iu.prestito_corrente_id
     WHERE iu.inventario_id = $1
     ORDER BY iu.codice_univoco`,
    [inventarioId]
  );
  console.log(dettaglio);

  console.log('\nFine diagnostica.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
