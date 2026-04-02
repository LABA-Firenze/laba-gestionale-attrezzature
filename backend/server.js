// Log uncaught errors for Railway/deploy visibility
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err?.message);
  console.error(err?.stack);
  process.exit(1);
});
process.on('unhandledRejection', (reason, p) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import inventarioRouter from "./routes/inventario.js";
import prestitiRouter from "./routes/prestiti.js";
import categorieRouter from "./routes/categorie.js";
import categorieSempliciRouter from "./routes/categorie_semplici.js";
import corsiRouter from "./routes/corsi.js";
import riparazioniRouter from "./routes/riparazioni.js";
import authRouter from "./routes/auth.js";
import richiesteRouter from "./routes/richieste.js";
import segnalazioniRouter from "./routes/segnalazioni.js";
import avvisiRouter from "./routes/avvisi.js";
import statsRouter from "./routes/stats.js";
import usersRouter from "./routes/users.js";
import penaltiesRouter from "./routes/penalties.js";
import excelRouter from "./routes/excel.js";
import cronRouter from "./routes/cron.js";
import { initDatabase, query } from './utils/postgres.js';
import getSupabase from './utils/supabaseStorage.js';
import { csrfTokenHandler, csrfProtection } from './middleware/csrfDoubleSubmit.js';

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "0.0.0.0";

// In produzione JWT_SECRET è obbligatorio (niente fallback per evitare token forgery).
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET mancante. In produzione deve essere impostato (es. Railway Variables).');
  process.exit(1);
}

// Inizializza il database PostgreSQL/Supabase
try {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL mancante. Imposta la variabile in Railway: Settings → Variables');
    process.exit(1);
  }
  console.log('🔄 Inizializzazione database PostgreSQL/Supabase...');
  await initDatabase();
  console.log('✅ Database PostgreSQL/Supabase inizializzato con successo!');
} catch (error) {
  console.error('❌ Errore durante l\'inizializzazione del database:', error.message);
  console.error('Stack:', error.stack);
  console.error('Verifica DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in Railway Variables');
  process.exit(1);
}

// CORS: solo origini consentite (CORS_ORIGINS = lista separata da virgola, es. https://attrezzatura.laba.biz,http://localhost:5173)
function withWwwVariant(originUrl) {
  try {
    const u = new URL(originUrl);
    const host = u.hostname;
    if (host.startsWith('www.')) {
      return [`${u.protocol}//${host.replace(/^www\./, '')}`];
    }
    return [`${u.protocol}//www.${host}`];
  } catch (_) {
    return [];
  }
}

const rawCorsOrigins = (process.env.CORS_ORIGINS || 'https://attrezzatura.laba.biz')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const allowAllOrigins = rawCorsOrigins.includes('*');
const corsOrigins = new Set(
  rawCorsOrigins
    .filter((o) => o !== '*')
    .flatMap((o) => [o, ...withWwwVariant(o)])
);

app.use(cors({
  origin(origin, callback) {
    if (allowAllOrigins) return callback(null, true);
    if (!origin) return callback(null, true);
    if (corsOrigins.has(origin)) return callback(null, true);
    return callback(new Error(`Origin non consentita da CORS: ${origin}`), false);
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'Authorization'],
}));
app.use(express.json());
// codeql[js/missing-token-validation]: CSRF double-submit nel middleware immediatamente successivo (`csrfProtection`, cookie `laba_csrf` + header `x-csrf-token`); vedi middleware/csrfDoubleSubmit.js
app.use(cookieParser());
app.use(csrfProtection);

app.get('/api/csrf-token', csrfTokenHandler);

// Rate limiting globale (mitiga CodeQL js/missing-rate-limiting su route API, static e SPA)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX_PER_IP || 600),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Troppe richieste da questo indirizzo, riprova tra poco." },
  skip: (req) => {
    const p = req.path || "";
    return p === "/health" || p === "/api/health";
  },
});
app.use(globalLimiter);

app.use(morgan("dev"));

app.get("/api/health", (_, res) => res.json({ ok: true, version: "2.1", build: "2.1" }));

