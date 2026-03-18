import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

const DocumentManager = ({ item, isOpen, onClose, onSave }) => {
 const [documents, setDocuments] = useState([]);
 const [uploading, setUploading] = useState(false);
 const [dragOver, setDragOver] = useState(false);
 const { api } = useAuth();

 useEffect(() => {
 if (item && isOpen) {
 loadDocuments();
 }
 }, [item, isOpen]);

 const loadDocuments = async () => {
 try {
 const response = await api.get(`/api/inventario/${item.id}/documents`);
 const docs = response.data ?? [];
 setDocuments(Array.isArray(docs) ? docs : []);
 } catch (error) {
 console.error('Errore nel caricamento documenti:', error);
 }
 };

 const handleFileUpload = async (files) => {
 setUploading(true);
 try {
 const formData = new FormData();
 Array.from(files).forEach(file => {
 formData.append('documents', file);
 });
 await api.post(`/api/inventario/${item.id}/documents`, formData, {
 headers: { 'Content-Type': 'multipart/form-data' }
 });
 await loadDocuments();
 onSave && onSave();
 } catch (error) {
 console.error('Errore upload:', error);
 alert('Errore nel caricamento dei documenti');
 } finally {
 setUploading(false);
 }
 };

 const handleDeleteDocument = async (docId) => {
 if (!confirm('Sei sicuro di voler eliminare questo documento?')) return;
 try {
 await api.delete(`/api/inventario/documents/${docId}`);
 await loadDocuments();
 onSave && onSave();
 } catch (error) {
 console.error('Errore eliminazione:', error);
 }
 };

 const handleDownload = async (document) => {
 try {
 const response = await api.get(`/api/inventario/documents/${document.id}/download`, { responseType: 'blob' });
 const blob = response.data;
 const url = window.URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = document.original_name;
 a.click();
 window.URL.revokeObjectURL(url);
 } catch (error) {
 console.error('Errore download:', error);
 }
 };

 const getFileIcon = (type) => {
 if (type.includes('pdf')) return '📄';
 if (type.includes('image')) return '🖼️';
 if (type.includes('word') || type.includes('document')) return '📝';
 if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
 if (type.includes('powerpoint') || type.includes('presentation')) return '📊';
 return '📎';
 };

 const formatFileSize = (bytes) => {
 if (bytes === 0) return '0 Bytes';
 const k = 1024;
 const sizes = ['Bytes', 'KB', 'MB', 'GB'];
 const i = Math.floor(Math.log(bytes) / Math.log(k));
 return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
 };

 if (!isOpen || !item) return null;

 return (
 <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[9999]">
 <div className="bg-white rounded-full p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
 <div className="flex items-center justify-between mb-6">
 <h3 className="text-lg font-semibold text-gray-900">
 Documenti per {item.nome}
 </h3>
 <button
 onClick={onClose}
 className="p-2 -m-2 rounded-lg hover:bg-gray-100 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
 >
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>

 {/* Upload Area */}
 <div
 className={`border-2 border-dashed rounded-full p-8 text-center mb-6 ${
 dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
 }`}
 onDragOver={(e) => {
 e.preventDefault();
 setDragOver(true);
 }}
 onDragLeave={() => setDragOver(false)}
 onDrop={(e) => {
 e.preventDefault();
 setDragOver(false);
 handleFileUpload(e.dataTransfer.files);
 }}
 >
 <div className="space-y-4">
 <div className="text-4xl">📁</div>
 <div>
 <p className="text-lg font-medium text-gray-900">
 Trascina i file qui o clicca per selezionare
 </p>
 <p className="text-sm text-gray-500">
 Supporta PDF, immagini, documenti Word, Excel, PowerPoint
 </p>
 </div>
 <input
 type="file"
 multiple
 accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
 onChange={(e) => handleFileUpload(e.target.files)}
 className="hidden"
 id="file-upload"
 />
 <label
 htmlFor="file-upload"
 className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 cursor-pointer"
 >
 <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
 </svg>
 Seleziona File
 </label>
 </div>
 </div>

 {/* Upload Progress */}
 {uploading && (
 <div className="mb-6">
 <div className="flex items-center justify-center">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
 <span className="ml-3 text-gray-600">Caricamento in corso...</span>
 </div>
 </div>
 )}

 {/* Documents List */}
 <div className="space-y-4">
 <h4 className="text-md font-medium text-gray-900">
 Documenti caricati ({documents.length})
 </h4>
 
 {documents.length === 0 ? (
 <div className="text-center py-8 text-gray-500">
 <div className="text-4xl mb-2">📄</div>
 <p>Nessun documento caricato</p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {documents.map((doc) => (
 <div key={doc.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
 <div className="flex items-start justify-between">
 <div className="flex items-start space-x-3 flex-1">
 <div className="text-2xl">{getFileIcon(doc.mime_type)}</div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium text-gray-900 truncate">
 {doc.original_name}
 </p>
 <p className="text-xs text-gray-500">
 {formatFileSize(doc.file_size)} • {new Date(doc.uploaded_at).toLocaleDateString()}
 </p>
 {doc.description && (
 <p className="text-xs text-gray-600 mt-1">{doc.description}</p>
 )}
 </div>
 </div>
 <div className="flex space-x-2 ml-4">
 <button
 onClick={() => handleDownload(doc)}
 className="text-blue-600 hover:text-blue-800"
 title="Scarica"
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
 </svg>
 </button>
 <button
 onClick={() => handleDeleteDocument(doc.id)}
 className="text-red-600 hover:text-red-800"
 title="Elimina"
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
 </svg>
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 );
};

export default DocumentManager;
