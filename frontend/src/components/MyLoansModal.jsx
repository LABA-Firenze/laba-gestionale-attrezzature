import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../auth/AuthContext';
import ReportBugModal from './ReportBugModal';

const MyLoansModal = ({ isOpen, onClose }) => {
 const [loans, setLoans] = useState([]);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState(null);
 const [activeTab, setActiveTab] = useState('active');
 const [showReportBug, setShowReportBug] = useState(false);
 const [selectedLoan, setSelectedLoan] = useState(null);
 const { api } = useAuth();

 useEffect(() => {
 if (isOpen) {
 fetchLoans();
 }
 }, [isOpen]);

 const fetchLoans = async () => {
 try {
 setLoading(true);
 const response = await api.get('/api/prestiti/mie');
 const data = response.data ?? [];
 setLoans(Array.isArray(data) ? data : []);
 } catch (err) {
 setError('Errore nel caricamento dei prestiti');
 console.error('Error fetching loans:', err);
 } finally {
 setLoading(false);
 }
 };

 const getStatusColor = (status) => {
 switch (status) {
 case 'attivo': return 'bg-green-100 text-green-800';
 case 'scaduto': return 'bg-red-100 text-red-800';
 case 'restituito': return 'bg-gray-100 text-gray-800';
 case 'in_ritardo': return 'bg-orange-100 text-orange-800';
 default: return 'bg-blue-100 text-blue-800';
 }
 };

 const getStatusText = (status) => {
 switch (status) {
 case 'attivo': return 'In Prestito';
 case 'scaduto': return 'Scaduto';
 case 'restituito': return 'Restituito';
 case 'in_ritardo': return 'In Ritardo';
 default: return status;
 }
 };

 const handleReportIssue = (loan) => {
 setSelectedLoan(loan);
 setShowReportBug(true);
 };

 const formatDate = (dateString) => {
 return new Date(dateString).toLocaleDateString('it-IT');
 };

 const filteredLoans = loans.filter(loan => {
 if (activeTab === 'active') {
 return loan.stato === 'attivo' || loan.stato === 'in_ritardo';
 } else if (activeTab === 'completed') {
 return loan.stato === 'restituito';
 }
 return true;
 });

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
 <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
 {/* Header */}
 <div className="flex items-center justify-between p-6 border-b border-gray-200">
 <h2 className="text-xl font-semibold text-gray-900">I Miei Prestiti</h2>
 <button
 onClick={onClose}
 className="p-2 -m-2 rounded-lg hover:bg-gray-100 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
 >
 <XMarkIcon className="w-6 h-6" />
 </button>
 </div>

 {/* Tabs */}
 <div className="border-b border-gray-200">
 <nav className="flex space-x-8 px-6">
 <button
 onClick={() => setActiveTab('active')}
 className={`py-4 px-1 border-b-2 font-medium text-sm ${
 activeTab === 'active'
 ? 'border-blue-500 text-blue-600'
 : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
 }`}
 >
 Prestiti Attivi
 </button>
 <button
 onClick={() => setActiveTab('completed')}
 className={`py-4 px-1 border-b-2 font-medium text-sm ${
 activeTab === 'completed'
 ? 'border-blue-500 text-blue-600'
 : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
 }`}
 >
 Prestiti Completati
 </button>
 </nav>
 </div>

 {/* Content */}
 <div className="p-6">
 {loading ? (
 <div className="flex items-center justify-center h-32">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
 <span className="ml-2 text-gray-600">Caricamento prestiti...</span>
 </div>
 ) : error ? (
 <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
 {error}
 </div>
 ) : filteredLoans.length === 0 ? (
 <div className="text-center py-12">
 <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
 </svg>
 <h3 className="mt-2 text-sm font-medium text-gray-900">Nessun prestito</h3>
 <p className="mt-1 text-sm text-gray-500">
 {activeTab === 'active' 
 ? 'Non hai prestiti attivi al momento.' 
 : 'Non hai prestiti completati.'
 }
 </p>
 </div>
 ) : (
 <div className="space-y-3">
 {filteredLoans.map((loan) => (
 <div key={loan.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <div className="flex items-center justify-between mb-2">
 <h3 className="font-semibold text-gray-900 text-lg">{loan.articolo_nome}</h3>
 <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(loan.stato)}`}>
 {getStatusText(loan.stato)}
 </span>
 </div>
 
 {loan.articolo_descrizione && (
 <p className="text-sm text-gray-600 mb-3">{loan.articolo_descrizione}</p>
 )}
 
 <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
 <div>
 <span className="font-medium">Data Inizio:</span><br/>
 {formatDate(loan.data_inizio)}
 </div>
 <div>
 <span className="font-medium">Data Fine:</span><br/>
 {formatDate(loan.data_fine)}
 </div>
 </div>
 
 {loan.categoria_madre && (
 <div className="text-sm text-gray-500 mb-3">
 <span className="font-medium">Categoria:</span> {loan.categoria_madre} - {loan.categoria_figlia}
 </div>
 )}
 
 {loan.stato === 'attivo' && (
 <button
 onClick={() => handleReportIssue(loan)}
 className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-full hover:bg-red-100 transition-colors"
 >
 <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
 </svg>
 Segnala Problema
 </button>
 )}
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>

 {/* Report Bug Modal */}
 {showReportBug && selectedLoan && (
 <ReportBugModal
 isOpen={showReportBug}
 onClose={() => {
 setShowReportBug(false);
 setSelectedLoan(null);
 }}
 onSuccess={() => {
 setShowReportBug(false);
 setSelectedLoan(null);
 // Refresh loans data
 fetchLoans();
 }}
 prefillData={{
 inventario_id: selectedLoan.inventario_id,
 messaggio: `Problema con ${selectedLoan.articolo_nome} (ID: ${selectedLoan.inventario_id})`
 }}
 />
 )}
 </div>
 );
};

export default MyLoansModal;