// Keepalive endpoint per mantenere attivo il database Supabase
// In produzione richiede ?token=CRON_SECRET_TOKEN (stesso token dei cron su cron-job.org)
app.get("/api/keepalive", async (req, res) => {
  const cronToken = process.env.CRON_SECRET_TOKEN;
  if (cronToken && req.query.token !== cronToken) {
    return res.status(401).json({ error: 'Token non valido' });
  }
  try {
    // 1. Query dirette PostgreSQL (mantengono attivo il database)
    const [usersCount, inventarioCount, prestitiCount] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users'),
      query('SELECT COUNT(*) as count FROM inventario'),
      query('SELECT COUNT(*) as count FROM prestiti WHERE stato = $1', ['attivo'])
    ]);
    
    // 2. Chiamata API REST Supabase (appare nelle statistiche "REST Requests")
    // Usa una tabella dedicata 'keepalive_log' che non contiene dati sensibili
    // RLS è abilitato con policy permissiva (vedi migrations/rls_keepalive_policies.sql)
    let restActivity = null;
    const supabase = getSupabase();
    const isProd = process.env.NODE_ENV === 'production';
    if (supabase) {
      try {
        if (!isProd) console.log('🔄 Chiamata REST Supabase su tabella keepalive_log...');
        // Query su tabella dedicata (senza dati sensibili, RLS con policy permissiva)
        const result = await supabase
          .from('keepalive_log')
          .select('id', { count: 'exact', head: true });

        if (!isProd) {
          console.log('📊 Risultato completo Supabase:', {
            hasError: !!result.error,
            count: result.count,
            error: result.error ? {
              message: result.error.message,
              code: result.error.code,
              details: result.error.details,
              hint: result.error.hint
            } : null
          });
        }

        if (result.error) {
          console.warn('⚠️ Errore chiamata REST Supabase:', result.error.message);
          restActivity = { 
            error: result.error.message || 'Unknown error',
            code: result.error.code,
            details: result.error.details,
            hint: result.error.hint,
            rest_request: false
          };
        } else {
          restActivity = { 
            count: result.count || 0, 
            rest_request: true 
          };
          if (!isProd) console.log('✅ Chiamata REST Supabase riuscita, count:', result.count);
        }
      } catch (supabaseError) {
        console.error('❌ Eccezione chiamata REST Supabase:', {
          message: supabaseError.message,
          stack: supabaseError.stack
        });
        restActivity = { 
          error: supabaseError.message, 
          rest_request: false 
        };
      }
    } else {
      console.warn('⚠️ Client Supabase non disponibile');
      restActivity = { error: 'Client Supabase non configurato', rest_request: false };
    }
    
    res.json({ 
      ok: true, 
      message: 'Database keepalive successful', 
      timestamp: new Date().toISOString(),
      stats: {
        users: usersCount[0]?.count || 0,
        inventario: inventarioCount[0]?.count || 0,
        prestiti_attivi: prestitiCount[0]?.count || 0,
        rest_api: restActivity
      }
    });
  } catch (error) {
    console.error('❌ Errore keepalive database:', error.message);
    res.status(500).json({ ok: false, error: 'Database keepalive failed' });
  }
});

app.use("/api/inventario", inventarioRouter);
app.use("/api/prestiti", prestitiRouter);
app.use("/api/categorie", categorieRouter);
app.use("/api/categorie-semplici", categorieSempliciRouter);
app.use("/api/corsi", corsiRouter);
app.use("/api/riparazioni", riparazioniRouter);
app.use("/api/auth", authRouter);
app.use("/api/richieste", richiesteRouter);
app.use("/api/segnalazioni", segnalazioniRouter);
app.use("/api/avvisi", avvisiRouter);
app.use("/api/stats", statsRouter);
app.use("/api/users", usersRouter);
app.use("/api/penalties", penaltiesRouter);
app.use("/api/excel", excelRouter);
app.use("/api/cron", cronRouter);

// serve frontend build if built
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const staticDir = path.join(__dirname, "..", "frontend", "dist");
app.use(express.static(staticDir, { maxAge: "1h", index: false }));

app.get("/health", (_, res) => res.type("text").send("ok"));

// Express 5: wildcard must be named (path-to-regexp); use /{*path} for SPA fallback
app.get("/{*path}", (req, res) => {
  if (req.path.startsWith("/api/"))
    return res.status(404).json({ error: "Not found" });
  try {
    res.sendFile(path.join(staticDir, "index.html"));
  } catch {
    res.status(404).send("API running. Build frontend to serve UI.");
  }
});

app.listen(PORT, HOST, () =>
  console.log(`API + Web on http://${HOST}:${PORT}`),
);
