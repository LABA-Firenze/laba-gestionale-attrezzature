// backend/utils/email.js
// Utility per l'invio di email tramite Mailgun API REST o SMTP
import nodemailer from 'nodemailer';

// Configurazione da variabili d'ambiente
const EMAIL_FROM = process.env.EMAIL_FROM || 'service@labafirenze.com';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'LABA Firenze - Gestionale Attrezzature';

// Mailgun API REST (preferito)
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || 'labafirenze.com';
const MAILGUN_REGION = process.env.MAILGUN_REGION || 'eu'; // 'eu' o 'us'

// SMTP (fallback)
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || 'service@labafirenze.com';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;

// Crea transporter (lazy initialization)
let transporter = null;

function getTransporter() {
  if (!transporter) {
    if (!SMTP_PASSWORD) {
      console.warn('⚠️ SMTP_PASSWORD non configurata. Le email non verranno inviate.');
      console.warn('⚠️ Configurazione SMTP (senza credenziali):', {
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        passwordConfigured: !!SMTP_PASSWORD
      });
      return null;
    }

    // Rimuovi spazi dalla password (Gmail App Password non deve avere spazi)
    const cleanPassword = SMTP_PASSWORD.replace(/\s+/g, '');
    if (SMTP_PASSWORD !== cleanPassword) {
      console.warn('⚠️ La password SMTP contiene spazi. Rimossi automaticamente.');
      console.warn('⚠️ IMPORTANTE: Assicurati che la password per app di Gmail non abbia spazi nelle variabili d\'ambiente!');
    }

    console.log('📧 Configurazione SMTP:', {
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      user: SMTP_USER,
      from: EMAIL_FROM,
      fromName: EMAIL_FROM_NAME,
      passwordLength: cleanPassword.length
    });
    
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: cleanPassword
      },
      tls: {
        rejectUnauthorized: false // Necessario per alcuni server SMTP o ambienti di sviluppo
      },
      connectionTimeout: 20000, // 20 secondi per stabilire connessione (aumentato per Gmail)
      greetingTimeout: 20000, // 20 secondi per greeting
      socketTimeout: 20000, // 20 secondi per operazioni socket
      debug: process.env.NODE_ENV === 'development', // Debug solo in sviluppo
      logger: process.env.NODE_ENV === 'development' // Log solo in sviluppo
    });
  }
  return transporter;
}

/**
 * Invia email tramite Mailgun API REST
 */
async function sendViaMailgunAPI({ to, subject, html, text }) {
  if (!MAILGUN_API_KEY) {
    throw new Error('MAILGUN_API_KEY non configurata');
  }

  if (!MAILGUN_DOMAIN) {
    throw new Error('MAILGUN_DOMAIN non configurata');
  }

  // Costruisci l'URL dell'API correttamente
  const apiBaseUrl = `https://api.${MAILGUN_REGION === 'us' ? '' : MAILGUN_REGION + '.'}mailgun.net/v3/${MAILGUN_DOMAIN}`;
  const apiUrl = `${apiBaseUrl}/messages`;

  console.log('📧 Invio email via Mailgun API:', {
    apiUrl,
    domain: MAILGUN_DOMAIN,
    region: MAILGUN_REGION,
    from: EMAIL_FROM,
    to
  });

  const formData = new URLSearchParams();
  formData.append('from', `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`);
  formData.append('to', to);
  formData.append('subject', subject);
  formData.append('html', html);
  formData.append('text', text);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString()
  });

  const responseText = await response.text();
  
  if (!response.ok) {
    let errorMessage = `Mailgun API error: ${response.status} - ${responseText}`;
    
    // Messaggi di errore più chiari
    if (response.status === 403) {
      try {
        const errorJson = JSON.parse(responseText);
        if (errorJson.message && errorJson.message.includes('unverified')) {
          errorMessage = `Dominio non verificato: ${errorJson.message}\n\n` +
            'Per risolvere:\n' +
            '1. Vai su Mailgun → Domain Settings → DNS records\n' +
            '2. Verifica che tutti i record DNS siano stati aggiunti correttamente\n' +
            '3. Attendi la propagazione DNS (può richiedere fino a 30 minuti)\n' +
            '4. Clicca "Verify DNS Settings" su Mailgun';
        }
      } catch (e) {
        // Se non è JSON, usa il messaggio originale
      }
    } else if (response.status === 404) {
      errorMessage = `URL API non trovato: ${apiUrl}\n\n` +
        'Verifica che:\n' +
        `- MAILGUN_DOMAIN sia corretto (attuale: ${MAILGUN_DOMAIN})\n` +
        `- MAILGUN_REGION sia corretto (attuale: ${MAILGUN_REGION}, deve essere 'eu' o 'us')`;
    }
    
    throw new Error(errorMessage);
  }

  let result;
  try {
    result = JSON.parse(responseText);
  } catch (e) {
    result = { message: responseText, id: 'unknown' };
  }
  
  return result;
}

/**
 * Invia email di notifica approvazione richiesta
 * @param {Object} options - Opzioni per l'email
 * @param {string} options.to - Email destinatario
 * @param {string} options.studentName - Nome studente
 * @param {string} options.itemName - Nome oggetto noleggiato
 * @param {string} options.startDate - Data inizio prestito (YYYY-MM-DD)
 * @param {string} options.endDate - Data fine prestito (YYYY-MM-DD)
 * @param {string} [options.notes] - Note aggiuntive
 * @returns {Promise<Object>} Risultato invio email
 */
