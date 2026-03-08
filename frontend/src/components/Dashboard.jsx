import React, { useState, useEffect, useCallback } from 'react';
import { CubeIcon, ClipboardDocumentListIcon, WrenchScrewdriverIcon, ExclamationTriangleIcon, ChevronDownIcon, ArrowTrendingDownIcon, CalendarIcon, XMarkIcon, InformationCircleIcon, UserIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../auth/AuthContext';
import StepInventoryModal from './StepInventoryModal';
import QuickRequestModal from './QuickRequestModal';
import { DashboardSkeleton } from './SkeletonLoader';
import PageHeader from './PageHeader';

const Dashboard = ({ onNavigate }) => {
 const [stats, setStats] = useState({
 inventory: 0,
 requests: 0,
 repairs: 0,
 reports: 0
 });
 const [recentRequests, setRecentRequests] = useState([]);
 const [recentReports, setRecentReports] = useState([]);
 const [alerts, setAlerts] = useState({
 scorte_basse: [],
 prestiti_scaduti: [],
 scadenze_oggi: [],
 scadenze_domani: [],
 totale_avvisi: 0
 });
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [showAddModal, setShowAddModal] = useState(false);
 const [selectedRequest, setSelectedRequest] = useState(null);
 const [selectedAlert, setSelectedAlert] = useState(null);
 const [editingItemFromAlert, setEditingItemFromAlert] = useState(null);
 const [selectedLoan, setSelectedLoan] = useState(null);
 const [avvisiCollapsed, setAvvisiCollapsed] = useState(false);
 const [scadenzeCollapsed, setScadenzeCollapsed] = useState(false);
   const { token, isAdmin, roleLabel } = useAuth();

 
  // Helper function to calculate time ago
  const getTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Ora";
    if (diffInMinutes < 60) return `${diffInMinutes} minuti fa`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ore fa`;
    return `${Math.floor(diffInMinutes / 1440)} giorni fa`;
  };

  // Helper function to safely format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'Data non specificata';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Data non valida';
      return date.toLocaleDateString('it-IT');
    } catch (error) {
      return 'Data non valida';
    }
  };

  // Helper function to get status badge
  const getStatusBadge = (stato) => {
    const statusLower = (stato || '').toString().toLowerCase().trim();
    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-800';
    let label = stato || 'Sconosciuto';

    if (statusLower === 'attivo' || statusLower === 'approvata') {
      bgColor = 'bg-green-100';
      textColor = 'text-green-800';
      label = statusLower === 'attivo' ? 'Attivo' : 'Approvata';
    } else if (statusLower === 'in_attesa' || statusLower === 'pending') {
      bgColor = 'bg-yellow-100';
      textColor = 'text-yellow-800';
      label = 'In Attesa';
    } else if (statusLower === 'rifiutata' || statusLower === 'rejected') {
      bgColor = 'bg-red-100';
      textColor = 'text-red-800';
      label = 'Rifiutata';
    } else if (statusLower === 'completata' || statusLower === 'completato') {
      bgColor = 'bg-blue-100';
      textColor = 'text-blue-800';
      label = 'Completata';
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
        {label}
      </span>
    );
  };

 // Fetch dashboard data
 const fetchDashboardData = useCallback(async () => {
 try {
 setLoading(true);
    const requests = [
      fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventario`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${import.meta.env.VITE_API_BASE_URL}/api/richieste?all=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${import.meta.env.VITE_API_BASE_URL}/api/riparazioni`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${import.meta.env.VITE_API_BASE_URL}/api/segnalazioni`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${import.meta.env.VITE_API_BASE_URL}/api/prestiti?all=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ];

    // Add alerts endpoint for admin or user-specific alerts
    if (isAdmin) {
      requests.push(fetch(`${import.meta.env.VITE_API_BASE_URL}/api/avvisi`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }));
    } else {
      requests.push(fetch(`${import.meta.env.VITE_API_BASE_URL}/api/avvisi/utente`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }));
    }

 const responses = await Promise.all(requests);
 const [inventoryRes, requestsRes, repairsRes, reportsRes, prestitiRes, alertsRes] = responses;

 if (!inventoryRes.ok) throw new Error('Errore nel caricamento inventario');
 if (!requestsRes.ok) throw new Error('Errore nel caricamento richieste');
 if (!repairsRes.ok) throw new Error('Errore nel caricamento riparazioni');
 if (!reportsRes.ok) throw new Error('Errore nel caricamento segnalazioni');
 if (!prestitiRes.ok) throw new Error('Errore nel caricamento prestiti');
 if (!alertsRes.ok) throw new Error('Errore nel caricamento avvisi');

 const [inventoryData, requestsData, repairsData, reportsData, prestitiData, alertsData] = await Promise.all([
 inventoryRes.json(),
 requestsRes.json(),
 repairsRes.json(),
 reportsRes.json(),
 prestitiRes.json(),
 alertsRes.json()
 ]);

