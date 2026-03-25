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
  const [exportError, setExportError] = useState(null);
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
      setExportError(null);
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
      setExportError(err.response?.data?.error || 'Impossibile completare l\'export. Riprova tra poco.');
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
            <div className="space-y-5">
              <p className="text-sm text-gray-600">
                Qui puoi <strong className="text-gray-800">scaricare i dati</strong> collegati al tuo account su Attrezzature
                e consultare informativa e altri diritti GDPR.
              </p>

              {/* Azione principale: portabilità / accesso */}
              <div className="rounded-xl border border-blue-200/80 bg-gradient-to-b from-blue-50/90 to-white p-5 shadow-sm ring-1 ring-blue-100/50">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                        <ArrowDownTrayIcon className="h-5 w-5" aria-hidden />
                      </span>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">Scarica i tuoi dati</h3>
                        <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Accesso e portabilità (GDPR)</p>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-600">
                      Generiamo un file <strong className="font-medium text-gray-800">JSON</strong> con le informazioni che trattiamo
                      per te in questa app. È il modo concreto per esercitare diritto di accesso e portabilità.
                    </p>
                    <ul className="grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                      {[
                        'Profilo (nome, email, contatti, corso…)',
                        'Prestiti e movimenti collegati a te',
                        'Richieste di attrezzatura',
                        "Segnalazioni inviate dall'account"
                      ].map((line) => (
                        <li key={line} className="flex gap-2 rounded-md bg-white/80 px-2.5 py-1.5 ring-1 ring-gray-100">
                          <span className="mt-0.5 text-green-600" aria-hidden>✓</span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                {exportError && (
                  <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                    {exportError}
                  </p>
                )}
                <div className="mt-5 flex flex-col gap-3 border-t border-blue-100/80 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  {!isSpecialAdmin ? (
                    <button
                      type="button"
                      onClick={handleExportData}
                      disabled={exporting}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      <ArrowDownTrayIcon className="h-5 w-5 shrink-0" aria-hidden />
                      {exporting ? 'Preparazione download…' : 'Scarica file JSON dei miei dati'}
                    </button>
                  ) : (
                    <p className="text-sm text-gray-600">
                      L&apos;account amministratore non include un export personale da questa schermata.
                    </p>
                  )}
                  <p className="text-center text-xs text-gray-500 sm:text-right">
                    Il download parte subito nel browser; conserva il file in luogo sicuro.
                  </p>
                </div>
              </div>

              {/* Informativa */}
              <a
                href={PRIVACY_POLICY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-left transition hover:border-gray-300 hover:bg-gray-50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-gray-600 shadow-sm ring-1 ring-gray-100">
                  <DocumentTextIcon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-gray-900">Privacy Policy completa</span>
                  <span className="block text-xs text-gray-500">Testo legale su laba.biz — si apre in una nuova scheda</span>
                </span>
                <span className="text-gray-400 text-sm" aria-hidden>↗</span>
              </a>

              {/* Altri diritti: non competono con il blocco export */}
              <details className="group rounded-xl border border-gray-200 bg-white px-4 py-3">
                <summary className="cursor-pointer list-none text-sm font-medium text-gray-800 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-2">
                    Altri diritti GDPR (rettifica, cancellazione, opposizione…)
                    <span className="text-xs font-normal text-gray-500 group-open:hidden">Mostra</span>
                    <span className="hidden text-xs font-normal text-gray-500 group-open:inline">Nascondi</span>
                  </span>
                </summary>
                <p className="mt-3 text-xs text-gray-500">
                  Regolamento UE 2016/679 — in sintesi, tra gli altri:
                </p>
                <ul className="mt-2 space-y-1.5 text-sm text-gray-600">
                  <li><strong className="text-gray-800">Rettifica</strong> — aggiorna i dati dal tab «Chi sono».</li>
                  <li><strong className="text-gray-800">Cancellazione</strong> — usa il tab «Elimina account» se non hai prestiti attivi.</li>
                  <li><strong className="text-gray-800">Limitazione / opposizione</strong> — per richieste specifiche contatta il titolare del trattamento (vedi Privacy Policy).</li>
                </ul>
              </details>
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
