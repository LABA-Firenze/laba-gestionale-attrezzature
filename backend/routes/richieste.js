// backend/routes/richieste.js - PostgreSQL Version
import { Router } from 'express';
import { query } from '../utils/postgres.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { sendNewRequestNotification, sendRejectionEmail } from '../utils/email.js';

const r = Router();

function isAdminUser(u) {
  if (!u) return false;
  if (u.id === -1) return true;
  const role = (u.ruolo || '').toLowerCase();
  return role === 'admin' || role === 'supervisor';
}

// GET /api/richieste
r.get('/', requireAuth, async (req, res) => {
  try {
    const wantAll = (req.query.all === '1' || req.query.all === 'true');
    let result;
    
    if (wantAll) {
      if (!isAdminUser(req.user)) {
        return res.status(403).json({ error: 'Solo admin o supervisori' });
      }
      result = await query(`
        SELECT r.*, 
               u.name as utente_nome, u.surname as utente_cognome, u.email as utente_email,
               u.penalty_strikes, u.is_blocked, u.blocked_reason,
               i.nome as oggetto_nome, i.nome as articolo_nome,
               p.stato as prestito_stato, p.id as prestito_id
        FROM richieste r
        LEFT JOIN users u ON r.utente_id = u.id
        LEFT JOIN inventario i ON r.inventario_id = i.id
        LEFT JOIN prestiti p ON p.richiesta_id = r.id
        ORDER BY r.created_at DESC
      `);
    } else {
      result = await query(`
        SELECT r.*, i.nome as oggetto_nome, i.nome as articolo_nome,
               p.stato as prestito_stato, p.id as prestito_id
        FROM richieste r
        LEFT JOIN inventario i ON r.inventario_id = i.id
        LEFT JOIN prestiti p ON p.richiesta_id = r.id
        WHERE r.utente_id = $1
        ORDER BY r.created_at DESC
      `, [req.user.id]);
    }
    
    res.json(result || []);
  } catch (error) {
    console.error('Errore GET richieste:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// GET /api/richieste/mie
r.get('/mie', requireAuth, async (req, res) => {
  try {
    const result = await query(`
      SELECT r.*, i.nome as oggetto_nome, i.nome as articolo_nome
      FROM richieste r
      LEFT JOIN inventario i ON r.inventario_id = i.id
      WHERE r.utente_id = $1
      ORDER BY r.created_at DESC
    `, [req.user.id]);
    
    res.json(result || []);
  } catch (error) {
    console.error('Errore GET mie richieste:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// POST /api/richieste
r.post('/', requireAuth, async (req, res) => {
  try {
    // Check if user is blocked before allowing new requests
    const userCheck = await query(`
      SELECT penalty_strikes, is_blocked, blocked_reason
      FROM users WHERE id = $1
    `, [req.user.id]);
    
    if (userCheck.length > 0 && userCheck[0].is_blocked) {
      return res.status(403).json({
        error: 'Accesso negato',
        message: 'Non puoi effettuare nuove richieste perché hai accumulato 3 o più penalità per ritardi.',
        reason: userCheck[0].blocked_reason,
        strikes: userCheck[0].penalty_strikes,
        blocked: true,
        helpMessage: 'Recati di persona per sbloccare il tuo account.'
      });
    }
    
    const { unit_id, inventario_id, dal, al, motivo, note, tipo_utilizzo } = req.body || {};
    
    console.log(`🔍 Creating request - unit_id: ${unit_id}, inventario_id: ${inventario_id}`);
    
    // Support both unit_id (new) and inventario_id (legacy)
    let actualInventarioId = inventario_id;
    
    if (unit_id) {
      // Verifica che l'unità esista, non sia già riservata da un'altra richiesta in attesa, e non abbia prestiti attivi che sovrappongono [dal, al]
      // Sovrapposizione intervalli [dal, al] e [data_uscita, data_rientro] (date inclusive):
      // si sovrappongono se NON (al < data_uscita OR (data_rientro NOT NULL E dal > data_rientro)).
      // Se data_rientro è NULL (prestito aperto), vale solo: al >= data_uscita.
      const unitResult = await query(`
        SELECT iu.inventario_id FROM inventario_unita iu
        WHERE iu.id = $1
        AND iu.richiesta_riservata_id IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM prestiti p
          WHERE p.id = iu.prestito_corrente_id
          AND LOWER(TRIM(COALESCE(p.stato,''))) = 'attivo'
          AND NOT (
            $2::date < p.data_uscita::date
            OR (p.data_rientro IS NOT NULL AND $3::date > p.data_rientro::date)
          )
        )
      `, [unit_id, al, dal]);
      if (unitResult.length === 0) {
        const unitExists = await query('SELECT inventario_id, richiesta_riservata_id FROM inventario_unita WHERE id = $1', [unit_id]);
        if (unitExists.length === 0) {
          return res.status(400).json({ error: 'Unità non trovata' });
        }
        if (unitExists[0].richiesta_riservata_id != null) {
          return res.status(400).json({ error: 'Unità già riservata per una richiesta in attesa. Scegli un\'altra unità o date diverse.' });
        }
        return res.status(400).json({ error: 'Unità occupata nelle date selezionate. Scegli altre date.' });
      }
      actualInventarioId = unitResult[0].inventario_id;
    }
    
    if (!actualInventarioId || !dal || !al) {
      return res.status(400).json({ error: 'Campi mancanti' });
    }
    
    // Validazione date: il noleggio può iniziare al più presto dal giorno successivo
    const dataInizio = new Date(dal);
    const dataFine = new Date(al);
    const domani = new Date();
    domani.setDate(domani.getDate() + 1);
    domani.setHours(0, 0, 0, 0); // Reset ore per confronto solo date
    
    if (dataInizio < domani) {
      return res.status(400).json({ error: 'Il noleggio può iniziare al più presto dal giorno successivo' });
    }
    
    const dayInizio = dataInizio.getDay();
    if (dayInizio === 0 || dayInizio === 6) {
      return res.status(400).json({ error: 'La data di inizio non può essere sabato o domenica. Il primo giorno utile è lunedì.' });
    }
    
    if (dataFine < dataInizio) {
      return res.status(400).json({ error: 'La data di fine deve essere successiva alla data di inizio' });
    }
    
    const dayFine = dataFine.getDay();
    if (dayFine === 0) {
      return res.status(400).json({ error: 'La domenica non è mai valida. Per la riconsegna scegli lunedì-sabato.' });
    }
    
    // Verifica che l'oggetto esista e controlla il tipo
    const inventarioCheck = await query('SELECT id, tipo_prestito FROM inventario WHERE id = $1', [actualInventarioId]);
    if (inventarioCheck.length === 0) {
      return res.status(400).json({ error: 'Oggetto non trovato' });
    }
    const item = inventarioCheck[0];

    // Utenti non admin possono richiedere solo oggetti del proprio corso
    const role = (req.user?.ruolo || '').toLowerCase();
    if (role !== 'admin' && role !== 'supervisor') {
      const userCourse = req.user?.corso_accademico || null;
      if (!userCourse) {
        return res.status(403).json({ error: 'Corso accademico non assegnato. Non puoi effettuare richieste.' });
      }
      const inCourse = await query(
        'SELECT 1 FROM inventario_corsi WHERE inventario_id = $1 AND corso = $2 LIMIT 1',
        [actualInventarioId, userCourse]
      );
      if (inCourse.length === 0) {
        return res.status(403).json({ error: 'Questo oggetto non è disponibile per il tuo corso' });
      }
    }
    
    // Validazione limite massimo 3 giorni per prestiti esterni
    // Calcola la differenza in giorni tra dataFine e dataInizio
    const diffTime = dataFine.getTime() - dataInizio.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Validazione speciale per tipo di utilizzo
    if (item.tipo_prestito === 'solo_interno') {
      // Solo interno: data massima = stesso giorno
      const dataInizioDay = new Date(dataInizio).toDateString();
      const dataFineDay = new Date(dataFine).toDateString();
      
      if (dataInizioDay !== dataFineDay) {
        return res.status(400).json({ 
          error: 'Per oggetti ad uso interno all\'accademia, la data di fine deve essere lo stesso giorno della data di inizio' 
        });
      }
    } else if (item.tipo_prestito === 'entrambi') {
      // Entrambi: l'utente deve scegliere il tipo di utilizzo
      if (!tipo_utilizzo || !['interno', 'esterno'].includes(tipo_utilizzo)) {
        return res.status(400).json({ 
          error: 'Per oggetti utilizzabili sia internamente che esternamente, devi specificare il tipo di utilizzo (interno o esterno)' 
        });
      }
      
      // Se interno, valida stesso giorno
      if (tipo_utilizzo === 'interno') {
        const dataInizioDay = new Date(dataInizio).toDateString();
        const dataFineDay = new Date(dataFine).toDateString();
        
        if (dataInizioDay !== dataFineDay) {
          return res.status(400).json({ 
            error: 'Per utilizzo interno, la data di fine deve essere lo stesso giorno della data di inizio' 
          });
        }
      } else if (tipo_utilizzo === 'esterno') {
        // Per prestiti esterni, massimo 3 giorni
        if (diffDays > 3) {
          return res.status(400).json({ 
            error: 'Il prestito massimo consentito è di 3 giorni' 
          });
        }
      }
    } else {
      // Per oggetti solo esterni, valida limite 3 giorni
      if (diffDays > 3) {
        return res.status(400).json({ 
          error: 'Il prestito massimo consentito è di 3 giorni' 
        });
      }
    }
    
    const result = await query(`
      INSERT INTO richieste (utente_id, inventario_id, dal, al, motivo, note, unit_id, tipo_utilizzo)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [req.user.id, actualInventarioId, dal, al, motivo || null, note || null, unit_id || null, tipo_utilizzo || null]);
    
    // Se è stata specificata un'unità, riservala
    if (unit_id) {
      await query(`
        UPDATE inventario_unita 
        SET stato = 'riservato', richiesta_riservata_id = $1
        WHERE id = $2
      `, [result[0].id, unit_id]);
      
      console.log(`✅ Unità ${unit_id} riservata per richiesta ${result[0].id}`);
    }
    
    // Invia email di notifica all'admin
    try {
      // Ottieni i dati dell'utente e dell'oggetto per l'email
      const userData = await query('SELECT name, surname, email FROM users WHERE id = $1', [req.user.id]);
      const itemData = await query('SELECT nome FROM inventario WHERE id = $1', [actualInventarioId]);
      
      if (userData.length > 0 && itemData.length > 0) {
        const user = userData[0];
        const item = itemData[0];
        const studentName = `${user.name || ''} ${user.surname || ''}`.trim() || req.user.email;
        
        await sendNewRequestNotification({
          studentName: studentName,
          studentEmail: user.email,
          itemName: item.nome,
          startDate: dal,
          endDate: al,
          motivo: motivo || null,
          note: note || null,
          requestId: result[0].id
        });
        
        console.log(`✅ Email notifica nuova richiesta inviata all'admin per richiesta ${result[0].id}`);
      }
    } catch (emailError) {
      // Non bloccare la creazione della richiesta se l'email fallisce
      console.error('⚠️ Errore invio email notifica nuova richiesta (non bloccante):', emailError);
    }
    
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Errore POST richiesta:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// PUT /api/richieste/:id
r.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { stato, motivo, note } = req.body || {};
    
    // Prima ottieni la richiesta esistente
    const existingRequest = await query(`
      SELECT * FROM richieste WHERE id = $1
    `, [id]);
    
    if (existingRequest.length === 0) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }
    
    const request = existingRequest[0];
    
    // Aggiorna la richiesta
    const result = await query(`
      UPDATE richieste 
      SET stato = $1, motivo = $2, note = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [stato, motivo, note, id]);
    
    // Gestisci lo stato dell'unità riservata
    if (request.unit_id) {
      if (stato === 'rifiutata') {
        // Richiesta rifiutata: libera l'unità riservata
        await query(`
          UPDATE inventario_unita 
          SET stato = 'disponibile', richiesta_riservata_id = NULL
          WHERE id = $1 AND richiesta_riservata_id = $2
        `, [request.unit_id, id]);
        
        console.log(`✅ Unità ${request.unit_id} liberata (richiesta rifiutata)`);
        
      } else if (stato === 'approvata') {
        // Richiesta approvata: l'unità rimane riservata fino alla creazione del prestito
        // (la gestione del prestito sarà nell'endpoint /prestiti)
        console.log(`✅ Unità ${request.unit_id} rimane riservata (richiesta approvata)`);
      }
    }
    
    // Invia email di notifica rifiuto allo studente se la richiesta è stata rifiutata
    if (stato === 'rifiutata') {
      try {
        const userData = await query('SELECT name, surname, email FROM users WHERE id = $1', [request.utente_id]);
        const itemData = await query('SELECT nome FROM inventario WHERE id = $1', [request.inventario_id]);
        
        if (userData.length > 0 && itemData.length > 0 && userData[0].email) {
          const user = userData[0];
          const item = itemData[0];
          const studentName = `${user.name || ''} ${user.surname || ''}`.trim() || user.email;
          
          await sendRejectionEmail({
            to: user.email,
            studentName: studentName,
            itemName: item.nome,
            startDate: request.dal,
            endDate: request.al,
            reason: motivo || note || null
          });
          
          console.log(`✅ Email notifica rifiuto inviata a ${user.email} per richiesta ${id}`);
        }
      } catch (emailError) {
        // Non bloccare il rifiuto se l'email fallisce
        console.error('⚠️ Errore invio email notifica rifiuto (non bloccante):', emailError);
      }
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Errore PUT richiesta:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// DELETE /api/richieste/:id
r.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user owns the request or is admin e ottieni i dettagli
    const checkResult = await query('SELECT utente_id, unit_id, stato FROM richieste WHERE id = $1', [id]);
    if (checkResult.length === 0) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }
    
    const request = checkResult[0];
    
    // Verifica che l'utente sia il proprietario (gli admin possono sempre eliminare)
    if (request.utente_id !== req.user.id && !isAdminUser(req.user)) {
      return res.status(403).json({ error: 'Non autorizzato' });
    }
    
    // Gli utenti normali possono annullare solo richieste in attesa
    // Gli admin possono eliminare qualsiasi richiesta
    if (!isAdminUser(req.user) && request.stato !== 'in_attesa') {
      return res.status(400).json({ 
        error: 'Non puoi annullare questa richiesta',
        message: 'Puoi annullare solo le richieste ancora in attesa di approvazione'
      });
    }
    
    // Se c'è un'unità riservata, liberala prima di cancellare la richiesta
    if (request.unit_id) {
      await query(`
        UPDATE inventario_unita 
        SET stato = 'disponibile', richiesta_riservata_id = NULL
        WHERE id = $1 AND richiesta_riservata_id = $2
      `, [request.unit_id, id]);
      
      console.log(`✅ Unità ${request.unit_id} liberata (richiesta cancellata)`);
    }
    
    const result = await query('DELETE FROM richieste WHERE id = $1', [id]);
    res.json({ message: 'Richiesta eliminata' });
  } catch (error) {
    console.error('Errore DELETE richiesta:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

export default r;