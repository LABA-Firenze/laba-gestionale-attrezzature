// backend/routes/excel.js - Gestione Import/Export Excel
import { Router } from 'express';
import { query } from '../utils/postgres.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as XLSX from 'xlsx';
import logger from '../utils/logger.js';
const r = Router();

const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_EXCEL_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

// GET /api/excel/inventario/export - Export inventario completo
r.get('/inventario/export', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        i.*,
        cs.nome as categoria_nome,
        STRING_AGG(ic.corso, ',') as corsi_assegnati,
        (SELECT COUNT(*) FROM inventario_unita iu
         LEFT JOIN prestiti p ON p.id = iu.prestito_corrente_id AND LOWER(TRIM(COALESCE(p.stato,''))) = 'attivo'
         WHERE iu.inventario_id = i.id
         AND ((iu.stato = 'disponibile' AND iu.prestito_corrente_id IS NULL AND iu.richiesta_riservata_id IS NULL)
              OR (iu.stato = 'prestato' AND p.id IS NOT NULL AND p.data_uscita > CURRENT_DATE))) as unita_disponibili
      FROM inventario i
      LEFT JOIN categorie_semplici cs ON cs.id = i.categoria_id
      LEFT JOIN inventario_corsi ic ON ic.inventario_id = i.id
      GROUP BY i.id, cs.nome
      ORDER BY i.nome
    `);

    // Prepara dati per Excel
    const data = result.map(item => ({
      'ID': item.id,
      'Nome': item.nome,
      'Quantità Totale': item.quantita_totale || 0,
      'Corso Accademico': item.categoria_madre || '',
      'Categoria': item.categoria_nome || '',
      'Posizione': item.posizione || '',
      'Note': item.note || '',
      'Immagine URL': item.immagine_url || '',
      'In Manutenzione': item.in_manutenzione ? 'Sì' : 'No',
      'Soglia Minima': item.soglia_minima || 1,
      'Unità Disponibili': item.unita_disponibili || 0,
      'Corsi Assegnati': item.corsi_assegnati || '',
      'Data Creazione': new Date(item.created_at).toLocaleDateString('it-IT'),
      'Data Aggiornamento': new Date(item.updated_at).toLocaleDateString('it-IT')
    }));

    // Crea workbook Excel
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    
    // Set column widths
    const colWidths = [
      { wch: 5 },   // ID
      { wch: 25 },  // Nome
      { wch: 12 },  // Quantità Totale
      { wch: 20 },  // Corso Accademico
      { wch: 20 },  // Categoria
      { wch: 15 },  // Posizione
      { wch: 40 },  // Note
      { wch: 30 },  // Immagine URL
      { wch: 12 },  // In Manutenzione
      { wch: 12 },  // Soglia Minima
      { wch: 12 },  // Unità Disponibili
      { wch: 30 },  // Corsi Assegnati
      { wch: 15 },  // Data Creazione
      { wch: 15 }   // Data Aggiornamento
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    
    // Genera buffer Excel
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // Imposta headers per download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="inventario_laba.xlsx"');
    res.setHeader('Content-Length', excelBuffer.length);
    
    res.send(excelBuffer);
  } catch (error) {
    logger.error({ err: error }, 'Errore export Excel inventario');
    res.status(500).json({ error: 'Errore durante l\'export Excel' });
  }
});

// POST /api/excel/inventario/import - Import inventario da Excel
r.post('/inventario/import', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    // Verifica che i dati del file siano presenti
    const { fileName, fileSize, fileType, fileData } = req.body;
    
    if (!fileName || !fileData) {
      logger.warn({ event: 'excel_import_invalid_payload', userId: req.user?.id }, 'Dati file mancanti');
      return res.status(400).json({ error: 'File Excel richiesto' });
    }

    const normalizedFileName = String(fileName).toLowerCase().trim();
    const normalizedMime = String(fileType || '').toLowerCase().trim();
    if (!normalizedFileName.endsWith('.xlsx') && !normalizedFileName.endsWith('.xls')) {
      return res.status(400).json({ error: 'Formato file non supportato' });
    }
    if (normalizedMime && !ALLOWED_EXCEL_MIME_TYPES.has(normalizedMime)) {
      return res.status(400).json({ error: 'MIME type non consentito' });
    }
    
    // Converti base64 in buffer
    const base64Data = fileData.split(',')[1]; // Rimuovi il prefisso data:application/...
    if (!base64Data) {
      return res.status(400).json({ error: 'Contenuto file non valido' });
    }
    const fileBuffer = Buffer.from(base64Data, 'base64');
    if (!Number.isFinite(fileBuffer.length) || fileBuffer.length === 0) {
      return res.status(400).json({ error: 'File vuoto o non valido' });
    }
    if (fileBuffer.length > MAX_IMPORT_FILE_BYTES || (fileSize && Number(fileSize) > MAX_IMPORT_FILE_BYTES)) {
      return res.status(413).json({ error: 'File troppo grande (max 2MB)' });
    }

    // Leggi file Excel
    const workbook = XLSX.read(fileBuffer, {
      type: 'buffer',
      dense: true,
      cellStyles: false,
      cellNF: false,
      cellHTML: false,
      cellFormula: false,
      WTF: false,
    });
    
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({ error: 'File Excel non valido: foglio mancante' });
    }
    const worksheet = workbook.Sheets[sheetName];
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });
    if (jsonData.length > 5000) {
      return res.status(413).json({ error: 'File troppo grande: massimo 5000 righe' });
    }
    
    if (jsonData.length === 0) {
      return res.status(400).json({ error: 'File Excel vuoto' });
    }

    const results = {
      success: 0,
      errors: [],
      total: jsonData.length
    };

    // Processa ogni riga
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNum = i + 2; // +2 perché Excel inizia da 1 e c'è l'header
      
      try {
        // Validazione campi obbligatori
        if (!row.Nome) {
          throw new Error('Nome è obbligatorio');
        }

        // Prepara dati per inserimento (solo campi modificabili dall'utente)
        const itemData = {
          nome: row.Nome.toString().trim(),
          quantita_totale: parseInt(row['Quantità Totale']) || 1,
          categoria_madre: row['Corso Accademico']?.toString().trim() || null,
          posizione: row.Posizione?.toString().trim() || null,
          note: row.Note?.toString().trim() || null,
          immagine_url: row['Immagine URL']?.toString().trim() || null,
          in_manutenzione: row['In Manutenzione']?.toString().toLowerCase() === 'sì' || 
                          row['In Manutenzione']?.toString().toLowerCase() === 'si' || 
                          row['In Manutenzione']?.toString().toLowerCase() === 'yes' || 
                          row['In Manutenzione'] === 1,
          soglia_minima: parseInt(row['Soglia Minima']) || 1,
          fornitore: row.Fornitore?.toString().trim() || null,
          tipo_prestito: row['Tipo Prestito']?.toString().trim() || 'solo_esterno'
        };

        // Ignora campi automatici se presenti nel file
        // ID, Unità Disponibili, Data Creazione, Data Aggiornamento sono gestiti dal sistema

        // Validazione tipo_prestito
        if (!['solo_esterno', 'solo_interno', 'entrambi'].includes(itemData.tipo_prestito)) {
          throw new Error('Tipo Prestito deve essere: solo_esterno, solo_interno o entrambi');
        }

        // Gestisci categoria
        let categoria_id = null;
        if (row.Categoria) {
          const categoriaNome = row.Categoria.toString().trim();
          // Cerca categoria esistente
          const categoria = await query('SELECT id FROM categorie_semplici WHERE nome = $1', [categoriaNome]);
          if (categoria.length > 0) {
            categoria_id = categoria[0].id;
          } else {
            // Crea nuova categoria
            const newCategoria = await query('INSERT INTO categorie_semplici (nome) VALUES ($1) RETURNING id', [categoriaNome]);
            categoria_id = newCategoria[0].id;
          }
        }

        // Verifica se elemento esiste già
        const existing = await query('SELECT id FROM inventario WHERE nome = $1', [itemData.nome]);
        let inventarioId;
        
        if (existing.length > 0) {
          // Aggiorna elemento esistente
          inventarioId = existing[0].id;
          await query(`
            UPDATE inventario 
            SET quantita_totale = $2, categoria_madre = $3, categoria_id = $4, 
                posizione = $5, note = $6, immagine_url = $7, 
                in_manutenzione = $8, soglia_minima = $9, fornitore = $10, tipo_prestito = $11, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [
            inventarioId, itemData.quantita_totale, itemData.categoria_madre, categoria_id,
            itemData.posizione, itemData.note, itemData.immagine_url,
            itemData.in_manutenzione, itemData.soglia_minima, itemData.fornitore, itemData.tipo_prestito
          ]);
        } else {
          // Inserisci nuovo elemento
          const newItem = await query(`
            INSERT INTO inventario (nome, quantita_totale, categoria_madre, categoria_id, 
                                   posizione, note, immagine_url, in_manutenzione, soglia_minima, fornitore, tipo_prestito)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
          `, [
            itemData.nome, itemData.quantita_totale, itemData.categoria_madre, categoria_id,
            itemData.posizione, itemData.note, itemData.immagine_url,
            itemData.in_manutenzione, itemData.soglia_minima, itemData.fornitore, itemData.tipo_prestito
          ]);
          inventarioId = newItem[0].id;
        }

        // Gestisci unità individuali
        const unitaIds = [];
        for (let j = 1; j <= 5; j++) {
          const unitId = row[`ID Unità ${j}`];
          if (unitId && unitId.toString().trim()) {
            unitaIds.push(unitId.toString().trim());
          }
        }

        // Se non ci sono ID specifici, genera ID automatici
        if (unitaIds.length === 0) {
          for (let j = 1; j <= itemData.quantita_totale; j++) {
            unitaIds.push(`${itemData.nome.toUpperCase().replace(/\s+/g, '-')}-${j.toString().padStart(3, '0')}`);
          }
        }

        // Elimina unità esistenti per questo inventario
        await query('DELETE FROM inventario_unita WHERE inventario_id = $1', [inventarioId]);

                // Inserisci nuove unità
                for (const unitId of unitaIds) {
                  await query(`
                    INSERT INTO inventario_unita (inventario_id, codice_univoco, stato)
                    VALUES ($1, $2, 'disponibile')
                  `, [inventarioId, unitId]);
                }

        // Gestisci corsi assegnati
        if (row['Corsi Assegnati']) {
          const corsi = row['Corsi Assegnati'].toString().split(',').map(c => c.trim()).filter(c => c);
          for (const corso of corsi) {
            // Inserisci corso se non esiste
            await query('INSERT INTO corsi (corso) VALUES ($1) ON CONFLICT (corso) DO NOTHING', [corso]);
            // Assegna corso all'inventario
            await query('INSERT INTO inventario_corsi (inventario_id, corso) VALUES ($1, $2) ON CONFLICT DO NOTHING', 
                       [inventarioId, corso]);
          }
        }

        results.success++;
      } catch (error) {
        results.errors.push(`Riga ${rowNum}: ${error.message}`);
      }
    }

    logger.info({
      event: 'excel_import_completed',
      userId: req.user?.id,
      totalRows: results.total,
      successRows: results.success,
      errorRows: results.errors.length,
    }, 'Import inventario completato');

    res.json({
      message: `Import completato: ${results.success}/${results.total} elementi processati`,
      success: results.success,
      errors: results.errors,
      total: results.total
    });

  } catch (error) {
    logger.error({ err: error, userId: req.user?.id }, 'Errore import Excel inventario');
    res.status(500).json({ error: 'Errore durante l\'import Excel' });
  }
});

