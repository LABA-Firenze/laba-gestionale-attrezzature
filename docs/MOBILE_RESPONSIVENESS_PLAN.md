# Piano Responsività Mobile – LABA Gestionale

## Stato attuale: cosa funziona bene

### Layout generale
- **Sidebar**: Nascosta su mobile (`hidden lg:flex`), sostituita da hamburger menu
- **Mobile menu**: Menu slide-up da basso (MobileMenu.jsx), overlay con blur
- **Top bar mobile**: Logo + notifiche (solo dashboard) + hamburger
- **UserArea**: Header fisso con `pt-16` sul main per evitare overlap
- **Admin**: Header sticky (non fixed) – il contenuto scorre sotto

### Breakpoint usati
- `sm:` 640px – transizione tablet
- `md:` 768px – tablet, 2 colonne grid
- `lg:` 1024px – desktop, sidebar visibile, layout a 2–4 colonne
- `xl:` 1280px – desktop grande

### Componenti già responsive
- **PageHeader**: `flex-col sm:flex-row` – titolo e azioni si impilano su mobile
- **SectionTabs**: `flex-col lg:flex-row`, `flex-wrap` – tab e contenuto destro si adattano
- **Loans**: Vista desktop (`hidden lg:block`) e vista mobile cards (`lg:hidden`)
- **Grid**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` ovunque
- **Footer**: Layout mobile e desktop separati
- **main.css**: Media query per 440px, 480px, 600px, 768px, 834px, 1024px, 1280px

### Tabelle
- **UserManagement, Penalties, SkeletonLoader**: `overflow-x-auto` – scroll orizzontale su mobile

---

## Potenziali problemi

### 1. NotificationsPanel – larghezza fissa
- **File**: `NotificationsPanel.jsx`
- **Problema**: `w-96` (384px) – su iPhone SE (320px) sfora
- **Fix**: `w-full max-w-sm sm:max-w-md` o `min(24rem, 100vw - 2rem)`

### 2. Input e search con larghezza fissa
- **Loans**: `min-w-[200px]` (user filter), `w-64` (search) – su SectionTabs `rightContent`, nascosto su mobile (`hidden lg:flex`)
- **Penalties**: `w-64` su search – visibile su mobile
- **Repairs**: `w-64` search – visibile
- **Fix**: Su mobile `w-full`, su lg `w-64`

### 3. WeekdayDateInput – calendario
- **File**: `WeekdayDateInput.jsx`
- **Problema**: `min-w-[280px]` – ok su 320px con scroll
- **Stato**: Accettabile, potrebbe usare `min(280px, calc(100vw - 2rem))`

### 4. Modali
- **NewRequestModal, AdvancedLoanModal, StepInventoryModal**: `max-w-4xl`, `max-h-[95vh]`, `p-4`
- **main.css**: `.modal-content` già con `max-width` responsive (28rem su 440px, 48rem su 768px)
- **Stato**: Buono, ma va verificato che le modali più grandi (es. StepInventoryModal) non sfondino su 320px

### 5. Penalties / UserManagement – solo tabella
- **Problema**: Su mobile resta solo la tabella con `overflow-x-auto`, nessuna vista a card
- **Impatto**: UX inferiore rispetto a Loans (che ha cards su mobile)
- **Fix**: Opzionale – aggiungere vista cards su mobile come in Loans

### 6. Inventario – dropdown categoria
- **File**: `Inventory.jsx`
- **Problema**: `w-full lg:w-64` – ok
- **Stato**: Nessun problema rilevato

### 7. SectionTabs rightContent su mobile
- **Penalties, Loans, Repairs**: Filtri/search in `rightContent` con `hidden lg:flex` o `hidden lg:block`
- **Problema**: Su mobile i filtri potrebbero mancare o essere in posti diversi
- **Fix**: Verificare che esistano alternative mobile (es. search visibile, filtri in dropdown)

### 8. Pulsanti e touch target
- **main.css**: Su tablet+ `min-height: 48px` per i bottoni
- **Stato**: Buono per touch

---

## Checklist test manuale

### Device target
- [ ] iPhone SE (320×568)
- [ ] iPhone 12/14 (390×844)
- [ ] iPad (768×1024)
- [ ] Desktop (1280×800)

### Flussi da provare
- [ ] **Admin**
  - Login
  - Navigazione (hamburger → sezioni)
  - Dashboard (cards, avvisi)
  - Prestiti (tabs, cards mobile, filtri)
  - Inventario (ricerca, categorie, cards)
  - Riparazioni
  - Penalità (ricerca, tabella)
  - Gestione utenti (tabella)
  - Statistiche (grafici)
  - Nuova richiesta (modal, step, date picker)
  - Nuovo prestito admin (AdvancedLoanModal)
- [ ] **Utente**
  - Login
  - Area utente (sidebar → mobile menu)
  - Dashboard, Miei prestiti, Articoli, Segnala guasto
  - Nuova richiesta
  - Notifiche

### Cose da verificare
- [ ] Nessun overflow orizzontale
- [ ] Testi leggibili (no truncate eccessivo)
- [ ] Pulsanti cliccabili (min 44×44px)
- [ ] Modali scrollabili e chiudibili
- [ ] Date picker usabile
- [ ] NotificationsPanel che non sfora

---

## Priorità interventi (tutti completati)

### Alta
1. ✅ **NotificationsPanel** – `w-96` → `w-full max-w-sm sm:max-w-md`

### Media
2. ✅ **Penalties search** – `w-64` → `w-full min-w-0 sm:w-64` + SectionTabs rightContent wrapper `w-full sm:w-auto`
3. ✅ **Repairs search** – già presente search mobile dedicata (lg:hidden)
4. ✅ **Vista cards mobile Penalties** – aggiunta (UserManagement ce l'aveva già)

### Bassa
5. ✅ **WeekdayDateInput** – `min-w-[280px]` → `w-[min(280px,calc(100vw-2rem))]`
6. ✅ **OperationsDropdown** – aggiunto `max-w-[calc(100vw-2rem)]`

---

## Riepilogo

| Area            | Stato | Note                                      |
|-----------------|-------|-------------------------------------------|
| Layout          | OK    | Sidebar/menu, header, footer              |
| Grid e cards    | OK    | Breakpoint coerenti                       |
| Loans           | OK    | Vista mobile cards                        |
| Tabelle         | OK    | overflow-x-auto                           |
| PageHeader      | OK    | Stack su mobile                           |
| SectionTabs     | OK    | rightContent ora full-width su mobile     |
| Modali          | OK    | Media query in main.css                   |
| NotificationsPanel | OK  | Responsive width                          |
| Search inputs   | OK    | Penalties search responsive               |
| Penalties       | OK    | Vista cards mobile aggiunta               |
| UserManagement  | OK    | Già aveva vista cards mobile              |
