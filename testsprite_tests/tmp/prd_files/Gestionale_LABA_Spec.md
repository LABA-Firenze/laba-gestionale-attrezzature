# Product Specification Document -- Gestionale Attrezzature LABA

## 1. Overview

**Titolo:** Gestionale Attrezzature LABA\
**Scopo:** Realizzare una piattaforma web per la gestione centralizzata
delle attrezzature didattiche LABA (videocamere, cavalletti, luci,
accessori, ecc.).\
**Obiettivo:** Snellire il processo di prenotazione, prestito,
restituzione e monitoraggio dello stato delle attrezzature, garantendo
tracciabilità, sicurezza e controllo per studenti e staff.

------------------------------------------------------------------------

## 2. Utenti principali

-   **Studente**: può visualizzare solo gli oggetti del proprio corso,
    fare richieste di prestito, controllare lo stato delle proprie
    prenotazioni e segnalare guasti o ritardi.\
-   **Admin (staff LABA)**: può creare/modificare/eliminare oggetti
    dall'inventario, approvare o rifiutare richieste, gestire prestiti
    attivi, ricevere segnalazioni, avere accesso completo ai dati.\
-   **Super Admin (hard-coded)**: utente speciale (`admin` / `laba2025`)
    con privilegi totali indipendenti dal DB.

------------------------------------------------------------------------

## 3. Funzionalità principali

### Area Studente

-   Registrazione/Login con credenziali LABA.\
-   Accesso solo agli oggetti assegnati al proprio corso accademico.\
-   Richiesta prestito con date obbligatorie di inizio/fine.\
-   Visualizzazione stato richieste (in attesa, approvata, rifiutata).\
-   Gestione prestiti attivi (visualizzazione, restituzione,
    segnalazioni guasto o ritardo).

### Area Admin

-   Gestione inventario (CRUD attrezzature).\
-   Assegnazione attrezzature a uno o più corsi accademici.\
-   Approva/Rifiuta richieste con motivazione.\
-   Tracciamento prestiti attivi e cronologia.\
-   Ricezione e gestione segnalazioni di guasto o ritardo.

### Sicurezza e Accessi

-   Login via token JWT (Bearer).\
-   Autenticazione differenziata Studente/Admin.\
-   Admin speciale hard-coded (`admin` / `laba2025`) sempre disponibile,
    indipendente dal DB.

------------------------------------------------------------------------

## 4. Requisiti tecnici

-   **Frontend:** React + Vite + Axios con interceptor per token.\
-   **Backend:** Node.js + Express.\
-   **Database:** SQLite/Postgres con tabelle `users`, `inventario`,
    `richieste`, `prestiti`, `segnalazioni`.\
-   **Autenticazione:** JWT con validazione Bearer token.\
-   **Deployment:** Railway o server dedicato.

------------------------------------------------------------------------

## 5. Metriche di successo

-   Riduzione tempi di gestione prestiti del 50%.\
-   Eliminazione errori di sovrapposizione prenotazioni.\
-   Aumento tracciabilità e affidabilità (100% prestiti registrati nel
    sistema).\
-   Maggiore soddisfazione studenti e staff LABA.

------------------------------------------------------------------------

## 6. Futuri sviluppi

-   Notifiche email/Push per scadenze prestiti.\
-   Dashboard di analytics per utilizzo attrezzature.\
-   Integrazione con altri sistemi gestionali LABA.
