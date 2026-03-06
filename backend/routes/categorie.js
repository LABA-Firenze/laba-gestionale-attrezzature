// backend/routes/categorie.js - PostgreSQL Version
import { Router } from 'express';
import { query } from '../utils/postgres.js';

const r = Router();

// GET /api/categorie
r.get('/', async (req, res) => {
  try {
    // Recupera le categorie uniche dall'inventario
    const result = await query(`
      SELECT DISTINCT 
        i.categoria_madre as madre, 
        cs.nome as figlia,
        COUNT(*) as count,
        SUM(CASE 
          WHEN EXISTS(
          SELECT 1 FROM inventario_unita iu
          LEFT JOIN prestiti p ON p.id = iu.prestito_corrente_id AND LOWER(TRIM(COALESCE(p.stato,''))) = 'attivo'
          WHERE iu.inventario_id = i.id
          AND ((iu.stato = 'disponibile' AND iu.prestito_corrente_id IS NULL)
               OR (iu.stato = 'prestato' AND p.id IS NOT NULL AND p.data_uscita > CURRENT_DATE))
        ) THEN 1 ELSE 0 
        END) as available_count
      FROM inventario i
      LEFT JOIN categorie_semplici cs ON cs.id = i.categoria_id
      WHERE i.categoria_madre IS NOT NULL AND i.categoria_id IS NOT NULL
      GROUP BY i.categoria_madre, cs.nome
      ORDER BY i.categoria_madre, cs.nome
    `);
    
    // Trasforma i dati per il frontend
    const categories = result.map(row => ({
      id: `${row.madre}-${row.figlia}`,
      madre: row.madre,
      figlia: row.figlia,
      nome: `${row.madre} - ${row.figlia}`,
      count: parseInt(row.count),
      available_count: parseInt(row.available_count)
    }));
    
    res.json(categories);
  } catch (error) {
    console.error('Errore GET categorie:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// POST /api/categorie
r.post('/', async (req, res) => {
  try {
    const { madre, figlia } = req.body;
    
    if (!madre || !figlia) {
      return res.status(400).json({ error: 'Categoria madre e figlia sono obbligatorie' });
    }

    // Verifica se la categoria esiste già
    const existing = await query(
      'SELECT id FROM categorie WHERE madre = $1 AND figlia = $2',
      [madre, figlia]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Categoria già esistente' });
    }

    // Inserisci la nuova categoria
    const result = await query(
      'INSERT INTO categorie (madre, figlia) VALUES ($1, $2) RETURNING *',
      [madre, figlia]
    );

    res.status(201).json({
      id: `${result[0].madre}-${result[0].figlia}`,
      madre: result[0].madre,
      figlia: result[0].figlia,
      nome: `${result[0].madre} - ${result[0].figlia}`
    });
  } catch (error) {
    console.error('Errore POST categorie:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// DELETE /api/categorie/:id
r.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // L'id è nel formato "madre-figlia"
    const [madre, figlia] = id.split('-');
    
    if (!madre || !figlia) {
      return res.status(400).json({ error: 'ID categoria non valido' });
    }

    // Verifica se la categoria esiste
    const existing = await query(
      'SELECT id FROM categorie WHERE madre = $1 AND figlia = $2',
      [madre, figlia]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Categoria non trovata' });
    }

    // Verifica se ci sono articoli che usano questa categoria
    const itemsUsingCategory = await query(
      'SELECT COUNT(*) as count FROM inventario WHERE categoria_madre = $1 AND categoria_id = (SELECT id FROM categorie_semplici WHERE nome = $2)',
      [madre, figlia]
    );

    if (itemsUsingCategory[0].count > 0) {
      return res.status(409).json({ 
        error: `Impossibile eliminare: ci sono ${itemsUsingCategory[0].count} articoli che usano questa categoria` 
      });
    }

    // Elimina la categoria
    await query(
      'DELETE FROM categorie WHERE madre = $1 AND figlia = $2',
      [madre, figlia]
    );

    res.json({ message: 'Categoria eliminata con successo' });
  } catch (error) {
    console.error('Errore DELETE categorie:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

export default r;