// Calcola statistiche corrette
const activeLoans = prestitiData.filter(p => p.stato === 'attivo').length;
// Conta le UNITÀ disponibili totali, non gli articoli
// Assicuriamoci che unita_disponibili sia un numero
const availableItems = inventoryData.reduce((total, item) => {
  const unita = Number(item.unita_disponibili) || 0;
  return total + unita;
}, 0);
const activeRepairs = repairsData.filter(repair => {
  const status = (repair.stato || '').toString().toLowerCase().replace(/\s+/g, '_');
  return status === 'in_corso';
});

const activeRepairCount = activeRepairs.length;

const inRepairItems = activeRepairs.reduce((total, repair) => {
  const raw = repair.unit_ids_json;
  if (Array.isArray(raw)) {
    return total + raw.length;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return total + parsed.length;
      }
      if (parsed && typeof parsed === 'object') {
        return total + Object.keys(parsed).length;
      }
    } catch (err) {
      console.warn('Impossibile analizzare unit_ids_json', err);
    }
  }
  if (raw && typeof raw === 'object') {
    return total + Object.keys(raw).length;
  }
  if (Number.isFinite(repair.quantita)) {
    return total + Number(repair.quantita);
  }
  return total;
}, 0);

// Conta solo le richieste veramente attive:
// - in_attesa: sempre attive
// - approvata: solo se non ha prestito o se il prestito è ancora 'attivo'
// Escludi quelle rifiutate, completate o con prestito già restituito/completato
const activeRequests = requestsData.filter(request => {
  const stato = (request.stato || '').toString().toLowerCase().trim();
  const prestitoStato = (request.prestito_stato || '').toString().toLowerCase().trim();
  
  // Richieste in attesa sono sempre attive
  if (stato === 'in_attesa') {
    return true;
  }
  
  // Richieste approvate sono attive solo se:
  // - Non hanno un prestito associato (non ancora convertite in prestito), OPPURE
  // - Hanno un prestito associato ma è ancora 'attivo'
  if (stato === 'approvata') {
    // Se non c'è prestito associato, la richiesta è ancora attiva
    if (!request.prestito_id) {
      return true;
    }
    // Se c'è un prestito, è attiva solo se il prestito è ancora 'attivo'
    return prestitoStato === 'attivo';
  }
  
  // Tutte le altre (rifiutata, completata, etc.) non sono attive
  return false;
});

// Debug: log per verificare il conteggio
console.log('[Dashboard] Total requests:', requestsData.length);
console.log('[Dashboard] Active requests (in_attesa/approvata):', activeRequests.length);
console.log('[Dashboard] Request states:', requestsData.map(r => ({ id: r.id, stato: r.stato })));
 
 // Calcola scorte basse basate sui PRESTITI ATTIVI e sulla SCARSITÀ
 const calculateLowStockItems = () => {
 const lowStockItems = [];
 
 inventoryData.forEach(item => {
 const totalQuantity = item.quantita_totale || 0;
 const availableQuantity = item.unita_disponibili || 0;
 const loanedQuantity = totalQuantity - availableQuantity;
 
 // Verifica se l'oggetto ha riparazioni attive
 const itemRepairs = activeRepairs.filter(repair => repair.inventario_id === item.id);
 const hasActiveRepairs = itemRepairs.length > 0;
 
 // Se l'oggetto è in riparazione, NON considerarlo come scorta bassa
 if (hasActiveRepairs) {
 return; // Salta questo oggetto - è in riparazione, non è una scorta bassa
 }
 
 // REGOLA SPECIALE: Se c'è solo 1 oggetto e è disponibile, NON è scarsità
 if (totalQuantity === 1 && availableQuantity === 1) {
 return; // Salta questo oggetto - oggetti singoli disponibili NON sono scarsità
 }
 
 // Solo se c'è almeno 1 oggetto in inventario e non è il caso speciale 1/1
 if (totalQuantity > 0) {
 // Calcola la percentuale di oggetti in prestito
 const loanedPercentage = (loanedQuantity / totalQuantity) * 100;
 
 // Trova la prima data di ritorno per questo oggetto
 const itemLoans = prestitiData.filter(p => 
 p.inventario_id === item.id && 
 p.stato === 'attivo' && 
 p.data_fine
 );
 
 let firstReturnDate = null;
 if (itemLoans.length > 0) {
 const returnDates = itemLoans
 .map(p => new Date(p.data_fine))
 .filter(date => !isNaN(date.getTime()))
 .sort((a, b) => a - b);
 
 firstReturnDate = returnDates.length > 0 ? returnDates[0] : null;
 }
 
 // Se disponibili = 0, significa che TUTTI sono in prestito (ESAURITO)
 // Ma solo se NON è in riparazione (già controllato sopra)
 if (availableQuantity === 0) {
 lowStockItems.push({
 ...item,
 firstReturnDate: firstReturnDate,
 reason: 'ESAURITO - Tutti gli oggetti sono in prestito',
 status: 'esaurito',
 loanedPercentage: 100
 });
 }
 // Se disponibili = 1 e totali > 1, significa che solo 1 rimane (ATTENZIONE)
 else if (availableQuantity === 1 && totalQuantity > 1) {
 lowStockItems.push({
 ...item,
 firstReturnDate: firstReturnDate,
 reason: 'ATTENZIONE - Solo 1 oggetto disponibile',
 status: 'attenzione',
 loanedPercentage: loanedPercentage
 });
 }
 // Se la percentuale di prestiti è >= 80%, significa che scarseggia
 else if (loanedPercentage >= 80 && totalQuantity > 1) {
 lowStockItems.push({
 ...item,
 firstReturnDate: firstReturnDate,
 reason: `SCARSEGGIA - ${Math.round(loanedPercentage)}% in prestito`,
 status: 'scarseggia',
 loanedPercentage: loanedPercentage
 });
 }
 // Se la percentuale di prestiti è >= 60%, significa che si sta esaurendo
 else if (loanedPercentage >= 60 && totalQuantity > 1) {
 lowStockItems.push({
 ...item,
 firstReturnDate: firstReturnDate,
 reason: `SI STA ESAURENDO - ${Math.round(loanedPercentage)}% in prestito`,
 status: 'si_sta_esaurendo',
 loanedPercentage: loanedPercentage
 });
 }
 }
 });
 
 return lowStockItems;
 };

 const lowStockWithDates = calculateLowStockItems();

 // Calcola le richieste in attesa
 const pendingRequests = requestsData.filter(req => req.stato === 'in_attesa');

 setStats({
 inventory: inventoryData.length,
 requests: activeRequests.length,
  repairs: activeRepairCount,
 reports: reportsData.length,
 activeLoans: activeLoans,
 availableItems: availableItems,
 inRepairItems: inRepairItems,
 lowStockItems: lowStockWithDates.length,
 lowStockWithDates: lowStockWithDates,
 pendingRequests: pendingRequests.length,
 pendingRequestsData: pendingRequests
 });

 setAlerts(alertsData);

