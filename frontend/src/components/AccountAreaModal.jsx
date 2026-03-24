import React, { useState, useEffect } from 'react';
import {
  XMarkIcon, UserCircleIcon, ClipboardDocumentListIcon, ShieldCheckIcon, TrashIcon,
  ArrowDownTrayIcon, DocumentTextIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../auth/AuthContext';
import UserProfile from './UserProfile';

const PRIVACY_POLICY_URL = 'https://www.laba.biz/privacy-policy';

const AccountAreaModal = ({ isOpen, onClose }) => {
  const { user, api } = useAuth();
  const [activeTab, setActiveTab] = useState('profilo');
  const [loans, setLoans] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteError, setDeleteError] = useState(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const isSpecialAdmin = user?.id === -1;

  useEffect(() => {
    if (isOpen && activeTab === 'prestiti') {
      fetchLoans();
    }
  }, [isOpen, activeTab]);

  const fetchLoans = async () => {
    if (isSpecialAdmin) return;
    try {
      setLoadingLoans(true);
      const [loansRes, requestsRes] = await Promise.all([
        api.get('/api/prestiti/mie'),
        api.get('/api/richieste/mie')
      ]);
      setLoans(loansRes.data ?? []);
      setRequests(requestsRes.data ?? []);
    } catch (err) {
      console.error('Errore caricamento prestiti:', err);
    } finally {
      setLoadingLoans(false);
    }
  };

  const handleExportData = async () => {
    try {
      setExporting(true);
      const res = await api.get('/api/auth/me/export');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laba-miei-dati-${user?.email?.replace(/@.*/, '')}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Errore export:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'ELIMINA') return;
    try {
      setDeleting(true);
      setDeleteError(null);
      await api.post('/api/auth/me/delete-account');
      setDeleteSuccess(true);
      setTimeout(() => {
        onClose();
        window.location.href = '/';
      }, 2000);
    } catch (err) {
      setDeleteError(err.response?.data?.error || err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'profilo', label: 'Chi sono', icon: <UserCircleIcon className="w-5 h-5" /> },
    { id: 'prestiti', label: 'I miei prestiti', icon: <ClipboardDocumentListIcon className="w-5 h-5" /> },
    { id: 'privacy', label: 'Privacy & GDPR', icon: <ShieldCheckIcon className="w-5 h-5" /> },
    { id: 'elimina', label: 'Elimina account', icon: <TrashIcon className="w-5 h-5" /> }
  ];

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('it-IT') : '-';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Il mio account</h2>
          <button
            onClick={onClose}
            className="p-2 -m-2 rounded-lg hover:bg-gray-100 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <nav className="flex gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 py-3 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === t.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'profilo' && (
            <UserProfile onClose={onClose} onUpdate={() => {}} embedded />
          )}

          {activeTab === 'prestiti' && (
            <div className="space-y-4">
              {isSpecialAdmin ? (
                <p className="text-gray-500 text-sm">L&apos;account admin non ha prestiti personali.</p>
              ) : loadingLoans ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-16 bg-gray-100 rounded-lg" />
                  <div className="h-16 bg-gray-100 rounded-lg" />
                  <div className="h-16 bg-gray-100 rounded-lg" />
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Prestiti attivi ({loans.filter((l) => l.stato === 'attivo').length})</h3>
                    <div className="space-y-2">
                      {loans.filter((l) => l.stato === 'attivo').length === 0 ? (
                        <p className="text-gray-500 text-sm">Nessun prestito attivo.</p>
                      ) : (
                        loans.filter((l) => l.stato === 'attivo').slice(0, 5).map((l) => (
                          <div key={l.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                            <span className="font-medium">{l.oggetto_nome || l.articolo_nome || l.nome}</span>
                            <span className="text-gray-500 ml-2">— Scadenza: {formatDate(l.data_rientro)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Richieste in attesa ({requests.filter((r) => r.stato === 'in_attesa').length})</h3>
                    <div className="space-y-2">
                      {requests.filter((r) => r.stato === 'in_attesa').length === 0 ? (
                        <p className="text-gray-500 text-sm">Nessuna richiesta in attesa.</p>
                      ) : (
                        requests.filter((r) => r.stato === 'in_attesa').slice(0, 5).map((r) => (
                          <div key={r.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                            <span className="font-medium">{r.oggetto_nome || r.nome}</span>
                            <span className="text-gray-500 ml-2">— {formatDate(r.dal)} → {formatDate(r.al)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <p className="text-gray-600 text-sm">
                In conformità al Regolamento UE 2016/679 (GDPR), hai diritto a:
              </p>
              <ul className="space-y-2 text-sm text-gray-600 list-disc list-inside">
                <li><strong>Accesso</strong> — ottenere copia dei tuoi dati personali</li>
                <li><strong>Rettifica</strong> — correggere dati inesatti o incompleti</li>
                <li><strong>Cancellazione</strong> — richiedere la cancellazione dei tuoi dati (diritto all&apos;oblio)</li>
                <li><strong>Limitazione</strong> — limitare il trattamento in determinate circostanze</li>
                <li><strong>Portabilità</strong> — ricevere i tuoi dati in formato strutturato</li>
                <li><strong>Opposizione</strong> — opporti al trattamento per motivi legittimi</li>
              </ul>
              <div className="flex flex-wrap gap-3">
                <a
                  href={PRIVACY_POLICY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                >
                  <DocumentTextIcon className="w-5 h-5" />
                  Privacy Policy completa
                </a>
                {!isSpecialAdmin && (
                  <button
                    onClick={handleExportData}
                    disabled={exporting}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    {exporting ? 'Export in corso...' : 'Esporta i miei dati'}
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'elimina' && (
            <div className="space-y-6">
              {isSpecialAdmin ? (
                <p className="text-gray-600 text-sm">L&apos;account amministratore non può essere eliminato da qui.</p>
              ) : deleteSuccess ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                  Account eliminato. Verrai disconnesso.
                </div>
              ) : (
                <>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-amber-800 text-sm font-medium mb-2">Attenzione: azione irreversibile</p>
                    <p className="text-amber-700 text-sm">
                      Eliminando il tuo account verranno cancellati definitivamente i tuoi dati personali,
                      la cronologia prestiti e richieste. Questa azione non può essere annullata.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Per confermare, scrivi <strong>ELIMINA</strong> nel campo sottostante:
                    </label>
                    <input
                      type="text"
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      placeholder="ELIMINA"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  {deleteError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{deleteError}</div>
                  )}
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirm !== 'ELIMINA' || deleting}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    {deleting ? 'Eliminazione in corso...' : 'Elimina definitivamente il mio account'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountAreaModal;
