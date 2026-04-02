// backend/routes/riparazioni.js - PostgreSQL Version
import { Router } from 'express';
import { query } from '../utils/postgres.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const r = Router();

// GET /api/riparazioni
r.get('/', requireAuth, async (req, res) => {
  try {
    const result = await query(`
      SELECT r.*, i.nome as articolo_nome
      FROM riparazioni r
      LEFT JOIN inventario i ON r.inventario_id = i.id
      ORDER BY r.created_at DESC
    `);
    
    res.json(result || []);
  } catch (error) {
    console.error('Errore GET riparazioni:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// POST /api/riparazioni
r.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { inventario_id, unit_id, descrizione, note_tecniche, priorita, stato } = req.body || {};
    
    if (!inventario_id || !unit_id || !descrizione) {
      return res.status(400).json({ error: 'Campi mancanti' });
    }
    
    // Verify unit exists and is not already in repair
    const unitCheck = await query(`
      SELECT id, stato, codice_univoco 
      FROM inventario_unita 
      WHERE id = $1 AND inventario_id = $2
    `, [unit_id, inventario_id]);
    
    if (unitCheck.length === 0) {
      return res.status(404).json({ error: 'Unità non trovata' });
    }
    
    if (unitCheck[0].stato === 'in_riparazione') {
      return res.status(400).json({ 
        error: `Unità ${unitCheck[0].codice_univoco} è già in riparazione` 
      });
    }
    
    // Start transaction for atomic operations
    await query('BEGIN');
    
    try {
      // Create repair record
      const result = await query(`
        INSERT INTO riparazioni (inventario_id, quantita, stato, note, unit_ids_json, tipo, priorita)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [inventario_id, 1, stato || 'in_corso', `${descrizione}\n\nNote tecniche: ${note_tecniche || 'N/A'}`, JSON.stringify([unit_id]), 'riparazione', priorita || 'media']);
      
      // Mark unit as in repair
      const updateResult = await query(`
        UPDATE inventario_unita 
        SET stato = 'in_riparazione'
        WHERE id = $1 AND inventario_id = $2
      `, [unit_id, inventario_id]);
      
      if (updateResult.rowCount === 0) {
        throw new Error('Impossibile aggiornare stato unità');
      }
      
      // Commit transaction
      await query('COMMIT');
      
      console.log(`✅ Riparazione creata per unità ${unitCheck[0].codice_univoco} (ID: ${unit_id})`);
      
      res.status(201).json(result[0]);
    } catch (transactionError) {
      // Rollback on any error
      await query('ROLLBACK');
      console.error('❌ Errore durante creazione riparazione:', transactionError.message);
      throw transactionError;
    }
  } catch (error) {
    console.error('Errore POST riparazione:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// PUT /api/riparazioni/:id
r.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { stato } = req.body || {};
    
    if (!stato) {
      return res.status(400).json({ error: 'Stato richiesto' });
    }
    
    // Get current repair to check unit IDs
    const currentRepair = await query('SELECT unit_ids_json, stato as current_stato FROM riparazioni WHERE id = $1', [id]);
    
    if (currentRepair.length === 0) {
      return res.status(404).json({ error: 'Riparazione non trovata' });
    }
    
    // Start transaction for atomic operations
    await query('BEGIN');
    
    try {
      // Update repair status
      const result = await query(`
        UPDATE riparazioni 
        SET stato = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `, [stato, id]);
      
      // If repair is completed or cancelled, mark units as available again
      if (stato === 'completata' || stato === 'annullata') {
        let unitIds = [];
        
        // Robust JSON parsing with multiple fallback strategies
        try {
          const jsonData = currentRepair[0].unit_ids_json;
          if (jsonData) {
            if (typeof jsonData === 'string') {
              unitIds = JSON.parse(jsonData);
            } else if (Array.isArray(jsonData)) {
              unitIds = jsonData;
            } else if (typeof jsonData === 'object') {
              unitIds = Object.values(jsonData);
            }
          }
        } catch (jsonError) {
          console.error('❌ Errore parsing unit_ids_json:', jsonError.message, 'Raw data:', currentRepair[0].unit_ids_json);
          
          // Fallback: find units by querying database directly
          const fallbackUnits = await query(`
            SELECT iu.id 
            FROM inventario_unita iu
            WHERE iu.stato = 'in_riparazione' 
            AND EXISTS (
              SELECT 1 FROM riparazioni r 
              WHERE r.id = $1 
              AND r.inventario_id = iu.inventario_id
            )
          `, [id]);
          
          unitIds = fallbackUnits.map(u => u.id);
          console.log(`🔄 Fallback: trovate ${unitIds.length} unità da riparazione ${id}`);
        }
        
        // Update units status if we have valid IDs
        if (unitIds.length > 0 && unitIds.every(id => Number.isInteger(id))) {
          const updateResult = await query(`
            UPDATE inventario_unita 
            SET stato = 'disponibile'
            WHERE id = ANY($1::int[])
          `, [unitIds]);
          
          const action = stato === 'completata' ? 'completamento' : 'annullamento';
          console.log(`✅ ${updateResult.rowCount} unità rimesse disponibili dopo ${action} riparazione ${id}`);
          
          // Verify the update worked
          const verifyResult = await query(`
            SELECT COUNT(*) as still_in_repair 
            FROM inventario_unita 
            WHERE id = ANY($1::int[]) AND stato = 'in_riparazione'
          `, [unitIds]);
          
          if (verifyResult[0].still_in_repair > 0) {
            const n = Number(verifyResult[0].still_in_repair);
            throw new Error(String(n) + ' unità ancora in riparazione dopo aggiornamento');
          }
        } else {
          console.warn('⚠️ Nessuna unità valida trovata per riparazione %s, unit_ids:', String(id), unitIds);
        }
      }
      
      // Commit transaction
      await query('COMMIT');
      
      res.json(result[0]);
    } catch (transactionError) {
      // Rollback on any error
      await query('ROLLBACK');
      console.error('❌ Errore durante transazione riparazione:', transactionError.message);
      throw transactionError;
    }
  } catch (error) {
    console.error('Errore PUT riparazione:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// DELETE /api/riparazioni/:id
r.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM riparazioni WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Riparazione non trovata' });
    }
    
    res.json({ message: 'Riparazione eliminata' });
  } catch (error) {
    console.error('Errore DELETE riparazione:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// GET /api/riparazioni/fix-orphaned-units - Fix units stuck in repair status
r.get('/fix-orphaned-units', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    // Find units marked as 'in_riparazione' but with no active repair
    const orphanedUnits = await query(`
      SELECT iu.id, iu.codice_univoco, iu.inventario_id, i.nome as articolo_nome
      FROM inventario_unita iu
      LEFT JOIN inventario i ON iu.inventario_id = i.id
      WHERE iu.stato = 'in_riparazione'
      AND NOT EXISTS (
        SELECT 1 FROM riparazioni r 
        WHERE r.stato = 'in_corso' 
        AND iu.id = ANY(
          SELECT jsonb_array_elements_text(r.unit_ids_json::jsonb)::int
        )
      )
    `);
    
    if (orphanedUnits.length === 0) {
      return res.json({ 
        message: 'Nessuna unità orfana trovata',
        fixed: 0,
        units: []
      });
    }
    
    // Fix orphaned units by setting them back to 'disponibile'
    const unitIds = orphanedUnits.map(u => u.id);
    await query(`
      UPDATE inventario_unita 
      SET stato = 'disponibile'
      WHERE id = ANY($1::int[])
    `, [unitIds]);
    
    console.log(`🔧 Corrette ${orphanedUnits.length} unità orfane:`, orphanedUnits.map(u => u.codice_univoco));
    
    res.json({
      message: `Corrette ${orphanedUnits.length} unità rimaste bloccate in riparazione`,
      fixed: orphanedUnits.length,
      units: orphanedUnits.map(u => ({
        id: u.id,
        codice: u.codice_univoco,
        articolo: u.articolo_nome
      }))
    });
  } catch (error) {
    console.error('Errore fix-orphaned-units:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

export default r;