console.log('Dashboard - requestsData:', requestsData);
setRecentRequests((requestsData || []).slice(0, 5));
setRecentReports(reportsData.slice(0, 5));
 } catch (err) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 }, [token, isAdmin]);

 useEffect(() => {
 // Aspetta che token sia disponibile prima di caricare i dati
 if (token) {
   fetchDashboardData();
 }
 }, [token, isAdmin, fetchDashboardData]);

 if (loading) {
 return <DashboardSkeleton />;
 }

// Calcola valori per sezioni Avvisi e Scadenze prima del return
const hasPendingRequests = stats.pendingRequests > 0;
const hasScorteBasse = alerts.scorte_basse && alerts.scorte_basse.length > 0;
const totaleAvvisi = (hasPendingRequests ? stats.pendingRequests : 0) + (hasScorteBasse ? alerts.scorte_basse.length : 0);
const hasScadenzeOggi = alerts.scadenze_oggi && alerts.scadenze_oggi.length > 0;
const hasScadenzeDomani = alerts.scadenze_domani && alerts.scadenze_domani.length > 0;
const hasAvvisi = hasPendingRequests || hasScorteBasse;
const hasScadenze = hasScadenzeOggi || hasScadenzeDomani || true;

return (
<div className="min-h-screen bg-gray-50 space-y-6">
  <PageHeader
    title={`Dashboard ${roleLabel}`}
    subtitle="Panoramica del sistema di gestione attrezzature"
    showNotificationBell
  />

  {/* Statistics Cards */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">Inventario</p>
          <p className="text-3xl font-bold text-gray-900">{stats.inventory}</p>
          <p className="text-sm text-gray-500">Elementi totali</p>
        </div>
        <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center p-2.5">
          <CubeIcon className="w-6 h-6 text-blue-600" />
        </div>
      </div>
    </div>
    
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">Richieste</p>
          <p className="text-3xl font-bold text-gray-900">{stats.requests}</p>
          <p className="text-sm text-gray-500">Richieste di prestito</p>
        </div>
        <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center p-2.5">
          <ClipboardDocumentListIcon className="w-6 h-6 text-purple-600" />
        </div>
      </div>
    </div>
    
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">Riparazioni</p>
          <p className="text-3xl font-bold text-gray-900">{stats.repairs}</p>
          <p className="text-sm text-gray-500">In riparazione</p>
        </div>
        <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center p-2.5">
          <WrenchScrewdriverIcon className="w-6 h-6 text-orange-600" />
        </div>
      </div>
    </div>
    
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">Segnalazioni</p>
          <p className="text-3xl font-bold text-gray-900">{stats.reports}</p>
          <p className="text-sm text-gray-500">Segnalazioni attive</p>
        </div>
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center p-2.5">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
        </div>
      </div>
    </div>
  </div>

  {/* Avvisi Section - Richieste da Approvare e Scorte Basse */}
 {hasAvvisi && (
 <div className="bg-white rounded-xl shadow-lg border border-red-200 overflow-hidden mb-8">
 <div 
 className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 cursor-pointer hover:from-red-600 hover:to-red-700 transition-colors"
 onClick={() => setAvvisiCollapsed(!avvisiCollapsed)}
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center">
 <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
 <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
 </svg>
 </div>
 <div>
 <h2 className="text-2xl font-bold text-white">Avvisi</h2>
 <p className="text-red-100 text-sm">Attenzione richiesta per questi elementi</p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
 <span className="text-white font-bold text-lg">{totaleAvvisi}</span>
 <span className="text-red-100 ml-1">avvisi</span>
 </div>
 <svg 
 className={`w-6 h-6 text-white transition-transform duration-300 ${avvisiCollapsed ? 'rotate-180' : ''}`}
 fill="none" 
 stroke="currentColor" 
 viewBox="0 0 24 24"
 >
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
 </svg>
 </div>
 </div>
 </div>
 
 <div className={`overflow-hidden transition-all duration-300 ease-in-out ${avvisiCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'}`}>
 <div className="p-6">
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Richieste da Approvare */}
 {hasPendingRequests && (
 <div 
 className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 cursor-pointer hover:bg-yellow-100 transition-colors"
 onClick={() => {
   if (onNavigate) {
     onNavigate('prestiti', { initialTab: 'pending' });
   }
 }}
 >
 <div className="flex items-center mb-3">
 <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mr-3">
 <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
 </svg>
 </div>
 <h3 className="text-lg font-bold text-yellow-800">
 Richieste da Approvare ({stats.pendingRequests})
 </h3>
 </div>
 <div className="space-y-2">
 {stats.pendingRequestsData && stats.pendingRequestsData.slice(0, 3).map(request => (
 <div 
 key={request.id} 
 className="bg-white rounded-full px-5 py-3 border border-yellow-200 hover:bg-yellow-50 cursor-pointer transition-colors"
 onClick={(e) => {
   e.stopPropagation();
   setSelectedLoan(request);
 }}
 >
 <div className="font-semibold text-gray-900 text-sm">
 {request.articolo_nome || request.oggetto_nome || 'Oggetto sconosciuto'}
 </div>
 <div className="text-yellow-600 font-medium text-xs mt-1">
 {request.name || request.utente_nome || ''} {request.surname || request.utente_cognome || ''}
 </div>
 <div className="text-gray-500 text-xs mt-1">
 Dal {new Date(request.dal).toLocaleDateString('it-IT')} al {new Date(request.al).toLocaleDateString('it-IT')}
 </div>
 </div>
 ))}
 {stats.pendingRequests > 3 && (
 <div className="text-center text-yellow-600 text-sm font-medium">
 +{stats.pendingRequests - 3} altre richieste...
 </div>
 )}
 </div>
 </div>
 )}

 {/* Scorte Basse */}
 {hasScorteBasse && (
 <div 
 className="bg-red-50 border border-red-200 rounded-xl p-4 cursor-pointer hover:bg-red-100 transition-colors"
 onClick={() => setSelectedAlert({ type: 'scorte', data: alerts.scorte_basse })}
 >
 <div className="flex items-center mb-3">
 <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3">
 <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
 </svg>
 </div>
 <h3 className="text-lg font-bold text-red-800">
 Scorte Basse ({alerts.scorte_basse.length})
 </h3>
 </div>
 <div className="space-y-2">
 {alerts.scorte_basse.slice(0, 3).map(item => (
 <div key={item.id} className={`bg-white rounded-full px-5 py-3 border ${
 item.stato_scorte === 'esaurito' ? 'border-red-500' :
 item.stato_scorte === 'attenzione' ? 'border-orange-500' :
 item.stato_scorte === 'scarseggia' ? 'border-yellow-500' :
 'border-blue-500'
 }`}>
 <div className="font-semibold text-gray-900 text-sm">{item.nome}</div>
 <div className={`font-medium text-xs mt-1 ${
 item.stato_scorte === 'esaurito' ? 'text-red-600' :
 item.stato_scorte === 'attenzione' ? 'text-orange-600' :
 item.stato_scorte === 'scarseggia' ? 'text-yellow-600' :
 'text-blue-600'
 }`}>
 {item.motivo}
 </div>
 </div>
 ))}
 {alerts.scorte_basse.length > 3 && (
 <div className="text-center text-red-600 text-sm font-medium">
 +{alerts.scorte_basse.length - 3} altri elementi...
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 )}

  {/* In Scadenza Section - Oggi e Domani */}
 {hasScadenze && (
 <div className="bg-white rounded-xl shadow-lg border border-purple-200 overflow-hidden mb-8">
 <div 
 className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4 cursor-pointer hover:from-purple-600 hover:to-purple-700 transition-colors"
 onClick={() => setScadenzeCollapsed(!scadenzeCollapsed)}
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center">
 <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
 <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
 </svg>
 </div>
 <div>
 <h2 className="text-2xl font-bold text-white">In Scadenza</h2>
 <p className="text-purple-100 text-sm">Prestiti in scadenza oggi e domani</p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
 <span className="text-white font-bold text-lg">{(alerts.scadenze_oggi?.length || 0) + (alerts.scadenze_domani?.length || 0)}</span>
 <span className="text-purple-100 ml-1">prestiti</span>
 </div>
 <svg 
 className={`w-6 h-6 text-white transition-transform duration-300 ${scadenzeCollapsed ? 'rotate-180' : ''}`}
 fill="none" 
 stroke="currentColor" 
 viewBox="0 0 24 24"
 >
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
 </svg>
 </div>
 </div>
 </div>
 
 <div className={`overflow-hidden transition-all duration-300 ease-in-out ${scadenzeCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'}`}>
 <div className="p-6">
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Oggi - Viola */}
 <div 
 className={`bg-purple-50 border border-purple-200 rounded-xl p-4 transition-colors ${hasScadenzeOggi ? 'cursor-pointer hover:bg-purple-100' : 'opacity-60 cursor-not-allowed'}`}
 onClick={hasScadenzeOggi ? () => setSelectedAlert({ type: 'oggi', data: alerts.scadenze_oggi || [] }) : undefined}
 >
 <div className="flex items-center mb-3">
 <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
 <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
 </svg>
 </div>
 <h3 className="text-lg font-bold text-purple-800">
 Oggi ({(alerts.scadenze_oggi?.length || 0)})
 </h3>
 </div>
 <div className="space-y-2">
 {hasScadenzeOggi && alerts.scadenze_oggi.length > 0 ? alerts.scadenze_oggi.slice(0, 3).map(prestito => (
 <div 
 key={prestito.id} 
 className="bg-white rounded-full px-5 py-3 border border-purple-200 hover:bg-purple-50 cursor-pointer transition-colors"
 onClick={(e) => {
   e.stopPropagation();
   setSelectedLoan(prestito);
   setSelectedAlert(null);
 }}
 >
 <div className="font-semibold text-gray-900 text-sm">
 {prestito.utente_nome_reale && prestito.utente_cognome ? 
                 `${prestito.utente_nome_reale} ${prestito.utente_cognome}` : 
                 prestito.utente_nome}
 </div>
 <div className="text-purple-600 font-medium text-xs mt-1">
 {prestito.oggetto_nome}
 </div>
 </div>
 )) : (
   <div className="text-center text-gray-500 text-sm py-4">
     Nessun prestito in scadenza oggi
   </div>
 )}
 {hasScadenzeOggi && alerts.scadenze_oggi.length > 3 && (
 <div className="text-center text-purple-600 text-sm font-medium">
 +{alerts.scadenze_oggi.length - 3} altri prestiti...
 </div>
 )}
 </div>
 </div>

 {/* Domani - Viola */}
 <div 
 className={`bg-purple-50 border border-purple-200 rounded-xl p-4 transition-colors ${hasScadenzeDomani ? 'cursor-pointer hover:bg-purple-100' : 'opacity-60 cursor-not-allowed'}`}
 onClick={hasScadenzeDomani ? () => setSelectedAlert({ type: 'domani', data: alerts.scadenze_domani || [] }) : undefined}
 >
 <div className="flex items-center mb-3">
 <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
 <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
 </svg>
 </div>
 <h3 className="text-lg font-bold text-purple-800">
 Domani ({(alerts.scadenze_domani?.length || 0)})
 </h3>
 </div>
 <div className="space-y-2">
 {hasScadenzeDomani && alerts.scadenze_domani.length > 0 ? alerts.scadenze_domani.slice(0, 3).map(prestito => (
 <div 
 key={prestito.id} 
 className="bg-white rounded-full px-5 py-3 border border-purple-200 hover:bg-purple-50 cursor-pointer transition-colors"
 onClick={(e) => {
   e.stopPropagation();
   setSelectedLoan(prestito);
   setSelectedAlert(null);
 }}
 >
 <div className="font-semibold text-gray-900 text-sm">
 {prestito.utente_nome_reale && prestito.utente_cognome ? 
                 `${prestito.utente_nome_reale} ${prestito.utente_cognome}` : 
                 prestito.utente_nome}
 </div>
 <div className="text-purple-600 font-medium text-xs mt-1">
 {prestito.oggetto_nome}
 </div>
 </div>
 )) : (
   <div className="text-center text-gray-500 text-sm py-4">
     Nessun prestito in scadenza domani
   </div>
 )}
 {hasScadenzeDomani && alerts.scadenze_domani.length > 3 && (
 <div className="text-center text-purple-600 text-sm font-medium">
 +{alerts.scadenze_domani.length - 3} altri prestiti...
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

    {/* Recent Activity */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
    {/* Recent Requests */}
    <div className="bg-white rounded-xl shadow-lg p-6">
    <div className="flex items-center justify-between mb-6">
    <h2 className="text-xl font-bold text-gray-900">Richieste Recenti</h2>
    <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">{recentRequests.length} richieste</span>
    </div>
 <div className="space-y-3">
 {recentRequests.length === 0 ? (
 <div className="text-center py-12">
 <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
 <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
 </svg>
 </div>
 <p className="text-gray-500 font-medium">Nessuna richiesta recente</p>
 </div>
 ) : (
 recentRequests.map((request, index) => (
 <div 
 key={index} 
 className={`flex items-center py-4 px-4 rounded-full transition-all duration-200 ${
 request.stato === 'in_attesa' 
 ? 'bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:shadow-md cursor-pointer' 
 : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
 }`}
 onClick={() => request.stato === 'in_attesa' && setSelectedRequest(request)}
 >
 <div className={`w-3 h-3 rounded-full mr-4 ${
 request.stato === 'in_attesa' ? 'bg-blue-500' : 
 request.stato === 'approvata' ? 'bg-green-500' : 'bg-red-500'
 }`}></div>
 <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {request.articolo_nome || request.oggetto_nome || 'Oggetto sconosciuto'}
                </p>
                <p className="text-sm text-gray-600">
                  {request.name || request.utente_nome || ''} {request.surname || request.utente_cognome || ''}
                </p>
 </div>
 <div className="flex-shrink-0">
 <span className={`px-3 py-1 rounded-full text-xs font-medium ${
 request.stato === 'in_attesa' ? 'bg-yellow-100 text-yellow-800' :
 request.stato === 'approvata' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
 }`}>
 {request.stato === 'in_attesa' ? 'In Attesa' : 
 request.stato === 'approvata' ? 'Approvata' : 'Rifiutata'}
 </span>
 </div>
 </div>
 ))
 )}
 </div>
 </div>

 {/* Recent Reports */}
 <div className="bg-white rounded-xl shadow-lg p-6">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-xl font-bold text-gray-900">Segnalazioni Recenti</h2>
 <span className="bg-red-100 text-red-800 text-sm font-medium px-3 py-1 rounded-full">{recentReports.length} segnalazioni</span>
 </div>
 <div className="space-y-3">
 {recentReports.length === 0 ? (
 <div className="text-center py-12">
 <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
 <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
 </svg>
 </div>
 <p className="text-gray-500 font-medium">Nessuna segnalazione recente</p>
 </div>
 ) : (
 recentReports.map((report, index) => (
 <div key={index} className="flex items-center py-4 px-4 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 hover:shadow-md cursor-pointer transition-all duration-200">
 <div className="w-3 h-3 bg-red-500 rounded-full mr-4"></div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-semibold text-gray-900 truncate">
 {report.tipo}: {report.messaggio}
 </p>
                <p className="text-sm text-gray-600">
                  {formatDate(report.created_at)}
                </p>
 </div>
 <div className="flex-shrink-0">
 <span className={`px-3 py-1 rounded-full text-xs font-medium ${
 report.stato === 'aperta' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
 }`}>
 {report.stato === 'aperta' ? 'Aperta' : 'Chiusa'}
 </span>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 </div>

 {/* Error Message */}
 {error && (
 <div className="alert-card alert-danger">
 <div className="flex items-center">
 <svg className="icon text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 <p className="text-red-800 ">{error}</p>
 </div>
 </div>
 )}

 {/* Alert Details Modal */}
 {selectedAlert && (
 <div className="modal-overlay" onClick={() => setSelectedAlert(null)}>
 <div className="modal-content max-w-[95vw] lg:max-w-7xl xl:max-w-[90vw] mx-4 lg:mx-8" onClick={(e) => e.stopPropagation()}>
 <div className="modal-header">
    <h2 className={`text-xl font-bold ${
      selectedAlert.type === 'oggi' ? 'text-purple-600' :
      selectedAlert.type === 'domani' ? 'text-purple-600' :
      'text-primary'
    }`}>
    {selectedAlert.type === 'scorte' ? 'Scorte Basse' :
    selectedAlert.type === 'ritardi' ? 'Prestiti in Ritardo' :
    selectedAlert.type === 'oggi' ? 'Scadenze Oggi' :
    'Scadenze Domani'}
    </h2>
 <button
 onClick={() => setSelectedAlert(null)}
 className="text-muted hover:text-primary"
 >
 <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>
 
 <div className="modal-body">
 <div className={`grid ${
   selectedAlert.type === 'scorte' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3' : 
   (selectedAlert.type === 'oggi' || selectedAlert.type === 'domani') ? 'grid-cols-1 md:grid-cols-2' : 
   'grid-cols-1'
 } gap-4 lg:gap-6`}>
 {selectedAlert.data.map((item, index) => (
 <div 
 key={index} 
  className={`card ${
   selectedAlert.type === 'oggi' ? 'border-purple-200 hover:bg-purple-50 cursor-pointer transition-colors' :
   selectedAlert.type === 'domani' ? 'border-purple-200 hover:bg-purple-50 cursor-pointer transition-colors' :
   ''
 }`}
 onClick={(selectedAlert.type === 'oggi' || selectedAlert.type === 'domani') ? () => {
   setSelectedLoan(item);
   setSelectedAlert(null);
 } : undefined}
 >
 <div className="flex flex-wrap items-start justify-between gap-3">
 <div className="min-w-0 flex-1">
  <h3 className={`font-medium break-words ${
   selectedAlert.type === 'oggi' ? 'text-purple-800' :
   selectedAlert.type === 'domani' ? 'text-purple-800' :
   'text-primary'
 }`}>
 {selectedAlert.type === 'scorte' ? item.nome : 
 item.utente_nome_reale && item.utente_cognome ? 
                   `${item.utente_nome_reale} ${item.utente_cognome}` : 
                   item.utente_nome}
 </h3>
 <p className={`text-sm break-words ${
   selectedAlert.type === 'oggi' ? 'text-purple-700' :
   selectedAlert.type === 'domani' ? 'text-purple-700' :
   'text-secondary'
 }`}>
 {selectedAlert.type === 'scorte' 
 ? `${item.reason || 'Scorta bassa'} - Disponibili: ${item.unita_disponibili || 0}/${item.quantita_totale || 0}${item.loanedPercentage ? ` (${Math.round(item.loanedPercentage)}% in prestito)` : ''}`
 : selectedAlert.type === 'ritardi'
 ? `${item.oggetto_nome || 'Oggetto'} - ${Math.floor(item.giorni_ritardo || 0)} giorni di ritardo`
 : item.oggetto_nome || 'Oggetto'
 }
 </p>
 {selectedAlert.type === 'scorte' && item.firstReturnDate && (
 <p className="text-xs text-muted mt-1">
 Primo ritorno: {item.firstReturnDate.toLocaleDateString('it-IT')}
 </p>
 )}
 {(selectedAlert.type === 'oggi' || selectedAlert.type === 'domani') && (
 <p className={`text-xs mt-1 ${selectedAlert.type === 'oggi' ? 'text-purple-600' : 'text-purple-600'}`}>
 Scade: {item.data_rientro || item.al ? formatDate(item.data_rientro || item.al) : 'Data non specificata'}
 </p>
 )}
 {selectedAlert.type === 'oggi' && item.dal && (
 <p className="text-xs text-gray-500 mt-1">
 Dal: {formatDate(item.dal)}
 </p>
 )}
 {selectedAlert.type === 'domani' && item.dal && (
 <p className="text-xs text-gray-500 mt-1">
 Dal: {formatDate(item.dal)}
 </p>
 )}
 </div>
 {selectedAlert.type === 'scorte' && (
 <button
 onClick={(e) => {
   e.stopPropagation();
   setEditingItemFromAlert(item);
   setSelectedAlert(null);
 }}
 className="btn-danger btn-small flex-shrink-0"
 >
 Gestisci
 </button>
 )}
 {selectedAlert.type === 'ritardi' && (
 <button
 onClick={(e) => {
   e.stopPropagation();
   setSelectedAlert(null);
   onNavigate && onNavigate('prestiti');
 }}
 className="btn-danger btn-small flex-shrink-0"
 >
 Gestisci Ritardo
 </button>
 )}
 {(selectedAlert.type === 'oggi' || selectedAlert.type === 'domani') && (
 <button
 onClick={(e) => {
   e.stopPropagation();
   setSelectedLoan(item);
   setSelectedAlert(null);
 }}
 className={`btn-small flex-shrink-0 ${selectedAlert.type === 'oggi' ? 'bg-purple-500 hover:bg-purple-600 text-white' : 'bg-purple-500 hover:bg-purple-600 text-white'}`}
 >
 Visualizza
 </button>
 )}
 </div>
 </div>
 ))}
 </div>
 </div>
 
 <div className="modal-footer">
 <button
 onClick={() => setSelectedAlert(null)}
 className="btn-secondary"
 >
 Chiudi
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Loan/Request Details Modal */}
 {selectedLoan && (
 <div className="modal-overlay" onClick={() => setSelectedLoan(null)}>
 <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '48rem', width: '95vw' }}>
 <div className="modal-header">
 <h2 className="text-xl font-bold text-primary">
   Dettagli {selectedLoan.articolo_nome || selectedLoan.oggetto_nome || 'Prestito'}
   {selectedLoan.unita && selectedLoan.unita.length > 0 && (
     <span>
       {' - '}
       {Array.isArray(selectedLoan.unita) ? selectedLoan.unita.join(', ') : String(selectedLoan.unita)}
     </span>
   )}
 </h2>
 <button
 onClick={() => setSelectedLoan(null)}
 className="text-muted hover:text-primary"
 >
 <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>
 <div className="modal-body">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="form-label">Oggetto</label>
 <div className="flex items-center gap-2">
   <p className="text-primary font-medium">{selectedLoan.articolo_nome || selectedLoan.oggetto_nome || 'N/A'}</p>
   {selectedLoan.oggetto_id && (
     <span className="text-xs text-tertiary bg-gray-100 px-2 py-1 rounded-full">
       ID: {selectedLoan.oggetto_id}
     </span>
   )}
   {selectedLoan.inventario_id && (
     <span className="text-xs text-tertiary bg-gray-100 px-2 py-1 rounded-full">
       ID: {selectedLoan.inventario_id}
     </span>
   )}
 </div>
 </div>
 <div>
 <label className="form-label">Stato</label>
 {getStatusBadge(selectedLoan.stato)}
 </div>
 <div>
 <label className="form-label">Richiedente</label>
 <div className="flex items-center gap-2">
   <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
     <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
     </svg>
   </div>
   <div>
     <p className="text-primary font-medium">
       {selectedLoan.name || selectedLoan.utente_nome_reale || selectedLoan.utente_nome || ''} {selectedLoan.surname || selectedLoan.utente_cognome || ''}
     </p>
   </div>
 </div>
 </div>
 {(selectedLoan.utente_email || selectedLoan.email) && (
 <div>
 <label className="form-label">Email</label>
 <p className="text-secondary">{selectedLoan.utente_email || selectedLoan.email}</p>
 </div>
 )}
 <div>
   <label className="form-label">Dal</label>
   <p className="text-primary">{formatDate(selectedLoan.dal || selectedLoan.data_uscita)}</p>
 </div>
 <div>
   <label className="form-label">Al</label>
   <p className="text-primary">{formatDate(selectedLoan.al || selectedLoan.data_rientro)}</p>
 </div>
 {selectedLoan.data_rientro && (
   <div className="md:col-span-2">
     <label className="form-label">Data Restituzione</label>
     <p className="text-primary">{formatDate(selectedLoan.data_rientro)}</p>
   </div>
 )}
 {selectedLoan.note && (
 <div className="md:col-span-2">
   <label className="form-label">Note</label>
   <p className="text-secondary">{selectedLoan.note}</p>
 </div>
 )}
 {selectedLoan.motivo_rifiuto && (
 <div className="md:col-span-2">
   <label className="form-label">Motivo Rifiuto</label>
   <p className="text-red-600">{selectedLoan.motivo_rifiuto}</p>
 </div>
 )}
 </div>
 </div>
 <div className="modal-footer">
 <button
 onClick={() => {
   setSelectedLoan(null);
   if (onNavigate) {
     onNavigate('prestiti');
   }
 }}
 className="btn-primary"
 >
 Vai a Prestiti
 </button>
 <button
 onClick={() => setSelectedLoan(null)}
 className="btn-secondary"
 >
 Chiudi
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Add Inventory Modal */}
 <StepInventoryModal
 isOpen={showAddModal || !!editingItemFromAlert}
 onClose={() => {
   setShowAddModal(false);
   setEditingItemFromAlert(null);
 }}
 onSuccess={() => {
 fetchDashboardData();
 setShowAddModal(false);
   setEditingItemFromAlert(null);
 }}
 editingItem={editingItemFromAlert ? {
   ...editingItemFromAlert,
   // Assicurati che tutti i campi necessari siano presenti
   nome: editingItemFromAlert.nome || '',
   quantita_totale: editingItemFromAlert.quantita_totale || 1,
   posizione: editingItemFromAlert.posizione || editingItemFromAlert.scaffale || '',
   categoria_id: editingItemFromAlert.categoria_id || '',
   note: editingItemFromAlert.note || '',
   immagine_url: editingItemFromAlert.immagine_url || '',
   tipo_prestito: editingItemFromAlert.tipo_prestito || 'solo_esterno',
   corsi_assegnati: editingItemFromAlert.corsi_assegnati || []
 } : null}
 />

 {/* Quick Request Modal */}
 <QuickRequestModal
 isOpen={!!selectedRequest}
 onClose={() => setSelectedRequest(null)}
 request={selectedRequest}
 onSuccess={() => {
 fetchDashboardData();
 setSelectedRequest(null);
 }}
 />


  </div>
);
};

// Stat Card Component
function StatCard({ title, value, description }) {
 const iconMap = {
 'Inventario': (
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
 </svg>
 ),
 'Richieste': (
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
 </svg>
 ),
 'Riparazioni': (
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
 </svg>
 ),
 'Segnalazioni': (
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
 </svg>
 )
 };

 const colorMap = {
 'Inventario': 'bg-gradient-to-br from-blue-100 to-blue-200 ',
 'Richieste': 'bg-gradient-to-br from-purple-100 to-purple-200 ', 
 'Riparazioni': 'bg-gradient-to-br from-orange-100 to-orange-200 ',
 'Segnalazioni': 'bg-gradient-to-br from-red-100 to-red-200 '
 };

 return (
 <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:scale-105 transition-transform p-6">
 <div className="flex items-center">
 <div className={`w-12 h-12 ${colorMap[title]} rounded-full flex items-center justify-center ${
 title === 'Inventario' ? 'text-blue-600' :
 title === 'Richieste' ? 'text-purple-600' :
 title === 'Riparazioni' ? 'text-orange-600' :
 'text-red-600'
 } shadow-lg`}>
 {iconMap[title]}
 </div>
 <div className="ml-4">
 <p className="text-sm font-medium text-gray-700">{title}</p>
 <p className="text-2xl font-bold text-gray-900">{value}</p>
 </div>
 </div>
 <p className="text-xs text-gray-500 mt-2">{description}</p>
 </div>
 );
}


// Quick Action Button Component 
function QuickActionButton({ title, description, icon, onClick, color = 'blue' }) {
 const colorClasses = {
 blue: 'bg-gradient-to-br from-blue-500 to-blue-600',
 green: 'bg-gradient-to-br from-green-500 to-green-600', 
 orange: 'bg-gradient-to-br from-orange-500 to-orange-600',
 purple: 'bg-gradient-to-br from-purple-500 to-purple-600'
 };

 return (
 <button
 onClick={onClick}
 className="card card-clickable text-left w-full hover:scale-105 transition-transform"
 >
 <div className="flex items-center">
 <div className={`w-12 h-12 ${colorClasses[color]} rounded-full flex items-center justify-center text-white mr-4 shadow-lg`}>
 {icon}
 </div>
 <div>
 <p className="font-semibold text-primary">{title}</p>
 <p className="text-sm text-secondary">{description}</p>
 </div>
 </div>
 </button>
 );
}

export default Dashboard;