export async function sendApprovalEmail({ to, studentName, itemName, startDate, endDate, notes }) {
  console.log('📧 Tentativo invio email di approvazione:', { to, studentName, itemName });
  
  if (!to) {
    console.error('❌ Email non inviata: destinatario mancante');
    return { success: false, error: 'Destinatario mancante' };
  }

  // Formatta le date in formato italiano
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formattedStartDate = formatDate(startDate);
  const formattedEndDate = formatDate(endDate);

  const subject = '✅ Richiesta di Noleggio Approvata - LABA Firenze';
  const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #033157 0%, #0ea5e9 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background: #ffffff;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-top: none;
            border-radius: 0 0 8px 8px;
          }
          .success-icon {
            font-size: 48px;
            margin-bottom: 20px;
          }
          .info-box {
            background: #f0f9ff;
            border-left: 4px solid #0ea5e9;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .detail-row {
            margin: 15px 0;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .detail-label {
            font-weight: 600;
            color: #033157;
            margin-bottom: 5px;
          }
          .detail-value {
            color: #666;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="success-icon">✅</div>
          <h1 style="margin: 0; font-size: 24px;">Richiesta Approvata!</h1>
        </div>
        <div class="content">
          <p>Ciao <strong>${studentName}</strong>,</p>
          
          <p>La tua richiesta di noleggio è stata <strong>approvata</strong>!</p>
          
          <div class="info-box">
            <p style="margin: 0;"><strong>Puoi ritirare l'attrezzatura presso la segreteria.</strong></p>
          </div>
          
          <h2 style="color: #033157; margin-top: 30px;">Dettagli del Noleggio</h2>
          
          <div class="detail-row">
            <div class="detail-label">Oggetto</div>
            <div class="detail-value">${itemName}</div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">Data Inizio</div>
            <div class="detail-value">${formattedStartDate}</div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">Data Fine (Riconsegna)</div>
            <div class="detail-value">${formattedEndDate}</div>
          </div>
          
          ${notes ? `
          <div class="detail-row">
            <div class="detail-label">Note</div>
            <div class="detail-value">${notes}</div>
          </div>
          ` : ''}
          
          <div class="info-box" style="background: #fef3c7; border-left-color: #f59e0b; margin-top: 20px;">
            <p style="margin: 0;"><strong>⚠️ Importante:</strong> Ricorda di riconsegnare l'attrezzatura entro la data di fine indicata per evitare penalità.</p>
          </div>
          
          <div class="footer">
            <p>LABA Firenze - Gestionale Attrezzature</p>
            <p>Per domande o assistenza, contatta la segreteria.</p>
          </div>
        </div>
      </body>
      </html>
    `;

  const text = `
Richiesta di Noleggio Approvata - LABA Firenze

Ciao ${studentName},

La tua richiesta di noleggio è stata approvata!

Puoi ritirare l'attrezzatura presso la segreteria.

Dettagli del Noleggio:
- Oggetto: ${itemName}
- Data Inizio: ${formattedStartDate}
- Data Fine (Riconsegna): ${formattedEndDate}
${notes ? `- Note: ${notes}` : ''}

⚠️ Importante: Ricorda di riconsegnare l'attrezzatura entro la data di fine indicata per evitare penalità.

LABA Firenze - Gestionale Attrezzature
Per domande o assistenza, contatta la segreteria.
  `.trim();

  // Prova prima con Mailgun API REST, poi fallback a SMTP
  try {
    if (MAILGUN_API_KEY) {
      console.log('📧 Invio email tramite Mailgun API REST...');
      const result = await sendViaMailgunAPI({ to, subject, html, text });
      console.log('✅ Email di approvazione inviata con successo via Mailgun API!', {
        to,
        messageId: result.id || result.message,
        result
      });
      return { success: true, messageId: result.id || result.message };
    } else {
      // Fallback a SMTP
      console.log('📧 Invio email tramite SMTP (fallback)...');
      const emailTransporter = getTransporter();
      
      if (!emailTransporter) {
        console.error('❌ Email non inviata: né Mailgun API né SMTP configurati');
        return { success: false, error: 'Nessun metodo di invio email configurato' };
      }

      const mailOptions = {
        from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
        to: to,
        subject: subject,
        html: html,
        text: text
      };

      const info = await emailTransporter.sendMail(mailOptions);
      console.log('✅ Email di approvazione inviata con successo via SMTP!', {
        to,
        messageId: info.messageId,
        response: info.response
      });
      return { success: true, messageId: info.messageId };
    }
  } catch (error) {
    console.error('❌ Errore invio email di approvazione:', {
      message: error.message,
      code: error.code,
      response: error.response,
      stack: error.stack
    });
    return { success: false, error: error.message, details: error };
  }
}

/**
 * Invia email di notifica nuova richiesta all'admin
 * @param {Object} options - Opzioni per l'email
 * @param {string} options.studentName - Nome completo studente
 * @param {string} options.studentEmail - Email studente
 * @param {string} options.itemName - Nome oggetto richiesto
 * @param {string} options.startDate - Data inizio prestito (YYYY-MM-DD)
 * @param {string} options.endDate - Data fine prestito (YYYY-MM-DD)
 * @param {string} [options.motivo] - Motivo della richiesta
 * @param {string} [options.note] - Note aggiuntive
 * @param {number} [options.requestId] - ID della richiesta
 * @returns {Promise<Object>} Risultato invio email
 */
export async function sendNewRequestNotification({ studentName, studentEmail, itemName, startDate, endDate, motivo, note, requestId }) {
  const adminEmail = process.env.EMAIL_FROM || 'service@labafirenze.com';
  
  console.log('📧 Invio email notifica nuova richiesta all\'admin:', { 
    to: adminEmail, 
    studentName, 
    itemName,
    requestId 
  });

  if (!studentName || !itemName || !startDate || !endDate) {
    console.error('❌ Email non inviata: dati mancanti');
    return { success: false, error: 'Dati mancanti' };
  }

  // Formatta le date in formato italiano
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formattedStartDate = formatDate(startDate);
  const formattedEndDate = formatDate(endDate);

  const subject = `🔔 Nuova Richiesta di Noleggio - ${studentName}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background: #ffffff;
          padding: 30px;
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 8px 8px;
        }
        .alert-icon {
          font-size: 48px;
          margin-bottom: 20px;
        }
        .info-box {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .detail-row {
          margin: 15px 0;
          padding: 10px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .detail-label {
          font-weight: 600;
          color: #033157;
          margin-bottom: 5px;
        }
        .detail-value {
          color: #666;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
        .button {
          display: inline-block;
          background: #0ea5e9;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="alert-icon">🔔</div>
        <h1 style="margin: 0; font-size: 24px;">Nuova Richiesta di Noleggio</h1>
      </div>
      <div class="content">
        <p>È stata ricevuta una nuova richiesta di noleggio che richiede la tua attenzione.</p>
        
        <div class="info-box">
          <p style="margin: 0;"><strong>⚠️ Azione richiesta:</strong> Accedi al gestionale per approvare o rifiutare la richiesta.</p>
        </div>
        
        <h2 style="color: #033157; margin-top: 30px;">Dettagli della Richiesta</h2>
        
        <div class="detail-row">
          <div class="detail-label">Studente</div>
          <div class="detail-value">${studentName}${studentEmail ? ` (${studentEmail})` : ''}</div>
        </div>
        
        <div class="detail-row">
          <div class="detail-label">Oggetto Richiesto</div>
          <div class="detail-value">${itemName}</div>
        </div>
        
        <div class="detail-row">
          <div class="detail-label">Data Inizio</div>
          <div class="detail-value">${formattedStartDate}</div>
        </div>
        
        <div class="detail-row">
          <div class="detail-label">Data Fine (Riconsegna)</div>
          <div class="detail-value">${formattedEndDate}</div>
        </div>
        
        ${motivo ? `
        <div class="detail-row">
          <div class="detail-label">Motivo</div>
          <div class="detail-value">${motivo}</div>
        </div>
        ` : ''}
        
        ${note ? `
        <div class="detail-row">
          <div class="detail-label">Note</div>
          <div class="detail-value">${note}</div>
        </div>
        ` : ''}
        
        ${requestId ? `
        <div class="detail-row">
          <div class="detail-label">ID Richiesta</div>
          <div class="detail-value">#${requestId}</div>
        </div>
        ` : ''}
        
        <div class="footer">
          <p>LABA Firenze - Gestionale Attrezzature</p>
          <p>Accedi al gestionale per gestire questa richiesta.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Nuova Richiesta di Noleggio - LABA Firenze

È stata ricevuta una nuova richiesta di noleggio che richiede la tua attenzione.

⚠️ Azione richiesta: Accedi al gestionale per approvare o rifiutare la richiesta.

Dettagli della Richiesta:
- Studente: ${studentName}${studentEmail ? ` (${studentEmail})` : ''}
- Oggetto Richiesto: ${itemName}
- Data Inizio: ${formattedStartDate}
- Data Fine (Riconsegna): ${formattedEndDate}
${motivo ? `- Motivo: ${motivo}` : ''}
${note ? `- Note: ${note}` : ''}
${requestId ? `- ID Richiesta: #${requestId}` : ''}

LABA Firenze - Gestionale Attrezzature
Accedi al gestionale per gestire questa richiesta.
  `.trim();

  // Prova prima con Mailgun API REST, poi fallback a SMTP
  try {
    if (MAILGUN_API_KEY) {
      console.log('📧 Invio email notifica nuova richiesta tramite Mailgun API REST...');
      const result = await sendViaMailgunAPI({ to: adminEmail, subject, html, text });
      console.log('✅ Email notifica nuova richiesta inviata con successo via Mailgun API!', {
        to: adminEmail,
        messageId: result.id || result.message
      });
      return { success: true, messageId: result.id || result.message };
    } else {
      // Fallback a SMTP
      console.log('📧 Invio email notifica nuova richiesta tramite SMTP (fallback)...');
      const emailTransporter = getTransporter();
      
      if (!emailTransporter) {
        console.error('❌ Email non inviata: né Mailgun API né SMTP configurati');
        return { success: false, error: 'Nessun metodo di invio email configurato' };
      }

      const mailOptions = {
        from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
        to: adminEmail,
        subject: subject,
        html: html,
        text: text
      };

      const info = await emailTransporter.sendMail(mailOptions);
      console.log('✅ Email notifica nuova richiesta inviata con successo via SMTP!', {
        to: adminEmail,
        messageId: info.messageId
      });
      return { success: true, messageId: info.messageId };
    }
  } catch (error) {
    console.error('❌ Errore invio email notifica nuova richiesta:', {
      message: error.message,
      code: error.code,
      response: error.response,
      stack: error.stack
    });
    return { success: false, error: error.message, details: error };
  }
}

/**
 * Invia email di notifica rifiuto richiesta allo studente
 * @param {Object} options - Opzioni per l'email
 * @param {string} options.to - Email destinatario
 * @param {string} options.studentName - Nome studente
 * @param {string} options.itemName - Nome oggetto richiesto
 * @param {string} options.startDate - Data inizio prestito (YYYY-MM-DD)
 * @param {string} options.endDate - Data fine prestito (YYYY-MM-DD)
 * @param {string} [options.reason] - Motivo del rifiuto
 * @returns {Promise<Object>} Risultato invio email
 */
export async function sendRejectionEmail({ to, studentName, itemName, startDate, endDate, reason }) {
  console.log('📧 Tentativo invio email di rifiuto:', { to, studentName, itemName });
  
  if (!to) {
    console.error('❌ Email non inviata: destinatario mancante');
    return { success: false, error: 'Destinatario mancante' };
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formattedStartDate = formatDate(startDate);
  const formattedEndDate = formatDate(endDate);

  const subject = '❌ Richiesta di Noleggio Rifiutata - LABA Firenze';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background: #ffffff;
          padding: 30px;
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 8px 8px;
        }
        .alert-icon {
          font-size: 48px;
          margin-bottom: 20px;
        }
        .info-box {
          background: #fee2e2;
          border-left: 4px solid #dc2626;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .detail-row {
          margin: 15px 0;
          padding: 10px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .detail-label {
          font-weight: 600;
          color: #033157;
          margin-bottom: 5px;
        }
        .detail-value {
          color: #666;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="alert-icon">❌</div>
        <h1 style="margin: 0; font-size: 24px;">Richiesta Rifiutata</h1>
      </div>
      <div class="content">
        <p>Ciao <strong>${studentName}</strong>,</p>
        
        <p>La tua richiesta di noleggio è stata <strong>rifiutata</strong>.</p>
        
        ${reason ? `
        <div class="info-box">
          <p style="margin: 0;"><strong>Motivo del rifiuto:</strong></p>
          <p style="margin: 10px 0 0 0;">${reason}</p>
        </div>
        ` : ''}
        
        <h2 style="color: #033157; margin-top: 30px;">Dettagli della Richiesta</h2>
        
        <div class="detail-row">
          <div class="detail-label">Oggetto</div>
          <div class="detail-value">${itemName}</div>
        </div>
        
        <div class="detail-row">
          <div class="detail-label">Data Inizio Richiesta</div>
          <div class="detail-value">${formattedStartDate}</div>
        </div>
        
        <div class="detail-row">
          <div class="detail-label">Data Fine Richiesta</div>
          <div class="detail-value">${formattedEndDate}</div>
        </div>
        
        <div class="info-box" style="background: #fef3c7; border-left-color: #f59e0b; margin-top: 20px;">
          <p style="margin: 0;"><strong>💡 Suggerimento:</strong> Se hai domande sul motivo del rifiuto, contatta la segreteria.</p>
        </div>
        
        <div class="footer">
          <p>LABA Firenze - Gestionale Attrezzature</p>
          <p>Per domande o assistenza, contatta la segreteria.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Richiesta di Noleggio Rifiutata - LABA Firenze

Ciao ${studentName},

La tua richiesta di noleggio è stata rifiutata.

${reason ? `Motivo del rifiuto: ${reason}` : ''}

Dettagli della Richiesta:
- Oggetto: ${itemName}
- Data Inizio Richiesta: ${formattedStartDate}
- Data Fine Richiesta: ${formattedEndDate}

💡 Suggerimento: Se hai domande sul motivo del rifiuto, contatta la segreteria.

LABA Firenze - Gestionale Attrezzature
Per domande o assistenza, contatta la segreteria.
  `.trim();

  // Prova prima con Mailgun API REST, poi fallback a SMTP
  try {
    if (MAILGUN_API_KEY) {
      console.log('📧 Invio email di rifiuto tramite Mailgun API REST...');
      const result = await sendViaMailgunAPI({ to, subject, html, text });
      console.log('✅ Email di rifiuto inviata con successo via Mailgun API!', {
        to,
        messageId: result.id || result.message
      });
      return { success: true, messageId: result.id || result.message };
    } else {
      // Fallback a SMTP
      console.log('📧 Invio email di rifiuto tramite SMTP (fallback)...');
      const emailTransporter = getTransporter();
      
      if (!emailTransporter) {
        console.error('❌ Email non inviata: né Mailgun API né SMTP configurati');
        return { success: false, error: 'Nessun metodo di invio email configurato' };
      }

      const mailOptions = {
        from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
        to: to,
        subject: subject,
        html: html,
        text: text
      };

      const info = await emailTransporter.sendMail(mailOptions);
      console.log('✅ Email di rifiuto inviata con successo via SMTP!', {
        to,
        messageId: info.messageId
      });
      return { success: true, messageId: info.messageId };
    }
  } catch (error) {
    console.error('❌ Errore invio email di rifiuto:', {
      message: error.message,
      code: error.code,
      response: error.response,
      stack: error.stack
    });
    return { success: false, error: error.message, details: error };
  }
}

/**
 * Invia email di notifica penalità allo studente
 * @param {Object} options - Opzioni per l'email
 * @param {string} options.to - Email destinatario
 * @param {string} options.studentName - Nome studente
 * @param {string} options.itemName - Nome oggetto del prestito
 * @param {number} options.delayDays - Giorni di ritardo
 * @param {number} options.strikesAssigned - Strike assegnati
 * @param {number} options.totalStrikes - Strike totali dell'utente
 * @param {boolean} options.isBlocked - Se l'utente è stato bloccato
 * @param {string} [options.returnDate] - Data di restituzione prevista
 * @param {string} [options.actualReturnDate] - Data di restituzione effettiva
 * @returns {Promise<Object>} Risultato invio email
 */
export async function sendPenaltyEmail({ to, studentName, itemName, delayDays, strikesAssigned, totalStrikes, isBlocked, returnDate, actualReturnDate }) {
  console.log('📧 Tentativo invio email di penalità:', { to, studentName, itemName, delayDays, strikesAssigned, totalStrikes });
  
  if (!to) {
    console.error('❌ Email non inviata: destinatario mancante');
    return { success: false, error: 'Destinatario mancante' };
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const subject = isBlocked 
    ? '🚫 Account Bloccato - Penalità per Ritardo - LABA Firenze'
    : `⚠️ Penalità Assegnata - Ritardo nella Restituzione - LABA Firenze`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, ${isBlocked ? '#dc2626' : '#f59e0b'} 0%, ${isBlocked ? '#991b1b' : '#d97706'} 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background: #ffffff;
          padding: 30px;
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 8px 8px;
        }
        .alert-icon {
          font-size: 48px;
          margin-bottom: 20px;
        }
        .info-box {
          background: ${isBlocked ? '#fee2e2' : '#fef3c7'};
          border-left: 4px solid ${isBlocked ? '#dc2626' : '#f59e0b'};
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .detail-row {
          margin: 15px 0;
          padding: 10px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .detail-label {
          font-weight: 600;
          color: #033157;
          margin-bottom: 5px;
        }
        .detail-value {
          color: #666;
        }
        .strikes-box {
          background: #f0f9ff;
          border-left: 4px solid #0ea5e9;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="alert-icon">${isBlocked ? '🚫' : '⚠️'}</div>
        <h1 style="margin: 0; font-size: 24px;">${isBlocked ? 'Account Bloccato' : 'Penalità Assegnata'}</h1>
      </div>
      <div class="content">
        <p>Ciao <strong>${studentName}</strong>,</p>
        
        ${isBlocked ? `
        <div class="info-box">
          <p style="margin: 0;"><strong>🚫 Il tuo account è stato bloccato</strong> per aver accumulato 3 o più penalità per ritardi nella restituzione degli oggetti.</p>
          <p style="margin: 10px 0 0 0;">Non puoi più effettuare nuove richieste di noleggio fino a quando non ti rechi di persona presso la segreteria per sbloccare il tuo account.</p>
        </div>
        ` : `
        <p>Ti è stata assegnata una <strong>penalità</strong> per ritardo nella restituzione dell'attrezzatura.</p>
        
        ${totalStrikes >= 2 ? `
        <div class="info-box">
          <p style="margin: 0;"><strong>⚠️ ATTENZIONE:</strong> Hai accumulato ${totalStrikes} penalità. Con un altro ritardo, il tuo account verrà bloccato automaticamente.</p>
        </div>
        ` : ''}
        `}
        
        <h2 style="color: #033157; margin-top: 30px;">Dettagli della Penalità</h2>
        
        <div class="detail-row">
          <div class="detail-label">Oggetto</div>
          <div class="detail-value">${itemName}</div>
        </div>
        
        <div class="detail-row">
          <div class="detail-label">Giorni di Ritardo</div>
          <div class="detail-value">${delayDays} giorno/i</div>
        </div>
        
        ${returnDate ? `
        <div class="detail-row">
          <div class="detail-label">Data Restituzione Prevista</div>
          <div class="detail-value">${formatDate(returnDate)}</div>
        </div>
        ` : ''}
        
        ${actualReturnDate ? `
        <div class="detail-row">
          <div class="detail-label">Data Restituzione Effettiva</div>
          <div class="detail-value">${formatDate(actualReturnDate)}</div>
        </div>
        ` : ''}
        
        <div class="strikes-box">
          <div class="detail-label">Strike Assegnati</div>
          <div class="detail-value" style="font-size: 18px; font-weight: bold; color: #0ea5e9;">${strikesAssigned}</div>
        </div>
        
        <div class="strikes-box">
          <div class="detail-label">Strike Totali Accumulati</div>
          <div class="detail-value" style="font-size: 18px; font-weight: bold; color: ${totalStrikes >= 3 ? '#dc2626' : totalStrikes >= 2 ? '#f59e0b' : '#0ea5e9'};">
            ${totalStrikes} / 3
          </div>
          ${totalStrikes >= 3 ? '<p style="margin: 10px 0 0 0; color: #dc2626; font-weight: bold;">⚠️ Account bloccato</p>' : ''}
        </div>
        
        <div class="info-box" style="background: #f0f9ff; border-left-color: #0ea5e9; margin-top: 20px;">
          <p style="margin: 0;"><strong>📋 Sistema di Penalità:</strong></p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px;">
            <li>1-3 giorni di ritardo = 1 strike</li>
            <li>4-7 giorni di ritardo = 2 strike</li>
            <li>8+ giorni di ritardo = 3 strike (blocco immediato)</li>
            <li>3 strike totali = blocco account</li>
          </ul>
        </div>
        
        ${isBlocked ? `
        <div class="info-box" style="background: #fee2e2; border-left-color: #dc2626; margin-top: 20px;">
          <p style="margin: 0;"><strong>🔓 Per sbloccare il tuo account:</strong> Recati di persona presso la segreteria.</p>
        </div>
        ` : ''}
        
        <div class="footer">
          <p>LABA Firenze - Gestionale Attrezzature</p>
          <p>Per domande o assistenza, contatta la segreteria.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
${isBlocked ? 'Account Bloccato' : 'Penalità Assegnata'} - LABA Firenze

Ciao ${studentName},

${isBlocked ? 
  'Il tuo account è stato bloccato per aver accumulato 3 o più penalità per ritardi nella restituzione degli oggetti. Non puoi più effettuare nuove richieste di noleggio fino a quando non ti rechi di persona presso la segreteria per sbloccare il tuo account.' :
  'Ti è stata assegnata una penalità per ritardo nella restituzione dell\'attrezzatura.' + (totalStrikes >= 2 ? ` ATTENZIONE: Hai accumulato ${totalStrikes} penalità. Con un altro ritardo, il tuo account verrà bloccato automaticamente.` : '')
}

Dettagli della Penalità:
- Oggetto: ${itemName}
- Giorni di Ritardo: ${delayDays} giorno/i
${returnDate ? `- Data Restituzione Prevista: ${formatDate(returnDate)}` : ''}
${actualReturnDate ? `- Data Restituzione Effettiva: ${formatDate(actualReturnDate)}` : ''}
- Strike Assegnati: ${strikesAssigned}
- Strike Totali Accumulati: ${totalStrikes} / 3
${totalStrikes >= 3 ? '- ⚠️ Account bloccato' : ''}

Sistema di Penalità:
- 1-3 giorni di ritardo = 1 strike
- 4-7 giorni di ritardo = 2 strike
- 8+ giorni di ritardo = 3 strike (blocco immediato)
- 3 strike totali = blocco account

${isBlocked ? 'Per sbloccare il tuo account: Recati di persona presso la segreteria.' : ''}

LABA Firenze - Gestionale Attrezzature
Per domande o assistenza, contatta la segreteria.
  `.trim();

  // Prova prima con Mailgun API REST, poi fallback a SMTP
  try {
    if (MAILGUN_API_KEY) {
      console.log('📧 Invio email di penalità tramite Mailgun API REST...');
      const result = await sendViaMailgunAPI({ to, subject, html, text });
      console.log('✅ Email di penalità inviata con successo via Mailgun API!', {
        to,
        messageId: result.id || result.message
      });
      return { success: true, messageId: result.id || result.message };
    } else {
      // Fallback a SMTP
      console.log('📧 Invio email di penalità tramite SMTP (fallback)...');
      const emailTransporter = getTransporter();
      
      if (!emailTransporter) {
        console.error('❌ Email non inviata: né Mailgun API né SMTP configurati');
        return { success: false, error: 'Nessun metodo di invio email configurato' };
      }

      const mailOptions = {
        from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
        to: to,
        subject: subject,
        html: html,
        text: text
      };

      const info = await emailTransporter.sendMail(mailOptions);
      console.log('✅ Email di penalità inviata con successo via SMTP!', {
        to,
        messageId: info.messageId
      });
      return { success: true, messageId: info.messageId };
    }
  } catch (error) {
    console.error('❌ Errore invio email di penalità:', {
      message: error.message,
      code: error.code,
      response: error.response,
      stack: error.stack
    });
    return { success: false, error: error.message, details: error };
  }
}

/**
 * Invia email di reminder per riconsegna il giorno prima
 * @param {Object} options - Opzioni per l'email
 * @param {string} options.to - Email destinatario
 * @param {string} options.studentName - Nome studente
 * @param {string} options.itemName - Nome oggetto del prestito
 * @param {string} options.returnDate - Data di riconsegna prevista (YYYY-MM-DD)
 * @param {string} [options.startDate] - Data di inizio prestito (YYYY-MM-DD)
 * @returns {Promise<Object>} Risultato invio email
 */
export async function sendReminderEmail({ to, studentName, itemName, returnDate, startDate }) {
  console.log('📧 Tentativo invio email di reminder:', { to, studentName, itemName, returnDate });
  
  if (!to) {
    console.error('❌ Email non inviata: destinatario mancante');
    return { success: false, error: 'Destinatario mancante' };
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formattedReturnDate = formatDate(returnDate);
  const formattedStartDate = startDate ? formatDate(startDate) : null;

  const subject = '🔔 Promemoria Riconsegna - LABA Firenze';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background: #ffffff;
          padding: 30px;
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 8px 8px;
        }
        .alert-icon {
          font-size: 48px;
          margin-bottom: 20px;
        }
        .info-box {
          background: #eff6ff;
          border-left: 4px solid #0ea5e9;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .warning-box {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .detail-row {
          margin: 15px 0;
          padding: 10px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .detail-label {
          font-weight: 600;
          color: #033157;
          margin-bottom: 5px;
        }
        .detail-value {
          color: #666;
        }
        .highlight {
          background: #f0f9ff;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
          text-align: center;
        }
        .highlight-date {
          font-size: 24px;
          font-weight: bold;
          color: #0ea5e9;
          margin: 10px 0;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="alert-icon">🔔</div>
        <h1 style="margin: 0; font-size: 24px;">Promemoria Riconsegna</h1>
      </div>
      <div class="content">
        <p>Ciao <strong>${studentName}</strong>,</p>
        
        <p>Ti ricordiamo che <strong>domani</strong> è prevista la riconsegna dell'attrezzatura che hai in prestito.</p>
        
        <div class="highlight">
          <div class="detail-label">Data di Riconsegna</div>
          <div class="highlight-date">${formattedReturnDate}</div>
        </div>
        
        <h2 style="color: #033157; margin-top: 30px;">Dettagli del Prestito</h2>
        
        <div class="detail-row">
          <div class="detail-label">Oggetto</div>
          <div class="detail-value">${itemName}</div>
        </div>
        
        ${formattedStartDate ? `
        <div class="detail-row">
          <div class="detail-label">Data Inizio Prestito</div>
          <div class="detail-value">${formattedStartDate}</div>
        </div>
        ` : ''}
        
        <div class="detail-row">
          <div class="detail-label">Data Riconsegna Prevista</div>
          <div class="detail-value">${formattedReturnDate}</div>
        </div>
        
        <div class="warning-box">
          <p style="margin: 0;"><strong>⚠️ IMPORTANTE:</strong></p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px;">
            <li>Riconsegna l'attrezzatura <strong>entro domani</strong></li>
            <li>Ritardi nella riconsegna comportano penalità</li>
            <li>Se hai bisogno di prorogare, contatta la segreteria prima della scadenza</li>
          </ul>
        </div>
        
        <div class="info-box">
          <p style="margin: 0;"><strong>💡 Ricorda:</strong> La riconsegna deve avvenire presso la segreteria durante gli orari di apertura.</p>
        </div>
        
        <div class="footer">
          <p>LABA Firenze - Gestionale Attrezzature</p>
          <p>Per domande o assistenza, contatta la segreteria.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Promemoria Riconsegna - LABA Firenze

Ciao ${studentName},

Ti ricordiamo che domani è prevista la riconsegna dell'attrezzatura che hai in prestito.

Data di Riconsegna: ${formattedReturnDate}

Dettagli del Prestito:
- Oggetto: ${itemName}
${formattedStartDate ? `- Data Inizio Prestito: ${formattedStartDate}` : ''}
- Data Riconsegna Prevista: ${formattedReturnDate}

⚠️ IMPORTANTE:
- Riconsegna l'attrezzatura entro domani
- Ritardi nella riconsegna comportano penalità
- Se hai bisogno di prorogare, contatta la segreteria prima della scadenza

💡 Ricorda: La riconsegna deve avvenire presso la segreteria durante gli orari di apertura.

LABA Firenze - Gestionale Attrezzature
Per domande o assistenza, contatta la segreteria.
  `.trim();

  // Prova prima con Mailgun API REST, poi fallback a SMTP
  try {
    if (MAILGUN_API_KEY) {
      console.log('📧 Invio email di reminder tramite Mailgun API REST...');
      const result = await sendViaMailgunAPI({ to, subject, html, text });
      console.log('✅ Email di reminder inviata con successo via Mailgun API!', {
        to,
        messageId: result.id || result.message
      });
      return { success: true, messageId: result.id || result.message };
    } else {
      // Fallback a SMTP
      console.log('📧 Invio email di reminder tramite SMTP (fallback)...');
      const emailTransporter = getTransporter();
      
      if (!emailTransporter) {
        console.error('❌ Email non inviata: né Mailgun API né SMTP configurati');
        return { success: false, error: 'Nessun metodo di invio email configurato' };
      }

      const mailOptions = {
        from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
        to: to,
        subject: subject,
        html: html,
        text: text
      };

      const info = await emailTransporter.sendMail(mailOptions);
      console.log('✅ Email di reminder inviata con successo via SMTP!', {
        to,
        messageId: info.messageId
      });
      return { success: true, messageId: info.messageId };
    }
  } catch (error) {
    console.error('❌ Errore invio email di reminder:', {
      message: error.message,
      code: error.code,
      response: error.response,
      stack: error.stack
    });
    return { success: false, error: error.message, details: error };
  }
}

/**
 * Invia email con link per reset password self-service
 * @param {Object} options
 * @param {string} options.to - Email destinatario
 * @param {string} options.resetLink - URL completo con token (es. https://attrezzatura.laba.biz/?resetToken=xxx)
 * @returns {Promise<Object>}
 */
export async function sendPasswordResetEmail({ to, resetLink }) {
  const subject = 'Reset password - Service Attrezzatura LABA';
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 500px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: white; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">Reset Password</h1>
      </div>
      <div style="background: #fff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Ciao,</p>
        <p>Hai richiesto il reset della password per il Service Attrezzatura LABA.</p>
        <p>Clicca il pulsante qui sotto per impostare una nuova password:</p>
        <p style="text-align: center; margin: 28px 0;">
          <a href="${resetLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Imposta nuova password</a>
        </p>
        <p style="font-size: 13px; color: #666;">Il link scade tra 1 ora. Se non hai richiesto tu il reset, ignora questa email.</p>
        <p style="font-size: 13px; color: #666;">LABA Firenze - Gestionale Attrezzature</p>
      </div>
    </body>
    </html>
  `;
  const text = `Reset password - Service Attrezzatura LABA\n\nClicca per impostare una nuova password:\n${resetLink}\n\nIl link scade tra 1 ora.`;

  try {
    if (MAILGUN_API_KEY) {
      const result = await sendViaMailgunAPI({ to, subject, html, text });
      return { success: true, messageId: result.id || result.message };
    }
    const emailTransporter = getTransporter();
    if (!emailTransporter) {
      return { success: false, error: 'Nessun metodo di invio email configurato' };
    }
    const info = await emailTransporter.sendMail({
      from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
      to,
      subject,
      html,
      text
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Errore invio email reset password:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Test connessione email (Mailgun API o SMTP)
 */
export async function testEmailConnection() {
  // Prova prima con Mailgun API
  if (MAILGUN_API_KEY) {
    try {
      // Costruisci l'URL dell'API correttamente
      // Per US: https://api.mailgun.net/v3/domains/{domain}
      // Per EU: https://api.eu.mailgun.net/v3/domains/{domain}
      const apiBaseUrl = MAILGUN_REGION === 'us' 
        ? `https://api.mailgun.net/v3`
        : `https://api.${MAILGUN_REGION}.mailgun.net/v3`;
      const domainUrl = `${apiBaseUrl}/domains/${MAILGUN_DOMAIN}`;
      
      console.log('🔍 Test connessione Mailgun API...', {
        domain: MAILGUN_DOMAIN,
        region: MAILGUN_REGION,
        apiUrl: domainUrl
      });
      
      // Test: verifica che il dominio esista e sia accessibile (GET /domains/{domain})
      const response = await fetch(domainUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64')}`
        },
        signal: AbortSignal.timeout(10000) // 10 secondi timeout
      });
      
      const responseText = await response.text();
      
      if (response.ok) {
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (e) {
          result = { message: responseText };
        }
        console.log('✅ Connessione Mailgun API verificata con successo', result);
        return { 
          success: true, 
          method: 'Mailgun API',
          domain: result.domain?.name || MAILGUN_DOMAIN,
          state: result.domain?.state || 'unknown'
        };
      } else {
        let errorMessage = `Mailgun API error: ${response.status} - ${responseText}`;
        
        if (response.status === 404) {
          errorMessage = `Dominio non trovato: ${MAILGUN_DOMAIN}\n\n` +
            'Verifica che:\n' +
            `- MAILGUN_DOMAIN sia corretto (attuale: ${MAILGUN_DOMAIN})\n` +
            `- Il dominio sia stato aggiunto su Mailgun\n` +
            `- MAILGUN_REGION sia corretto (attuale: ${MAILGUN_REGION}, deve essere 'eu' o 'us')`;
        } else if (response.status === 401) {
          errorMessage = `Autenticazione fallita: API key non valida\n\n` +
            'Verifica che MAILGUN_API_KEY sia corretta su Railway';
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ Errore verifica Mailgun API:', error);
      return { 
        success: false, 
        error: error.message || 'Errore sconosciuto durante verifica Mailgun API',
        method: 'Mailgun API'
      };
    }
  }
  
  // Fallback a SMTP
  const emailTransporter = getTransporter();
  
  if (!emailTransporter) {
    return { success: false, error: 'Né Mailgun API né SMTP configurati' };
  }

  try {
    console.log('🔍 Tentativo connessione a SMTP...', {
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE
    });
    
    // Timeout di 20 secondi per la verifica SMTP
    const verifyPromise = emailTransporter.verify();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 20000)
    );
    
    await Promise.race([verifyPromise, timeoutPromise]);
    console.log('✅ Connessione SMTP verificata con successo');
    return { success: true, method: 'SMTP' };
  } catch (error) {
    console.error('❌ Errore verifica SMTP:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
      syscall: error.syscall,
      address: error.address
    });
    
    // Messaggi di errore più specifici
    let errorMessage = error.message || 'Errore sconosciuto durante verifica SMTP';
    
    if (error.message.includes('timeout') || error.message === 'Connection timeout' || error.code === 'ETIMEDOUT') {
      const isMailgun = SMTP_HOST && SMTP_HOST.includes('mailgun');
      errorMessage = 'Connection timeout - Impossibile connettersi al server SMTP.\n\n' +
        'Possibili cause:\n' +
        (isMailgun ? 
          '1. Credenziali Mailgun errate (verifica SMTP_USER e SMTP_PASSWORD su Railway)\n' +
          '2. Dominio Mailgun non verificato completamente\n' +
          '3. Firewall/rete blocca porta 587\n' +
          '4. Problemi di rete tra Railway e Mailgun EU\n\n' +
          'Soluzioni:\n' +
          '- Verifica che SMTP_HOST sia smtp.eu.mailgun.org (per regione EU)\n' +
          '- Verifica che SMTP_USER sia l\'email completa (es. service@labafirenze.com)\n' +
          '- Controlla su Mailgun che il dominio sia verificato\n' +
          '- Prova a resettare la password SMTP su Mailgun'
          :
          '1. Password SMTP errata o con spazi (verifica su Railway)\n' +
          '2. Server SMTP blocca connessioni da Railway (IP non autorizzato)\n' +
          '3. Firewall/rete blocca porta 587\n' +
          '4. Account email ha restrizioni di sicurezza\n\n' +
          'Soluzioni:\n' +
          '- Verifica che SMTP_PASSWORD su Railway sia corretta\n' +
          '- Verifica che SMTP_HOST e SMTP_PORT siano corretti\n' +
          '- Controlla le impostazioni del provider email');
    } else if (error.code === 'EAUTH') {
      errorMessage = 'Autenticazione fallita - Verifica username e password SMTP';
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      errorMessage = `Connessione rifiutata - Verifica host (${SMTP_HOST}) e porta (${SMTP_PORT}) SMTP`;
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Timeout connessione - Il server SMTP non risponde';
    }
    
    return { 
      success: false, 
      error: errorMessage,
      details: {
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode
      }
    };
  }
}
