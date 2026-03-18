import React, { useState } from 'react';
import { UserIcon, BookOpenIcon, TagIcon, XMarkIcon, ExclamationCircleIcon, ClipboardDocumentListIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../auth/AuthContext';

const QuickActionModal = ({ isOpen, onClose, action, onSuccess }) => {
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState(null);
 const [formData, setFormData] = useState({
   nome: '',
   quantita_totale: 1,
   scaffale: '',
   categoria_id: '',
   note: '',
   tipo_prestito: 'solo_esterno'
 });
 const { api } = useAuth();

 const handleSubmit = async (e) => {
 e.preventDefault();
 if (!formData.nome) {
 setError('Il nome è obbligatorio');
 return;
 }

 try {
 setLoading(true);
 setError(null);

 // Generate unit codes
 const units = [];
 for (let i = 1; i <= formData.quantita_totale; i++) {
 const code = `${formData.nome.toUpperCase().replace(/\s+/g, '')}_${String(i).padStart(3, '0')}`;
 units.push({ codice_univoco: code, note: '' });
 }

 await api.post('/api/inventario', {
 ...formData,
 unita: units
 });

 onSuccess && onSuccess();
 handleClose();
 } catch (err) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 };

 const handleClose = () => {
   setFormData({
     nome: '',
     quantita_totale: 1,
     scaffale: '',
     categoria_id: '',
     note: '',
     tipo_prestito: 'solo_esterno'
   });
   setError(null);
   onClose();
 };

 if (!isOpen) return null;

 return (
 <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
 <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
 <div className="modal-header">
 <h2 className="text-xl font-bold text-primary">
 {action === 'add-inventory' && 'Aggiungi Elemento Rapido'}
 {action === 'manage-requests' && 'Gestisci Richieste'}
 {action === 'manage-repairs' && 'Gestisci Riparazioni'}
 {!['add-inventory', 'manage-requests', 'manage-repairs'].includes(action) && 'Azione Rapida'}
 </h2>
 <button
 onClick={handleClose}
 className="p-2 -m-2 rounded-lg hover:bg-gray-100 cursor-pointer text-muted hover:text-primary transition-colors"
 >
 <XMarkIcon className="icon" />
 </button>
 </div>

 {action === 'add-inventory' ? (
 <div className="modal-body">
 <form onSubmit={handleSubmit}>
 {/* Progress Bar */}
 <div className="flex items-center justify-center mb-8">
 {[
 { num: 1, icon: <UserIcon className="w-4 h-4" /> },
 { num: 2, icon: <BookOpenIcon className="w-4 h-4" /> },
 { num: 3, icon: <TagIcon className="w-4 h-4" /> }
 ].map((stepData, index) => (
 <React.Fragment key={stepData.num}>
 <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
 stepData.num <= 1
 ? 'bg-brand-primary text-white shadow-lg'
 : 'bg-tertiary text-muted'
 }`}>
 {stepData.num <= 1 ? stepData.icon : stepData.num}
 </div>
 {index < 2 && (
 <div className={`flex-1 h-1 mx-3 rounded transition-all ${
 stepData.num < 1
 ? 'bg-brand-primary'
 : 'bg-tertiary'
 }`} />
 )}
 </React.Fragment>
 ))}
 </div>

 {/* Step 1: Basic Info */}
 <div className="space-y-6">
 <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
 <div className="w-8 h-8 bg-brand-primary text-white rounded-full flex items-center justify-center">
 <UserIcon className="w-4 h-4" />
 </div>
 Informazioni Base
 </h3>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-primary mb-2">
 Nome Elemento *
 </label>
 <input
 type="text"
 value={formData.nome}
 onChange={(e) => setFormData({...formData, nome: e.target.value})}
 className="input-field"
 placeholder="Inserisci nome elemento"
 required
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-primary mb-2">
 Quantità *
 </label>
 <input
 type="number"
 value={formData.quantita_totale}
 onChange={(e) => setFormData({...formData, quantita_totale: parseInt(e.target.value) || 1})}
 className="input-field"
 min="1"
 required
 />
 </div>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-primary mb-2">
 Scaffale
 </label>
 <input
 type="text"
 value={formData.scaffale}
 onChange={(e) => setFormData({...formData, scaffale: e.target.value})}
 className="input-field"
 placeholder="Inserisci scaffale"
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-primary mb-2">
   Note
 </label>
 <textarea
   value={formData.note}
   onChange={(e) => setFormData({...formData, note: e.target.value})}
   className="input-field"
   rows="3"
   placeholder="Note aggiuntive"
 />
 </div>

 <div className="md:col-span-2">
   <label className="block text-sm font-medium text-primary mb-2">
     Tipo di Utilizzo
   </label>
   <div className="space-y-2">
     <label className="flex items-center space-x-3 p-3 bg-white rounded-full border border-gray-200 cursor-pointer hover:bg-gray-50">
       <input
         type="radio"
         name="tipo_prestito_quick"
         value="solo_esterno"
         checked={formData.tipo_prestito === 'solo_esterno'}
         onChange={(e) => setFormData({...formData, tipo_prestito: e.target.value})}
         className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
       />
       <div>
         <span className="text-sm font-medium text-gray-900">📅 Uso Esterno</span>
         <p className="text-xs text-gray-600">Prestito per più giorni, può essere portato fuori dall'accademia</p>
       </div>
     </label>
     
     <label className="flex items-center space-x-3 p-3 bg-white rounded-full border border-gray-200 cursor-pointer hover:bg-gray-50">
       <input
         type="radio"
         name="tipo_prestito_quick"
         value="solo_interno"
         checked={formData.tipo_prestito === 'solo_interno'}
         onChange={(e) => setFormData({...formData, tipo_prestito: e.target.value})}
         className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
       />
       <div>
         <span className="text-sm font-medium text-gray-900">🏠 Uso Interno</span>
         <p className="text-xs text-gray-600">Solo per uso interno<br />Da restituire a fine utilizzo</p>
       </div>
     </label>
     
     <label className="flex items-center space-x-3 p-3 bg-white rounded-full border border-gray-200 cursor-pointer hover:bg-gray-50">
       <input
         type="radio"
         name="tipo_prestito_quick"
         value="entrambi"
         checked={formData.tipo_prestito === 'entrambi'}
         onChange={(e) => setFormData({...formData, tipo_prestito: e.target.value})}
         className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
       />
       <div>
         <span className="text-sm font-medium text-gray-900">🔄 Entrambi</span>
         <p className="text-xs text-gray-600">L'utente sceglie se utilizzarlo internamente o esternamente</p>
       </div>
     </label>
   </div>
   <div className="mt-2 p-3 bg-blue-50 rounded-full border border-blue-200">
     <p className="text-xs text-blue-700">
       {formData.tipo_prestito === 'solo_esterno' && (
         <>📅 <strong>Solo Prestito Esterno:</strong> Gli studenti possono richiedere prestiti per più giorni e portare l'oggetto fuori dall'accademia</>
       )}
       {formData.tipo_prestito === 'solo_interno' && (
         <>🏠 <strong>Solo Uso Interno:</strong> Gli studenti sono autorizzati all'uso interno all'accademia (stesso giorno)</>
       )}
       {formData.tipo_prestito === 'entrambi' && (
         <>🔄 <strong>Entrambi:</strong> Gli studenti possono scegliere se utilizzare l'oggetto internamente (stesso giorno) o esternamente (multi-giorno)</>
       )}
     </p>
   </div>
 </div>
 </div>

 {error && (
 <div className="alert-card alert-danger mt-4">
 <div className="flex items-center">
 <ExclamationCircleIcon className="icon text-red-500 mr-3" />
 <p className="text-red-800 ">{error}</p>
 </div>
 </div>
 )}

 <div className="flex gap-3 pt-6 border-t border-border-primary">
 <button
 type="button"
 onClick={handleClose}
 className="btn-secondary flex-1"
 >
 Annulla
 </button>
 <button
 type="submit"
 disabled={loading}
 className="btn-primary flex-1"
 >
 {loading ? 'Creazione...' : 'Crea Elemento'}
 </button>
 </div>
 </form>
 </div>
 ) : (
 <div className="modal-body">
 <div className="text-center py-8">
 {action === 'manage-requests' && (
 <div className="space-y-4">
 <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
 <ClipboardDocumentListIcon className="icon-lg text-white" />
 </div>
 <h3 className="text-lg font-semibold text-primary mb-2">Gestione Richieste</h3>
 <p className="text-secondary mb-4">Visualizza e gestisci tutte le richieste di prestito in attesa di approvazione.</p>
 
 {/* Lista richieste in attesa */}
 <div className="space-y-2 max-h-60 overflow-y-auto">
 <div className="card p-3 hover:bg-tertiary transition-colors">
 <div className="flex items-center justify-between">
 <div>
 <p className="font-medium text-primary">Mario Rossi</p>
 <p className="text-sm text-secondary">Macchina Fotografica Canon</p>
 </div>
 <div className="flex gap-2">
 <button className="btn-success btn-small">Approva</button>
 <button className="btn-danger btn-small">Rifiuta</button>
 </div>
 </div>
 </div>
 <div className="card p-3 hover:bg-tertiary transition-colors">
 <div className="flex items-center justify-between">
 <div>
 <p className="font-medium text-primary">Giulia Bianchi</p>
 <p className="text-sm text-secondary">Laptop Dell</p>
 </div>
 <div className="flex gap-2">
 <button className="btn-success btn-small">Approva</button>
 <button className="btn-danger btn-small">Rifiuta</button>
 </div>
 </div>
 </div>
 </div>
 
 <button
 onClick={() => {
 window.location.href = '/prestiti';
 handleClose();
 }}
 className="btn-primary w-full"
 >
 Vai a Prestiti Completi
 </button>
 </div>
 )}
 
 {action === 'manage-repairs' && (
 <div className="space-y-4">
 <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
 <WrenchScrewdriverIcon className="icon-lg text-white" />
 </div>
 <h3 className="text-lg font-semibold text-primary mb-2">Gestione Riparazioni</h3>
 <p className="text-secondary mb-4">Visualizza e gestisci tutte le riparazioni in corso e completate.</p>
 
 {/* Lista riparazioni */}
 <div className="space-y-2 max-h-60 overflow-y-auto">
 <div className="text-center py-8 text-secondary">
 <WrenchScrewdriverIcon className="w-12 h-12 mx-auto mb-4 text-muted" />
 <p>Nessuna riparazione in corso</p>
 <p className="text-sm text-muted">Le riparazioni appariranno qui quando saranno create</p>
 </div>
 </div>
 
 <button
 onClick={() => {
 window.location.href = '/riparazioni';
 handleClose();
 }}
 className="btn-primary w-full"
 >
 Vai a Riparazioni Complete
 </button>
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 </div>
 );
};

export default QuickActionModal;
