// backend/routes/prestiti.js - PostgreSQL Version
import { Router } from 'express';
import { query } from '../utils/postgres.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { sendApprovalEmail, sendRejectionEmail } from '../utils/email.js';

const r = Router();

// Funzione per slittare la domenica a lunedì
// Se la data cade di domenica, la sposta a lunedì
function skipSunday(dateStr) {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay(); // 0 = domenica, 1 = lunedì, ..., 6 = sabato
  
  if (dayOfWeek === 0) { // Domenica
    // Slitta a lunedì
    date.setDate(date.getDate() + 1);
  }
  
  return date.toISOString().split('T')[0]; // Ritorna in formato YYYY-MM-DD
}

function isAdminUser(u) {
  if (!u) return false;
  if (u.id === -1) return true;
  const role = (u.ruolo || '').toLowerCase();
  return role === 'admin' || role === 'supervisor';
}

// GET /api/prestiti
r.get('/', requireAuth, async (req, res) => {
  try {
    const wantAll = (req.query.all === '1' || req.query.all === 'true');
    let result;
    
    if (wantAll) {
      if (!isAdminUser(req.user)) return res.status(403).json({ error: 'Solo admin o supervisori' });
      result = await query(`
        SELECT p.*, i.nome AS articolo_nome, i.note AS articolo_descrizione,
               COALESCE(ru.name, u.name) AS utente_nome, 
               COALESCE(ru.surname, u.surname) AS utente_cognome, 
               COALESCE(ru.email, u.email) AS utente_email,
               COALESCE(r.utente_id, u.id) AS utente_id, 
               COALESCE(ru.penalty_strikes, u.penalty_strikes) AS penalty_strikes, 
               COALESCE(ru.is_blocked, u.is_blocked) AS is_blocked, 
               COALESCE(ru.blocked_reason, u.blocked_reason) AS blocked_reason,
               r.dal, r.al, r.note AS richiesta_note
        FROM prestiti p
        LEFT JOIN inventario i ON i.id = p.inventario_id
        LEFT JOIN richieste r ON r.id = p.richiesta_id
        LEFT JOIN users ru ON ru.id = r.utente_id
        LEFT JOIN users u ON (p.chi = (u.name || ' ' || u.surname) OR p.chi LIKE '%' || u.email || '%' OR p.chi = u.email)
        ORDER BY p.id DESC
      `);
    } else {
      result = await query(`
        SELECT p.*, i.nome AS articolo_nome, i.note AS articolo_descrizione,
               i.categoria_madre, cs.nome as categoria_figlia
        FROM prestiti p
        LEFT JOIN inventario i ON i.id = p.inventario_id
        LEFT JOIN categorie_semplici cs ON cs.id = i.categoria_id
        WHERE p.chi LIKE $1 OR p.chi = $2
        ORDER BY p.id DESC
      `, [`%${req.user.email}%`, req.user.email]);
    }
    
    // Parse JSON fields before sending to frontend
    const processedResult = result.map(item => ({
      ...item,
      unita: typeof item.unita === 'string' ? JSON.parse(item.unita || '[]') : (item.unita || [])
    }));
    
    // Debug: mostra i dati processati
    if (processedResult && processedResult.length > 0) {
      console.log('Processed prestito data:', {
        id: processedResult[0].id,
        articolo_nome: processedResult[0].articolo_nome,
        unita: processedResult[0].unita,
        unita_type: typeof processedResult[0].unita,
        unita_length: processedResult[0].unita?.length
      });
    }
    
    res.json(processedResult || []);
  } catch (error) {
    console.error('Errore GET prestiti:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// GET /api/prestiti/mie
r.get('/mie', requireAuth, async (req, res) => {
  try {
    console.log('User requesting loans:', {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      surname: req.user.surname
    });
    
    const result = await query(`
      SELECT p.*, i.nome AS articolo_nome, i.note AS articolo_descrizione,
             i.categoria_madre, cs.nome as categoria_figlia,
             p.data_uscita AS data_inizio, p.data_rientro AS data_fine
      FROM prestiti p
      LEFT JOIN inventario i ON i.id = p.inventario_id
      LEFT JOIN categorie_semplici cs ON cs.id = i.categoria_id
      LEFT JOIN richieste r ON r.id = p.richiesta_id
      WHERE r.utente_id = $1 OR p.chi LIKE $2 OR p.chi = $3 OR p.chi LIKE $4
      ORDER BY p.id DESC
    `, [req.user.id, `%${req.user.email}%`, req.user.email, `%${req.user.name} ${req.user.surname}%`]);
    
    console.log('Found loans for user:', result.length);
    
    // Parse JSON fields before sending to frontend
    const processedResult = result.map(item => ({
      ...item,
      unita: typeof item.unita === 'string' ? JSON.parse(item.unita || '[]') : (item.unita || [])
    }));
    
    res.json(processedResult || []);
  } catch (error) {
    console.error('Errore GET mie prestiti:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// POST /api/prestiti (create) — admin only
r.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { inventario_id, chi, data_uscita, data_rientro, note = null, unita_ids = [] } = req.body || {};
    
    if (!inventario_id || !chi || !data_uscita || !data_rientro) {
      return res.status(400).json({ error: 'campi mancanti' });
    }
    
    // Validazione date: il noleggio può iniziare al più presto dal giorno successivo
    const dataUscita = new Date(data_uscita);
    const dataRientro = new Date(data_rientro);
    const domani = new Date();
    domani.setDate(domani.getDate() + 1);
    domani.setHours(0, 0, 0, 0);
    
    const dayUscita = dataUscita.getDay();
    if (dayUscita === 0 || dayUscita === 6) {
      return res.status(400).json({ error: 'La data di inizio non può essere sabato o domenica. Il primo giorno utile è lunedì.' });
    }
    if (dataUscita < domani) {
      return res.status(400).json({ error: 'Il noleggio può iniziare al più presto dal giorno successivo' });
    }
    
    if (dataRientro < dataUscita) {
      return res.status(400).json({ error: 'La data di rientro deve essere successiva alla data di uscita' });
    }
    
    const dayRientro = dataRientro.getDay();
    if (dayRientro === 0) {
      return res.status(400).json({ error: 'La domenica non è mai valida. Per la riconsegna scegli lunedì-sabato.' });
    }
    
    // Verifica che l'oggetto esista
    const inventarioCheck = await query('SELECT id FROM inventario WHERE id = $1', [inventario_id]);
    if (inventarioCheck.length === 0) {
      return res.status(400).json({ error: 'Oggetto non trovato' });
    }
    
    // Converti unita_ids in nomi delle unità se forniti
    let unitaNames = [];
    if (unita_ids && unita_ids.length > 0) {
      console.log('Received unita_ids:', unita_ids, 'for inventario_id:', inventario_id);
      
      const unitaResult = await query(`
        SELECT codice_univoco 
        FROM inventario_unita 
        WHERE id = ANY($1)
      `, [unita_ids]);
      
      console.log('Found units:', unitaResult);
      unitaNames = unitaResult.map(u => u.codice_univoco);
      
      // Verifica che tutte le unità richieste esistano
      if (unitaNames.length !== unita_ids.length) {
        return res.status(400).json({ error: `Una o più unità non trovate. Richieste: ${unita_ids.length}, Trovate: ${unitaNames.length}` });
      }
    }
    
    // Slitta la domenica a lunedì se la data di rientro cade di domenica
    const dataRientroAdjusted = skipSunday(data_rientro);
    
    const result = await query(`
      INSERT INTO prestiti (inventario_id, chi, data_uscita, data_rientro, note, unita)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [inventario_id, chi, data_uscita, dataRientroAdjusted, note, JSON.stringify(unitaNames)]);
    
    // Se sono state specificate unità, aggiornale da "riservato" a "in_prestito"
    if (unita_ids && unita_ids.length > 0) {
      await query(`
        UPDATE inventario_unita 
        SET stato = 'in_prestito', prestito_corrente_id = $1, richiesta_riservata_id = NULL
        WHERE id = ANY($2)
      `, [result[0].id, unita_ids]);
      
      console.log(`✅ ${unita_ids.length} unità aggiornate a "in_prestito" per prestito ${result[0].id}`);
    }
    
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Errore POST prestito:', error);
    res.status(400).json({ error: error.message || 'Errore creazione prestito' });
  }
});

// PUT /api/prestiti/:id (update) — admin only
r.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { inventario_id, chi, data_uscita, data_rientro, note = null, stato } = req.body || {};
    
    if (!inventario_id || !chi || !data_uscita || !data_rientro || !stato) {
      return res.status(400).json({ error: 'campi mancanti' });
    }
    
    const result = await query(`
      UPDATE prestiti 
      SET inventario_id = $1, chi = $2, data_uscita = $3, data_rientro = $4, note = $5, stato = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [inventario_id, chi, data_uscita, data_rientro, note, stato, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prestito non trovato' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Errore PUT prestito:', error);
    res.status(400).json({ error: error.message || 'Errore aggiornamento prestito' });
  }
});

// DELETE /api/prestiti/:id (delete) — admin only
r.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM prestiti WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Prestito non trovato' });
    }
    
    res.json({ message: 'Prestito eliminato' });
  } catch (error) {
    console.error('Errore DELETE prestito:', error);
    res.status(400).json({ error: error.message || 'Errore eliminazione prestito' });
  }
});

// PUT /api/prestiti/:id/approva (approve request and create loan) — admin only
r.put('/:id/approva', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    // Update request status to approved
    const requestResult = await query('UPDATE richieste SET stato = $1 WHERE id = $2 RETURNING id', ['approvata', id]);
    if (requestResult.length === 0) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }
    
    // Get request details with user info, penalty status, and inventory details
    const request = await query(`
      SELECT r.*, 
             u.name, u.surname, u.email, u.penalty_strikes, u.is_blocked, u.blocked_reason,
             i.nome as inventario_nome
      FROM richieste r 
      LEFT JOIN users u ON r.utente_id = u.id 
      LEFT JOIN inventario i ON r.inventario_id = i.id
      WHERE r.id = $1
    `, [id]);
    
    if (request.length === 0) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }
    
    const requestData = request[0];
    const userFullName = `${requestData.name} ${requestData.surname}`.trim() || requestData.email;
    
    // Check if user is blocked due to penalties
    if (requestData.is_blocked) {
      return res.status(403).json({ 
        error: 'Utente bloccato',
        message: `L'utente ${userFullName} è attualmente bloccato per i noleggi.`,
        reason: requestData.blocked_reason || 'Motivo non specificato',
        penaltyStrikes: requestData.penalty_strikes || 0,
        userBlocked: true
      });
    }
    
    // Check if user has penalty strikes (warning for admin)
    const penaltyInfo = requestData.penalty_strikes > 0 ? {
      hasStrikes: true,
      strikes: requestData.penalty_strikes,
      warning: requestData.penalty_strikes >= 2 ? 
        `ATTENZIONE: L'utente ${userFullName} ha ${requestData.penalty_strikes} penalità per ritardi. Un altro ritardo comporterà il blocco automatico.` :
        `L'utente ${userFullName} ha ${requestData.penalty_strikes} penalità per ritardi.`
    } : { hasStrikes: false, strikes: 0 };
    
    // Slitta la domenica a lunedì se la data di fine cade di domenica
    const dataRientroAdjusted = skipSunday(requestData.al);
    
    // Create loan record
    const loanResult = await query(`
      INSERT INTO prestiti (inventario_id, chi, data_uscita, data_rientro, note, richiesta_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [requestData.inventario_id, userFullName, requestData.dal, dataRientroAdjusted, requestData.note, id]);
    
    // Collega le unità al prestito (stato 'prestato'); restano "disponibili" in lista fino a data_uscita
    const loanId = loanResult[0].id;
    if (requestData.unit_id) {
      await query(`
        UPDATE inventario_unita 
        SET stato = 'prestato', prestito_corrente_id = $1, richiesta_riservata_id = NULL
        WHERE id = $2 AND richiesta_riservata_id = $3
      `, [loanId, requestData.unit_id, id]);
    } else {
      const limit = requestData.quantita || 1;
      await query(`
        UPDATE inventario_unita 
        SET stato = 'prestato', prestito_corrente_id = $1
        WHERE inventario_id = $2 
        AND stato = 'disponibile' 
        AND prestito_corrente_id IS NULL
        AND id IN (
          SELECT id FROM inventario_unita 
          WHERE inventario_id = $2 AND stato = 'disponibile' AND prestito_corrente_id IS NULL
          LIMIT $3
        )
      `, [loanId, requestData.inventario_id, limit]);
    }
    
    // Invia email di notifica allo studente (non blocca l'approvazione se fallisce)
    if (requestData.email) {
      try {
        console.log(`📧 Tentativo invio email a ${requestData.email} per approvazione richiesta ${id}`);
        const emailResult = await sendApprovalEmail({
          to: requestData.email,
          studentName: userFullName,
          itemName: requestData.inventario_nome || 'Attrezzatura',
          startDate: requestData.dal,
          endDate: dataRientroAdjusted,
          notes: requestData.note || null
        });
        
        if (emailResult.success) {
          console.log(`✅ Email inviata con successo a ${requestData.email}`);
        } else {
          console.error(`❌ Email NON inviata a ${requestData.email}:`, emailResult.error);
          if (emailResult.details) {
            console.error('Dettagli errore:', emailResult.details);
          }
        }
      } catch (emailError) {
        // Log dell'errore ma non blocca l'approvazione
        console.error('❌ Errore invio email di approvazione (non bloccante):', {
          message: emailError.message,
          stack: emailError.stack,
          email: requestData.email
        });
      }
    } else {
      console.warn('⚠️ Email non inviata: utente senza email registrata per richiesta', id);
    }
    
    res.json({ 
      message: 'Richiesta approvata e prestito creato',
      loanId: loanResult[0].id,
      penaltyInfo: penaltyInfo
    });
  } catch (error) {
    console.error('Errore PUT approva prestito:', error);
    res.status(400).json({ error: error.message || 'Errore nell\'approvazione' });
  }
});

// PUT /api/prestiti/:id/rifiuta (reject request) — admin only
r.put('/:id/rifiuta', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { motivazione } = req.body || {};
    
    if (!motivazione) {
      return res.status(400).json({ error: 'Motivazione del rifiuto richiesta' });
    }
    
    // Get request details to free reserved units
    const request = await query('SELECT unit_id FROM richieste WHERE id = $1', [id]);
    
    // Update request status to rejected with reason
    const requestResult = await query(`
      UPDATE richieste 
      SET stato = $1, note = $2 
      WHERE id = $3
    `, ['rifiutata', motivazione, id]);
    
    if (requestResult.rowCount === 0) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }
    
    // Free reserved unit if exists
    if (request.length > 0 && request[0].unit_id) {
      await query(`
        UPDATE inventario_unita 
        SET stato = 'disponibile', richiesta_riservata_id = NULL
        WHERE id = $1 AND richiesta_riservata_id = $2
      `, [request[0].unit_id, id]);
      
      console.log(`✅ Unità ${request[0].unit_id} liberata dopo rifiuto richiesta ${id}`);
    }
    
    // Invia email di notifica rifiuto allo studente
    try {
      const requestDetails = await query(`
        SELECT r.*, u.name, u.surname, u.email, i.nome as inventario_nome
        FROM richieste r
        LEFT JOIN users u ON r.utente_id = u.id
        LEFT JOIN inventario i ON r.inventario_id = i.id
        WHERE r.id = $1
      `, [id]);
      
      if (requestDetails.length > 0 && requestDetails[0].email) {
        const reqData = requestDetails[0];
        const studentName = `${reqData.name || ''} ${reqData.surname || ''}`.trim() || reqData.email;
        
        await sendRejectionEmail({
          to: reqData.email,
          studentName: studentName,
          itemName: reqData.inventario_nome || 'Attrezzatura',
          startDate: reqData.dal,
          endDate: reqData.al,
          reason: motivazione || null
        });
        
        console.log(`✅ Email notifica rifiuto inviata a ${reqData.email} per richiesta ${id}`);
      }
    } catch (emailError) {
      // Non bloccare il rifiuto se l'email fallisce
      console.error('⚠️ Errore invio email notifica rifiuto (non bloccante):', emailError);
    }
    
    res.json({ message: 'Richiesta rifiutata' });
  } catch (error) {
    console.error('Errore PUT rifiuta prestito:', error);
    res.status(400).json({ error: error.message || 'Errore nel rifiuto' });
  }
});

// PUT /api/prestiti/:id/restituisci (return loan) — admin only
r.put('/:id/restituisci', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    // Get loan details first
    const loanDetails = await query('SELECT inventario_id FROM prestiti WHERE id = $1', [id]);
    
    if (loanDetails.length === 0) {
      return res.status(404).json({ error: 'Prestito non trovato' });
    }
    
    // Update loan status to returned
    const result = await query(`
      UPDATE prestiti 
      SET stato = 'restituito', data_rientro = CURRENT_DATE 
      WHERE id = $1
    `, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Prestito non trovato' });
    }
    
    // Libera solo le unità assegnate a questo prestito
    await query(`
      UPDATE inventario_unita 
      SET stato = 'disponibile', prestito_corrente_id = NULL
      WHERE prestito_corrente_id = $1
    `, [id]);
    
    res.json({ message: 'Prestito terminato con successo' });
  } catch (error) {
    console.error('Errore PUT restituisci prestito:', error);
    res.status(400).json({ error: error.message || 'Errore nella restituzione' });
  }
});

// GET /api/prestiti/unit/:unitId (get loan details for specific unit) — admin only
r.get('/unit/:unitId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { unitId } = req.params;
    
    // Get loan details for the specific unit
    const result = await query(`
      SELECT p.*, u.name AS utente_nome, u.surname AS utente_cognome, u.email AS utente_email,
             i.nome AS articolo_nome, iu.codice_univoco
      FROM prestiti p
      LEFT JOIN users u ON (p.chi LIKE '%' || u.email || '%' OR p.chi = u.email)
      LEFT JOIN inventario i ON p.inventario_id = i.id
      LEFT JOIN inventario_unita iu ON iu.inventario_id = p.inventario_id
      WHERE iu.id = $1 AND iu.stato = 'prestato' AND p.stato = 'attivo'
      LIMIT 1
    `, [unitId]);
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Prestito non trovato per questa unità' });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Errore GET unit loan details:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// GET /api/prestiti/:loanId/units (get units for specific loan) — user only
r.get('/:loanId/units', requireAuth, async (req, res) => {
  try {
    const { loanId } = req.params;
    
    // Get loan details first to verify ownership
    const loan = await query(`
      SELECT p.*, u.email 
      FROM prestiti p
      LEFT JOIN users u ON (p.chi = (u.name || ' ' || u.surname) OR p.chi LIKE '%' || u.email || '%' OR p.chi = u.email)
      WHERE p.id = $1
    `, [loanId]);
    
    if (loan.length === 0) {
      return res.status(404).json({ error: 'Prestito non trovato' });
    }
    
    // Verify user owns this loan
    if (loan[0].email !== req.user.email) {
      return res.status(403).json({ error: 'Non autorizzato per questo prestito' });
    }
    
    // Get units that are currently loaned for this specific loan
    // For now, we'll get units that are 'prestato' for this inventory item
    const units = await query(`
      SELECT iu.*, i.nome as item_name
      FROM inventario_unita iu
      LEFT JOIN inventario i ON i.id = iu.inventario_id
      WHERE iu.inventario_id = $1 AND iu.stato = 'prestato'
      ORDER BY iu.codice_univoco
    `, [loan[0].inventario_id]);
    
    res.json(units);
  } catch (error) {
    console.error('Errore GET loan units:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Endpoint temporaneo per aggiornare prestiti esistenti con unità mancanti (solo admin)
r.get('/fix-units', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    // Trova prestiti senza unità specificate per FX3
    const prestiti = await query(`
      SELECT p.id, p.inventario_id, i.nome, p.chi
      FROM prestiti p
      LEFT JOIN inventario i ON i.id = p.inventario_id
      WHERE p.unita = '[]' OR p.unita IS NULL
      AND p.data_rientro IS NULL
      AND i.nome = 'FX3'
    `);
    
    console.log('Prestiti FX3 senza unità:', prestiti);
    
    if (prestiti.length > 0) {
      // Aggiorna il prestito con FX3_001 (che è quella in stato "prestato")
      await query(`
        UPDATE prestiti 
        SET unita = $1 
        WHERE id = $2
      `, [JSON.stringify(['FX3_001']), prestiti[0].id]);
      
      res.json({ message: 'Prestito aggiornato con unità FX3_001', prestito_id: prestiti[0].id });
    } else {
      res.json({ message: 'Nessun prestito da aggiornare' });
    }
  } catch (error) {
    console.error('Errore fix-units:', error);
    res.status(500).json({ error: error.message });
  }
});

export default r;