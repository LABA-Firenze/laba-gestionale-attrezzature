import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../auth/AuthContext';

const ActivityLog = ({ isOpen, onClose }) => {
 const [activities, setActivities] = useState([]);
 const [loading, setLoading] = useState(false);
 const [filters, setFilters] = useState({
 type: 'all',
 user: 'all',
 dateFrom: '',
 dateTo: ''
 });

 const { token } = useAuth();

 useEffect(() => {
 if (isOpen) {
 fetchActivities();
 }
 }, [isOpen, filters]);

 const fetchActivities = async () => {
 setLoading(true);
 try {
 const queryParams = new URLSearchParams();
 if (filters.type !== 'all') queryParams.append('type', filters.type);
 if (filters.user !== 'all') queryParams.append('user', filters.user);
 if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
 if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);

 const response = await fetch(`/api/activity-log?${queryParams}`, {
 headers: { 'Authorization': `Bearer ${token}` }
 });

 if (response.ok) {
 const data = await response.json();
 setActivities(data);
 }
 } catch (error) {
 console.error('Errore nel caricamento attività:', error);
 } finally {
 setLoading(false);
 }
 };

 const getActivityIcon = (type) => {
 switch (type) {
 case 'create': return '➕';
 case 'update': return '✏️';
 case 'delete': return '🗑️';
 case 'login': return '🔐';
 case 'logout': return '🚪';
 case 'loan': return '📤';
 case 'return': return '📥';
 case 'repair': return '🔧';
 case 'request': return '📝';
 case 'approve': return '✅';
 case 'reject': return '❌';
 default: return '📋';
 }
 };

 const getActivityColor = (type) => {
 switch (type) {
 case 'create': return 'text-green-600 bg-green-100';
 case 'update': return 'text-blue-600 bg-blue-100';
 case 'delete': return 'text-red-600 bg-red-100';
 case 'login': return 'text-purple-600 bg-purple-100';
 case 'logout': return 'text-gray-600 bg-gray-100';
 case 'loan': return 'text-orange-600 bg-orange-100';
 case 'return': return 'text-green-600 bg-green-100';
 case 'repair': return 'text-yellow-600 bg-yellow-100';
 case 'request': return 'text-indigo-600 bg-indigo-100';
 case 'approve': return 'text-green-600 bg-green-100';
 case 'reject': return 'text-red-600 bg-red-100';
 default: return 'text-gray-600 bg-gray-100';
 }
 };

 const formatTimestamp = (timestamp) => {
 const date = new Date(timestamp);
 return {
 date: date.toLocaleDateString('it-IT'),
 time: date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
 };
 };

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[9999]">
 <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
 <div className="flex items-center justify-between mb-6">
 <h3 className="text-lg font-semibold text-gray-900">Log Attività</h3>
 <button
 onClick={onClose}
 className="text-gray-400 hover:text-gray-600"
 >
 <XMarkIcon className="w-6 h-6" />
 </button>
 </div>

 {/* Filters */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
 <select
 value={filters.type}
 onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-sm"
 >
 <option value="all">Tutti i tipi</option>
 <option value="create">Creazione</option>
 <option value="update">Modifica</option>
 <option value="delete">Eliminazione</option>
 <option value="login">Login</option>
 <option value="logout">Logout</option>
 <option value="loan">Prestito</option>
 <option value="return">Restituzione</option>
 <option value="repair">Riparazione</option>
 <option value="request">Richiesta</option>
 <option value="approve">Approvazione</option>
 <option value="reject">Rifiuto</option>
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Utente</label>
 <select
 value={filters.user}
 onChange={(e) => setFilters(prev => ({ ...prev, user: e.target.value }))}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-sm"
 >
 <option value="all">Tutti gli utenti</option>
 {/* Qui potresti caricare la lista degli utenti */}
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Data da</label>
 <input
 type="date"
 value={filters.dateFrom}
 onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-sm"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Data a</label>
 <input
 type="date"
 value={filters.dateTo}
 onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-sm"
 />
 </div>
 </div>

 {/* Activities List */}
 <div className="space-y-4">
 {loading ? (
 <div className="flex items-center justify-center py-8">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
 <span className="ml-3 text-gray-600">Caricamento...</span>
 </div>
 ) : activities.length === 0 ? (
 <div className="text-center py-8 text-gray-500">
 <div className="text-4xl mb-2">📋</div>
 <p>Nessuna attività trovata</p>
 </div>
 ) : (
 <div className="space-y-3">
 {activities.map((activity, index) => {
 const { date, time } = formatTimestamp(activity.timestamp);
 return (
 <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
 <div className="flex items-start space-x-4">
 <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${getActivityColor(activity.type)}`}>
 {getActivityIcon(activity.type)}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between">
 <h4 className="text-sm font-medium text-gray-900">
 {activity.description}
 </h4>
 <div className="text-xs text-gray-500">
 {date} alle {time}
 </div>
 </div>
 <div className="mt-1 text-sm text-gray-600">
 <span className="font-medium">{activity.user_name || 'Utente sconosciuto'}</span>
 {activity.details && (
 <span className="ml-2">• {activity.details}</span>
 )}
 </div>
 {activity.metadata && (
 <div className="mt-2 text-xs text-gray-500">
 {Object.entries(activity.metadata).map(([key, value]) => (
 <span key={key} className="mr-4">
 <span className="font-medium">{key}:</span> {value}
 </span>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>

 {/* Pagination or Load More */}
 {activities.length > 0 && (
 <div className="mt-6 flex justify-center">
 <button
 onClick={fetchActivities}
 className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
 >
 Carica altre attività
 </button>
 </div>
 )}
 </div>
 </div>
 );
};

export default ActivityLog;
