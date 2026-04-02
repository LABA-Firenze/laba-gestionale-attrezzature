import React, { useState, useEffect } from 'react';
import PageHeader from './PageHeader';
import { PlusIcon, ExclamationTriangleIcon, ClockIcon, CheckCircleIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import { useAuth } from '../auth/AuthContext';
import ReportBugModal from './ReportBugModal';

const ReportFault = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const { api } = useAuth();

  // Fetch user's reports
  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/segnalazioni/mie');
      const data = response.data ?? [];
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const getStatusBadge = (status) => {
    const statusConfig = {
      'aperta': { className: 'bg-red-100 text-red-800', label: 'Aperta' },
      'in_corso': { className: 'bg-yellow-100 text-yellow-800', label: 'In Corso' },
      'risolta': { className: 'bg-green-100 text-green-800', label: 'Risolta' },
      'chiusa': { className: 'bg-gray-100 text-gray-800', label: 'Chiusa' }
    };
    const config = statusConfig[status] || { className: 'bg-blue-100 text-blue-800', label: status };
    
    return (
      <span className={`px-3 py-1 text-xs font-medium rounded-full ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const getUrgencyBadge = (urgenza) => {
    const urgencyConfig = {
      'critica': { className: 'bg-red-600 text-white', label: 'Critica' },
      'alta': { className: 'bg-orange-100 text-orange-800', label: 'Alta' },
      'media': { className: 'bg-yellow-100 text-yellow-800', label: 'Media' },
      'bassa': { className: 'bg-green-100 text-green-800', label: 'Bassa' }
    };
    const config = urgencyConfig[urgenza] || { className: 'bg-gray-100 text-gray-800', label: urgenza };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Data non specificata';
    try {
      return new Date(dateString).toLocaleDateString('it-IT');
    } catch (error) {
      return 'Data non valida';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        <span className="ml-2 text-gray-600">Caricamento segnalazioni...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Segnala Guasto"
        subtitle="Segnala problemi con gli articoli e gestisci le tue segnalazioni"
        action={
          <button
            onClick={() => setShowReportModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-full hover:bg-red-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Nuova Segnalazione</span>
          </button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Aperte</p>
              <p className="text-2xl font-bold text-gray-900">{reports.filter(r => r.stato === 'aperta').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <ClockIcon className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Corso</p>
              <p className="text-2xl font-bold text-gray-900">{reports.filter(r => r.stato === 'in_corso').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Risolte</p>
              <p className="text-2xl font-bold text-gray-900">{reports.filter(r => r.stato === 'risolta').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <Squares2X2Icon className="w-6 h-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Totale</p>
              <p className="text-2xl font-bold text-gray-900">{reports.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Reports List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Le Tue Segnalazioni</h2>
        </div>
        
        <div className="p-6">
          {reports.length === 0 ? (
            <div className="text-center py-12">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nessuna segnalazione</h3>
              <p className="text-gray-500 mb-4">Non hai ancora effettuato nessuna segnalazione.</p>
              <button
                onClick={() => setShowReportModal(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-full hover:bg-red-700 transition-colors"
              >
                Crea la tua prima segnalazione
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900">{report.inventario_nome || 'Oggetto'}</h3>
                        {getUrgencyBadge(report.urgenza)}
                        {getStatusBadge(report.stato)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Tipo:</strong> {report.tipo}
                      </p>
                      <p className="text-sm text-gray-700">{report.messaggio}</p>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 border-t border-gray-100 pt-2">
                    Segnalato il: {formatDate(report.created_at)}
                    {report.handled_at && (
                      <span> - Gestito il: {formatDate(report.handled_at)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <ReportBugModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          onSuccess={() => {
            setShowReportModal(false);
            fetchReports();
          }}
        />
      )}
    </div>
  );
};

export default ReportFault;