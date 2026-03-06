import React, { useState } from 'react';
import { X } from 'lucide-react';
import IconFill from './IconFill.jsx';
import { useAuth } from '../auth/AuthContext';

const QuickRequestModal = ({ isOpen, onClose, request, onSuccess }) => {
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState(null);
 const [action, setAction] = useState('');
 const [motivation, setMotivation] = useState('');
 const { token } = useAuth();

 const handleAction = async (selectedAction) => {
 if (selectedAction === 'rifiuta' && !motivation.trim()) {
 setError('Inserisci una motivazione per il rifiuto');
 return;
 }

 try {
 setLoading(true);
 setError(null);

 const response = await fetch(`/api/prestiti/${request.id}/${selectedAction}`, {
 method: 'PUT',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({
          motivazione: selectedAction === 'rifiuta' ? motivation : null
 })
 });

 if (!response.ok) {
 const errorData = await response.json();
 throw new Error(errorData.error || `Errore nell'${selectedAction === 'approva' ? 'approvazione' : 'rifiuto'}`);
 }

 onSuccess && onSuccess();
 handleClose();
 } catch (err) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 };

 const handleClose = () => {
 setAction('');
 setMotivation('');
 setError(null);
 onClose();
 };

 if (!isOpen || !request) return null;

 return (
 <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
 <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
 <div className="modal-header">
 <h2 className="text-xl font-bold text-primary">Gestisci Richiesta</h2>
 <button
 onClick={handleClose}
 className="text-muted hover:text-primary"
 >
 <IconFill as={X} className="icon" />
 </button>
 </div>

 <div className="modal-body">
 {/* Request Details */}
 <div className="card mb-6">
 <h3 className="font-semibold text-primary mb-3">Dettagli Richiesta</h3>
 <div className="space-y-2 text-sm">
 <div><span className="text-tertiary">Oggetto:</span> <span className="text-primary font-medium">{request.oggetto_nome}</span></div>
 <div><span className="text-tertiary">Utente:</span> <span className="text-primary">{request.utente_nome} {request.utente_cognome}</span></div>
 <div><span className="text-tertiary">Email:</span> <span className="text-primary">{request.utente_email}</span></div>
 <div><span className="text-tertiary">Dal:</span> <span className="text-primary">{new Date(request.dal).toLocaleDateString('it-IT')}</span></div>
 <div><span className="text-tertiary">Al:</span> <span className="text-primary">{new Date(request.al).toLocaleDateString('it-IT')}</span></div>
 {request.note && (
 <div><span className="text-tertiary">Note:</span> <span className="text-primary">{request.note}</span></div>
 )}
 </div>
 </div>

 {/* Actions */}
 {!action && (
 <div className="space-y-3">
 <h3 className="font-semibold text-primary mb-3">Scegli Azione</h3>
 <div className="grid grid-cols-2 gap-3">
 <button
 onClick={() => setAction('approva')}
 className="btn-success"
 >
 <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
 </svg>
 Approva
 </button>
 <button
 onClick={() => setAction('rifiuta')}
 className="btn-danger"
 >
 <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 Rifiuta
 </button>
 </div>
 </div>
 )}

 {/* Approval Confirmation */}
 {action === 'approva' && (
 <div className="space-y-4">
 <div className="alert-card alert-info">
 <div className="flex items-center">
 <svg className="icon text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 <p className="text-blue-800 ">
 Confermi l'approvazione di questa richiesta? Verrà creato automaticamente un prestito attivo.
 </p>
 </div>
 </div>
 <div className="flex gap-3">
 <button
 onClick={() => setAction('')}
 className="btn-secondary flex-1"
 >
 Indietro
 </button>
 <button
 onClick={() => handleAction('approva')}
 disabled={loading}
 className="btn-success flex-1"
 >
 {loading ? 'Approvazione...' : 'Conferma Approvazione'}
 </button>
 </div>
 </div>
 )}

 {/* Rejection Form */}
 {action === 'rifiuta' && (
 <div className="space-y-4">
 <div className="form-group">
 <label className="form-label">Motivazione Rifiuto *</label>
 <textarea
 value={motivation}
 onChange={(e) => setMotivation(e.target.value)}
 rows={3}
 className="input-field"
 placeholder="Inserisci il motivo del rifiuto..."
 required
 />
 </div>
 <div className="flex gap-3">
 <button
 onClick={() => setAction('')}
 className="btn-secondary flex-1"
 >
 Indietro
 </button>
 <button
 onClick={() => handleAction('rifiuta')}
 disabled={loading || !motivation.trim()}
 className="btn-danger flex-1"
 >
 {loading ? 'Rifiuto...' : 'Conferma Rifiuto'}
 </button>
 </div>
 </div>
 )}

 {error && (
 <div className="alert-card alert-danger mt-4">
 <div className="flex items-center">
 <svg className="icon text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 <p className="text-red-800 ">{error}</p>
 </div>
 </div>
 )}
 </div>

 {!action && (
 <div className="modal-footer">
 <button
 onClick={handleClose}
 className="btn-secondary"
 >
 Chiudi
 </button>
 </div>
 )}
 </div>
 </div>
 );
};

export default QuickRequestModal;



