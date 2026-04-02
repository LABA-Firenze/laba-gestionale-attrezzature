import React, { useState, useEffect } from 'react';
import { PlusIcon, ClockIcon, CheckCircleIcon, XMarkIcon, XCircleIcon, CheckIcon, CalendarIcon, TagIcon, CubeIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../auth/AuthContext';
import PageHeader from './PageHeader';
import SectionTabs, { Tab } from './SectionTabs';
import NewRequestModal from './NewRequestModal';
import { ItemListSkeleton } from './SkeletonLoader';

const MyLoans = () => {
  const [loans, setLoans] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [cancellingRequestId, setCancellingRequestId] = useState(null);
  const { api } = useAuth();

  // Fetch user's loans and requests
  const fetchData = async () => {
    try {
      setLoading(true);
      const [loansRes, requestsRes] = await Promise.all([
        api.get('/api/prestiti/mie'),
        api.get('/api/richieste/mie')
      ]);
      const loansData = loansRes.data ?? [];
      const requestsData = requestsRes.data ?? [];
      setLoans(loansData);
      setRequests(requestsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'attivo': return 'bg-green-100 text-green-800';
      case 'scaduto': return 'bg-red-100 text-red-800';
      case 'restituito': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'attivo': return 'Attivo';
      case 'scaduto': return 'Scaduto';
      case 'restituito': return 'Restituito';
      default: return status;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Non specificata';
    try {
      return new Date(dateString).toLocaleDateString('it-IT');
    } catch (error) {
      return 'Data non valida';
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!confirm('Sei sicuro di voler annullare questa richiesta?')) {
      return;
    }

    try {
      setCancellingRequestId(requestId);
      setError(null);

      await api.delete(`/api/richieste/${requestId}`);
      await fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setCancellingRequestId(null);
    }
  };

  if (loading) {
    return <ItemListSkeleton count={4} />;
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="I Miei Prestiti"
        subtitle="Gestisci i tuoi prestiti attivi e richiedi nuovi articoli"
        action={
          <button
            onClick={() => setShowNewRequestModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Nuova Richiesta</span>
          </button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-full">
              <ClockIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Prestiti Attivi</p>
              <p className="text-2xl font-bold text-gray-900">
                {loans.filter(loan => loan.stato === 'attivo').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-full">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Prestiti Completati</p>
              <p className="text-2xl font-bold text-gray-900">
                {loans.filter(loan => loan.stato === 'restituito').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-full">
              <ClockIcon className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Approvazione</p>
              <p className="text-2xl font-bold text-gray-900">
                {requests.filter(req => req.stato === 'in_attesa').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-full">
              <XMarkIcon className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rifiutati</p>
              <p className="text-2xl font-bold text-gray-900">
                {requests.filter(req => req.stato === 'rifiutata').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs - capsule style come admin */}
      <div className="mb-6">
      <SectionTabs>
        <Tab isActive={activeTab === 'active'} onClick={() => setActiveTab('active')}>
          <span className="inline-flex items-center gap-2">
            <CheckIcon className="w-4 h-4" />
            Prestiti Attivi ({loans.filter(loan => loan.stato === 'attivo').length})
          </span>
        </Tab>
        <Tab isActive={activeTab === 'completed'} onClick={() => setActiveTab('completed')}>
          <span className="inline-flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4" />
            Prestiti Completati ({loans.filter(loan => loan.stato === 'restituito').length})
          </span>
        </Tab>
        <Tab isActive={activeTab === 'pending'} onClick={() => setActiveTab('pending')}>
          <span className="inline-flex items-center gap-2">
            <ClockIcon className="w-4 h-4" />
            In Approvazione ({requests.filter(req => req.stato === 'in_attesa').length})
          </span>
        </Tab>
        <Tab isActive={activeTab === 'rejected'} onClick={() => setActiveTab('rejected')}>
          <span className="inline-flex items-center gap-2">
            <XCircleIcon className="w-4 h-4" />
            Rifiutati ({requests.filter(req => req.stato === 'rifiutata').length})
          </span>
        </Tab>
      </SectionTabs>
      </div>

      {/* Content based on active tab */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Tab Content */}
        {activeTab === 'active' && (
          <>
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Prestiti Attivi</h2>
            </div>
            {loans.filter(loan => loan.stato === 'attivo').length === 0 ? (
              <div className="text-center py-12">
                <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nessun prestito attivo</h3>
                <p className="mt-1 text-sm text-gray-500">Non hai prestiti attivi al momento.</p>
                <div className="mt-6">
                  <button
                    onClick={() => setShowNewRequestModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 transition-colors"
                  >
                    Crea una nuova richiesta
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {loans.filter(loan => loan.stato === 'attivo').map((loan) => (
                  <div key={loan.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-sm font-medium text-gray-900">{loan.articolo_nome}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(loan.stato)}`}>
                            {getStatusText(loan.stato)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
                          <div className="flex items-center">
                            <CalendarIcon className="w-4 h-4 mr-1" />
                            <span>Uscita: {formatDate(loan.data_uscita)}</span>
                          </div>
                          <div className="flex items-center">
                            <CalendarIcon className="w-4 h-4 mr-1" />
                            <span>Rientro: {formatDate(loan.data_rientro)}</span>
                          </div>
                          <div className="flex items-center">
                            <TagIcon className="w-4 h-4 mr-1" />
                            <span>Quantità: {loan.quantita}</span>
                          </div>
                        </div>
                        {loan.note && (
                          <p className="mt-2 text-sm text-gray-600">{loan.note}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'completed' && (
          <>
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Prestiti Completati</h2>
            </div>
            {loans.filter(loan => loan.stato === 'restituito').length === 0 ? (
              <div className="text-center py-12">
                <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nessun prestito completato</h3>
                <p className="mt-1 text-sm text-gray-500">Non hai ancora prestiti approvati o completati.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {loans.filter(loan => loan.stato === 'restituito').map((loan) => (
                  <div key={loan.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-sm font-medium text-gray-900">{loan.articolo_nome}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(loan.stato)}`}>
                            {getStatusText(loan.stato)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
                          <div className="flex items-center">
                            <CalendarIcon className="w-4 h-4 mr-1" />
                            <span>Uscita: {formatDate(loan.data_uscita)}</span>
                          </div>
                          <div className="flex items-center">
                            <CalendarIcon className="w-4 h-4 mr-1" />
                            <span>Rientro: {formatDate(loan.data_rientro)}</span>
                          </div>
                          <div className="flex items-center">
                            <TagIcon className="w-4 h-4 mr-1" />
                            <span>Quantità: {loan.quantita}</span>
                          </div>
                        </div>
                        {loan.note && (
                          <p className="mt-2 text-sm text-gray-600">{loan.note}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'pending' && (
          <>
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Richieste in Approvazione</h2>
            </div>
            {requests.filter(req => req.stato === 'in_attesa').length === 0 ? (
              <div className="text-center py-12">
                <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nessuna richiesta in attesa</h3>
                <p className="mt-1 text-sm text-gray-500">Non hai richieste in attesa di approvazione.</p>
                <div className="mt-6">
                  <button
                    onClick={() => setShowNewRequestModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 transition-colors"
                  >
                    Crea una nuova richiesta
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {requests.filter(req => req.stato === 'in_attesa').map((request) => (
                  <div key={request.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-sm font-medium text-gray-900">{request.oggetto_nome || request.articolo_nome}</h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            In Attesa
                          </span>
                        </div>
                        <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
                          <div className="flex items-center">
                            <CalendarIcon className="w-4 h-4 mr-1" />
                            <span>Richiesta: {formatDate(request.created_at)}</span>
                          </div>
                          <div className="flex items-center">
                            <CalendarIcon className="w-4 h-4 mr-1" />
                            <span>Dal: {formatDate(request.dal)} - Al: {formatDate(request.al)}</span>
                          </div>
                        </div>
                        {request.note && (
                          <p className="mt-2 text-sm text-gray-600">{request.note}</p>
                        )}
                      </div>
                      <div className="ml-4">
                        <button
                          onClick={() => handleCancelRequest(request.id)}
                          disabled={cancellingRequestId === request.id}
                          className="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-full text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {cancellingRequestId === request.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700 mr-2"></div>
                              Annullamento...
                            </>
                          ) : (
                            <>
                              <XMarkIcon className="w-4 h-4 mr-1.5" />
                              Annulla
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'rejected' && (
          <>
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Richieste Rifiutate</h2>
            </div>
            {requests.filter(req => req.stato === 'rifiutata').length === 0 ? (
              <div className="text-center py-12">
                <XMarkIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nessuna richiesta rifiutata</h3>
                <p className="mt-1 text-sm text-gray-500">Non hai richieste che sono state rifiutate.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {requests.filter(req => req.stato === 'rifiutata').map((request) => (
                  <div key={request.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-sm font-medium text-gray-900">{request.oggetto_nome || request.articolo_nome}</h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Rifiutata
                          </span>
                        </div>
                        <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
                          <div className="flex items-center">
                            <CalendarIcon className="w-4 h-4 mr-1" />
                            <span>Richiesta: {formatDate(request.created_at)}</span>
                          </div>
                          {request.motivo_rifiuto && (
                            <div className="flex items-center">
                              <ExclamationCircleIcon className="w-4 h-4 mr-1" />
                              <span>Motivo: {request.motivo_rifiuto}</span>
                            </div>
                          )}
                        </div>
                        {request.note && (
                          <p className="mt-2 text-sm text-gray-600">Note: {request.note}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-full p-4">
          <div className="flex items-center">
            <ExclamationCircleIcon className="w-5 h-5 text-red-500 mr-3" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* New Request Modal */}
      {showNewRequestModal && (
        <NewRequestModal
          isOpen={showNewRequestModal}
          onClose={() => setShowNewRequestModal(false)}
          onSuccess={() => {
            setShowNewRequestModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

export default MyLoans;
