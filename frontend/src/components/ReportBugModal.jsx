import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

const ReportBugModal = ({ isOpen, onClose, onSuccess, prefillData = {} }) => {
  const [step, setStep] = useState(1); // 1: Prestito, 2: ID Specifico, 3: Dettagli Guasto
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [myLoans, setMyLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [formData, setFormData] = useState({
    tipo: 'guasto',
    urgenza: 'media',
    messaggio: ''
  });
  const { token, user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      fetchMyLoans();
      // Reset all data when opening
      setStep(1);
      setSelectedLoan(null);
      setSelectedUnit(null);
      setAvailableUnits([]);
      setFormData({
        tipo: 'guasto',
        urgenza: 'media',
        messaggio: prefillData.messaggio || ''
      });
      setError(null);
    }
  }, [isOpen]);

  const fetchMyLoans = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/prestiti/mie`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Only include active loans - completed loans cannot be reported for faults
        const activeLoans = data.filter(loan => loan.stato === 'attivo');
        setMyLoans(activeLoans);
      }
    } catch (err) {
      console.error('Errore caricamento prestiti:', err);
    }
  };

  const fetchLoanUnits = async (loanId) => {
    try {
      // Get only units that the user has on loan for this specific loan
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/prestiti/${loanId}/units`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableUnits(data);
      } else {
        console.error('Errore caricamento unità prestito:', response.status);
        setAvailableUnits([]);
      }
    } catch (err) {
      console.error('Errore caricamento unità:', err);
      setAvailableUnits([]);
    }
  };

  const handleLoanSelect = (loan) => {
    setSelectedLoan(loan);
    fetchLoanUnits(loan.id);
    setStep(2);
  };

  const handleUnitSelect = (unit) => {
    setSelectedUnit(unit);
    setStep(3);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/segnalazioni`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tipo: formData.tipo,
          urgenza: formData.urgenza,
          messaggio: formData.messaggio,
          inventario_id: selectedLoan.inventario_id,
          unit_id: selectedUnit.id,
          prestito_id: selectedLoan.id,
          user_id: user.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nella creazione della segnalazione');
      }

      // Show success notification
      window.dispatchEvent(new CustomEvent('showNotification', {
        detail: {
          type: 'success',
          data: { 
            title: 'Segnalazione inviata!', 
            body: 'La tua segnalazione è stata inviata agli amministratori.',
            icon: '/favicon.ico'
          }
        }
      }));

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Seleziona Prestito';
      case 2: return 'Seleziona ID Specifico';
      case 3: return 'Dettagli Segnalazione';
      default: return 'Segnala Guasto';
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'attivo': { className: 'bg-green-100 text-green-800', label: 'Attivo' },
      'restituito': { className: 'bg-gray-100 text-gray-800', label: 'Restituito' },
      'scaduto': { className: 'bg-red-100 text-red-800', label: 'Scaduto' }
    };
    const config = statusConfig[status] || { className: 'bg-blue-100 text-blue-800', label: status };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Non specificata';
    try {
      return new Date(dateString).toLocaleDateString('it-IT');
    } catch (error) {
      return 'Data non valida';
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{getStepTitle()}</h2>
            <p className="text-sm text-gray-600 mt-1">Step {step} di 3</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Seleziona Prestito */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Seleziona il prestito per cui segnalare il problema</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {myLoans.map((loan) => (
                  <div
                    key={loan.id}
                    onClick={() => handleLoanSelect(loan)}
                    className="p-4 border border-gray-200 rounded-full hover:border-red-500 hover:shadow-md cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{loan.articolo_nome || 'Oggetto'}</h4>
                      {getStatusBadge(loan.stato)}
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Uscita: {formatDate(loan.data_uscita)} - Rientro: {formatDate(loan.data_rientro)}</p>
                      {loan.data_rientro && (
                        <p className="text-green-600 mt-1">Restituito: {formatDate(loan.data_rientro)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {myLoans.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p>Non hai prestiti attivi per cui segnalare problemi</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Seleziona ID Specifico */}
          {step === 2 && selectedLoan && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Seleziona ID Specifico</h3>
                  <p className="text-sm text-gray-600">Prestito: <strong>{selectedLoan.articolo_nome}</strong></p>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  ← Cambia prestito
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                {availableUnits.map((unit) => (
                  <div
                    key={unit.id}
                    onClick={() => handleUnitSelect(unit)}
                    className="p-3 border border-gray-200 rounded-full hover:border-red-500 hover:shadow-md cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{unit.codice_univoco}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        unit.stato === 'disponibile' ? 'bg-green-100 text-green-800' :
                        unit.stato === 'prestato' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {unit.stato}
                      </span>
                    </div>
                    {unit.note && (
                      <p className="text-xs text-gray-500 mt-1">{unit.note}</p>
                    )}
                  </div>
                ))}
              </div>
              
              {availableUnits.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Nessuna unità trovata per questo prestito</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Dettagli Segnalazione */}
          {step === 3 && selectedLoan && selectedUnit && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Dettagli Segnalazione</h3>
                  <p className="text-sm text-gray-600">
                    Oggetto: <strong>{selectedLoan.articolo_nome}</strong> - ID: <strong>{selectedUnit.codice_univoco}</strong>
                  </p>
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo di Segnalazione *
                </label>
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="guasto">Guasto</option>
                  <option value="danneggiamento">Danneggiamento</option>
                  <option value="malfunzionamento">Malfunzionamento</option>
                  <option value="perdita">Perdita/Furto</option>
                </select>
              </div>

              {/* Urgenza */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urgenza *
                </label>
                <select
                  name="urgenza"
                  value={formData.urgenza}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="bassa">Bassa</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Critica</option>
                </select>
              </div>

              {/* Descrizione */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrizione del Problema *
                </label>
                <textarea
                  name="messaggio"
                  value={formData.messaggio}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Descrivi il problema in dettaglio..."
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-full">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between items-center space-x-3 pt-4 mt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-full border border-gray-300 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Indietro
                </button>
                <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                      Invio...
                    </>
                  ) : (
                    'Invia Segnalazione'
                  )}
                </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportBugModal;