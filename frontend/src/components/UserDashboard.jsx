import React, { useState, useEffect, useCallback } from 'react';
import { CubeIcon, CheckCircleIcon, ExclamationTriangleIcon, ClockIcon, BellIcon, XMarkIcon, InformationCircleIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../auth/AuthContext';
import NewRequestModal from './NewRequestModal';
import ReportBugModal from './ReportBugModal';
import { UserDashboardSkeleton } from './SkeletonLoader';

const UserDashboard = ({ onOpenNotifications }) => {
  const [stats, setStats] = useState({
    availableItems: 0,
    myRequests: 0,
    myReports: 0,
    myLoans: 0
  });
  const [recentData, setRecentData] = useState({
    activeLoans: [],
    recentRequests: [],
    recentReports: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userPenalties, setUserPenalties] = useState({
    strikes: 0,
    isBlocked: false,
    blockedReason: null,
    penalties: []
  });
  const [showQuickRequestModal, setShowQuickRequestModal] = useState(false);
  const [showRequestDetailModal, setShowRequestDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showReportFaultModal, setShowReportFaultModal] = useState(false);
  const [welcomeSectionDismissed, setWelcomeSectionDismissed] = useState(false);
  const { token, user } = useAuth();

  // Load welcome section dismissed state from localStorage
  useEffect(() => {
    if (user?.id) {
      const dismissed = localStorage.getItem(`welcome_dismissed_${user.id}`);
      if (dismissed === 'true') {
        setWelcomeSectionDismissed(true);
      }
    }
  }, [user?.id]);

  // Hide welcome section if user has active loans
  useEffect(() => {
    if (recentData.activeLoans.length > 0) {
      setWelcomeSectionDismissed(true);
      if (user?.id) {
        localStorage.setItem(`welcome_dismissed_${user.id}`, 'true');
      }
    }
  }, [recentData.activeLoans.length, user?.id]);

  const handleDismissWelcome = () => {
    setWelcomeSectionDismissed(true);
    if (user?.id) {
      localStorage.setItem(`welcome_dismissed_${user.id}`, 'true');
    }
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [inventoryRes, requestsRes, reportsRes, loansRes, penaltiesRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventario/disponibili`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/richieste/mie`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/segnalazioni/mie`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/prestiti/mie`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/penalties/user/${user.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      // Process inventory data
      if (inventoryRes.ok) {
        const inventoryData = await inventoryRes.json();
        // Conta le UNITÀ disponibili totali, non gli articoli
        // Assicuriamoci che unita_disponibili sia un numero
        const totalAvailableUnits = inventoryData.reduce((total, item) => {
          const unita = Number(item.unita_disponibili) || 0;
          return total + unita;
        }, 0);
        setStats(prev => ({ ...prev, availableItems: totalAvailableUnits }));
      }

      // Process requests data
      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        setStats(prev => ({ ...prev, myRequests: requestsData.length }));
        setRecentData(prev => ({ ...prev, recentRequests: requestsData.slice(0, 3) }));
      }

      // Process reports data
      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        setStats(prev => ({ ...prev, myReports: reportsData.length }));
        setRecentData(prev => ({ ...prev, recentReports: reportsData.slice(0, 3) }));
      }

      // Process loans data
      if (loansRes.ok) {
        const loansData = await loansRes.json();
        const activeLoans = loansData.filter(loan => loan.stato === 'attivo');
        setStats(prev => ({ ...prev, myLoans: activeLoans.length }));
        setRecentData(prev => ({ ...prev, activeLoans: activeLoans.slice(0, 3) }));
      }

      // Process penalties data
      if (penaltiesRes.ok) {
        const penaltiesData = await penaltiesRes.json();
        setUserPenalties({
          strikes: penaltiesData.userInfo?.penalty_strikes || 0,
          isBlocked: penaltiesData.userInfo?.is_blocked || false,
          blockedReason: penaltiesData.userInfo?.blocked_reason || null,
          penalties: penaltiesData.penalties || []
        });
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    // Aspetta che token e user siano disponibili prima di caricare i dati
    if (token && user) {
      fetchData();
    }
  }, [token, user, fetchData]);

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

  const handleRequestClick = (request) => {
    setSelectedRequest(request);
    setShowRequestDetailModal(true);
  };

  if (loading) {
    return <UserDashboardSkeleton />;
  }

  return (
    <div className="p-6">
      {/* Header con notifiche (stessa logica admin: solo in dashboard) */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Benvenuto, {user?.name} {user?.surname}</p>
        </div>
        {onOpenNotifications && (
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
            type="button"
            aria-label="Notifiche"
          >
            <BellIcon className="w-6 h-6 text-gray-600" />
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Articoli Disponibili" value={stats.availableItems} />
        <StatCard title="Le Mie Richieste" value={stats.myRequests} />
        <StatCard title="Le Mie Segnalazioni" value={stats.myReports} />
        <StatCard title="I Miei Prestiti" value={stats.myLoans} />
      </div>

      {/* Welcome/Info Section for new users */}
      {recentData.activeLoans.length === 0 && !welcomeSectionDismissed && (
        <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-200 p-6 relative">
          <button
            onClick={handleDismissWelcome}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Chiudi"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <InformationCircleIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4 flex-1 pr-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Benvenuto nel Service Attrezzatura!</h3>
              <p className="text-sm text-gray-700 mb-4">
                Inizia a noleggiare le attrezzature per il tuo corso. Ecco come funziona:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-white rounded-full p-4 border border-blue-100">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm mr-2">1</div>
                    <h4 className="font-semibold text-gray-900">Sfoglia</h4>
                  </div>
                  <p className="text-xs text-gray-600">Vai su "Articoli Disponibili" per vedere tutte le attrezzature disponibili per il tuo corso.</p>
                </div>
                <div className="bg-white rounded-full p-4 border border-blue-100">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm mr-2">2</div>
                    <h4 className="font-semibold text-gray-900">Richiedi</h4>
                  </div>
                  <p className="text-xs text-gray-600">Clicca su "Richiedi" per selezionare l'ID specifico e le date di utilizzo.</p>
                </div>
                <div className="bg-white rounded-full p-4 border border-blue-100">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm mr-2">3</div>
                    <h4 className="font-semibold text-gray-900">Ritira</h4>
                  </div>
                  <p className="text-xs text-gray-600">Una volta approvata, potrai ritirare l'attrezzatura presso il Service.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Azioni Rapide - allineate a stile admin */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Azioni Rapide</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setShowQuickRequestModal(true)}
            className="group flex items-start gap-4 p-5 bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 text-left"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <PlusIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Nuova Richiesta</h3>
              <p className="text-sm text-gray-500 mt-0.5">Richiedi un articolo in prestito</p>
            </div>
          </button>
          <button
            onClick={() => setShowReportFaultModal(true)}
            className="group flex items-start gap-4 p-5 bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 text-left"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Segnala Guasto</h3>
              <p className="text-sm text-gray-500 mt-0.5">Segnala un problema con un articolo</p>
            </div>
          </button>
        </div>
      </div>

      {/* Penalty Warning */}
      {(userPenalties.strikes > 0 || userPenalties.isBlocked) && (
        <div className={`rounded-xl shadow-sm border p-6 mb-8 ${
          userPenalties.isBlocked ? 'bg-red-50 border-red-200' :
          userPenalties.strikes >= 2 ? 'bg-orange-50 border-orange-200' :
          'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-start">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              userPenalties.isBlocked ? 'bg-red-100' :
              userPenalties.strikes >= 2 ? 'bg-orange-100' :
              'bg-yellow-100'
            }`}>
              <ExclamationTriangleIcon className={`w-5 h-5 ${
                userPenalties.isBlocked ? 'text-red-600' :
                userPenalties.strikes >= 2 ? 'text-orange-600' :
                'text-yellow-600'
              }`} />
            </div>
            <div className="ml-4 flex-1">
              <h3 className={`text-lg font-semibold ${
                userPenalties.isBlocked ? 'text-red-900' :
                userPenalties.strikes >= 2 ? 'text-orange-900' :
                'text-yellow-900'
              }`}>
                {userPenalties.isBlocked ? '🚫 Account Bloccato' :
                 userPenalties.strikes >= 2 ? '⚠️ Attenzione Penalità' :
                 '⚠️ Penalità Ricevute'}
              </h3>
              <div className={`mt-2 text-sm ${
                userPenalties.isBlocked ? 'text-red-800' :
                userPenalties.strikes >= 2 ? 'text-orange-800' :
                'text-yellow-800'
              }`}>
                {userPenalties.isBlocked ? (
                  <div className="space-y-2">
                    <p className="font-medium">Non puoi effettuare nuove richieste di noleggio.</p>
                    <p><strong>Motivo:</strong> {userPenalties.blockedReason}</p>
                    <p><strong>Penalità accumulate:</strong> {userPenalties.strikes} strike</p>
                    <div className="mt-3 p-3 bg-red-100 rounded-full">
                      <p className="font-medium text-red-900">Per sbloccare il tuo account:</p>
                      <p className="text-red-800">Recati di persona presso l'ufficio amministrativo per discutere della situazione.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p>Hai accumulato <strong>{userPenalties.strikes} strike</strong> per ritardi nella restituzione.</p>
                    {userPenalties.strikes >= 2 && (
                      <div className="mt-2 p-3 bg-orange-100 rounded-full">
                        <p className="font-medium text-orange-900">⚠️ Un altro ritardo comporterà il blocco automatico dell'account!</p>
                        <p className="text-orange-800">Assicurati di restituire i futuri prestiti entro la data stabilita.</p>
                      </div>
                    )}
                    {userPenalties.penalties.length > 0 && (
                      <details className="mt-3">
                        <summary className="cursor-pointer font-medium hover:underline">
                          Visualizza storico penalità ({userPenalties.penalties.length})
                        </summary>
                        <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                          {userPenalties.penalties.slice(0, 3).map((penalty, index) => (
                            <div key={index} className="text-xs bg-white bg-opacity-50 rounded p-2">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">{penalty.articolo_nome}</span>
                                <span className="text-red-600">{penalty.strike_assegnati} strike</span>
                              </div>
                              <div className="text-gray-600 mt-1">
                                {penalty.giorni_ritardo} giorni di ritardo • {new Date(penalty.created_at).toLocaleDateString('it-IT')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Loans */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ClockIcon className="w-5 h-5 mr-2 text-green-600" />
            Prestiti Attivi
          </h3>
          {recentData.activeLoans.length > 0 ? (
            <div className="space-y-3">
              {recentData.activeLoans.map((loan, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-200 shadow-md shadow-green-100/30">
                  <div>
                    <p className="font-medium text-gray-900">{loan.articolo_nome || loan.oggetto_nome || 'Oggetto'}</p>
                    <p className="text-sm text-gray-600">Scadenza: {formatDate(loan.data_rientro || loan.data_fine)}</p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    Attivo
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-sm text-gray-500">Nessun prestito attivo al momento</p>
              <p className="text-xs text-gray-400 mt-1">I tuoi prestiti attivi appariranno qui</p>
            </div>
          )}
        </div>

        {/* Recent Requests */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CheckCircleIcon className="w-5 h-5 mr-2 text-gray-600" />
            Richieste Recenti
          </h3>
          {recentData.recentRequests.length > 0 ? (
            <div className="space-y-3">
              {recentData.recentRequests.map((request, index) => {
                const getRequestPillStyles = (stato) => {
                  switch(stato) {
                    case 'in_attesa':
                    case 'pending':
                      return {
                        pillBg: 'bg-yellow-100',
                        pillText: 'text-yellow-800'
                      };
                    case 'approvata':
                      return {
                        pillBg: 'bg-green-100',
                        pillText: 'text-green-800'
                      };
                    case 'rifiutata':
                      return {
                        pillBg: 'bg-red-100',
                        pillText: 'text-red-800'
                      };
                    default:
                      return {
                        pillBg: 'bg-gray-100',
                        pillText: 'text-gray-800'
                      };
                  }
                };
                
                const pillStyles = getRequestPillStyles(request.stato);
                
                return (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 rounded-full border border-gray-200 bg-white"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{request.oggetto_nome || request.articolo_nome || 'Oggetto'}</p>
                      <p className="text-sm text-gray-600">
                        {request.stato === 'approvata' && request.dal && request.al ? (
                          <span><strong>Uscita:</strong> {formatDate(request.dal)} - <strong>Rientro:</strong> {formatDate(request.al)}</span>
                        ) : (
                          <span>{formatDate(request.created_at)}</span>
                        )}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${pillStyles.pillBg} ${pillStyles.pillText}`}>
                      {request.stato === 'approvata' ? 'Approvata' :
                       request.stato === 'in_attesa' || request.stato === 'pending' ? 'In Attesa' : 'Rifiutata'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-sm text-gray-500">Nessuna richiesta recente</p>
              <p className="text-xs text-gray-400 mt-1">Le tue richieste appariranno qui</p>
              <button
                onClick={() => setShowQuickRequestModal(true)}
                className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Crea la tua prima richiesta →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showQuickRequestModal && (
        <NewRequestModal
          isOpen={showQuickRequestModal}
          onClose={() => setShowQuickRequestModal(false)}
          onSuccess={() => {
            setShowQuickRequestModal(false);
            fetchData();
          }}
        />
      )}

      {showReportFaultModal && (
        <ReportBugModal
          isOpen={showReportFaultModal}
          onClose={() => setShowReportFaultModal(false)}
          onSuccess={() => {
            setShowReportFaultModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

// Stat Card Component
function StatCard({ title, value }) {
  const iconMap = {
    'Articoli Disponibili': <CubeIcon className="icon-lg" />,
    'Le Mie Richieste': <CheckCircleIcon className="icon-lg" />,
    'Le Mie Segnalazioni': <ExclamationTriangleIcon className="icon-lg" />,
    'I Miei Prestiti': <ClockIcon className="icon-lg" />
  };

  const colorMap = {
    'Articoli Disponibili': 'bg-blue-100',
    'Le Mie Richieste': 'bg-green-100',
    'Le Mie Segnalazioni': 'bg-red-100',
    'I Miei Prestiti': 'bg-yellow-100'
  };

  return (
    <div className="kpi-card bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center w-full">
        <div className={`w-12 h-12 ${colorMap[title]} rounded-full flex items-center justify-center ${
          title === 'Articoli Disponibili' ? 'text-blue-600' :
          title === 'Le Mie Richieste' ? 'text-green-600' :
          title === 'Le Mie Segnalazioni' ? 'text-red-600' :
          title === 'I Miei Prestiti' ? 'text-yellow-600' : 'text-gray-600'
        }`}>
          {iconMap[title]}
        </div>
        <div className="ml-4 flex-1 min-w-0">
          <p className="kpi-label text-gray-600 font-semibold">{title}</p>
          <p className="kpi-value text-gray-900">{typeof value === 'number' ? value : parseInt(value) || 0}</p>
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;