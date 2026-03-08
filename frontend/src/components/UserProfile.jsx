import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

const UserProfile = ({ onClose, onUpdate }) => {
 const { user, token } = useAuth();
 const [formData, setFormData] = useState({
 phone: '',
 notifications: true
 });
 const [passwordData, setPasswordData] = useState({
 currentPassword: '',
 newPassword: '',
 confirmPassword: ''
 });
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState(null);
 const [success, setSuccess] = useState(null);
 const [activeTab, setActiveTab] = useState('profile');

 useEffect(() => {
 if (user) {
 setFormData({
 phone: user.phone || '',
 notifications: true // Default to true, could be stored in user preferences
 });
 }
 }, [user]);

 const handleInputChange = (e) => {
 const { name, value, type, checked } = e.target;
 setFormData(prev => ({
 ...prev,
 [name]: type === 'checkbox' ? checked : value
 }));
 };

 const handlePasswordChange = (e) => {
 const { name, value } = e.target;
 setPasswordData(prev => ({
 ...prev,
 [name]: value
 }));
 };

 const handleProfileUpdate = async (e) => {
 e.preventDefault();
 setLoading(true);
 setError(null);
 setSuccess(null);

 try {
 const response = await fetch(`/api/auth/users/${user.id}`, {
 method: 'PUT',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({
 phone: formData.phone,
 notifications: formData.notifications
 })
 });

 if (!response.ok) {
 const errorData = await response.json();
 throw new Error(errorData.error || 'Errore nell\'aggiornamento del profilo');
 }

 setSuccess('Profilo aggiornato con successo!');
 setTimeout(() => {
 onUpdate();
 }, 1500);

 } catch (err) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 };

 const handlePasswordUpdate = async (e) => {
 e.preventDefault();
 setLoading(true);
 setError(null);
 setSuccess(null);

 if (passwordData.newPassword !== passwordData.confirmPassword) {
 setError('Le password non coincidono');
 setLoading(false);
 return;
 }

 if (passwordData.newPassword.length < 6) {
 setError('La password deve essere di almeno 6 caratteri');
 setLoading(false);
 return;
 }

 try {
 const response = await fetch('/api/auth/forgot-password', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({
 email: user.email,
 newPassword: passwordData.newPassword
 })
 });

 if (!response.ok) {
 const errorData = await response.json();
 throw new Error(errorData.error || 'Errore nell\'aggiornamento della password');
 }

 setSuccess('Password aggiornata con successo!');
 setPasswordData({
 currentPassword: '',
 newPassword: '',
 confirmPassword: ''
 });

 } catch (err) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 };

 const handlePasswordResetRequest = async () => {
 setLoading(true);
 setError(null);
 setSuccess(null);

 try {
 const response = await fetch('/api/auth/forgot-password', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json'
 },
 body: JSON.stringify({
 email: user.email
 })
 });

 if (!response.ok) {
 const errorData = await response.json();
 throw new Error(errorData.error || 'Errore nella richiesta di reset password');
 }

 setSuccess('Richiesta di reset password inviata! Controlla la tua email.');

 } catch (err) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
 <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
 {/* Header */}
 <div className="flex items-center justify-between p-6 border-b border-gray-200">
 <h2 className="text-xl font-semibold text-gray-900">Profilo Personale</h2>
 <button
 onClick={onClose}
 className="p-2 -m-2 rounded-lg hover:bg-gray-100 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
 >
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>

 {/* Tabs */}
 <div className="border-b border-gray-200">
 <nav className="flex space-x-8 px-6">
 <button
 onClick={() => setActiveTab('profile')}
 className={`py-4 px-1 border-b-2 font-medium text-sm ${
 activeTab === 'profile'
 ? 'border-blue-500 text-blue-600'
 : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
 }`}
 >
 Dati Personali
 </button>
 <button
 onClick={() => setActiveTab('password')}
 className={`py-4 px-1 border-b-2 font-medium text-sm ${
 activeTab === 'password'
 ? 'border-blue-500 text-blue-600'
 : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
 }`}
 >
 Password
 </button>
 <button
 onClick={() => setActiveTab('notifications')}
 className={`py-4 px-1 border-b-2 font-medium text-sm ${
 activeTab === 'notifications'
 ? 'border-blue-500 text-blue-600'
 : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
 }`}
 >
 Notifiche
 </button>
 </nav>
 </div>

 {/* Content */}
 <div className="p-6">
 {/* Profile Tab */}
 {activeTab === 'profile' && (
 <form onSubmit={handleProfileUpdate} className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Read-only fields */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Nome
 </label>
 <input
 type="text"
 value={user?.name || ''}
 disabled
 className="w-full px-3 py-2 border border-gray-300 rounded-full bg-gray-100 text-gray-500"
 />
 <p className="text-xs text-gray-500 mt-1">Non modificabile</p>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Cognome
 </label>
 <input
 type="text"
 value={user?.surname || ''}
 disabled
 className="w-full px-3 py-2 border border-gray-300 rounded-full bg-gray-100 text-gray-500"
 />
 <p className="text-xs text-gray-500 mt-1">Non modificabile</p>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Email
 </label>
 <input
 type="email"
 value={user?.email || ''}
 disabled
 className="w-full px-3 py-2 border border-gray-300 rounded-full bg-gray-100 text-gray-500"
 />
 <p className="text-xs text-gray-500 mt-1">Non modificabile</p>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Matricola
 </label>
 <input
 type="text"
 value={user?.matricola || ''}
 disabled
 className="w-full px-3 py-2 border border-gray-300 rounded-full bg-gray-100 text-gray-500"
 />
 <p className="text-xs text-gray-500 mt-1">Non modificabile</p>
 </div>

 {/* Editable field */}
 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Telefono
 </label>
 <input
 type="tel"
 name="phone"
 value={formData.phone}
 onChange={handleInputChange}
 className="w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-400"
 placeholder="Inserisci il tuo numero di telefono"
 />
 </div>
 </div>

 {error && (
 <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-full">
 {error}
 </div>
 )}

 {success && (
 <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-full">
 {success}
 </div>
 )}

 <div className="flex justify-end space-x-3">
 <button
 type="button"
 onClick={onClose}
 className="px-4 py-2 text-gray-700 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
 >
 Annulla
 </button>
 <button
 type="submit"
 disabled={loading}
 className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50"
 >
 {loading ? 'Salvataggio...' : 'Salva Modifiche'}
 </button>
 </div>
 </form>
 )}

 {/* Password Tab */}
 {activeTab === 'password' && (
 <div className="space-y-6">
 <div className="bg-blue-50 border border-blue-200 rounded-full p-4">
 <div className="flex">
 <div className="flex-shrink-0">
 <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
 <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
 </svg>
 </div>
 <div className="ml-3">
 <h3 className="text-sm font-medium text-blue-800">
 Modifica Password
 </h3>
 <div className="mt-2 text-sm text-blue-700">
 <p>Per modificare la password, richiedi un reset password. Riceverai un'email con le istruzioni.</p>
 </div>
 </div>
 </div>
 </div>

 <div className="text-center">
 <button
 onClick={handlePasswordResetRequest}
 disabled={loading}
 className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
 >
 {loading ? 'Invio in corso...' : 'Richiedi Reset Password'}
 </button>
 </div>

 {error && (
 <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-full">
 {error}
 </div>
 )}

 {success && (
 <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-full">
 {success}
 </div>
 )}
 </div>
 )}

 {/* Notifications Tab */}
 {activeTab === 'notifications' && (
 <div className="space-y-6">
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-sm font-medium text-gray-900">Notifiche Email</h3>
 <p className="text-sm text-gray-500">Ricevi notifiche via email per le tue attività</p>
 </div>
 <label className="relative inline-flex items-center cursor-pointer">
 <input
 type="checkbox"
 name="notifications"
 checked={formData.notifications}
 onChange={handleInputChange}
 className="sr-only peer"
 />
 <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
 </label>
 </div>

 <div className="bg-gray-50 rounded-full p-4">
 <h4 className="text-sm font-medium text-gray-900 mb-2">Tipi di notifiche:</h4>
 <ul className="text-sm text-gray-600 space-y-1">
 <li>• Conferma prenotazioni</li>
 <li>• Aggiornamenti richieste</li>
 <li>• Promemoria scadenze</li>
 <li>• Notifiche sistema</li>
 </ul>
 </div>
 </div>

 <div className="flex justify-end space-x-3">
 <button
 onClick={onClose}
 className="px-4 py-2 text-gray-700 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
 >
 Chiudi
 </button>
 <button
 onClick={handleProfileUpdate}
 disabled={loading}
 className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50"
 >
 {loading ? 'Salvataggio...' : 'Salva Impostazioni'}
 </button>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 );
};

export default UserProfile;