// GET /api/excel/inventario/template - Genera template Excel
r.get('/inventario/template', requireAuth, requireRole('admin'), async (req, res) => {
  try {
        const templateData = [
          {
            'Nome': 'Esempio: Macchina Fotografica Canon',
            'Quantità Totale': '5',
            'Corso': 'Fotografia',
            'Categoria': 'Fotocamere',
            'Posizione': 'Armadio A - Ripiano 1',
            'Note': 'Esempio: Macchina professionale per corsi di fotografia',
            'Immagine URL': 'https://example.com/fotocamera.jpg',
            'In Manutenzione': 'No (Sì/No)',
            'Soglia Minima': '2',
            'Fornitore': 'Esempio: Canon Italia',
            'Tipo Prestito': 'solo_esterno (solo_esterno/solo_interno/entrambi)',
            'ID Unità 1': 'CANON-001',
            'ID Unità 2': 'CANON-002',
            'ID Unità 3': 'CANON-003',
            'ID Unità 4': 'CANON-004',
            'ID Unità 5': 'CANON-005'
          }
        ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    
    const colWidths = [
      { wch: 25 },  // Nome
      { wch: 12 },  // Quantità Totale
      { wch: 20 },  // Corso Accademico
      { wch: 20 },  // Categoria
      { wch: 15 },  // Posizione
      { wch: 40 },  // Note
      { wch: 30 },  // Immagine URL
      { wch: 12 },  // In Manutenzione
      { wch: 12 },  // Soglia Minima
      { wch: 30 },  // Corsi Assegnati
      { wch: 20 },  // Fornitore
      { wch: 25 },  // Tipo Prestito
      { wch: 12 },  // ID Unità 1
      { wch: 12 },  // ID Unità 2
      { wch: 12 },  // ID Unità 3
      { wch: 12 },  // ID Unità 4
      { wch: 12 }   // ID Unità 5
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Template Inventario');
    
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="template_inventario_laba.xlsx"');
    res.setHeader('Content-Length', excelBuffer.length);
    
    res.send(excelBuffer);
  } catch (error) {
    logger.error({ err: error }, 'Errore generazione template Excel');
    res.status(500).json({ error: 'Errore durante la generazione del template' });
  }
});

export default r;
