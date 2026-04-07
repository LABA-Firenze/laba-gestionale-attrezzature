// Route diagnostiche admin (test email, ecc.) — richiedono auth + ruolo admin/supervisor.
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { testEmailConnection, sendTestEmailTo } from '../utils/email.js';

const router = Router();

/** GET /api/debug/test-email — verifica Mailgun API o SMTP (verify) */
router.get('/test-email', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await testEmailConnection();
    return res.status(200).json(result);
  } catch (e) {
    console.error('debug test-email:', e);
    return res.status(500).json({ success: false, error: e.message || 'Errore server' });
  }
});

/** POST /api/debug/send-test-email — invia email di prova a { to } */
router.post('/send-test-email', requireAuth, requireRole('admin'), async (req, res) => {
  const to = String(req.body?.to || '').trim();
  if (!to || !to.includes('@')) {
    return res.status(400).json({ error: 'Indirizzo email destinatario non valido' });
  }
  const out = await sendTestEmailTo(to);
  if (out.success) {
    return res.json({
      success: true,
      messageId: out.messageId,
      method: out.method,
    });
  }
  return res.status(400).json({ error: out.error || 'Invio fallito' });
});

export default router;
