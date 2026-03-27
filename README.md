# LABA Gestionale Attrezzature v2.1.0

**Sistema completo di gestione attrezzature per il laboratorio LABA Firenze**

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://postgresql.org/)

## Indice

- [Panoramica](#-panoramica)
- [Funzionalità](#-funzionalità)
- [Architettura](#-architettura)
- [Quick Start](#-quick-start)
- [Configurazione](#-configurazione)
- [Interfaccia Utente](#-interfaccia-utente)
- [API Endpoints](#-api-endpoints)
- [Database Schema](#-database-schema)
- [Deploy](#-deploy)
- [Sviluppo](#-sviluppo)
- [Monitoraggio](#-monitoraggio)
- [Contribuire](#-contribuire)

## Panoramica

Il **LABA Gestionale Attrezzature** è un sistema web completo per la gestione delle attrezzature del laboratorio LABA Firenze. Il sistema permette agli studenti di richiedere prestiti di attrezzature, agli amministratori di gestire inventario e utenti, e fornisce un'interfaccia moderna e responsive per tutti i dispositivi.

### Design Philosophy

- **Mobile-First**: Interfaccia completamente responsive
- **User-Centric**: Esperienza ottimizzata per studenti e amministratori
- **Real-Time**: Notifiche e aggiornamenti in tempo reale
- **Modern UI**: Design pulito e professionale con animazioni fluide

## Funzionalità

### **Area Studenti**
- **Dashboard Personalizzata**: Panoramica prestiti attivi, richieste e segnalazioni
- **Catalogo Attrezzature**: Visualizzazione filtrata per corso accademico
- **Gestione Prestiti**: Richiesta, visualizzazione e tracciamento prestiti
- **Segnalazione Guasti**: Sistema integrato per report problemi
- **Profilo Utente**: Gestione dati personali e preferenze

### **Area Amministratori**
- **Gestione Inventario**: CRUD completo per attrezzature e unità
- **Gestione Utenti**: Creazione, modifica e amministrazione utenti
- **Gestione Prestiti**: Approvazione, modifica e tracciamento richieste
- **Statistiche Avanzate**: Dashboard con metriche e KPI
- **Sistema Notifiche**: Centro notifiche integrato
- **Monitoraggio Sistema**: Stato API, performance e incidenti

### **Funzionalità Tecniche**
- **Autenticazione JWT**: Sistema sicuro con refresh token
- **Responsive Design**: Ottimizzato per mobile, tablet e desktop
- **Real-Time Updates**: Notifiche push e aggiornamenti live
- **Sistema Categorie**: Organizzazione gerarchica attrezzature
- **QR Code**: Generazione automatica per identificazione rapida
- **Export Excel**: Esportazione dati per analisi

## Architettura

### **Frontend** (React + Vite)
```
frontend/
├── src/
│   ├── components/          # Componenti riutilizzabili
│   │   ├── Dashboard.jsx    # Dashboard admin
│   │   ├── Inventory.jsx    # Gestione inventario
│   │   ├── Loans.jsx        # Gestione prestiti
│   │   ├── UserManagement.jsx # Gestione utenti
│   │   └── ...
│   ├── user/               # Area studenti
│   │   ├── UserArea.jsx    # Layout principale studenti
│   │   └── UserDashboard.jsx # Dashboard studenti
│   ├── auth/               # Autenticazione
│   │   ├── AuthContext.jsx # Context provider
│   │   └── Login.jsx       # Login component
│   └── styles/             # Stili CSS
│       └── main.css        # Stili globali
```

### **Backend** (Node.js + Express)
```
backend/
├── routes/                 # API endpoints
│   ├── auth.js            # Autenticazione
│   ├── inventario.js      # Gestione inventario
│   ├── prestiti.js        # Gestione prestiti
│   ├── users.js           # Gestione utenti
│   └── ...
├── models/                # Modelli database
├── middleware/            # Middleware Express
└── utils/                 # Utility functions
```

### **Database** (PostgreSQL)
- **Utenti**: Gestione studenti e amministratori
- **Inventario**: Attrezzature e unità specifiche
- **Prestiti**: Richieste e prestiti attivi
- **Categorie**: Organizzazione gerarchica
- **Segnalazioni**: Sistema report guasti

## Quick Start

### Prerequisiti
- Node.js 20+ 
- PostgreSQL 15+
- Git

### 1. Clone Repository
```bash
git clone https://github.com/SAzzinelli/laba-gestionale-attrezzature.git
cd laba-gestionale-attrezzature
```

### 2. Installazione Dipendenze
```bash
# Installa tutte le dipendenze
npm run install-all

# Oppure manualmente
cd backend && npm install
cd ../frontend && npm install
```

### 3. Configurazione Database
```bash
# Crea database PostgreSQL
createdb laba_gestionale

# Esegui migrazioni
cd backend
npm run migrate
```

### 4. Variabili d'Ambiente
```bash
# Backend (.env)
DATABASE_URL=postgresql://user:password@localhost:5432/laba_gestionale
JWT_SECRET=your-secret-key
PORT=3001

# Frontend (.env)
VITE_API_BASE_URL=http://localhost:3001
```

### 5. Avvio Sviluppo
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend  
cd frontend && npm run dev
```

### 6. Accesso
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Admin**: admin@labafirenze.com / laba2025

## Configurazione

### **Variabili d'Ambiente Backend**
```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Server
PORT=3001
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:5173

# Cron e Keepalive (produzione): token per cron-job.org
# Imposta su Railway; usalo in URL come ?token=VALORE (se contiene +, /, = usare URL encoding, es. + → %2B)
CRON_SECRET_TOKEN=your-cron-secret-token

# Sicurezza (review): JWT_SECRET obbligatorio in prod; CORS allow-list (CORS_ORIGINS); cron/keepalive con token;
# rate limit su login/register/forgot-password (20 req/15 min per IP); script senza credenziali in codice; privacy in Login/Registrazione.

# Email (SMTP) - Per notifiche di approvazione richieste
# OPZIONE 1: Gmail (con App Password)
# 1. Abilita "Verifica in 2 passaggi" su Google Account
# 2. Vai su: https://myaccount.google.com/apppasswords
# 3. Genera una "App Password" (16 caratteri)
# 4. Usa quella password qui sotto
# LIMITI: 500 email/giorno (account gratuito), 2000/giorno (Google Workspace)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=service@labafirenze.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # App Password di 16 caratteri (senza spazi)
EMAIL_FROM=service@labafirenze.com
EMAIL_FROM_NAME=LABA Firenze - Gestionale Attrezzature

# OPZIONE 2: Mailgun API REST (Consigliato - 5000 email/mese gratis)
# 1. Crea account su https://www.mailgun.com (già fatto)
# 2. Verifica il dominio aggiungendo i record DNS richiesti
# 3. Vai su Sending → Sending keys → API keys
# 4. Copia la "Sending API key" (formato: xxxxx-xxxxx-xxxxx)
# 5. Configura queste variabili su Railway:
# MAILGUN_API_KEY=your-mailgun-api-key-here  # Sending API key da Mailgun
# MAILGUN_DOMAIN=labafirenze.com  # Il tuo dominio verificato
# MAILGUN_REGION=eu  # 'eu' per Europa, 'us' per USA
# EMAIL_FROM=service@labafirenze.com
# EMAIL_FROM_NAME=LABA Firenze - Gestionale Attrezzature
# 
# NOTE:
# - L'API REST è più affidabile di SMTP e non ha problemi di timeout
# - Se MAILGUN_API_KEY non è configurata, il sistema userà SMTP come fallback
# - Assicurati che il dominio sia completamente verificato su Mailgun

# OPZIONE 3: SendGrid (100 email/giorno gratis)
# 1. Crea account su https://sendgrid.com
# 2. Vai su Settings → API Keys → Create API Key
# 3. Usa queste variabili:
# SMTP_HOST=smtp.sendgrid.net
# SMTP_PORT=587
# SMTP_USER=apikey
# SMTP_PASSWORD=your-sendgrid-api-key

# OPZIONE 4: AWS SES (molto economico)
# https://aws.amazon.com/ses/

# Reset password self-service (link nell'email)
FRONTEND_URL=https://attrezzatura.laba.biz  # URL del frontend in produzione
```

### **Variabili d'Ambiente Frontend**
```env
# API
VITE_API_BASE_URL=http://localhost:3001

# Environment
VITE_NODE_ENV=development
```

### **Configurazione Database**
```sql
-- Tabelle principali
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  surname VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  matricola VARCHAR(50) UNIQUE,
  corso_accademico VARCHAR(100),
  phone VARCHAR(20),
  ruolo VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE inventario (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descrizione TEXT,
  categoria_madre VARCHAR(100),
  categoria_id INTEGER REFERENCES categorie_semplici(id),
  quantita_totale INTEGER DEFAULT 0,
  quantita_disponibile INTEGER DEFAULT 0,
  posizione VARCHAR(100),
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Interfaccia Utente

### **Design System**
- **Colori**: Palette blu professionale con gradienti
- **Tipografia**: Font system con gerarchia chiara
- **Componenti**: Design system consistente
- **Animazioni**: Transizioni fluide e micro-interazioni

### **Layout Responsive**
- **Mobile**: Hamburger menu, card layout, touch-friendly
- **Tablet**: Layout ibrido con sidebar collassabile
- **Desktop**: Sidebar fissa, layout a griglia ottimizzato

### **Componenti Chiave**
- **Sidebar**: Navigazione principale con animazioni
- **Dashboard**: KPI cards e metriche in tempo reale
- **Modals**: Form e conferme con overlay
- **Tables**: Responsive con azioni contestuali
- **Cards**: Layout mobile ottimizzato

## API Endpoints

### **Autenticazione**
```http
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh
GET  /api/auth/me
PUT  /api/auth/users/:id/reset-password
```

### **Inventario**
```http
GET    /api/inventario              # Lista completa
GET    /api/inventario/disponibili  # Solo disponibili
POST   /api/inventario              # Crea nuovo
PUT    /api/inventario/:id          # Modifica
DELETE /api/inventario/:id          # Elimina
GET    /api/inventario/:id/units    # Unità specifiche
```

### **Prestiti**
```http
GET  /api/prestiti           # Lista prestiti
POST /api/prestiti           # Crea prestito
PUT  /api/prestiti/:id       # Modifica prestito
GET  /api/prestiti/mie       # Prestiti utente
```

### **Richieste**
```http
GET  /api/richieste          # Lista richieste
POST /api/richieste          # Crea richiesta
PUT  /api/richieste/:id      # Modifica richiesta
GET  /api/richieste/mie      # Richieste utente
```

### **Utenti**
```http
GET    /api/auth/users       # Lista utenti
POST   /api/auth/register    # Crea utente
PUT    /api/auth/users/:id   # Modifica utente
DELETE /api/auth/users/:id   # Elimina utente
```

### **Categorie**
```http
GET  /api/categorie          # Categorie semplici
GET  /api/categorie-semplici # Lista completa
POST /api/categorie          # Crea categoria
```

### **Segnalazioni**
```http
GET  /api/segnalazioni       # Lista segnalazioni
POST /api/segnalazioni       # Crea segnalazione
GET  /api/segnalazioni/mie   # Segnalazioni utente
```

### **Statistiche**
```http
GET /api/stats               # Statistiche generali
GET /api/stats/inventario    # Stats inventario
GET /api/stats/prestiti      # Stats prestiti
```

## Database Schema

### **Tabelle Principali**

#### **users**
```sql
id              SERIAL PRIMARY KEY
name            VARCHAR(100) NOT NULL
surname         VARCHAR(100) NOT NULL
email           VARCHAR(255) UNIQUE NOT NULL
password_hash   VARCHAR(255) NOT NULL
matricola       VARCHAR(50) UNIQUE
corso_accademico VARCHAR(100)
phone           VARCHAR(20)
ruolo           VARCHAR(20) DEFAULT 'user'
created_at      TIMESTAMP DEFAULT NOW()
```

#### **inventario**
```sql
id                  SERIAL PRIMARY KEY
nome                VARCHAR(255) NOT NULL
descrizione         TEXT
categoria_madre     VARCHAR(100)
categoria_id        INTEGER REFERENCES categorie_semplici(id)
quantita_totale     INTEGER DEFAULT 0
quantita_disponibile INTEGER DEFAULT 0
posizione           VARCHAR(100)
note                TEXT
created_at          TIMESTAMP DEFAULT NOW()
```

#### **inventario_unita**
```sql
id              SERIAL PRIMARY KEY
inventario_id   INTEGER REFERENCES inventario(id)
id_univoco      VARCHAR(50) UNIQUE NOT NULL
stato           VARCHAR(20) DEFAULT 'disponibile'
note            TEXT
created_at      TIMESTAMP DEFAULT NOW()
```

#### **prestiti**
```sql
id              SERIAL PRIMARY KEY
user_id         INTEGER REFERENCES users(id)
inventario_id   INTEGER REFERENCES inventario(id)
unit_id         INTEGER REFERENCES inventario_unita(id)
data_inizio     DATE NOT NULL
data_fine       DATE NOT NULL
stato           VARCHAR(20) DEFAULT 'attivo'
motivazione     TEXT
created_at      TIMESTAMP DEFAULT NOW()
```

#### **richieste**
```sql
id              SERIAL PRIMARY KEY
user_id         INTEGER REFERENCES users(id)
inventario_id   INTEGER REFERENCES inventario(id)
unit_id         INTEGER REFERENCES inventario_unita(id)
data_inizio     DATE NOT NULL
data_fine       DATE NOT NULL
stato           VARCHAR(20) DEFAULT 'pending'
created_at      TIMESTAMP DEFAULT NOW()
```

#### **categorie_semplici**
```sql
id              SERIAL PRIMARY KEY
nome            VARCHAR(100) NOT NULL
descrizione     TEXT
created_at      TIMESTAMP DEFAULT NOW()
```

#### **segnalazioni**
```sql
id              SERIAL PRIMARY KEY
user_id         INTEGER REFERENCES users(id)
inventario_id   INTEGER REFERENCES inventario(id)
tipo            VARCHAR(50) NOT NULL
descrizione     TEXT NOT NULL
stato           VARCHAR(20) DEFAULT 'aperta'
created_at      TIMESTAMP DEFAULT NOW()
```

## Deploy

### **Railway (Raccomandato)**

1. **Preparazione**
   ```bash
   git add .
   git commit -m "Deploy preparation"
   git push origin main
   ```

2. **Deploy su Railway**
   - Vai su [Railway.app](https://railway.app)
   - Clicca "New Project"
   - Seleziona "Deploy from GitHub repo"
   - Scegli il repository
   - Railway rileverà automaticamente la configurazione

3. **Variabili d'Ambiente Railway**
   ```env
   NODE_ENV=production
   DATABASE_URL=postgresql://... (auto-generato)
   JWT_SECRET=your-production-secret
   CORS_ORIGIN=https://your-domain.railway.app
   CRON_SECRET_TOKEN=your-cron-secret  # Per cron e keepalive (cron-job.org)
   ```

4. **Cron e Keepalive (cron-job.org)**  
   Imposta `CRON_SECRET_TOKEN` su Railway, poi su [cron-job.org](https://cron-job.org) crea due job:
   - **Reminder email** (es. ogni giorno alle 18:00):  
     `https://attrezzatura.laba.biz/api/cron/send-reminders?token=VALORE`  
   - **Keepalive** (es. ogni 5–10 min):  
     `https://attrezzatura.laba.biz/api/keepalive?token=VALORE`  
   Se il token contiene `+`, `/` o `=` usa l’URL encoding (es. `+` → `%2B`).

5. **Configurazione Build**
   - Il file `railway.json` gestisce il build automatico
   - `nixpacks.toml` configura l'ambiente Node.js

### **Altri Provider**

#### **Heroku**
```bash
# Install Heroku CLI
npm install -g heroku

# Login e deploy
heroku login
heroku create laba-gestionale
git push heroku main
```

#### **Vercel + Railway**
- **Frontend**: Deploy su Vercel
- **Backend**: Deploy su Railway
- **Database**: PostgreSQL su Railway

## Sviluppo

### **Scripts Disponibili**

```bash
# Root
npm run dev          # Avvia backend + frontend
npm run build        # Build frontend
npm run install-all  # Installa tutte le dipendenze

# Backend
cd backend
npm run dev          # Avvia in sviluppo
npm run start        # Avvia in produzione
npm run migrate      # Esegui migrazioni
npm run seed         # Popola database

# Frontend
cd frontend
npm run dev          # Avvia Vite dev server
npm run build        # Build per produzione
npm run preview      # Preview build
```

### **Struttura Sviluppo**

```bash
# Workflow tipico
git checkout -b feature/nuova-funzionalita
# ... sviluppo ...
npm run test         # Test (se implementati)
git add .
git commit -m "feat: aggiunge nuova funzionalità"
git push origin feature/nuova-funzionalita
# ... crea PR su GitHub ...
```

### **Convenzioni Codice**

- **Commits**: [Conventional Commits](https://conventionalcommits.org/)
- **Branching**: GitFlow con `main` e `develop`
- **Code Style**: ESLint + Prettier
- **Components**: PascalCase per React components
- **API**: RESTful con nomi plurali

## Monitoraggio

### **Sistema Status**
- **Endpoint**: `/api/status`
- **Metriche**: Response time, uptime, errori
- **Health Check**: Database, API, servizi esterni

### **Logging**
- **Backend**: Console + file logging
- **Frontend**: Console + error boundary
- **Production**: Railway logs automatici

### **Performance**
- **Frontend**: Vite build optimization
- **Backend**: Express compression
- **Database**: Query optimization
- **CDN**: Static assets su Railway

## Contribuire

### **Come Contribuire**

1. **Fork** il repository
2. **Clone** il tuo fork
3. **Crea** un branch per la feature
4. **Sviluppa** e testa le modifiche
5. **Commit** con messaggi chiari
6. **Push** e crea una Pull Request

### **Linee Guida**

- **Codice**: Leggibile, commentato, testato
- **UI/UX**: Coerente con il design system
- **API**: RESTful, documentata, versionata
- **Database**: Migrazioni per modifiche schema
- **Security**: Validazione input, sanitizzazione

### **Issue Template**

```markdown
## Bug Report
**Descrizione**: Breve descrizione del bug
**Riproduzione**: Passi per riprodurre
**Comportamento Atteso**: Cosa dovrebbe succedere
**Screenshots**: Se applicabile

## Feature Request
**Descrizione**: Descrizione della feature
**Use Case**: Perché è necessaria
**Mockup**: Se disponibile
```

---

## Supporto

- **Email**: simone.azzinelli@labafirenze.com
- **GitHub Issues**: [Crea una issue](https://github.com/SAzzinelli/laba-gestionale-attrezzature/issues)
- **Documentazione**: [Wiki del progetto](https://github.com/SAzzinelli/laba-gestionale-attrezzature/wiki)

## Licenza

Questo progetto è proprietario di **LABA Firenze**. Tutti i diritti riservati.

---

**Sviluppato per LABA Firenze**

*Versione 2.1 - Build 2.1 - 2026*
